import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ImageContent } from "@earendil-works/pi-ai";
import { createHerdrClient } from "@settingdust/pi-herdr";
import activateSubagents, { AgentRegistry, SubagentRuntime, createHerdrTransport, createSubagentTools, createSubagentStatusWidget, paneChildExtensionPath, validateExplicitSpawnModel, type CompletionNotification, type HerdrTransport, type SubagentTask } from "../src/index.js";
import { resultPublisher } from "../src/result-publication.js";

function fakeTransport(paneExists: boolean | (() => boolean) = true) {
  const calls: unknown[] = [];
  const transport: HerdrTransport = {
    async createTab(input) { calls.push({ op: "create", input }); return { tabId: "tab-1", paneId: "pane-1" }; },
    async run(paneId, command, args) { calls.push({ op: "run", paneId, command, args }); },
    async sendText(paneId, text) { calls.push({ op: "send", paneId, text }); },
    async closePane(paneId) { calls.push({ op: "closePane", paneId }); },
    async closeTab(tabId) { calls.push({ op: "closeTab", tabId }); return "closed"; },
    async paneExists(paneId) { calls.push({ op: "exists", paneId }); return typeof paneExists === "function" ? paneExists() : paneExists; },
  };
  return { calls, transport };
}

function handlerRegistry(body = "Handler"): AgentRegistry {
  const registry = new AgentRegistry();
  registry.setFiles([{ path: "/handler.md", content: `---\nname: handler\n---\n${body}` }]);
  return registry;
}

const childToolExclusions = "subagent_spawn,subagent_resume,subagent_inspect,subagent_join,subagent_steer,subagent_cancel,subagent_remove";

// Windows settlement can serialize several real PowerShell ACL checks.
async function waitFor(predicate: () => boolean, timeout = process.platform === "win32" ? 20_000 : 5000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for runtime settlement");
    await Bun.sleep(20);
  }
}

describe("Result settlement integrity", () => {
  for (const images of [undefined, [{ type: "image" as const, data: "AQ==", mimeType: "image/png" }]]) {
    test(`concurrent remove failure and success isolate same-ID reuse (${images ? "image" : "text"})`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-remove-reuse-"));
      const { transport } = fakeTransport();
      const closes: string[] = [];
      const notifications: CompletionNotification[] = [];
      let created = 0;
      transport.createTab = async () => ({ tabId: `tab-${++created}`, paneId: `pane-${created}` });
      transport.closeTab = async id => { closes.push(id); return "closed"; };
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
      const firstEntered = Promise.withResolvers<void>();
      const secondEntered = Promise.withResolvers<void>();
      const firstGate = Promise.withResolvers<void>();
      const secondGate = Promise.withResolvers<void>();
      let writing: ReturnType<typeof spyOn> | undefined;
      let removals: Promise<unknown>[] = [];
      try {
        const old = await runtime.spawn({ agent: "handler", cwd: root, prompt: "old", label: "old", taskSlug: "task", images });
        const oldOwner = runtime["get"]("task");
        const oldMonitor = runtime["monitors"].get("task:1")!;
        const manifest = join(dirname(old.resultPath), "task.json");
        const write = fsPromises.writeFile;
        let writes = 0;
        writing = spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
          if (String(args[0]).startsWith(`${manifest}.`)) {
            const attempt = ++writes;
            if (attempt === 1) { firstEntered.resolve(); await firstGate.promise; throw new Error("remove A write fault"); }
            if (attempt === 2) { secondEntered.resolve(); await secondGate.promise; }
          }
          return write(...args);
        }) as typeof fsPromises.writeFile);
        const a = runtime.remove("task").catch(error => error);
        removals.push(a);
        await firstEntered.promise;
        const b = runtime.remove("task");
        removals.push(b);
        await Bun.sleep(0); // Drain B's admission microtasks while A still owns the paused write.
        firstGate.resolve();
        expect((await a).message).toBe("remove A write fault");
        await secondEntered.promise;
        secondGate.resolve();
        await b;
        expect(oldMonitor.signal.aborted).toBeTrue();
        expect(runtime.listTasks()).toEqual([]);
        expect(runtime["monitors"].size).toBe(0);
        expect(runtime["removals"].size).toBe(0);
        expect(existsSync(dirname(old.resultPath))).toBeFalse();
        const current = await runtime.spawn({ agent: "handler", cwd: root, prompt: "new", label: "new", taskSlug: "task", images });
        expect(current).toMatchObject({ subagentId: "task", generation: 1, tabId: "tab-2", status: "running" });
        expect(runtime["get"]("task")).not.toBe(oldOwner);
        const newMonitor = runtime["monitors"].get("task:1")!;
        runtime["startMonitor"](oldOwner);
        runtime["stopMonitor"](oldOwner);
        expect(runtime["monitors"].get("task:1")).toBe(newMonitor);
        expect(newMonitor.signal.aborted).toBeFalse();
        const payload = join(dirname(current.resultPath), "image-input-1", "envelope.json");
        if (images) expect(JSON.parse(readFileSync(payload, "utf8"))).toMatchObject({ subagentId: "task", generation: 1, images });
        const bytes = JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "NEW_OWNER_RESULT" });
        await resultPublisher(current.resultPath).publish(bytes);
        // Let the real monitor reveal which task object consumes this reused path.
        await waitFor(() => notifications.length === 1 && runtime["settlements"].size === 0);
        expect(runtime.inspect("task")).toMatchObject({ status: "completed", result: "NEW_OWNER_RESULT", label: "new", tabId: "tab-2" });
        expect(JSON.parse(readFileSync(manifest, "utf8"))).toMatchObject({ generation: 1, status: "completed", label: "new", tabId: "tab-2" });
        expect(oldOwner.status).toBe("running");
        expect(readFileSync(current.resultPath, "utf8")).toBe(bytes);
        expect(closes).toEqual(["tab-1", "tab-2"]);
        expect(notifications).toEqual([{ subagentId: "task", generation: 1, status: "completed", label: "new" }]);
        expect(runtime["monitors"].size).toBe(0);
        if (images) expect(existsSync(dirname(payload))).toBeFalse();
      } finally {
        firstGate.resolve(); secondGate.resolve(); await Promise.allSettled(removals);
        writing?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true });
      }
    }, 30_000);

    test(`delayed remove manifest cannot commit over resumed generation (${images ? "image" : "text"})`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-remove-commit-"));
      const { transport } = fakeTransport();
      const closes: string[] = [];
      const notifications: CompletionNotification[] = [];
      let created = 0;
      transport.createTab = async () => ({ tabId: `tab-${++created}`, paneId: `pane-${created}` });
      transport.closeTab = async id => { closes.push(id); return "closed"; };
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
      const entered = Promise.withResolvers<void>();
      const gate = Promise.withResolvers<void>();
      let writing: ReturnType<typeof spyOn> | undefined;
      let removal: Promise<unknown> | undefined;
      try {
        const first = await runtime.spawn({ agent: "handler", cwd: root, prompt: "g1", label: "offline", taskSlug: "task", images });
        await runtime.cancel("task");
        const resultBytes = readFileSync(first.resultPath);
        const manifest = join(dirname(first.resultPath), "task.json");
        const write = fsPromises.writeFile;
        let held = false;
        writing = spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
          await write(...args);
          if (!held && String(args[0]).startsWith(`${manifest}.`) && JSON.parse(String(args[1])).generation === 1) {
            held = true; entered.resolve(); await gate.promise;
          }
        }) as typeof fsPromises.writeFile);
        removal = runtime.remove("task").catch(error => error);
        await entered.promise;
        const second = await runtime.resume("task", "g2", images);
        const owner = runtime["get"]("task");
        const monitor = runtime["monitors"].get("task:2")!;
        const manifestBytes = readFileSync(manifest);
        const payload = join(dirname(second.resultPath), "image-input-2", "envelope.json");
        const imageBytes = images ? readFileSync(payload) : undefined;
        expect(JSON.parse(manifestBytes.toString())).toMatchObject({ generation: 2, status: "running", tabId: "tab-2" });
        gate.resolve();
        expect((await removal as Error).message).toBe("Subagent generation is no longer current");
        expect(readFileSync(manifest)).toEqual(manifestBytes);
        expect(runtime["get"]("task")).toBe(owner);
        expect(runtime.inspect("task")).toMatchObject({ generation: 2, status: "running", tabId: "tab-2" });
        expect(runtime["monitors"].get("task:2")).toBe(monitor);
        expect(monitor.signal.aborted).toBeFalse();
        expect(runtime["monitors"].has("task:1")).toBeFalse();
        expect(readFileSync(first.resultPath)).toEqual(resultBytes);
        if (imageBytes) expect(readFileSync(payload)).toEqual(imageBytes);
        expect(readdirSync(dirname(manifest)).filter(name => name.startsWith("task.json.") && name.endsWith(".tmp"))).toEqual([]);
        notifications.length = 0;
        await runtime.recover(root);
        expect(monitor.signal.aborted).toBeTrue();
        expect(runtime["get"]("task")).not.toBe(owner);
        expect(runtime.inspect("task")).toMatchObject({ generation: 2, status: "running", tabId: "tab-2" });
        expect(JSON.parse(readFileSync(manifest, "utf8"))).toMatchObject({ generation: 2, status: "running", tabId: "tab-2" });
        expect(runtime["monitors"].size).toBe(1);
        expect(runtime["monitors"].has("task:2")).toBeTrue();
        expect(readFileSync(first.resultPath)).toEqual(resultBytes);
        expect(closes).toEqual(["tab-1"]);
        expect(created).toBe(2);
        expect(notifications).toEqual([]);
        if (imageBytes) expect(readFileSync(payload)).toEqual(imageBytes);
        const bytes = JSON.stringify({ subagentId: "task", generation: 2, status: "completed", result: "G2_AFTER_RECOVERY" });
        await resultPublisher(second.resultPath).publish(bytes);
        await waitFor(() => runtime.inspect("task").status === "completed" && notifications.length === 1 && runtime["settlements"].size === 0);
        expect(JSON.parse(readFileSync(manifest, "utf8"))).toMatchObject({ generation: 2, status: "completed", tabId: "tab-2" });
        expect(notifications).toEqual([{ subagentId: "task", generation: 2, status: "completed", label: "offline" }]);
        expect(closes).toEqual(["tab-1", "tab-2"]);
        expect(runtime["monitors"].size).toBe(0);
        if (images) expect(existsSync(dirname(payload))).toBeFalse();
      } finally {
        gate.resolve(); await removal; writing?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true });
      }
    }, 30_000);

    test(`delayed remove cleanup outcome cannot commit over resumed generation (${images ? "image" : "text"})`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-remove-cleanup-outcome-"));
      const { transport } = fakeTransport();
      const closes: string[] = [];
      const notifications: CompletionNotification[] = [];
      let created = 0;
      let failFirstClose = true;
      transport.createTab = async () => ({ tabId: `tab-${++created}`, paneId: `pane-${created}` });
      transport.closeTab = async id => { closes.push(id); if (failFirstClose) throw new Error("initial close fault"); return "closed"; };
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
      const releaseOutcome = Promise.withResolvers<void>();
      const admissionGate = Promise.withResolvers<void>();
      let admissionSpy: ReturnType<typeof spyOn> | undefined;
      let renameSpy: ReturnType<typeof spyOn> | undefined;
      let writeSpy: ReturnType<typeof spyOn> | undefined;
      let resume: Promise<SubagentTask> | undefined;
      let removal: Promise<unknown> | undefined;
      let outcomeTemporary: string | undefined;
      let outcomeRenames = 0;
      try {
        const first = await runtime.spawn({ agent: "handler", cwd: root, prompt: "g1", label: "cleanup outcome", taskSlug: "task", images });
        await runtime.cancel(first.subagentId);
        expect(runtime.inspect(first.subagentId).surfaceCleanups).toMatchObject([{ status: "failed" }]);
        notifications.length = 0;
        failFirstClose = false;
        const manifest = join(dirname(first.resultPath), "task.json");
        const resultBytes = readFileSync(first.resultPath);
        const originalRename = fs.renameSync;
        let resumeQueued = false;
        renameSpy = spyOn(fs, "renameSync").mockImplementation((from, to) => {
          if (String(from) === outcomeTemporary) outcomeRenames++;
          originalRename(from, to);
          if (!resumeQueued && String(to) === manifest) {
            const record = JSON.parse(readFileSync(manifest, "utf8"));
            if (record.generation === 1 && record.surfaceCleanups?.[0]?.status === "pending") {
              resumeQueued = true;
              // Hold resume after its real shared-operation snapshot, before admission.
              // The cleanup registers later; its actual temporary write must precede g2.
              const wait = runtime["awaitTaskOperations"].bind(runtime);
              admissionSpy = spyOn(runtime as any, "awaitTaskOperations").mockImplementation(async (task: SubagentTask, signal?: AbortSignal) => {
                await wait(task, signal);
                await admissionGate.promise;
              });
              queueMicrotask(() => {
                resume = runtime.resume(first.subagentId, "g2", images);
                void resume.catch(() => {});
              });
            }
          }
        });
        const write = fsPromises.writeFile;
        let held = false;
        let failRetries = false;
        writeSpy = spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
          if (!String(args[0]).startsWith(`${manifest}.`)) return write(...args);
          const outcomeRecord = JSON.parse(String(args[1]));
          const outcome = outcomeRecord.surfaceCleanups?.some((value: any) => value.generation === 1 && value.status === "closed");
          if (outcome && !held) {
            held = true;
            await write(...args);
            outcomeTemporary = String(args[0]);
            await releaseOutcome.promise;
            return;
          }
          if (outcome && failRetries) throw new Error("cleanup outcome write fault");
          return write(...args);
        }) as typeof fsPromises.writeFile);

        removal = runtime.remove(first.subagentId).catch(error => error);
        await waitFor(() => resume !== undefined && outcomeTemporary !== undefined);
        admissionGate.resolve();
        const second = await resume!;
        admissionSpy?.mockRestore();
        expect(existsSync(outcomeTemporary!)).toBeTrue();
        const owner = runtime["get"](first.subagentId);
        const monitor = runtime["monitors"].get(`${first.subagentId}:2`)!;
        const before = readFileSync(manifest);
        const payload = join(dirname(second.resultPath), "image-input-2", "envelope.json");
        const imageBytes = images ? readFileSync(payload) : undefined;
        expect(JSON.parse(before.toString())).toMatchObject({ generation: 2, status: "running", tabId: "tab-2", surfaceCleanups: [{ generation: 1, status: "closed" }] });

        failRetries = true;
        releaseOutcome.resolve();
        expect((await removal as Error).message).toBe("Subagent generation is no longer current");
        expect(outcomeRenames).toBe(0);
        expect(existsSync(outcomeTemporary!)).toBeFalse();
        expect(readFileSync(manifest)).toEqual(before);
        expect(runtime["cleanupOutcomes"].get(`${first.subagentId}:1`)).toMatchObject({ record: { status: "closed", tabId: "tab-1" } });
        expect(runtime["get"](first.subagentId)).toBe(owner);
        expect(runtime["monitors"].get(`${first.subagentId}:2`)).toBe(monitor);
        expect(monitor.signal.aborted).toBeFalse();
        expect(readFileSync(first.resultPath)).toEqual(resultBytes);
        if (imageBytes) expect(readFileSync(payload)).toEqual(imageBytes);
        expect(closes).toEqual(["tab-1", "tab-1"]);

        for (const retry of [() => runtime.recover(root), () => runtime.remove(first.subagentId)]) {
          await expect(retry()).rejects.toThrow("cleanup outcome write fault");
          expect(runtime["get"](first.subagentId)).toBe(owner);
          expect(runtime["monitors"].get(`${first.subagentId}:2`)).toBe(monitor);
          expect(monitor.signal.aborted).toBeFalse();
          expect(readFileSync(manifest)).toEqual(before);
          expect(closes).toEqual(["tab-1", "tab-1"]);
          expect(notifications).toEqual([]);
        }
        failRetries = false;
        await runtime.recover(root);
        expect(runtime.inspect(first.subagentId)).toMatchObject({ generation: 2, status: "running", tabId: "tab-2", surfaceCleanups: [{ generation: 1, status: "closed", tabId: "tab-1" }] });
        expect(runtime["monitors"].size).toBe(1);
        expect(runtime["monitors"].has(`${first.subagentId}:2`)).toBeTrue();
        expect(closes).toEqual(["tab-1", "tab-1"]);
        if (imageBytes) expect(readFileSync(payload)).toEqual(imageBytes);
        expect(readFileSync(first.resultPath)).toEqual(resultBytes);
        expect(notifications).toEqual([]);

        const bytes = JSON.stringify({ subagentId: first.subagentId, generation: 2, status: "completed", result: "G2_AFTER_RECOVERY" });
        await resultPublisher(second.resultPath).publish(bytes);
        await waitFor(() => runtime.inspect(first.subagentId).status === "completed" && notifications.length === 1 && runtime["settlements"].size === 0);
        expect(readFileSync(second.resultPath, "utf8")).toBe(bytes);
        expect(JSON.parse(readFileSync(manifest, "utf8"))).toMatchObject({ generation: 2, status: "completed", tabId: "tab-2", surfaceCleanups: [{ generation: 1, status: "closed" }, { generation: 2, status: "closed", tabId: "tab-2" }] });
        expect(closes).toEqual(["tab-1", "tab-1", "tab-2"]);
        expect(notifications).toEqual([{ subagentId: first.subagentId, generation: 2, status: "completed", label: "cleanup outcome" }]);
        expect(runtime["monitors"].size).toBe(0);
        expect(runtime["cleanupOutcomes"].size).toBe(0);
        if (imageBytes) expect(existsSync(dirname(payload))).toBeFalse();
      } finally {
        admissionGate.resolve(); releaseOutcome.resolve();
        await resume?.catch(() => {});
        await removal;
        admissionSpy?.mockRestore(); renameSpy?.mockRestore(); writeSpy?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true });
      }
    }, 30_000);
  }
  for (const images of [undefined, [{ type: "image" as const, data: "AQ==", mimeType: "image/png" }]]) {
    test(`rejected remove keeps the retained running generation monitored (${images ? "image" : "text"})`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-remove-monitor-"));
      const { transport } = fakeTransport();
      const closes: string[] = [];
      const notifications: CompletionNotification[] = [];
      let created = 0;
      let closeFails = true;
      transport.createTab = async () => ({ tabId: `tab-${++created}`, paneId: `pane-${created}` });
      transport.closeTab = async id => { closes.push(id); if (closeFails) throw new Error("initial close fault"); return "closed"; };
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
      let writing: ReturnType<typeof spyOn> | undefined;
      try {
        const first = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task", images });
        await runtime.cancel("task");
        const second = await runtime.resume("task", "g2", images);
        closes.length = 0; notifications.length = 0; closeFails = false;
        const manifest = join(dirname(second.resultPath), "task.json");
        const disk = () => JSON.parse(readFileSync(manifest, "utf8"));
        const firstBytes = readFileSync(first.resultPath);
        const payload = join(dirname(second.resultPath), "image-input-2", "envelope.json");
        const imageBytes = images ? readFileSync(payload) : undefined;
        const write = fsPromises.writeFile;
        let blocked = true;
        let writes = 0;
        writing = spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
          if (String(args[0]).startsWith(`${manifest}.`)
            && JSON.parse(String(args[1])).surfaceCleanups?.some((c: any) => c.generation === 1 && c.status === "closed")) {
            writes++;
            if (blocked) throw new Error("prior cleanup outcome write fault");
          }
          return write(...args);
        }) as typeof fsPromises.writeFile);
        await expect(runtime.recover(root)).rejects.toThrow("prior cleanup outcome write fault");
        const owned = runtime["get"]("task");
        const monitor = runtime["monitors"].get("task:2");
        expect(monitor).toBeDefined();
        for (let attempt = 0; attempt < 2; attempt++) {
          const before = writes;
          await expect(runtime.remove("task")).rejects.toThrow("prior cleanup outcome write fault");
          expect(writes).toBe(before + 1);
          expect(runtime["get"]("task")).toBe(owned);
          expect(runtime["monitors"].get("task:2")).toBe(monitor);
          expect(monitor!.signal.aborted).toBeFalse();
          expect(runtime.inspect("task")).toMatchObject({ generation: 2, status: "running", tabId: "tab-2" });
          expect(disk()).toMatchObject({ generation: 2, status: "running", surfaceCleanups: [{ generation: 1, status: "pending" }] });
          expect(closes).toEqual(["tab-1"]);
          expect(notifications).toEqual([]);
          expect(readFileSync(first.resultPath)).toEqual(firstBytes);
          expect(existsSync(second.resultPath)).toBeFalse();
          if (imageBytes) expect(readFileSync(payload)).toEqual(imageBytes);
        }
        blocked = false;
        const bytes = JSON.stringify({ subagentId: "task", generation: 2, status: "completed", result: "LATER_RESULT" });
        await resultPublisher(second.resultPath).publish(bytes);
        // No join/recover/cancel call may rescue a monitor lost by rejected removal.
        await waitFor(() => runtime.inspect("task").status === "completed" && disk().status === "completed"
          && notifications.length === 1 && runtime["settlements"].size === 0);
        expect(runtime.inspect("task")).toMatchObject({ generation: 2, status: "completed", result: "LATER_RESULT" });
        expect(disk()).toMatchObject({ generation: 2, status: "completed", surfaceCleanups: [{ generation: 1, status: "closed" }, { generation: 2, status: "closed" }] });
        expect(readFileSync(first.resultPath)).toEqual(firstBytes);
        expect(readFileSync(second.resultPath, "utf8")).toBe(bytes);
        expect(closes).toEqual(["tab-1", "tab-2"]);
        expect(notifications).toEqual([{ subagentId: "task", generation: 2, status: "completed", label: "offline" }]);
        expect(runtime["monitors"].size).toBe(0);
        expect(runtime["cleanupOutcomes"].size).toBe(0);
        if (images) expect(existsSync(dirname(payload))).toBeFalse();
      } finally { writing?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
    }, 30_000);

    for (const stage of ["manifest", "prior-close", "outcome", "active-close", "image", "session", "artifacts"] as const) {
      if (stage === "image" && !images) continue;
      test(`rejected remove restores monitoring after ${stage} failure (${images ? "image" : "text"})`, async () => {
        const root = mkdtempSync(join(tmpdir(), "subagents-remove-failure-"));
        const { transport } = fakeTransport();
        const notifications: CompletionNotification[] = [];
        const closes: string[] = [];
        let created = 0;
        let initialFailure = stage === "prior-close" || stage === "outcome";
        let blocked = false;
        transport.createTab = async () => ({ tabId: `tab-${++created}`, paneId: `pane-${created}` });
        transport.closeTab = async id => {
          closes.push(id);
          if (initialFailure || (blocked && (stage === "prior-close" || stage === "active-close"))) throw new Error("remove close fault");
          return "closed";
        };
        const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
        let writing: ReturnType<typeof spyOn> | undefined;
        let deletion: ReturnType<typeof spyOn> | undefined;
        const warnings = spyOn(console, "warn").mockImplementation(() => {});
        try {
          let task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task", images });
          if (initialFailure) { await runtime.cancel("task"); task = await runtime.resume("task", "next", images); }
          initialFailure = false; closes.length = 0; notifications.length = 0;
          writeFileSync(task.sessionFile, "retained session");
          const owned = runtime["get"]("task");
          const manifest = join(dirname(task.resultPath), "task.json");
          const disk = () => JSON.parse(readFileSync(manifest, "utf8"));
          const payload = join(dirname(task.resultPath), `image-input-${task.generation}`, "envelope.json");
          const write = fsPromises.writeFile;
          let faults = 0;
          let paused: number | undefined;
          writing = spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
            if (blocked && String(args[0]).startsWith(`${manifest}.`)
              && (stage === "manifest" || (stage === "outcome" && JSON.parse(String(args[1])).surfaceCleanups?.some((c: any) => c.generation === 1 && c.status === "closed")))) {
              faults++; paused = runtime["monitors"].size; throw new Error("remove write fault");
            }
            return write(...args);
          }) as typeof fsPromises.writeFile);
          const remove = fs.rmSync;
          deletion = spyOn(fs, "rmSync").mockImplementation((path, options) => {
            const target = stage === "image" ? payload : stage === "session" ? task.sessionFile : stage === "artifacts" ? dirname(task.resultPath) : undefined;
            if (blocked && String(path) === target) { faults++; paused = runtime["monitors"].size; throw new Error("remove deletion fault"); }
            return remove(path, options);
          });
          blocked = true;
          await expect(runtime.remove("task")).rejects.toThrow(stage === "prior-close" ? "surface_cleanup_failed" : stage === "active-close" ? "remove close fault"
            : stage === "image" ? "Image input failed at cleanup" : stage === "session" || stage === "artifacts" ? "remove deletion fault" : "remove write fault");
          if (stage !== "prior-close" && stage !== "active-close") { expect(faults).toBe(1); expect(paused).toBe(0); }
          expect(runtime["get"]("task")).toBe(owned);
          expect(runtime["monitors"].has(`task:${task.generation}`)).toBeTrue();
          expect(runtime["monitors"].size).toBe(1);
          expect(runtime.inspect("task")).toMatchObject({ generation: task.generation, status: "running" });
          expect(disk()).toMatchObject({ generation: task.generation, status: "running" });
          expect(existsSync(task.sessionFile)).toBe(stage !== "artifacts");
          expect(existsSync(task.resultPath)).toBeFalse();
          expect(notifications).toEqual([]);
          if (stage === "image") expect(existsSync(payload)).toBeTrue();
          blocked = false;
          const bytes = JSON.stringify({ subagentId: "task", generation: task.generation, status: "completed", result: "AFTER_REMOVE_FAILURE" });
          await resultPublisher(task.resultPath).publish(bytes);
          await waitFor(() => runtime.inspect("task").status === "completed" && disk().status === "completed"
            && notifications.length === 1 && runtime["settlements"].size === 0);
          expect(runtime["monitors"].size).toBe(0);
          expect(readFileSync(task.resultPath, "utf8")).toBe(bytes);
          expect(notifications).toEqual([{ subagentId: "task", generation: task.generation, status: "completed", label: "offline" }]);
          // A close attempted by removal may have succeeded or thrown before the later settlement.
          expect(closes.filter(id => id === task.tabId)).toHaveLength(stage === "manifest" || stage === "prior-close" || stage === "outcome" ? 1 : 2);
          expect(runtime["cleanupOutcomes"].size).toBe(0);
          if (images) expect(existsSync(dirname(payload))).toBeFalse();
        } finally { writing?.mockRestore(); deletion?.mockRestore(); warnings.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
      }, 30_000);
    }

    test(`prior cleanup outcome survives running recovery and scope waits (${images ? "image" : "text"})`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-prior-outcome-"));
      const parent = join(root, "parent.jsonl");
      const otherParent = join(root, "other.jsonl");
      const { transport } = fakeTransport();
      const closes: string[] = [];
      const notifications: CompletionNotification[] = [];
      let created = 0;
      let closeFails = true;
      transport.createTab = async () => ({ tabId: `tab-${++created}`, paneId: `pane-${created}` });
      transport.closeTab = async id => { closes.push(id); if (closeFails) throw new Error("initial close fault"); return "closed"; };
      const runtime = new SubagentRuntime(transport, handlerRegistry(), undefined, value => { notifications.push(value); });
      let writing: ReturnType<typeof spyOn> | undefined;
      let release: (() => void) | undefined;
      try {
        const first = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task", parentSessionFile: parent, images });
        await runtime.cancel("task");
        expect(runtime.inspect("task").surfaceCleanups).toMatchObject([{ generation: 1, status: "failed" }]);
        const second = await runtime.resume("task", "g2", images);
        runtime.stop(); closes.length = 0; notifications.length = 0; closeFails = false;
        const manifest = join(dirname(first.resultPath), "task.json");
        const disk = () => JSON.parse(readFileSync(manifest, "utf8"));
        const bytes = readFileSync(first.resultPath);
        const payload = join(dirname(second.resultPath), "image-input-2", "envelope.json");
        const imageBytes = images ? readFileSync(payload) : undefined;
        const write = fsPromises.writeFile;
        let blocked = true;
        let writes = 0;
        let hold = false;
        const entered = Promise.withResolvers<void>();
        const gate = Promise.withResolvers<void>();
        release = gate.resolve;
        writing = spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
          if (String(args[0]).startsWith(`${manifest}.`)
            && JSON.parse(String(args[1])).surfaceCleanups?.some((c: any) => c.generation === 1 && c.status === "closed")) {
            writes++;
            if (hold) { entered.resolve(); await gate.promise; }
            if (blocked) throw new Error("prior cleanup outcome write fault");
          }
          return write(...args);
        }) as typeof fsPromises.writeFile);
        await expect(runtime.recover(root, parent)).rejects.toThrow("prior cleanup outcome write fault");
        const owned = runtime["get"]("task");
        const scope = runtime["activeTasksDir"];
        expect(disk()).toMatchObject({ generation: 2, status: "running", surfaceCleanups: [{ generation: 1, status: "pending" }] });
        expect(runtime.inspect("task")).toMatchObject({ generation: 2, status: "running", surfaceCleanups: [{ generation: 1, status: "closed" }] });
        expect(closes).toEqual(["tab-1"]);
        // No rebuild, scope switch, generation change or current-generation effect on persistent failure.
        for (const act of [() => runtime.recover(root, parent), () => runtime.recover(root, otherParent),
          () => runtime.join("task"), () => runtime.resume("task", "no"), () => runtime.remove("task"), () => runtime.cancel("task")]) {
          const before = writes;
          await expect(act()).rejects.toThrow("prior cleanup outcome write fault");
          expect(writes).toBe(before + 1);
          expect(runtime["get"]("task")).toBe(owned);
          expect(runtime["activeTasksDir"]).toBe(scope);
          expect(runtime.inspect("task")).toMatchObject({ generation: 2, status: "running" });
          expect(closes).toEqual(["tab-1"]);
          expect(notifications).toEqual([]);
          expect(readFileSync(first.resultPath)).toEqual(bytes);
          expect(existsSync(second.resultPath)).toBeFalse();
        }
        // Concurrent same/different-scope recoveries wait for the retained outcome, then all reject.
        hold = true;
        const before = writes;
        const recoveries = [runtime.recover(root, parent), runtime.recover(root, parent), runtime.recover(root, otherParent)];
        const outcomes = Promise.allSettled(recoveries);
        await entered.promise;
        expect(writes).toBe(before + 1);
        expect(runtime["get"]("task")).toBe(owned);
        gate.resolve(); hold = false;
        expect((await outcomes).map(value => value.status)).toEqual(["rejected", "rejected", "rejected"]);
        expect(writes).toBe(before + 1);
        blocked = false;
        await Promise.all([runtime.recover(root, parent), runtime.recover(root, parent)]);
        expect(runtime["get"]("task")).not.toBe(owned);
        expect(disk()).toMatchObject({ generation: 2, status: "running", surfaceCleanups: [{ generation: 1, status: "closed" }] });
        expect(runtime.inspect("task")).toMatchObject({ generation: 2, status: "running", tabId: "tab-2" });
        expect(closes).toEqual(["tab-1"]);
        expect(notifications).toEqual([]);
        expect(created).toBe(2);
        expect(readFileSync(first.resultPath)).toEqual(bytes);
        if (imageBytes) expect(readFileSync(payload)).toEqual(imageBytes);
        expect(runtime["cleanups"].size).toBe(0);
        await runtime.recover(root, otherParent);
        expect(runtime.listTasks()).toEqual([]);
        await runtime.recover(root, parent);
        expect(closes).toEqual(["tab-1"]);
      } finally { release?.(); writing?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
    }, 30_000);
  }
  for (const images of [undefined, [{ type: "image" as const, data: "AQ==", mimeType: "image/png" }]])
  for (const boundary of ["stopped-before", "shutdown", "recovery", "scope", "generation", "success"] as const) {
    test(`remove monitor restoration respects ${boundary} ownership (${images ? "image" : "text"})`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-remove-ownership-"));
      const parent = join(root, "parent.jsonl");
      const { transport } = fakeTransport();
      let created = 0;
      transport.createTab = async () => ({ tabId: `tab-${++created}`, paneId: `pane-${created}` });
      const notifications: CompletionNotification[] = [];
      const runtime = new SubagentRuntime(transport, handlerRegistry(), undefined, value => { notifications.push(value); });
      const entered = Promise.withResolvers<void>();
      const gate = Promise.withResolvers<void>();
      let writing: ReturnType<typeof spyOn> | undefined;
      try {
        const task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task", images, parentSessionFile: parent });
        const old = runtime["get"]("task");
        const manifest = join(dirname(task.resultPath), "task.json");
        const write = fsPromises.writeFile;
        let held = false;
        writing = spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
          if (!held && String(args[0]).startsWith(`${manifest}.`)) {
            held = true; entered.resolve(); await gate.promise;
            if (boundary !== "success") throw new Error("delayed removal write fault");
          }
          return write(...args);
        }) as typeof fsPromises.writeFile);
        if (boundary === "stopped-before") runtime.stop();
        const removal = runtime.remove("task").then(() => undefined, error => error);
        await entered.promise;
        expect(runtime["monitors"].size).toBe(0);
        if (boundary === "shutdown") runtime.stop();
        if (boundary === "recovery") await runtime.recover(root, parent);
        if (boundary === "scope") await runtime.recover(root, join(root, "other.jsonl"));
        if (boundary === "generation") { await runtime.cancel("task"); await runtime.resume("task", "g2", images); }
        const paired = boundary === "success" ? runtime.remove("task") : undefined;
        const current = runtime["tasks"].get("task");
        const monitor = current ? runtime["monitors"].get(`task:${current.generation}`) : undefined;
        gate.resolve();
        const failure = await removal;
        await paired;
        expect(runtime["removals"].size).toBe(0);
        if (boundary === "success") {
          expect(failure).toBeUndefined();
          expect(runtime.listTasks()).toEqual([]);
          expect(runtime["monitors"].size).toBe(0);
          expect(existsSync(dirname(task.resultPath))).toBeFalse();
        } else if (boundary === "scope") {
          expect(failure.message).toBe("delayed removal write fault");
          expect(runtime.listTasks()).toEqual([]);
          expect(runtime["monitors"].size).toBe(0);
          expect(runtime["activeTasksDir"]).toBe(join(root, "other", "tasks"));
          expect(JSON.parse(readFileSync(manifest, "utf8"))).toMatchObject({ generation: 1, status: "running" });
          runtime["startMonitor"](old);
          expect(runtime["monitors"].size).toBe(0);
        } else {
          expect(failure.message).toBe("delayed removal write fault");
          expect(runtime["get"]("task")).toBe(current!);
          expect(existsSync(manifest)).toBeTrue();
          if (boundary === "shutdown" || boundary === "stopped-before") {
            expect(runtime["monitors"].size).toBe(0);
            await resultPublisher(task.resultPath).publish(JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "AFTER_STOP" }));
            await Bun.sleep(600);
            expect(runtime.inspect("task").status).toBe("running");
            expect(JSON.parse(readFileSync(manifest, "utf8")).status).toBe("running");
            expect(notifications).toEqual([]);
          } else {
            expect(current).not.toBe(old);
            expect(runtime["monitors"].size).toBe(1);
            expect(runtime["monitors"].get(`task:${current!.generation}`)).toBe(monitor);
            expect(monitor!.signal.aborted).toBeFalse();
            if (boundary === "generation") expect(runtime["monitors"].has("task:1")).toBeFalse();
            notifications.length = 0;
            await resultPublisher(current!.resultPath).publish(JSON.stringify({ subagentId: "task", generation: current!.generation, status: "completed", result: "CURRENT_RESULT" }));
            await waitFor(() => runtime.inspect("task").status === "completed" && notifications.length === 1 && runtime["settlements"].size === 0);
            expect(JSON.parse(readFileSync(manifest, "utf8"))).toMatchObject({ generation: current!.generation, status: "completed" });
            expect(notifications).toEqual([{ subagentId: "task", generation: current!.generation, status: "completed", label: "offline" }]);
          }
        }
      } finally { gate.resolve(); writing?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
    }, 30_000);
  }

  for (const outcome of ["closed", "failed"] as const) {
    test(`multiple prior cleanup outcomes coalesce bounded retries (${outcome})`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-multiple-outcomes-"));
      const { transport } = fakeTransport();
      const closes: string[] = [];
      let created = 0;
      let initial = true;
      transport.createTab = async () => ({ tabId: `tab-${++created}`, paneId: `pane-${created}` });
      transport.closeTab = async id => {
        closes.push(id);
        if (initial || (id === "tab-2" && outcome === "failed")) throw new Error("real close failure");
        return "closed";
      };
      const notifications: CompletionNotification[] = [];
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
      let writing: ReturnType<typeof spyOn> | undefined;
      const gate = Promise.withResolvers<void>();
      try {
        const first = await runtime.spawn({ agent: "handler", cwd: root, prompt: "one", label: "offline", taskSlug: "task" });
        await runtime.cancel("task");
        const second = await runtime.resume("task", "two");
        await runtime.cancel("task");
        await runtime.resume("task", "three");
        runtime.stop(); initial = false; closes.length = 0; notifications.length = 0;
        const bytes = [first, second].map(task => readFileSync(task.resultPath));
        const manifest = join(dirname(first.resultPath), "task.json");
        const disk = () => JSON.parse(readFileSync(manifest, "utf8"));
        const write = fsPromises.writeFile;
        let blocked = true;
        let hold = false;
        let writes = 0;
        const entered = Promise.withResolvers<void>();
        writing = spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
          if (String(args[0]).startsWith(`${manifest}.`)
            && JSON.parse(String(args[1])).surfaceCleanups?.some((c: any) => c.generation === 2 && c.status === outcome)) {
            writes++;
            if (hold) { entered.resolve(); await gate.promise; }
            if (blocked) throw new Error("second outcome write fault");
          }
          return write(...args);
        }) as typeof fsPromises.writeFile);
        await expect(runtime.recover(root)).rejects.toThrow("second outcome write fault");
        expect(closes).toEqual(["tab-1", "tab-2"]);
        expect(disk().surfaceCleanups).toMatchObject([{ generation: 1, status: "closed" }, { generation: 2, status: "pending" }]);
        const owned = runtime["get"]("task");
        hold = true;
        const joining = runtime.join("task");
        const joined = joining.catch(error => error);
        await entered.promise;
        const resume = runtime.resume("task", "no").catch(error => error);
        const remove = runtime.remove("task").catch(error => error);
        const controller = new AbortController();
        const aborted = runtime.join("task", 3, controller.signal);
        controller.abort();
        await expect(aborted).rejects.toMatchObject({ name: "AbortError" });
        expect(writes).toBe(2);
        expect(closes).toEqual(["tab-1", "tab-2"]);
        gate.resolve(); hold = false;
        for (const error of await Promise.all([joined, resume, remove])) expect(error.message).toBe("second outcome write fault");
        expect(writes).toBe(2);
        expect(runtime["get"]("task")).toBe(owned);
        blocked = false;
        // A bounded resume writes retained evidence before its ordinary active-task rejection.
        await expect(runtime.resume("task", "no")).rejects.toThrow("Cannot resume an active subagent");
        expect(disk().surfaceCleanups).toMatchObject([{ generation: 1, status: "closed" }, { generation: 2, status: outcome }]);
        expect(runtime["cleanupOutcomes"].size).toBe(0);
        expect(closes).toEqual(["tab-1", "tab-2"]);
        await runtime.recover(root);
        expect(closes).toEqual(outcome === "failed" ? ["tab-1", "tab-2", "tab-2"] : ["tab-1", "tab-2"]);
        expect(runtime.inspect("task")).toMatchObject({ generation: 3, status: "running", tabId: "tab-3" });
        expect(notifications).toEqual([]);
        expect([first, second].map(task => readFileSync(task.resultPath))).toEqual(bytes);
      } finally { gate.resolve(); writing?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
    });
  }

  for (const images of [false, true]) for (const order of ["child-first", "cancel-first"] as const) {
    test(`cancel retries a temporarily unreadable first Result without join (${images ? "image" : "text"}, ${order})`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-cancel-result-retry-"));
      const { transport, calls } = fakeTransport();
      const notifications: CompletionNotification[] = [];
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
      let deletion: ReturnType<typeof spyOn> | undefined;
      let opening: ReturnType<typeof spyOn> | undefined;
      let release: (() => void) | undefined;
      try {
        const task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task",
          ...(images ? { images: [{ type: "image", data: "AQ==", mimeType: "image/png" }] } : {}),
        });
        calls.length = 0;
        const manifest = join(dirname(task.resultPath), "task.json");
        const bytes = JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "FIRST_RESULT" });
        let cancelling: Promise<SubagentTask> | undefined;
        let parentTemporary = "";
        if (order === "cancel-first") {
          const open = fsPromises.open;
          let entered!: () => void;
          const atOpen = new Promise<void>(resolve => { entered = resolve; });
          const gate = new Promise<void>(resolve => { release = resolve; });
          let held = false;
          opening = spyOn(fsPromises, "open").mockImplementation((async (...args: Parameters<typeof fsPromises.open>) => {
            if (!held && String(args[0]).startsWith(`${task.resultPath}.`)) { held = true; parentTemporary = String(args[0]); entered(); await gate; }
            return open(...args);
          }) as typeof fsPromises.open);
          cancelling = runtime.cancel("task");
          await atOpen;
          expect(runtime.inspect("task").status).toBe("running");
        }
        const unlink = fs.unlinkSync;
        let refused = 0;
        deletion = spyOn(fs, "unlinkSync").mockImplementation(path => {
          if (String(path).startsWith(`${task.resultPath}.`) && String(path).endsWith(".tmp") && String(path) !== parentTemporary) {
            refused++; throw new Error("PRIVATE injected unlink fault");
          }
          return unlink(path);
        });
        await resultPublisher(task.resultPath).publish(bytes);
        const temporary = join(dirname(task.resultPath), readdirSync(dirname(task.resultPath)).find(name => name.startsWith("result-1.json.") && name.endsWith(".tmp"))!);
        if (order === "cancel-first") {
          release!(); release = undefined;
          await expect(cancelling!).rejects.toThrow(/storage/i);
        } else {
          await expect(Promise.all([runtime.cancel("task"), runtime.cancel("task")])).rejects.toThrow("Image input failed at storage.");
        }
        expect(readFileSync(task.resultPath, "utf8")).toBe(bytes);
        expect(fs.lstatSync(task.resultPath).nlink).toBe(2);
        expect(runtime.inspect("task")).toMatchObject({ status: "running", result: undefined });
        expect(JSON.parse(readFileSync(manifest, "utf8")).status).toBe("running");
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(0);
        expect(notifications).toEqual([]);
        const initialRefused = refused;
        await waitFor(() => refused > initialRefused); // Observe a real monitor retry while the unlink fault remains active.
        expect(refused).toBeGreaterThan(initialRefused);
        expect(runtime.inspect("task").status).toBe("running");
        expect(runtime["monitors"].size).toBe(1);
        expect(JSON.parse(readFileSync(manifest, "utf8")).status).toBe("running");
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(0);
        expect(notifications).toEqual([]);
        deletion.mockRestore(); deletion = undefined;
        await waitFor(() => runtime.inspect("task").status === "completed" && notifications.length === 1);
        expect(JSON.parse(readFileSync(manifest, "utf8")).status).toBe("completed");
        expect(readFileSync(task.resultPath, "utf8")).toBe(bytes);
        expect(fs.lstatSync(task.resultPath).nlink).toBe(1);
        expect(runtime["monitors"].size).toBe(0);
        expect(existsSync(temporary)).toBeFalse();
        expect(readdirSync(dirname(task.resultPath)).filter(name => name.startsWith("result-1.json.") && name.endsWith(".tmp"))).toEqual([]);
        if (images) expect(existsSync(join(dirname(task.resultPath), "image-input-1"))).toBeFalse();
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
        expect(notifications).toEqual([{ subagentId: "task", generation: 1, status: "completed", label: "offline" }]);
        await runtime.cancel("task");
        await runtime.join("task");
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
        expect(notifications).toHaveLength(1);
      } finally {
        release?.(); opening?.mockRestore(); deletion?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true });
      }
    }, 30_000);
  }

  for (const images of [false, true]) {
    test(`cancel publication failure retains first later Result and its monitor (${images ? "image" : "text"})`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-cancel-publish-retry-"));
      const { transport, calls } = fakeTransport();
      const notifications: CompletionNotification[] = [];
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
      let opening: ReturnType<typeof spyOn> | undefined;
      let deletion: ReturnType<typeof spyOn> | undefined;
      try {
        const task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task",
          ...(images ? { images: [{ type: "image", data: "AQ==", mimeType: "image/png" }] } : {}),
        });
        calls.length = 0;
        const manifest = join(dirname(task.resultPath), "task.json");
        const open = fsPromises.open;
        let faulted = false;
        opening = spyOn(fsPromises, "open").mockImplementation((async (...args: Parameters<typeof fsPromises.open>) => {
          if (!faulted && String(args[0]).startsWith(`${task.resultPath}.`)) { faulted = true; throw new Error("PRIVATE cancel publication fault"); }
          return open(...args);
        }) as typeof fsPromises.open);
        await expect(runtime.cancel("task")).rejects.toThrow("PRIVATE cancel publication fault");
        expect(faulted).toBeTrue();
        expect(existsSync(task.resultPath)).toBeFalse();
        expect(runtime.inspect("task").status).toBe("running");
        expect(JSON.parse(readFileSync(manifest, "utf8")).status).toBe("running");
        expect(runtime["pendingSettlements"].size).toBe(1);
        expect(runtime["monitors"].size).toBe(1);
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(0);
        expect(notifications).toEqual([]);
        opening.mockRestore(); opening = undefined;
        const unlink = fs.unlinkSync;
        deletion = spyOn(fs, "unlinkSync").mockImplementation(path => {
          if (String(path).startsWith(`${task.resultPath}.`) && String(path).endsWith(".tmp")) throw new Error("PRIVATE unlink fault");
          return unlink(path);
        });
        const bytes = JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "FIRST_RESULT" });
        await resultPublisher(task.resultPath).publish(bytes);
        await Bun.sleep(600);
        expect(runtime.inspect("task").status).toBe("running");
        expect(JSON.parse(readFileSync(manifest, "utf8")).status).toBe("running");
        expect(notifications).toEqual([]);
        deletion.mockRestore(); deletion = undefined;
        await waitFor(() => runtime.inspect("task").status === "completed" && notifications.length === 1);
        expect(readFileSync(task.resultPath, "utf8")).toBe(bytes);
        expect(JSON.parse(readFileSync(manifest, "utf8")).status).toBe("completed");
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
        expect(notifications).toHaveLength(1);
        await runtime.cancel("task");
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
      } finally { opening?.mockRestore(); deletion?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
    }, 30_000);
  }

  for (const first of ["child", "cancel"] as const) {
    test(`cancel keeps running observation and retries after manifest write failure (${first} Result first)`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-cancel-persist-retry-"));
      const { transport, calls } = fakeTransport();
      const notifications: CompletionNotification[] = [];
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
      let writing: ReturnType<typeof spyOn> | undefined;
      try {
        const task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task" });
        calls.length = 0;
        const manifest = join(dirname(task.resultPath), "task.json");
        if (first === "child") await resultPublisher(task.resultPath).publish(JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "FIRST_RESULT" }));
        const write = fsPromises.writeFile;
        let failed = false;
        writing = spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
          if (!failed && String(args[0]).startsWith(`${manifest}.`)) { failed = true; throw new Error("PRIVATE manifest write fault"); }
          return write(...args);
        }) as typeof fsPromises.writeFile);
        await expect(runtime.cancel("task")).rejects.toThrow("PRIVATE manifest write fault");
        expect(failed).toBeTrue();
        expect(runtime.inspect("task")).toMatchObject({ status: "running", result: undefined });
        expect(JSON.parse(readFileSync(manifest, "utf8")).status).toBe("running");
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(0);
        expect(notifications).toEqual([]);
        expect(runtime["pendingSettlements"].size).toBe(1);
        writing.mockRestore(); writing = undefined;
        await waitFor(() => runtime.inspect("task").status === (first === "child" ? "completed" : "cancelled") && notifications.length === 1);
        expect(JSON.parse(readFileSync(manifest, "utf8")).status).toBe(first === "child" ? "completed" : "cancelled");
        expect(JSON.parse(readFileSync(task.resultPath, "utf8")).status).toBe(first === "child" ? "completed" : "cancelled");
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
        expect(notifications).toHaveLength(1);
        await runtime.cancel("task");
        expect(notifications).toHaveLength(1);
      } finally { writing?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
    }, 30_000);
  }

  for (const images of [false, true]) for (const order of ["child-first", "cancel-first"] as const) {
    test(`post-close outcome write failure keeps terminal intent and retries without reclose (${images ? "image" : "text"}, ${order})`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-post-close-retry-"));
      const { transport, calls } = fakeTransport();
      const notifications: CompletionNotification[] = [];
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
      let writing: ReturnType<typeof spyOn> | undefined;
      try {
        const task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task",
          ...(images ? { images: [{ type: "image", data: "AQ==", mimeType: "image/png" }] } : {}),
        });
        calls.length = 0;
        const manifest = join(dirname(task.resultPath), "task.json");
        const firstResult = JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "FIRST_RESULT" });
        if (order === "child-first") await resultPublisher(task.resultPath).publish(firstResult);
        const write = fsPromises.writeFile;
        let writes = 0;
        let blocked = true;
        writing = spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
          if (String(args[0]).startsWith(`${manifest}.`) && ++writes >= 2 && blocked) throw new Error("PRIVATE cleanup-outcome manifest write fault");
          return write(...args);
        }) as typeof fsPromises.writeFile);
        await expect(runtime.cancel("task")).rejects.toThrow("PRIVATE cleanup-outcome manifest write fault");
        const bytes = readFileSync(task.resultPath, "utf8");
        expect(bytes).toBe(order === "child-first" ? firstResult : JSON.stringify({ subagentId: "task", generation: 1, status: "cancelled" }));
        const status = order === "child-first" ? "completed" : "cancelled";
        expect(writes).toBe(2);
        expect(JSON.parse(readFileSync(manifest, "utf8"))).toMatchObject({ status, surfaceCleanups: [{ generation: 1, status: "pending", tabId: "tab-1" }] });
        expect(runtime.inspect("task")).toMatchObject({ status, surfaceCleanups: [{ generation: 1, status: "closed", tabId: "tab-1" }] });
        expect(runtime["monitors"].size).toBe(0);
        expect(runtime["pendingSettlements"].size).toBe(1);
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
        expect(notifications).toEqual([]);
        await expect(runtime.join("task")).rejects.toThrow("PRIVATE cleanup-outcome manifest write fault");
        expect(writes).toBe(3);
        await Bun.sleep(550); // No running monitor may re-close or quietly complete a failed outcome write.
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
        expect(writes).toBe(3);
        expect(runtime["monitors"].size).toBe(0);
        expect(notifications).toEqual([]);
        blocked = false;
        const settled = await runtime.join("task");
        expect(settled).toMatchObject({ status, surfaceCleanups: [{ generation: 1, status: "closed" }] });
        expect(JSON.parse(readFileSync(manifest, "utf8"))).toMatchObject({ status, surfaceCleanups: [{ generation: 1, status: "closed" }] });
        expect(runtime["pendingSettlements"].size).toBe(0);
        if (images) expect(existsSync(join(dirname(task.resultPath), "image-input-1"))).toBeFalse();
        expect(readFileSync(task.resultPath, "utf8")).toBe(bytes);
        expect(notifications).toEqual([{ subagentId: "task", generation: 1, status, label: "offline" }]);
        await runtime.cancel("task");
        await runtime.join("task");
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
        expect(notifications).toHaveLength(1);
        expect(readFileSync(task.resultPath, "utf8")).toBe(bytes);
      } finally { writing?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
    }, 30_000);
  }

  for (const stage of ["before-close", "after-close", "before-notify"] as const) {
    test(`late Result with ${stage} persistence failure retains its stage across retries and notification failure`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-late-result-retry-"));
      const { transport, calls } = fakeTransport(false);
      const notifications: CompletionNotification[] = [];
      let notifyAttempts = 0;
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => {
        notifyAttempts++;
        if (notifyAttempts === 1) throw new Error("offline notification failure");
        notifications.push(value);
      });
      let writing: ReturnType<typeof spyOn> | undefined;
      try {
        const task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task" });
        calls.length = 0;
        const manifest = join(dirname(task.resultPath), "task.json");
        const disk = () => JSON.parse(readFileSync(manifest, "utf8"));
        const bytes = JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "LATE_FIRST_RESULT" });
        const close = transport.closeTab;
        const durableAtClose: unknown[] = [];
        transport.closeTab = async id => {
          durableAtClose.push(disk());
          if (stage !== "before-close") await resultPublisher(task.resultPath).publish(bytes);
          return close(id);
        };
        const write = fsPromises.writeFile;
        let writes = 0;
        let blocked = true;
        const failingWrite = stage === "before-notify" ? 3 : 2;
        writing = spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
          if (!String(args[0]).startsWith(`${manifest}.`)) return write(...args);
          const attempt = ++writes;
          if (attempt >= failingWrite && blocked) throw new Error("PRIVATE late-Result persistence fault");
          await write(...args);
          if (attempt === 1 && stage === "before-close") await resultPublisher(task.resultPath).publish(bytes);
        }) as typeof fsPromises.writeFile);
        // Let the real running monitor discover pane_closed, then fail after durable intent.
        await waitFor(() => runtime["pendingSettlements"].size === 1 && runtime["settlements"].size === 0);
        const cleanupStatus = stage === "before-close" ? "pending" : "closed";
        expect(writes).toBe(failingWrite);
        expect(disk()).toMatchObject({ status: "failed", error: "pane_closed", surfaceCleanups: [{ status: stage === "before-notify" ? "closed" : "pending" }] });
        expect(runtime.inspect("task")).toMatchObject({ status: stage === "after-close" ? "failed" : "completed", surfaceCleanups: [{ status: cleanupStatus }] });
        expect(runtime["monitors"].size).toBe(0);
        expect(notifyAttempts).toBe(0);
        for (let retry = 1; retry <= 2; retry++) {
          await expect(runtime.join("task")).rejects.toThrow("PRIVATE late-Result persistence fault");
          expect(writes).toBe(failingWrite + retry);
          expect(runtime.inspect("task")).toMatchObject({ status: "completed", result: "LATE_FIRST_RESULT", error: undefined, surfaceCleanups: [{ status: cleanupStatus }] });
          expect(runtime["monitors"].size).toBe(0);
          expect(notifyAttempts).toBe(0);
          expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(stage === "before-close" ? 0 : 1);
        }
        blocked = false;
        expect(await runtime.join("task")).toMatchObject({ status: "completed", result: "LATE_FIRST_RESULT", surfaceCleanups: [{ status: "closed" }] });
        expect(disk()).toMatchObject({ status: "completed", surfaceCleanups: [{ status: "closed" }] });
        expect(durableAtClose).toMatchObject([{ status: stage === "before-close" ? "completed" : "failed", surfaceCleanups: [{ status: "pending" }] }]);
        expect(notifyAttempts).toBe(1);
        expect(notifications).toEqual([]); // Notifier failure never rolls back terminal state or close evidence.
        await runtime.recover(root);
        expect(notifications).toEqual([{ subagentId: "task", generation: 1, status: "completed", label: "offline" }]);
        await runtime.cancel("task");
        await runtime.join("task");
        expect(notifyAttempts).toBe(2);
        expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
        expect(runtime["pendingSettlements"].size).toBe(0);
        expect(readFileSync(task.resultPath, "utf8")).toBe(bytes);
      } finally { writing?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
    }, 30_000);
  }

  test("terminal recovery retains bounded intent without starting a running monitor", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-terminal-recover-retry-"));
    const { transport, calls } = fakeTransport();
    const notifications: CompletionNotification[] = [];
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
    let writing: ReturnType<typeof spyOn> | undefined;
    try {
      const task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task" });
      runtime.stop(); calls.length = 0;
      const manifest = join(dirname(task.resultPath), "task.json");
      const record = JSON.parse(readFileSync(manifest, "utf8"));
      record.status = "failed"; record.error = "offline failure";
      writeFileSync(manifest, JSON.stringify(record));
      const write = fsPromises.writeFile;
      writing = spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
        if (String(args[0]).startsWith(`${manifest}.`)) throw new Error("PRIVATE terminal persistence fault");
        return write(...args);
      }) as typeof fsPromises.writeFile);
      await expect(runtime.recover(root)).rejects.toThrow("PRIVATE terminal persistence fault");
      expect(runtime.inspect("task")).toMatchObject({ status: "failed", error: "offline failure" });
      expect(runtime["pendingSettlements"].size).toBe(1);
      expect(runtime["monitors"].size).toBe(0);
      expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(0);
      expect(notifications).toEqual([]);
      writing.mockRestore(); writing = undefined;
      await runtime.join("task"); // Terminal recovery has no running monitor; this bounded operation retries intent.
      expect(runtime.inspect("task")).toMatchObject({ status: "failed", error: "offline failure" });
      expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
      expect(notifications).toHaveLength(1);
    } finally { writing?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
  });

  for (const operation of ["join", "recover"] as const) {
    for (const generation of [1, 2]) {
      test(`parent ${operation} takes over child publication after two cleanup failures and exit in generation ${generation}`, async () => {
        const root = mkdtempSync(join(tmpdir(), "subagents-result-takeover-"));
        const { transport, calls } = fakeTransport();
        const notifications: CompletionNotification[] = [];
        let runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
        let deletion: ReturnType<typeof spyOn> | undefined;
        try {
          let task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task" });
          let previous: string | undefined;
          if (generation === 2) {
            await runtime.cancel("task"); previous = readFileSync(task.resultPath, "utf8");
            task = await runtime.resume("task", "offline resumed");
          }
          runtime.stop(); calls.length = 0; notifications.length = 0;
          const child = spawnSync(process.execPath, [join(import.meta.dir, "result-publication-worker.ts")], {
            env: { ...process.env, PI_HERDR_SUBAGENT_RESULT_PATH: task.resultPath,
              PI_HERDR_SUBAGENT_ID: task.subagentId, PI_HERDR_SUBAGENT_GENERATION: String(generation), PI_HERDR_SUBAGENT_IMAGE_INPUT: "" },
            encoding: "utf8", timeout: 30_000,
          });
          expect(child.status).toBe(0);
          expect(JSON.parse(child.stdout)).toEqual({ childCompletionSucceeded: true, shutdowns: 1, cleanupFailures: 2,
            resultLinks: 2, active: false, barrier: { action: "handled" },
            warnings: Array(2).fill("Result temporary cleanup failed for the child generation.") });
          const bytes = readFileSync(task.resultPath);
          const temporary = join(dirname(task.resultPath), readdirSync(dirname(task.resultPath)).find(name => name.startsWith(`result-${generation}.json.`) && name.endsWith(".tmp"))!);
          // A restarted parent has no child-side publication registry.
          if (operation === "recover") runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
          const act = () => operation === "join" ? runtime.join("task") : runtime.recover(root);
          const unlink = fs.unlinkSync;
          deletion = spyOn(fs, "unlinkSync").mockImplementation(path => {
            if (String(path) === temporary) throw new Error("PRIVATE persistent deletion failure");
            unlink(path);
          });
          await expect(act()).rejects.toThrow("Image input failed at storage.");
          expect(calls).toEqual([]); expect(notifications).toEqual([]);
          expect(readFileSync(task.resultPath)).toEqual(bytes);
          expect(fs.lstatSync(task.resultPath).nlink).toBe(2);
          deletion.mockRestore(); deletion = undefined;
          await act();
          expect(await runtime.join("task")).toMatchObject({ status: "completed", generation, result: "FIRST_RESULT" });
          expect(readFileSync(task.resultPath)).toEqual(bytes);
          expect(fs.lstatSync(task.resultPath).nlink).toBe(1);
          expect(existsSync(temporary)).toBeFalse();
          expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
          expect(notifications).toHaveLength(1);
          if (previous) expect(readFileSync(join(dirname(task.resultPath), "result-1.json"), "utf8")).toBe(previous);
          calls.length = 0;
          await runtime.recover(root);
          expect(calls).toEqual([]);
          expect(readFileSync(task.resultPath)).toEqual(bytes);
        } finally { deletion?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
      }, 60_000);
    }
  }
  for (const attack of ["extra-link", "outside-link", "wrong-generation", "temporary-symlink", "foreign-handle", "result-replacement", "task-redirect", "scope-redirect"] as const) {
    test(`parent publication takeover refuses ${attack} and preserves all Result bytes`, async () => {
      const root = mkdtempSync(join(tmpdir(), "subagents-result-takeover-attack-"));
      const { transport, calls } = fakeTransport();
      const notifications: CompletionNotification[] = [];
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
      let opening: ReturnType<typeof spyOn> | undefined;
      let restore = () => {};
      try {
        const task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task" });
        runtime.stop(); calls.length = 0;
        const child = spawnSync(process.execPath, [join(import.meta.dir, "result-publication-worker.ts")], {
          env: { ...process.env, PI_HERDR_SUBAGENT_RESULT_PATH: task.resultPath,
            PI_HERDR_SUBAGENT_ID: task.subagentId, PI_HERDR_SUBAGENT_GENERATION: "1", PI_HERDR_SUBAGENT_IMAGE_INPUT: "" },
          encoding: "utf8", timeout: 30_000,
        });
        expect(child.status).toBe(0);
        const artifact = dirname(task.resultPath);
        const temporary = join(artifact, readdirSync(artifact).find(name => name.startsWith("result-1.json.") && name.endsWith(".tmp"))!);
        const bytes = readFileSync(task.resultPath);
        const foreign = join(root, "foreign.json");
        if (attack === "extra-link") {
          fs.linkSync(task.resultPath, foreign); restore = () => fs.unlinkSync(foreign);
        } else if (attack === "outside-link" || attack === "wrong-generation" || attack === "temporary-symlink") {
          const moved = attack === "wrong-generation" ? temporary.replace("result-1.json.", "result-2.json.") : foreign;
          fs.renameSync(temporary, moved);
          if (attack === "temporary-symlink") fs.symlinkSync(moved, temporary, "file");
          restore = () => { if (attack === "temporary-symlink") fs.unlinkSync(temporary); fs.renameSync(moved, temporary); };
        } else if (attack === "foreign-handle" || attack === "result-replacement") {
          writeFileSync(foreign, bytes);
          const open = fs.openSync;
          opening = spyOn(fs, "openSync").mockImplementation((path, flags, mode) => {
            if (String(path) !== task.resultPath) return open(path, flags, mode);
            if (attack === "foreign-handle") return open(foreign, flags, mode);
            const file = open(path, flags, mode);
            fs.renameSync(task.resultPath, `${task.resultPath}-held`);
            fs.renameSync(foreign, task.resultPath);
            restore = () => { fs.unlinkSync(task.resultPath); fs.renameSync(`${task.resultPath}-held`, task.resultPath); };
            return file;
          });
        } else {
          const target = attack === "task-redirect" ? artifact : dirname(artifact);
          const moved = `${target}-held`;
          fs.renameSync(target, moved);
          fs.symlinkSync(moved, target, process.platform === "win32" ? "junction" : "dir");
          restore = () => { rmSync(target, { force: true }); fs.renameSync(moved, target); };
        }
        await expect(runtime.join("task")).rejects.toThrow("Image input failed at storage.");
        expect(calls).toEqual([]); expect(notifications).toEqual([]);
        expect(runtime.inspect("task").status).toBe("running");
        expect(runtime.inspect("task").result).toBeUndefined();
        expect(readFileSync(task.resultPath)).toEqual(bytes);
        expect(existsSync(temporary)).toBe(!["outside-link", "wrong-generation"].includes(attack));
        opening?.mockRestore(); opening = undefined; restore(); restore = () => {};
        expect(readFileSync(temporary)).toEqual(bytes);
        expect(await runtime.join("task")).toMatchObject({ status: "completed", result: "FIRST_RESULT" });
        expect(readFileSync(task.resultPath)).toEqual(bytes);
      } finally { opening?.mockRestore(); restore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
    }, 30_000);
  }
  for (const operation of ["join", "cancel", "recover"] as const) {
    for (const leaf of ["hardlink", "symlink", "handle"] as const) {
      test(`${operation} refuses untrusted Result ${leaf} without capturing foreign intent`, async () => {
        const root = mkdtempSync(join(tmpdir(), "subagents-result-leaf-"));
        const { transport, calls } = fakeTransport();
        const notifications: CompletionNotification[] = [];
        const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
        let opening: ReturnType<typeof spyOn> | undefined;
        try {
          const task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task" });
          runtime.stop(); calls.length = 0;
          const foreign = join(root, "foreign.json");
          const bytes = JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "FOREIGN_RESULT" });
          writeFileSync(foreign, bytes);
          if (leaf === "hardlink") fs.linkSync(foreign, task.resultPath);
          else if (leaf === "symlink") fs.symlinkSync(foreign, task.resultPath, "file");
          else {
            writeFileSync(task.resultPath, JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "OWNED_RESULT" }));
            const open = fs.openSync;
            opening = spyOn(fs, "openSync").mockImplementation((path, flags, mode) => open(String(path) === task.resultPath ? foreign : path, flags, mode));
          }
          await expect(operation === "join" ? runtime.join("task") : operation === "cancel" ? runtime.cancel("task") : runtime.recover(root)).rejects.toThrow("Image input failed at storage.");
          expect(runtime.listTasks().some(value => value.status === "completed")).toBeFalse();
          if (operation !== "recover") expect(runtime.inspect("task").result).toBeUndefined();
          expect(calls).toEqual([]);
          expect(notifications).toEqual([]);
          expect(readFileSync(foreign, "utf8")).toBe(bytes);
          opening?.mockRestore(); opening = undefined;
          fs.unlinkSync(task.resultPath);
          if (operation !== "cancel") writeFileSync(task.resultPath, JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "OWNED_RESULT" }));
          if (operation === "recover") await runtime.recover(root);
          const settled = await runtime.join("task");
          expect(settled).toMatchObject(operation === "cancel" ? { generation: 1, status: "cancelled", result: undefined } : { generation: 1, status: "completed", result: "OWNED_RESULT" });
          expect(calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
          expect(notifications).toHaveLength(1);
        } finally { opening?.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
      });
    }
  }

  test("manifest hardlink is rejected without adopting its pane or rewriting foreign bytes", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-manifest-leaf-"));
    const { transport, calls } = fakeTransport();
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
    try {
      const task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task" });
      runtime.stop(); calls.length = 0;
      const manifest = join(dirname(task.resultPath), "task.json");
      const bytes = readFileSync(manifest, "utf8");
      const foreign = join(root, "foreign-manifest.json");
      writeFileSync(foreign, bytes); fs.unlinkSync(manifest); fs.linkSync(foreign, manifest);
      await expect(runtime.recover(root)).rejects.toThrow("Image input failed at storage.");
      expect(calls).toEqual([]);
      expect(readFileSync(foreign, "utf8")).toBe(bytes);
      fs.unlinkSync(manifest); writeFileSync(manifest, bytes);
      await runtime.recover(root);
      expect(runtime.inspect("task")).toMatchObject({ generation: 1, status: "running" });
    } finally { runtime.stop(); rmSync(root, { recursive: true, force: true }); }
  });

  test("unrelated regular invalid-artifacts file cannot block valid sibling recovery", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-recovery-invalid-file-"));
    const runtime = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), root);
    try {
      await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task" });
      await runtime.cancel("task"); runtime.stop();
      const malformed = join(root, "tasks", "invalid-artifacts");
      writeFileSync(malformed, "not a directory");
      await runtime.recover(root);
      expect(runtime.inspect("task")).toMatchObject({ generation: 1, status: "cancelled" });
      expect(readFileSync(malformed, "utf8")).toBe("not a directory");
    } finally { runtime.stop(); rmSync(root, { recursive: true, force: true }); }
  });

  test("immediate join abort observes all created promises without settlement retry", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-join-abort-"));
    const runtime = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), root);
    const unhandled: unknown[] = [];
    const listener = (error: unknown) => { unhandled.push(error); };
    process.on("unhandledRejection", listener);
    let retry: ReturnType<typeof spyOn> | undefined;
    try {
      await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task" });
      runtime.stop();
      retry = spyOn(runtime as any, "retrySettlement");
      const controller = new AbortController();
      const waiting = runtime.join("task", 1, controller.signal).catch(error => error.name);
      controller.abort();
      expect(await waiting).toBe("AbortError");
      await Bun.sleep(20);
      expect(unhandled).toEqual([]);
      expect(retry).not.toHaveBeenCalled();
      expect(runtime.inspect("task")).toMatchObject({ generation: 1, status: "running" });
    } finally { retry?.mockRestore(); process.off("unhandledRejection", listener); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
  });
});

describe("recovery performance", () => {
  const timestamp = "2026-08-16T00:00:00.000Z";
  function seed(root: string, subagentId: string, status: "completed" | "failed" | "cancelled", withResult = true) {
    const artifactDir = join(root, "tasks", `${subagentId}-artifacts`);
    mkdirSync(artifactDir, { recursive: true });
    const error = status === "failed" ? "original failure" : undefined;
    const manifestPath = join(artifactDir, "task.json");
    writeFileSync(manifestPath, JSON.stringify({
      version: 2, subagentId, taskSlug: subagentId, generation: 1, agent: "handler", cwd: "/repo", label: subagentId,
      sessionFile: join(root, "tasks", `${subagentId}-g1.jsonl`), status, queuedAt: timestamp, updatedAt: timestamp,
      ...(error ? { error } : {}), opaque: { keep: [1, null] },
      surfaceCleanups: [{ generation: 1, status: "identity_missing", attemptedAt: timestamp, future: { keep: true } }],
    }, null, 2));
    const resultPath = join(artifactDir, "result-1.json");
    if (withResult) writeFileSync(resultPath, JSON.stringify({ subagentId, generation: 1, status,
      ...(status === "completed" ? { result: "retained result" } : {}), ...(error ? { error } : {}),
    }));
    return { manifestPath, resultPath };
  }

  test("unchanged terminal recovery preserves manifest bytes and timestamps without writes", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-recovery-performance-"));
    const files = [seed(root, "completed", "completed"), seed(root, "failed", "failed"), seed(root, "cancelled", "cancelled"), seed(root, "synthetic", "failed", false)];
    const before = files.map(file => readFileSync(file.manifestPath, "utf8"));
    const notifications: CompletionNotification[] = [];
    const { transport, calls } = fakeTransport();
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
    const writes = spyOn(fs, "renameSync");
    try {
      for (let pass = 0; pass < 2; pass++) {
        await runtime.recover("/repo");
        expect(runtime.listTasks()).toHaveLength(4);
        expect(files.map(file => readFileSync(file.manifestPath, "utf8"))).toEqual(before);
        expect(runtime.listTasks().every(task => task.updatedAt === timestamp)).toBeTrue();
      }
      expect(writes.mock.calls.filter(([, path]) => String(path).endsWith("task.json"))).toHaveLength(0);
      expect(runtime.inspect("completed").result).toBe("retained result");
      expect(notifications).toHaveLength(8); // Replay remains eligible without a parent-branch acknowledgement.
      expect(calls).toEqual([]);
      writeFileSync(files[0]!.resultPath, JSON.stringify({ subagentId: "completed", generation: 1, status: "failed", error: "late Result" }));
      seed(root, "new-task", "cancelled");
      await runtime.recover("/repo");
      expect(runtime.listTasks()).toHaveLength(5);
      expect(runtime.inspect("completed")).toMatchObject({ status: "failed", error: "late Result", result: undefined });
      const changed = JSON.parse(readFileSync(files[0]!.manifestPath, "utf8"));
      expect(changed.updatedAt).not.toBe(timestamp);
      expect(changed.opaque).toEqual({ keep: [1, null] });
      expect(writes.mock.calls.filter(([, path]) => String(path) === files[0]!.manifestPath)).toHaveLength(1);
    } finally { writes.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
  });

  test("no-image recovery bypasses recursive image checks but explicit removal retains them", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-image-discovery-performance-"));
    seed(root, "task", "completed");
    const runtime = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), root);
    const checks = spyOn(fs, "realpathSync");
    try {
      await runtime.recover("/repo");
      expect(checks.mock.calls.filter(([path]) => String(path) === root)).toHaveLength(0);
      await runtime.remove("task");
      expect(checks.mock.calls.filter(([path]) => String(path) === root).length).toBeGreaterThan(0);
    } finally { checks.mockRestore(); runtime.stop(); rmSync(root, { recursive: true, force: true }); }
  });

  test("recovery discovers an image orphan after a previous candidate-free recovery", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-image-late-orphan-"));
    const file = seed(root, "task", "completed");
    const runtime = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), root);
    const publisher = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), root);
    try {
      await runtime.recover("/repo");
      await publisher.recover("/repo");
      await publisher["publishImageInput"](publisher.inspect("task"), [{ type: "image", data: "AQ==", mimeType: "image/png" }]);
      const directory = join(dirname(file.resultPath), "image-input-1");
      expect(existsSync(directory)).toBeTrue();
      const before = readFileSync(file.manifestPath, "utf8");
      const checks = spyOn(fs, "realpathSync");
      try {
        await runtime.recover("/repo");
        expect(existsSync(directory)).toBeFalse();
        expect(checks.mock.calls.filter(([path]) => String(path) === root).length).toBeGreaterThan(0);
        expect(readFileSync(file.manifestPath, "utf8")).toBe(before);
      } finally { checks.mockRestore(); }
    } finally { runtime.stop(); publisher.stop(); rmSync(root, { recursive: true, force: true }); }
  }, 30_000);
});

describe("pi-herdr-subagents runtime", () => {
  test("parses Herdr tab create identities", async () => {
    const client = createHerdrClient(async () => ({
      code: 0,
      stderr: "",
      stdout: JSON.stringify({ id: "cli:tab:create", result: { root_pane: { pane_id: "wF:p6", tab_id: "wF:t5" }, tab: { tab_id: "wF:t5", workspace_id: "wF" }, type: "tab_created" } }),
    }));
    const transport = createHerdrTransport(client, { workspaceId: "wF" });
    await expect(transport.createTab({ cwd: "/repo", label: "task" })).resolves.toEqual({ tabId: "wF:t5", paneId: "wF:p6" });
  });

  test("positively verifies retained panes", async () => {
    const present = createHerdrTransport(createHerdrClient(async () => ({ code: 0, stdout: "{}", stderr: "" })));
    await expect(present.paneExists("pane-1")).resolves.toBeTrue();
    const missing = createHerdrTransport(createHerdrClient(async () => ({
      code: 1, stderr: "", stdout: JSON.stringify({ error: { code: "pane_not_found" } }),
    })));
    await expect(missing.paneExists("pane-1")).resolves.toBeFalse();
  });

  test("launches Pi through an exact-arguments Node bootstrap", async () => {
    const registry = handlerRegistry("Execute the Handoff.");
    const { calls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-test-"));
    const runtime = new SubagentRuntime(transport, registry, root);
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "Do\nthe work", label: "task", taskSlug: "task", model: "test/model", thinking: "high" }, modelRegistry("test/model"));
    expect(task).toMatchObject({ subagentId: "task", generation: 1, sessionFile: join(root, "tasks", "task-g1.jsonl"), status: "running" });
    const manifest = JSON.parse(readFileSync(join(dirname(task.resultPath), "task.json"), "utf8"));
    expect(manifest).toMatchObject({
      version: 2, subagentId: task.subagentId, generation: 1, status: "running", paneId: "pane-1",
      queuedAt: expect.any(String), startedAt: expect.any(String), updatedAt: expect.any(String),
    });
    expect(calls[0]).toMatchObject({ op: "create", input: { cwd: "/repo", env: { PI_HERDR_SUBAGENT_ID: "task", PI_HERDR_SUBAGENT_GENERATION: "1" } } });
    const launch = calls[1] as { op: string; command: string; args: string[] };
    expect(launch).toMatchObject({ op: "run", command: "powershell.exe" });
    const scriptPath = launch.args.at(-1)!;
    expect(scriptPath).toBe(join(root, "tasks", "task-artifacts", "launch-1.ps1"));
    const script = readFileSync(scriptPath, "utf8");
    const bootstrapPath = join(root, "tasks", "task-artifacts", "launch-1.cjs");
    expect(script.charCodeAt(0)).toBe(0xfeff);
    expect(script).toContain(bootstrapPath);
    expect(script).not.toContain("Execute the Handoff.");
    expect(script).not.toContain("Do\nthe work");
    const bootstrap = readFileSync(bootstrapPath, "utf8");
    expect(spawnSync("node", ["--check", bootstrapPath]).status).toBe(0);
    expect(bootstrap).toContain("spawnSync(spec.command, spec.args");
    expect(bootstrap).toContain("child_exited_without_result");
    expect(bootstrap).toContain('status: "failed"');
    const encoded = bootstrap.match(/Buffer\.from\(\"([^\"]+)\"/)?.[1];
    const spec = JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as { command: string; args: string[] };
    expect(spec.command).toBe(process.execPath);
    expect(spec.args[0]).toBe(process.argv[1]);
    expect(spec.args.slice(1)).toEqual([
      "--session", task.sessionFile, "-e", paneChildExtensionPath, "--system-prompt", "Execute the Handoff.",
      "--exclude-tools", childToolExclusions, "--model", "test/model", "--thinking", "high",
      "Do\nthe work\n\nWhen subagent_done is available, submit the complete final result text in the caller/Agent-required format once as its result argument. Do not output the full result separately before or after successful submission. If unavailable, return that text as your final assistant response; this alone does not record successful runtime completion. If submission fails, correct and retry or report the failure.",
    ]);
    expect(spec.args).not.toContain("--tools");
    expect(spec.args).toContain("Execute the Handoff.");
    expect(spec.args).toContain("--model");
    expect(spec.args).toContain("test/model");
    expect(spec.args).toContain("--thinking");
    expect(spec.args).toContain("high");
    expect(spec.args.at(-1)).toContain("Do\nthe work");

    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "status: completed\nsummary: done\nreport: ok" }));
    await expect(runtime.join(task.subagentId)).resolves.toMatchObject({ status: "completed", result: expect.stringContaining("status: completed") });
  });

  test("resume preserves parent-session identity, while steer, cancel, and remove own lifecycle", async () => {
    const { calls, transport } = fakeTransport();
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-parent-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const runtime = new SubagentRuntime(transport, handlerRegistry());
    const first = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "task", taskSlug: "task", parentSessionFile });
    writeFileSync(first.sessionFile, "");
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry" }));
    const completed = await runtime.join(first.subagentId);
    expect(completed.status).toBe("failed");
    const second = await runtime.resume(first.subagentId, "two");
    expect(second).toMatchObject({
      subagentId: first.subagentId,
      generation: 2,
      sessionFile: first.sessionFile,
      resultPath: join(parentDir, "parent", "tasks", "task-artifacts", "result-2.json"),
    });
    await expect(runtime.steer(first.subagentId, "focus")).resolves.toMatchObject({ generation: 2 });
    await expect(runtime.cancel(first.subagentId)).resolves.toMatchObject({ status: "cancelled" });
    await runtime.remove(first.subagentId);
    expect(existsSync(first.sessionFile)).toBeFalse();
    expect(existsSync(dirname(second.resultPath))).toBeFalse();
    expect(calls.filter(value => (value as { op?: string }).op === "closeTab")).toHaveLength(2);
  });

  test("executes the named-Agent spawn tool under the parent session", async () => {
    const registry = new AgentRegistry();
    registry.setFiles([
      { path: "/handler.md", content: "---\nname: handler\n---\nHandler" },
      { path: "/reviewer.md", content: "---\nname: reviewer\n---\nReviewer" },
    ]);
    const { transport } = fakeTransport();
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-parent-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const runtime = new SubagentRuntime(transport, registry);
    const tools = createSubagentTools(runtime, "/repo", parentSessionFile);
    expect(tools.map(tool => tool.name)).toEqual(["subagent_spawn", "subagent_resume", "subagent_inspect", "subagent_join", "subagent_steer", "subagent_cancel", "subagent_remove"]);
    const parameters = tools[0]!.parameters as { required?: string[]; properties: Record<string, { enum?: unknown }> };
    expect(parameters.properties.agent?.enum).toEqual(["handler", "reviewer"]);
    expect(parameters.properties).toHaveProperty("taskSlug");
    expect(parameters.required).toEqual(["agent", "prompt", "label"]);
    expect(tools[0]!.description).toContain("taskSlug is required");
    expect(tools[0]!.description).toContain("without waiting for completion");
    expect(tools[0]!.description).toContain("Select a registered agent");
    expect(tools[0]!.description).toContain("Call directly or through a caller-owned tool wrapper using the same inputs");
    expect(tools[0]!.description).toContain("When the effective registered tool contract and available resources permit it");
    expect(tools[0]!.description).toContain("successively launch independent, authorized, nonconflicting tasks");
    expect(tools[0]!.description).toContain("instead of polling or routinely calling inspect or join");
    expect(tools[0]!.description).toContain("subagent_join after a terminal notification");
    expect(tools[0]!.description).not.toMatch(/Harness|Router|Resolver|resolve_delegation|Handler|YAML|next environment action/);
    expect(tools.find(tool => tool.name === "subagent_inspect")!.description).toContain("do not poll this tool while waiting");
    expect(tools.find(tool => tool.name === "subagent_join")!.description).toContain("Caller cancellation, including ESC, stops only this wait");
    for (const name of ["subagent_join", "subagent_inspect"]) {
      const tool = tools.find(tool => tool.name === name)!;
      const schema = tool.parameters as { properties: Record<string, unknown>; required: string[] };
      expect(Object.keys(schema.properties)).toEqual(name === "subagent_join" ? ["subagentId", "generation"] : ["subagentId"]);
      expect(schema.required).toEqual(["subagentId"]);
      expect(tool.description).toContain("ordinary read");
      expect(tool.description).toContain("resultPath");
      expect(tool.description).toContain("before adoption");
      expect(tool.description).not.toContain("read its full Result");
    }

    const invoke = (params: Record<string, string>) => (tools[0]!.execute as any)("call-1", params, undefined, undefined, { modelRegistry: modelRegistry("test/model") });
    const callerWrapper = (params: Record<string, string>) => invoke(params);
    for (const [taskSlug, call] of [["tool-direct", invoke], ["tool-wrapper", callerWrapper]] as const) {
      const spawned = await call({
        agent: "reviewer", prompt: "Review the work", label: "review", taskSlug, model: "test/model", thinking: "high",
      });
      expect(spawned.details).toMatchObject({
        agent: "reviewer", model: "test/model", thinking: "high", subagentId: taskSlug,
        sessionFile: join(parentDir, "parent", "tasks", `${taskSlug}-g1.jsonl`), status: "running",
      });
      expect(spawned.content).toEqual([{ type: "text", text: JSON.stringify(spawned.details) }]);
      const result = taskSlug === "tool-direct" ? "# Review\nNo findings." : '{"ok":true,"findings":[]}';
      writeFileSync(spawned.details.resultPath, JSON.stringify({ subagentId: taskSlug, generation: 1, status: "completed", result }));
      const joined = await (tools.find(tool => tool.name === "subagent_join")!.execute as any)("join-1", { subagentId: taskSlug });
      expect(joined.details).toMatchObject({ status: "completed", result });
      expect(joined.content).toEqual([{ type: "text", text: JSON.stringify(joined.details) }]);
      expect(runtime.inspect(taskSlug).result).toBe(result);
    }
    runtime.stop();
  });

  test("successive ready-branch spawn calls return two active identities before either completion", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-ready-branches-"));
    const branches = ["evidence-a", "evidence-c"].map(taskSlug => ({
      taskSlug,
      launchStarted: Promise.withResolvers<void>(),
      launch: Promise.withResolvers<void>(),
      completion: Promise.withResolvers<string>(),
      notified: Promise.withResolvers<CompletionNotification>(),
    }));
    const notifications: CompletionNotification[] = [];
    const closedTabs: string[] = [];
    const transport: HerdrTransport = {
      async createTab({ env }) {
        const branch = branches.find(value => value.taskSlug === env?.PI_HERDR_SUBAGENT_ID)!;
        expect(env?.PI_HERDR_SUBAGENT_GENERATION).toBe("1");
        // Completion is independently held even after the transport accepts the launch.
        void branch.completion.promise.then(result => {
          writeFileSync(env!.PI_HERDR_SUBAGENT_RESULT_PATH!, JSON.stringify({
            subagentId: branch.taskSlug, generation: 1, status: "completed", result,
          }));
        });
        branch.launchStarted.resolve();
        await branch.launch.promise;
        return { tabId: `tab-${branch.taskSlug}`, paneId: `pane-${branch.taskSlug}` };
      },
      async run() {},
      async sendText() {},
      async closePane() {},
      async closeTab(tabId) { closedTabs.push(tabId); return "closed"; },
      async paneExists() { return true; },
    };
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root, notification => {
      notifications.push(notification);
      branches.find(branch => branch.taskSlug === notification.subagentId)!.notified.resolve(notification);
    });
    const spawnTool = createSubagentTools(runtime, "/repo").find(tool => tool.name === "subagent_spawn")!;
    const tasks: SubagentTask[] = [];
    try {
      for (const branch of branches) {
        const spawning = (spawnTool.execute as any)(`spawn-${branch.taskSlug}`, {
          agent: "handler", prompt: branch.taskSlug, label: branch.taskSlug, taskSlug: branch.taskSlug,
        }, undefined, undefined, {});
        await branch.launchStarted.promise;
        expect(notifications).toEqual([]);
        branch.launch.resolve();
        const task = (await spawning).details as SubagentTask;
        expect(task).toMatchObject({
          subagentId: branch.taskSlug, generation: 1, label: branch.taskSlug, status: "running",
          tabId: `tab-${branch.taskSlug}`, paneId: `pane-${branch.taskSlug}`,
          sessionFile: join(root, "tasks", `${branch.taskSlug}-g1.jsonl`),
        });
        expect(task).not.toHaveProperty("resultPath");
        expect(task).not.toHaveProperty("result");
        // The fixture owns publication paths; active Caller snapshots must not issue them.
        const internal = runtime.inspect(task.subagentId);
        expect(internal.resultPath).toBe(join(root, "tasks", `${branch.taskSlug}-artifacts`, "result-1.json"));
        tasks.push(internal);
        expect(runtime.listTasks().map(({ status }) => status)).toEqual(tasks.map(() => "running"));
        expect(tasks.every(value => !existsSync(value.resultPath))).toBeTrue();
        expect(notifications).toEqual([]);
        expect(closedTabs).toEqual([]);
      }
      expect(new Set(tasks.map(task => task.subagentId)).size).toBe(2);

      // Finish the second branch first; join only after its terminal notification.
      for (const index of [1, 0]) {
        const branch = branches[index]!;
        const task = tasks[index]!;
        const result = `status: completed\nsummary: ${branch.taskSlug}\nreport: ${branch.taskSlug} only`;
        branch.completion.resolve(result);
        await expect(branch.notified.promise).resolves.toEqual({
          subagentId: branch.taskSlug, generation: 1, status: "completed", label: branch.taskSlug,
        });
        await expect(runtime.join(task.subagentId)).resolves.toMatchObject({
          subagentId: branch.taskSlug, generation: 1, status: "completed", result,
        });
        if (index === 1) {
          const pending = runtime.inspect(tasks[0]!.subagentId);
          expect(pending.status).toBe("running");
          expect(pending.result).toBeUndefined();
          expect(existsSync(tasks[0]!.resultPath)).toBeFalse();
          expect(notifications.map(value => value.subagentId)).toEqual(["evidence-c"]);
          expect(closedTabs).toEqual(["tab-evidence-c"]);
        }
      }
      expect(notifications.map(value => value.subagentId)).toEqual(["evidence-c", "evidence-a"]);
      expect(notifications.every(value => !("result" in value))).toBeTrue();
      expect(closedTabs).toEqual(["tab-evidence-c", "tab-evidence-a"]);
    } finally {
      runtime.stop();
    }
  });

  test("registered Agent launches and resumes with generic completion instructions and opaque results", async () => {
    const registry = new AgentRegistry();
    registry.setFiles([{ path: "/reviewer.md", content: "---\nname: reviewer\n---\nReview the work." }]);
    const { transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-agent-"));
    const runtime = new SubagentRuntime(transport, registry, root);

    const first = await runtime.spawn({ agent: "reviewer", cwd: "/repo", prompt: "Review", label: "review", taskSlug: "task" });
    for (const generation of [1, 2]) {
      const task = generation === 1 ? first : await runtime.resume(first.subagentId, "Review again");
      expect(task).toMatchObject({ agent: "reviewer", subagentId: first.subagentId, sessionFile: first.sessionFile, generation });
      expect(task).not.toHaveProperty("handlerBody");
      const bootstrap = readFileSync(join(root, "tasks", "task-artifacts", `launch-${generation}.cjs`), "utf8");
      const encoded = bootstrap.match(/Buffer\.from\(\"([^\"]+)\"/)?.[1];
      const spec = JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as { args: string[] };
      expect(spec.args).toContain("Review the work.");
      expect(spec.args).toContain(childToolExclusions);
      expect(spec.args).not.toContain("--tools");
      const prompt = spec.args.at(-1)!;
      expect(prompt).toContain("complete final result text in the caller/Agent-required format");
      expect(prompt).toContain("submit");
      expect(prompt).toContain("once as its result argument");
      expect(prompt).toContain("this alone does not record successful runtime completion");
      expect(prompt).not.toMatch(/Harness|Router|Resolver|resolve_delegation|Handler|YAML/);
      const result = generation === 1 ? "# Review\nNo findings.\n" : '{"ok":true,"findings":[]}';
      writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation, status: "completed", result }));
      await expect(runtime.join(task.subagentId)).resolves.toMatchObject({ status: "completed", result });
      expect(runtime.inspect(task.subagentId).result).toBe(result);
    }
    runtime.stop();
  });

  test("requires the requested Agent in its registry", async () => {
    const { transport } = fakeTransport();
    const runtime = new SubagentRuntime(transport, new AgentRegistry(), mkdtempSync(join(tmpdir(), "subagents-missing-agent-")));

    await expect(runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "Do the work", label: "task", taskSlug: "task",}))
      .rejects.toThrow("Required Agent is unavailable: handler");
  });

  test("does not reuse persisted task artifacts after runtime reconstruction", async () => {
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-rebuilt-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const first = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "first", label: "first", taskSlug: "task", parentSessionFile,
    });
    writeFileSync(first.sessionFile, "");
    writeFileSync(first.resultPath, JSON.stringify({
      subagentId: first.subagentId, generation: first.generation, status: "completed", result: "old result",
    }));

    const rebuilt = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    const second = await rebuilt.spawn({ agent: "handler", cwd: "/repo", prompt: "second", label: "second", taskSlug: "task", parentSessionFile });
    expect(second).toMatchObject({ subagentId: "task-2", generation: 1, status: "running" });
    expect(second.resultPath).not.toBe(first.resultPath);

    writeFileSync(second.resultPath, JSON.stringify({
      subagentId: second.subagentId, generation: second.generation, status: "completed", result: "new result",
    }));
    await expect(rebuilt.join(second.subagentId)).resolves.toMatchObject({ status: "completed", result: "new result" });
    await rebuilt.remove(second.subagentId);
    expect(existsSync(dirname(first.resultPath))).toBeTrue();
  });

  test("recovers a running pane without relaunching it", async () => {
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-recover-running-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const first = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "work", label: "running", taskSlug: "task", parentSessionFile,
    });
    writeFileSync(first.sessionFile, "");

    const { calls, transport } = fakeTransport(true);
    const rebuilt = new SubagentRuntime(transport, handlerRegistry());
    await rebuilt.recover("/repo", parentSessionFile);
    expect(rebuilt.inspect(first.subagentId)).toMatchObject({ generation: 1, status: "running", paneId: first.paneId });
    await rebuilt.steer(first.subagentId, "continue");
    expect(calls.filter(call => ["create", "run"].includes((call as { op: string }).op))).toHaveLength(0);
    expect(calls).toContainEqual({ op: "exists", paneId: first.paneId });
    expect(calls).toContainEqual({ op: "send", paneId: first.paneId, text: "continue" });
  });

  test("recovers a terminal Result before checking the retained pane", async () => {
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-recover-result-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const first = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "work", label: "done", taskSlug: "task", parentSessionFile,
    });
    writeFileSync(first.resultPath, JSON.stringify({
      subagentId: first.subagentId, generation: first.generation, status: "cancelled",
    }));

    const { calls, transport } = fakeTransport(false);
    const rebuilt = new SubagentRuntime(transport, handlerRegistry());
    await rebuilt.recover("/repo", parentSessionFile);
    await expect(rebuilt.join(first.subagentId)).resolves.toMatchObject({ status: "cancelled", generation: 1 });
    expect(calls).toEqual([{ op: "closeTab", tabId: first.tabId }]);
  });

  test("preserves unknown top-level manifest values across V1 migration and V2 rewrites", async () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    for (const input of [
      { version: 1 as const, subagentId: "subagent-7", taskSlug: undefined, status: "cancelled" as const },
      { version: 1 as const, subagentId: "phase-a", taskSlug: "phase-a", status: "cancelled" as const },
      { version: 1 as const, subagentId: "phase-a-2", taskSlug: "phase-a", status: "cancelled" as const },
      { version: 2 as const, subagentId: "phase-a-3", taskSlug: "phase-a", status: "cancelled" as const },
    ]) {
      const root = mkdtempSync(join(tmpdir(), "subagents-manifest-passthrough-"));
      const tasksDir = join(root, "tasks");
      const artifactDir = join(tasksDir, `${input.subagentId}-artifacts`);
      const sessionFile = join(tasksDir, `${input.subagentId}-g1.jsonl`);
      mkdirSync(artifactDir, { recursive: true });
      writeFileSync(sessionFile, "");
      const unknown = {
        unknownScalar: "preserve me",
        unknownObject: { nested: ["value", 3] },
        unknownArray: ["value", { nested: true }],
        unknownNull: null,
        surfaceCleanups: [{ opaque: { phase: "future" } }, null],
      };
      const record = input.version === 1
        ? {
            ...input,
            generation: 1,
            agent: "handler",
            cwd: "/repo",
            label: "phase-a",
            sessionFile,
            createdAt,
            updatedAt: createdAt,
            tabId: "tab-1",
            paneId: "pane-1",
            ...unknown,
          }
        : {
            ...input,
            generation: 1,
            agent: "handler",
            cwd: "/repo",
            label: "phase-a",
            sessionFile,
            queuedAt: createdAt,
            startedAt: createdAt,
            updatedAt: createdAt,
            tabId: "tab-1",
            paneId: "pane-1",
            ...unknown,
          };
      writeFileSync(join(artifactDir, "task.json"), JSON.stringify(record));

      const { calls, transport } = fakeTransport(false);
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
      await runtime.recover("/repo");

      const migrated = JSON.parse(readFileSync(join(artifactDir, "task.json"), "utf8"));
      expect(migrated).toMatchObject({
        version: 2,
        subagentId: input.subagentId,
        ...(input.taskSlug ? { taskSlug: input.taskSlug } : {}),
        sessionFile,
        status: "cancelled",
        unknownScalar: unknown.unknownScalar,
        unknownObject: unknown.unknownObject,
        unknownArray: unknown.unknownArray,
        unknownNull: unknown.unknownNull,
      });
      expect(migrated.unknownObject).toEqual(unknown.unknownObject);
      expect(migrated.unknownArray).toEqual(unknown.unknownArray);
      expect(migrated.surfaceCleanups.slice(0, 2)).toEqual(unknown.surfaceCleanups);
      expect(migrated.surfaceCleanups[2]).toMatchObject({ generation: 1, tabId: "tab-1", paneId: "pane-1", status: "closed" });
      expect(calls.filter(call => (call as { op?: string }).op === "closeTab")).toHaveLength(1);
      runtime.stop();
    }
  });

  test("persists pane_closed when a running task's pane is missing", async () => {
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-recover-missing-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const first = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "work", label: "missing", taskSlug: "task", parentSessionFile,
    });
    writeFileSync(first.sessionFile, "");

    const rebuilt = new SubagentRuntime(fakeTransport(false).transport, handlerRegistry());
    await rebuilt.recover("/repo", parentSessionFile);
    await expect(rebuilt.join(first.subagentId)).resolves.toMatchObject({ status: "failed", error: "pane_closed" });
    const manifest = JSON.parse(readFileSync(join(dirname(first.resultPath), "task.json"), "utf8"));
    expect(manifest).toMatchObject({
      version: 2,
      subagentId: first.subagentId,
      status: "failed",
      error: "pane_closed",
      surfaceCleanups: [{ generation: 1, tabId: "tab-1", paneId: "pane-1", status: "closed" }],
    });
    await rebuilt.remove(first.subagentId);
    expect(existsSync(dirname(first.resultPath))).toBeFalse();
  });

  test("rebinds a join that overlaps recovery and observes a recovered terminal state", async () => {
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-join-recovery-race-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const runtime = new SubagentRuntime(fakeTransport(true).transport, handlerRegistry());
    const task = await runtime.spawn({
      agent: "handler", cwd: "/repo", prompt: "work", label: "join recovery", taskSlug: "task", parentSessionFile,
    });
    const manifestPath = join(dirname(task.resultPath), "task.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
    manifest.status = "queued";
    delete manifest.startedAt;
    writeFileSync(manifestPath, JSON.stringify(manifest));

    const joining = runtime.join(task.subagentId);
    const recovering = runtime.recover("/repo", parentSessionFile);
    await recovering;

    await expect(joining).resolves.toMatchObject({ status: "failed", error: "launch_interrupted", generation: 1 });
    runtime.stop();
  });

  test("recovers only the current generation and rejects a mismatched Result", async () => {
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-recover-generation-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    const first = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "generation", taskSlug: "task", parentSessionFile });
    writeFileSync(first.sessionFile, "");
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry" }));
    await original.join(first.subagentId);
    const second = await original.resume(first.subagentId, "two");

    const running = new SubagentRuntime(fakeTransport(true).transport, handlerRegistry());
    await running.recover("/repo", parentSessionFile);
    expect(running.inspect(first.subagentId)).toMatchObject({ generation: 2, status: "running", sessionFile: first.sessionFile });

    writeFileSync(second.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "completed", result: "stale" }));
    const rebuilt = new SubagentRuntime(fakeTransport(true).transport, handlerRegistry());
    await rebuilt.recover("/repo", parentSessionFile);
    await expect(rebuilt.join(first.subagentId, 2)).resolves.toMatchObject({ status: "failed", error: "result_identity_mismatch" });
    const third = await rebuilt.resume(first.subagentId, "three");
    expect(third).toMatchObject({ generation: 3, sessionFile: first.sessionFile });
  });

  test("recovery is idempotent and scoped to the current parent session", async () => {
    const parentA = join(mkdtempSync(join(tmpdir(), "subagents-scope-a-")), "parent.jsonl");
    const parentB = join(mkdtempSync(join(tmpdir(), "subagents-scope-b-")), "parent.jsonl");
    const first = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "a", label: "parent-a", taskSlug: "task", parentSessionFile: parentA,
    });
    const second = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "b", label: "parent-b", taskSlug: "task", parentSessionFile: parentB,
    });
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "a" }));
    writeFileSync(second.resultPath, JSON.stringify({ subagentId: second.subagentId, generation: 1, status: "failed", error: "b" }));

    const rebuilt = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    await rebuilt.recover("/repo", parentA);
    await rebuilt.recover("/repo", parentA);
    expect(rebuilt.inspect("task")).toMatchObject({ label: "parent-a", error: "a" });
    await rebuilt.recover("/repo", parentB);
    expect(rebuilt.inspect("task")).toMatchObject({ label: "parent-b", error: "b" });
  });
  test("actively settles completed and failed Results without join or inspect", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-notify-result-"));
    const notifications: CompletionNotification[] = [];
    const runtime = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), root, notification => { notifications.push(notification); });
    const completed = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "complete", taskSlug: "task",});
    writeFileSync(completed.resultPath, JSON.stringify({
      subagentId: completed.subagentId, generation: completed.generation, status: "completed", result: "full YAML must stay private",
    }));
    await waitFor(() => notifications.length === 1);
    expect(runtime.inspect(completed.subagentId)).toMatchObject({ status: "completed", result: "full YAML must stay private" });
    expect(notifications[0]).toEqual({ subagentId: completed.subagentId, generation: 1, status: "completed", label: "complete" });
    expect(notifications[0]).not.toHaveProperty("result");

    const failed = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "fail", taskSlug: "task",});
    writeFileSync(failed.resultPath, JSON.stringify({
      subagentId: failed.subagentId, generation: failed.generation, status: "failed", error: "child failed",
    }));
    await waitFor(() => notifications.length === 2);
    expect(notifications[1]).toEqual({ subagentId: failed.subagentId, generation: 1, status: "failed", label: "fail", reason: "child failed" });
    runtime.stop();
  });

  test("notifies cancellation and an unexpectedly closed pane", async () => {
    let panePresent = true;
    const notifications: CompletionNotification[] = [];
    const runtime = new SubagentRuntime(
      fakeTransport(() => panePresent).transport,
      handlerRegistry(),
      mkdtempSync(join(tmpdir(), "subagents-notify-terminal-")),
      notification => { notifications.push(notification); },
    );
    const cancelled = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "cancel", taskSlug: "task",});
    await runtime.cancel(cancelled.subagentId);
    expect(notifications[0]).toEqual({ subagentId: cancelled.subagentId, generation: 1, status: "cancelled", label: "cancel" });

    const closed = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "closed", taskSlug: "task",});
    panePresent = false;
    await waitFor(() => notifications.length === 2);
    expect(runtime.inspect(closed.subagentId)).toMatchObject({ status: "failed", error: "pane_closed" });
    expect(notifications[1]).toEqual({ subagentId: closed.subagentId, generation: 1, status: "failed", label: "closed", reason: "pane_closed" });
    runtime.stop();
  });

  test("notifies launch failure before spawn rejects", async () => {
    const notifications: CompletionNotification[] = [];
    const transport = fakeTransport().transport;
    transport.createTab = async () => { throw new Error("launch unavailable"); };
    const runtime = new SubagentRuntime(
      transport,
      handlerRegistry(),
      mkdtempSync(join(tmpdir(), "subagents-notify-launch-")),
      notification => { notifications.push(notification); },
    );
    await expect(runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "launch", taskSlug: "task",})).rejects.toThrow("launch unavailable");
    expect(notifications).toEqual([{
      subagentId: "task", generation: 1, status: "failed", label: "launch", reason: "Error: launch unavailable",
    }]);
  });

  test("replays a missed notification on every recovery until the parent branch observes it", async () => {
    const parentSessionFile = join(mkdtempSync(join(tmpdir(), "subagents-notify-recover-")), "parent.jsonl");
    const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    const task = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "recover", taskSlug: "task", parentSessionFile });
    original.stop();
    writeFileSync(task.resultPath, JSON.stringify({
      subagentId: task.subagentId, generation: task.generation, status: "completed", result: "full result",
    }));

    const notifications: CompletionNotification[] = [];
    const rebuilt = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), undefined, notification => { notifications.push(notification); });
    await rebuilt.recover("/repo", parentSessionFile);
    await rebuilt.recover("/repo", parentSessionFile);
    expect(notifications).toHaveLength(2);
    const restartedAgain = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), undefined, notification => { notifications.push(notification); });
    await restartedAgain.recover("/repo", parentSessionFile);
    expect(notifications).toHaveLength(3);
  });

  test("session startup backfills missed notifications and honors parent-session markers", async () => {
    const parentSessionFile = join(mkdtempSync(join(tmpdir(), "subagents-notify-startup-")), "parent.jsonl");
    const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    const consumed = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "consumed", taskSlug: "task", parentSessionFile });
    const missed = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "two", label: "missed", taskSlug: "task", parentSessionFile });
    original.stop();
    for (const task of [consumed, missed]) writeFileSync(task.resultPath, JSON.stringify({
      subagentId: task.subagentId, generation: task.generation, status: "completed", result: "full result",
    }));

    const registry = handlerRegistry();
    const runtime = new SubagentRuntime(fakeTransport().transport, registry);
    const handlers: Record<string, (event: unknown, ctx: any) => Promise<void>> = {};
    const messages: Array<{ message: any; options: any }> = [];
    const childResultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    activateSubagents({
      on(event: string, handler: (event: unknown, ctx: any) => Promise<void>) { handlers[event] = handler; },
      sendMessage(message: unknown, options: unknown) { messages.push({ message, options }); },
    } as any, { runtime, registry });
    if (childResultPath) process.env.PI_HERDR_SUBAGENT_RESULT_PATH = childResultPath;
    const consumedEntry = {
      type: "custom_message",
      customType: "pi-herdr-subagent-completion",
       details: { schema: "pi-herdr-subagent-completion/v1", subagentId: consumed.subagentId, generation: 1, status: "completed", label: "consumed" },
    };
    const ctx = {
      cwd: "/repo",
      isIdle: () => true,
      sessionManager: { getSessionFile: () => parentSessionFile, getEntries: () => [consumedEntry], getBranch: () => [consumedEntry] },
    };
    await handlers.session_start!({}, ctx);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.message.details).toMatchObject({ subagentId: missed.subagentId, label: "missed" });
    ctx.sessionManager.getBranch = () => [consumedEntry, { ...messages[0]!.message, type: "custom_message" }];
    await handlers.session_start!({}, ctx);
    expect(messages).toHaveLength(1);
  });

  test("injects a summary-only Pi completion message that triggers the parent", async () => {
    const registry = handlerRegistry();
    const runtime = new SubagentRuntime(fakeTransport().transport, registry, mkdtempSync(join(tmpdir(), "subagents-notify-pi-")));
    const messages: Array<{ message: any; options: any }> = [];
    const handlers: Record<string, (event: unknown, ctx: any) => Promise<void>> = {};
    const childResultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    activateSubagents({
      on(event: string, handler: (event: unknown, ctx: any) => Promise<void>) { handlers[event] = handler; },
      sendMessage(message: unknown, options: unknown) { messages.push({ message, options }); },
    } as any, { runtime, registry });
    if (childResultPath) process.env.PI_HERDR_SUBAGENT_RESULT_PATH = childResultPath;
    const ctx = {
      cwd: "/repo",
      isIdle: () => true,
      sessionManager: { getSessionFile: () => "/repo/parent.jsonl", getBranch: () => [] },
      ui: { setWidget() {} },
    };
    await handlers.session_start!({}, ctx);
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "pi", taskSlug: "task" });
    writeFileSync(task.resultPath, JSON.stringify({
      subagentId: task.subagentId, generation: task.generation, status: "completed", result: "secret full YAML",
    }));
    await waitFor(() => messages.length === 1);
    expect(messages[0]!.options).toEqual({ triggerTurn: true, deliverAs: "followUp" });
    expect(messages[0]!.message).toMatchObject({
      customType: "pi-herdr-subagent-completion",
      display: true,
      details: { subagentId: task.subagentId, generation: 1, status: "completed", label: "pi" },
    });
    expect(JSON.stringify(messages[0])).not.toContain("secret full YAML");
    runtime.stop();
  });
});

describe("retained-session launch submission", () => {
  async function fixture() {
    const parent = join(mkdtempSync(join(tmpdir(), "subagents-open-")), "parent.jsonl");
    writeFileSync(parent, "");
    const { calls, transport } = fakeTransport();
    const runtime = new SubagentRuntime(transport, handlerRegistry());
    const task = await runtime.spawn({ agent: "handler", cwd: dirname(parent), prompt: "unused", label: "open me", taskSlug: "open-task", parentSessionFile: parent });
    writeFileSync(task.sessionFile, "retained");
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "done" }));
    await runtime.join(task.subagentId);
    calls.length = 0;
    const snapshot = () => JSON.stringify({ task: runtime.inspect(task.subagentId), files: [task.sessionFile, ...readdirSync(dirname(task.resultPath)).sort().map(name => join(dirname(task.resultPath), name))].map(path => [path, readFileSync(path, "utf8")]) });
    return { runtime, parent, task, transport, calls, snapshot, key: runtime.listRetainedSessions(parent)[0]! };
  }

  test("exact argv, independent tabs, no readiness calls or artifact mutation", async () => {
    const f = await fixture();
    const before = f.snapshot();
    let count = 0;
    f.transport.createTab = async input => { f.calls.push({ op: "create", input }); return { tabId: `tab-${++count}`, paneId: `pane-${count}` }; };
    await f.runtime.launchRetainedSession(f.parent, f.key);
    await f.runtime.launchRetainedSession(f.parent, f.key);
    expect(f.calls.map(call => (call as any).op)).toEqual(["create", "run", "create", "run"]);
    expect((f.calls[0] as any).input).toEqual({ cwd: f.task.cwd, label: "open me" });
    for (const [index, call] of [f.calls[1], f.calls[3]].entries()) {
      const launch = call as { paneId: string; command: string; args: string[] };
      expect(launch.paneId).toBe(`pane-${index + 1}`);
      expect(launch.args[0]).toBe("-e");
      const script = launch.args[1]!;
      const encoded = script.match(/Buffer\.from\("([^"]+)"/)![1]!;
      const spec = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
      expect(spec).toEqual({ cwd: f.task.cwd, command: process.execPath, args: [process.argv[1], "--session", f.task.sessionFile] });
      let captured: any;
      const env = { KEEP: "yes", PI_HERDR_SUBAGENT_RESULT_PATH: "forbidden", PI_HERDR_SUBAGENT_ID: "old" };
      new Function("require", "process", "Buffer", script)(() => ({ spawnSync: (...args: any[]) => { captured = args; return { status: 0 }; } }), { env, exit() {} }, Buffer);
      expect(captured[2]).toEqual({ cwd: f.task.cwd, env: { KEEP: "yes" }, stdio: "inherit" });
    }
    expect(f.snapshot()).toBe(before);
    f.runtime.stop();
  });

  test("create failure and submission rollback preserve state and primary error", async () => {
    const f = await fixture();
    const before = f.snapshot();
    const create = f.transport.createTab;
    f.transport.createTab = async () => { throw new Error("create failed"); };
    await expect(f.runtime.launchRetainedSession(f.parent, f.key)).rejects.toThrow("create failed");
    expect(f.calls).toEqual([]);
    f.transport.createTab = create;
    const primary = new Error("submission failed");
    f.transport.run = async () => { throw primary; };
    await expect(f.runtime.launchRetainedSession(f.parent, f.key)).rejects.toBe(primary);
    expect(f.calls).toEqual([{ op: "create", input: { cwd: f.task.cwd, label: "open me" } }, { op: "closeTab", tabId: "tab-1" }]);
    f.transport.closeTab = async () => { throw new Error("x".repeat(500)); };
    try { await f.runtime.launchRetainedSession(f.parent, f.key); throw new Error("expected rejection"); }
    catch (error) { expect((error as Error).cause).toBe(primary); expect((error as Error).message.length).toBeLessThan(210); }
    expect(f.snapshot()).toBe(before);
    f.runtime.stop();
  });
});

describe("/subagent-open command wiring", () => {
  async function commandFixture() {
    const parent = join(mkdtempSync(join(tmpdir(), "subagents-open-cmd-")), "parent.jsonl");
    writeFileSync(parent, "");
    const { calls, transport } = fakeTransport();
    const runtime = new SubagentRuntime(transport, handlerRegistry());
    const task = await runtime.spawn({ agent: "handler", cwd: dirname(parent), prompt: "unused", label: "open me", taskSlug: "open-task", parentSessionFile: parent });
    writeFileSync(task.sessionFile, "retained");
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "SECRET_RESULT_BODY" }));
    await runtime.join(task.subagentId);
    calls.length = 0;
    const launched: unknown[] = [];
    const original = runtime.launchRetainedSession.bind(runtime);
    (runtime as any).launchRetainedSession = async (sessionFile: string | undefined, key: unknown) => {
      launched.push(key);
      return original(sessionFile, key as any);
    };
    const commands: Array<{ name: string; options: { handler: (args: string, ctx: any) => Promise<void> } }> = [];
    const previous = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    try {
      activateSubagents({
        on() {},
        sendMessage() {},
        registerTool() {},
        getActiveTools() { return []; },
        setActiveTools() {},
        registerCommand(name: string, options: any) { commands.push({ name, options }); },
      } as any, { runtime, registry: handlerRegistry() });
    } finally {
      if (previous === undefined) delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
      else process.env.PI_HERDR_SUBAGENT_RESULT_PATH = previous;
    }
    const snapshot = () => JSON.stringify({ task: runtime.inspect(task.subagentId), files: [task.sessionFile, ...readdirSync(dirname(task.resultPath)).sort().map(name => join(dirname(task.resultPath), name))].map(path => [path, readFileSync(path, "utf8")]) });
    return { runtime, parent, task, calls, commands, launched, snapshot };
  }

  test("registers on the parent extension only", () => {
    expect(readFileSync(join(import.meta.dir, "../extensions/pane-child.ts"), "utf8")).not.toContain("subagent-open");
    const parentNames: string[] = [];
    const childNames: string[] = [];
    const previous = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    try {
      activateSubagents({
        on() {}, sendMessage() {}, registerTool() {}, getActiveTools() { return []; }, setActiveTools() {},
        registerCommand(name: string) { parentNames.push(name); },
      } as any, { runtime: new SubagentRuntime(fakeTransport().transport, handlerRegistry()), registry: handlerRegistry() });
      process.env.PI_HERDR_SUBAGENT_RESULT_PATH = join(tmpdir(), "child-result.json");
      activateSubagents({
        on() {}, sendMessage() {}, registerTool() {}, getActiveTools() { return []; }, setActiveTools() {},
        registerCommand(name: string) { childNames.push(name); },
      } as any);
    } finally {
      if (previous === undefined) delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
      else process.env.PI_HERDR_SUBAGENT_RESULT_PATH = previous;
    }
    expect(parentNames).toEqual(["subagent-open"]);
    expect(childNames).toEqual([]);
  });

  test("guards non-TUI and missing parent session before picker creation", async () => {
    const f = await commandFixture();
    const before = f.snapshot();
    const notifications: Array<{ message: string; type?: string }> = [];
    const ctx = (mode: string, hasUI: boolean, sessionFile: string | undefined) => ({
      mode, hasUI, sessionManager: { getSessionFile: () => sessionFile },
      ui: {
        notify(message: string, type?: string) { notifications.push({ message, type }); },
        select() { throw new Error("picker must not open"); },
      },
    });
    await f.commands[0]!.options.handler("", ctx("print", false, f.parent));
    await f.commands[0]!.options.handler("", ctx("rpc", true, f.parent));
    await f.commands[0]!.options.handler("", ctx("tui", true, undefined));
    await f.commands[0]!.options.handler("", ctx("tui", true, "  "));
    expect(notifications).toEqual([
      { message: "/subagent-open requires the interactive TUI.", type: "warning" },
      { message: "/subagent-open requires the interactive TUI.", type: "warning" },
      { message: "/subagent-open requires a persisted parent session.", type: "warning" },
      { message: "/subagent-open requires a persisted parent session.", type: "warning" },
    ]);
    expect(f.calls).toEqual([]);
    expect(f.launched).toEqual([]);
    expect(f.snapshot()).toBe(before);
    f.runtime.stop();
  });

  test("cancel is side-effect-free and selection rows stay metadata-only", async () => {
    const f = await commandFixture();
    const before = f.snapshot();
    const selects: Array<{ title: string; rows: string[] }> = [];
    await f.commands[0]!.options.handler("", {
      mode: "tui", hasUI: true, sessionManager: { getSessionFile: () => f.parent },
      ui: {
        notify() { throw new Error("cancel must not notify"); },
        async select(title: string, rows: string[]) { selects.push({ title, rows }); return undefined; },
      },
    });
    expect(selects).toHaveLength(1);
    expect(selects[0]!.title).toBe("Open retained subagent session");
    expect(selects[0]!.rows).toHaveLength(1);
    expect(selects[0]!.rows[0]).toContain("open me");
    expect(selects[0]!.rows[0]).toContain(f.task.subagentId);
    expect(selects[0]!.rows[0]).toContain("current generation 1");
    expect(selects[0]!.rows[0]).toContain("completed");
    expect(selects[0]!.rows[0]).toContain("Result file modified time");
    expect(selects[0]!.rows.join("\n")).not.toContain("SECRET_RESULT_BODY");
    expect(selects[0]!.rows.join("\n")).not.toContain(f.task.sessionFile);
    expect(f.calls).toEqual([]);
    expect(f.launched).toEqual([]);
    expect(f.snapshot()).toBe(before);
    f.runtime.stop();
  });

  test("passes only the bound selection key to JIT launch", async () => {
    const f = await commandFixture();
    const before = f.snapshot();
    await f.commands[0]!.options.handler("", {
      mode: "tui", hasUI: true, sessionManager: { getSessionFile: () => f.parent },
      ui: {
        notify() { throw new Error("successful open must not notify"); },
        async select(_title: string, rows: string[]) { return rows[0]; },
      },
    });
    expect(f.launched).toEqual([{
      scopeIdentity: f.runtime.listRetainedSessions(f.parent)[0]!.scopeIdentity,
      subagentId: f.task.subagentId,
      observedGeneration: 1,
    }]);
    expect(Object.keys(f.launched[0] as object).sort()).toEqual(["observedGeneration", "scopeIdentity", "subagentId"]);
    expect(f.calls.map(call => (call as { op: string }).op)).toEqual(["create", "run"]);
    expect(f.snapshot()).toBe(before);
    f.runtime.stop();
  });

  test("README documents current retained-session open without excluded claims", () => {
    const readme = readFileSync(join(import.meta.dir, "../README.md"), "utf8");
    expect(readme).toContain("/subagent-open");
    expect(readme).toContain("current generation as metadata, not historical transcript identity");
    expect(readme).toContain("repeated opens create independent tabs");
    expect(readme).toContain("not that Pi acknowledged loading it");
    expect(readme).toContain("may be written or migrated by Pi");
    expect(readme.toLowerCase()).not.toContain("read-only");
    expect(readme).not.toContain("generation snapshot");
    expect(readme).toContain("Calls may be direct or forwarded by a caller-owned tool wrapper");
    expect(readme).toContain("no fixed Agent name or caller protocol is required");
    expect(readme).toContain("opaque to this runtime");
    expect(readme).toContain("without waiting for completion");
    expect(readme).toContain("at-least-once in the current parent branch");
    expect(readme).toContain("a final assistant response alone does not record successful runtime completion");
    expect(readme).not.toMatch(/Harness|Router|Resolver|resolve_delegation|YAML Handler Result/);
    expect(readme).not.toMatch(/\[.*?\]\(.*?\)/);
    const paneChild = readFileSync(paneChildExtensionPath, "utf8");
    expect(paneChild).toContain('description: "Write the complete final result text in the caller/Agent-required format and end this execution."');
  });
});


test("passes pane commands as one quoted PowerShell invocation", async () => {
  const calls: string[][] = [];
  const client = createHerdrClient(async (_command, args) => { calls.push([...args]); return { code: 0, stdout: "", stderr: "" }; });
  const transport = createHerdrTransport(client);
  await transport.run("wF:p6", "pi", ["--session", "C:\\A B\\session.jsonl", "it's done"]);
  expect(calls).toEqual([["pane", "run", "wF:p6", "& 'pi' '--session' 'C:\\A B\\session.jsonl' 'it''s done'"]]);
});

test("submits each exact steer payload through one pane run argv", async () => {
  const calls: string[][] = [];
  const client = createHerdrClient(async (_command, args) => {
    calls.push([...args]);
    return { code: 0, stdout: "", stderr: "" };
  });
  const transport = createHerdrTransport(client);
  const paneId = "wF:p6";
  const messages = [
    "line one\nline two",
    "CJK: 中文; emoji: 😀",
    "quotes: 'single' and \"double\"",
    "path: C:\\work\\child\\input",
    "metacharacters: ; & | < > $() ` * ? ! % ^",
  ];

  for (const message of messages) await transport.sendText(paneId, message);

  expect(calls).toEqual(messages.map(message => ["pane", "run", paneId, message]));
  expect(calls.some(args => args[0] === "pane" && args[1] === "send-text")).toBeFalse();
});

test("discovers package Agents from pi.agents directories", async () => {
  const root = mkdtempSync(join(tmpdir(), "subagents-package-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ pi: { agents: ["./"] } }));
  writeFileSync(join(root, "handler.md"), "---\nname: handler\ndescription: Harness Handler\n---\nUse the validated Handler protocol.");
  const registry = new AgentRegistry();
  await registry.discover("/repo", [root]);
  expect(registry.list().map(agent => agent.name)).toContain("handler");
  expect(registry.get("handler")).toMatchObject({ path: join(root, "handler.md"), body: "Use the validated Handler protocol." });
});


describe("runtime task observation", () => {
  test("projects private task state into defensive snapshots and emits synchronous updates", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-observation-"));
    const notifications: CompletionNotification[] = [];
    const runtime = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), root, notification => { notifications.push(notification); });
    const events: string[] = [];
    const unsubscribeThrowing = runtime.onTaskUpdate(() => { throw new Error("listener failed"); });
    const unsubscribe = runtime.onTaskUpdate(() => {
      events.push(runtime.listTasks()[0]?.status ?? "empty");
    });

    expect(events).toEqual([]);
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "observe", taskSlug: "task", model: "test/secret-model", thinking: "secret-thinking" }, modelRegistry("test/secret-model"));
    expect(events).toEqual(["queued", "running"]);
    const snapshot = runtime.listTasks();
    expect(snapshot).toHaveLength(1);
    expect(Object.keys(snapshot[0]!)).toEqual(["subagentId", "generation", "agent", "label", "status", "queuedAt", "startedAt", "updatedAt"]);
    expect(snapshot[0]).not.toHaveProperty("result");
    expect(snapshot[0]).not.toHaveProperty("error");
    expect(snapshot[0]).not.toHaveProperty("model");
    expect(snapshot[0]).not.toHaveProperty("thinking");
    (snapshot[0] as { label: string }).label = "mutated";
    (snapshot as unknown as unknown[]).pop();
    expect(runtime.listTasks()[0]).toMatchObject({ label: "observe", status: "running" });

    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "private" }));
    await expect(runtime.join(task.subagentId)).resolves.toMatchObject({ status: "completed", result: "private" });
    expect(events).toEqual(["queued", "running", "completed"]);
    expect(notifications).toEqual([{ subagentId: task.subagentId, generation: 1, status: "completed", label: "observe" }]);

    await runtime.remove(task.subagentId);
    expect(events).toEqual(["queued", "running", "completed", "empty"]);
    unsubscribe();
    unsubscribe();
    unsubscribeThrowing();
    runtime.stop();
  });

  test("resume and cancellation invalidate after their state changes", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-observation-mutations-"));
    const { transport } = fakeTransport();
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
    let updates = 0;
    runtime.onTaskUpdate(() => { updates++; });

    const first = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "resume", taskSlug: "task",});
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry" }));
    await runtime.join(first.subagentId);
    const beforeResume = updates;
    const second = await runtime.resume(first.subagentId, "two");
    expect(updates).toBeGreaterThan(beforeResume);
    const beforeCancel = updates;
    await runtime.cancel(second.subagentId);
    expect(updates).toBeGreaterThan(beforeCancel);
    runtime.stop();
  });

  test("launch failure invalidates after its state changes", async () => {
    const failingTransport = fakeTransport().transport;
    failingTransport.createTab = async () => { throw new Error("launch unavailable"); };
    const failing = new SubagentRuntime(failingTransport, handlerRegistry(), mkdtempSync(join(tmpdir(), "subagents-observation-launch-")));
    let failedUpdates = 0;
    failing.onTaskUpdate(() => { failedUpdates++; });
    await expect(failing.spawn({ agent: "handler", cwd: "/repo", prompt: "fail", label: "launch", taskSlug: "task",})).rejects.toThrow("launch unavailable");
    expect(failedUpdates).toBe(2);
    failing.stop();
  });

  test("successful recovery emits exactly once after the final scope, including empty and repeated scopes", async () => {
    const parentA = join(mkdtempSync(join(tmpdir(), "subagents-observation-a-")), "parent.jsonl");
    const parentB = join(mkdtempSync(join(tmpdir(), "subagents-observation-b-")), "parent.jsonl");
    const parentEmpty = join(mkdtempSync(join(tmpdir(), "subagents-observation-empty-")), "parent.jsonl");
    const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    const taskA = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "a", label: "a", taskSlug: "task", parentSessionFile: parentA });
    const taskB = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "b", label: "b", taskSlug: "task", parentSessionFile: parentB });
    original.stop();
    writeFileSync(taskA.sessionFile, "");
    writeFileSync(taskB.sessionFile, "");

    const runtime = new SubagentRuntime(fakeTransport(true).transport, handlerRegistry());
    const updates: string[][] = [];
    runtime.onTaskUpdate(() => { updates.push(runtime.listTasks().map(task => task.label)); });
    await runtime.recover("/repo", parentA);
    expect(updates).toEqual([["a"]]);
    await runtime.recover("/repo", parentB);
    expect(updates).toEqual([["a"], ["b"]]);
    await runtime.recover("/repo", parentB);
    expect(updates).toEqual([["a"], ["b"], ["b"]]);
    await runtime.recover("/repo", parentEmpty);
    expect(updates).toEqual([["a"], ["b"], ["b"], []]);
    expect(runtime.listTasks()).toEqual([]);
    runtime.stop();
  });
});


type WidgetObservation = {
  subagentId: string;
  generation: number;
  agent: string;
  label: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  queuedAt?: string;
  startedAt?: string;
  updatedAt: string;
};

function widgetRuntime(initialTasks: WidgetObservation[]) {
  let tasks = initialTasks;
  let listener: (() => void) | undefined;
  let savedListener: (() => void) | undefined;
  let notifier: ((notification: CompletionNotification) => void | Promise<void>) | undefined;
  const calls = { list: 0, subscribe: 0, unsubscribe: 0, recover: 0, inspect: 0, join: 0, stop: 0 };
  const runtime = {
    setCompletionNotifier(value: typeof notifier) { notifier = value; },
    listTasks() { calls.list++; return tasks.map(task => ({ ...task })); },
    onTaskUpdate(value: () => void) {
      calls.subscribe++;
      listener = value;
      savedListener = value;
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        calls.unsubscribe++;
        if (listener === value) listener = undefined;
      };
    },
    async recover() { calls.recover++; listener?.(); },
    inspect() { calls.inspect++; throw new Error("widget called inspect"); },
    async join() { calls.join++; return { status: "completed" }; },
    agentNames() { return ["handler"]; },
    stop() { calls.stop++; },
  };
  return {
    runtime,
    calls,
    setTasks(value: WidgetObservation[]) { tasks = value; },
    emit() { listener?.(); },
    emitSaved() { savedListener?.(); },
    async notify(notification: CompletionNotification) { await notifier?.(notification); },
  };
}

function widgetExtensionHarness(
  runtime: any,
  setWidget: (...args: any[]) => void,
  settings = { widgetPlacement: "aboveEditor", widgetMode: "progress", useNerdFont: false },
  settingsStoreFactory?: (warn: (message: string) => void) => any,
) {
  const handlers: Record<string, (event: unknown, ctx: any) => unknown> = {};
  const messages: Array<{ message: any; options: any }> = [];
  const previousChildResultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  try {
    activateSubagents({
      on(event: string, handler: (event: unknown, ctx: any) => unknown) { handlers[event] = handler; },
      sendMessage(message: unknown, options: unknown) { messages.push({ message, options }); },
      registerTool() {},
      getActiveTools() { return []; },
      setActiveTools() {},
    } as any, {
      runtime,
      registry: { async discover() {} } as any,
      settingsStore: settingsStoreFactory ? undefined : { load: () => settings } as any,
      settingsStoreFactory,
      clock: () => Date.parse("2026-01-03T00:00:00.000Z"),
    });
  } finally {
    if (previousChildResultPath === undefined) delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    else process.env.PI_HERDR_SUBAGENT_RESULT_PATH = previousChildResultPath;
  }
  const ctx = {
    cwd: "/repo",
    isIdle: () => true,
    sessionManager: { getSessionFile: () => "/repo/parent.jsonl", getEntries: () => [], getBranch: () => [] },
    ui: { setWidget },
  };
  return { handlers, messages, ctx };
}

const runningTask = (subagentId: string, startedAt: string, label = subagentId): WidgetObservation => ({
  subagentId, generation: 1, agent: "handler", label, status: "running", queuedAt: startedAt, startedAt, updatedAt: startedAt,
});

describe("parent running-task widget", () => {
  test("renders a progress Component above the editor without polling or Result APIs", async () => {
    let intervals = 0;
    const originalSetInterval = globalThis.setInterval;
    globalThis.setInterval = ((..._args: any[]) => {
      intervals++;
      return { unref() {} } as any;
    }) as typeof setInterval;
    try {
      const completed = { ...runningTask("task-9", "2026-01-01T00:00:00.000Z"), status: "completed" as const };
      const state = widgetRuntime([
        runningTask("task-2", "2026-01-02T00:00:00.000Z", "two"),
        runningTask("task-3", "2026-01-01T00:00:00.000Z", "three"),
        runningTask("task-10", "2026-01-02T00:00:00.000Z", "ten"),
        completed,
      ]);
      const widgetCalls: any[][] = [];
      const harness = widgetExtensionHarness(state.runtime, (...args) => { widgetCalls.push(args); });

      await harness.handlers.session_start!({}, harness.ctx);
      const [key, factory, options] = widgetCalls.at(-1)!;
      expect(key).toBe("pi-herdr-subagent-progress");
      expect(typeof factory).toBe("function");
      expect(options).toEqual({ placement: "aboveEditor" });
      const component = factory({ requestRender() {} }, { fg(_color: string, text: string) { return text; } });
      expect(component.render(120)).toEqual([
        "> three · handler  48:00:00  running",
        "> ten · handler  24:00:00  running",
        "> two · handler  24:00:00  running",
      ]);
      expect(intervals).toBe(1);
      component.dispose();

      state.setTasks([completed]);
      state.emit();
      expect(widgetCalls.at(-1)).toEqual(["pi-herdr-subagent-progress", undefined]);
      await harness.handlers.session_start!({}, harness.ctx);
      await harness.handlers.before_agent_start!({}, harness.ctx);

      expect(state.calls.subscribe - state.calls.unsubscribe).toBe(1);
      expect(state.calls.inspect).toBe(0);
      expect(state.calls.join).toBe(0);
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  test("isolates an initial render failure from later refresh, completion delivery, and join", async () => {
    const state = widgetRuntime([runningTask("task", "2026-01-01T00:00:00.000Z")]);
    let attempts = 0;
    const harness = widgetExtensionHarness(state.runtime, () => {
      attempts++;
      if (attempts === 1) throw new Error("initial render failed");
    });

    await expect(harness.handlers.session_start!({}, harness.ctx)).resolves.toBeUndefined();
    expect(() => state.emit()).not.toThrow();
    expect(attempts).toBe(2);
    await state.notify({ subagentId: "task", generation: 1, status: "completed", label: "task" });
    expect(harness.messages).toHaveLength(1);
    await expect(state.runtime.join()).resolves.toEqual({ status: "completed" });
  });

  test("isolates an update refresh failure and permits the next update", async () => {
    const state = widgetRuntime([runningTask("task", "2026-01-01T00:00:00.000Z")]);
    let attempts = 0;
    const harness = widgetExtensionHarness(state.runtime, () => {
      attempts++;
      if (attempts === 2) throw new Error("update failed");
    });

    await harness.handlers.session_start!({}, harness.ctx);
    expect(() => state.emit()).not.toThrow();
    expect(() => state.emit()).not.toThrow();
    expect(attempts).toBe(3);
  });

  test("isolates an empty-state clear failure and permits a later render", async () => {
    const running = runningTask("task", "2026-01-01T00:00:00.000Z");
    const state = widgetRuntime([running]);
    let attempts = 0;
    const harness = widgetExtensionHarness(state.runtime, (_key, content) => {
      attempts++;
      if (content === undefined) throw new Error("clear failed");
    });

    await harness.handlers.session_start!({}, harness.ctx);
    state.setTasks([{ ...running, status: "failed" }]);
    expect(() => state.emit()).not.toThrow();
    state.setTasks([running]);
    expect(() => state.emit()).not.toThrow();
    expect(attempts).toBe(3);
  });

  test("honors summary placement, Nerd Font capability, and off", async () => {
    const originalSetInterval = globalThis.setInterval;
    let intervals = 0;
    globalThis.setInterval = ((..._args: any[]) => { intervals++; return { unref() {} } as any; }) as typeof setInterval;
    try {
      const running = runningTask("run", "2026-01-01T00:00:00.000Z");
      const state = widgetRuntime([
        running,
        { ...running, subagentId: "queue", label: "queue", status: "queued", startedAt: undefined },
        { ...running, subagentId: "done", label: "done", status: "completed" },
        { ...running, subagentId: "failed", label: "failed", status: "failed" },
        { ...running, subagentId: "cancelled", label: "cancelled", status: "cancelled" },
      ]);
      const calls: any[][] = [];
      const summary = widgetExtensionHarness(state.runtime, (...args) => calls.push(args), {
        widgetPlacement: "belowEditor",
        widgetMode: "summary",
        useNerdFont: true,
      });
      await summary.handlers.session_start!({}, summary.ctx);
      const [key, factory, options] = calls.at(-1)!;
      expect(key).toBe("pi-herdr-subagent-progress");
      expect(options).toEqual({ placement: "belowEditor" });
      expect(factory({ requestRender() {} }, { fg(_color: string, text: string) { return text; } }).render(120)).toEqual([
        " 1 running   1 queued   1 completed   2 failed",
      ]);
      expect(intervals).toBe(0);
      summary.handlers.session_shutdown!({}, summary.ctx);

      const offCalls: any[][] = [];
      const off = widgetExtensionHarness(widgetRuntime([running]).runtime, (...args) => offCalls.push(args), {
        widgetPlacement: "off",
        widgetMode: "progress",
        useNerdFont: false,
      });
      await off.handlers.session_start!({}, off.ctx);
      expect(offCalls.at(-1)).toEqual(["pi-herdr-subagent-progress", undefined]);
      expect(intervals).toBe(0);
      off.handlers.session_shutdown!({}, off.ctx);
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });
  test("routes default settings warnings to the current Context and releases it after recovery failure", async () => {
    const state = widgetRuntime([]);
    let warning!: (message: string) => void;
    const settings = { widgetPlacement: "aboveEditor", widgetMode: "progress", useNerdFont: false } as const;
    const harness = widgetExtensionHarness(state.runtime, () => {}, settings, warn => {
      warning = warn;
      return { load() { warning("Invalid subagent settings."); return settings; } };
    });
    const firstWarnings: string[] = [];
    const secondWarnings: string[] = [];
    const failedWarnings: string[] = [];
    const context = (warnings: string[]) => ({
      ...harness.ctx,
      ui: { ...harness.ctx.ui, notify(message: string) { warnings.push(message); } },
    });

    await harness.handlers.session_start!({}, context(firstWarnings));
    await harness.handlers.session_start!({}, context(secondWarnings));
    expect(firstWarnings).toEqual(["Invalid subagent settings."]);
    expect(secondWarnings).toEqual(["Invalid subagent settings."]);

    state.runtime.recover = async () => { throw new Error("recovery failed"); };
    await expect(harness.handlers.session_start!({}, context(failedWarnings))).rejects.toThrow("recovery failed");
    expect(failedWarnings).toEqual(["Invalid subagent settings."]);
    warning("after recovery");
    expect(failedWarnings).toEqual(["Invalid subagent settings."]);
  });

  test("shutdown clears, unsubscribes, releases the Context, and stops after a clear failure", async () => {
    const state = widgetRuntime([runningTask("task", "2026-01-01T00:00:00.000Z")]);
    let attempts = 0;
    const harness = widgetExtensionHarness(state.runtime, (_key, content) => {
      attempts++;
      if (content === undefined) throw new Error("shutdown clear failed");
    });

    await harness.handlers.session_start!({}, harness.ctx);
    expect(() => harness.handlers.session_shutdown!({}, harness.ctx)).not.toThrow();
    expect(state.calls.unsubscribe).toBe(1);
    expect(state.calls.stop).toBe(1);
    expect(attempts).toBe(2);
    state.emitSaved();
    expect(attempts).toBe(2);
    expect(() => harness.handlers.session_shutdown!({}, harness.ctx)).not.toThrow();
    expect(state.calls.unsubscribe).toBe(1);
    expect(state.calls.stop).toBe(2);
  });
});


test("aborting join leaves the running task unchanged until explicit cancellation", async () => {
  const notifications: CompletionNotification[] = [];
  const { calls, transport } = fakeTransport();
  const root = mkdtempSync(join(tmpdir(), "subagents-join-abort-"));
  const runtime = new SubagentRuntime(transport, handlerRegistry(), root, notification => { notifications.push(notification); });
  const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "join", taskSlug: "task" });
  const manifest = readFileSync(join(dirname(task.resultPath), "task.json"), "utf8");
  const controller = new AbortController();
  const joined = runtime.join(task.subagentId, task.generation, controller.signal);

  controller.abort();
  await expect(joined).rejects.toMatchObject({ name: "AbortError" });
  expect(runtime.inspect(task.subagentId)).toMatchObject({ generation: task.generation, status: "running" });
  expect(existsSync(task.resultPath)).toBeFalse();
  expect(readFileSync(join(dirname(task.resultPath), "task.json"), "utf8")).toBe(manifest);
  expect(notifications).toEqual([]);
  expect(calls.filter(call => (call as { op?: string }).op === "closeTab")).toHaveLength(0);

  await expect(runtime.cancel(task.subagentId)).resolves.toMatchObject({ status: "cancelled" });
  expect(calls.filter(call => (call as { op?: string }).op === "closeTab")).toHaveLength(1);
  expect(notifications).toEqual([{ subagentId: task.subagentId, generation: task.generation, status: "cancelled", label: "join" }]);
});

test("passes the join tool AbortSignal to the runtime wait", async () => {
  const { transport } = fakeTransport();
  const runtime = new SubagentRuntime(transport, handlerRegistry(), mkdtempSync(join(tmpdir(), "subagents-tool-join-abort-")));
  const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "join", taskSlug: "task" });
  const joinTool = createSubagentTools(runtime, "/repo").find(tool => tool.name === "subagent_join")!;
  const controller = new AbortController();
  const joined = (joinTool.execute as any)("call-1", { subagentId: task.subagentId, generation: task.generation }, controller.signal);

  controller.abort();
  await expect(joined).rejects.toMatchObject({ name: "AbortError" });
  expect(runtime.inspect(task.subagentId)).toMatchObject({ generation: task.generation, status: "running" });
  expect(existsSync(task.resultPath)).toBeFalse();
  runtime.stop();
});


test("captures the parent workspace once and preserves create arguments", async () => {
  const previous = process.env.HERDR_WORKSPACE_ID;
  const calls: string[][] = [];
  try {
    process.env.HERDR_WORKSPACE_ID = "wF";
    const client = createHerdrClient(async (_command, args) => {
      calls.push([...args]);
      return {
        code: 0,
        stdout: JSON.stringify({ result: { tab: { tab_id: "wF:t1", workspace_id: "wF" }, root_pane: { pane_id: "wF:p1" } } }),
        stderr: "",
      };
    });
    const transport = createHerdrTransport(client);
    process.env.HERDR_WORKSPACE_ID = "w8";

    await expect(transport.createTab({ cwd: "/repo", label: "pinned", env: { A: "1" } }))
      .resolves.toEqual({ tabId: "wF:t1", paneId: "wF:p1" });
    expect(calls).toEqual([["tab", "create", "--workspace", "wF", "--cwd", "/repo", "--label", "pinned", "--no-focus", "--env", "A=1"]]);
  } finally {
    if (previous === undefined) delete process.env.HERDR_WORKSPACE_ID;
    else process.env.HERDR_WORKSPACE_ID = previous;
  }
});

test("defers missing and invalid workspace rejection until createTab", async () => {
  for (const [options, token] of [[{ workspaceId: undefined }, "parent_workspace_missing"], [{ workspaceId: " \t" }, "parent_workspace_invalid"]] as const) {
    let calls = 0;
    const client = createHerdrClient(async () => {
      calls++;
      return { code: 0, stdout: "{}", stderr: "" };
    });
    const transport = createHerdrTransport(client, options);
    await expect(transport.createTab({ cwd: "/repo", label: "blocked" })).rejects.toThrow(token);
    expect(calls).toBe(0);
  }
});

test("rejects a mismatched response and closes only its explicit root pane", async () => {
  const calls: string[][] = [];
  const client = createHerdrClient(async (_command, args) => {
    calls.push([...args]);
    return args[0] === "pane"
      ? { code: 0, stdout: "{}", stderr: "" }
      : { code: 0, stdout: JSON.stringify({ result: { tab: { tab_id: "w8:t1", workspace_id: "w8" }, root_pane: { pane_id: "w8:p1" } } }), stderr: "" };
  });
  const transport = createHerdrTransport(client, { workspaceId: "wF" });

  await expect(transport.createTab({ cwd: "/repo", label: "mismatch" })).rejects.toThrow("parent_workspace_mismatch");
  expect(calls).toEqual([
    ["tab", "create", "--workspace", "wF", "--cwd", "/repo", "--label", "mismatch", "--no-focus"],
    ["pane", "close", "w8:p1"],
  ]);
});

test("classifies unsupported create contracts and keeps unrelated command failures unchanged", async () => {
  const unsupportedCalls: string[][] = [];
  const unsupported = createHerdrTransport(createHerdrClient(async (_command, args) => {
    unsupportedCalls.push([...args]);
    return { code: 2, stdout: "", stderr: "unknown option --workspace" };
  }), { workspaceId: "wF" });
  await expect(unsupported.createTab({ cwd: "/repo", label: "unsupported" })).rejects.toThrow("parent_workspace_contract_unsupported");
  expect(unsupportedCalls).toHaveLength(1);

  const missingFieldCalls: string[][] = [];
  const missingField = createHerdrTransport(createHerdrClient(async (_command, args) => {
    missingFieldCalls.push([...args]);
    return args[0] === "pane"
      ? { code: 0, stdout: "{}", stderr: "" }
      : { code: 0, stdout: JSON.stringify({ result: { tab: { tab_id: "wF:t2" }, root_pane: { pane_id: "wF:p2" } } }), stderr: "" };
  }), { workspaceId: "wF" });
  await expect(missingField.createTab({ cwd: "/repo", label: "missing-field" })).rejects.toThrow("parent_workspace_contract_unsupported");
  expect(missingFieldCalls).toEqual([
    ["tab", "create", "--workspace", "wF", "--cwd", "/repo", "--label", "missing-field", "--no-focus"],
    ["pane", "close", "wF:p2"],
  ]);

  const commandFailure = createHerdrTransport(createHerdrClient(async () => ({ code: 1, stdout: "", stderr: "backend unavailable" })), { workspaceId: "wF" });
  await expect(commandFailure.createTab({ cwd: "/repo", label: "failure" })).rejects.toThrow("herdr tab create failed: backend unavailable");
  await expect(commandFailure.createTab({ cwd: "/repo", label: "failure" })).rejects.not.toThrow("parent_workspace_contract_unsupported");
});

test("preserves the primary mismatch token when rejected-pane cleanup fails", async () => {
  const calls: string[][] = [];
  const transport = createHerdrTransport(createHerdrClient(async (_command, args) => {
    calls.push([...args]);
    return args[0] === "pane"
      ? { code: 1, stdout: "", stderr: "close denied" }
      : { code: 0, stdout: JSON.stringify({ result: { tab: { tab_id: "w8:t3", workspace_id: "w8" }, root_pane: { pane_id: "w8:p3" } } }), stderr: "" };
  }), { workspaceId: "wF" });

  await expect(transport.createTab({ cwd: "/repo", label: "cleanup" })).rejects.toThrow(/parent_workspace_mismatch.*cleanup failed/);
  expect(calls).toEqual([
    ["tab", "create", "--workspace", "wF", "--cwd", "/repo", "--label", "cleanup", "--no-focus"],
    ["pane", "close", "w8:p3"],
  ]);
});

test("propagates a missing parent workspace through spawn without a fallback launch", async () => {
  let calls = 0;
  const transport = createHerdrTransport(createHerdrClient(async () => {
    calls++;
    return { code: 0, stdout: "{}", stderr: "" };
  }), { workspaceId: undefined });
  const runtime = new SubagentRuntime(transport, handlerRegistry(), mkdtempSync(join(tmpdir(), "subagents-workspace-missing-")));

  await expect(runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "missing", taskSlug: "workspace-missing" }))
    .rejects.toThrow("parent_workspace_missing");
  expect(calls).toBe(0);
  expect(runtime.inspect("workspace-missing")).toMatchObject({ status: "failed", error: "Error: parent_workspace_missing" });
  runtime.stop();
});


test("classifies a successful malformed tab-create response as an unsupported contract without cleanup", async () => {
  const calls: string[][] = [];
  const transport = createHerdrTransport(createHerdrClient(async (_command, args) => {
    calls.push([...args]);
    return { code: 0, stdout: "{", stderr: "" };
  }), { workspaceId: "wF" });

  await expect(transport.createTab({ cwd: "/repo", label: "malformed" }))
    .rejects.toThrow(/parent_workspace_contract_unsupported.*invalid JSON/);
  expect(calls).toEqual([["tab", "create", "--workspace", "wF", "--cwd", "/repo", "--label", "malformed", "--no-focus"]]);
});

test("retains every workspace create rejection without a pane run", async () => {
  const cases: Array<{ name: string; workspaceId: string | undefined; token: string }> = [
    { name: "missing", workspaceId: undefined, token: "parent_workspace_missing" },
    { name: "invalid", workspaceId: " \t", token: "parent_workspace_invalid" },
    { name: "unsupported", workspaceId: "wF", token: "parent_workspace_contract_unsupported" },
    { name: "mismatch", workspaceId: "wF", token: "parent_workspace_mismatch" },
  ];

  for (const { name, workspaceId, token } of cases) {
    const calls: string[][] = [];
    const transport = createHerdrTransport(createHerdrClient(async (_command, args) => {
      calls.push([...args]);
      if (name === "unsupported") return { code: 2, stdout: "", stderr: "unknown option --workspace" };
      if (name === "mismatch") return args[0] === "pane"
        ? { code: 0, stdout: "", stderr: "" }
        : { code: 0, stdout: JSON.stringify({ result: { tab: { tab_id: "w8:t1", workspace_id: "w8" }, root_pane: { pane_id: "w8:p1" } } }), stderr: "" };
      return { code: 0, stdout: "{}", stderr: "" };
    }), { workspaceId });
    const root = mkdtempSync(join(tmpdir(), `subagents-workspace-${name}-`));
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
    const taskSlug = `workspace-${name}`;

    await expect(runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: name, taskSlug })).rejects.toThrow(token);
    expect(calls.some(args => args[0] === "pane" && args[1] === "run")).toBeFalse();
    expect(runtime.inspect(taskSlug)).toMatchObject({ status: "failed", error: expect.stringContaining(token) });
    expect(JSON.parse(readFileSync(join(root, "tasks", `${taskSlug}-artifacts`, "task.json"), "utf8")))
      .toMatchObject({ status: "failed", error: expect.stringContaining(token) });
    runtime.stop();
  }
});

test("recovery retains an existing pane while resumed creation uses the new transport target", async () => {
  const parentSessionFile = join(mkdtempSync(join(tmpdir(), "subagents-workspace-recovery-")), "parent.jsonl");
  const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
  const first = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "recover", taskSlug: "workspace-recovery", parentSessionFile });
  writeFileSync(first.sessionFile, "");
  original.stop();

  const calls: string[][] = [];
  const transport = createHerdrTransport(createHerdrClient(async (_command, args) => {
    calls.push([...args]);
    if (args[0] === "pane" && args[1] === "get") return { code: 0, stdout: "{}", stderr: "" };
    if (args[0] === "tab") return { code: 0, stdout: JSON.stringify({ result: { tab: { tab_id: "w8:t2", workspace_id: "w8" }, root_pane: { pane_id: "w8:p2" } } }), stderr: "" };
    return { code: 0, stdout: "", stderr: "" };
  }), { workspaceId: "w8" });
  const rebuilt = new SubagentRuntime(transport, handlerRegistry());

  await rebuilt.recover("/repo", parentSessionFile);
  expect(rebuilt.inspect(first.subagentId)).toMatchObject({ status: "running", paneId: first.paneId });
  expect(calls).toEqual([["pane", "get", first.paneId]]);

  writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry" }));
  await expect(rebuilt.join(first.subagentId)).resolves.toMatchObject({ status: "failed", generation: 1 });
  const second = await rebuilt.resume(first.subagentId, "two");

  expect(second).toMatchObject({ generation: 2, sessionFile: first.sessionFile, tabId: "w8:t2", paneId: "w8:p2" });
  expect(calls).toContainEqual(["tab", "create", "--workspace", "w8", "--cwd", "/repo", "--label", "recover", "--no-focus", "--env", `PI_HERDR_SUBAGENT_ID=${first.subagentId}`, "--env", "PI_HERDR_SUBAGENT_GENERATION=2", "--env", `PI_HERDR_SUBAGENT_RESULT_PATH=${second.resultPath}`]);
  rebuilt.stop();
});


test("steer forwards a running message and guards unknown or terminal tasks", async () => {
  const notifications: CompletionNotification[] = [];
  const { calls, transport } = fakeTransport();
  const runtime = new SubagentRuntime(transport, handlerRegistry(), mkdtempSync(join(tmpdir(), "subagents-steer-running-")), notification => { notifications.push(notification); });
  const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "steer", taskSlug: "steer-running" });
  const message = "keep this exact";
  const before = runtime.inspect(task.subagentId);
  await expect(runtime.steer(task.subagentId, message)).resolves.toMatchObject({ subagentId: task.subagentId, generation: task.generation, status: "running" });
  expect(calls.filter(call => (call as { op?: string }).op === "send")).toEqual([{ op: "send", paneId: task.paneId, text: message }]);
  expect({ status: runtime.inspect(task.subagentId).status, generation: runtime.inspect(task.subagentId).generation, result: runtime.inspect(task.subagentId).result, error: runtime.inspect(task.subagentId).error })
    .toEqual({ status: before.status, generation: before.generation, result: before.result, error: before.error });
  await expect(runtime.steer("unknown", message)).rejects.toThrow("Unknown subagent: unknown");
  expect(calls.filter(call => (call as { op?: string }).op === "send")).toHaveLength(1);
  expect(notifications).toEqual([]);

  const steerTool = createSubagentTools(runtime, "/repo").find(tool => tool.name === "subagent_steer")!;
  const parameters = steerTool.parameters as { required?: string[]; properties: Record<string, { minLength?: number }> };
  expect(steerTool.name).toBe("subagent_steer");
  expect(parameters.required).toEqual(["subagentId", "message"]);
  expect(parameters.properties.message).toMatchObject({ minLength: 1 });
  runtime.stop();

  for (const status of ["completed", "failed", "cancelled"] as const) {
    const terminal = fakeTransport();
    const terminalRuntime = new SubagentRuntime(terminal.transport, handlerRegistry(), mkdtempSync(join(tmpdir(), `subagents-steer-${status}-`)));
    const terminalTask = await terminalRuntime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: status, taskSlug: `steer-${status}` });
    writeFileSync(terminalTask.resultPath, JSON.stringify({
      subagentId: terminalTask.subagentId,
      generation: terminalTask.generation,
      status,
      ...(status === "completed" ? { result: "done" } : status === "failed" ? { error: "failed" } : {}),
    }));
    await terminalRuntime.join(terminalTask.subagentId);

    await expect(terminalRuntime.steer(terminalTask.subagentId, message)).rejects.toThrow("Subagent is not running");
    expect(terminal.calls.filter(call => (call as { op?: string }).op === "send")).toHaveLength(0);
    terminalRuntime.stop();
  }
});

test("steer transport rejection leaves the task and notifications unchanged", async () => {
  const rejection = new Error("steer rejected");
  let submissions = 0;
  const { transport } = fakeTransport();
  transport.sendText = async () => { submissions++; throw rejection; };
  const notifications: CompletionNotification[] = [];
  const runtime = new SubagentRuntime(transport, handlerRegistry(), mkdtempSync(join(tmpdir(), "subagents-steer-rejection-")), notification => { notifications.push(notification); });
  const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "reject", taskSlug: "steer-rejection" });
  const before = runtime.inspect(task.subagentId);

  await expect(runtime.steer(task.subagentId, "exact rejection payload")).rejects.toBe(rejection);

  const after = runtime.inspect(task.subagentId);
  expect(submissions).toBe(1);
  expect({ status: after.status, generation: after.generation, result: after.result, error: after.error })
    .toEqual({ status: before.status, generation: before.generation, result: before.result, error: before.error });
  expect(notifications).toEqual([]);
  runtime.stop();
});


type NotificationHarness = {
  handlers: Record<string, (event: unknown, ctx: any) => Promise<unknown> | unknown>;
  ctx: any;
  messages: Array<{ message: any; options: any }>;
  notify(notification: CompletionNotification): Promise<void>;
  branchReads: () => number;
  setBranch(value: unknown[]): void;
  setFailures(value: { branch?: boolean; send?: boolean }): void;
  setIdle(value: boolean): void;
};

type NotificationHarnessOptions = {
  branch?: unknown[];
  entries?: unknown[];
  idle?: boolean;
  recoverNotification?: CompletionNotification;
  onBranchScan?: () => void;
  onSend?: () => void;
};

function notificationHarness(options: NotificationHarnessOptions = {}): NotificationHarness {
  let notifier: ((notification: CompletionNotification) => void | Promise<void>) | undefined;
  let branch = options.branch ?? [];
  let reads = 0;
  let idle = options.idle ?? true;
  let failBranch = false;
  let failSend = false;
  const handlers: Record<string, (event: unknown, ctx: any) => Promise<unknown> | unknown> = {};
  const messages: Array<{ message: any; options: any }> = [];
  const runtime = {
    setCompletionNotifier(value: typeof notifier) { notifier = value; },
    listTasks() { return []; },
    onTaskUpdate() { return () => {}; },
    async recover() { if (options.recoverNotification) await notifier?.(options.recoverNotification); },
    agentNames() { return ["handler"]; },
    stop() {},
  };
  const registry = { async discover() {} };
  const previousChildResultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  try {
    activateSubagents({
      on(event: string, handler: (event: unknown, ctx: any) => unknown) { handlers[event] = handler; },
      sendMessage(message: unknown, sendOptions: unknown) {
        if (failSend) throw new Error("send failed");
        options.onSend?.();
        messages.push({ message, options: sendOptions });
      },
      registerTool() {},
      getActiveTools() { return []; },
      setActiveTools() {},
    } as any, {
      runtime: runtime as any,
      registry: registry as any,
      settingsStore: { load: () => ({ widgetPlacement: "off", widgetMode: "progress", useNerdFont: false }) } as any,
    });
  } finally {
    if (previousChildResultPath === undefined) delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    else process.env.PI_HERDR_SUBAGENT_RESULT_PATH = previousChildResultPath;
  }
  const ctx = {
    cwd: "/repo",
    isIdle: () => idle,
    sessionManager: {
      getSessionFile: () => "/repo/parent.jsonl",
      getEntries: () => options.entries ?? [],
      getBranch: () => {
        reads++;
        options.onBranchScan?.();
        if (failBranch) throw new Error("scan failed");
        return branch;
      },
    },
    ui: { setWidget() {} },
  };
  return {
    handlers,
    ctx,
    messages,
    async notify(notification) { await notifier?.(notification); },
    branchReads: () => reads,
    setBranch(value) { branch = value; },
    setFailures(value) {
      failBranch = value.branch ?? false;
      failSend = value.send ?? false;
    },
    setIdle(value) { idle = value; },
  };
}

const terminalNotification = (overrides: Partial<CompletionNotification> = {}): CompletionNotification => ({
  subagentId: "task",
  generation: 1,
  status: "completed",
  label: "task",
  ...overrides,
});

describe("durable terminal notification delivery red seams", () => {
  test("R5 startup notification must not trigger a parent turn", async () => {
    const harness = notificationHarness({ recoverNotification: terminalNotification() });
    await harness.handlers.session_start!({}, harness.ctx);
    expect(harness.messages).toHaveLength(1);
    expect(harness.messages[0]!.options).toEqual({ triggerTurn: false, deliverAs: "followUp" });
  });

  test("R6 agent_end is not an idle boundary", async () => {
    const harness = notificationHarness();
    await harness.handlers.before_agent_start!({}, harness.ctx);
    await harness.notify(terminalNotification());
    expect(harness.messages).toHaveLength(0);
    await harness.handlers.agent_end!({}, harness.ctx);
    expect(harness.messages).toHaveLength(0);
    await harness.handlers.agent_settled!({}, harness.ctx);
    expect(harness.messages).toHaveLength(1);
    expect(harness.messages[0]!.options).toEqual({ triggerTurn: true, deliverAs: "followUp" });
  });

  test("F8 keeps delivery active through repeated agent_end and non-idle settlement", async () => {
    const harness = notificationHarness({ idle: false });
    await harness.handlers.before_agent_start!({}, harness.ctx);
    await harness.notify(terminalNotification());

    for (let attempt = 0; attempt < 3; attempt++) {
      await harness.handlers.agent_end!({}, harness.ctx);
      expect(harness.messages).toHaveLength(0);
    }

    const readsBeforeSettled = harness.branchReads();
    await harness.handlers.agent_settled!({}, harness.ctx);
    expect(harness.messages).toHaveLength(0);
    expect(harness.branchReads()).toBe(readsBeforeSettled);

    harness.setIdle(true);
    await harness.handlers.agent_settled!({}, harness.ctx);
    expect(harness.messages).toHaveLength(1);
    expect(harness.messages[0]!.options).toEqual({ triggerTurn: true, deliverAs: "followUp" });
  });

  test("R7 an already-idle terminal source flushes through a current-branch scan", async () => {
    const harness = notificationHarness();
    await harness.handlers.session_start!({}, harness.ctx);
    await harness.handlers.agent_settled!({}, harness.ctx);
    await harness.notify(terminalNotification());
    expect(harness.branchReads()).toBeGreaterThan(0);
    expect(harness.messages).toHaveLength(1);
    expect(harness.messages[0]!.options).toEqual({ triggerTurn: true, deliverAs: "followUp" });
  });

  test("R8 concurrent safe flushes send once, then an absent marker is retryable", async () => {
    let overlap: Promise<unknown> | undefined;
    let harness!: NotificationHarness;
    harness = notificationHarness({
      onSend: () => { overlap = Promise.resolve(harness.handlers.agent_settled!({}, harness.ctx)); },
    });
    await harness.handlers.session_start!({}, harness.ctx);
    const first = harness.notify(terminalNotification());
    await first;
    await (overlap ?? Promise.reject(new Error("R8 did not overlap a second flush request")));
    expect(harness.messages).toHaveLength(1);
    await harness.handlers.agent_settled!({}, harness.ctx);
    expect(harness.messages).toHaveLength(2);
  });
});


describe("review #27 notification regressions", () => {
  const supported = (notification: CompletionNotification, overrides: Record<string, unknown> = {}) => ({
    type: "custom_message",
    customType: "pi-herdr-subagent-completion",
    details: { schema: "pi-herdr-subagent-completion/v1", ...notification, ...overrides },
  });

  test("R1 ignores a matching marker from an abandoned branch", async () => {
    const notification = terminalNotification({ label: "current" });
    const harness = notificationHarness({ entries: [supported(notification)], recoverNotification: notification });
    await harness.handlers.session_start!({}, harness.ctx);
    expect(harness.messages).toHaveLength(1);
    expect(harness.messages[0]!.message.details.label).toBe("current");
    expect(harness.messages[0]!.options).toEqual({ triggerTurn: false, deliverAs: "followUp" });
  });

  test("R2 ignores schema-less, unsupported, and malformed markers", async () => {
    const notification = terminalNotification();
    const harness = notificationHarness({ branch: [
      supported(notification, { schema: undefined }),
      supported(notification, { schema: "pi-herdr-subagent-completion/v2" }),
      supported(notification, { generation: "1" }),
      supported(notification, { reason: 7 }),
    ] });
    await harness.handlers.before_agent_start!({}, harness.ctx);
    await harness.notify(notification);
    await harness.handlers.agent_settled!({}, harness.ctx);
    expect(harness.messages).toHaveLength(1);
  });

  test("R3 requires status in the current-branch correlation", async () => {
    const notification = terminalNotification({ status: "completed" });
    const harness = notificationHarness({ branch: [supported(notification, { status: "failed" })] });
    await harness.handlers.before_agent_start!({}, harness.ctx);
    await harness.notify(notification);
    await harness.handlers.agent_settled!({}, harness.ctx);
    expect(harness.messages).toHaveLength(1);
    expect(harness.messages[0]!.message.details.status).toBe("completed");
  });

  test("R4 retries after send returns without branch visibility", async () => {
    const notification = terminalNotification();
    const harness = notificationHarness();
    await harness.handlers.session_start!({}, harness.ctx);
    await harness.notify(notification);
    expect(harness.messages).toHaveLength(1);
    await harness.handlers.agent_settled!({}, harness.ctx);
    expect(harness.messages).toHaveLength(2);
  });

  test("F12 replays an absent append after restart", async () => {
    const notification = terminalNotification();
    const first = notificationHarness({ recoverNotification: notification });
    await first.handlers.session_start!({}, first.ctx);
    expect(first.messages).toHaveLength(1);

    const second = notificationHarness({ recoverNotification: notification });
    await second.handlers.session_start!({}, second.ctx);
    expect(second.messages).toHaveLength(1);
    expect(second.messages[0]!.message.details).toMatchObject(notification);
  });

  test("F13 keeps a failed scan retryable", async () => {
    const notification = terminalNotification();
    const harness = notificationHarness();
    await harness.handlers.session_start!({}, harness.ctx);
    harness.setFailures({ branch: true });
    await harness.notify(notification);
    expect(harness.messages).toHaveLength(0);
    harness.setFailures({});
    await harness.handlers.agent_settled!({}, harness.ctx);
    expect(harness.messages).toHaveLength(1);
  });

  test("isolates a pending notification across sessions with a reused correlation", async () => {
    const harness = notificationHarness({ idle: false });
    const contextA = harness.ctx;
    await harness.handlers.session_start!({}, contextA);
    await harness.handlers.before_agent_start!({}, contextA);
    await harness.notify(terminalNotification({ label: "session-a" }));
    expect(harness.messages).toHaveLength(0);

    const contextB = {
      ...contextA,
      isIdle: () => true,
      sessionManager: {
        ...contextA.sessionManager,
        getBranch: () => [],
      },
    };
    await harness.handlers.session_start!({}, contextB);
    expect(harness.messages).toHaveLength(0);

    await harness.notify(terminalNotification({ label: "session-b" }));
    expect(harness.messages).toHaveLength(1);
    expect(harness.messages[0]!.message.details.label).toBe("session-b");
  });
});


function completionMarker(notification: CompletionNotification, overrides: Record<string, unknown> = {}) {
  return {
    type: "custom_message",
    customType: "pi-herdr-subagent-completion",
    details: { schema: "pi-herdr-subagent-completion/v1", ...notification, ...overrides },
  };
}

test("F9 message_end does not acknowledge or flush a pending notification", async () => {
  const harness = notificationHarness();
  await harness.handlers.before_agent_start!({}, harness.ctx);
  await harness.handlers.message_end?.({}, harness.ctx);
  await harness.notify(terminalNotification());
  expect(harness.messages).toHaveLength(0);
  await harness.handlers.agent_settled!({}, harness.ctx);
  expect(harness.messages).toHaveLength(1);
});

test("F13 retries after send failure without changing task delivery state", async () => {
  const harness = notificationHarness();
  await harness.handlers.session_start!({}, harness.ctx);
  harness.setFailures({ send: true });
  await harness.notify(terminalNotification());
  expect(harness.messages).toHaveLength(0);
  harness.setFailures({});
  await harness.handlers.agent_settled!({}, harness.ctx);
  expect(harness.messages).toHaveLength(1);
});

test("F16 delivers two generations independently", async () => {
  const harness = notificationHarness();
  await harness.handlers.before_agent_start!({}, harness.ctx);
  await Promise.all([
    harness.notify(terminalNotification({ generation: 1, label: "first" })),
    harness.notify(terminalNotification({ generation: 2, label: "second" })),
  ]);
  await harness.handlers.agent_settled!({}, harness.ctx);
  expect(harness.messages.map(({ message }) => [message.details.generation, message.details.label])).toEqual([[1, "first"], [2, "second"]]);
});

test("wrong ID, wrong generation, and display-only markers do not acknowledge", async () => {
  for (const overrides of [
    { subagentId: "other" },
    { generation: 2 },
    { subagentId: undefined, generation: undefined, status: undefined, label: "display-only" },
  ]) {
    const notification = terminalNotification();
    const harness = notificationHarness({ branch: [completionMarker(notification, overrides)] });
    await harness.handlers.before_agent_start!({}, harness.ctx);
    await harness.notify(notification);
    await harness.handlers.agent_settled!({}, harness.ctx);
    expect(harness.messages).toHaveLength(1);
  }
});

test("terminal statuses retain independent delivery correlation", async () => {
  for (const status of ["completed", "failed", "cancelled"] as const) {
    const harness = notificationHarness();
    const notification = terminalNotification({ status, label: status });
    await harness.handlers.before_agent_start!({}, harness.ctx);
    await harness.notify(notification);
    await harness.handlers.agent_settled!({}, harness.ctx);
    expect(harness.messages[0]!.message.details).toMatchObject({ status, label: status });
  }
});

test("late prior-session settlements are discarded when the Result appears after an epoch switch", async () => {
  const parentA = join(mkdtempSync(join(tmpdir(), "subagents-late-a-")), "parent.jsonl");
  const parentB = join(mkdtempSync(join(tmpdir(), "subagents-late-b-")), "parent.jsonl");
  const runtime = new SubagentRuntime(fakeTransport().transport, handlerRegistry());


  const handlers: Record<string, (event: unknown, ctx: any) => Promise<void>> = {};
  const messages: Array<{ message: any; options: any }> = [];
  const context = (sessionFile: string) => ({
    cwd: "/repo",
    isIdle: () => true,
    sessionManager: {
      getSessionFile: () => sessionFile,
      getBranch: () => [],
    },
    ui: { setWidget() {} },
  });
  const previousChildResultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  try {
    activateSubagents({
      on(event: string, handler: (event: unknown, ctx: any) => Promise<void>) { handlers[event] = handler; },
      sendMessage(message: unknown, options: unknown) { messages.push({ message, options }); },
      registerTool() {},
      getActiveTools() { return []; },
      setActiveTools() {},
    } as any, { runtime, registry: handlerRegistry(), settingsStore: { load: () => ({ widgetPlacement: "off", widgetMode: "progress", useNerdFont: false }) } as any });

    const contextA = context(parentA);
    await handlers.session_start!({}, contextA);
    await handlers.before_agent_start!({}, contextA);
    const oldTask = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "old", label: "old", taskSlug: "late", parentSessionFile: parentA });
    runtime.stop();
    const lateSettlement = runtime.join(oldTask.subagentId);

    await handlers.session_start!({}, context(parentB));
    writeFileSync(oldTask.resultPath, JSON.stringify({ subagentId: oldTask.subagentId, generation: 1, status: "completed", result: "old" }));
    await lateSettlement;
    expect(messages).toHaveLength(0);

    const freshTask = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "fresh", label: "fresh", taskSlug: "late", parentSessionFile: parentB });
    writeFileSync(freshTask.resultPath, JSON.stringify({ subagentId: freshTask.subagentId, generation: 1, status: "completed", result: "fresh" }));
    await runtime.join(freshTask.subagentId);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.message.details).toMatchObject({ subagentId: "late", generation: 1, label: "fresh" });
  } finally {
    if (previousChildResultPath === undefined) delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    else process.env.PI_HERDR_SUBAGENT_RESULT_PATH = previousChildResultPath;
    runtime.stop();
  }
});


describe("Phase B terminal surface cleanup", () => {
  const cleanupFor = (task: { surfaceCleanups?: unknown[] }, generation: number) =>
    (task.surfaceCleanups as Array<Record<string, unknown>> | undefined)?.find(value => value?.generation === generation && typeof value.status === "string");

  test("translates accepted-tab close and classifies tab_not_found", async () => {
    const calls: string[][] = [];
    let missing = false;
    const transport = createHerdrTransport(createHerdrClient(async (_command, args) => {
      calls.push([...args]);
      return missing
        ? { code: 1, stdout: JSON.stringify({ error: { code: "tab_not_found" } }), stderr: "" }
        : { code: 0, stdout: "{}", stderr: "" };
    }), { workspaceId: "wF" });

    await expect(transport.closeTab("wF:t9")).resolves.toBe("closed");
    missing = true;
    await expect(transport.closeTab("wF:t9")).resolves.toBe("already_closed");
    expect(calls).toEqual([["tab", "close", "wF:t9"], ["tab", "close", "wF:t9"]]);
  });

  test("persists completed, failed, and cancelled outcomes before one close and retains artifacts", async () => {
    for (const status of ["completed", "failed", "cancelled"] as const) {
      const root = mkdtempSync(join(tmpdir(), `subagents-cleanup-${status}-`));
      const notifications: CompletionNotification[] = [];
      const { calls, transport } = fakeTransport();
      transport.closeTab = async tabId => {
        const manifest = JSON.parse(readFileSync(join(root, "tasks", "task-artifacts", "task.json"), "utf8"));
        expect(manifest.status).toBe(status);
        expect(manifest.surfaceCleanups[0]).toMatchObject({ generation: 1, tabId, paneId: "pane-1", status: "pending" });
        expect(existsSync(join(root, "tasks", "task-artifacts", "result-1.json"))).toBeTrue();
        calls.push({ op: "closeTab", tabId });
        return "closed";
      };
      const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
      const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: status, taskSlug: "task" });
      writeFileSync(task.sessionFile, "session");
      if (status === "cancelled") await Promise.all([runtime.cancel(task.subagentId), runtime.cancel(task.subagentId)]);
      else {
        writeFileSync(task.resultPath, JSON.stringify({
          subagentId: task.subagentId,
          generation: 1,
          status,
          ...(status === "completed" ? { result: "done" } : { error: "child failed" }),
        }));
        await Promise.all([runtime.join(task.subagentId), runtime.join(task.subagentId)]);
      }

      const settled = runtime.inspect(task.subagentId);
      expect(settled).toMatchObject({ status, result: status === "completed" ? "done" : undefined, error: status === "failed" ? "child failed" : undefined });
      expect(cleanupFor(settled, 1)).toEqual({
        generation: 1, tabId: "tab-1", paneId: "pane-1", status: "closed", attemptedAt: expect.any(String),
      });
      expect(calls.filter(value => (value as { op?: string }).op === "closeTab")).toHaveLength(1);
      expect(existsSync(task.sessionFile)).toBeTrue();
      expect(existsSync(task.resultPath)).toBeTrue();
      expect(existsSync(join(dirname(task.resultPath), "task.json"))).toBeTrue();
      expect(existsSync(join(dirname(task.resultPath), "launch-1.ps1"))).toBeTrue();
      expect(existsSync(join(dirname(task.resultPath), "launch-1.cjs"))).toBeTrue();
      expect(notifications).toEqual([{
        subagentId: task.subagentId,
        generation: 1,
        status,
        label: status,
        ...(status === "failed" ? { reason: "child failed" } : {}),
      }]);
      runtime.stop();
    }
  });

  test("keeps inspect non-blocking, aborts only one join wait, and isolates close failure", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-cleanup-pending-"));
    const notifications: CompletionNotification[] = [];
    const { calls, transport } = fakeTransport();
    let closeStarted!: () => void;
    const started = new Promise<void>(resolve => { closeStarted = resolve; });
    let rejectClose!: (error: Error) => void;
    const close = new Promise<never>((_resolve, reject) => { rejectClose = reject; });
    transport.closeTab = async tabId => { calls.push({ op: "closeTab", tabId }); closeStarted(); return close; };
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "pending", taskSlug: "task" });
    writeFileSync(task.sessionFile, "session");
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "done" }));
    const joined = runtime.join(task.subagentId);
    await started;

    const pending = runtime.inspect(task.subagentId);
    expect(pending.status).toBe("completed");
    expect(cleanupFor(pending, 1)?.status).toBe("pending");
    expect(JSON.parse(readFileSync(join(dirname(task.resultPath), "task.json"), "utf8"))).toMatchObject({ status: "completed", surfaceCleanups: [{ status: "pending" }] });
    (pending.surfaceCleanups![0] as Record<string, unknown>).status = "closed";
    expect(cleanupFor(runtime.inspect(task.subagentId), 1)?.status).toBe("pending");
    expect(notifications).toEqual([]);

    const controller = new AbortController();
    const aborted = runtime.join(task.subagentId, 1, controller.signal);
    controller.abort();
    await expect(aborted).rejects.toMatchObject({ name: "AbortError" });
    rejectClose(new Error("  close\n  denied  "));
    await expect(joined).resolves.toMatchObject({ status: "completed", result: "done" });

    const settled = runtime.inspect(task.subagentId);
    expect(cleanupFor(settled, 1)).toMatchObject({ status: "failed", error: "close denied" });
    expect(settled.status).toBe("completed");
    expect(existsSync(task.sessionFile)).toBeTrue();
    expect(existsSync(task.resultPath)).toBeTrue();
    expect(notifications).toEqual([{ subagentId: task.subagentId, generation: 1, status: "completed", label: "pending" }]);
    expect(calls.filter(value => (value as { op?: string }).op === "closeTab")).toHaveLength(1);
    runtime.stop();
  });

  test("retries once per recovery, preserves opaque and nested unknown data, then stays idempotent", async () => {
    const parentSessionFile = join(mkdtempSync(join(tmpdir(), "subagents-cleanup-retry-")), "parent.jsonl");
    const firstTransport = fakeTransport().transport;
    firstTransport.closeTab = async () => { throw new Error("first close failed"); };
    const firstRuntime = new SubagentRuntime(firstTransport, handlerRegistry());
    const task = await firstRuntime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "retry", taskSlug: "task", parentSessionFile });
    writeFileSync(task.sessionFile, "session");
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "failed", error: "primary" }));
    await firstRuntime.join(task.subagentId);
    firstRuntime.stop();

    const manifestPath = join(dirname(task.resultPath), "task.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.unknownTop = { keep: [1, null, { value: true }] };
    manifest.surfaceCleanups[0].future = { keep: ["nested"] };
    manifest.surfaceCleanups.push({ generation: 1, status: "future", opaque: { keep: true } }, null);
    writeFileSync(manifestPath, JSON.stringify(manifest));

    const { calls, transport } = fakeTransport();
    transport.closeTab = async tabId => { calls.push({ op: "closeTab", tabId }); return "already_closed"; };
    const rebuilt = new SubagentRuntime(transport, handlerRegistry());
    await rebuilt.recover("/repo", parentSessionFile);
    const recovered = rebuilt.inspect(task.subagentId);
    expect(recovered).toMatchObject({ generation: 1, status: "failed", error: "primary" });
    expect(cleanupFor(recovered, 1)).toMatchObject({ status: "already_closed", future: { keep: ["nested"] } });
    expect(recovered.surfaceCleanups!.slice(1)).toEqual([{ generation: 1, status: "future", opaque: { keep: true } }, null]);
    const persisted = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(persisted.unknownTop).toEqual(manifest.unknownTop);
    expect(persisted.surfaceCleanups[0].future).toEqual({ keep: ["nested"] });
    expect(calls.filter(value => (value as { op?: string }).op === "closeTab")).toHaveLength(1);

    (recovered.surfaceCleanups![0] as any).future.keep.push("mutated");
    expect((cleanupFor(rebuilt.inspect(task.subagentId), 1) as any).future).toEqual({ keep: ["nested"] });
    await rebuilt.recover("/repo", parentSessionFile);
    expect(calls.filter(value => (value as { op?: string }).op === "closeTab")).toHaveLength(1);
    rebuilt.stop();
  });

  test("retries failed prior generations without changing the resumed generation", async () => {
    const parentSessionFile = join(mkdtempSync(join(tmpdir(), "subagents-cleanup-generations-")), "parent.jsonl");
    const calls: string[] = [];
    let created = 0;
    const transport: HerdrTransport = {
      async createTab() { created++; return { tabId: `tab-${created}`, paneId: `pane-${created}` }; },
      async run() {}, async sendText() {}, async closePane() {}, async paneExists() { return true; },
      async closeTab(tabId) { calls.push(tabId); if (tabId === "tab-1") throw new Error("old close failed"); return "closed"; },
    };
    const runtime = new SubagentRuntime(transport, handlerRegistry());
    const first = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "generations", taskSlug: "task", parentSessionFile });
    writeFileSync(first.sessionFile, "session");
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry task" }));
    await runtime.join(first.subagentId);
    const second = await runtime.resume(first.subagentId, "two");
    writeFileSync(second.resultPath, JSON.stringify({ subagentId: second.subagentId, generation: 2, status: "completed", result: "done" }));
    const completed = await runtime.join(second.subagentId);
    expect(cleanupFor(completed, 1)).toMatchObject({ tabId: "tab-1", status: "failed" });
    expect(cleanupFor(completed, 2)).toMatchObject({ tabId: "tab-2", status: "closed" });
    expect(calls).toEqual(["tab-1", "tab-2"]);
    runtime.stop();

    const recoveryCalls: string[] = [];
    const recovery = fakeTransport().transport;
    recovery.closeTab = async tabId => { recoveryCalls.push(tabId); return "already_closed"; };
    const rebuilt = new SubagentRuntime(recovery, handlerRegistry());
    await rebuilt.recover("/repo", parentSessionFile);
    const recovered = rebuilt.inspect(first.subagentId);
    expect(recovered).toMatchObject({ generation: 2, status: "completed", result: "done" });
    expect(cleanupFor(recovered, 1)).toMatchObject({ tabId: "tab-1", status: "already_closed" });
    expect(cleanupFor(recovered, 2)).toMatchObject({ tabId: "tab-2", status: "closed" });
    expect(recoveryCalls).toEqual(["tab-1"]);
    rebuilt.stop();
  });

  test("classifies never-created and identity-missing terminal generations without a close", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-cleanup-not-created-"));
    const createFailure = fakeTransport();
    createFailure.transport.createTab = async () => { throw new Error("create failed"); };
    const failed = new SubagentRuntime(createFailure.transport, handlerRegistry(), root);
    await expect(failed.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "none", taskSlug: "task" })).rejects.toThrow("create failed");
    expect(cleanupFor(failed.inspect("task"), 1)).toMatchObject({ generation: 1, status: "not_created" });
    expect(createFailure.calls.filter(value => (value as { op?: string }).op === "closeTab")).toHaveLength(0);
    failed.stop();

    const parentSessionFile = join(mkdtempSync(join(tmpdir(), "subagents-cleanup-identity-")), "parent.jsonl");
    const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    const task = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "identity", taskSlug: "task", parentSessionFile });
    original.stop();
    const manifestPath = join(dirname(task.resultPath), "task.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    delete manifest.tabId;
    delete manifest.paneId;
    manifest.status = "failed";
    manifest.error = "lost identity";
    writeFileSync(manifestPath, JSON.stringify(manifest));
    const rebuiltTransport = fakeTransport();
    const rebuilt = new SubagentRuntime(rebuiltTransport.transport, handlerRegistry());
    await rebuilt.recover("/repo", parentSessionFile);
    expect(cleanupFor(rebuilt.inspect(task.subagentId), 1)).toMatchObject({ generation: 1, status: "identity_missing" });
    expect(rebuiltTransport.calls.filter(value => (value as { op?: string }).op === "closeTab")).toHaveLength(0);
    rebuilt.stop();
  });

  test("closes accepted launch failures and active removals by tab, never pane", async () => {
    const launch = fakeTransport();
    launch.transport.run = async () => { throw new Error("run failed"); };
    const failed = new SubagentRuntime(launch.transport, handlerRegistry(), mkdtempSync(join(tmpdir(), "subagents-cleanup-launch-")));
    await expect(failed.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "launch", taskSlug: "task" })).rejects.toThrow("run failed");
    expect(cleanupFor(failed.inspect("task"), 1)).toMatchObject({ status: "closed", tabId: "tab-1" });
    expect(launch.calls.filter(value => (value as { op?: string }).op === "closeTab")).toHaveLength(1);
    expect(launch.calls.filter(value => (value as { op?: string }).op === "closePane")).toHaveLength(0);

    const active = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-cleanup-active-remove-"));
    const runtime = new SubagentRuntime(active.transport, handlerRegistry(), root);
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "remove", taskSlug: "task" });
    writeFileSync(task.sessionFile, "session");
    await runtime.remove(task.subagentId);
    expect(active.calls.filter(value => (value as { op?: string }).op === "closeTab")).toEqual([{ op: "closeTab", tabId: "tab-1" }]);
    expect(active.calls.filter(value => (value as { op?: string }).op === "closePane")).toHaveLength(0);
    expect(existsSync(task.sessionFile)).toBeFalse();
    expect(existsSync(dirname(task.resultPath))).toBeFalse();
  });

  test("blocks removal while actionable cleanup keeps failing, then deletes retained files after retry succeeds", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-cleanup-remove-"));
    const { calls, transport } = fakeTransport();
    let fail = true;
    transport.closeTab = async tabId => { calls.push({ op: "closeTab", tabId }); if (fail) throw new Error("close blocked"); return "closed"; };
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "remove", taskSlug: "task" });
    writeFileSync(task.sessionFile, "session");
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "done" }));
    await runtime.join(task.subagentId);
    await expect(runtime.remove(task.subagentId)).rejects.toThrow("surface_cleanup_failed");
    expect(existsSync(task.sessionFile)).toBeTrue();
    expect(existsSync(dirname(task.resultPath))).toBeTrue();
    expect(cleanupFor(runtime.inspect(task.subagentId), 1)?.status).toBe("failed");

    fail = false;
    await runtime.remove(task.subagentId);
    expect(calls.filter(value => (value as { op?: string }).op === "closeTab")).toHaveLength(3);
    expect(existsSync(task.sessionFile)).toBeFalse();
    expect(existsSync(dirname(task.resultPath))).toBeFalse();
  });

  describe("selects one fail-safe canonical duplicate per generation without rewriting the others", () => {
    const attemptedAt = "2026-01-01T00:00:00.000Z";
    const record = (status: "pending" | "failed" | "closed" | "already_closed", marker: string) => ({
      generation: 1,
      tabId: "tab-1",
      paneId: "pane-1",
      status,
      attemptedAt,
      ...(status === "failed" ? { error: "retry close" } : {}),
      opaque: { marker },
    });
    const cases = [
      { name: "final-pending", entries: [record("closed", "final"), record("pending", "pending")], updatedIndex: 1, closes: 1 },
      { name: "failed-final", entries: [record("failed", "failed"), record("already_closed", "final")], updatedIndex: 0, closes: 1 },
      { name: "pending-failed", entries: [record("pending", "pending"), record("failed", "failed")], updatedIndex: 0, closes: 1 },
      { name: "final-final", entries: [record("closed", "first"), record("already_closed", "second")], updatedIndex: undefined, closes: 0 },
    ] as const;

    // Each independent native-ACL fixture has its own unchanged default test deadline.
    for (const testCase of cases) test(testCase.name, async () => {
      const root = mkdtempSync(join(tmpdir(), `subagents-cleanup-duplicates-${testCase.name}-`));
      const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), root);
      const task = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: testCase.name, taskSlug: "task" });
      writeFileSync(task.sessionFile, "session");
      original.stop();
      const manifestPath = join(dirname(task.resultPath), "task.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      manifest.status = "completed";
      manifest.surfaceCleanups = testCase.entries;
      writeFileSync(manifestPath, JSON.stringify(manifest));
      const untouched = testCase.entries.map(value => JSON.stringify(value));

      const { calls, transport } = fakeTransport();
      const rebuilt = new SubagentRuntime(transport, handlerRegistry(), root);
      await rebuilt.recover("/repo");

      const persisted = JSON.parse(readFileSync(manifestPath, "utf8"));
      expect(calls.filter(value => (value as { op?: string }).op === "closeTab")).toHaveLength(testCase.closes);
      expect(persisted.surfaceCleanups).toHaveLength(2);
      for (let index = 0; index < untouched.length; index++) {
        if (index !== testCase.updatedIndex) expect(JSON.stringify(persisted.surfaceCleanups[index])).toBe(untouched[index]);
      }
      if (testCase.updatedIndex !== undefined) {
        expect(persisted.surfaceCleanups[testCase.updatedIndex]).toMatchObject({ status: "closed", opaque: testCase.entries[testCase.updatedIndex].opaque });
      }
      rebuilt.stop();
    });
  });

  test("validates cleanup timestamps, status identities/errors, and the 160-character diagnostic boundary", async () => {
    const attemptedAt = "2026-01-01T00:00:00.000Z";
    const validIdentity = { generation: 1, tabId: "tab-1", paneId: "pane-1", status: "pending", attemptedAt };
    const cases: Array<{ name: string; record: Record<string, unknown>; valid?: boolean }> = [
      { name: "malformed-timestamp", record: { ...validIdentity, attemptedAt: "not-a-date" } },
      { name: "noncanonical-timestamp", record: { ...validIdentity, attemptedAt: "2026-01-01T00:00:00Z" } },
      { name: "impossible-timestamp", record: { ...validIdentity, attemptedAt: "2026-02-30T00:00:00.000Z" } },
      { name: "blank-tab", record: { ...validIdentity, tabId: " " } },
      { name: "pending-missing-tab", record: { generation: 1, paneId: "pane-1", status: "pending", attemptedAt } },
      { name: "closed-missing-tab", record: { generation: 1, status: "closed", attemptedAt } },
      { name: "already-closed-missing-tab", record: { generation: 1, status: "already_closed", attemptedAt } },
      { name: "failed-missing-tab", record: { generation: 1, status: "failed", attemptedAt, error: "failure" } },
      { name: "failed-missing-error", record: { ...validIdentity, status: "failed" } },
      { name: "failed-empty-error", record: { ...validIdentity, status: "failed", error: "" } },
      { name: "pending-forbidden-error", record: { ...validIdentity, error: "failure" } },
      { name: "closed-forbidden-error", record: { ...validIdentity, status: "closed", error: "failure" } },
      { name: "not-created-forbidden-tab", record: { generation: 1, tabId: "tab-1", status: "not_created", attemptedAt } },
      { name: "not-created-forbidden-pane", record: { generation: 1, paneId: "pane-1", status: "not_created", attemptedAt } },
      { name: "identity-missing-forbidden-tab", record: { generation: 1, tabId: "tab-1", status: "identity_missing", attemptedAt } },
      { name: "diagnostic-160", record: { ...validIdentity, status: "failed", error: "x".repeat(160) }, valid: true },
      { name: "diagnostic-161", record: { ...validIdentity, status: "failed", error: "x".repeat(161) } },
    ];

    for (const testCase of cases) {
      const root = mkdtempSync(join(tmpdir(), `subagents-cleanup-validation-${testCase.name}-`));
      const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), root);
      const task = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: testCase.name, taskSlug: "task" });
      original.stop();
      const manifestPath = join(dirname(task.resultPath), "task.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      manifest.status = "completed";
      manifest.surfaceCleanups = [testCase.record];
      writeFileSync(manifestPath, JSON.stringify(manifest));

      const { transport } = fakeTransport();
      const rebuilt = new SubagentRuntime(transport, handlerRegistry(), root);
      await rebuilt.recover("/repo");
      const persisted = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (testCase.valid) {
        expect(persisted.surfaceCleanups).toHaveLength(1);
        expect(persisted.surfaceCleanups[0]).toMatchObject({ generation: 1, status: "closed" });
      } else {
        expect(persisted.surfaceCleanups).toHaveLength(2);
        expect(persisted.surfaceCleanups[0]).toEqual(testCase.record);
        expect(persisted.surfaceCleanups[1]).toMatchObject({ generation: 1, tabId: task.tabId, paneId: task.paneId, status: "closed" });
      }
      rebuilt.stop();
    }
  }, 30_000); // Windows private source-owner allocation performs native ACL work per case.

  test("normalizes close diagnostics at the exact 160/161-character boundary", async () => {
    for (const length of [160, 161]) {
      const reason = "x".repeat(length);
      const { transport } = fakeTransport();
      transport.closeTab = async () => { throw new Error(reason); };
      const runtime = new SubagentRuntime(transport, handlerRegistry(), mkdtempSync(join(tmpdir(), `subagents-cleanup-diagnostic-${length}-`)));
      const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: String(length), taskSlug: "task" });
      writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "done" }));
      const settled = await runtime.join(task.subagentId);
      expect(cleanupFor(settled, 1)?.error).toBe(length === 160 ? reason : `${reason.slice(0, 157)}...`);
      expect((cleanupFor(settled, 1)?.error as string).length).toBe(160);
      runtime.stop();
    }
  });

  test("blocks duplicate cleanup removal after one failed close and preserves all retained evidence", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-cleanup-duplicate-remove-"));
    const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), root);
    const task = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "duplicate remove", taskSlug: "task" });
    writeFileSync(task.sessionFile, "session");
    original.stop();
    const manifestPath = join(dirname(task.resultPath), "task.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const final = { generation: 1, tabId: task.tabId, paneId: task.paneId, status: "closed", attemptedAt: "2026-01-01T00:00:00.000Z", opaque: { keep: "final" } };
    manifest.status = "completed";
    manifest.surfaceCleanups = [final, { generation: 1, tabId: task.tabId, paneId: task.paneId, status: "failed", attemptedAt: "2026-01-01T00:00:00.000Z", error: "retry", opaque: { keep: "failed" } }];
    writeFileSync(manifestPath, JSON.stringify(manifest));

    let closes = 0;
    const { transport } = fakeTransport();
    transport.closeTab = async () => { closes++; throw new Error("x".repeat(161)); };
    const rebuilt = new SubagentRuntime(transport, handlerRegistry(), root);
    await rebuilt.recover("/repo");
    expect(closes).toBe(1);
    await expect(rebuilt.remove(task.subagentId)).rejects.toThrow("surface_cleanup_failed");
    expect(closes).toBe(2);
    expect(existsSync(task.sessionFile)).toBeTrue();
    expect(existsSync(dirname(task.resultPath))).toBeTrue();
    const retained = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(JSON.stringify(retained.surfaceCleanups[0])).toBe(JSON.stringify(final));
    expect(retained.surfaceCleanups[1]).toMatchObject({ status: "failed", error: `${"x".repeat(157)}...`, opaque: { keep: "failed" } });
    rebuilt.stop();
  });
});


describe("Phase B launch and running-generation overlap", () => {
  const cleanupForGeneration = (task: { surfaceCleanups?: unknown[] }, generation: number) =>
    (task.surfaceCleanups as Array<Record<string, unknown>> | undefined)?.find(value => value?.generation === generation && typeof value.status === "string");

  test("waits for accepted launch ownership before concurrent cancellation", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-cleanup-launch-cancel-"));
    const notifications: CompletionNotification[] = [];
    const { calls, transport } = fakeTransport();
    let admit!: (surface: { tabId: string; paneId: string }) => void;
    transport.createTab = async () => new Promise(resolve => { admit = resolve; });
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
    const spawning = runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "launch cancel", taskSlug: "task" });
    while (!admit) await Bun.sleep(1);
    const cancelling = runtime.cancel("task");
    let cancelled = false;
    void cancelling.then(() => { cancelled = true; });
    await Bun.sleep(5);
    expect(cancelled).toBeFalse();

    admit({ tabId: "accepted-tab", paneId: "accepted-pane" });
    await spawning;
    const task = await cancelling;
    expect(task).toMatchObject({ status: "cancelled", tabId: "accepted-tab", paneId: "accepted-pane" });
    expect(cleanupForGeneration(task, 1)).toMatchObject({ tabId: "accepted-tab", paneId: "accepted-pane", status: "closed" });
    expect(calls.filter(value => (value as { op?: string }).op === "closeTab")).toEqual([{ op: "closeTab", tabId: "accepted-tab" }]);
    expect(calls.filter(value => (value as { op?: string }).op === "closePane")).toHaveLength(0);
    expect(notifications).toEqual([{ subagentId: "task", generation: 1, status: "cancelled", label: "launch cancel" }]);
    runtime.stop();
  });

  test("retries prior-generation cleanup while the current generation remains running", async () => {
    const parentSessionFile = join(mkdtempSync(join(tmpdir(), "subagents-cleanup-running-recovery-")), "parent.jsonl");
    let created = 0;
    const first: HerdrTransport = {
      async createTab() { created++; return { tabId: `tab-${created}`, paneId: `pane-${created}` }; },
      async run() {}, async sendText() {}, async closePane() {}, async paneExists() { return true; },
      async closeTab(tabId) { if (tabId === "tab-1") throw new Error("old close failed"); return "closed"; },
    };
    const runtime = new SubagentRuntime(first, handlerRegistry());
    const generation1 = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "running recovery", taskSlug: "task", parentSessionFile });
    writeFileSync(generation1.sessionFile, "session");
    writeFileSync(generation1.resultPath, JSON.stringify({ subagentId: generation1.subagentId, generation: 1, status: "failed", error: "first" }));
    await runtime.join(generation1.subagentId);
    const generation2 = await runtime.resume(generation1.subagentId, "two");
    expect(generation2.status).toBe("running");
    runtime.stop();

    const calls: string[] = [];
    const recovery = fakeTransport().transport;
    recovery.closeTab = async tabId => { calls.push(tabId); return "already_closed"; };
    const rebuilt = new SubagentRuntime(recovery, handlerRegistry());
    await rebuilt.recover("/repo", parentSessionFile);
    const recovered = rebuilt.inspect(generation1.subagentId);
    expect(recovered).toMatchObject({ generation: 2, status: "running", tabId: "tab-2", paneId: "pane-2" });
    expect(cleanupForGeneration(recovered, 1)).toMatchObject({ tabId: "tab-1", status: "already_closed" });
    expect(cleanupForGeneration(recovered, 2)).toBeUndefined();
    expect(calls).toEqual(["tab-1"]);
    rebuilt.stop();
  });
});


test("coalesces recovery, resume, and remove with an in-flight terminal cleanup", async () => {
  for (const action of ["recover", "resume", "remove"] as const) {
    const parentSessionFile = join(mkdtempSync(join(tmpdir(), `subagents-cleanup-${action}-overlap-`)), "parent.jsonl");
    const { calls, transport } = fakeTransport();
    let closeStarted!: () => void;
    const started = new Promise<void>(resolve => { closeStarted = resolve; });
    let releaseClose!: () => void;
    const release = new Promise<void>(resolve => { releaseClose = resolve; });
    transport.closeTab = async tabId => { calls.push({ op: "closeTab", tabId }); closeStarted(); await release; return "closed"; };
    const runtime = new SubagentRuntime(transport, handlerRegistry());
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: action, taskSlug: "task", parentSessionFile });
    writeFileSync(task.sessionFile, "session");
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "done" }));
    const joined = runtime.join(task.subagentId);
    await started;

    const operation = action === "recover"
      ? runtime.recover("/repo", parentSessionFile)
      : action === "resume"
        ? runtime.resume(task.subagentId, "two")
        : runtime.remove(task.subagentId);
    let finished = false;
    void operation.then(() => { finished = true; });
    await Bun.sleep(5);
    expect(finished).toBeFalse();
    releaseClose();
    await joined;
    const outcome = await operation;

    expect(calls.filter(value => (value as { op?: string }).op === "closeTab")).toHaveLength(1);
    if (action === "recover") {
      expect(runtime.inspect(task.subagentId)).toMatchObject({ generation: 1, status: "completed", result: "done" });
    } else if (action === "resume") {
      expect(outcome).toMatchObject({ generation: 2, status: "running" });
      expect((outcome as any).surfaceCleanups).toEqual([expect.objectContaining({ generation: 1, status: "closed" })]);
    } else {
      expect(existsSync(task.sessionFile)).toBeFalse();
      expect(existsSync(dirname(task.resultPath))).toBeFalse();
    }
    runtime.stop();
  }
});


type FakeModelRegistry = {
  getProvider(provider: string): unknown;
  getProviderAuthStatus(provider: string): { configured?: unknown };
  find(provider: string, modelId: string): { provider: string; id: string } | undefined;
  getAvailable(): readonly { provider: string; id: string }[];
};

function modelRegistry(...models: string[]): FakeModelRegistry {
  const entries = models.map(value => {
    const separator = value.indexOf("/");
    return { provider: value.slice(0, separator), id: value.slice(separator + 1) };
  });
  return {
    getProvider(provider) { return entries.some(entry => entry.provider === provider) ? {} : undefined; },
    getProviderAuthStatus() { return { configured: true }; },
    find(provider, modelId) { return entries.find(entry => entry.provider === provider && entry.id === modelId); },
    getAvailable() { return entries; },
  };
}

function assertEmptySpawnLedger(
  name: string,
  runtime: SubagentRuntime,
  root: string,
  updates: string[],
  notifications: CompletionNotification[],
  transportCalls: unknown[],
) {
  expect(runtime.listTasks(), name).toEqual([]);
  expect(() => runtime.inspect("task"), name).toThrow("Unknown subagent: task");
  expect(updates, name).toEqual([]);
  expect(notifications, name).toEqual([]);
  expect(transportCalls, name).toEqual([]);
  expect(readdirSync(root), name).toEqual([]);
  const internals = runtime as any;
  expect(internals.tasks.size, name).toBe(0);
  expect(internals.monitors.size, name).toBe(0);
  expect(internals.launches.size, name).toBe(0);
  expect(internals.settlements.size, name).toBe(0);
  expect(internals.cleanups.size, name).toBe(0);
}

describe("explicit spawn model validation", () => {
  test("rejects malformed explicit models before slug, agent, filesystem, and transport effects", async () => {
    const { calls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-model-rejection-"));
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
    const updates: string[] = [];
    runtime.onTaskUpdate(() => { updates.push("update"); });

    await expect(runtime.spawn({ agent: "missing", cwd: "/repo", prompt: "work", label: "bad", taskSlug: "!", model: "bad" }, modelRegistry("test/model")))
      .rejects.toMatchObject({ name: "ExplicitSpawnModelError", code: "invalid_model_reference" });
    expect(runtime.listTasks()).toEqual([]);
    expect(updates).toEqual([]);
    expect(calls).toEqual([]);
    expect(readdirSync(root)).toEqual([]);
  });

  test("uses exact first-slash registry order and rejects unavailable snapshots", () => {
    const calls: string[] = [];
    const registry: FakeModelRegistry = {
      getProvider(provider) { calls.push(`provider:${provider}`); return {}; },
      getProviderAuthStatus(provider) { calls.push(`auth:${provider}`); return { configured: true }; },
      find(provider, modelId) { calls.push(`find:${provider}/${modelId}`); return { provider, id: modelId }; },
      getAvailable() { calls.push("available"); return []; },
    };
    let failure: unknown;
    try { validateExplicitSpawnModel("test/family/model", registry); } catch (error) { failure = error; }
    expect(failure).toMatchObject({ code: "model_unavailable" });
    expect(calls).toEqual(["provider:test", "auth:test", "find:test/family/model", "available"]);
  });

  test("emits separate initial model and thinking flags", async () => {
    const { calls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-model-argv-"));
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "task", taskSlug: "task", model: "test/model", thinking: "high" }, modelRegistry("test/model"));
    const launch = calls[1] as { args: string[] };
    const script = readFileSync(launch.args.at(-1)!, "utf8");
    const bootstrapPath = join(root, "tasks", "task-artifacts", "launch-1.cjs");
    const bootstrap = readFileSync(bootstrapPath, "utf8");
    const encoded = bootstrap.match(/Buffer\.from\("([^"]+)"/)?.[1];
    const spec = JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as { args: string[] };
    expect(spec.args).toContain("test/model");
    expect(spec.args).toContain("high");
    expect(spec.args).not.toContain("test/model:high");
    expect(script).toContain(bootstrapPath);
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "done" }));
    await runtime.join(task.subagentId);
  });
});


test("maps typed validation failures to JSON content and details without lifecycle effects", async () => {
  const { calls, transport } = fakeTransport();
  const runtime = new SubagentRuntime(transport, handlerRegistry(), mkdtempSync(join(tmpdir(), "subagents-model-tool-error-")));
  const tool = createSubagentTools(runtime, "/repo").find(value => value.name === "subagent_spawn")!;
  const result = await (tool.execute as any)("call-error", {
    agent: "handler", prompt: "work", label: "bad", taskSlug: "bad-model", model: "missing/model",
  }, undefined, undefined, { modelRegistry: modelRegistry("test/model") });
  expect(result.details).toEqual({ code: "provider_unavailable", detail: 'Provider "missing" is unavailable: unknown provider.' });
  expect(result.content).toEqual([{ type: "text", text: JSON.stringify(result.details) }]);
  expect(runtime.listTasks()).toEqual([]);
  expect(calls).toEqual([]);
});

test("omitted model preserves the default path without registry access", async () => {
  const { transport } = fakeTransport();
  const runtime = new SubagentRuntime(transport, handlerRegistry(), mkdtempSync(join(tmpdir(), "subagents-model-default-")));
  const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "default", taskSlug: "default" });
  expect(task.model).toBeUndefined();
  expect(task.thinking).toBeUndefined();
  runtime.stop();
});


test("covers every present non-string model class and malformed boundary without registry access", () => {
  const registry = modelRegistry("test/model");
  const calls: string[] = [];
  const observed = new Proxy(registry, { get(target, property, receiver) { calls.push(String(property)); return Reflect.get(target, property, receiver); } });
  for (const value of [null, 7, {}, [], true]) {
    expect(() => validateExplicitSpawnModel(value, observed)).toThrow(/Expected an exact provider\/modelId string/);
  }
  const malformed = ["", "/model", "provider/", "provider", "provider: model"];
  for (const value of malformed) {
    expect(() => validateExplicitSpawnModel(value, observed)).toThrow(`Expected an exact provider/modelId reference; received ${JSON.stringify(value)}.`);
  }
  for (const codePoint of [...Array.from({ length: 32 }, (_, index) => index), 0x7f]) {
    const value = `provider/model${String.fromCodePoint(codePoint)}`;
    expect(() => validateExplicitSpawnModel(value, observed)).toThrow(`Expected an exact provider/modelId reference; received ${JSON.stringify(value)}.`);
  }
  let boundaryError: unknown;
  try { validateExplicitSpawnModel(`test/${"x".repeat(253)}`, observed); } catch (error) { boundaryError = error; }
  expect(boundaryError).toMatchObject({ code: "invalid_model_reference" });
  expect(Buffer.byteLength(`p/${"x".repeat(252)}`, "utf8")).toBe(254);
  let unicodeBoundaryError: unknown;
  try { validateExplicitSpawnModel(`p/${"😀".repeat(64)}`, observed); } catch (error) { unicodeBoundaryError = error; }
  expect(unicodeBoundaryError).toMatchObject({ code: "invalid_model_reference" });
  expect(calls).toEqual([]);
});

test("accepts the exact 256-byte reference and rejects the 257-byte reference before registry access", () => {
  const exact = `p/${"x".repeat(254)}`;
  const over = `p/${"x".repeat(255)}`;
  expect(Buffer.byteLength(exact, "utf8")).toBe(256);
  expect(Buffer.byteLength(over, "utf8")).toBe(257);
  const calls: string[] = [];
  const registry: FakeModelRegistry = {
    getProvider(provider) { calls.push(`provider:${provider}`); return {}; },
    getProviderAuthStatus(provider) { calls.push(`auth:${provider}`); return { configured: true }; },
    find(provider, id) { calls.push(`find:${provider}/${id}`); return { provider, id }; },
    getAvailable() { calls.push("available"); return [{ provider: "p", id: "x".repeat(254) }]; },
  };
  expect(validateExplicitSpawnModel(exact, registry)).toBe(exact);
  let overError: unknown;
  try { validateExplicitSpawnModel(over, registry); } catch (error) { overError = error; }
  expect(overError).toMatchObject({ code: "invalid_model_reference" });
  expect(calls).toHaveLength(4);
});

test("classifies every registry failure through spawn with a complete zero-effect ledger", async () => {
  type Fault = { name: string; registry: unknown; operation: string; calls: string[] };
  const faults: Fault[] = [
    { name: "missing registry", registry: undefined, operation: "registry", calls: [] },
    { name: "null registry", registry: null, operation: "registry", calls: [] },
    { name: "primitive registry", registry: 7, operation: "registry", calls: [] },
    { name: "missing provider", registry: {}, operation: "getProvider", calls: [] },
    { name: "non-callable provider", registry: { getProvider: 1 }, operation: "getProvider", calls: [] },
    { name: "provider property throw", registry: Object.defineProperty({}, "getProvider", { get() { throw new Error("secret-provider"); } }), operation: "getProvider", calls: [] },
    { name: "provider call throw", registry: { getProvider() { throw new Error("secret-provider"); } }, operation: "getProvider", calls: ["getProvider"] },
    { name: "missing auth", registry: { getProvider() { return {}; } }, operation: "auth", calls: ["getProvider"] },
    { name: "non-callable auth", registry: { getProvider() { return {}; }, getProviderAuthStatus: 1 }, operation: "auth", calls: ["getProvider"] },
    { name: "auth property throw", registry: Object.defineProperties({ getProvider() { return {}; } }, { getProviderAuthStatus: { get() { throw new Error("secret-auth"); } } }), operation: "auth", calls: ["getProvider"] },
    { name: "auth call throw", registry: { getProvider() { return {}; }, getProviderAuthStatus() { throw new Error("secret-auth"); } }, operation: "auth", calls: ["getProvider", "auth"] },
    { name: "missing find", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; } }, operation: "find", calls: ["getProvider", "auth"] },
    { name: "non-callable find", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find: 1 }, operation: "find", calls: ["getProvider", "auth"] },
    { name: "find property throw", registry: Object.defineProperties({ getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; } }, { find: { get() { throw new Error("secret-find"); } } }), operation: "find", calls: ["getProvider", "auth"] },
    { name: "find call throw", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { throw new Error("secret-find"); } }, operation: "find", calls: ["getProvider", "auth", "find"] },
    { name: "find null return", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return null; } }, operation: "find", calls: ["getProvider", "auth", "find"] },
    { name: "find primitive return", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return 7; } }, operation: "find", calls: ["getProvider", "auth", "find"] },
    { name: "find array return", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return []; } }, operation: "find", calls: ["getProvider", "auth", "find"] },
    { name: "find provider getter throw", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return Object.defineProperty({ id: "model" }, "provider", { get() { throw new Error("secret-find-provider"); } }); } }, operation: "find", calls: ["getProvider", "auth", "find"] },
    { name: "find missing provider", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { id: "model" }; } }, operation: "find", calls: ["getProvider", "auth", "find"] },
    { name: "find missing id", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "test" }; } }, operation: "find", calls: ["getProvider", "auth", "find"] },
    { name: "find result id getter throw", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return Object.defineProperty({ provider: "test" }, "id", { get() { throw new Error("secret-find-id"); } }); } }, operation: "find", calls: ["getProvider", "auth", "find"] },
    { name: "find mismatched provider", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "other", id: "model" }; } }, operation: "find", calls: ["getProvider", "auth", "find"] },
    { name: "find mismatched id", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "test", id: "other" }; } }, operation: "find", calls: ["getProvider", "auth", "find"] },
    { name: "find malformed identity", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "bad/provider", id: "model" }; } }, operation: "find", calls: ["getProvider", "auth", "find"] },
    { name: "missing available", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "test", id: "model" }; } }, operation: "getAvailable", calls: ["getProvider", "auth", "find"] },
    { name: "non-callable available", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "test", id: "model" }; }, getAvailable: 1 }, operation: "getAvailable", calls: ["getProvider", "auth", "find"] },
    { name: "available property throw", registry: Object.defineProperties({ getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "test", id: "model" }; } }, { getAvailable: { get() { throw new Error("secret-available"); } } }), operation: "getAvailable", calls: ["getProvider", "auth", "find"] },
    { name: "available call throw", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "test", id: "model" }; }, getAvailable() { throw new Error("secret-available"); } }, operation: "getAvailable", calls: ["getProvider", "auth", "find", "available"] },
    { name: "available snapshot read throw", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "test", id: "model" }; }, getAvailable() { return { [Symbol.iterator]() { throw new Error("secret-snapshot"); } }; } }, operation: "getAvailable", calls: ["getProvider", "auth", "find", "available"] },
    { name: "available null entry", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "test", id: "model" }; }, getAvailable() { return [null]; } }, operation: "getAvailable", calls: ["getProvider", "auth", "find", "available"] },
    { name: "available malformed entry", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "test", id: "model" }; }, getAvailable() { return [{ provider: "bad/provider", id: "model" }]; } }, operation: "getAvailable", calls: ["getProvider", "auth", "find", "available"] },
    { name: "available entry getter throw", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "test", id: "model" }; }, getAvailable() { return [Object.defineProperty({ id: "model" }, "provider", { get() { throw new Error("secret-entry"); } })]; } }, operation: "getAvailable", calls: ["getProvider", "auth", "find", "available"] },
    { name: "available malformed after match", registry: { getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; }, find() { return { provider: "test", id: "model" }; }, getAvailable() { return [{ provider: "test", id: "model" }, { provider: "test", id: "" }]; } }, operation: "getAvailable", calls: ["getProvider", "auth", "find", "available"] },
  ];

  for (const fault of faults) {
    const { calls: transportCalls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), `subagents-model-registry-${fault.name.replaceAll(" ", "-")}-`));
    const notifications: CompletionNotification[] = [];
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root, notification => { notifications.push(notification); });
    const updates: string[] = [];
    runtime.onTaskUpdate(() => { updates.push("update"); });
    const registryCalls: string[] = [];
    const registry = fault.registry && typeof fault.registry === "object"
      ? new Proxy(fault.registry as object, {
          get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver);
            if (typeof value !== "function") return value;
            return (...args: unknown[]) => {
              registryCalls.push(property === "getProviderAuthStatus" ? "auth" : property === "getAvailable" ? "available" : String(property));
              return value.apply(target, args);
            };
          },
        })
      : fault.registry;

    await expect(runtime.spawn({ agent: "missing", cwd: "/repo", prompt: "work", label: fault.name, taskSlug: "!", model: "test/model" }, registry as any))
      .rejects.toMatchObject({
        name: "ExplicitSpawnModelError",
        code: "model_registry_error",
        operation: fault.operation,
        detail: `Model registry integration failed at ${fault.operation}.`,
      });
    expect(registryCalls, fault.name).toEqual(fault.calls);
    assertEmptySpawnLedger(fault.name, runtime, root, updates, notifications, transportCalls);
    runtime.stop();
  }
});


test("proves every non-registry rejection category has the complete zero-effect ledger", async () => {
  const cases = [
    {
      name: "invalid reference",
      model: "invalid",
      registry: undefined,
      failure: { code: "invalid_model_reference", detail: 'Expected an exact provider/modelId reference; received "invalid".' },
    },
    {
      name: "unknown provider",
      model: "missing/model",
      registry: modelRegistry("test/model"),
      failure: { code: "provider_unavailable", detail: 'Provider "missing" is unavailable: unknown provider.' },
    },
    {
      name: "missing catalog model",
      model: "test/missing",
      registry: {
        getProvider() { return {}; },
        getProviderAuthStatus() { return { configured: true }; },
        find() { return undefined; },
        getAvailable() { throw new Error("available reached"); },
      },
      failure: { code: "model_not_found", detail: 'Model "test/missing" was not found.' },
    },
    {
      name: "unavailable catalog model",
      model: "test/model",
      registry: {
        getProvider() { return {}; },
        getProviderAuthStatus() { return { configured: true }; },
        find() { return { provider: "test", id: "model" }; },
        getAvailable() { return []; },
      },
      failure: { code: "model_unavailable", detail: 'Model "test/model" is unavailable in the current catalog/auth snapshot.' },
    },
  ];

  for (const value of cases) {
    const { calls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), `subagents-model-${value.name.replaceAll(" ", "-")}-`));
    const notifications: CompletionNotification[] = [];
    const runtime = new SubagentRuntime(transport, new AgentRegistry(), root, notification => { notifications.push(notification); });
    const updates: string[] = [];
    runtime.onTaskUpdate(() => { updates.push("update"); });

    await expect(runtime.spawn({ agent: "missing", cwd: "/repo", prompt: "work", label: value.name, taskSlug: "!", model: value.model }, value.registry as any))
      .rejects.toMatchObject({ name: "ExplicitSpawnModelError", ...value.failure });
    assertEmptySpawnLedger(value.name, runtime, root, updates, notifications, calls);
    runtime.stop();
  }
});

test("known unconfigured auth stops before catalog access and has zero spawn effects", async () => {
  const calls: string[] = [];
  const { calls: transportCalls, transport } = fakeTransport();
  const root = mkdtempSync(join(tmpdir(), "subagents-model-unconfigured-"));
  const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
  const registry = {
    getProvider() { calls.push("getProvider"); return {}; },
    getProviderAuthStatus() { calls.push("auth"); return { configured: false }; },
    find() { calls.push("find"); throw new Error("find reached"); },
    getAvailable() { calls.push("available"); throw new Error("available reached"); },
  };
  await expect(runtime.spawn({ agent: "missing", cwd: "/repo", prompt: "work", label: "auth", taskSlug: "!", model: "test/model" }, registry))
    .rejects.toMatchObject({ code: "provider_unavailable", detail: 'Provider "test" is unavailable: authentication is not configured.' });
  expect(calls).toEqual(["getProvider", "auth"]);
  expect(runtime.listTasks()).toEqual([]);
  expect(transportCalls).toEqual([]);
  expect(readdirSync(root)).toEqual([]);
  runtime.stop();
});

test("primitive registries fail closed before catalog or availability access", async () => {
  for (const registry of [undefined, null, 0, false, "not-an-object", Symbol("registry")] as const) {
    const { calls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-model-primitive-"));
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
    await expect(runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "primitive", taskSlug: "task", model: "test/model" }, registry as any))
      .rejects.toMatchObject({ code: "model_registry_error", operation: "registry" });
    expect(runtime.listTasks()).toEqual([]);
    expect(calls).toEqual([]);
    expect(readdirSync(root)).toEqual([]);
    runtime.stop();
  }
});

test("does not cache invocation snapshots and excludes scoped model fixtures", () => {
  let available = true;
  let calls = 0;
  const registry: FakeModelRegistry = {
    getProvider() { return {}; },
    getProviderAuthStatus() { return { configured: true }; },
    find(provider, id) { return { provider, id }; },
    getAvailable() { calls++; return available ? [{ provider: "test", id: "model" }] : []; },
  };
  const scopedModels = [];
  expect(validateExplicitSpawnModel("test/model", { ...registry, getAvailable: registry.getAvailable })).toBe("test/model");
  available = false;
  let unavailableError: unknown;
  try { validateExplicitSpawnModel("test/model", registry); } catch (error) { unavailableError = error; }
  expect(unavailableError).toMatchObject({ code: "model_unavailable" });
  available = true;
  scopedModels.push("other/model");
  expect(validateExplicitSpawnModel("test/model", { ...registry, scopedModels } as any)).toBe("test/model");
  expect(calls).toBe(3);
});

test("covers provider/auth/catalog precedence, exact case, and later slash identity", () => {
  let missingProviderError: unknown;
  try { validateExplicitSpawnModel("missing/model", modelRegistry("test/model")); } catch (error) { missingProviderError = error; }
  expect(missingProviderError).toMatchObject({ code: "provider_unavailable" });
  const unconfigured: FakeModelRegistry = { ...modelRegistry("test/model"), getProviderAuthStatus() { return { configured: false }; } };
  let authError: unknown;
  try { validateExplicitSpawnModel("test/missing", unconfigured); } catch (error) { authError = error; }
  expect(authError).toMatchObject({ code: "provider_unavailable" });
  let caseError: unknown;
  try { validateExplicitSpawnModel("test/MODEL", modelRegistry("test/model")); } catch (error) { caseError = error; }
  expect(caseError).toMatchObject({ code: "model_not_found" });
  expect(validateExplicitSpawnModel("test/family/model", modelRegistry("test/family/model"))).toBe("test/family/model");
  expect(validateExplicitSpawnModel("提供者/模型/版本", modelRegistry("提供者/模型/版本"))).toBe("提供者/模型/版本");
});

test("invalid model dominates invalid slug and missing Agent with a complete zero-effect ledger", async () => {
  const { calls, transport } = fakeTransport();
  const root = mkdtempSync(join(tmpdir(), "subagents-model-precedence-"));
  const runtime = new SubagentRuntime(transport, new AgentRegistry(), root);
  const updates: string[] = [];
  runtime.onTaskUpdate(() => updates.push("update"));
  await expect(runtime.spawn({ agent: "missing", cwd: "/repo", prompt: "work", label: "bad", taskSlug: "!", model: null }, modelRegistry("test/model")))
    .rejects.toMatchObject({ code: "invalid_model_reference", detail: 'Expected an exact provider/modelId string; received type "null".' });
  expect(runtime.listTasks()).toEqual([]);
  expect(updates).toEqual([]);
  expect(calls).toEqual([]);
  expect(readdirSync(root)).toEqual([]);
});

test("maps missing fifth context and optional registry through the same typed adapter contract", async () => {
  const runtime = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), mkdtempSync(join(tmpdir(), "subagents-model-context-")));
  const tool = createSubagentTools(runtime, "/repo").find(value => value.name === "subagent_spawn")!;
  for (const context of [undefined, {}, { modelRegistry: null }]) {
    const result = await (tool.execute as any)("call-context", { agent: "handler", prompt: "work", label: "context", taskSlug: "context", model: "test/model" }, undefined, undefined, context);
    expect(result.details).toEqual({ code: "model_registry_error", detail: "Model registry integration failed at registry.", operation: "registry" });
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify(result.details) }]);
  }
  expect(runtime.listTasks()).toEqual([]);
});

test("passes empty and invalid thinking unchanged while model-less thinking emits no flags", async () => {
  const cases = [
    { slug: "thinking-empty", model: "test/model", thinking: "", expected: ["--model", "test/model"] },
    { slug: "thinking-invalid", model: "test/model", thinking: "not-a-level", expected: ["--model", "test/model", "--thinking", "not-a-level"] },
    { slug: "thinking-without-model", model: undefined, thinking: "high", expected: [] },
  ];
  for (const value of cases) {
    const { calls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), `subagents-${value.slug}-`));
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: value.slug, taskSlug: value.slug, model: value.model, thinking: value.thinking }, value.model === undefined ? undefined : modelRegistry(value.model));
    const bootstrap = readFileSync(join(root, "tasks", `${value.slug}-artifacts`, "launch-1.cjs"), "utf8");
    const encoded = bootstrap.match(/Buffer.from\("([^"]+)"/)?.[1];
    const spec = JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as { args: string[] };
    const index = spec.args.indexOf("--model");
    const actual = index < 0 ? [] : spec.args.slice(index, index + (value.thinking ? 4 : 2));
    expect(actual).toEqual(value.expected);
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "done" }));
    await runtime.join(task.subagentId);
  }
});

test("resume preserves the persisted generation-2 combined argv", async () => {
  const parentSessionFile = join(mkdtempSync(join(tmpdir(), "subagents-resume-model-")), "parent.jsonl");
  const first = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "resume-model", taskSlug: "resume-model", parentSessionFile, model: "test/family/model", thinking: "high" }, modelRegistry("test/family/model"));
  writeFileSync(first.sessionFile, "");
  writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry" }));
  const firstRuntime = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
  await firstRuntime.recover("/repo", parentSessionFile);
  const resumed = await firstRuntime.resume(first.subagentId, "two");
  const bootstrap = readFileSync(join(dirname(resumed.resultPath), "launch-2.cjs"), "utf8");
  const encoded = bootstrap.match(/Buffer.from\("([^"]+)"/)?.[1];
  const spec = JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as { args: string[] };
  const modelIndex = spec.args.indexOf("--model");
  expect(spec.args.slice(1)).toEqual([
    "--session", first.sessionFile, "-e", paneChildExtensionPath, "--system-prompt", "Handler",
    "--exclude-tools", childToolExclusions, "--model", "test/family/model:high",
    "two\n\nWhen subagent_done is available, submit the complete final result text in the caller/Agent-required format once as its result argument. Do not output the full result separately before or after successful submission. If unavailable, return that text as your final assistant response; this alone does not record successful runtime completion. If submission fails, correct and retry or report the failure.",
  ]);
  expect(spec.args).not.toContain("--tools");
  expect(spec.args.slice(modelIndex, modelIndex + 2)).toEqual(["--model", "test/family/model:high"]);
  expect(spec.args).not.toContain("--thinking");
  writeFileSync(resumed.resultPath, JSON.stringify({ subagentId: resumed.subagentId, generation: 2, status: "completed", result: "done" }));
  await firstRuntime.join(resumed.subagentId);
});


test("clamps a valid but unsupported thinking level at the upstream capability boundary", async () => {
  const { clampThinkingLevel } = await import("@earendil-works/pi-ai/compat");
  const model = { id: "model", provider: "test", reasoning: true, thinkingLevelMap: { minimal: null, low: "low", medium: null, high: null, xhigh: null, max: null } } as any;
  expect(clampThinkingLevel(model, "max")).toBe("low");
  expect(clampThinkingLevel(model, "high")).toBe("low");
  expect(clampThinkingLevel(model, "low")).toBe("low");
});
test("Pi 0.84.2 parser warns and leaves invalid thinking unset", async () => {
  const { parseArgs } = await import("@earendil-works/pi-coding-agent");
  const parsed = parseArgs(["--model", "test/model", "--thinking", "not-a-level"]);
  expect(parsed.thinking).toBeUndefined();
  expect(parsed.diagnostics).toContainEqual({ type: "warning", message: expect.stringContaining("Invalid thinking level") });
});


describe("I-VALIDATE image admission", () => {
  const fixtures: ReturnType<typeof fixture>[] = [];
  const png: ImageContent = {
    type: "image", mimeType: "image/png",
    data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  };
  const svg: ImageContent = {
    type: "image", mimeType: "image/svg+xml",
    data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>').toString("base64"),
  };
  const input = { agent: "handler", cwd: "/repo", prompt: "work", label: "images", taskSlug: "task" };
  const probeError = new Error("internal image snapshot observed");

  function fixture(): {
    calls: unknown[]; root: string; runtime: SubagentRuntime; updates: string[]; notifications: CompletionNotification[];
  } {
    const { calls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-image-admission-"));
    const updates: string[] = [];
    const notifications: CompletionNotification[] = [];
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
    runtime.onTaskUpdate(() => { updates.push("update"); });
    const f = { calls, root, runtime, updates, notifications };
    fixtures.push(f);
    return f;
  }

  afterEach(() => {
    for (const f of fixtures.splice(0)) {
      f.runtime.stop();
      rmSync(f.root, { recursive: true, force: true });
    }
  });

  async function terminal(f: ReturnType<typeof fixture>) {
    const task = await f.runtime.spawn(input);
    writeFileSync(task.sessionFile, "retained session bytes\n");
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "done" }));
    await f.runtime.join(task.subagentId);
    f.calls.length = 0;
    f.updates.length = 0;
    f.notifications.length = 0;
    return task;
  }

  function observeSnapshot(runtime: SubagentRuntime) {
    const snapshots: Array<ImageContent[] | undefined> = [];
    // Observe the real launch boundary after admission/guards; fake transport is separate.
    runtime["start"] = async input => { snapshots.push(input.images); throw probeError; };
    return snapshots;
  }

  function invalidInputs(): unknown[] {
    const fault = () => { throw new Error("SECRET image bytes /private/image-path"); };
    const revoked = Proxy.revocable([], {});
    revoked.revoke();
    return [
      null, false, 1, "SECRET", {}, { length: 0 }, new Uint8Array([1]), revoked.proxy,
      new Array(1), Object.assign(new Array(2), { 0: png }), [undefined], [null], [false], [1], ["SECRET"], [[]], [{}],
      [{ ...png, type: "text" }], [{ ...png, type: undefined }],
      ...[undefined, null, 1, {}, "", " ", "AQ", "AR==", "TWF=", "A===", "=AAA", "AAAA=", "AA=A", "AA-_", "AQ==\n", "/private/image.png", "https://image.invalid/p.png", "data:image/png;base64,AQ=="].map(data => [{ ...png, data }]),
      ...[undefined, null, 1, "", "image/", "image/*", "text/plain", " image/png", "image/png\n", "image/png\r", "image/png; charset=utf-8", "image/png/extra"].map(mimeType => [{ ...png, mimeType }]),
      ...["type", "data", "mimeType"].map(field => [Object.defineProperty({ ...png }, field, { get: fault })]),
      new Proxy([png], { get(_target, key, receiver) { if (key === "length") return fault(); return Reflect.get(_target, key, receiver); } }),
      new Proxy([png], { get(_target, key, receiver) { if (key === "0") return fault(); return Reflect.get(_target, key, receiver); } }),
      new Proxy([png], { getOwnPropertyDescriptor: fault }),
      [png, { ...svg, data: "invalid" }],
    ];
  }

  test("omitted, undefined and empty images retain runtime and tool text launches", async () => {
    for (const toolCall of [false, true]) {
      for (const supplied of [{}, { images: undefined }, { images: [] }]) {
        const f = fixture();
        const tools = createSubagentTools(f.runtime, input.cwd);
        const task: SubagentTask = toolCall
          ? (await (tools[0]!.execute as any)("spawn", { ...input, ...supplied })).details
          : await f.runtime.spawn({ ...input, ...supplied });
        expect(task).toMatchObject({ generation: 1, status: "running" });
        expect(task).not.toHaveProperty("images");
        if (toolCall) expect(task).not.toHaveProperty("resultPath");
        // The fake provider publishes through its owned runtime state, not a model-facing Result ref.
        writeFileSync(f.runtime.inspect(task.subagentId).resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "done" }));
        await f.runtime.join(task.subagentId);
        const resumed: SubagentTask = toolCall
          ? (await (tools[1]!.execute as any)("resume", { subagentId: task.subagentId, prompt: "again", ...supplied })).details
          : await f.runtime.resume(task.subagentId, "again", supplied.images);
        expect(resumed).toMatchObject({ generation: 2, sessionFile: task.sessionFile, status: "running" });
        expect(resumed).not.toHaveProperty("images");
        if (toolCall) expect(resumed).not.toHaveProperty("resultPath");
        expect(readdirSync(dirname(f.runtime.inspect(resumed.subagentId).resultPath)).sort()).toEqual(["launch-1.cjs", "launch-1.ps1", "launch-2.cjs", "launch-2.ps1", "result-1.json", "task.json"]);
        const launches = f.calls.filter(call => (call as any).op === "create") as Array<{ input: { env: Record<string, string> } }>;
        expect(launches).toHaveLength(2);
        for (const launch of launches) expect(Object.keys(launch.input.env).sort()).toEqual(["PI_HERDR_SUBAGENT_GENERATION", "PI_HERDR_SUBAGENT_ID", "PI_HERDR_SUBAGENT_RESULT_PATH"]);
      }
    }
  }, 30_000); // Windows private source-owner allocation performs native ACL work per case.

  test("invalid direct and bypassed-tool spawn inputs leave the complete admission ledger unchanged", async () => {
    const f = fixture();
    const tool = createSubagentTools(f.runtime, input.cwd)[0]!;
    const before = snapshotSpawnState(f.runtime, f.root);
    for (const images of invalidInputs()) {
      for (const call of [() => f.runtime.spawn({ ...input, images } as any), () => (tool.execute as any)("spawn", { ...input, images })]) {
        const error = await call().catch((value: unknown) => value);
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/^Invalid images input(?: at index \d+)?\.$/);
        expect((error as Error).cause).toBeUndefined();
        expect(snapshotSpawnState(f.runtime, f.root)).toEqual(before);
        assertEmptySpawnLedger("invalid images", f.runtime, f.root, f.updates, f.notifications, f.calls);
      }
    }
  });

  test("invalid direct and bypassed-tool resume inputs preserve generation, manifest, session and Result bytes", async () => {
    const f = fixture();
    const task = await terminal(f);
    const tool = createSubagentTools(f.runtime, input.cwd)[1]!;
    const before = snapshotSpawnState(f.runtime, f.root);
    for (const images of invalidInputs()) {
      await expect(f.runtime.resume(task.subagentId, "again", images as any)).rejects.toThrow(/^Invalid images input/);
      await expect((tool.execute as any)("resume", { subagentId: task.subagentId, prompt: "again", images })).rejects.toThrow(/^Invalid images input/);
      expect(snapshotSpawnState(f.runtime, f.root)).toEqual(before);
      expect(f.calls).toEqual([]);
      expect(f.updates).toEqual([]);
      expect(f.notifications).toEqual([]);
    }
  });

  test("inaccessible images properties are safe and model errors precede any image access", async () => {
    const f = fixture();
    const task = await terminal(f);
    const tools = createSubagentTools(f.runtime, input.cwd);
    let reads = 0;
    const throwing = { ...input, subagentId: task.subagentId, get images(): ImageContent[] { reads++; throw new Error("SECRET /private/image-path"); } };
    const before = snapshotSpawnState(f.runtime, f.root);
    await expect(f.runtime.spawn(throwing)).rejects.toThrow("Invalid images input.");
    await expect((tools[0]!.execute as any)("spawn", throwing)).rejects.toThrow("Invalid images input.");
    await expect((tools[1]!.execute as any)("resume", throwing)).rejects.toThrow("Invalid images input.");
    expect(reads).toBe(3);
    const invalidModel = Object.create(throwing);
    invalidModel.model = "invalid";
    invalidModel.agent = "missing";
    invalidModel.taskSlug = "!";
    await expect(f.runtime.spawn(invalidModel)).rejects.toMatchObject({ code: "invalid_model_reference" });
    const result = await (tools[0]!.execute as any)("spawn", invalidModel);
    expect(result.details.code).toBe("invalid_model_reference");
    expect(reads).toBe(3);
    expect(snapshotSpawnState(f.runtime, f.root)).toEqual(before);
    expect(f.calls).toEqual([]);
    expect(f.updates).toEqual([]);
    expect(f.notifications).toEqual([]);
  });

  test("single and multiple spawn images reach the private seam as distinct ordered field snapshots", async () => {
    for (const toolCall of [false, true]) {
      for (const images of [[{ ...png }], [{ ...png }, { ...svg }]]) {
        const f = fixture();
        const snapshots = observeSnapshot(f.runtime);
        const expected = structuredClone(images);
        const registry = modelRegistry("test/model");
        const tool = createSubagentTools(f.runtime, input.cwd)[0]!;
        const pending = toolCall
          ? (tool.execute as any)("spawn", { ...input, images, model: "test/model" }, undefined, undefined, { modelRegistry: registry })
          : f.runtime.spawn({ ...input, images, model: "test/model" }, registry);
        expect(snapshots).toEqual([expected]); // The launch receives the synchronous snapshot.
        images[0]!.data = "caller mutation";
        images[0]!.mimeType = "text/plain";
        images.reverse();
        images.push({ ...png });
        await expect(pending).rejects.toBe(probeError);
        expect(snapshots).toEqual([expected]);
        expect(snapshots[0]).not.toBe(images);
        expect(f.runtime.listTasks()).toEqual([]);
        expect(f.calls).toEqual([]);
      }
    }
  });

  test("resume snapshots precede awaited operations and preserve fresh single/multiple tool inputs", async () => {
    for (const toolCall of [false, true]) {
      for (const images of [[{ ...svg }], [{ ...svg }, { ...png }]]) {
        const f = fixture();
        const task = await terminal(f);
        const before = snapshotSpawnState(f.runtime, f.root);
        const snapshots = observeSnapshot(f.runtime);
        const gate = Promise.withResolvers<void>();
        f.runtime["awaitTaskOperations"] = () => gate.promise;
        const expected = structuredClone(images);
        const pending = toolCall
          ? (createSubagentTools(f.runtime, input.cwd)[1]!.execute as any)("resume", { subagentId: task.subagentId, prompt: "again", images })
          : f.runtime.resume(task.subagentId, "again", images);
        expect(snapshots).toEqual([]);
        images[0]!.type = "text" as any;
        images[0]!.data = "caller mutation";
        images.reverse();
        images.splice(0);
        gate.resolve();
        await expect(pending).rejects.toBe(probeError);
        expect(snapshots).toEqual([expected]);
        expect(snapshotSpawnState(f.runtime, f.root)).toEqual(before);
        expect(f.calls).toEqual([]);
        expect(f.updates).toEqual([]);
        expect(f.notifications).toEqual([]);
      }
    }
  });

  test("resume carries the admitted snapshot through recovery re-entry", async () => {
    const f = fixture();
    const task = await terminal(f);
    const before = snapshotSpawnState(f.runtime, f.root);
    const snapshots = observeSnapshot(f.runtime);
    const gate = Promise.withResolvers<void>();
    let operations = 0;
    f.runtime["awaitTaskOperations"] = async () => {
      if (++operations === 1) f.runtime["recovery"] = gate.promise;
    };
    const images = [{ ...png }, { ...svg }];
    const expected = structuredClone(images);
    const pending = f.runtime.resume(task.subagentId, "again", images);
    await Promise.resolve();
    images[0]!.mimeType = "text/plain";
    images.splice(0);
    f.runtime["recovery"] = undefined;
    gate.resolve();
    await expect(pending).rejects.toBe(probeError);
    expect(operations).toBe(2);
    expect(snapshots).toEqual([expected]);
    expect(snapshotSpawnState(f.runtime, f.root)).toEqual(before);
  });

  test("model rejection and image snapshot happen before an outstanding spawn recovery wait", async () => {
    const f = fixture();
    const gate = Promise.withResolvers<void>();
    f.runtime["recovery"] = gate.promise;
    const images = [{ ...png }, { ...svg }];
    const snapshots = observeSnapshot(f.runtime);
    await expect(f.runtime.spawn({ ...input, model: null, images } as any)).rejects.toMatchObject({ code: "invalid_model_reference" });
    expect(snapshots).toEqual([]);
    const expected = structuredClone(images);
    const pending = f.runtime.spawn({ ...input, images });
    images.splice(0);
    expect(snapshots).toEqual([]);
    f.runtime["recovery"] = undefined;
    gate.resolve();
    await expect(pending).rejects.toBe(probeError);
    expect(snapshots).toEqual([expected]);
    expect(f.calls).toEqual([]);
  });

  test("production nonempty requests publish images and select the owned SDK child launch", async () => {
    const f = fixture();
    const task = await f.runtime.spawn({ ...input, images: [png, svg] });
    const envelope = JSON.parse(readFileSync(join(dirname(task.resultPath), "image-input-1", "envelope.json"), "utf8"));
    expect(envelope.images).toEqual([png, svg]);
    const bootstrap = readFileSync(join(dirname(task.resultPath), "launch-1.cjs"), "utf8");
    const encoded = bootstrap.match(/Buffer\.from\("([^"]+)"/)![1]!;
    const spec = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    expect(spec.args[0]).toBe("-e");
    expect(spec.args[1]).toContain("runPaneImageChild");
    expect(spec.args).toContain("--session");
    expect(spec.args).toContain(paneChildExtensionPath);
    expect(bootstrap).not.toContain(png.data);
    writeFileSync(task.sessionFile, "retained session bytes\n");
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "done" }));
    await f.runtime.join(task.subagentId);
    const resumed = await f.runtime.resume(task.subagentId, "again", [svg]);
    expect(resumed).toMatchObject({ generation: 2, sessionFile: task.sessionFile });
    expect(JSON.parse(readFileSync(join(dirname(task.resultPath), "image-input-2", "envelope.json"), "utf8")).images).toEqual([svg]);
  });

  test("resume retains unknown/active/overlap guards before the private image seam and never reads a registry", async () => {
    const f = fixture();
    await expect(f.runtime.resume("unknown", "again", [png])).rejects.toThrow("Unknown subagent");
    const task = await f.runtime.spawn(input);
    f.runtime.stop();
    const snapshots = observeSnapshot(f.runtime);
    await expect(f.runtime.resume(task.subagentId, "again", [png])).rejects.toThrow("Cannot resume an active subagent");
    expect(snapshots).toEqual([]);
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "done" }));
    await f.runtime.join(task.subagentId);
    f.runtime["launches"].set(`${task.subagentId}:2`, Promise.resolve());
    await expect(f.runtime.resume(task.subagentId, "again", [png])).rejects.toThrow("Cannot resume an active subagent");
    expect(snapshots).toEqual([]);
    f.runtime["launches"].clear();
    Object.defineProperty(f.runtime, "registry", { get() { throw new Error("Registry must not be read"); } });
    await expect(f.runtime.resume(task.subagentId, "again", [svg])).rejects.toBe(probeError);
    expect(snapshots).toEqual([[svg]]);
  });

  test("registered schemas expose optional upstream image shape while runtime survives schema mutation", async () => {
    const f = fixture();
    const tools = createSubagentTools(f.runtime, input.cwd);
    for (const tool of tools.slice(0, 2)) {
      const schema = tool.parameters as any;
      expect(schema.required).not.toContain("images");
      expect(schema.properties.images).toMatchObject({
        type: "array", items: { type: "object", required: ["type", "data", "mimeType"], properties: {
          type: { const: "image" }, data: { type: "string", minLength: 1 }, mimeType: { type: "string", minLength: 1 },
        } },
      });
      delete schema.properties.images;
    }
    await expect((tools[0]!.execute as any)("spawn", { ...input, images: null })).rejects.toThrow("Invalid images input.");
    const task = await terminal(f);
    const before = snapshotSpawnState(f.runtime, f.root);
    await expect((tools[1]!.execute as any)("resume", { subagentId: task.subagentId, prompt: "again", images: null })).rejects.toThrow("Invalid images input.");
    expect(snapshotSpawnState(f.runtime, f.root)).toEqual(before);
  });
});

describe("I-TRANSPORT private publication and binding", () => {
  const images: ImageContent[] = [
    { type: "image", data: Buffer.from("first private image bytes").toString("base64"), mimeType: "image/png" },
    { type: "image", data: Buffer.from("second private image bytes").toString("base64"), mimeType: "image/jpeg" },
  ];
  const input = { agent: "handler", cwd: "/repo", prompt: "designated text", label: "transport", taskSlug: "task" };
  const fixtures: ReturnType<typeof fixture>[] = [];
  const spies: Array<{ mockRestore(): void }> = [];
  const fault = new Error(`SECRET ${images[0]!.data} /private/image-input-1/envelope.json`);

  function watch<T extends { mockRestore(): void }>(spy: T): T { spies.push(spy); return spy; }
  function fixture(): {
    root: string; notifications: CompletionNotification[]; updates: SubagentTask[][];
    calls: unknown[]; transport: HerdrTransport; runtime: SubagentRuntime; pending: Promise<unknown>[];
  } {
    const root = mkdtempSync(join(tmpdir(), "subagents-image-transport-"));
    const notifications: CompletionNotification[] = [];
    const updates: SubagentTask[][] = [];
    const { calls, transport } = fakeTransport();
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
    runtime.onTaskUpdate(() => { updates.push(runtime.listTasks().map(task => runtime.inspect(task.subagentId))); });
    const f = { root, notifications, updates, calls, transport, runtime, pending: [] as Promise<unknown>[] };
    fixtures.push(f);
    return f;
  }
  function track<T>(f: ReturnType<typeof fixture>, operation: Promise<T>): Promise<T> {
    f.pending.push(operation);
    return operation;
  }
  async function dispose(f: ReturnType<typeof fixture>): Promise<void> {
    // stop() aborts monitors, not a test body or a launch awaiting transport.
    f.runtime.stop();
    const foreground = await Promise.allSettled(f.pending.splice(0));
    f.runtime.stop(); // A drained body may have started another generation's monitor.
    const background = await Promise.allSettled([
      ...f.runtime["launches"].values(), ...f.runtime["settlements"].values(), ...f.runtime["cleanups"].values(),
    ]);
    f.runtime.stop();
    rmSync(f.root, { recursive: true, force: true });
    const errors = [...foreground, ...background].flatMap(value => value.status === "rejected" ? [value.reason] : []);
    if (errors.length) throw new AggregateError(errors, "Fixture operations failed.");
  }
  function scopeTask(f: ReturnType<typeof fixture>, subagentId = "task", generation = 1) {
    const scope = join(f.root, "tasks");
    const artifactDir = join(scope, `${subagentId}-artifacts`);
    mkdirSync(artifactDir, { recursive: true });
    f.runtime["selectScope"](scope);
    return { subagentId, generation, resultPath: join(artifactDir, `result-${generation}.json`) };
  }
  function directory(task: { resultPath: string; generation: number }) {
    return join(dirname(task.resultPath), `image-input-${task.generation}`);
  }
  function payload(task: { resultPath: string; generation: number }) { return join(directory(task), "envelope.json"); }
  function envelope(task: { resultPath: string; generation: number }) { return JSON.parse(readFileSync(payload(task), "utf8")); }
  function assertPrivatePublicText(value: unknown, tasks: Array<{ resultPath: string; generation: number }> = []) {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    for (const image of images) expect(text).not.toContain(image.data);
    for (const task of tasks) {
      expect(text).not.toContain(directory(task));
      expect(text).not.toContain(payload(task));
      expect(text).not.toContain(directory(task).replaceAll("\\", "\\\\"));
    }
    expect(text).not.toContain("envelope.json");
    expect(text).not.toContain("envelope.tmp");
    expect(text).not.toContain("SECRET");
  }
  function inspectLaunch(f: ReturnType<typeof fixture>, task: SubagentTask) {
    const bootstrapPath = join(dirname(task.resultPath), `launch-${task.generation}.cjs`);
    const script = readFileSync(join(dirname(task.resultPath), `launch-${task.generation}.ps1`), "utf8");
    const bootstrap = readFileSync(bootstrapPath, "utf8");
    const encoded = bootstrap.match(/Buffer\.from\("([^"]+)"/)![1]!;
    const spec = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as { args: string[] };
    for (const value of [f.calls, script, bootstrap, spec, task, f.runtime.inspect(task.subagentId), f.runtime.listTasks(), f.updates, f.notifications]) {
      assertPrivatePublicText(value, [task]);
    }
    expect(spec.args.at(-1)).toStartWith(input.prompt);
    return spec.args;
  }
  async function complete(f: ReturnType<typeof fixture>, task: SubagentTask) {
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: task.generation, status: "completed", result: "safe result" }));
    await f.runtime.join(task.subagentId);
  }
  function independentRead(task: ReturnType<typeof scopeTask>) {
    // A separate local process observes only the public filename. Safe output contains no bytes/path.
    const result = spawnSync("node", ["-e", 'const fs = require("node:fs"); const path = fs.readFileSync(0, "utf8"); if (!fs.existsSync(path)) process.stdout.write("absent"); else { const e = JSON.parse(fs.readFileSync(path, "utf8")); process.stdout.write(JSON.stringify({version:e.version,subagentId:e.subagentId,generation:e.generation,count:e.images.length})); }'], {
      input: payload(task), encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    return result.stdout;
  }
  afterEach(async () => {
    const outcomes = await Promise.allSettled(fixtures.splice(0).map(dispose));
    for (const spy of spies.splice(0).reverse()) spy.mockRestore();
    const errors = outcomes.flatMap(value => value.status === "rejected" ? [value.reason] : []);
    if (errors.length) throw new AggregateError(errors, "Fixture teardown failed.");
  });

  test("atomic publication hides partial writes and retains the first ordered snapshot through launch", async () => {
    const f = fixture();
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const originalOpen = fsPromises.open;
    watch(spyOn(fsPromises, "open").mockImplementation(async (...args: Parameters<typeof fsPromises.open>) => {
      const file = await originalOpen(...args);
      const write = file.writeFile.bind(file);
      watch(spyOn(file, "writeFile").mockImplementation(async data => {
        const text = String(data);
        const half = Math.floor(text.length / 2);
        await write(text.slice(0, half), "utf8");
        started.resolve();
        await release.promise;
        await write(text.slice(half), "utf8");
      }));
      return file;
    }));
    const supplied = structuredClone(images);
    const pending = f.runtime.spawn({ ...input, images: supplied });
    await started.promise;
    const task = { subagentId: "task", generation: 1, resultPath: join(f.root, "tasks", "task-artifacts", "result-1.json") };
    expect(independentRead(task)).toBe("absent");
    expect(existsSync(join(directory(task), "envelope.tmp"))).toBeTrue();
    expect(f.calls).toEqual([]); // No child surface before complete publication.
    supplied[0]!.data = "mutated";
    supplied.reverse();
    supplied.splice(0);
    release.resolve();
    const launched = await pending;
    expect(independentRead(task)).toBe(JSON.stringify({ version: 1, subagentId: "task", generation: 1, count: 2 }));
    expect(envelope(launched)).toEqual({ version: 1, subagentId: "task", generation: 1, images });
    expect(readdirSync(directory(task))).toEqual(["envelope.json"]);
    inspectLaunch(f, launched);
  });

  test("fixture teardown drains a pending launch and its resumed body before deleting storage", async () => {
    const f = fixture();
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const create = f.transport.createTab.bind(f.transport);
    f.transport.createTab = async value => {
      entered.resolve();
      await release.promise;
      return create(value);
    };
    const pending = track(f, (async () => {
      const first = await f.runtime.spawn({ ...input, images });
      await complete(f, first);
      const next = await f.runtime.resume(first.subagentId, input.prompt, images);
      await complete(f, next);
      expect(existsSync(directory(first))).toBeFalse();
      expect(existsSync(directory(next))).toBeFalse();
      return f.runtime.inspect(next.subagentId);
    })());
    await entered.promise;
    const disposing = dispose(f);
    const settled = Promise.all([pending, disposing]);
    try {
      await Promise.resolve();
      expect(existsSync(f.root)).toBeTrue();
      expect(f.runtime["launches"].size).toBe(1);
      expect(f.calls).toEqual([]);
    } finally {
      release.resolve();
      await settled;
    }
    expect(await pending).toMatchObject({ status: "completed", error: undefined });
    expect(existsSync(f.root)).toBeFalse();
    for (const key of ["launches", "settlements", "cleanups", "monitors", "pendingSettlements"] as const) {
      expect(f.runtime[key].size).toBe(0);
    }
    expect(f.notifications).toHaveLength(2);
  });

  test("fixture teardown reports an outstanding operation rejection rather than swallowing it", async () => {
    const f = fixture();
    const release = Promise.withResolvers<void>();
    track(f, release.promise);
    const disposing = dispose(f);
    release.reject(fault);
    await expect(disposing).rejects.toMatchObject({ message: "Fixture operations failed.", errors: [fault] });
    expect(existsSync(f.root)).toBeFalse();
  });

  test("concurrent tasks and fresh resumed generations bind independent complete envelopes", async () => {
    const f = fixture();
    await track(f, (async () => {
      const launchEnvelopes: unknown[] = [];
      const createTab = f.transport.createTab.bind(f.transport);
      f.transport.createTab = async value => {
        expect(value.env!.PI_HERDR_SUBAGENT_IMAGE_INPUT).toBe("1");
        const task = { resultPath: value.env!.PI_HERDR_SUBAGENT_RESULT_PATH!, generation: Number(value.env!.PI_HERDR_SUBAGENT_GENERATION) };
        const observed = envelope(task);
        expect(observed.subagentId).toBe(value.env!.PI_HERDR_SUBAGENT_ID);
        expect(observed.generation).toBe(task.generation);
        launchEnvelopes.push(observed);
        return createTab(value);
      };
      const first = await Promise.all(["alpha", "bravo"].map((taskSlug, index) => f.runtime.spawn({ ...input, taskSlug, images: [images[index]!] })));
      for (const task of first) await complete(f, task);
      const next = await Promise.all(first.map((task, index) => f.runtime.resume(task.subagentId, input.prompt, [images[1 - index]!])));
      expect(new Set([...first, ...next].map(payload)).size).toBe(4);
      for (let index = 0; index < first.length; index++) {
        expect(envelope(next[index]!)).toEqual({ version: 1, subagentId: first[index]!.subagentId, generation: 2, images: [images[1 - index]!] });
        expect(existsSync(directory(first[index]!))).toBeFalse(); // Terminal leftovers belong to I-CLEANUP.
        expect(next[index]!.sessionFile).toBe(first[index]!.sessionFile);
      }
      expect(launchEnvelopes).toHaveLength(4);
      for (const task of next) inspectLaunch(f, task);
      assertPrivatePublicText(f.notifications, [...first, ...next]);
    })());
  }, process.platform === "win32" ? 10_000 : undefined); // Seven native ACL launches measured 5.23s; allow Windows scheduling headroom.

  test("omitted and empty launches do no image I/O or expectation, even with an old envelope", async () => {
    const f = fixture();
    const old = scopeTask(f);
    mkdirSync(directory(old));
    writeFileSync(payload(old), "must not be read");
    const publish = watch(spyOn(f.runtime as any, "publishImageInput"));
    const open = watch(spyOn(fsPromises, "open").mockRejectedValue(fault));
    const tools = createSubagentTools(f.runtime, input.cwd);
    const spawned = await (tools[0]!.execute as any)("spawn", input);
    expect(spawned.details).not.toHaveProperty("resultPath");
    const first = f.runtime.inspect(spawned.details.subagentId);
    await complete(f, first);
    const pendingGeneration = { ...first, generation: 2 };
    mkdirSync(directory(pendingGeneration));
    writeFileSync(payload(pendingGeneration), "must not be read on text resume");
    const read = fs.readFileSync;
    const imageReads = watch(spyOn(fs, "readFileSync").mockImplementation(((path: fs.PathOrFileDescriptor, options: any) => {
      if (String(path).endsWith("envelope.json")) throw fault;
      return read(path, options);
    }) as typeof fs.readFileSync));
    const resumed = await (tools[1]!.execute as any)("resume", { subagentId: first.subagentId, prompt: input.prompt, images: [] });
    expect(resumed.details).not.toHaveProperty("resultPath");
    const next = f.runtime.inspect(resumed.details.subagentId);
    expect(publish).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    imageReads.mockRestore();
    expect(readFileSync(payload(old), "utf8")).toBe("must not be read");
    expect(readFileSync(payload(next), "utf8")).toBe("must not be read on text resume");
    const creates = f.calls.filter(value => (value as any).op === "create") as Array<{ input: { env: Record<string, string> } }>;
    for (const call of creates) expect(call.input.env).not.toHaveProperty("PI_HERDR_SUBAGENT_IMAGE_INPUT");
  });

  test("real host access controls keep the directory and envelope private", async () => {
    const f = fixture();
    const task = scopeTask(f);
    const publication = await f.runtime["publishImageInput"](task, images);
    if (process.platform === "win32") {
      const script = [
        "$ErrorActionPreference = 'Stop'",
        `$path = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(directory(task)).toString("base64")}'))`,
        "$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value",
        "[void][Reflection.Assembly]::LoadWithPartialName('System.Web.Extensions')",
        "$rows = @()",
        "foreach ($acl in @([IO.Directory]::GetAccessControl($path), [IO.File]::GetAccessControl($path + '\\envelope.json'))) {",
        "  $rules = @()",
        "  foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {",
        "    $rules += @{ sid = $rule.IdentityReference.Value; rights = [string]$rule.FileSystemRights; type = [string]$rule.AccessControlType; inherited = $rule.IsInherited }",
        "  }",
        "  $rows += @{ owner = $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value; protected = $acl.AreAccessRulesProtected; rules = @($rules) }",
        "}",
        "[Console]::Out.Write([Web.Script.Serialization.JavaScriptSerializer]::new().Serialize(@{ sid = $sid; rows = @($rows) }))",
        "",
      ].join("\n");
      const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "Invoke-Expression ([Console]::In.ReadToEnd())"], { input: script, encoding: "utf8" });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      const actual = JSON.parse(result.stdout);
      expect(actual.rows).toHaveLength(2);
      expect(actual.rows[0].protected).toBeTrue();
      for (const row of actual.rows) {
        expect(row.owner).toBe(actual.sid);
        expect(row.rules).toHaveLength(1);
        expect(row.rules[0]).toMatchObject({ sid: actual.sid, rights: "FullControl", type: "Allow" });
      }
      expect(actual.rows[0].rules[0].inherited).toBeFalse();
      expect(actual.rows[1].rules[0].inherited).toBeTrue();
    } else {
      expect(fs.lstatSync(directory(task)).mode & 0o777).toBe(0o700);
      expect(fs.lstatSync(payload(task)).mode & 0o777).toBe(0o600);
      expect(fs.lstatSync(payload(task)).uid).toBe(process.getuid!());
    }
    publication.check();
    publication.cleanup();
    expect(existsSync(directory(task))).toBeFalse();
    publication.cleanup(); // Already absent is safe for this owning publication.
  });

  test("storage rejects cross-task/generation paths, invalid identities and ancestor redirects", async () => {
    const f = fixture();
    const task = scopeTask(f);
    for (const changed of [
      { ...task, subagentId: "../outside" }, { ...task, generation: 0 }, { ...task, generation: 1.5 },
      { ...task, subagentId: "other" }, { ...task, generation: 2 },
      { ...task, resultPath: join(f.root, "result-1.json") },
    ]) {
      await expect(f.runtime["publishImageInput"](changed, images)).rejects.toThrow("Image input failed at storage.");
    }
    for (const level of ["scope-parent", "scope", "task", "generation"]) {
      const item = fixture();
      const owned = scopeTask(item);
      const outside = fixture().root;
      writeFileSync(join(outside, "sentinel"), "untouched");
      const target = level === "scope-parent" ? item.root : level === "scope" ? join(item.root, "tasks") : level === "task" ? dirname(owned.resultPath) : directory(owned);
      rmSync(target, { recursive: true, force: true });
      fs.symlinkSync(outside, target, process.platform === "win32" ? "junction" : "dir");
      const error = await item.runtime["publishImageInput"](owned, images).catch(value => value);
      expect(error).toBeInstanceOf(Error);
      assertPrivatePublicText(String(error));
      expect(readdirSync(outside)).toEqual(["sentinel"]);
      rmSync(target, { force: true });
      mkdirSync(item.root, { recursive: true });
    }
  });

  test("existing generation storage is never adopted, overwritten, or removed", async () => {
    const f = fixture();
    const task = scopeTask(f);
    mkdirSync(directory(task));
    writeFileSync(payload(task), "foreign generation payload");
    await expect(f.runtime["publishImageInput"](task, images)).rejects.toThrow("Image input failed at create.");
    expect(readFileSync(payload(task), "utf8")).toBe("foreign generation payload");
  });

  test("create, write, publish and post-rename faults clean only their owned files with safe stage errors", async () => {
    for (const stage of ["directory", "open", "write", "rename", "after-rename"]) {
      const f = fixture();
      const task = scopeTask(f);
      const durable = join(dirname(task.resultPath), "keep.json");
      writeFileSync(durable, "durable");
      if (stage === "directory") {
        const mkdir = fs.mkdirSync;
        watch(spyOn(fs, "mkdirSync").mockImplementation(((path: fs.PathLike, options: fs.MakeDirectoryOptions) => {
          if (String(path) === directory(task)) throw fault;
          return mkdir(path, options);
        }) as typeof fs.mkdirSync));
      } else if (stage === "open" || stage === "write") {
        const open = fsPromises.open;
        watch(spyOn(fsPromises, "open").mockImplementation(async (...args: Parameters<typeof fsPromises.open>) => {
          if (stage === "open") throw fault;
          const file = await open(...args);
          watch(spyOn(file, "writeFile").mockRejectedValue(fault));
          return file;
        }));
      } else {
        const rename = fs.renameSync;
        watch(spyOn(fs, "renameSync").mockImplementation((from, to) => {
          if (stage === "after-rename") rename(from, to);
          throw fault;
        }));
      }
      const error = await f.runtime["publishImageInput"](task, images).catch(value => value);
      expect(error.message).toBe(`Image input failed at ${stage === "write" ? "write" : stage.includes("rename") ? "publish" : "create"}.`);
      expect(error.cause).toBeUndefined();
      assertPrivatePublicText(String(error), [task]);
      expect(existsSync(directory(task))).toBeFalse();
      expect(readFileSync(durable, "utf8")).toBe("durable");
      for (const spy of spies.splice(0).reverse()) spy.mockRestore();
    }
  });

  test("permission setup failure is explicit and leaves no payload", async () => {
    if (process.platform !== "win32") return; // Windows fault; POSIX permissions are asserted in the host check.
    const f = fixture();
    const task = scopeTask(f);
    const native = watch(spyOn(childProcess, "spawnSync"));
    for (const status of [1, 0]) {
      native.mockReturnValue({ status, stdout: "", stderr: fault.message } as any);
      await expect(f.runtime["publishImageInput"](task, images)).rejects.toThrow("Image input failed at access.");
      expect(existsSync(directory(task))).toBeFalse();
    }
  });

  test("create-surface, bootstrap-write and run failures clean published envelopes and redact public errors", async () => {
    for (const stage of ["surface", "bootstrap", "run"]) {
      const f = fixture();
      if (stage === "surface") f.transport.createTab = async () => { throw fault; };
      if (stage === "run") f.transport.run = async () => { throw fault; };
      if (stage === "bootstrap") {
        const write = fsPromises.writeFile;
        watch(spyOn(fsPromises, "writeFile").mockImplementation((async (...args: Parameters<typeof fsPromises.writeFile>) => {
          if (String(args[0]).endsWith(".cjs")) throw fault;
          return write(...args);
        }) as typeof fsPromises.writeFile));
      }
      const tools = createSubagentTools(f.runtime, input.cwd);
      await expect((tools[0]!.execute as any)("spawn", { ...input, images })).rejects.toThrow("Image input failed at launch.");
      const task = f.runtime.inspect("task");
      expect(task.status).toBe("failed");
      expect(existsSync(directory(task))).toBeFalse();
      expect(f.notifications).toHaveLength(1);
      const publicTool = await (tools[2]!.execute as any)("inspect", { subagentId: "task" });
      const joined = await (tools[3]!.execute as any)("join", { subagentId: "task" });
      assertPrivatePublicText([task, publicTool, joined, f.notifications, f.updates, JSON.parse(readFileSync(join(dirname(task.resultPath), "task.json"), "utf8"))], [task]);
      if (stage === "run") {
        assertPrivatePublicText(readFileSync(join(dirname(task.resultPath), "launch-1.cjs"), "utf8"), [task]);
        expect(f.calls).toContainEqual({ op: "closeTab", tabId: "tab-1" });
      }
      for (const spy of spies.splice(0).reverse()) spy.mockRestore();
    }
  }, 30_000); // Native Windows ACL work is real, even with a fake transport.

  test("cleanup deletion failure keeps the safe primary launch error and its separate diagnostic", async () => {
    const f = fixture();
    f.transport.run = async () => { throw fault; };
    const remove = fs.rmSync;
    watch(spyOn(fs, "rmSync").mockImplementation((path, options) => {
      if (String(path).endsWith("envelope.json")) throw fault;
      return remove(path, options);
    }));
    const error = await f.runtime.spawn({ ...input, images }).catch(value => value);
    expect(error.message).toBe("Image input failed at launch. Image input cleanup failed.");
    expect(error.cause).toBeUndefined();
    const task = f.runtime.inspect("task");
    expect(existsSync(payload(task))).toBeTrue();
    expect(envelope(task).images).toEqual(images);
    expect(task.error).toContain(error.message);
    assertPrivatePublicText([String(error), task, f.notifications], [task]);
  });

  test("a redirected directory between publication and launch is refused and cleanup never follows it", async () => {
    const f = fixture();
    const outside = fixture().root;
    writeFileSync(join(outside, "envelope.json"), "foreign payload");
    let moved = "";
    const create = f.transport.createTab.bind(f.transport);
    f.transport.createTab = async value => {
      const task = { resultPath: value.env!.PI_HERDR_SUBAGENT_RESULT_PATH!, generation: 1 };
      moved = `${directory(task)}-held`;
      fs.renameSync(directory(task), moved);
      fs.symlinkSync(outside, directory(task), process.platform === "win32" ? "junction" : "dir");
      return create(value);
    };
    await expect(f.runtime.spawn({ ...input, images })).rejects.toThrow("Image input failed at launch. Image input cleanup failed.");
    expect(f.calls.some(value => (value as any).op === "run")).toBeFalse();
    expect(readFileSync(join(outside, "envelope.json"), "utf8")).toBe("foreign payload");
    expect(readFileSync(join(moved, "envelope.json"), "utf8")).toContain(images[0]!.data);
    rmSync(join(dirname(moved), "image-input-1"), { force: true });
  });

  for (const ancestor of ["task", "scope"] as const) {
    for (const retry of ["join", "recover"] as const) {
      test(`post-publication ${ancestor} redirection retains bounded ${retry} settlement and cleanup intent`, async () => {
        const f = fixture();
        const outside = fixture().root;
        const artifactDir = join(f.root, "tasks", "task-artifacts");
        const target = ancestor === "task" ? artifactDir : dirname(artifactDir);
        const held = `${target}-held`;
        const externalArtifact = ancestor === "task" ? outside : join(outside, "task-artifacts");
        mkdirSync(externalArtifact, { recursive: true });
        writeFileSync(join(externalArtifact, "sentinel"), "untouched");
        // An external Result must not replace the original safe failure or cause effects.
        const externalResult = JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "FOREIGN_RESULT" });
        writeFileSync(join(externalArtifact, "result-1.json"), externalResult);
        let redirected = false;
        let heldPayload = "";
        let heldManifest = "";
        let queuedBytes = "";
        let payloadBytes = "";
        const create = f.transport.createTab.bind(f.transport);
        f.transport.createTab = async value => {
          const task = { resultPath: value.env!.PI_HERDR_SUBAGENT_RESULT_PATH!, generation: 1 };
          payloadBytes = readFileSync(payload(task), "utf8"); // Publication is complete before this boundary.
          queuedBytes = readFileSync(join(artifactDir, "task.json"), "utf8");
          fs.renameSync(target, held);
          const heldArtifact = ancestor === "task" ? held : join(held, "task-artifacts");
          heldPayload = join(heldArtifact, "image-input-1", "envelope.json");
          heldManifest = join(heldArtifact, "task.json");
          fs.symlinkSync(outside, target, process.platform === "win32" ? "junction" : "dir");
          redirected = true;
          return create(value); // Accepted identities must survive the check immediately after this.
        };
        const assertExternalUnchanged = () => {
          expect(readdirSync(externalArtifact).sort()).toEqual(["result-1.json", "sentinel"]);
          expect(readFileSync(join(externalArtifact, "result-1.json"), "utf8")).toBe(externalResult);
          expect(readFileSync(join(externalArtifact, "sentinel"), "utf8")).toBe("untouched");
          if (ancestor === "scope") expect(readdirSync(outside)).toEqual(["task-artifacts"]);
        };
        const close = f.transport.closeTab.bind(f.transport);
        f.transport.closeTab = async id => {
          const durable = JSON.parse(readFileSync(join(artifactDir, "task.json"), "utf8"));
          expect(durable).toMatchObject({ generation: 1, status: "failed", error: "ImageInputError: Image input failed at storage. Image input cleanup failed.",
            surfaceCleanups: [{ generation: 1, tabId: "tab-1", paneId: "pane-1", status: "pending" }] });
          return close(id);
        };
        try {
          const error = await f.runtime.spawn({ ...input, images }).catch(value => value);
          assertExternalUnchanged();
          expect(error.message).toBe("ImageInputError: Image input failed at storage. Image input cleanup failed.; terminal persistence failed.");
          expect(error.cause?.message).toBe("Image input failed at storage. Image input cleanup failed.");
          const task = f.runtime.inspect("task");
          expect(task).toMatchObject({ generation: 1, status: "failed", tabId: "tab-1", paneId: "pane-1", error: String(error.cause) });
          expect(task.result).toBeUndefined();
          expect(f.runtime["pendingSettlements"].size).toBe(1);
          expect(f.runtime["imageCleanups"].has("task:1")).toBeTrue();
          expect(f.runtime["launches"].size).toBe(0);
          expect(f.runtime["monitors"].size).toBe(0);
          expect(readFileSync(heldPayload, "utf8")).toBe(payloadBytes);
          expect(readFileSync(heldManifest, "utf8")).toBe(queuedBytes);
          // Each public operation retries at most once and rejects while storage is untrusted.
          const retrySpy = watch(spyOn(f.runtime as any, "retrySettlement"));
          for (const operation of [() => f.runtime.join("task"), () => f.runtime.resume("task", "retry"), () => f.runtime.remove("task"), () => f.runtime.recover(input.cwd)]) {
            retrySpy.mockClear();
            await expect(operation()).rejects.toThrow("Image input failed at storage.");
            expect(retrySpy).toHaveBeenCalledTimes(1);
            expect(f.runtime["pendingSettlements"].size).toBe(1);
            expect(f.runtime.inspect("task")).toMatchObject({ generation: 1, tabId: "tab-1", error: String(error.cause) });
            expect(f.notifications).toEqual([]);
            expect(f.calls).toHaveLength(1); // Accepted create only; no run, close, or pane verification.
            assertExternalUnchanged();
          }
          rmSync(target, { force: true });
          fs.renameSync(held, target);
          redirected = false;
          if (retry === "recover") await f.runtime.recover(input.cwd);
          const settled = await f.runtime.join("task");
          expect(settled).toMatchObject({ generation: 1, status: "failed", tabId: "tab-1", paneId: "pane-1", error: String(error.cause), surfaceCleanups: [{ generation: 1, status: "closed", tabId: "tab-1" }] });
          expect(f.runtime["pendingSettlements"].size).toBe(0);
          expect(existsSync(directory(settled))).toBeFalse();
          expect(existsSync(settled.resultPath)).toBeFalse(); // No synthetic Result.
          expect(f.calls).toEqual([f.calls[0], { op: "closeTab", tabId: "tab-1" }]);
          expect(f.notifications).toHaveLength(1);
          assertPrivatePublicText([String(error), settled, f.notifications], [settled]);
          expect(JSON.stringify([settled, f.notifications])).not.toContain("FOREIGN_RESULT");
          await f.runtime.join("task");
          expect(f.calls).toHaveLength(2);
          expect(f.notifications).toHaveLength(1);
          assertExternalUnchanged();
        } finally {
          if (redirected) { rmSync(target, { force: true }); fs.renameSync(held, target); }
        }
      });
    }
  }

  for (const ancestor of ["task", "scope"] as const) {
    for (const operation of ["join", "cancel", "recover", "bootstrap"] as const) {
      test(`running Result storage refuses ${ancestor} redirection during ${operation} and recovers safely`, async () => {
        const f = fixture();
        const task = await f.runtime.spawn({ ...input, images });
        f.runtime.stop();
        const target = ancestor === "task" ? dirname(task.resultPath) : dirname(dirname(task.resultPath));
        const held = `${target}-held`;
        const outside = fixture().root;
        const externalArtifact = ancestor === "task" ? outside : join(outside, "task-artifacts");
        mkdirSync(externalArtifact, { recursive: true });
        writeFileSync(join(externalArtifact, "sentinel"), "untouched");
        const externalResult = join(externalArtifact, "result-1.json");
        if (operation === "join" || operation === "recover") {
          writeFileSync(externalResult, JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "FOREIGN_RESULT" }));
          writeFileSync(join(externalArtifact, "task.json"), readFileSync(join(dirname(task.resultPath), "task.json")));
        }
        const externalBefore = readdirSync(externalArtifact).sort().map(name => [name, readFileSync(join(externalArtifact, name), "utf8")]);
        const manifestBefore = readFileSync(join(dirname(task.resultPath), "task.json"), "utf8");
        let redirected = true;
        fs.renameSync(target, held);
        fs.symlinkSync(outside, target, process.platform === "win32" ? "junction" : "dir");
        try {
          if (operation === "bootstrap") {
            const heldArtifact = ancestor === "task" ? held : join(held, "task-artifacts");
            const generated = readFileSync(join(heldArtifact, "launch-1.cjs"), "utf8");
            const encoded = generated.match(/Buffer\.from\("([^"]+)"/)![1]!;
            const spec = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
            spec.command = "herdr-nonexistent-image-bootstrap-command";
            const runnable = join(f.root, "fallback.cjs");
            writeFileSync(runnable, generated.replace(encoded, Buffer.from(JSON.stringify(spec)).toString("base64")));
            const child = spawnSync(process.execPath, [runnable], { env: { ...process.env,
              PI_HERDR_SUBAGENT_IMAGE_INPUT: "1", PI_HERDR_SUBAGENT_RESULT_PATH: task.resultPath,
              PI_HERDR_SUBAGENT_ID: task.subagentId, PI_HERDR_SUBAGENT_GENERATION: "1",
            }, encoding: "utf8", timeout: 10000 });
            expect(child.status).toBe(1);
            expect(`${child.stdout}${child.stderr}`).not.toContain(images[0]!.data);
          } else {
            await expect(operation === "join" ? f.runtime.join("task")
              : operation === "cancel" ? f.runtime.cancel("task") : f.runtime.recover(input.cwd)).rejects.toThrow();
          }
          expect(readdirSync(externalArtifact).sort().map(name => [name, readFileSync(join(externalArtifact, name), "utf8")])).toEqual(externalBefore);
          expect(f.runtime.inspect("task")).toMatchObject({ status: "running", generation: 1 });
          expect(f.runtime.inspect("task").result).toBeUndefined();
          expect(JSON.stringify(f.updates)).not.toContain("FOREIGN_RESULT");
          expect(f.notifications).toEqual([]);
          expect(f.calls.filter(value => (value as any).op === "closeTab")).toEqual([]);
          rmSync(target, { force: true }); fs.renameSync(held, target); redirected = false;
          expect(readFileSync(join(dirname(task.resultPath), "task.json"), "utf8")).toBe(manifestBefore);
          if (operation !== "cancel") writeFileSync(task.resultPath, JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "OWNED_RESULT" }));
          const settled = await f.runtime.join("task");
          expect(settled).toMatchObject(operation === "cancel" ? { status: "cancelled", result: undefined } : { status: "completed", result: "OWNED_RESULT" });
          expect(JSON.stringify([settled, f.notifications])).not.toContain("FOREIGN_RESULT");
          expect(f.notifications).toHaveLength(1);
          expect(f.calls.filter(value => (value as any).op === "closeTab")).toHaveLength(1);
          expect(existsSync(directory(task))).toBeFalse();
        } finally {
          if (redirected) { rmSync(target, { force: true }); fs.renameSync(held, target); }
        }
      }, 30_000);
    }
  }

  test("spawn refuses a redirected scope before filesystem task reservation", async () => {
    const f = fixture();
    const outside = fixture().root;
    writeFileSync(join(outside, "sentinel"), "untouched");
    fs.symlinkSync(outside, join(f.root, "tasks"), process.platform === "win32" ? "junction" : "dir");
    await expect(f.runtime.spawn({ ...input, images })).rejects.toThrow("Image input failed at storage.");
    expect(f.calls).toEqual([]);
    expect(f.runtime.listTasks()).toEqual([]);
    expect(readdirSync(outside)).toEqual(["sentinel"]);
    rmSync(join(f.root, "tasks"), { force: true });
  });

  test("failed resume cleans only its new generation and preserves previous artifacts", async () => {
    const f = fixture();
    const first = await f.runtime.spawn({ ...input, images: [images[0]!] });
    writeFileSync(first.sessionFile, "retained session");
    await complete(f, first);
    expect(existsSync(directory(first))).toBeFalse();
    const firstResult = readFileSync(first.resultPath, "utf8");
    f.transport.run = async () => { throw fault; };
    await expect(f.runtime.resume(first.subagentId, input.prompt, [images[1]!])).rejects.toThrow("Image input failed at launch.");
    const second = f.runtime.inspect(first.subagentId);
    expect(second).toMatchObject({ generation: 2, status: "failed", sessionFile: first.sessionFile });
    expect(existsSync(directory(second))).toBeFalse();
    expect(existsSync(directory(first))).toBeFalse();
    expect(readFileSync(first.resultPath, "utf8")).toBe(firstResult);
    expect(readFileSync(first.sessionFile, "utf8")).toBe("retained session");
    assertPrivatePublicText([second, f.notifications], [first, second]);
  });

  test("regular directory and file replacements are refused by filesystem identity", async () => {
    for (const replacement of ["directory", "file"]) {
      const f = fixture();
      let foreign = "";
      const create = f.transport.createTab.bind(f.transport);
      f.transport.createTab = async value => {
        const task = { resultPath: value.env!.PI_HERDR_SUBAGENT_RESULT_PATH!, generation: 1 };
        const target = replacement === "directory" ? directory(task) : payload(task);
        fs.renameSync(target, `${target}-held`);
        if (replacement === "directory") mkdirSync(target);
        foreign = payload(task);
        writeFileSync(foreign, "foreign replacement");
        return create(value);
      };
      await expect(f.runtime.spawn({ ...input, images })).rejects.toThrow("Image input failed at launch. Image input cleanup failed.");
      expect(f.calls.some(value => (value as any).op === "run")).toBeFalse();
      expect(readFileSync(foreign, "utf8")).toBe("foreign replacement");
    }
  });

  test("hardlink redirection is refused before launch and leaves the foreign link untouched", async () => {
    const f = fixture();
    const outside = fixture().root;
    const create = f.transport.createTab.bind(f.transport);
    f.transport.createTab = async value => {
      const task = { resultPath: value.env!.PI_HERDR_SUBAGENT_RESULT_PATH!, generation: 1 };
      fs.linkSync(payload(task), join(outside, "linked"));
      return create(value);
    };
    await expect(f.runtime.spawn({ ...input, images })).rejects.toThrow("Image input failed at launch. Image input cleanup failed.");
    expect(f.calls.some(value => (value as any).op === "run")).toBeFalse();
    expect(fs.lstatSync(join(outside, "linked")).nlink).toBe(2);
  });

  test("complete Herdr argv, launch scripts, prompt and tool outputs contain only a non-payload expectation", async () => {
    const f = fixture();
    const herdrArgs: string[][] = [];
    const client = createHerdrClient(async (_command, args) => {
      herdrArgs.push([...args]);
      return { code: 0, stderr: "", stdout: JSON.stringify({ result: { root_pane: { pane_id: "wF:p6" }, tab: { tab_id: "wF:t5", workspace_id: "wF" } } }) };
    });
    const actual = createHerdrTransport(client, { workspaceId: "wF" });
    f.transport.createTab = actual.createTab;
    f.transport.run = actual.run;
    const tools = createSubagentTools(f.runtime, input.cwd);
    const spawned = await (tools[0]!.execute as any)("spawn", { ...input, images, model: "test/model", thinking: "high" }, undefined, undefined, { modelRegistry: modelRegistry("test/model") });
    expect(spawned.details).not.toHaveProperty("resultPath");
    const task = f.runtime.inspect(spawned.details.subagentId);
    const args = inspectLaunch(f, task);
    expect(args).toContain("test/model");
    expect(args.slice(args.indexOf("--model"), -1)).toEqual(["--model", "test/model", "--thinking", "high"]);
    expect(herdrArgs[0]).toContain("PI_HERDR_SUBAGENT_IMAGE_INPUT=1");
    assertPrivatePublicText([herdrArgs, spawned], [task]);
    const rendered = (tools[0] as any).renderCall({ ...input, images }).render(120);
    assertPrivatePublicText(rendered, [task]);
    await complete(f, task);
    const joined = await (tools[3]!.execute as any)("join", { subagentId: task.subagentId });
    assertPrivatePublicText([joined, f.notifications, readFileSync(task.resultPath, "utf8")], [task]);
    const resumed = await (tools[1]!.execute as any)("resume", { subagentId: task.subagentId, prompt: input.prompt, images: [images[1]!] });
    expect(resumed.details).not.toHaveProperty("resultPath");
    const resumedTask = f.runtime.inspect(resumed.details.subagentId);
    const resumedArgs = inspectLaunch(f, resumedTask);
    expect(resumedArgs.slice(resumedArgs.indexOf("--model"), -1)).toEqual(["--model", "test/model:high"]);
    assertPrivatePublicText([herdrArgs, resumed], [task, resumedTask]);
  });
});

describe("I-CLEANUP generation lifecycle", () => {
  const images: ImageContent[] = [{ type: "image", data: "AQ==", mimeType: "image/png" }];
  const input = { agent: "handler", cwd: "/repo", prompt: "initial", label: "cleanup", taskSlug: "task", images };
  const fixtures: ReturnType<typeof fixture>[] = [];
  const spies: Array<{ mockRestore(): void }> = [];
  function fixture(): { root: string; calls: unknown[]; transport: HerdrTransport; notifications: CompletionNotification[]; runtime: SubagentRuntime } {
    const root = mkdtempSync(join(tmpdir(), "subagents-image-cleanup-"));
    const { calls, transport } = fakeTransport();
    const notifications: CompletionNotification[] = [];
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root, value => { notifications.push(value); });
    const f = { root, calls, transport, notifications, runtime };
    fixtures.push(f);
    return f;
  }
  const directory = (task: Pick<SubagentTask, "resultPath" | "generation">) => join(dirname(task.resultPath), `image-input-${task.generation}`);
  const payload = (task: Pick<SubagentTask, "resultPath" | "generation">) => join(directory(task), "envelope.json");
  function result(task: SubagentTask, status: "completed" | "failed" | "cancelled" = "completed") {
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: task.generation, status,
      ...(status === "completed" ? { result: "authoritative" } : status === "failed" ? { error: "image_input_failed:read" } : {}) }));
  }
  afterEach(() => {
    for (const spy of spies.splice(0).reverse()) spy.mockRestore();
    for (const f of fixtures.splice(0)) { f.runtime.stop(); rmSync(f.root, { recursive: true, force: true }); }
  });

  test("settle and cancel clean exactly their generation, preserve Results and unrelated active tasks", async () => {
    for (const status of ["completed", "failed", "cancelled"] as const) {
      const f = fixture();
      const [task, other] = await Promise.all([f.runtime.spawn(input), f.runtime.spawn({ ...input, taskSlug: "other" })]);
      const otherBytes = readFileSync(payload(other));
      writeFileSync(task.sessionFile, "session retained");
      if (status === "cancelled") await Promise.all([f.runtime.cancel(task.subagentId), f.runtime.cancel(task.subagentId)]);
      else { result(task, status); await Promise.all([f.runtime.join(task.subagentId), f.runtime.join(task.subagentId)]); }
      const bytes = readFileSync(task.resultPath);
      expect(existsSync(directory(task))).toBeFalse();
      expect(readFileSync(payload(other))).toEqual(otherBytes);
      expect(f.runtime.inspect(other.subagentId).status).toBe("running");
      expect(f.notifications).toHaveLength(1);
      expect(f.notifications[0]!.status).toBe(status);
      expect(readFileSync(task.sessionFile, "utf8")).toBe("session retained");
      for (const name of ["task.json", "launch-1.cjs", "launch-1.ps1"]) expect(existsSync(join(dirname(task.resultPath), name))).toBeTrue();
      await f.runtime.recover(input.cwd);
      expect(readFileSync(task.resultPath)).toEqual(bytes);
      expect(readFileSync(payload(other))).toEqual(otherBytes);
    }
  }, 60_000);

  test("successive image and text resumes isolate each fresh payload and reject stale cleanup callbacks", async () => {
    const f = fixture();
    let task = await f.runtime.spawn(input);
    writeFileSync(task.sessionFile, "native retained history");
    for (const generation of [1, 2, 3]) {
      expect(task.generation).toBe(generation);
      const oldTask = f.runtime["get"](task.subagentId);
      result(task);
      await f.runtime.join(task.subagentId);
      const resultBytes = readFileSync(task.resultPath);
      expect(existsSync(directory(task))).toBeFalse();
      const next = await f.runtime.resume(task.subagentId, "new initial", generation === 3 ? [] : images);
      expect(f.runtime["cleanupImageInputs"](oldTask)).toBeFalse();
      if (generation < 3) expect(existsSync(payload(next))).toBeTrue();
      else expect(existsSync(directory(next))).toBeFalse();
      expect(readFileSync(task.resultPath)).toEqual(resultBytes);
      expect(next.sessionFile).toBe(task.sessionFile);
      task = next;
    }
    await f.runtime.remove(task.subagentId);
    expect(existsSync(task.sessionFile)).toBeFalse();
    expect(existsSync(dirname(task.resultPath))).toBeFalse();
  }, 60_000);

  test("restart retains live input and cleans classified terminal/interrupted orphans without replay", async () => {
    for (const scenario of ["live", "queued", "lost", "terminal", "completed", "failed", "cancelled", "stale", "malformed"]) {
      const f = fixture();
      const task = await f.runtime.spawn(input);
      f.runtime.stop();
      const original = readFileSync(payload(task));
      const manifestPath = join(dirname(task.resultPath), "task.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      manifest.opaque = { keep: [1, null] };
      if (scenario === "queued") { manifest.status = "queued"; delete manifest.startedAt; }
      if (scenario === "terminal") { manifest.status = "failed"; manifest.error = "primary"; }
      writeFileSync(manifestPath, JSON.stringify(manifest));
      if (["completed", "failed", "cancelled"].includes(scenario)) result(task, scenario as "completed" | "failed" | "cancelled");
      if (scenario === "stale") writeFileSync(task.resultPath, JSON.stringify({ subagentId: "other", generation: 1, status: "completed", result: "wrong" }));
      if (scenario === "malformed") writeFileSync(task.resultPath, "{broken");
      const resultBytes = existsSync(task.resultPath) ? readFileSync(task.resultPath) : undefined;
      const recovered = fakeTransport(scenario !== "lost");
      const runtime = new SubagentRuntime(recovered.transport, handlerRegistry(), f.root);
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          await runtime.recover(input.cwd);
          expect(runtime.inspect(task.subagentId).status).toBe(scenario === "live" ? "running" : scenario === "completed" ? "completed" : scenario === "cancelled" ? "cancelled" : "failed");
          if (scenario === "live") expect(readFileSync(payload(task))).toEqual(original);
          else expect(existsSync(directory(task))).toBeFalse();
          if (scenario === "queued") expect(runtime.inspect(task.subagentId).error).toBe("launch_interrupted");
          if (resultBytes) expect(readFileSync(task.resultPath)).toEqual(resultBytes);
          else expect(existsSync(task.resultPath)).toBeFalse();
          expect(JSON.parse(readFileSync(manifestPath, "utf8")).opaque).toEqual(manifest.opaque);
          expect(recovered.calls.some(call => ["create", "run", "send"].includes((call as any).op))).toBeFalse();
        }
      } finally { runtime.stop(); }
    }
  }, 60_000);

  test("deletion failure preserves primary outcome and retries once on recovery, resume or remove", async () => {
    for (const action of ["recover", "resume", "remove"]) {
      const f = fixture();
      const task = await f.runtime.spawn(input);
      writeFileSync(task.sessionFile, "session");
      const remove = fs.rmSync;
      let attempts = 0;
      const deletion = spyOn(fs, "rmSync").mockImplementation((path, options) => {
        if (String(path) === payload(task)) { attempts++; throw new Error("SECRET /private/image-path AQ=="); }
        return remove(path, options);
      }); spies.push(deletion);
      const warnings = spyOn(console, "warn").mockImplementation(() => {}); spies.push(warnings);
      result(task, "failed");
      await expect(f.runtime.join(task.subagentId)).resolves.toMatchObject({ status: "failed", error: "image_input_failed:read" });
      expect(attempts).toBe(1);
      expect(warnings.mock.calls).toEqual([["Image input cleanup failed for task generation 1."]]);
      const bytes = readFileSync(task.resultPath);
      const notification = { ...f.notifications[0] };
      if (action === "remove") {
        await expect(f.runtime.remove(task.subagentId)).rejects.toThrow("Image input failed at cleanup. Image input cleanup failed.");
        expect(existsSync(task.sessionFile)).toBeTrue();
        expect(readFileSync(task.resultPath)).toEqual(bytes);
      }
      deletion.mockRestore();
      if (action === "recover") { f.runtime.stop(); await f.runtime.recover(input.cwd); }
      if (action === "resume") {
        const next = await f.runtime.resume(task.subagentId, "fresh", images);
        expect(existsSync(payload(next))).toBeTrue();
      }
      if (action === "remove") await f.runtime.remove(task.subagentId);
      expect(existsSync(directory(task))).toBeFalse();
      if (action !== "remove") expect(readFileSync(task.resultPath)).toEqual(bytes);
      expect(notification).toEqual({ subagentId: "task", generation: 1, status: "failed", label: "cleanup", reason: "image_input_failed:read" });
      expect(JSON.stringify(warnings.mock.calls)).not.toMatch(/SECRET|private|AQ==|envelope/);
      for (const spy of spies.splice(0).reverse()) spy.mockRestore();
    }
  }, 60_000);

  test("recovery removes private prior-generation temporaries and preserves the live current generation", async () => {
    const f = fixture();
    const first = await f.runtime.spawn(input);
    result(first); await f.runtime.join(first.subagentId);
    const second = await f.runtime.resume(first.subagentId, "fresh", images);
    await f.runtime["publishImageInput"](first, images);
    fs.renameSync(payload(first), join(directory(first), "envelope.tmp"));
    const current = readFileSync(payload(second));
    f.runtime.stop();
    const rebuilt = new SubagentRuntime(f.transport, handlerRegistry(), f.root);
    try {
      await rebuilt.recover(input.cwd);
      expect(existsSync(directory(first))).toBeFalse();
      expect(readFileSync(payload(second))).toEqual(current);
      expect(rebuilt.inspect(first.subagentId)).toMatchObject({ generation: 2, status: "running" });
    } finally { rebuilt.stop(); }
  }, 60_000);

  test("cleanup refuses redirections, hardlinks, foreign additions and future-generation payloads", async () => {
    for (const scenario of ["directory", "file", "hardlink", "addition", "future", "replacement"]) {
      const f = fixture();
      const task = await f.runtime.spawn(input);
      const outside = join(f.root, "outside"); mkdirSync(outside);
      const sentinel = join(outside, "sentinel"); writeFileSync(sentinel, "foreign");
      const target = scenario === "directory" ? directory(task) : payload(task);
      if (["directory", "file"].includes(scenario)) {
        fs.renameSync(target, `${target}-held`);
        fs.symlinkSync(scenario === "directory" ? outside : sentinel, target, process.platform === "win32" ? scenario === "directory" ? "junction" : "file" : scenario === "directory" ? "dir" : "file");
      }
      if (scenario === "hardlink") fs.linkSync(payload(task), join(outside, "linked"));
      if (scenario === "addition") writeFileSync(join(directory(task), "foreign"), "foreign");
      if (scenario === "future") await f.runtime["publishImageInput"]({ ...task, generation: 2, resultPath: join(dirname(task.resultPath), "result-2.json") }, images);
      if (scenario === "replacement") { fs.renameSync(directory(task), `${directory(task)}-held`); mkdirSync(directory(task)); writeFileSync(payload(task), "foreign"); }
      const warnings = spyOn(console, "warn").mockImplementation(() => {}); spies.push(warnings);
      result(task); await f.runtime.join(task.subagentId);
      await expect(f.runtime.remove(task.subagentId)).rejects.toThrow("cleanup");
      expect(readFileSync(sentinel, "utf8")).toBe("foreign");
      expect(readFileSync(task.resultPath, "utf8")).toContain("authoritative");
      if (scenario === "future") expect(existsSync(join(dirname(task.resultPath), "image-input-2", "envelope.json"))).toBeTrue();
      if (scenario === "replacement") expect(readFileSync(payload(task), "utf8")).toBe("foreign");
      if (["directory", "file"].includes(scenario)) rmSync(target, { force: true });
      for (const spy of spies.splice(0).reverse()) spy.mockRestore();
    }
  }, 60_000);
});

function snapshotSpawnState(runtime: SubagentRuntime, root: string) {
  const files: Record<string, string> = {};
  const visit = (directory: string, prefix = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path, relative);
      else files[relative] = readFileSync(path).toString("base64");
    }
  };
  visit(root);
  const internals = runtime as any;
  return {
    files,
    tasks: structuredClone([...internals.tasks.entries()]),
    activeTasksDir: internals.activeTasksDir,
    monitors: [...internals.monitors.keys()],
    notified: [...internals.notified],
    manifestUnknown: structuredClone([...internals.manifestUnknown.entries()]),
    launches: [...internals.launches.keys()],
    settlements: [...internals.settlements.keys()],
    cleanups: [...internals.cleanups.keys()],
  };
}

describe("I-SOURCE trusted opaque Result issuance", () => {
  const originals = ["opaque—not a Harness document\r\n  ", "status: completed\nsummary: exact\nreport: |\n  " + "长\\\"\t".repeat(6000)];
  const roots: string[] = [];
  const runtimes: SubagentRuntime[] = [];
  const spies: { mockRestore(): void }[] = [];
  afterEach(() => {
    for (const spy of spies.splice(0).reverse()) spy.mockRestore();
    for (const runtime of runtimes.splice(0)) runtime.stop();
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  async function fixture(original = originals[0]!, image = false) {
    const root = mkdtempSync(join(tmpdir(), "subagents-source-")); roots.push(root);
    const parentSessionFile = join(root, "parent.jsonl");
    const cwd = "/repo";
    const { calls, transport } = fakeTransport();
    const notifications: CompletionNotification[] = [];
    const runtime = new SubagentRuntime(transport, handlerRegistry(), undefined, value => { notifications.push(value); });
    runtimes.push(runtime);
    const active = await runtime.spawn({ agent: "handler", cwd, parentSessionFile, prompt: "work", label: "source", taskSlug: "source",
      ...(image ? { images: [{ type: "image" as const, mimeType: "image/png", data: "AQ==" }] } : {}) });
    writeFileSync(active.resultPath, JSON.stringify({ subagentId: active.subagentId, generation: active.generation, status: "completed", result: original }), { mode: 0o600 });
    await runtime.join(active.subagentId); runtime.stop();
    const task = runtime.inspect(active.subagentId);
    const scope = dirname(task.sessionFile);
    const artifact = dirname(task.resultPath);
    const manifest = join(artifact, "task.json");
    const ctx = { cwd, sessionManager: { getSessionFile: () => parentSessionFile } };
    const tools = createSubagentTools(runtime, cwd, parentSessionFile);
    const call = (name: string, params: object = { subagentId: task.subagentId }, update?: (value: any) => void, context: any = ctx) =>
      (tools.find(tool => tool.name === name)!.execute as any)("source-call", params, undefined, update, context);
    return { root, cwd, parentSessionFile, runtime, task, scope, artifact, manifest, ctx, call, original, calls, notifications };
  }

  function rejected(value: any, original: string, path: string) {
    expect(value.details.resultDelivery).toMatchObject({ kind: "unavailable", fullResultReturned: false });
    expect(value.details).not.toHaveProperty("result");
    expect(value.details).not.toHaveProperty("resultPath");
    expect(value.details).not.toHaveProperty("resultSource");
    expect(JSON.stringify(value)).not.toContain(original);
    expect(JSON.stringify(value)).not.toContain(path.replaceAll("\\", "\\\\"));
    expect(JSON.parse(value.content[0].text)).toEqual(value.details);
  }

  function ledger(f: Awaited<ReturnType<typeof fixture>>) {
    return {
      ...snapshotSpawnState(f.runtime, f.root), calls: structuredClone(f.calls), notifications: structuredClone(f.notifications),
      pending: [...(f.runtime as any).pendingSettlements.keys()], images: [...(f.runtime as any).imageCleanups.keys()],
      removals: [...(f.runtime as any).removals.keys()], epoch: (f.runtime as any).monitorEpoch,
    };
  }

  test("current and restored caches issue exact fresh opaque evidence through join, inspect and cancel", async () => {
    for (const original of originals) {
      const f = await fixture(original);
      for (const name of ["subagent_join", "subagent_inspect", "subagent_cancel"]) {
        const value = await f.call(name, { subagentId: f.task.subagentId, message: "no active turn" });
        expect(value.details.result).toBe(original);
        expect(value.details.resultPath).toBe(f.task.resultPath);
        expect(value.details.resultSource).toEqual({ scopeIdentity: f.scope, parentSessionFile: f.parentSessionFile });
        expect(JSON.parse(value.content[0].text)).toEqual(value.details);
        expect(value.details).not.toHaveProperty("resultSummary");
      }
      await f.runtime.recover(f.cwd, f.parentSessionFile); f.runtime.stop();
      const envelope = JSON.parse(readFileSync(f.task.resultPath, "utf8"));
      // JSON layout/key escaping is not a change to the decoded original.
      writeFileSync(f.task.resultPath, JSON.stringify(envelope, null, 2).replaceAll("result", "\\u0072esult"));
      const before = ledger(f);
      const restored = await f.call("subagent_join");
      expect(restored.details.result).toBe(original);
      expect(restored.details.resultSource.scopeIdentity).toBe(f.scope);
      expect(ledger(f)).toEqual(before);
      writeFileSync(f.task.resultPath, JSON.stringify({ ...envelope, result: original.replace(/^./, "X") }));
      const stale = ledger(f);
      rejected(await f.call("subagent_join"), original, f.task.resultPath);
      expect(ledger(f)).toEqual(stale);
    }
  }, 120_000); // Repeated fresh native source probes; no cache replaces them.

  test("every join update is lifecycle-only before final opaque delivery", async () => {
    const marker = "CONSUMER_PRIVATE_LONG_REPORT";
    const f = await fixture(marker + originals[1]);
    const observations = f.runtime.listTasks();
    expect(observations).toHaveLength(1);
    expect(f.notifications).toHaveLength(1);
    for (const observation of [...observations, ...f.notifications]) {
      for (const key of ["result", "resultSummary", "resultPath", "resultSource", "sessionFile"]) expect(observation).not.toHaveProperty(key);
      expect(JSON.stringify(observation)).not.toContain(marker);
    }
    for (const mode of ["progress", "summary"] as const) {
      const widget = createSubagentStatusWidget(observations, { mode, useNerdFont: false, clock: Date.now, tui: { requestRender() {} } });
      for (const width of [12, 40, 120]) expect(widget.render(width).join("\n")).not.toContain(marker);
      widget.dispose();
    }
    const inspect = f.runtime.inspect.bind(f.runtime);
    let inspections = 0;
    spies.push(spyOn(f.runtime, "inspect").mockImplementation(id => {
      const value = inspect(id);
      return ++inspections === 2 ? { ...value, result: undefined, resultSummary: "unsafe summary", resultSource: { scopeIdentity: "unsafe scope" } } : value;
    }));
    const updates: any[] = [];
    const result = await f.call("subagent_join", undefined, value => updates.push(value));
    expect(updates.length).toBeGreaterThan(0);
    for (const update of updates) {
      rejected(update, f.original, f.task.resultPath);
      expect(update.details.resultDelivery.code).toBe("result_not_delivered");
      expect(update.details).not.toHaveProperty("resultSummary");
      expect(JSON.stringify(update)).not.toContain(marker);
    }
    expect(result.details.result).toBe(f.original);
  }, 30_000);

  test("fresh issuance refuses cache disagreement, absent/malformed/foreign sources, and preserves all state", async () => {
    const f = await fixture();
    const saved = new Map([[f.task.resultPath, readFileSync(f.task.resultPath)], [f.manifest, readFileSync(f.manifest)]]);
    const envelope = JSON.parse(saved.get(f.task.resultPath)!.toString());
    const manifest = JSON.parse(saved.get(f.manifest)!.toString());
    const cases: [string, string | undefined][] = [
      [f.task.resultPath, undefined], [f.task.resultPath, "{"], [f.task.resultPath, "null"], [f.task.resultPath, "[]"],
      [f.task.resultPath, JSON.stringify({ ...envelope, result: f.original.replace(/^./, "X") })],
      [f.task.resultPath, JSON.stringify({ ...envelope, subagentId: "foreign" })],
      [f.task.resultPath, JSON.stringify({ ...envelope, generation: 2 })],
      [f.task.resultPath, JSON.stringify({ ...envelope, status: "running" })],
      [f.task.resultPath, JSON.stringify({ ...envelope, result: {} })],
      [f.task.resultPath, JSON.stringify({ ...envelope, error: "foreign private diagnostic" })],
      [f.manifest, undefined], [f.manifest, "{"], [f.manifest, "null"],
      ...[{ subagentId: "foreign" }, { generation: 2 }, { agent: "other" }, { cwd: "/other" },
        { sessionFile: join(f.root, "foreign.jsonl") }, { status: "failed" }, { taskSlug: "foreign" }, { model: "foreign/model" }]
        .map(change => [f.manifest, JSON.stringify({ ...manifest, ...change })] as [string, string]),
    ];
    for (const [path, bytes] of cases) {
      if (bytes === undefined) rmSync(path); else writeFileSync(path, bytes);
      const before = ledger(f);
      rejected(await f.call("subagent_inspect"), f.original, f.task.resultPath);
      expect(ledger(f)).toEqual(before);
      writeFileSync(path, saved.get(path)! , { mode: 0o600 });
    }
    // A same-length cache disagreement is not rescued by the unchanged source.
    const owned = (f.runtime as any).tasks.get(f.task.subagentId);
    owned.result = f.original.replace(/^./, "X");
    const before = ledger(f);
    for (const name of ["subagent_inspect", "subagent_join", "subagent_cancel"]) {
      rejected(await f.call(name), f.original, f.task.resultPath);
    }
    expect(ledger(f)).toEqual(before);
  }, 60_000);

  test("valid temporary and foreign hardlinks are refused without publication takeover or deletion", async () => {
    const f = await fixture();
    for (const file of [f.task.resultPath, f.manifest]) {
      const temporary = file === f.task.resultPath ? `${file}.${process.pid}-12345678-1234-4234-8234-123456789abc.tmp` : join(f.artifact, "manifest-link");
      fs.linkSync(file, temporary);
      const before = ledger(f);
      const stat = fs.statSync(file);
      rejected(await f.call("subagent_inspect"), f.original, f.task.resultPath);
      expect(fs.statSync(file).nlink).toBe(2);
      expect(fs.statSync(temporary).ino).toBe(stat.ino);
      expect(ledger(f)).toEqual(before);
      rmSync(temporary);
    }
    const foreign = join(f.root, "foreign-result.json"); fs.linkSync(f.task.resultPath, foreign);
    const before = ledger(f);
    rejected(await f.call("subagent_inspect"), f.original, f.task.resultPath);
    expect(ledger(f)).toEqual(before);
    expect(readFileSync(foreign)).toEqual(readFileSync(f.task.resultPath));
  }, 30_000);

  test.each([16384, 16385])("readable inherited/shared sources issue %i decoded bytes without OS-owner or private-mode admission", async bytes => {
    const prefix = 'status: completed\r\nsummary: "  exact summary 中文  "\r\nreport: |\r\n  中文😀 "\\\\\t';
    const f = await fixture(prefix + "x".repeat(bytes - Buffer.byteLength(prefix, "utf8")));
    // Recreate only this isolated fixture with natural inheritance, never chmod/SetAccessControl.
    const held = `${f.scope}-private`;
    fs.renameSync(f.scope, held);
    const copy = (source: string, target: string) => {
      mkdirSync(target, { mode: 0o755 });
      for (const entry of readdirSync(source, { withFileTypes: true })) {
        if (entry.isDirectory()) copy(join(source, entry.name), join(target, entry.name));
        else writeFileSync(join(target, entry.name), readFileSync(join(source, entry.name)), { mode: 0o644 });
      }
    };
    copy(held, f.scope); rmSync(held, { recursive: true });
    const paths = [f.scope, f.artifact, f.manifest, f.task.resultPath];
    const access = () => {
      if (process.platform !== "win32") return paths.map(path => {
        const stat = fs.lstatSync(path);
        expect(stat.mode & 0o077).not.toBe(0);
        return { mode: stat.mode, uid: stat.uid, gid: stat.gid };
      });
      const script = "$ErrorActionPreference = 'Stop'; @(" + paths.map(path => {
        const kind = fs.statSync(path).isDirectory() ? "Directory" : "File";
        return `$a = [IO.${kind}]::GetAccessControl([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(path).toString("base64")}'))); `
          + "$r = @($a.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])); "
          + "[pscustomobject]@{sddl=$a.Sddl; inherited=@($r | Where-Object IsInherited).Count; rules=$r.Count; protected=$a.AreAccessRulesProtected}";
      }).join("; ") + ") | ConvertTo-Json -Compress";
      const result = childProcess.spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
      expect(result.status).toBe(0);
      const records = JSON.parse(result.stdout);
      expect(records).toHaveLength(4);
      for (const record of records) {
        expect(record.protected).toBeFalse();
        expect(record.inherited).toBeGreaterThan(0);
        expect(record.rules).toBeGreaterThan(1);
      }
      return records;
    };
    const permissions = access();
    const before = ledger(f);
    const native = childProcess.spawnSync;
    const lstat = fs.lstatSync;
    let policyProbes = 0;
    const nativeChecks = new Map<string, number>();
    const ownerStats = new Set<string>();
    spies.push(spyOn(childProcess, "spawnSync").mockImplementation(((command: any, args?: any, options?: any) => {
      const script = String(options?.input);
      const path = paths.find(path => script.includes(`'${Buffer.from(path).toString("base64")}'`));
      if (path) {
        if (/AccessControl|GetOwner|WindowsIdentity|SetOwner/.test(script)) {
          policyProbes++;
          throw new Error("OS owner/ACL policy probe unavailable");
        }
        if (script.includes("ReparsePoint")) nativeChecks.set(path, (nativeChecks.get(path) ?? 0) + 1);
      }
      return native(command, args, options);
    }) as typeof childProcess.spawnSync));
    spies.push(spyOn(fs, "lstatSync").mockImplementation(((path: any, options?: any) => {
      const stat = lstat(path, options);
      if (stat && paths.includes(String(path))) {
        ownerStats.add(String(path));
        // Only OS-account metadata is substituted; file shape/identity/times and all I/O remain real.
        Object.defineProperty(stat, "uid", { value: (process.getuid?.() ?? 0) + 1 });
      }
      return stat;
    }) as typeof fs.lstatSync));
    for (const name of ["subagent_join", "subagent_inspect"]) {
      const value = await f.call(name);
      expect(value.details.result).toBe(f.original);
      expect(Buffer.byteLength(value.details.result, "utf8")).toBe(bytes);
      expect(value.details.resultPath).toBe(f.task.resultPath);
      expect(value.details.resultSource).toEqual({ scopeIdentity: f.scope, parentSessionFile: f.parentSessionFile });
      expect(JSON.parse(value.content[0].text)).toEqual(value.details);
    }
    expect(policyProbes).toBe(0);
    expect([...ownerStats].sort()).toEqual([...paths].sort());
    if (process.platform === "win32") for (const path of paths) expect(nativeChecks.get(path)).toBeGreaterThanOrEqual(4);
    for (const spy of spies.splice(0).reverse()) spy.mockRestore();
    expect(access()).toEqual(permissions);
    expect(ledger(f)).toEqual(before);
  }, 30_000);

  test("real open/read errors cannot fall back to cached originals or summaries", async () => {
    const f = await fixture();
    const open = fs.openSync;
    const read = fs.readFileSync;
    for (const path of [f.manifest, f.task.resultPath]) for (const operation of ["open", "read"]) {
      const before = ledger(f);
      const held = `${path}-held`;
      let failure: string | undefined;
      let target: number | undefined;
      spies.push(spyOn(fs, "openSync").mockImplementation((file: any, flags: any, mode?: any) => {
        if (file !== path) return open(file, flags, mode);
        // ENOENT at the actual open boundary, or a real write-only descriptor that cannot be read.
        if (operation === "open") fs.renameSync(path, held);
        try { return target = open(file, operation === "read" ? fs.constants.O_WRONLY : flags, mode); }
        catch (error) { failure = (error as NodeJS.ErrnoException).code; throw error; }
      }));
      spies.push(spyOn(fs, "readFileSync").mockImplementation(((file: any, options?: any) => {
        try { return read(file, options); }
        catch (error) { if (file === target) failure = (error as NodeJS.ErrnoException).code; throw error; }
      }) as typeof fs.readFileSync));
      const value = await f.call("subagent_inspect");
      rejected(value, f.original, f.task.resultPath);
      expect(value.details).not.toHaveProperty("resultSummary");
      expect(failure).toBe(operation === "open" ? "ENOENT" : "EBADF");
      for (const spy of spies.splice(0).reverse()) spy.mockRestore();
      if (operation === "open") fs.renameSync(held, path);
      expect(ledger(f)).toEqual(before);
    }
  }, 30_000);

  test("manifest and Result descriptor metadata must remain continuous after reading", async () => {
    const f = await fixture();
    const open = fs.openSync;
    const stat = fs.fstatSync;
    const read = fs.readFileSync;
    for (const path of [f.manifest, f.task.resultPath]) for (const field of ["size", "mtimeMs", "ctimeMs", "dev", "ino"]) {
      const before = ledger(f);
      let target: number | undefined;
      let readComplete = false;
      let changed = false;
      spies.push(spyOn(fs, "openSync").mockImplementation((file: any, flags: any, mode?: any) => {
        const descriptor = open(file, flags, mode);
        if (file === path) target = descriptor;
        return descriptor;
      }));
      spies.push(spyOn(fs, "readFileSync").mockImplementation(((file: any, options?: any) => {
        const value = read(file, options);
        if (file === target) readComplete = true;
        return value;
      }) as typeof fs.readFileSync));
      spies.push(spyOn(fs, "fstatSync").mockImplementation(((file: number, options?: any) => {
        const value = stat(file, options);
        if (file === target && readComplete) {
          const previous = Number(value[field as keyof typeof value]);
          // Native inode numbers may exceed safe integers; +1 need not change their JS value.
          const next = previous + Math.max(1, Math.abs(previous) * Number.EPSILON * 2);
          Object.defineProperty(value, field, { value: next });
          changed = next !== previous;
        }
        return value;
      }) as typeof fs.fstatSync));
      const value = await f.call("subagent_inspect");
      expect(changed, `${path}: ${field} fault reached post-read stat`).toBeTrue();
      rejected(value, f.original, f.task.resultPath);
      for (const spy of spies.splice(0).reverse()) spy.mockRestore();
      expect(ledger(f)).toEqual(before);
    }
  }, 30_000);

  test.skipIf(process.platform !== "win32")("native reparse probes remain mandatory before and after all four sources", async () => {
    const f = await fixture();
    const native = childProcess.spawnSync;
    for (const path of [f.scope, f.artifact, f.manifest, f.task.resultPath]) for (const failAt of [1, 2]) {
      let probes = 0;
      const before = ledger(f);
      spies.push(spyOn(childProcess, "spawnSync").mockImplementation((command: any, args?: any, options?: any) => {
        const script = String(options?.input);
        if (script.includes(`'${Buffer.from(path).toString("base64")}'`) && script.includes("ReparsePoint") && ++probes === failAt) {
          return { status: 1, stdout: "", stderr: "native reparse rejection" } as any;
        }
        return native(command, args, options);
      }));
      rejected(await f.call("subagent_inspect"), f.original, f.task.resultPath);
      expect(probes).toBe(failAt);
      spies.pop()!.mockRestore();
      expect(ledger(f)).toEqual(before);
    }
  }, 30_000);

  test("leaf/task/scope redirection never issues foreign files or cleans the redirected target", async () => {
    const f = await fixture();
    for (const path of [f.task.resultPath, f.manifest, f.artifact, f.scope]) {
      const directory = fs.statSync(path).isDirectory();
      const held = `${path}-held`;
      fs.renameSync(path, held);
      // A directory junction needs no symlink privilege on Windows.
      try { fs.symlinkSync(held, path, directory ? "junction" : "file"); }
      catch (error) {
        fs.renameSync(held, path);
        // Actual leaf symlinks may require Windows privilege; existing mock-handle tests cover leaf substitution.
        if (process.platform === "win32" && (error as any).code === "EPERM") continue;
        throw error;
      }
      const before = { result: readFileSync(f.task.resultPath), manifest: readFileSync(f.manifest), calls: [...f.calls], notifications: [...f.notifications] };
      rejected(await f.call("subagent_inspect"), f.original, f.task.resultPath);
      expect(readFileSync(f.task.resultPath)).toEqual(before.result);
      expect(readFileSync(f.manifest)).toEqual(before.manifest);
      expect(f.calls).toEqual(before.calls); expect(f.notifications).toEqual(before.notifications);
      expect(fs.lstatSync(path).isSymbolicLink()).toBeTrue();
      fs.unlinkSync(path); fs.renameSync(held, path);
    }
  }, 30_000);

  test("scope, owner, generation, recovery and Router changes across the tool await cannot issue stale evidence", async () => {
    const f = await fixture();
    const owned = (f.runtime as any).tasks.get(f.task.subagentId);
    const originalInspect = f.runtime.inspect.bind(f.runtime);
    const resultBytes = readFileSync(f.task.resultPath);
    const cases = [
      () => { (f.runtime as any).activeTasksDir = join(f.root, "foreign-scope"); },
      () => { (f.runtime as any).tasks.set(f.task.subagentId, { ...owned }); },
      () => { owned.generation++; },
      () => { (f.runtime as any).recovery = Promise.resolve(); },
      () => { f.ctx.sessionManager.getSessionFile = () => join(f.root, "foreign.jsonl"); },
      () => { f.ctx.cwd = "/other"; },
      () => { writeFileSync(f.task.resultPath, JSON.stringify({ subagentId: f.task.subagentId, generation: 1, status: "completed", result: f.original.replace(/^./, "X") })); },
    ];
    for (const change of cases) {
      let reads = 0;
      let afterChange: ReturnType<typeof ledger> | undefined;
      spies.push(spyOn(f.runtime, "inspect").mockImplementation(id => {
        const snapshot = originalInspect(id);
        if (++reads === 2) queueMicrotask(() => { change(); afterChange = ledger(f); }); // before wrapper resumes
        return snapshot;
      }));
      rejected(await f.call("subagent_inspect"), f.original, f.task.resultPath);
      if (!afterChange) throw new Error("Fixture microtask did not run before issuance");
      expect(ledger(f)).toEqual(afterChange);
      spies.pop()!.mockRestore();
      owned.generation = 1; (f.runtime as any).tasks.set(f.task.subagentId, owned);
      (f.runtime as any).activeTasksDir = f.scope; (f.runtime as any).recovery = undefined;
      f.ctx.cwd = f.cwd; f.ctx.sessionManager.getSessionFile = () => f.parentSessionFile;
      writeFileSync(f.task.resultPath, resultBytes);
    }
  }, 30_000);

  test("all immediate-terminal management adapters use the same source boundary", async () => {
    for (const name of ["spawn", "resume", "steer"] as const) {
      const f = await fixture();
      let absent = false;
      const resume = f.runtime.resume.bind(f.runtime);
      spies.push(spyOn(f.runtime, name).mockImplementation(async (id: any, prompt?: any, images?: any) => {
        if (name === "resume") {
          // Real resume lineage and settlement; fake child completion, never a provider.
          const next = await resume(id, prompt, images);
          writeFileSync(next.resultPath, JSON.stringify({ subagentId: next.subagentId, generation: next.generation, status: "completed", result: f.original }), { mode: 0o600 });
          await f.runtime.join(id); f.runtime.stop();
          Object.assign(next, f.runtime.inspect(id)); // Keep invocation-local predecessor evidence.
          if (absent) rmSync(next.resultPath);
          return next;
        }
        // Adapter-return fixtures for fast terminal spawn/steer only.
        if (absent) rmSync(f.task.resultPath);
        return f.runtime.inspect(f.task.subagentId);
      }));
      const params = { subagentId: f.task.subagentId, agent: "handler", prompt: "work", message: "work" };
      const valid = await f.call(`subagent_${name}`, params);
      expect(valid.details.result).toBe(f.original);
      expect(valid.details.resultSource.scopeIdentity).toBe(f.scope);
      absent = true;
      rejected(await f.call(`subagent_${name}`, params), f.original, f.runtime.inspect(f.task.subagentId).resultPath);
      spies.pop()!.mockRestore();
      const removed = await f.call("subagent_remove");
      expect(removed.details).toEqual({ status: "removed" });
      expect(JSON.stringify(removed)).not.toContain(f.original);
      expect(removed.details).not.toHaveProperty("resultPath");
    }
  }, 60_000);

  test("resume cannot issue a replacement incarnation adopted during its await", async () => {
    const f = await fixture();
    const resume = f.runtime.resume.bind(f.runtime);
    spies.push(spyOn(f.runtime, "resume").mockImplementation(async (id, prompt, images) => {
      await f.runtime.recover(f.cwd, f.parentSessionFile);
      const next = await resume(id, prompt, images);
      writeFileSync(next.resultPath, JSON.stringify({ subagentId: id, generation: next.generation, status: "completed", result: f.original }), { mode: 0o600 });
      await f.runtime.join(id); f.runtime.stop();
      Object.assign(next, f.runtime.inspect(id));
      return next;
    }));
    const result = await f.call("subagent_resume", { subagentId: f.task.subagentId, prompt: "work" });
    rejected(result, f.original, f.runtime.inspect(f.task.subagentId).resultPath);
    expect(result.details.resultDelivery.code).toBe("result_identity_mismatch");
  }, 30_000);

  test("a substituted file handle is rejected before foreign bytes can become source evidence", async () => {
    const f = await fixture();
    const foreign = join(f.root, "foreign.json");
    writeFileSync(foreign, "foreign-private-original", { mode: 0o600 });
    const originalOpen = fs.openSync;
    spies.push(spyOn(fs, "openSync").mockImplementation((path: any, flags: any, mode?: any) =>
      originalOpen(path === f.task.resultPath ? foreign : path, flags, mode)));
    const before = ledger(f);
    const value = await f.call("subagent_inspect");
    rejected(value, f.original, f.task.resultPath);
    expect(JSON.stringify(value)).not.toContain("foreign-private-original");
    expect(ledger(f)).toEqual(before);
  }, 30_000);

  test("active snapshots cannot issue an already-published file before its original is established", async () => {
    const f = await fixture();
    expect(JSON.parse(readFileSync(f.task.resultPath, "utf8")).result).toBe(f.original);
    const owned = (f.runtime as any).tasks.get(f.task.subagentId);
    owned.status = "running";
    owned.result = undefined;
    const before = ledger(f);
    const value = await f.call("subagent_inspect");
    rejected(value, f.original, f.task.resultPath);
    expect(value.details.resultDelivery.code).toBe("result_not_delivered");
    expect(value.details.label).toBe(f.task.label);
    expect(Object.hasOwn(value.details, "resultPath")).toBeFalse();
    expect(ledger(f)).toEqual(before);
  }, 30_000);

  test("opaque issuance does not consume, repair or expose private image storage", async () => {
    const f = await fixture(originals[0], true);
    const imageDirectory = join(f.artifact, "image-input-1");
    // Legitimate terminal settlement already cleaned its own image; an orphan is not issuance's responsibility.
    mkdirSync(imageDirectory, { mode: 0o700 });
    writeFileSync(join(imageDirectory, "envelope.json"), "private orphan AQ==", { mode: 0o600 });
    const before = ledger(f);
    const result = await f.call("subagent_inspect");
    expect(result.details.result).toBe(f.original);
    expect(JSON.stringify(result)).not.toContain("AQ==");
    expect(ledger(f)).toEqual(before);
    expect(existsSync(imageDirectory)).toBeTrue();
  }, 30_000);
});

test("preserves seeded task and scope bytes across the registry rejection matrix", async () => {
  const { calls, transport } = fakeTransport();
  const root = mkdtempSync(join(tmpdir(), "subagents-model-seeded-ledger-"));
  const otherRoot = mkdtempSync(join(tmpdir(), "subagents-model-seeded-other-"));
  const parentSessionFile = join(root, "parent.jsonl");
  const rejectedParentSessionFile = join(otherRoot, "parent.jsonl");
  const notifications: CompletionNotification[] = [];
  const updates: string[] = [];
  const runtime = new SubagentRuntime(transport, handlerRegistry(), undefined, notification => { notifications.push(notification); });
  runtime.onTaskUpdate(() => { updates.push("update"); });
  const seed = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "seed", label: "seed", taskSlug: "seed", parentSessionFile });
  writeFileSync(seed.resultPath, JSON.stringify({ subagentId: seed.subagentId, generation: 1, status: "completed", result: "seeded" }));
  await runtime.join(seed.subagentId);
  const baseline = snapshotSpawnState(runtime, root);
  const baselineUpdates = [...updates];
  const baselineNotifications = structuredClone(notifications);
  calls.length = 0;

  const valid = {
    getProvider() { return {}; },
    getProviderAuthStatus() { return { configured: true }; },
    find() { return { provider: "test", id: "model" }; },
    getAvailable() { return [{ provider: "test", id: "model" }]; },
  };
  const cases = [
    { name: "invalid reference", model: "invalid", registry: undefined, failure: { code: "invalid_model_reference" } },
    { name: "unknown provider", model: "missing/model", registry: modelRegistry("test/model"), failure: { code: "provider_unavailable" } },
    { name: "unconfigured provider", model: "test/model", registry: { ...valid, getProviderAuthStatus() { return { configured: false }; } }, failure: { code: "provider_unavailable" } },
    { name: "absent find result", model: "test/model", registry: { ...valid, find() { return undefined; } }, failure: { code: "model_not_found" } },
    { name: "mismatched find result", model: "test/model", registry: { ...valid, find() { return { provider: "test", id: "other" }; } }, failure: { code: "model_registry_error", operation: "find" } },
    { name: "malformed find result", model: "test/model", registry: { ...valid, find() { return { provider: "", id: "model" }; } }, failure: { code: "model_registry_error", operation: "find" } },
    { name: "valid unavailable snapshot", model: "test/model", registry: { ...valid, getAvailable() { return [{ provider: "test", id: "other" }]; } }, failure: { code: "model_unavailable" } },
    { name: "malformed available before match", model: "test/model", registry: { ...valid, getAvailable() { return [null, { provider: "test", id: "model" }]; } }, failure: { code: "model_registry_error", operation: "getAvailable" } },
    { name: "malformed available after match", model: "test/model", registry: { ...valid, getAvailable() { return [{ provider: "test", id: "model" }, { provider: "bad/provider", id: "other" }]; } }, failure: { code: "model_registry_error", operation: "getAvailable" } },
  ];

  for (const value of cases) {
    await expect(runtime.spawn({ agent: "missing", cwd: "/other", prompt: "reject", label: value.name, taskSlug: "!", model: value.model, parentSessionFile: rejectedParentSessionFile }, value.registry as any))
      .rejects.toMatchObject({ name: "ExplicitSpawnModelError", ...value.failure });
    expect(snapshotSpawnState(runtime, root), value.name).toEqual(baseline);
    expect(updates, value.name).toEqual(baselineUpdates);
    expect(notifications, value.name).toEqual(baselineNotifications);
    expect(calls, value.name).toEqual([]);
    expect(readdirSync(otherRoot), value.name).toEqual([]);
  }
  runtime.stop();
});

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createHerdrClient } from "@settingdust/pi-herdr";
import activateSubagents, { AgentRegistry, SubagentRuntime, createHerdrTransport, createSubagentTools, validateExplicitSpawnModel, type CompletionNotification, type HerdrTransport } from "../src/index.js";

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

async function waitFor(predicate: () => boolean, timeout = 2500): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for runtime settlement");
    await Bun.sleep(20);
  }
}

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
    const tools = createSubagentTools(new SubagentRuntime(transport, registry), "/repo", parentSessionFile);
    expect(tools.map(tool => tool.name)).toEqual(["subagent_spawn", "subagent_resume", "subagent_inspect", "subagent_join", "subagent_steer", "subagent_cancel", "subagent_remove"]);
    const parameters = tools[0]!.parameters as { required?: string[]; properties: Record<string, { enum?: unknown }> };
    expect(parameters.properties.agent?.enum).toEqual(["handler", "reviewer"]);
    expect(parameters.properties).toHaveProperty("taskSlug");
    expect(tools[0]!.description).toContain("taskSlug is required");
    expect(tools[0]!.description).toContain("After spawning, end the Router turn");
    expect(tools.find(tool => tool.name === "subagent_inspect")!.description).toContain("do not poll this tool while waiting");
    expect(tools.find(tool => tool.name === "subagent_join")!.description).toContain("Caller cancellation, including ESC, stops only this wait");

    const spawned = await (tools[0]!.execute as any)("call-1", {
      agent: "handler",
      prompt: "Do the work",
      label: "task",
      taskSlug: "tool-spawn",
      model: "test/model",
      thinking: "high",
    }, undefined, undefined, { modelRegistry: modelRegistry("test/model") });
    expect(spawned.details).toMatchObject({
      model: "test/model",
      thinking: "high",
      sessionFile: join(parentDir, "parent", "tasks", "tool-spawn-g1.jsonl"),
      status: "running",
    });
  });

  test("resolves the requested Agent locally without exposing its body", async () => {
    const registry = new AgentRegistry();
    registry.setFiles([{ path: "/reviewer.md", content: "---\nname: reviewer\n---\nReview the work." }]);
    const { transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-agent-"));
    const runtime = new SubagentRuntime(transport, registry, root);

    const task = await runtime.spawn({ agent: "reviewer", cwd: "/repo", prompt: "Review", label: "review", taskSlug: "task",});
    expect(task).toMatchObject({ agent: "reviewer" });
    expect(task).not.toHaveProperty("handlerBody");
    const bootstrap = readFileSync(join(root, "tasks", "task-artifacts", "launch-1.cjs"), "utf8");
    const encoded = bootstrap.match(/Buffer\.from\(\"([^\"]+)\"/)?.[1];
    const spec = JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as { args: string[] };
    expect(spec.args).toContain("Review the work.");
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

  test("resume, cancellation, and launch failure all invalidate after their state changes", async () => {
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

    const failingTransport = fakeTransport().transport;
    failingTransport.createTab = async () => { throw new Error("launch unavailable"); };
    const failing = new SubagentRuntime(failingTransport, handlerRegistry(), mkdtempSync(join(tmpdir(), "subagents-observation-launch-")));
    let failedUpdates = 0;
    failing.onTaskUpdate(() => { failedUpdates++; });
    await expect(failing.spawn({ agent: "handler", cwd: "/repo", prompt: "fail", label: "launch", taskSlug: "task",})).rejects.toThrow("launch unavailable");
    expect(failedUpdates).toBe(2);
    runtime.stop();
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

  test("selects one fail-safe canonical duplicate per generation without rewriting the others", async () => {
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

    for (const testCase of cases) {
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
    }
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
  });

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

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgentRegistry, SubagentRuntime, type CompletionNotification, type HerdrTransport, type SubagentTask } from "../src/index.js";

const roots: string[] = [];
const runtimes: SubagentRuntime[] = [];
afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.stop();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}
function setup(root = mkdtempSync(join(tmpdir(), "subagent-interrupted-"))) {
  if (!roots.includes(root)) roots.push(root);
  const calls: string[] = [];
  const notifications: CompletionNotification[] = [];
  const registry = new AgentRegistry();
  registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nHandler" }]);
  const transport: HerdrTransport = {
    async createTab() { calls.push("create"); return { tabId: "tab-new", paneId: "pane-new" }; },
    async run() { calls.push("run"); },
    async sendText() {},
    async closePane(id) { calls.push(`pane-close:${id}`); },
    async closeTab(id) { calls.push(`close:${id}`); return "closed"; },
    async paneExists(id) { calls.push(`exists:${id}`); return true; },
  };
  const runtime = new SubagentRuntime(transport, registry, root);
  runtime.setCompletionNotifier(async value => { notifications.push(value); });
  runtimes.push(runtime);
  const artifactDir = join(root, "tasks", "queued-task-artifacts");
  const manifestPath = join(artifactDir, "task.json");
  const manifest = () => JSON.parse(readFileSync(manifestPath, "utf8"));
  const spawn = () => runtime.spawn({ agent: "handler", cwd: "/repo", taskSlug: "queued-task", label: "queued", prompt: "work" });
  return { root, runtime, transport, calls, notifications, artifactDir, manifestPath, manifest, spawn };
}
function interceptPersistence(runtime: SubagentRuntime, hook: (task: SubagentTask, persist: () => Promise<void>) => Promise<void>) {
  const persist = runtime["persist"].bind(runtime);
  runtime["persist"] = task => hook(task, () => persist(task));
}
const timestamp = "2026-01-01T00:00:00.000Z";
function queuedFixture(f: ReturnType<typeof setup>, identity: { tabId?: string; paneId?: string } = {}) {
  mkdirSync(f.artifactDir, { recursive: true });
  const sessionFile = join(f.root, "tasks", "queued-task-g1.jsonl");
  writeFileSync(sessionFile, "retained session bytes\n");
  const priorResult = join(f.artifactDir, "result-1.json");
  writeFileSync(priorResult, '{ "subagentId":"queued-task", "generation":1, "status":"completed", "result":"g1" }\n');
  const priorCleanup = { generation: 1, tabId: "tab-old", status: "closed", attemptedAt: timestamp, unknown: { retain: true } };
  writeFileSync(f.manifestPath, JSON.stringify({
    version: 2, subagentId: "queued-task", taskSlug: "queued-task", generation: 2, agent: "handler", cwd: "/repo", label: "queued",
    sessionFile, status: "queued", queuedAt: timestamp, updatedAt: timestamp, ...identity,
    unknown: { nested: [null, 7, "keep"] }, surfaceCleanups: [priorCleanup, { opaque: true }],
  }));
  return { sessionFile, priorResult, priorBytes: readFileSync(priorResult, "utf8"), priorCleanup, resultPath: join(f.artifactDir, "result-2.json") };
}

describe("local launch and recovery ownership", () => {
  for (const stage of ["queued", "create", "running", "run"] as const) {
    test(`recovery waits through ${stage} and serializes new launches`, async () => {
      const f = setup();
      const entered = gate();
      const release = gate();
      if (stage === "queued" || stage === "running") {
        interceptPersistence(f.runtime, async (task, persist) => {
          if (task.subagentId === "queued-task" && task.status === stage) { entered.release(); await release.promise; }
          await persist();
        });
      } else {
        const original = f.transport[stage === "create" ? "createTab" : "run"].bind(f.transport);
        if (stage === "create") f.transport.createTab = async request => {
          entered.release(); await release.promise;
          return (original as HerdrTransport["createTab"])(request);
        };
        else f.transport.run = async (...args) => { entered.release(); await release.promise; await (original as HerdrTransport["run"])(...args); };
      }
      const launch = f.spawn();
      await entered.promise;
      let recovered = false;
      const recovery = f.runtime.recover("/repo").then(() => { recovered = true; });
      let secondLaunched = false;
      const second = f.runtime.spawn({ agent: "handler", cwd: "/repo", taskSlug: "next-task", label: "next", prompt: "next" }).then(task => { secondLaunched = true; return task; });
      await new Promise<void>(resolve => setImmediate(resolve));
      expect(recovered).toBe(false);
      expect(secondLaunched).toBe(false);
      if (stage === "queued") { expect(f.calls).toEqual([]); expect(f.runtime.listTasks()).toEqual([]); }
      release.release();
      expect((await launch).status).toBe("running");
      await recovery;
      expect(f.runtime.inspect("queued-task").status).toBe("running");
      expect((await second).status).toBe("running");
      expect(f.calls.filter(call => call === "run")).toHaveLength(2);
      expect(f.notifications).toEqual([]);
    });
  }

  for (const stage of ["queued", "create", "running", "script", "run"] as const) {
    test(`${stage} failure rejects launch and retains failure before cleanup`, async () => {
      const f = setup();
      const primary = new Error(`original ${stage} failure`);
      const durableAtClose: unknown[] = [];
      f.transport.closeTab = async id => { durableAtClose.push(f.manifest()); f.calls.push(`close:${id}`); return "closed"; };
      interceptPersistence(f.runtime, async (task, persist) => {
        if (task.status === stage) throw primary;
        await persist();
        if (stage === "script" && task.status === "running") mkdirSync(join(f.artifactDir, "launch-1.cjs"));
      });
      if (stage === "create") f.transport.createTab = async () => { f.calls.push("create"); throw primary; };
      if (stage === "run") f.transport.run = async () => { f.calls.push("run"); throw primary; };
      const failure = await f.spawn().catch(error => error);
      if (stage === "script") expect(String(failure)).toContain("EISDIR");
      else expect(failure).toBe(primary);
      const task = f.runtime.inspect("queued-task");
      expect(task.status).toBe("failed");
      expect(task.error).toBe(String(failure));
      expect(f.manifest().error).toBe(String(failure));
      expect(existsSync(task.resultPath)).toBe(false);
      expect(f.notifications).toHaveLength(1);
      if (stage === "queued" || stage === "create") {
        expect(task.surfaceCleanups).toMatchObject([{ status: "not_created" }]);
        expect(durableAtClose).toEqual([]);
        if (stage === "queued") expect(f.calls).toEqual([]);
      } else {
        expect(durableAtClose).toMatchObject([{ status: "failed", surfaceCleanups: [{ status: "pending", tabId: "tab-new" }] }]);
        expect(f.calls.filter(call => call.startsWith("close:"))).toEqual(["close:tab-new"]);
      }
      if (stage === "queued" || stage === "running") {
        expect(existsSync(join(f.artifactDir, "launch-1.cjs"))).toBe(false);
        expect(existsSync(join(f.artifactDir, "launch-1.ps1"))).toBe(false);
        expect(f.calls).not.toContain("run");
      }
    });
  }

  for (const stage of ["queued", "running"] as const) {
    test(`persistent ${stage}/terminal failures retain retry intent and block destructive operations`, async () => {
      const f = setup();
      const primary = new Error(`EPERM ${stage}`);
      let writable = false;
      let terminalWrites = 0;
      interceptPersistence(f.runtime, async (task, persist) => {
        if (task.status === stage) throw primary;
        if (task.status === "failed") { terminalWrites++; if (!writable) throw new Error("EPERM terminal"); }
        await persist();
      });
      const failure = await f.spawn().catch(error => error);
      expect(failure.cause).toBe(primary);
      expect(failure.message).toContain(`EPERM ${stage}; terminal persistence failed: Error: EPERM terminal`);
      expect(terminalWrites).toBe(1);
      expect(f.notifications).toEqual([]);
      expect(f.calls.filter(call => call.startsWith("close:"))).toEqual([]);
      await expect(f.runtime.recover("/repo")).rejects.toThrow("EPERM terminal");
      expect(terminalWrites).toBe(2);
      await expect(f.runtime.resume("queued-task", "retry")).rejects.toThrow("EPERM terminal");
      await expect(f.runtime.remove("queued-task")).rejects.toThrow("EPERM terminal");
      expect(terminalWrites).toBe(4);
      expect(f.runtime.inspect("queued-task")).toMatchObject({ generation: 1, error: String(primary) });
      expect(existsSync(f.artifactDir)).toBe(true);
      expect(f.notifications).toEqual([]);
      writable = true;
      await f.runtime.recover("/repo");
      expect(f.manifest()).toMatchObject({ generation: 1, status: "failed", error: String(primary) });
      expect(f.calls.filter(call => call.startsWith("close:"))).toEqual(stage === "running" ? ["close:tab-new"] : []);
      expect(f.notifications).toHaveLength(1);
      expect(f.notifications.every(value => value.status === "failed" && value.reason === String(primary))).toBe(true);
      expect(f.runtime.listTasks().filter(task => task.status === "queued" || task.status === "running")).toEqual([]);
    });
  }

  for (const cancellation of ["before join", "during launch wait", "during operation wait"] as const) {
    test(`cancelled join ${cancellation} cannot start retained settlement retry`, async () => {
      const f = setup();
      let writable = false;
      const writes: string[] = [];
      interceptPersistence(f.runtime, async (task, persist) => {
        writes.push(task.status);
        if (task.status === "failed" && !writable) throw new Error("EPERM terminal");
        await persist();
      });
      f.transport.run = async () => { throw new Error("submission failed"); };
      await expect(f.spawn()).rejects.toThrow("submission failed; terminal persistence failed");
      const beforeWrites = [...writes];
      const beforeManifest = readFileSync(f.manifestPath, "utf8");
      const beforeTask = f.runtime.inspect("queued-task");
      const entered = gate();
      const release = gate();
      const operationFor = f.runtime["operationFor"].bind(f.runtime);
      if (cancellation === "during operation wait") {
        f.runtime["operationFor"] = () => { entered.release(); return release.promise; };
      }
      writable = true;
      const controller = new AbortController();
      if (cancellation === "before join") controller.abort();
      const joined = f.runtime.join("queued-task", 1, controller.signal);
      const outcome = joined.catch(error => error);
      if (cancellation === "during operation wait") await entered.promise;
      // In the launch-wait case, abort before the initial await continuation runs.
      controller.abort();
      expect(await outcome).toMatchObject({ name: "AbortError" });
      release.release();
      await new Promise<void>(resolve => setImmediate(resolve));
      f.runtime["operationFor"] = operationFor;
      expect(writes).toEqual(beforeWrites);
      expect(readFileSync(f.manifestPath, "utf8")).toBe(beforeManifest);
      expect(f.runtime.inspect("queued-task")).toEqual(beforeTask);
      expect(f.calls.filter(call => call.startsWith("close:"))).toEqual([]);
      expect(f.notifications).toEqual([]);
      expect(existsSync(beforeTask.resultPath)).toBe(false);

      expect(await f.runtime.join("queued-task")).toMatchObject({ generation: 1, status: "failed", error: "Error: submission failed" });
      expect(f.manifest()).toMatchObject({ generation: 1, status: "failed", error: "Error: submission failed" });
      expect(f.calls.filter(call => call.startsWith("close:"))).toEqual(["close:tab-new"]);
      expect(f.notifications).toHaveLength(1);
    });
  }

  test("resumed queued admission cannot be replaced or removed before persistence", async () => {
    const f = setup();
    const first = await f.spawn();
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "completed", result: "first" }));
    await f.runtime.join(first.subagentId);
    const entered = gate();
    const release = gate();
    interceptPersistence(f.runtime, async (task, persist) => {
      if (task.generation === 2 && task.status === "queued") { entered.release(); await release.promise; }
      await persist();
    });
    const resumed = f.runtime.resume(first.subagentId, "again");
    await entered.promise;
    await expect(f.runtime.resume(first.subagentId, "duplicate")).rejects.toThrow("active subagent");
    await expect(f.runtime.remove(first.subagentId)).rejects.toThrow("generation admission");
    expect(f.manifest().generation).toBe(1);
    expect(existsSync(f.artifactDir)).toBe(true);
    release.release();
    expect(await resumed).toMatchObject({ generation: 2, status: "running" });
    expect(f.calls.filter(call => call === "create")).toHaveLength(2);
  });

  test("launch failure adopts a current Result and still rejects the original launch", async () => {
    const f = setup();
    const failure = new Error("command submission failed");
    f.transport.run = async () => {
      writeFileSync(join(f.artifactDir, "result-1.json"), JSON.stringify({ subagentId: "queued-task", generation: 1, status: "completed", result: "child won" }));
      throw failure;
    };
    expect(await f.spawn().catch(error => error)).toBe(failure);
    expect(f.runtime.inspect("queued-task")).toMatchObject({ status: "completed", result: "child won", error: undefined });
    expect(f.notifications).toMatchObject([{ status: "completed" }]);
  });

  test("unwritten resumed g2 does not change durable g1 until local retry succeeds", async () => {
    const f = setup();
    const first = await f.spawn();
    writeFileSync(first.sessionFile, "session\n");
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "completed", result: "first" }));
    await f.runtime.join(first.subagentId);
    const beforeManifest = readFileSync(f.manifestPath, "utf8");
    const beforeResult = readFileSync(first.resultPath, "utf8");
    let writable = false;
    interceptPersistence(f.runtime, async (task, persist) => { if (task.generation === 2 && !writable) throw new Error("EPERM g2"); await persist(); });
    await expect(f.runtime.resume(first.subagentId, "again")).rejects.toThrow("terminal persistence failed");
    expect(readFileSync(f.manifestPath, "utf8")).toBe(beforeManifest);
    const reopened = setup(f.root);
    await reopened.runtime.recover("/repo");
    expect(reopened.runtime.inspect(first.subagentId)).toMatchObject({ generation: 1, status: "completed" });
    writable = true;
    await f.runtime.recover("/repo");
    expect(f.runtime.inspect(first.subagentId)).toMatchObject({ generation: 2, status: "failed", sessionFile: first.sessionFile });
    expect(readFileSync(first.resultPath, "utf8")).toBe(beforeResult);
    expect(f.calls.filter(call => call === "create")).toHaveLength(1);
    expect(existsSync(join(f.artifactDir, "result-2.json"))).toBe(false);
  });
});

describe("reopened V2 queued recovery", () => {
  for (const identity of [{}, { tabId: "tab-g2", paneId: "pane-g2" }, { paneId: "pane-only" }, { tabId: "   ", paneId: "" }]) {
    test(`retains g1 and settles g2 with identity ${JSON.stringify(identity)}`, async () => {
      const f = setup();
      const fixture = queuedFixture(f, identity);
      const observations: unknown[] = [];
      f.runtime.onTaskUpdate(() => observations.push(f.runtime.listTasks()));
      await f.runtime.recover("/repo");
      expect(f.runtime.inspect("queued-task")).toMatchObject({ generation: 2, status: "failed", error: "launch_interrupted", queuedAt: timestamp, sessionFile: fixture.sessionFile });
      expect(f.manifest()).not.toHaveProperty("startedAt");
      expect(f.manifest()).toMatchObject({ unknown: { nested: [null, 7, "keep"] }, surfaceCleanups: [fixture.priorCleanup, { opaque: true }, { generation: 2, status: identity.tabId?.trim() ? "closed" : "identity_missing" }] });
      expect(observations).toHaveLength(1);
      expect(f.runtime.listTasks().filter(task => task.status === "queued" || task.status === "running")).toEqual([]);
      expect(readFileSync(fixture.priorResult, "utf8")).toBe(fixture.priorBytes);
      expect(readFileSync(fixture.sessionFile, "utf8")).toBe("retained session bytes\n");
      expect(existsSync(fixture.resultPath)).toBe(false);
      await f.runtime.recover("/repo");
      expect(f.calls).toEqual(identity.tabId?.trim() ? ["close:tab-g2"] : []);
      expect(f.notifications).toHaveLength(2); // Existing durable-outbox replay remains eligible.
      expect(f.notifications[0]).toMatchObject({ generation: 2, status: "failed", reason: "launch_interrupted" });
    });
  }

  for (const [body, status, error] of [
    [{ status: "completed", result: "private" }, "completed", undefined],
    [{ status: "failed", error: "child failed" }, "failed", "child failed"],
    [{ status: "cancelled" }, "cancelled", undefined],
    [{ status: "completed", generation: 1, result: "stale" }, "failed", "result_identity_mismatch"],
    [{ status: "running" }, "failed", "invalid_result_status"],
    [{ status: "completed", result: 7 }, "failed", "invalid_result"],
    ["{broken", "failed", "invalid_result"],
  ] as const) {
    for (const late of [false, true]) {
      test(`${late ? "late" : "existing"} Result ${JSON.stringify(body)} precedes interruption`, async () => {
        const f = setup();
        const fixture = queuedFixture(f, { tabId: "tab-g2", paneId: "pane-g2" });
        const bytes = typeof body === "string" ? body : JSON.stringify({ subagentId: "queued-task", generation: 2, ...body });
        const entered = gate();
        const release = gate();
        let delayed = false;
        const effects: unknown[] = [];
        f.transport.closeTab = async () => { effects.push(f.manifest()); return "closed"; };
        if (late) interceptPersistence(f.runtime, async (_task, persist) => {
          if (!delayed) { delayed = true; entered.release(); await release.promise; }
          await persist();
        });
        else writeFileSync(fixture.resultPath, bytes);
        const recovery = f.runtime.recover("/repo");
        if (late) { await entered.promise; writeFileSync(fixture.resultPath, bytes); release.release(); }
        await recovery;
        expect(f.runtime.inspect("queued-task")).toMatchObject({ status, error });
        expect(f.manifest().status).toBe(status);
        expect(effects).toMatchObject([{ status }]);
        expect((effects[0] as { error?: string }).error).toBe(error);
        expect(f.notifications).toHaveLength(1);
        expect(f.notifications[0]).toMatchObject({ status });
        expect(f.notifications[0]?.reason).toBe(error);
        expect(f.notifications[0]).not.toHaveProperty("result");
        expect(readFileSync(fixture.resultPath, "utf8")).toBe(bytes);
        expect(f.calls).toEqual([]);
      });
    }
  }

  test("launch and removal wait while recovery rebuilds its scope", async () => {
    const f = setup();
    queuedFixture(f, { tabId: "tab-g2" });
    const entered = gate();
    const release = gate();
    interceptPersistence(f.runtime, async (task, persist) => {
      if (task.generation === 2 && task.status === "failed") { entered.release(); await release.promise; }
      await persist();
    });
    const recovery = f.runtime.recover("/repo");
    await entered.promise;
    const spawn = f.runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "new", label: "new", taskSlug: "next-task" });
    let removed = false;
    const removal = f.runtime.remove("queued-task").then(() => { removed = true; });
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(f.calls).toEqual([]);
    expect(removed).toBe(false);
    expect(existsSync(f.artifactDir)).toBe(true);
    release.release();
    await recovery;
    await removal;
    expect((await spawn).status).toBe("running");
    expect(f.calls.filter(call => call.startsWith("close:"))).toEqual(["close:tab-g2"]);
  });

  test("failed terminal write remains pending until later recovery without early effects", async () => {
    const f = setup();
    queuedFixture(f, { tabId: "tab-g2", paneId: "pane-g2" });
    let failures = 1;
    interceptPersistence(f.runtime, async (_task, persist) => { if (failures-- > 0) throw new Error("EPERM terminal"); await persist(); });
    await expect(f.runtime.recover("/repo")).rejects.toThrow("EPERM terminal");
    expect(f.manifest().status).toBe("queued");
    expect(f.calls).toEqual([]);
    expect(f.notifications).toEqual([]);
    await f.runtime.recover("/repo");
    expect(f.manifest()).toMatchObject({ status: "failed", error: "launch_interrupted" });
    expect(f.calls).toEqual(["close:tab-g2"]);
  });

  test("pending intent retries cleanup only once in a recovery invocation", async () => {
    const f = setup();
    queuedFixture(f, { tabId: "tab-g2" });
    let writable = false;
    interceptPersistence(f.runtime, async (_task, persist) => { if (!writable) throw new Error("EPERM intent"); await persist(); });
    f.transport.closeTab = async id => { f.calls.push(`close:${id}`); throw new Error("close unavailable"); };
    await expect(f.runtime.recover("/repo")).rejects.toThrow("EPERM intent");
    writable = true;
    await f.runtime.recover("/repo");
    expect(f.calls).toEqual(["close:tab-g2"]);
    expect(f.notifications).toHaveLength(1);
    expect(f.manifest().surfaceCleanups[2]).toMatchObject({ status: "failed", error: "close unavailable" });
  });

  test("Result arriving during close is durable before notification", async () => {
    const f = setup();
    const fixture = queuedFixture(f, { tabId: "tab-g2" });
    f.transport.closeTab = async () => {
      writeFileSync(fixture.resultPath, JSON.stringify({ subagentId: "queued-task", generation: 2, status: "completed", result: "late" }));
      return "closed";
    };
    const durableNotifications: unknown[] = [];
    f.runtime.setCompletionNotifier(async value => { durableNotifications.push({ notification: value, manifest: f.manifest() }); });
    await f.runtime.recover("/repo");
    expect(durableNotifications).toMatchObject([{ notification: { status: "completed" }, manifest: { status: "completed" } }]);
    expect(f.runtime.inspect("queued-task").result).toBe("late");
  });

  test("cleanup outcome write failure is explicit and retry does not close twice", async () => {
    const f = setup();
    queuedFixture(f, { tabId: "tab-g2" });
    let fail = true;
    interceptPersistence(f.runtime, async (task, persist) => {
      if (fail && task.surfaceCleanups?.some(value => (value as { generation?: number; status?: string }).generation === 2 && (value as { status?: string }).status === "closed")) throw new Error("EPERM cleanup outcome");
      await persist();
    });
    await expect(f.runtime.recover("/repo")).rejects.toThrow("EPERM cleanup outcome");
    expect(f.calls).toEqual(["close:tab-g2"]);
    expect(f.notifications).toEqual([]);
    expect(f.manifest().surfaceCleanups[2].status).toBe("pending");
    fail = false;
    await f.runtime.recover("/repo");
    expect(f.calls).toEqual(["close:tab-g2"]);
    expect(f.manifest().surfaceCleanups[2].status).toBe("closed");
  });
});

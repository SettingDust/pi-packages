import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import activateSubagents, { AgentRegistry, SubagentRuntime, TaskIdAllocationError, createSubagentTools, type HerdrTransport } from "../src/index.js";

function transport() {
  const calls: string[] = [];
  const value: HerdrTransport = {
    async createTab() { calls.push("create"); return { tabId: "tab-1", paneId: "pane-1" }; },
    async run() { calls.push("run"); },
    async sendText() {},
    async closePane() {},
    async paneExists() { return true; },
  };
  return { calls, value };
}

function registry(): AgentRegistry {
  const value = new AgentRegistry();
  value.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nHandler" }]);
  return value;
}

function runtime(root = mkdtempSync(join(tmpdir(), "task-id-"))) {
  const fake = transport();
  return { root, fake, runtime: new SubagentRuntime(fake.value, registry(), root) };
}

function spawn(value: SubagentRuntime, root: string, taskSlug = "fix-steer-submit") {
  return value.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "Repair steer input submission", taskSlug, parentSessionFile: join(root, "parent.jsonl") });
}

function expectAllocation(error: unknown, code: TaskIdAllocationError["code"], message: string) {
  expect(error).toBeInstanceOf(TaskIdAllocationError);
  expect(error).toMatchObject({ name: "TaskIdAllocationError", code, message });
}

describe("task-derived subagent IDs", () => {
  test("validates exact slugs before filesystem or Herdr side effects", async () => {
    const invalid: unknown[] = [undefined, "ab", "a".repeat(49), "Fix-task", "fix task", "fix.task", "fix/task", "fix_task", "fix--task", "fix-task-", "-fix-task", "subagent-1"];
    for (const taskSlug of invalid) {
      const { root, fake, runtime: value } = runtime();
      let failure: unknown;
      try {
        await value.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "Repair steer input submission", taskSlug: taskSlug as string, parentSessionFile: join(root, "parent.jsonl") });
      } catch (error) { failure = error; }
      expectAllocation(failure, "invalid_task_slug", "Invalid task slug.");
      expect(fake.calls).toEqual([]);
      expect(existsSync(join(root, "tasks"))).toBeFalse();
    }

    const minimum = runtime();
    await expect(spawn(minimum.runtime, minimum.root, "con")).resolves.toMatchObject({ subagentId: "con" });
    const maximum = runtime();
    await expect(spawn(maximum.runtime, maximum.root, "a".repeat(48))).resolves.toMatchObject({ subagentId: "a".repeat(48) });
  });

  test("reserves base then ordered suffixes across artifacts and sessions", async () => {
    const first = runtime();
    const tasks = join(first.root, "tasks");
    mkdirSync(tasks, { recursive: true });
    mkdirSync(join(tasks, "fix-steer-submit-artifacts"));
    const second = await spawn(first.runtime, first.root);
    expect(second.subagentId).toBe("fix-steer-submit-2");
    writeFileSync(join(tasks, "fix-steer-submit-3-g1.jsonl"), "");
    const third = await spawn(first.runtime, first.root);
    expect(third.subagentId).toBe("fix-steer-submit-4");
  });

  test("classifies exhaustion and filesystem failures without opening a tab or pane", async () => {
    const exhausted = runtime();
    const tasks = join(exhausted.root, "tasks");
    mkdirSync(tasks, { recursive: true });
    for (let suffix = 1; suffix <= 100; suffix++) {
      const id = suffix === 1 ? "fix-steer-submit" : `fix-steer-submit-${suffix}`;
      mkdirSync(join(tasks, `${id}-artifacts`));
    }
    let exhaustion: unknown;
    try { await spawn(exhausted.runtime, exhausted.root); } catch (error) { exhaustion = error; }
    expectAllocation(exhaustion, "task_id_exhausted", "Task ID allocation exhausted.");
    expect(exhausted.fake.calls).toEqual([]);

    const fileRoot = join(mkdtempSync(join(tmpdir(), "task-id-file-")), "root");
    writeFileSync(fileRoot, "not a directory");
    const filesystem = runtime(fileRoot);
    let failure: unknown;
    try { await spawn(filesystem.runtime, fileRoot); } catch (error) { failure = error; }
    expectAllocation(failure, "filesystem_reservation_failed", "Task ID filesystem reservation failed.");
    expect((failure as TaskIdAllocationError).cause).toBeDefined();
    expect(filesystem.fake.calls).toEqual([]);
  });

  test("persists final canonical identity, recovers canonical and legacy records, and reuses after removal", async () => {
    const original = runtime();
    const canonical = await spawn(original.runtime, original.root);
    expect(canonical).toMatchObject({ subagentId: "fix-steer-submit", taskSlug: "fix-steer-submit" });
    const manifest = JSON.parse(await Bun.file(join(original.root, "tasks", "fix-steer-submit-artifacts", "task.json")).text());
    expect(manifest).toMatchObject({ version: 2, subagentId: "fix-steer-submit", taskSlug: "fix-steer-submit", sessionFile: canonical.sessionFile });
    writeFileSync(canonical.resultPath, JSON.stringify({ subagentId: canonical.subagentId, generation: 1, status: "completed", result: "done" }));
    const rebuilt = runtime(original.root);
    await rebuilt.runtime.recover("/repo", join(original.root, "parent.jsonl"));
    expect(rebuilt.runtime.inspect("fix-steer-submit")).toMatchObject({ subagentId: "fix-steer-submit", status: "completed" });
    const malformedArtifacts = join(original.root, "tasks", "invalid-canonical-artifacts");
    mkdirSync(malformedArtifacts);
    writeFileSync(join(malformedArtifacts, "task.json"), JSON.stringify({ ...manifest, subagentId: "invalid-canonical", taskSlug: "other-task", sessionFile: join(original.root, "tasks", "invalid-canonical-g1.jsonl") }));
    await rebuilt.runtime.recover("/repo", join(original.root, "parent.jsonl"));
    expect(() => rebuilt.runtime.inspect("invalid-canonical")).toThrow("Unknown subagent");
    expect(rebuilt.runtime.inspect("fix-steer-submit")).toMatchObject({ subagentId: "fix-steer-submit", status: "completed" });
    await rebuilt.runtime.remove("fix-steer-submit");
    const reused = runtime(original.root);
    await expect(spawn(reused.runtime, reused.root)).resolves.toMatchObject({ subagentId: "fix-steer-submit" });

    const legacy = runtime();
    const legacyTasks = join(legacy.root, "tasks");
    const legacyArtifacts = join(legacyTasks, "subagent-1-artifacts");
    mkdirSync(legacyArtifacts, { recursive: true });
    const sessionFile = join(legacyTasks, "subagent-1-g1.jsonl");
    writeFileSync(join(legacyArtifacts, "task.json"), JSON.stringify({
      version: 1, subagentId: "subagent-1", generation: 1, agent: "handler", cwd: "/repo", label: "Legacy task", sessionFile,
      status: "completed", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    }));
    writeFileSync(join(legacyArtifacts, "result-1.json"), JSON.stringify({ subagentId: "subagent-1", generation: 1, status: "completed", result: "legacy" }));
    await legacy.runtime.recover("/repo", join(legacy.root, "parent.jsonl"));
    expect(legacy.runtime.inspect("subagent-1")).toMatchObject({ subagentId: "subagent-1", status: "completed" });
  });

  test("exposes stable missing-slug errors through the spawn tool", async () => {
    const configured = runtime();
    const tool = createSubagentTools(configured.runtime, "/repo", join(configured.root, "parent.jsonl"))[0]!;
    let failure: unknown;
    try { await (tool.execute as any)("tool-call", { agent: "handler", prompt: "work", label: "Task" }); } catch (error) { failure = error; }
    expectAllocation(failure, "invalid_task_slug", "Invalid task slug.");
    expect(configured.fake.calls).toEqual([]);
  });
});


test("legacy numeric tasks recover, resume, and remove without renaming", async () => {
  const legacy = runtime();
  const tasks = join(legacy.root, "tasks");
  const artifacts = join(tasks, "subagent-7-artifacts");
  mkdirSync(artifacts, { recursive: true });
  const sessionFile = join(tasks, "subagent-7-g1.jsonl");
  writeFileSync(sessionFile, "");
  writeFileSync(join(artifacts, "task.json"), JSON.stringify({
    version: 1, subagentId: "subagent-7", generation: 1, agent: "handler", cwd: "/repo", label: "Legacy task", sessionFile,
    tabId: "legacy-tab", paneId: "legacy-pane", status: "completed", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  }));
  writeFileSync(join(artifacts, "result-1.json"), JSON.stringify({ subagentId: "subagent-7", generation: 1, status: "completed", result: "legacy" }));
  await legacy.runtime.recover("/repo", join(legacy.root, "parent.jsonl"));
  const resumed = await legacy.runtime.resume("subagent-7", "continue");
  expect(resumed).toMatchObject({ subagentId: "subagent-7", generation: 2, sessionFile, resultPath: join(artifacts, "result-2.json") });
  await legacy.runtime.cancel("subagent-7");
  await legacy.runtime.remove("subagent-7");
  expect(existsSync(sessionFile)).toBeFalse();
  expect(existsSync(artifacts)).toBeFalse();
});

test("reserves unique IDs from separate processes racing on one artifact directory", async () => {
  const root = mkdtempSync(join(tmpdir(), "task-id-process-race-"));
  const workerPath = join(import.meta.dir, "task-derived-id-worker.ts");
  const launch = (id: string) => Bun.spawn([process.execPath, workerPath, root, id], { stdout: "pipe", stderr: "pipe" });
  const left = launch("left");
  const right = launch("right");
  const ready = (id: string) => join(root, "barrier", `ready-${id}`);
  let released = false;
  try {
    const deadline = Date.now() + 5000;
    while (!existsSync(ready("left")) || !existsSync(ready("right"))) {
      if (Date.now() >= deadline) throw new Error("Timed out waiting for allocation workers");
      await Bun.sleep(10);
    }
    writeFileSync(join(root, "barrier", "release"), "go");
    released = true;

    const leftExit = await left.exited;
    const leftOutput = await new Response(left.stdout).text();
    const rightExit = await right.exited;
    const rightOutput = await new Response(right.stdout).text();
    expect(leftExit).toBe(0);
    expect(rightExit).toBe(0);
    const ids = [JSON.parse(leftOutput).subagentId, JSON.parse(rightOutput).subagentId].sort();
    expect(ids).toEqual(["concurrent-task", "concurrent-task-2"]);
    expect(existsSync(join(root, "tasks", "concurrent-task-artifacts"))).toBeTrue();
    expect(existsSync(join(root, "tasks", "concurrent-task-2-artifacts"))).toBeTrue();
  } finally {
    if (!released) writeFileSync(join(root, "barrier", "release"), "go");
    left.kill();
    right.kill();
  }
});


test("completion notification recovery accepts only supported current-branch correlations", async () => {
  const runtime = new SubagentRuntime({
    async createTab() { return { tabId: "tab", paneId: "pane" }; }, async run() {}, async sendText() {}, async closePane() {}, async paneExists() { return true; },
  }, new AgentRegistry());
  const handlers: Record<string, (event: unknown, ctx: any) => Promise<void>> = {};
  const previous = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  try {
    activateSubagents({
      on(event: string, handler: (event: unknown, ctx: any) => Promise<void>) { handlers[event] = handler; },
      sendMessage() {}, registerTool() {}, getActiveTools() { return []; }, setActiveTools() {},
    } as any, { runtime, registry: { async discover() {} } as any });
    const entries = ["fix-steer-submit-2", "task-101", "task-02", "subagent-1", "fix-steer-submit-101", "subagent-01"].map(subagentId => ({
      type: "custom_message", customType: "pi-herdr-subagent-completion", details: { schema: "pi-herdr-subagent-completion/v1", subagentId, generation: 1, status: "completed", label: "task" },
    }));
    const observed: string[] = [];
    (runtime.recover as any) = async (_cwd: string, _parent: string, keys: string[]) => { observed.push(...keys); };
    await handlers.session_start!({}, { cwd: "/repo", sessionManager: { getSessionFile: () => "/repo/parent.jsonl", getBranch: () => entries }, ui: { setWidget() {} } });
    expect(observed).toEqual([
      "pi-herdr-subagent-completion/v1:fix-steer-submit-2:1:completed",
      "pi-herdr-subagent-completion/v1:task-101:1:completed",
      "pi-herdr-subagent-completion/v1:task-02:1:completed",
      "pi-herdr-subagent-completion/v1:subagent-1:1:completed",
      "pi-herdr-subagent-completion/v1:fix-steer-submit-101:1:completed",
    ]);
  } finally {
    if (previous === undefined) delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    else process.env.PI_HERDR_SUBAGENT_RESULT_PATH = previous;
  }
});

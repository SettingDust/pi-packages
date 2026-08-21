import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgentRegistry, SubagentRuntime, type HerdrTransport, type TaskRecordV1 } from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function writeV1(root: string, status: TaskRecordV1["status"], options: {
  subagentId?: string;
  taskSlug?: string;
  paneId?: string;
  result?: unknown;
  unknown?: Record<string, unknown>;
} = {}): string {
  const subagentId = options.subagentId ?? "legacy-task";
  const taskSlug = options.taskSlug ?? "legacy-task";
  const tasksDir = join(root, "tasks");
  const artifactDir = join(tasksDir, `${subagentId}-artifacts`);
  mkdirSync(artifactDir, { recursive: true });
  const sessionFile = join(tasksDir, `${subagentId}-g1.jsonl`);
  writeFileSync(sessionFile, "");
  const record: TaskRecordV1 = {
    ...options.unknown,
    version: 1,
    subagentId,
    taskSlug,
    generation: 1,
    agent: "handler",
    cwd: "/repo",
    label: "legacy",
    sessionFile,
    tabId: options.paneId ? "tab-1" : undefined,
    paneId: options.paneId,
    status,
    createdAt,
    updatedAt: createdAt,
  };
  writeFileSync(join(artifactDir, "task.json"), JSON.stringify(record));
  if (options.result !== undefined) writeFileSync(join(artifactDir, "result-1.json"), JSON.stringify(options.result));
  return artifactDir;
}

function transport(pane: true | false | Error, calls: string[]): HerdrTransport {
  return {
    async createTab() { throw new Error("not used"); },
    async run() {},
    async sendText() {},
    async closePane() {},
    async closeTab() { return "closed"; },
    async paneExists(paneId) {
      calls.push(paneId);
      if (pane instanceof Error) throw pane;
      return pane;
    },
  };
}

function handlerRegistry(): AgentRegistry {
  const registry = new AgentRegistry();
  registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nHandler" }]);
  return registry;
}

describe("queue admission", () => {
  test("persists queued before exposure, then persists running before its invalidation", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-queue-"));
    const deferred = transport(true, []);
    let admit!: (surface: { tabId: string; paneId: string }) => void;
    deferred.createTab = async () => new Promise(resolve => { admit = resolve; });
    const runtime = new SubagentRuntime(deferred, handlerRegistry(), root);
    const manifestPath = join(root, "tasks", "queued-task-artifacts", "task.json");
    const persistedStatuses: string[] = [];
    let observeQueued!: () => void;
    const queuedObserved = new Promise<void>(resolve => { observeQueued = resolve; });
    runtime.onTaskUpdate(() => {
      const status = JSON.parse(readFileSync(manifestPath, "utf8")).status;
      persistedStatuses.push(status);
      if (status === "queued") observeQueued();
    });

    const pending = runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "queued", taskSlug: "queued-task" });
    await queuedObserved;
    expect(persistedStatuses).toEqual(["queued"]);
    const recovered = new SubagentRuntime(transport(true, []), new AgentRegistry(), root);
    await recovered.recover("/repo");
    expect(recovered.listTasks()[0]).toMatchObject({ status: "queued", queuedAt: expect.any(String) });
    recovered.stop();

    admit({ tabId: "tab-1", paneId: "pane-1" });
    const task = await pending;
    expect(task.status).toBe("running");
    expect(persistedStatuses).toEqual(["queued", "running"]);
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "done" }));
    await runtime.join(task.subagentId);
    expect(persistedStatuses).toEqual(["queued", "running", "completed"]);
    runtime.stop();
  });
});

describe("V1 lifecycle migration", () => {
  test("maps starting with a retained pane to V2 running using the compatibility start", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-v1-running-"));
    const artifactDir = writeV1(root, "starting", { paneId: "pane-1" });
    const calls: string[] = [];
    const runtime = new SubagentRuntime(transport(true, calls), new AgentRegistry(), root);
    await runtime.recover("/repo");
    expect(runtime.listTasks()[0]).toMatchObject({ status: "running", queuedAt: createdAt, startedAt: createdAt });
    expect(calls).toEqual(["pane-1"]);
    expect(JSON.parse(readFileSync(join(artifactDir, "task.json"), "utf8"))).toMatchObject({
      version: 2, status: "running", queuedAt: createdAt, startedAt: createdAt,
    });
    runtime.stop();
  });

  test("settles starting migration from Result before pane evidence", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-v1-result-"));
    const artifactDir = writeV1(root, "starting", {
      paneId: "pane-1",
      result: { subagentId: "legacy-task", generation: 1, status: "completed", result: "private" },
    });
    const calls: string[] = [];
    const runtime = new SubagentRuntime(transport(false, calls), new AgentRegistry(), root);
    await runtime.recover("/repo");
    expect(runtime.listTasks()[0]).toMatchObject({ status: "completed", queuedAt: createdAt });
    expect(runtime.listTasks()[0]).not.toHaveProperty("result");
    expect(calls).toEqual([]);
    expect(JSON.parse(readFileSync(join(artifactDir, "task.json"), "utf8"))).toMatchObject({ version: 2, status: "completed" });
  });

  test("rejects a malformed Result from a V1 running record and preserves identity through the recovery rewrite", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-v1-malformed-result-"));
    const subagentId = "phase-a-2";
    const taskSlug = "phase-a";
    const unknown = {
      unknownScalar: "preserve me",
      unknownObject: { nested: ["value", 3] },
      unknownArray: ["value", { nested: true }],
      unknownNull: null,
      surfaceCleanups: [{ opaque: { phase: "future" } }, null],
    };
    const artifactDir = writeV1(root, "running", { subagentId, taskSlug, paneId: "pane-1", unknown });
    const sessionFile = join(root, "tasks", `${subagentId}-g1.jsonl`);
    const resultPath = join(artifactDir, "result-1.json");
    const calls: string[] = [];
    const runtime = new SubagentRuntime(transport(true, calls), handlerRegistry(), root);

    await runtime.recover("/repo");
    expect(runtime.inspect(subagentId)).toMatchObject({
      subagentId, taskSlug, generation: 1, status: "running", sessionFile, resultPath, tabId: "tab-1", paneId: "pane-1",
    });
    expect(JSON.parse(readFileSync(join(artifactDir, "task.json"), "utf8"))).toMatchObject({
      version: 2, subagentId, taskSlug, generation: 1, sessionFile, status: "running", ...unknown,
    });

    const malformed = { subagentId, generation: 1, status: "completed", result: 7 };
    writeFileSync(resultPath, JSON.stringify(malformed));
    await expect(runtime.join(subagentId)).resolves.toMatchObject({
      subagentId, taskSlug, generation: 1, status: "failed", error: "invalid_result", sessionFile, resultPath, tabId: "tab-1", paneId: "pane-1",
    });
    const rewritten = JSON.parse(readFileSync(join(artifactDir, "task.json"), "utf8"));
    expect(rewritten).toMatchObject({
      version: 2,
      subagentId,
      taskSlug,
      generation: 1,
      sessionFile,
      status: "failed",
      error: "invalid_result",
      unknownScalar: unknown.unknownScalar,
      unknownObject: unknown.unknownObject,
      unknownArray: unknown.unknownArray,
      unknownNull: unknown.unknownNull,
    });
    expect(rewritten.surfaceCleanups.slice(0, 2)).toEqual(unknown.surfaceCleanups);
    expect(rewritten.surfaceCleanups[2]).toMatchObject({ generation: 1, tabId: "tab-1", paneId: "pane-1", status: "closed" });
    expect(JSON.parse(readFileSync(resultPath, "utf8"))).toEqual(malformed);
    expect(calls).toEqual(["pane-1"]);
    runtime.stop();
  });

  test("ignores a V1 canonical record whose ID and slug disagree without rewriting retained files", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-v1-mismatched-identity-"));
    const subagentId = "phase-a-2";
    const artifactDir = writeV1(root, "running", {
      subagentId,
      taskSlug: "phase-b",
      paneId: "pane-1",
      result: { subagentId, generation: 1, status: "completed", result: "retained" },
    });
    const manifestPath = join(artifactDir, "task.json");
    const resultPath = join(artifactDir, "result-1.json");
    const manifest = readFileSync(manifestPath, "utf8");
    const result = readFileSync(resultPath, "utf8");
    const calls: string[] = [];
    const runtime = new SubagentRuntime(transport(true, calls), handlerRegistry(), root);

    await runtime.recover("/repo");

    expect(runtime.listTasks()).toEqual([]);
    expect(() => runtime.inspect(subagentId)).toThrow("Unknown subagent");
    expect(calls).toEqual([]);
    expect(readFileSync(manifestPath, "utf8")).toBe(manifest);
    expect(readFileSync(resultPath, "utf8")).toBe(result);
    runtime.stop();
  });

  test("maps missing and failed pane verification to the existing failure reasons", async () => {
    for (const [pane, expected] of [[false, "pane_closed"], [new Error("unavailable"), "pane_verification_failed: unavailable"]] as const) {
      const root = mkdtempSync(join(tmpdir(), "subagent-v1-failed-"));
      const artifactDir = writeV1(root, "starting", { paneId: "pane-1" });
      const runtime = new SubagentRuntime(transport(pane, []), new AgentRegistry(), root);
      await runtime.recover("/repo");
      expect(runtime.inspect("legacy-task")).toMatchObject({ status: "failed", error: expected });
      expect(JSON.parse(readFileSync(join(artifactDir, "task.json"), "utf8"))).toMatchObject({ version: 2, status: "failed", error: expected });
    }

    const root = mkdtempSync(join(tmpdir(), "subagent-v1-no-pane-"));
    writeV1(root, "starting");
    const runtime = new SubagentRuntime(transport(true, []), new AgentRegistry(), root);
    await runtime.recover("/repo");
    expect(runtime.inspect("legacy-task")).toMatchObject({ status: "failed", error: "pane_closed" });
  });

  test("migrates V1 running and terminal records and rejects invalid V2 lifecycle fields", async () => {
    const runningRoot = mkdtempSync(join(tmpdir(), "subagent-v1-direct-running-"));
    writeV1(runningRoot, "running", { paneId: "pane-1" });
    const running = new SubagentRuntime(transport(true, []), new AgentRegistry(), runningRoot);
    await running.recover("/repo");
    expect(running.listTasks()[0]).toMatchObject({ status: "running", queuedAt: createdAt, startedAt: createdAt });
    running.stop();

    const terminalRoot = mkdtempSync(join(tmpdir(), "subagent-v1-terminal-"));
    const artifactDir = writeV1(terminalRoot, "cancelled");
    const terminal = new SubagentRuntime(transport(true, []), new AgentRegistry(), terminalRoot);
    await terminal.recover("/repo");
    expect(terminal.listTasks()[0]).toMatchObject({ status: "cancelled", queuedAt: createdAt });
    expect(JSON.parse(readFileSync(join(artifactDir, "task.json"), "utf8"))).toMatchObject({ version: 2, status: "cancelled" });

    for (const overrides of [
      { queuedAt: undefined },
      { queuedAt: "invalid" },
      { updatedAt: undefined },
      { updatedAt: "invalid" },
      { status: "running", startedAt: undefined },
      { status: "running", startedAt: "invalid" },
    ]) {
      const invalidRoot = mkdtempSync(join(tmpdir(), "subagent-v2-invalid-"));
      const invalidArtifact = writeV1(invalidRoot, "cancelled");
      const { createdAt: _createdAt, ...base } = JSON.parse(readFileSync(join(invalidArtifact, "task.json"), "utf8"));
      writeFileSync(join(invalidArtifact, "task.json"), JSON.stringify({
        ...base,
        version: 2,
        queuedAt: createdAt,
        updatedAt: createdAt,
        ...overrides,
      }));
      const rejected = new SubagentRuntime(transport(true, []), new AgentRegistry(), invalidRoot);
      await rejected.recover("/repo");
      expect(rejected.listTasks()).toEqual([]);
    }
  });

  test("preserves distinct V2 lifecycle timestamps during recovery", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagent-v2-timestamps-"));
    const artifactDir = writeV1(root, "running", { paneId: "pane-1" });
    const { createdAt: _createdAt, ...base } = JSON.parse(readFileSync(join(artifactDir, "task.json"), "utf8"));
    const queuedAt = "2026-01-01T00:00:01.000Z";
    const startedAt = "2026-01-01T00:00:02.000Z";
    const updatedAt = "2026-01-01T00:00:03.000Z";
    writeFileSync(join(artifactDir, "task.json"), JSON.stringify({
      ...base,
      version: 2,
      status: "running",
      queuedAt,
      startedAt,
      updatedAt,
    }));

    const runtime = new SubagentRuntime(transport(true, []), new AgentRegistry(), root);
    await runtime.recover("/repo");
    expect(runtime.listTasks()[0]).toMatchObject({ status: "running", queuedAt, startedAt, updatedAt });
    expect(JSON.parse(readFileSync(join(artifactDir, "task.json"), "utf8"))).toMatchObject({
      version: 2,
      status: "running",
      queuedAt,
      startedAt,
      updatedAt,
    });
    runtime.stop();
  });
});

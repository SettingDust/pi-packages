Perform an independent correctness review. Do not edit anything. All relevant source is attached below. Focus only on performance changes: unchanged V2 terminal recovery skips initial persist and timestamp update; image cleanup performs cheap nonredirected discovery then full safety validation only for candidates, retained owners or explicit removal. Confirm changed Result/cleanup intent still persists before side effects, cleanup retry, notification replay, V1 migration, unknown data and filesystem safety remain. Result text is deliberately not persisted in TaskRecord; comparison removes only transient result. Give actionable blockers with exact methods and reasoning, or say no blockers found with limits. Do not run tools.

## SubagentRuntime.recoverScope
method recoverScope  index.ts:615-703

  private async recoverScope(cwd: string, parentSessionFile: string | undefined, notifiedKeys: Iterable<string>): Promise<void> {
    const completionNotifier = this.completionNotifier;
    const tasksDir = this.tasksDir(cwd, parentSessionFile);
    // Same-scope reconstruction owns cleanup and notification after retrying durable intent.
    await this.awaitAllOperations(this.activeTasksDir !== resolve(tasksDir));
    this.selectScope(tasksDir);
    this.stop();
    this.tasks.clear();
    this.manifestUnknown.clear();
    for (const key of notifiedKeys) this.notified.add(key);
    if (!existsSync(tasksDir)) {
      this.notifyTaskUpdate();
      return;
    }
    for (const entry of readdirSync(tasksDir, { withFileTypes: true })) {
      const match = entry.name.match(/^(.+)-artifacts$/);
      if (!entry.isDirectory() || !match) continue;
      const subagentId = match[1]!;
      const artifactDir = join(tasksDir, entry.name);
      const record = this.readTaskRecord(join(artifactDir, "task.json"), tasksDir, artifactDir, subagentId);
      if (!record) continue;
      this.manifestUnknown.set(subagentId, manifestUnknownFields(record as unknown as Json));
      const task = this.taskFromRecord(record, artifactDir);
      if (record.notifiedGeneration === record.generation) this.notified.add(this.taskKey(task));
      const result = existsSync(task.resultPath) ? this.readResult(task) : undefined;
      if (result?.valid) {
        if (task.status !== result.status || task.error !== result.error) task.updatedAt = new Date().toISOString();
        task.status = result.status;
        task.result = result.result;
        task.error = result.error;
      } else if (result && !result.valid) {
        if (task.status !== "failed" || task.error !== result.error) task.updatedAt = new Date().toISOString();
        task.status = "failed";
        task.error = result.error;
      } else if (record.version === 2 && record.status === "queued") {
        task.status = "failed";
        task.error = "launch_interrupted";
        task.updatedAt = new Date().toISOString();
      } else if (record.version === 1 && record.status === "starting") {
        if (task.paneId) {
          try {
            if (await this.transport.paneExists(task.paneId)) {
              task.status = "running";
              task.startedAt = record.createdAt;
            } else {
              task.status = "failed";
              task.error = "pane_closed";
            }
          } catch (error) {
            task.status = "failed";
            task.error = `pane_verification_failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        } else {
          task.status = "failed";
          task.error = "pane_closed";
        }
        task.updatedAt = new Date().toISOString();
      } else if (task.status === "running") {
        if (task.paneId) {
          try {
            if (!await this.transport.paneExists(task.paneId)) {
              task.status = "failed";
              task.error = "pane_closed";
              task.updatedAt = new Date().toISOString();
            }
          } catch (error) {
            task.status = "failed";
            task.error = `pane_verification_failed: ${error instanceof Error ? error.message : String(error)}`;
            task.updatedAt = new Date().toISOString();
          }
        } else {
          task.status = "failed";
          task.error = "pane_closed";
          task.updatedAt = new Date().toISOString();
        }
      }
      this.tasks.set(task.subagentId, task);
      if (isTerminalStatus(task.status)) {
        await this.settle(task, task.status, completionNotifier, task.result, task.error, false, false, record);
      } else {
        this.prepareRecoveryCleanups(task);
        await this.persist(task);
        if (task.status === "running") this.startMonitor(task);
        await this.runPendingCleanups(task);
        this.cleanupImageInputs(task); // Older orphan generations only; the retained child owns the current input.
      }
    }
    this.notifyTaskUpdate();
  }

result ok
usage tokens=1032 elapsed-ms=0 bytes=4126 truncated=false

## SubagentRuntime.settle
method settle  index.ts:1132-1174

  private settle(
    task: SubagentTask,
    status: Exclude<TaskStatus, ActiveTaskStatus>,
    completionNotifier: CompletionNotifier | undefined,
    result?: string,
    error?: string,
    notCreated = false,
    writeCancelledResult = false,
    recovering?: TaskRecord,
  ): Promise<void> {
    const key = this.taskKey(task);
    const existing = this.settlements.get(key);
    if (existing) return existing;
    if (this.pendingSettlements.has(key)) return this.retrySettlement(key);
    if (!recovering && !isActiveStatus(task.status)) return Promise.resolve();
    this.pendingSettlements.set(key, async effects => {
      this.stopMonitor(task);
      if (writeCancelledResult && !existsSync(task.resultPath)) {
        await writeAtomic(task.resultPath, { subagentId: task.subagentId, generation: task.generation, status: "cancelled" });
      }
      task.status = status;
      task.result = result;
      task.error = error;
      if (!recovering) task.updatedAt = new Date().toISOString();
      this.applyCurrentResult(task);
      this.prepareCleanup(task, notCreated);
      if (recovering) this.prepareRecoveryCleanups(task);
      // A matching Result is loaded into memory, not persisted in the manifest.
      // Keep all settlement/recheck effects, but do not rewrite unchanged V2 state.
      if (!recovering || recovering.version === 1 || !isDeepStrictEqual(
        { ...task, result: undefined },
        { ...this.taskFromRecord(recovering, dirname(task.resultPath)), result: undefined },
      )) await this.persist(task);
      await this.reconcileCurrentResult(task);
      if (!effects) return;
      if (!this.recovery) this.notifyTaskUpdate();
      await this.runPendingCleanups(task);
      this.cleanupImageInputs(task);
      await this.reconcileCurrentResult(task);
      await this.notifyTerminal(task, completionNotifier);
    });
    return this.retrySettlement(key);
  }

result ok
usage tokens=488 elapsed-ms=0 bytes=1950 truncated=false

## SubagentRuntime.cleanupImageInputs
method cleanupImageInputs  index.ts:1278-1315

  private cleanupImageInputs(task: SubagentTask, removing = false): boolean {
    if (this.tasks.get(task.subagentId) !== task || this.launches.has(`${task.subagentId}:${task.generation + 1}`)) return false;
    try {
      const artifactDir = dirname(task.resultPath);
      const directory = lstatSync(artifactDir);
      if (!directory.isDirectory() || directory.isSymbolicLink()
        || relative(resolve(artifactDir), realpathSync(artifactDir)) !== "") throw new Error();
      // Discover names only; absence needs no recursive image-storage validation.
      const generations = new Set<number>();
      for (const key of this.imageCleanups.keys()) {
        if (key.startsWith(`${task.subagentId}:`)) generations.add(Number(key.slice(task.subagentId.length + 1)));
      }
      for (const name of readdirSync(dirname(task.resultPath))) {
        if (!name.startsWith("image-input-")) continue;
        const value = name.slice("image-input-".length);
        const generation = Number(value);
        if (!Number.isSafeInteger(generation) || generation < 1 || String(generation) !== value || generation > task.generation) {
          if (removing) throw new Error();
          continue;
        }
        generations.add(generation);
      }
      if (!generations.size && !removing) return true;
      this.imageInputDirectory(task); // Full scope/ancestor checks before cleanup or artifact removal.
      let succeeded = true;
      for (const generation of generations) {
        if (generation > task.generation || (generation === task.generation && isActiveStatus(task.status) && !removing)) continue;
        try {
          const cleanup = this.imageCleanups.get(`${task.subagentId}:${generation}`);
          if (cleanup) cleanup();
          else cleanupImages({ ...task, generation, resultPath: join(dirname(task.resultPath), `result-${generation}.json`) });
        } catch { succeeded = false; }
      }
      if (succeeded) return true;
    } catch { /* Safe stage/identity only, never a filesystem exception or payload. */ }
    warnSafely(console.warn, `Image input cleanup failed for ${task.subagentId} generation ${task.generation}.`);
    return false;
  }

result ok
usage tokens=558 elapsed-ms=0 bytes=2232 truncated=false

## SubagentRuntime.taskFromRecord
method taskFromRecord  index.ts:1366-1381

  private taskFromRecord(record: TaskRecord, artifactDir: string): SubagentTask {
    const queuedAt = record.version === 1 ? record.createdAt : record.queuedAt;
    const startedAt = record.version === 1
      ? record.status === "running" ? record.createdAt : undefined
      : record.startedAt;
    const status: TaskStatus = record.version === 1
      ? record.status === "starting" ? "queued" : record.status
      : record.status;
    return {
      subagentId: record.subagentId, taskSlug: record.taskSlug, generation: record.generation, agent: record.agent, cwd: record.cwd, label: record.label,
      model: record.model, thinking: record.thinking, sessionFile: record.sessionFile,
      resultPath: join(artifactDir, `result-${record.generation}.json`), tabId: record.tabId ?? "", paneId: record.paneId ?? "",
      status, createdAt: queuedAt, queuedAt, ...(startedAt ? { startedAt } : {}), updatedAt: record.updatedAt, error: record.error,
      ...(Array.isArray((record as unknown as Json).surfaceCleanups) ? { surfaceCleanups: cloneJson((record as unknown as Json).surfaceCleanups as unknown[]) } : {}),
    };
  }

result ok
usage tokens=293 elapsed-ms=0 bytes=1172 truncated=false

Missing body: SubagentRuntime.applyResult Error: Symbol "SubagentRuntime.applyResult" not found in index.ts. Did you mean: SubagentRuntime? Warnings: Callback list truncated to 25 of 42 entries

result error
usage tokens=36 elapsed-ms=0 bytes=144 truncated=false

## SubagentRuntime.persist
method persist  index.ts:1350-1364

  private async persist(task: SubagentTask): Promise<void> {
    // Publication ownership outlives launch failure and guards terminal retries;
    // rejecting here retains pending settlement without writing through redirection.
    if (this.imageCleanups.has(this.taskKey(task))) this.imageInputDirectory(task);
    const record: TaskRecordV2 = {
      ...(this.manifestUnknown.get(task.subagentId) ?? {}),
      version: 2, subagentId: task.subagentId, ...(task.taskSlug ? { taskSlug: task.taskSlug } : {}), generation: task.generation, agent: task.agent, cwd: task.cwd, label: task.label,
      ...(task.model ? { model: task.model } : {}), ...(task.thinking ? { thinking: task.thinking } : {}), sessionFile: task.sessionFile,
      tabId: task.tabId || undefined, paneId: task.paneId || undefined, status: task.status, queuedAt: task.queuedAt,
      ...(task.startedAt ? { startedAt: task.startedAt } : {}), updatedAt: task.updatedAt,
      ...(task.error ? { error: task.error } : {}),
      ...(task.surfaceCleanups ? { surfaceCleanups: cloneJson(task.surfaceCleanups) } : {}),
    };
    await writeAtomic(this.recordPath(task), record);
  }

result ok
usage tokens=296 elapsed-ms=0 bytes=1184 truncated=false
## Fixture/spec excerpt 0
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
import activateSubagents, { AgentRegistry, SubagentRuntime, createHerdrTransport, createSubagentTools, paneChildExtensionPath, validateExplicitSpawnModel, type CompletionNotification, type HerdrTransport, type SubagentTask } from "../src/index.js";

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

async function waitFor(predicate: () => boolean, timeout = 2500): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for runtime settlement");
    await Bun.sleep(20);
  }
}

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

[3983 more lines in file. Use offset=172 to continue.]

## Fixture/spec excerpt 1
- **caller cancellation**: aborting the caller's `subagent_join` Result-retrieval wait without changing child task lifecycle state.
- **terminal surface cleanup**: closing the dedicated Herdr tab and root pane owned by a terminal generation without deleting retained task artifacts.

The task-derived identity rules remain owned by [Task-Derived Subagent ID Specification](task-derived-subagent-id.md). Its collision and legacy rules apply wherever this document refers to `subagentId`.

## 3. Persistent Task Recovery

### 3.1 Persistence

For every started generation, the runtime must persist a supported manifest under `<tasksDir>/<subagentId>-artifacts/task.json`. Version 2 is the canonical format for every new manifest and for a persisted migration; V1 is readable only as recovery/migration input. The task-derived ID Spec defines the valid V2 canonical, V2 migrated-legacy, V1 canonical, and V1 legacy identity forms. A migration must retain the exact validated ID, `taskSlug` presence or absence, and every retained artifact path: V1 canonical retains its canonical ID and exact slug, while V1 legacy retains its legacy ID and no slug. The manifest must retain the task identity, current generation, Agent, cwd, label, optional model/thinking settings, original session path, pane identity when known, status, timestamps, and error when present. A legacy notification marker may remain as compatibility data but is not delivery acknowledgement under section 4. Section 10 additionally owns per-generation terminal-surface cleanup records.

Generation-one session storage is `<tasksDir>/<subagentId>-g1.jsonl`. Generation-specific Results are stored in the task artifact directory as `result-<generation>.json`. A resumed generation reuses the original session path and writes a new generation Result and launch artifact in the same task artifact directory.

Manifest and artifact writes must be atomic at the file boundary. A launch failure after allocation remains a retained task record; it is not silently released or converted into a new task. Queued admission must be durable before the queued observation or surface creation; running admission must be durable before launch-file writes or command submission. A failed admission write must stop progression at that stage. A generation whose initial queued write never succeeded cannot be reconstructed from disk after process loss; in particular, an earlier terminal generation on disk must not be rewritten as that unwritten generation. Every write of a validated V1 or V2 manifest must merge runtime-owned fields into the parsed record and preserve every unknown top-level field as the same semantic JSON value; byte layout, key order, and whitespace are not guaranteed. V1-to-V2 migration may change owned version/lifecycle fields only and must preserve unknown fields with the identity and paths. This generic passthrough is the Phase A compatibility baseline in section 10.7.

### 3.2 Recovery Scope And Adoption

`recover(cwd, parentSessionFile)` must select exactly the task scope derived from the parent session, or the documented no-parent fallback. It must stop monitors and rebuild in-memory state from that scope. Repeated recovery of the same scope must be idempotent; changing scope must not retain tasks from the previous scope. This correction assumes a single owning runtime for a parent task scope; a local launch/settlement map does not establish exclusion against another process opening or writing that scope. Recovery must wait for locally owned launch operations, including their initial queued persistence, and unresolved terminal-intent persistence before clearing or rebuilding the scope. Launches entering while recovery waits or rebuilds must be serialized with that scope boundary or rechecked before classification. An operation known to be launching locally must never be classified as interrupted by concurrent recovery.

Recovery must discover V2 canonical, V2 migrated-legacy, V1 canonical, and V1 legacy task artifact directories and validate the manifest identity, version form, generation, expected session path, expected artifact path, status, and field types before adoption. The task-derived ID Spec owns these compatible forms: V1 is read-only input and a persisted migration writes V2 without changing the retained ID, `taskSlug`, or path. Malformed, unsupported, or mismatched records must be ignored without adopting a pane, exposing a task, or rewriting unknown fields. Legacy `subagent-N` records remain recoverable without renaming; canonical ID compatibility is defined by the task-derived ID Spec.

Recovery must use the following state precedence for a valid record:

1. If the current generation Result exists and has matching `subagentId` and `generation`, adopt its terminal status and Result/error fields, whether completed, failed, or cancelled.
2. If a Result exists but has a mismatched identity, invalid status, invalid Result shape, or malformed JSON, adopt the task as failed with the corresponding stable runtime error; a stale Result must never settle the current generation as successful. Do not replace the invalid artifact with a synthetic Result.
3. If no Result exists and the persisted record is terminal, retain that terminal state.
4. If no Result exists and the record is V2 `queued`, settle that generation as `failed` with the stable reason `launch_interrupted`, regardless of pane presence or identity. A durable V2 queued record denotes incomplete execution admission, not a reconstructible pending queue or evidence that command submission occurred. Do not verify a pane to promote it to running, replay its launch, invent `startedAt`, or change its `queuedAt`.
5. For V1 `starting` without a Result, keep the existing migration: a verified retained pane becomes running with the documented `createdAt` start fallback; no usable pane becomes `failed/pane_closed`; verification failure uses its diagnostic reason.
6. For an ordinary `running` record without a Result, positively verify the retained pane. A retained pane is adopted as running without relaunch; a missing pane becomes `failed/pane_closed`; pane verification failure becomes failed with its diagnostic reason. This pane evidence is not proof of child-process liveness. A crash after durable running admission but before command submission cannot be distinguished by this correction and remains a known limit; it does not authorize replay or a launch journal.

Before committing a synthetic failure and again after awaited work before cleanup or notification, recovery must recheck the current generation Result and apply the first two precedence rules if one has appeared. It must not overwrite a valid Result. Within the owning runtime, concurrent launch, Result-monitor, and recovery settlement triggers for a generation must converge rather than publish competing terminal effects. These rechecks do not promise an atomic winner between independent processes or immutable first publication by independent writers.

After each successful recovery, the runtime must make changed reconstructed state durable, start monitoring only for running tasks, and deliver any pending terminal notification. A Phase B runtime must first reconcile section 10 cleanup records for terminal generations. Recovery must not create a new pane, replace a stable task identity, alter a retained canonical slug, or overwrite a current generation with a stale Result.

### 3.2.1 Recovery Without Redundant Writes

Recovery must still discover and validate the selected disk scope on every invocation; a same-scope shortcut must not hide a new task, changed generation, or late Result. For a validated V2 terminal manifest whose owned persistent state and recognized cleanup records remain unchanged after reconciliation, recovery must preserve `updatedAt` and must not rewrite `task.json`. Loading an already matching Result into memory alone is not a new terminal transition. V1 migration, changed terminal status/error, missing cleanup intent, and pending/failed cleanup retries must still persist their required changes before effects. Unknown manifest fields remain preserved under section 3.1.

This write avoidance must retain Result precedence and rechecks after awaited work, same-runtime operation coalescing, bounded surface/image cleanup retries, terminal notification replay, and the final task-update observation. It must not use notification success, prior in-memory task state, or a permanently cached Result as evidence that the on-disk task scope can be skipped. The bounded delivery and evidence are tracked in [Recovery performance Work](../works/recovery-performance/work.md).

### 3.3 Launch Failure And Durable Settlement

The owning runtime must register a generation's in-flight launch before its first asynchronous queued-manifest persistence and retain that ownership through create acceptance, running persistence, launch-file writes, command submission, and failure finalization. It must release the launch operation on every outcome without awaiting itself from its own settlement. A rejected queued write must not create a surface; a rejected running write must not write launch files or submit a command. Every launch-stage failure must retain the original operation error as primary, attempt same-generation terminal failure persistence, and report any separate settlement/persistence failure explicitly. A rejected spawn or resume must not become a successful launch because failure retention succeeded.

The runtime must retain retryable local terminal intent, original launch error, accepted surface identities, and current generation if terminal persistence fails; it must not discard that intent merely because in-memory status was set terminal or an in-flight promise rejected. A later bounded operation or recovery in the same runtime must be able to retry it for the same generation when storage becomes writable. Resume and removal must not bypass unresolved terminal-intent persistence or lose its generation/ownership evidence. No automatic unbounded retry is required or permitted: persistent storage failure must reject/report the original operation failure with persistence failure context, without claiming durable settlement. If no initial queued record was ever written and the process ends, there is no durable current-generation intent to recover.

### 3.4 Resume And Remove Boundaries

`resume` must reject a running task, retain the stable `subagentId`, retain the original session file, increment the generation by one, and create a new execution revision. A stale Result from an earlier generation must not settle the resumed generation. Section 10 additionally requires a new Herdr tab and retained prior-generation cleanup evidence.

`remove` must stop monitoring, close an active owned tab, remove the task from the active in-memory scope, delete the original session file, and delete the task artifact directory. Explicit removal is the lifecycle boundary that permits a later runtime to reuse an otherwise available task-derived ID. Pane-only close is permitted only when a tab-create response was rejected as partial before a task surface was accepted. Recovery and automatic terminal-surface cleanup must not delete these files implicitly. Section 10 defines removal when prior automatic cleanup failed.

## 4. Terminal Notification

### 4.1 Terminal Coverage And Durable Source

When a completion notifier is configured, every persisted terminal generation must remain eligible for parent-session delivery, including:

- a valid completed, failed, or cancelled Result;
- an invalid or stale Result that settles the task as failed;
- an unexpectedly closed pane;
- pane verification failure;
- cancellation after the surface is closed; and
- launch or launch-script failure before `spawn` rejects; and
- an interrupted persisted V2 queued admission settled as `failed/launch_interrupted` under section 3.2.

The existing persisted terminal task state is the durable outbox. It consists of the validated terminal manifest and the generation-specific Result artifact when one exists; no second outbox file, queue, receipt store, or broker may be introduced. Delivery eligibility must survive process restart and must be reconstructed from those existing artifacts. The full final result text is available through `subagent_join` and terminal `subagent_inspect` snapshots and must not be copied into the parent notification.

The parent notification details must contain `schema`, `subagentId`, `generation`, terminal `status`, `label`, and an optional bounded `reason`. `schema` must identify the supported notification-correlation schema. The delivery correlation is exactly `<schema, subagentId, generation, status>`; `label` and `reason` are display data and are not correlation fields.

### 4.2 Parent-Session Acknowledgement


[215 more lines in file. Use offset=102 to continue.]

## Fixture/spec excerpt 2

A successful permissive base64 decode, non-zero buffer length, or matching `image/*` label does not prove that bytes constitute a decodable image or match the MIME type. Actual decoder/normalizer rejection must be reported explicitly. The package must not claim full image validity based only on the three-field structural check.

The runtime must take a stable snapshot of validated image fields and array order before asynchronous handoff work so later caller mutation cannot change an admitted envelope. It must not trim/rewrite data, reorder entries, or silently discard a failed entry. Pi's later normalization is a separate stage and may produce different data/MIME values; those differences must not be described as raw-transfer corruption without evidence.

Initial spawn must retain [model-validation precedence and side-effect-free rejection](explicit-spawn-model-validation.md#4-ordered-validation-algorithm). Image structural rejection must occur before task-ID allocation, image-file writes, task publication, or surface creation. Resume must retain the existing task/status/operation guards; invalid image input must not increment generation or overwrite the prior manifest/session/Result.

No new universal image-count, byte-size, MIME allowlist, model-capability admission table, or automatic model selection is specified. Actual filesystem, Pi, decoder, selected-model, and provider limits must remain explicit failures within their observed boundary.

## Internal Envelope And Association

A non-empty admitted array requires one private UTF-8 JSON envelope with this owned shape:

```ts
type ImageInputEnvelopeV1 = {
  version: 1;
  subagentId: string;
  generation: number; // positive integer, equal to the launched generation
  images: ImageContent[]; // non-empty, in caller order
};
```

This is internal IPC, not a public path/envelope argument, Result schema, manifest migration, receipt queue, or image-history index. The producer must emit the fields above. The consumer must reject unsupported versions, missing/invalid fields, malformed JSON, and invalid image arrays.

The file must belong to the current task scope and task artifact directory, with a generation-specific location determined by the parent/child implementation. Its location must be derivable or privately communicated without putting the image-file path, envelope contents, or image data in command arguments or prompt text. An internal layout may derive the sibling image-file location from the existing Result path and generation; public callers must never choose it.

Launch context must independently distinguish an image-bearing initial input from text-only input. File presence alone cannot do this: a missing expected file must fail, whereas a text-only launch must not search for or consume a leftover file. The internal expectation marker/location agreement must be verified with the producer; this contract leaves its spelling and file basename implementation-owned.

Before delivery, the child must check both storage ownership and envelope identity against its trusted launch context: task scope, exact `subagentId`, and exact generation. It must reject another task's file, an earlier/later generation, an untrusted path, a symlink/redirection outside its owned storage, or an association it cannot establish. Identity strings inside an arbitrary file alone do not establish scope ownership.

## Input Source And Single Consumption

| Input route | Image-envelope behavior |
| --- | --- |
| New spawn's designated generation-1 initial prompt | Consume that generation's admitted array once. |

[100 more lines in file. Use offset=113 to continue.]
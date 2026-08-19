import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { StringEnum, Type } from "@earendil-works/pi-ai";
import { defineTool, getAgentDir, type ExtensionAPI, type ExtensionContext, type Theme } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { commandFailure, createHerdrClient, hasHerdrErrorCode, type HerdrClient } from "pi-herdr";

const exec = promisify(execFile);
export const paneChildExtensionPath = resolve(dirname(fileURLToPath(import.meta.url)), "../extensions/pane-child.ts");
export type AgentDefinition = { name: string; path: string; body: string; description: string };
export type TaskStatus = "running" | "completed" | "failed" | "cancelled";
export type SubagentTask = {
  subagentId: string; taskSlug?: string; generation: number; agent: string; cwd: string; label: string; model?: string; thinking?: string;
  sessionFile: string; resultPath: string; tabId: string; paneId: string; status: TaskStatus;
  createdAt: string; updatedAt: string; result?: string; error?: string;
};

export type TaskIdAllocationErrorCode = "invalid_task_slug" | "task_id_exhausted" | "filesystem_reservation_failed";

export class TaskIdAllocationError extends Error {
  readonly code: TaskIdAllocationErrorCode;

  constructor(code: TaskIdAllocationErrorCode, cause?: unknown) {
    super(code === "invalid_task_slug"
      ? "Invalid task slug."
      : code === "task_id_exhausted"
        ? "Task ID allocation exhausted."
        : "Task ID filesystem reservation failed.");
    this.name = "TaskIdAllocationError";
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}
export type SubagentTaskObservation = Readonly<{
  subagentId: string;
  generation: number;
  agent: string;
  label: string;
  status: TaskStatus;
  createdAt: string;
}>;
export type CompletionNotification = {
  subagentId: string; generation: number; status: Exclude<TaskStatus, "running">; label: string; reason?: string;
};
export type CompletionNotifier = (notification: CompletionNotification) => void | Promise<void>;
export type TaskRecordV1 = {
  version: 1; subagentId: string; taskSlug?: string; generation: number; agent: string; cwd: string; label: string; model?: string; thinking?: string;
  sessionFile: string; tabId?: string; paneId?: string; status: "starting" | TaskStatus;
  createdAt: string; updatedAt: string; error?: string; notifiedGeneration?: number;
};
export type HerdrTransport = {
  createTab(input: { cwd: string; label: string; env?: Record<string, string> }): Promise<{ tabId: string; paneId: string }>;
  run(paneId: string, command: string, args: string[]): Promise<void>;
  sendText(paneId: string, text: string): Promise<void>;
  closePane(paneId: string): Promise<void>;
  paneExists(paneId: string): Promise<boolean>;
};

type Json = Record<string, unknown>;
function unwrap(value: Json): Json { return value.result && typeof value.result === "object" && !Array.isArray(value.result) ? value.result as Json : value; }
function powerShellInvocation(command: string, args: string[]): string {
  const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
  return `& ${[command, ...args].map(quote).join(" ")}`;
}

function resolveCurrentPiInvocation(): { command: string; args: string[] } {
  const currentScript = process.argv[1];
  if (currentScript && !currentScript.startsWith("/$bunfs/root/") && existsSync(currentScript)) return { command: process.execPath, args: [currentScript] };
  const execName = basename(process.execPath).toLowerCase();
  if (!/^(node|bun)(\.exe)?$/.test(execName)) return { command: process.execPath, args: [] };
  return { command: "pi", args: [] };
}

function buildNodeLaunchScript(cwd: string, command: string, args: string[]): string {
  const invocation = command === "pi" ? resolveCurrentPiInvocation() : { command, args: [] };
  const spec = Buffer.from(JSON.stringify({ cwd, command: invocation.command, args: [...invocation.args, ...args] }), "utf8").toString("base64");
  return [
    `const { spawnSync } = require("node:child_process");`,
    `const { existsSync, renameSync, writeFileSync } = require("node:fs");`,
    `const spec = JSON.parse(Buffer.from(${JSON.stringify(spec)}, "base64").toString("utf8"));`,
    `const fail = error => {`,
    `  const path = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;`,
    `  const subagentId = process.env.PI_HERDR_SUBAGENT_ID;`,
    `  const generation = Number(process.env.PI_HERDR_SUBAGENT_GENERATION);`,
    `  if (!path || !subagentId || !Number.isInteger(generation) || existsSync(path)) return;`,
    `  const temporary = path + "." + process.pid + ".tmp";`,
    `  writeFileSync(temporary, JSON.stringify({ subagentId, generation, status: "failed", error }));`,
    `  renameSync(temporary, path);`,
    `};`,
    `const result = spawnSync(spec.command, spec.args, { cwd: spec.cwd, env: process.env, stdio: "inherit" });`,
    `if (result.error) { fail("launch_failed: " + result.error.message); throw result.error; }`,
    `fail(result.status === 0 ? "child_exited_without_result" : "child_exit_" + (result.status ?? 1));`,
    `process.exit(result.status ?? 1);`,
    "",
  ].join("\r\n");
}

function bootstrapRuntime(): string {
  return /^(node|bun)(\.exe)?$/i.test(basename(process.execPath)) ? process.execPath : "node";
}

export function createHerdrTransport(client: HerdrClient<{ cwd?: string }> = createHerdrClient<{ cwd?: string }>(async (command, args, options) => {
  try { const result = await exec(command, args, { cwd: options.cwd, maxBuffer: 4 * 1024 * 1024 }); return { code: 0, stdout: result.stdout, stderr: result.stderr }; }
  catch (error) { const failure = error as { code?: number; stdout?: string; stderr?: string; message?: string }; return { code: typeof failure.code === "number" ? failure.code : 1, stdout: failure.stdout ?? "", stderr: failure.stderr ?? failure.message ?? String(error) }; }
})): HerdrTransport {
  return {
    async createTab(input) {
      const args = ["tab", "create", "--cwd", input.cwd, "--label", input.label, "--no-focus"];
      for (const [name, value] of Object.entries(input.env ?? {})) args.push("--env", `${name}=${value}`);
      const raw = unwrap(await client.json(args, {}));
      const tab = raw.tab as Json | undefined;
      const rootPane = raw.root_pane as Json | undefined;
      const tabId = typeof tab?.tab_id === "string" ? tab.tab_id : "";
      const paneId = typeof rootPane?.pane_id === "string" ? rootPane.pane_id : "";
      if (!tabId || !paneId) throw new Error("Herdr tab create returned no tab or pane identity");
      return { tabId, paneId };
    },
    async run(paneId, command, args) { await client.run(["pane", "run", paneId, powerShellInvocation(command, args)], {}); },
    async sendText(paneId, text) { await client.run(["pane", "send-text", paneId, text], {}); },
    async closePane(paneId) { await client.run(["pane", "close", paneId], {}); },
    async paneExists(paneId) {
      const result = await client.exec(["pane", "get", paneId], {});
      if (result.code === 0 && !result.killed) return true;
      if (hasHerdrErrorCode(result, "pane_not_found") || `${result.stderr}\n${result.stdout}`.toLowerCase().includes("pane not found")) return false;
      throw new Error(commandFailure(["pane", "get", paneId], result));
    },
  };
}

function parseAgent(text: string, path: string): AgentDefinition {
  const normalized = text.replaceAll("\r\n", "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fields: Record<string, string> = {};
  for (const line of (match?.[1] ?? "").split("\n")) { const i = line.indexOf(":"); if (i > 0) fields[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, ""); }
  return { name: fields.name || basename(path, ".md"), path, body: (match?.[2] ?? normalized).trim(), description: fields.description || fields.name || basename(path, ".md") };
}
function markdownFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

export class AgentRegistry {
  private agents = new Map<string, AgentDefinition>();
  setFiles(files: Array<{ path: string; content: string }>): void { this.agents.clear(); this.addFiles(files); }
  async discover(cwd: string, packageRoots?: readonly string[]): Promise<void> {
    this.agents.clear();
    const roots = packageRoots ?? await configuredPackageRoots(cwd);
    for (const root of roots) this.addFiles(await packageAgentFiles(root));
    for (const root of [join(getAgentDir(), "agents"), join(cwd, ".pi", "agents")]) {
      for (const path of markdownFiles(root)) this.addFiles([{ path, content: readFileSync(path, "utf8") }]);
    }
  }
  private addFiles(files: Array<{ path: string; content: string }>): void { for (const file of files) { const agent = parseAgent(file.content, file.path); this.agents.set(agent.name, agent); } }
  list(): AgentDefinition[] { return [...this.agents.values()]; }
  get(name: string): AgentDefinition | undefined { return this.agents.get(name); }
}

async function writeAtomic(path: string, value: unknown): Promise<void> {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}-${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value));
  renameSync(temporary, path);
}

export class SubagentRuntime {
  private tasks = new Map<string, SubagentTask>();
  private activeTasksDir?: string;
  private monitors = new Map<string, AbortController>();
  private notified = new Set<string>();
  private taskUpdateListeners = new Set<() => void>();
  private completionNotifier?: CompletionNotifier;

  constructor(
    private readonly transport: HerdrTransport,
    private readonly registry: AgentRegistry,
    private readonly root?: string,
    completionNotifier?: CompletionNotifier,
  ) { this.completionNotifier = completionNotifier; }
  setCompletionNotifier(notifier: CompletionNotifier): void { this.completionNotifier = notifier; }

  listTasks(): readonly SubagentTaskObservation[] {
    return [...this.tasks.values()].map(task => ({
      subagentId: task.subagentId,
      generation: task.generation,
      agent: task.agent,
      label: task.label,
      status: task.status,
      createdAt: task.createdAt,
    }));
  }

  onTaskUpdate(listener: () => void): () => void {
    this.taskUpdateListeners.add(listener);
    return () => { this.taskUpdateListeners.delete(listener); };
  }

  async spawn(input: {
    agent: string;
    cwd: string;
    prompt: string;
    label: string;
    taskSlug?: string;
    model?: string;
    thinking?: string;
    parentSessionFile?: string;
  }): Promise<SubagentTask> {
    const taskSlug = validateTaskSlug(input.taskSlug);
    this.resolveAgent(input.agent);
    const tasksDir = this.tasksDir(input.cwd, input.parentSessionFile);
    this.selectScope(tasksDir);
    const { subagentId, artifactDir } = this.reserveSubagentId(tasksDir, taskSlug);
    return this.start({ subagentId, taskSlug, generation: 1, artifactDir, ...input });
  }

  async recover(cwd: string, parentSessionFile?: string, notifiedKeys: Iterable<string> = []): Promise<void> {
    const tasksDir = this.tasksDir(cwd, parentSessionFile);
    this.selectScope(tasksDir);
    this.stop();
    this.tasks.clear();
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
      const task = this.taskFromRecord(record, artifactDir);
      if (record.notifiedGeneration === record.generation) this.notified.add(this.taskKey(task));
      const result = existsSync(task.resultPath) ? this.readResult(task) : undefined;
      if (result?.valid) {
        task.status = result.status;
        task.result = result.result;
        task.error = result.error;
      } else if (result && !result.valid) {
        task.status = "failed";
        task.error = result.error;
      } else if (record.status !== "running" && record.status !== "starting") {
        task.status = record.status;
      } else if (task.paneId) {
        try {
          if (await this.transport.paneExists(task.paneId)) task.status = "running";
          else { task.status = "failed"; task.error = "pane_closed"; }
        } catch (error) {
          task.status = "failed";
          task.error = `pane_verification_failed: ${error instanceof Error ? error.message : String(error)}`;
        }
      } else {
        task.status = "failed";
        task.error = "pane_closed";
      }
      this.tasks.set(task.subagentId, task);
      await this.persist(task);
      if (task.status === "running") this.startMonitor(task);
      else await this.notifyTerminal(task);
    }
    this.notifyTaskUpdate();
  }

  async resume(subagentId: string, prompt: string): Promise<SubagentTask> {
    const old = this.get(subagentId);
    if (old.status === "running") throw new Error("Cannot resume a running subagent");
    return this.start({
      subagentId: old.subagentId,
      taskSlug: old.taskSlug,
      generation: old.generation + 1,
      agent: old.agent,
      cwd: old.cwd,
      prompt,
      label: old.label,
      model: old.model,
      thinking: old.thinking,
      sessionFile: old.sessionFile,
      artifactDir: dirname(old.resultPath),
      createdAt: old.createdAt,
    });
  }

  private tasksDir(cwd: string, parentSessionFile?: string): string {
    const base = this.root ?? (parentSessionFile
      ? parentSessionFile.replace(/\.jsonl$/i, "")
      : join(cwd, ".pi", "subagent-sessions"));
    return join(base, "tasks");
  }

  private selectScope(tasksDir: string): void {
    const scope = resolve(tasksDir);
    if (scope === this.activeTasksDir) return;
    this.stop();
    this.activeTasksDir = scope;
    this.tasks.clear();
    this.notified.clear();
  }

  private reserveSubagentId(tasksDir: string, taskSlug: string): { subagentId: string; artifactDir: string } {
    try { mkdirSync(tasksDir, { recursive: true, mode: 0o700 }); }
    catch (error) { throw new TaskIdAllocationError("filesystem_reservation_failed", error); }
    for (let suffix = 1; suffix <= 100; suffix++) {
      const subagentId = suffix === 1 ? taskSlug : `${taskSlug}-${suffix}`;
      if (existsSync(join(tasksDir, `${subagentId}-g1.jsonl`)) || existsSync(join(tasksDir, `${subagentId}-artifacts`))) continue;
      const artifactDir = join(tasksDir, `${subagentId}-artifacts`);
      try {
        mkdirSync(artifactDir, { mode: 0o700 });
        return { subagentId, artifactDir };
      } catch (error) {
        if ((error as { code?: unknown }).code === "EEXIST") continue;
        throw new TaskIdAllocationError("filesystem_reservation_failed", error);
      }
    }
    throw new TaskIdAllocationError("task_id_exhausted");
  }

  private async start(input: {
    subagentId: string;
    taskSlug?: string;
    generation: number;
    agent: string;
    cwd: string;
    prompt: string;
    label: string;
    model?: string;
    thinking?: string;
    parentSessionFile?: string;
    sessionFile?: string;
    artifactDir?: string;
    createdAt?: string;
  }): Promise<SubagentTask> {
    const agent = this.resolveAgent(input.agent);
    const tasksDir = input.artifactDir ? dirname(input.artifactDir) : this.tasksDir(input.cwd, input.parentSessionFile);
    this.selectScope(tasksDir);
    const artifactDir = input.artifactDir ?? join(tasksDir, `${input.subagentId}-artifacts`);
    mkdirSync(artifactDir, { recursive: true, mode: 0o700 });
    const sessionFile = input.sessionFile ?? join(tasksDir, `${input.subagentId}-g1.jsonl`);
    const resultPath = join(artifactDir, `result-${input.generation}.json`);
    const now = new Date().toISOString();
    const createdAt = input.createdAt ?? now;
    const starting: TaskRecordV1 = {
      version: 1, subagentId: input.subagentId, ...(input.taskSlug ? { taskSlug: input.taskSlug } : {}), generation: input.generation, agent: input.agent, cwd: input.cwd, label: input.label,
      ...(input.model ? { model: input.model } : {}), ...(input.thinking ? { thinking: input.thinking } : {}), sessionFile,
      status: "starting", createdAt, updatedAt: now,
    };
    await writeAtomic(join(artifactDir, "task.json"), starting);

    const task: SubagentTask = {
      subagentId: input.subagentId, taskSlug: input.taskSlug, generation: input.generation, agent: input.agent, cwd: input.cwd, label: input.label,
      model: input.model, thinking: input.thinking, sessionFile, resultPath, tabId: "", paneId: "", status: "running", createdAt, updatedAt: now,
    };
    this.tasks.set(task.subagentId, task);
    this.notifyTaskUpdate();
    try {
      const surface = await this.transport.createTab({
        cwd: input.cwd,
        label: input.label,
        env: {
          PI_HERDR_SUBAGENT_ID: input.subagentId,
          PI_HERDR_SUBAGENT_GENERATION: String(input.generation),
          PI_HERDR_SUBAGENT_RESULT_PATH: resultPath,
        },
      });
      task.tabId = surface.tabId;
      task.paneId = surface.paneId;
    } catch (error) {
      await this.settle(task, "failed", undefined, String(error));
      throw error;
    }
    await this.persist(task);
    const args = ["--session", sessionFile, "-e", paneChildExtensionPath, "--system-prompt", agent.body, "--tools", "read,bash,edit,write,subagent_done"];
    if (input.model) args.push("--model", input.thinking ? `${input.model}:${input.thinking}` : input.model);
    args.push(`${input.prompt}\n\nReturn the Handler Result as YAML, then call subagent_done with that exact YAML string.`);
    const launchScript = join(artifactDir, `launch-${input.generation}.ps1`);
    const bootstrapScript = join(artifactDir, `launch-${input.generation}.cjs`);
    try {
      await writeFile(bootstrapScript, buildNodeLaunchScript(input.cwd, "pi", args));
      await writeFile(launchScript, `\ufeff$ErrorActionPreference = 'Stop'\r\n${powerShellInvocation(bootstrapRuntime(), [bootstrapScript])}\r\nexit $LASTEXITCODE\r\n`);
      await this.transport.run(task.paneId, "powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", launchScript]);
    } catch (error) {
      await this.settle(task, "failed", undefined, String(error));
      throw error;
    }
    this.startMonitor(task);
    return { ...task };
  }

  agentNames(): string[] { return this.registry.list().map(({ name }) => name); }

  private resolveAgent(name: string): AgentDefinition {
    const agent = this.registry.get(name);
    if (!agent) throw new Error(`Required Agent is unavailable: ${name}`);
    return agent;
  }

  private get(id: string): SubagentTask {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Unknown subagent: ${id}`);
    return task;
  }

  private notifyTaskUpdate(): void {
    for (const listener of this.taskUpdateListeners) {
      try { listener(); }
      catch { /* Observation must not affect runtime operations. */ }
    }
  }

  inspect(id: string): SubagentTask { return { ...this.get(id) }; }

  async join(id: string, generation = this.get(id).generation): Promise<SubagentTask> {
    const task = this.get(id);
    if (task.generation !== generation) throw new Error("Subagent generation is no longer current");
    while (task.status === "running") {
      if (existsSync(task.resultPath)) await this.settleFromResult(task);
      else await delay(50);
    }
    return { ...task };
  }

  async steer(id: string, message: string): Promise<SubagentTask> {
    const task = this.get(id);
    if (task.status !== "running") throw new Error("Subagent is not running");
    await this.transport.sendText(task.paneId, message);
    return { ...task };
  }

  async cancel(id: string): Promise<SubagentTask> {
    const task = this.get(id);
    if (task.status === "running") {
      this.stopMonitor(task);
      try { await this.transport.closePane(task.paneId); }
      catch (error) { this.startMonitor(task); throw error; }
      await writeAtomic(task.resultPath, { subagentId: id, generation: task.generation, status: "cancelled" });
      await this.settle(task, "cancelled");
    }
    return { ...task };
  }

  async remove(id: string): Promise<void> {
    const task = this.get(id);
    this.stopMonitor(task);
    if (task.status === "running") await this.transport.closePane(task.paneId);
    this.tasks.delete(id);
    this.notifyTaskUpdate();
    rmSync(task.sessionFile, { force: true });
    rmSync(dirname(task.resultPath), { recursive: true, force: true });
  }

  stop(): void {
    for (const controller of this.monitors.values()) controller.abort();
    this.monitors.clear();
  }

  private taskKey(task: Pick<SubagentTask, "subagentId" | "generation">): string {
    return `${task.subagentId}:${task.generation}`;
  }

  private startMonitor(task: SubagentTask): void {
    const key = this.taskKey(task);
    if (this.monitors.has(key) || task.status !== "running") return;
    const controller = new AbortController();
    this.monitors.set(key, controller);
    void (async () => {
      while (!controller.signal.aborted && task.status === "running") {
        try { await delay(500, undefined, { signal: controller.signal, ref: false }); }
        catch { break; }
        if (existsSync(task.resultPath)) {
          await this.settleFromResult(task);
          break;
        }
        try {
          const paneExists = await this.transport.paneExists(task.paneId);
          if (controller.signal.aborted) break;
          if (!paneExists) {
            await this.settle(task, "failed", undefined, "pane_closed");
            break;
          }
        } catch (error) {
          if (controller.signal.aborted) break;
          await this.settle(task, "failed", undefined, `pane_verification_failed: ${error instanceof Error ? error.message : String(error)}`);
          break;
        }
      }
      if (this.monitors.get(key) === controller) this.monitors.delete(key);
    })();
  }

  private stopMonitor(task: Pick<SubagentTask, "subagentId" | "generation">): void {
    const key = this.taskKey(task);
    this.monitors.get(key)?.abort();
    this.monitors.delete(key);
  }

  private async settleFromResult(task: SubagentTask): Promise<void> {
    const result = this.readResult(task);
    if (result.valid) await this.settle(task, result.status, result.result, result.error);
    else await this.settle(task, "failed", undefined, result.error);
  }

  private async settle(task: SubagentTask, status: Exclude<TaskStatus, "running">, result?: string, error?: string): Promise<void> {
    if (task.status !== "running") return;
    this.stopMonitor(task);
    task.status = status;
    task.result = result;
    task.error = error;
    this.notifyTaskUpdate();
    await this.persist(task);
    await this.notifyTerminal(task);
  }

  private async notifyTerminal(task: SubagentTask): Promise<void> {
    if (task.status === "running" || !this.completionNotifier || this.notified.has(this.taskKey(task))) return;
    const notification: CompletionNotification = {
      subagentId: task.subagentId,
      generation: task.generation,
      status: task.status,
      label: task.label,
      ...(task.error ? { reason: briefReason(task.error) } : {}),
    };
    try {
      await this.completionNotifier(notification);
      this.notified.add(this.taskKey(task));
      await this.persist(task);
    } catch { /* Recovery retries notifications without a persisted marker. */ }
  }

  private recordPath(task: SubagentTask): string { return join(dirname(task.resultPath), "task.json"); }

  private async persist(task: SubagentTask): Promise<void> {
    task.updatedAt = new Date().toISOString();
    const record: TaskRecordV1 = {
      version: 1, subagentId: task.subagentId, ...(task.taskSlug ? { taskSlug: task.taskSlug } : {}), generation: task.generation, agent: task.agent, cwd: task.cwd, label: task.label,
      ...(task.model ? { model: task.model } : {}), ...(task.thinking ? { thinking: task.thinking } : {}), sessionFile: task.sessionFile,
      tabId: task.tabId || undefined, paneId: task.paneId || undefined, status: task.status, createdAt: task.createdAt, updatedAt: task.updatedAt,
      ...(task.error ? { error: task.error } : {}),
      ...(this.notified.has(this.taskKey(task)) ? { notifiedGeneration: task.generation } : {}),
    };
    await writeAtomic(this.recordPath(task), record);
  }

  private taskFromRecord(record: TaskRecordV1, artifactDir: string): SubagentTask {
    return {
      subagentId: record.subagentId, taskSlug: record.taskSlug, generation: record.generation, agent: record.agent, cwd: record.cwd, label: record.label,
      model: record.model, thinking: record.thinking, sessionFile: record.sessionFile,
      resultPath: join(artifactDir, `result-${record.generation}.json`), tabId: record.tabId ?? "", paneId: record.paneId ?? "",
      status: record.status === "starting" ? "running" : record.status, createdAt: record.createdAt, updatedAt: record.updatedAt, error: record.error,
    };
  }

  private readTaskRecord(path: string, tasksDir: string, artifactDir: string, subagentId: string): TaskRecordV1 | undefined {
    try {
      const value = JSON.parse(readFileSync(path, "utf8")) as Partial<TaskRecordV1>;
      const legacy = isLegacySubagentId(subagentId);
      const canonical = typeof value.taskSlug === "string" && isCanonicalFinalId(subagentId, value.taskSlug);
      if (value.version !== 1 || value.subagentId !== subagentId || (!legacy && !canonical) || !Number.isInteger(value.generation) || value.generation! < 1) return;
      if (legacy ? value.taskSlug !== undefined : !canonical) return;
      if (typeof value.agent !== "string" || typeof value.cwd !== "string" || typeof value.label !== "string" || typeof value.sessionFile !== "string") return;
      if (value.model !== undefined && typeof value.model !== "string") return;
      if (value.thinking !== undefined && typeof value.thinking !== "string") return;
      const expectedSession = join(tasksDir, `${subagentId}-g1.jsonl`);
      if (resolve(value.sessionFile) !== resolve(expectedSession)) return;
      if (typeof value.createdAt !== "string" || typeof value.updatedAt !== "string" || !isTaskRecordStatus(value.status)) return;
      if (value.tabId !== undefined && typeof value.tabId !== "string") return;
      if (value.paneId !== undefined && typeof value.paneId !== "string") return;
      if (value.error !== undefined && typeof value.error !== "string") return;
      if (value.notifiedGeneration !== undefined && value.notifiedGeneration !== value.generation) return;
      if (resolve(artifactDir) !== resolve(join(tasksDir, `${subagentId}-artifacts`))) return;
      return value as TaskRecordV1;
    } catch { return; }
  }

  private readResult(task: SubagentTask):
    | { valid: true; status: Exclude<TaskStatus, "running">; result?: string; error?: string }
    | { valid: false; error: string } {
    try {
      const value = JSON.parse(readFileSync(task.resultPath, "utf8")) as Json;
      if (value.subagentId !== task.subagentId || value.generation !== task.generation) return { valid: false, error: "result_identity_mismatch" };
      if (!isTerminalStatus(value.status)) return { valid: false, error: "invalid_result_status" };
      if (value.status === "completed" && typeof value.result !== "string") return { valid: false, error: "invalid_result" };
      if (value.result !== undefined && typeof value.result !== "string") return { valid: false, error: "invalid_result" };
      if (value.error !== undefined && typeof value.error !== "string") return { valid: false, error: "invalid_result" };
      return { valid: true, status: value.status, result: value.result as string | undefined, error: value.error as string | undefined };
    } catch { return { valid: false, error: "invalid_result" }; }
  }
}

function validateTaskSlug(value: unknown): string {
  if (typeof value !== "string" || !isCanonicalTaskSlug(value)) throw new TaskIdAllocationError("invalid_task_slug");
  return value;
}

function isCanonicalTaskSlug(value: string): boolean {
  return value.length >= 3 && value.length <= 48 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && !value.startsWith("subagent-");
}

function isLegacySubagentId(value: string): boolean {
  return /^subagent-[1-9]\d*$/.test(value);
}

function isCanonicalFinalId(subagentId: string, taskSlug: string): boolean {
  if (!isCanonicalTaskSlug(taskSlug)) return false;
  if (subagentId === taskSlug) return true;
  const suffix = subagentId.slice(taskSlug.length);
  return /^-(?:[2-9]|[1-9]\d|100)$/.test(suffix);
}

function canonicalTaskSlugFromFinalId(value: string): string | undefined {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.startsWith("subagent-")) return;
  if (isCanonicalTaskSlug(value)) return value;
  const match = value.match(/^(.*)-(\d+)$/);
  if (!match) return;
  const suffix = Number(match[2]);
  if (isCanonicalTaskSlug(match[1]!) && suffix >= 2 && suffix <= 100 && String(suffix) === match[2]) return match[1];
}
function isNotificationSubagentId(value: string): boolean {
  return isLegacySubagentId(value) || canonicalTaskSlugFromFinalId(value) !== undefined;
}

function briefReason(reason: string): string {
  const compact = reason.replace(/\s+/g, " ").trim();
  return compact.length <= 160 ? compact : `${compact.slice(0, 157)}...`;
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "running" || value === "completed" || value === "failed" || value === "cancelled";
}
function isTaskRecordStatus(value: unknown): value is TaskRecordV1["status"] {
  return value === "starting" || isTaskStatus(value);
}
function isTerminalStatus(value: unknown): value is Exclude<TaskStatus, "running"> {
  return value === "completed" || value === "failed" || value === "cancelled";
}


type ThemeLike = Partial<Pick<Theme, "fg" | "bold">>;
type ToolResult = { details?: unknown; content?: readonly { type?: string; text?: string }[] };
type ToolUpdate = (details: unknown) => void;

function paint(theme: ThemeLike | undefined, color: Parameters<Theme["fg"]>[0], text: string): string {
  return theme?.fg ? theme.fg(color, text) : text;
}

function title(theme: ThemeLike | undefined, action: string): string {
  const name = theme?.bold ? theme.bold("subagent") : "subagent";
  return `${paint(theme, "toolTitle", name)} ${paint(theme, "toolTitle", action)}`;
}

function taskFrom(result: ToolResult): SubagentTask | undefined {
  const details = result.details as Partial<SubagentTask> | undefined;
  return details && typeof details.subagentId === "string" && typeof details.status === "string" ? details as SubagentTask : undefined;
}

function fallback(result: ToolResult): string {
  return result.content?.find(part => part.type === "text")?.text || "Subagent action failed.";
}

function renderSpawnCall(args: unknown, theme?: ThemeLike): Text {
  const input = args as { agent?: string; label?: string };
  const suffix = [input.agent, input.label].filter(Boolean).join(" · ");
  return new Text(`${title(theme, "spawn")}${suffix ? paint(theme, "dim", `  ${suffix}`) : ""}`, 0, 0);
}

function renderSpawnResult(result: ToolResult, _options: unknown, theme?: ThemeLike): Text {
  const task = taskFrom(result);
  if (!task) return new Text(fallback(result), 0, 0);
  return new Text(`${paint(theme, "success", "")} Started ${paint(theme, "text", task.label)}\n${paint(theme, "muted", `  ${task.subagentId}`)}`, 0, 0);
}

function renderJoinCall(args: unknown, theme?: ThemeLike): Text {
  const input = args as { subagentId?: string; generation?: number };
  const suffix = [input.subagentId, input.generation === undefined ? undefined : `generation ${input.generation}`].filter(Boolean).join(" · ");
  return new Text(`${title(theme, "join")}${suffix ? paint(theme, "dim", `  ${suffix}`) : ""}`, 0, 0);
}

function renderJoinResult(result: ToolResult, options: { expanded?: boolean; isPartial?: boolean } = {}, theme?: ThemeLike): Text {
  const task = taskFrom(result);
  if (!task) return new Text(fallback(result), 0, 0);
  const marker = task.status === "completed" ? paint(theme, "success", "") : task.status === "running" ? paint(theme, "warning", "") : paint(theme, "error", "");
  const statusColor = task.status === "completed" ? "success" : task.status === "running" ? "warning" : "error";
  const lines = [`${marker} ${paint(theme, "text", task.label)} ${paint(theme, statusColor, task.status)}`];
  if (options.expanded) {
    lines.push(paint(theme, "muted", `  ${task.subagentId} · generation ${task.generation}`));
    if (task.result) lines.push(`  ${paint(theme, "dim", task.result)}`);
    else if (task.error) lines.push(`  ${paint(theme, "error", task.error)}`);
  } else if (options.isPartial && task.status === "running") {
    lines.push(paint(theme, "dim", "   waiting for result"));
  } else if (task.status !== "completed" && task.error) {
    lines.push(`  ${paint(theme, "error", task.error)}`);
  }
  return new Text(lines.join("\n"), 0, 0);
}

export function createSubagentTools(runtime: SubagentRuntime, cwd: string, parentSessionFile?: string) {
  const result = (details: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(details) }], details });
  const tool = (name: string, description: string, parameters: any, execute: (params: any, update?: ToolUpdate) => Promise<unknown>, renderer: Record<string, unknown> = {}) => defineTool({
    name, label: name, description, parameters, ...renderer,
    async execute(_id, params, _signal, onUpdate) {
      const details = await execute(params, value => onUpdate?.(result(value)));
      return result(details);
    },
  });
  return [
    // Optional avoids schema rejection so missing values use the stable runtime error contract.
    tool("subagent_spawn", "Start one background subagent. taskSlug is required and must be a Router-provided canonical task identity; the parent receives a terminal notification without the full Result.", Type.Object({ agent: StringEnum(runtime.agentNames()), prompt: Type.String({ minLength: 1 }), label: Type.String({ minLength: 1 }), taskSlug: Type.Optional(Type.String()), model: Type.Optional(Type.String()), thinking: Type.Optional(Type.String()) }), params => runtime.spawn({ ...params, cwd, parentSessionFile }), { renderCall: renderSpawnCall, renderResult: renderSpawnResult }),
    tool("subagent_resume", "Resume a completed or failed subagent.", Type.Object({ subagentId: Type.String(), prompt: Type.String({ minLength: 1 }) }), params => runtime.resume(params.subagentId, params.prompt)),
    tool("subagent_inspect", "Return a non-blocking subagent snapshot.", Type.Object({ subagentId: Type.String() }), params => Promise.resolve(runtime.inspect(params.subagentId))),
    tool("subagent_join", "Wait for a subagent and read its full Result.", Type.Object({ subagentId: Type.String(), generation: Type.Optional(Type.Number()) }), async (params, update) => { update?.(runtime.inspect(params.subagentId)); return runtime.join(params.subagentId, params.generation); }, { renderCall: renderJoinCall, renderResult: renderJoinResult }),
    tool("subagent_steer", "Send a message to a running subagent.", Type.Object({ subagentId: Type.String(), message: Type.String({ minLength: 1 }) }), params => runtime.steer(params.subagentId, params.message)),
    tool("subagent_cancel", "Best-effort cancel a running subagent.", Type.Object({ subagentId: Type.String() }), params => runtime.cancel(params.subagentId)),
    tool("subagent_remove", "Close and remove a subagent and its artifacts.", Type.Object({ subagentId: Type.String() }), async params => { await runtime.remove(params.subagentId); return { status: "removed" }; }),
  ];
}

const completionMessageType = "pi-herdr-subagent-completion";

function notificationKey(value: Pick<CompletionNotification, "subagentId" | "generation">): string {
  return `${value.subagentId}:${value.generation}`;
}

function completionNotificationKeys(entries: readonly { type: string; customType?: string; details?: unknown }[]): string[] {
  const keys: string[] = [];
  for (const entry of entries) {
    if (entry.type !== "custom_message" || entry.customType !== completionMessageType || !entry.details || typeof entry.details !== "object") continue;
    const details = entry.details as Partial<CompletionNotification>;
    if (typeof details.subagentId === "string" && isNotificationSubagentId(details.subagentId)
      && Number.isInteger(details.generation) && details.generation! >= 1
      && isTerminalStatus(details.status) && typeof details.label === "string") keys.push(notificationKey(details as CompletionNotification));
  }
  return keys;
}

export default function subagentsExtension(pi: ExtensionAPI, dependencies: { runtime?: SubagentRuntime; registry?: AgentRegistry } = {}): void {
  if (process.env.PI_HERDR_SUBAGENT_RESULT_PATH) return;
  const registry = dependencies.registry ?? new AgentRegistry();
  const runtime = dependencies.runtime ?? new SubagentRuntime(createHerdrTransport(), registry);
  let widgetContext: ExtensionContext | undefined;
  let unsubscribeTaskUpdates: (() => void) | undefined;
  const widgetKey = "pi-herdr-subagent-running";
  const refreshWidget = () => {
    if (!widgetContext) return;
    const lines = runtime.listTasks()
      .filter(task => task.status === "running")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.subagentId.localeCompare(right.subagentId))
      .map(task => `${task.subagentId} · ${task.label} · ${task.agent} · generation ${task.generation} · running`);
    try {
      if (lines.length) widgetContext.ui.setWidget(widgetKey, lines, { placement: "aboveEditor" });
      else widgetContext.ui.setWidget(widgetKey, undefined);
    } catch { /* Widget failures must not affect runtime behavior. */ }
  };
  const bindWidget = (ctx: ExtensionContext) => {
    widgetContext = ctx;
    unsubscribeTaskUpdates ??= runtime.onTaskUpdate(refreshWidget);
    refreshWidget();
  };
  runtime.setCompletionNotifier(notification => {
    pi.sendMessage({
      customType: completionMessageType,
      content: `Subagent terminal notification: ${JSON.stringify(notification)}. Call subagent_join to read the full Result.`,
      display: true,
      details: notification,
    }, { triggerTurn: true, deliverAs: "followUp" });
  });
  const recoverCurrent = async (ctx: ExtensionContext) => {
    const parentSessionFile = ctx.sessionManager?.getSessionFile?.();
    await runtime.recover(ctx.cwd, parentSessionFile, completionNotificationKeys(ctx.sessionManager.getEntries()));
    bindWidget(ctx);
  };
  pi.on("session_start", async (_event, ctx) => recoverCurrent(ctx));
  pi.on("before_agent_start", async (_event, ctx) => {
    await registry.discover(ctx.cwd);
    const parentSessionFile = ctx.sessionManager?.getSessionFile?.();
    await recoverCurrent(ctx);
    const tools = createSubagentTools(runtime, ctx.cwd, parentSessionFile);
    for (const tool of tools) pi.registerTool(tool);
    pi.setActiveTools([...pi.getActiveTools().filter(name => !name.startsWith("subagent_")), ...tools.map(tool => tool.name)]);
  });
  pi.on("session_shutdown", () => {
    const context = widgetContext;
    try {
      try { context?.ui.setWidget(widgetKey, undefined); }
      catch { /* Continue shutdown after a widget failure. */ }
    } finally {
      try { unsubscribeTaskUpdates?.(); }
      finally {
        unsubscribeTaskUpdates = undefined;
        widgetContext = undefined;
        runtime.stop();
      }
    }
  });
}

async function configuredPackageRoots(cwd: string): Promise<string[]> {
  try {
    const { DefaultPackageManager, SettingsManager } = await import("@earendil-works/pi-coding-agent");
    const agentDir = getAgentDir();
    const settings = SettingsManager.create(cwd, agentDir);
    await settings.reload();
    const manager = new DefaultPackageManager({ cwd, agentDir, settingsManager: settings });
    return [...new Set(manager.listConfiguredPackages().map(packageInfo => packageInfo.installedPath).filter((path): path is string => Boolean(path)))];
  } catch {
    return [];
  }
}

async function packageAgentFiles(packageRoot: string): Promise<Array<{ path: string; content: string }>> {
  const manifestPath = join(packageRoot, "package.json");
  if (!existsSync(manifestPath)) return [];
  try {
    const { isAbsolute, relative } = await import("node:path");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { pi?: { agents?: unknown } };
    if (!Array.isArray(manifest.pi?.agents)) return [];
    const root = resolve(packageRoot);
    const files: Array<{ path: string; content: string }> = [];
    for (const entry of manifest.pi.agents) {
      if (typeof entry !== "string" || !entry.trim() || isAbsolute(entry)) continue;
      const directory = resolve(packageRoot, entry);
      const outside = relative(root, directory);
      if (outside.startsWith("..") || isAbsolute(outside)) continue;
      for (const path of markdownFiles(directory)) files.push({ path, content: readFileSync(path, "utf8") });
    }
    return files;
  } catch {
    return [];
  }
}

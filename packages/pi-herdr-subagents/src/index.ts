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
import { Text, stripTerminalSequences, truncateToWidth, type Component, type TUI } from "@earendil-works/pi-tui";
import { commandFailure, createHerdrClient, hasHerdrErrorCode, type HerdrClient } from "pi-herdr";

const exec = promisify(execFile);
export const paneChildExtensionPath = resolve(dirname(fileURLToPath(import.meta.url)), "../extensions/pane-child.ts");
export type AgentDefinition = { name: string; path: string; body: string; description: string };
export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type ActiveTaskStatus = Extract<TaskStatus, "queued" | "running">;
export type SurfaceCleanupStatus = "pending" | "closed" | "already_closed" | "not_created" | "identity_missing" | "failed";
export type SurfaceCleanupRecord = {
  generation: number; tabId?: string; paneId?: string; status: SurfaceCleanupStatus; attemptedAt: string; error?: string;
  [key: string]: unknown;
};
export type SubagentTask = {
  subagentId: string; taskSlug?: string; generation: number; agent: string; cwd: string; label: string; model?: string; thinking?: string;
  sessionFile: string; resultPath: string; tabId: string; paneId: string; status: TaskStatus;
  createdAt: string; queuedAt: string; startedAt?: string; updatedAt: string; result?: string; error?: string;
  surfaceCleanups?: unknown[];
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
  queuedAt: string;
  startedAt?: string;
  updatedAt: string;
}>;
export type CompletionNotification = {
  subagentId: string; generation: number; status: Exclude<TaskStatus, ActiveTaskStatus>; label: string; reason?: string;
};
export type CompletionNotifier = (notification: CompletionNotification) => void | Promise<void>;
export type TaskRecordV1 = {
  version: 1; subagentId: string; taskSlug?: string; generation: number; agent: string; cwd: string; label: string; model?: string; thinking?: string;
  sessionFile: string; tabId?: string; paneId?: string; status: "starting" | Exclude<TaskStatus, "queued">;
  createdAt: string; updatedAt: string; error?: string; notifiedGeneration?: number;
};
export type TaskRecordV2 = {
  version: 2; subagentId: string; taskSlug?: string; generation: number; agent: string; cwd: string; label: string; model?: string; thinking?: string;
  sessionFile: string; tabId?: string; paneId?: string; status: TaskStatus;
  queuedAt: string; startedAt?: string; updatedAt: string; error?: string; notifiedGeneration?: number; surfaceCleanups?: unknown[];
};
type TaskRecord = TaskRecordV1 | TaskRecordV2;
export type HerdrTransport = {
  createTab(input: { cwd: string; label: string; env?: Record<string, string> }): Promise<{ tabId: string; paneId: string }>;
  run(paneId: string, command: string, args: string[]): Promise<void>;
  sendText(paneId: string, text: string): Promise<void>;
  closePane(paneId: string): Promise<void>;
  closeTab(tabId: string): Promise<"closed" | "already_closed">;
  paneExists(paneId: string): Promise<boolean>;
};

type Json = Record<string, unknown>;
const manifestOwnedFields = new Set([
  "version", "subagentId", "taskSlug", "generation", "agent", "cwd", "label", "model", "thinking", "sessionFile",
  "tabId", "paneId", "status", "createdAt", "queuedAt", "startedAt", "updatedAt", "error", "notifiedGeneration",
]);
function manifestUnknownFields(value: Json): Json {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !manifestOwnedFields.has(key) && (key !== "surfaceCleanups" || !Array.isArray(value.surfaceCleanups))));
}
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
}), options?: { workspaceId?: string }): HerdrTransport {
  const workspaceId = capturedWorkspaceTarget(options);
  const rejectResponse = async (token: string, rootPane: Json | undefined, detail?: string): Promise<never> => {
    const paneId = rootPane?.pane_id;
    let cleanupDetail = "";
    if (hasNonEmptyString(paneId)) {
      try { await client.run(["pane", "close", paneId], {}); }
      catch (error) { cleanupDetail = `; cleanup failed: ${error instanceof Error ? error.message : String(error)}`; }
    }
    throw workspaceCreateError(token, `${detail ?? "Herdr tab create response rejected"}${cleanupDetail}`);
  };
  return {
    async createTab(input) {
      if (workspaceId === undefined) throw workspaceCreateError("parent_workspace_missing");
      if (typeof workspaceId !== "string" || workspaceId.trim().length === 0) throw workspaceCreateError("parent_workspace_invalid");
      const args = ["tab", "create", "--workspace", workspaceId, "--cwd", input.cwd, "--label", input.label, "--no-focus"];
      for (const [name, value] of Object.entries(input.env ?? {})) args.push("--env", `${name}=${value}`);
      const result = await client.exec(args, {});
      if (result.code !== 0 || result.killed) {
        if (workspaceOptionRejected(result)) throw workspaceCreateError("parent_workspace_contract_unsupported", commandFailure(args, result));
        throw new Error(commandFailure(args, result));
      }
      let raw: Json;
      try { raw = unwrap(parseHerdrJson(args, result.stdout)); }
      catch (error) {
        return rejectResponse("parent_workspace_contract_unsupported", undefined, error instanceof Error ? error.message : String(error));
      }
      const tab = raw.tab as Json | undefined;
      const rootPane = raw.root_pane as Json | undefined;
      const tabId = tab?.tab_id;
      const returnedWorkspaceId = tab?.workspace_id;
      const paneId = rootPane?.pane_id;
      if (!hasNonEmptyString(tabId) || !hasNonEmptyString(returnedWorkspaceId) || !hasNonEmptyString(paneId)) {
        return rejectResponse("parent_workspace_contract_unsupported", rootPane);
      }
      if (returnedWorkspaceId !== workspaceId) return rejectResponse("parent_workspace_mismatch", rootPane);
      return { tabId, paneId };
    },
    async run(paneId, command, args) { await client.run(["pane", "run", paneId, powerShellInvocation(command, args)], {}); },
    async sendText(paneId, text) { await client.run(["pane", "run", paneId, text], {}); },
    async closePane(paneId) { await client.run(["pane", "close", paneId], {}); },
    async closeTab(tabId) {
      const args = ["tab", "close", tabId];
      const result = await client.exec(args, {});
      if (result.code === 0 && !result.killed) return "closed";
      if (hasHerdrErrorCode(result, "tab_not_found") || `${result.stderr}\n${result.stdout}`.toLowerCase().includes("tab not found")) return "already_closed";
      throw new Error(commandFailure(args, result));
    },
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
  try {
    await writeFile(temporary, JSON.stringify(value));
    renameSync(temporary, path);
  } finally {
    try { rmSync(temporary, { force: true }); }
    catch { /* Temporary-file cleanup is best effort. */ }
  }
}

export type WidgetPlacement = "aboveEditor" | "belowEditor" | "off";
export type WidgetMode = "progress" | "summary";
export interface SubagentUiSettings {
  widgetPlacement: WidgetPlacement;
  widgetMode: WidgetMode;
  useNerdFont: boolean;
}

export const defaultSubagentUiSettings: Readonly<SubagentUiSettings> = {
  widgetPlacement: "aboveEditor",
  widgetMode: "progress",
  useNerdFont: true,
};

type SettingsWarning = (message: string) => void;

function warnSafely(warn: SettingsWarning, message: string): void {
  try { warn(message); }
  catch { /* Settings warnings must not affect runtime behavior. */ }
}

function normalizeSubagentUiSettings(value: Json, warn: SettingsWarning): SubagentUiSettings {
  const settings = { ...defaultSubagentUiSettings };
  if (value.widgetPlacement === "aboveEditor" || value.widgetPlacement === "belowEditor" || value.widgetPlacement === "off") {
    settings.widgetPlacement = value.widgetPlacement;
  } else if (value.widgetPlacement !== undefined) {
    warnSafely(warn, "Invalid subagent widgetPlacement; using aboveEditor.");
  }
  const validLegacyLayout = value.widgetLayout === "columns" || value.widgetLayout === "stacked";
  if (value.widgetMode === "progress" || value.widgetMode === "summary") {
    settings.widgetMode = value.widgetMode;
  } else if (value.widgetMode === undefined && validLegacyLayout) {
    settings.widgetMode = "progress";
  } else if (value.widgetMode !== undefined) {
    warnSafely(warn, "Invalid subagent widgetMode; using progress.");
  }
  if (value.widgetLayout !== undefined && !validLegacyLayout) {
    warnSafely(warn, "Invalid legacy subagent widgetLayout; ignoring it.");
  }
  if (typeof value.useNerdFont === "boolean") settings.useNerdFont = value.useNerdFont;
  else if (value.useNerdFont !== undefined) warnSafely(warn, "Invalid subagent useNerdFont; using true.");
  return settings;
}

export class SubagentSettingsStore {
  private parsed: Json = {};

  constructor(
    readonly path = join(getAgentDir(), "subagent", "settings.json"),
    private readonly warn: SettingsWarning = message => console.warn(message),
  ) {}

  load(): SubagentUiSettings {
    try {
      const value: unknown = JSON.parse(readFileSync(this.path, "utf8"));
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        this.parsed = {};
        warnSafely(this.warn, "Invalid subagent settings root; using defaults.");
        return { ...defaultSubagentUiSettings };
      }
      this.parsed = value as Json;
      return normalizeSubagentUiSettings(this.parsed, this.warn);
    } catch (error) {
      this.parsed = {};
      if ((error as { code?: unknown }).code !== "ENOENT") warnSafely(this.warn, "Unable to load subagent settings; using defaults.");
      return { ...defaultSubagentUiSettings };
    }
  }

  async save(settings: SubagentUiSettings): Promise<void> {
    const normalized = normalizeSubagentUiSettings(settings as unknown as Json, this.warn);
    const merged: Json = { ...this.parsed, ...normalized };
    await writeAtomic(this.path, merged);
    this.parsed = merged;
  }
}

export class SubagentRuntime {
  private tasks = new Map<string, SubagentTask>();
  private activeTasksDir?: string;
  private monitors = new Map<string, AbortController>();
  private notified = new Set<string>();
  private manifestUnknown = new Map<string, Json>();
  private launches = new Map<string, Promise<void>>();
  private settlements = new Map<string, Promise<void>>();
  private cleanups = new Map<string, Promise<void>>();
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
      queuedAt: task.queuedAt,
      ...(task.startedAt ? { startedAt: task.startedAt } : {}),
      updatedAt: task.updatedAt,
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
    const completionNotifier = this.completionNotifier;
    const tasksDir = this.tasksDir(cwd, parentSessionFile);
    await this.awaitAllOperations();
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
        task.status = result.status;
        task.result = result.result;
        task.error = result.error;
        task.updatedAt = new Date().toISOString();
      } else if (result && !result.valid) {
        task.status = "failed";
        task.error = result.error;
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
      this.prepareRecoveryCleanups(task);
      await this.persist(task);
      if (task.status === "running") this.startMonitor(task);
      await this.runPendingCleanups(task);
      if (isTerminalStatus(task.status)) await this.notifyTerminal(task, completionNotifier);
    }
    this.notifyTaskUpdate();
  }

  async resume(subagentId: string, prompt: string): Promise<SubagentTask> {
    const old = this.get(subagentId);
    if (isActiveStatus(old.status)) throw new Error("Cannot resume an active subagent");
    await this.awaitTaskOperations(old);
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
      surfaceCleanups: cloneJson(old.surfaceCleanups),
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
    this.manifestUnknown.clear();
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
    surfaceCleanups?: unknown[];
  }): Promise<SubagentTask> {
    const completionNotifier = this.completionNotifier;
    const agent = this.resolveAgent(input.agent);
    const tasksDir = input.artifactDir ? dirname(input.artifactDir) : this.tasksDir(input.cwd, input.parentSessionFile);
    this.selectScope(tasksDir);
    const artifactDir = input.artifactDir ?? join(tasksDir, `${input.subagentId}-artifacts`);
    mkdirSync(artifactDir, { recursive: true, mode: 0o700 });
    const sessionFile = input.sessionFile ?? join(tasksDir, `${input.subagentId}-g1.jsonl`);
    const resultPath = join(artifactDir, `result-${input.generation}.json`);
    const queuedAt = new Date().toISOString();
    const task: SubagentTask = {
      subagentId: input.subagentId, taskSlug: input.taskSlug, generation: input.generation, agent: input.agent, cwd: input.cwd, label: input.label,
      model: input.model, thinking: input.thinking, sessionFile, resultPath, tabId: "", paneId: "", status: "queued",
      createdAt: queuedAt, queuedAt, updatedAt: queuedAt,
      ...(input.surfaceCleanups ? { surfaceCleanups: cloneJson(input.surfaceCleanups) } : {}),
    };
    await this.persist(task);
    this.tasks.set(task.subagentId, task);
    this.notifyTaskUpdate();
    const launchKey = this.taskKey(task);
    let finishLaunch!: () => void;
    const launch = new Promise<void>(resolve => { finishLaunch = resolve; });
    this.launches.set(launchKey, launch);
    try {
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
        await this.settle(task, "failed", completionNotifier, undefined, String(error), true);
        throw error;
      }
      if (this.tasks.get(task.subagentId) !== task) {
        try { await this.transport.closeTab(task.tabId); } catch { /* Removal already owns the visible state. */ }
        throw new Error("Subagent was removed during launch");
      }
      if (task.status !== "queued") {
        this.prepareCleanup(task, false, true);
        await this.persist(task);
        await this.runCleanup(task);
        return snapshotTask(task);
      }
      task.status = "running";
      task.startedAt = new Date().toISOString();
      task.updatedAt = task.startedAt;
      await this.persist(task);
      this.notifyTaskUpdate();
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
        await this.settle(task, "failed", completionNotifier, undefined, String(error));
        throw error;
      }
      this.startMonitor(task);
      return snapshotTask(task);
    } finally {
      finishLaunch();
      if (this.launches.get(launchKey) === launch) this.launches.delete(launchKey);
    }
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

  inspect(id: string): SubagentTask { return snapshotTask(this.get(id)); }

  async join(id: string, generation = this.get(id).generation, signal?: AbortSignal): Promise<SubagentTask> {
    const task = this.get(id);
    if (task.generation !== generation) throw new Error("Subagent generation is no longer current");
    await waitForPromise(this.launches.get(this.taskKey(task)), signal);
    const completionNotifier = this.completionNotifier;
    while (isActiveStatus(task.status)) {
      if (existsSync(task.resultPath)) await waitForPromise(this.settleFromResult(task, completionNotifier), signal);
      else await delay(50, undefined, { signal });
    }
    await waitForPromise(this.operationFor(task), signal);
    return snapshotTask(task);
  }

  async steer(id: string, message: string): Promise<SubagentTask> {
    const task = this.get(id);
    if (task.status !== "running") throw new Error("Subagent is not running");
    await this.transport.sendText(task.paneId, message);
    return snapshotTask(task);
  }

  async cancel(id: string): Promise<SubagentTask> {
    const task = this.get(id);
    const completionNotifier = this.completionNotifier;
    await this.launches.get(this.taskKey(task));
    if (isActiveStatus(task.status)) {
      this.stopMonitor(task);
      await this.settle(task, "cancelled", completionNotifier, undefined, undefined, !task.tabId, true);
    } else {
      await this.awaitTaskOperations(task);
    }
    return snapshotTask(task);
  }

  async remove(id: string): Promise<void> {
    const task = this.get(id);
    this.stopMonitor(task);
    await this.launches.get(this.taskKey(task));
    await this.awaitTaskOperations(task);
    this.prepareRecoveryCleanups(task);
    await this.persist(task);
    await this.runPendingCleanups(task);
    const cleanup = recognizedCleanupRecords(task.surfaceCleanups, task.generation)
      .find(value => value.record.status === "pending" || value.record.status === "failed")?.record;
    if (cleanup) throw new Error(`surface_cleanup_failed: ${cleanup.error ?? "cleanup remains pending"}`);
    if (isActiveStatus(task.status) && task.tabId) await this.transport.closeTab(task.tabId);
    this.tasks.delete(id);
    this.manifestUnknown.delete(id);
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
    const completionNotifier = this.completionNotifier;
    this.monitors.set(key, controller);
    void (async () => {
      while (!controller.signal.aborted && task.status === "running") {
        try { await delay(500, undefined, { signal: controller.signal, ref: false }); }
        catch { break; }
        if (existsSync(task.resultPath)) {
          await this.settleFromResult(task, completionNotifier);
          break;
        }
        try {
          const paneExists = await this.transport.paneExists(task.paneId);
          if (controller.signal.aborted) break;
          if (!paneExists) {
            await this.settle(task, "failed", completionNotifier, undefined, "pane_closed");
            break;
          }
        } catch (error) {
          if (controller.signal.aborted) break;
          await this.settle(task, "failed", completionNotifier, undefined, `pane_verification_failed: ${error instanceof Error ? error.message : String(error)}`);
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

  private async settleFromResult(task: SubagentTask, completionNotifier: CompletionNotifier | undefined): Promise<void> {
    const result = this.readResult(task);
    if (result.valid) await this.settle(task, result.status, completionNotifier, result.result, result.error);
    else await this.settle(task, "failed", completionNotifier, undefined, result.error);
  }

  private settle(
    task: SubagentTask,
    status: Exclude<TaskStatus, ActiveTaskStatus>,
    completionNotifier: CompletionNotifier | undefined,
    result?: string,
    error?: string,
    notCreated = false,
    writeCancelledResult = false,
  ): Promise<void> {
    const key = this.taskKey(task);
    const existing = this.settlements.get(key);
    if (existing) return existing;
    if (!isActiveStatus(task.status)) return Promise.resolve();
    const operation = (async () => {
      this.stopMonitor(task);
      if (writeCancelledResult) await writeAtomic(task.resultPath, { subagentId: task.subagentId, generation: task.generation, status: "cancelled" });
      task.status = status;
      task.result = result;
      task.error = error;
      task.updatedAt = new Date().toISOString();
      this.prepareCleanup(task, notCreated);
      await this.persist(task);
      this.notifyTaskUpdate();
      await this.runCleanup(task);
      await this.notifyTerminal(task, completionNotifier);
    })();
    this.settlements.set(key, operation);
    void operation.then(
      () => { if (this.settlements.get(key) === operation) this.settlements.delete(key); },
      () => { if (this.settlements.get(key) === operation) this.settlements.delete(key); },
    );
    return operation;
  }

  private prepareCleanup(task: SubagentTask, notCreated: boolean, retry = false): void {
    const existing = recognizedCleanup(task.surfaceCleanups, task.generation);
    if (existing && isFinalCleanupStatus(existing.record.status)) return;
    if (existing && !retry && existing.record.status === "pending") return;
    const attemptedAt = new Date().toISOString();
    const status: SurfaceCleanupStatus = notCreated ? "not_created" : task.tabId ? "pending" : "identity_missing";
    const record = cleanupRecord(existing?.record, {
      generation: task.generation,
      ...(task.tabId ? { tabId: task.tabId } : {}),
      ...(task.paneId ? { paneId: task.paneId } : {}),
      status,
      attemptedAt,
    });
    setCleanup(task, existing?.index, record);
  }

  private prepareRecoveryCleanups(task: SubagentTask): void {
    if (isTerminalStatus(task.status)) this.prepareCleanup(task, false, true);
    for (const cleanup of recognizedCleanupRecords(task.surfaceCleanups, task.generation)) {
      if (cleanup.record.status !== "pending" && cleanup.record.status !== "failed") continue;
      setCleanup(task, cleanup.index, cleanupRecord(cleanup.record, {
        ...cleanup.record,
        status: "pending",
        attemptedAt: new Date().toISOString(),
      }));
    }
  }

  private async runPendingCleanups(task: SubagentTask): Promise<void> {
    const generations = recognizedCleanupRecords(task.surfaceCleanups, task.generation)
      .filter(value => value.record.status === "pending")
      .map(value => value.record.generation);
    for (const generation of generations) await this.runCleanup(task, generation);
  }

  private runCleanup(task: SubagentTask, generation = task.generation): Promise<void> {
    const key = `${task.subagentId}:${generation}`;
    const existing = this.cleanups.get(key);
    if (existing) return existing;
    const cleanup = recognizedCleanup(task.surfaceCleanups, generation);
    if (!cleanup || cleanup.record.status !== "pending") return Promise.resolve();
    const operation = (async () => {
      try {
        const status = await this.transport.closeTab(cleanup.record.tabId!);
        setCleanup(task, cleanup.index, cleanupRecord(cleanup.record, { ...cleanup.record, status }));
      } catch (error) {
        setCleanup(task, cleanup.index, cleanupRecord(cleanup.record, {
          ...cleanup.record,
          status: "failed",
          error: briefReason(error instanceof Error ? error.message : String(error)),
        }));
      }
      await this.persist(task);
    })();
    this.cleanups.set(key, operation);
    void operation.then(
      () => { if (this.cleanups.get(key) === operation) this.cleanups.delete(key); },
      () => { if (this.cleanups.get(key) === operation) this.cleanups.delete(key); },
    );
    return operation;
  }

  private operationFor(task: SubagentTask): Promise<void> | undefined {
    const key = this.taskKey(task);
    return this.settlements.get(key) ?? this.cleanups.get(key);
  }

  private async awaitTaskOperations(task: SubagentTask): Promise<void> {
    await this.operationFor(task);
  }

  private async awaitAllOperations(): Promise<void> {
    await Promise.all([...this.launches.values(), ...this.settlements.values(), ...this.cleanups.values()]);
  }


  private async notifyTerminal(task: SubagentTask, completionNotifier: CompletionNotifier | undefined): Promise<void> {
    if (isActiveStatus(task.status) || !completionNotifier) return;
    const notification: CompletionNotification = {
      subagentId: task.subagentId,
      generation: task.generation,
      status: task.status,
      label: task.label,
      ...(task.error ? { reason: briefReason(task.error) } : {}),
    };
    try {
      await completionNotifier(notification);
    } catch { /* Recovery retries notifications without a persisted marker. */ }
  }

  private recordPath(task: SubagentTask): string { return join(dirname(task.resultPath), "task.json"); }

  private async persist(task: SubagentTask): Promise<void> {
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

  private readTaskRecord(path: string, tasksDir: string, artifactDir: string, subagentId: string): TaskRecord | undefined {
    try {
      const value = JSON.parse(readFileSync(path, "utf8")) as Json;
      const legacy = isLegacySubagentId(subagentId);
      const canonical = typeof value.taskSlug === "string" && isCanonicalFinalId(subagentId, value.taskSlug);
      if ((value.version !== 1 && value.version !== 2) || value.subagentId !== subagentId || (!legacy && !canonical)
        || typeof value.generation !== "number" || !Number.isInteger(value.generation) || value.generation < 1) return;
      if (legacy ? value.taskSlug !== undefined : !canonical) return;
      if (typeof value.agent !== "string" || typeof value.cwd !== "string" || typeof value.label !== "string" || typeof value.sessionFile !== "string") return;
      if (value.model !== undefined && typeof value.model !== "string") return;
      if (value.thinking !== undefined && typeof value.thinking !== "string") return;
      const expectedSession = join(tasksDir, `${subagentId}-g1.jsonl`);
      if (resolve(value.sessionFile) !== resolve(expectedSession)) return;
      if (value.version === 1) {
        if (typeof value.createdAt !== "string" || typeof value.updatedAt !== "string" || !isTaskRecordV1Status(value.status)) return;
        if (!isIsoTimestamp(value.createdAt) || !isIsoTimestamp(value.updatedAt)) return;
      } else {
        if (!isIsoTimestamp(value.queuedAt) || !isIsoTimestamp(value.updatedAt) || !isTaskStatus(value.status)) return;
        if (value.startedAt !== undefined && !isIsoTimestamp(value.startedAt)) return;
        if (value.status === "running" && value.startedAt === undefined) return;
      }
      if (value.tabId !== undefined && typeof value.tabId !== "string") return;
      if (value.paneId !== undefined && typeof value.paneId !== "string") return;
      if (value.error !== undefined && typeof value.error !== "string") return;
      if (value.notifiedGeneration !== undefined && value.notifiedGeneration !== value.generation) return;
      if (resolve(artifactDir) !== resolve(join(tasksDir, `${subagentId}-artifacts`))) return;
      return value as TaskRecord;
    } catch { return; }
  }

  private readResult(task: SubagentTask):
    | { valid: true; status: Exclude<TaskStatus, ActiveTaskStatus>; result?: string; error?: string }
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

function cloneJson<T>(value: T): T {
  return value === undefined ? value : structuredClone(value);
}

function snapshotTask(task: SubagentTask): SubagentTask {
  return { ...task, ...(task.surfaceCleanups ? { surfaceCleanups: cloneJson(task.surfaceCleanups) } : {}) };
}

function parseCleanupRecord(value: unknown): SurfaceCleanupRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const record = value as Json;
  if (!Number.isInteger(record.generation) || (record.generation as number) < 1 || !isIsoTimestamp(record.attemptedAt)) return;
  if (record.tabId !== undefined && (typeof record.tabId !== "string" || record.tabId.trim().length === 0)) return;
  if (record.paneId !== undefined && (typeof record.paneId !== "string" || record.paneId.trim().length === 0)) return;
  if (!isSurfaceCleanupStatus(record.status)) return;
  if (record.status === "not_created" && (record.tabId !== undefined || record.paneId !== undefined)) return;
  if (record.status === "identity_missing" && record.tabId !== undefined) return;
  if ((record.status === "pending" || record.status === "closed" || record.status === "already_closed" || record.status === "failed") && typeof record.tabId !== "string") return;
  if (record.status === "failed") {
    if (typeof record.error !== "string" || !record.error || briefReason(record.error) !== record.error) return;
  } else if (record.error !== undefined) return;
  return record as SurfaceCleanupRecord;
}

function recognizedCleanup(values: unknown[] | undefined, generation: number): { index: number; record: SurfaceCleanupRecord } | undefined {
  return recognizedCleanupRecords(values, generation).find(value => value.record.generation === generation);
}

function recognizedCleanupRecords(values: unknown[] | undefined, maximumGeneration: number): Array<{ index: number; record: SurfaceCleanupRecord }> {
  if (!values) return [];
  const selected = new Map<number, { index: number; record: SurfaceCleanupRecord }>();
  for (let index = 0; index < values.length; index++) {
    const record = parseCleanupRecord(values[index]);
    if (!record || record.generation > maximumGeneration) continue;
    const current = selected.get(record.generation);
    const actionable = record.status === "pending" || record.status === "failed";
    if (!current || (actionable && current.record.status !== "pending" && current.record.status !== "failed")) {
      selected.set(record.generation, { index, record });
    }
  }
  return [...selected.values()].sort((left, right) => left.index - right.index);
}

function cleanupRecord(existing: SurfaceCleanupRecord | undefined, value: SurfaceCleanupRecord): SurfaceCleanupRecord {
  const unknown = existing
    ? Object.fromEntries(Object.entries(existing).filter(([key]) => !["generation", "tabId", "paneId", "status", "attemptedAt", "error"].includes(key)))
    : {};
  return {
    ...cloneJson(unknown),
    generation: value.generation,
    ...(value.tabId ? { tabId: value.tabId } : {}),
    ...(value.paneId ? { paneId: value.paneId } : {}),
    status: value.status,
    attemptedAt: value.attemptedAt,
    ...(value.status === "failed" && value.error ? { error: value.error } : {}),
  };
}

function setCleanup(task: SubagentTask, index: number | undefined, record: SurfaceCleanupRecord): void {
  const values = cloneJson(task.surfaceCleanups ?? []);
  if (index === undefined) values.push(record);
  else values[index] = record;
  task.surfaceCleanups = values;
}

function isSurfaceCleanupStatus(value: unknown): value is SurfaceCleanupStatus {
  return value === "pending" || value === "closed" || value === "already_closed" || value === "not_created" || value === "identity_missing" || value === "failed";
}

function isFinalCleanupStatus(value: SurfaceCleanupStatus): boolean {
  return value === "closed" || value === "already_closed" || value === "not_created" || value === "identity_missing";
}

async function waitForPromise(promise: Promise<void> | undefined, signal?: AbortSignal): Promise<void> {
  if (!promise) return;
  if (!signal) return promise;
  signal.throwIfAborted();
  let abort!: () => void;
  const aborted = new Promise<void>((_resolve, reject) => {
    abort = () => reject(new DOMException("The operation was aborted", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
  });
  try { await Promise.race([promise, aborted]); }
  finally { signal.removeEventListener("abort", abort); }
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
  if (!subagentId.startsWith(`${taskSlug}-`)) return false;
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
  return value === "queued" || value === "running" || value === "completed" || value === "failed" || value === "cancelled";
}
function isTaskRecordV1Status(value: unknown): value is TaskRecordV1["status"] {
  return value === "starting" || value === "running" || isTerminalStatus(value);
}
function isActiveStatus(value: TaskStatus): value is ActiveTaskStatus {
  return value === "queued" || value === "running";
}
function isTerminalStatus(value: unknown): value is Exclude<TaskStatus, ActiveTaskStatus> {
  return value === "completed" || value === "failed" || value === "cancelled";
}
function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
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
  const tool = (name: string, description: string, parameters: any, execute: (params: any, update?: ToolUpdate, signal?: AbortSignal) => Promise<unknown>, renderer: Record<string, unknown> = {}) => defineTool({
    name, label: name, description, parameters, ...renderer,
    async execute(_id, params, signal, onUpdate) {
      const details = await execute(params, value => onUpdate?.(result(value)), signal);
      return result(details);
    },
  });
  return [
    // Optional avoids schema rejection so missing values use the stable runtime error contract.
    tool("subagent_spawn", "Start one background subagent. taskSlug is required and must be a Router-provided canonical task identity; the parent receives a terminal completion notification without the full Result. After spawning, end the Router turn and wait for that notification instead of polling or routinely calling inspect or join.", Type.Object({ agent: StringEnum(runtime.agentNames()), prompt: Type.String({ minLength: 1 }), label: Type.String({ minLength: 1 }), taskSlug: Type.Optional(Type.String()), model: Type.Optional(Type.String()), thinking: Type.Optional(Type.String()) }), params => runtime.spawn({ ...params, cwd, parentSessionFile }), { renderCall: renderSpawnCall, renderResult: renderSpawnResult }),
    tool("subagent_resume", "Resume a completed or failed subagent.", Type.Object({ subagentId: Type.String(), prompt: Type.String({ minLength: 1 }) }), params => runtime.resume(params.subagentId, params.prompt)),
    tool("subagent_inspect", "Return a non-blocking subagent snapshot for an explicit status check; do not poll this tool while waiting. Prefer the terminal completion notification, then use subagent_join for the full Result.", Type.Object({ subagentId: Type.String() }), params => Promise.resolve(runtime.inspect(params.subagentId))),
    tool("subagent_join", "Wait for a subagent and read its full Result. Use after a terminal completion notification, or when an explicit immediate Result wait is necessary; do not use it for routine polling. Caller cancellation, including ESC, stops only this wait and does not cancel the subagent; use subagent_cancel to cancel it.", Type.Object({ subagentId: Type.String(), generation: Type.Optional(Type.Number()) }), async (params, update, signal) => { update?.(runtime.inspect(params.subagentId)); return runtime.join(params.subagentId, params.generation, signal); }, { renderCall: renderJoinCall, renderResult: renderJoinResult }),
    tool("subagent_steer", "Send a message to a running subagent.", Type.Object({ subagentId: Type.String(), message: Type.String({ minLength: 1 }) }), params => runtime.steer(params.subagentId, params.message)),
    tool("subagent_cancel", "Best-effort cancel a running subagent.", Type.Object({ subagentId: Type.String() }), params => runtime.cancel(params.subagentId)),
    tool("subagent_remove", "Close and remove a subagent and its artifacts.", Type.Object({ subagentId: Type.String() }), async params => { await runtime.remove(params.subagentId); return { status: "removed" }; }),
  ];
}

export type WidgetClock = () => number;

type StatusWidgetOptions = {
  mode: WidgetMode;
  useNerdFont: boolean;
  clock: WidgetClock;
  tui: Pick<TUI, "requestRender">;
  theme?: ThemeLike;
};

function cleanIdentity(value: string): string {
  const clean = stripTerminalSequences(value).replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim();
  return truncateToWidth(clean, 160, "");
}

function elapsedTime(now: number, timestamp: string | undefined): string {
  const started = timestamp === undefined ? Number.NaN : Date.parse(timestamp);
  const totalSeconds = Number.isFinite(started) && now >= started ? Math.floor((now - started) / 1000) : 0;
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function activeTimestamp(task: SubagentTaskObservation): string | undefined {
  return task.status === "running" ? task.startedAt : task.queuedAt;
}

function sortActiveTasks(tasks: readonly SubagentTaskObservation[]): SubagentTaskObservation[] {
  return tasks.filter(task => isActiveStatus(task.status)).sort((left, right) => {
    if (left.status !== right.status) return left.status === "running" ? -1 : 1;
    const leftTime = Date.parse(activeTimestamp(left) ?? "");
    const rightTime = Date.parse(activeTimestamp(right) ?? "");
    const normalizedLeft = Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY;
    const normalizedRight = Number.isFinite(rightTime) ? rightTime : Number.POSITIVE_INFINITY;
    return normalizedLeft - normalizedRight || left.subagentId.localeCompare(right.subagentId);
  });
}

export function createSubagentStatusWidget(
  tasks: readonly SubagentTaskObservation[],
  options: StatusWidgetOptions,
): Component & { dispose(): void } {
  const snapshot = tasks.map(task => ({ ...task }));
  const active = sortActiveTasks(snapshot);
  let timer: ReturnType<typeof setInterval> | undefined;
  if (options.mode === "progress" && active.length > 0) {
    try {
      timer = setInterval(() => {
        try { options.tui.requestRender(); }
        catch { /* Timer rendering must not affect runtime behavior. */ }
      }, 1000);
      timer.unref?.();
    } catch { /* A timer failure leaves lifecycle behavior available. */ }
  }

  return {
    invalidate() {},
    render(width: number): string[] {
      try {
        const maxWidth = Math.max(1, Math.floor(width));
        const ellipsis = options.useNerdFont ? "…" : "...";
        const now = options.mode === "progress" ? options.clock() : 0;
        if (options.mode === "summary") {
          const counts = {
            running: snapshot.filter(task => task.status === "running").length,
            queued: snapshot.filter(task => task.status === "queued").length,
            completed: snapshot.filter(task => task.status === "completed").length,
            failed: snapshot.filter(task => task.status === "failed" || task.status === "cancelled").length,
          };
          const parts = [
            counts.running ? `${options.useNerdFont ? "" : ">"} ${counts.running} running` : "",
            counts.queued ? `${options.useNerdFont ? "" : "~"} ${counts.queued} queued` : "",
            counts.completed ? `${options.useNerdFont ? "" : "+"} ${counts.completed} completed` : "",
            counts.failed ? `${options.useNerdFont ? "" : "!"} ${counts.failed} failed` : "",
          ].filter(Boolean);
          return parts.length ? [truncateToWidth(parts.join("  "), maxWidth, ellipsis)] : [];
        }
        const rows = active.slice(0, 6).map(task => {
          const icon = task.status === "running" ? options.useNerdFont ? "" : ">" : options.useNerdFont ? "" : "~";
          const label = cleanIdentity(task.label) || cleanIdentity(task.subagentId);
          const agent = cleanIdentity(task.agent);
          const identity = agent && agent !== label ? `${label} · ${agent}` : label;
          const elapsed = elapsedTime(now, activeTimestamp(task));
          const normal = `${icon} ${identity}  ${elapsed}  ${task.status}`;
          const narrow = `${icon} ${task.status} ${identity}`;
          const color = task.status === "running" ? "warning" : "muted";
          return truncateToWidth(paint(options.theme, color, maxWidth < 32 ? narrow : normal), maxWidth, ellipsis);
        });
        if (active.length > 6) rows.push(truncateToWidth(`+${active.length - 6} more`, maxWidth, ellipsis));
        return rows;
      } catch {
        return [];
      }
    },
    dispose() {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    },
  };
}

const completionMessageType = "pi-herdr-subagent-completion";

function notificationKey(value: Pick<CompletionNotification, "subagentId" | "generation" | "status">): string {
  return `${completionMessageType}/v1:${value.subagentId}:${value.generation}:${value.status}`;
}

function completionNotificationKeys(entries: readonly { type: string; customType?: string; details?: unknown }[]): string[] {
  const keys: string[] = [];
  for (const entry of entries) {
    if (entry.type !== "custom_message" || entry.customType !== completionMessageType || !entry.details || typeof entry.details !== "object") continue;
    const details = entry.details as Partial<CompletionNotification> & { schema?: unknown; reason?: unknown };
    if (details.schema !== `${completionMessageType}/v1`) continue;
    if (typeof details.subagentId === "string" && isNotificationSubagentId(details.subagentId)
      && Number.isInteger(details.generation) && details.generation! >= 1
      && isTerminalStatus(details.status) && typeof details.label === "string"
      && (details.reason === undefined || typeof details.reason === "string")) {
      keys.push(notificationKey(details as CompletionNotification));
    }
  }
  return keys;
}

export default function subagentsExtension(pi: ExtensionAPI, dependencies: {
  runtime?: SubagentRuntime;
  registry?: AgentRegistry;
  settingsStore?: SubagentSettingsStore;
  settingsStoreFactory?: (warn: SettingsWarning) => SubagentSettingsStore;
  clock?: WidgetClock;
} = {}): void {
  if (process.env.PI_HERDR_SUBAGENT_RESULT_PATH) return;
  const registry = dependencies.registry ?? new AgentRegistry();
  const runtime = dependencies.runtime ?? new SubagentRuntime(createHerdrTransport(), registry);
  const clock = dependencies.clock ?? Date.now;
  const createSettingsStore = dependencies.settingsStoreFactory ?? ((warn: SettingsWarning) => new SubagentSettingsStore(undefined, warn));
  let settingsStore = dependencies.settingsStore;
  let settings = { ...defaultSubagentUiSettings };
  let widgetContext: ExtensionContext | undefined;
  let warningContext: ExtensionContext | undefined;
  let unsubscribeTaskUpdates: (() => void) | undefined;
  const createNotificationCoordinator = (epoch: number) => ({
    epoch,
    active: true,
    context: undefined as ExtensionContext | undefined,
    startupDelivery: false,
    parentRunActive: false,
    flushPromise: undefined as Promise<void> | undefined,
    pendingNotifications: new Map<string, CompletionNotification>(),
    attemptedNotifications: new Set<string>(),
  });
  let notificationCoordinator = createNotificationCoordinator(0);
  const widgetKey = "pi-herdr-subagent-progress";

  const refreshWidget = () => {
    if (!widgetContext) return;
    try {
      const tasks = runtime.listTasks();
      const hasContent = settings.widgetMode === "progress"
        ? tasks.some(task => isActiveStatus(task.status))
        : tasks.length > 0;
      if (settings.widgetPlacement === "off" || !hasContent) {
        widgetContext.ui.setWidget(widgetKey, undefined);
        return;
      }
      const placement = settings.widgetPlacement;
      widgetContext.ui.setWidget(widgetKey, (tui, theme) => createSubagentStatusWidget(tasks, {
        mode: settings.widgetMode,
        useNerdFont: settings.useNerdFont,
        clock,
        tui,
        theme,
      }), { placement });
    } catch { /* Widget failures must not affect runtime behavior. */ }
  };
  const unbindWidget = () => {
    const context = widgetContext;
    widgetContext = undefined;
    warningContext = undefined;
    try { unsubscribeTaskUpdates?.(); }
    catch { /* Continue cleanup after an unsubscribe failure. */ }
    unsubscribeTaskUpdates = undefined;
    try { context?.ui.setWidget(widgetKey, undefined); }
    catch { /* Continue cleanup after a widget failure. */ }
  };
  const bindWidget = (ctx: ExtensionContext) => {
    warningContext = ctx;
    widgetContext = ctx;
    unsubscribeTaskUpdates = runtime.onTaskUpdate(refreshWidget);
    refreshWidget();
  };
  const isIdle = (ctx: ExtensionContext): boolean => {
    const idle = (ctx as ExtensionContext & { isIdle?: () => boolean }).isIdle;
    return typeof idle === "function" && idle();
  };
  const branchKeys = (ctx: ExtensionContext): Set<string> => {
    const manager = ctx.sessionManager as typeof ctx.sessionManager & { getBranch?: () => readonly { type: string; customType?: string; details?: unknown }[] };
    return new Set(completionNotificationKeys(typeof manager.getBranch === "function" ? manager.getBranch() : []));
  };
  const isCurrentCoordinator = (coordinator: ReturnType<typeof createNotificationCoordinator>): boolean => coordinator.active && notificationCoordinator === coordinator && coordinator.epoch === notificationCoordinator.epoch;
  const resetNotificationCoordinator = async (): Promise<void> => {
    const previous = notificationCoordinator;
    previous.active = false;
    notificationCoordinator = createNotificationCoordinator(previous.epoch + 1);
    await previous.flushPromise?.catch(() => {});
  };
  const flushNotifications = (coordinator: ReturnType<typeof createNotificationCoordinator>, ctx: ExtensionContext, triggerTurn: boolean): void => {
    if (!isCurrentCoordinator(coordinator)) return;
    const acknowledged = branchKeys(ctx);
    for (const key of coordinator.pendingNotifications.keys()) {
      if (acknowledged.has(key)) {
        coordinator.pendingNotifications.delete(key);
        coordinator.attemptedNotifications.delete(key);
      } else {
        coordinator.attemptedNotifications.delete(key);
      }
    }
    for (const [key, notification] of coordinator.pendingNotifications) {
      if (!isCurrentCoordinator(coordinator)) return;
      if (coordinator.attemptedNotifications.has(key)) continue;
      coordinator.attemptedNotifications.add(key);
      try {
        pi.sendMessage({
          customType: completionMessageType,
          content: `Subagent terminal notification: ${JSON.stringify(notification)}. Call subagent_join to read the full Result.`,
          display: true,
          details: { schema: `${completionMessageType}/v1`, ...notification },
        }, { triggerTurn, deliverAs: "followUp" });
      } catch {
        coordinator.attemptedNotifications.delete(key);
      }
    }
  };
  const requestFlush = (coordinator: ReturnType<typeof createNotificationCoordinator>, ctx: ExtensionContext, triggerTurn: boolean): Promise<void> => {
    if (!isCurrentCoordinator(coordinator)) return Promise.resolve();
    if (coordinator.flushPromise) return coordinator.flushPromise;
    const flush = Promise.resolve()
      .then(() => flushNotifications(coordinator, ctx, triggerTurn))
      .catch(() => {});
    coordinator.flushPromise = flush;
    void flush.then(() => {
      if (coordinator.flushPromise === flush) coordinator.flushPromise = undefined;
    });
    return flush;
  };
  const registerNotification = async (notification: CompletionNotification, coordinator: ReturnType<typeof createNotificationCoordinator> = notificationCoordinator): Promise<void> => {
    const key = notificationKey(notification);
    coordinator.pendingNotifications.set(key, notification);
    const ctx = coordinator.context;
    if (!ctx || coordinator.startupDelivery || coordinator.parentRunActive || !isIdle(ctx)) return;
    await requestFlush(coordinator, ctx, true);
  };
  const bindNotificationNotifier = (coordinator: ReturnType<typeof createNotificationCoordinator>) => {
    runtime.setCompletionNotifier(notification => registerNotification(notification, coordinator));
  };
  bindNotificationNotifier(notificationCoordinator);

  const recoverCurrent = async (ctx: ExtensionContext, startup = false) => {
    const coordinator = notificationCoordinator;
    runtime.setCompletionNotifier(notification => registerNotification(notification, coordinator));
    coordinator.context = ctx;
    unbindWidget();
    warningContext = ctx;
    if (startup) coordinator.startupDelivery = true;
    let recovered = false;
    settingsStore ??= createSettingsStore(message => warningContext?.ui.notify(message, "warning"));
    try {
      try { settings = settingsStore.load(); }
      catch { settings = { ...defaultSubagentUiSettings }; }
      const parentSessionFile = ctx.sessionManager?.getSessionFile?.();
      await runtime.recover(ctx.cwd, parentSessionFile, [...branchKeys(ctx)]);
      bindWidget(ctx);
      recovered = true;
    } catch (error) {
      warningContext = undefined;
      throw error;
    } finally {
      if (startup) {
        coordinator.startupDelivery = false;
        if (recovered) await requestFlush(coordinator, ctx, false);
      }
    }
  };
  pi.on("session_start", async (_event, ctx) => {
    await resetNotificationCoordinator();
    const coordinator = notificationCoordinator;
    coordinator.parentRunActive = false;
    await recoverCurrent(ctx, true);
  });
  pi.on("before_agent_start", async (_event, ctx) => {
    const coordinator = notificationCoordinator;
    coordinator.parentRunActive = true;
    coordinator.context = ctx;
    await registry.discover(ctx.cwd);
    const parentSessionFile = ctx.sessionManager?.getSessionFile?.();
    await recoverCurrent(ctx);
    const tools = createSubagentTools(runtime, ctx.cwd, parentSessionFile);
    for (const tool of tools) pi.registerTool(tool);
    pi.setActiveTools([...pi.getActiveTools().filter(name => !name.startsWith("subagent_")), ...tools.map(tool => tool.name)]);
  });
  pi.on("agent_start", (_event, ctx) => {
    const coordinator = notificationCoordinator;
    coordinator.parentRunActive = true;
    coordinator.context = ctx;
  });
  pi.on("agent_end", () => {
    // A low-level run can be followed by retry, compaction, or queued input.
  });
  pi.on("agent_settled", async (_event, ctx) => {
    const coordinator = notificationCoordinator;
    coordinator.context = ctx;
    coordinator.parentRunActive = false;
    if (!coordinator.startupDelivery && isIdle(ctx)) await requestFlush(coordinator, ctx, true);
  });
  pi.on("session_shutdown", async () => {
    try {
      await resetNotificationCoordinator();
      unbindWidget();
    } finally { runtime.stop(); }
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


function hasNonEmptyString(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
function workspaceCreateError(token: string, detail?: string): Error {
  return new Error(detail ? `${token}: ${detail}` : token);
}
function workspaceOptionRejected(result: { stdout: string; stderr: string }): boolean {
  const output = `${result.stderr}\n${result.stdout}`;
  return /--workspace\b/i.test(output)
    && /(?:unknown|unrecognized|unsupported|invalid|unexpected)\s+(?:option|argument|flag)|(?:option|argument|flag).*?(?:not\s+supported|unsupported|not\s+recognized)/i.test(output);
}
function parseHerdrJson(args: readonly string[], output: string): Json {
  try {
    const value: unknown = JSON.parse(output);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Json;
  } catch {
    throw new Error(`herdr ${args.slice(0, 2).join(" ")} returned invalid JSON`);
  }
}
function capturedWorkspaceTarget(options?: { workspaceId?: string }): string | undefined {
  return options && Object.prototype.hasOwnProperty.call(options, "workspaceId") ? options.workspaceId : process.env.HERDR_WORKSPACE_ID;
}

import { randomUUID } from "node:crypto";
import { resultPublisher } from "./result-publication.js";
import { createRequire } from "node:module";
import { checkImageAccess, checkedImageDirectory, cleanupImages, ImageInputError, protectImageDirectory, snapshotImages } from "./image-input.js";
import { execFile, spawnSync } from "node:child_process";
import { constants, closeSync, fstatSync, openSync, existsSync, lstatSync, realpathSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, rmdirSync, unlinkSync, type Stats } from "node:fs";
import { open, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { isDeepStrictEqual, promisify } from "node:util";
import { StringEnum, Type, type ImageContent } from "@earendil-works/pi-ai";
import { defineTool, getAgentDir, type ExtensionAPI, type ExtensionContext, type Theme } from "@earendil-works/pi-coding-agent";
import { Text, stripTerminalSequences, truncateToWidth, type Component, type TUI } from "@earendil-works/pi-tui";
import { commandFailure, createHerdrClient, hasHerdrErrorCode, type HerdrClient } from "@settingdust/pi-herdr";

const exec = promisify(execFile);
export const paneChildExtensionPath = resolve(dirname(fileURLToPath(import.meta.url)), "../extensions/pane-child.ts");
export type AgentDefinition = { name: string; path: string; body: string; description: string };
export type ExplicitSpawnModelFailureCode =
  | "invalid_model_reference"
  | "provider_unavailable"
  | "model_not_found"
  | "model_unavailable"
  | "model_registry_error";
export type ExplicitSpawnModelOperation = "registry" | "getProvider" | "auth" | "find" | "getAvailable";
export type SpawnModelRegistry = {
  getProvider(provider: string): unknown;
  getProviderAuthStatus(provider: string): { configured?: unknown };
  find(provider: string, modelId: string): { provider: string; id: string } | undefined;
  getAvailable(): readonly { provider: string; id: string }[];
};

export class ExplicitSpawnModelError extends Error {
  readonly code: ExplicitSpawnModelFailureCode;
  readonly detail: string;
  readonly operation?: ExplicitSpawnModelOperation;

  constructor(code: ExplicitSpawnModelFailureCode, detail: string, operation?: ExplicitSpawnModelOperation) {
    super(detail);
    this.name = "ExplicitSpawnModelError";
    this.code = code;
    this.detail = detail;
    if (operation !== undefined) this.operation = operation;
  }
}

function bounded(value: string): string {
  const points = [...value];
  return points.length <= 120 ? value : `${points.slice(0, 120).join("")}…`;
}

function quoted(value: string): string { return JSON.stringify(bounded(value)); }
function registryError(operation: ExplicitSpawnModelOperation): never {
  throw new ExplicitSpawnModelError("model_registry_error", `Model registry integration failed at ${operation}.`, operation);
}
function registryIdentity(value: unknown, operation: "find" | "getAvailable"): { provider: string; id: string } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) registryError(operation);
  const provider = (value as { provider?: unknown }).provider;
  const id = (value as { id?: unknown }).id;
  if (
    typeof provider !== "string" || typeof id !== "string"
    || provider.length === 0 || id.length === 0 || provider.includes("/")
    || /[\u0000-\u001f\u007f]/.test(provider) || /[\u0000-\u001f\u007f]/.test(id)
    || Buffer.byteLength(`${provider}/${id}`, "utf8") > 256
  ) registryError(operation);
  return { provider, id };
}

export function validateExplicitSpawnModel(model: unknown, registry?: SpawnModelRegistry): string | undefined {
  if (model === undefined) return;
  if (typeof model !== "string") {
    const kind = model === null ? "null" : Array.isArray(model) ? "array" : typeof model;
    throw new ExplicitSpawnModelError("invalid_model_reference", `Expected an exact provider/modelId string; received type ${quoted(kind)}.`);
  }
  const separator = model.indexOf("/");
  if (separator <= 0 || separator === model.length - 1 || /[\u0000-\u001f\u007f]/.test(model) || Buffer.byteLength(model, "utf8") > 256) {
    throw new ExplicitSpawnModelError("invalid_model_reference", `Expected an exact provider/modelId reference; received ${quoted(model)}.`);
  }
  const provider = model.slice(0, separator);
  const modelId = model.slice(separator + 1);
  if (!registry || typeof registry !== "object") registryError("registry");

  let getProvider: SpawnModelRegistry["getProvider"];
  try { getProvider = registry.getProvider; } catch { registryError("getProvider"); }
  if (typeof getProvider !== "function") registryError("getProvider");
  let knownProvider: unknown;
  try { knownProvider = getProvider.call(registry, provider); } catch { registryError("getProvider"); }
  if (knownProvider === undefined) {
    throw new ExplicitSpawnModelError("provider_unavailable", `Provider ${quoted(provider)} is unavailable: unknown provider.`);
  }

  let getAuth: SpawnModelRegistry["getProviderAuthStatus"];
  try { getAuth = registry.getProviderAuthStatus; } catch { registryError("auth"); }
  if (typeof getAuth !== "function") registryError("auth");
  let auth: { configured?: unknown };
  try { auth = getAuth.call(registry, provider); } catch { registryError("auth"); }
  let configured: unknown;
  try { configured = auth?.configured; } catch { registryError("auth"); }
  if (configured !== true) {
    throw new ExplicitSpawnModelError("provider_unavailable", `Provider ${quoted(provider)} is unavailable: authentication is not configured.`);
  }

  let find: SpawnModelRegistry["find"];
  try { find = registry.find; } catch { registryError("find"); }
  if (typeof find !== "function") registryError("find");
  let found: { provider: string; id: string } | undefined;
  try {
    const candidate: unknown = find.call(registry, provider, modelId);
    found = candidate === undefined ? undefined : registryIdentity(candidate, "find");
  } catch {
    registryError("find");
  }
  if (found === undefined) throw new ExplicitSpawnModelError("model_not_found", `Model ${quoted(model)} was not found.`);
  if (found.provider !== provider || found.id !== modelId) registryError("find");

  let getAvailable: SpawnModelRegistry["getAvailable"];
  try { getAvailable = registry.getAvailable; } catch { registryError("getAvailable"); }
  if (typeof getAvailable !== "function") registryError("getAvailable");
  let available = false;
  try {
    const snapshot = getAvailable.call(registry);
    for (const candidate of snapshot) {
      const identity = registryIdentity(candidate, "getAvailable");
      if (identity.provider === provider && identity.id === modelId) available = true;
    }
  } catch { registryError("getAvailable"); }
  if (!available) {
    throw new ExplicitSpawnModelError("model_unavailable", `Model ${quoted(model)} is unavailable in the current catalog/auth snapshot.`);
  }
  return model;
}

function readImages(input: { images?: ImageContent[] }): ImageContent[] | undefined {
  try { return input.images; }
  catch { throw new Error("Invalid images input."); }
}

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

export type RetainedSessionKey = Readonly<{ scopeIdentity: string; subagentId: string; observedGeneration: number }>;
export type CurrentRetainedSessionItem = RetainedSessionKey & Readonly<{
  label: string; agent: string; terminalStatus: Exclude<TaskStatus, ActiveTaskStatus>;
  sessionFile: string; resultFile: string;
  displayedTime: { label: "Result file modified time"; mtimeMs: number };
}>;

function checkedRetainedPath(path: string, directory: boolean): string {
  const absolute = resolve(path);
  const stat = lstatSync(absolute);
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())) throw new Error("invalid_retained_path");
  const canonical = realpathSync(absolute);
  if (relative(absolute, canonical) !== "") throw new Error("invalid_retained_path");
  return canonical;
}

type ImageInputPublication = { check(): void; cleanup(): void };

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

function buildNodeLaunchScript(cwd: string, command: string, args: string[], retainedSession = false, imageInput = false): string {
  const invocation = command === "pi" ? resolveCurrentPiInvocation() : { command, args: [] };
  const spec = Buffer.from(JSON.stringify({ cwd, command: invocation.command, args: [...invocation.args, ...args] }), "utf8").toString("base64");
  if (retainedSession) return [
    `const { spawnSync } = require("node:child_process");`,
    `const spec = JSON.parse(Buffer.from(${JSON.stringify(spec)}, "base64").toString("utf8"));`,
    `const env = { ...process.env };`,
    `for (const key of Object.keys(env)) if (key.startsWith("PI_HERDR_SUBAGENT_")) delete env[key];`,
    `const result = spawnSync(spec.command, spec.args, { cwd: spec.cwd, env, stdio: "inherit" });`,
    `if (result.error) throw result.error;`,
    `process.exit(result.status ?? 1);`,
  ].join("\r\n");
  return [
    `const { spawnSync } = require("node:child_process");`,
    `const resultModule = ${JSON.stringify(resolve(dirname(fileURLToPath(import.meta.url)), "result-publication.ts"))};`,
    `const resultTools = require(${JSON.stringify(createRequire(import.meta.url).resolve("jiti"))}).createJiti(resultModule)(resultModule);`,
    ...(imageInput ? [
      `const { dirname, join } = require("node:path");`,
      `const imageModule = ${JSON.stringify(resolve(dirname(fileURLToPath(import.meta.url)), "image-input.ts"))};`,
      `const imageTools = require(${JSON.stringify(createRequire(import.meta.url).resolve("jiti"))}).createJiti(imageModule)(imageModule);`,
    ] : []),
    `const spec = JSON.parse(Buffer.from(${JSON.stringify(spec)}, "base64").toString("utf8"));`,
    `const fail = async error => {`,
    `  const path = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;`,
    `  const subagentId = process.env.PI_HERDR_SUBAGENT_ID;`,
    `  const generation = Number(process.env.PI_HERDR_SUBAGENT_GENERATION);`,
    `  if (!path || !subagentId || !Number.isInteger(generation)) return;`,
    imageInput
      ? `  const check = () => imageTools.imageLaunch(join(dirname(dirname(path)), subagentId + "-g1.jsonl"));`
      : `  const check = () => {};`,
    `  await resultTools.resultPublisher(path, check).publish(JSON.stringify({ subagentId, generation, status: "failed", error }));`,
    `};`,
    `(async () => {`,
    `  const result = spawnSync(spec.command, spec.args, { cwd: spec.cwd, env: process.env, stdio: "inherit" });`,
    `  if (result.error) { await fail("launch_failed: " + result.error.message); throw result.error; }`,
    `  await fail(result.status === 0 ? "child_exited_without_result" : "child_exit_" + (result.status ?? 1));`,
    `  process.exit(result.status ?? 1);`,
    `})().catch(() => { console.error("Child Result publication or launch failed."); process.exit(1); });`,
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

// Only a current-generation Result can authorize takeover, never a manifest.
// Exactly two links, one matching local publication temporary, and private storage
// account for every link; an outside link cannot be mistaken for a leftover.
function cleanupResultTemporary(path: string, file: number, expected: Stats): void {
  if (expected.nlink !== 2) throw new Error();
  const directory = dirname(path);
  const ownedDirectory = checkedImageDirectory(directory);
  checkImageAccess(directory, true);
  const prefix = basename(path) + ".";
  const candidates = readdirSync(directory).filter(name => name.startsWith(prefix)
    && /^[1-9]\d*-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.tmp$/.test(name.slice(prefix.length)));
  const sameFile = (stat: Stats) => stat.isFile() && !stat.isSymbolicLink()
    && stat.nlink === 2 && stat.dev === expected.dev && stat.ino === expected.ino;
  const matches = candidates.filter(name => sameFile(lstatSync(join(directory, name))));
  if (matches.length !== 1) throw new Error();
  const temporary = join(directory, matches[0]!);
  checkImageAccess(path, false, 2);
  checkImageAccess(temporary, false, 2);
  const currentDirectory = checkedImageDirectory(directory);
  if (currentDirectory.dev !== ownedDirectory.dev || currentDirectory.ino !== ownedDirectory.ino
    || !sameFile(fstatSync(file)) || !sameFile(lstatSync(path)) || !sameFile(lstatSync(temporary))) throw new Error();
  unlinkSync(temporary);
}

// Result issuance keeps source integrity checks, not image/private-account admission.
function checkResultSource(path: string, directory: boolean): void {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())
    || (!directory && stat.nlink !== 1) || relative(resolve(path), realpathSync(path)) !== "") throw new Error();
  if (process.platform !== "win32") return;
  const script = [
    "$ErrorActionPreference = 'Stop'", "try {",
    "$path = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + Buffer.from(path, "utf8").toString("base64") + "'))",
    "if ([IO.File]::GetAttributes($path) -band [IO.FileAttributes]::ReparsePoint) { throw 'redirected' }",
    "[Console]::Out.Write('regular')", "} catch { exit 1 }", "exit 0", "",
  ].join("\n");
  const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "Invoke-Expression ([Console]::In.ReadToEnd())"], {
    input: script, encoding: "utf8", windowsHide: true, timeout: 10000,
  });
  if (result.error || result.status !== 0 || result.stdout.trim() !== "regular") throw new Error();
}

function readTaskArtifact(path: string, result = false, issuing = false): string | undefined {
  let file: number | undefined;
  try {
    const expected = lstatSync(path, { throwIfNoEntry: false });
    if (!expected) return;
    const check = (stat: Stats) => {
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1
        || stat.dev !== expected.dev || stat.ino !== expected.ino
        || (issuing && (stat.size !== expected.size || stat.mtimeMs !== expected.mtimeMs || stat.ctimeMs !== expected.ctimeMs))) throw new Error();
    };
    if (!expected.isFile() || expected.isSymbolicLink()) throw new Error();
    if (relative(resolve(path), realpathSync(path)) !== "") throw new Error();
    if (issuing) checkResultSource(path, false);
    file = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    if (result && expected.nlink === 2) cleanupResultTemporary(path, file, expected);
    check(fstatSync(file));
    const bytes = readFileSync(file, "utf8");
    check(fstatSync(file));
    if (issuing) checkResultSource(path, false);
    check(lstatSync(path));
    return bytes;
  } catch { throw new ImageInputError("storage"); }
  finally { if (file !== undefined) closeSync(file); }
}

async function writeAtomic(path: string, value: unknown, check = () => {}, commit = () => {}): Promise<void> {
  check();
  commit();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}-${randomUUID()}.tmp`;
  try {
    check();
    await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
    check();
    commit();
    renameSync(temporary, path);
  } finally {
    try { check(); rmSync(temporary, { force: true }); }
    catch { /* Never clean a temporary through redirected storage. */ }
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
  private monitorEpoch = 0;
  private notified = new Set<string>();
  private manifestUnknown = new Map<string, Json>();
  private launches = new Map<string, Promise<void>>();
  private removals = new Map<SubagentTask, Promise<void>>();
  private settlements = new Map<string, Promise<void>>();
  private pendingSettlements = new Map<string, (effects: boolean) => Promise<void>>();
  private recovery?: Promise<void>;
  private cleanups = new Map<string, Promise<void>>();
  private cleanupOutcomes = new Map<string, { task: SubagentTask; index: number; record: SurfaceCleanupRecord }>();
  private imageCleanups = new Map<string, () => void>();
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

  private retainedScope(parentSessionFile?: string): string {
    if (!parentSessionFile?.trim() || !isAbsolute(parentSessionFile)) throw new Error("persisted_parent_session_required");
    checkedRetainedPath(parentSessionFile, false);
    // Deliberately bypass the test-root/cwd fallback: neither proves parent ownership.
    const scope = resolve(join(parentSessionFile.replace(/\.jsonl$/i, ""), "tasks"));
    if (scope !== this.activeTasksDir) throw new Error("retained_parent_scope_mismatch");
    return scope;
  }

  listRetainedSessions(parentSessionFile?: string): CurrentRetainedSessionItem[] {
    const scopeIdentity = this.retainedScope(parentSessionFile);
    const items: CurrentRetainedSessionItem[] = [];
    for (const task of this.tasks.values()) {
      try {
        const item = this.resolveRetainedSession(parentSessionFile, { scopeIdentity, subagentId: task.subagentId, observedGeneration: task.generation });
        if (item) items.push(item);
      } catch { /* Invalid artifacts are ineligible; never repair them here. */ }
    }
    return items.sort((a, b) => b.displayedTime.mtimeMs - a.displayedTime.mtimeMs || a.subagentId.localeCompare(b.subagentId));
  }

  resolveRetainedSession(parentSessionFile: string | undefined, key: RetainedSessionKey | undefined): CurrentRetainedSessionItem | undefined {
    if (key === undefined) return; // Picker cancellation has no filesystem or runtime effects.
    const scopeIdentity = this.retainedScope(parentSessionFile);
    if (key.scopeIdentity !== scopeIdentity) throw new Error("retained_parent_scope_mismatch");
    const task = this.get(key.subagentId);
    if (task.generation !== key.observedGeneration || !isTerminalStatus(task.status)) throw new Error("stale_retained_selection");
    if (!isNotificationSubagentId(task.subagentId)) throw new Error("invalid_retained_task");
    const root = checkedRetainedPath(scopeIdentity, true);
    const artifactRoot = checkedRetainedPath(join(root, `${task.subagentId}-artifacts`), true);
    if (relative(root, artifactRoot) !== `${task.subagentId}-artifacts`) throw new Error("invalid_retained_path");
    const resultFile = checkedRetainedPath(join(artifactRoot, `result-${task.generation}.json`), false);
    if (resolve(task.resultPath) !== resultFile) throw new Error("invalid_retained_path");
    const recordPath = checkedRetainedPath(join(artifactRoot, "task.json"), false);
    const record = this.readTaskRecord(recordPath, root, artifactRoot, task.subagentId);
    if (!record || record.generation !== task.generation || record.status !== task.status || record.sessionFile !== task.sessionFile) throw new Error("stale_retained_selection");
    const expectedSession = join(root, `${task.subagentId}-g1.jsonl`);
    if (!isAbsolute(record.sessionFile) || record.sessionFile.split(/[\\/]/).includes("..") || resolve(record.sessionFile) !== expectedSession) throw new Error("invalid_retained_path");
    const sessionFile = checkedRetainedPath(record.sessionFile, false);
    const result = this.readResult({ ...task, resultPath: resultFile });
    if (!result.valid || result.status !== task.status) throw new Error("invalid_retained_result");
    return {
      scopeIdentity, subagentId: task.subagentId, observedGeneration: task.generation,
      label: cleanIdentity(task.label) || task.subagentId, agent: cleanIdentity(task.agent), terminalStatus: task.status,
      sessionFile, resultFile, displayedTime: { label: "Result file modified time", mtimeMs: lstatSync(resultFile).mtimeMs },
    };
  }

  async launchRetainedSession(parentSessionFile: string | undefined, key: RetainedSessionKey | undefined): Promise<void> {
    const item = this.resolveRetainedSession(parentSessionFile, key);
    if (!item) return;
    const cwd = this.get(item.subagentId).cwd;
    const script = buildNodeLaunchScript(cwd, "pi", ["--session", item.sessionFile], true);
    const surface = await this.transport.createTab({ cwd, label: item.label });
    try {
      await this.transport.run(surface.paneId, bootstrapRuntime(), ["-e", script]);
    } catch (error) {
      try { await this.transport.closeTab(surface.tabId); }
      catch (closeError) {
        throw new Error(`${error instanceof Error ? error.message : String(error)}; cleanup failed: ${briefReason(String(closeError))}`, { cause: error });
      }
      throw error;
    }
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
    model?: unknown;
    thinking?: string;
    parentSessionFile?: string;
    images?: ImageContent[];
  }, registry?: SpawnModelRegistry): Promise<SubagentTask> {
    const model = validateExplicitSpawnModel(input.model, registry);
    const images = snapshotImages(readImages(input));
    while (this.recovery) await this.recovery;
    const taskSlug = validateTaskSlug(input.taskSlug);
    this.resolveAgent(input.agent);
    const tasksDir = this.tasksDir(input.cwd, input.parentSessionFile);
    this.selectScope(tasksDir);
    if (images?.length) {
      try {
        let parent = resolve(tasksDir);
        while (!lstatSync(parent, { throwIfNoEntry: false })) parent = dirname(parent);
        checkedImageDirectory(parent);
      } catch { throw new ImageInputError("storage"); }
    }
    const { subagentId, artifactDir } = this.reserveSubagentId(tasksDir, taskSlug);
    const launchArgs = model === undefined ? [] : ["--model", model, ...(input.thinking ? ["--thinking", input.thinking] : [])];
    return this.start({
      agent: input.agent, cwd: input.cwd, prompt: input.prompt, label: input.label,
      thinking: input.thinking, parentSessionFile: input.parentSessionFile,
      model, subagentId, taskSlug, generation: 1, artifactDir, launchArgs, images,
    });
  }

  recover(cwd: string, parentSessionFile?: string, notifiedKeys: Iterable<string> = []): Promise<void> {
    const previous = this.recovery;
    const operation = Promise.resolve().then(async () => {
      await previous;
      await this.recoverScope(cwd, parentSessionFile, notifiedKeys);
    });
    this.recovery = operation;
    const release = () => { if (this.recovery === operation) this.recovery = undefined; };
    void operation.then(release, release);
    return operation;
  }

  private async recoverScope(cwd: string, parentSessionFile: string | undefined, notifiedKeys: Iterable<string>): Promise<void> {
    const completionNotifier = this.completionNotifier;
    const tasksDir = this.tasksDir(cwd, parentSessionFile);
    // Same-scope reconstruction owns cleanup and notification after retrying durable intent.
    await this.awaitAllOperations(this.activeTasksDir !== resolve(tasksDir));
    this.selectScope(tasksDir);
    if (existsSync(tasksDir)) {
      try {
        checkedImageDirectory(tasksDir, false);
        for (const entry of readdirSync(tasksDir, { withFileTypes: true })) {
          if (entry.name.endsWith("-artifacts") && !entry.isFile()) checkedImageDirectory(join(tasksDir, entry.name), false);
        }
      } catch { throw new ImageInputError("storage"); }
    }
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

  async resume(subagentId: string, prompt: string, images?: ImageContent[]): Promise<SubagentTask> {
    const snapshot = snapshotImages(images);
    while (this.recovery) await this.recovery;
    const old = this.get(subagentId);
    await this.awaitTaskOperations(old);
    if (this.recovery) { await this.recovery; return this.resume(subagentId, prompt, snapshot); }
    if (isActiveStatus(old.status) || this.tasks.get(subagentId) !== old
      || this.launches.has(`${subagentId}:${old.generation + 1}`)) throw new Error("Cannot resume an active subagent");
    this.cleanupImageInputs(old); // One bounded retry before the next generation owns its own input.
    const next = await this.start({
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
      launchArgs: old.model ? ["--model", old.thinking ? `${old.model}:${old.thinking}` : old.model] : [],
      surfaceCleanups: cloneJson(old.surfaceCleanups),
      images: snapshot,
    });
    Object.defineProperty(next, snapshotPreviousOwner, { value: old });
    return next;
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
    if (this.launches.size || this.settlements.size || this.cleanups.size || this.pendingSettlements.size || this.cleanupOutcomes.size) {
      throw new Error("Cannot change task scope with unresolved operations");
    }
    this.stop();
    this.activeTasksDir = scope;
    this.tasks.clear();
    this.notified.clear();
    this.manifestUnknown.clear();
    this.imageCleanups.clear();
  }

  private reserveSubagentId(tasksDir: string, taskSlug: string): { subagentId: string; artifactDir: string } {
    try {
      const existing = existsSync(tasksDir);
      mkdirSync(tasksDir, { recursive: true, mode: 0o700 });
      // Initial allocation only: issuance must never repair an existing scope's access.
      if (!existing) protectImageDirectory(tasksDir);
    } catch (error) { throw new TaskIdAllocationError("filesystem_reservation_failed", error); }
    for (let suffix = 1; suffix <= 100; suffix++) {
      const subagentId = suffix === 1 ? taskSlug : `${taskSlug}-${suffix}`;
      if (existsSync(join(tasksDir, `${subagentId}-g1.jsonl`)) || existsSync(join(tasksDir, `${subagentId}-artifacts`))) continue;
      const artifactDir = join(tasksDir, `${subagentId}-artifacts`);
      try {
        mkdirSync(artifactDir, { mode: 0o700 });
        protectImageDirectory(artifactDir);
        return { subagentId, artifactDir };
      } catch (error) {
        if ((error as { code?: unknown }).code === "EEXIST") continue;
        throw new TaskIdAllocationError("filesystem_reservation_failed", error);
      }
    }
    throw new TaskIdAllocationError("task_id_exhausted");
  }

  private imageInputDirectory(task: Pick<SubagentTask, "subagentId" | "generation" | "resultPath">): string {
    const scope = this.activeTasksDir;
    if (!scope || !isNotificationSubagentId(task.subagentId) || !Number.isSafeInteger(task.generation) || task.generation < 1
      || task.resultPath !== join(scope, `${task.subagentId}-artifacts`, `result-${task.generation}.json`)) throw new ImageInputError("storage");
    try { checkedImageDirectory(dirname(task.resultPath)); }
    catch { throw new ImageInputError("storage"); }
    // I-CHILD: only marker "1" expects this sibling; absence must bypass all image I/O.
    return join(dirname(task.resultPath), `image-input-${task.generation}`);
  }

  private async publishImageInput(task: Pick<SubagentTask, "subagentId" | "generation" | "resultPath">, images: ImageContent[]): Promise<ImageInputPublication> {
    const directory = this.imageInputDirectory(task);
    const temporary = join(directory, "envelope.tmp");
    const published = join(directory, "envelope.json");
    let ownedDirectory: Stats | undefined;
    let ownedFile: Stats | undefined;
    let stage = "create";
    const sameFile = (a: Stats, b: Stats) => a.dev === b.dev && a.ino === b.ino;
    const checkDirectory = () => {
      this.imageInputDirectory(task);
      const current = checkedImageDirectory(directory);
      if (!ownedDirectory || !sameFile(current, ownedDirectory)) throw new Error();
    };
    const checkFile = (path: string, checkAccess = true) => {
      const current = lstatSync(path);
      if (!ownedFile || !current.isFile() || current.isSymbolicLink() || current.nlink !== 1 || !sameFile(current, ownedFile)) throw new Error();
      if (checkAccess && process.platform !== "win32" && (current.uid !== process.getuid?.() || (current.mode & 0o777) !== 0o600)) throw new Error();
    };
    const cleanup = () => {
      if (!ownedDirectory) {
        if (lstatSync(directory, { throwIfNoEntry: false })) throw new Error();
        return;
      }
      this.imageInputDirectory(task);
      if (!lstatSync(directory, { throwIfNoEntry: false })) { ownedDirectory = undefined; return; }
      checkDirectory(); // Never follow a replaced directory, even during failure cleanup.
      for (const path of [temporary, published]) {
        if (!lstatSync(path, { throwIfNoEntry: false })) continue;
        checkFile(path, false);
        rmSync(path);
      }
      rmdirSync(directory); // Do not recursively remove unowned additions.
      ownedDirectory = undefined;
    };
    // Retain the publication's inode evidence even after a failed delete. Recovery in
    // this owner must not reinterpret a replacement as an orphan it is free to delete.
    this.imageCleanups.set(this.taskKey(task), cleanup);
    try {
      mkdirSync(directory, { mode: 0o700 }); // Exclusive generation reservation; never adopt an existing envelope.
      ownedDirectory = lstatSync(directory);
      stage = "access";
      protectImageDirectory(directory);
      checkDirectory();
      if (readdirSync(directory).length) throw new Error();
      stage = "create";
      const file = await open(temporary, "wx", 0o600);
      try {
        ownedFile = await file.stat();
        checkDirectory();
        checkFile(temporary);
        stage = "write";
        await file.writeFile(JSON.stringify({ version: 1, subagentId: task.subagentId, generation: task.generation, images }), "utf8");
      } finally { await file.close(); }
      stage = "publish";
      checkDirectory();
      checkFile(temporary);
      if (lstatSync(published, { throwIfNoEntry: false })) throw new Error();
      renameSync(temporary, published);
      const check = () => { checkDirectory(); checkFile(published); };
      check();
      return { check, cleanup };
    } catch {
      let cleanupFailed = false;
      try { cleanup(); } catch { cleanupFailed = true; }
      throw new ImageInputError(stage, cleanupFailed);
    }
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
    launchArgs: string[];
    surfaceCleanups?: unknown[];
    images?: ImageContent[];
  }): Promise<SubagentTask> {
    const completionNotifier = this.completionNotifier;
    const agent = this.resolveAgent(input.agent);
    const tasksDir = input.artifactDir ? dirname(input.artifactDir) : this.tasksDir(input.cwd, input.parentSessionFile);
    this.selectScope(tasksDir);
    const artifactDir = input.artifactDir ?? join(tasksDir, `${input.subagentId}-artifacts`);
    const resultPath = join(artifactDir, `result-${input.generation}.json`);
    if (input.images?.length) this.imageInputDirectory({ ...input, resultPath });
    mkdirSync(artifactDir, { recursive: true, mode: 0o700 });
    const sessionFile = input.sessionFile ?? join(tasksDir, `${input.subagentId}-g1.jsonl`);
    const queuedAt = new Date().toISOString();
    const task: SubagentTask = {
      subagentId: input.subagentId, taskSlug: input.taskSlug, generation: input.generation, agent: input.agent, cwd: input.cwd, label: input.label,
      model: input.model, thinking: input.thinking, sessionFile, resultPath, tabId: "", paneId: "", status: "queued",
      createdAt: queuedAt, queuedAt, updatedAt: queuedAt,
      ...(input.surfaceCleanups ? { surfaceCleanups: cloneJson(input.surfaceCleanups) } : {}),
    };
    const launchKey = this.taskKey(task);
    let finishLaunch!: () => void;
    const launch = new Promise<void>(resolve => { finishLaunch = resolve; });
    this.launches.set(launchKey, launch);
    let imageInput: ImageInputPublication | undefined;
    try {
      if (input.images?.length) imageInput = await this.publishImageInput(task, input.images);
      await this.persist(task);
      this.tasks.set(task.subagentId, task);
      this.notifyTaskUpdate();
      imageInput?.check();
      const surface = await this.transport.createTab({
        cwd: input.cwd,
        label: input.label,
        env: {
          PI_HERDR_SUBAGENT_ID: input.subagentId,
          PI_HERDR_SUBAGENT_GENERATION: String(input.generation),
          PI_HERDR_SUBAGENT_RESULT_PATH: resultPath,
          ...(imageInput ? { PI_HERDR_SUBAGENT_IMAGE_INPUT: "1" } : {}),
        },
      });
      task.tabId = surface.tabId;
      task.paneId = surface.paneId;
      imageInput?.check();
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
      imageInput?.check();
      const args = ["--session", sessionFile, "-e", paneChildExtensionPath, "--system-prompt", agent.body, "--exclude-tools", "subagent_spawn,subagent_resume,subagent_inspect,subagent_join,subagent_steer,subagent_cancel,subagent_remove", ...input.launchArgs];
      args.push(`${input.prompt}\n\nWhen subagent_done is available, submit the complete final result text in the caller/Agent-required format once as its result argument. Do not output the full result separately before or after successful submission. If unavailable, return that text as your final assistant response; this alone does not record successful runtime completion. If submission fails, correct and retry or report the failure.`);
      const launchScript = join(artifactDir, `launch-${input.generation}.ps1`);
      const bootstrapScript = join(artifactDir, `launch-${input.generation}.cjs`);
      let command = "pi";
      let childArgs = args;
      if (imageInput) {
        // Use the package-owned TS loader for Node/Bun; the entry stays in src so
        // resource discovery cannot load an executable as an extension.
        const entry = resolve(dirname(fileURLToPath(import.meta.url)), "pane-image-entry.ts");
        const jiti = createRequire(import.meta.url).resolve("jiti");
        const owned = `require(${JSON.stringify(jiti)}).createJiti(${JSON.stringify(entry)}).import(${JSON.stringify(entry)}).then(m => m.runPaneImageChild(process.argv.slice(1))).catch(() => process.exit(1));`;
        command = bootstrapRuntime();
        childArgs = ["-e", owned, "--", ...args];
      }
      await writeFile(bootstrapScript, buildNodeLaunchScript(input.cwd, command, childArgs, false, !!imageInput));
      await writeFile(launchScript, `\ufeff$ErrorActionPreference = 'Stop'\r\n${powerShellInvocation(bootstrapRuntime(), [bootstrapScript])}\r\nexit $LASTEXITCODE\r\n`);
      imageInput?.check();
      await this.transport.run(task.paneId, "powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", launchScript]);
      this.startMonitor(task);
      return snapshotTask(task);
    } catch (failure) {
      let error = failure;
      if (input.images?.length) {
        const stage = failure instanceof ImageInputError ? failure.stage : "launch";
        let cleanupFailed = failure instanceof ImageInputError && failure.cleanupFailed;
        try { imageInput?.cleanup(); } catch { cleanupFailed = true; }
        error = new ImageInputError(stage, cleanupFailed);
        // Keep terminal intent even while storage is untrusted. The settlement
        // read/write boundaries recheck it on every bounded retry.
      }
      // Retain even an unwritten admission so this runtime can retry the same generation.
      this.tasks.set(task.subagentId, task);
      try {
        await this.settle(task, "failed", completionNotifier, undefined, String(error), !task.tabId);
      } catch (settlementError) {
        if (input.images?.length) throw new Error(`${String(error)}; terminal persistence failed.`, { cause: error });
        throw new Error(`${String(error)}; terminal persistence failed: ${String(settlementError)}`, { cause: error });
      }
      throw error;
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

  // Final transport boundary only. No lifecycle readResult/takeover, waits or writes.
  issueResult(snapshot: TaskSnapshot, cwd: string, parentSessionFile?: string, expected?: TaskSnapshot, resumed = false) {
    if (snapshot.agent !== "handler") return snapshot;
    const unavailable = (code: string) => ({
      subagentId: snapshot.subagentId, generation: snapshot.generation, agent: snapshot.agent, status: snapshot.status,
      resultDelivery: { kind: "unavailable", fullResultReturned: false, code },
    });
    const scope = resolve(this.tasksDir(cwd, parentSessionFile));
    const task = this.tasks.get(snapshot.subagentId);
    const current = () => {
      if (this.recovery || !task || this.tasks.get(snapshot.subagentId) !== task || snapshot[snapshotOwner] !== task
        || this.activeTasksDir !== scope || resolve(task.cwd) !== resolve(cwd)) return "result_scope_mismatch";
      if (task.generation !== snapshot.generation
        || (expected && (snapshot.subagentId !== expected.subagentId || snapshot.generation !== expected.generation + (resumed ? 1 : 0)
          || expected[snapshotOwner] !== (resumed ? snapshot[snapshotPreviousOwner] : task)))
        || task.resultPath !== snapshot.resultPath || task.sessionFile !== snapshot.sessionFile || task.status !== snapshot.status
        || task.result !== snapshot.result || task.error !== snapshot.error) return "result_identity_mismatch";
    };
    const mismatch = current();
    if (mismatch) return unavailable(mismatch);
    if (isActiveStatus(snapshot.status)) {
      const { result: _result, resultPath: _resultPath, ...lifecycle } = snapshot;
      return { ...lifecycle, resultDelivery: { kind: "unavailable", fullResultReturned: false, code: "result_not_delivered" } };
    }
    try {
      const artifactDir = join(scope, `${snapshot.subagentId}-artifacts`);
      if (snapshot.resultPath !== join(artifactDir, `result-${snapshot.generation}.json`)) return unavailable("result_identity_mismatch");
      const directories = [scope, artifactDir].map(path => {
        const stat = checkedImageDirectory(path);
        checkResultSource(path, true);
        return { path, stat };
      });
      const manifest = this.readTaskRecord(join(artifactDir, "task.json"), scope, artifactDir, snapshot.subagentId, true);
      if (!manifest || manifest.generation !== snapshot.generation || manifest.agent !== snapshot.agent
        || resolve(manifest.cwd) !== resolve(cwd) || manifest.sessionFile !== snapshot.sessionFile || manifest.status !== snapshot.status
        || manifest.error !== snapshot.error || manifest.taskSlug !== snapshot.taskSlug
        || manifest.model !== snapshot.model || manifest.thinking !== snapshot.thinking) return unavailable("invalid_task_manifest");
      const bytes = readTaskArtifact(snapshot.resultPath, false, true);
      if (bytes === undefined) return unavailable("result_unavailable");
      const envelope = parseResult(bytes, snapshot);
      if (!envelope.valid) return unavailable(envelope.error);
      if (envelope.status !== snapshot.status || envelope.error !== snapshot.error) return unavailable("result_identity_mismatch");
      if (typeof envelope.result !== "string") return unavailable("result_unavailable");
      if (envelope.result !== snapshot.result || (!resumed && expected?.result !== undefined && expected.result !== envelope.result)) {
        return unavailable("result_original_mismatch");
      }
      if (JSON.stringify(manifest) !== JSON.stringify(this.readTaskRecord(join(artifactDir, "task.json"), scope, artifactDir, snapshot.subagentId, true))) {
        return unavailable("invalid_task_manifest");
      }
      for (const { path, stat } of directories) {
        const after = checkedImageDirectory(path);
        checkResultSource(path, true);
        if (after.dev !== stat.dev || after.ino !== stat.ino) return unavailable("invalid_task_storage");
      }
      const changed = current(); // Recheck even synchronous access probes may re-enter the runtime.
      if (changed) return unavailable(changed);
      return { ...snapshot, resultSource: { scopeIdentity: scope, ...(parentSessionFile ? { parentSessionFile } : {}) } };
    } catch (error) {
      return unavailable(error instanceof ImageInputError ? "invalid_task_storage" : "result_access_unavailable");
    }
  }

  async join(id: string, generation = this.get(id).generation, signal?: AbortSignal): Promise<SubagentTask> {
    signal?.throwIfAborted();
    let task = this.get(id);
    if (task.generation !== generation) throw new Error("Subagent generation is no longer current");
    const completionNotifier = this.completionNotifier;
    while (true) {
      signal?.throwIfAborted();
      const recovery = this.recovery;
      if (recovery) {
        await waitForPromise(recovery, signal);
        const recovered = this.tasks.get(id);
        if (recovered) {
          task = recovered;
          if (task.generation !== generation) throw new Error("Subagent generation is no longer current");
        }
        continue;
      }
      const current = this.tasks.get(id);
      if (current && current !== task) {
        task = current;
        if (task.generation !== generation) throw new Error("Subagent generation is no longer current");
        continue;
      }
      const key = this.taskKey(task);
      await waitForPromise(this.launches.get(key), signal);
      await waitForPromise(this.awaitTaskOperations(task, signal), signal);
      signal?.throwIfAborted();
      if (this.recovery || (this.tasks.has(id) && this.tasks.get(id) !== task)) continue;
      while (isActiveStatus(task.status)) {
        signal?.throwIfAborted();
        if (this.recovery || (this.tasks.has(id) && this.tasks.get(id) !== task)) break;
        this.checkResultStorage(task);
        if (existsSync(task.resultPath)) await waitForPromise(this.settleFromResult(task, completionNotifier), signal);
        else await delay(50, undefined, { signal });
      }
      if (this.recovery || (this.tasks.has(id) && this.tasks.get(id) !== task)) continue;
      await waitForPromise(this.awaitTaskOperations(task, signal), signal);
      if (this.recovery || (this.tasks.has(id) && this.tasks.get(id) !== task)) continue;
      return snapshotTask(task);
    }
  }

  async steer(id: string, message: string): Promise<SubagentTask> {
    const task = this.get(id);
    if (task.status !== "running") throw new Error("Subagent is not running");
    await this.transport.sendText(task.paneId, message);
    return snapshotTask(task);
  }

  async cancel(id: string): Promise<SubagentTask> {
    while (this.recovery) await this.recovery;
    const task = this.get(id);
    const completionNotifier = this.completionNotifier;
    await this.launches.get(this.taskKey(task));
    await this.awaitTaskOperations(task);
    if (this.recovery || this.tasks.get(id) !== task) {
      await this.recovery;
      return this.cancel(id);
    }
    if (isActiveStatus(task.status)) {
      await this.settle(task, "cancelled", completionNotifier, undefined, undefined, !task.tabId, true);
    }
    return snapshotTask(task);
  }

  async remove(id: string): Promise<void> {
    while (this.recovery) await this.recovery;
    const task = this.get(id);
    // A failed attempt may restore its monitor only before the next removal pauses it.
    const operation = Promise.resolve(this.removals.get(task)).catch(() => {}).then(async () => {
      if (!this.tasks.has(id)) return; // A preceding successful removal already owns the deletion.
      await this.removeTask(task);
    });
    this.removals.set(task, operation);
    try { await operation; }
    finally { if (this.removals.get(task) === operation) this.removals.delete(task); }
  }

  private async removeTask(task: SubagentTask): Promise<void> {
    const id = task.subagentId;
    const generation = task.generation;
    const checkOwner = () => {
      if (this.tasks.get(id) !== task || task.generation !== generation
        || this.launches.has(`${id}:${generation + 1}`)) throw new Error("Subagent generation is no longer current");
    };
    if (this.launches.has(`${id}:${generation + 1}`)) throw new Error("Cannot remove a subagent during generation admission");
    checkOwner();
    await this.launches.get(this.taskKey(task));
    await this.awaitTaskOperations(task);
    await this.recovery;
    checkOwner();
    const monitorEpoch = this.monitorEpoch;
    const monitored = this.monitors.has(this.taskKey(task));
    this.stopMonitor(task);
    try {
      this.prepareRecoveryCleanups(task);
      await this.persist(task, checkOwner);
      checkOwner();
      await this.runPendingCleanups(task, checkOwner);
      checkOwner();
      const cleanup = recognizedCleanupRecords(task.surfaceCleanups, task.generation)
        .find(value => value.record.status === "pending" || value.record.status === "failed")?.record;
      if (cleanup) throw new Error(`surface_cleanup_failed: ${cleanup.error ?? "cleanup remains pending"}`);
      if (isActiveStatus(task.status) && task.tabId) await this.transport.closeTab(task.tabId);
      checkOwner();
      if (!this.cleanupImageInputs(task, true)) throw new ImageInputError("cleanup", true);
      rmSync(task.sessionFile, { force: true });
      rmSync(dirname(task.resultPath), { recursive: true, force: true });
      this.tasks.delete(id);
      for (const key of this.imageCleanups.keys()) if (key.startsWith(`${id}:`)) this.imageCleanups.delete(key);
      this.manifestUnknown.delete(id);
      this.notifyTaskUpdate();
    } catch (error) {
      // Resume only this removal's paused monitor, never a stopped runtime or replaced generation.
      if (monitored && this.monitorEpoch === monitorEpoch && this.tasks.get(id) === task
        && task.generation === generation && task.status === "running" && !this.launches.has(`${id}:${generation + 1}`)) this.startMonitor(task);
      throw error;
    }
  }

  stop(): void {
    this.monitorEpoch++;
    for (const controller of this.monitors.values()) controller.abort();
    this.monitors.clear();
  }

  private taskKey(task: Pick<SubagentTask, "subagentId" | "generation">): string {
    return `${task.subagentId}:${task.generation}`;
  }

  private startMonitor(task: SubagentTask): void {
    const key = this.taskKey(task);
    if (this.tasks.get(task.subagentId) !== task || this.monitors.has(key) || task.status !== "running") return;
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && this.tasks.get(task.subagentId) === task && this.monitors.get(key) === controller;
    const completionNotifier = this.completionNotifier;
    this.monitors.set(key, controller);
    void (async () => {
      while (current() && task.status === "running") {
        try { await delay(500, undefined, { signal: controller.signal, ref: false }); }
        catch { break; }
        if (!current()) break;
        try {
          this.checkResultStorage(task);
          if (existsSync(task.resultPath)) {
            await this.settleFromResult(task, completionNotifier);
            break;
          }
          const paneExists = await this.transport.paneExists(task.paneId);
          if (!current()) break;
          if (!paneExists) {
            await this.settle(task, "failed", completionNotifier, undefined, "pane_closed");
            break;
          }
        } catch (error) {
          if (!current()) break;
          if (error instanceof ImageInputError) continue; // Retry owned storage without adopting a foreign Result.
          await this.settle(task, "failed", completionNotifier, undefined, `pane_verification_failed: ${error instanceof Error ? error.message : String(error)}`);
          break;
        }
      }
      if (this.monitors.get(key) === controller) this.monitors.delete(key);
    })();
  }

  private stopMonitor(task: SubagentTask): void {
    if (this.tasks.get(task.subagentId) !== task) return;
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
    recovering?: TaskRecord,
  ): Promise<void> {
    const key = this.taskKey(task);
    const existing = this.settlements.get(key);
    if (existing) return existing;
    if (this.pendingSettlements.has(key)) return this.retrySettlement(key);
    if (!recovering && !isActiveStatus(task.status)) return Promise.resolve();
    let terminalIntentPersisted = false;
    this.pendingSettlements.set(key, async effects => {
      const launching = this.launches.has(key);
      const running = task.status === "running" && !launching;
      const before = { status: task.status, result: task.result, error: task.error, updatedAt: task.updatedAt, surfaceCleanups: task.surfaceCleanups };
      let trusted = false;
      try {
        if (!terminalIntentPersisted) {
          if (writeCancelledResult) this.checkResultStorage(task);
          if (writeCancelledResult && !existsSync(task.resultPath)) {
            await resultPublisher(task.resultPath, () => this.checkResultStorage(task)).publish(JSON.stringify({ subagentId: task.subagentId, generation: task.generation, status: "cancelled" }));
          }
          this.checkResultStorage(task);
          const current = existsSync(task.resultPath) ? this.readResult(task) : undefined;
          trusted = true;
          if (current) {
            task.status = current.valid ? current.status : "failed";
            task.result = current.valid ? current.result : undefined;
            task.error = current.error;
          } else {
            task.status = status;
            task.result = result;
            task.error = error;
          }
          if (!recovering) task.updatedAt = new Date().toISOString();
          this.applyCurrentResult(task);
          this.stopMonitor(task);
          this.prepareCleanup(task, notCreated);
          if (recovering) this.prepareRecoveryCleanups(task);
          // A matching Result is loaded into memory, not persisted in the manifest.
          // Keep all settlement/recheck effects, but do not rewrite unchanged V2 state.
          if (!recovering || recovering.version === 1 || !isDeepStrictEqual(
            { ...task, result: undefined },
            { ...this.taskFromRecord(recovering, dirname(task.resultPath)), result: undefined },
          )) await this.persist(task);
          terminalIntentPersisted = true;
        } else {
          // Retry the retained outcome/reconciled Result, not pre-commit intent or effects.
          this.applyCurrentResult(task);
          await this.persist(task);
        }
        await this.reconcileCurrentResult(task);
        if (!effects) return;
        if (!this.recovery) this.notifyTaskUpdate();
        await this.runPendingCleanups(task);
        this.cleanupImageInputs(task);
        await this.reconcileCurrentResult(task);
        await this.notifyTerminal(task, completionNotifier);
      } catch (failure) {
        if (running && !terminalIntentPersisted) {
          Object.assign(task, before);
          this.startMonitor(task); // Keep a running generation eligible for its first Result after a transient storage failure.
        } else if (launching && !trusted && !terminalIntentPersisted) {
          // An unpersisted launch failure retains its original diagnostic for a later bounded retry.
          task.status = status;
          task.result = result;
          task.error = error;
          task.updatedAt = new Date().toISOString();
        }
        throw failure;
      }
    });
    return this.retrySettlement(key);
  }

  private retrySettlement(key: string, effects = true): Promise<void> {
    const existing = this.settlements.get(key);
    if (existing) return existing;
    const pending = this.pendingSettlements.get(key);
    if (!pending) return Promise.resolve();
    const operation = Promise.resolve().then(() => pending(effects));
    this.settlements.set(key, operation);
    void operation.then(
      () => {
        this.pendingSettlements.delete(key);
        if (this.settlements.get(key) === operation) this.settlements.delete(key);
      },
      () => { if (this.settlements.get(key) === operation) this.settlements.delete(key); },
    );
    return operation;
  }

  private applyCurrentResult(task: SubagentTask): boolean {
    // A redirected image launch must not adopt an external Result on settlement
    // or retry. Preserve the original local error/identity until storage is safe.
    this.checkResultStorage(task);
    if (!existsSync(task.resultPath)) return false;
    const result = this.readResult(task);
    const status = result.valid ? result.status : "failed";
    const body = result.valid ? result.result : undefined;
    if (task.status === status && task.result === body && task.error === result.error) return false;
    task.status = status;
    task.result = body;
    task.error = result.error;
    task.updatedAt = new Date().toISOString();
    return true;
  }

  private async reconcileCurrentResult(task: SubagentTask, commit = () => {}): Promise<void> {
    if (this.applyCurrentResult(task)) await this.persist(task, commit);
  }

  private prepareCleanup(task: SubagentTask, notCreated: boolean, retry = false): void {
    const existing = recognizedCleanup(task.surfaceCleanups, task.generation);
    if (existing && isFinalCleanupStatus(existing.record.status)) return;
    if (existing && !retry && existing.record.status === "pending") return;
    const attemptedAt = new Date().toISOString();
    const tabId = task.tabId.trim() ? task.tabId : undefined;
    const paneId = task.paneId.trim() ? task.paneId : undefined;
    const status: SurfaceCleanupStatus = notCreated ? "not_created" : tabId ? "pending" : "identity_missing";
    const record = cleanupRecord(existing?.record, {
      generation: task.generation,
      ...(tabId ? { tabId } : {}),
      ...(paneId ? { paneId } : {}),
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

  private async runPendingCleanups(task: SubagentTask, commit = () => {}): Promise<void> {
    await this.retryCleanupOutcomes(task, undefined, commit);
    const generations = recognizedCleanupRecords(task.surfaceCleanups, task.generation)
      .filter(value => value.record.status === "pending")
      .map(value => value.record.generation);
    for (const generation of generations) await this.runCleanup(task, generation, commit);
  }

  private cleanupOwner(outcome: { task: SubagentTask; index: number; record: SurfaceCleanupRecord }): { task: SubagentTask; index: number | undefined } {
    const current = this.tasks.get(outcome.task.subagentId);
    if (!current || current === outcome.task || current.generation < outcome.record.generation) {
      return { task: outcome.task, index: outcome.index };
    }
    return {
      task: current,
      index: recognizedCleanup(current.surfaceCleanups, outcome.record.generation)?.index,
    };
  }

  private runCleanup(task: SubagentTask, generation = task.generation, commit = () => {}): Promise<void> {
    const key = `${task.subagentId}:${generation}`;
    const existing = this.cleanups.get(key);
    if (existing) return existing;
    const retained = this.cleanupOutcomes.get(key);
    const cleanup = retained ?? recognizedCleanup(task.surfaceCleanups, generation);
    if (!cleanup || (!retained && cleanup.record.status !== "pending")) return Promise.resolve();
    const ownerInfo = retained ? this.cleanupOwner(retained) : { task, index: cleanup?.index };
    const owner = ownerInfo.task;
    const operation = Promise.resolve().then(async () => {
      if (isTerminalStatus(owner.status)) await this.reconcileCurrentResult(owner, commit);
      let record = cleanup.record;
      if (!retained) {
        try {
          const status = await this.transport.closeTab(record.tabId!);
          record = cleanupRecord(record, { ...record, status });
        } catch (error) {
          record = cleanupRecord(record, {
            ...record,
            status: "failed",
            error: briefReason(error instanceof Error ? error.message : String(error)),
          });
        }
        // Retain executed outcome and exact task ownership until its write succeeds.
        // A bounded retry must persist this evidence, never repeat the close effect.
        this.cleanupOutcomes.set(key, { task: owner, index: cleanup.index, record });
      }
      setCleanup(owner, ownerInfo.index, record);
      await this.persist(owner, commit);
      this.cleanupOutcomes.delete(key);
    });
    this.cleanups.set(key, operation);
    void operation.then(
      () => { if (this.cleanups.get(key) === operation) this.cleanups.delete(key); },
      () => { if (this.cleanups.get(key) === operation) this.cleanups.delete(key); },
    );
    return operation;
  }

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

  private operationFor(task: SubagentTask): Promise<void> | undefined {
    const operations = [...this.cleanups].filter(([key]) => key.startsWith(`${task.subagentId}:`)).map(([, operation]) => operation);
    const settlement = this.settlements.get(this.taskKey(task));
    if (settlement) operations.push(settlement);
    if (operations.length) return Promise.all(operations).then(() => {});
  }

  private async retryCleanupOutcomes(task?: SubagentTask, signal?: AbortSignal, commit = () => {}): Promise<void> {
    for (const outcome of this.cleanupOutcomes.values()) {
      const owner = this.cleanupOwner(outcome).task;
      if (task && owner !== task) continue;
      signal?.throwIfAborted();
      await this.runCleanup(owner, outcome.record.generation, commit);
    }
  }

  private async awaitTaskOperations(task: SubagentTask, signal?: AbortSignal): Promise<void> {
    await this.operationFor(task);
    signal?.throwIfAborted();
    await this.retryCleanupOutcomes(task, signal);
    signal?.throwIfAborted();
    await this.retrySettlement(this.taskKey(task));
  }

  private async awaitAllOperations(effects: boolean): Promise<void> {
    await Promise.all([...this.launches.values(), ...this.settlements.values(), ...this.cleanups.values()]);
    await this.retryCleanupOutcomes();
    for (const key of this.pendingSettlements.keys()) await this.retrySettlement(key, effects);
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

  private async persist(task: SubagentTask, commit = () => {}): Promise<void> {
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
    await writeAtomic(this.recordPath(task), record, () => this.checkResultStorage(task), commit);
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

  private readTaskRecord(path: string, tasksDir: string, artifactDir: string, subagentId: string, issuing = false): TaskRecord | undefined {
    try { checkedImageDirectory(artifactDir, false); }
    catch { throw new ImageInputError("storage"); }
    try {
      const bytes = readTaskArtifact(path, false, issuing);
      if (bytes === undefined) return;
      const value = JSON.parse(bytes) as Json;
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
    } catch (error) {
      if (error instanceof ImageInputError) throw error;
      return;
    }
  }

  private checkResultStorage(task: SubagentTask): void {
    if (this.imageCleanups.has(this.taskKey(task))) this.imageInputDirectory(task);
    else {
      // Recovery may retain a live child after its envelope has been consumed.
      // Result trust must not depend on an in-memory publication/cleanup entry.
      try { checkedImageDirectory(dirname(task.resultPath), false); }
      catch { throw new ImageInputError("storage"); }
    }
  }

  private readResult(task: SubagentTask):
    | { valid: true; status: Exclude<TaskStatus, ActiveTaskStatus>; result?: string; error?: string }
    | { valid: false; error: string } {
    this.checkResultStorage(task); // Storage failure must throw before invalid-Result handling or settlement intent.
    try {
      return parseResult(readTaskArtifact(task.resultPath, true), task);
    } catch (error) {
      if (error instanceof ImageInputError) throw error;
      return { valid: false, error: "invalid_result" };
    }
  }
}

function cloneJson<T>(value: T): T {
  return value === undefined ? value : structuredClone(value);
}

// Invocation-local object identity, never serialized, persisted or registered as a reference.
const snapshotOwner = Symbol("task owner");
const snapshotPreviousOwner = Symbol("task predecessor");
type TaskSnapshot = SubagentTask & { [snapshotOwner]?: SubagentTask; [snapshotPreviousOwner]?: SubagentTask };

function snapshotTask(task: SubagentTask): TaskSnapshot {
  const snapshot = { ...task, ...(task.surfaceCleanups ? { surfaceCleanups: cloneJson(task.surfaceCleanups) } : {}) };
  Object.defineProperty(snapshot, snapshotOwner, { value: task });
  return snapshot;
}

function parseResult(bytes: string | undefined, task: SubagentTask):
  | { valid: true; status: Exclude<TaskStatus, ActiveTaskStatus>; result?: string; error?: string }
  | { valid: false; error: string } {
  try {
    const value = JSON.parse(bytes ?? "") as Json;
    if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, error: "invalid_result" };
    if (value.subagentId !== task.subagentId || value.generation !== task.generation) return { valid: false, error: "result_identity_mismatch" };
    if (!isTerminalStatus(value.status)) return { valid: false, error: "invalid_result_status" };
    if (value.status === "completed" && typeof value.result !== "string") return { valid: false, error: "invalid_result" };
    if (value.result !== undefined && typeof value.result !== "string") return { valid: false, error: "invalid_result" };
    if (value.error !== undefined && typeof value.error !== "string") return { valid: false, error: "invalid_result" };
    return { valid: true, status: value.status, result: value.result as string | undefined, error: value.error as string | undefined };
  } catch { return { valid: false, error: "invalid_result" }; }
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
  // The caller may already have created work before observing cancellation.
  // Attach a rejection observer even when this wait exits immediately.
  if (signal.aborted) {
    void promise.catch(() => {});
    signal.throwIfAborted();
  }
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

type DisplayTask = Partial<SubagentTask> & { resultSummary?: string; resultDelivery?: { kind?: string; originalBytes?: number; fullResultReturned?: boolean; code?: string } };

function taskFrom(result: ToolResult): DisplayTask | undefined {
  const details = result.details as DisplayTask | undefined;
  return details && typeof details.subagentId === "string" && typeof details.status === "string" ? details : undefined;
}

function callIdentity(args: unknown, key: "agent" | "label" | "subagentId"): string {
  // Pi falls back to serializing *all* arguments if a renderer throws. Read only
  // allowlisted identity strings, without enumerating/coercing arguments or images.
  try {
    const value = args && typeof args === "object" ? (args as Record<string, unknown>)[key] : undefined;
    return typeof value === "string" ? cleanIdentity(value) : "";
  } catch { return ""; }
}

function renderSpawnCall(args: unknown, theme?: ThemeLike): Text {
  const suffix = [callIdentity(args, "agent"), callIdentity(args, "label")].filter(Boolean).join(" · ");
  return new Text(`${title(theme, "spawn")}${suffix ? paint(theme, "dim", `  ${suffix}`) : ""}`, 0, 0);
}

function renderControlCall(action: "resume" | "steer") {
  return (args: unknown, theme?: ThemeLike): Text => {
    const identity = callIdentity(args, "subagentId");
    return new Text(`${title(theme, action)}${identity ? paint(theme, "dim", `  ${identity}`) : ""}`, 0, 0);
  };
}

function renderControlResult(action: "resume" | "steer") {
  return (result: ToolResult, options: { expanded?: boolean; isPartial?: boolean } = {}, theme?: ThemeLike, context?: { isError?: boolean }): Text => {
    const operation = action === "resume" ? "Resume" : "Text submission";
    // Control acceptance is independent of task lifecycle and Result delivery.
    const status = context?.isError ? `${operation} failed` : options.isPartial ? `${operation} in progress`
      : action === "resume" ? "Execution resumed" : "Text submission accepted";
    const color = context?.isError ? "error" : options.isPartial ? "warning" : "success";
    const lines = [paint(theme, color, status)];
    const task = taskFrom(result);
    if (task) lines.push(paint(theme, "muted", `  Task: ${cleanIdentity(task.subagentId!)} · generation ${task.generation} · ${cleanIdentity(task.status!)}`));
    return new Text(lines.join("\n"), 0, 0);
  };
}

function renderSpawnResult(result: ToolResult, options: { expanded?: boolean; isPartial?: boolean } = {}, theme?: ThemeLike): Text {
  const task = taskFrom(result);
  if (!task || isTerminalStatus(task.status) || task.resultDelivery) return renderJoinResult(result, options, theme);
  return new Text(`${paint(theme, "success", "")} Started ${paint(theme, "text", task.label ?? task.subagentId ?? "subagent")}\n${paint(theme, "muted", `  ${task.subagentId}`)}`, 0, 0);
}

function renderJoinCall(args: unknown, theme?: ThemeLike): Text {
  const input = args as { subagentId?: string; generation?: number };
  const suffix = [input.subagentId, input.generation === undefined ? undefined : `generation ${input.generation}`].filter(Boolean).join(" · ");
  return new Text(`${title(theme, "join")}${suffix ? paint(theme, "dim", `  ${suffix}`) : ""}`, 0, 0);
}

function renderJoinResult(result: ToolResult, options: { expanded?: boolean; isPartial?: boolean } = {}, theme?: ThemeLike): Text {
  const task = taskFrom(result);
  if (!task) return new Text("Subagent Result unavailable (no associated snapshot).", 0, 0);
  const marker = task.status === "completed" ? paint(theme, "success", "") : task.status === "running" ? paint(theme, "warning", "") : paint(theme, "error", "");
  const statusColor = task.status === "completed" ? "success" : task.status === "running" ? "warning" : "error";
  const display = (text: string) => stripTerminalSequences(text).replace(/\r\n?/g, "\n").replace(/\t/g, "   ").replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "");
  const lines = [`${marker} ${paint(theme, "text", display(task.label ?? task.subagentId ?? "subagent"))} ${paint(theme, statusColor, task.status ?? "unknown")}`];
  if (options.expanded) lines.push(paint(theme, "muted", `  ${task.subagentId} · generation ${task.generation}`));
  if (options.isPartial && task.status === "running") {
    lines.push(paint(theme, "dim", "   waiting for result"));
  } else if (task.agent === "handler" || task.resultDelivery) {
    // Render only Caller-delivered fields; expansion never reads runtime/cache or raw content.
    const delivery = task.resultDelivery;
    const bytes = delivery?.originalBytes;
    const sized = typeof bytes === "number" && Number.isInteger(bytes) && bytes >= 0;
    const path = typeof task.resultPath === "string" && task.resultPath.length > 0;
    if (!options.isPartial && isTerminalStatus(task.status) && delivery?.kind === "full" && delivery.fullResultReturned === true
      && sized && bytes <= 16384 && path && task.resultSummary === undefined && typeof task.result === "string" && Buffer.byteLength(task.result, "utf8") === bytes) {
      lines.push(paint(theme, "muted", `  Full Result delivered · ${bytes} UTF-8 bytes (not adoption)`));
      if (options.expanded) lines.push(paint(theme, "dim", display(task.result)));
    } else if (!options.isPartial && isTerminalStatus(task.status) && delivery?.kind === "summary" && delivery.fullResultReturned === false
      && sized && bytes > 16384 && path && task.result === undefined && typeof task.resultSummary === "string" && task.resultSummary.trim()) {
      lines.push(paint(theme, "warning", `  Summary only · ${bytes} UTF-8 bytes · full Result not returned`));
      lines.push(paint(theme, "dim", display(task.resultSummary)), paint(theme, "muted", display(task.resultPath!)));
      lines.push("  Use ordinary read on this JSON envelope; completely decode result and correlate task/generation before adoption.");
    } else {
      const code = delivery?.kind === "unavailable" && delivery.fullResultReturned === false && typeof delivery.code === "string" ? display(delivery.code) : "result_not_delivered";
      lines.push(paint(theme, "warning", `  Result unavailable · ${code} · full Result not returned`));
    }
  } else if (options.expanded && task.agent && task.result) {
    lines.push(`  ${paint(theme, "dim", display(task.result))}`);
  }
  if (task.error && (options.expanded || task.status !== "completed")) lines.push(`  ${paint(theme, "error", display(task.error))}`);
  return new Text(lines.join("\n"), 0, 0);
}

export function createSubagentTools(runtime: SubagentRuntime, cwd: string, parentSessionFile?: string) {
  const imagesSchema = Type.Optional(Type.Array(Type.Object({
    type: Type.Literal("image"), data: Type.String({ minLength: 1 }), mimeType: Type.String({ minLength: 1 }),
  })));
  const result = (details: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(details) }], details });
  const tool = (name: string, description: string, parameters: any, execute: (params: any, update: ToolUpdate | undefined, signal: AbortSignal | undefined, ctx: ExtensionContext | undefined) => Promise<unknown>, renderer: Record<string, unknown> = {}) => defineTool({
    name, label: name, description, parameters, ...renderer,
    async execute(_id, params, signal, onUpdate, ctx) {
      const callerCurrent = () => {
        try { return !!ctx && ctx.cwd === cwd && ctx.sessionManager.getSessionFile() === parentSessionFile; }
        catch { return false; }
      };
      const callerWasCurrent = callerCurrent();
      const taskId = params && typeof params === "object" && "subagentId" in params ? params.subagentId : undefined;
      const expected = typeof taskId === "string" ? runtime.inspect(taskId) : undefined;
      const details = await execute(params, value => {
        // Progress is lifecycle-only; never publish a Result/reference before final validation.
        const { result: original, resultPath: _path, resultSource: _source, resultSummary: _summary, ...lifecycle } = value as Json;
        onUpdate?.(result({ ...lifecycle, ...(original !== undefined || lifecycle.agent === "handler" ? {
          resultDelivery: { kind: "unavailable", fullResultReturned: false, code: "result_not_delivered" },
        } : {}) }));
      }, signal, ctx);
      signal?.throwIfAborted();
      if (details && typeof details === "object" && "subagentId" in details && "agent" in details) {
        const snapshot = details as TaskSnapshot;
        const associated = runtime.issueResult(snapshot, cwd, parentSessionFile, expected, name === "subagent_resume");
        if (snapshot.agent === "handler" && (isTerminalStatus(snapshot.status) || snapshot.result !== undefined)
          && (!callerWasCurrent || !callerCurrent())) {
          return result({ subagentId: snapshot.subagentId, generation: snapshot.generation, agent: snapshot.agent, status: snapshot.status,
            resultDelivery: { kind: "unavailable", fullResultReturned: false, code: "result_scope_mismatch" } });
        }
        return result(associated);
      }
      return result(details);
    },
  });
  return [
    // Optional avoids schema rejection so missing values use the stable runtime error contract.
    tool("subagent_spawn", "Start one background subagent without waiting for completion. Select a registered agent and provide prompt, label, taskSlug, and optional exact model/thinking settings. taskSlug is required and must be a caller-provided canonical task identity. Call directly or through a caller-owned tool wrapper using the same inputs. The parent receives a terminal completion notification without the full result text. When the effective registered tool contract and available resources permit it, you may successively launch independent, authorized, nonconflicting tasks, then wait for terminal notifications instead of polling or routinely calling inspect or join. Use subagent_inspect for an explicit non-blocking snapshot and subagent_join after a terminal notification, or when an immediate Result wait is explicitly necessary. One join returns the caller's full/summary/unavailable projection; summary navigation uses ordinary read of the existing JSON resultPath and complete result decoding before adoption.", Type.Object({ agent: StringEnum(runtime.agentNames()), prompt: Type.String({ minLength: 1 }), label: Type.String({ minLength: 1 }), taskSlug: Type.Optional(Type.String()), model: Type.Optional(Type.String()), thinking: Type.Optional(Type.String()), images: imagesSchema }), async (params, _update, _signal, ctx) => {
      try { return await runtime.spawn({
        agent: params.agent, prompt: params.prompt, label: params.label, taskSlug: params.taskSlug,
        model: params.model, thinking: params.thinking, cwd, parentSessionFile,
        get images() { return params.images; },
      }, ctx?.modelRegistry); }
      catch (error) {
        if (!(error instanceof ExplicitSpawnModelError)) throw error;
        return { code: error.code, detail: error.detail, ...(error.operation ? { operation: error.operation } : {}) };
      }
    }, { renderCall: renderSpawnCall, renderResult: renderSpawnResult }),
    tool("subagent_resume", "Resume a completed or failed subagent.", Type.Object({ subagentId: Type.String(), prompt: Type.String({ minLength: 1 }), images: imagesSchema }), params => runtime.resume(params.subagentId, params.prompt, readImages(params)), { renderCall: renderControlCall("resume"), renderResult: renderControlResult("resume") }),
    tool("subagent_inspect", "Return a non-blocking subagent snapshot for an explicit status check; do not poll this tool while waiting. Prefer the terminal completion notification, then one subagent_join. Available terminal Results use the same caller full/summary/unavailable projection; inspect is not a full-reading bypass. For summary navigation, ordinary read of the existing JSON resultPath and complete result decoding are required before adoption.", Type.Object({ subagentId: Type.String() }), params => Promise.resolve(runtime.inspect(params.subagentId)), { renderResult: renderJoinResult }),
    tool("subagent_join", "Wait for a subagent and return one caller-projected Result: full at <=16384 decoded UTF-8 bytes, otherwise the existing summary and resultPath, or unavailable. For summary navigation, use ordinary read of that existing JSON envelope and completely decode result; correlate task/generation and read all evidence before adoption. Incomplete or uncertain evidence permits no adoption. There is no second join mode or inspect full-reading branch. Use after a terminal completion notification, or when an explicit immediate Result wait is necessary; do not use it for routine polling. Caller cancellation, including ESC, stops only this wait and does not cancel the subagent; use subagent_cancel to cancel it.", Type.Object({ subagentId: Type.String(), generation: Type.Optional(Type.Number()) }), async (params, update, signal) => { update?.(runtime.inspect(params.subagentId)); return runtime.join(params.subagentId, params.generation, signal); }, { renderCall: renderJoinCall, renderResult: renderJoinResult }),
    tool("subagent_steer", "Send a message to a running subagent.", Type.Object({ subagentId: Type.String(), message: Type.String({ minLength: 1 }) }), params => runtime.steer(params.subagentId, params.message), { renderCall: renderControlCall("steer"), renderResult: renderControlResult("steer") }),
    tool("subagent_cancel", "Best-effort cancel a running subagent.", Type.Object({ subagentId: Type.String() }), params => runtime.cancel(params.subagentId), { renderResult: renderJoinResult }),
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
          content: `Subagent terminal notification: ${JSON.stringify(notification)}. Call subagent_join once for projected delivery. If summary-only, use ordinary read of its existing JSON resultPath, completely decode result and correlate task/generation before adoption. A notification or backend terminal status is not full Result evidence.`,
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
  pi.registerCommand?.("subagent-open", {
    description: "Open a retained terminal subagent session in a new tab.",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui" || !ctx.hasUI) {
        ctx.ui.notify("/subagent-open requires the interactive TUI.", "warning");
        return;
      }
      const parentSessionFile = ctx.sessionManager?.getSessionFile?.();
      if (!parentSessionFile?.trim()) {
        ctx.ui.notify("/subagent-open requires a persisted parent session.", "warning");
        return;
      }
      let items: CurrentRetainedSessionItem[];
      try { items = runtime.listRetainedSessions(parentSessionFile); }
      catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
        return;
      }
      if (items.length === 0) {
        ctx.ui.notify("No eligible terminal subagent sessions.", "info");
        return;
      }
      const rows = items.map(item => `${item.label} · ${item.subagentId} · current generation ${item.observedGeneration} · ${item.terminalStatus} · ${item.displayedTime.label} ${new Date(item.displayedTime.mtimeMs).toISOString()}`);
      const selected = await ctx.ui.select("Open retained subagent session", rows);
      if (selected === undefined) return;
      const item = items[rows.indexOf(selected)];
      if (!item) return;
      const { scopeIdentity, subagentId, observedGeneration } = item;
      try { await runtime.launchRetainedSession(parentSessionFile, { scopeIdentity, subagentId, observedGeneration }); }
      catch (error) { ctx.ui.notify(error instanceof Error ? error.message : String(error), "error"); }
    },
  });


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

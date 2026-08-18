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
import { createHerdrClient, type HerdrClient } from "pi-herdr";

const exec = promisify(execFile);
export const paneChildExtensionPath = resolve(dirname(fileURLToPath(import.meta.url)), "../extensions/pane-child.ts");
export type AgentDefinition = { name: string; path: string; body: string; description: string };
export type TaskStatus = "running" | "completed" | "failed" | "cancelled";
export type SubagentTask = {
  subagentId: string; generation: number; agent: string; cwd: string; label: string; model?: string; thinking?: string;
  sessionFile: string; resultPath: string; tabId: string; paneId: string; status: TaskStatus;
  result?: string; error?: string;
};
export type HerdrTransport = {
  createTab(input: { cwd: string; label: string; env?: Record<string, string> }): Promise<{ tabId: string; paneId: string }>;
  run(paneId: string, command: string, args: string[]): Promise<void>;
  sendText(paneId: string, text: string): Promise<void>;
  closePane(paneId: string): Promise<void>;
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
    `const spec = JSON.parse(Buffer.from(${JSON.stringify(spec)}, "base64").toString("utf8"));`,
    `const result = spawnSync(spec.command, spec.args, { cwd: spec.cwd, env: process.env, stdio: "inherit" });`,
    `if (result.error) throw result.error;`,
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
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value));
  renameSync(temporary, path);
}

export class SubagentRuntime {
  private tasks = new Map<string, SubagentTask>();
  private sequence = 0;

  constructor(private readonly transport: HerdrTransport, private readonly registry: AgentRegistry, private readonly root?: string) {}

  async spawn(input: {
    agent: string;
    cwd: string;
    prompt: string;
    label: string;
    model?: string;
    thinking?: string;
    parentSessionFile?: string;
  }): Promise<SubagentTask> {
    return this.start({ subagentId: `subagent-${++this.sequence}`, generation: 1, ...input });
  }

  async resume(subagentId: string, prompt: string): Promise<SubagentTask> {
    const old = this.get(subagentId);
    if (old.status === "running") throw new Error("Cannot resume a running subagent");
    return this.start({
      subagentId,
      generation: old.generation + 1,
      agent: old.agent,
      cwd: old.cwd,
      prompt,
      label: old.label,
      model: old.model,
      thinking: old.thinking,
      sessionFile: old.sessionFile,
    });
  }

  private async start(input: {
    subagentId: string;
    generation: number;
    agent: string;
    cwd: string;
    prompt: string;
    label: string;
    model?: string;
    thinking?: string;
    parentSessionFile?: string;
    sessionFile?: string;
  }): Promise<SubagentTask> {
    const agent = this.resolveAgent(input.agent);
    const base = this.root ?? (input.parentSessionFile
      ? input.parentSessionFile.replace(/\.jsonl$/i, "")
      : join(input.cwd, ".pi", "subagent-sessions"));
    const tasksDir = join(base, "tasks");
    const artifactDir = join(tasksDir, `${input.subagentId}-artifacts`);
    mkdirSync(artifactDir, { recursive: true, mode: 0o700 });
    const sessionFile = input.sessionFile ?? join(tasksDir, `${input.subagentId}-g1.jsonl`);
    const resultPath = join(artifactDir, `result-${input.generation}.json`);
    const surface = await this.transport.createTab({
      cwd: input.cwd,
      label: input.label,
      env: {
        PI_HERDR_SUBAGENT_ID: input.subagentId,
        PI_HERDR_SUBAGENT_GENERATION: String(input.generation),
        PI_HERDR_SUBAGENT_RESULT_PATH: resultPath,
      },
    });
    const task: SubagentTask = {
      subagentId: input.subagentId,
      generation: input.generation,
      agent: input.agent,
      cwd: input.cwd,
      label: input.label,
      model: input.model,
      thinking: input.thinking,
      sessionFile,
      resultPath,
      ...surface,
      status: "running",
    };
    const args = ["--session", sessionFile, "-e", paneChildExtensionPath, "--system-prompt", agent.body, "--tools", "read,bash,edit,write,subagent_done"];
    if (input.model) args.push("--model", input.thinking ? `${input.model}:${input.thinking}` : input.model);
    args.push(`${input.prompt}\n\nReturn the Handler Result as YAML, then call subagent_done with that exact YAML string.`);
    const launchScript = join(artifactDir, `launch-${input.generation}.ps1`);
    const bootstrapScript = join(artifactDir, `launch-${input.generation}.cjs`);
    await writeFile(bootstrapScript, buildNodeLaunchScript(input.cwd, "pi", args));
    await writeFile(launchScript, `\ufeff$ErrorActionPreference = 'Stop'\r\n${powerShellInvocation(bootstrapRuntime(), [bootstrapScript])}\r\nexit $LASTEXITCODE\r\n`);
    await this.transport.run(task.paneId, "powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", launchScript]);
    this.tasks.set(task.subagentId, task);
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

  inspect(id: string): SubagentTask { return { ...this.get(id) }; }

  async join(id: string, generation = this.get(id).generation): Promise<SubagentTask> {
    const task = this.get(id);
    if (task.generation !== generation) throw new Error("Subagent generation is no longer current");
    while (task.status === "running") {
      if (existsSync(task.resultPath)) {
        const record = JSON.parse(readFileSync(task.resultPath, "utf8")) as Json;
        if (record.subagentId !== id || record.generation !== generation) throw new Error("Subagent result identity mismatch");
        task.result = typeof record.result === "string" ? record.result : undefined;
        task.status = record.status === "failed" ? "failed" : "completed";
        task.error = typeof record.error === "string" ? record.error : undefined;
        break;
      }
      await delay(50);
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
      await this.transport.closePane(task.paneId);
      task.status = "cancelled";
      await writeAtomic(task.resultPath, { subagentId: id, generation: task.generation, status: "cancelled" });
    }
    return { ...task };
  }

  async remove(id: string): Promise<void> {
    const task = this.get(id);
    if (task.status === "running") await this.transport.closePane(task.paneId);
    this.tasks.delete(id);
    rmSync(task.sessionFile, { force: true });
    rmSync(dirname(task.resultPath), { recursive: true, force: true });
  }
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
    tool("subagent_spawn", "Start one background subagent with a locally resolved registry Agent.", Type.Object({ agent: StringEnum(runtime.agentNames()), prompt: Type.String({ minLength: 1 }), label: Type.String({ minLength: 1 }), model: Type.Optional(Type.String()), thinking: Type.Optional(Type.String()) }), params => runtime.spawn({ ...params, cwd, parentSessionFile }), { renderCall: renderSpawnCall, renderResult: renderSpawnResult }),
    tool("subagent_resume", "Resume a completed or failed subagent.", Type.Object({ subagentId: Type.String(), prompt: Type.String({ minLength: 1 }) }), params => runtime.resume(params.subagentId, params.prompt)),
    tool("subagent_inspect", "Return a non-blocking subagent snapshot.", Type.Object({ subagentId: Type.String() }), params => Promise.resolve(runtime.inspect(params.subagentId))),
    tool("subagent_join", "Wait for a subagent Result.", Type.Object({ subagentId: Type.String(), generation: Type.Optional(Type.Number()) }), async (params, update) => { update?.(runtime.inspect(params.subagentId)); return runtime.join(params.subagentId, params.generation); }, { renderCall: renderJoinCall, renderResult: renderJoinResult }),
    tool("subagent_steer", "Send a message to a running subagent.", Type.Object({ subagentId: Type.String(), message: Type.String({ minLength: 1 }) }), params => runtime.steer(params.subagentId, params.message)),
    tool("subagent_cancel", "Best-effort cancel a running subagent.", Type.Object({ subagentId: Type.String() }), params => runtime.cancel(params.subagentId)),
    tool("subagent_remove", "Close and remove a subagent and its artifacts.", Type.Object({ subagentId: Type.String() }), async params => { await runtime.remove(params.subagentId); return { status: "removed" }; }),
  ];
}

export default function subagentsExtension(pi: ExtensionAPI, dependencies: { runtime?: SubagentRuntime; registry?: AgentRegistry } = {}): void {
  if (process.env.PI_HERDR_SUBAGENT_RESULT_PATH) return;
  const registry = dependencies.registry ?? new AgentRegistry(); const runtime = dependencies.runtime ?? new SubagentRuntime(createHerdrTransport(), registry);
  pi.on("before_agent_start", async (_event, ctx) => {
    await registry.discover(ctx.cwd);
    const tools = createSubagentTools(runtime, ctx.cwd, ctx.sessionManager?.getSessionFile?.());
    for (const tool of tools) pi.registerTool(tool);
    pi.setActiveTools([...pi.getActiveTools().filter(name => !name.startsWith("subagent_")), ...tools.map(tool => tool.name)]);
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

import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setCapabilityOverrides } from "@earendil-works/pi-tui";
import {
  createAgentSessionFromServices, createAgentSessionRuntime, createAgentSessionServices,
  createEventBus,
  getAgentDir, getPackageDir, InteractiveMode, parseArgs, ProjectTrustStore, VERSION,
  resolveCliModel, SessionManager, SettingsManager,
  type AgentSession, type InlineExtension, type InteractiveModeOptions, type ModelRuntime, type ProjectTrustContext, type LoadExtensionsResult,
} from "@earendil-works/pi-coding-agent";
import { paneChildControlChannel, type PaneChildControl } from "../extensions/pane-child.js";
import { imageLaunch, ImageInputError, type ImageLaunch } from "./image-input.js";
import { ownImageInitial } from "./image-child.js";
import { resultPublisher } from "./result-publication.js";

// Package-owned pane invocation, not a replacement for every Pi CLI subcommand.
// Reject unsupported switches explicitly; never silently drop parsed options.
const supported = new Set([
  "session", "extensions", "systemPrompt", "appendSystemPrompt", "model", "thinking",
  "tools", "excludeTools", "noTools", "noBuiltinTools", "noExtensions", "noSkills", "skills",
  "promptTemplates", "noPromptTemplates", "themes", "useTheme", "noThemes", "noContextFiles",
  "offline", "tuiMode", "verbose", "projectTrustOverride", "apiKey",
  "messages", "fileArgs", "unknownFlags", "diagnostics",
]);
export type PaneImageHost = {
  modelRuntime?: ModelRuntime;
  settingsManager?: SettingsManager;
  extensionFactories?: InlineExtension[];
  prepareSession?: (session: AgentSession) => void;
  terminal?: InteractiveModeOptions["terminal"];
  runInteractive?: (mode: InteractiveMode, invoke: () => Promise<void>, runtime: Awaited<ReturnType<typeof createAgentSessionRuntime>>) => Promise<void>;
};

export async function createPaneImageRuntime(args: string[], host: PaneImageHost = {}) {
  const parsed = parseArgs(args);
  if (Object.entries(parsed).some(([key, value]) => value !== undefined && !supported.has(key))
    || parsed.diagnostics.some(d => d.type === "error") || !parsed.session
    || parsed.messages.length !== 1 || parsed.fileArgs.length) throw new ImageInputError("options");
  const launch = imageLaunch(parsed.session);
  if (parsed.offline) process.env.PI_OFFLINE = "1";
  const agentDir = getAgentDir();
  const sessionManager = SessionManager.open(parsed.session);
  const initialCwd = process.cwd();
  const paths = (values?: string[]) => values?.map(value => value.startsWith("builtin:") ? value : resolve(initialCwd, value));
  let initial: (() => Promise<void>) | undefined;
  // Reuse the installed CLI's startup trust UI and built-ins through the public
  // resource-loader callback. These file exports are version-specific, unlike SDK APIs.
  if (VERSION !== "0.99.2") throw new ImageInputError("sdk_version");
  const installed = async (file: string) => import(pathToFileURL(join(getPackageDir(), "dist", file)).href);
  const { builtInExtensions } = await installed("extensions/index.js") as { builtInExtensions: InlineExtension[] };
  const { createProjectTrustContext } = await installed("cli/project-trust.js") as { createProjectTrustContext(options: {
    cwd: string; mode: string; hasUI: boolean; settingsManager: SettingsManager;
  }): ProjectTrustContext };
  const { resolveProjectTrusted } = await installed("core/project-trust.js") as { resolveProjectTrusted(options: {
    cwd: string; trustStore: ProjectTrustStore; trustOverride?: boolean; defaultProjectTrust: string;
    extensionsResult: LoadExtensionsResult; projectTrustContext: ProjectTrustContext;
  }): Promise<boolean> };
  const runtime = await createAgentSessionRuntime(async ({ cwd, sessionManager, sessionStartEvent, projectTrustContext }) => {
    const settingsManager = host.settingsManager ?? SettingsManager.create(cwd, agentDir, { projectTrusted: false });
    const bus = createEventBus();
    const services = await createAgentSessionServices({
      cwd, agentDir, settingsManager, modelRuntime: host.modelRuntime,
      extensionFlagValues: parsed.unknownFlags,
      resourceLoaderReloadOptions: { resolveProjectTrust: ({ extensionsResult }) => resolveProjectTrusted({
        cwd, trustStore: new ProjectTrustStore(agentDir), trustOverride: parsed.projectTrustOverride,
        defaultProjectTrust: settingsManager.getDefaultProjectTrust(), extensionsResult,
        projectTrustContext: projectTrustContext ?? createProjectTrustContext({ cwd, mode: "interactive", hasUI: true, settingsManager }),
      }) },
      resourceLoaderOptions: {
        eventBus: bus, additionalExtensionPaths: paths(parsed.extensions),
        additionalSkillPaths: paths(parsed.skills), additionalPromptTemplatePaths: paths(parsed.promptTemplates),
        additionalThemePaths: paths(parsed.themes), noExtensions: parsed.noExtensions,
        noSkills: parsed.noSkills, noThemes: parsed.noThemes, noPromptTemplates: parsed.noPromptTemplates,
        noContextFiles: parsed.noContextFiles, systemPrompt: parsed.systemPrompt, appendSystemPrompt: parsed.appendSystemPrompt,
        extensionFactories: [...builtInExtensions, ...(host.extensionFactories ?? [])],
      },
    });
    if (services.diagnostics.some(d => d.type === "error") || services.resourceLoader.getExtensions().errors.length) throw new ImageInputError("resources");
    const chosen = resolveCliModel({ cliModel: parsed.model, cliThinking: parsed.thinking, modelRuntime: services.modelRuntime });
    if (parsed.model && (!chosen.model || chosen.error || chosen.warning)) throw new ImageInputError("model_identity");
    if (parsed.model && chosen.model) {
      const exact = chosen.model.provider + "/" + chosen.model.id;
      if (parsed.model !== exact && parsed.model !== exact + ":" + chosen.thinkingLevel) throw new ImageInputError("model_identity");
    }
    if (parsed.apiKey) {
      if (!chosen.model) throw new ImageInputError("model");
      await services.modelRuntime.setRuntimeApiKey(chosen.model.provider, parsed.apiKey);
    }
    const created = await createAgentSessionFromServices({
      services, sessionManager, sessionStartEvent, model: chosen.model,
      thinkingLevel: parsed.thinking ?? chosen.thinkingLevel,
      tools: parsed.tools, excludeTools: parsed.excludeTools,
      noTools: parsed.noTools ? "all" : parsed.noBuiltinTools ? "builtin" : undefined,
    });
    if (created.modelFallbackMessage && sessionManager.buildSessionContext().messages.length > 0) throw new ImageInputError("model_identity");
    if (parsed.thinking !== undefined || chosen.thinkingLevel !== undefined) created.session.setThinkingLevel(created.session.thinkingLevel);
    let control: PaneChildControl | undefined;
    bus.emit(paneChildControlChannel, (value: PaneChildControl) => { control = value; });
    if (!control) throw new ImageInputError("barrier");
    // Capture the initial call before InteractiveMode binds extensions or accepts input.
    host.prepareSession?.(created.session);
    const invoke = sessionStartEvent === undefined ? ownImageInitial(created.session, launch, control) : undefined;
    if (invoke) initial = () => invoke(parsed.messages[0]!);
    return { ...created, services, diagnostics: services.diagnostics };
  }, { cwd: sessionManager.getCwd(), agentDir, sessionManager });
  // Later runtime replacements recreate services and never replay the owned call.
  return { runtime, launch, invoke: () => initial!() };
}

export async function recordImageStartupFailure(launch: ImageLaunch, stage: string): Promise<void> {
  try {
    const publisher = resultPublisher(launch.resultPath, () => { imageLaunch(launch.sessionFile); });
    const safeStage = /^[a-z_]+$/.test(stage) ? stage : "startup";
    await publisher.publish(JSON.stringify({ subagentId: launch.subagentId, generation: launch.generation,
      status: "failed", error: `image_input_failed:${safeStage}` }));
  } catch {
    try { console.warn("Startup Result publication failed for the child generation."); } catch { /* Preserve the input failure. */ }
  }
}

export async function runPaneImageChild(args: string[], host: PaneImageHost = {}): Promise<void> {
  let launch: ImageLaunch | undefined;
  try {
    const session = parseArgs(args).session;
    if (!session) throw new ImageInputError("options");
    launch = imageLaunch(session);
    const { runtime, invoke } = await createPaneImageRuntime(args, host);
    setCapabilityOverrides(runtime.services.settingsManager.getTerminalCapabilityOverrides());
    const options: InteractiveModeOptions = { terminal: host.terminal, startupDiagnostics: [...runtime.diagnostics],
      verbose: parseArgs(args).verbose, tuiMode: parseArgs(args).tuiMode, initialThemeSetting: parseArgs(args).useTheme };
    const mode = new InteractiveMode(runtime, options);
    try {
      if (host.runInteractive) await host.runInteractive(mode, invoke, runtime);
      else { await mode.init(); await invoke(); await mode.run(); }
    } finally { await runtime.dispose(); }
  } catch (error) {
    const stage = error instanceof ImageInputError ? error.stage : "startup";
    if (launch) await recordImageStartupFailure(launch, stage);
    throw new ImageInputError(stage);
  }
}

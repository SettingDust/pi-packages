import { SettingsManager } from "@earendil-works/pi-coding-agent";
import { candidateEntries, configuredCandidates, FileHarnessSettingsRepository, type CandidateEntry } from "./settings-store.js";

const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;

type Settings = Record<string, unknown>;

type SettingsManagerLike = {
  getGlobalSettings(): unknown;
  getProjectSettings(): unknown;
  drainErrors(): Array<{ scope: "global" | "project" }>;
};

export type ModelLike = {
  provider: string;
  id: string;
  reasoning: boolean;
  thinkingLevelMap?: Partial<Record<(typeof THINKING_LEVELS)[number], unknown>>;
};

export type HarnessConfigurationBlockCode = "legacy_configuration" | "invalid_configuration";

export type HarnessCandidates =
  | { status: "ready"; candidates: CandidateEntry[] }
  | { status: "blocked"; code: HarnessConfigurationBlockCode; message: string };

export function loadHarnessCandidates(
  cwd: string,
  projectTrusted: boolean,
  createManager: (cwd: string, projectTrusted: boolean) => SettingsManagerLike = createDefaultSettingsManager,
): HarnessCandidates {
  try {
    const manager = createManager(cwd, projectTrusted);
    const global = manager.getGlobalSettings();
    const project = projectTrusted ? manager.getProjectSettings() : {};
    const hasReadError = manager.drainErrors().some(({ scope }) => scope === "global" || (projectTrusted && scope === "project"));
    if (hasReadError) return blocked("invalid_configuration", "Pi settings could not be read; manual replacement required");
    const normalized = normalizeHarnessCandidates(global, project);
    return normalized.status === "ready"
      ? { status: "ready", candidates: candidateEntries(normalized.candidates) }
      : normalized;
  } catch {
    return blocked("invalid_configuration", "Pi settings could not be read; manual replacement required");
  }
}
function createDefaultSettingsManager(cwd: string, projectTrusted: boolean): SettingsManagerLike {
  const rawSettings = new FileHarnessSettingsRepository(cwd);
  rawSettings.read("global");
  if (projectTrusted) rawSettings.read("project");
  return SettingsManager.create(cwd, undefined, { projectTrusted });
}


export function normalizeHarnessCandidates(
  globalSettings: unknown,
  projectSettings: unknown,
): { status: "ready"; candidates: ReturnType<typeof configuredCandidates> extends infer T ? Exclude<T, undefined> : never } | { status: "blocked"; code: HarnessConfigurationBlockCode; message: string } {
  const config = effectiveHarness(globalSettings, projectSettings);
  if (!config.present) return { status: "ready", candidates: {} };
  if (isObject(config.value) && Object.keys(config.value).some((key) => !["candidates", "roles", "modelRole"].includes(key))) {
    return blocked("invalid_configuration", "harness must contain only a candidates object; manual replacement required");
  }
  if (isObject(config.value) && (Object.hasOwn(config.value, "roles") || Object.hasOwn(config.value, "modelRole"))) {
    return blocked("legacy_configuration", "Legacy harness roles require manual replacement; use harness.candidates");
  }
  try {
    return { status: "ready", candidates: configuredCandidates({ harness: config.value }) ?? {} };
  } catch (error) {
    return blocked("invalid_configuration", error instanceof Error ? error.message : "Invalid harness configuration; manual replacement required");
  }
}

export function supportedThinkingLevels(model: ModelLike): string[] {
  if (!model.reasoning) return ["off"];
  return THINKING_LEVELS.filter((thinking) => {
    const mapped = model.thinkingLevelMap?.[thinking];
    return mapped !== null && (thinking !== "xhigh" || mapped !== undefined);
  });
}

function effectiveHarness(globalSettings: unknown, projectSettings: unknown): { present: boolean; value?: unknown } {
  const global = isObject(globalSettings) ? globalSettings : {};
  const project = isObject(projectSettings) ? projectSettings : {};
  const globalPresent = Object.hasOwn(global, "harness");
  const projectPresent = Object.hasOwn(project, "harness");
  if (!projectPresent) return { present: globalPresent, value: global.harness };

  const projectValue = project.harness;
  const globalValue = global.harness;
  return {
    present: true,
    value: isObject(projectValue) && isObject(globalValue) ? { ...globalValue, ...projectValue } : projectValue,
  };
}

function isObject(value: unknown): value is Settings {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function blocked(code: HarnessConfigurationBlockCode, message: string): { status: "blocked"; code: HarnessConfigurationBlockCode; message: string } {
  return { status: "blocked", code, message };
}

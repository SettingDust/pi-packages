import { SettingsManager } from "@earendil-works/pi-coding-agent";
import type { ModelRole } from "./protocol.js";

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

export type HarnessRoles =
  | { status: "ready"; roles: ModelRole[] }
  | { status: "blocked"; message: string };

export function loadHarnessRoles(
  cwd: string,
  projectTrusted: boolean,
  models: readonly ModelLike[],
  createManager: (cwd: string, projectTrusted: boolean) => SettingsManagerLike = (path, trusted) =>
    SettingsManager.create(path, undefined, { projectTrusted: trusted }),
): HarnessRoles {
  try {
    const manager = createManager(cwd, projectTrusted);
    const global = manager.getGlobalSettings();
    const project = projectTrusted ? manager.getProjectSettings() : {};
    const hasReadError = manager.drainErrors().some(({ scope }) => scope === "global" || (projectTrusted && scope === "project"));
    return hasReadError ? blocked("Pi settings could not be read") : normalizeHarnessRoles(global, project, models);
  } catch {
    return blocked("Pi settings could not be read");
  }
}

export function normalizeHarnessRoles(
  globalSettings: unknown,
  projectSettings: unknown,
  models: readonly ModelLike[],
): HarnessRoles {
  const config = effectiveHarness(globalSettings, projectSettings);
  if (!config.present) return { status: "ready", roles: [] };
  if (!isObject(config.value) || Object.keys(config.value).some((key) => key !== "roles")) {
    return blocked("harness must contain only a roles object");
  }
  const rawRoles = config.value.roles ?? {};
  if (!isObject(rawRoles)) return blocked("harness.roles must be an object");

  const availableModels = new Map(models.map((model) => [`${model.provider}/${model.id}`, model]));
  const roles: ModelRole[] = [];
  for (const [name, rawRole] of Object.entries(rawRoles)) {
    if (!nonEmpty(name) || !isObject(rawRole) || Object.keys(rawRole).sort().join(",") !== "description,model,thinking") {
      return blocked("Every harness Role needs description, model, and thinking");
    }
    const { description, model, thinking } = rawRole;
    if (!nonEmpty(description) || !nonEmpty(model) || !nonEmpty(thinking)) {
      return blocked("Every harness Role value must be a non-empty string");
    }
    const definition = availableModels.get(model);
    roles.push({
      name,
      description,
      model,
      thinking,
      available: definition !== undefined && supportsThinking(definition, thinking),
      ...(definition && !supportsThinking(definition, thinking) ? { unavailableCode: "invalid_thinking" as const } : {}),
    });
  }
  return { status: "ready", roles };
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

export function supportedThinkingLevels(model: ModelLike): string[] {
  if (!model.reasoning) return ["off"];
  return THINKING_LEVELS.filter((thinking) => {
    const mapped = model.thinkingLevelMap?.[thinking];
    return mapped !== null && (thinking !== "xhigh" || mapped !== undefined);
  });
}

function supportsThinking(model: ModelLike, thinking: string): boolean {
  return supportedThinkingLevels(model).includes(thinking);
}

function isObject(value: unknown): value is Settings {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function blocked(message: string): HarnessRoles {
  return { status: "blocked", message };
}

import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { supportedThinkingLevels, type ModelLike } from "./config.js";
import {
  configuredRoles,
  FileHarnessSettingsRepository,
  type ConfiguredRole,
  type ConfiguredRoles,
  type HarnessSettingsRepository,
  type HarnessSettingsScope,
} from "./settings-store.js";

const ADD_ROLE = "Add role";
const INITIALIZE_TEMPLATES = "Initialize basic, standard, and advanced templates";
const RESET_PROJECT = "Reset project override (inherit Global)";
const SAVE = "Save";
const CANCEL = "Cancel";
const BACK = "Back";

interface ConfigContext extends Pick<
  ExtensionCommandContext,
  "cwd" | "hasUI" | "isProjectTrusted" | "modelRegistry" | "ui"
> {}

interface ScopedRoles {
  roles?: ConfiguredRoles;
  invalid?: string;
}

export async function runHarnessConfig(
  ctx: ConfigContext,
  repository: HarnessSettingsRepository = new FileHarnessSettingsRepository(ctx.cwd),
): Promise<void> {
  if (!ctx.hasUI) {
    ctx.ui.notify("/harness config requires an interactive UI", "error");
    return;
  }

  const options = ctx.isProjectTrusted() ? ["Global", "Project"] : ["Global"];
  const selected = await ctx.ui.select("Harness configuration scope", options);
  if (!selected) return;

  const scope = selected.toLowerCase() as HarnessSettingsScope;
  try {
    await editScope(ctx, repository, scope);
  } catch (error) {
    ctx.ui.notify(error instanceof Error ? error.message : "Harness configuration failed", "error");
  }
}

async function editScope(
  ctx: ConfigContext,
  repository: HarnessSettingsRepository,
  scope: HarnessSettingsScope,
): Promise<void> {
  const global = loadScope(repository, "global");
  const selected = scope === "global" ? global : loadScope(repository, "project");

  let override = scope === "global" || selected.roles !== undefined;
  let roles = structuredClone(selected.roles ?? global.roles ?? {});
  if (selected.invalid) {
    const replace = await ctx.ui.confirm(
      `Invalid ${scope} harness configuration`,
      `${selected.invalid}\n\nReplace this scope's harness configuration?`,
    );
    if (!replace) return;
    roles = structuredClone(scope === "project" ? global.roles ?? {} : {});
    override = true;
  } else if (scope === "project" && global.invalid && selected.roles === undefined) {
    const replace = await ctx.ui.confirm(
      "Invalid inherited harness configuration",
      `${global.invalid}\n\nCreate an empty Project override?`,
    );
    if (!replace) return;
    roles = {};
    override = true;
  }

  while (true) {
    const roleOptions = Object.entries(roles)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, role]) => roleLabel(name, role));
    const actions = [ADD_ROLE];
    if (Object.keys(roles).length === 0) actions.push(INITIALIZE_TEMPLATES);
    if (scope === "project" && override) actions.push(RESET_PROJECT);
    actions.push(SAVE, CANCEL);

    const choice = await ctx.ui.select(
      `Harness Roles - ${scope === "global" ? "Global" : override ? "Project override" : "Project (inheriting Global)"}`,
      [...roleOptions, ...actions],
    );
    if (!choice || choice === CANCEL) return;
    if (choice === SAVE) {
      repository.writeRoles(scope, scope === "project" && !override ? undefined : roles);
      ctx.ui.notify(`Saved ${scope} harness Roles`, "info");
      return;
    }
    if (choice === RESET_PROJECT) {
      override = false;
      roles = structuredClone(global.roles ?? {});
      continue;
    }
    if (choice === INITIALIZE_TEMPLATES) {
      const templates = await createTemplates(ctx);
      if (templates) {
        roles = templates;
        override = true;
      }
      continue;
    }
    if (choice === ADD_ROLE) {
      const added = await createRole(ctx, roles);
      if (added) {
        roles[added.name] = added.role;
        override = true;
      }
      continue;
    }

    const name = Object.keys(roles).find((candidate) => roleLabel(candidate, roles[candidate]!) === choice);
    if (name && await editRoleMenu(ctx, roles, name)) override = true;
  }
}

async function editRoleMenu(ctx: ConfigContext, roles: ConfiguredRoles, name: string): Promise<boolean> {
  while (true) {
    const action = await ctx.ui.select(`Role: ${name}`, ["Edit", "Rename", "Delete", BACK]);
    if (!action || action === BACK) return false;
    if (action === "Delete") {
      if (await ctx.ui.confirm("Delete Role", `Delete ${name}?`)) {
        delete roles[name];
        return true;
      }
      continue;
    }
    if (action === "Rename") {
      const next = (await ctx.ui.input(`Rename ${name}`, "New Role name"))?.trim();
      if (!next) continue;
      if (roles[next] && next !== name) {
        ctx.ui.notify(`Role ${next} already exists`, "error");
        continue;
      }
      if (next === name) return false;
      roles[next] = roles[name]!;
      delete roles[name];
      return true;
    }
    if (action === "Edit") {
      const edited = await editRole(ctx, roles[name]!);
      if (edited) {
        roles[name] = edited;
        return true;
      }
    }
  }
}

async function createRole(
  ctx: ConfigContext,
  roles: ConfiguredRoles,
): Promise<{ name: string; role: ConfiguredRole } | undefined> {
  const name = (await ctx.ui.input("Add Harness Role", "Role name"))?.trim();
  if (!name) return undefined;
  if (roles[name]) {
    ctx.ui.notify(`Role ${name} already exists`, "error");
    return undefined;
  }
  const role = await editRole(ctx);
  return role ? { name, role } : undefined;
}

async function editRole(ctx: ConfigContext, current?: ConfiguredRole): Promise<ConfiguredRole | undefined> {
  const description = (await ctx.ui.editor("Role description", current?.description ?? ""))?.trim();
  if (!description) return undefined;
  const selected = await selectModel(ctx, current?.model);
  if (!selected) return undefined;
  const thinking = await selectThinking(ctx, selected.model, current?.thinking);
  return thinking ? { description, model: selected.id, thinking } : undefined;
}

async function createTemplates(ctx: ConfigContext): Promise<ConfiguredRoles | undefined> {
  const selected = await selectModel(ctx);
  if (!selected) return undefined;
  const levels = supportedThinkingLevels(selected.model);
  return {
    basic: {
      description: "Narrow, low-risk work.",
      model: selected.id,
      thinking: closestLevel(levels, ["low", "minimal", "off"]),
    },
    standard: {
      description: "Normal multi-step work.",
      model: selected.id,
      thinking: closestLevel(levels, ["medium", "high", "low", "off"]),
    },
    advanced: {
      description: "High-ambiguity, high-risk, or complex reasoning.",
      model: selected.id,
      thinking: closestLevel(levels, ["high", "xhigh", "medium", "low", "off"]),
    },
  };
}

async function selectModel(
  ctx: ConfigContext,
  current?: string,
): Promise<{ id: string; model: ModelLike } | undefined> {
  const models = ctx.modelRegistry.getAvailable();
  if (models.length === 0) {
    ctx.ui.notify("No authenticated model is available", "error");
    return undefined;
  }
  const byId = new Map(models.map((model) => [`${model.provider}/${model.id}`, model]));
  const options = [...byId.keys()].sort((a, b) => a.localeCompare(b));
  if (current && byId.has(current)) {
    options.splice(options.indexOf(current), 1);
    options.unshift(current);
  }
  const id = await ctx.ui.select("Role model", options);
  const model = id ? byId.get(id) : undefined;
  return id && model ? { id, model } : undefined;
}

async function selectThinking(ctx: ConfigContext, model: ModelLike, current?: string): Promise<string | undefined> {
  const levels = supportedThinkingLevels(model);
  if (current && levels.includes(current)) {
    levels.splice(levels.indexOf(current), 1);
    levels.unshift(current);
  }
  return ctx.ui.select("Thinking level", levels);
}

function closestLevel(available: string[], preferred: string[]): string {
  return preferred.find((level) => available.includes(level)) ?? available[0] ?? "off";
}

function loadScope(repository: HarnessSettingsRepository, scope: HarnessSettingsScope): ScopedRoles {
  const settings = repository.read(scope);
  try {
    return { roles: configuredRoles(settings) };
  } catch (error) {
    return { invalid: error instanceof Error ? error.message : "Invalid harness configuration" };
  }
}

function roleLabel(name: string, role: ConfiguredRole): string {
  return `Role: ${name} (${role.model}, ${role.thinking})`;
}

import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { supportedThinkingLevels, type ModelLike } from "./config.js";
import {
  candidateEntries,
  configuredCandidates,
  DuplicateJsonKeyError,
  FileHarnessSettingsRepository,
  type ConfiguredCandidateCapabilities,
  type ConfiguredCandidates,
  type HarnessSettingsRepository,
  type HarnessSettingsScope,
} from "./settings-store.js";

const ADD_CANDIDATE = "Add candidate";
const RESET_PROJECT = "Reset project override (inherit Global)";
const SAVE = "Save";
const CANCEL = "Cancel";
const BACK = "Back";

interface ConfigContext extends Pick<
  ExtensionCommandContext,
  "cwd" | "hasUI" | "isProjectTrusted" | "modelRegistry" | "ui"
> {}

interface ScopedCandidates {
  candidates?: ConfiguredCandidates;
  invalid?: string;
  duplicateKeyRecovery?: boolean;
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

  let override = scope === "global" || selected.candidates !== undefined;
  let candidates = structuredClone(selected.candidates ?? global.candidates ?? {});
  let duplicateKeyRecovery = false;
  if (selected.invalid) {
    const replace = await ctx.ui.confirm(
      `Invalid ${scope} harness configuration`,
      `${selected.invalid}\n\nReplace this scope's harness configuration?`,
    );
    if (!replace) return;
    candidates = structuredClone(scope === "project" ? global.candidates ?? {} : {});
    override = true;
    duplicateKeyRecovery = selected.duplicateKeyRecovery === true;
  } else if (scope === "project" && global.invalid && selected.candidates === undefined) {
    const replace = await ctx.ui.confirm(
      "Invalid inherited harness configuration",
      `${global.invalid}\n\nCreate an empty Project override?`,
    );
    if (!replace) return;
    candidates = {};
    override = true;
  }

  while (true) {
    const candidateOptions = candidateEntries(candidates)
      .sort((a, b) => candidateIdentity(a).localeCompare(candidateIdentity(b)))
      .map(candidateIdentity);
    const actions = [ADD_CANDIDATE];
    if (scope === "project" && override) actions.push(RESET_PROJECT);
    actions.push(SAVE, CANCEL);

    const choice = await ctx.ui.select(
      `Harness candidates - ${scope === "global" ? "Global" : override ? "Project override" : "Project (inheriting Global)"}`,
      [...candidateOptions, ...actions],
    );
    if (!choice || choice === CANCEL) return;
    if (choice === SAVE) {
      const saved = scope === "project" && !override ? undefined : candidates;
      if (duplicateKeyRecovery) repository.replaceCandidatesAfterDuplicateKeyConfirmation(scope, saved);
      else repository.writeCandidates(scope, saved);
      ctx.ui.notify(`Saved ${scope} harness candidates`, "info");
      return;
    }
    if (choice === RESET_PROJECT) {
      override = false;
      candidates = structuredClone(global.candidates ?? {});
      continue;
    }
    if (choice === ADD_CANDIDATE) {
      const added = await createCandidate(ctx, candidates);
      if (added) {
        candidates[added.providerModelKey] ??= {};
        candidates[added.providerModelKey][added.thinking] = added.capabilities;
        override = true;
      }
      continue;
    }

    const entry = candidateEntries(candidates).find((item) => candidateIdentity(item) === choice);
    if (entry && await editCandidateMenu(ctx, candidates, entry)) override = true;
  }
}

async function editCandidateMenu(
  ctx: ConfigContext,
  candidates: ConfiguredCandidates,
  entry: ReturnType<typeof candidateEntries>[number],
): Promise<boolean> {
  while (true) {
    const action = await ctx.ui.select(candidateLabel(entry), ["Edit", "Delete", BACK]);
    if (!action || action === BACK) return false;
    const key = `${entry.provider}/${entry.modelId}`;
    if (action === "Delete") {
      if (await ctx.ui.confirm("Delete candidate", `Delete ${key} (${entry.thinking})?`)) {
        delete candidates[key]?.[entry.thinking];
        if (candidates[key] && Object.keys(candidates[key]).length === 0) delete candidates[key];
        return true;
      }
      continue;
    }
    if (action === "Edit") {
      const edited = await editCandidate(ctx, entry);
      if (!edited) continue;
      const nextKey = edited.providerModelKey;
      const collides = (nextKey !== key || edited.thinking !== entry.thinking) && candidates[nextKey]?.[edited.thinking] !== undefined;
      if (collides && !await ctx.ui.confirm(
        "Replace candidate",
        `Replace existing ${nextKey} (${edited.thinking})?`,
      )) continue;
      delete candidates[key]?.[entry.thinking];
      if (candidates[key] && Object.keys(candidates[key]).length === 0) delete candidates[key];
      candidates[nextKey] ??= {};
      candidates[nextKey][edited.thinking] = edited.capabilities;
      return true;
    }
  }
}

async function createCandidate(
  ctx: ConfigContext,
  candidates: ConfiguredCandidates,
): Promise<{ providerModelKey: string; thinking: string; capabilities: ConfiguredCandidateCapabilities } | undefined> {
  const selected = await selectModel(ctx);
  if (!selected) return undefined;
  const thinking = await selectThinking(ctx, selected.model);
  const capabilities = thinking ? await inputCapabilities(ctx) : undefined;
  if (!thinking || !capabilities) return undefined;
  const providerModelKey = `${selected.model.provider}/${selected.model.id}`;
  if (candidates[providerModelKey]?.[thinking]) {
    ctx.ui.notify("Candidate already exists", "error");
    return undefined;
  }
  return { providerModelKey, thinking, capabilities };
}

async function editCandidate(
  ctx: ConfigContext,
  current: ReturnType<typeof candidateEntries>[number],
): Promise<{ providerModelKey: string; thinking: string; capabilities: ConfiguredCandidateCapabilities } | undefined> {
  const selected = await selectModel(ctx, `${current.provider}/${current.modelId}`);
  if (!selected) return undefined;
  const thinking = await selectThinking(ctx, selected.model, current.thinking);
  const capabilities = thinking ? await inputCapabilities(ctx, current) : undefined;
  return thinking && capabilities
    ? { providerModelKey: `${selected.model.provider}/${selected.model.id}`, thinking, capabilities }
    : undefined;
}

async function inputCapabilities(
  ctx: ConfigContext,
  current?: ConfiguredCandidateCapabilities,
): Promise<ConfiguredCandidateCapabilities | undefined> {
  const reasoning = await ctx.ui.input("Reasoning capability (finite integer >= 0; 0 routine, 1 modest, 2 substantial, 3 exceptional; 0-3 guidance, not an upper bound)", current ? String(current.reasoning) : "0");
  const impact = await ctx.ui.input("Impact capability (finite integer >= 0; 0 routine, 1 modest, 2 substantial, 3 exceptional; 0-3 guidance, not an upper bound)", current ? String(current.impact) : "0");
  if (reasoning === undefined || impact === undefined) return undefined;
  const values = { reasoning: Number(reasoning), impact: Number(impact) };
  return Object.values(values).every((value) => Number.isFinite(value) && Number.isInteger(value) && value >= 0) ? values : undefined;
}

async function selectModel(
  ctx: ConfigContext,
  current?: string,
): Promise<{ model: ModelLike } | undefined> {
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
  const id = await ctx.ui.select("Candidate provider/model", options);
  const model = id ? byId.get(id) : undefined;
  return model ? { model } : undefined;
}

async function selectThinking(ctx: ConfigContext, model: ModelLike, current?: string): Promise<string | undefined> {
  const levels = supportedThinkingLevels(model);
  if (current && levels.includes(current)) {
    levels.splice(levels.indexOf(current), 1);
    levels.unshift(current);
  }
  return ctx.ui.select("Thinking level", levels);
}

function loadScope(repository: HarnessSettingsRepository, scope: HarnessSettingsScope): ScopedCandidates {
  try {
    const settings = repository.read(scope);
    return { candidates: configuredCandidates(settings) };
  } catch (error) {
    return {
      invalid: error instanceof Error ? error.message : "Invalid harness configuration; manual replacement required",
      duplicateKeyRecovery: error instanceof DuplicateJsonKeyError,
    };
  }
}

function candidateIdentity(candidate: ReturnType<typeof candidateEntries>[number]): string {
  return JSON.stringify([candidate.provider, candidate.modelId, candidate.thinking]);
}

function candidateLabel(candidate: ReturnType<typeof candidateEntries>[number]): string {
  return `Candidate: ${candidate.provider}/${candidate.modelId} (${candidate.thinking}, reasoning ${candidate.reasoning}, impact ${candidate.impact})`;
}

import { access, constants, realpath } from "node:fs/promises";
import { resolve } from "node:path";

export type ThinkingLevel = string;

export interface SkillSummary {
  name: string;
  description: string;
}

export interface ModelRole {
  name: string;
  description: string;
  model: string;
  thinking: ThinkingLevel;
  available: boolean;
}

export interface ContextRef {
  ref: string;
  purpose: string;
}

export interface ContextInline {
  inline: string;
  purpose: string;
}

export type ContextItem = ContextRef | ContextInline;

export interface Handoff {
  objective: string;
  primarySkill: string;
  companionSkills: string[];
  context: ContextItem[];
  constraints?: string[];
  deliverables?: string[];
}

export interface ResolverInput {
  handoff: Handoff;
  modelRole: string;
}

export interface ResolverSchema {
  primarySkill: { enum: string[]; descriptions: Record<string, string> };
  companionSkills: { enum: string[]; descriptions: Record<string, string> };
  modelRole: { enum: string[]; descriptions: Record<string, string> };
}

export type BlockCode =
  | "invalid_config"
  | "invalid_skill"
  | "invalid_reference"
  | "unknown_role"
  | "unavailable_model"
  | "invalid_thinking";

export interface BlockedResolution {
  status: "blocked";
  code: BlockCode;
  message: string;
}

export interface ResolvedInvocation {
  status: "resolved";
  handler: { name: string; path: string };
  prompt: string;
  model: string;
  thinking: ThinkingLevel;
}

export type Resolution = ResolvedInvocation | BlockedResolution;

export type HandlerStatus = "completed" | "partial" | "blocked" | "failed";

export interface ResultArtifact {
  ref: string;
  purpose: string;
}

export interface HandlerResult {
  status: HandlerStatus;
  summary: string;
  report: string;
  artifacts?: ResultArtifact[];
}

export interface InvalidHandlerResult {
  valid: false;
  message: string;
}

export interface ParsedHandlerResult {
  valid: true;
  result: HandlerResult;
}

export type HandlerResultParse = ParsedHandlerResult | InvalidHandlerResult;

const forbiddenResultFields = new Set(["suggestedNext", "nextAction", "nextSkill"]);

export function buildResolverSchema(skills: SkillSummary[], roles: ModelRole[]): ResolverSchema {
  const skillDescriptions = Object.fromEntries(skills.map(({ name, description }) => [name, description]));
  const availableRoles = roles.filter(
    (role) =>
      role.available &&
      nonEmptyString(role.name) &&
      nonEmptyString(role.description) &&
      nonEmptyString(role.model) &&
      nonEmptyString(role.thinking),
  );
  const roleDescriptions = Object.fromEntries(
    availableRoles.map(({ name, description }) => [name, description]),
  );
  const skillEnum = Object.keys(skillDescriptions);

  return {
    primarySkill: { enum: skillEnum, descriptions: skillDescriptions },
    companionSkills: { enum: skillEnum, descriptions: skillDescriptions },
    modelRole: { enum: availableRoles.map(({ name }) => name), descriptions: roleDescriptions },
  };
}

export interface ResolveOptions {
  skills: SkillSummary[];
  roles: ModelRole[];
  cwd: string;
  handlerPath: string;
  handlerName?: string;
}

export async function resolveDelegation(
  input: unknown,
  options: ResolveOptions,
): Promise<Resolution> {
  const parsed = validateInput(input);
  if (!parsed.ok) return blocked(parsed.code, parsed.message);

  const skillNames = new Set(options.skills.map(({ name }) => name));
  const { handoff, modelRole } = parsed.value;
  if (!skillNames.has(handoff.primarySkill)) {
    return blocked("invalid_skill", `Unknown primary Skill: ${handoff.primarySkill}`);
  }
  if (new Set(handoff.companionSkills).size !== handoff.companionSkills.length) {
    return blocked("invalid_skill", "companionSkills must not contain duplicates");
  }
  if (handoff.companionSkills.includes(handoff.primarySkill)) {
    return blocked("invalid_skill", "primarySkill must not also be a companion Skill");
  }
  if (handoff.companionSkills.some((name) => !skillNames.has(name))) {
    return blocked("invalid_skill", "Every companion Skill must be discovered by Pi");
  }

  const role = options.roles.find(({ name }) => name === modelRole);
  if (!role) return blocked("unknown_role", `Unknown Model Role: ${modelRole}`);
  if (!nonEmptyString(role.description)) return blocked("invalid_config", `Model Role is malformed: ${modelRole}`);
  if (!role.available) return blocked("unavailable_model", `Model Role is unavailable: ${modelRole}`);
  if (!role.model.trim()) return blocked("unavailable_model", `Model Role has no model: ${modelRole}`);
  if (!role.thinking.trim()) return blocked("invalid_thinking", `Model Role has no thinking level: ${modelRole}`);

  const normalizedContext: ContextItem[] = [];
  for (const item of handoff.context) {
    if ("ref" in item) {
      try {
        const path = await readablePath(options.cwd, item.ref);
        normalizedContext.push({ ref: path, purpose: item.purpose });
      } catch {
        return blocked("invalid_reference", `Reference is missing or unreadable: ${item.ref}`);
      }
    } else {
      normalizedContext.push(item);
    }
  }

  const normalizedHandoff: Handoff = {
    ...handoff,
    context: normalizedContext,
    ...(handoff.constraints ? { constraints: [...handoff.constraints] } : {}),
    ...(handoff.deliverables ? { deliverables: [...handoff.deliverables] } : {}),
  };

  return {
    status: "resolved",
    handler: { name: options.handlerName ?? "handler", path: resolve(options.handlerPath) },
    prompt: Bun.YAML.stringify(normalizedHandoff),
    model: role.model,
    thinking: role.thinking,
  };
}

export function parseHandlerResult(input: unknown): HandlerResultParse {
  let value: unknown = input;
  if (typeof input === "string") {
    try {
      value = Bun.YAML.parse(input);
    } catch {
      return { valid: false, message: "Handler Result is not valid YAML" };
    }
  }
  if (!isRecord(value)) return { valid: false, message: "Handler Result must be an object" };
  if ([...forbiddenResultFields].some((field) => field in value)) {
    return { valid: false, message: "Handler Result must not control Router workflow" };
  }
  if (!isHandlerStatus(value.status) || !nonEmptyString(value.summary) || !nonEmptyString(value.report)) {
    return { valid: false, message: "Handler Result requires status, summary, and report" };
  }
  if (value.artifacts !== undefined && !isArtifacts(value.artifacts)) {
    return { valid: false, message: "Handler Result artifacts must contain ref and purpose strings" };
  }
  return {
    valid: true,
    result: {
      status: value.status,
      summary: value.summary,
      report: value.report,
      ...(value.artifacts ? { artifacts: value.artifacts } : {}),
    },
  };
}

async function readablePath(cwd: string, ref: string): Promise<string> {
  if (!nonEmptyString(ref)) throw new Error("empty reference");
  const candidate = resolve(cwd, ref);
  const canonical = await realpath(candidate);
  await access(canonical, constants.R_OK);
  return canonical;
}

function validateInput(input: unknown):
  | { ok: true; value: ResolverInput }
  | { ok: false; code: BlockCode; message: string } {
  if (!isRecord(input) || !isRecord(input.handoff) || !nonEmptyString(input.modelRole)) {
    return { ok: false, code: "invalid_config", message: "Resolver input requires handoff and modelRole" };
  }
  const handoff = input.handoff;
  if (
    !nonEmptyString(handoff.objective) ||
    !nonEmptyString(handoff.primarySkill) ||
    !Array.isArray(handoff.companionSkills) ||
    !handoff.companionSkills.every(nonEmptyString) ||
    !Array.isArray(handoff.context)
  ) {
    return { ok: false, code: "invalid_config", message: "Handoff has invalid required fields" };
  }
  const context: ContextItem[] = [];
  for (const value of handoff.context) {
    const item = validateContext(value);
    if (!item.ok) {
      return { ok: false, code: "invalid_config", message: "Every context item needs one value and a purpose" };
    }
    context.push(item.value);
  }
  if (!optionalStringArray(handoff.constraints) || !optionalStringArray(handoff.deliverables)) {
    return { ok: false, code: "invalid_config", message: "constraints and deliverables must be string arrays" };
  }
  return {
    ok: true,
    value: {
      modelRole: input.modelRole,
      handoff: {
        objective: handoff.objective,
        primarySkill: handoff.primarySkill,
        companionSkills: [...handoff.companionSkills],
        context,
        ...(handoff.constraints ? { constraints: [...handoff.constraints] } : {}),
        ...(handoff.deliverables ? { deliverables: [...handoff.deliverables] } : {}),
      },
    },
  };
}


function validateContext(value: unknown):
  | { ok: true; value: ContextItem }
  | { ok: false } {
  if (!isRecord(value) || !nonEmptyString(value.purpose)) return { ok: false };
  const hasRef = nonEmptyString(value.ref);
  const hasInline = nonEmptyString(value.inline);
  if (hasRef === hasInline) return { ok: false };
  return hasRef
    ? { ok: true, value: { ref: value.ref, purpose: value.purpose } }
    : { ok: true, value: { inline: value.inline, purpose: value.purpose } };
}

function optionalStringArray(value: unknown): value is undefined | string[] {
  return value === undefined || (Array.isArray(value) && value.every(nonEmptyString));
}

function isHandlerStatus(value: unknown): value is HandlerStatus {
  return value === "completed" || value === "partial" || value === "blocked" || value === "failed";
}

function isArtifacts(value: unknown): value is ResultArtifact[] {
  return Array.isArray(value) && value.every(
    (item) => isRecord(item) && nonEmptyString(item.ref) && nonEmptyString(item.purpose),
  );
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function blocked(code: BlockCode, message: string): BlockedResolution {
  return { status: "blocked", code, message };
}

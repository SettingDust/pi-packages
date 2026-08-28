import { access, constants } from "node:fs/promises";
import {
  buildPlannedSubject,
  canonicalPath,
  canonicalJson,
  type AuthoritySelectors,
  type PlannedSubject,
} from "./admission.js";


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
  unavailableCode?: "unavailable_model" | "invalid_thinking";
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

export interface AtomicAdmission {
  path: "atomic";
  basis: string[];
  verification: string[];
}

export interface PlannedAdmission {
  path: "planned";
  authority: AuthoritySelectors;
}

export type AdmissionInput = AtomicAdmission | PlannedAdmission;

export interface ResolverInput {
  handoff: Handoff;
  modelRole: string;
  admission: AdmissionInput;
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
  | "invalid_thinking"
  | "invalid_admission"
  | "invalid_atomic_basis"
  | "missing_authority"
  | "authority_drift";


export interface BlockedResolution {
  status: "blocked";
  code: BlockCode;
  message: string;
}

export interface ResolvedInvocation {
  status: "resolved";
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
  subjectBuilder?: typeof buildPlannedSubject;
}

export async function resolveDelegation(
  input: unknown,
  options: ResolveOptions,
): Promise<Resolution> {
  const parsed = validateInput(input);
  if (!parsed.ok) return blocked(parsed.code, parsed.message);

  const skillNames = new Set(options.skills.map(({ name }) => name));
  const { handoff, modelRole, admission } = parsed.value;
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
  if (!role.available) return blocked(role.unavailableCode ?? "unavailable_model", `Model Role is unavailable: ${modelRole}`);
  if (!nonEmptyString(role.model)) return blocked("unavailable_model", `Model Role has no model: ${modelRole}`);
  if (!nonEmptyString(role.thinking)) return blocked("invalid_thinking", `Model Role has no thinking level: ${modelRole}`);

  const normalizedContext: ContextItem[] = [];
  for (const item of handoff.context) {
    if ("ref" in item) {
      try {
        normalizedContext.push({ ref: await readablePath(options.cwd, item.ref), purpose: item.purpose });
      } catch {
        return blocked("invalid_reference", `Reference is missing or unreadable: ${item.ref}`);
      }
    } else {
      normalizedContext.push(item);
    }
  }

  const normalizedHandoff: Handoff & Required<Pick<Handoff, "constraints" | "deliverables">> = {
    objective: handoff.objective,
    primarySkill: handoff.primarySkill,
    companionSkills: [...handoff.companionSkills],
    context: normalizedContext,
    constraints: handoff.constraints ? [...handoff.constraints] : [],
    deliverables: handoff.deliverables ? [...handoff.deliverables] : [],
  };
  const admissionResult = validateAdmission(admission);
  if (!admissionResult.ok) return blocked(admissionResult.code, admissionResult.message);
  const validatedAdmission = admissionResult.value;

  if (validatedAdmission.path === "atomic") return resolved(normalizedHandoff, role);

  const subjectBuilder = options.subjectBuilder ?? buildPlannedSubject;

  let authorityPaths: AuthoritySelectors;
  try {
    authorityPaths = {
      work: await canonicalPath(options.cwd, validatedAdmission.authority.work),
      plan: await canonicalPath(options.cwd, validatedAdmission.authority.plan),
      tasks: await canonicalPath(options.cwd, validatedAdmission.authority.tasks),
    };
  } catch {
    return blocked("missing_authority", "Planned authority selectors must resolve to readable Handoff context references");
  }
  const selected = [authorityPaths.work, authorityPaths.plan, authorityPaths.tasks];
  const counts = selected.map((path) => normalizedContext.filter((item) => "ref" in item && item.ref === path).length);
  if (new Set(selected).size !== 3 || counts.some((count) => count !== 1)) {
    return blocked("missing_authority", "Planned authority must select three distinct paths occurring exactly once in Handoff context");
  }

  const subjectInput = {
    objective: normalizedHandoff.objective,
    primarySkill: normalizedHandoff.primarySkill,
    companionSkills: normalizedHandoff.companionSkills,
    context: normalizedHandoff.context as Array<{ ref: string; purpose: string } | { inline: string; purpose: string }>,
    constraints: normalizedHandoff.constraints,
    deliverables: normalizedHandoff.deliverables,
  };
  let subject: PlannedSubject;
  try {
    subject = await subjectBuilder(options.cwd, authorityPaths, subjectInput);
    canonicalJson(subject);
  } catch (error) {
    return blocked("invalid_admission", `Planned admission is not canonicalizable: ${errorMessage(error)}`);
  }

  const invocation = resolved(normalizedHandoff, role);
  try {
    const current = await subjectBuilder(options.cwd, authorityPaths, subjectInput);
    if (canonicalJson(current) !== canonicalJson(subject)) {
      return blocked("authority_drift", "The planned authority or normalized Handoff changed during admission");
    }
  } catch (error) {
    return blocked("authority_drift", `The planned subject could not be revalidated: ${errorMessage(error)}`);
  }
  return invocation;
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

function validateInput(input: unknown):
  | { ok: true; value: Omit<ResolverInput, "admission"> & { admission: unknown } }
  | { ok: false; code: BlockCode; message: string } {
  if (!isRecord(input)) {
    return { ok: false, code: "invalid_config", message: "Resolver input requires handoff, admission, and modelRole" };
  }
  const inputWithoutAdmission = { ...input };
  delete inputWithoutAdmission.admission;
  if (hasForbiddenAdmissionField(inputWithoutAdmission)) {
    return { ok: false, code: "invalid_config", message: "Resolver input must not contain capability-shaped fields" };
  }
  if (!hasOnlyKeys(input, ["handoff", "admission", "modelRole"])) {
    return { ok: false, code: "invalid_config", message: "Resolver input has unsupported fields" };
  }
  if (!isRecord(input.handoff) || !nonEmptyString(input.modelRole)) {
    return { ok: false, code: "invalid_config", message: "Resolver input requires handoff, admission, and modelRole" };
  }
  const handoff = input.handoff;
  if (!hasOnlyKeys(handoff, ["objective", "primarySkill", "companionSkills", "context", "constraints", "deliverables"])) {
    return { ok: false, code: "invalid_config", message: "Handoff has unsupported fields" };
  }
  const companionSkills = handoff.companionSkills === undefined ? [] : handoff.companionSkills;
  if (
    !nonEmptyString(handoff.objective) ||
    !nonEmptyString(handoff.primarySkill) ||
    !Array.isArray(companionSkills) ||
    !companionSkills.every(nonEmptyString) ||
    !Array.isArray(handoff.context)
  ) {
    return { ok: false, code: "invalid_config", message: "Handoff has invalid required fields" };
  }
  const context: ContextItem[] = [];
  for (const value of handoff.context) {
    const item = validateContext(value);
    if (!item.ok) return { ok: false, code: "invalid_config", message: "Every context item needs one value and a purpose" };
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
        companionSkills: [...companionSkills],
        context,
        constraints: handoff.constraints ? [...handoff.constraints] : [],
        deliverables: handoff.deliverables ? [...handoff.deliverables] : [],
      },
      admission: input.admission,
    },
  };
}

function validateAdmission(value: unknown):
  | { ok: true; value: AdmissionInput }
  | { ok: false; code: BlockCode; message: string } {
  if (!isRecord(value)) return { ok: false, code: "invalid_admission", message: "Admission is required and must be an object" };
  if (hasForbiddenAdmissionField(value)) return { ok: false, code: "invalid_admission", message: "Admission must not contain receipt, digest, reviewer, or workflow fields" };
  if (value.path === "atomic") {
    if (!exactKeys(value, ["path", "basis", "verification"])) return { ok: false, code: "invalid_admission", message: "Atomic admission has unsupported fields" };
    if (!stringArray(value.basis) || !stringArray(value.verification) || value.basis.length === 0 || value.verification.length === 0) {
      return { ok: false, code: "invalid_atomic_basis", message: "Atomic admission requires bounded basis and focused verification" };
    }
    return { ok: true, value: { path: "atomic", basis: [...value.basis], verification: [...value.verification] } };
  }
  if (value.path === "planned") {
    if (!exactKeys(value, ["path", "authority"]) || !isRecord(value.authority) || hasForbiddenAdmissionField(value.authority) || !exactKeys(value.authority, ["work", "plan", "tasks"]) || ![value.authority.work, value.authority.plan, value.authority.tasks].every(nonEmptyString)) {
      return { ok: false, code: "invalid_admission", message: "Planned admission must contain only work, plan, and tasks path selectors" };
    }
    return { ok: true, value: { path: "planned", authority: { work: value.authority.work, plan: value.authority.plan, tasks: value.authority.tasks } } };
  }
  return { ok: false, code: "invalid_admission", message: "Admission path must be atomic or planned" };
}

function hasForbiddenAdmissionField(value: Record<string, unknown>): boolean {
  const forbidden = /^(?:reviewed|review|acceptance|amendment|reviewer|outcome|reviewedAt|acceptedAt|sessionId|issuer|receipt|receiptId|receiptHandle|handle|digest|sha256|setSha256|handoffSha256|subjectSha256|planAuthorizationSha256|a3AuthoritySha256|a3DecisionSha256)$/i;
  return Object.entries(value).some(([key, item]) => forbidden.test(key) || (isRecord(item) && hasForbiddenAdmissionField(item)) || (Array.isArray(item) && item.some((entry) => isRecord(entry) && hasForbiddenAdmissionField(entry))));
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function resolved(handoff: Handoff, role: ModelRole): ResolvedInvocation {
  return { status: "resolved", prompt: Bun.YAML.stringify(handoff), model: role.model, thinking: role.thinking };
}

async function readablePath(cwd: string, ref: string): Promise<string> {
  const path = await canonicalPath(cwd, ref);
  await access(path, constants.R_OK);
  return path;
}

function validateContext(value: unknown): { ok: true; value: ContextItem } | { ok: false } {
  if (!isRecord(value) || !nonEmptyString(value.purpose)) return { ok: false };
  const hasRef = nonEmptyString(value.ref);
  const hasInline = nonEmptyString(value.inline);
  if (hasRef === hasInline) return { ok: false };
  if (hasRef && !exactKeys(value, ["ref", "purpose"])) return { ok: false };
  if (hasInline && !exactKeys(value, ["inline", "purpose"])) return { ok: false };
  return hasRef ? { ok: true, value: { ref: value.ref, purpose: value.purpose } } : { ok: true, value: { inline: value.inline, purpose: value.purpose } };
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonEmptyString);
}

function optionalStringArray(value: unknown): value is undefined | string[] {
  return value === undefined || stringArray(value);
}

function isHandlerStatus(value: unknown): value is HandlerStatus {
  return value === "completed" || value === "partial" || value === "blocked" || value === "failed";
}

function isArtifacts(value: unknown): value is ResultArtifact[] {
  return Array.isArray(value) && value.every((item) => isRecord(item) && nonEmptyString(item.ref) && nonEmptyString(item.purpose));
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown admission validation error";
}

function blocked(code: BlockCode, message: string): BlockedResolution {
  return { status: "blocked", code, message };
}

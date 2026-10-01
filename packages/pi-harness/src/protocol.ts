import { access, constants } from "node:fs/promises";
import type { ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import {
  buildPlannedSubject,
  canonicalPath,
  canonicalJson,
  type AuthoritySelectors,
  type PlannedSubject,
} from "./admission.js";
import { supportedThinkingLevels, type ModelLike } from "./config.js";
import type { CandidateEntry } from "./settings-store.js";



export type ThinkingLevel = string;

export interface SkillSummary {
  name: string;
  description: string;
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
  admission: AdmissionInput;
  reasoning: number;
  impact: number;
}

interface CapabilitySchema {
  type: "integer";
  minimum: 0;
  description: string;
}

export interface ResolverSchema {
  primarySkill: { enum: string[]; descriptions: Record<string, string> };
  companionSkills: { enum: string[]; descriptions: Record<string, string> };
  reasoning: CapabilitySchema;
  impact: CapabilitySchema;
}

export type BlockCode =
  | "invalid_configuration"
  | "legacy_configuration"
  | "invalid_capability_request"
  | "invalid_skill"
  | "invalid_reference"
  | "unavailable_candidate"
  | "no_qualified_candidate"
  | "invalid_admission"
  | "invalid_atomic_basis"
  | "missing_authority"
  | "authority_drift"
  | "invalid_delegate"
  | "unavailable_delegate";



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

export function buildResolverSchema(skills: SkillSummary[]): ResolverSchema {
  const descriptions = Object.fromEntries(skills.map(({ name, description }) => [name, description]));
  const skillEnum = Object.keys(descriptions);
  const capability = (name: string): CapabilitySchema => ({
    type: "integer",
    minimum: 0,
    description: `Minimum ${name} capability required for this delegation (0-3 is Router guidance).`,
  });
  return {
    primarySkill: { enum: skillEnum, descriptions },
    companionSkills: { enum: skillEnum, descriptions },
    reasoning: capability("reasoning"),
    impact: capability("impact"),
  };
}

export type RegistryModel = ModelLike;

export interface ModelRegistry {
  getAvailable(): RegistryModel[];
}

export interface ResolveOptions {
  skills: SkillSummary[];
  candidates: CandidateEntry[];
  modelRegistry: ModelRegistry;
  cwd: string;
  subjectBuilder?: typeof buildPlannedSubject;
}


export type DelegationResponse =
  | { resolution: BlockedResolution; launch?: never }
  | { resolution: ResolvedInvocation; launch: { tool: string } & (
      | { rawReturn: unknown; rawError?: never }
      | { rawError: unknown; rawReturn?: never }
    ) };

export async function dispatchDelegation(
  input: unknown,
  options: ResolveOptions & Pick<ExtensionToolContext, "tools" | "executeTool">,
): Promise<DelegationResponse> {
  if (!isRecord(input) || !hasOnlyKeys(input, ["handoff", "admission", "reasoning", "impact", "delegate"])) {
    return { resolution: blocked("invalid_configuration", "Resolver input has invalid or unsupported fields") };
  }
  const { delegate, ...request } = input;
  if (!isRecord(delegate) || !exactKeys(delegate, ["name", "params"]) || !nonEmptyString(delegate.name)
    || !isRecord(delegate.params) || ![Object.prototype, null].includes(Object.getPrototypeOf(delegate.params))) {
    return { resolution: blocked("invalid_delegate", "delegate requires only a registered name and plain params object") };
  }
  if (["agent", "prompt", "model", "thinking"].some((key) => Object.hasOwn(delegate.params, key))) {
    return { resolution: blocked("invalid_delegate", "delegate.params must not supply protected agent, prompt, model, or thinking bindings") };
  }
  const tool = delegate.name;
  const params = { ...delegate.params };
  if (!options.tools.some(({ name }) => name === tool)) {
    return { resolution: blocked("unavailable_delegate", `Delegate tool is not registered: ${tool}`) };
  }
  const resolution = await resolveDelegation(request, options);
  if (resolution.status === "blocked") return { resolution };
  try {
    const rawReturn = await options.executeTool(tool, {
      ...params, agent: "handler", prompt: resolution.prompt, model: resolution.model, thinking: resolution.thinking,
    });
    return { resolution, launch: { tool, rawReturn } };
  } catch (rawError) {
    return { resolution, launch: { tool, rawError } };
  }
}

// Pure resolution: confirmation, explicit migration, and semantic readiness stay Router-owned.
export async function resolveDelegation(input: unknown, options: ResolveOptions): Promise<Resolution> {
  const parsed = validateInput(input);
  if (!parsed.ok) return blocked(parsed.code, parsed.message);
  const candidateShape = validateCandidateShape(options.candidates);
  if (!candidateShape.ok) return blocked(candidateShape.code, candidateShape.message);
  const skillNames = new Set(options.skills.map(({ name }) => name));
  const { handoff, admission } = parsed.value;
  if (!skillNames.has(handoff.primarySkill)) return blocked("invalid_skill", `Unknown primary Skill: ${handoff.primarySkill}`);
  if (new Set(handoff.companionSkills).size !== handoff.companionSkills.length) return blocked("invalid_skill", "companionSkills must not contain duplicates");
  if (handoff.companionSkills.includes(handoff.primarySkill)) return blocked("invalid_skill", "primarySkill must not also be a companion Skill");
  if (handoff.companionSkills.some((name) => !skillNames.has(name))) return blocked("invalid_skill", "Every companion Skill must be discovered by Pi");
  const normalizedContext: ContextItem[] = [];
  for (const item of handoff.context) {
    if ("ref" in item) {
      try { normalizedContext.push({ ref: await readablePath(options.cwd, item.ref), purpose: item.purpose }); }
      catch { return blocked("invalid_reference", `Reference is missing or unreadable: ${item.ref}`); }
    } else normalizedContext.push(item);
  }
  const normalizedHandoff: Handoff & Required<Pick<Handoff, "constraints" | "deliverables">> = {
    objective: handoff.objective, primarySkill: handoff.primarySkill, companionSkills: [...handoff.companionSkills],
    context: normalizedContext, constraints: handoff.constraints ? [...handoff.constraints] : [], deliverables: handoff.deliverables ? [...handoff.deliverables] : [],
  };
  const admissionResult = validateAdmission(admission);
  if (!admissionResult.ok) return blocked(admissionResult.code, admissionResult.message);
  if (parsed.value.legacy) return blocked("legacy_configuration", "Legacy roles/modelRole configuration requires manual settings replacement");
  const requestResult = validateCapabilities(parsed.value.reasoning, parsed.value.impact, "request");
  if (!requestResult.ok) return blocked(requestResult.code, requestResult.message);
  const candidateResult = validateCandidateCapabilities(candidateShape.candidates);
  if (!candidateResult.ok) return blocked(candidateResult.code, candidateResult.message);
  if (admissionResult.value.path === "atomic") return selectCandidate(normalizedHandoff, requestResult, candidateResult.candidates, options.modelRegistry);
  const subjectBuilder = options.subjectBuilder ?? buildPlannedSubject;
  let authorityPaths: AuthoritySelectors;
  try {
    authorityPaths = { work: await canonicalPath(options.cwd, admissionResult.value.authority.work), plan: await canonicalPath(options.cwd, admissionResult.value.authority.plan), waves: await canonicalPath(options.cwd, admissionResult.value.authority.waves) };
  } catch { return blocked("missing_authority", "Planned authority selectors must resolve to readable Handoff context references"); }
  const selected = [authorityPaths.work, authorityPaths.plan, authorityPaths.waves];
  const counts = selected.map((path) => normalizedContext.filter((item) => "ref" in item && item.ref === path).length);
  if (new Set(selected).size !== 3 || counts.some((count) => count !== 1)) return blocked("missing_authority", "Planned authority must select three distinct paths occurring exactly once in Handoff context");
  const subjectInput = { objective: normalizedHandoff.objective, primarySkill: normalizedHandoff.primarySkill, companionSkills: normalizedHandoff.companionSkills, context: normalizedHandoff.context as Array<{ ref: string; purpose: string } | { inline: string; purpose: string }>, constraints: normalizedHandoff.constraints, deliverables: normalizedHandoff.deliverables };
  let subject: PlannedSubject;
  try { subject = await subjectBuilder(options.cwd, authorityPaths, subjectInput); canonicalJson(subject); }
  catch (error) { return blocked("invalid_admission", `Planned admission is not canonicalizable: ${errorMessage(error)}`); }
  try {
    const current = await subjectBuilder(options.cwd, authorityPaths, subjectInput);
    if (canonicalJson(current) !== canonicalJson(subject)) return blocked("authority_drift", "The planned authority or normalized Handoff changed during admission");
  } catch (error) { return blocked("authority_drift", `The planned subject could not be revalidated: ${errorMessage(error)}`); }
  return selectCandidate(normalizedHandoff, requestResult, candidateResult.candidates, options.modelRegistry);
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
  | { ok: true; value: { handoff: Handoff; admission: unknown; reasoning: unknown; impact: unknown; legacy: boolean } }
  | { ok: false; code: BlockCode; message: string } {
  if (!isRecord(input)) return { ok: false, code: "invalid_configuration", message: "Resolver input requires handoff, admission, reasoning, and impact" };
  const legacy = Object.hasOwn(input, "roles") || Object.hasOwn(input, "modelRole");
  if (!hasOnlyKeys(input, ["handoff", "admission", "reasoning", "impact", ...(legacy ? ["roles", "modelRole"] : [])])) return { ok: false, code: "invalid_configuration", message: "Resolver input has unsupported fields" };
  if (!isRecord(input.handoff)) return { ok: false, code: "invalid_configuration", message: "Resolver input requires a Handoff object" };
  const handoff = input.handoff;
  if (!hasOnlyKeys(handoff, ["objective", "primarySkill", "companionSkills", "context", "constraints", "deliverables"])) return { ok: false, code: "invalid_configuration", message: "Handoff has unsupported selection or capability fields" };
  const companionSkills = handoff.companionSkills === undefined ? [] : handoff.companionSkills;
  if (!nonEmptyString(handoff.objective) || !nonEmptyString(handoff.primarySkill) || !Array.isArray(companionSkills) || !companionSkills.every(nonEmptyString) || !Array.isArray(handoff.context)) return { ok: false, code: "invalid_configuration", message: "Handoff has invalid required fields" };
  const context: ContextItem[] = [];
  for (const value of handoff.context) {
    const item = validateContext(value);
    if (!item.ok) return { ok: false, code: "invalid_configuration", message: "Every context item needs one value and a purpose" };
    context.push(item.value);
  }
  if (!optionalStringArray(handoff.constraints) || !optionalStringArray(handoff.deliverables)) return { ok: false, code: "invalid_configuration", message: "constraints and deliverables must be string arrays" };
  return { ok: true, value: { handoff: { objective: handoff.objective, primarySkill: handoff.primarySkill, companionSkills: [...companionSkills], context, constraints: handoff.constraints ? [...handoff.constraints] : [], deliverables: handoff.deliverables ? [...handoff.deliverables] : [] }, admission: input.admission, reasoning: input.reasoning, impact: input.impact, legacy } };
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
    if (!exactKeys(value, ["path", "authority"]) || !isRecord(value.authority) || hasForbiddenAdmissionField(value.authority) || !exactKeys(value.authority, ["work", "plan", "waves"]) || ![value.authority.work, value.authority.plan, value.authority.waves].every(nonEmptyString)) {
      return { ok: false, code: "invalid_admission", message: "Planned admission must contain only work, plan, and waves path selectors" };
    }
    return { ok: true, value: { path: "planned", authority: { work: value.authority.work, plan: value.authority.plan, waves: value.authority.waves } } };
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

function resolved(handoff: Handoff, candidate: CandidateEntry): ResolvedInvocation {
  return { status: "resolved", prompt: Bun.YAML.stringify(handoff), model: `${candidate.provider}/${candidate.modelId}`, thinking: candidate.thinking };
}

function validateCapabilities(reasoning: unknown, impact: unknown, kind: "request" | "candidate"):
  | { ok: true; reasoning: number; impact: number }
  | { ok: false; code: BlockCode; message: string } {
  for (const [name, value] of [["reasoning", reasoning], ["impact", impact]] as const) {
    if (typeof value !== "number" || !Number.isFinite(value)) return { ok: false, code: kind === "request" ? "invalid_capability_request" : "invalid_configuration", message: `${kind} ${name} must be a finite non-negative integer; manual settings replacement is required` };
    if (!Number.isInteger(value)) return { ok: false, code: kind === "request" ? "invalid_capability_request" : "invalid_configuration", message: `${kind} ${name} must be an integer; manual settings replacement is required` };
    if (value < 0) return { ok: false, code: kind === "request" ? "invalid_capability_request" : "invalid_configuration", message: `${kind} ${name} must be non-negative; manual settings replacement is required` };
  }
  return { ok: true, reasoning: reasoning as number, impact: impact as number };
}

function validateCandidateShape(value: unknown): { ok: true; candidates: CandidateEntry[] } | { ok: false; code: BlockCode; message: string } {
  if (!Array.isArray(value)) return { ok: false, code: "invalid_configuration", message: "Candidates must be an array; manual settings replacement is required" };
  const seen = new Set<string>();
  for (const candidate of value) {
    if (!isRecord(candidate) || !exactKeys(candidate, ["provider", "modelId", "thinking", "reasoning", "impact"]) || !nonEmptyExact(candidate.provider) || !nonEmptyExact(candidate.modelId) || !nonEmptyExact(candidate.thinking) || hasControl(candidate.provider) || hasControl(candidate.modelId) || hasControl(candidate.thinking) || candidate.provider.includes("/")) return { ok: false, code: "invalid_configuration", message: "Candidate identity is malformed; manual settings replacement is required" };
    const identity = JSON.stringify([candidate.provider, candidate.modelId, candidate.thinking]);
    if (seen.has(identity)) return { ok: false, code: "invalid_configuration", message: "Duplicate candidate identity; manual settings replacement is required" };
    seen.add(identity);
  }
  return { ok: true, candidates: value as CandidateEntry[] };
}

function validateCandidateCapabilities(candidates: CandidateEntry[]): { ok: true; candidates: CandidateEntry[] } | { ok: false; code: BlockCode; message: string } {
  for (const candidate of candidates) {
    const capabilities = validateCapabilities(candidate.reasoning, candidate.impact, "candidate");
    if (!capabilities.ok) return capabilities;
  }
  return { ok: true, candidates };
}

function selectCandidate(handoff: Handoff, request: { reasoning: number; impact: number }, candidates: CandidateEntry[], modelRegistry: ModelRegistry): Resolution {
  const registry = modelRegistry.getAvailable();
  const unavailable = candidates.find((candidate) => !registry.some((model) => model.provider === candidate.provider && model.id === candidate.modelId && supportedThinkingLevels(model).includes(candidate.thinking)));
  if (unavailable) return blocked("unavailable_candidate", "A configured candidate is unavailable; manual settings replacement is required");
  const qualified = candidates.filter((candidate) => candidate.reasoning >= request.reasoning && candidate.impact >= request.impact);
  if (qualified.length === 0) return blocked("no_qualified_candidate", "No available candidate meets both capability requests; manual settings replacement is required");
  qualified.sort((a, b) => a.impact - b.impact || a.reasoning - b.reasoning || lexicalIdentity(a, b));
  return resolved(handoff, qualified[0]!);
}

function lexicalIdentity(a: CandidateEntry, b: CandidateEntry): number {
  const left = JSON.stringify([a.provider, a.modelId, a.thinking]);
  const right = JSON.stringify([b.provider, b.modelId, b.thinking]);
  return left < right ? -1 : left > right ? 1 : 0;
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
function nonEmptyExact(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function hasControl(value: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(value);
}

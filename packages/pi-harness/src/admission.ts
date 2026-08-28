import { createHash } from "node:crypto";
import { access, constants, realpath, readFile } from "node:fs/promises";
import { resolve, win32 } from "node:path";

export interface AuthoritySelectors {
  work: string;
  plan: string;
  tasks: string;
}

export interface DocumentIdentity {
  path: string;
  sha256: string;
}

export interface PlannedSubject {
  authorityPathTuple: string;
  work: DocumentIdentity;
  plan: DocumentIdentity;
  tasks: DocumentIdentity;
  setSha256: string;
  handoffSha256: string;
  subjectSha256: string;
}

const token = "[a-z0-9]+(?:-[a-z0-9]+)*";
const workNamePattern = new RegExp(`^${token}$`);
const memberPattern = new RegExp(`^(?:(?:${token})--)?(plan|tasks)(?:-(${token}))?\\.md$`);

export async function canonicalPath(cwd: string, ref: string): Promise<string> {
  if (typeof ref !== "string" || ref.trim().length === 0) throw new Error("empty reference");
  const path = (await realpath(resolveReference(cwd, ref))).replaceAll("\\", "/");
  await access(path, constants.R_OK);
  return /^[A-Z]:/.test(path) ? `${path[0]!.toLowerCase()}${path.slice(1)}` : path;
}

function resolveReference(cwd: string, ref: string): string {
  return win32.isAbsolute(ref) ? win32.normalize(ref) : resolve(cwd, ref);
}

export async function buildPlannedSubject(
  cwd: string,
  authority: AuthoritySelectors,
  handoff: {
    objective: string;
    primarySkill: string;
    companionSkills: string[];
    context: Array<{ ref: string; purpose: string } | { inline: string; purpose: string }>;
    constraints: string[];
    deliverables: string[];
  },
): Promise<PlannedSubject> {
  const paths = {
    work: await canonicalPath(cwd, authority.work),
    plan: await canonicalPath(cwd, authority.plan),
    tasks: await canonicalPath(cwd, authority.tasks),
  };
  validateTuple(paths);

  const identities = {
    work: { path: paths.work, sha256: await documentSha256(paths.work) },
    plan: { path: paths.plan, sha256: await documentSha256(paths.plan) },
    tasks: { path: paths.tasks, sha256: await documentSha256(paths.tasks) },
  } satisfies Record<keyof AuthoritySelectors, DocumentIdentity>;
  const setSha256 = sha256(canonicalJson([
    { kind: "work", ...identities.work },
    { kind: "plan", ...identities.plan },
    { kind: "tasks", ...identities.tasks },
  ]));
  const normalizedContext: Array<Record<string, string>> = [];
  for (const item of handoff.context) {
    normalizedContext.push("ref" in item
      ? { ref: await canonicalPath(cwd, item.ref), purpose: item.purpose }
      : { inline: item.inline, purpose: item.purpose });
  }
  const handoffSha256 = sha256(canonicalJson({
    objective: handoff.objective,
    primarySkill: handoff.primarySkill,
    companionSkills: handoff.companionSkills,
    context: normalizedContext,
    constraints: handoff.constraints,
    deliverables: handoff.deliverables,
  }));
  return {
    authorityPathTuple: tupleKey(paths),
    ...identities,
    setSha256,
    handoffSha256,
    subjectSha256: sha256(canonicalJson({ version: 1, setSha256, handoffSha256 })),
  };
}

export function validateTuple(paths: AuthoritySelectors): void {
  if (new Set([paths.work, paths.plan, paths.tasks]).size !== 3) throw new Error("authority paths must be distinct");
  const workMatch = paths.work.match(new RegExp(`^(.+)/docs/works/(${token})/work\\.md$`));
  if (!workMatch || !workNamePattern.test(workMatch[2]!)) throw new Error("work must be a direct docs/works member");
  const directory = paths.work.slice(0, paths.work.lastIndexOf("/"));
  const plan = memberPattern.exec(paths.plan.slice(paths.plan.lastIndexOf("/") + 1));
  const tasks = memberPattern.exec(paths.tasks.slice(paths.tasks.lastIndexOf("/") + 1));
  if (!plan || !tasks || plan[1] !== "plan" || tasks[1] !== "tasks") throw new Error("plan/tasks must match the direct-member grammar");
  if (paths.plan.slice(0, paths.plan.lastIndexOf("/")) !== directory || paths.tasks.slice(0, paths.tasks.lastIndexOf("/")) !== directory) throw new Error("authority members must share one directory");
  if (plan[2] !== tasks[2]) throw new Error("plan/tasks slices must match");
}

export function tupleKey(paths: AuthoritySelectors): string {
  return `${paths.work}\u0000${paths.plan}\u0000${paths.tasks}`;
}

export function canonicalJson(value: unknown): string {
  if (typeof value === "string") return quoteJsonString(value);
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonical JSON does not support non-finite numbers");
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${quoteJsonString(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  throw new Error("canonical JSON does not support this value");
}

export interface CanonicalDocumentSnapshot {
  text: string;
  sha256: string;
}

export async function canonicalDocumentSnapshot(path: string): Promise<CanonicalDocumentSnapshot> {
  const bytes = await canonicalDocumentBytes(path);
  return {
    text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes),
    sha256: sha256(bytes),
  };
}

export async function canonicalDocumentSha256(path: string): Promise<string> {
  return (await canonicalDocumentSnapshot(path)).sha256;
}

export async function canonicalDocumentText(path: string): Promise<string> {
  return (await canonicalDocumentSnapshot(path)).text;
}

async function documentSha256(path: string): Promise<string> {
  return canonicalDocumentSha256(path);
}

async function canonicalDocumentBytes(path: string): Promise<Uint8Array> {
  const bytes = await readFile(path);
  const canonical = new Uint8Array(bytes.length);
  let length = 0;
  for (let index = 0; index < bytes.length; index++) {
    if (bytes[index] === 0x0d) {
      if (bytes[index + 1] === 0x0a) index++;
      canonical[length++] = 0x0a;
    } else canonical[length++] = bytes[index]!;
  }
  const documentBytes = canonical.subarray(0, length);
  new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(documentBytes);
  return documentBytes;
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function quoteJsonString(value: string): string {
  let output = '"';
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) throw new Error("canonical JSON rejects unpaired surrogate");
      output += value[index] + value[index + 1];
      index++;
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) throw new Error("canonical JSON rejects unpaired surrogate");
    output += code === 0x22 ? '\\"' : code === 0x5c ? "\\\\" : code === 0x08 ? "\\b" : code === 0x09 ? "\\t" : code === 0x0a ? "\\n" : code === 0x0c ? "\\f" : code === 0x0d ? "\\r" : code < 0x20 ? `\\u00${code.toString(16).padStart(2, "0")}` : value[index];
  }
  return `${output}"`;
}

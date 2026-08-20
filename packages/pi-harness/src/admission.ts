import { access, constants, realpath, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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

export interface ReviewReceipt {
  issuer: "user-review-v1";
  reviewer: "current-interactive-user";
  sessionId: string;
  authorityPathTuple: string;
  work: DocumentIdentity;
  plan: DocumentIdentity;
  tasks: DocumentIdentity;
  setSha256: string;
  handoffSha256: string;
  subjectSha256: string;
  outcome: "approved";
  reviewedAt: number;
}

export interface AcceptanceReceipt {
  issuer: "extension-acceptance-v1";
  sessionId: string;
  authorityPathTuple: string;
  subjectSha256: string;
  review: ReviewReceipt;
  predecessor?: AcceptanceReceipt;
  mode: "explicit" | "bounded-amendment";
  acceptedAt: number;
}

export type RegistryLookup =
  | { kind: "none" }
  | { kind: "review"; review: ReviewReceipt }
  | { kind: "accepted"; acceptance: AcceptanceReceipt }
  | { kind: "corrupt"; message: string };

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
  const setValue = [
    { kind: "work", ...identities.work },
    { kind: "plan", ...identities.plan },
    { kind: "tasks", ...identities.tasks },
  ];
  const setSha256 = sha256(canonicalJson(setValue));
  const normalizedContext = [] as Array<Record<string, string>>;
  for (const item of handoff.context) {
    normalizedContext.push("ref" in item
      ? { ref: await canonicalPath(cwd, item.ref), purpose: item.purpose }
      : { inline: item.inline, purpose: item.purpose });
  }
  const normalized = {
    objective: handoff.objective,
    primarySkill: handoff.primarySkill,
    companionSkills: handoff.companionSkills,
    context: normalizedContext,
    constraints: handoff.constraints,
    deliverables: handoff.deliverables,
  };
  const handoffSha256 = sha256(canonicalJson(normalized));
  const subjectSha256 = sha256(canonicalJson({ version: 1, setSha256, handoffSha256 }));
  return {
    authorityPathTuple: tupleKey(paths),
    ...identities,
    setSha256,
    handoffSha256,
    subjectSha256,
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

export class ReceiptRegistry {
  private sessionId: string | undefined;
  private reviews = new Map<string, ReviewReceipt>();
  private acceptances = new Map<string, AcceptanceReceipt>();
  private heads = new Map<string, string>();
  private locks = new Map<string, { gate: Promise<void>; release: () => void; generation: number }>();
  private generation = 0;

  constructor(sessionId?: string) {
    this.sessionId = sessionId;
  }

  bind(sessionId: string): void {
    if (this.sessionId !== sessionId) this.clear();
    this.sessionId = sessionId;
  }

  clear(): void {
    this.reviews.clear();
    this.acceptances.clear();
    this.heads.clear();
    this.generation++;
    this.locks.clear();
  }

  async runExclusive<T>(tuple: string, action: (isCurrent: () => boolean) => Promise<T>): Promise<{ completed: true; value: T } | { completed: false }> {
    const previous = this.locks.get(tuple);
    let release!: () => void;
    const entry = {
      gate: new Promise<void>((resolve) => { release = resolve; }),
      release,
      generation: this.generation,
    };
    this.locks.set(tuple, entry);
    if (previous) await previous.gate;
    try {
      if (entry.generation !== this.generation) return { completed: false };
      return { completed: true, value: await action(() => entry.generation === this.generation) };
    } finally {
      entry.release();
      if (this.locks.get(tuple) === entry) this.locks.delete(tuple);
    }
  }
  lookup(subject: PlannedSubject): RegistryLookup {
    const corruption = this.validateLineage(subject.authorityPathTuple);
    if (corruption) return { kind: "corrupt", message: corruption };
    const acceptance = this.acceptances.get(subject.subjectSha256);
    if (acceptance && this.matchesAcceptance(acceptance, subject)) return { kind: "accepted", acceptance };
    const review = this.reviews.get(subject.subjectSha256);
    if (review && this.matchesReview(review, subject)) return { kind: "review", review };
    return { kind: "none" };
  }

  prior(subject: PlannedSubject): RegistryLookup {
    const corruption = this.validateLineage(subject.authorityPathTuple);
    if (corruption) return { kind: "corrupt", message: corruption };
    const headId = this.heads.get(subject.authorityPathTuple);
    if (!headId) return { kind: "none" };
    const head = this.acceptances.get(headId);
    return head ? { kind: "accepted", acceptance: head } : { kind: "corrupt", message: "acceptance head is missing" };
  }

  recordReview(subject: PlannedSubject): ReviewReceipt {
    const review: ReviewReceipt = {
      issuer: "user-review-v1",
      reviewer: "current-interactive-user",
      sessionId: this.sessionId ?? "",
      authorityPathTuple: subject.authorityPathTuple,
      work: subject.work,
      plan: subject.plan,
      tasks: subject.tasks,
      setSha256: subject.setSha256,
      handoffSha256: subject.handoffSha256,
      subjectSha256: subject.subjectSha256,
      outcome: "approved",
      reviewedAt: Date.now(),
    };
    this.reviews.set(subject.subjectSha256, review);
    return review;
  }

  recordAcceptance(subject: PlannedSubject, review: ReviewReceipt, mode: AcceptanceReceipt["mode"], predecessor?: AcceptanceReceipt): AcceptanceReceipt {
    const acceptance: AcceptanceReceipt = {
      issuer: "extension-acceptance-v1",
      sessionId: this.sessionId ?? "",
      authorityPathTuple: subject.authorityPathTuple,
      subjectSha256: subject.subjectSha256,
      review,
      ...(predecessor ? { predecessor } : {}),
      mode,
      acceptedAt: Date.now(),
    };
    this.acceptances.set(subject.subjectSha256, acceptance);
    this.heads.set(subject.authorityPathTuple, subject.subjectSha256);
    return acceptance;
  }

  private validateLineage(tuple: string): string | undefined {
    const ids = [...this.acceptances.values()].filter((item) => item.authorityPathTuple === tuple);
    if (ids.length === 0) return undefined;
    const headId = this.heads.get(tuple);
    if (!headId || !this.acceptances.has(headId)) return "acceptance lineage has no unique authenticated head";
    const seen = new Set<string>();
    let current: AcceptanceReceipt | undefined = this.acceptances.get(headId);
    while (current) {
      if (seen.has(current.subjectSha256)) return "acceptance lineage is cyclic";
      seen.add(current.subjectSha256);
      if (this.acceptances.get(current.subjectSha256) !== current || current.issuer !== "extension-acceptance-v1" || current.sessionId !== this.sessionId || current.authorityPathTuple !== tuple || !Number.isFinite(current.acceptedAt)) {
        return "acceptance lineage has inconsistent receipt fields";
      }
      if (this.reviews.get(current.subjectSha256) !== current.review || this.validateReview(current.review, current, tuple)) {
        return "acceptance lineage has an inconsistent review link";
      }
      current = current.predecessor;
      if (current && this.acceptances.get(current.subjectSha256) !== current) return "acceptance predecessor is not authenticated";
    }
    if (seen.size !== ids.length) return "acceptance lineage has a non-unique head";
    return undefined;
  }

  private validateReview(review: ReviewReceipt, acceptance: AcceptanceReceipt, tuple: string): boolean {
    try {
      const paths = { work: review.work.path, plan: review.plan.path, tasks: review.tasks.path };
      const setSha256 = sha256(canonicalJson([
        { kind: "work", ...review.work },
        { kind: "plan", ...review.plan },
        { kind: "tasks", ...review.tasks },
      ]));
      const subjectSha256 = sha256(canonicalJson({ version: 1, setSha256, handoffSha256: review.handoffSha256 }));
      return review.issuer !== "user-review-v1" || review.reviewer !== "current-interactive-user" || review.sessionId !== this.sessionId || review.authorityPathTuple !== tuple || tupleKey(paths) !== tuple || review.subjectSha256 !== acceptance.subjectSha256 || review.outcome !== "approved" || !Number.isFinite(review.reviewedAt) || review.setSha256 !== setSha256 || review.subjectSha256 !== subjectSha256;
    } catch {
      return true;
    }
  }

  private matchesReview(review: ReviewReceipt, subject: PlannedSubject): boolean {
    return review.sessionId === this.sessionId && review.authorityPathTuple === subject.authorityPathTuple && review.subjectSha256 === subject.subjectSha256 && sameSubjectParts(review, subject);
  }
  private matchesAcceptance(acceptance: AcceptanceReceipt, subject: PlannedSubject): boolean {
    return acceptance.sessionId === this.sessionId && acceptance.subjectSha256 === subject.subjectSha256 && acceptance.authorityPathTuple === subject.authorityPathTuple && this.matchesReview(acceptance.review, subject);
  }
}

async function documentSha256(path: string): Promise<string> {
  const bytes = await readFile(path);
  const canonical = new Uint8Array(bytes.length);
  let length = 0;
  for (let index = 0; index < bytes.length; index++) {
    if (bytes[index] === 0x0d) {
      if (bytes[index + 1] === 0x0a) index++;
      canonical[length++] = 0x0a;
    } else {
      canonical[length++] = bytes[index]!;
    }
  }
  const documentBytes = canonical.subarray(0, length);
  new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(documentBytes);
  return sha256(documentBytes);
}

function sameSubjectParts(value: { work: DocumentIdentity; plan: DocumentIdentity; tasks: DocumentIdentity; setSha256: string; handoffSha256: string }, subject: PlannedSubject): boolean {
  return value.work.path === subject.work.path && value.work.sha256 === subject.work.sha256 && value.plan.path === subject.plan.path && value.plan.sha256 === subject.plan.sha256 && value.tasks.path === subject.tasks.path && value.tasks.sha256 === subject.tasks.sha256 && value.setSha256 === subject.setSha256 && value.handoffSha256 === subject.handoffSha256;
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
    output += code === 0x22 ? '\\"' : code === 0x5c ? '\\\\' : code === 0x08 ? "\\b" : code === 0x09 ? "\\t" : code === 0x0a ? "\\n" : code === 0x0c ? "\\f" : code === 0x0d ? "\\r" : code < 0x20 ? `\\u00${code.toString(16).padStart(2, "0")}` : value[index];
  }
  return `${output}"`;
}

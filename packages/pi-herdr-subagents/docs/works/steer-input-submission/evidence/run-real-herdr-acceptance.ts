import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import {
  AgentRegistry,
  SubagentRuntime,
  createHerdrTransport,
  createSubagentTools,
} from "../../../../src/index.ts";

type Json = Record<string, unknown>;
type ParsedEntry = { raw: string; value: Json };

const evidencePath = resolve(import.meta.dir, "real-herdr-acceptance.json");
const repo = resolve(import.meta.dir, "../../../../../..");
const handlerPath = resolve(import.meta.dir, "../../../../../pi-harness/agents/handler.md");
const fixtureName = "steer-await-follow-up-v1";
function currentPiEntryPath(): string {
  const local = Bun.which("pi");
  const candidates = Bun.spawnSync(["where.exe", "pi"], { stdout: "pipe" }).stdout.toString("utf8").split(/\r?\n/).filter(Boolean);
  const shim = [local, ...candidates].find((path): path is string => Boolean(path) && path.toLowerCase().endsWith(".cmd"));
  if (!shim) throw new Error("The active Pi command shim is unavailable.");
  const target = [...readFileSync(shim, "utf8").matchAll(/"([^"]+\.cmd)"/gi)].at(-1)?.[1];
  if (!target) throw new Error(`Cannot resolve the Pi launcher from ${shim}.`);
  const launcher = resolve(target);
  const entry = readFileSync(launcher, "utf8").match(/"%~dp0([^"]+\.js)"/i)?.[1];
  if (!entry) throw new Error(`Cannot resolve the Pi entry script from ${launcher}.`);
  const path = resolve(dirname(launcher), entry);
  if (!existsSync(path)) throw new Error(`The active Pi entry script is unavailable: ${path}.`);
  return path;
}


const fixture = [
  "objective: Remain active without calling subagent_done until one subsequent user message arrives. After that message arrives, call subagent_done with a completed YAML Handler Result that states it was received.",
  "primarySkill: implement-change",
  "context:",
  "  - inline: Controlled real Herdr steer acceptance fixture. The later user message is the only completion trigger.",
  "    purpose: acceptance control",
  "constraints:",
  "  - Do not call subagent_done before a subsequent user message arrives.",
  "deliverables:",
  "  - completed Handler Result after the subsequent user message.",
].join("\n");
function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCompleteEntries(path: string): { entries: ParsedEntry[]; bytes: Buffer } | undefined {
  try {
    const bytes = readFileSync(path);
    if (!bytes.length || bytes.at(-1) !== 0x0a) return;
    const lines = bytes.toString("utf8").slice(0, -1).split("\n");
    if (!lines.length || lines.some(line => !line)) return;
    const entries = lines.map(raw => {
      const value: unknown = JSON.parse(raw);
      if (!isObject(value)) throw new Error("JSONL entry is not an object");
      return { raw, value };
    });
    if (entries[0]?.value.type !== "session") return;
    return { entries, bytes };
  } catch {
    return;
  }
}

function parsedAppended(path: string, offset: number): ParsedEntry[] | undefined {
  try {
    const bytes = readFileSync(path);
    if (bytes.length < offset || (bytes.length > offset && bytes.at(-1) !== 0x0a)) return;
    const text = bytes.subarray(offset).toString("utf8");
    if (!text) return [];
    return text.slice(0, -1).split("\n").map(raw => {
      const value: unknown = JSON.parse(raw);
      if (!isObject(value)) throw new Error("JSONL entry is not an object");
      return { raw, value };
    });
  } catch {
    return;
  }
}

function exactUser(entry: Json, message: string): boolean {
  const value = entry.message;
  if (entry.type !== "message" || !isObject(value) || value.role !== "user") return false;
  const content = value.content;
  return Array.isArray(content) && content.length === 1 && isObject(content[0])
    && content[0].type === "text" && content[0].text === message;
}

function uniqueMatchIndex<T>(values: readonly T[], predicate: (value: T) => boolean): number {
  let match = -1;
  for (const [index, value] of values.entries()) {
    if (!predicate(value)) continue;
    if (match !== -1) return -1;
    match = index;
  }
  return match;
}

function allowlistedActivity(entry: Json): boolean {
  if (entry.type === "message") {
    const value = entry.message;
    return isObject(value) && value.role === "assistant";
  }
  return entry.type === "model_change" && typeof entry.provider === "string" && typeof entry.modelId === "string";
}

function commandFor(...parts: string[]): string {
  return parts.map(part => part.includes(" ") ? JSON.stringify(part) : part).join(" ");
}

function verify(recordPath: string): void {
  const record = JSON.parse(readFileSync(recordPath, "utf8")) as Json;
  if (record.reviewDisposition !== "accepted-ready") throw new Error("Evidence replay is not accepted-ready.");
  const selectedAttempt = record.selectedAttempt;
  if (!Number.isInteger(selectedAttempt) || !Array.isArray(record.attempts)) throw new Error("No accepted selected attempt.");
  const attempt = record.attempts[(selectedAttempt as number) - 1];
  if (!isObject(attempt) || !isObject(attempt.ready) || !isObject(attempt.ready.preSteer) || !isObject(attempt.message)) throw new Error("Selected attempt is incomplete.");
  if (!isObject(attempt.outcome) || attempt.outcome.status !== "accepted") throw new Error("Selected attempt was not accepted.");
  if (!isObject(attempt.cleanup) || attempt.cleanup.outcome !== "succeeded") throw new Error("Selected attempt cleanup failed.");
  const jsonString = attempt.message.jsonString;
  const base64 = attempt.message.utf8Base64;
  if (typeof jsonString !== "string" || typeof base64 !== "string") throw new Error("Sentinel encodings are missing.");
  const sentinel: unknown = JSON.parse(jsonString);
  if (typeof sentinel !== "string" || Buffer.from(base64, "base64").toString("utf8") !== sentinel) throw new Error("Sentinel encodings differ.");
  const marker = attempt.ready.preSteer;
  if (!Number.isInteger(marker.entryIndex) || !Number.isInteger(marker.byteOffset) || marker.entryIndex < 0 || marker.byteOffset < 0) throw new Error("Pre-steer marker is invalid.");
  if (!Array.isArray(attempt.appendedJsonlRawEntries) || !Number.isInteger(attempt.userEntryIndex) || !Number.isInteger(attempt.activityEntryIndex)) throw new Error("Appended record indexes are invalid.");
  const appended = attempt.appendedJsonlRawEntries.map(raw => {
    if (typeof raw !== "string") throw new Error("Raw JSONL entry is invalid.");
    const entry: unknown = JSON.parse(raw);
    if (!isObject(entry)) throw new Error("Raw JSONL entry is not an object.");
    return entry;
  });
  const userRelative = uniqueMatchIndex(appended, entry => exactUser(entry, sentinel));
  if (userRelative < 0) throw new Error("Exact steered user entry is absent.");
  const activityRelative = appended.findIndex((entry, index) => index > userRelative && allowlistedActivity(entry));
  const firstAppendedIndex = marker.entryIndex + 1;
  if (attempt.userEntryIndex !== firstAppendedIndex + userRelative || attempt.activityEntryIndex !== firstAppendedIndex + activityRelative) throw new Error("Recorded entry indexes do not replay.");
  if (activityRelative < 0 || !(marker.entryIndex < attempt.userEntryIndex && attempt.userEntryIndex < attempt.activityEntryIndex)) throw new Error("Ordered child-session evidence is absent.");
  console.log(`verified selected attempt ${selectedAttempt}`);
}

function finalize(recordPath: string): void {
  const record = JSON.parse(readFileSync(recordPath, "utf8")) as Json;
  if (!Array.isArray(record.attempts)) throw new Error("Evidence attempts are missing.");
  record.selectedAttempt = null;
  record.reviewDisposition = "needs-revision";
  for (const [index, attempt] of record.attempts.entries()) {
    if (!isObject(attempt) || !isObject(attempt.ready) || attempt.ready.status !== "ready" || !isObject(attempt.ready.preSteer)
      || !isObject(attempt.message) || !isObject(attempt.cleanup) || attempt.cleanup.outcome !== "succeeded"
      || !Array.isArray(attempt.appendedJsonlRawEntries)) continue;
    const marker = attempt.ready.preSteer;
    const jsonString = attempt.message.jsonString;
    const base64 = attempt.message.utf8Base64;
    if (!Number.isInteger(marker.entryIndex) || !Number.isInteger(marker.byteOffset) || marker.entryIndex < 0 || marker.byteOffset < 0
      || typeof jsonString !== "string" || typeof base64 !== "string") continue;
    let sentinel: unknown;
    let appended: Json[];
    try {
      sentinel = JSON.parse(jsonString);
      appended = attempt.appendedJsonlRawEntries.map(raw => {
        if (typeof raw !== "string") throw new Error();
        const entry: unknown = JSON.parse(raw);
        if (!isObject(entry)) throw new Error();
        return entry;
      });
    } catch { continue; }
    if (typeof sentinel !== "string" || Buffer.from(base64, "base64").toString("utf8") !== sentinel) continue;
    const userRelative = uniqueMatchIndex(appended, entry => exactUser(entry, sentinel));
    const activityRelative = appended.findIndex((entry, entryIndex) => entryIndex > userRelative && allowlistedActivity(entry));
    if (userRelative < 0 || activityRelative < 0) continue;
    attempt.userEntryIndex = marker.entryIndex + 1 + userRelative;
    attempt.activityEntryIndex = marker.entryIndex + 1 + activityRelative;
    attempt.outcome = { status: "accepted", observedAt: new Date().toISOString() };
    record.selectedAttempt = index + 1;
    record.reviewDisposition = "accepted-ready";
    writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    verify(recordPath);
    return;
  }
  writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  throw new Error("No recorded attempt satisfies the exact delivery evidence.");
}

async function run(): Promise<void> {
  if (process.argv[2] === "--verify") {
    const recordPath = process.argv[3];
    if (!recordPath) throw new Error("Usage: --verify <evidence-record>");
    verify(recordPath);
    return;
  }
  if (process.argv[2] === "--finalize") {
    const recordPath = process.argv[3];
    if (!recordPath) throw new Error("Usage: --finalize <evidence-record>");
    finalize(recordPath);
    return;
  }

  process.argv[1] = currentPiEntryPath();
  mkdirSync(dirname(evidencePath), { recursive: true });
  const fixtureHash = createHash("sha256").update(fixture, "utf8").digest("hex");
  const scriptPath = relative(repo, import.meta.filename).replaceAll("\\", "/");
  const record: Json = {
    evidenceSchemaVersion: 2,
    reviewDisposition: "needs-revision",
    herdrVersion: Bun.spawnSync(["herdr", "--version"], { stdout: "pipe" }).stdout.toString().trim(),
    selectedAttempt: null,
    attempts: [],
    extractionCommand: commandFor("bun", "run", scriptPath),
    comparisonCommand: commandFor("bun", "run", scriptPath, "--verify", relative(repo, evidencePath).replaceAll("\\", "/")),
  };
  const attempts = record.attempts as Json[];

  for (let number = 1; number <= 3 && record.selectedAttempt === null; number++) {
    const runId = randomUUID();
    const taskSlug = `steer-acceptance-${runId.slice(0, 8)}`;
    const label = `steer-acceptance-${runId}`;
    const registry = new AgentRegistry();
    registry.setFiles([{ path: handlerPath, content: readFileSync(handlerPath, "utf8") }]);
    const runtime = new SubagentRuntime(createHerdrTransport(), registry);
    const tools = createSubagentTools(runtime, repo, resolve(Bun.env.TEMP ?? Bun.env.TMP ?? "C:/Temp", `steer-acceptance-${runId}.jsonl`));
    const spawnTool = tools.find(tool => tool.name === "subagent_spawn")!;
    const inspectTool = tools.find(tool => tool.name === "subagent_inspect")!;
    const steerTool = tools.find(tool => tool.name === "subagent_steer")!;
    const attempt: Json = {
      attempt: number,
      child: { provenance: "fresh_subagent_spawn", agentName: "handler", label },
      promptFixture: { name: fixtureName, actualPrompt: fixture, sha256: fixtureHash, revision: `sha256:${fixtureHash}` },
      ready: { status: "deadline", deadlineAt: new Date(Date.now() + 120_000).toISOString() },
      outcome: { status: "preflight_failed" },
      cleanup: { cancel: "not_required_no_child", remove: "not_required_no_child", outcome: "succeeded" },
    };
    attempts.push(attempt);
    writeFileSync(evidencePath, `${JSON.stringify(record, null, 2)}\n`);
    let task: any;
    let preSteer: { entryIndex: number; byteOffset: number } | undefined;
    let sentinel: string | undefined;
    try {
      const spawned = await (spawnTool.execute as any)(`controlled-spawn-${number}`, { agent: "handler", prompt: fixture, label, taskSlug });
      task = spawned.details;
      attempt.child = {
        provenance: "fresh_subagent_spawn",
        agentName: "handler",
        label,
        subagentId: task.subagentId,
        generation: task.generation,
        sessionPath: task.sessionFile,
      };
      const deadline = Date.parse((attempt.ready as Json).deadlineAt as string);
      let lastState = "unreadable";
      while (Date.now() < deadline) {
        await Bun.sleep(1000);
        const inspection = await (inspectTool.execute as any)(`controlled-inspect-${number}`, { subagentId: task.subagentId });
        const snapshot = inspection.details as Json;
        if (snapshot.status !== "running") {
          attempt.ready = { status: "terminal", deadlineAt: new Date(deadline).toISOString(), observedAt: new Date().toISOString() };
          break;
        }
        if (!existsSync(task.sessionFile)) {
          lastState = "unreadable";
          continue;
        }
        const baseline = readCompleteEntries(task.sessionFile);
        if (!baseline) {
          lastState = "malformed";
          continue;
        }
        const hasAssistant = baseline.entries.some(entry => allowlistedActivity(entry.value));
        if (!hasAssistant) {
          lastState = "unreadable";
          continue;
        }
        preSteer = { entryIndex: baseline.entries.length - 1, byteOffset: baseline.bytes.length };
        attempt.ready = { status: "ready", deadlineAt: new Date(deadline).toISOString(), observedAt: new Date().toISOString(), preSteer };
        break;
      }
      if (!preSteer) {
        if ((attempt.ready as Json).status === "deadline") attempt.ready = { status: lastState, deadlineAt: (attempt.ready as Json).deadlineAt, observedAt: new Date().toISOString() };
        attempt.outcome = { status: "preflight_failed", observedAt: new Date().toISOString() };
      } else {
        sentinel = `STEER-ACCEPTANCE-${runId}\n中文 😀\nquotes: 'single' and "double"`;
        attempt.message = { jsonString: JSON.stringify(sentinel), utf8Base64: Buffer.from(sentinel, "utf8").toString("base64") };
        try {
          await (steerTool.execute as any)(`controlled-steer-${number}`, { subagentId: task.subagentId, message: sentinel });
        } catch (error) {
          attempt.outcome = { status: "steer_rejected", observedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) };
        }
        if ((attempt.outcome as Json).status !== "steer_rejected") {
          const deadline = Date.now() + 120_000;
          let finalEntries: ParsedEntry[] = [];
          while (Date.now() < deadline) {
            await Bun.sleep(1000);
            const appended = parsedAppended(task.sessionFile, preSteer.byteOffset);
            if (!appended) continue;
            finalEntries = appended;
            const userRelative = uniqueMatchIndex(appended, entry => exactUser(entry.value, sentinel!));
            const activityRelative = appended.findIndex((entry, index) => index > userRelative && allowlistedActivity(entry.value));
            if (userRelative >= 0 && activityRelative >= 0) {
              attempt.userEntryIndex = preSteer.entryIndex + 1 + userRelative;
              attempt.activityEntryIndex = preSteer.entryIndex + 1 + activityRelative;
              attempt.appendedJsonlRawEntries = appended.map(entry => entry.raw);
              attempt.outcome = { status: "accepted", observedAt: new Date().toISOString() };
              break;
            }
          }
          if ((attempt.outcome as Json).status !== "accepted") {
            attempt.appendedJsonlRawEntries = finalEntries.map(entry => entry.raw);
            const sawUser = finalEntries.some(entry => entry.value.type === "message" && isObject(entry.value.message) && entry.value.message.role === "user");
            attempt.outcome = { status: sawUser ? "exact_delivery_failed" : "activity_timeout", observedAt: new Date().toISOString() };
          }
        }
      }
    } catch (error) {
      attempt.outcome = { status: "preflight_failed", observedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) };
    } finally {
      writeFileSync(evidencePath, `${JSON.stringify(record, null, 2)}\n`);
      if (task) {
        try {
          if (runtime.inspect(task.subagentId).status === "running") {
            await runtime.cancel(task.subagentId);
            (attempt.cleanup as Json).cancel = "succeeded";
          } else {
            (attempt.cleanup as Json).cancel = "not_required_terminal";
          }
          await runtime.remove(task.subagentId);
          (attempt.cleanup as Json).remove = "succeeded";
          (attempt.cleanup as Json).outcome = "succeeded";
        } catch (error) {
          (attempt.cleanup as Json).outcome = "failed";
          (attempt.cleanup as Json).error = error instanceof Error ? error.message : String(error);
        }
      }
      runtime.stop();
      if ((attempt.outcome as Json).status === "accepted" && (attempt.cleanup as Json).outcome === "succeeded") {
        record.selectedAttempt = number;
        record.reviewDisposition = "accepted-ready";
      }
      writeFileSync(evidencePath, `${JSON.stringify(record, null, 2)}\n`);
    }
  }

  if (record.selectedAttempt !== null) verify(evidencePath);
  else throw new Error("No controlled real Herdr acceptance attempt succeeded.");
}

await run();

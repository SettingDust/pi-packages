import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(import.meta.dir, "../../../../../..");
const evidence = import.meta.dir;
if (!process.env.HERDR_WORKSPACE_ID) throw new Error("HERDR_WORKSPACE_ID must name a separately created isolated Herdr workspace");
const workspaceId = process.env.HERDR_WORKSPACE_ID;
const workspaceOutput = Bun.spawn(["herdr", "workspace", "get", workspaceId], { stdout: "pipe", stderr: "ignore" });
const workspaceInfo = await new Response(workspaceOutput.stdout).json().catch(() => null) as { result?: { workspace?: { workspace_id?: string; label?: string } } } | null;
if (await workspaceOutput.exited !== 0 || workspaceInfo?.result?.workspace?.workspace_id !== workspaceId || workspaceInfo.result.workspace.label !== "pi-t4-live") {
  throw new Error("HERDR_WORKSPACE_ID must identify a separately created pi-t4-live workspace");
}
const trace = "trace.jsonl";
const fixture = mkdtempSync(join(tmpdir(), "pi-t4-live-"));
const tracePath = join(fixture, trace);
const report = join(fixture, "final-report.md");
const output = join(evidence, "live-acceptance-result.json");
const cli = process.env.PI_CLI_ENTRY || (() => {
  const shim = Bun.which("pi");
  if (!shim) throw new Error("pi executable missing");
  let path = shim;
  for (let i = 0; i < 3; i++) {
    const body = readFileSync(path, "utf8");
    const relative = body.match(/bun\s+"%~dp0([^"\r\n]+)"/i)?.[1];
    if (relative) return join(dirname(path), relative.replaceAll("\\", "/"));
    const target = body.match(/@"([^"\r\n]+\.cmd)"/i)?.[1];
    if (!target) break;
    path = target;
  }
  throw new Error("Set PI_CLI_ENTRY to the installed Pi bundle cli.js");
})();
const model = process.env.PI_T4_MODEL || "api2api/gpt-6-astra";
const skill = join(root, "packages/pi-harness/skills/delegation-strategy/SKILL.md");
const args = [cli, "--mode", "rpc", "--no-extensions", "--approve", "--model", model,
  "--session-dir", join(fixture, "sessions"), "--skill", skill,
  "--skill", join(root, "packages/pi-harness/skills/research-quick/SKILL.md"),
  "--skill", join(root, "packages/pi-harness/skills/implement-change/SKILL.md"),
  "-e", join(root, "packages/pi-harness/extensions/pi-harness.ts"),
  "-e", join(root, "packages/pi-herdr-subagents/src/index.ts"),
  "-e", join(evidence, "acceptance-trace.ts")];
const sourceA = join(fixture, "branch-a.txt");
const sourceC = join(fixture, "branch-c.txt");
writeFileSync(sourceA, "Branch A fact: amber.\n");
writeFileSync(sourceC, "Branch C fact: cedar.\n");
const prompt = `Run a bounded, authorized Router acceptance fixture. All work is confined to the two read-only sources and one output path below; no other project edits, installs, commits, or global changes. Two independent facts are ready now. Branch B has an unidentified source and must remain deferred. Name the three Handler objectives "branch A", "branch C", and "final writer" so the trace can attribute actual calls. A and C can be delegated independently; after their full Results, delegate exactly one final writer that writes ${report} using both facts. Do not invent findings or pretend a delegation occurred. Follow the actual delegation-strategy Skill and effective registered tool instructions; if they require ending the turn after the first spawn, obey and record the restriction. If the backend or permissions do not allow dispatch, report the block. Sources: A=${sourceA}; C=${sourceC}. Final writer must use only facts supported by full completed Results. Do not delete fixture inputs. This acceptance authorizes those three bounded Handler outcomes only.`;
const proc = Bun.spawn([process.execPath, ...args], { cwd: root, env: { ...process.env, PI_T4_TRACE: tracePath }, stdin: "pipe", stdout: "pipe", stderr: "pipe" });
proc.stdin.write(JSON.stringify({ id: "acceptance", type: "prompt", message: prompt }) + "\n");
const errors: string[] = [];
const consume = async (stream: ReadableStream<Uint8Array>, parse: boolean) => {
  let pending = "";
  for await (const chunk of stream) {
    if (!parse) continue; // stderr may include private configuration; never persist it.
    pending += new TextDecoder().decode(chunk);
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as { id?: string; type?: string; success?: boolean };
        if (event.id === "acceptance" && event.type === "response" && event.success === false) errors.push("RPC prompt rejected");
      } catch { errors.push("non-JSON RPC output"); }
    }
  }
};
const stdout = consume(proc.stdout, true);
const stderr = consume(proc.stderr, false);
const started = Date.now();
const deadline = 8 * 60_000;
const readEvents = (): Record<string, unknown>[] => existsSync(tracePath)
  ? readFileSync(tracePath, "utf8").split("\n").filter(Boolean).flatMap(line => { try { return [JSON.parse(line) as Record<string, unknown>]; } catch { return []; } }) : [];
let timedOut = false;
const done = () => existsSync(report) && readEvents().filter(e => e.kind === "result" && e.name === "subagent_join" && e.fullResult === true && e.resultStatus === "completed").length >= 3;
while (Date.now() - started < deadline && !done() && proc.exitCode === null && errors.length === 0) {
  await Bun.sleep(1000);
}
if (Date.now() - started >= deadline) timedOut = true;
const earlyStop = !done();
// This RPC process belongs to the fixture; never terminate other Pi sessions.
if (proc.exitCode === null) proc.kill();
const exitCode = await proc.exited;
await Promise.all([stdout, stderr]);
const events = readEvents();
const ownedTabs = events.filter(e => e.kind === "result" && e.name === "subagent_spawn" && typeof e.tabId === "string").map(e => e.tabId as string);
let cleanupFailed = false;
if (earlyStop) for (const tabId of ownedTabs) {
  const close = Bun.spawn(["herdr", "tab", "close", tabId], { stdout: "ignore", stderr: "ignore" });
  if (await close.exited !== 0) cleanupFailed = true;
}
const registrations = events.filter(e => e.kind === "registered");
const calls = events.filter(e => e.kind === "call");
const results = events.filter(e => e.kind === "result");
const notices = events.filter(e => e.kind === "notification");
const at = (name: string, kind = "call") => events.findIndex(e => e.kind === kind && e.name === name);
const read = events.findIndex(e => e.kind === "result" && e.name === "read" && e.strategyBody === true);
const branchResolves = calls.filter(e => e.name === "resolve_delegation");
const spawns = calls.filter(e => e.name === "subagent_spawn");
const joins = results.filter(e => e.name === "subagent_join" && e.fullResult === true && e.resultStatus === "completed");
const spawnDetails = results.filter(e => e.name === "subagent_spawn" && typeof e.subagentId === "string");
const byCall = (call: Record<string, unknown>) => results.find(e => e.id === call.id);
const adjacent = branchResolves.slice(0, 2).every((call, i) => {
  const resolved = byCall(call);
  const next = calls.find(c => events.indexOf(c) > events.indexOf(resolved!));
  return resolved?.status === "resolved" && next === spawns[i] && next?.label === call.branch && next?.exact === true;
});
const branches = branchResolves.map(e => e.branch);
const firstCompletion = results.find(e => e.name === "subagent_join" && e.subagentId === spawnDetails[0]?.subagentId);
const observedOverlap = spawns.length >= 2 && spawnDetails[0]?.status === "running" && spawnDetails[1]?.status === "running"
  && typeof spawnDetails[1]?.startedAt === "string" && typeof firstCompletion?.updatedAt === "string"
  && Date.parse(spawnDetails[1].startedAt) < Date.parse(firstCompletion.updatedAt);
const writerIndex = branchResolves.findIndex(e => e.branch === "final writer");
const writerAfterResults = writerIndex >= 2 && joins.filter(e => e.subagentId === spawnDetails[0]?.subagentId || e.subagentId === spawnDetails[1]?.subagentId).length === 2
  && events.indexOf(branchResolves[writerIndex]) > Math.max(...joins.filter(e => e.subagentId === spawnDetails[0]?.subagentId || e.subagentId === spawnDetails[1]?.subagentId).map(e => events.indexOf(e)));
const text = existsSync(report) ? readFileSync(report, "utf8") : "";
const checks = {
  effectiveTools: ["resolve_delegation", "subagent_spawn", "subagent_join"].every(name => registrations.some(e => e.name === name && e.active === true)),
  conditionalContract: registrations.some(e => e.name === "subagent_spawn" && typeof e.description === "string" && e.description.includes("effective registered tool contract")),
  strategyBeforeResolve: read >= 0 && read < at("resolve_delegation"),
  branchesAC: branches[0] === "branch A" && branches[1] === "branch C",
  exactAdjacent: adjacent && spawns.length >= 2,
  overlappingRuntime: observedOverlap,
  fullResultsBeforeWriter: writerAfterResults && spawnDetails.slice(0, 2).every((spawn, i) => {
    const notice = notices.find(e => e.subagentId === spawn.subagentId);
    const joined = joins.find(e => e.subagentId === spawn.subagentId);
    const joinCall = calls.find(e => e.name === "subagent_join" && e.subagentId === spawn.subagentId);
    return Boolean(notice && joinCall && joined && events.indexOf(notice) < events.indexOf(joinCall)
      && joined.fixtureFact === (i === 0 ? "amber" : "cedar"));
  }),
  singleFinalWriter: branchResolves.filter(e => e.branch === "final writer").length === 1 && spawns.length === 3 && text.includes("amber") && text.includes("cedar") && joins.length === 3,
};
const evidenceResult = { status: Object.values(checks).every(Boolean) && !cleanupFailed && !errors.length ? "passed" : "open", checks,
  timedOut, exitCode, errors, cleanupFailed, durationMs: Date.now() - started, tools: registrations.filter((e, i) => registrations.findIndex(other => other.name === e.name) === i),
  timeline: events.filter(e => e.kind !== "registered"), notices: notices.length,
  fixtureReportPresent: Boolean(text), fixtureSessionWasIsolated: true, workspaceVerified: true };
writeFileSync(output, JSON.stringify(evidenceResult, null, 2) + "\n");
// Retain a failed-cleanup fixture; no other workspace state is modified.
if (!cleanupFailed) rmSync(fixture, { recursive: true, force: true });
console.log(JSON.stringify({ status: evidenceResult.status, checks, evidence: output }));
if (evidenceResult.status !== "passed") process.exitCode = 1;

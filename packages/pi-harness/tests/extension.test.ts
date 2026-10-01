import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSkillsFromDir } from "@earendil-works/pi-coding-agent";
import type { BeforeAgentStartEvent, ExtensionAPI, ExtensionContext, Skill } from "@earendil-works/pi-coding-agent";
import activateHarness from "../extensions/pi-harness.js";
import { loadHarnessCandidates, type HarnessCandidates } from "../src/config.js";
import type { RegistryModel } from "../src/protocol.js";

type BeforeHandler = (event: BeforeAgentStartEvent, ctx: ExtensionContext) => unknown | Promise<unknown>;
type RegisteredTool = {
  name: string;
  description?: string;
  parameters: any;
  renderCall?: (args: any, theme: any, context: any) => { render(width: number): string[] };
  execute(toolCallId: string, params: unknown, signal: AbortSignal | undefined, onUpdate: undefined, ctx: ExtensionContext): Promise<{ content?: Array<{ type: string; text: string }>; details?: any }>;
};

function skill(name: string, disableModelInvocation = false): Skill {
  return { name, description: `${name} method`, filePath: `/skills/${name}/SKILL.md`, baseDir: `/skills/${name}`, sourceInfo: { source: "test", scope: "project", path: `/skills/${name}/SKILL.md` }, disableModelInvocation } as Skill;
}

function event(skills: Skill[], customPrompt?: string): BeforeAgentStartEvent {
  return { type: "before_agent_start", prompt: "Implement the change", systemPrompt: customPrompt === undefined ? "default Pi prompt" : `${customPrompt}\nCurrent working directory: /workspace`, systemPromptOptions: { cwd: "/workspace", selectedTools: [], toolSnippets: {}, toolGuidelines: {}, promptGuidelines: [], appendSystemPrompt: "", sections: {}, contextFiles: [], skills, ...(customPrompt === undefined ? {} : { customPrompt }) } };
}

function context(modelRegistry: { getAvailable: () => RegistryModel[] }): ExtensionContext {
  return { cwd: process.cwd(), isProjectTrusted: () => false, modelRegistry } as unknown as ExtensionContext;
}

function expectSingleCallPrompt(prompt: string): void {
  for (const phrase of [
    "Resolver binds the invocation and calls it within resolve_delegation once",
    "Do not issue a second launch after its response for the same outcome, reconstruct the prompt, or replace the resolved model/thinking",
    "Any later independent outcome requires its own permitted resolve_delegation call",
    "include resource and authorization checks",
  ]) expect(prompt).toContain(phrase);
  for (const phrase of [
    "it does not launch a Handler",
    "immediately launch this outcome's Handler as the next environment action",
    "do not interpose any action between a resolved response and its exact launch",
  ]) expect(prompt).not.toContain(phrase);
}

function expectClosedObject(schema: unknown): Record<string, any> {
  expect(schema).toMatchObject({ type: "object", additionalProperties: false });
  return (schema as { properties: Record<string, any> }).properties;
}

function expectClosedResolverSchema(schema: unknown): void {
  const root = expectClosedObject(schema);
  expect(Object.keys(root).sort()).toEqual(["admission", "delegate", "handoff", "impact", "reasoning"]);
  expect(Object.keys(expectClosedObject(root.delegate)).sort()).toEqual(["name", "params"]);
  expect(root.delegate.properties.params).toMatchObject({ type: "object", additionalProperties: true });
  expect((schema as { required: string[] }).required).toContain("delegate");
  expect([...root.delegate.required].sort()).toEqual(["name", "params"]);
  const handoff = expectClosedObject(root.handoff);
  expect(Object.keys(handoff).sort()).toEqual(["companionSkills", "constraints", "context", "deliverables", "objective", "primarySkill"]);
  expect([...root.handoff.required].sort()).toEqual(["context", "objective", "primarySkill"]);
  const contextSchemas = handoff.context.items.anyOf as unknown[];
  expect(contextSchemas).toHaveLength(2);
  expect(contextSchemas.map((candidate) => Object.keys(expectClosedObject(candidate)).sort()))
    .toEqual([["purpose", "ref"], ["inline", "purpose"]]);
  const admissionSchemas = root.admission.anyOf as unknown[];
  expect(admissionSchemas).toHaveLength(2);
  const atomic = admissionSchemas.find((candidate: any) => candidate.properties?.path?.const === "atomic");
  expect(Object.keys(expectClosedObject(atomic)).sort()).toEqual(["basis", "path", "verification"]);
  const planned = admissionSchemas.find((candidate: any) => candidate.properties?.path?.const === "planned");
  expect(planned).toBeDefined();
  const plannedProperties = expectClosedObject(planned);
  expect(Object.keys(plannedProperties).sort()).toEqual(["authority", "path"]);
  const authority = expectClosedObject(plannedProperties.authority);
  expect(Object.keys(authority).sort()).toEqual(["plan", "waves", "work"]);
  expect([...(planned as any).required].sort()).toEqual(["authority", "path"]);
  expect([...plannedProperties.authority.required].sort()).toEqual(["plan", "waves", "work"]);
}

describe("Pi Harness Extension", () => {
  test("registers a Registry-free root capability resolver and forwards exact resolution", async () => {
    let before: BeforeHandler | undefined;
    let command: ((args: string, ctx: unknown) => Promise<void>) | undefined;
    let configured = false;
    let active = ["read"];
    let registryReads = 0;
    const tools = new Map<string, RegisteredTool>();
    const pi = {
      on(name: string, handler: BeforeHandler) { if (name === "before_agent_start") before = handler; },
      registerCommand(name: string, definition: { handler: (args: string, ctx: unknown) => Promise<void> }) { if (name === "harness") command = definition.handler; },
      registerTool(tool: RegisteredTool) { tools.set(tool.name, tool); },
      getActiveTools: () => [...active],
      setActiveTools(names: string[]) { active = [...names]; },
    } as unknown as ExtensionAPI;
    let candidates: HarnessCandidates = { status: "ready", candidates: [{ provider: "test", modelId: "reasoning/model", thinking: "medium", reasoning: 2, impact: 3 }] };
    const loadCandidates = () => candidates;
    const modelRegistry = { getAvailable: () => { registryReads++; return [{ provider: "test", id: "reasoning/model", reasoning: true, thinkingLevelMap: { medium: {} } }]; } };

    activateHarness(pi, loadCandidates, async () => { configured = true; });
    expect(before).toBeDefined();
    expect(command).toBeDefined();
    await command!("config", context(modelRegistry));
    expect(configured).toBeTrue();
    const { skills: catalog, diagnostics } = loadSkillsFromDir({ dir: join(import.meta.dir, "../skills/delegation-strategy"), source: "test" });
    expect(diagnostics).toEqual([]);
    const strategy = catalog.find((item) => item.name === "delegation-strategy")!;
    expect(strategy).toBeDefined();
    expect(strategy.disableModelInvocation).toBeFalse();
    const first = await before!(event([skill("implement"), strategy, skill("hidden", true)]), context(modelRegistry)) as { systemPrompt: string };
    expectSingleCallPrompt(first.systemPrompt);
    expect(first.systemPrompt).toStartWith("You are the Pi Harness Router.");
    expect(first.systemPrompt).toContain("<name>delegation-strategy</name>");
    expect(first.systemPrompt).toContain(`<location>${strategy.filePath}</location>`);
    expect(first.systemPrompt).not.toContain("<name>hidden</name>");
    expect(first.systemPrompt).not.toContain("# Delegation Strategy");
    expect(first.systemPrompt).not.toContain("Weigh the value of separate execution");
    expect(first.systemPrompt).not.toContain("default Pi prompt");
    expect(first.systemPrompt).toContain("finite non-negative reasoning and impact requirements");
    expect(first.systemPrompt).toContain("Treat reasoning and impact as independent axes");
    expect(first.systemPrompt).toContain("least sufficient finite non-negative reasoning and impact requirements");
    expect(first.systemPrompt).toContain("concrete objective, ambiguity, reasoning needed for correctness, verification burden, and actual consequence");
    expect(first.systemPrompt).toContain("Common reasoning guidance is 0 for mechanical work with clear boundaries and low ambiguity");
    expect(first.systemPrompt).toContain("not because of a Skill name, document type, or planning/review phase");
    expect(first.systemPrompt).toContain("1 for a small settled implementation or check, simple state reconciliation, or simple documentation reconciliation");
    expect(first.systemPrompt).toContain("2 for ordinary Plan/Waves work, independent review, or multi-file impact analysis");
    expect(first.systemPrompt).toContain("Ordinary Plan/Waves and independent review work normally require at least reasoning 2");
    expect(first.systemPrompt).toContain("3 for final review involving architecture, security, migration, authority conflict, a complex root cause, or unusually difficult uncertainty");
    expect(first.systemPrompt).toContain("never combine them into a total score, weighted score, priority, or phase level");
    expect(first.systemPrompt).toContain("Common impact guidance is 0 for local, reversible work without external impact");
    expect(first.systemPrompt).toContain("1 for a consequence bounded to one module");
    expect(first.systemPrompt).toContain("2 for cross-module or materially behavior/compatibility-affecting work");
    expect(first.systemPrompt).toContain("3 for high-consequence, hard-to-reverse, or security, data, or external-system risk");
    expect(first.systemPrompt).toContain("0..3 values are common guidance, not a protocol range or upper bound");
    expect(first.systemPrompt).toContain("a simple mechanical reconciliation may remain 1");
    expect(first.systemPrompt).toContain("Planning or review does not automatically increase impact");
    expect(first.systemPrompt).toContain("any finite non-negative integer is valid");
    expect(first.systemPrompt).not.toContain("requirements from 0 to 3");
    expect(first.systemPrompt).not.toContain("levels are guidance: 0 is routine bounded low-consequence work");
    expect(first.systemPrompt).toContain("Never put reasoning or impact inside Handoff");
    expect(first.systemPrompt).not.toContain("Model Role");
    expect(first.systemPrompt).not.toContain("harness.roles");
    expect(first.systemPrompt).not.toContain("modelRole");
    expect(first.systemPrompt).toContain("Resolver binds agent: \"handler\"");
    expect(first.systemPrompt).toContain("and the exact resolved prompt, model, and thinking");
    expect(first.systemPrompt).toContain("Do not supply agent, prompt, model, or thinking in delegate.params");
    expect(first.systemPrompt).toContain("In that single call, the Resolver validates the Handoff, binds the exact invocation, and calls the selected registered delegate once");
    expect(first.systemPrompt).toContain("Do not launch the same outcome separately after the response");
    expect(first.systemPrompt).not.toContain("The Resolver validates the Handoff and selects a candidate; it does not launch a Handler.");
    expect(first.systemPrompt).toContain("without local selection, fallback, substitution, rewrite, or another Registry read");
    for (const phrase of [
      "First decide only whether new project-domain delegation is needed",
      "find delegation-strategy by name in the current model-visible Skill catalog below",
      "use read at its listed location to load the full body",
      "before identifying the coordination set, selecting domain Skills, constructing a Handoff, or requesting capability",
      "Do not delegate strategy loading",
      "If absent, hidden, unreadable, incomplete, or conflicting, block new delegation",
      "still safely retrieve and project existing Results",
      "Merely seeing the catalog entry is not loading the body",
      "Reuse a complete identifiable body only within the same context",
      "An effective end-turn requirement wins over the Skill",
      "A summary notification is not a full Result: retrieve it via the effective backend's supported path",
      "read the complete Result, including its status, summary, report, and artifacts",
      "Inspect the complete objective, constraints, and deliverables as one semantic bundle",
      "each Handler invocation must have exactly one verifiable terminal predicate",
      "Do not add a hidden scheduler, queue, retry engine, fixed Result-to-Todo mapping, Handler continuation, or automatic dispatch",
    ]) expect(first.systemPrompt).toContain(phrase);
    expect(first.systemPrompt).not.toContain("official Scoop identity/version/hash/mapping");
    expect(first.systemPrompt).not.toContain("parallel resolve-to-spawn chains");
    expect(first.systemPrompt).not.toContain("After every terminal Handler Result notification");
    expect(first.systemPrompt).not.toContain("Release dependencies only after that terminal projection");
    expect(first.systemPrompt).not.toContain("schedule newly unblocked outcomes");
    expect(first.systemPrompt).not.toContain("use serial fallback");
    // Generated prompt contracts; these checks do not exercise Router decisions or Host parallelism.
    const headings = [
      "Phase 1 - Confirm scope, then identify outcomes.",
      "Phase 2 - Select executable work.",
      "Phase 3 - Resolve and delegate the selected outcome.",
      "Phase 4 - Receive and project Results.",
    ];
    const positions = headings.map((heading) => first.systemPrompt.indexOf(heading));
    expect(positions.every((position) => position >= 0)).toBeTrue();
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(first.systemPrompt.match(/Phase [1-4] - /g)).toHaveLength(4);
    const phases = positions.map((position, index) => first.systemPrompt.slice(position, positions[index + 1]));
    for (const phrase of [
      "After loading the strategy, for a new planned implementation first disclose in an ordinary message",
      "selected Work/Plan/Waves scope's outcome and important exclusions",
      "proposed behavior or artifact changes and owners",
      "steps and material dependencies",
      "verification and completion criteria",
      "important tradeoffs, risks, and key decisions",
      "Obtain explicit current-user confirmation of that disclosed implementation scope before decomposing it into independently observable outcomes or Wave items, selecting domain Skills, constructing a Handoff, or requesting capability",
      "A path, readiness claim, intent agreement, overview approval, document status, silence, ambiguous or declined response, Handoff, or successful Resolver admission is not confirmation; block the affected implementation",
      "After that confirmation (or immediately for non-planned work), identify each independently observable user-requested result",
      "complete coordination set immediately for multi-step work",
      "only total absence of a writable and visible coordination mechanism may block coordination",
      "Each planned Waves item has exactly one Handler and one independent Result",
      "keep independently meaningful Results separate even when they are combined in a final report",
      "Internal checks may support one predicate",
      "A companion Skill must serve the same predicate",
      "independently meaningful completion, failure, dependency, recovery, authorization, durable effect, audit, or terminal state",
    ]) expect(phases[0]).toContain(phrase);
    for (const phrase of [
      "in_progress immediately before its coordination action",
      "A partial, failed, or blocked prerequisite blocks only outcomes that explicitly depend on it; unrelated ready outcomes remain eligible, and Wave grouping is not a global barrier",
      "Do not overlap dependencies or conflicting writes, ownership, authority, behavioral contracts, or side effects",
      "Shared read-only sources alone do not conflict",
      "Background overlap requires permission from the currently effective delegate tool contract and available resources",
      "unknown, stale, incompatible, or ambiguous overlap capability requires a contract-compliant serial path",
      "Tool-call parallelism is not required for background overlap",
      "Select the exact same-directory Work/Plan/Waves tuple for each planned invocation",
      "Before resolution, validate reciprocal Work/Plan/Waves links",
      "the Plan links its Work and exactly one Waves document, and Waves links that same Plan and Work",
      "missing or inconsistent links block the affected planned execution",
      "Validate that item and Wave identifiers are unique, references resolve, prerequisite links are acyclic, and no gate depends on its own release",
      "missing items, contradictory predicates, unresolved dependencies, cycles, or an uncheckable gate block the affected planned execution",
      "Check both the selected item's prerequisite completion predicates and its containing Wave's prerequisite gates before resolution",
      "item readiness alone never establishes Wave-gate readiness",
      "These semantic checks remain Router-owned; Resolver structural validation or successful admission does not establish them",
      "Use that linked waves.md as the sole executable graph; plan.md explains scope and authority and is not a second decomposition",
      "Historical tasks.md is a compatibility record only",
      "If an unfinished historical Tasks-based plan is selected, stop and require explicit migration to a linked Work/Plan/Waves tuple and applicable confirmation before execution; never interpret Tasks as Waves or silently fall back",
    ]) expect(phases[1]).toContain(phrase);
    // Static contract contrasts for S1-S23; this synthetic event cannot establish live Router decisions.
    for (const phrase of [
      "settle intended outcomes, boundaries, constraints, and success criteria with the user",
      "surface material alternatives rather than assuming agreement from silence",
      "Reuse the owning PRD/ADR/Spec where it already covers the intent",
      "express new behavior verifiably in the owning Spec before deriving an implementation Plan",
      "do not wait for confirmation of a not-yet-ready implementation Plan",
    ]) expect(phases[0]).toContain(phrase); // S1-S2: intent and authority before planning, preparation unblocked.
    for (const phrase of [
      "simple coherent deliverable, use one Spec-derived implementation Plan even across multiple files",
      "genuinely complex staged delivery",
      "overview of stages, dependencies, and incremental outcomes",
      "route approval authorizes no stage",
      "Detail and separately confirm each ready stage's implementation scope",
      "defer future-stage details only when they do not invalidate the route or hide a current-stage decision",
      "Each implementation Plan identifies its Spec-derived scope and relationship to the overview, if any",
      "do not execute an implementation Plan without the Phase 1 disclosure and explicit current-user confirmation",
    ]) expect(phases[1]).toContain(phrase); // S3-S8/S13: route-only versus each ready scope.
    for (const phrase of [
      "refine Waves items, implement, repair defects, and verify across bounded Handler outcomes without per-item approval",
      "confirm the affected portion before executing it",
      "After byte-only drift, compare the current Plan with the confirmed scope and retry current-call validation against the current tuple without renewed confirmation",
      "report failed or partial verification truthfully, and repair and recheck within scope",
    ]) expect(phases[1]).toContain(phrase); // S9-S12: in-scope autonomy, drift and material changes.
    for (const phrase of [
      "Under existing explicit authorization only",
      "bounded defect repair may restore established behavior without new Spec or implementation-plan confirmation by identifying authority and observed divergence, running focused checks, and reporting",
      "minimum scoped containment action needed to limit ongoing harm even when normal planning or authority updates cannot precede it",
      "check its effect as practicable, report it as temporary, and reconcile authority afterward",
      "small behavior-neutral maintenance may proceed without new Spec or plan confirmation after a focused unchanged-behavior check and report",
      "do not authorize new behavior or broader follow-on repair; route such changes through normal authority and scope confirmation, and clarify ambiguous target authority before claiming an exception",
      "Destructive or externally high-impact incident actions",
      "separate action-executor authorization boundary",
    ]) expect(phases[1]).toContain(phrase); // S14-S19: narrow exceptions do not bypass authorization.
    expect(phases[1]).not.toContain("reconfirm on substantive authority or Plan drift");
    expect(phases[1]).not.toContain("Complete applicable planned Work/Plan/Tasks, disclose the exact selected Plan");
    expect(phases[0].indexOf("settle intended outcomes")).toBeLessThan(phases[0].indexOf("express new behavior verifiably"));
    expect(phases[0].indexOf("first disclose in an ordinary message")).toBeLessThan(phases[0].indexOf("Obtain explicit current-user confirmation"));
    expect(phases[0].indexOf("Obtain explicit current-user confirmation")).toBeLessThan(phases[0].indexOf("identify each independently observable user-requested result"));
    expect(phases[0].indexOf("identify each independently observable user-requested result")).toBeLessThan(phases[0].indexOf("Each planned Waves item has exactly one Handler"));
    expect(phases[1].indexOf("route approval authorizes no stage")).toBeLessThan(phases[1].indexOf("separately confirm each ready stage's implementation scope"));
    for (const phrase of [
      "select one domain primary Skill and optional companion Skills for this Handoff only",
      "then assign the least sufficient finite non-negative reasoning and impact requirements from the concrete work before calling resolve_delegation",
      "For bounded behavior-neutral work supply atomic basis and focused verification",
      "supply only the exact planned Work/Plan/Waves selectors",
      "Keep Handoff fields limited to objective, primarySkill, optional companionSkills, context, constraints, and deliverables; keep Handoff and admission shapes closed",
      "Do not issue a second launch after its response",
      "Complete all reads, compatibility checks, and pre-action Todo projection before resolve",
      "Resolver binds the invocation and calls it within resolve_delegation",
      "Only after an active launch, and only when the effective registered delegate tool contract and resources permit another same-turn launch",
      "An effective end-turn requirement wins over the Skill",
      "Do not supply agent, prompt, model, or thinking in delegate.params",
      "agent: \"handler\" and the exact resolved prompt, model, and thinking",
      "If resolution or delegate capability fails, report the block without spawning",
    ]) expect(phases[2]).toContain(phrase);
    expect(phases[2].indexOf("select one domain primary Skill")).toBeLessThan(phases[2].indexOf("before calling resolve_delegation"));
    expect(phases[2].indexOf("Do not supply agent, prompt, model, or thinking in delegate.params")).toBeLessThan(phases[2].indexOf("Resolver binds agent:"));
    for (const phrase of [
      "A summary notification is not a full Result: retrieve it via the effective backend's supported path before correlating or projecting it",
      "wait for notifications rather than routine polling",
      "read the complete Result, including its status, summary, report, and artifacts",
      "Immediately project completed, partial, blocked, or failed truthfully in the existing Todo",
      "closest truthful native status plus existing descriptive or message surfaces where needed",
      "not fixed workflow-control instructions",
      "Never mark partial, blocked, or failed as completed",
      "If Result context is missing, incomplete, malformed, or structurally ambiguous, fail closed",
      "do not dispatch or claim completion based on it",
      "duplicate notification is idempotent",
      "preserve the first semantic state, leave status and dependencies unchanged",
      "On restart or replay, reapply only when available identity and visible state make that safe",
      "prefer resuming that same execution",
      "After projecting each Result, make a fresh Router-owned decision before releasing dependents",
      "release only satisfied dependencies",
      "Only completed plus required evidence satisfies an item predicate by default",
      "partial, failed, blocked, or insufficient evidence leaves it unsatisfied",
      "Verify a Wave gate separately from item completion",
      "every item listed in that Wave must satisfy its completion predicate and the gate's stated verification must pass before releasing only its explicitly dependent work",
      "An adoptable Result and sufficient evidence are required",
      "do not infer gate release from terminal status, Wave numbering, document order, or Todo completion alone",
      "A combined final report does not merge independent execution or completion states",
      "terminal Result was applied, identity and required fields are known and non-contradictory",
      "record is neither current nor needed by unresolved dependents",
      "Never use subagent_remove for cleanup or delete Results, sessions, manifests, or artifacts",
    ]) expect(phases[3]).toContain(phrase);
    expect(phases[3].indexOf("retrieve it via the effective backend's supported path")).toBeLessThan(phases[3].indexOf("Immediately project"));
    expect(phases[3].indexOf("read the complete Result")).toBeLessThan(phases[3].indexOf("Immediately project"));
    expect(phases[3].indexOf("Immediately project")).toBeLessThan(phases[3].indexOf("After projecting each Result, make a fresh Router-owned decision"));
    expect(phases[3].indexOf("Immediately project")).toBeLessThan(phases[3].indexOf("Verify a Wave gate separately from item completion"));
    expect(phases[3].indexOf("Verify a Wave gate separately from item completion")).toBeLessThan(phases[3].indexOf("before releasing only its explicitly dependent work"));
    expect(active).toEqual(["read", "resolve_delegation"]);
    expect(registryReads).toBe(0);

    const resolver = tools.get("resolve_delegation")!;
    expectClosedResolverSchema(resolver.parameters);
    const schema = JSON.stringify(resolver.parameters);
    expect(schema).toContain("implement");
    expect(schema).toContain("delegation-strategy");
    expect(schema).toContain("Exactly one Router-selected registered delegate invocation");
    expect(schema).toContain("do not launch the same outcome separately after this call returns");
    expect(schema).toContain("Router-selected startup fields for this single invocation");
    expect(schema).toContain("omit protected agent, prompt, model, and thinking, which Resolver binds");
    expect(schema).not.toContain("hidden");
    expect(schema).not.toContain("modelRole");
    expect(resolver.description).toContain("call the Router-selected registered delegate once within this resolve_delegation call");
    expect(resolver.description).toContain("any later independent outcome requires its own permitted resolve_delegation call");
    expect(resolver.description).not.toContain("does not launch a Handler");
    const rendered = resolver.renderCall!({ handoff: { objective: "Inspect implementation.", primarySkill: "implement", context: [] }, reasoning: 2, impact: 3 }, { fg: (_color: string, text: string) => text, bold: (text: string) => text }, {}).render(120).join("\n");
    expect(rendered).toContain("resolve_delegation  reasoning 2, impact 3");
    expect(rendered).not.toContain("modelRole");

    const calls: Array<{ name: string; args: unknown }> = [];
    const rawReturn = { result: { content: [{ type: "text", text: "opaque" }], details: { subagentId: "task", generation: 1, status: "running" } }, isError: false };
    const delegate = { name: "subagent_spawn", params: { label: "Inspect", taskSlug: "inspect-implementation" } };
    const toolContext = { ...context(modelRegistry), tools: [{ name: "subagent_spawn" }], executeTool: async (name: string, args: unknown) => { calls.push({ name, args }); return rawReturn; } };
    const invocation = await resolver.execute("call-1", { handoff: { objective: "Inspect implementation.", primarySkill: "implement", context: [{ inline: "Supplied context.", purpose: "Boundary." }] }, admission: { path: "atomic", basis: ["Bounded."], verification: ["Check result."] }, reasoning: 1, impact: 2, delegate }, undefined, undefined, toolContext);
    expect(invocation.details.resolution).toMatchObject({ status: "resolved", model: "test/reasoning/model", thinking: "medium" });
    expect(invocation.details).not.toHaveProperty("taskSlug");
    expect(registryReads).toBe(1);
    expect(calls).toEqual([{ name: delegate.name, args: { ...delegate.params, agent: "handler", prompt: invocation.details.resolution.prompt, model: "test/reasoning/model", thinking: "medium" } }]);
    expect(invocation.details.launch.rawReturn).toBe(rawReturn);
    expect(Object.keys(invocation.details.launch).sort()).toEqual(["rawReturn", "tool"]);
    const handlerPrompt = Bun.YAML.parse(invocation.details.resolution.prompt) as Record<string, unknown>;
    for (const key of ["model", "modelRole", "thinking", "candidate", "reasoning", "impact"]) expect(handlerPrompt).not.toHaveProperty(key);

    for (const isError of [true, false]) {
      rawReturn.isError = isError;
      const captured = await resolver.execute("raw-return", { handoff: { objective: "Check raw evidence.", primarySkill: "implement", context: [] }, admission: { path: "atomic", basis: ["Bounded."], verification: ["Check."] }, reasoning: 1, impact: 1, delegate }, undefined, undefined, toolContext);
      expect(captured.details.resolution.status).toBe("resolved");
      expect(captured.details.launch.rawReturn).toBe(rawReturn);
      expect(Object.keys(captured.details.launch)).toEqual(["tool", "rawReturn"]);
      const parsed = Bun.YAML.parse(captured.content![0].text) as any;
      expect(parsed.launch.rawReturn).toEqual(rawReturn);
      expect(Object.keys(parsed.launch).sort()).toEqual(["rawReturn", "tool"]);
      expect(parsed.launch).not.toHaveProperty("rawError");
    }
    for (const rawError of [new Error("Bridge failure"), { code: "transport_failure" }, undefined]) {
      let failedCalls = 0;
      const thrown = await resolver.execute("raw-error", { handoff: { objective: "Check error evidence.", primarySkill: "implement", context: [] }, admission: { path: "atomic", basis: ["Bounded."], verification: ["Check."] }, reasoning: 1, impact: 1, delegate }, undefined, undefined, {
        ...toolContext, executeTool: async () => { failedCalls++; throw rawError; },
      } as ExtensionContext);
      expect(failedCalls).toBe(1);
      expect(thrown.details.resolution.status).toBe("resolved");
      expect(thrown.details.launch.tool).toBe("subagent_spawn");
      expect(Object.prototype.hasOwnProperty.call(thrown.details.launch, "rawError")).toBeTrue();
      expect(thrown.details.launch.rawError).toBe(rawError);
      expect(Object.keys(thrown.details.launch)).toEqual(["tool", "rawError"]);
      expect(thrown.details.launch).not.toHaveProperty("rawReturn");
      const parsed = Bun.YAML.parse(thrown.content![0].text) as any;
      expect(Object.prototype.hasOwnProperty.call(parsed.launch, "rawError")).toBeTrue();
      expect(Object.keys(parsed.launch).sort()).toEqual(["rawError", "tool"]);
      expect(parsed.launch).not.toHaveProperty("rawReturn");
      if (rawError instanceof Error) expect(parsed.launch.rawError).toStartWith("Error: Bridge failure");
      else expect(parsed.launch.rawError).toEqual(rawError === undefined ? "undefined" : rawError);
    }

    const root = mkdtempSync(join(tmpdir(), "pi-harness-planned-"));
    try {
      const directory = join(root, "docs", "works", "exact");
      mkdirSync(directory, { recursive: true });
      const authority = { work: join(directory, "work.md"), plan: join(directory, "plan.md"), waves: join(directory, "waves.md") };
      for (const path of Object.values(authority)) writeFileSync(path, "fixture\n");
      // Synthetic host bridge; no live Handler is started.
      const plannedContext = { ...toolContext, cwd: root };
      const plannedInvocation = await resolver.execute("planned", {
        handoff: { objective: "Resolve only.", primarySkill: "implement", context: Object.values(authority).map((ref) => ({ ref, purpose: "Selected." })) },
        admission: { path: "planned", authority }, reasoning: 1, impact: 2, delegate,
      }, undefined, undefined, plannedContext);
      expect(plannedInvocation.details.resolution).toMatchObject({ status: "resolved", model: "test/reasoning/model", thinking: "medium" });
      expect([...tools.keys()]).toEqual(["resolve_delegation"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }

    expect(JSON.stringify(tools.get("resolve_delegation")!.parameters)).toContain("implement");
    expect(JSON.stringify(tools.get("resolve_delegation")!.parameters)).not.toContain("research");
    expect(await before!(event([skill("implement")], "# Pi Harness Handler"), context(modelRegistry))).toBeUndefined();
    expect(active).toEqual(["read"]);
    expect(await before!(event([skill("delegation-strategy")], "# Other Agent"), context(modelRegistry))).toBeUndefined();
    expect(active).toEqual(["read"]);

    candidates = { status: "ready", candidates: [{ provider: "missing", modelId: "model", thinking: "medium", reasoning: 1, impact: 1 }] };
    await before!(event([skill("implement")]), context(modelRegistry));
    const unavailable = await tools.get("resolve_delegation")!.execute("call-2", { handoff: { objective: "Inspect.", primarySkill: "implement", context: [] }, admission: { path: "atomic", basis: ["Bounded."], verification: ["Check."] }, reasoning: 1, impact: 1, delegate }, undefined, undefined, toolContext);
    expect(unavailable.details.resolution).toMatchObject({ status: "blocked", code: "unavailable_candidate" });

    candidates = { status: "ready", candidates: [{ provider: "test", modelId: "reasoning/model", thinking: "medium", reasoning: 1, impact: 1 }] };
    await before!(event([skill("implement")]), context(modelRegistry));
    const insufficient = await tools.get("resolve_delegation")!.execute("call-3", { handoff: { objective: "Inspect.", primarySkill: "implement", context: [] }, admission: { path: "atomic", basis: ["Bounded."], verification: ["Check."] }, reasoning: 2, impact: 2, delegate }, undefined, undefined, toolContext);
    expect(insufficient.details.resolution).toMatchObject({ status: "blocked", code: "no_qualified_candidate" });

    candidates = { status: "blocked", code: "invalid_configuration", message: "bad harness settings" };
    const blocked = await before!(event([skill("implement")]), context(modelRegistry)) as { systemPrompt: string };
    expect(active).toEqual(["read"]);
    expect(blocked.systemPrompt).toContain("bad harness settings");
    expectSingleCallPrompt(blocked.systemPrompt);
  });


  test.each([
    ["roles", "legacy_configuration"],
    ["modelRole", "legacy_configuration"],
    ["unknown", "invalid_configuration"],
  ] as const)("propagates %s execute-time configuration drift without Registry or authority observation", async (field, code) => {
    let before: BeforeHandler | undefined;
    let active = ["read"];
    let registered = 0;
    let registryReads = 0;
    let global: unknown = { harness: { candidates: { "test/model": { medium: { reasoning: 1, impact: 1 } } } } };
    const tools = new Map<string, RegisteredTool>();
    const pi = {
      on(name: string, handler: BeforeHandler) { if (name === "before_agent_start") before = handler; },
      registerCommand() {},
      registerTool(tool: RegisteredTool) { registered++; tools.set(tool.name, tool); },
      getActiveTools: () => [...active],
      setActiveTools(names: string[]) { active = [...names]; },
    } as unknown as ExtensionAPI;
    const loadCandidates = (cwd: string, trusted: boolean) => loadHarnessCandidates(cwd, trusted, () => ({
      getGlobalSettings: () => global,
      getProjectSettings: () => ({}),
      drainErrors: () => [],
    }));
    const ctx = context({ getAvailable: () => { registryReads++; return []; } });

    activateHarness(pi, loadCandidates, async () => {});
    await before!(event([skill("implement")]), ctx);
    expect(active).toEqual(["read", "resolve_delegation"]);
    expect(registered).toBe(1);
    global = field === "unknown" ? { harness: { candidates: {}, unknown: true } } : { harness: { [field]: {} } };

    const result = await tools.get("resolve_delegation")!.execute("drift", {
      handoff: { objective: "Must not launch.", primarySkill: "implement", context: [{ ref: "missing-authority.md", purpose: "Must not be read." }] },
      admission: { path: "planned", authority: { work: "missing-work.md", plan: "missing-plan.md", waves: "missing-waves.md" } },
      reasoning: 1,
      impact: 1,
    }, undefined, undefined, ctx);

    expect(result.details.resolution).toMatchObject({ status: "blocked", code });
    expect(result.details).not.toHaveProperty("launch");
    expect(registryReads).toBe(0);
    expect(registered).toBe(1);
    expect(active).toEqual(["read", "resolve_delegation"]);
  });
  test("blocks duplicate raw default settings before Registry access or Resolver registration", async () => {
    const root = mkdtempSync(join(tmpdir(), "pi-harness-extension-"));
    const cwd = join(root, "project");
    const agentDir = join(root, "agent");
    mkdirSync(cwd, { recursive: true });
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "settings.json"), '{"harness":{"candidates":{},"candidates":{"test/model":{"medium":{"reasoning":1,"impact":1}}}}}');
    const originalAgentDir = process.env.PI_CODING_AGENT_DIR;
    process.env.PI_CODING_AGENT_DIR = agentDir;
    try {
      let before: BeforeHandler | undefined;
      let active = ["read"];
      let registrations = 0;
      let registryReads = 0;
      const pi = {
        on(name: string, handler: BeforeHandler) { if (name === "before_agent_start") before = handler; },
        registerCommand() {},
        registerTool() { registrations++; },
        getActiveTools: () => [...active],
        setActiveTools(names: string[]) { active = [...names]; },
      } as unknown as ExtensionAPI;
      activateHarness(pi, undefined, async () => {});
      const result = await before!(event([skill("implement")]), { ...context({ getAvailable: () => { registryReads++; return []; } }), cwd });
      expectSingleCallPrompt((result as { systemPrompt: string }).systemPrompt);
      expect(result).toMatchObject({ systemPrompt: expect.stringContaining("Pi settings could not be read") });
      expect(active).toEqual(["read"]);
      expect(registrations).toBe(0);
      expect(registryReads).toBe(0);
    } finally {
      if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
      else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("removes resolver when candidates or visible Skills are absent", async () => {
    let before: BeforeHandler | undefined;
    let active = ["read", "resolve_delegation"];
    let registered = 0;
    const pi = {
      on(name: string, handler: BeforeHandler) { if (name === "before_agent_start") before = handler; },
      registerCommand() {}, registerTool() { registered++; },
      getActiveTools: () => [...active], setActiveTools(names: string[]) { active = [...names]; },
    } as unknown as ExtensionAPI;
    let candidates: HarnessCandidates = { status: "ready", candidates: [] };
    activateHarness(pi, () => candidates, async () => {});
    const prompt = await before!(event([skill("research")]), context({ getAvailable: () => [] })) as { systemPrompt: string };
    expect(active).toEqual(["read"]);
    expect(registered).toBe(0);
    expect(prompt.systemPrompt).toContain("No candidate is configured");
    expectSingleCallPrompt(prompt.systemPrompt);
    expect(prompt.systemPrompt).toContain("If absent, hidden, unreadable, incomplete, or conflicting, block new delegation");
    expect(prompt.systemPrompt).toContain("still safely retrieve and project existing Results");
    expect(prompt.systemPrompt).not.toContain("<name>delegation-strategy</name>");
    candidates = { status: "ready", candidates: [{ provider: "p", modelId: "m", thinking: "off", reasoning: 0, impact: 0 }] };
    const noVisibleSkills = await before!(event([skill("hidden", true)]), context({ getAvailable: () => [] })) as { systemPrompt: string };
    expectSingleCallPrompt(noVisibleSkills.systemPrompt);
    expect(active).toEqual(["read"]);
    expect(registered).toBe(0);
    const hidden = await before!(event([skill("delegation-strategy", true), skill("implement")]), context({ getAvailable: () => [] })) as { systemPrompt: string };
    expect(hidden.systemPrompt).not.toContain("<name>delegation-strategy</name>");
    expectSingleCallPrompt(hidden.systemPrompt);
    expect(active).toEqual(["read", "resolve_delegation"]);
  });

  test("strategy Skill owns bounded scheduling and capability method without changing tool authority", async () => {
    const text = await Bun.file(join(import.meta.dir, "../skills/delegation-strategy/SKILL.md")).text();
    const parts = text.split("---\n");
    expect(parts[0]).toBe("");
    const frontmatter = Bun.YAML.parse(parts[1]) as { name: string; description: string };
    expect(frontmatter.name).toBe("delegation-strategy");
    expect(frontmatter.description).toContain("load before domain Skill selection");
    const body = parts.slice(2).join("---\n");
    for (const phrase of [
      "Router-only coordination guidance",
      "A Handler mistakenly asked to coordinate must return `blocked`",
      "independently observable results and completion predicates before choosing domain Skills",
      "unknown identity blocks itself and its dependents, not unrelated ready branches",
      "shared read-only sources alone do not conflict",
      "least sufficient reasoning and impact independently",
      "reduce impact only when consequences really are isolated",
      "delegation, context transfer, integration, and whole-deliverable verification costs",
      "In that single call, the Resolver validates and binds agent/prompt/model/thinking, executes the selected delegate once, and returns resolution with one raw launch return value or error",
      "After the Resolver returns, do not call spawn again, reconstruct the prompt, replace model/thinking, or separately launch the same task",
      "only when the currently registered delegate tool contract and available resources permit it",
      "An effective end-turn requirement remains binding",
      "After a terminal notification, obtain the full Result through the backend's supported retrieval path",
      "stop affected unlaunched work",
      "block new delegation rather than substituting a remembered method",
      "Existing complete Results still require safe retrieval and projection",
    ]) expect(body).toContain(phrase);
    expect(body.indexOf("Identify the independently observable results")).toBeLessThan(body.indexOf("choose the domain primary Skill"));
    expect(body.indexOf("complete reads, compatibility/resource checks")).toBeLessThan(body.indexOf("Submit one Handoff"));
  });
});

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
  parameters: any;
  renderCall?: (args: any, theme: any, context: any) => { render(width: number): string[] };
  execute(toolCallId: string, params: unknown, signal: AbortSignal | undefined, onUpdate: undefined, ctx: ExtensionContext): Promise<{ details?: any }>;
};

function skill(name: string, disableModelInvocation = false): Skill {
  return { name, description: `${name} method`, filePath: `/skills/${name}/SKILL.md`, baseDir: `/skills/${name}`, sourceInfo: { source: "test", scope: "project", path: `/skills/${name}/SKILL.md` }, disableModelInvocation } as Skill;
}

function event(skills: Skill[], customPrompt?: string): BeforeAgentStartEvent {
  return { type: "before_agent_start", prompt: "Implement the change", systemPrompt: customPrompt === undefined ? "default Pi prompt" : `${customPrompt}\nCurrent working directory: /workspace`, systemPromptOptions: { cwd: "/workspace", skills, ...(customPrompt === undefined ? {} : { customPrompt }) } };
}

function context(modelRegistry: { getAvailable: () => RegistryModel[] }): ExtensionContext {
  return { cwd: process.cwd(), isProjectTrusted: () => false, modelRegistry } as unknown as ExtensionContext;
}

function expectClosedObject(schema: unknown): Record<string, any> {
  expect(schema).toMatchObject({ type: "object", additionalProperties: false });
  return (schema as { properties: Record<string, any> }).properties;
}

function expectClosedResolverSchema(schema: unknown): void {
  const root = expectClosedObject(schema);
  expect(Object.keys(root).sort()).toEqual(["admission", "handoff", "impact", "reasoning"]);
  const handoff = expectClosedObject(root.handoff);
  for (const key of ["model", "modelRole", "thinking", "reasoning", "impact"]) expect(handoff).not.toHaveProperty(key);
  const contextSchemas = handoff.context.items.anyOf as unknown[];
  expect(contextSchemas).toHaveLength(2);
  contextSchemas.forEach(expectClosedObject);
  const admissionSchemas = root.admission.anyOf as unknown[];
  expect(admissionSchemas).toHaveLength(2);
  admissionSchemas.forEach(expectClosedObject);
  const planned = admissionSchemas.find((candidate: any) => candidate.properties?.path?.const === "planned");
  expect(planned).toBeDefined();
  expectClosedObject(expectClosedObject(planned).authority);
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
    expect(first.systemPrompt).toContain("2 for ordinary Plan or Tasks work, independent review, or multi-file impact analysis");
    expect(first.systemPrompt).toContain("Ordinary Plan, Tasks, and independent review work normally require at least reasoning 2");
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
    expect(first.systemPrompt).toContain("When calling subagent_spawn, always pass agent: \"handler\"");
    expect(first.systemPrompt).toContain("with that resolved prompt, model, thinking, taskSlug");
    expect(first.systemPrompt).toContain("Pass the returned prompt, model, and thinking exactly");
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
      "Phase 1 - Identify and present outcomes.",
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
      "After loading the strategy, identify each independently observable user-requested result",
      "complete coordination set immediately for multi-step work",
      "only total absence of a writable and visible coordination mechanism may block coordination",
      "Internal checks may support it",
      "A companion Skill must serve the same predicate",
      "independently meaningful completion, failure, dependency, recovery, authorization, durable effect, audit, or terminal state",
    ]) expect(phases[0]).toContain(phrase);
    for (const phrase of [
      "in_progress immediately before its coordination action",
      "do not overlap dependencies or conflicting writes, ownership, authority, behavioral contracts, or side effects",
      "Shared read-only sources alone do not conflict",
      "Background overlap requires permission from the currently effective delegate tool contract and available resources",
      "unknown, stale, incompatible, or ambiguous overlap capability requires a contract-compliant serial path",
      "Tool-call parallelism is not required for background overlap",
      "Select the exact same-directory Work/Plan/Tasks tuple for each planned invocation",
    ]) expect(phases[1]).toContain(phrase);
    // Static contract contrasts for S1-S19; this synthetic event cannot establish live Router decisions.
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
      "defer future-stage details only when they do not invalidate the route or hide a current-stage decision",
      "Each implementation Plan identifies its Spec-derived scope and relationship to the overview, if any",
      "outcome and important exclusions",
      "behavior or artifact changes and owners",
      "steps and material dependencies",
      "verification and completion criteria",
      "important tradeoffs, risks, and key decisions",
      "Obtain explicit current-user confirmation of this disclosed implementation scope before its first delegation",
      "A path, readiness claim, intent agreement, overview approval, document status, silence, ambiguous or declined response, Handoff, or successful Resolver admission is not confirmation",
    ]) expect(phases[1]).toContain(phrase); // S3-S8/S13: route-only versus each ready scope.
    for (const phrase of [
      "refine Tasks, implement, repair defects, and verify across bounded Handler outcomes without per-task approval",
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
    expect(phases[1].indexOf("route approval authorizes no stage")).toBeLessThan(phases[1].indexOf("explicit current-user confirmation of this disclosed implementation scope"));
    for (const phrase of [
      "Keep Handoff fields limited to objective, primarySkill, optional companionSkills, context, constraints, and deliverables; keep Handoff and admission shapes closed",
      "After a resolved response and compatible delegate capability, immediately launch this outcome's Handler as the next environment action",
      "Complete all reads, compatibility checks, and pre-action Todo projection before resolve",
      "do not interpose any action between a resolved response and its exact launch",
      "Only after an active launch, and only when the effective registered delegate tool contract and resources permit another same-turn launch",
      "An effective end-turn requirement wins over the Skill",
      "Pass the returned prompt, model, and thinking exactly",
      "agent: \"handler\" with that resolved prompt, model, thinking, taskSlug",
      "If resolution or delegate capability fails, report the block without spawning",
    ]) expect(phases[2]).toContain(phrase);
    for (const phrase of [
      "A summary notification is not a full Result: retrieve it via the effective backend's supported path",
      "read the complete Result, including its status, summary, report, and artifacts",
      "not fixed workflow-control instructions",
      "Never mark partial, blocked, or failed as completed",
      "duplicate notification is idempotent",
      "preserve the first semantic state, leave status and dependencies unchanged",
      "On restart or replay, reapply only when available identity and visible state make that safe",
      "prefer resuming that same execution",
      "After projecting each Result, make a fresh Router-owned decision before releasing dependents",
      "release only satisfied dependencies",
      "A combined final report does not merge independent execution or completion states",
      "terminal Result was applied, identity and required fields are known and non-contradictory",
      "record is neither current nor needed by unresolved dependents",
      "Never use subagent_remove for cleanup or delete Results, sessions, manifests, or artifacts",
    ]) expect(phases[3]).toContain(phrase);
    expect(active).toEqual(["read", "resolve_delegation"]);
    expect(registryReads).toBe(0);

    const resolver = tools.get("resolve_delegation")!;
    expectClosedResolverSchema(resolver.parameters);
    const schema = JSON.stringify(resolver.parameters);
    expect(schema).toContain("implement");
    expect(schema).toContain("delegation-strategy");
    expect(schema).not.toContain("hidden");
    expect(schema).not.toContain("modelRole");
    const rendered = resolver.renderCall!({ handoff: { objective: "Inspect implementation.", primarySkill: "implement", context: [] }, reasoning: 2, impact: 3 }, { fg: (_color: string, text: string) => text, bold: (text: string) => text }, {}).render(120).join("\n");
    expect(rendered).toContain("resolve_delegation  reasoning 2, impact 3");
    expect(rendered).not.toContain("modelRole");

    const invocation = await resolver.execute("call-1", { handoff: { objective: "Inspect implementation.", primarySkill: "implement", context: [{ inline: "Supplied context.", purpose: "Boundary." }] }, admission: { path: "atomic", basis: ["Bounded."], verification: ["Check result."] }, reasoning: 1, impact: 2 }, undefined, undefined, context(modelRegistry));
    expect(invocation.details).toMatchObject({ status: "resolved", model: "test/reasoning/model", thinking: "medium" });
    expect(invocation.details).not.toHaveProperty("taskSlug");
    expect(registryReads).toBe(1);
    const handlerPrompt = Bun.YAML.parse(invocation.details.prompt) as Record<string, unknown>;
    for (const key of ["model", "modelRole", "thinking", "candidate", "reasoning", "impact"]) expect(handlerPrompt).not.toHaveProperty(key);

    expect(JSON.stringify(tools.get("resolve_delegation")!.parameters)).toContain("implement");
    expect(JSON.stringify(tools.get("resolve_delegation")!.parameters)).not.toContain("research");
    expect(await before!(event([skill("implement")], "# Pi Harness Handler"), context(modelRegistry))).toBeUndefined();
    expect(active).toEqual(["read"]);
    expect(await before!(event([skill("delegation-strategy")], "# Other Agent"), context(modelRegistry))).toBeUndefined();
    expect(active).toEqual(["read"]);

    candidates = { status: "ready", candidates: [{ provider: "missing", modelId: "model", thinking: "medium", reasoning: 1, impact: 1 }] };
    await before!(event([skill("implement")]), context(modelRegistry));
    const unavailable = await tools.get("resolve_delegation")!.execute("call-2", { handoff: { objective: "Inspect.", primarySkill: "implement", context: [] }, admission: { path: "atomic", basis: ["Bounded."], verification: ["Check."] }, reasoning: 1, impact: 1 }, undefined, undefined, context(modelRegistry));
    expect(unavailable.details).toMatchObject({ status: "blocked", code: "unavailable_candidate" });

    candidates = { status: "ready", candidates: [{ provider: "test", modelId: "reasoning/model", thinking: "medium", reasoning: 1, impact: 1 }] };
    await before!(event([skill("implement")]), context(modelRegistry));
    const insufficient = await tools.get("resolve_delegation")!.execute("call-3", { handoff: { objective: "Inspect.", primarySkill: "implement", context: [] }, admission: { path: "atomic", basis: ["Bounded."], verification: ["Check."] }, reasoning: 2, impact: 2 }, undefined, undefined, context(modelRegistry));
    expect(insufficient.details).toMatchObject({ status: "blocked", code: "no_qualified_candidate" });

    candidates = { status: "blocked", code: "invalid_configuration", message: "bad harness settings" };
    const blocked = await before!(event([skill("implement")]), context(modelRegistry)) as { systemPrompt: string };
    expect(active).toEqual(["read"]);
    expect(blocked.systemPrompt).toContain("bad harness settings");
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
      admission: { path: "planned", authority: { work: "missing-work.md", plan: "missing-plan.md", tasks: "missing-tasks.md" } },
      reasoning: 1,
      impact: 1,
    }, undefined, undefined, ctx);

    expect(result.details).toMatchObject({ status: "blocked", code });
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
    expect(prompt.systemPrompt).toContain("If absent, hidden, unreadable, incomplete, or conflicting, block new delegation");
    expect(prompt.systemPrompt).toContain("still safely retrieve and project existing Results");
    expect(prompt.systemPrompt).not.toContain("<name>delegation-strategy</name>");
    candidates = { status: "ready", candidates: [{ provider: "p", modelId: "m", thinking: "off", reasoning: 0, impact: 0 }] };
    await before!(event([skill("hidden", true)]), context({ getAvailable: () => [] }));
    expect(active).toEqual(["read"]);
    expect(registered).toBe(0);
    const hidden = await before!(event([skill("delegation-strategy", true), skill("implement")]), context({ getAvailable: () => [] })) as { systemPrompt: string };
    expect(hidden.systemPrompt).not.toContain("<name>delegation-strategy</name>");
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
      "Never batch resolves before launches",
      "only when the currently registered delegate tool contract and available resources permit it",
      "An old end-turn rule remains binding while effective",
      "Obtain the full Result through the backend's supported retrieval path",
      "stop affected unlaunched work",
      "block new delegation rather than substituting a remembered method",
      "Existing complete Results still require safe retrieval and projection",
    ]) expect(body).toContain(phrase);
    expect(body.indexOf("Identify the independently observable results")).toBeLessThan(body.indexOf("choose the domain primary Skill"));
    expect(body.indexOf("complete reads, compatibility/resource checks")).toBeLessThan(body.indexOf("Resolve one Handoff"));
  });
});

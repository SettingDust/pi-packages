import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    const first = await before!(event([skill("research"), skill("hidden", true)]), context(modelRegistry)) as { systemPrompt: string };
    expect(first.systemPrompt).toStartWith("You are the Pi Harness Router.");
    expect(first.systemPrompt).not.toContain("default Pi prompt");
    expect(first.systemPrompt).toContain("finite non-negative reasoning and impact requirements");
    expect(first.systemPrompt).toContain("Treat reasoning and impact as independent axes");
    expect(first.systemPrompt).toContain("least sufficient finite non-negative reasoning and impact requirements");
    expect(first.systemPrompt).toContain("concrete objective, ambiguity, reasoning needed for correctness, verification burden, and actual consequence");
    expect(first.systemPrompt).toContain("reasoning 0 is mechanical work with clear boundaries and low ambiguity");
    expect(first.systemPrompt).toContain("not because of a Skill name, document type, or planning/review phase");
    expect(first.systemPrompt).toContain("1 for a small settled implementation or check, simple state reconciliation, or simple documentation reconciliation");
    expect(first.systemPrompt).toContain("2 for ordinary Plan or Tasks work, independent review, or multi-file impact analysis");
    expect(first.systemPrompt).toContain("Ordinary Plan, Tasks, and independent review work normally require at least reasoning 2");
    expect(first.systemPrompt).toContain("3 for final review involving architecture, security, migration, authority conflict, a complex root cause, or unusually difficult uncertainty");
    expect(first.systemPrompt).toContain("never combine them into a total score, weighted score, priority, or phase level");
    expect(first.systemPrompt).toContain("impact 0 is local and reversible without external impact");
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
      "create the complete main-session coordination set immediately",
      "Before every coordination action, project its Todo item as in_progress",
      "After every terminal Handler Result notification, immediately project its status truthfully",
      "Release dependencies only after that terminal projection",
      "An identifiable equivalent duplicate or resend is idempotent",
      "Malformed, structurally different, or conflicting input fails closed",
      "clean up only a Todo proven stale",
      "Dependencies, shared files, ownership, authority, and behavioral conflicts always serialize",
      "use serial fallback",
    ]) expect(first.systemPrompt).toContain(phrase);
    for (const phrase of [
      "inspect the complete objective, constraints, and deliverables as one semantic bundle",
      "what one observable and verifiable terminal fact must be true",
      "Multiple checks may support one outcome",
      "independently meaningful completion or failure",
      "retry or recovery boundary",
      "user-authorization or confirmation boundary",
      "durable side effect or persistent state change",
      "audit or compliance fact",
      "One decisive independent boundary is sufficient",
      "not a fixed step, deliverable, file, phase, Skill, or Handler-call count",
      "one Router-coordinated outcome per independent terminal predicate",
      "unknown or ambiguous capability falls back to serial execution",
      "decision authority returns to you",
      "Read the full Result, truthfully project completed, partial, blocked, or failed",
      "make a fresh Router-owned decision before releasing dependents",
      "Do not let the Handler choose continuation",
      "Retry only the failed outcome's boundary",
      "never silently replay completed durable side effects or independent outcomes",
      "Do not add a hidden scheduler, queue, retry engine, fixed Result-to-Todo mapping, Handler continuation, or automatic dispatch",
    ]) expect(first.systemPrompt).toContain(phrase);
    expect(active).toEqual(["read", "resolve_delegation"]);
    expect(registryReads).toBe(0);

    const resolver = tools.get("resolve_delegation")!;
    expectClosedResolverSchema(resolver.parameters);
    const schema = JSON.stringify(resolver.parameters);
    expect(schema).toContain("research");
    expect(schema).not.toContain("hidden");
    expect(schema).not.toContain("modelRole");
    const rendered = resolver.renderCall!({ handoff: { objective: "Inspect implementation.", primarySkill: "research", context: [] }, reasoning: 2, impact: 3 }, { fg: (_color: string, text: string) => text, bold: (text: string) => text }, {}).render(120).join("\n");
    expect(rendered).toContain("resolve_delegation  reasoning 2, impact 3");
    expect(rendered).not.toContain("modelRole");

    const invocation = await resolver.execute("call-1", { handoff: { objective: "Inspect implementation.", primarySkill: "research", context: [{ inline: "Supplied context.", purpose: "Boundary." }] }, admission: { path: "atomic", basis: ["Bounded."], verification: ["Check result."] }, reasoning: 1, impact: 2 }, undefined, undefined, context(modelRegistry));
    expect(invocation.details).toMatchObject({ status: "resolved", model: "test/reasoning/model", thinking: "medium" });
    expect(invocation.details).not.toHaveProperty("taskSlug");
    expect(registryReads).toBe(1);
    const handlerPrompt = Bun.YAML.parse(invocation.details.prompt) as Record<string, unknown>;
    for (const key of ["model", "modelRole", "thinking", "candidate", "reasoning", "impact"]) expect(handlerPrompt).not.toHaveProperty(key);

    await before!(event([skill("implement")]), context(modelRegistry));
    expect(JSON.stringify(tools.get("resolve_delegation")!.parameters)).toContain("implement");
    expect(JSON.stringify(tools.get("resolve_delegation")!.parameters)).not.toContain("research");
    expect(await before!(event([skill("implement")], "# Pi Harness Handler"), context(modelRegistry))).toBeUndefined();
    expect(active).toEqual(["read"]);
    expect(await before!(event([skill("implement")], "# Other Agent"), context(modelRegistry))).toBeUndefined();
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
    candidates = { status: "ready", candidates: [{ provider: "p", modelId: "m", thinking: "off", reasoning: 0, impact: 0 }] };
    await before!(event([skill("hidden", true)]), context({ getAvailable: () => [] }));
    expect(active).toEqual(["read"]);
    expect(registered).toBe(0);
  });
});

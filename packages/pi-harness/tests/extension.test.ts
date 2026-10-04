import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSkillsFromDir } from "@earendil-works/pi-coding-agent";
import type { BeforeAgentStartEvent, ExtensionAPI, ExtensionContext, Skill } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import activateHarness from "../extensions/pi-harness.js";
import { loadHarnessCandidates, type HarnessCandidates } from "../src/config.js";
import type { RegistryModel } from "../src/protocol.js";

type BeforeHandler = (event: BeforeAgentStartEvent, ctx: ExtensionContext) => unknown | Promise<unknown>;
type RegisteredTool = {
  name: string;
  description?: string;
  defaultActive?: boolean;
  parameters: any;
  renderCall?: (args: any, theme: any, context: any) => { render(width: number): string[] };
  renderResult?: (result: any, options: { expanded: boolean; isPartial: boolean }, theme: any, context: any) => { render(width: number): string[] };
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
  const standalone = admissionSchemas.find((candidate: any) => candidate.properties?.path?.const === "standalone");
  const standaloneProperties = expectClosedObject(standalone);
  expect(standaloneProperties.basis.items).toMatchObject({ minLength: 1, pattern: "\\S" });
  expect(standaloneProperties.verification.items).toMatchObject({ minLength: 1, pattern: "\\S" });
  expect(admissionSchemas.some((candidate: any) => candidate.properties?.path?.const === "atomic")).toBeFalse();
  expect(admissionSchemas.some((candidate: any) => candidate.properties?.path?.const === "preparation")).toBeFalse();
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
  test("registers historical renderers before eligibility and keeps them separate from activation", async () => {
    let before: BeforeHandler | undefined;
    let active = ["read"];
    const tools = new Map<string, RegisteredTool>();
    const pi = {
      on(name: string, handler: BeforeHandler) { if (name === "before_agent_start") before = handler; },
      registerCommand() {},
      registerTool(tool: RegisteredTool) { tools.set(tool.name, tool); },
      getActiveTools: () => [...active],
      setActiveTools(names: string[]) { active = [...names]; },
    } as unknown as ExtensionAPI;
    const loadCandidates = (_cwd: string, _trusted: boolean): HarnessCandidates => ({
      status: "ready",
      candidates: [{ provider: "test", modelId: "model", thinking: "off", reasoning: 1, impact: 1 }],
    });
    activateHarness(pi, loadCandidates, async () => {});

    const cold = tools.get("resolve_delegation");
    expect(cold).toBeDefined();
    expect(cold!.defaultActive).toBeFalse();
    expect(active).toEqual(["read"]);

    const args = {
      handoff: { objective: "Restore historical rendering.", primarySkill: "implement", context: Array.from({ length: 12 }, (_, index) => ({ inline: `ARG_DETAIL_${index}`, purpose: "fixture" })) },
      admission: { path: "standalone", basis: ["fixture"], verification: ["fixture"] },
      reasoning: 1,
      impact: 1,
      delegate: { name: "fixture", params: {} },
    };
    const result = {
      content: [{ type: "text", text: Array.from({ length: 30 }, (_, index) => `RAW_LINE_${index}`).join("\n") }],
      details: { resolution: { status: "resolved", model: "test/model", thinking: "off", prompt: "fixture" }, launch: { tool: "fixture", rawReturn: { opaque: true } } },
    };
    const restoredArgs = JSON.parse(JSON.stringify(args));
    const restoredResult = JSON.parse(JSON.stringify(result));
    const theme = { fg: (_color: string, text: string) => text, bold: (text: string) => text };
    const compactCall = cold!.renderCall!(restoredArgs, theme, { expanded: false }).render(100);
    const expandedCall = cold!.renderCall!(restoredArgs, theme, { expanded: true }).render(100);
    expect(compactCall).toHaveLength(3);
    expect(compactCall.join("\n")).not.toContain("ARG_DETAIL_11");
    expect(expandedCall.join("\n")).toContain("ARG_DETAIL_11");
    const compactResult = cold!.renderResult!(restoredResult, { expanded: false, isPartial: false }, theme, {}).render(100);
    const expandedResult = cold!.renderResult!(restoredResult, { expanded: true, isPartial: false }, theme, {}).render(100);
    expect(compactResult).toHaveLength(3);
    expect(compactResult.join("\n")).toContain("raw return captured");
    expect(expandedResult.join("\n")).toContain("RAW_LINE_29");

    const oldRenderer = cold!;
    await before!(event([skill("implement")]), context({ getAvailable: () => [] }));
    expect(active).toEqual(["read", "resolve_delegation"]);
    expect(tools.get("resolve_delegation")).not.toBe(oldRenderer);
    expect(oldRenderer.renderCall!(restoredArgs, theme, { expanded: false }).render(100)).toHaveLength(3);

    await before!(event([skill("implement")], "Handler fixture"), context({ getAvailable: () => [] }));
    expect(active).toEqual(["read"]);
    expect(oldRenderer.renderResult!(restoredResult, { expanded: false, isPartial: false }, theme, {}).render(100)).toHaveLength(3);

    let freshBefore: BeforeHandler | undefined;
    let freshActive = ["read"];
    let freshTool: RegisteredTool | undefined;
    const freshPi = {
      on(name: string, handler: BeforeHandler) { if (name === "before_agent_start") freshBefore = handler; },
      registerCommand() {},
      registerTool(tool: RegisteredTool) { freshTool = tool; },
      getActiveTools: () => [...freshActive],
      setActiveTools(names: string[]) { freshActive = [...names]; },
    } as unknown as ExtensionAPI;
    activateHarness(freshPi, loadCandidates, async () => {});
    expect(freshTool).toBeDefined();
    expect(freshTool!.defaultActive).toBeFalse();
    expect(freshActive).toEqual(["read"]);
    expect(freshBefore).toBeDefined();
  });

  test("renders bounded resolver summaries and full safe details without interpreting backend evidence", async () => {
    let before: BeforeHandler | undefined;
    let resolver: RegisteredTool | undefined;
    const pi = {
      on(name: string, handler: BeforeHandler) { if (name === "before_agent_start") before = handler; },
      registerCommand() {},
      registerTool(tool: RegisteredTool) { resolver = tool; },
      getActiveTools: () => ["read"], setActiveTools() {},
    } as unknown as ExtensionAPI;
    activateHarness(pi, () => ({ status: "ready", candidates: [{ provider: "test", modelId: "model", thinking: "off", reasoning: 1, impact: 1 }] }), async () => {});
    await before!(event([skill("implement")]), context({ getAvailable: () => [] }));
    const theme = { fg: (_color: string, text: string) => `\x1b[36m${text}\x1b[39m`, bold: (text: string) => `\x1b[1m${text}\x1b[22m` };
    const unsafe = "\x1b[2J\x1b]52;c;clipboard\x07\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\\x1b_cursor\x1b\\\x00\x07\x08\x9b2J";
    const args = {
      handoff: {
        objective: `${unsafe}检查 👩‍💻 e\u0301\n${"long objective ".repeat(800)}objective-tail`, primarySkill: `implement${unsafe}`,
        companionSkills: ["review", `check${unsafe}`],
        context: Array.from({ length: 105 }, (_, index) => ({ inline: `context-${index}`, purpose: "Original context" })),
        constraints: ["constraint-tail"], deliverables: ["deliverable-tail"],
      },
      admission: { path: "standalone", basis: ["basis-tail"], verification: ["verification-tail"] },
      reasoning: 2, impact: 3, delegate: { name: `delegate${unsafe}`, params: { label: "startup-tail" } },
    };
    const originalArgs = JSON.stringify(args);
    const compactCall = resolver!.renderCall!(args, theme, { expanded: false });
    const expandedCall = resolver!.renderCall!(args, theme, { expanded: true, lastComponent: compactCall });
    const callPreview = stripTerminalSequences(compactCall.render(120).join("\n"));
    expect(callPreview).toContain("resolve_delegation  reasoning 2, impact 3");
    expect(callPreview).toContain("implement");
    expect(callPreview).toContain("delegate");
    expect(callPreview).not.toContain("objective-tail");
    const callDetails = stripTerminalSequences(expandedCall.render(120).join("\n"));
    for (const value of ["objective-tail", "context-104", "constraint-tail", "deliverable-tail", "basis-tail", "verification-tail", "startup-tail"])
      expect(callDetails).toContain(value);
    for (const companionSkills of [undefined, null, "do-not-spread", 123, {}, [null, 123, "valid-companion"]]) {
      const malformed = resolver!.renderCall!({ ...args, handoff: { ...args.handoff, companionSkills } }, theme, {}).render(120);
      expect(malformed).toHaveLength(3);
      expect(malformed.join("\n")).not.toContain("do-not-spread");
    }
    expect(resolver!.renderCall!({}, theme, {}).render(60)).toHaveLength(1);
    expect(JSON.stringify(args)).toBe(originalArgs);

    const resolution = { status: "resolved", model: "test/model", thinking: "off", prompt: "Original prompt" };
    const content = [
      { type: "text", text: `first-block\n${unsafe}\tvisible\rcarriage\n${"检查 👩‍💻 e\u0301\n".repeat(30)}first-tail` },
      { type: "image", data: "opaque" },
      { type: "text", text: "last-block\nlast-tail" },
    ];
    const rawReturn = { status: "completed", isError: true, details: { subagentId: "opaque-identity", status: "running" } };
    const details = { resolution, launch: { tool: "delegate", rawReturn } };
    const result = { content, details };
    const originalResult = JSON.stringify(result);
    const compactResult = resolver!.renderResult!(result, { expanded: false, isPartial: false }, theme, {});
    const expandedResult = resolver!.renderResult!(result, { expanded: true, isPartial: false }, theme, {});
    const resultPreview = stripTerminalSequences(compactResult.render(120).join("\n"));
    for (const value of ["resolved", "test/model", "thinking off", "delegate", "raw return captured"]) expect(resultPreview).toContain(value);
    for (const value of ["completed", "running", "active", "opaque-identity", "launch error"]) expect(resultPreview).not.toContain(value);
    const resultDetails = stripTerminalSequences(expandedResult.render(120).join("\n"));
    for (const value of ["first-block", "visible", "carriage", "first-tail", "last-block", "last-tail"]) expect(resultDetails).toContain(value);
    expect(resultDetails).not.toContain("Original prompt"); // Expanded result uses existing text, never reserializes raw details.
    expect(expandedResult.render(2000).map((line) => stripTerminalSequences(line).trimEnd()).join("\n"))
      .toBe(`first-block\nlink2J   visible\ncarriage\n${"检查 👩‍💻 e\u0301\n".repeat(30)}first-tail\nlast-block\nlast-tail`);
    expect(JSON.stringify(result)).toBe(originalResult);
    expect(result.details.launch.rawReturn).toBe(rawReturn);
    for (const component of [compactCall, expandedCall, compactResult, expandedResult]) {
      for (const width of [0, 1, 2, 3, 8, 40, 80, 120]) {
        const lines = component.render(width);
        expect(lines.length).toBeLessThan(50000);
        if (component === compactCall || component === compactResult) expect(lines.length).toBeLessThanOrEqual(3);
        expect(lines.every((line) => visibleWidth(line) <= width)).toBeTrue();
        const rendered = lines.join("");
        expect(stripTerminalSequences(rendered)).not.toMatch(/[\u0000-\u001f\u007f-\u009f]/);
        expect(rendered).not.toMatch(/\x1b(?:\[2J|\]52;|\]8;|_)/);
      }
    }
    const blocked = resolver!.renderResult!({ content, details: { resolution: { status: "blocked", code: `invalid_skill${unsafe}`, message: `${unsafe}\n${"long message ".repeat(50)}` } } }, { expanded: false, isPartial: false }, theme, {}).render(80);
    expect(blocked).toHaveLength(2);
    expect(stripTerminalSequences(blocked.join("\n"))).toContain("blocked · invalid_skill");
    for (const rawError of [new Error(`${unsafe}error-cause\nsecond line`), { code: "error-cause" }, undefined]) {
      const failed = resolver!.renderResult!({ content, details: { resolution, launch: { tool: "delegate", rawError } } }, { expanded: false, isPartial: false }, theme, {}).render(80);
      expect(failed).toHaveLength(3);
      expect(stripTerminalSequences(failed.join("\n"))).toContain("resolved · launch error");
      expect(stripTerminalSequences(failed[2])).toContain(rawError === undefined ? "undefined" : "error-cause");
      for (const line of failed) expect(stripTerminalSequences(line)).not.toMatch(/[\u0000-\u001f\u007f-\u009f]/);
    }
    for (const invalidDetails of [undefined, null, [], {}, { resolution }, { resolution, launch: { tool: "delegate", rawError: undefined, rawReturn } }, { resolution: { status: "blocked", code: [], message: 1 } }, { resolution: { status: "blocked", code: "invalid_skill", message: "Invalid" }, launch: "invalid" }]) {
      const fallback = resolver!.renderResult!({ content, details: invalidDetails }, { expanded: false, isPartial: false }, theme, {}).render(80);
      expect(fallback).toHaveLength(2);
      expect(stripTerminalSequences(fallback[0])).toContain("Resolver output (details unavailable)");
    }
    const partial = resolver!.renderResult!(result, { expanded: false, isPartial: true }, theme, {}).render(80);
    expect(stripTerminalSequences(partial[0])).toContain("Partial resolver output");
    expect(resolver!.renderResult!({ content: [], details: undefined }, { expanded: false, isPartial: false }, theme, {}).render(80)).toHaveLength(1);
  });

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
      "Apply the loaded strategy's complete-effect classification before selecting domain Skills, constructing a Handoff, requesting capability, or choosing admission",
      "Use standalone only for authorized work outside a selected executable Work/Plan/Waves tuple",
      "Use planned for graph-bound work and for work requiring tuple prerequisites, gates, readiness, conflict, or implementation-scope confirmation",
      "missing required implementation prerequisites block and cannot be relabeled standalone",
      "Size, complexity, file count, Skill name, and tuple availability alone do not select a path",
      "Preparation is an effect category under standalone, not a third path",
      "put future output targets in ordinary text or inline context, keep actual refs readable",
      "exclude production code, configuration, dependencies, lockfiles, LLM instructions, installation, reload, deployment, Git writes, and prepared-plan execution",
      "Loading Skills, accepted authority, path/readiness text, a Handoff, successful Resolver admission, or a completed preparation Result grants neither permission nor implementation confirmation",
      "If one bundle contains multiple independently valuable outcomes, block before work and split them into one predicate per Handoff",
      "The Router retains semantic authorization and confirmation judgment",
      "For authorized non-tuple work supply standalone basis and focused verification",
      "Resolver performs only closed structural, readable-reference, planned tuple/current-byte, and protected-binding checks",
      "it does not classify effects, infer permission, choose an alternate tool, fabricate a tuple, or fallback",
      "When a preparation Result or accepted authority is complete, project it truthfully but require a later substantive implementation disclosure and explicit current-user confirmation",
      "do not execute a prepared plan or release its dependencies automatically",
    ]) expect(first.systemPrompt).toContain(phrase);
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
    for (const phrase of [
      "For authorized non-tuple work supply standalone basis and focused verification",
      "Use exactly two closed admission paths: standalone with basis and verification for authorized non-tuple work, and planned with the exact Work/Plan/Waves authority tuple for graph-bound work",
      "Choose between these paths from the complete effects, applicable authorization, and whether graph-bound tuple prerequisites, gates, readiness, conflicts, or implementation-scope confirmation are actually required",
      "Do not send path \"atomic\" or path \"preparation\"",
      "If the effective runtime lacks standalone, report a pre-launch admission block without fallback or a fabricated tuple",
      "when those graph-bound conditions are required, supply only the exact planned Work/Plan/Waves selectors",
      "Labels such as coordination-heavy, architectural, security, migration, durable, or otherwise material alone do not force planned or select a path",
      "Resolver performs only closed structural, readable-reference, planned tuple/current-byte, and protected-binding checks",
      "it does not classify effects, infer permission, choose an alternate tool, fabricate a tuple, or fallback",
    ]) expect(phases[2]).toContain(phrase);
    expect(phases[2]).not.toContain("for graph-bound, coordination-heavy, architectural, security, migration, durable, or otherwise material work supply only the exact planned Work/Plan/Waves selectors");
    for (const phrase of [
      "When a preparation Result or accepted authority is complete, project it truthfully",
      "require a later substantive implementation disclosure and explicit current-user confirmation before any planned implementation",
      "do not execute a prepared plan or release its dependencies automatically",
    ]) expect(phases[3]).toContain(phrase);
    expect(phases[0].indexOf("settle intended outcomes")).toBeLessThan(phases[0].indexOf("express new behavior verifiably"));
    expect(phases[0].indexOf("Apply the loaded strategy's complete-effect classification")).toBeLessThan(phases[0].indexOf("first disclose in an ordinary message"));
    expect(phases[0].indexOf("first disclose in an ordinary message")).toBeLessThan(phases[0].indexOf("Obtain explicit current-user confirmation"));
    expect(phases[0].indexOf("Obtain explicit current-user confirmation")).toBeLessThan(phases[0].indexOf("identify each independently observable user-requested result"));
    expect(phases[0].indexOf("identify each independently observable user-requested result")).toBeLessThan(phases[0].indexOf("Each planned Waves item has exactly one Handler"));
    expect(phases[1].indexOf("route approval authorizes no stage")).toBeLessThan(phases[1].indexOf("separately confirm each ready stage's implementation scope"));
    for (const phrase of [
      "select one domain primary Skill and optional companion Skills for this Handoff only",
      "then assign the least sufficient finite non-negative reasoning and impact requirements from the concrete work before calling resolve_delegation",
      "For authorized non-tuple work supply standalone basis and focused verification",
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
      "an already applied complete correlated terminal Result",
      "no current, active, or unresolved role, and no pending dependency, gate, or confirmation still requiring the record",
      "never call subagent_remove or delete or modify Results, sessions, manifests, or artifacts",
    ]) expect(phases[3]).toContain(phrase);
    expect(phases[3].indexOf("retrieve it via the effective backend's supported path")).toBeLessThan(phases[3].indexOf("Immediately project"));
    expect(phases[3].indexOf("read the complete Result")).toBeLessThan(phases[3].indexOf("Immediately project"));
    expect(phases[3].indexOf("Immediately project")).toBeLessThan(phases[3].indexOf("After projecting each Result, make a fresh Router-owned decision"));
    expect(phases[3].indexOf("Immediately project")).toBeLessThan(phases[3].indexOf("Verify a Wave gate separately from item completion"));
    expect(phases[3].indexOf("Verify a Wave gate separately from item completion")).toBeLessThan(phases[3].indexOf("before releasing only its explicitly dependent work"));
    // A1-A10 / D1-D6: generated instruction evidence, not model conformance.
    const authorityText = phases[0] + phases[2];
    const authorityCases =
    [
      [
        "A1 / D1",
        [
          "reuse (adequate",
          "update (",
          "create (missing required authority",
          "skip (no change needed or not applicable)",
          "blocked (unresolved coverage, ownership, evidence, permission, or intent)",
          "owning boundary, existing or intended path",
          "one-sentence evidence-backed reason"
        ]
      ],
      [
        "A2 / D4",
        [
          "same owner or decision identity"
        ]
      ],
      [
        "A3 / D1+D4",
        [
          "distinct accepted ADR lifecycle",
          "Unknown ownership is unresolved; intended outputs are not readable references"
        ]
      ],
      [
        "A4 / D4+D6",
        [
          "unaccepted choice as an accepted ADR",
          "evidence and gaps for Router-owned communication"
        ]
      ],
      [
        "A5 / D5",
        [
          "without a new ADR, Spec, Plan, or repeat approval of unchanged confirmed work",
          "Assessment supplies neither writing permission nor implementation confirmation"
        ]
      ],
      [
        "A6 / D2",
        [
          "missing, false, materially incomplete, or subject to an important unresolved coverage question",
          "primary, companion, or a conditionally required method",
          "Required reconciliation must be complete before dependent planning"
        ]
      ],
      [
        "A7 / D3",
        [
          "Reuse reliable assessment covering current scope, decisions, owners, and relevant authority versions",
          "material changes, contradictions, or important uncertainty require reassessment only of the affected portion"
        ]
      ],
      [
        "A8 / D2+D5",
        [
          "Settled evidence permits direct entry to a narrow owning writer without waiving assessment, authority, or authorization duties",
          "SDD is not the exclusive ADR entrance or a mandatory reload at every stage or Handler call"
        ]
      ],
      [
        "A10 / D6",
        [
          "Result/Waves/Todo",
          "current predicate"
        ]
      ]
    ];
    for (const [scenario, clauses] of authorityCases as [string, string[]][]) {
      for (const clause of clauses) expect(authorityText, scenario).toContain(clause);
    }
    expect(phases[0].indexOf("make the PRD, ADR, and Spec assessment visible")).toBeLessThan(phases[0].indexOf("express new behavior verifiably"));
    expect(phases[2].indexOf("use spec-driven-development through normal Skill loading")).toBeLessThan(phases[2].indexOf("select one domain primary Skill"));
    expect(phases[2]).toContain("missing domain evidence requires one delegated authority-assessment outcome, not Router domain reading or assessment");
    expect(phases[2]).toContain("without user questioning, dispatch, independent authority-writing/planning outcomes, continuation");
    // A9's standalone/current-input and planned confirmation/gate contrasts are checked above.
    for (const forbidden of ["Load SDD at every stage", "Create a new ADR for every change", "Assessment authorizes implementation"]) expect(authorityText).not.toContain(forbidden);
    // T1-T16 static instruction coverage only; no actual tool mutation or real Router model conformance.
    const cleanupCases = [
      ["T1", [
        "After applying a complete correlated terminal Result and completing the relevant gate and dependency judgment",
        "actively inspect cleanup before handing off to another current outcome, waiting, stopping, or making the final report",
        "When eligible stable targets and a suitable actually callable tool are proven, execute cleanup",
        "When no candidate qualifies or required identity",
      ]],
      ["T2", [
        "A summary or backend terminal status, or an absent, incomplete, uncorrelatable, conflicting, or unapplied Result, cannot justify deletion, completion, or dependency release",
      ]],
      ["T3", [
        "Keep the current record while validation, verification, repair/review, a related user decision, or another coordination responsibility remains, even if its native status is completed",
        "Age or native status alone never qualifies a record",
      ]],
      ["T4", [
        "explicitly close or hand off the current role, retaining necessary evidence in the Result or an ordinary coordination explanation, before requalifying it",
      ]],
      ["T5", [
        "prove clear non-contradictory identity and required fields, an already applied complete correlated terminal Result",
        "no current, active, or unresolved role, and no pending dependency, gate, or confirmation still requiring the record",
        "Local deletion must cover only the exact eligible record or set",
        "preservation of every survivor's fields, relative order, and native status",
      ]],
      ["T6", [
        "Whole-group deletion requires every child and the container's own coordination role to qualify; completed children alone are insufficient",
      ]],
      ["T7", [
        "whole-group deletion must preserve other groups",
        "Full clear requires every record and container role to qualify, with no survivors",
        "Verify the return against that tool's actual contract before claiming exact deletion or full clear and survivor preservation",
      ]],
      ["T8", [
        "Inspect currently callable tools through their real schema, description, and known contract",
        "Prove exact selection granularity, atomic success and failure",
        "and return semantics",
        "Existing stable provider IDs, exact targets, safe filtering, or a single atomic lossless replacement may qualify under any tool name or provider",
        "neither packages/todo nor todo_remove is required",
        "a tool name, package installation, source code, or remembered convention proves no capability",
      ]],
      ["T9", [
        "A tool accepting arbitrary native statuses grants no permission to delete current, active, or unresolved work",
        "Keep partial, failed, and blocked truthful; they may qualify only after explicit resolution or closure of remaining responsibilities and all other proofs, without satisfying an unsatisfied dependent completion predicate",
      ]],
      ["T10", [
        "Do not emulate deletion by setting a reduced list and then transitioning survivors, rewrite statuses to enable deletion, hide UI, or invent an unavailable tool",
      ]],
      ["T11", [
        "Rejected, missing, ambiguous, invalid, or mixed-validity targets must leave the entire projection unchanged atomically",
        "Confirmed failure or rejection is not success",
        "Do not automatically retry failed or unknown cleanup",
      ]],
      ["T12", [
        "rule out concurrent changes to target qualification or contents, same-name recreation or retargeting, and replacement survivor-snapshot drift",
        "Use only an established serialized mutation boundary with stable identities or existing atomic identity/state checks that reject drift without mutation",
        "If stability or safe failure cannot be proven, retain affected records and explain the gap",
      ]],
      ["T13", [
        "an error, missing return, or unknown effect proves neither deletion nor absence of effects",
        "Do not automatically retry failed or unknown cleanup, reconstruct state, or delete further on that evidence",
        "Preserve remaining visible records and report the failed or uncertain effect concretely",
        "cleanup failure does not negate an otherwise completed work Result",
      ]],
      ["T14", [
        "Equivalent duplicate notifications must not repeat Result projection or dependency release, replay deletion, or delete a new same-name record",
        "After cleanup, restart, resume, or replay, uncertain correlation retains visible records; never manufacture identity from a name",
        "An orphan duplicate additionally requires an observable matching identity and non-canonical identity",
      ]],
      ["T15", [
        "On cancellation or changed direction, stop affected unlaunched work and first account for active work and completed effects, then perform this check",
        "Cancellation alone never qualifies unresolved or unlaunched records for deletion",
      ]],
      ["T16", [
        "retain affected Todos and explain the concrete limitation",
        "Report completed work separately from cleanup limitations",
        "Cleanup affects only the Todo projection: never call subagent_remove or delete or modify Results, sessions, manifests, or artifacts",
        "Do not add a capability registry, scheduler, receipt, persistence, new IDs, revision/CAS, or automatic status-driven deletion",
      ]],
    ] as const;
    for (const [, clauses] of cleanupCases) {
      for (const clause of clauses) expect(phases[3]).toContain(clause);
    }
    const cleanupOrder = [
      "read the complete Result",
      "Immediately project",
      "Verify a Wave gate separately from item completion",
      "Cleanup 1 - Checkpoint.",
      "Cleanup 2 - Qualify records.",
      "Cleanup 3 - Prove capability.",
      "Cleanup 4 - Prove stability.",
      "Cleanup 5 - Execute and verify.",
      "Cleanup 6 - Retain and report.",
      "After this checkpoint, independently decide",
    ].map((clause) => phases[3].indexOf(clause));
    expect(cleanupOrder.every((position) => position >= 0)).toBeTrue();
    expect(cleanupOrder).toEqual([...cleanupOrder].sort((a, b) => a - b));
    expect(phases[3].indexOf("explicitly close or hand off the current role")).toBeLessThan(phases[3].indexOf("For each candidate, prove"));
    for (const obsolete of ["remove only records proven stale", "Use todo_remove for cleanup", "require packages/todo", "setting a reduced list and then transitioning survivors is safe"]) {
      expect(phases[3]).not.toContain(obsolete);
    }
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
    const invocation = await resolver.execute("call-1", { handoff: { objective: "Inspect implementation.", primarySkill: "implement", context: [{ inline: "Supplied context.", purpose: "Boundary." }] }, admission: { path: "standalone", basis: ["Bounded."], verification: ["Check result."] }, reasoning: 1, impact: 2, delegate }, undefined, undefined, toolContext);
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
      const captured = await resolver.execute("raw-return", { handoff: { objective: "Check raw evidence.", primarySkill: "implement", context: [] }, admission: { path: "standalone", basis: ["Bounded."], verification: ["Check."] }, reasoning: 1, impact: 1, delegate }, undefined, undefined, toolContext);
      expect(captured.details.resolution.status).toBe("resolved");
      expect(captured.details.launch.rawReturn).toBe(rawReturn);
      expect(Object.keys(captured.details.launch)).toEqual(["tool", "rawReturn"]);
      const parsed = Bun.YAML.parse(captured.content![0].text) as any;
      expect(parsed.launch.rawReturn).toEqual(rawReturn);
      expect(Object.keys(parsed.launch).sort()).toEqual(["rawReturn", "tool"]);
      expect(parsed.launch).not.toHaveProperty("rawError");
      const beforeRender = captured.content![0].text;
      const theme = { fg: (_color: string, text: string) => text, bold: (text: string) => text };
      const preview = resolver.renderResult!(captured, { expanded: false, isPartial: false }, theme, {}).render(120).join("\n");
      expect(preview).toContain("raw return captured");
      expect(preview).not.toMatch(/launch error|completed|running|subagentId/);
      expect(resolver.renderResult!(captured, { expanded: true, isPartial: false }, theme, {}).render(120).join("\n")).toContain("subagentId:");
      expect(captured.content![0].text).toBe(beforeRender);
      expect(captured.details.launch.rawReturn).toBe(rawReturn);
    }
    for (const rawError of [new Error("Bridge failure"), { code: "transport_failure" }, undefined]) {
      let failedCalls = 0;
      const thrown = await resolver.execute("raw-error", { handoff: { objective: "Check error evidence.", primarySkill: "implement", context: [] }, admission: { path: "standalone", basis: ["Bounded."], verification: ["Check."] }, reasoning: 1, impact: 1, delegate }, undefined, undefined, {
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
    const unavailable = await tools.get("resolve_delegation")!.execute("call-2", { handoff: { objective: "Inspect.", primarySkill: "implement", context: [] }, admission: { path: "standalone", basis: ["Bounded."], verification: ["Check."] }, reasoning: 1, impact: 1, delegate }, undefined, undefined, toolContext);
    expect(unavailable.details.resolution).toMatchObject({ status: "blocked", code: "unavailable_candidate" });

    candidates = { status: "ready", candidates: [{ provider: "test", modelId: "reasoning/model", thinking: "medium", reasoning: 1, impact: 1 }] };
    await before!(event([skill("implement")]), context(modelRegistry));
    const insufficient = await tools.get("resolve_delegation")!.execute("call-3", { handoff: { objective: "Inspect.", primarySkill: "implement", context: [] }, admission: { path: "standalone", basis: ["Bounded."], verification: ["Check."] }, reasoning: 2, impact: 2, delegate }, undefined, undefined, toolContext);
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
    expect(registered).toBe(2);
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
    expect(registered).toBe(2);
    expect(active).toEqual(["read", "resolve_delegation"]);
  });
  test("blocks duplicate raw default settings before Registry access or Resolver activation", async () => {
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
      let resolver: RegisteredTool | undefined;
      const pi = {
        on(name: string, handler: BeforeHandler) { if (name === "before_agent_start") before = handler; },
        registerCommand() {},
        registerTool(tool: RegisteredTool) { registrations++; resolver = tool; },
        getActiveTools: () => [...active],
        setActiveTools(names: string[]) { active = [...names]; },
      } as unknown as ExtensionAPI;
      activateHarness(pi, undefined, async () => {});
      const result = await before!(event([skill("implement")]), { ...context({ getAvailable: () => { registryReads++; return []; } }), cwd });
      expectSingleCallPrompt((result as { systemPrompt: string }).systemPrompt);
      expect(result).toMatchObject({ systemPrompt: expect.stringContaining("Pi settings could not be read") });
      expect(active).toEqual(["read"]);
      expect(registrations).toBe(1);
      expect(resolver?.defaultActive).toBeFalse();
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
    let firstResolver: RegisteredTool | undefined;
    const pi = {
      on(name: string, handler: BeforeHandler) { if (name === "before_agent_start") before = handler; },
      registerCommand() {}, registerTool(tool: RegisteredTool) { registered++; firstResolver ??= tool; },
      getActiveTools: () => [...active], setActiveTools(names: string[]) { active = [...names]; },
    } as unknown as ExtensionAPI;
    let candidates: HarnessCandidates = { status: "ready", candidates: [] };
    activateHarness(pi, () => candidates, async () => {});
    const prompt = await before!(event([skill("research")]), context({ getAvailable: () => [] })) as { systemPrompt: string };
    expect(active).toEqual(["read"]);
    expect(registered).toBe(1);
    expect(firstResolver?.defaultActive).toBeFalse();
    expect(prompt.systemPrompt).toContain("No candidate is configured");
    expectSingleCallPrompt(prompt.systemPrompt);
    expect(prompt.systemPrompt).toContain("If absent, hidden, unreadable, incomplete, or conflicting, block new delegation");
    expect(prompt.systemPrompt).toContain("still safely retrieve and project existing Results");
    expect(prompt.systemPrompt).not.toContain("<name>delegation-strategy</name>");
    candidates = { status: "ready", candidates: [{ provider: "p", modelId: "m", thinking: "off", reasoning: 0, impact: 0 }] };
    const noVisibleSkills = await before!(event([skill("hidden", true)]), context({ getAvailable: () => [] })) as { systemPrompt: string };
    expectSingleCallPrompt(noVisibleSkills.systemPrompt);
    expect(active).toEqual(["read"]);
    expect(registered).toBe(1);
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

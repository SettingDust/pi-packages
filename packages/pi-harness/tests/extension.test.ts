import { describe, expect, test } from "bun:test";
import type {
  BeforeAgentStartEvent,
  ExtensionAPI,
  ExtensionContext,
  Skill,
} from "@earendil-works/pi-coding-agent";
import activateHarness from "../extensions/pi-harness.js";
import type { HarnessRoles } from "../src/index.js";

type BeforeHandler = (
  event: BeforeAgentStartEvent,
  ctx: ExtensionContext,
) => unknown | Promise<unknown>;

type RegisteredTool = {
  name: string;
  parameters: unknown;
  renderCall?: (
    args: any,
    theme: any,
    context: any,
  ) => { render(width: number): string[] };
  execute(
    toolCallId: string,
    params: unknown,
    signal: AbortSignal | undefined,
    onUpdate: undefined,
    ctx: ExtensionContext,
  ): Promise<{ details?: unknown }>;
};

function skill(name: string, disableModelInvocation = false): Skill {
  return {
    name,
    description: `${name} method`,
    filePath: `/skills/${name}/SKILL.md`,
    baseDir: `/skills/${name}`,
    sourceInfo: { source: "test", scope: "project", path: `/skills/${name}/SKILL.md` },
    disableModelInvocation,
  } as Skill;
}

function event(skills: Skill[], customPrompt?: string): BeforeAgentStartEvent {
  return {
    type: "before_agent_start",
    prompt: "Implement the change",
    systemPrompt: customPrompt === undefined ? "default Pi prompt" : `${customPrompt}\nCurrent working directory: /workspace`,
    systemPromptOptions: { cwd: "/workspace", skills, ...(customPrompt === undefined ? {} : { customPrompt }) },
  };
}

function context(): ExtensionContext {
  return {
    cwd: process.cwd(),
    isProjectTrusted: () => false,
    modelRegistry: { getAvailable: () => [] },
  } as unknown as ExtensionContext;
}

function expectClosedObject(schema: unknown): Record<string, unknown> {
  expect(schema).toMatchObject({ type: "object", additionalProperties: false });
  return (schema as { properties: Record<string, unknown> }).properties;
}

function expectClosedResolverSchema(schema: unknown): void {
  const root = expectClosedObject(schema);
  const handoff = expectClosedObject(root.handoff);
  const contextSchemas = (handoff.context as { items: { anyOf: unknown[] } }).items.anyOf;
  expect(contextSchemas).toHaveLength(2);
  contextSchemas.forEach(expectClosedObject);
  const admissionSchemas = (root.admission as { anyOf: unknown[] }).anyOf;
  expect(admissionSchemas).toHaveLength(2);
  admissionSchemas.forEach(expectClosedObject);
  const plannedSchema = admissionSchemas.find((candidate) => (candidate as { properties?: { path?: { const?: string } } }).properties?.path?.const === "planned");
  expect(plannedSchema).toBeDefined();
  expectClosedObject(expectClosedObject(plannedSchema).authority);
}

describe("Pi Harness Extension", () => {
  test("replaces only the standard main prompt and refreshes the resolver schema", async () => {
    let before: BeforeHandler | undefined;
    let command: ((args: string, ctx: unknown) => Promise<void>) | undefined;
    let configured = false;
    let active = ["read"];
    const tools = new Map<string, RegisteredTool>();
    const pi = {
      on(name: string, handler: BeforeHandler) {
        if (name === "before_agent_start") before = handler;
      },
      registerCommand(name: string, definition: { handler: (args: string, ctx: unknown) => Promise<void> }) {
        if (name === "harness") command = definition.handler;
      },
      registerTool(tool: RegisteredTool) {
        tools.set(tool.name, tool);
      },
      getActiveTools: () => [...active],
      setActiveTools(names: string[]) {
        active = [...names];
      },
    } as unknown as ExtensionAPI;
    let roles: HarnessRoles = {
      status: "ready",
      roles: [{
        name: "standard",
        description: "Normal bounded work.",
        model: "test/reasoning",
        thinking: "medium",
        available: true,
      }],
    };
    const loadRoles = () => roles;

    activateHarness(pi, loadRoles, async () => { configured = true; });
    expect(before).toBeDefined();
    expect(command).toBeDefined();
    await command!("config", context());
    expect(configured).toBeTrue();
    const first = await before!(event([skill("research"), skill("hidden", true)]), context()) as { systemPrompt: string };
    expect(first.systemPrompt).toStartWith("You are the Pi Harness Router.");
    expect(first.systemPrompt).not.toContain("default Pi prompt");
    expect(first.systemPrompt).toContain("research");
    expect(first.systemPrompt).toContain("when calling subagent_spawn, always pass agent: \"handler\"");
    expect(first.systemPrompt).toContain("derive one concise canonical ASCII taskSlug");
    expect(first.systemPrompt).toContain("taskSlug is an invocation field, not a Handoff or Resolver field");
    expect(first.systemPrompt).toContain("separate human-readable label");
    expect(first.systemPrompt).not.toContain("hidden method");
    expect(first.systemPrompt).toContain("create the complete main-session coordination set immediately");
    expect(first.systemPrompt).toContain("disclose the exact selected Work/Plan/Tasks tuple and obtain one current-user confirmation before the first planned resolve");
    expect(first.systemPrompt).toContain("Later resolves may continue without repeated confirmation while that exact plan remains unchanged");
    expect(first.systemPrompt).toContain("Any substantive deviation requires redisclosure of the exact tuple and renewed current-user confirmation");
    expect(first.systemPrompt).toContain("do not require confirmation before every resolve");
    const order = [
      "create the complete main-session coordination set immediately",
      "Before every coordination action, project its Todo item as in_progress",
      "resolve_delegation and the required subagent_spawn call",
      "After every terminal Handler Result notification, immediately project its status truthfully",
      "Release dependencies only after that terminal projection, then schedule newly unblocked outcomes",
      "The current capability is ambiguous, stale, incompatible, unknown, or nonpositive unless proven otherwise",
      "use serial fallback",
    ].map((phrase) => first.systemPrompt.indexOf(phrase));
    expect(order.every((index) => index >= 0)).toBeTrue();
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(first.systemPrompt).toContain("Before every coordination action, project its Todo item as in_progress");
    expect(first.systemPrompt).toContain("After every terminal Handler Result notification, immediately project its status truthfully as completed, partial, failed, or blocked");
    expect(first.systemPrompt).toContain("If resolve_delegation, environment adaptation, or the required subagent_spawn fails before Handler start");
    expect(first.systemPrompt).toContain("preserve the failure details through the existing descriptive/message surfaces");
    expect(first.systemPrompt).toContain("do not release dependencies as completed");
    expect(first.systemPrompt).toContain("Release dependencies only after that terminal projection, then schedule newly unblocked outcomes");
    expect(first.systemPrompt).toContain("An identifiable equivalent duplicate or resend is idempotent");
    expect(first.systemPrompt).toContain("Malformed, structurally different, or conflicting input fails closed");
    expect(first.systemPrompt).toContain("clean up only a Todo proven stale");
    expect(first.systemPrompt).toContain("use serial fallback");
    expect(first.systemPrompt).toContain("Dependencies, shared files, ownership, authority, and behavioral conflicts always serialize");
    for (const status of ["completed", "partial", "failed", "blocked"]) {
      expect(first.systemPrompt).toContain(status);
    }
    for (const retained of ["false", "missing", "unknown", "contradictory"]) {
      expect(first.systemPrompt).toContain(retained);
    }
    expect(first.systemPrompt).toContain("Never delete pending, in_progress, active, current, or unresolved work");
    expect(first.systemPrompt).toContain("Serialize actions that touch any shared Router Todo, correlation, or notification state");
    expect(first.systemPrompt).toContain("Never mutate Git or its index during parallel scheduling");
    expect(first.systemPrompt).toContain("call subagent_remove, or delete or modify Results, sessions, manifests, or produced artifacts");
    expect(active).toEqual(["read", "resolve_delegation"]);

    const resolver = tools.get("resolve_delegation");
    expect(resolver).toBeDefined();
    expectClosedResolverSchema(resolver!.parameters);
    const firstSchema = JSON.stringify(resolver!.parameters);
    expect(firstSchema).toContain("research");
    expect(firstSchema).not.toContain("hidden");
    expect(firstSchema).toContain("standard");

    const rendered = resolver!.renderCall!(
      {
        handoff: {
          objective: "Inspect the current implementation.",
          primarySkill: "research",
          companionSkills: ["review-evidence"],
          context: [],
        },
        modelRole: "standard",
      },
      { fg: (_color: string, text: string) => text, bold: (text: string) => text },
      {},
    ).render(120).join("\n");
    expect(rendered).toContain("resolve_delegation  standard");
    expect(rendered).toContain("Inspect the current implementation.");
    expect(rendered).toContain("research + review-evidence");

    const invocation = await resolver!.execute(
      "call-1",
      {
        handoff: {
          objective: "Inspect the current implementation.",
          primarySkill: "research",
          context: [{ inline: "Use only supplied context.", purpose: "Scope boundary." }],
        },
        admission: { path: "atomic", basis: ["The inspection is bounded."], verification: ["Validate the resolver result."] },
        modelRole: "standard",
      },
      undefined,
      undefined,
      context(),
    );
    expect(invocation.details).toMatchObject({
      status: "resolved",
      model: "test/reasoning",
      thinking: "medium",
    });
    expect(invocation.details).not.toHaveProperty("taskSlug");
    expect(JSON.stringify(resolver!.parameters)).not.toContain("taskSlug");

    await before!(event([skill("implement")]), context());
    const secondSchema = JSON.stringify(tools.get("resolve_delegation")!.parameters);
    expect(secondSchema).toContain("implement");
    expect(secondSchema).not.toContain("research");

    expect(await before!(event([skill("implement")], "# Pi Harness Handler"), context())).toBeUndefined();
    expect(active).toEqual(["read"]);
    expect(await before!(event([skill("implement")], "# Other Agent"), context())).toBeUndefined();
    expect(active).toEqual(["read"]);

    roles = { status: "blocked", message: "bad harness settings" };
    const blocked = await before!(event([skill("implement")]), context()) as { systemPrompt: string };
    expect(active).toEqual(["read"]);
    expect(blocked.systemPrompt).toContain("bad harness settings");
  });
});

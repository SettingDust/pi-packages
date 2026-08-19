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
    expect(first.systemPrompt).toContain("When calling subagent_spawn, always pass agent: \"handler\"");
    expect(first.systemPrompt).toContain("derive one concise canonical ASCII taskSlug");
    expect(first.systemPrompt).toContain("taskSlug is an invocation field, not a Handoff or Resolver field");
    expect(first.systemPrompt).toContain("separate human-readable label");
    expect(first.systemPrompt).not.toContain("hidden method");
    expect(active).toEqual(["read", "resolve_delegation"]);

    const resolver = tools.get("resolve_delegation");
    expect(resolver).toBeDefined();
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

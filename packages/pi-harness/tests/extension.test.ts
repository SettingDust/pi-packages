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

function event(skills: Skill[]): BeforeAgentStartEvent {
  return {
    type: "before_agent_start",
    prompt: "Implement the change",
    systemPrompt: "default Pi prompt",
    systemPromptOptions: { cwd: "/workspace", skills },
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
  test("replaces the Router prompt and refreshes the resolver schema", async () => {
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
    expect(first.systemPrompt).not.toContain("hidden method");
    expect(active).toEqual(["read", "resolve_delegation"]);

    const resolver = tools.get("resolve_delegation");
    expect(resolver).toBeDefined();
    const firstSchema = JSON.stringify(resolver!.parameters);
    expect(firstSchema).toContain("research");
    expect(firstSchema).not.toContain("hidden");
    expect(firstSchema).toContain("standard");

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

    await before!(event([skill("implement")]), context());
    const secondSchema = JSON.stringify(tools.get("resolve_delegation")!.parameters);
    expect(secondSchema).toContain("implement");
    expect(secondSchema).not.toContain("research");

    roles = { status: "blocked", message: "bad harness settings" };
    const blocked = await before!(event([skill("implement")]), context()) as { systemPrompt: string };
    expect(active).toEqual(["read"]);
    expect(blocked.systemPrompt).toContain("bad harness settings");
  });
});

import { StringEnum, Type } from "@earendil-works/pi-ai";
import {
  defineTool,
  formatSkillsForPrompt,
  type BeforeAgentStartEvent,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadHarnessRoles } from "../src/config.js";
import { runHarnessConfig } from "../src/config-command.js";
import { resolveDelegation, type HarnessRoles, type ModelRole, type Resolution, type SkillSummary } from "../src/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const handlerPath = join(packageRoot, "agents", "handler.md");
const resolverName = "resolve_delegation";

type RoleLoader = typeof loadHarnessRoles;
type ConfigRunner = typeof runHarnessConfig;

export default function activateHarness(
  pi: ExtensionAPI,
  loadRoles: RoleLoader = loadHarnessRoles,
  configure: ConfigRunner = runHarnessConfig,
): void {
  pi.registerCommand("harness", {
    description: "Configure Pi Harness Model Roles",
    handler: async (args, ctx) => {
      if (args.trim() && args.trim() !== "config") {
        ctx.ui.notify("Usage: /harness config", "error");
        return;
      }
      await configure(ctx);
    },
  });

  pi.on("before_agent_start", (event, ctx) => {
    const skills = visibleSkills(event);
    const roles = currentRoles(ctx, loadRoles);
    refreshResolver(pi, skills, roles, loadRoles);

    return { systemPrompt: routerPrompt(event, roles) };
  });
}

function refreshResolver(
  pi: ExtensionAPI,
  skills: SkillSummary[],
  roles: HarnessRoles,
  loadRoles: RoleLoader,
): void {
  const availableRoles = roles.status === "ready" ? roles.roles.filter(({ available }) => available) : [];
  const active = pi.getActiveTools().filter((name) => name !== resolverName);
  if (skills.length === 0 || availableRoles.length === 0) {
    pi.setActiveTools(active);
    return;
  }

  pi.registerTool(createResolverTool(skills, availableRoles, loadRoles));
  pi.setActiveTools([...active, resolverName]);
}

function createResolverTool(skills: SkillSummary[], roles: ModelRole[], loadRoles: RoleLoader) {
  const skillName = StringEnum(skills.map(({ name }) => name));
  const roleName = StringEnum(roles.map(({ name }) => name));
  const roleDescriptions = roles.map(({ name, description }) => `${name}: ${description}`).join("\n");

  return defineTool({
    name: resolverName,
    label: "Resolve delegation",
    description: `Validate a Handler Handoff and resolve its invocation metadata. Available Model Roles:\n${roleDescriptions}`,
    parameters: Type.Object({
      handoff: Type.Object({
        objective: Type.String({ minLength: 1 }),
        primarySkill: skillName,
        companionSkills: Type.Optional(Type.Array(skillName, { default: [] })),
        context: Type.Array(
          Type.Union([
            Type.Object({ ref: Type.String({ minLength: 1 }), purpose: Type.String({ minLength: 1 }) }),
            Type.Object({ inline: Type.String({ minLength: 1 }), purpose: Type.String({ minLength: 1 }) }),
          ]),
        ),
        constraints: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
        deliverables: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
      }),
      modelRole: roleName,
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const current = currentRoles(ctx, loadRoles);
      const result: Resolution = current.status === "blocked"
        ? { status: "blocked", code: "invalid_config", message: current.message }
        : await resolveDelegation(params, {
            skills,
            roles: current.roles,
            cwd: ctx.cwd,
            handlerPath,
          });
      return { content: [{ type: "text", text: Bun.YAML.stringify(result) }], details: result };
    },
  });
}

function visibleSkills(event: BeforeAgentStartEvent): SkillSummary[] {
  return (event.systemPromptOptions.skills ?? [])
    .filter((skill) => !skill.disableModelInvocation)
    .map(({ name, description }) => ({ name, description }));
}

function currentRoles(
  ctx: Pick<ExtensionContext, "cwd" | "isProjectTrusted" | "modelRegistry">,
  loadRoles: RoleLoader,
): HarnessRoles {
  return loadRoles(ctx.cwd, ctx.isProjectTrusted(), ctx.modelRegistry.getAvailable());
}

function routerPrompt(event: BeforeAgentStartEvent, roles: HarnessRoles): string {
  const loadedSkills = (event.systemPromptOptions.skills ?? []).filter((skill) => !skill.disableModelInvocation);
  const roleStatus = roles.status === "blocked"
    ? `Pi Harness configuration error: ${roles.message}`
    : roles.roles.some(({ available }) => available)
      ? "Use resolve_delegation whenever substantive project-domain work is required."
      : "No usable Model Role is configured under Pi settings key harness.roles. Explain the block instead of doing project-domain work.";

  return `You are the Pi Harness Router. You coordinate work but do not perform substantive project-domain reading, research, editing, execution, or independent verification yourself.

You may respond directly only to clarify intent, ask for a decision or authorization, summarize existing Handler Results, explain a block, escalate risk, or report completion. For substantive work, select one primary Skill, optional companion Skills, a Model Role, and the smallest sufficient Handoff context, then call resolve_delegation. Primary and companion are relationships for this Handoff only. After resolution, adapt the returned Handler metadata and YAML prompt to a compatible environment delegation tool. Never invent a backend or execute the Handler's work yourself.

${roleStatus}

Current model-visible Skills:
${formatSkillsForPrompt(loadedSkills) || "(none)"}`;
}

import { StringEnum, Type } from "@earendil-works/pi-ai";
import {
  defineTool,
  formatSkillsForPrompt,
  type BeforeAgentStartEvent,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { loadHarnessRoles } from "../src/config.js";
import { runHarnessConfig } from "../src/config-command.js";
import { resolveDelegation, type HarnessRoles, type ModelRole, type Resolution, type SkillSummary } from "../src/index.js";

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
    if (event.systemPromptOptions.customPrompt !== undefined) {
      pi.setActiveTools(pi.getActiveTools().filter((name) => name !== resolverName));
      return;
    }

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
            Type.Object({ ref: Type.String({ minLength: 1 }), purpose: Type.String({ minLength: 1 }) }, { additionalProperties: false }),
            Type.Object({ inline: Type.String({ minLength: 1 }), purpose: Type.String({ minLength: 1 }) }, { additionalProperties: false }),
          ]),
        ),
        constraints: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
        deliverables: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
      }, { additionalProperties: false }),
      admission: Type.Union([
        Type.Object({
          path: Type.Literal("atomic"),
          basis: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
          verification: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
        }, { additionalProperties: false }),
        Type.Object({
          path: Type.Literal("planned"),
          authority: Type.Object({
            work: Type.String({ minLength: 1 }),
            plan: Type.String({ minLength: 1 }),
            tasks: Type.String({ minLength: 1 }),
          }, { additionalProperties: false }),
        }, { additionalProperties: false }),
      ]),
      modelRole: roleName,
    }, { additionalProperties: false }),
    renderCall(args, theme, context) {
      const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
      const handoff = args.handoff as { objective?: string; primarySkill?: string; companionSkills?: string[] } | undefined;
      const selectedSkills = [handoff?.primarySkill, ...(handoff?.companionSkills ?? [])].filter((name): name is string => Boolean(name));
      const lines = [
        `${theme.fg("toolTitle", theme.bold(resolverName))}${args.modelRole ? theme.fg("muted", `  ${args.modelRole}`) : ""}`,
        ...(handoff?.objective ? [theme.fg("dim", `  ${handoff.objective}`)] : []),
        ...(selectedSkills.length ? [theme.fg("muted", `  ${selectedSkills.join(" + ")}`)] : []),
      ];
      text.setText(lines.join("\n"));
      return text;
    },
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const current = currentRoles(ctx, loadRoles);
      const result: Resolution = current.status === "blocked"
        ? { status: "blocked", code: "invalid_config", message: current.message }
        : await resolveDelegation(params, {
            skills,
            roles: current.roles,
            cwd: ctx.cwd,
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
      ? "Use resolve_delegation whenever substantive project-domain work is required. Select atomic admission only with bounded basis and focused verification; select planned admission with exactly one Work/Plan/Tasks tuple bound to Handoff context."
      : "No usable Model Role is configured under Pi settings key harness.roles. Explain the block instead of doing project-domain work.";

  return `You are the Pi Harness Router. You coordinate work but do not perform substantive project-domain reading, research, editing, execution, or independent verification yourself.

You may respond directly only to clarify intent, ask for a decision or authorization, summarize existing Handler Results, explain a block, escalate risk, or report completion. For substantive work, select one primary Skill, optional companion Skills, a Model Role, and the smallest sufficient Handoff context, then call resolve_delegation. Primary and companion are relationships for this Handoff only. For bounded behavior-neutral work supply atomic basis and focused verification; for multi-step, coordination-heavy, architectural, security, migration, durable, or otherwise material work supply only the exact planned Work/Plan/Tasks selectors. Never supply receipt, digest, reviewer, session, or acceptance data. After resolution, derive one concise canonical ASCII taskSlug from the concrete Handoff objective and settled execution context: 3-48 lowercase letters or digits separated by single hyphens, without the reserved subagent- prefix. Adapt the returned YAML prompt and model settings to a compatible environment delegation tool; when calling subagent_spawn, always pass agent: "handler" with the resolved prompt, model, thinking, taskSlug, and a separate human-readable label. taskSlug is an invocation field, not a Handoff or Resolver field. Never pass a Handler path or body, invent a backend, or execute the Handler's work yourself.

For multi-step work, create the complete main-session coordination set immediately, with exactly one Todo item for each independently observable outcome. Use the current environment's writable and visible coordination mechanism: use native statuses and fields when they express the needed fact; otherwise preserve the closest truthful native status and record the semantic fact in an existing description, subject, or ordinary Router coordination message. Lack of an exact TaskCreate/TaskUpdate schema is not a blocker; only total absence of any writable and visible mechanism blocks coordination. Keep Todo records as Router workflow projections, never Handler input, Resolver state, backend lifecycle state, or a new persistent task database.
For planned multi-step work, disclose the exact selected Work/Plan/Tasks tuple and obtain one current-user confirmation before the first planned resolve. Later resolves may continue without repeated confirmation while that exact plan remains unchanged. Any substantive deviation requires redisclosure of the exact tuple and renewed current-user confirmation before continuing planned resolves; do not require confirmation before every resolve.


Before every coordination action, project its Todo item as in_progress. A coordination action includes resolving and launching delegated work, so the Todo update precedes resolve_delegation and the required subagent_spawn call. After every terminal Handler Result notification, immediately project its status truthfully as completed, partial, failed, or blocked when native states exist, or use the closest truthful native status plus the existing descriptive/message surfaces. Retain the atomic Result data and never mark partial, failed, or blocked as completed. Release dependencies only after that terminal projection, then schedule newly unblocked outcomes. Do not schedule or release work before the terminal update. If resolve_delegation, environment adaptation, or the required subagent_spawn fails before Handler start, immediately project the current Todo as failed or blocked according to the available evidence, preserve the failure details through the existing descriptive/message surfaces, and do not release dependencies as completed; make a fresh Router decision about the remaining work.

Correlate Results only with task/runtime identity and visible Result fields or messages already exposed by the environment. An identifiable equivalent duplicate or resend is idempotent: do not apply a second terminal update, release dependencies again, or schedule again. Malformed, structurally different, or conflicting input fails closed: preserve the first observable outcome, leave Todo status and dependencies unchanged, and report the conflict through an existing description, subject, or ordinary Router coordination message. When identity, equivalence, restart/replay safety, stale detection, or deletion cannot be established, retain the Todo and report the limitation. Serialize actions that touch any shared Router Todo, correlation, or notification state exposed by the environment. Do not add a queue, retry, join, wrapper, persistence, canonical Result digest, outbox, or exact-status shim.

At finalization, clean up only a Todo proven stale: its terminal Result was applied, no active execution remains, it is not current, no unresolved dependent outcome requires it, and every required field is known and non-contradictory. An orphan also needs an observable matching identity and non-canonical identity. Any false, missing, unknown, or contradictory term retains the Todo; age alone never qualifies. Never delete pending, in_progress, active, current, or unresolved work, call subagent_remove, or delete or modify Results, sessions, manifests, or produced artifacts.

Use parallel resolve-to-spawn chains only when the current Host/tool-call capability is positively proven and outcomes are independently verifiable with disjoint inputs, outputs, ownership, authority, and side effects. The current capability is ambiguous, stale, incompatible, unknown, or nonpositive unless proven otherwise, so use serial fallback. Dependencies, shared files, ownership, authority, and behavioral conflicts always serialize. Never mutate Git or its index during parallel scheduling; any Git mutation stays behind the existing serial Git boundary. In a serial fallback, complete the current resolved invocation and required spawn action before beginning the next outcome; do not imply a scheduler or parallel-launch guarantee. After each terminal Result, make a fresh Router decision about newly unblocked work. The Handler performs one delegated outcome and returns its normalized Result; it does not coordinate Todos or choose the next workflow action.

${roleStatus}

Current model-visible Skills:
${formatSkillsForPrompt(loadedSkills) || "(none)"}`;
}

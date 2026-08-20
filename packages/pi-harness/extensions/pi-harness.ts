import { StringEnum, Type } from "@earendil-works/pi-ai";
import {
  defineTool,
  formatSkillsForPrompt,
  type BeforeAgentStartEvent,
  type ExtensionAPI,
  type ExtensionContext,
  type SessionShutdownEvent,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { loadHarnessRoles } from "../src/config.js";
import { runHarnessConfig } from "../src/config-command.js";
import { ReceiptRegistry, type AcceptanceReceipt, type PlannedSubject } from "../src/admission.js";
import { resolveDelegation, type BlockedResolution, type HarnessRoles, type ModelRole, type PlannedAdmission, type Resolution, type SkillSummary } from "../src/index.js";

const resolverName = "resolve_delegation";

type RoleLoader = typeof loadHarnessRoles;
type ConfigRunner = typeof runHarnessConfig;

export default function activateHarness(
  pi: ExtensionAPI,
  loadRoles: RoleLoader = loadHarnessRoles,
  configure: ConfigRunner = runHarnessConfig,
): void {
  const receipts = new ReceiptRegistry();

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

  pi.on("session_start", (_event, ctx) => {
    receipts.bind(ctx.sessionManager.getSessionId());
  });
  pi.on("session_shutdown", (_event: SessionShutdownEvent) => {
    receipts.clear();
  });
  pi.on("before_agent_start", (event, ctx) => {
    if (event.systemPromptOptions.customPrompt !== undefined) {
      pi.setActiveTools(pi.getActiveTools().filter((name) => name !== resolverName));
      return;
    }

    const skills = visibleSkills(event);
    const roles = currentRoles(ctx, loadRoles);
    refreshResolver(pi, skills, roles, loadRoles, receipts);

    return { systemPrompt: routerPrompt(event, roles) };
  });
}

function refreshResolver(
  pi: ExtensionAPI,
  skills: SkillSummary[],
  roles: HarnessRoles,
  loadRoles: RoleLoader,
  receipts: ReceiptRegistry,
): void {
  const availableRoles = roles.status === "ready" ? roles.roles.filter(({ available }) => available) : [];
  const active = pi.getActiveTools().filter((name) => name !== resolverName);
  if (skills.length === 0 || availableRoles.length === 0) {
    pi.setActiveTools(active);
    return;
  }

  pi.registerTool(createResolverTool(skills, availableRoles, loadRoles, receipts));
  pi.setActiveTools([...active, resolverName]);
}

function createResolverTool(skills: SkillSummary[], roles: ModelRole[], loadRoles: RoleLoader, receipts: ReceiptRegistry) {
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
      admission: Type.Union([
        Type.Object({
          path: Type.Literal("atomic"),
          basis: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
          verification: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
        }),
        Type.Object({
          path: Type.Literal("planned"),
          authority: Type.Object({
            work: Type.String({ minLength: 1 }),
            plan: Type.String({ minLength: 1 }),
            tasks: Type.String({ minLength: 1 }),
          }),
        }),
      ]),
      modelRole: roleName,
    }),
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
            admitPlanned: async (subject, admission, recompute) => {
              receipts.bind(ctx.sessionManager.getSessionId());
              return admitPlanned(subject, admission, recompute, ctx, receipts);
            },
          });
      return { content: [{ type: "text", text: Bun.YAML.stringify(result) }], details: result };
    },
  });
}

export async function admitPlanned(
  subject: PlannedSubject,
  admission: PlannedAdmission,
  recompute: () => Promise<PlannedSubject>,
  ctx: ExtensionContext,
  receipts: ReceiptRegistry,
): Promise<BlockedResolution | undefined> {
  let queuedSubject = subject;
  for (;;) {
    const result = await receipts.runExclusive(queuedSubject.authorityPathTuple, async (isCurrent) => {
      let current: PlannedSubject;
      try {
        current = await recompute();
      } catch (error) {
        return { kind: "done" as const, value: blocked("authority_drift", `The planned subject could not be revalidated: ${error instanceof Error ? error.message : "unknown error"}`) };
      }
      if (current.authorityPathTuple !== queuedSubject.authorityPathTuple) return { kind: "retry" as const, subject: current };
      return { kind: "done" as const, value: await admitPlannedTransaction(current, admission, recompute, ctx, receipts, isCurrent) };
    });
    if (!result.completed) return blocked("review_required", "Planned admission was reset before its current-session transaction completed");
    if (result.value.kind === "retry") {
      queuedSubject = result.value.subject;
      continue;
    }
    return result.value.value;
  }
}


export async function admitPlannedTransaction(
  subject: PlannedSubject,
  admission: PlannedAdmission,
  recompute: () => Promise<PlannedSubject>,
  ctx: ExtensionContext,
  receipts: ReceiptRegistry,
  isCurrent: () => boolean,
): Promise<BlockedResolution | undefined> {
  const initial = receipts.lookup(subject);
  if (initial.kind === "corrupt") return blocked("receipt_corrupt", initial.message);
  if (initial.kind === "accepted") return undefined;
  const prior = receipts.prior(subject);
  if (prior.kind === "corrupt") return blocked("receipt_corrupt", prior.message);
  const predecessor = prior.kind === "accepted" ? prior.acceptance : undefined;
  const interactive = ctx.mode === "tui" && ctx.hasUI === true;

  if (initial.kind === "review") {
    if (!interactive) return blocked("acceptance_required", "Current D2 review exists, but dialog-capable TUI is required for D3 acceptance");
    if (!await confirm(ctx, "Accept planned delegation", subjectMessage(subject))) {
      return blocked("acceptance_required", "D3 acceptance was declined; confirm the exact current subject to continue");
    }
    const current = await checkedSubject(recompute, subject);
    if (current.error) return current.error;
    if (!isCurrent()) return blocked("acceptance_required", "The active session changed during planned admission");
    receipts.recordAcceptance(subject, initial.review, predecessor ? "bounded-amendment" : "explicit", predecessor);
    return finalRecheck(recompute, subject, isCurrent);
  }

  if (predecessor && predecessor.authorityPathTuple === subject.authorityPathTuple) {
    if (!interactive) return blocked("review_required", "A changed planned subject requires bounded authorization in a dialog-capable TUI");
    const approved = await confirm(ctx, "Authorize bounded amendment", amendmentMessage(predecessor, subject));
    if (!approved) return blocked("amendment_invalidated", "Bounded authorization was declined or not granted for the changed subject");
    const afterAmendment = await checkedSubject(recompute, subject);
    if (afterAmendment.error) return afterAmendment.error;
    if (!isCurrent()) return blocked("review_required", "The active session changed during bounded amendment authorization");
  }

  if (!interactive) return blocked("review_required", "Planned admission requires a dialog-capable TUI review");
  if (!await confirm(ctx, "Review planned delegation", subjectMessage(subject))) {
    return blocked("review_required", "D2 review was declined; confirm the exact current authority and normalized Handoff subject to continue");
  }
  if (!isCurrent()) return blocked("review_required", "The active session changed during planned admission");
  const review = receipts.recordReview(subject);
  const afterReview = await checkedSubject(recompute, subject);
  if (afterReview.error) return afterReview.error;
  if (!await confirm(ctx, "Accept planned delegation", subjectMessage(subject))) {
    return blocked("acceptance_required", "D3 acceptance was declined; confirm the exact current subject to continue");
  }
  const afterAcceptance = await checkedSubject(recompute, subject);
  if (afterAcceptance.error) return afterAcceptance.error;
  if (!isCurrent()) return blocked("acceptance_required", "The active session changed during planned admission");
  receipts.recordAcceptance(subject, review, predecessor ? "bounded-amendment" : "explicit", predecessor);
  return finalRecheck(recompute, subject, isCurrent);
}

async function confirm(ctx: ExtensionContext, title: string, message: string): Promise<boolean> {
  try {
    return await ctx.ui.confirm(title, message);
  } catch {
    return false;
  }
}

async function checkedSubject(recompute: () => Promise<PlannedSubject>, expected: PlannedSubject): Promise<{ error?: BlockedResolution }> {
  try {
    const current = await recompute();
    return current.subjectSha256 === expected.subjectSha256 ? {} : { error: blocked("authority_drift", "The planned authority or normalized Handoff changed during admission; review and accept the current subject again") };
  } catch (error) {
    return { error: blocked("authority_drift", `The planned subject could not be revalidated: ${error instanceof Error ? error.message : "unknown error"}`) };
  }
}

async function finalRecheck(recompute: () => Promise<PlannedSubject>, expected: PlannedSubject, isCurrent: () => boolean): Promise<BlockedResolution | undefined> {
  const result = await checkedSubject(recompute, expected);
  if (result.error) return result.error;
  return isCurrent() ? undefined : blocked("acceptance_required", "The active session changed during planned admission");
}

function subjectMessage(subject: PlannedSubject): string {
  return [
    `Work: ${subject.work.path} (${subject.work.sha256})`,
    `Plan: ${subject.plan.path} (${subject.plan.sha256})`,
    `Tasks: ${subject.tasks.path} (${subject.tasks.sha256})`,
    `Set: ${subject.setSha256}`,
    `Handoff: ${subject.handoffSha256}`,
    `Subject: ${subject.subjectSha256}`,
  ].join("\n");
}

function amendmentMessage(prior: AcceptanceReceipt, subject: PlannedSubject): string {
  return `The same authority tuple changed. Does the new subject remain within the previously accepted scope, architecture, dependencies, risk, behavior, and acceptance criteria?\n\nPrevious: ${prior.subjectSha256}\nCurrent:\n${subjectMessage(subject)}`;
}

function blocked(code: BlockedResolution["code"], message: string): BlockedResolution {
  return { status: "blocked", code, message };
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

You may respond directly only to clarify intent, ask for a decision or authorization, summarize existing Handler Results, explain a block, escalate risk, or report completion. For substantive work, select one primary Skill, optional companion Skills, a Model Role, and the smallest sufficient Handoff context, then call resolve_delegation. Primary and companion are relationships for this Handoff only. For bounded behavior-neutral work supply atomic basis and focused verification. For multi-step, coordination-heavy, architectural, security, migration, durable, or otherwise material work supply only the exact planned Work/Plan/Tasks selectors. Never supply receipt, digest, reviewer, session, or acceptance data. After resolution, derive one concise canonical ASCII taskSlug from the concrete Handoff objective and settled execution context: 3-48 lowercase letters or digits separated by single hyphens, without the reserved subagent- prefix. Adapt the returned YAML prompt and model settings to a compatible environment delegation tool. When calling subagent_spawn, always pass agent: "handler" with the resolved prompt, model, thinking, taskSlug, and a separate human-readable label. taskSlug is an invocation field, not a Handoff or Resolver field. Never pass a Handler path or body, invent a backend, or execute the Handler's work yourself.

${roleStatus}

Current model-visible Skills:
${formatSkillsForPrompt(loadedSkills) || "(none)"}`;
}

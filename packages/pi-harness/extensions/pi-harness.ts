import { Type } from "@earendil-works/pi-ai";
import {
  defineTool,
  formatSkillsForPrompt,
  type BeforeAgentStartEvent,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { loadHarnessCandidates, type HarnessCandidates } from "../src/config.js";
import { runHarnessConfig } from "../src/config-command.js";
import { resolveDelegation, type Resolution, type SkillSummary } from "../src/index.js";

const resolverName = "resolve_delegation";

type CandidateLoader = typeof loadHarnessCandidates;
type ConfigRunner = typeof runHarnessConfig;

export default function activateHarness(
  pi: ExtensionAPI,
  loadCandidates: CandidateLoader = loadHarnessCandidates,
  configure: ConfigRunner = runHarnessConfig,
): void {
  pi.registerCommand("harness", {
    description: "Configure Pi Harness Candidates",
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
    const candidates = currentCandidates(ctx, loadCandidates);
    refreshResolver(pi, skills, candidates, loadCandidates);

    return { systemPrompt: routerPrompt(event, candidates) };
  });
}

function refreshResolver(
  pi: ExtensionAPI,
  skills: SkillSummary[],
  candidates: HarnessCandidates,
  loadCandidates: CandidateLoader,
): void {
  const active = pi.getActiveTools().filter((name) => name !== resolverName);
  if (skills.length === 0 || candidates.status !== "ready" || candidates.candidates.length === 0) {
    pi.setActiveTools(active);
    return;
  }

  pi.registerTool(createResolverTool(skills, loadCandidates));
  pi.setActiveTools([...active, resolverName]);
}

function createResolverTool(skills: SkillSummary[], loadCandidates: CandidateLoader) {
  const skillName = skills.length ? Type.Union(skills.map(({ name }) => Type.Literal(name))) : Type.String();
  const capability = (name: string) => Type.Integer({
    minimum: 0,
    description: `Minimum ${name} capability required for this delegation (0-3 is Router guidance).`,
  });

  return defineTool({
    name: resolverName,
    label: "Resolve delegation",
    description: "Validate a Handler Handoff and resolve its invocation metadata using semantic reasoning and impact requirements.",
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
      reasoning: capability("reasoning"),
      impact: capability("impact"),
    }, { additionalProperties: false }),
    renderCall(args, theme, context) {
      const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
      const handoff = args.handoff as { objective?: string; primarySkill?: string; companionSkills?: string[] } | undefined;
      const selectedSkills = [handoff?.primarySkill, ...(handoff?.companionSkills ?? [])].filter((name): name is string => Boolean(name));
      const requirements = [
        typeof args.reasoning === "number" ? `reasoning ${args.reasoning}` : "",
        typeof args.impact === "number" ? `impact ${args.impact}` : "",
      ].filter(Boolean).join(", ");
      const lines = [
        `${theme.fg("toolTitle", theme.bold(resolverName))}${requirements ? theme.fg("muted", `  ${requirements}`) : ""}`,
        ...(handoff?.objective ? [theme.fg("dim", `  ${handoff.objective}`)] : []),
        ...(selectedSkills.length ? [theme.fg("muted", `  ${selectedSkills.join(" + ")}`)] : []),
      ];
      text.setText(lines.join("\n"));
      return text;
    },
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const current = currentCandidates(ctx, loadCandidates);
      const result: Resolution = current.status === "blocked"
        ? { status: "blocked", code: current.code, message: current.message }
        : await resolveDelegation(params, {
            skills,
            candidates: current.candidates,
            modelRegistry: ctx.modelRegistry,
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

function currentCandidates(
  ctx: Pick<ExtensionContext, "cwd" | "isProjectTrusted">,
  loadCandidates: CandidateLoader,
): HarnessCandidates {
  return loadCandidates(ctx.cwd, ctx.isProjectTrusted());
}

function routerPrompt(event: BeforeAgentStartEvent, candidates: HarnessCandidates): string {
  const loadedSkills = (event.systemPromptOptions.skills ?? []).filter((skill) => !skill.disableModelInvocation);
  const candidateStatus = candidates.status === "blocked"
    ? `Pi Harness configuration error: ${candidates.message}`
    : candidates.candidates.length > 0
      ? "Use resolve_delegation for substantive project-domain work. The Resolver validates the Handoff and selects a candidate; it does not launch a Handler."
      : "No candidate is configured under Pi settings key harness.candidates. Explain the block instead of doing project-domain work.";

  return `You are the Pi Harness Router. You coordinate work but do not perform substantive project-domain reading, research, editing, execution, or independent verification yourself.

You may respond directly only to clarify intent, ask for a decision or authorization, summarize existing Handler Results, explain a block, escalate risk, or report completion. For substantive project-domain work, coordinate delegation; do not perform project-domain work yourself.

Phase 1 - Identify and present outcomes. Before choosing Skills, capability requests, Handoffs, or report packaging, identify each independently observable user-requested result and its verifiable completion predicate. Present the complete coordination set immediately for multi-step work using the existing visible Todo mechanism or an ordinary coordination message, one item per independently observable outcome; only total absence of a writable and visible coordination mechanism may block coordination. Keep three independent user requests as three outcomes and three terminal states even when the final report combines them. Inspect the complete objective, constraints, and deliverables as one semantic bundle: what one observable and verifiable terminal fact must be true for this Handler invocation to be complete? Multiple checks may support one outcome only when they are internal means or evidence sharing its terminal success, failure, retry or recovery, authorization, side-effect, audit, and state boundaries: reproducing, diagnosing, fixing, and checking one bug, or investigating alternatives for one comparison decision, can share one predicate when their checks are only internal evidence. A companion Skill must serve this same terminal predicate; companion status, action count, verb count, file count, or Skill count is not a decomposition rule. Separate any requested action with independently meaningful completion or failure, independently consumed Result or dependency, retry or recovery boundary, user-authorization or confirmation boundary, durable side effect or persistent state change, audit or compliance fact, or terminal state valuable to the user or Router on its own. One decisive independent boundary is sufficient, not a fixed step, deliverable, file, phase, Skill, or Handler-call count. A research conclusion is internal evidence when it only supports the same implementation predicate; a separately requested, retained, reviewed, or independently consumed implementation dependency is its own outcome. For example, official Scoop identity/version/hash/mapping can be internal evidence for one implementation predicate, but a requested identity audit is separate. Do not hide a second outcome in a Handoff.

Phase 2 - Select executable work. Select one executable outcome while retaining its user-request correspondence and dependency edges for required Results, inputs, authority, or valid execution. Project its Todo as in_progress immediately before its coordination action, using native statuses and fields where available, otherwise the closest truthful native status plus existing descriptions, subjects, or an ordinary Router message. Keep independently valuable outcomes distinct even when they write the same file; serialize conflicting writes against the latest state, as well as dependencies or conflicting inputs, outputs, ownership, authority, behavioral contracts, or side effects. Shared read-only sources alone do not conflict. Permit parallel resolve-to-spawn chains for independent, nonconflicting outcomes only when current Host/tool-call parallel capability is positively proven; unsupported, stale, incompatible, or ambiguous capability requires serial scheduling. When several independent outcomes are eligible for parallel dispatch, select and dispatch their own chains without waiting for an unrelated Handler Result; only decisions depending on a Result wait for its projection. Complete applicable planned Work/Plan/Tasks, disclose the exact selected Plan and decision-relevant authority in an ordinary message and obtain one current-user confirmation before planned delegation; re-disclose and reconfirm on substantive authority or Plan drift. Do not treat a Handoff as proof of acceptance. Keep confirmation for irreversible or externally high-impact actions at the applicable action-executor boundary.

Phase 3 - Resolve and delegate the selected outcome. For substantive work, select one primary Skill and optional companion Skills for this Handoff only, then assign the least sufficient finite non-negative reasoning and impact requirements from the concrete work before calling resolve_delegation. Treat reasoning and impact as independent axes: never combine them into a total score, weighted score, priority, or phase level. Judge the concrete objective, ambiguity, reasoning needed for correctness, verification burden, and actual consequence. Common reasoning guidance is 0 for mechanical work with clear boundaries and low ambiguity; 1 for a small settled implementation or check, simple state reconciliation, or simple documentation reconciliation; 2 for ordinary Plan or Tasks work, independent review, or multi-file impact analysis; and 3 for final review involving architecture, security, migration, authority conflict, a complex root cause, or unusually difficult uncertainty. Ordinary Plan, Tasks, and independent review work normally require at least reasoning 2 because of the concrete reasoning and verification burden, not because of a Skill name, document type, or planning/review phase; a simple mechanical reconciliation may remain 1. Common impact guidance is 0 for local, reversible work without external impact; 1 for a consequence bounded to one module; 2 for cross-module or materially behavior/compatibility-affecting work; and 3 for high-consequence, hard-to-reverse, or security, data, or external-system risk. Planning or review does not automatically increase impact. The 0..3 values are common guidance, not a protocol range or upper bound; any finite non-negative integer is valid. These examples are not mappings to Skill names, document types, research phases, or implementation phases; make a fresh request from the concrete work. Provide the smallest sufficient Handoff context. Never put reasoning or impact inside Handoff. For bounded behavior-neutral work supply atomic basis and focused verification; for multi-step, coordination-heavy, architectural, security, migration, durable, or otherwise material work supply only the exact planned Work/Plan/Tasks selectors. Keep Handoff fields limited to objective, primarySkill, optional companionSkills, context, constraints, and deliverables; keep Handoff and admission shapes closed; never supply receipt, digest, reviewer, session, or acceptance data. After a resolved response and compatible delegate capability, immediately launch this outcome's Handler as the next environment action. Derive one concise canonical ASCII taskSlug from the concrete Handoff objective and settled execution context: 3-48 lowercase letters or digits separated by single hyphens, without the reserved subagent- prefix. Pass the returned prompt, model, and thinking exactly, without local selection, fallback, substitution, rewrite, or another Registry read. When calling subagent_spawn, always pass agent: \"handler\" with that resolved prompt, model, thinking, taskSlug, and a separate human-readable label. taskSlug is an invocation field, not a Handoff or Resolver field. Never pass a Handler path or body, invent a backend, or execute the Handler's work yourself. If resolution or delegate capability fails, report the block without spawning; the Resolver validates and resolves but does not interact, launch a Handler, or manage Todos.

Phase 4 - Receive and project Results. When a terminal Handler Result is already visible in the current Router context, read the complete Result, including its status, summary, report, and artifacts, and correlate it to the selected outcome. Visibility is input to Router judgment only; it does not prescribe or trigger a follow-up action. Immediately project completed, partial, blocked, or failed truthfully in the existing Todo; preserve completed, partial, blocked, and failed as distinct Handler Result input semantics, not fixed workflow-control instructions, using the closest truthful native status plus existing descriptive or message surfaces where needed. Never mark partial, blocked, or failed as completed. An observable equivalent duplicate notification is idempotent: do not update the Todo twice or release a dependency twice. If malformed, conflicting, or uncorrelatable, preserve the first semantic state, leave status and dependencies unchanged, and report the conflict. If Result context is missing, incomplete, malformed, or structurally ambiguous, fail closed: do not invent fields, status, identity, or outcome; do not dispatch or claim completion based on it. On restart or replay, reapply only when available identity and visible state make that safe; otherwise retain the Todo and report the limitation. When a Handler terminates without an adoptable Result, read the complete failure evidence and, only after confirming terminal execution, stable subagentId/generation, unchanged boundary and authority, replay safety, and no need for renewed authorization, prefer resuming that same execution. Never resume an active execution or one with a terminal Result; never silently replay completed durable side effects or independent outcomes. Otherwise make a fresh decision from the evidence. After projecting each Result, make a fresh Router-owned decision before releasing dependents or scheduling work that depends on it; release only satisfied dependencies. Independently decide whether to delegate another atomic outcome, delegate a review, ask for clarification or authorization, wait, stop, or report completion. Do not let the Handler choose continuation or collapse a non-completed Result into success. Retry only the failed outcome's boundary. A combined final report does not merge independent execution or completion states. Retain active or unresolved Todos; remove only records proven stale when the terminal Result was applied, identity and required fields are known and non-contradictory, and the record is neither current nor needed by unresolved dependents; otherwise retain and report the limitation. Never use subagent_remove for cleanup or delete Results, sessions, manifests, or artifacts. Do not add a hidden scheduler, queue, retry engine, fixed Result-to-Todo mapping, Handler continuation, or automatic dispatch.

${candidateStatus}

Current model-visible Skills:
${formatSkillsForPrompt(loadedSkills) || "(none)"}`;
}

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
      ? "Use resolve_delegation whenever substantive project-domain work is required. Request finite non-negative reasoning and impact requirements from the concrete work, using common 0..3 guidance that is not a protocol range or upper bound; treat the axes independently, do not combine them into a total or weighted score, priority, or phase level, and supply the least sufficient root requirements. Judge objective, ambiguity, reasoning needed for correctness, verification burden, and actual consequence; reasoning 0 is mechanical work with clear boundaries and low ambiguity, 1 is a small settled implementation or check or simple state/document reconciliation, 2 is ordinary Plan/Tasks work, independent review, or multi-file impact analysis, and 3 commonly covers final review involving architecture, security, migration, authority conflict, a complex root cause, or unusually difficult uncertainty. Planning or review does not by itself increase impact; impact 0 is local and reversible without external impact, 1 is bounded to one module, 2 is cross-module or materially affects behavior or compatibility, and 3 is high-consequence, hard to reverse, or involves security, data, or external-system risk. These are examples, not mappings from Skill, document type, or workflow phase; the Resolver owns validation and deterministic selection. Select atomic admission only with bounded basis and focused verification; select planned admission with exactly one Work/Plan/Tasks tuple bound to Handoff context."
      : "No candidate is configured under Pi settings key harness.candidates. Explain the block instead of doing project-domain work.";

  return `You are the Pi Harness Router. You coordinate work but do not perform substantive project-domain reading, research, editing, execution, or independent verification yourself.

You may respond directly only to clarify intent, ask for a decision or authorization, summarize existing Handler Results, explain a block, escalate risk, or report completion. For substantive work, select one primary Skill, optional companion Skills, and assign the least sufficient finite non-negative reasoning and impact requirements from the concrete work before calling resolve_delegation. Treat reasoning and impact as independent axes: never combine them into a total score, weighted score, priority, or phase level. Judge the concrete objective, ambiguity, reasoning needed for correctness, verification burden, and actual consequence. Common reasoning guidance is 0 for mechanical work with clear boundaries and low ambiguity; 1 for a small settled implementation or check, simple state reconciliation, or simple documentation reconciliation; 2 for ordinary Plan or Tasks work, independent review, or multi-file impact analysis; and 3 for final review involving architecture, security, migration, authority conflict, a complex root cause, or unusually difficult uncertainty. Ordinary Plan, Tasks, and independent review work normally require at least reasoning 2 because of the concrete reasoning and verification burden, not because of a Skill name, document type, or planning/review phase; a simple mechanical reconciliation may remain 1. Common impact guidance is 0 for local, reversible work without external impact; 1 for a consequence bounded to one module; 2 for cross-module or materially behavior/compatibility-affecting work; and 3 for high-consequence, hard-to-reverse, or security, data, or external-system risk. Planning or review does not automatically increase impact. The 0..3 values are common guidance, not a protocol range or upper bound; any finite non-negative integer is valid. Primary and companion are relationships for this Handoff only. Provide the smallest sufficient Handoff context before calling resolve_delegation. These examples are not mappings to Skill names, document types, research phases, or implementation phases; make a fresh request from the concrete work. Never put reasoning or impact inside Handoff. For bounded behavior-neutral work supply atomic basis and focused verification; for multi-step, coordination-heavy, architectural, security, migration, durable, or otherwise material work supply only the exact planned Work/Plan/Tasks selectors. Never supply receipt, digest, reviewer, session, or acceptance data. After resolution, derive one concise canonical ASCII taskSlug from the concrete Handoff objective and settled execution context: 3-48 lowercase letters or digits separated by single hyphens, without the reserved subagent- prefix. Pass the returned prompt, model, and thinking exactly, without local selection, fallback, substitution, rewrite, or another Registry read. When calling subagent_spawn, always pass agent: \"handler\" with that resolved prompt, model, thinking, taskSlug, and a separate human-readable label. taskSlug is an invocation field, not a Handoff or Resolver field. Never pass a Handler path or body, invent a backend, or execute the Handler's work yourself.

When a terminal Handler Result is already visible in the current Router context, read the complete Result, including its status, summary, report, and artifacts, before deciding what to do next. Visibility is input to Router judgment only; it does not prescribe or trigger a follow-up action.
Preserve completed, partial, blocked, and failed as distinct Handler Result input semantics. A status does not map to a fixed dispatch, continuation, retry, Todo update, scheduler action, dependency release, or status transition.
After reading the Result, independently decide whether to delegate another atomic outcome, delegate a review, ask for clarification or authorization, wait, stop, or report completion. The Handler's terminal Result ends only its delegated outcome; it does not choose the next workflow action.
If Result context is missing, incomplete, malformed, or structurally ambiguous, fail closed: do not invent fields, status, identity, or outcome; do not dispatch or claim completion. Ask, wait, stop, or report the limitation based only on available context.

${candidateStatus}

Current model-visible Skills:
${formatSkillsForPrompt(loadedSkills) || "(none)"}`;
}

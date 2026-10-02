import { inspect } from "node:util";
import { Type } from "@earendil-works/pi-ai";
import {
  defineTool,
  formatSkillsForPrompt,
  type BeforeAgentStartEvent,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, Text, truncateToWidth } from "@earendil-works/pi-tui";
import { loadHarnessCandidates, type HarnessCandidates } from "../src/config.js";
import { runHarnessConfig } from "../src/config-command.js";
import { dispatchDelegation, type DelegationResponse, type SkillSummary } from "../src/index.js";

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
    description: "Validate a Handler Handoff, bind its exact invocation, and call the Router-selected registered delegate once within this resolve_delegation call. Return resolution and raw launch evidence without interpreting Handler Results; any later independent outcome requires its own permitted resolve_delegation call.",
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
            waves: Type.String({ minLength: 1 }),
          }, { additionalProperties: false }),
        }, { additionalProperties: false }),
      ]),
      reasoning: capability("reasoning"),
      impact: capability("impact"),
      delegate: Type.Object({
        name: Type.String({ minLength: 1 }),
        params: Type.Object({}, { additionalProperties: true, description: "Router-selected startup fields for this single invocation; omit protected agent, prompt, model, and thinking, which Resolver binds." }),
      }, { additionalProperties: false, description: "Exactly one Router-selected registered delegate invocation; do not launch the same outcome separately after this call returns." }),
    }, { additionalProperties: false }),
    renderCall(args, theme, context) {
      const handoff = args.handoff;
      const selectedSkills = [handoff?.primarySkill, ...(Array.isArray(handoff?.companionSkills) ? handoff.companionSkills : [])]
        .filter((name): name is string => typeof name === "string" && name.length > 0);
      const requirements = [
        typeof args.reasoning === "number" ? `reasoning ${args.reasoning}` : "",
        typeof args.impact === "number" ? `impact ${args.impact}` : "",
      ].filter(Boolean).join(", ");
      const title = `${theme.fg("toolTitle", theme.bold(resolverName))}${requirements ? theme.fg("muted", `  ${requirements}`) : ""}`;
      if (context.expanded) {
        return resolverText([title, theme.fg("dim", displayText(inspect(args, {
          depth: null, maxArrayLength: null, maxStringLength: null, colors: false, customInspect: false,
        })))], true);
      }
      const selection = [selectedSkills.join(" + "), singleLine(args.delegate?.name)].filter(Boolean).join(" · ");
      return resolverText([
        title,
        ...(typeof handoff?.objective === "string" ? [theme.fg("dim", `  ${singleLine(handoff.objective)}`)] : []),
        ...(selection ? [theme.fg("muted", `  ${singleLine(selection)}`)] : []),
      ], false);
    },
    renderResult(result, options, theme) {
      const output = (result.content ?? []).filter((block) => block.type === "text").map((block) => block.text).join("\n");
      if (options.expanded) return resolverText([theme.fg("toolOutput", displayText(output || "No text evidence"))], true);
      const details = displayRecord(result.details);
      const resolution = displayRecord(details?.resolution);
      const launch = displayRecord(details?.launch);
      if (!options.isPartial && resolution?.status === "blocked" && typeof resolution.code === "string"
        && typeof resolution.message === "string" && details && !Object.hasOwn(details, "launch")) {
        return resolverText([
          theme.fg("warning", `blocked · ${singleLine(resolution.code)}`),
          theme.fg("dim", `  ${singleLine(resolution.message)}`),
        ], false);
      }
      if (!options.isPartial && resolution?.status === "resolved" && typeof resolution.model === "string"
        && typeof resolution.thinking === "string" && typeof resolution.prompt === "string" && typeof launch?.tool === "string"
        && Object.hasOwn(launch, "rawError") !== Object.hasOwn(launch, "rawReturn")) {
        const failed = Object.hasOwn(launch, "rawError");
        const cause = failed ? singleLine(launch.rawError instanceof Error ? launch.rawError.message
          : inspect(launch.rawError, { depth: 0, maxArrayLength: 3, maxStringLength: 200, colors: false, customInspect: false })) : "";
        return resolverText([
          theme.fg(failed ? "warning" : "toolOutput", failed ? "resolved · launch error" : "resolved"),
          theme.fg("muted", `  ${singleLine(resolution.model)} · thinking ${singleLine(resolution.thinking)} · delegate ${singleLine(launch.tool)}`),
          theme.fg("dim", failed ? `  cause: ${cause}` : "  raw return captured (expand for evidence)"),
        ], false);
      }
      return resolverText([
        theme.fg("muted", options.isPartial ? "Partial resolver output" : "Resolver output (details unavailable)"),
        ...(output ? [theme.fg("dim", `  ${singleLine(output)}`)] : []),
      ], false);
    },
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const current = currentCandidates(ctx, loadCandidates);
      const result: DelegationResponse = current.status === "blocked"
        ? { resolution: { status: "blocked", code: current.code, message: current.message } }
        : await dispatchDelegation(params, {
            skills,
            candidates: current.candidates,
            modelRegistry: ctx.modelRegistry,
            cwd: ctx.cwd,
            tools: ctx.tools,
            executeTool: (name, args) => ctx.executeTool(name, args),
          });
      // Error properties are non-enumerable; retain the actual exception in details and a key-preserving display value for undefined.
      const display = result.launch && "rawError" in result.launch && (result.launch.rawError instanceof Error || result.launch.rawError === undefined)
        ? { ...result, launch: { ...result.launch, rawError: inspect(result.launch.rawError) } }
        : result;
      return { content: [{ type: "text", text: Bun.YAML.stringify(display) }], details: result };
    },
  });
}

function displayText(value: string): string {
  return stripTerminalSequences(value).replace(/\r\n?/g, "\n").replace(/\t/g, "   ")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "").replace(/[\u2028\u2029]/g, "\n");
}

function singleLine(value: unknown): string {
  return typeof value === "string" ? displayText(value).replace(/\s+/g, " ").trim() : "";
}

function displayRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function resolverText(lines: string[], expanded: boolean) {
  const text = new Text(lines.join("\n"), 0, 0);
  return {
    render(width: number): string[] {
      if (width < 1) return [];
      return (expanded ? text.render(width) : lines).map((line) => truncateToWidth(line, width, "…", true));
    },
    invalidate() { text.invalidate(); },
  };
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
      ? "Use resolve_delegation for substantive project-domain work. In that single call, the Resolver validates the Handoff, binds the exact invocation, and calls the selected registered delegate once, returning resolution and raw launch evidence. Do not launch the same outcome separately after the response."
      : "No candidate is configured under Pi settings key harness.candidates. Explain the block instead of doing project-domain work.";

  return `You are the Pi Harness Router. You coordinate work but do not perform substantive project-domain reading, research, editing, execution, or independent verification yourself.

You may respond directly only to clarify intent, ask for a decision or authorization, summarize existing Handler Results, explain a block, escalate risk, or report completion. For substantive project-domain work, coordinate delegation; do not perform project-domain work yourself.

First decide only whether new project-domain delegation is needed; this does not require prior decomposition. If so, find delegation-strategy by name in the current model-visible Skill catalog below and use read at its listed location to load the full body before identifying the coordination set, selecting domain Skills, constructing a Handoff, or requesting capability. Do not delegate strategy loading or choose delegation-strategy as a Handler primary or companion Skill. Reuse a complete identifiable body only within the same context; reload after a new session, lost body on resume/compaction, catalog change, or uncertain identity. If absent, hidden, unreadable, incomplete, or conflicting, block new delegation without an inline fallback; still safely retrieve and project existing Results. Merely seeing the catalog entry is not loading the body. Loading coordination guidance does not authorize domain work.

Phase 1 - Confirm scope, then identify outcomes. After loading the strategy, for a new planned implementation first disclose in an ordinary message the selected Work/Plan/Waves scope's outcome and important exclusions, proposed behavior or artifact changes and owners, steps and material dependencies, verification and completion criteria, and important tradeoffs, risks, and key decisions. Obtain explicit current-user confirmation of that disclosed implementation scope before decomposing it into independently observable outcomes or Wave items, selecting domain Skills, constructing a Handoff, or requesting capability. A path, readiness claim, intent agreement, overview approval, document status, silence, ambiguous or declined response, Handoff, or successful Resolver admission is not confirmation; block the affected implementation. After that confirmation (or immediately for non-planned work), identify each independently observable user-requested result and its verifiable completion predicate before choosing domain Skills, capability requests, Handoffs, or report packaging. Present the complete coordination set immediately for multi-step work using the existing visible Todo mechanism or an ordinary coordination message, one item per independently observable outcome; only total absence of a writable and visible coordination mechanism may block coordination. Inspect the complete objective, constraints, and deliverables as one semantic bundle; each Handler invocation must have exactly one verifiable terminal predicate. Each planned Waves item has exactly one Handler and one independent Result; keep independently meaningful Results separate even when they are combined in a final report. Internal checks may support one predicate, but independently meaningful completion, failure, dependency, recovery, authorization, durable effect, audit, or terminal state requires a distinct outcome. A companion Skill must serve the same predicate; action, file, phase, or Skill counts do not decide boundaries. For new or materially changed requirements, settle intended outcomes, boundaries, constraints, and success criteria with the user before treating them as authority; surface material alternatives rather than assuming agreement from silence. Reuse the owning PRD/ADR/Spec where it already covers the intent; otherwise reconcile applicable product and architecture authority and express new behavior verifiably in the owning Spec before deriving an implementation Plan. Preparatory analysis, Spec work, and planning follow their own authority and admission rules and do not wait for confirmation of a not-yet-ready implementation Plan. Do not hide a second outcome in a Handoff.

Phase 2 - Select executable work. Retain the correspondence and dependencies of each selected outcome. Project its Todo as in_progress immediately before its coordination action, using native statuses and fields where available, otherwise the closest truthful native status plus existing descriptions, subjects, or an ordinary Router message. Keep independent results distinct. A partial, failed, or blocked prerequisite blocks only outcomes that explicitly depend on it; unrelated ready outcomes remain eligible, and Wave grouping is not a global barrier. Do not overlap dependencies or conflicting writes, ownership, authority, behavioral contracts, or side effects. Shared read-only sources alone do not conflict. Background overlap requires permission from the currently effective delegate tool contract and available resources; unknown, stale, incompatible, or ambiguous overlap capability requires a contract-compliant serial path, or a block if ordinary delegation is unsupported. Tool-call parallelism is not required for background overlap. For a simple coherent deliverable, use one Spec-derived implementation Plan even across multiple files; decompose by verifiable outcomes and dependencies, not file or task counts. For genuinely complex staged delivery, first disclose an overview of stages, dependencies, and incremental outcomes and obtain explicit user confirmation of that route before any stage executes; route approval authorizes no stage. Detail and separately confirm each ready stage's implementation scope; defer future-stage details only when they do not invalidate the route or hide a current-stage decision. Each implementation Plan identifies its Spec-derived scope and relationship to the overview, if any. Use the confirmed scope as the execution boundary; do not execute an implementation Plan without the Phase 1 disclosure and explicit current-user confirmation. Select the exact same-directory Work/Plan/Waves tuple for each planned invocation. Before resolution, validate reciprocal Work/Plan/Waves links: the Plan links its Work and exactly one Waves document, and Waves links that same Plan and Work; missing or inconsistent links block the affected planned execution. Use that linked waves.md as the sole executable graph; plan.md explains scope and authority and is not a second decomposition. Validate that item and Wave identifiers are unique, references resolve, prerequisite links are acyclic, and no gate depends on its own release; missing items, contradictory predicates, unresolved dependencies, cycles, or an uncheckable gate block the affected planned execution. Check both the selected item's prerequisite completion predicates and its containing Wave's prerequisite gates before resolution; item readiness alone never establishes Wave-gate readiness. These semantic checks remain Router-owned; Resolver structural validation or successful admission does not establish them. Historical tasks.md is a compatibility record only. If an unfinished historical Tasks-based plan is selected, stop and require explicit migration to a linked Work/Plan/Waves tuple and applicable confirmation before execution; never interpret Tasks as Waves or silently fall back. Inside confirmed scope, refine Waves items, implement, repair defects, and verify across bounded Handler outcomes without per-item approval. If outcome, behavior, deliverable, success criterion, key architecture, consequential dependency, risk, or verification changes materially, explain the change and impact and confirm the affected portion before executing it; reconcile invalid authority at its owner. After byte-only drift, compare the current Plan with the confirmed scope and retry current-call validation against the current tuple without renewed confirmation; unchanged work needs no reapproval. Compare results to authority and confirmed Plan, report failed or partial verification truthfully, and repair and recheck within scope. Under existing explicit authorization only, a bounded defect repair may restore established behavior without new Spec or implementation-plan confirmation by identifying authority and observed divergence, running focused checks, and reporting; during an active security, data-loss, or availability incident, take the minimum scoped containment action needed to limit ongoing harm even when normal planning or authority updates cannot precede it, check its effect as practicable, report it as temporary, and reconcile authority afterward; small behavior-neutral maintenance may proceed without new Spec or plan confirmation after a focused unchanged-behavior check and report. These exceptions do not authorize new behavior or broader follow-on repair; route such changes through normal authority and scope confirmation, and clarify ambiguous target authority before claiming an exception. Destructive or externally high-impact incident actions and other irreversible or externally high-impact actions retain their separate action-executor authorization boundary. Do not treat a Handoff as proof of acceptance.

Phase 3 - Resolve and delegate the selected outcome. After applying the loaded strategy, select one domain primary Skill and optional companion Skills for this Handoff only, then assign the least sufficient finite non-negative reasoning and impact requirements from the concrete work before calling resolve_delegation. Treat reasoning and impact as independent axes: never combine them into a total score, weighted score, priority, or phase level. Judge the concrete objective, ambiguity, reasoning needed for correctness, verification burden, and actual consequence. Common reasoning guidance is 0 for mechanical work with clear boundaries and low ambiguity; 1 for a small settled implementation or check, simple state reconciliation, or simple documentation reconciliation; 2 for ordinary Plan/Waves work, independent review, or multi-file impact analysis; and 3 for final review involving architecture, security, migration, authority conflict, a complex root cause, or unusually difficult uncertainty. Ordinary Plan/Waves and independent review work normally require at least reasoning 2 because of the concrete reasoning and verification burden, not because of a Skill name, document type, or planning/review phase; a simple mechanical reconciliation may remain 1. Common impact guidance is 0 for local, reversible work without external impact; 1 for a consequence bounded to one module; 2 for cross-module or materially behavior/compatibility-affecting work; and 3 for high-consequence, hard-to-reverse, or security, data, or external-system risk. Planning or review does not automatically increase impact. The 0..3 values are common guidance, not a protocol range or upper bound; any finite non-negative integer is valid. These examples are not mappings to Skill names, document types, research phases, or implementation phases; make a fresh request from the concrete work. Provide the smallest sufficient Handoff context. Never put reasoning or impact inside Handoff. For bounded behavior-neutral work supply atomic basis and focused verification; for multi-step, coordination-heavy, architectural, security, migration, durable, or otherwise material work supply only the exact planned Work/Plan/Waves selectors. Keep Handoff fields limited to objective, primarySkill, optional companionSkills, context, constraints, and deliverables; keep Handoff and admission shapes closed; never supply receipt, digest, reviewer, session, or acceptance data. Complete all reads, compatibility checks, and pre-action Todo projection before resolve; include resource and authorization checks. Supply the compatible registered delegate in delegate: { name, params }; Resolver binds the invocation and calls it within resolve_delegation once. Do not issue a second launch after its response for the same outcome, reconstruct the prompt, or replace the resolved model/thinking. Any later independent outcome requires its own permitted resolve_delegation call. Only after an active launch, and only when the effective registered delegate tool contract and resources permit another same-turn launch, may the Router prepare another independent ready branch. An effective end-turn requirement wins over the Skill, prompt, source code, or historical overlap evidence. Derive one concise canonical ASCII taskSlug from the concrete Handoff objective and settled execution context: 3-48 lowercase letters or digits separated by single hyphens, without the reserved subagent- prefix. For subagent_spawn, supply delegate.name: "subagent_spawn" and delegate.params containing taskSlug and a separate human-readable label. Do not supply agent, prompt, model, or thinking in delegate.params: Resolver binds agent: "handler" and the exact resolved prompt, model, and thinking without local selection, fallback, substitution, rewrite, or another Registry read. taskSlug is a delegate startup field, not a Handoff or admission field. Never pass a Handler path or body, invent a backend, or execute the Handler's work yourself. If resolution or delegate capability fails, report the block without spawning. Resolver returns resolution and exactly one raw launch return or error after an attempt; it does not interpret Handler Results or manage Todos. Interpret launch evidence yourself under the effective delegate contract; a resolved response alone does not establish an active launch or successful work.

Phase 4 - Receive and project Results. A summary notification is not a full Result: retrieve it via the effective backend's supported path before correlating or projecting it; wait for notifications rather than routine polling. When a terminal Handler Result is already visible in the current Router context, read the complete Result, including its status, summary, report, and artifacts, and correlate it to the selected outcome. Visibility is input to Router judgment only; it does not prescribe or trigger a follow-up action. Immediately project completed, partial, blocked, or failed truthfully in the existing Todo; preserve completed, partial, blocked, and failed as distinct Handler Result input semantics, not fixed workflow-control instructions, using the closest truthful native status plus existing descriptive or message surfaces where needed. Never mark partial, blocked, or failed as completed. An observable equivalent duplicate notification is idempotent: do not update the Todo twice or release a dependency twice. If malformed, conflicting, or uncorrelatable, preserve the first semantic state, leave status and dependencies unchanged, and report the conflict. If Result context is missing, incomplete, malformed, or structurally ambiguous, fail closed: do not invent fields, status, identity, or outcome; do not dispatch or claim completion based on it. On restart or replay, reapply only when available identity and visible state make that safe; otherwise retain the Todo and report the limitation. When a Handler terminates without an adoptable Result, read the complete failure evidence and, only after confirming terminal execution, stable subagentId/generation, unchanged boundary and authority, replay safety, and no need for renewed authorization, prefer resuming that same execution. Never resume an active execution or one with a terminal Result; never silently replay completed durable side effects or independent outcomes. Otherwise make a fresh decision from the evidence. After projecting each Result, make a fresh Router-owned decision before releasing dependents or scheduling work that depends on it; release only satisfied dependencies. Only completed plus required evidence satisfies an item predicate by default; partial, failed, blocked, or insufficient evidence leaves it unsatisfied. Verify a Wave gate separately from item completion: every item listed in that Wave must satisfy its completion predicate and the gate's stated verification must pass before releasing only its explicitly dependent work. An adoptable Result and sufficient evidence are required; do not infer gate release from terminal status, Wave numbering, document order, or Todo completion alone. Independently decide whether to delegate another atomic outcome, delegate a review, ask for clarification or authorization, wait, stop, or report completion. Do not let the Handler choose continuation or collapse a non-completed Result into success. Retry only the failed outcome's boundary. A combined final report does not merge independent execution or completion states. Retain active or unresolved Todos; remove only records proven stale when the terminal Result was applied, identity and required fields are known and non-contradictory, and the record is neither current nor needed by unresolved dependents; otherwise retain and report the limitation. Never use subagent_remove for cleanup or delete Results, sessions, manifests, or artifacts. Do not add a hidden scheduler, queue, retry engine, fixed Result-to-Todo mapping, Handler continuation, or automatic dispatch.

${candidateStatus}

Current model-visible Skills:
${formatSkillsForPrompt(loadedSkills) || "(none)"}`;
}

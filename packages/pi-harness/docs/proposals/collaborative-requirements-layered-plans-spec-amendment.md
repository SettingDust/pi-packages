# Spec Amendment Candidate: Collaborative Requirements and Layered Plans

- Status: reconciled into [Router Delegation Specification, section 1.2](../spec/router-delegation.md#12-collaborative-authority-and-layered-delivery); this proposal remains non-authoritative. ADR-0007 received a narrow precedence clarification. Router prompt, Skills, tests, and runtime remain unchanged by this reconciliation.
- Owning contract: [Router Delegation Specification](../spec/router-delegation.md), especially sections 1, 1.1, 2, 3, and 6.
- Placement: `proposals/` under the [documentation conventions](../README.md); this is proposed wording for the existing owning Spec, not a competing Spec.
- Basis: the prior authoring Handoff supplied the user's confirmed workflow consensus; a later Handoff supplied agreement to limited existing-authority exceptions. The user's subsequent instruction to begin authorized the disclosed formal Spec reconciliation, not implementation-plan confirmation or runtime implementation.
- Authority constraints: [Router Delegation PRD](../prd/router-delegation.md) and [ADR-0001](../adr/0001-router-resolver-handler-boundaries.md) remain unchanged; [ADR-0007](../adr/0007-authority-first-router-admission.md) received only a precedence clarification.

## 1. Purpose and Amendment Boundary

Make collaboration before specification and confirmation before implementation explicit, while allowing one Spec to support several meaningful delivery plans. Complex delivery needs a confirmed route without pretending that every later stage is already designed or authorized.

Sections 2-6 retain the candidate wording and scenario IDs for traceability. Normative authority now resides in the owning [Spec](../spec/router-delegation.md#12-collaborative-authority-and-layered-delivery), not in this proposal. Section 7 records the pre-reconciliation assessment; section 9 records the final disposition.

The amendment concerns requirement-to-implementation workflows. It does not prescribe a fixed document count, add a review or approval gate for each task, change delegation schemas, or establish a new approval service. Existing safety and action-executor authorization boundaries remain applicable; no new such boundary is created here. Section 5 specifies limited applicability exceptions for already-authoritative work and urgent containment; these are not implicit authorizations for a new requirement or expanded implementation.

The original candidate did not change an accepted PRD, ADR, Spec, Router prompt, Skill, code, dependency, Plan, or Tasks. The later authorized reconciliation changed only the owning Spec and a narrow ADR-0007 precedence clarification. It does not resume paused Runtime/join work or authorize changes to the Todo Compact worktree; Compact I0 remains independent.

## 2. Actors and Terms

- **User:** settles intended outcomes and explicitly confirms a disclosed overview route or implementation scope.
- **Router/coordinator:** owns user communication, scope confirmation, coordination, and subsequent workflow decisions. Project-domain analysis and execution remain delegated under the current ownership contract.
- **Handler/agent:** performs its bounded analysis, planning, implementation, or verification outcome and reports evidence; it does not acquire the Router's interaction or continuation authority.
- **Agreed intent:** the requirement's meaning, boundaries, constraints, and success criteria as settled through LLM analysis and communication with the user, not merely the LLM's interpretation of the initial request.
- **Spec:** the normative behavior and acceptance conditions derived from agreed intent; the Plan must not replace or invent that authority.
- **Overview plan:** the route through complex delivery: stages, dependencies, and incremental deliverable outcomes. It is not an executable authorization for all stages.
- **Implementation plan:** one actionable, meaningfully verifiable delivery scope derived from the Spec and, when applicable, the overview route. It contains enough substance for the user to evaluate the proposed execution.

A Spec, overview stage, implementation plan, task, and Handler outcome are different boundaries. Their counts must not be equated by convention.

## 3. Collaborative Sequence

**C1.** For new or materially changed requirements, the workflow must follow this sequence:

```text
requirement
-> LLM analysis and communication with the user
-> agreed intent
-> Spec
-> planning
-> substantive implementation-plan disclosure and explicit confirmation
-> implementation and verification within the confirmed scope
```

The LLM must analyze the requirement and communicate decision-relevant interpretations, uncertainties, and tradeoffs with the user before treating intent as settled. Material unanswered questions must not be turned into Spec requirements or implementation assumptions. Agreement must be established from user communication, not inferred from silence, an artifact's existence, a Handoff, or the LLM declaring readiness.

The Spec must capture the settled intent as verifiable behavior before implementation planning commits to delivery. Existing owning authority must be reused where it already expresses that behavior; this sequence does not require a new Spec file for each request. Product intent and architecture decisions remain in their existing owning PRD and ADR when applicable. Already-authoritative work and minimum urgent containment are governed by the narrow exceptions in C8-C10, not by treating them as new requirements.

Agreeing intent or producing a Spec does not by itself confirm an implementation plan. This amendment introduces no separate mandatory approval round for every analysis result, Spec file, task list, test, or Handler call.

## 4. Plan Layers and Delivery Granularity

**C2.** One Spec may support multiple implementation plans. Simple delivery may use one implementation plan without a separate overview plan. Plan granularity must follow meaningful, verifiable delivery scope and its dependencies or important decisions, not one-plan-per-Spec, one-plan-per-file, template counts, or Handler-call counts.

**C3.** Complex delivery must first have an overview plan identifying stages, dependencies, and incremental delivery outcomes. The Router must show the route substantively and obtain explicit user confirmation of that route. Overview confirmation approves direction and staging only; it must not be interpreted as authorization to execute all implementation stages.

Stage implementation plans must be detailed when the stage is ready to be planned using available authority and evidence, rather than detailing all future stages upfront. Unresolved future-stage detail may remain deferred if it does not invalidate the current route or current implementation scope. Deferral must not conceal a material decision needed for the stage about to execute.

Each implementation plan must identify its Spec-derived scope and its relationship to the overview when one exists. The workflow must disclose and confirm that plan separately before executing its scope. Approval of one plan must not extend to another merely because both implement the same Spec or appear in the same overview.

An overview plan must not substitute for the selected executable implementation plan in planned admission. Multiple Plan/Tasks pairs may share one Work under existing conventions, but each planned invocation still selects one explicit Work/Plan/Tasks tuple. This amendment does not change tuple grammar or require detailed future-stage Tasks before their plans are ready.

## 5. Confirmation and Execution Boundaries

**C4.** Before executing each implementation plan, the Router must show the plan's substantive content and obtain explicit user confirmation of that disclosed scope. Disclosure must include:

- Scope, intended delivery outcome, and important exclusions.
- Proposed behavior or artifact changes and affected ownership boundaries.
- Execution steps and material dependencies.
- Verification checks and what constitutes successful completion.
- Important tradeoffs, risks, and key decisions relevant to authorization.

Paths and links may support the disclosure but must not replace it. A message saying that a plan is ready, listing files, or announcing the next task is insufficient. Confirmation must correspond to the disclosed implementation scope; overview approval, document status, prior intent agreement, successful resolution, or silence must not stand in for it. If confirmation is absent, declined, or ambiguous, the affected implementation must not start; the Router must resolve that limitation through ordinary user communication.

**C5.** Within a confirmed implementation scope, the agent must autonomously decompose or refine tasks, implement, fix in-scope defects, and verify. It must not request repeated approval merely because it advances to another task, file, test, repair, or Handler invocation within that scope. Tasks required for planned admission must exist for the selected invocation, but the task inventory is not a separate user approval gate and is not an upfront commitment for every future stage.

**C6.** A material scope or key-decision change must be explained before the changed portion executes. The Router must show what changed, why, and its impact on outcomes, behavior, dependencies, risk, or verification, then obtain explicit confirmation for that changed portion. A finding that invalidates applicable authority must also be reconciled at its owning authority boundary before dependent execution; this candidate grants no authority-edit permission.

A change is material when it changes what the user is authorizing, such as an added deliverable, removed success criterion, different important architecture or behavior, newly consequential dependency, or materially different risk. Internal task refinement, in-scope repair, and non-substantive document edits do not alone require renewed confirmation. Unchanged confirmed work need not be reapproved; work dependent on the changed decision must not proceed under obsolete assumptions.

Byte drift and substantive scope drift are distinct. Existing current-call legality checks may fail closed on changed bytes; that does not prove that user confirmation is missing or require a new approval for every byte change. The Router must determine the substantive impact before any renewed disclosure and confirmation.

**C7.** Verification must compare delivered behavior with applicable authority and, when one exists, the confirmed implementation plan, using actual evidence. Partial or failed verification must be reported truthfully, not as completion. In-scope correction and re-verification remain autonomous; a correction that changes the confirmed boundary follows C6.

**C8. Direct restoration.** An agent may repair a defect directly under existing explicit authorization, without a new Spec or implementation-plan confirmation, only when the bounded repair returns implementation to behavior already established by applicable authority. It must identify that authority and the observed divergence, run in-scope tests and verification against the authoritative behavior, and report the result. This permission does not authorize new requirements, a different key decision, consequential architecture or dependency changes, or expanded scope. Such changes require the normal substantive plan disclosure and confirmation under C1-C4 (or changed-portion confirmation under C6 if a confirmed plan exists) before the changed portion executes. If whether the target behavior is already authoritative is materially ambiguous, clarify the question before classifying the work as restoration.

**C9. Minimum urgent containment.** During an active security, data-loss, or availability incident, an agent may take the minimum scoped action needed to limit ongoing harm under existing authorization, even when ordinary authority updates or planning cannot precede containment. It must record the bounded exception, verify the containment effect as far as practicable, report the action and its temporary status, and complete applicable authority reconciliation afterward. Containment must not be represented as root-cause resolution or used as permission for redesign, permanent new behavior, or a wider repair. Any such follow-on work requires its own normal authority, substantive plan disclosure, and confirmation. Destructive or externally high-impact actions retain their applicable action-executor authorization boundaries; urgency does not waive them.

**C10. Behavior-neutral maintenance.** A small maintenance change that preserves already-authoritative behavior may proceed under existing explicit authorization without a new Spec or implementation-plan confirmation. The agent must verify that behavior remains unchanged with focused checks and report the result. Resolver atomic admission is only legality validation, not proof of that authorization. A material behavior, scope, architecture, dependency, or risk change is not behavior-neutral maintenance and must follow C1-C4 or, within an existing confirmed plan, C6. A material ambiguity about intent or authority must be clarified before work proceeds; it must not silently become a new requirement labeled maintenance or repair.

These permissions add no approval round, exception registry, receipt, token, or authorization service. Existing authorization must be established by the Router's ordinary interaction or confirmed scope and the applicable action boundary, not inferred from a candidate document, Handoff, or successful Resolver call. An exception is limited to its stated action and does not confirm an overview route or implementation plan.

Confirmation stays Router-owned ordinary interaction. Harness and Resolver must not interpret, authenticate, persist, issue, or replay-protect acceptance through a new receipt, token, status field, or activation service. A confirmed implementation plan may span multiple bounded Handler outcomes; every delegation retains the current single-result contract and Router-owned continuation.

## 6. Verifiable Scenarios

These are proposed behavioral acceptance scenarios, not claims that runtime tests have been performed. Check a conversation/delegation trace against each observable condition.

| ID | Given / When | Required observable result | Rules |
| --- | --- | --- | --- |
| S1 | A requirement has two materially different plausible meanings. | LLM analysis surfaces the difference; the Router communicates it with the user. Neither disputed meaning becomes settled Spec authority or an execution assumption before agreement. | C1 |
| S2 | Intent is agreed and the Spec already expresses the required behavior. | Planning references that owning Spec instead of creating a competing one; intent agreement or Spec readiness alone does not launch implementation. | C1, C4 |
| S3 | A simple deliverable touches several files but has one coherent verification boundary. | One substantive implementation plan may cover it without an overview or a plan per file; execution waits for that plan's explicit confirmation. | C2, C4 |
| S4 | Complex delivery has three dependent stages; later details need earlier evidence. | The overview shows stages, dependencies, and incremental outcomes. Its confirmation approves the route only; later detailed plans remain deferred. | C3 |
| S5 | The overview is confirmed and stage 1's implementation plan is ready. | The Router discloses stage 1's scope, changes, steps, verification, and tradeoffs and obtains separate explicit implementation confirmation before execution. | C3, C4 |
| S6 | Stage 1 is completed under a confirmed plan; stage 2 has no confirmed implementation plan. | Stage 1 approval and overview approval do not authorize stage 2 execution; stage 2 is detailed, shown, and confirmed when ready. | C3, C4 |
| S7 | The Router only posts plan paths or says that the plan is ready. | This is not substantive disclosure and does not satisfy the implementation confirmation boundary. | C4 |
| S8 | Disclosure is adequate, but the user declines, remains silent, or gives an ambiguous response. | The affected implementation does not start; readiness, status text, Handoff content, and resolver success do not manufacture acceptance. | C4 |
| S9 | A confirmed plan needs task refinement, several Handler outcomes, or an in-scope defect repair. | The agent decomposes, implements, fixes, and verifies within scope without another user approval per task, file, or invocation. | C5, C7 |
| S10 | A finding requires a new deliverable or different key design decision. | The Router explains the changed portion and impact and confirms it before dependent execution; unchanged confirmation is not needlessly repeated. | C6 |
| S11 | Plan bytes change without a substantive scope or decision change. | A current-call drift failure is handled as legality evidence, not proof of absent approval; byte change alone does not create a user gate. | C5, C6 |
| S12 | Verification fails within the confirmed scope. | Completion is not claimed. In-scope repair and re-verification proceed autonomously; an out-of-scope correction instead follows the changed-portion confirmation boundary. | C6, C7 |
| S13 | Two implementation plans derive from one Spec and share a Work. | Each scope has its own substantive disclosure and confirmation; a planned invocation selects one explicit pair, without treating the overview or file count as approval. | C2, C3, C4 |
| S14 | An explicitly authorized repair restores a regression to already-authoritative behavior without changing key decisions or scope. | The agent identifies authority and divergence, repairs directly, runs in-scope tests and verification, and reports the result; no new Spec or implementation-plan confirmation is required just because it is a repair. | C7, C8 |
| S15 | A purported repair would introduce new behavior, a consequential dependency, or a wider deliverable. | The agent does not classify the changed portion as direct restoration. The Router discloses a substantive implementation plan and obtains confirmation, or confirms the changed portion of an existing plan, before executing that change. | C1, C4, C6, C8 |
| S16 | An active availability incident is causing ongoing harm, and a minimum containment action is within existing authorization. | The action limits harm; the agent verifies its effect as far as practicable, records and reports it as temporary, and subsequently reconciles applicable authority. It does not claim root-cause resolution or approval of a permanent redesign. | C9 |
| S17 | Urgent containment would be destructive or externally high-impact, or the next action is a broader permanent fix. | The action-executor authorization boundary still applies to the destructive/external action; the broader fix follows normal authority, plan disclosure, and confirmation rather than inheriting containment permission. | C4, C9 |
| S18 | Explicitly authorized, behavior-neutral atomic maintenance needs a small edit. | The agent verifies unchanged behavior and reports the result without a new plan confirmation; successful atomic admission alone is not treated as authorization. | C7, C10 |
| S19 | A change labeled maintenance or repair has an ambiguous intended behavior or authority. | The Router clarifies the material question before execution; the agent does not silently classify a new requirement as restoration or maintenance. | C1, C8, C10 |

## 7. Historical Rule Alignment

This table is the candidate's pre-reconciliation source assessment, retained for traceability. Its suggested dispositions are historical, not outstanding work or claims that no reconciliation occurred. The completed document disposition is in section 9.

All paths and line references below are repository-relative source locations inspected while drafting. These dispositions are suggestions only; no reconciliation was performed.

| Current source | Alignment, gap, or potential conflict | Suggested disposition |
| --- | --- | --- |
| [Documentation conventions](../README.md), `packages/pi-harness/docs/README.md:7` and `:11` | Candidates belong in `proposals/`; ADR decisions constrain Specs. This candidate cannot override accepted authority. | Keep this file non-authoritative; any accepted wording must be reconciled into the existing owning Spec and any affected ADR or PRD with explicit authority. |
| [Owning Spec, section 1](../spec/router-delegation.md#1-boundary-and-trust-ownership), `packages/pi-harness/docs/spec/router-delegation.md:17`; [ADR-0007](../adr/0007-authority-first-router-admission.md#context), `packages/pi-harness/docs/adr/0007-authority-first-router-admission.md:10` and `:20` | Current wording requires completing applicable Plan/Tasks and one confirmation, but does not distinguish overview approval from implementation approval. Reading "complete" as all future stages upfront would conflict with C3; treating overview approval as implementation permission would also conflict. | Clarify that implementation confirmation and applicable Tasks concern the selected ready implementation scope; overview confirmation concerns the route only. Preserve Router ownership and no receipt state. |
| [Owning Spec, section 2](../spec/router-delegation.md#2-handoff-and-admission-input), `packages/pi-harness/docs/spec/router-delegation.md:82`; [Plan-writing guidance](../../skills/documentation-plan-writing/SKILL.md), `packages/pi-harness/skills/documentation-plan-writing/SKILL.md:17` | One tuple per invocation is already compatible with multiple Plan/Tasks pairs per Work. No inspected current rule establishes one plan per Spec. | Preserve tuple legality. Add the semantic overview/implementation distinction without inventing a manifest, lifecycle classifier, or file-count rule. |
| [Router prompt source](../../extensions/pi-harness.ts), `packages/pi-harness/extensions/pi-harness.ts:164`, `:166`, and `:168` | The prompt identifies outcomes and discloses an exact selected Plan before planned delegation, but does not explicitly require collaborative intent settlement, the five disclosure elements, or route-only overview approval. Atomic routing does not itself prove user authorization. | Treat these as wording gaps, not evidence that the new behavior is implemented. Clarify any future prompt instructions for the limited C8-C10 cases without allowing an atomic legality result to stand in for authorization. Any prompt change is outside this candidate. |
| [Owning Spec, sections 3 and 6](../spec/router-delegation.md#3-planned-validation-without-authorization-state), `packages/pi-harness/docs/spec/router-delegation.md:98`, `:132`, and `:138`; [ADR-0007](../adr/0007-authority-first-router-admission.md#decision---accepted-implementation-repairs-narrow-role-validation-full-technical-validation-and-fresh-final-independent-correctnesssecurityevidence-review-complete), `packages/pi-harness/docs/adr/0007-authority-first-router-admission.md:24` | Current rules already preserve one confirmation per exact Plan and renewed confirmation only for substantive deviation, excluding per-Handoff approval. Current-call byte drift remains separate legality validation. | Retain these safeguards. Make changed-portion disclosure explicit; do not turn autonomous task refinement or every byte change into another approval round. |
| [Owning Spec, sections 1.1, 2, and 3](../spec/router-delegation.md#11-generic-single-result-delegation-contract), `packages/pi-harness/docs/spec/router-delegation.md:47`, `:82`, and `:96` | Existing action-executor confirmation applies to irreversible or externally high-impact actions; atomic admission remains limited to small behavior-neutral change, and Resolver legality never proves acceptance. These rules are compatible with C8-C10, provided existing explicit authorization is not inferred from atomic eligibility or incident urgency. | Preserve action-executor authorization, atomic legality, and current-call drift behavior; distinguish each from the ordinary workflow confirmation and narrow exception applicability. |
| [Spec-driven-development guidance](../../skills/spec-driven-development/SKILL.md), `packages/pi-harness/skills/spec-driven-development/SKILL.md:10` and `:24` | Existing guidance permits direct restoration of already-authoritative behavior and minimal active-incident containment before authority updates. The user's clarification settles their limited applicability under existing authorization; routine behavior-neutral maintenance is similarly limited. | Reconcile C8-C10 into owning workflow authority when accepted. Keep direct restoration bounded to existing authority with tests; keep containment temporary with later reconciliation; do not make every repair require a new implementation plan or let an exception authorize new behavior. |

The current no-receipt architecture, single-result delegation, truthful Result reporting, and autonomous continuation inside an accepted Plan are compatible and retained. Historical proposal text describing acceptance registries is not current authority: [ADR-0007](../adr/0007-authority-first-router-admission.md) supersedes that behavior.

## 8. Settled Applicability and Remaining Boundaries

Settled by the supplied consensus: analysis and user communication precede agreed intent and Spec for new or materially changed requirements; plans follow Spec; one Spec may have several implementation plans; complex delivery uses an overview route; overview approval does not approve implementation; every implementation plan is substantively shown and explicitly confirmed; execution inside that scope is autonomous; material scope or key-decision changes require explaining impact and confirming the changed portion. These are not open alternatives.

The user's subsequent agreement settled the former applicability question: bounded direct restoration of already-authoritative behavior, minimum temporary containment during an active incident, and routine behavior-neutral maintenance may proceed under existing explicit authorization as specified in C8-C10. These exceptions do not themselves establish authorization. In-scope tests, focused verification, and truthful reporting remain required as applicable; containment effect is verified as far as practicable and followed by authority reconciliation. Material changes return to the normal planning and confirmation boundary. Resolver atomic admission remains a legality path, not proof of user authorization. Agreement on intent and the document reconciliation do not confirm an implementation plan or authorize execution of an exception.

The physical naming of overview documents and any future prompt/check encoding are implementation details not selected here. Existing explicit Plan/Tasks naming and admission rules remain unchanged; an overview is not executable simply because its filename resembles a Plan. No confirmation UI, acceptance storage, mandatory additional independent review, session protocol, or new approval gate is proposed.

## 9. Reconciliation Disposition

The confirmed C1-C10 workflow and S1-S19 scenarios are reconciled into [the owning Spec, section 1.2](../spec/router-delegation.md#12-collaborative-authority-and-layered-delivery). [ADR-0007](../adr/0007-authority-first-router-admission.md) now clarifies that its Plan/Tasks confirmation obligation concerns the selected ready implementation scope, not preparatory work or all future stages; Router ownership, non-interactive admission, and no-receipt architecture remain unchanged. The PRD and unrelated ADRs were not modified. This proposal remains a non-authoritative record and does not override the reconciled authority.

Inputs for subsequent implementation planning: Router prompt and applicable planning/implementation Skill wording still need alignment and focused prompt-contract checks; the audit identifies the current consumption gaps. No Plan/Tasks, Router prompt, Skill, tests, runtime, or Todo worktree was changed here. This reconciliation does not claim model compliance, live behavior, acceptance of an implementation plan, or implementation authorization.

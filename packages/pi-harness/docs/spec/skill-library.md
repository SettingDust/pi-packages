# Skill Library Specification

The visible authority assessment and conditional SDD rules below reconcile the accepted [ADR-0010](../adr/0010-visible-authority-assessment-and-conditional-sdd.md) while preserving situational composition under [ADR-0004](../adr/0004-use-situational-skill-composition.md). This is normative authority. The corresponding source/instruction delivery and independent review are complete; actual model Skill loading, provider behavior, reload freshness, and installed-runtime conformance remain unverified.

## 1. Discovery and Selection

Every model-visible Skill discovered by Pi is eligible for `handoff.primarySkill` and `handoff.companionSkills[]`. This includes the package library and user/project Skills. The extension does not maintain a control/leaf manifest, hide package Skills, or filter external Skills.

The Router selects exactly one primary Skill and zero or more unique companion Skills for each delegation. These relationships are local to that Handoff. A Handler must load the preselected Skills before work and may load other discovered Skills when required by their instructions or newly established evidence.

The Router may read Skill names, descriptions, and full Skill instructions when necessary to make a routing decision. It must not treat that access as permission to execute the Skill's project-domain method itself.

### Conditional authority-first method

When applicable authority is missing, false, materially incomplete, or subject to an important unresolved coverage question, the bounded domain outcome must use `spec-driven-development` to assess and reconcile that authority. The Handler must load it through Pi's normal Skill mechanism as the primary Skill, a companion, or a conditionally required Skill when instructions or newly established evidence require it. If a required Skill, reference, permission, or decision is unavailable, the Handler must report `blocked` without proceeding with work that requires it; no inline fallback or invented authority substitutes.

The Router owns the [visible pre-planning PRD/ADR/Spec assessment](router-delegation.md#visible-authority-assessment): `reuse`, `update`, `create`, `skip`, or `blocked`, with owning boundary, existing or intended path, and an evidence-backed one-sentence reason. It applies routing rules to available evidence without performing project-domain reading or assessment; missing domain evidence requires one delegated assessment outcome, not a combined authority-writing/planning pipeline. Required reconciliation must precede dependent planning. The assessment adds no Handoff/Result field, persisted artifact, receipt, CAS mechanism, or Resolver semantic check and supplies no writing or implementation permission.

A reliable assessment may be reused while scope, decisions, owners, and relevant authority versions remain covered; material changes, contradictions, or important uncertainty require reassessment of the affected portion. Settled authority and a known narrow writing objective may enter the owning writer directly under ADR-0004. SDD is not the exclusive ADR entrance, a permanent controller role, or a mandatory reload at every stage or Handler call. Direct entry preserves the assessment, authority, and authorization duties. C8-C10's bounded restoration/maintenance exceptions and first-tuple standalone preparation remain governed by the [Router Spec](router-delegation.md#12-collaborative-authority-and-layered-delivery); SDD selection or a durable-change category alone must not force planned admission or an unavailable future tuple.

### Coordination-only strategy

`delegation-strategy` is the designated package Skill name for Router coordination, not a Handler domain method. When preparing new delegation the Router must discover it in the model-visible Pi Skill catalog and load its complete body with Pi's normal Skill mechanism before decomposition, domain Skill selection, Handoff creation, or capability requests. Within the same context a complete identifiable body can be reused; a new session, missing body after resume/compaction, changed catalog identity, or uncertainty requires reload. Unavailable or unreadable strategy blocks new delegation while already available Results may still be projected. Merely seeing the Skill name or a remembered summary is insufficient.

The strategy is instruction-only: it has no private orchestration tool, persistent state, or project-domain authority. Its method must preserve independent evidence Results for a shared deliverable, dependency/conflict and cost-aware dispatch, conditional background overlap, separate reasoning/impact selection, and truthful full-Result projection under [Router delegation](router-delegation.md#13-evidence-branch-scheduling-and-strategy-loading). Its presence in the unfiltered structural Handoff enum does not authorize a Handler to coordinate; a Handler accidentally handed this coordination task must refuse it. No second coordinator is implied. The source instruction alignment and focused independent review for this contract are complete. The delivered source evidence supports the visible assessment and conditional SDD wording; static assertions do not prove that a live model loads or follows these Skills, that a provider exposes the current bytes, or that reload/installed-runtime acceptance has occurred.

## 2. Initial Package Skills

### Clarification

- `clarify-intent`: identify missing user decisions, evidence gaps, options, and consequences needed to establish intent.
- `clarify-structure`: turn dense or ambiguous input into a decision structure the Router can present clearly.

A clarification Handler returns proposed questions and supporting context through the normal Result report. It does not interact with the user directly.

### Research

- `research-source-grounded`: shared source, evidence, citation, negative-evidence, and uncertainty rules.
- `research-quick`: answer one narrow factual question with bounded primary-source research.
- `research-deep`: investigate architecture, impact, dependencies, conventions, and risk.
- `research-compare`: compare concrete alternatives against explicit criteria and evidence.
- `research-trace`: trace behavior, ownership, history, or causality across sources.
- `research-audit`: test claims or an existing artifact against source evidence and report discrepancies.

Research modes apply `research-source-grounded` whenever material claims depend on external or project evidence.

### Diagnosis

- `diagnose`: reproduce a failure, isolate variables, establish root cause, and identify the smallest evidence-backed correction and regression check.

A `diagnose` Handoff must stop at reproduction, root-cause attribution, and correction/regression-check guidance; it must not apply the correction, even when the repair is already known. Research and review methods may support that diagnosis outcome. Applying its correction requires a separate, authorized `implement-change` Handoff. Loading `diagnose` as a companion preserves its diagnosis-only method boundary and grants no repair permission.

Under the [generic single-result delegation contract](router-delegation.md#11-generic-single-result-delegation-contract), an authorized implementation Handoff may perform reproduction, root-cause analysis, and regression verification as internal methods serving its one repair predicate; it does not require a separate diagnosis Result first. A bundle requesting independently valuable diagnosis and implementation outcomes must be blocked before either is performed. A Handoff does not establish authorization; missing required permission or a material change to authority or authorized scope must stop the affected execution until the applicable [authority and authorization requirements](router-delegation.md#12-collaborative-authority-and-layered-delivery) are satisfied.

### Design

- `analyze-solution-directions`: identify constraints, generate materially different approaches, compare tradeoffs, and return a decision-ready recommendation without silently committing architecture.

### Delivery

- `spec-driven-development`: guide authority assessment and reconciliation for the current bounded outcome in durable behavior, interface, architecture, security, migration, or multi-step delivery under the conditional selection contract above.
- `plan-implementation`: turn accepted authority and context into the smallest executable Work/Plan/Waves graph for delivery.
- `implement-plan`: coordinate execution of an accepted Plan/Waves graph and reconcile findings with its authority and item boundaries.
- `implement-change`: perform one bounded code, configuration, or ordinary-documentation change and leave focused verification evidence.

`spec-driven-development` may require documentation, planning, implementation, research, clarification, or review methods only when they serve the current delegated terminal predicate. Such method composition must not create delegations, ask the user, schedule other stages, or perform another independently valuable outcome. Unsettled material product or architecture questions must return as evidence and gaps for Router-owned communication. Authorization, user questioning, cross-stage coordination, continuation, and Result/Waves/Todo progression remain Router-owned. `implement-plan` uses `implement-change` for bounded implementation units within the same Handler single-outcome boundary.

New planned work uses Work/Context/Plan/Waves: the selected Waves document is the sole executable graph, with one Handler and one Result per item. The [Router Delegation Specification](router-delegation.md#new-planned-work-document-and-release-contract) owns tuple selection, item-ID dependencies, Wave gates, ownership/conflicts, and release semantics. `documentation-plan-writing` drafts the Plan and matched Waves graph; historical Tasks remain compatibility records requiring explicit migration, not a synonym or silent fallback. This discovery guidance does not claim live Resolver or Router conformance.

### Documentation

- `documentation`: classify document ownership and coordinate multi-artifact documentation work.
- `documentation-structure`: determine repository locations, naming, authority relationships, and bounded Work structure; own the concrete default folder layout for ADR, PRD, Spec, Proposal, DDD, and Work artifacts.
- `documentation-work`: create or update a bounded Work entry and processed Context from current authority.
- `documentation-prd-writing`: create or update product intent, scope, requirements, outcomes, and success criteria.
- `documentation-adr-writing`: create or update accepted architectural decisions, rationale, consequences, and revisit criteria.
- `documentation-spec-writing`: create, update, or validate normative behavior, interfaces, constraints, and failure contracts.
- `documentation-plan-writing`: derive an implementation Plan and its matched Waves graph from accepted authority and Work Context.
- `documentation-tasks-writing`: preserve or analyze historical Tasks records during an explicit migration; it is not the executable path for new planned work.
- `documentation-proposal-writing`: manage non-authoritative proposal creation and lifecycle transitions.
- `documentation-domain-driven-design`: document domain language, invariants, bounded contexts, and context relationships.

`documentation` routes each artifact to its owning Skill. Writers must update existing authority when ownership is unchanged instead of creating competing documents. When an owning repo or package has no explicit documentation convention, writers must use the default placement in [documentation-structure](../../skills/documentation-structure/SKILL.md#default-layout). DDD defaults to an owner-root `CONTEXT.md` for a single context, or an owner-root `CONTEXT-MAP.md` linking per-context `CONTEXT.md` files for multiple contexts; it does not default to `docs/ddd/`. Explicit existing conventions take precedence; this default does not require a repository-level `docs/` directory or any unused artifact.

For ADR ownership, the [ADR writer lifecycle](../../skills/documentation-adr-writing/SKILL.md#method) must reuse the owning ADR for the same decision identity and update it when an accepted amendment is required. A new ADR is permitted only for a distinct accepted decision lifecycle; an unaccepted choice must not be recorded as an accepted ADR. File count, change size, SDD invocation count, and new-ADR count do not establish coverage. `documentation` and its owning writers remain methods for the current Handler outcome, not permission to complete independent document branches or a cross-stage pipeline in one Handoff.

### Review

- `review-correctness`: independently assess behavior, regressions, edge cases, and missing tests.
- `review-security`: independently assess trust boundaries, abuse cases, data exposure, permissions, and unsafe defaults.
- `review-evidence`: verify that claims and completion statements are supported by reproducible evidence.
- `review-decision`: independently assess the evidence, alternatives, assumptions, and consequences behind a proposed or accepted decision.

Review Skills are read-only unless a separate Handoff explicitly requests remediation. The Router never substitutes its own review for a Handler review.

### LLM Systems

- `llm-instruction-writing`: create or revise model instructions, Agent definitions, Skills, and prompt contracts for clarity, authority, and testability.

## 3. Composition Rules

- A method-coordinating Skill requires another Skill's instructions only when current evidence and the delegated outcome require them; loading composes methods, not delegations or stages. There is no mandatory fixed phase sequence, and every selected or conditionally loaded method must serve the same single terminal predicate.
- A companion Skill adds a known cross-cutting method or constraint. It does not transfer ownership away from the primary Skill.
- A Handler may load an unlisted Skill when new evidence makes it necessary and must report that material change in its Result.
- No Skill or companion may widen authority, authorization, or the Handler's single-outcome boundary. SDD and documentation guide the current outcome only; independently valuable assessment, authority-writing, planning, implementation, or verification outcomes require separate Router coordination. An invalid multi-outcome bundle must be blocked before performing any outcome.
- A Handler must not recommend the Router's next Skill or workflow action. It reports outcomes, evidence, gaps, risks, and artifacts; the Router decides the next delegation.

The [Router authority-assessment acceptance scenarios A1-A10](router-delegation.md#authority-assessment-acceptance-scenarios) also verify this selection/composition contract: adequate coverage permits `reuse`, the same ADR identity permits owner `update`, only a distinct accepted lifecycle permits `create`, bounded maintenance permits justified `skip`, and unresolved material gaps require SDD-guided assessment and `blocked` before dependent planning. Reliable reuse, settled narrow entry, first-tuple standalone preparation, and Handler evidence return without direct user questioning or cross-stage execution must remain observable. Document and static instruction checks alone do not prove these model behaviors.

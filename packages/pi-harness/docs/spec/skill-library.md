# Skill Library Specification

## 1. Discovery and Selection

Every model-visible Skill discovered by Pi is eligible for `handoff.primarySkill` and `handoff.companionSkills[]`. This includes the package library and user/project Skills. The extension does not maintain a control/leaf manifest, hide package Skills, or filter external Skills.

The Router selects exactly one primary Skill and zero or more unique companion Skills for each delegation. These relationships are local to that Handoff. A Handler must load the preselected Skills before work and may load other discovered Skills when required by their instructions or newly established evidence.

The Router may read Skill names, descriptions, and full Skill instructions when necessary to make a routing decision. It must not treat that access as permission to execute the Skill's project-domain method itself.

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

`diagnose` may use research, implementation, and review Skills according to whether the Handoff requests diagnosis only or a verified repair.

### Design

- `analyze-solution-directions`: identify constraints, generate materially different approaches, compare tradeoffs, and return a decision-ready recommendation without silently committing architecture.

### Delivery

- `spec-driven-development`: coordinate authority-first delivery for durable behavior, interface, architecture, security, migration, or multi-step change.
- `plan-implementation`: turn accepted authority and context into the smallest executable Plan and Tasks needed for delivery.
- `implement-plan`: coordinate execution of an accepted Plan and reconcile findings with its authority and task boundaries.
- `implement-change`: perform one bounded code, configuration, or ordinary-documentation change and leave focused verification evidence.

`spec-driven-development` may use documentation, planning, implementation, research, clarification, and review Skills as the current work requires. `implement-plan` uses `implement-change` for bounded implementation units.

### Documentation

- `documentation`: classify document ownership and coordinate multi-artifact documentation work.
- `documentation-structure`: determine repository locations, naming, authority relationships, and bounded Work structure; own the concrete default folder layout for ADR, PRD, Spec, Proposal, DDD, and Work artifacts.
- `documentation-work`: create or update a bounded Work entry and processed Context from current authority.
- `documentation-prd-writing`: create or update product intent, scope, requirements, outcomes, and success criteria.
- `documentation-adr-writing`: create or update accepted architectural decisions, rationale, consequences, and revisit criteria.
- `documentation-spec-writing`: create, update, or validate normative behavior, interfaces, constraints, and failure contracts.
- `documentation-plan-writing`: derive an implementation Plan from accepted authority and Work Context.
- `documentation-tasks-writing`: derive executable Tasks and dependencies from an accepted Plan.
- `documentation-proposal-writing`: manage non-authoritative proposal creation and lifecycle transitions.
- `documentation-domain-driven-design`: document domain language, invariants, bounded contexts, and context relationships.

`documentation` routes each artifact to its owning Skill. Writers must update existing authority when ownership is unchanged instead of creating competing documents. When an owning repo or package has no explicit documentation convention, writers must use the default placement in [documentation-structure](../../skills/documentation-structure/SKILL.md#default-layout). DDD defaults to an owner-root `CONTEXT.md` for a single context, or an owner-root `CONTEXT-MAP.md` linking per-context `CONTEXT.md` files for multiple contexts; it does not default to `docs/ddd/`. Explicit existing conventions take precedence; this default does not require a repository-level `docs/` directory or any unused artifact.

### Review

- `review-correctness`: independently assess behavior, regressions, edge cases, and missing tests.
- `review-security`: independently assess trust boundaries, abuse cases, data exposure, permissions, and unsafe defaults.
- `review-evidence`: verify that claims and completion statements are supported by reproducible evidence.
- `review-decision`: independently assess the evidence, alternatives, assumptions, and consequences behind a proposed or accepted decision.

Review Skills are read-only unless a separate Handoff explicitly requests remediation. The Router never substitutes its own review for a Handler review.

### LLM Systems

- `llm-instruction-writing`: create or revise model instructions, Agent definitions, Skills, and prompt contracts for clarity, authority, and testability.

## 3. Composition Rules

- A coordinating Skill invokes another Skill only when the current evidence and requested outcome require it; there is no mandatory fixed phase sequence.
- A companion Skill adds a known cross-cutting method or constraint. It does not transfer ownership away from the primary Skill.
- A Handler may load an unlisted Skill when new evidence makes it necessary and must report that material change in its Result.
- A Handler must not recommend the Router's next Skill or workflow action. It reports outcomes, evidence, gaps, risks, and artifacts; the Router decides the next delegation.

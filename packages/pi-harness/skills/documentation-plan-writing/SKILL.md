---
name: documentation-plan-writing
description: Write or update an implementation Plan derived from accepted authority and Work Context. Use when a durable execution strategy is needed before task decomposition.
---

# Documentation: Plan Writing

## Method

1. Read accepted PRD, ADR, Spec, Work Context, research, and current implementation evidence.
2. State objective, scope, non-goals, assumptions, and authority references. Block when a material decision is unresolved.
3. Default to one coherent executable Plan for a simple deliverable, regardless of file count. For genuinely complex staged delivery, use an overview for stages, dependencies, and incremental outcomes; the Router confirms its route separately, without authorizing stage execution. Detail a ready stage when authority and evidence suffice; defer future detail only if it neither invalidates the route nor hides a current-stage decision. Identify each implementation Plan's Spec-derived scope and overview relationship, if any.
4. Describe the minimum strategy, affected ownership boundaries, data or control flow, migrations, and compatibility behavior. For a ready implementation scope include outcome and important exclusions, behavior or artifact changes and owners, steps and material dependencies, verification and completion criteria, and important tradeoffs, risks, and decisions. Paths or readiness text alone cannot replace Router disclosure and explicit current-user confirmation of that scope.
5. Sequence phases only where dependencies require them. Identify independent work and conditions preventing unsafe parallelism. Define verification for each material behavior and a final integration gate.
6. Include rollback, transition, security, observability, documentation, or release handling only when required by authority or risk.
7. Record risks and evidence-backed mitigations. Do not add speculative infrastructure or future flexibility.
8. When a `@settingdust/pi-harness` executable Plan participates in planned admission, place it as one direct Plan member paired with its Tasks member under the same Work directory. Multiple explicit pairs may share a Work, but a delegation selects one pair only; an overview name, status, or path alone does not authorize execution or infer selection.
9. The Router Delegation Specification owns tuple grammar and admission validation. This Skill's naming guidance, headings, links, and status text do not prove document kind or acceptance.
10. Validate that every plan commitment derives from authority and that the Plan does not create new product or architecture decisions.

## Output

Report the Plan path, strategy, dependencies, verification, risks, and blockers. Keep task-sized execution details for `documentation-tasks-writing`.

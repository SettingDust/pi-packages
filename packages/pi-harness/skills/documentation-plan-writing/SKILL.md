---
name: documentation-plan-writing
description: Write or update an implementation Plan derived from accepted authority and Work Context. Use when a durable execution strategy is needed before task decomposition.
---

# Documentation: Plan Writing

## Method

1. Read accepted PRD, ADR, Spec, Work Context, research, and current implementation evidence.
2. State objective, scope, non-goals, assumptions, and authority references. Block when a material decision is unresolved.
3. Describe the minimum implementation strategy, affected ownership boundaries, data or control flow, migrations, and compatibility behavior.
4. Sequence phases only where dependencies require them. Identify work that can proceed independently and conditions that prevent unsafe parallelism.
5. Define verification for each material behavior and a final integration gate.
6. Include rollback, transition, security, observability, documentation, or release handling only when required by authority or risk.
7. Record risks and evidence-backed mitigations. Do not add speculative infrastructure or future flexibility.
8. When a `pi-harness` Plan participates in planned admission, place it as one direct Plan member paired with its Tasks member under the same Work directory. Multiple explicit pairs may share a Work, but a delegation selects one pair only; do not infer selection from status, order, or a lifecycle label.
9. The Router Delegation Specification owns tuple grammar and admission validation. This Skill's naming guidance, headings, links, and status text do not prove document kind or acceptance.
10. Validate that every plan commitment derives from authority and that the Plan does not create new product or architecture decisions.

## Output

Report the Plan path, strategy, dependencies, verification, risks, and blockers. Keep task-sized execution details for `documentation-tasks-writing`.

---
name: plan-implementation
description: Turn accepted authority and current project context into the smallest executable implementation plan and task set. Use when delivery needs ordered work, dependency control, or explicit verification before coding.
---

# Plan Implementation

## Method

1. Read accepted PRD, ADR, Spec, Work Context, relevant implementation, and current repository state. Identify conflicts or missing authority before planning.
2. Define the exact Spec-derived delivery boundary, non-goals, invariants, and completion evidence. Default to one coherent Plan even for multi-file work. Only genuinely complex staged delivery needs an overview showing stages, dependencies, and incremental outcomes; the Router discloses and confirms that route separately before any stage executes, and route approval does not authorize a stage.
3. Detail each ready implementation scope when authority and evidence suffice; future-stage details may wait if they do not invalidate the overview or hide a current-stage decision. For each ready scope identify intended outcome and important exclusions, proposed behavior or artifact changes and owners, execution steps and material dependencies, verification and completion criteria, and important tradeoffs, risks, and decisions. The Router must disclose these substantively and obtain explicit current-user confirmation of each implementation scope before execution; paths, overview approval, and Plan status do not substitute.
4. Decompose only where a unit has an independently verifiable outcome, distinct owner boundary, dependency, or risk. Keep trivial linear work in one task. Order tasks by real dependencies. Keep independently valuable outcomes separate even when their writes or other effects conflict; serialize conflicting tasks and dependencies.
5. For each task specify objective, relevant authority and context references, constraints, expected artifacts or behavior, and the smallest verification that proves completion.
6. Include migration, rollback, compatibility, security, and documentation work only when the accepted change requires them.
7. Use `documentation-plan-writing` and `documentation-tasks-writing` when durable Plan or Tasks artifacts are required by project convention. Provisional Tasks may be prepared with a reviewable ready Plan for one scope confirmation; Tasks are not a separate approval gate.
8. Check the plan against authority, repository reality, and risk. Surface unresolved decisions instead of encoding them as implementation assumptions.

## Output

Return the executable plan, dependencies, task boundaries, verification strategy, risks, and blockers. Do not implement the plan or rewrite accepted authority.

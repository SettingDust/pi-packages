---
name: plan-implementation
description: Turn accepted authority and current project context into the smallest executable Work/Plan/Waves graph. Use when delivery needs ordered work, dependency control, or explicit verification before coding.
---

# Plan Implementation

## Method

1. Read accepted PRD, ADR, Spec, Work Context, relevant implementation, and current repository state. Identify conflicts or missing authority before planning.
2. Define the exact Spec-derived delivery boundary, non-goals, invariants, and completion evidence. Default to one coherent Plan even for multi-file work. Only genuinely complex staged delivery needs an overview showing stages, dependencies, and incremental outcomes; the Router discloses and confirms that route separately before any stage executes, and route approval does not authorize a stage.
3. Detail each ready implementation scope when authority and evidence suffice; future-stage details may wait if they do not invalidate the overview or hide a current-stage decision. For each ready scope identify intended outcome and important exclusions, proposed behavior or artifact changes and owners, execution steps and material dependencies, verification and completion criteria, and important tradeoffs, risks, and decisions. The Router must disclose these substantively and obtain explicit current-user confirmation of each implementation scope before execution; paths, overview approval, and Plan status do not substitute.
4. Decompose only where a unit has an independently verifiable outcome, distinct owner boundary, dependency, or risk. Keep trivial linear work in one Wave item. Order item dependencies by real prerequisites. Keep independently valuable outcomes separate even when their writes or other effects conflict; serialize conflicting items and dependencies.
5. For each Wave item specify objective, relevant authority and context references, constraints, expected artifacts or behavior, stable item-ID dependencies, ownership/conflict notes, and the smallest verification that proves completion.
6. Include migration, rollback, compatibility, security, and documentation work only when the accepted change requires them.
7. Use `documentation-plan-writing` for the Plan and its matched Waves graph under its graph-validation rules. The Work/Context/Plan/Waves tuple keeps Waves as the sole executable graph, with one Handler and one Result per item. Use `documentation-tasks-writing` only when an explicit migration must preserve or analyze historical Tasks; it is not the new-plan execution path.
8. Check the plan against authority, repository reality, and risk. Surface unresolved decisions instead of encoding them as implementation assumptions.

## Output

Return the executable Work/Plan/Waves graph, item dependencies, ownership and conflict boundaries, verification strategy, risks, and blockers. Do not implement the plan or rewrite accepted authority.

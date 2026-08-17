---
name: plan-implementation
description: Turn accepted authority and current project context into the smallest executable implementation plan and task set. Use when delivery needs ordered work, dependency control, or explicit verification before coding.
---

# Plan Implementation

## Method

1. Read accepted PRD, ADR, Spec, Work Context, relevant implementation, and current repository state. Identify conflicts or missing authority before planning.
2. Define the exact delivery boundary, non-goals, invariants, and completion evidence.
3. Decompose only where a unit has an independently verifiable outcome, distinct owner boundary, dependency, or risk. Keep trivial linear work in one task.
4. Order tasks by real dependencies. Separate independent tasks only when they can safely execute without overlapping files, state, or decisions.
5. For each task specify objective, relevant authority and context references, constraints, expected artifacts or behavior, and the smallest verification that proves completion.
6. Include migration, rollback, compatibility, security, and documentation work only when the accepted change requires them.
7. Use `documentation-plan-writing` and `documentation-tasks-writing` when durable Plan or Tasks artifacts are required by project convention.
8. Check the plan against authority, repository reality, and risk. Surface unresolved decisions instead of encoding them as implementation assumptions.

## Output

Return the executable plan, dependencies, task boundaries, verification strategy, risks, and blockers. Do not implement the plan or rewrite accepted authority.

---
name: documentation-tasks-writing
description: Derive executable Tasks and dependencies from an accepted implementation Plan. Use when work needs explicit units that can be assigned, verified, and completed independently.
---

# Documentation: Tasks Writing

## Method

1. Read the exact accepted Plan version and its authority references. Do not decompose a draft or contradicted Plan.
2. Create the fewest tasks that preserve real dependency, ownership, review, or verification boundaries.
3. Give each task one observable outcome, required context references, constraints, expected touched surfaces, and completion evidence.
4. Define dependencies explicitly. A task must not depend on an unstated decision or on work hidden inside another task.
5. Separate independent tasks only when concurrent execution cannot conflict through files, shared state, migrations, or unresolved design.
6. Include focused tests and documentation updates in the owning implementation task unless they have a distinct dependency or specialist boundary.
7. Add integration or release tasks only when the Plan requires them.
8. When a `pi-harness` Tasks artifact participates in planned admission, keep it as the direct matched partner of its selected Plan in the same Work directory. A Work may contain multiple explicit pairs; do not infer the selected pair from a status, directory order, or a lifecycle label.
9. The Router Delegation Specification owns tuple grammar and admission validation. This Skill's naming guidance, headings, links, and status text do not prove document kind, receipt provenance, or acceptance.
10. Check full Plan coverage, absence of duplicate work, and a clear path from the first unblocked task to completion.

## Output

Report the Tasks artifact, ordered tasks, dependencies, parallel-safe groups, completion checks, and blocked decisions. Do not change the Plan while decomposing it.

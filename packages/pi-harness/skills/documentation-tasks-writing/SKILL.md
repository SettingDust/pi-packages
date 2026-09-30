---
name: documentation-tasks-writing
description: Maintain historical Tasks records during explicit migration from a ready implementation Plan. Do not use for new planned work; `waves.md` is the executable graph.
---

# Documentation: Historical Tasks Compatibility

This Skill preserves or analyzes an existing historical `tasks.md` during an explicit migration. It does not create the executable decomposition for new planned work; use the Plan's matched `waves.md` instead.

## Method

1. Read the exact historical Work/Plan/Tasks records and their authority references. Establish an explicit migration decision before deriving any new Work/Plan/Waves tuple; do not silently reinterpret Tasks as Waves or execute an unfinished historical plan.
2. Preserve only the historical task records and compatibility evidence required by the migration decision. Do not author a new Tasks layer for planned work.
3. When a migration is authorized, carry each retained outcome into one Wave item with one observable predicate, explicit item-ID dependencies, ownership, conflict rules, and completion evidence.
4. Define dependencies explicitly by stable item IDs. A Wave item must not depend on an unstated decision or on work hidden inside another item.
5. Keep independently valuable outcomes separate even when their writes or other effects conflict; serialize conflicting items and dependencies. Surface unresolved design decisions before execution.
6. Include focused tests and documentation updates in the owning Wave item unless they have a distinct dependency or specialist boundary.
7. Add integration or release items only when the Plan requires them.
8. When migrating a `@settingdust/pi-harness` Tasks artifact, keep it historical and link the replacement Work/Plan/Waves tuple explicitly. A Work may contain multiple explicit Plan/Waves pairs; do not infer the selected pair from a status, directory order, or a lifecycle label. Tasks are compatibility records, not approval receipts or new executable inputs.
9. The Router Delegation Specification owns tuple grammar and admission validation. This Skill's naming guidance, headings, links, and status text do not prove document kind, receipt provenance, or acceptance.
10. Check that the explicit migration preserves Plan coverage, has no duplicate work, and gives the replacement Waves graph a clear path from the first unblocked item to completion.

## Output

Report the historical Tasks paths, migration decision, replacement Waves path when authorized, item dependencies, completion checks, and blocked decisions. Do not change the Plan while recording compatibility evidence.

# Context: Todo Multi-Expand

- Status: **Implementation accepted by the user (Handoff-reported fact); T0 technical baseline passed; T1-T4 pending; unimplemented.**
- Related Work: [work.md](work.md)
- Existing Authority: [Todo Protocol Redesign Work](../todo-protocol-redesign/work.md), [Context](../todo-protocol-redesign/context.md), [Spec](../todo-protocol-redesign/spec.md), [Plan](../todo-protocol-redesign/plan.md), and [Tasks](../todo-protocol-redesign/tasks.md)
- Research Result: `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/research-todo-multi-expand-artifacts/result-1.json`

## Purpose

Processed context for the accepted Plan for status-derived concurrent expansion in the persistent Todo widget. This document is derived coordination material, not product or technical authority, and cannot itself authorize source or test changes. The current Handoff supplies the user-acceptance fact; [Tasks evidence](tasks.md#6-pre-t1-lifecycle-evidence) preserves its acceptance-time identities and the T0 technical-baseline reference. T1-T4 remain pending.

## Settled Direction

- The only target surface is the persistent widget. Host tool-result row expansion remains outside this Work.
- Every task group with at least one `in_progress` todo is expanded concurrently.
- When there are no `in_progress` todos in any group, the widget keeps the existing `selectedTodoTaskIndex` single-group fallback. It must not render an empty fully collapsed view when the snapshot has a usable fallback group.
- Task titles and todo rows keep their existing format. Todo descriptions are not rendered.
- There is no local todo-detail expansion. No keyboard interaction, cursor, toggle, custom overlay, or UI-only `Set` is added.
- Expansion is recomputed from the canonical status values on every widget projection. No second UI state is introduced.
- The four tools, canonical `TodoState` and `tasks[].todos[]`, `workingOn` derivation, Host tool-result renderer, persistence/recovery, formatter, reminder, visibility, and lifecycle behavior remain unchanged.

## Evidence Register

- **Fact:** The current layout selects one task group, renders all task titles, and renders todos plus `+N more` and terminal summary only for that selected group. **Source:** current `packages/todo/src/widget-layout.ts`, especially `selectedTodoTaskIndex()` and `renderTodoWidgetLines()`; independently traced by the completed research Result.
- **Fact:** `maxVisibleTasks` is currently passed as `maxVisible` and limits the selected task's visible open todo rows; its name does not describe its actual current task-group behavior. **Source:** current `packages/todo/src/widget.ts` and `packages/todo/src/widget-layout.ts`; completed research Result.
- **Fact:** Host tool-result `expanded` is a row-level Host rendering option, not Todo-owned multi-group state. **Source:** completed research Result and the existing Todo renderer path.
- **Fact:** The widget is recreated on projection, while the canonical snapshot is the only shared data model. **Source:** current `packages/todo/src/widget.ts` and the completed research Result.
- **Conclusion:** The accepted Plan fixes the pure widget layout projection as the implementation seam. The earlier conditional `widget.ts` candidate is superseded: existing wiring already supplies the inputs, so `widget.ts`, `widget-component.ts`, and protocol/persistence paths are excluded.

## Accepted Implementation Boundary

The two implementation paths are:

- `packages/todo/src/widget-layout.ts`: derive the set of task indexes to render from status and project each expanded group using the existing row helpers.
- `packages/todo/test/widget.test.ts`: regression coverage for status-derived rendering, fallback, formatting, and width safety.

The boundary is fixed by the accepted Plan, not independently authorized by this Context. Any additional path remains subject to the Plan's existing amendment, review, and acceptance requirements. Existing `todo-protocol-redesign` authority files must not be modified by this Work.

## Former Plan Questions (Resolved)

The following drafting questions are historical, not open decisions. Plan sections 2 and 6 resolve them: canonical task order; independent per-group limits and hidden counts; at most one terminal summary for the unchanged selected/fallback group; existing width fitting with no new height cap; status-derived mutation/restore recomputation; and the specified regression matrix. The questions did not authorize a summary for every expanded group:

1. The order of multiple active groups, including whether canonical task-array order is the required order.
2. The exact per-group meaning of the existing `maxVisibleTasks` setting, preserving compatibility with its current actual semantics unless an authorized decision says otherwise.
3. The `+N more` calculation and placement for each expanded group.
4. The placement of each expanded group's terminal summary relative to its todo rows and the next group.
5. Width and height behavior as multiple groups add rows, including narrow-width invariants and any existing renderer limits.
6. Automatic recomputation after mutation and after restore, without persistence or UI-state changes.
7. Focused tests for zero active groups, one active group, and multiple active groups, plus fallback, formatting, terminal summaries, and width safety as applicable.

## Exclusions and Risks

Do not infer user-controlled expansion from the earlier UI-only `Set` research option; the settled direction is status-derived. Do not expand pending-only or terminal-only groups merely because they have todos. Do not show descriptions, add a detail mode, or change the Host's tool-result expanded view.

The main compatibility risk is silently redefining `maxVisibleTasks` while changing from one expanded group to several. The Plan must state the preserved or intentionally amended semantics and test the resulting row counts. A second risk is accidental divergence between mutation and restore projections; both must use the same canonical status-derived layout path.

## Completion Signal

This Work remains incomplete until an authorized implementation and focused verification demonstrate that the persistent widget simultaneously renders all and only the groups containing `in_progress` todos, retains the selected-group fallback when none are active, preserves existing row formatting, and leaves excluded protocol, persistence, renderer, and interaction behavior unchanged.

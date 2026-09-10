# Work: Todo Multi-Expand

- Status: **Implementation accepted by the user (Handoff-reported fact); T0 technical baseline passed; T1-T4 pending; unimplemented.**
- Scope: Define the status-derived persistent Todo widget behavior that displays every task group containing at least one `in_progress` todo at the same time.
- Related Context: [context.md](context.md)
- Existing Authority: [Todo Protocol Redesign Work](../todo-protocol-redesign/work.md), [Context](../todo-protocol-redesign/context.md), [Spec](../todo-protocol-redesign/spec.md), [Plan](../todo-protocol-redesign/plan.md), and [Tasks](../todo-protocol-redesign/tasks.md)
- Research Result: `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/research-todo-multi-expand-artifacts/result-1.json`

## Goal

Make the persistent Todo widget derive its expanded task groups from the canonical Todo snapshot. Every group with at least one `in_progress` todo is expanded concurrently. When no group contains an `in_progress` todo, retain the current `selectedTodoTaskIndex` single-group fallback so the widget does not become an empty, fully collapsed view.

Task titles and todo rows retain their current format. The widget does not display todo descriptions and does not add local todo-detail expansion.

## Fixed Boundary

This Work is limited to the persistent widget projection and its focused regression coverage. The behavior is derived from `TodoState.tasks[].todos[].status`; it does not introduce a second UI model or user-controlled expansion state.

The following remain unchanged:

- The four-tool protocol, `TodoState`, and `tasks[].todos[]` canonical shapes.
- `workingOn` derivation and all formatter, reminder, visibility, persistence, and recovery behavior.
- Host tool-result rendering and its row-level `expanded` option.
- Keyboard interaction, cursor handling, toggle controls, custom overlays, and UI-only identity Sets.
- Todo descriptions in widget output and any local todo-detail view.

The implementation boundary is exactly `packages/todo/src/widget-layout.ts` and `packages/todo/test/widget.test.ts`, as specified by [Plan](plan.md) and [Tasks](tasks.md). The earlier conditional `widget.ts` candidate is superseded; it is excluded from implementation.

## Delivery State

The current Handoff reports that the user has accepted implementation of the Work/Context/Plan/Tasks tuple. This is a factual lifecycle synchronization, not an acceptance receipt or a new grant of authority by this document. T0's technical baseline passed; see [Tasks evidence](tasks.md#6-pre-t1-lifecycle-evidence) for the source and acceptance-time identities. T1-T4 remain pending; no implementation or verification completion is claimed. The accepted Plan defines the two-path rendering contract, dependency order, and verification. Completion still requires implementation and focused evidence that zero, one, and multiple active groups render according to the fixed boundary without changing excluded behavior.

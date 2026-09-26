# Context: Todo Inline Expand/Collapse

- Work: [work.md](work.md); authority: [protocol Spec section 9](../todo-protocol-redesign/spec.md#9-accepted-above-editor-inline-interaction).
- Status: initial implementation and authorized rendering correction completed with headless checks; live TUI observation pending.

## Accepted Decisions

The initial handoff accepted in-place interaction on the already mounted above-editor widget, command and existing shortcut entry, task selection with Up/Down, expansion with Left/Right/Enter/Space, full wrapped details and keyboard scrolling, Escape returning ordinary editor input, and a narrowly scoped public input listener with teardown. The subsequent user authorization keeps expanded entries rendered after Escape and on reentry for the current session, and requests Nerd Font expand/collapse indicators using the existing fallback setting. Off, absent, and below-editor widgets produce a notice without changing placement. No separate overlay or Host change. Spec section 9 owns the normative reconciliation of fixed collapsed row count, prior overlay retention, and prior `onTerminalInput` ban.

## Source Grounding

- `src/tool.ts` owns `/todo-details` and `Key.ctrlShift("t")`, previously opening `ctx.ui.custom(..., { overlay: true })`; it also owns the coordinator snapshot and restore entry.
- `src/widget.ts` owns factory publication, off/hidden behavior, refresh, restore reset, and the five-second terminal clear. `src/widget-component.ts` renders bounded inline details with presentation-only expansion; `src/widget-layout.ts` renders the summary, representative task rows and wrapped detail. `src/detail-overlay.ts` was a historical reference for wrapping/navigation, not an active entry path.
- Installed Pi `0.85.1` exposes public `setWidget` component factories and `ctx.ui.onTerminalInput` with unsubscribe; TUI routes input listeners before the focused component. Public declarations do not provide a supported focused-surface query for a listener or a guaranteed above-editor viewport height. Fullscreen mouse dispatch exists but is not required for this keyboard interaction.
- Earlier Compact Work contains historical overlay and no-terminal-listener constraints; its live acceptance remains unperformed. See the supplied [feasibility result](C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/clarify-todo-inline-expand-collapse-artifacts/result-1.json). Read-only inspection is not an interactive acceptance test.

## Technical Risks And Stop Conditions

- A global-before-focus public listener may consume arrows intended for another active Host surface. Keep it installed only during explicit Todo interaction, consume an exact key allowlist, and verify modal/overlay/editor passthrough in a live session. There is no proven public focused-surface query. If isolation cannot be demonstrated, stop; no implicit Host patch or overlay fallback.
- Host dock clipping may hide rows regardless of component-side slicing, especially at small terminal sizes. Bound and slice by current geometry and prove all wrapped descriptions reachable and visible in regular/fullscreen live TUI; if impossible with public APIs, stop.
- Factory replacement can dispose a component while the listener remains active. Repeated entry, refresh, hide/off, restore, terminal-clear and failure must all unsubscribe; stale input must pass through. Type/API evidence is plausible, not proof of these lifecycle transitions.
- Runtime shortcut collisions and duplicate `/todo-details` names remain governed by Pi's existing winner and qualified-command discovery rules. Do not invent another entry; verify a colliding shortcut and qualified command without assuming a suffix.

The delivery proposal and exact affected paths are in [Plan](plan.md). No code, test, dependency, staging, commit, or global activation change is authorized by this documentation preparation.

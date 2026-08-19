# Running Subagent Status Widget Context

## Goal

Add a minimal parent-session status widget above the Pi editor that shows only the currently running `pi-herdr-subagents` tasks.

## Authority

- [Running status widget specification](../../spec/running-status-widget.md)

## Fresh Review And Acceptance

- Second independent fresh review disposition: `accepted-ready`.
- The reviewer confirmed that the first review's P1/P2 findings are closed: recovery active-to-empty and active-to-new-scope invalidation; observation Result privacy; widget failure isolation; no-initial-event, synchronous callback, and listener-exception isolation; same-`createdAt` ordering; and separate negative checks for `inspect()`, `join()`, and polling.
- The user explicitly accepted this reviewed Plan and Tasks in the current main session and chose to begin implementation.
- This is Work lifecycle evidence, not a persistent acceptance receipt. Tasks 1 through 3 are now implemented and the integration gate is ready for final independent review.
- Acceptance is limited to serial Tasks 1 through 3 in their current form. It excludes elapsed time, child activity, configuration, custom components, new dependencies, tool semantics, and persistence.

## Prior Fresh Review Finding Closure
| Finding | Revision mapping |
| --- | --- |
| P1: recovery active-to-empty and active-to-new-scope invalidation was underspecified | Spec section 2 now requires one final invalidation for every successful recovery and explicitly covers active-to-empty, active-to-new-scope, and repeated same-scope recovery. Plan section 1 and Task 1 require focused coverage. |
| P1: observation Result privacy conflicted with existing `inspect`/`join` semantics | Spec sections 2 and 5 define the exact result-free `SubagentTaskObservation` shape, retain existing `inspect()` and `join()` semantics, and remove the claim that `join` is the unique full-Result path. Plan sections 1 and 2 and Tasks 1 through 3 preserve that boundary. |
| P1: widget failure isolation and throwing `setWidget` coverage were insufficient | Spec section 4 defines initial-render, refresh, empty-clear, and shutdown-clear isolation plus unconditional cleanup. Plan section 2 and Task 2 require all four paths. |
| P2: no-initial-event, synchronous callback, and listener-exception isolation lacked explicit checks | Spec sections 2 and 7 and Task 1 require each assertion. |
| P2: same-`createdAt` ordering, no `inspect`/`join`, and no-polling checks lacked explicit assertions | Spec sections 3 and 7, Plan section 3, and Task 2 require the tie-break and three separate negative assertions. |

## Accepted Decisions

- Use `ctx.ui.setWidget` with explicit `placement: "aboveEditor"`.
- Use native `string[]` content in the first version.
- Drive refreshes from runtime events; do not poll or call `inspect()` or `join()` from the widget path.
- Add only `listTasks()` and `onTaskUpdate()` as a low-coupling, read-only observation interface. `listTasks()` returns the separate observation-safe snapshot defined by the Spec, not `SubagentTask`.
- Show only current `running` tasks. Clear the widget when none remain.
- A successful recovery emits one final observation invalidation after its rebuilt scope is complete, including empty, new-scope, and repeated recovery outcomes.
- Keep terminal completion notifications independent. Preserve the existing `subagent_inspect` and `subagent_join` behavior without representing either as the exclusive Result path.
- Isolate all `setWidget` failures; session shutdown must still unsubscribe, release retained Context, and stop runtime monitors.

## Established Evidence

- The runtime currently stores task state in the private `SubagentRuntime.tasks` map and changes it through spawn/resume, recovery, settlement, cancellation, and removal.
- `SubagentTask` currently includes Result and internal execution fields, and `inspect()` and `join()` return that existing task shape. The new observation interface must project only the Spec-defined fields instead of reusing it.
- The extension currently owns parent-session recovery, tool registration, completion-message delivery, and `session_shutdown` monitor cleanup in `src/index.ts`.
- Pi 0.84.2 exposes `ctx.ui.setWidget(key, content, { placement })`; `string[]` is a supported content form, `aboveEditor` is a supported placement, and clearing content removes the widget.
- The prior read-only research is preserved at `C:\Users\WINDOWS\.pi\agent\sessions\--E--Projects-pi-packages--\2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4\tasks\subagent-18-artifacts\result-1.json`.

## Current Implementation State

The runtime now exposes the exact six-field observation projection and synchronous payload-free invalidation subscription. The parent extension renders only running tasks through the native `aboveEditor` string widget, keeps one subscription, clears terminal or empty state, isolates widget failures, and performs unconditional shutdown cleanup. Existing completion notification plus `subagent_inspect` and `subagent_join` behavior remain independent.

## Baseline Status

The green package baseline has been restored and recorded. The independent cancellation-slug cleanup used only `git restore` to remove the cancelled partial slug change in `src/index.ts`; no status-widget source or test work has started. Before these documentation edits, the worktree was clean at `HEAD 3b3ee81`.

- `bun run --cwd packages/pi-herdr-subagents typecheck` passed.
- `bun run --cwd packages/pi-herdr-subagents test` passed: 26 tests.

## Task 3 Integration Gate

- `bun run --cwd packages/pi-herdr-subagents typecheck` passed.
- `bun test packages/pi-herdr-subagents/tests/runtime.test.ts --test-name-pattern "runtime task observation|parent running-task widget"` passed: 8 tests, 21 filtered out, 48 assertions.
- `bun run --cwd packages/pi-herdr-subagents test` passed: 34 tests across 3 files, 144 assertions.
- `git diff --check -- packages/pi-herdr-subagents` passed; Git emitted only informational LF-to-CRLF working-copy warnings for the two modified TypeScript files.
- Fresh source and test audit found no authority drift and required no correction. The implementation diff is limited to `src/index.ts` and `tests/runtime.test.ts`; no dependency, steer, slug, Router, or tool-description change is present.
- Fresh full-suite evidence covers `inspect()`/`join()`, completion notification, recovery, resume, cancellation, removal, child continuation, and renderer behavior.

Final status: `ready-for-final-independent-review`. No commit was created.

## Explicit Omissions

Elapsed time, child activity, configuration, folding, custom TUI components, and new dependencies are outside this work.

## Completion Signal

Satisfied. Focused runtime and extension checks, package typecheck, full package tests, and diff integrity all pass. The final audit confirms the Spec boundaries and preserves completion notification plus existing `inspect()` and `join()` behavior.

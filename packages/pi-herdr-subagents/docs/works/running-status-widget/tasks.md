# Running Subagent Status Widget Tasks

- Review disposition: `accepted-ready`; the second independent fresh review closed the initial P1/P2 findings, and the user explicitly accepted the current Task 1 through Task 3 sequence to begin implementation. This records Work lifecycle evidence only; Tasks 1 through 3 are now completed and ready for final independent review.
- Plan: [Running status widget Plan](plan.md)
- Authority: [Running status widget specification](../../spec/running-status-widget.md)
- Context: [Work Context](context.md)

## Task 0: Restore And Record The Baseline

- Status: completed
- Dependency: none
- Objective: establish that status-widget implementation starts from a green package.
- Expected touched surfaces: none for this work; consume the concurrent cleanup result.
- Completion evidence: the independent cleanup used only `git restore` to remove the cancelled partial `src/index.ts` slug change. At `HEAD 3b3ee81`, before these documentation edits, the worktree was clean; `bun run --cwd packages/pi-herdr-subagents typecheck` passed and `bun run --cwd packages/pi-herdr-subagents test` passed with 26 tests.

## Task 1: Add Read-Only Runtime Task Observation

- Status: completed
- Dependency: Task 0
- Objective: implement the Spec-defined `SubagentTaskObservation`, `listTasks()`, and `onTaskUpdate()` with defensive snapshots and synchronous invalidations at every owned mutation boundary.
- Context: Spec sections 2 and 7; Work Context established runtime evidence and fresh-review mapping.
- Constraints: expose only `subagentId`, `generation`, `agent`, `label`, `status`, and `createdAt`; do not expose Result, errors, paths, transport identifiers, or other `SubagentTask` fields. Do not add event payloads, polling, persistence schema changes, dependencies, completion-notification coupling, or changes to `inspect()`/`join()`.
- Expected touched surfaces: `src/index.ts`, `tests/runtime.test.ts`.
- Completion evidence:
  - `src/index.ts` exports the exact six-field `SubagentTaskObservation`, returns fresh array/object projections from `listTasks()`, and exposes synchronous payload-free `onTaskUpdate()` subscriptions with idempotent unsubscribe.
  - Runtime tests prove no initial event, synchronous callbacks, defensive array/object copies, listener exception isolation, and completion-notification preservation.
  - Runtime tests prove invalidation after spawn, resume, terminal settlement including cancellation and launch failure, removal, and exactly one final invalidation after active-to-empty, active-to-new-scope, and repeated same-scope recovery with no stale snapshot.
  - `bun run --cwd packages/pi-herdr-subagents typecheck` passed.
  - `bun test packages/pi-herdr-subagents/tests/runtime.test.ts` passed: 24 tests.
  - `bun run --cwd packages/pi-herdr-subagents test` passed: 29 tests.
  - `git diff --check -- packages/pi-herdr-subagents` passed after removing an edit-introduced trailing whitespace line.

## Task 2: Bind Runtime State To The Parent Widget

- Status: completed
- Dependency: Task 1
- Objective: render the native-string running-task widget above the editor, own its parent-session lifecycle, and isolate all UI failures.
- Context: Spec sections 3 through 7; finalized Task 1 observation interface.
- Constraints: parent process only; one subscription; no custom component, configuration, child-activity request, or terminal data in the widget. The widget must use only `listTasks()` and must preserve completion messages and existing `inspect()`/`join()` behavior.
- Expected touched surfaces: `src/index.ts`, `tests/runtime.test.ts`.
- Completion evidence:
  - `src/index.ts` retains the active parent Extension Context after successful recovery, owns one runtime update subscription, and renders native string lines through explicit `aboveEditor` placement using only `listTasks()`.
  - Focused tests prove running-only filtering, ascending `createdAt` order, lexical `subagentId` tie-breaks, terminal/empty clearing, repeated lifecycle handling without duplicate subscriptions, and separate zero-call assertions for `inspect()`, `join()`, `setInterval`, and `setTimeout`.
  - Focused tests separately isolate throwing `setWidget` calls during initial render, update refresh, empty clear, and shutdown clear. They also prove later refresh, completion delivery, later `join()`, unsubscribe, retained Context release, repeated cleanup, and `runtime.stop()` remain available.
  - `bun run --cwd packages/pi-herdr-subagents typecheck` passed.
  - `bun test packages/pi-herdr-subagents/tests/runtime.test.ts --test-name-pattern "parent running-task widget"` passed: 5 tests.
  - `bun run --cwd packages/pi-herdr-subagents test` passed: 34 tests.
  - `git diff --check -- packages/pi-herdr-subagents` passed.

## Task 3: Run The Integration Gate

- Status: completed
- Dependency: Task 2
- Objective: verify the bounded change against the full package and inspect the final diff for authority drift.
- Expected touched surfaces: none beyond corrections required by Tasks 1 or 2.
- Completion evidence:
  - `bun run --cwd packages/pi-herdr-subagents typecheck` passed.
  - `bun test packages/pi-herdr-subagents/tests/runtime.test.ts --test-name-pattern "runtime task observation|parent running-task widget"` passed: 8 tests, 21 filtered out, 48 assertions.
  - `bun run --cwd packages/pi-herdr-subagents test` passed: 34 tests across 3 files, 144 assertions.
  - `git diff --check -- packages/pi-herdr-subagents` passed; only informational LF-to-CRLF working-copy warnings were emitted for `src/index.ts` and `tests/runtime.test.ts`.
  - Fresh audit confirmed the exact six-field projection; no initial subscription event; synchronous isolated invalidation; exactly-once final recovery invalidation; running-only deterministic widget ordering and clear behavior; UI failure isolation; unconditional shutdown cleanup; and no widget polling, `inspect()`, or `join()` calls.
  - Fresh full-suite regressions passed for `inspect()`/`join()`, completion notification, recovery, resume, cancellation, removal, child continuation, and renderer behavior.
  - The implementation diff is limited to `src/index.ts` and `tests/runtime.test.ts`. No elapsed/activity/configuration/custom-component/dependency, steer, slug, Router, tool-description, observation Result exposure, or unrelated runtime change is present.
  - No correction was required, no authority drift was found, and no commit was created.
  - Final disposition: `ready-for-final-independent-review`.

## Execution Order

`Task 0 -> Task 1 -> Task 2 -> Task 3`

There is no parallel-safe task group because Tasks 1 and 2 overlap the same runtime and test files, and Task 3 verifies their integrated result.

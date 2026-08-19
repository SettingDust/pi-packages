# Running Subagent Status Widget Plan

- Review disposition: `accepted-ready`; second independent fresh review passed, and the user explicitly accepted this current Plan and Tasks to begin implementation. The initial recovery invalidation, observation privacy, UI failure isolation, subscription detail, ordering, and negative-check findings are closed.
- Authority: [Running status widget specification](../../spec/running-status-widget.md)
- Context: [Work Context](context.md)

## Objective

Expose minimal read-only runtime task observation and bind it to a native Pi widget above the editor without changing terminal notification or existing `inspect()`/`join()` semantics.

## Scope

- Add an observation-safe `SubagentTaskObservation` projection, `listTasks()`, and `onTaskUpdate()` to `SubagentRuntime`.
- Emit synchronous invalidations at existing task mutation boundaries and once after every successful recovery's final state.
- Render and clear the parent-session widget from runtime invalidations.
- Isolate every `setWidget` failure path without interrupting runtime or completion behavior.
- Add focused runtime and extension lifecycle coverage.

## Non-Goals

Do not add elapsed time, child activity, polling, configuration, custom components, folding, dependencies, persistence changes, or tool-contract changes. Do not change existing `subagent_inspect` or `subagent_join` behavior.

## Preconditions

1. The cancellation-slug cleanup restored the green package baseline at `HEAD 3b3ee81`; the cleanup only reverted the cancelled partial `src/index.ts` slug change with `git restore`, and the worktree was clean before this documentation update.
2. Baseline evidence is recorded: `bun run --cwd packages/pi-herdr-subagents typecheck` passed and `bun run --cwd packages/pi-herdr-subagents test` passed with 26 tests.

## Implementation Strategy

### 1. Runtime observation

Keep the existing task map as the single source of truth. Project every task into the exact six-field `SubagentTaskObservation` shape from the Spec; never return `SubagentTask` from `listTasks()`. Return a new array and new objects on every call.

Maintain a private listener set for `onTaskUpdate()` and return an idempotent closure that removes its listener. Add one small synchronous notification helper that catches each listener exception and continues with the remaining listeners. It must not carry a task payload, call completion notification, or expose Result content.

Call that helper after the existing in-memory mutation reaches its observable state for spawn, resume, terminal settlement including cancellation and launch failure, and removal. Structure `recover()` to notify exactly once after its final selected-scope state is complete, including an active scope becoming empty, an active scope changing to another scope, and a repeated recovery of the same scope. Do not issue a completed-recovery invalidation when recovery throws before final state.

### 2. Extension widget lifecycle

Keep widget ownership in the parent extension in `src/index.ts`. After successful recovery, retain the active parent Extension Context, ensure exactly one runtime subscription, and render the initial snapshot. Repeated lifecycle handling may refresh but must replace or reuse the existing subscription rather than duplicate it.

The refresh function must call only `listTasks()`, filter `running`, sort by `createdAt` and then lexical `subagentId`, and set the native line array with explicit `aboveEditor` placement. An empty running set must clear with `setWidget(widgetKey, undefined)`. It must not call the `inspect` implementation, the `join` implementation, child activity, or a polling timer.

Wrap initial render, update refresh, and empty clear `setWidget` calls at the widget boundary so their errors do not escape into lifecycle or observation callbacks. Shutdown must attempt unsubscribe, clear, Context release, and `runtime.stop()` with `finally`-protected cleanup, so a throwing clear cannot block the other three operations. Leave completion message delivery and existing `inspect()`/`join()` behavior unchanged.

### 3. Verification

Extend runtime tests for the exact observation projection and defensive snapshots; no-initial-event and synchronous callback semantics; idempotent unsubscribe; listener-failure isolation; required mutation invalidations; and final recovery invalidation for active-to-empty, active-to-new-scope, and repeated recovery.

Extend extension tests with a minimal fake `ctx.ui` to prove explicit placement, running-only lines, `createdAt`/`subagentId` ordering including a timestamp tie, terminal and empty clearing, and no duplicate subscription across repeated lifecycle handling. Add distinct assertions that the widget calls neither `inspect()` nor `join()` and does not request polling or polling timers. Make `setWidget` throw in initial render, update refresh, empty clear, and shutdown clear, and prove the specified runtime and cleanup operations still occur.

Run the package typecheck and full package test suite. Existing completion-notification plus `inspect()`/`join()` tests are regression gates for the required separation.

## Dependency Order

Runtime observation precedes widget binding because the extension must consume the finalized read-only interface. Focused tests belong with each implementation step. Final package verification follows both.

No implementation task is parallel-safe: runtime, extension, and tests share `src/index.ts` and `tests/runtime.test.ts`.

## Risks And Mitigations

- **Stale recovery widget:** require one final invalidation from every successful recovery, including empty, new-scope, and repeated outcomes, then test all three.
- **Result or internal-field exposure:** use an exact observation projection rather than a `SubagentTask` copy and assert excluded fields are absent.
- **Duplicate session subscription:** make replacement or reuse explicit and test repeated lifecycle handling.
- **Widget failure affecting task delivery:** catch widget-boundary failures and make shutdown cleanup unconditional; test every `setWidget` invocation path.
- **Baseline ambiguity:** satisfied by the recorded green package baseline at `HEAD 3b3ee81`; rerun the same commands after implementation to distinguish new regressions.

## Final Gate

The implementation is complete only when the Spec acceptance checks, package typecheck, and full package tests pass from the restored baseline, with no source or test changes outside this bounded work. This Plan is accepted for the current serial Tasks 1 through 3; it does not expand the stated non-goals.

# Running Subagent Status Widget Specification

## 1. Scope

The `pi-herdr-subagents` parent-session extension must show the current running subagents in a Pi widget above the editor. The widget is a transient status surface; terminal delivery and Result retrieval remain separate runtime behaviors.

This specification applies only to the parent process. A child process identified by `PI_HERDR_SUBAGENT_RESULT_PATH` must not install the widget.

## 2. Runtime Observation Interface

`SubagentRuntime` must expose a distinct observation-safe task shape and these read-only observation methods:

```ts
export type SubagentTaskObservation = Readonly<{
  subagentId: string;
  generation: number;
  agent: string;
  label: string;
  status: TaskStatus;
  createdAt: string;
}>;

listTasks(): readonly SubagentTaskObservation[]
onTaskUpdate(listener: () => void): () => void
```

`SubagentTaskObservation` must contain exactly the fields shown above. It must not contain `result`, `error`, `cwd`, `model`, `thinking`, session or artifact paths, Herdr tab or pane identifiers, `updatedAt`, or other runtime-internal fields.

Each `listTasks()` call must return a newly allocated array containing newly allocated observation objects for every task in the active runtime scope. Mutating a returned array or observation object must not mutate runtime state or a later observation result.

`onTaskUpdate()` must register a synchronous, payload-free invalidation callback and return an idempotent unsubscribe function. Registering a listener must not emit an initial event; callers obtain initial state with `listTasks()`. The callback must not expose Result content or trigger completion behavior.

The runtime must invoke subscribed callbacks after an observable task-set or task-state change, including:

- a generation entering `running` through spawn or resume;
- a running generation becoming terminal, including cancellation and launch failure;
- task removal; and
- successful recovery completing its final active scope.

A successful `recover()` invocation must issue exactly one final invalidation after it has selected the target scope and finished rebuilding its in-memory task state. This requirement applies when recovery changes an active scope to an empty scope, replaces an active scope with a different scope, and repeats for the same scope. Intermediate clear or rebuild changes may be coalesced, but a subscriber must not retain stale tasks after the call completes. A recovery that throws before its state is complete must not report a completed-recovery invalidation.

One subscriber throwing must not fail the runtime operation, prevent the remaining subscribers from being called, suppress completion notification, or change `inspect()` or `join()` behavior.

## 3. Widget Behavior

The extension must register a widget through:

```ts
ctx.ui.setWidget(widgetKey, lines, { placement: "aboveEditor" })
```

The first version must use Pi's native `string[]` widget content. It must not introduce a custom TUI component or dependency.

For every initial render and update refresh, the extension must:

1. call only `listTasks()` to obtain local observation data;
2. select only tasks whose current status is `running`;
3. order them by ascending `createdAt`, then ascending lexical `subagentId` when `createdAt` values are equal;
4. render one line per selected task as `<subagentId> · <label> · <agent> · generation <generation> · running`; and
5. call `ctx.ui.setWidget(widgetKey, undefined)` when no running task remains.

The widget must refresh from `onTaskUpdate()` invalidations. It must not poll, schedule polling timers, call `inspect()`, call `join()`, or request child activity to discover status.

A terminal task must disappear on the first refresh after its terminal transition. Retained completed, failed, or cancelled tasks must not appear.

## 4. Lifecycle And Failure Isolation

The extension must keep at most one runtime observation subscription for the active parent session. After a successful session recovery, it must retain the current parent Extension Context, ensure the single subscription exists, and perform one initial render from `listTasks()`. Repeated `session_start`, `before_agent_start`, or recovery handling may refresh the widget, but must not install duplicate subscriptions.

A `setWidget` exception during the initial render, an update refresh, or an empty-state clear must be caught at the widget boundary. It must not escape into the runtime callback or session lifecycle, prevent a later refresh, alter task state, suppress completion notification, or alter `inspect()` or `join()` behavior.

Session shutdown must attempt subscription removal, widget clearing, retained Context release, and `runtime.stop()` on every path. The cleanup structure must use `finally` or equivalent so that a throwing shutdown clear cannot block unsubscribe, Context release, or `runtime.stop()`. Repeated cleanup must be harmless. Widget-operation failures must not block completion delivery or any in-progress or later `join()`.

## 5. Separation From Completion And Result Retrieval

The existing `pi-herdr-subagent-completion` message remains the only terminal notification path and remains responsible for triggering the parent turn.

The status widget must not send messages, trigger turns, acknowledge notifications, or include terminal reasons. Existing `subagent_inspect` and `subagent_join` execution semantics, including their existing task-data visibility, must remain unchanged. This specification does not claim that `join` is the unique full-Result access path; the observation interface and widget must never expose Result content or invoke either tool operation.

## 6. Non-Goals

The first version does not provide:

- elapsed time;
- child tool or assistant activity;
- queued or retained-task summaries;
- placement, style, visibility, or refresh configuration;
- folding, expansion, interaction, or custom components; or
- polling timers or new dependencies.

## 7. Acceptance

The contract is satisfied when focused checks demonstrate that:

- `listTasks()` returns only the specified observation-safe fields and its array and objects cannot mutate runtime state or later snapshots;
- subscriptions emit no initial event, invoke callbacks synchronously after each required mutation boundary, support idempotent unsubscribe, and isolate a throwing listener from other listeners and runtime/completion behavior;
- spawn, resume, terminal settlement including cancellation and launch failure, removal, and every successful recovery invalidate subscribers at the required state boundary;
- recovery invalidates exactly once after its final state for active-to-empty, active-to-new-scope, and repeated same-scope recovery, leaving no stale observation;
- the extension installs an explicit `aboveEditor` native-string widget containing only deterministically ordered running tasks, including `subagentId` ordering when `createdAt` ties;
- the widget makes no `inspect()` call, no `join()` call, and no polling or polling-timer request;
- terminal transition and empty state clear stale lines;
- `setWidget` failures in initial render, update refresh, empty clear, and shutdown clear are isolated, while shutdown still unsubscribes, releases retained Context, and stops runtime monitors;
- repeated session lifecycle events do not duplicate subscriptions; and
- completion messages and existing `inspect()`/`join()` behavior remain unchanged.

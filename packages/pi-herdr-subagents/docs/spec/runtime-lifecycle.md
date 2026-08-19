# Subagent Runtime Lifecycle Specification

## 1. Authority And Reconciliation Status

This document is the normative lifecycle authority for the three already-submitted `pi-herdr-subagents` runtime behaviors covered by:

- persistent runtime task recovery;
- terminal completion notification; and
- child-side continuation after an unfinished `agent_end`.

It also records the bounded post-reconciliation `subagent_join` caller-cancellation amendment in section 9. That amendment is current behavior with its own source/test evidence; it is not a fourth item in the original three-behavior historical chronology.

It was written after implementation and after the original behaviors were committed. The chronology is intentional: this is an authority reconciliation, not a claim that the behavior was designed, reviewed, or accepted before implementation. The related decision record is [ADR: Runtime lifecycle authority reconciliation](../adr/runtime-lifecycle-authority-reconciliation.md). The derived review record is [Runtime lifecycle reconciliation Context](../works/runtime-lifecycle-reconciliation/context.md).

No new PRD is created. These behaviors preserve the existing delegation product boundary and add technical lifecycle contracts rather than a new user outcome or product scope.

## 2. Scope And Terms

This specification covers the parent `SubagentRuntime`, its persisted task artifacts, its completion notifier, and the child `pane-child` extension. Section 9 additionally bounds caller cancellation while `subagent_join` waits for a Result. It does not define task-derived ID allocation, steering submission, the running-status widget, Agent discovery, or Handler Result parsing beyond the lifecycle obligations needed to transport a Result.

- **task**: one stable `subagentId` conversation identity.
- **generation**: one execution revision of a task. A resume increments it while retaining the task identity and session file.
- **terminal state**: `completed`, `failed`, or `cancelled`.
- **manifest**: version-1 `task.json` in the task artifact directory.
- **Result**: the generation-specific Result artifact written by the child.
- **terminal notification**: a summary-only parent message for one task and generation.
- **continuation**: a child-side follow-up user message that keeps the same child session and generation active after an unfinished agent turn.
- **caller cancellation**: aborting the caller's `subagent_join` Result-retrieval wait without changing child task lifecycle state.

The task-derived identity rules remain owned by [Task-Derived Subagent ID Specification](task-derived-subagent-id.md). Its collision and legacy rules apply wherever this document refers to `subagentId`.

## 3. Persistent Task Recovery

### 3.1 Persistence

For every started generation, the runtime must persist a version-1 manifest under `<tasksDir>/<subagentId>-artifacts/task.json`. The manifest must retain the task identity, current generation, Agent, cwd, label, optional model/thinking settings, original session path, pane identity when known, status, timestamps, error when present, and the notification marker when the generation's notification has been accepted.

Generation-one session storage is `<tasksDir>/<subagentId>-g1.jsonl`. Generation-specific Results are stored in the task artifact directory as `result-<generation>.json`. A resumed generation reuses the original session path and writes a new generation Result and launch artifact in the same task artifact directory.

Manifest and artifact writes must be atomic at the file boundary. A launch failure after allocation remains a retained task record; it is not silently released or converted into a new task.

### 3.2 Recovery Scope And Adoption

`recover(cwd, parentSessionFile)` must select exactly the task scope derived from the parent session, or the documented no-parent fallback. It must stop monitors and rebuild in-memory state from that scope. Repeated recovery of the same scope must be idempotent; changing scope must not retain tasks from the previous scope.

Recovery must discover supported canonical and legacy task artifact directories and validate the manifest identity, generation, expected session path, expected artifact path, status, and field types before adoption. Malformed, unsupported, or mismatched records must be ignored without adopting a pane or exposing a task. Legacy `subagent-N` records remain recoverable without renaming; canonical ID compatibility is defined by the task-derived ID Spec.

Recovery must use the following state precedence for a valid record:

1. If the current generation Result exists and has matching `subagentId` and `generation`, adopt its terminal status and Result/error fields.
2. If a Result exists but has a mismatched identity, invalid status, invalid Result shape, or malformed JSON, adopt the task as failed with the corresponding stable runtime error; a stale Result must never settle the current generation as successful.
3. If no Result exists and the persisted record is terminal, retain that terminal state.
4. If no Result exists and the record is starting/running, positively verify the retained pane. A retained pane is adopted as running without relaunch. A missing pane becomes `failed` with `pane_closed`; pane verification failure becomes `failed` with its diagnostic reason.
5. A starting record without a usable pane is treated as `pane_closed` rather than relaunched.

After each successful recovery, the runtime must persist the reconstructed state, start monitoring only for running tasks, and deliver any pending terminal notification. Recovery must not create a new pane, replace a stable task identity, or overwrite a current generation with a stale Result.

### 3.3 Resume And Remove Boundaries

`resume` must reject a running task, retain the stable `subagentId`, retain the original session file, increment the generation by one, and create a new execution revision. A stale Result from an earlier generation must not settle the resumed generation.

`remove` must stop monitoring, close a running pane, remove the task from the active in-memory scope, delete the original session file, and delete the task artifact directory. Explicit removal is the lifecycle boundary that permits a later runtime to reuse an otherwise available task-derived ID. Recovery must not perform this cleanup implicitly.

## 4. Terminal Notification

### 4.1 Terminal Coverage

When a completion notifier is configured, the runtime must produce one terminal notification attempt for every terminal transition of the current generation, including:

- a valid completed, failed, or cancelled Result;
- an invalid or stale Result that settles the task as failed;
- an unexpectedly closed pane;
- pane verification failure;
- cancellation after the pane is closed; and
- launch or launch-script failure before `spawn` rejects.

The notification summary must contain `subagentId`, `generation`, terminal `status`, `label`, and an optional bounded `reason`. It must not contain the full Handler Result body, model output, session contents, or internal Result text. `subagent_join` remains the operation that returns the complete task snapshot and Result data; notification delivery must not replace or truncate it.

### 4.2 Pending State, Dedupe, And Replay

A terminal task with no accepted notification marker is pending. The pending state is represented by the persisted terminal manifest without `notifiedGeneration` equal to the current generation. A successful notifier callback must mark that generation as notified and persist the marker.

The runtime must deduplicate notification attempts by the pair `<subagentId>:<generation>` during one runtime lifetime. On parent-session recovery, existing completion-message entries must be treated as consumed notification keys. A recovered terminal task whose notification key is neither persisted nor present in the parent-session marker set must be replayed once for that recovery, then marked after successful delivery. Repeating recovery or restarting after a persisted marker must not emit another notification for that key.

Notification delivery failure must not change task status or Result data. It must leave the notification pending so a later recovery can retry it. The notifier is allowed to be asynchronous, and notification failure must not prevent `inspect`, `join`, task persistence, or unrelated task operations.

The implementation currently persists the marker after the notifier callback succeeds. Therefore this Spec does not claim a crash-proof distributed exactly-once guarantee across a process crash in the interval between callback success and marker persistence. The durable contract is exactly-once replay under successful marker persistence and parent-session marker recognition; the crash window is an explicit follow-up risk in the reconciliation Work.

### 4.3 Parent Message Boundary

The parent extension must send a visible completion message that can trigger a parent follow-up turn. Its details must be the summary-only notification shape. The message must instruct the parent to use `subagent_join` for the full Result, but must not embed that Result in the notification content or details.

## 5. Unlimited Child Continuation

### 5.1 Follow-Up Rule

For a child generation with a valid pane-child environment, each `agent_end` that leaves the execution unfinished must schedule one delayed continuation check. The check must send exactly the fixed follow-up user message:

`Your task is still active. Call subagent_done when finished.`

The follow-up must use Pi's `deliverAs: "followUp"` behavior and must execute in the same child session and generation. It must not create a parent task, increment generation, open a pane, or write a terminal Result.

There is no retry count, continuation count, or production time limit. Each later unfinished turn may schedule the next continuation, so continuation is bounded only by the child session reaching a terminal lifecycle event or the child process shutting down.

### 5.2 Single Pending Continuation

The child extension must keep at most one pending continuation timer. A later `agent_end` replaces the existing timer rather than accumulating follow-ups. A continuation timer may send only when the generation is not settled and no input has started after the relevant `agent_end`.

The following lifecycle events must clear a pending continuation:

- `before_agent_start`;
- `agent_start`;
- `input`; and
- `session_shutdown`.

`agent_start` must reset the input-after-end guard for the new turn. A later unfinished `agent_end` may then schedule one new continuation.

### 5.3 Terminal Result And Cleanup

`subagent_done` must be idempotent for one child generation. The first call must mark the child settled, clear pending continuation, atomically write the generation Result artifact, and shut down the child execution after the write completes. Calls after settlement must not schedule or send another continuation or overwrite the first Result.

The continuation extension must not participate in parent-side task polling or notification dedupe. The parent runtime may continue its ordinary terminal Result/pane monitor; it must not need to poll the child to decide whether to send continuation.

## 6. Invariants And Non-Goals

The lifecycle behavior must preserve:

- stable task identity across recovery and resume;
- generation-specific Result identity checks;
- retained artifacts until explicit removal;
- complete Result retrieval through `subagent_join`;
- summary-only completion notifications;
- child-side continuation without parent polling or generation changes;
- caller cancellation that ends only the `subagent_join` wait; and
- existing task-derived ID, steering, widget, Agent, and Handler Result contracts.

This Spec does not add a persistent notification queue separate from `task.json`, a distributed lock, delivery receipts, a continuation retry policy, a maximum continuation count, a new parent tool, or a new dependency.

The review label `#18 terminal input barrier` is not an acceptance condition or verification claim of this Spec. No repository-local issue, authority document, source symbol, or test locator was supplied to this reconciliation, so it remains an external pending boundary until separate authority defines its semantics and locator.

This Spec also does not require or verify future automatic completed-pane closure. Explicit `remove` remains the documented cleanup boundary; any completed-pane auto-close policy requires separate authority and focused source/test scope.

## 7. Acceptance Conditions

Focused checks must demonstrate:

1. restart recovery adopts a retained running pane without relaunch;
2. terminal Results take precedence over pane checks;
3. stale or mismatched Results cannot settle the current generation;
4. missing panes persist `pane_closed` failure;
5. recovery is scope-local and idempotent;
6. resume retains identity/session and increments generation, while remove deletes session/artifacts;
7. completed, failed, cancelled, pane-closed, verification-failure, cancellation, and launch-failure paths produce summary-only terminal notifications;
8. notification keys deduplicate repeated recovery, pending notifications replay after restart, and the full Result is absent from notification payloads;
9. child continuation deduplicates `agent_end` timers, clears on input/start/shutdown, supports another unfinished turn without a retry limit, and stops after `subagent_done`; focused checks must separately verify input cleanup, `agent_start` reset, shutdown after a nudge has fired, and at least two successive unfinished continuation cycles;
10. package typecheck, the full package tests, and a fresh independent review pass against this Spec and the reconciliation Work; and
11. an aborted `subagent_join` stops promptly while the task remains running, with no Result, notification, manifest, generation, or pane mutation until an explicit lifecycle operation.

## 8. Known Verification Limit

The current package test run covers the listed recovery and notification paths and only part of the continuation acceptance. `tests/pane-child.test.ts` verifies pending-timer deduplication/cleanup, continuation after input followed by a later unfinished `agent_end`, and `subagent_done` cleanup and Result writing. It does not independently demonstrate `agent_start` reset, shutdown after a nudge has fired, or multiple successive continuation cycles. These remain explicit acceptance requirements; the gap is evidence coverage, not a reduction of the unlimited-continuation or cleanup contract. Task 2 in the reconciliation Work records the future regression checks.

The recorded package verification at HEAD `a43f0e1f557c02c1a31cecf45733e33b482882c4` is `56 pass`, `0 fail`, and `299 assertions` for `bun run --cwd packages/pi-herdr-subagents test`. The source and test paths were clean at that HEAD. This documentation-only amendment does not treat that aggregate result as evidence that the three continuation gaps are covered, and it does not erase the notification callback/marker crash window.

## 9. Join Caller Cancellation Amendment

This is a bounded post-reconciliation amendment, not an original three-behavior historical decision. `subagent_join` blocks until the current generation reaches a terminal Result unless its caller aborts the tool invocation. A caller `AbortSignal` must promptly end only that Result-retrieval wait. It must not cancel the child, close its pane, write a Result, change the task or generation, persist a task change, or emit a terminal notification. A later `subagent_join` may retrieve the same generation Result normally; explicit `subagent_cancel` and `remove` retain their existing lifecycle effects.

Commit `a43f0e1f557c02c1a31cecf45733e33b482882c4` supports this contract in `src/index.ts` through `SubagentRuntime.join` and `createSubagentTools`. Its focused `tests/runtime.test.ts` evidence is `aborting join leaves the running task unchanged until explicit cancellation` and `passes the join tool AbortSignal to the runtime wait`.

Focused verification must demonstrate that an aborted `subagent_join` stops promptly while the task remains running, with no Result, notification, manifest, generation, or pane mutation until an explicit lifecycle operation.

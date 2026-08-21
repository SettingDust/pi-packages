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

### 4.1 Terminal Coverage And Durable Source

When a completion notifier is configured, every persisted terminal generation must remain eligible for parent-session delivery, including:

- a valid completed, failed, or cancelled Result;
- an invalid or stale Result that settles the task as failed;
- an unexpectedly closed pane;
- pane verification failure;
- cancellation after the surface is closed; and
- launch or launch-script failure before `spawn` rejects.

The existing persisted terminal task state is the durable outbox. It consists of the validated terminal manifest and the generation-specific Result artifact when one exists; no second outbox file, queue, receipt store, or broker may be introduced. Delivery eligibility must survive process restart and must be reconstructed from those existing artifacts. A full Handler Result remains private to `subagent_join` and must not be copied into the parent notification.

The parent notification details must contain `schema`, `subagentId`, `generation`, terminal `status`, `label`, and an optional bounded `reason`. `schema` must identify the supported notification-correlation schema. The delivery correlation is exactly `<schema, subagentId, generation, status>`; `label` and `reason` are display data and are not correlation fields.

### 4.2 Parent-Session Acknowledgement

A delivery is acknowledged only when `sessionManager.getBranch()` for the current parent branch contains a `custom_message` whose `customType` is the completion-message type and whose supported details exactly match the durable terminal source on `<schema, subagentId, generation, status>`. A marker on an abandoned branch, a marker returned only by an all-entry API, a legacy or unsupported schema, malformed details, or any correlation mismatch must be ignored.

`sendMessage` returning is not acknowledgement because the API returns `void` and does not prove append. `message_end` is not acknowledgement because it occurs before the message is appended. A legacy manifest `notifiedGeneration` value is not acknowledgement. The runtime must not persist a new delivery-receipt field; the matching current-branch `custom_message` is the durable receipt.

Before every safe flush, the extension must scan the current branch and remove acknowledged correlations from its pending in-memory attempt set. A missing correlation remains pending. Within one process, an attempted correlation may be suppressed until the next acknowledgement scan or safe flush boundary, but it must become retryable when a later scan still finds no matching message and after restart.

### 4.3 Safe Delivery Envelope

The extension must send zero completion notifications from `before_agent_start`, `message_end`, or `agent_end`, and while a parent lifecycle may continue. Pi 0.84.2 defines `agent_end` as the end of one low-level run; automatic retry, auto-compaction retry, or queued follow-up may still continue. A live idle boundary exists only at `agent_settled`, and only when `ctx.isIdle()` is true.

A safe flush must use one of these envelopes:

1. **startup idle flush:** `session_start` may recover durable terminal sources, scan the current branch, and append missing completion messages without triggering an agent turn. Startup delivery must use `triggerTurn: false`; the send remains unacknowledged until a later current-branch scan observes the supported correlation.
2. **live idle flush:** when a terminal source becomes pending while the parent is already verified idle, or when `agent_settled` fires and `ctx.isIdle()` is true, the extension may scan and send missing messages with `deliverAs: "followUp"` and `triggerTurn: true`.
3. **active deferral:** when terminal settlement occurs during an active parent lifecycle, the extension records only in-memory pending work backed by the durable terminal source. Every `agent_end` performs zero notification sends. A non-idle `agent_settled` leaves delivery pending; the first later idle `agent_settled` owns the live scan and send.

The custom-message envelope must be visible, summary-only, and instruct the parent to call `subagent_join` for the full Result. Existing tool registration and task recovery may still occur in their owning lifecycle hooks, but notification delivery must obey this envelope independently.

### 4.4 Delivery Guarantee And Failures

The contract is at-least-once delivery into the current parent branch, not exactly-once delivery and not a guarantee that the Router processes or acts on the message. A process crash before append leaves no current-branch acknowledgement and restart must resend. A crash after append is recovered by branch correlation and must not require a separate receipt. If append visibility is delayed or uncertain, a later safe flush may send a duplicate.

Notification send or branch-inspection failure must not change task status, Result data, cleanup state, `inspect`, `join`, resume, remove, or unrelated task operation. The durable terminal source remains retryable. Unsupported markers must be ignored rather than rewritten or treated as proof of delivery.

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
8. durable terminal sources survive restart; only a supported matching `custom_message` on `sessionManager.getBranch()` acknowledges delivery; absent, abandoned-branch, legacy, unsupported, malformed, or mismatched markers cause retry; startup append does not trigger a turn and remains unacknowledged until observed; active delivery sends zero through `agent_end` and flushes only when `agent_settled` observes `ctx.isIdle()` as true; and the full Result is absent from notification payloads;
9. child continuation deduplicates `agent_end` timers, clears on input/start/shutdown, supports another unfinished turn without a retry limit, and stops after `subagent_done`; focused checks must separately verify input cleanup, `agent_start` reset, shutdown after a nudge has fired, and at least two successive unfinished continuation cycles;
10. package typecheck, the full package tests, and a fresh independent review pass against this Spec and the reconciliation Work; and
11. an aborted `subagent_join` stops promptly while the task remains running, with no Result, notification, manifest, generation, or pane mutation until an explicit lifecycle operation.

## 8. Known Verification Limit

The current package test run covers the listed recovery and notification paths and only part of the continuation acceptance. `tests/pane-child.test.ts` verifies pending-timer deduplication/cleanup, continuation after input followed by a later unfinished `agent_end`, and `subagent_done` cleanup and Result writing. It does not independently demonstrate `agent_start` reset, shutdown after a nudge has fired, or multiple successive continuation cycles. These remain explicit acceptance requirements; the gap is evidence coverage, not a reduction of the unlimited-continuation or cleanup contract. Task 2 in the reconciliation Work records the future regression checks.

The historical package run recorded by the retrospective reconciliation covers the prior callback-plus-manifest-marker notification implementation, not the durable parent-session delivery amendment in section 4. The terminal-notification Work's implementation and red-seam evidence are now present in the current worktree, and this session closes the remaining F8 evidence gap with focused checks for repeated `agent_end`, non-idle `agent_settled`, and later idle delivery. Final ownership/commit gating remains tracked in the Work; no commit is implied by this reconciliation.

## 9. Join Caller Cancellation Amendment

This is a bounded post-reconciliation amendment, not an original three-behavior historical decision. `subagent_join` blocks until the current generation reaches a terminal Result unless its caller aborts the tool invocation. A caller `AbortSignal` must promptly end only that Result-retrieval wait. It must not cancel the child, close its pane, write a Result, change the task or generation, persist a task change, or emit a terminal notification. A later `subagent_join` may retrieve the same generation Result normally; explicit `subagent_cancel` and `remove` retain their existing lifecycle effects.

Commit `a43f0e1f557c02c1a31cecf45733e33b482882c4` supports this contract in `src/index.ts` through `SubagentRuntime.join` and `createSubagentTools`. Its focused `tests/runtime.test.ts` evidence is `aborting join leaves the running task unchanged until explicit cancellation` and `passes the join tool AbortSignal to the runtime wait`.

Focused verification must demonstrate that an aborted `subagent_join` stops promptly while the task remains running, with no Result, notification, manifest, generation, or pane mutation until an explicit lifecycle operation.

## 10. Automatic Terminal Surface Cleanup Amendment

This is a later prospective amendment. This revision records the accepted policy decisions responding to fresh-review findings P1-1 through P1-5; it does not alter the historical reconciliation chronology. Delivery is split by section 10.7 into a compatibility-only Phase A and the automatic-cleanup Phase B. Phase B implementation, bounded repair, verification, and the second fresh independent final review are complete with P0/P1/P2 = 0; an ownership-isolated selective commit remains pending.

### 10.1 Ownership And Terminal Coverage

The runtime has an explicit create-boundary for surface ownership. Once a `createTab` response is accepted as a task surface, that generation owns its usable `tabId`; all later terminal cleanup, including cancellation, removal, and launch failure after acceptance, must use `tab close <tabId>`. The root `paneId` is retained as evidence and for inspection, not as the terminal cleanup command.

If a create response is rejected as partial before a task surface is accepted, no tab ownership is established. Only that rejected-partial path may use pane-only close for a known root pane. The runtime must never use pane-only close for an accepted tab or guess a tab identity.

When an accepted generation reaches `completed`, `failed`, or `cancelled`, the parent runtime must close the owned tab by its recorded `tabId`. Closing the dedicated tab is required because both the pane and tab must disappear.

Terminal coverage includes valid and invalid Results, explicit cancellation, `pane_closed`, pane-verification failure, launch failure after a tab was accepted, and terminal state adopted during recovery. A failure before any accepted surface exists must be recorded as `not_created` without issuing a close command.

Automatic cleanup must not delete the session file, Result files, manifest, launch files, or artifact directory. Those remain until explicit `remove`.

### 10.2 Durable Cleanup Records

The manifest must retain an optional `surfaceCleanups` array with at most one entry per generation. The canonical runtime-created cleanup entry has exactly these members:

- `generation`: a positive integer unique within the array;
- optional captured `tabId` and `paneId` identity strings;
- `status`: `pending`, `closed`, `already_closed`, `not_created`, `identity_missing`, or `failed`;
- `attemptedAt`: an ISO timestamp for the close attempt or, for `not_created` and `identity_missing`, the classification time; and
- `error`: a whitespace-normalized diagnostic of at most 160 characters, present only when status is `failed`.

Runtime-created entries must not add other fields. A Phase B writer must preserve unknown members in the `surfaceCleanups` array and its entries as the same semantic JSON values, even when it does not interpret them. A Phase A-compatible runtime treats the whole top-level `surfaceCleanups` value as unknown and preserves it under section 3.1. The runtime must expose cleanup arrays and entries through defensive copies so callers cannot mutate persisted or in-flight state.

`pending` records must carry the known surface identity before the close call. `closed` means Herdr accepted the close. `already_closed` means Herdr authoritatively reported the tab absent. `not_created` means no surface was accepted for the generation. `identity_missing` means a terminal record could have owned a surface but lacks a usable tab identity; the runtime must not guess an identity or issue a pane/tab command. `failed` means tab close threw or returned an unclassified failure.

A resumed generation must retain all prior-generation cleanup records and create its own record only when it becomes terminal. Older manifests without the array remain compatible. Recovery must validate record generation, identity, status-specific fields, timestamps, and diagnostics before using a cleanup record.

### 10.3 Ordering And Failure Isolation

For every terminal transition, the parent runtime must:

1. make the generation Result or terminal reason durable under the existing lifecycle rules;
2. persist the original terminal status, Result/error, and a current-generation cleanup record before attempting close;
3. close the recorded dedicated tab when a usable identity exists;
4. persist the cleanup outcome; and
5. continue terminal notification under section 4.

All terminal triggers for one `<subagentId>:<generation>` must converge on one settlement promise. The first trigger owns terminal Result/status persistence, cleanup-record transitions, and notification; concurrent triggers await that same promise and must not write another Result, issue another close, or emit another notification. A cleanup exception must be caught and recorded as `failed`. It must not change terminal status, replace the original task error, remove or rewrite the Result, make `join` reject, hide the task from `inspect`, suppress notification, or delete retained files. Completion notifications must keep their existing original status/reason and must not include cleanup diagnostics.

One runtime process must coalesce the terminal settlement and cleanup for the same `<subagentId>:<generation>`. `closed`, `already_closed`, `not_created`, and `identity_missing` are idempotent final cleanup outcomes and must not issue another close call. `pending` or `failed` with a usable `tabId` is retryable once per recovery invocation. A retry updates the same generation record and cannot mutate that generation's terminal status or a later generation's lifecycle state.

### 10.4 Tool And Recovery Behavior

- `subagent_join` and `subagent_inspect` must expose the original terminal task state and available cleanup evidence through defensive copies. Cleanup failure is data, not a replacement terminal error.
- `subagent_join` must await a known in-flight settlement/cleanup promise for its terminal generation; caller abort affects only that wait. `subagent_inspect` remains non-blocking and may expose `pending` while settlement or cleanup is in flight.
- `subagent_resume` must retain `subagentId`, session path, Results, artifacts, and prior cleanup records; increment generation; and create a new tab. It must never reuse a prior generation's tab, even when prior cleanup failed.
- `subagent_cancel` must make the cancelled Result and terminal state durable before automatic cleanup. A close failure leaves the task cancelled and notification eligible.
- `remove` must retry actionable pending/failed cleanup before deleting retained files. If the close still fails, removal must reject and retain the task and files. A `not_created` or `identity_missing` record has no actionable close identity and may be explicitly removed.
- Recovery must reconcile terminal cleanup before terminal notification replay. It must not re-close a successful/non-actionable cleanup record and must not relaunch a terminal generation.
- An injected fake or non-shell transport must receive the same close contract; `SubagentRuntime` must not invoke Herdr commands directly.

### 10.5 Acceptance Matrix

| Scenario | Required cleanup outcome | Required invariant |
| --- | --- | --- |
| completed, failed, cancelled | one tab-close attempt, then `closed` | original terminal state and files retained |
| `pane_closed` or tab already absent | `closed` or authoritative `already_closed` | original `pane_closed` reason retained |
| close exception | `failed` with bounded diagnostic | join, inspect, notification, and terminal state continue |
| concurrent terminal triggers | one settlement promise and one close operation | first terminal Result/status wins; no duplicate Result, close, or notification |
| concurrent `join` and `inspect` | `join` awaits settlement; `inspect` returns promptly | `inspect` may show `pending`; both expose defensive copies |
| restart with pending/failed usable identity | at most one retry per recovery invocation | no duplicate terminal transition |
| restart after closed/already-closed | no close call | recovery idempotent |
| launch fails before accepted surface | `not_created`, no close call | launch failure remains primary |
| accepted surface then launch fails, cancel, or remove | tab close by `tabId` | no pane-only close for an accepted tab |
| rejected partial create response | no accepted ownership; pane-only rejection cleanup if needed | no tab close or guessed tab identity |
| terminal record has no usable identity | `identity_missing`, no close call | no guessed or workspace-wide cleanup |
| resume | prior records retained and new tab created | stable task/session, incremented generation |
| remove after actionable cleanup failure | retry, then retain on repeat failure | no artifact deletion on unresolved close exception |
| notification | unchanged summary-only original status/reason | no Result or cleanup diagnostic exposure |
| rollback to a Phase A-or-later runtime | unknown top-level `surfaceCleanups` value preserved semantically | rollback does not erase cleanup evidence |
| non-Herdr fake transport | same as above | runtime contains no direct shell coupling |

Focused fake-transport tests must prove every row, operation ordering, exact close counts, generation isolation, manifest shape, defensive-copy behavior, unknown-field preservation, and file retention. A disposable real Herdr acceptance check must prove that `tab close <tabId>` removes both the accepted tab and its root pane and that a repeated close can be classified as already closed. The real check must not operate on user-owned tabs or panes and must clean up its disposable surface.

### 10.6 Concurrency And Record Clarifications

`attemptedAt` records the time the runtime classified or attempted the cleanup outcome; `not_created` and `identity_missing` use their classification time without implying a transport call. A `failed` cleanup diagnostic must be whitespace-normalized and limited to 160 characters.

The runtime must keep at most one in-flight cleanup operation for a task generation and at most one terminal settlement promise for that generation. `inspect` remains non-blocking and may expose `pending`; `join` must await the known settlement/cleanup operation for its terminal generation and then return the final cleanup outcome without converting a cleanup exception into a join exception. Aborting that join wait affects only the caller wait and must not cancel or mutate settlement or cleanup. `resume`, recovery, and `remove` must coalesce with an existing operation before they retry or act on the same cleanup record.

### 10.7 Compatibility Release Sequence

Automatic cleanup must ship in two ordered phases:

| Delivery unit | Required behavior | Forbidden behavior | Dependency / gate |
| --- | --- | --- | --- |
| `#13` V2 lifecycle baseline | Establish the accepted V2 lifecycle record and its migration owner. | Does not authorize terminal surface cleanup. | Must be accepted and landed before Phase B. |
| Phase A: compatibility baseline | Read both supported V1 identity forms; migrate V1 canonical to V2 with exact `subagentId`, `taskSlug`, session path, artifact path, and Result identity; migrate V1 legacy without adding a slug; preserve all unknown top-level manifest fields as semantic JSON values on every validated V1/V2 rewrite. | Must not create, interpret, validate, normalize, or act on `surfaceCleanups`; must not close terminal surfaces automatically. | Requires focused migration/passthrough tests, package typecheck/full tests, independent review, and a standalone source-plus-test commit. That commit must be the rollback floor before Phase B begins. |
| Phase B: automatic cleanup | Implement sections 10.1 through 10.6, including cleanup-record validation, unknown nested-member preservation, tab close, retry, settlement coalescing, and notification ordering. | Must not weaken Phase A passthrough or any existing identity/path/Result contract. | Depends on both landed `#13` and the accepted Phase A gate. |

A Phase B release may be rolled back only to a runtime containing Phase A or a later compatible baseline. Rollback to a pre-Phase-A runtime is unsupported because that runtime may erase the unknown top-level `surfaceCleanups` value during an otherwise valid manifest rewrite. No rollback promise recreates tabs already closed by Phase B. Phase A and Phase B require separate verification evidence and separate commits; Phase B must not be combined into the Phase A compatibility commit.

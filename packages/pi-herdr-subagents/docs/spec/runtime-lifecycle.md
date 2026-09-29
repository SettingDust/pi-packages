# Subagent Runtime Lifecycle Specification

## 1. Authority And Reconciliation Status

This document is the normative lifecycle authority for the three already-submitted `@settingdust/pi-herdr-subagents` runtime behaviors covered by:

- persistent runtime task recovery;
- terminal completion notification; and
- child-side continuation after an unfinished `agent_end`.

It also records the bounded post-reconciliation `subagent_join` caller-cancellation amendment in section 9. That amendment is current behavior with its own source/test evidence; it is not a fourth item in the original three-behavior historical chronology. Section 10 records the later automatic terminal-surface cleanup amendment and likewise does not alter that chronology. Section 4 includes the durable parent-session delivery amendment, whose bounded implementation landed in commit `39dd965b5f9465c1445faa4d373edb0e825d1d6c`.

It was written after implementation and after the original behaviors were committed. The chronology is intentional: this is an authority reconciliation, not a claim that the behavior was designed, reviewed, or accepted before implementation. The related decision record is [ADR: Runtime lifecycle authority reconciliation](../adr/runtime-lifecycle-authority-reconciliation.md). The derived review record is [Runtime lifecycle reconciliation Context](../works/runtime-lifecycle-reconciliation/context.md).

The interrupted-V2-queued recovery correction in sections 3, 4, 7, and 10 is normative authority awaiting implementation and verification. It does not describe current runtime behavior or completed tests; the historical reconciliation and later landed amendments above remain historical facts.

No new PRD is created. These behaviors preserve the existing delegation product boundary and add technical lifecycle contracts rather than a new user outcome or product scope.

## 2. Scope And Terms

This specification covers the parent `SubagentRuntime`, its persisted task artifacts, its completion notifier, and the child `pane-child` extension. Section 9 additionally bounds caller cancellation while `subagent_join` waits for a Result. Section 10 defines the later prospective automatic terminal-surface cleanup amendment. It does not define task-derived ID allocation, steering submission, the running-status widget, Agent discovery, or Handler Result parsing beyond the lifecycle obligations needed to transport a Result.

- **task**: one stable `subagentId` conversation identity.
- **generation**: one execution revision of a task. A resume increments it while retaining the task identity and session file.
- **terminal state**: `completed`, `failed`, or `cancelled`.
- **manifest**: the supported `task.json` record in the task artifact directory.
- **Result**: the generation-specific Result artifact written by the child.
- **terminal notification**: a summary-only parent message for one task and generation.
- **continuation**: a child-side follow-up user message that keeps the same child session and generation active after an unfinished agent turn.
- **caller cancellation**: aborting the caller's `subagent_join` Result-retrieval wait without changing child task lifecycle state.
- **terminal surface cleanup**: closing the dedicated Herdr tab and root pane owned by a terminal generation without deleting retained task artifacts.

The task-derived identity rules remain owned by [Task-Derived Subagent ID Specification](task-derived-subagent-id.md). Its collision and legacy rules apply wherever this document refers to `subagentId`.

## 3. Persistent Task Recovery

### 3.1 Persistence

For every started generation, the runtime must persist a supported manifest under `<tasksDir>/<subagentId>-artifacts/task.json`. Version 2 is the canonical format for every new manifest and for a persisted migration; V1 is readable only as recovery/migration input. The task-derived ID Spec defines the valid V2 canonical, V2 migrated-legacy, V1 canonical, and V1 legacy identity forms. A migration must retain the exact validated ID, `taskSlug` presence or absence, and every retained artifact path: V1 canonical retains its canonical ID and exact slug, while V1 legacy retains its legacy ID and no slug. The manifest must retain the task identity, current generation, Agent, cwd, label, optional model/thinking settings, original session path, pane identity when known, status, timestamps, and error when present. A legacy notification marker may remain as compatibility data but is not delivery acknowledgement under section 4. Section 10 additionally owns per-generation terminal-surface cleanup records.

Generation-one session storage is `<tasksDir>/<subagentId>-g1.jsonl`. Generation-specific Results are stored in the task artifact directory as `result-<generation>.json`. A resumed generation reuses the original session path and writes a new generation Result and launch artifact in the same task artifact directory.

Manifest and artifact writes must be atomic at the file boundary. A launch failure after allocation remains a retained task record; it is not silently released or converted into a new task. Queued admission must be durable before the queued observation or surface creation; running admission must be durable before launch-file writes or command submission. A failed admission write must stop progression at that stage. A generation whose initial queued write never succeeded cannot be reconstructed from disk after process loss; in particular, an earlier terminal generation on disk must not be rewritten as that unwritten generation. Every write of a validated V1 or V2 manifest must merge runtime-owned fields into the parsed record and preserve every unknown top-level field as the same semantic JSON value; byte layout, key order, and whitespace are not guaranteed. V1-to-V2 migration may change owned version/lifecycle fields only and must preserve unknown fields with the identity and paths. This generic passthrough is the Phase A compatibility baseline in section 10.7.

### 3.2 Recovery Scope And Adoption

`recover(cwd, parentSessionFile)` must select exactly the task scope derived from the parent session, or the documented no-parent fallback. It must stop monitors and rebuild in-memory state from that scope. Repeated recovery of the same scope must be idempotent; changing scope must not retain tasks from the previous scope. This correction assumes a single owning runtime for a parent task scope; a local launch/settlement map does not establish exclusion against another process opening or writing that scope. Recovery must wait for locally owned launch operations, including their initial queued persistence, and unresolved terminal-intent persistence before clearing or rebuilding the scope. Launches entering while recovery waits or rebuilds must be serialized with that scope boundary or rechecked before classification. An operation known to be launching locally must never be classified as interrupted by concurrent recovery.

Recovery must discover V2 canonical, V2 migrated-legacy, V1 canonical, and V1 legacy task artifact directories and validate the manifest identity, version form, generation, expected session path, expected artifact path, status, and field types before adoption. The task-derived ID Spec owns these compatible forms: V1 is read-only input and a persisted migration writes V2 without changing the retained ID, `taskSlug`, or path. Malformed, unsupported, or mismatched records must be ignored without adopting a pane, exposing a task, or rewriting unknown fields. Legacy `subagent-N` records remain recoverable without renaming; canonical ID compatibility is defined by the task-derived ID Spec.

Recovery must use the following state precedence for a valid record:

1. If the current generation Result exists and has matching `subagentId` and `generation`, adopt its terminal status and Result/error fields, whether completed, failed, or cancelled.
2. If a Result exists but has a mismatched identity, invalid status, invalid Result shape, or malformed JSON, adopt the task as failed with the corresponding stable runtime error; a stale Result must never settle the current generation as successful. Do not replace the invalid artifact with a synthetic Result.
3. If no Result exists and the persisted record is terminal, retain that terminal state.
4. If no Result exists and the record is V2 `queued`, settle that generation as `failed` with the stable reason `launch_interrupted`, regardless of pane presence or identity. A durable V2 queued record denotes incomplete execution admission, not a reconstructible pending queue or evidence that command submission occurred. Do not verify a pane to promote it to running, replay its launch, invent `startedAt`, or change its `queuedAt`.
5. For V1 `starting` without a Result, keep the existing migration: a verified retained pane becomes running with the documented `createdAt` start fallback; no usable pane becomes `failed/pane_closed`; verification failure uses its diagnostic reason.
6. For an ordinary `running` record without a Result, positively verify the retained pane. A retained pane is adopted as running without relaunch; a missing pane becomes `failed/pane_closed`; pane verification failure becomes failed with its diagnostic reason. This pane evidence is not proof of child-process liveness. A crash after durable running admission but before command submission cannot be distinguished by this correction and remains a known limit; it does not authorize replay or a launch journal.

Before committing a synthetic failure and again after awaited work before cleanup or notification, recovery must recheck the current generation Result and apply the first two precedence rules if one has appeared. It must not overwrite a valid Result. Within the owning runtime, concurrent launch, Result-monitor, and recovery settlement triggers for a generation must converge rather than publish competing terminal effects. These rechecks do not promise an atomic winner between independent processes or immutable first publication by independent writers.

After each successful recovery, the runtime must persist the reconstructed state, start monitoring only for running tasks, and deliver any pending terminal notification. A Phase B runtime must first reconcile section 10 cleanup records for terminal generations. Recovery must not create a new pane, replace a stable task identity, alter a retained canonical slug, or overwrite a current generation with a stale Result.

### 3.3 Launch Failure And Durable Settlement

The owning runtime must register a generation's in-flight launch before its first asynchronous queued-manifest persistence and retain that ownership through create acceptance, running persistence, launch-file writes, command submission, and failure finalization. It must release the launch operation on every outcome without awaiting itself from its own settlement. A rejected queued write must not create a surface; a rejected running write must not write launch files or submit a command. Every launch-stage failure must retain the original operation error as primary, attempt same-generation terminal failure persistence, and report any separate settlement/persistence failure explicitly. A rejected spawn or resume must not become a successful launch because failure retention succeeded.

The runtime must retain retryable local terminal intent, original launch error, accepted surface identities, and current generation if terminal persistence fails; it must not discard that intent merely because in-memory status was set terminal or an in-flight promise rejected. A later bounded operation or recovery in the same runtime must be able to retry it for the same generation when storage becomes writable. Resume and removal must not bypass unresolved terminal-intent persistence or lose its generation/ownership evidence. No automatic unbounded retry is required or permitted: persistent storage failure must reject/report the original operation failure with persistence failure context, without claiming durable settlement. If no initial queued record was ever written and the process ends, there is no durable current-generation intent to recover.

### 3.4 Resume And Remove Boundaries

`resume` must reject a running task, retain the stable `subagentId`, retain the original session file, increment the generation by one, and create a new execution revision. A stale Result from an earlier generation must not settle the resumed generation. Section 10 additionally requires a new Herdr tab and retained prior-generation cleanup evidence.

`remove` must stop monitoring, close an active owned tab, remove the task from the active in-memory scope, delete the original session file, and delete the task artifact directory. Explicit removal is the lifecycle boundary that permits a later runtime to reuse an otherwise available task-derived ID. Pane-only close is permitted only when a tab-create response was rejected as partial before a task surface was accepted. Recovery and automatic terminal-surface cleanup must not delete these files implicitly. Section 10 defines removal when prior automatic cleanup failed.

## 4. Terminal Notification

### 4.1 Terminal Coverage And Durable Source

When a completion notifier is configured, every persisted terminal generation must remain eligible for parent-session delivery, including:

- a valid completed, failed, or cancelled Result;
- an invalid or stale Result that settles the task as failed;
- an unexpectedly closed pane;
- pane verification failure;
- cancellation after the surface is closed; and
- launch or launch-script failure before `spawn` rejects; and
- an interrupted persisted V2 queued admission settled as `failed/launch_interrupted` under section 3.2.

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

`No terminal result has been recorded yet. If your work is finished, call subagent_done with its outcome; otherwise, continue the remaining work.`

The follow-up must use Pi's `deliverAs: "followUp"` behavior and must execute in the same child session and generation. It must not create a parent task, increment generation, open a pane, or write a terminal Result.

There is no retry count, continuation count, or production time limit. Each later unfinished turn may schedule the next continuation, so continuation is bounded only by the child session reaching a terminal lifecycle event or the child process shutting down.

### 5.2 Single Pending Continuation

The child extension must keep at most one pending continuation timer. A later `agent_end` replaces the existing timer rather than accumulating follow-ups. A continuation timer may send only when the generation's completion state is `active` and no input has started after the relevant `agent_end`.

The following lifecycle events must clear a pending continuation:

- `before_agent_start`;
- `agent_start`;
- `input`;
- `session_shutdown`; and
- an accepted `subagent_done` entering `settling`.

`agent_start` must reset the input-after-end guard for the new turn. A later unfinished `agent_end` may then schedule one new continuation.

### 5.3 Terminal Result And Cleanup

[Terminal Input Barrier Specification](terminal-input-barrier.md) is the specialized normative authority for child completion persistence and controls if this lifecycle summary is read differently. `subagent_done` accepted while the child is `active` must synchronously enter `settling` and clear pending continuation. `settling` is not terminal: the child may enter `settled` only after the generation Result has been written and atomically renamed into place.

A write or rename failure must restore `active` before the tool failure is propagated, must not call shutdown, and must permit a later completion attempt. Calls made while one attempt is `settling` must join that attempt's in-flight outcome without starting another write. The Result body of the first attempt whose atomic persistence succeeds wins; failed attempts and later calls must not overwrite it. After successful persistence, the child enters `settled`, calls shutdown once, and must not schedule or send another continuation.

The continuation extension must not participate in parent-side task polling, terminal-surface cleanup, or notification dedupe. The parent runtime may continue its ordinary terminal Result/pane monitor; it must not need to poll the child to decide whether to send continuation.

## 6. Invariants And Non-Goals

The lifecycle behavior must preserve:

- stable task identity across recovery and resume;
- generation-specific Result identity checks;
- retained artifacts until explicit removal;
- complete Result retrieval through `subagent_join`;
- summary-only completion notifications;
- child-side continuation without parent polling or generation changes;
- caller cancellation that ends only the `subagent_join` wait;
- terminal status and original error independently of surface-cleanup outcome;
- one terminal settlement per `<subagentId>:<generation>`, with concurrent terminal triggers converging on the same settlement and cleanup operation;
- defensive-copy cleanup evidence in task snapshots; and
- existing task-derived ID, steering, widget, Agent, and Handler Result contracts.

This Spec does not add a persistent notification queue separate from the existing terminal task artifacts, a separate delivery receipt, delivery processing receipts, a continuation retry policy, a maximum continuation count, a new parent tool, a cleanup daemon, cleanup timeout policy, automatic artifact deletion, a launch journal, distributed launch/settlement locking, cross-process Result publication guarantees, or a new dependency. It does not change Host behavior or cancelled-recovery wake-up behavior.

The review label `#18 terminal input barrier` remains outside this Spec and is not an acceptance condition. Review item `#13` remains separate authority and Work and must not be inferred from this amendment, but its accepted and landed V2 lifecycle baseline is an explicit Phase B release dependency under section 10.7.

At the time of the retrospective reconciliation, this Spec did not require or verify automatic completed-pane closure and explicit `remove` remained the cleanup boundary. The later prospective policy is now owned by section 10 and [ADR: Automatic terminal surface cleanup](../adr/automatic-terminal-surface-cleanup.md); that amendment does not change the historical reconciliation conclusion.

## 7. Acceptance Conditions

Focused checks must demonstrate:

1. restart recovery adopts a retained running pane without relaunch;
2. terminal Results take precedence over pane checks;
3. stale or mismatched Results cannot settle the current generation;
4. missing panes persist `pane_closed` failure;
5. recovery is scope-local and idempotent, reads supported V1 legacy and V1 canonical records only as migration input, and persists V2 without changing the retained ID, canonical `taskSlug`, or path;
6. resume retains identity/session and increments generation, while remove deletes session/artifacts;
7. completed, failed, cancelled, pane-closed, verification-failure, cancellation, and launch-failure paths produce summary-only terminal notifications;
8. durable terminal sources survive restart; only a supported matching `custom_message` on `sessionManager.getBranch()` acknowledges delivery; absent, abandoned-branch, legacy, unsupported, malformed, or mismatched markers cause retry; startup append does not trigger a turn and remains unacknowledged until observed; active delivery sends zero through `agent_end` and flushes only when `agent_settled` observes `ctx.isIdle()` as true; and the full Result is absent from notification payloads;
9. child continuation deduplicates `agent_end` timers, clears on input/start/shutdown, supports another unfinished turn without a retry limit, and stops after `subagent_done`; focused checks must separately verify input cleanup, `agent_start` reset, shutdown after a nudge has fired, and at least two successive unfinished continuation cycles;
10. package typecheck, the full package tests, and a fresh independent review pass against this Spec and the applicable Work;
11. an aborted `subagent_join` stops promptly while the task remains running, with no Result, notification, manifest, generation, or pane mutation until an explicit lifecycle operation; and
12. section 10's acceptance matrix is satisfied by focused fake-transport checks plus a disposable real Herdr tab-close acceptance check; and
13. generation-one and resumed generation-two launch argv exclude exactly the seven parent-management tools (`subagent_spawn`, `subagent_resume`, `subagent_inspect`, `subagent_join`, `subagent_steer`, `subagent_cancel`, `subagent_remove`) via `--exclude-tools`, omit `--tools`, and retain session, pane-child extension, system prompt, task prompt, and ordinary extension eligibility including `subagent_done`; and
14. the interrupted-queued correction is verified with focused fake-transport and fault-injection checks: concurrent recovery waits at initial queued persistence, surface acceptance, and running persistence; failed queued persistence creates no surface and failed running persistence writes no launch file or command; transient/persistent terminal-write failures preserve the original error and retry evidence without early close/notification or indefinite retry; a reopened V2 queued generation (with no identity, tab identity, or pane-only identity) fails as `launch_interrupted` without replay or invented `startedAt`, while preserving prior-generation Result bytes, session/artifacts, generation, unknown fields, and cleanup history; current valid completed/failed/cancelled Results and malformed/mismatched Results retain precedence, including a Result appearing during delayed persistence; repeated recovery is idempotent; V1 starting and ordinary running recovery retain their existing outcomes. The final successful recovery observation removes the failed queued generation from active rows. Package typecheck/full tests and independent review remain acceptance requirements, not completed evidence for this correction.

## 8. Known Verification Limit

The current package test run recorded by the retrospective reconciliation covers the listed recovery and notification paths and only part of the continuation acceptance. `tests/pane-child.test.ts` verifies pending-timer deduplication/cleanup, continuation after input followed by a later unfinished `agent_end`, and `subagent_done` cleanup and Result writing. It does not independently demonstrate `agent_start` reset, shutdown after a nudge has fired, or multiple successive continuation cycles. These remain explicit acceptance requirements; the gap is evidence coverage, not a reduction of the unlimited-continuation or cleanup contract. Task 2 in the reconciliation Work records the future regression checks.

The historical package run recorded by the retrospective reconciliation covers the prior callback-plus-manifest-marker notification implementation, not the durable parent-session delivery amendment in section 4. That amendment landed in commit `39dd965b5f9465c1445faa4d373edb0e825d1d6c`. This audit does not claim fresh package tests or a fresh independent review.

## 9. Join Caller Cancellation Amendment

This is a bounded post-reconciliation amendment, not an original three-behavior historical decision. `subagent_join` blocks until the current generation reaches a terminal Result unless its caller aborts the tool invocation. A caller `AbortSignal` must promptly end only that Result-retrieval wait. It must not cancel the child, close its pane, write a Result, change the task or generation, persist a task change, or emit a terminal notification. A later `subagent_join` may retrieve the same generation Result normally; explicit `subagent_cancel` and `remove` retain their existing lifecycle effects.

Commit `a43f0e1f557c02c1a31cecf45733e33b482882c4` supports this contract in `src/index.ts` through `SubagentRuntime.join` and `createSubagentTools`. Its focused `tests/runtime.test.ts` evidence is `aborting join leaves the running task unchanged until explicit cancellation` and `passes the join tool AbortSignal to the runtime wait`.

Focused verification must demonstrate that an aborted `subagent_join` stops promptly while the task remains running, with no Result, notification, manifest, generation, or pane mutation until an explicit lifecycle operation.

## 10. Automatic Terminal Surface Cleanup Amendment

This later amendment does not alter the historical reconciliation chronology. Delivery is split by section 10.7 into a compatibility-only Phase A, which landed in commit `569b7ba0bb93a703daa11950668ce6c910f42494`, and the automatic-cleanup Phase B, which landed in commit `b858da269738a9796877b9d1430c6fa45406d110`.

### 10.1 Ownership And Terminal Coverage

The runtime has an explicit create-boundary for surface ownership. Once a `createTab` response is accepted as a task surface, that generation owns its usable `tabId`; all later terminal cleanup, including cancellation, removal, and launch failure after acceptance, must use `tab close <tabId>`. The root `paneId` is retained as evidence and for inspection, not as the terminal cleanup command.

If a create response is rejected as partial before a task surface is accepted, no tab ownership is established. Only that rejected-partial path may use pane-only close for a known root pane. The runtime must never use pane-only close for an accepted tab or guess a tab identity.

When an accepted generation reaches `completed`, `failed`, or `cancelled`, the parent runtime must close the owned tab by its recorded `tabId`. Closing the dedicated tab is required because both the pane and tab must disappear.

Terminal coverage includes valid and invalid Results, explicit cancellation, `pane_closed`, pane-verification failure, launch failure after a tab was accepted, and terminal state adopted during recovery. A failure before any accepted surface exists during this runtime's live launch must be recorded as `not_created` without issuing a close command. A recovered V2 queued record with no usable recorded tab identity does not establish that no surface was accepted and must instead use `identity_missing`; pane-only identity is not authority to close an accepted tab.

Automatic cleanup must not delete the session file, Result files, manifest, launch files, or artifact directory. Those remain until explicit `remove`.

### 10.2 Durable Cleanup Records

The manifest must retain an optional `surfaceCleanups` array with at most one entry per generation. The canonical runtime-created cleanup entry has exactly these members:

- `generation`: a positive integer unique within the array;
- optional captured `tabId` and `paneId` identity strings;
- `status`: `pending`, `closed`, `already_closed`, `not_created`, `identity_missing`, or `failed`;
- `attemptedAt`: an ISO timestamp for the close attempt or, for `not_created` and `identity_missing`, the classification time; and
- `error`: a whitespace-normalized diagnostic of at most 160 characters, present only when status is `failed`.

Runtime-created entries must not add other fields. A Phase B writer must preserve unknown members in the `surfaceCleanups` array and its entries as the same semantic JSON values, even when it does not interpret them. A Phase A-compatible runtime treats the whole top-level `surfaceCleanups` value as unknown and preserves it under section 3.1. The runtime must expose cleanup arrays and entries through defensive copies so callers cannot mutate persisted or in-flight state.

`pending` records must carry the known surface identity before the close call. `closed` means Herdr accepted the close. `already_closed` means Herdr authoritatively reported the tab absent. `not_created` means the owning live launch knows it accepted no surface for the generation; it does not prove that a transport never allocated an unaccepted orphan. `identity_missing` means a terminal record could have owned a surface but lacks a usable tab identity; the runtime must not guess an identity or issue a pane/tab command. A reopened V2 queued record without a usable tab uses `identity_missing`, including when it has only a pane ID. `failed` means tab close threw or returned an unclassified failure.

A resumed generation must retain all prior-generation cleanup records and create its own record only when it becomes terminal. Older manifests without the array remain compatible. Recovery must validate record generation, identity, status-specific fields, timestamps, and diagnostics before using a cleanup record.

### 10.3 Ordering And Failure Isolation

For every terminal transition, the parent runtime must:

1. make the generation Result or terminal reason durable under the existing lifecycle rules;
2. persist the original terminal status, Result/error, and a current-generation cleanup record before attempting close;
3. close the recorded dedicated tab when a usable identity exists;
4. persist the cleanup outcome; and
5. continue terminal notification under section 4.

A launch or recovery failure may be durable solely as a terminal manifest reason; the parent must not create a synthetic `result-<generation>.json` to publish it. Before terminal persistence, and again after any awaited work before close or notification, a present current-generation Result must be validated and take the precedence in section 3.2; if it appears during a delayed synthetic terminal write, reconcile the durable terminal status to that Result before effects. The runtime must retain the generation, identity, and original error for a failed terminal-intent write and retry it on a later bounded operation rather than dropping the pending settlement. No close or terminal completion notification may occur before the required terminal status and cleanup intent are durable; if persistence continues to fail, report the failure explicitly and leave effects pending. Cleanup-outcome write failure must remain explicit and retryable; it must not be reported as a successfully completed cleanup/settlement.

All terminal triggers for one `<subagentId>:<generation>` must converge on one settlement promise while that attempt is in flight; a failed terminal-intent write must retain retryable same-generation intent instead of becoming a successful no-op on a later attempt. The first durable terminal Result/status owns cleanup-record transitions and notification; concurrent triggers must not write another Result, issue another close, or emit another notification. A cleanup exception must be caught and recorded as `failed`. It must not change terminal status, replace the original task error, remove or rewrite the Result, make `join` reject, hide the task from `inspect`, suppress notification, or delete retained files. Completion notifications must keep their existing original status/reason and must not include cleanup diagnostics.

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
| recovered V2 queued without usable tab ID | `identity_missing`, no close call | `failed/launch_interrupted`; pane-only identity is not a tab-close authority |
| recovered V2 queued with usable recorded tab ID | persist `pending` then tab close | `failed/launch_interrupted` unless a current valid Result wins; no relaunch |
| terminal-intent persistence fails | no close or completion notification before retry succeeds | retain original error, generation and accepted identities; report persistence failure explicitly |
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

The runtime must keep at most one in-flight cleanup operation for a task generation and at most one terminal settlement promise for that generation. `inspect` remains non-blocking and may expose `pending`; `join` must await the known settlement/cleanup operation for its terminal generation and then return the final cleanup outcome without converting a cleanup exception into a join exception. A persistence error remains an operation failure rather than a cleanup exception hidden from the caller. Aborting that join wait affects only the caller wait and must not cancel or mutate settlement or cleanup. `resume`, recovery, and `remove` must coalesce with an existing operation before they retry or act on the same cleanup record.

### 10.7 Compatibility Release Sequence

Automatic cleanup must ship in two ordered phases:

| Delivery unit | Required behavior | Forbidden behavior | Dependency / gate |
| --- | --- | --- | --- |
| `#13` V2 lifecycle baseline | Establish the accepted V2 lifecycle record and its migration owner. | Does not authorize terminal surface cleanup. | Must be accepted and landed before Phase B. |
| Phase A: compatibility baseline | Read both supported V1 identity forms; migrate V1 canonical to V2 with exact `subagentId`, `taskSlug`, session path, artifact path, and Result identity; migrate V1 legacy without adding a slug; preserve all unknown top-level manifest fields as semantic JSON values on every validated V1/V2 rewrite. | Must not create, interpret, validate, normalize, or act on `surfaceCleanups`; must not close terminal surfaces automatically. | Requires focused migration/passthrough tests, package typecheck/full tests, independent review, and a standalone source-plus-test commit. That commit must be the rollback floor before Phase B begins. |
| Phase B: automatic cleanup | Implement sections 10.1 through 10.6, including cleanup-record validation, unknown nested-member preservation, tab close, retry, settlement coalescing, and notification ordering. | Must not weaken Phase A passthrough or any existing identity/path/Result contract. | Depends on both landed `#13` and the accepted Phase A gate. |

A Phase B release may be rolled back only to a runtime containing Phase A or a later compatible baseline. Rollback to a pre-Phase-A runtime is unsupported because that runtime may erase the unknown top-level `surfaceCleanups` value during an otherwise valid manifest rewrite. No rollback promise recreates tabs already closed by Phase B. Phase A and Phase B require separate verification evidence and separate commits; Phase B must not be combined into the Phase A compatibility commit.

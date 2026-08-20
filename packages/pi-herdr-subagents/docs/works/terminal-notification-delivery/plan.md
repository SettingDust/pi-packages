# Terminal Notification Delivery Implementation Plan

- **Status:** Accepted in the current session for the bounded implementation; F8 evidence is closed; the final commit gate remains open and no commit is authorized here
- **Authority:** [Runtime Lifecycle Specification](../../spec/runtime-lifecycle.md), section 4
- **Context:** [Work Context](context.md)
- **Tasks:** [Tasks](tasks.md)
- **Matrix:** [Acceptance Matrix](acceptance-matrix.md)

## Objective

Replace callback/manifest-marker acknowledgement with current-branch custom-message acknowledgement so missing terminal notifications replay after restart, startup stays non-triggering, and delivery never races an unfinished parent lifecycle.

## Acceptance And Implementation Status

- **Acceptance:** The current-session Handoff accepts this bounded Plan for the implementation gate.
- **Implementation:** The current source behavior is the implementation under review. This work unit adds only the F8 regression evidence and truthful status reconciliation; it makes no production-source change.
- **Final commit gate:** Ownership isolation, full verification, and commit readiness remain tracked separately. Focused and broad gates have passed for this work unit; a fresh post-amendment independent review and commit decision remain outside it. This Plan acceptance does not authorize a commit here.

## Scope

- Reconstruct pending delivery from existing persisted terminal task state.
- Correlate one versioned completion schema by `schema`, `subagentId`, `generation`, and `status`.
- Acknowledge only an exact supported match returned by `sessionManager.getBranch()`.
- Ignore `sendMessage` return, `message_end`, `notifiedGeneration`, and all-entry/legacy markers as acknowledgement.
- Separate startup delivery, verified live-idle delivery, and active deferral, including a terminal source that appears after the parent is already idle.
- Add red seam tests before source changes; preserve summary-only payloads and join-only Results.
- Coalesce simultaneous safe-flush requests in memory without adding durable delivery state.

## Non-Goals

No new outbox, queue, receipt, broker, polling loop, dependency, parent tool, processing acknowledgement, retry limit, or exactly-once claim. Do not change terminal settlement, continuation, input barrier, cleanup, identity, generation, resume, join, cancel/remove, steering, widget, Herdr transport, Agent/Handler contracts, configuration, or commit history.

## Minimum Strategy

1. Add one supported schema and one validation/correlation helper.
2. Treat each persisted terminal generation as pending until the current branch contains its exact supported correlation; keep attempt suppression in memory only.
3. Replace `getEntries()`/manifest-marker acknowledgement with `getBranch()` scanning. Preserve legacy fields only for compatibility.
4. Coordinate parent delivery as follows:
   - mark the parent run active before execution and retain that state through every `agent_end`; `agent_end` sends zero notifications and never clears the active-run state;
   - on `agent_settled`, clear the active-run state for that completed parent lifecycle, then flush only when `ctx.isIdle()` is true;
   - on `session_start`, recover, scan, and append missing messages with `triggerTurn: false`;
   - leave that startup send unacknowledged until a later branch scan observes it;
   - after any terminal source is durable-backed pending, if the current parent context is available, startup delivery is not in progress, the parent run is inactive, and `ctx.isIdle()` is already true, perform the same live idle scan/send immediately rather than wait for another lifecycle event;
   - send a live idle notification with `deliverAs: "followUp"` and `triggerTurn: true`;
   - if a terminal source or `agent_settled` observes active/non-idle state, retain pending delivery.
5. Scan the current branch before each safe flush. Use one in-process single-flight flush/attempt coordinator: simultaneous terminal-source and idle-settlement callers share the scan and claim a still-unacknowledged correlation before sending, so one process appends at most once per correlation before the next scan. A later safe scan that still lacks the correlation makes it retryable; restart also reconstructs it from the durable terminal source.
6. Keep recovery, registration, and widget ownership in their existing paths without allowing them to bypass delivery coordination.

## Lifecycle Model

```text
session_start
  -> recover + current-branch scan
  -> append missing, triggerTurn false
  -> no acknowledgement until observed on a later scan

before_agent_start / agent_start
  -> active; no send

terminal source
  -> durable-backed pending
  -> active/startup/non-idle: defer
  -> already idle: single-flight current-branch scan and live follow-up send

agent_end
  -> low-level run ended; retry/compaction/follow-up may remain
  -> active-run remains active; zero sends

agent_settled
  -> active-run ends for this lifecycle
  -> ctx.isIdle false: remain pending
  -> ctx.isIdle true: single-flight scan and live follow-up send
```

Pi 0.84.2 explicitly defines `agent_end` as a low-level run boundary and `agent_settled` as the point where no automatic retry, compaction retry, or queued follow-up remains. `message_end` remains pre-append and cannot acknowledge or flush.

## Dependencies And Ordering

```text
#13 (`e68e234`) and #6 (`bc30d943`) committed; their prior ownership is released
  + remaining Phase A shared dirty hunks are an excluded workspace gate, not notification-delivery ownership
  + fresh re-review and explicit current-session Plan acceptance
  -> re-read the committed `src/index.ts` and `tests/runtime.test.ts` baseline
  -> reconcile or isolate the remaining Phase A dirty hunks without editing, staging, or overwriting them
  -> red seam tests
  -> correlation/current-branch helper and single-flight idle coordinator
  -> focused matrix
  -> package/docs gates
  -> independent correctness/evidence review
```

The `#13` and `#6` commits are landed and their prior overlapping-hunk ownership is released. The remaining Phase A shared dirty hunks are present in the workspace but remain outside this notification-delivery Work: they are a dirty-workspace gate, not a dependency owner that this Work may wait on or take over. Before implementation, re-read the committed source/test baseline and reconcile or isolate those hunks with their actual owner. Tasks 2-4 must not edit, stage, overwrite, or claim them. The notification implementation remains one source/test unit and cannot run in parallel with another owner of its notification regions.

## Verification

- F8 evidence now directly proves repeated `agent_end` sends zero, non-idle `agent_settled` performs zero flush, and the later idle `agent_settled` sends one visible follow-up.
- Package typecheck and 100 package tests pass; workspace typechecks and 200 workspace tests pass.
- No production source or notification persistence artifact changed in this bounded evidence unit.
- The supplied independent review found no P0/P1/P2 correctness defect and identified only the now-closed F8 evidence gap. A fresh post-amendment review remains a final commit-gate item.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| false acknowledgement | current branch plus exact supported correlation |
| duplicate after uncertain append | at-least-once contract; in-memory suppression only |
| startup starts Router | `triggerTurn: false` |
| unfinished parent lifecycle is interrupted | active-run remains active and sends zero through `agent_end`; flush only at idle `agent_settled` |
| idle parent misses a late terminal source | enqueue durable-backed pending work, then immediately scan/flush when the current context is already idle |
| duplicate same-process live send | single-flight correlation claim; rescan reopens only unacknowledged correlations |
| legacy marker suppresses replay | ignore as acknowledgement |
| Result leak | summary-only assertions |
| shared work overwritten | `#13`/`#6` ownership is released; isolate the remaining Phase A dirty hunks, re-read the committed baseline, and diff-check excluded scopes |

The source change can roll back to the callback/manifest-marker implementation without artifact migration because no durable field/file is added. Existing branch messages remain; duplicate removal is not promised. This work unit records the accepted Plan and current implementation under the final commit gate; no commit is authorized here.

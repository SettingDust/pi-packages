# Runtime Lifecycle Reconciliation Context

## Objective

Reconcile SDD authority for three already-committed `@settingdust/pi-herdr-subagents` behaviors:

1. persistent runtime task recovery;
2. parent terminal completion notification; and
3. unlimited child continuation.

This Work also records one bounded post-reconciliation amendment: caller cancellation of the `subagent_join` Result-retrieval wait. It is not a fourth item in the original three-behavior historical chronology.

This Work is documentation reconciliation. It does not re-authorize, re-implement, amend, or revert the original three commits. The later join amendment records already-committed source/test evidence and does not change those historical decisions.

## Authority Map

- [Runtime lifecycle specification](../../spec/runtime-lifecycle.md) is the normative behavior authority.
- [Runtime lifecycle authority reconciliation ADR](../../adr/runtime-lifecycle-authority-reconciliation.md) records the architectural boundary, rationale, consequences, retrospective chronology, and bounded join amendment.
- [Tasks](tasks.md) are derived follow-up coordination material.
- No new PRD is applicable: product intent and package scope did not change.
- Existing [task-derived ID Spec](../../spec/task-derived-subagent-id.md), [steer Spec](../../spec/steer-input-submission.md), and [running-status widget Spec](../../spec/running-status-widget.md) remain untouched and retain ownership of their boundaries.

## Authority Coverage Matrix

| Behavior or boundary | PRD | ADR | Spec | Work Context/Tasks | Current authority status |
| --- | --- | --- | --- | --- | --- |
| Persistent task recovery | No new PRD; no product-intent change | `runtime-lifecycle-authority-reconciliation.md` | `runtime-lifecycle.md`, sections 3 and 6 | This Context and Tasks | Covered retrospectively; fresh review findings remediated in docs |
| Terminal notification | No new PRD | Same ADR | `runtime-lifecycle.md`, section 4 | This Context and Tasks | Covered retrospectively; crash-window limitation explicit |
| Unlimited child continuation | No new PRD | Same ADR | `runtime-lifecycle.md`, section 5 | This Context and Tasks | Normative contract retained; current test evidence partial and coverage follow-up pending |
| Join caller cancellation | No new PRD; no product-intent change | Same ADR, bounded post-reconciliation amendment | `runtime-lifecycle.md`, section 9 | This Context and Tasks | Current source/test evidence at `a43f0e1`; not part of the original historical three |
| Task-derived identity/collision | Existing ownership | Existing related authority | `task-derived-subagent-id.md` | Existing Work | Out of scope and unchanged |
| Steering submission | Existing ownership | Existing related authority | `steer-input-submission.md` | Existing Work | Out of scope and unchanged |
| Running status widget | Existing ownership | Existing related authority if any | `running-status-widget.md` | Existing Work | Out of scope and unchanged |
| `#18` terminal input barrier | No applicable authority in this Work | Excluded boundary | `runtime-lifecycle.md`, section 6 | External pending boundary | No repository-local locator was supplied; not implementation verification |
| Future completed-pane auto-close | No new PRD | Excluded boundary | `runtime-lifecycle.md`, section 6 | Future boundary | Not required or verified; separate authority needed |

## Historical Chronology

The commit hashes and timestamps below are historical implementation evidence from Git. They are not current test results and do not prove prior authority acceptance.

| Commit | Timestamp | Behavior evidenced | Files in historical commit |
| --- | --- | --- | --- |
| `5e7e8f2b8799298d45fc4cee1e1ff11959545127` | `2026-08-19T03:48:19+08:00` | persisted task records, restart recovery, retained-pane adoption, stale Result checks, pane-closed failure, resume/remove lifecycle | `src/index.ts`, `tests/runtime.test.ts`, plus package-level changes |
| `10d4f9397cfafe17f17bf4251ecd18e9ff1aa99d` | `2026-08-19T04:41:23+08:00` | terminal notification summary, generation dedupe, pending recovery replay, parent trigger, full Result privacy | `src/index.ts`, `tests/runtime.test.ts`, plus package-level changes |
| `3b3ee81fdc29d7b233226147ee61a5a3a28c52e5` | `2026-08-19T05:05:57+08:00` | child `agent_end` nudge, single pending timer, lifecycle cleanup, repeated continuation, atomic Result completion | `extensions/pane-child.ts`, `tests/pane-child.test.ts`, plus package-level changes |

The source chronology is therefore: implementation first, authority absent, authority reconciliation now. No sentence in this Work or its linked authority should be read as pre-implementation acceptance.

### Bounded Post-Reconciliation Amendment Evidence

Commit `a43f0e1f557c02c1a31cecf45733e33b482882c4` (`2026-08-20T01:47:58+08:00`, `fix(subagents): abort join wait, keep task alive`) is later current-behavior evidence, not an addition to the preceding historical table. It changed `src/index.ts` and `tests/runtime.test.ts`.

- `SubagentRuntime.join` accepts the optional caller `AbortSignal` and passes it only to the wait delay.
- `createSubagentTools` forwards the tool execution signal to `runtime.join`.
- `aborting join leaves the running task unchanged until explicit cancellation` verifies prompt abort, unchanged running task/generation, no Result, unchanged manifest, no notification, and no pane close.
- `passes the join tool AbortSignal to the runtime wait` verifies the tool boundary propagates the signal while the task remains running.

The supported boundary is caller Result retrieval only. It neither cancels the child nor changes the task, generation, Result, manifest, pane, or terminal notification. A later join can retrieve the same generation Result; `subagent_cancel` and `remove` remain explicit lifecycle operations.

## Evidence Baseline

The current checkout is HEAD `a43f0e1f557c02c1a31cecf45733e33b482882c4`. At inspection, the package `src` and `tests` paths were clean; the earlier #9 source/test ownership blocker is no longer present. This documentation-only reconciliation remains uncommitted and does not change package source or tests.

### Source Evidence

| Source object | Claim supported | Evidence scope |
| --- | --- | --- |
| `src/index.ts`, `SubagentRuntime.recover`, `tasksDir`, `readTaskRecord`, `readResult` | manifests and generation Result artifacts define recovery; recovery validates identity, prioritizes current Result, verifies retained panes, and persists reconstructed state | current file, symbols and lifecycle branches |
| `src/index.ts`, `SubagentRuntime.resume`, `remove`, `start` | resume retains session/identity and increments generation; remove closes/removes runtime artifacts | current file, lifecycle methods |
| `src/index.ts`, `settle`, `notifyTerminal`, `persist`, `startMonitor` | terminal paths notify, summary shape excludes Result body, generation key and persisted marker govern dedupe/replay | current file, terminal methods |
| `src/index.ts`, `activateSubagents`, `completionNotificationKeys` | parent startup derives consumed notification keys from session entries and sends summary-only follow-up messages | current file, extension lifecycle and notification helpers |
| `extensions/pane-child.ts`, `scheduleNudge`, `clearNudge`, `finish` | child continuation is timer-based, single-pending, same session/generation, lifecycle-cleared, and Result-writing is atomic/idempotent | current file, all executable branches |
| `src/index.ts`, `SubagentRuntime.join`, `createSubagentTools` | caller `AbortSignal` terminates only the join wait and is forwarded at the tool boundary | commit `a43f0e1` current source evidence |
| `tests/runtime.test.ts` | focused recovery and notification behavior is exercised, including running-pane recovery, terminal Result precedence, stale Result rejection, pane-closed failure, scope recovery, terminal paths, restart replay, dedupe, parent message privacy | named tests in current file |
| `tests/pane-child.test.ts` | pending-timer dedupe/cleanup, continuation after input followed by a later unfinished `agent_end`, and `subagent_done` Result/shutdown behavior are exercised | all four tests in current file; no independent `agent_start` reset, post-nudge shutdown, or multi-cycle continuation check |
| `tests/runtime.test.ts`, join-abort tests | direct and tool-level caller cancellation leave the task running until explicit cancellation | commit `a43f0e1` focused tests named above |

### Historical Evidence Versus Current Verification

- Historical evidence: the three original commit hashes, commit timestamps, and file lists above.
- Current amendment evidence: `a43f0e1f557c02c1a31cecf45733e33b482882c4`, its `src/index.ts` and `tests/runtime.test.ts` changes, and the two named join-abort tests above.
- Current package verification at HEAD: `bun run --cwd packages/pi-herdr-subagents test` passed with `56 pass`, `0 fail`, and `299 assertions`.
- Current worktree inspection: `src` and `tests` are clean; no #9 source/test ownership blocker remains. The documentation files are intentionally uncommitted, and no source or test file was edited for this reconciliation.
- Current commands were run against the current checkout, not reconstructed commit snapshots. The original three hashes remain chronology, not current test evidence.
- No commit was created.

## Claim Audit

| Claim | Classification | Evidence / finding |
| --- | --- | --- |
| Runtime recovery persists task state and can adopt an existing running pane without relaunch | Supported | `recover`, `readTaskRecord`, `paneExists` path; tests `recovers a running pane without relaunching it` and `recovery is idempotent and scoped to the current parent session` |
| Terminal Result is checked before retained-pane verification | Supported | `recover` reads `task.resultPath` before pane check; test `recovers a terminal Result before checking the retained pane` |
| Stale Result identity cannot settle the current generation | Supported | `readResult` checks ID/generation; test `recovers only the current generation and rejects a mismatched Result` |
| Missing pane becomes persisted `pane_closed` failure | Supported | recovery branch and test `persists pane_closed when a running task's pane is missing` |
| All terminal states notify and notification excludes full Result | Supported | `notifyTerminal`, parent message construction, tests for completed/failed/cancelled/closed/launch failure and `injects a summary-only Pi completion message that triggers the parent` |
| Repeated recovery deduplicates notifications and missed notifications replay after restart | Supported with boundary | persisted `notifiedGeneration`, in-memory key, parent-session keys, tests `backfills a missed notification after restart and deduplicates repeated recovery` and `session startup backfills missed notifications and honors parent-session markers` |
| Notifications are unconditionally distributed exactly once across every crash point | Contradicted by current implementation boundary | marker is persisted after notifier success; a crash between callback and marker persistence can permit replay. This is documented as a limitation and follow-up, not silently upgraded to a guarantee |
| Continuation has no retry/time limit and keeps same session/generation | Implementation-supported; current test evidence incomplete | `pane-child.ts` has no counter/limit and sends `deliverAs: "followUp"`; tests cover one continuation after input, but not multiple successive unfinished cycles |
| Continuation has one pending timer and clears on lifecycle activity/settlement | Implementation-supported; current test evidence incomplete | `clearNudge`, `scheduleNudge`, `finish`; tests exercise pending cleanup, but do not independently demonstrate `agent_start` reset or shutdown after a nudge has fired |
| Parent runtime does not need to poll to drive continuation | Supported with scope distinction | continuation is child-owned; parent runtime still has its ordinary 500ms terminal/pane monitor. “No parent polling” means no parent-driven continuation polling |
| An aborted join cancels only its caller wait | Supported | `a43f0e1`; `SubagentRuntime.join` wait signal and the two named direct/tool-level tests |
| `#18` terminal input barrier is verified by this Work | Out of scope | no repository-local locator was supplied; external pending boundary only |
| Completed panes auto-close after terminal completion | Out of scope | no policy, source claim, or verification is added by this reconciliation |
| The three behaviors were authority-first before implementation | Contradicted | Git chronology proves the opposite; this Work records the drift explicitly |

## Reconciliation Findings

### F1: Historical authority drift

- **Severity:** process/traceability, not a runtime defect.
- **Finding:** commits `5e7e8f2`, `10d4f93`, and `3b3ee81` landed before a package Spec and ADR owned their lifecycle behavior.
- **Resolution in this Work:** one lifecycle Spec and one ADR now own the boundary; chronology remains explicit.
- **Remaining:** fresh review must confirm that the new normative language matches the current implementation and tests.

### F2: Notification crash window

- **Severity:** medium operational correctness risk.
- **Finding:** notification callback success and persisted `notifiedGeneration` are separate operations. A process crash between them can replay a notification after restart.
- **Resolution in this Work:** the Spec states the supported exactly-once replay conditions and names the crash window instead of claiming an unconditional exactly-once guarantee.
- **Remaining:** follow-up Task 2 must decide whether to add a regression/guarantee clarification or a future architecture change. No source change is authorized by this reconciliation.

### F3: Current verification is not isolated to historical commits

- **Severity:** evidence limitation.
- **Finding:** current package checks do not reconstruct each original historical commit in isolation.
- **Resolution in this Work:** the original historical hashes, current HEAD, and later bounded join amendment are explicitly separated. The package source/test paths are clean at current HEAD, and the #9 blocker is removed.
- **Remaining:** fresh review should use the historical hashes only as chronology, not as current test evidence.

### F4: Authority coverage was incomplete, not necessarily behaviorally incorrect

- **Severity:** documentation completeness.
- **Finding:** prior package docs covered related identity, steering, and widget behavior but omitted the three lifecycle owners.
- **Resolution in this Work:** lifecycle Spec/ADR/Work coverage added without editing unrelated authority.
- **Remaining:** review must check cross-boundary references and identify any uncovered regression before authority is considered fully reconciled.

### F5: Continuation acceptance was overstated by current test evidence

- **Severity:** P2 documentation/evidence gap; no runtime defect established.
- **Finding:** the Spec's focused acceptance wording could be read as demonstrated by the current `pane-child` tests, but those tests cover pending-timer cleanup and input followed by a later unfinished `agent_end`; they do not independently verify `agent_start` reset, shutdown after a nudge has fired, or multiple successive continuation cycles.
- **Resolution in this Work:** the Spec distinguishes the normative unlimited-continuation and cleanup requirements from the narrower current evidence. No source or test change was made.
- **Remaining:** Task 2 remains pending and defines repeatable regression checks for input cleanup, independent `agent_start` reset, post-nudge shutdown, and at least two successive unfinished continuation cycles. These requirements remain explicit and are not removed or weakened.

### F6: Review documentation findings

- **Severity:** P1/P2 documentation and evidence-chain findings.
- **Finding:** the Spec had a stray leading `x`; the Work retained stale `41 pass`/dirty-source/#9-blocker claims; the bounded join caller-cancellation amendment was absent from the ADR, Context, and Tasks evidence chain; and `#18` terminal input barrier plus future completed-pane auto-close were not explicitly bounded.
- **Resolution in this Work:** the four lifecycle documents now have a formal Spec H1, HEAD `a43f0e1` and `56 pass`/`299 assertions` baseline, clean source/test and no-#9-blocker state, a bounded join evidence chain, and explicit excluded-boundary language. The `#18` label has no supplied repository-local locator and is recorded as external pending rather than given a fabricated reference.
- **Remaining:** no additional documentation remediation is pending from these findings. The independent continuation coverage gaps and notification crash window remain separate, honest limitations.

## Fresh Review Conclusion

The independent review completed with the stated P1/P2 findings. Those documentation and evidence-chain findings are resolved in these four lifecycle documents. This closes only the documentation disposition: it does not mark the continuation acceptance gaps as tested, does not close the notification callback/marker crash window, and does not turn the external `#18` boundary or future completed-pane auto-close into implementation work.

## Scope Protection

This Work does not modify:

- `src/index.ts`;
- `tests/runtime.test.ts`;
- `extensions/pane-child.ts`;
- `tests/pane-child.test.ts`;
- package metadata;
- package README or shared index;
- task-derived ID, steer, or running-status widget documents; or
- any existing Work owned by another task.

## Completion State

- Authority coverage matrix: complete, including bounded amendment and excluded boundaries.
- Minimal lifecycle Spec: complete; formal H1 and scoped amendment recorded.
- Reconciliation ADR: complete; original chronology and later amendment separated.
- Historical/current evidence split: complete.
- Current package baseline: recorded as HEAD `a43f0e1`, `56 pass`, `0 fail`, `299 assertions`; source/test paths clean and #9 blocker removed.
- Review documentation findings: remediated in the four lifecycle documents.
- Continuation evidence gaps: remain explicit; Task 2 is pending.
- Notification crash window: remains explicit and unresolved by design.
- Source/test/package metadata changes: none; no source change was made for this reconciliation.
- Documentation commit: not requested; no commit created.


## Subsequent Automatic Cleanup Amendment

The later accepted [Automatic terminal surface cleanup ADR](../../adr/automatic-terminal-surface-cleanup.md), [Spec section 10](../../spec/runtime-lifecycle.md#10-automatic-terminal-surface-cleanup-amendment), and [bounded Work](../terminal-surface-cleanup/context.md) now own prospective terminal tab/pane cleanup. This does not change this Work's retrospective conclusion that automatic cleanup was excluded and unimplemented when the original reconciliation was completed. Review items `#18` and `#13` remain separate.

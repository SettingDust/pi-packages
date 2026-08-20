# Terminal Notification Delivery Acceptance Matrix
- **Status:** F8 evidence closed; accepted Plan and implementation recorded under the final commit gate; no commit is part of this work unit
- **Authority:** [Runtime Lifecycle Specification](../../spec/runtime-lifecycle.md), section 4
- **Plan:** [Implementation Plan](plan.md)
- **Tasks:** [Tasks](tasks.md)

## Red Seam Matrix

| ID | Setup | Required assertion | Expected old failure |
| --- | --- | --- | --- |
| R0 | persisted `notifiedGeneration`, no current-branch message | restart sends startup message | marker suppresses replay |
| R1 | matching marker only on abandoned branch | resend on current branch | all entries scanned |
| R2 | schema-less/unsupported/malformed marker | ignore and deliver | legacy accepted |
| R3 | ID/generation match, status differs | ignore marker | old key omits status |
| R4 | send returns, branch unchanged | remains pending; restart resends | callback return persists ack |
| R5 | startup pending source | `triggerTurn: false`; no immediate ack assumption | old startup triggers |
| R6 | source appears after `before_agent_start` | active-run remains active and sends neither immediately nor at every `agent_end`; one send only at first `agent_settled` with `ctx.isIdle() === true` | current notifier sends immediately |
| R7 | an idle `agent_settled` has completed; a terminal source then becomes durable-backed pending with no current-branch marker | current-branch scan and exactly one visible `triggerTurn: true` follow-up occur immediately, without waiting for another lifecycle event | no durable current-branch/idle coordinator leaves the source pending or sends through the unsafe callback path |
| R8 | terminal-source registration and eligible idle `agent_settled` request a flush concurrently for one unacknowledged correlation | one in-process append; a later scan still lacking the marker reopens retry | no single-flight correlation claim |

## Focused Behavior Matrix

| ID | Scenario | Required behavior |
| --- | --- | --- |
| F0 | exact supported current-branch correlation | no resend |
| F1 | absent correlation after restart | one startup append, `triggerTurn: false` |
| F2-F6 | abandoned, legacy, malformed, wrong ID/generation/status, display-only match | ignore and resend |
| F7 | live settlement while already idle, including a terminal source after an earlier idle `agent_settled` | scan current branch and append one visible summary follow-up with `triggerTurn: true` immediately |
| F8 | active settlement plus retry/compaction/follow-up-capable `agent_end` | active-run remains active and sends zero through all `agent_end`; only idle `agent_settled` ends that state and may flush; non-idle settled remains pending. Evidence: `tests/runtime.test.ts` F8 regression test. |
| F9 | `message_end` before append | no acknowledgement or flush |
| F10 | send returns before branch visibility | remains unacknowledged; later safe retry allowed |
| F11 | append visible then restart | scan suppresses resend |
| F12 | append absent then restart | resend |
| F13 | scan/send throws | task/Result unchanged; retry eligible |
| F14 | Result contains secret | absent from message content/details |
| F15 | failed/cancelled/pane/launch paths | pending with matching terminal status |
| F16 | two generations | independent correlation/delivery |
| F17 | concurrent and repeated safe flushes before branch visibility | single-flight same-correlation requests append once per scan epoch; a later absent-marker scan makes it retryable; duplicates remain allowed after uncertainty/restart |
| F18 | artifact directory after delivery | no new queue/receipt file |
| F19 | Router does not process message | branch match still acknowledges delivery only, not processing |

## Regression Gates

Existing settlement/join, recovery/resume/remove/cancel, cleanup, continuation/input barrier, task identity, steering, widget, and discovery tests remain unchanged. Run typecheck, full tests, docs references, and `git diff --check`.

## Completion Rule

R0-R8 must first fail for the stated old behavior, including R6's `agent_end` zero-send/active-run assertion, R7's already-idle immediate send, and R8's concurrent single-flight assertion. F0-F19 and regression gates must then pass. No Router-processed claim and no commit are part of this matrix.

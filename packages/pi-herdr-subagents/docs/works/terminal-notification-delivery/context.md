# Terminal Notification Delivery Work Context

- **Status:** F8 evidence closed; bounded implementation recorded under the final commit gate; no production source or commit in this work unit
- **Authority:** [Runtime Lifecycle Specification](../../spec/runtime-lifecycle.md), section 4
- **Plan:** [Implementation Plan](plan.md)
- **Tasks:** [Tasks](tasks.md)
- **Matrix:** [Acceptance Matrix](acceptance-matrix.md)

## Objective

Make every terminal subagent notification durably appear as a supported `custom_message` on the current parent branch, including after restart, without another outbox and without claiming Router processing.

## Settled Decisions

- Existing persisted terminal task state is the durable outbox; no queue, receipt file, broker, or second notification artifact.
- Acknowledgement is an exact supported current-branch `custom_message` from `sessionManager.getBranch()`.
- Correlation is `<schema, subagentId, generation, status>`; `label` and bounded `reason` are display data.
- `sendMessage` return, `message_end`, legacy `notifiedGeneration`, abandoned/all-entry markers, unsupported schema, malformed details, and mismatches are not acknowledgement.
- Delivery is at least once; duplicates are allowed when visibility is uncertain; Router processing is not guaranteed.
- Startup uses `triggerTurn: false` and remains unacknowledged until a later branch scan observes it.
- The active-run state starts before parent execution, remains active through every `agent_end`, and ends only at `agent_settled`; active delivery sends zero through `agent_end`.
- An already-idle parent may flush immediately after a terminal source is durable-backed pending only through the live current-branch scan/send envelope; concurrent same-correlation safe flushes coalesce in memory.
- The current-session Plan acceptance is recorded; a fresh post-amendment review remains a final commit-gate requirement.

## Review Findings And Baseline

- **P0 candidate correction:** Pi 0.84.2 states that `agent_end` ends one low-level run while retry, auto-compaction retry, or queued follow-up may continue. `agent_settled` is the active-run boundary and, guarded by `ctx.isIdle()`, owns a deferred live flush. A terminal source that appears after an earlier idle settlement cannot wait for another event: after durable pending registration it must perform the same live scan/send when the current parent is already idle.
- **Concurrency clarification:** a terminal-source flush and an idle-`agent_settled` flush can race. A single in-memory scan/attempt coordinator must claim the unacknowledged correlation before append, coalesce simultaneous callers, and reopen retry only after a later scan still lacks the branch marker. This is attempt suppression, not a receipt or second outbox.
- **Ownership corrected:** work items `#13` (`e68e234`) and `#6` (`bc30d943`) are committed; their prior overlapping ownership is released. Remaining Phase A shared dirty hunks in `src/index.ts` and `tests/runtime.test.ts` are a dirty-workspace gate outside this Work, not `#6`-owned work to await or notification work to absorb.

## Reconciled Gap

The durable current-branch implementation and prior review evidence close the callback/marker, branch, schema, startup, idle, and concurrency gaps. The remaining evidence gap was F8's independent repeated-`agent_end` and non-idle-`agent_settled` coverage; the focused test now closes it.

## Control Model

```text
persisted terminal state
  -> recover pending correlation
  -> exact current-branch match? yes: acknowledged
  -> no: active/startup/non-idle? yes: defer through agent_end
  -> no: current context already idle? scan + one live follow-up send
  -> later agent_settled + isIdle true: same safe scan/send
  -> send still unacknowledged
  -> later scan/restart: match or retry
```

The production implementation boundary remains the parent notification coordination in `src/index.ts` and focused `tests/runtime.test.ts`. This bounded completion unit changes only the F8 test and Work/Plan/Tasks/Matrix/status text; it does not modify production source, other lifecycle behavior, Herdr state, parent-session state, or commits.

## Current Reconciliation

- **Plan acceptance:** The current-session Handoff accepts the bounded notification-delivery Plan for this implementation gate.
- **Implementation:** The current source behavior remains the implementation under review. This work unit adds only F8 regression evidence and status reconciliation; it does not modify production source.
- **F8 evidence:** `tests/runtime.test.ts` proves repeated `agent_end` sends zero, non-idle `agent_settled` performs zero flush, and a later idle `agent_settled` performs one follow-up delivery.
- **Commit gate:** Final ownership and commit decisions remain separate from this completed evidence work; this unit creates no commit.

## Verification Evidence

- Focused F8 test: `bun test packages/pi-herdr-subagents/tests/runtime.test.ts --test-name-pattern "F8"` passed (1 test).
- Package typecheck passed with `bun run --cwd packages/pi-herdr-subagents typecheck`.
- Package tests passed: 100 tests, 0 failures.
- Workspace typechecks passed for `pi-herdr`, `pi-harness`, and `pi-herdr-subagents`.
- Workspace tests passed: 200 tests, 0 failures.
- The supplied independent review found no P0/P1/P2 correctness defect and identified F8 as its only evidence gap; this unit closes that gap. A fresh post-amendment independent review remains part of the final commit gate.

## Gates

1. Fresh independent re-review of revised Spec/Work/Plan/Tasks/Matrix and Pi 0.84.2 assumptions.
2. All review gaps re-checked and explicit current-session acceptance of the re-reviewed Plan.
3. `#13` and `#6` retained as landed baseline; committed source/tests re-read; remaining Phase A dirty hunks isolated or reconciled with their actual owner.
4. Intended red seam evidence before source correction.
5. Focused matrix, typecheck/full tests, documentation checks, `git diff --check`, and independent correctness/evidence review.

The bounded evidence/status unit authorizes no production-source change, Herdr mutation, parent-session mutation, or commit; those remain outside this result and subject to the final commit gate.

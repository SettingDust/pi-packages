# Terminal Notification Delivery Tasks

- **Status:** F8 evidence and implementation-gate reconciliation complete; the accepted Plan and implementation remain under the final commit gate; no commit is authorized here
- **Authority:** [Runtime Lifecycle Specification](../../spec/runtime-lifecycle.md), section 4
- **Context:** [Work Context](context.md)
- **Plan:** [Implementation Plan](plan.md)
- **Matrix:** [Acceptance Matrix](acceptance-matrix.md)

## Current Reconciliation

- Task 1 acceptance is recorded for the bounded current-session implementation gate.
- Task 2's remaining F8 evidence is closed in `tests/runtime.test.ts`; the test asserts repeated `agent_end` sends zero, non-idle `agent_settled` performs zero flush, and a later idle `agent_settled` sends once.
- Task 3's implementation is recorded as present under review; this unit changes no production source.
- Task 4's focused/package/workspace verification is complete: F8 focused test passed; package typecheck and 100 package tests passed; workspace typechecks and 200 workspace tests passed. The supplied independent review found no P0/P1/P2 defect and identified only the now-closed F8 evidence gap.
- Task 4's final ownership, fresh post-amendment independent review, and commit decision remain a separate final commit gate. No commit is part of this result.

## Task 1: Re-review, Ownership, And Acceptance

- **Dependency:** `#13` and `#6` are landed; their prior overlapping-hunk ownership is released.
- **Objective:** Re-review authority/plan against committed `src/index.ts`, `tests/runtime.test.ts`, Pi `sendMessage`, lifecycle through `agent_settled`, `ctx.isIdle()`, and `getBranch()`.
- **Checks:** terminal coverage; exact correlation; startup still-unacknowledged semantics; zero send through `agent_end` while the run remains active; `agent_settled` as the active-run boundary; an already-idle terminal source's immediate scan/send path; single-flight same-correlation idempotence; no extra outbox; at-least-once/no-processing guarantee; privacy and excluded scopes.
- **Phase A dirty-workspace gate:** the remaining Phase A shared dirty hunks are not owned by this Work. Re-read the committed notification baseline, then reconcile or isolate those hunks with their actual owner; do not edit, stage, overwrite, claim, or wait for `#6` as their owner.
- **Completion:** committed baseline re-read; prior `#13`/`#6` ownership confirmed released; the Phase A gate is isolated; review gaps are re-checked; and explicit current-session Plan acceptance is recorded.
- **Touched surfaces:** docs only.

## Task 2: Red Seam Reproduction

- **Dependency:** Task 1 accepted.
- **Objective:** Add focused failing tests before source behavior changes.
- **Red seams:** persisted marker without current-branch message replays; abandoned/schema-less/unsupported/malformed/status-mismatched markers do not acknowledge; void send does not durably acknowledge; startup uses `triggerTurn: false`; active settlement sends neither immediately nor at `agent_end`, then sends only at idle `agent_settled`; a terminal source made durable after an earlier idle `agent_settled` scans the current branch and sends one `triggerTurn: true` follow-up immediately; concurrent terminal-source and idle-settlement flush requests for one unacknowledged correlation append once in process, while a later scan without the marker permits retry.
- **Constraints:** retain intended failures; do not weaken assertions; do not modify, stage, or overwrite Phase A dirty hunks; no source change.
- **Completion:** each seam fails for the old-behavior reason, including no durable current-branch/idle coordinator for the already-idle and concurrent-flush paths.

## Task 3: Implement Current-Branch Durable Delivery

- **Dependency:** Task 2.
- **Objective:** Make red seams and fake matrix pass with the smallest parent-side change.
- **Required behavior:** one schema/helper; `getBranch()` acknowledgement; existing artifacts as sole outbox; startup false-trigger send; active deferral with zero `agent_end` send and `agent_settled` as the active-run boundary; first idle `agent_settled` flush; immediate current-branch scan/live flush when a newly durable terminal source finds the parent already idle; single-flight in-process same-correlation suppression with retry reopening after a later absent-marker scan; non-idle settled remains pending; send/message_end remain unacknowledged until branch scan; retry after uncertainty/restart; Result/cleanup privacy; failure isolation.
- **Touched surfaces:** notification/recovery/extension lifecycle regions in current `src/index.ts` and focused `tests/runtime.test.ts` only; Phase A dirty hunks remain excluded.

## Task 4: Gates And Independent Review

- **Dependency:** Task 3.
- **Checks:** focused tests; typecheck; full tests; no new outbox/receipt artifact; document references; `git diff --check`; ownership/diff review; independent correctness and evidence review.
- **Completion:** all bounded checks pass without Spec drift, Result leakage, unrelated changes, or a false claim that the Plan is still Draft; the accepted Plan and implementation remain under the final commit gate.

```text
Task 1 re-review + released #13/#6 ownership + isolated Phase A gate + explicit acceptance
  -> Task 2 red seams
  -> Task 3 implementation/matrix
  -> Task 4 gates/review
```

Tasks 2-4 are not parallel-safe because they share `src/index.ts` and `tests/runtime.test.ts`. Generic pacing commands do not satisfy acceptance.

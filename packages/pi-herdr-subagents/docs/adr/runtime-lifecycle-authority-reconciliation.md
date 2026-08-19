# ADR: Runtime Lifecycle Authority Reconciliation

- **Status:** Accepted as a reconciliation record
- **Date:** 2026-08-19
- **Bounded amendment evidence:** `a43f0e1f557c02c1a31cecf45733e33b482882c4` (`2026-08-20T01:47:58+08:00`)
- **Scope:** `packages/pi-herdr-subagents`
- **Authority:** [Subagent Runtime Lifecycle Specification](../spec/runtime-lifecycle.md)
- **Derived work:** [Runtime Lifecycle Reconciliation Context](../works/runtime-lifecycle-reconciliation/context.md)

## Context

Three durable runtime behaviors were implemented and committed before their package-level SDD authority was recorded:

| Behavior | Commit | Historical implementation event |
| --- | --- | --- |
| Persistent runtime task recovery | `5e7e8f2b8799298d45fc4cee1e1ff11959545127` | `2026-08-19T03:48:19+08:00` |
| Parent terminal completion notification | `10d4f9397cfafe17f17bf4251ecd18e9ff1aa99d` | `2026-08-19T04:41:23+08:00` |
| Unlimited child continuation | `3b3ee81fdc29d7b233226147ee61a5a3a28c52e5` | `2026-08-19T05:05:57+08:00` |

The existing package documentation had authority for the running-status widget, steer input submission, and task-derived IDs, but no owning Spec or ADR for these three lifecycle behaviors. Their implementation and tests therefore became the primary behavioral evidence before the authority was written.

This record is intentionally retrospective. It does not claim pre-implementation review, user acceptance, or authority compliance for the historical commits. It records the current architectural boundary, identifies the current implementation evidence, and makes the remaining authority and verification gaps visible.

## Bounded Post-Reconciliation Amendment

Commit `a43f0e1f557c02c1a31cecf45733e33b482882c4` (`fix(subagents): abort join wait, keep task alive`) later added caller cancellation to the `subagent_join` wait. This is a bounded current amendment to the lifecycle Spec, not a fourth behavior in the original three-item retrospective chronology or a claim about those historical decisions.

The current source evidence is `src/index.ts`: `SubagentRuntime.join` passes its optional caller `AbortSignal` only to its wait delay, and `createSubagentTools` forwards the tool invocation signal to that method. The commit added focused tests in `tests/runtime.test.ts`: `aborting join leaves the running task unchanged until explicit cancellation` and `passes the join tool AbortSignal to the runtime wait`. They show that aborting the retrieval wait leaves the task, generation, Result path, manifest, notifications, and pane unchanged; explicit `subagent_cancel` remains the operation that changes lifecycle state.

This amendment does not reopen recovery, notification, or continuation semantics. Its evidence is recorded in this ADR, the lifecycle Spec, and the derived Context and Tasks.

## Decision

1. Treat the three behaviors as one lifecycle authority boundary because they share task identity, generation, Result persistence, terminal state, and child-session lifecycle.
2. Record normative lifecycle behavior in one Spec, `docs/spec/runtime-lifecycle.md`, rather than creating three overlapping Specs or three small PRDs.
3. Record this ADR as the architectural/governance reconciliation: persisted task artifacts are the recovery source, terminal notifications are summary-only and generation-deduplicated, and continuation is child-owned within the same session/generation.
4. Keep product intent unchanged and create no new PRD. Keep task-derived identity, steering, widget, and other existing authority in their current documents.
5. Treat the Work Context and Tasks as derived review coordination only. They may record chronology, evidence, gaps, and follow-up, but they cannot retroactively authorize the commits.
6. Require a fresh independent review and any needed regression coverage before declaring the reconciled authority fully verified.
7. Adopt the later `subagent_join` caller-cancellation behavior as a bounded Spec amendment: aborting a caller's Result-retrieval wait affects only that wait. It must not cancel or otherwise mutate the child task; the original three historical behaviors and chronology remain unchanged.

## Rationale

- A single lifecycle Spec follows the shared identity/generation state machine and avoids contradictory contracts for recovery, notification, and continuation.
- `task.json`, generation-specific Result files, and the stable session path already form the implementation's persistence boundary; documenting that boundary is lower risk than inventing a second queue or migration.
- Notification summaries protect the full Result retrieval path and permit parent triggering without leaking Handler output into a terminal event.
- Child-owned follow-up keeps continuation local to the child execution and avoids coupling parent scheduling to child turn timing.
- Caller cancellation belongs at `subagent_join`'s retrieval boundary: forwarding its `AbortSignal` to the wait preserves explicit lifecycle operations as the only task-mutating operations.
- The existing task-derived ID Spec remains the owner of allocation and legacy identity rules; duplicating those rules here would create authority drift.

## Consequences

### Positive

- Recovery, notification, and continuation now have one discoverable normative owner.
- Historical implementation drift is explicit and reviewable.
- Full Result retrieval remains separate from terminal notification.
- Continuation can repeat without a new parent task or generation migration.
- A caller can stop waiting for a Result without implicitly cancelling the child task.
- Existing package docs remain stable and unrelated work is not rewritten.

### Negative And Operational

- The authority was added after implementation, so acceptance evidence must distinguish historical commit hashes from current-checkout verification.
- Notification marker persistence occurs after notifier success. A process crash between those operations can cause a duplicate after recovery; the Spec records this as a known limitation rather than claiming unconditional distributed exactly-once delivery.
- Recovery and notification correctness depend on valid atomic artifact writes and parent-session completion-message markers.
- The bounded join amendment supports cancellation of a caller's wait, not task cancellation; callers that intend to stop a child must use the existing explicit lifecycle operation.
- A fresh reviewer must validate the current implementation against the new Spec, including any test gaps not visible in the current package suite.

## Alternatives Considered

The following alternatives are rejected as scope or ownership choices, not as unrecorded implementation experiments:

- **Three independent lifecycle Specs:** rejected because the behaviors share the same task/generation persistence and terminal boundaries and would duplicate invariants.
- **A new PRD:** rejected because no product intent, user group, outcome, or scope changed; this is technical lifecycle authority reconciliation.
- **Retrospectively describing the commits as pre-authorized:** rejected because the repository history proves implementation preceded this authority record.
- **A separate durable notification queue:** not selected for this reconciliation because the current implementation uses the task manifest marker and parent-session markers; adding a queue would be a new architecture requiring a separate decision.

## Excluded Boundaries

- The review label `#18 terminal input barrier` has no repository-local issue, authority document, source symbol, or test locator supplied to this reconciliation. It is an external pending boundary, not a requirement or verification claim of this ADR; separate authority must establish its semantics and locator before implementation work is scoped.
- A future policy that automatically closes completed panes is not selected, required, or verified here. Explicit `remove` remains the documented lifecycle cleanup boundary; completed-pane auto-close requires separate authority and focused source/test scope.

## Revisit And Supersession

Revisit this ADR when any of the following occurs:

- notification delivery must be crash-proof exactly once across callback and persistence failures;
- notification delivery moves to an external broker or a separate durable queue;
- continuation requires a retry budget, lease, scheduler, or parent-owned orchestration;
- join caller cancellation must propagate into task cancellation or terminal-state mutation;
- recovery requires a manifest version migration or cross-machine task storage; or
- task identity, generation, Result transport, or parent-session ownership changes.

A future ADR must supersede this record if those changes alter the lifecycle ownership boundary rather than merely tightening tests or correcting a local implementation defect.

## Authority Reconciliation Outcome

The three original behaviors now have explicit ADR and Spec ownership. The bounded post-reconciliation join amendment has its own current source/test evidence and does not alter that historical three-behavior record. The reconciliation Work records the implementation-versus-authority matrix, the historical/current evidence split, and the remaining fresh-review and regression tasks. No source, test, package metadata, README, shared index, or existing unrelated authority was changed by this reconciliation.

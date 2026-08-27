# ADR-0007: Authority-First Router Admission

- Status: draft; unaccepted; unimplemented
- Date: 2026-08-25
- Supersedes: the current accepted authority-first admission behavior only when this draft is accepted and implemented
- Related: [Router Delegation Specification](../spec/router-delegation.md), [Authority-First Router Admission Work](../works/authority-first-router-admission/work.md)

## Context

`pi-harness` validates and delegates Handoffs from a Pi main-session Router. A Handoff requests work; it never proves that the user accepted a Plan. The workflow owner, not the Harness admission boundary, must complete the Plan and Tasks, disclose the decision-relevant material in an ordinary message, obtain one user confirmation, and then invoke delegation.

The current implementation instead contains an Extension-private `PlanAuthorizationRegistry`, a `PlanAuthorizationReceipt`, the `pi-harness:plan-activation-v1` EventBus channel, activation decision/context/outcome types, replay IDs and timestamps, session/generation authorization state, receipt integrity checks, and receipt-driven `acceptance_required` responses. That state machine duplicates workflow responsibility, cannot prove what the user saw or accepted, and creates a second confirmation protocol inside Harness.

The cancelled predecessor draft removed only a decision discriminator. Its partial edits are superseded by this broader removal boundary; they must not be preserved merely because they are present in the worktree.

## Decision — draft pending acceptance

Remove the entire Harness Plan authorization/activation state machine. `pi-harness` must not use or expose `pi-harness:plan-activation-v1`, activation context/outcome/decision/disclosure transport owned by Harness, `PlanAuthorizationRegistry`, `PlanAuthorizationReceipt`, authorization replay identifiers or timestamps, receipt integrity checks, or receipt-based acceptance state.

The Router/coordinator remains normatively responsible for completing and reviewing Plan/Tasks, ordinary-message disclosure, one confirmation, and delegation invocation. Handoff acceptance is never inferred by Harness, and Harness does not persist, replay-protect, clear, restore, issue, or audit confirmation state. Session reload, resume, fork, and shutdown therefore have no authorization state to clear or restore.

`resolve_delegation` remains a non-interactive legality boundary. It validates Handoff schema, Skill/Role/model/thinking availability, readable references, the selected same-directory Work/Plan/Tasks tuple, canonical paths and document bytes, model-forbidden capability-shaped fields, normalized Handoff identity, and final current-call/JIT authority checks that remain meaningful without a receipt. It does not launch a Handler or ask for confirmation.

When current authority bytes differ from the bytes validated earlier in the same call, Harness may fail closed with a precise authority-drift result. That result does not mean that old or new Plan bytes were accepted; the Router must re-disclose and reconfirm substantive changes as a workflow rule before retrying delegation. Harness must not encode that rule as a receipt or token.

## Alternatives considered

- **Keep the current registry and receipts:** rejected; it retains the state machine and gives Harness authority it cannot establish.
- **Keep only the activation channel with a validity-only payload:** rejected; it still transports and enforces confirmation state inside Harness.
- **Add a compatibility shim for old activation APIs:** rejected unless a directly evidenced in-repository consumer requires one; no such consumer is in the traced target package surfaces. Prefer removal and an explicit migration note.

## Consequences

Positive: one owner for confirmation; no forged or stale Harness acceptance history; no session/reload persistence semantics; fewer APIs, state transitions, and failure modes; planned admission can be tested as ordinary structural and current-call validation.

Negative: callers that used activation events or receipt lookup must migrate atomically to Router-owned ordinary confirmation followed by normal delegation. `acceptance_required` can no longer represent a missing receipt. The Router must handle re-disclosure/reconfirmation after substantive Plan changes.

Compatibility: remove the old channel, payload types, exported activation helpers, receipt registry, and receipt-specific result codes. If repository-wide evidence later finds an external consumer, stop and amend this draft before implementation rather than silently adding a shim.

## Scope and exclusions

Later implementation is limited to the exact surfaces in the accepted future Plan: `extensions/pi-harness.ts`, `src/admission.ts`, deletion of `src/admission-decision.ts` unless a narrower retained helper is proven necessary, `src/protocol.ts` for response/type changes, and directly coupled focused tests. No Pi core, Host seam, settings, sessions, Herdr, backend, source runtime activation, reload, staging, or commit operation is part of this draft.

This document and its linked Specification, Work, Context, Plan, and Tasks remain draft, unaccepted, and unimplemented. Documentation changes do not authorize source changes.

## Revisit

Revisit only if direct consumer evidence requires a migration contract, if Router ownership of ordinary confirmation changes, or if current-call authority validation cannot be preserved without the removed state. Any such change requires a fresh reviewed authority decision.

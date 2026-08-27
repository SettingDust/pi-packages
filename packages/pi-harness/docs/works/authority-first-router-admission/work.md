# Authority-First Router Admission Work

- Status: draft; unaccepted; unimplemented
- Date: 2026-08-25
- Scope: remove Harness Plan authorization state and reconcile six package-local documents; no source/runtime operation

## Objective

Establish reviewed draft authority and the smallest later implementation Plan for removing the entire Harness Plan activation/authorization state machine. Confirmation belongs to the Router workflow: complete Plan/Tasks, disclose them in an ordinary message, obtain one user confirmation, then invoke delegation. Harness only validates delegation legality and current-call authority.

## Authority package

- [ADR-0007](../../adr/0007-authority-first-router-admission.md): draft architectural decision and ownership boundary.
- [Router Delegation Specification](../../spec/router-delegation.md): draft normative runtime and failure contract.
- [Context](context.md): current evidence, consumer map, and scope ledger.
- [Plan](plan.md): draft implementation sequence and gates.
- [Tasks](tasks.md): draft executable decomposition.

## Boundary

Remove `pi-harness:plan-activation-v1`, activation context/outcome/decision/disclosure transport, `PlanAuthorizationRegistry`, `PlanAuthorizationReceipt`, replay/session/generation authorization state, receipt integrity and insertion logic, and receipt-based `acceptance_required`. Preserve Handoff non-authorization, non-interactive Resolver behavior, selected tuple/reference validation, canonical paths/bytes/digests, normalized Handoff identity, forbidden capability-shaped input rejection, model/Skill/Role checks, and meaningful same-call/final-JIT authority-drift failure.

When bytes change, Harness reports current-call drift only. It does not know which Plan the user accepted. Router re-disclosure and reconfirmation is a workflow obligation, not a Harness state transition.

## Draft boundary

This package is documentation-only. These drafts are not user acceptance, implementation authorization, a receipt, a runtime marker, or permission to reload, mutate Pi/Herdr/settings/sessions, stage, or commit.

## Completion signal

The documentation outcome is complete when all six documents agree on the removal boundary, preserved validation, exact candidate scope, compatibility map, ordered verification gates, stop/rollback conditions, draft status, and unresolved decisions; document identities are recomputed; and no non-document project path changed.

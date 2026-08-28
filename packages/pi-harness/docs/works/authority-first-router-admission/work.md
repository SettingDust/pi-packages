# Authority-First Router Admission Work

- Status: accepted; implementation repairs, narrow Role validation, full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation complete; isolated commit pending
- Date: 2026-08-25
- Scope: remove Harness Plan authorization state, validate the bounded candidate, and reconcile the six package-local documents; no Pi/Host/Herdr/settings/session operation

## Objective

Establish accepted authority and execute the smallest implementation Plan for removing the entire Harness Plan activation/authorization state machine. Confirmation belongs to the Router workflow: complete Plan/Tasks, disclose them in an ordinary message, obtain one user confirmation, then invoke delegation. Harness only validates delegation legality and current-call authority.

## Authority package

- [ADR-0007](../../adr/0007-authority-first-router-admission.md): accepted architectural decision and ownership boundary.
- [Router Delegation Specification](../../spec/router-delegation.md): accepted normative runtime and failure contract.
- [Context](context.md): current evidence, consumer map, and scope ledger.
- [Plan](plan.md): accepted implementation sequence and gates.
- [Tasks](tasks.md): accepted executable decomposition.

## Boundary

Remove `pi-harness:plan-activation-v1`, activation context/outcome/decision/disclosure transport, `PlanAuthorizationRegistry`, `PlanAuthorizationReceipt`, replay/session/generation authorization state, receipt integrity and insertion logic, and receipt-based `acceptance_required`. Preserve Handoff non-authorization, non-interactive Resolver behavior, selected tuple/reference validation, canonical paths/bytes/digests, normalized Handoff identity, forbidden capability-shaped input rejection, model/Skill/Role checks, and meaningful same-call/final-JIT authority-drift failure.

When bytes change, Harness reports current-call drift only. It does not know which Plan the user accepted. Router re-disclosure and reconfirmation is a workflow obligation, not a Harness state transition.

## Acceptance and implementation state

This Work and its linked authority package were accepted through the current-user T4 Handoff. The bounded implementation repairs, narrow Role validation, full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation are complete; this Work does not itself issue receipts or authorize reload, deployment, live Router/Handler launch, runtime activation, staging, or commit.

The candidate consists of the six implementation/test paths named in the current evidence, plus deletion of the two obsolete admission-decision files. Detailed identities, validation evidence, and the exact boundary are maintained in [Context](context.md).

## Evidence ownership and lifecycle reconciliation

The implementation repairs comprise three distinct findings with separate ownership:

- First P2: Resolver root/Handoff/context runtime shape closure and recursive capability-field rejection belong to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.
- Second P2: nested atomic/planned/authority TypeBox closure belongs to `extensions/pi-harness.ts`, with regression coverage in `tests/extension.test.ts`.
- Final P2: non-string Role model/thinking fail-closed validation belongs to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.

Fresh final technical evidence is complete: admission/protocol `50 pass, 0 fail, 102 assertions`; protocol-only `45 pass, 0 fail, 86 assertions`; Extension schema `1 pass, 0 fail, 41 assertions`; and full package `105 pass, 0 fail, 436 assertions across seven files`. TypeScript `5.9.3` typecheck passed, protocol import, and source-level `activateHarness` registration smoke passed.

The four malformed Role cases (null/numeric model and null/numeric thinking) returned `unavailable_model` or `invalid_thinking`, did not throw, and produced zero subject observations. Stateless evidence retained: seven closed TypeBox shapes; Work and Plan drift each returned `authority_drift` after exactly two observations; recursive capability-shaped keys were rejected while prose was accepted; removed-state inventory returned zero results; both obsolete admission-decision files were absent. Environment limitations are recorded in [Context](context.md).

Lifecycle: implementation repairs, narrow Role validation, full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation are complete. The final review found P0/P1/P2/P3 all none; exact source/test and document identities matched, and no repair was required. GO for one isolated twelve-path commit; isolated commit remains pending and separately authorized. This Work does not authorize reload, deployment, live Router/Handler launch, runtime activation, staging, or commit.
The six-document reconciliation is complete. No unrelated project path changed, and no reload, receipt issuance, activation, settings/session/Herdr mutation, staging, commit, or remote access occurred.

## Completion signal

Implementation repairs, narrow Role validation, full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation are complete. The final review found P0/P1/P2/P3 all none; isolated commit remains pending and separately authorized. No unrelated project path changed.

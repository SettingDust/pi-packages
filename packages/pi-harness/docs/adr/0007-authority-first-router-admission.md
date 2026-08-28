# ADR-0007: Authority-First Router Admission

- Status: accepted; implementation repairs, narrow Role validation, full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation complete; isolated commit pending
- Date: 2026-08-25
- Supersedes: the prior receipt-based authority-first admission behavior
- Related: [Router Delegation Specification](../spec/router-delegation.md), [Authority-First Router Admission Work](../works/authority-first-router-admission/work.md)

## Context

`pi-harness` validates and delegates Handoffs from a Pi main-session Router. A Handoff requests work; it never proves that the user accepted a Plan. The workflow owner, not the Harness admission boundary, must complete the Plan and Tasks, disclose the decision-relevant material in an ordinary message, obtain one user confirmation, and then invoke delegation.

The pre-change implementation contained an Extension-private `PlanAuthorizationRegistry`, a `PlanAuthorizationReceipt`, the `pi-harness:plan-activation-v1` EventBus channel, activation decision/context/outcome types, replay IDs and timestamps, session/generation authorization state, receipt integrity checks, and receipt-driven `acceptance_required` responses. That state machine duplicated workflow responsibility, could not prove what the user saw or accepted, and created a second confirmation protocol inside Harness.

The cancelled predecessor draft removed only a decision discriminator. Its partial edits are superseded by this broader removal boundary; they must not be preserved merely because they are present in the worktree.

## Decision - accepted; implementation repairs, narrow Role validation, full technical validation, and fresh final independent correctness/security/evidence review complete

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

If repository-wide evidence later finds an external consumer, stop and amend the accepted ADR before any future compatibility implementation rather than silently adding a shim. Prefer removal and an explicit migration note.

## Scope and exclusions

Implementation was limited to the exact surfaces in the accepted Plan: `extensions/pi-harness.ts`, `src/admission.ts`, deletion of `src/admission-decision.ts`, `src/protocol.ts` for response/type changes, and directly coupled focused tests. No Pi core, Host seam, settings, sessions, Herdr, backend, source runtime activation, reload, staging, or commit operation was part of T2-T4.

This document and its linked Specification, Work, Context, Plan, and Tasks are accepted for the bounded implementation covered by the user-authorized T4 Handoff. Implementation repairs, narrow Role validation, full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation are complete; isolated commit remains pending and separately authorized. Documentation status does not authorize reload, deployment, live Router/Handler launch, runtime activation, Pi/Host/Herdr/settings/session mutation, staging, or commit.
## Evidence ownership and lifecycle reconciliation

The implementation repairs comprise three distinct findings with separate ownership:

- First P2: Resolver root/Handoff/context runtime shape closure and recursive capability-field rejection belong to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.
- Second P2: nested atomic/planned/authority TypeBox closure belongs to `extensions/pi-harness.ts`, with regression coverage in `tests/extension.test.ts`.
- Final P2: non-string Role model/thinking fail-closed validation belongs to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.

Fresh final technical evidence is complete: admission/protocol `50 pass, 0 fail, 102 assertions`; protocol-only `45 pass, 0 fail, 86 assertions`; Extension schema `1 pass, 0 fail, 41 assertions`; and full package `105 pass, 0 fail, 436 assertions across seven files`. TypeScript `5.9.3` typecheck passed, protocol import passed, and source-level `activateHarness` registration smoke passed.

The four malformed Role cases (null/numeric model and null/numeric thinking) returned `unavailable_model` or `invalid_thinking`, did not throw, and produced zero subject observations. Stateless evidence retained: seven closed TypeBox shapes; Work and Plan drift each returned `authority_drift` after exactly two observations; recursive capability-shaped keys were rejected while prose was accepted; removed-state inventory returned zero results; both obsolete admission-decision files were absent.

The current six candidate identities, exact twelve-path boundary, environment limitations, and source-stability proof are recorded in [Work Context](../works/authority-first-router-admission/context.md). Full technical validation is complete. Fresh final independent correctness/security/evidence review is complete with P0/P1/P2/P3 all none; exact source/test and document identities matched, and no repair was required. Completion-status reconciliation is complete. GO for one isolated twelve-path commit; the commit remains pending and separately authorized. No reload, deployment, live Router/Handler launch, runtime activation, staging, or commit was performed.

## Revisit

Revisit only if direct consumer evidence requires a migration contract, if Router ownership of ordinary confirmation changes, or if current-call authority validation cannot be preserved without the removed state. Any such change requires a fresh reviewed authority decision.

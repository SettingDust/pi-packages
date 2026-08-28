# Router Delegation Specification

- Status: accepted; implementation repairs, narrow Role validation, full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation complete; isolated commit pending
- Authority: [ADR-0007](../adr/0007-authority-first-router-admission.md)

## 1. Boundary and trust ownership

The Router/coordinator owns workflow confirmation: it must complete the applicable Plan and Tasks, disclose the decision-relevant context and exact authority in an ordinary message, obtain one current-user confirmation, and then invoke delegation. A Handoff requests work and never proves acceptance. `pi-harness` does not authenticate the user, interpret natural-language confirmation, persist confirmation, issue a token or receipt, or replay-protect confirmation history.

The Harness Extension owns prompt/tool registration and resolver execution. The Resolver validates and resolves; it must not interact, disclose, activate a Plan, issue a receipt, or launch a Handler.

## 2. Handoff and admission input

A Handoff contains `objective`, `primarySkill`, optional `companionSkills`, `context`, optional `constraints`, and optional `deliverables`. Each context item must contain exactly one non-empty readable `ref` or one non-empty `inline` value plus a non-empty `purpose`.

Atomic admission remains available for one small, behavior-neutral change with non-empty bounded `basis[]` and focused `verification[]`. Planned admission selects exactly one same-directory `work.md` plus either matching `plan.md`/`tasks.md` or matching sliced members. The selected three canonical paths must occur exactly once as Handoff reference context. The tuple grammar, canonical path rules, canonical document-byte rules, canonical JSON rules, and normalized Handoff hashing remain current-call validation inputs.

Model input must not supply receipt, acceptance, reviewer, session, activation, digest, or other capability-shaped fields. The Resolver derives identities from filesystem bytes and supplied structure; it never trusts model-supplied identity fields.

## 3. Planned validation without authorization state

For planned admission, the Resolver must:

1. validate the ordinary Handoff, Skills, Role, model, thinking, references, and admission shape;
2. canonicalize and validate the selected Work/Plan/Tasks tuple;
3. read the selected authority as required for current-call validation and derive canonical paths, bytes, and normalized Handoff identities;
4. run the configured final current-call/JIT recomputation immediately before returning a resolved invocation; and
5. return a resolved invocation when those checks pass, without looking up or inserting acceptance state.

The Resolver remains non-interactive. No planned call waits for, invokes, or checks a Plan activation boundary. The Router must perform confirmation before invoking this delegation path; that workflow obligation is outside the Resolver contract and cannot be represented by a receipt.

If authority or Plan bytes change between current-call observations, the call must fail closed with `authority_drift` (or the existing precise structural/reference error when that is the actual cause). The error must not claim that a user accepted either version. The Router decides whether to re-disclose and reconfirm before a new call.

## 4. Removed interfaces and compatibility

The following are removed, not deprecated compatibility interfaces:

- EventBus channel `pi-harness:plan-activation-v1`;
- activation request/context/result transport and Harness-owned disclosure helper;
- `PlanAuthorizationRegistry`, `PlanAuthorizationReceipt`, receipt lookup/insertion/integrity APIs;
- activation decision/outcome types, replay IDs, activation/decision timestamps, session-generation authorization state, and reset/restore/issuance logic; and
- receipt-specific `acceptance_required`, `receipt_corrupt`, and amendment/authorization response semantics.

No compatibility shim accepts, ignores, or translates the old activation payload; the completed repository-wide inventory found no direct consumer requiring one. A removed API has no migration period inside Harness; the migration is to ordinary Router confirmation followed by normal delegation.

`acceptance_required` has no remaining role in this boundary: absence of a receipt is no longer a state. Any unrelated use discovered by repository-wide search must be explicitly justified in the implementation review or removed; it must not be retained by habit.

## 5. Failure and session semantics

Malformed Handoffs, invalid Skills, unavailable or malformed Roles, unreadable references, invalid admission shapes, tuple mismatch, forbidden model fields, and canonicalization failures retain precise structural/reference errors. Current-call authority or Plan drift fails closed. No failure mutates authorization state because no such state exists.

Reload, new session, resume, fork, shutdown, and session-generation changes do not clear or restore Harness authorization; there is nothing to clear or restore. No replacement marker, flag, audit event, confirmation token, persistence, or Host seam may be introduced.

## Evidence ownership and lifecycle reconciliation

The implementation repairs comprise three distinct findings with separate ownership:

- First P2: Resolver root/Handoff/context runtime shape closure and recursive capability-field rejection belong to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.
- Second P2: nested atomic/planned/authority TypeBox closure belongs to `extensions/pi-harness.ts`, with regression coverage in `tests/extension.test.ts`.
- Final P2: non-string Role model/thinking fail-closed validation belongs to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.

Fresh final technical evidence is complete: admission/protocol `50 pass, 0 fail, 102 assertions`; protocol-only `45 pass, 0 fail, 86 assertions`; Extension schema `1 pass, 0 fail, 41 assertions`; and full package `105 pass, 0 fail, 436 assertions across seven files`. TypeScript `5.9.3` typecheck passed, protocol import passed, and source-level `activateHarness` registration smoke passed.

The four malformed Role cases (null/numeric model and null/numeric thinking) returned `unavailable_model` or `invalid_thinking`, did not throw, and produced zero subject observations. Stateless evidence retained: seven closed TypeBox shapes; Work and Plan drift each returned `authority_drift` after exactly two observations; recursive capability-shaped keys were rejected while prose was accepted; removed-state inventory returned zero results; both obsolete admission-decision files were absent.

This reconciliation changes evidence and lifecycle status only, not the normative Resolver contract. The exact twelve-path boundary and unchanged six candidate source/test identities are recorded in [Work Context](../works/authority-first-router-admission/context.md). Full technical validation is complete. Fresh final independent correctness/security/evidence review is complete with P0/P1/P2/P3 all none; exact source/test and document identities matched, and no repair was required. Completion-status reconciliation is complete. GO for one isolated twelve-path commit; the commit remains pending and separately authorized. No reload, deployment, live Router/Handler launch, runtime activation, staging, or commit was performed.

## 6. Acceptance criteria and non-goals

The implementation candidate is acceptable only if focused and full tests show: no removed channel, type, registry, receipt, or receipt-based response path; planned resolution performs only legality/authority/current-call validation; missing receipt is not an acceptance condition; authority drift remains precise and fail-closed; no interaction occurs in Resolver execution; and atomic behavior, Handoff normalization, tuple validation, model/Skill/Role validation, Handler Result parsing, and unrelated protocol behavior remain intact.

Non-goals: Pi-core changes, Host seams, persistence, authentication, confirmation UI, natural-language classification, per-Handoff confirmation, task lifecycle changes, backend changes, reload, staging, and commit.

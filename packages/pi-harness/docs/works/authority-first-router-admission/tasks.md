# Tasks: Authority-First Router Admission

- Plan: [Implementation Plan](plan.md)
- Authority: [ADR-0007](../../adr/0007-authority-first-router-admission.md), [Router Delegation Specification](../../spec/router-delegation.md) Amendment A.1-A.8 (draft)
- Status: draft derived task list, not accepted or normative; implementation is blocked until T1 decisions are settled and the exact Work/Plan/Tasks set receives fresh review and explicit current-session acceptance

## T1. Settle Runtime Contract Decisions

- Depends on: none
- Owner boundary: authority/API decision
- Outcome: record the supported Pi confirmation primitive, main-session identity/lifetime, trusted fresh-review evidence shape, admission inspection-command decision, and digest normalization rule in the owning authority or an authorized bounded amendment.
- Context: [Work Context](context.md) open decisions; ADR-0007; Spec Amendment A.3-A.4 and A.8.
- Constraints: do not invent a user-facing workflow or persist acceptance across sessions; do not add CI, fixed stages, child permission gating, or #3 companion behavior.
- Expected surfaces: authority/docs and, only if required, this Plan/Tasks references.
- Verification: independent decision review confirms each choice is supported by available Pi APIs and does not contradict ADR-0007.

## T2. Implement Pure Admission Types, Canonicalization, and Validator

- Depends on: T1
- Owner boundary: `src` protocol/admission logic
- Outcome: typed atomic/planned admission input, exact Work/Plan/Tasks identity and digest canonicalization, acceptance record, amendment classification, and stable block-code validation.
- Context: Spec Amendment A.1-A.4 and A.6; ADR-0007 exact identity rule.
- Constraints: preserve ordinary Handoff validation; use deterministic UTF-8/LF canonicalization as settled; do not inline authority documents into Handler YAML; planned set is exactly one Work, one Plan, one Tasks.
- Expected surfaces: Resolver protocol and focused admission module/tests only.
- Verification: deterministic assertions cover set ordering, CRLF/LF handling, mismatched digests, malformed atomic evidence, missing planned materials, review/acceptance/session mismatch, and material vs bounded amendment classification.

## T3. Add Extension-Owned Session Acceptance Recorder and Validator

- Depends on T1, T2
- Owner boundary: `extensions/pi-harness.ts` and adjacent session-state module if needed
- Outcome: current-main-session in-memory recorder accepts only Extension-captured explicit confirmation tied to the exact reviewed set and rejects stale or forged state.
- Context: Spec Amendment A.3-A.4; current Extension boundary; ADR-0001 Router ownership.
- Constraints: no project Markdown acceptance, no Handler Result acceptance, no cross-session persistence, no fixed stage machine.
- Expected surfaces: Extension/session state and focused Extension tests.
- Verification: record/read/reset lifecycle, session binding, exact digest binding, negative generic pacing/Handler Result cases, and authority drift invalidation.

## T4. Render Exact Planned Materials and Capture Explicit Confirmation

- Depends on: T1, T2, T3
- Owner boundary: Router renderer/user interaction in Extension
- Outcome: planned admission presents exact Work/Plan/Tasks canonical paths and digests before recording acceptance, using the settled supported Pi confirmation primitive.
- Context: Spec Amendment A.3; ADR-0007 acceptance rule.
- Constraints: do not treat a free-text `start`, `continue`, or `next` as confirmation; do not allow Router-only assertion without rendered evidence; keep the interaction bounded to current session.
- Expected surfaces: Extension renderer/confirmation path and UI tests.
- Verification: interaction order (render then confirm then record), explicit accept/reject, exact digest display, and no record on ambiguous/free-text input.

## T5. Integrate Admission with `resolve_delegation`

- Depends on: T2, T3, T4
- Owner boundary: Resolver tool registration/execution and existing protocol integration
- Outcome: resolver blocks invalid/stale/unaccepted planned admission before producing invocation metadata, resolves valid atomic/planned inputs, and leaves backend adaptation unchanged after success.
- Context: Spec Amendment A.2 and A.5; existing `src/protocol.ts` and Extension resolver registration.
- Constraints: retain `status: resolved | blocked`; blocked results contain only coded actionable errors; do not add Handler identity or backend-specific fields; do not mix #3 atomic companion rule.
- Expected surfaces: protocol input/schema, Extension tool binding, protocol/Extension tests.
- Verification: each admission code path; existing Skill/Role/reference regressions; successful prompt excludes admission unless authority later changes it; backend mapping receives only successful resolved invocation.

## T6. Verify Drift, Bounded Amendment, and Full Flow

- Depends on: T5
- Owner boundary: integration verification and authority reconciliation
- Outcome: runnable checks demonstrate no-plan atomic flow, planned acceptance flow, and authority drift invalidation/amendment flow.
- Context: ASCII flows below; Plan verification strategy; Spec Amendment A.6.
- Constraints: no source scope beyond admission; no backend lifecycle changes; preserve unrelated worktree changes.
- Expected surfaces: focused test additions and evidence report.
- Verification: smallest package typecheck/test command plus targeted integration assertions; fresh review checks exact diff against accepted Work/Plan/Tasks digests.

## Dependency Graph

```text
T1 contract decisions
  |
  v
T2 pure model/validator
  | \
  |  +--> T3 session recorder
  |            |
  +----------> T4 render/confirm
                 |
T2 ------------> T5 resolver integration
T3 ------------> T5
T4 ------------> T5
                 |
                 v
                T6 full-flow verification
```

## ASCII Flow: No-Plan Atomic Path

```text
Router classifies bounded atomic change
  -> supplies basis + focused verification
  -> Resolver validates atomic shape and soft classification evidence
     -> invalid basis: blocked invalid_atomic_basis / invalid_admission
     -> valid: resolved prompt/model/thinking
  -> Router adapts compatible backend
  -> Handler executes focused change and verification
```

## ASCII Flow: Planned Acceptance Path

```text
Router classifies planned change
  -> selects exact Work + Plan + Tasks
  -> canonicalizes documents and computes per-file/set digests
  -> obtains fresh independent review for exact set
  -> renders exact paths + digests to user
     -> no explicit confirmation: blocked acceptance_required
     -> confirmed: Extension records current-session acceptance
  -> Resolver rechecks bytes, review, session, acceptance, and Handoff
     -> mismatch/stale: blocked with stable admission code
     -> valid: resolved prompt/model/thinking
  -> Router adapts compatible backend
```

## ASCII Flow: Authority Drift Invalidation

```text
accepted exact set + current session
  -> authority file changes or set digest changes
  -> Resolver/Extension compares current canonical digests
     -> no bounded authorization: invalidate acceptance
        -> blocked authority_drift
        -> fresh independent review + explicit confirmation required
     -> bounded authorized amendment within accepted boundary:
        record fromDigest -> toDigest
        -> resolve if all other checks pass
     -> material scope/architecture/dependency/risk/behavior/criteria change:
        invalidate amendment
        -> blocked amendment_invalidated
        -> fresh review + explicit confirmation required
```

## Parallel-Safe Groups

- After T1, T2 is independent from UI work.
- After T2, T3 can proceed independently of T4's rendering details only if T4 consumes the settled recorder API; T3 and T4 must not concurrently edit the same Extension function without coordination.
- T5 and T6 are serial because T6 verifies the integrated contract.

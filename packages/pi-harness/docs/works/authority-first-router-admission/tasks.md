# Remove Harness Plan Authorization State Tasks

- Status: draft; unaccepted; unimplemented
- Plan: [Remove Harness Plan Authorization State Plan](plan.md)
- Work: [Authority-First Router Admission Work](work.md)
- Context: [Work Context](context.md)

These Tasks are draft decomposition only. They do not authorize implementation, issue a receipt, or replace ordinary user acceptance of the exact future Plan.

## T1 — Establish the deletion inventory

- Depends on: none; documentation draft and clean worktree ownership review.
- Outcome: every reference and consumer of the activation channel, activation decision/context/outcome/disclosure APIs, registry/receipt types, replay/session authorization state, receipt-specific codes, and `admitPlanned` coupling is mapped; unrelated dirty work is excluded.
- Surfaces: repository/package search and the six documented candidate files.
- Verification: inventory records direct consumers, no-consumer conclusions, migration impact, and any blocker. Unknown or external consumer stops T1.

## T2 — Retain only current-call authority primitives

- Depends on: accepted exact Plan and T1.
- Outcome: `src/admission.ts` contains no Plan authorization registry/receipt/replay/session state, while canonical path/document bytes, tuple grammar, normalized Handoff identity, and authority/Plan drift inputs required by the Specification remain correct.
- Verification: focused canonicalization, tuple, identity, and drift tests; typecheck; dead-name search.

## T3 — Remove Extension activation and receipt gate

- Depends on: T1 and T2.
- Outcome: `extensions/pi-harness.ts` no longer registers or consumes `pi-harness:plan-activation-v1`, binds/resets authorization state, issues/looks up receipts, or blocks because a receipt is absent; planned resolution stays non-interactive and performs preserved legality/current-call checks.
- Verification: Extension import; resolver tests prove no interaction and precise authority-drift failure; no activation event or receipt side effect exists.

## T4 — Remove obsolete protocol/module surfaces

- Depends on: T1–T3.
- Outcome: `src/admission-decision.ts` and its obsolete tests are deleted unless T1 proves a retained helper; `src/protocol.ts` no longer exposes receipt/authorization-only callback or codes; direct imports compile.
- Verification: package-wide reference search, typecheck, and focused protocol tests.

## T5 — Reconcile regression coverage and complete review

- Depends on: T2–T4.
- Outcome: focused tests cover atomic and planned ordinary validation, Handoff/reference precedence, exact tuple binding, model/Skill/Role checks, current-call drift, no-interaction behavior, and preserved Handler Result/protocol behavior; obsolete state-machine assertions are gone.
- Verification: focused tests, `bun run --cwd packages/pi-harness test`, scoped diff, Extension import, dead API/reference search, and independent read-only correctness/evidence review.

## Dependency and stop boundary

T1 → T2 → T3 → T4 → T5. Do not parallelize T2–T4 because they overlap `admission.ts`, `extensions/pi-harness.ts`, `src/protocol.ts`, and focused tests. Stop on authority drift, scope expansion, unknown consumer, required Pi/Host seam, persistence proposal, weakened current-call validation, receipt/activation residue, or any test failure not explained by the accepted removal. Documentation identities and this task list are not implementation authorization.

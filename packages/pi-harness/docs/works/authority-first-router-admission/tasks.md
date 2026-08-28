# Remove Harness Plan Authorization State Tasks

- Status: draft; unaccepted; unimplemented
- Plan: [Remove Harness Plan Authorization State Plan](plan.md)
- Work: [Authority-First Router Admission Work](work.md)
- Context: [Work Context](context.md)

These Tasks are draft decomposition only. They do not authorize implementation, issue a receipt, or replace ordinary user acceptance of the exact future Plan.

## T1 — Establish the reproducible deletion and ownership inventory

- Depends on: none; this is draft documentation decomposition only and must complete before any implementation task.
- Outcome: a mechanical inventory proves the deletion candidate or stops. It covers every tracked match under both `packages/pi-harness/` and repository root `.`; all seven protected paths; the `c6a22d0d` ownership baseline; each reconciliation commit `d8c38e25`, `ee6a5eb3`, `9ff7269d`, `0ba5b60c`, and `86e0d1c2`; and the current worktree.
- Required queries: record the exact fixed-string/regex query and method for (1) `pi-harness:plan-activation-v1` plus activation channel/transport registration and dispatch; (2) activation decision/context/outcome/disclosure identifiers and discovered variants; (3) `PlanAuthorizationRegistry` and `PlanAuthorizationReceipt`; (4) authorization/receipt state paired with replay, session, generation, reset, and storage; (5) receipt issuance/integrity/reset surfaces and every receipt/authorization-only block code, explicitly including `receipt_corrupt` and `acceptance_required`; (6) `ResolveOptions`, `admitPlanned`, and Extension callbacks/listeners/registrations that carry planned admission; and (7) `admission-decision` files, paths, definitions, imports, exports/re-exports, dynamic imports, and tests.
- Search method and result record: use `git grep -n -E` or an equivalent indexed search for each query/root pair; verify the stated commits resolve; use `git diff --no-ext-diff` for the sequential history reconciliation and a separate current-worktree diff. For every pair, record root, method/query class, exact query, every match's path and enclosing symbol or line range, literal `zero results` when none, classification (`internal definition`, `import`, `test`, `direct consumer`, or `external consumer`), and disposition (`remove`, `retain for current-call final-JIT legality`, `out of scope`, or `stop`). A result in one root never supplies a zero-result record for another.
- Ownership mapping: for each of `extensions/pi-harness.ts`, `src/admission.ts`, `src/admission-decision.ts`, `src/protocol.ts`, `tests/admission.test.ts`, `tests/admission-decision.test.ts`, and `tests/protocol.test.ts` under `packages/pi-harness/`, map every changed hunk/line range to its `c6a22d0d` baseline state, each named later-commit transition in order, current-worktree state, owner/classification, and isolated disposition. Do not select a candidate hunk until this mapping is complete.
- Verification and stop gate: verify all roots/query classes have result records, all seven paths have per-file/per-hunk mappings, and the final candidate contains only isolated deletion-owned hunks. Stop and return for authority/Plan revision on an unmapped direct or external consumer, unknown hunk, non-resolving/non-reconcilable baseline history, mixed ownership that cannot be isolated, or candidate drift. Never add a compatibility shim automatically. T1 does not alter the final-JIT sequence, exclusions, or implementation authorization.

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

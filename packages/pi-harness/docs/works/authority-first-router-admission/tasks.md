# Remove Harness Plan Authorization State Tasks

- Status: accepted; T1-T4 implementation repairs and narrow Role validation, full technical validation, T5 fresh final independent correctness/security/evidence review, and completion-status reconciliation complete; isolated commit pending
- Plan: [Remove Harness Plan Authorization State Plan](plan.md)
- Work: [Authority-First Router Admission Work](work.md)
- Context: [Work Context](context.md)

These Tasks are the accepted decomposition for the bounded implementation. Current-user authorization provenance and final technical evidence are recorded in [Context](context.md); the Tasks do not issue receipts or authorize reload, deployment, live Router/Handler launch, runtime activation, staging, or commit.

## T1 - Establish the reproducible deletion and ownership inventory (complete)

- Depends on: none; this accepted ownership gate completed before every implementation task.
- Outcome: a mechanical inventory proves the deletion candidate or stops. It covers every tracked match under both `packages/pi-harness/` and repository root `.`; all seven protected paths; the `c6a22d0d` ownership baseline; each reconciliation commit `d8c38e25`, `ee6a5eb3`, `9ff7269d`, `0ba5b60c`, and `86e0d1c2`; and the current worktree.
- Required queries: record the exact fixed-string/regex query and method for (1) `pi-harness:plan-activation-v1` plus activation channel/transport registration and dispatch; (2) activation decision/context/outcome/disclosure identifiers and discovered variants; (3) `PlanAuthorizationRegistry` and `PlanAuthorizationReceipt`; (4) authorization/receipt state paired with replay, session, generation, reset, and storage; (5) receipt issuance/integrity/reset surfaces and every receipt/authorization-only block code, explicitly including `receipt_corrupt` and `acceptance_required`; (6) `ResolveOptions`, `admitPlanned`, and Extension callbacks/listeners/registrations that carry planned admission; and (7) `admission-decision` files, paths, definitions, imports, exports/re-exports, dynamic imports, and tests.
- Search method and result record: use `git grep -n -E` or an equivalent indexed search for each query/root pair; verify the stated commits resolve; use `git diff --no-ext-diff` for the sequential history reconciliation and a separate current-worktree diff. For every pair, record root, method/query class, exact query, every match's path and enclosing symbol or line range, literal `zero results` when none, classification (`internal definition`, `import`, `test`, `direct consumer`, or `external consumer`), and disposition (`remove`, `retain for current-call final-JIT legality`, `out of scope`, or `stop`). A result in one root never supplies a zero-result record for another.
- Ownership mapping: for each of `extensions/pi-harness.ts`, `src/admission.ts`, `src/admission-decision.ts`, `src/protocol.ts`, `tests/admission.test.ts`, `tests/admission-decision.test.ts`, and `tests/protocol.test.ts` under `packages/pi-harness/`, map every changed hunk/line range to its `c6a22d0d` baseline state, each named later-commit transition in order, current-worktree state, owner/classification, and isolated disposition. Do not select a candidate hunk until this mapping is complete.
- Verification and stop gate: verify all roots/query classes have result records, all seven paths have per-file/per-hunk mappings, and the final candidate contains only isolated deletion-owned hunks. Stop and return for authority/Plan revision on an unmapped direct or external consumer, unknown hunk, non-resolving/non-reconcilable baseline history, mixed ownership that cannot be isolated, or candidate drift. Never add a compatibility shim automatically. T1 does not alter the final-JIT sequence, exclusions, or implementation authorization.

## T2 - Retain only current-call authority primitives (complete)

- Depends on: accepted exact Plan and T1.
- Outcome: `src/admission.ts` contains no Plan authorization registry/receipt/replay/session state, while canonical path/document bytes, tuple grammar, normalized Handoff identity, and authority/Plan drift inputs required by the Specification remain correct.
- Verification: focused canonicalization, tuple, identity, and drift tests; typecheck; dead-name search.

## T3 - Remove Extension activation and receipt gate (complete)

- Depends on: T1 and T2.
- Outcome: `extensions/pi-harness.ts` no longer registers or consumes `pi-harness:plan-activation-v1`, binds/resets authorization state, issues/looks up receipts, or blocks because a receipt is absent; planned resolution stays non-interactive and performs preserved legality/current-call checks.
- Verification: Extension import; resolver tests prove no interaction and precise authority-drift failure; no activation event or receipt side effect exists.

## T4 - Remove obsolete protocol/module surfaces and validate the candidate (complete)

- Depends on: T1-T3.
- Outcome: `src/admission-decision.ts` and its obsolete tests are absent; `src/protocol.ts` no longer exposes receipt/authorization-only callbacks or codes; the exact six-path candidate contains the three attributed repairs and narrow Role validation is complete.
- Verification: package-wide reference search, focused admission/protocol `50 pass / 0 fail / 102 assertions`, protocol-only `45 pass / 0 fail / 86 assertions`, Extension schema `1 pass / 0 fail / 41 assertions`, and full `105 pass / 0 fail / 436 assertions across seven files`; TypeScript `5.9.3` typecheck, protocol import, and source-level `activateHarness` registration smoke passed.
## T5 - Complete final independent correctness/security review (complete)

- Depends on: completed T2-T4.
- Outcome: independently reviewed the current candidate for correctness, security, regressions, and evidence sufficiency after full technical validation; the review found P0/P1/P2/P3 all none, exact source/test and document identities matched, and no repair was required; completion evidence was reconciled without staging or committing.
- Verification: fresh read-only correctness/security/evidence review, scoped diff and identity check, dead API/reference search, and confirmation that the evidence is reproducible. Full technical validation is complete.
## T4 gate result

The implementation repairs, narrow Role validation, full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation are complete. The final review found P0/P1/P2/P3 all none; no repair was required. GO for one isolated twelve-path commit; this does not authorize reload, deployment, live Router/Handler launch, runtime activation, staging, or commit.

## Evidence ownership and lifecycle reconciliation

The three findings have separate ownership:

- First P2: Resolver root/Handoff/context runtime shape closure and recursive capability-field rejection belong to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.
- Second P2: nested atomic/planned/authority TypeBox closure belongs to `extensions/pi-harness.ts`, with regression coverage in `tests/extension.test.ts`.
- Final P2: non-string Role model/thinking fail-closed validation belongs to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.

Fresh final technical evidence is complete: admission/protocol `50 pass, 0 fail, 102 assertions`; protocol-only `45 pass, 0 fail, 86 assertions`; Extension schema `1 pass, 0 fail, 41 assertions`; and full package `105 pass, 0 fail, 436 assertions across seven files`. TypeScript `5.9.3` typecheck passed, protocol import passed, and source-level `activateHarness` registration smoke passed.

The four malformed Role cases (null/numeric model and null/numeric thinking) returned `unavailable_model` or `invalid_thinking`, did not throw, and produced zero subject observations. Stateless evidence retained: seven closed TypeBox shapes; Work and Plan drift each returned `authority_drift` after exactly two observations; recursive capability-shaped keys were rejected while prose was accepted; removed-state inventory returned zero results; both obsolete admission-decision files were absent.

The exact twelve-path boundary and unchanged six candidate source/test identities are recorded in [Context](context.md). Full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation are complete. The final review found P0/P1/P2/P3 all none; exact source/test and document identities matched, and no repair was required. GO for one isolated twelve-path commit; isolated commit remains pending and requires separate authorization. Staging, commit, reload, deployment, live Router/Handler launch, and runtime activation were not performed.

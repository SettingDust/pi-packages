# Remove Harness Plan Authorization State Plan

- Status: accepted; T1-T4 implementation repairs and narrow Role validation plus full technical validation and T5 fresh final independent correctness/security/evidence review complete; completion-status reconciliation complete; isolated commit pending
- Work: [Authority-First Router Admission Work](work.md)
- Context: [Work Context](context.md)
- Authority: [ADR-0007](../../adr/0007-authority-first-router-admission.md), [Router Delegation Specification](../../spec/router-delegation.md)

## Objective and scope

Remove the entire `@settingdust/pi-harness` Plan activation/authorization state machine while preserving ordinary Handoff, authority-tuple, model/Skill/Role, canonicalization, and current-call drift validation. The Router/coordinator owns Plan completion, ordinary-message disclosure, one user confirmation, and delegation invocation. Harness performs no confirmation-history enforcement.

Candidate source/test scope, frozen by the six current identities: implementation repairs, narrow Role validation, full technical validation, and fresh final independent correctness/security/evidence review are complete; completion-status reconciliation is complete and isolated commit remains pending:

1. `extensions/pi-harness.ts` — remove registry/channel/event listener, activation helpers, session authorization binding/reset, receipt-gated callback, and receipt-specific resolver behavior; keep dynamic Router/resolver registration, closed resolver schemas, and ordinary validation.
2. `src/admission.ts` — remove authorization subject/receipt/registry/replay/integrity/session-generation state and retain only canonical path/document/JSON and planned tuple/Handoff identity primitives required for current-call validation.
3. `src/protocol.ts` — remove `admitPlanned` coupling and receipt/authorization block codes if no remaining caller requires them; make planned resolution perform the preserved current-call checks directly, reject unsupported capability-shaped fields, and fail closed for non-string Role model/thinking values.
4. `tests/admission.test.ts` — focused tests for retained canonical identity, tuple, serialization, and current-call drift primitives.
5. `tests/protocol.test.ts` — planned-resolution expectations, preserved unrelated protocol coverage, recursive capability-field rejection, and non-string Role model/thinking regressions.
6. `tests/extension.test.ts` — focused recursive assertion that all seven Resolver object shapes are closed, including the nested atomic/planned/authority TypeBox shapes.

The obsolete `src/admission-decision.ts` and `tests/admission-decision.test.ts` paths were deleted and remain absent. No Pi core, Host, backend, settings, session persistence, Herdr, runtime activation, reload, stage, or commit surface is in scope.

## Strategy and dependency order

### P0 - Reconstruct the candidate and freeze evidence (complete)

Before any source or test change, the accepted implementation established the reproducible deletion and ownership inventory. T1 completed this ownership gate before T2/T3 mutation; T4 revalidated the exact T3 candidate identities before documentation changes.

**Fixed inventory roots and methods.** Use all of the following roots for every search class: (1) the tracked package root, `packages/pi-harness/`; (2) the current tracked repository root, `.`; (3) the seven protected paths named below; and (4) the baseline and reconciliation history. Use `git grep -n -E` (or an equivalent repository-indexed regex search that records its exact query) for tracked content, `git diff --no-ext-diff` for the stated revisions, and a separately recorded current-worktree diff. For the history root, first verify that `c6a22d0d`, `d8c38e25`, `ee6a5eb3`, `9ff7269d`, `0ba5b60c`, and `86e0d1c2` resolve; then reconcile, in that order, each protected-file hunk from the `c6a22d0d` ownership baseline through those commits and the current worktree. A missing, non-ancestral, or otherwise unreconcilable revision is a stop condition.

**Required deletion query classes.** Record the exact fixed-string or regex query used for each of these classes:

1. `pi-harness:plan-activation-v1` and activation event/channel registration, dispatch, and transport terms.
2. Activation decision, context, outcome, and disclosure surfaces, including `PlanActivationDecision`, `PlanActivationContext`, `PlanActivationOutcome`, `PlanActivationDisclosure`, and their actual discovered identifier variants.
3. `PlanAuthorizationRegistry` and `PlanAuthorizationReceipt` definitions, uses, constructors, imports, exports, and type-only consumers.
4. Replay, session, and generation authorization state: authorization/receipt queries paired with `replay`, `session`, `generation`, `reset`, or state-storage terms, so unrelated generic occurrences are not misclassified.
5. Receipt issuance, integrity, reset, and block-code surfaces, including receipt issue/create/write, integrity/corruption validation, reset/clear/delete, `receipt_corrupt`, `acceptance_required`, and every discovered receipt/authorization-only `BlockCode` member.
6. `ResolveOptions`, `admitPlanned`, and all Extension callback/listener/registration surfaces that pass, consume, or derive planned-admission behavior, including resolver registration and activation-related callbacks.
7. `admission-decision` filenames and paths plus all definition, import, re-export, dynamic-import, and test references to that module.

**Mechanical record.** For every root/query-class pair, record: the root; command/query class and exact query; each match's path and enclosing symbol (or line range when no symbol exists); a literal `zero results` entry when there is none; classification as `internal definition`, `import`, `test`, `direct consumer`, or `external consumer`; and disposition (`remove`, `retain for current-call final-JIT legality`, `out of scope`, or `stop`). Do not infer a zero-result conclusion from a different root or broader/narrower term.

**Protected ownership baseline.** The inventory must map every file and every changed hunk/line range in `packages/pi-harness/extensions/pi-harness.ts`, `packages/pi-harness/src/admission.ts`, `packages/pi-harness/src/admission-decision.ts`, `packages/pi-harness/src/protocol.ts`, `packages/pi-harness/tests/admission.test.ts`, `packages/pi-harness/tests/admission-decision.test.ts`, and `packages/pi-harness/tests/protocol.test.ts`. Each mapping row names its baseline state at `c6a22d0d`, each transition through `d8c38e25`, `ee6a5eb3`, `9ff7269d`, `0ba5b60c`, and `86e0d1c2`, its current-worktree state, owner/classification, and the isolated removal disposition. Candidate scope may be frozen only after every selected hunk has such a mapping.

Fail closed: stop and return for authority/Plan revision on any unmapped direct or external consumer, unknown hunk, mixed ownership that cannot be isolated, candidate drift, or required compatibility behavior. Never add a compatibility shim automatically. This inventory only establishes deletion legality; it neither changes the preserved final-JIT sequence nor relaxes any exclusion below.

### P1 - Simplify retained authority primitives (complete in T2)

Define the smallest retained `admission.ts` surface for canonical paths, canonical document bytes, tuple validation, and normalized planned-subject/current-call identity. Remove authorization-specific names and fields only where their values are not needed for drift detection. Keep digest derivation as integrity/current-call evidence, never as acceptance evidence.

### P2 - Remove the Extension activation boundary (complete in T3)

Delete activation EventBus registration and all registry/session authorization wiring. Update the resolver callback so planned admission returns only after preserved structural and current-call/JIT checks. Ensure Resolver execution remains non-interactive and no receipt-missing branch remains.

### P3 - Remove protocol and focused state-machine surfaces (complete in T3)

Delete `src/admission-decision.ts` and its tests if P0 confirms no retained consumer. Remove obsolete `BlockCode` members and `admitPlanned` plumbing. Rewrite focused tests around success, drift, malformed input, reference precedence, tuple binding, and no-interaction semantics. Preserve protocol tests unrelated to authorization.

### P4 - Verify and review (complete)

Final isolated repair/revalidation of the earlier schema findings and narrow Role validation passed focused and full checks, package typecheck, protocol import, and source-level `activateHarness` registration smoke. Fresh T5 independent correctness/security/evidence review is complete with P0/P1/P2/P3 all none; exact source/test and document identities matched, and no repair was required. Completion-status reconciliation is complete; isolated commit is separately authorized and pending.

## Verification gates

- No source/test change occurred before explicit current-user acceptance of the exact Plan.
- After authorization, each task has a focused check for its material behavior.
- Package typecheck passes in the isolated supported dependency environment.
- Full `@settingdust/pi-harness` tests pass without filters in the isolated supported dependency environment.
- Protocol import and source-level `activateHarness` registration smoke pass in the supported package environment.
- Search finds no old channel, activation transport, registry/receipt API, replay/session authorization state, receipt-specific acceptance gate, or stale test fixture.
- Scoped diff contains no unrelated hunks; fresh independent review confirmed current-call authority drift and preserved protocol invariants.

## Compatibility, rollback, and stop conditions

Removal is preferred over a compatibility shim. Migration impact is limited to direct activation callers and tests evidenced in this package; any newly found consumer blocks deletion until authority is amended. Rollback means restore the pre-change source/test revision, not reintroduce a partial duplicate state machine.

Stop before or during implementation if a fifth unrelated source surface is needed, a Pi/Host seam or persistence is proposed, planned resolution still requires a receipt, current-call drift cannot be checked without user-acceptance state, tests expose a side effect on rejected input, authority identities drift, or repository search finds an unowned consumer. Return to documentation review for any substantive boundary change.

## Explicit non-goals

No replacement confirmation token, marker, flag, audit event, receipt, persistence, authentication, UI ceremony, natural-language classifier, per-Handoff confirmation, task binding, Pi-core modification, reload, staging, or commit.

## T4 gate result

The implementation repairs, narrow Role validation, full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation are complete. The final review found P0/P1/P2/P3 all none; no repair was required. GO for one isolated twelve-path commit; this Plan does not authorize reload, deployment, live Router/Handler launch, runtime activation, staging, or commit.

## Evidence ownership and lifecycle reconciliation

The three findings have separate ownership:

- First P2: Resolver root/Handoff/context runtime shape closure and recursive capability-field rejection belong to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.
- Second P2: nested atomic/planned/authority TypeBox closure belongs to `extensions/pi-harness.ts`, with regression coverage in `tests/extension.test.ts`.
- Final P2: non-string Role model/thinking fail-closed validation belongs to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.

Fresh final technical evidence is complete: admission/protocol `50 pass, 0 fail, 102 assertions`; protocol-only `45 pass, 0 fail, 86 assertions`; Extension schema `1 pass, 0 fail, 41 assertions`; and full package `105 pass, 0 fail, 436 assertions across seven files`. TypeScript `5.9.3` typecheck passed, protocol import passed, and source-level `activateHarness` registration smoke passed.

The four malformed Role cases (null/numeric model and null/numeric thinking) returned `unavailable_model` or `invalid_thinking`, did not throw, and produced zero subject observations. Stateless evidence retained: seven closed TypeBox shapes; Work and Plan drift each returned `authority_drift` after exactly two observations; recursive capability-shaped keys were rejected while prose was accepted; removed-state inventory returned zero results; both obsolete admission-decision files were absent.

The exact twelve-path boundary and unchanged six candidate source/test identities are recorded in [Context](context.md). Full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation are complete. The final review found P0/P1/P2/P3 all none; exact source/test and document identities matched, and no repair was required. GO for one isolated twelve-path commit; isolated commit remains pending and requires separate authorization. No reload, deployment, live Router/Handler launch, runtime activation, staging, or commit was performed.

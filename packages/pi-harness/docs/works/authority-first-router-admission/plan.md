# Remove Harness Plan Authorization State Plan

- Status: draft; unaccepted; unimplemented; implementation not authorized
- Work: [Authority-First Router Admission Work](work.md)
- Context: [Work Context](context.md)
- Authority: [ADR-0007](../../adr/0007-authority-first-router-admission.md), [Router Delegation Specification](../../spec/router-delegation.md)

## Objective and scope

Remove the entire `pi-harness` Plan activation/authorization state machine while preserving ordinary Handoff, authority-tuple, model/Skill/Role, canonicalization, and current-call drift validation. The Router/coordinator owns Plan completion, ordinary-message disclosure, one user confirmation, and delegation invocation. Harness performs no confirmation-history enforcement.

Candidate source/test scope, to be confirmed by fresh search and review:

1. `extensions/pi-harness.ts` — remove registry/channel/event listener, activation helpers, session authorization binding/reset, receipt-gated callback, and receipt-specific resolver behavior; keep dynamic Router/resolver registration and ordinary validation.
2. `src/admission.ts` — remove authorization subject/receipt/registry/replay/integrity/session-generation state and retain only canonical path/document/JSON and planned tuple/Handoff identity primitives required for current-call validation.
3. `src/admission-decision.ts` — delete; no activation, decision, outcome, or Harness disclosure API remains. Stop if an independently necessary non-authorization helper is discovered.
4. `src/protocol.ts` — remove `admitPlanned` coupling and receipt/authorization block codes if no remaining caller requires them; make planned resolution perform the preserved current-call checks directly.
5. `tests/admission-decision.test.ts` — delete with the removed module, or replace only with tests for a proven retained helper.
6. `tests/admission.test.ts` — replace registry/receipt tests with focused tests for retained canonical identity, tuple, serialization, and current-call drift primitives.
7. `tests/protocol.test.ts` — adjust planned-resolution expectations and preserve all unrelated protocol coverage.

No Pi core, Host, backend, settings, session persistence, Herdr, runtime activation, reload, stage, or commit surface is in scope.

## Strategy and dependency order

### P0 — Reconstruct the candidate and freeze evidence

Before any source or test change, create a reproducible deletion and ownership inventory. This draft does not authorize implementation.

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

### P1 — Simplify retained authority primitives

Define the smallest retained `admission.ts` surface for canonical paths, canonical document bytes, tuple validation, and normalized planned-subject/current-call identity. Remove authorization-specific names and fields only where their values are not needed for drift detection. Keep digest derivation as integrity/current-call evidence, never as acceptance evidence.

### P2 — Remove the Extension activation boundary

Delete activation EventBus registration and all registry/session authorization wiring. Update the resolver callback so planned admission returns only after preserved structural and current-call/JIT checks. Ensure Resolver execution remains non-interactive and no receipt-missing branch remains.

### P3 — Remove protocol and focused state-machine surfaces

Delete `src/admission-decision.ts` and its tests if P0 confirms no retained consumer. Remove obsolete `BlockCode` members and `admitPlanned` plumbing. Rewrite focused tests around success, drift, malformed input, reference precedence, tuple binding, and no-interaction semantics. Preserve protocol tests unrelated to authorization.

### P4 — Verify and review

Run the focused tests, package typecheck, full package tests, Extension import check, dead API/reference search, scoped diff review, and an independent read-only correctness/evidence review. Recompute identities after all document edits and report exact paths and hashes. This documentation draft itself is not an implementation gate.

## Verification gates

- No source/test changes occur before explicit acceptance of the exact future Plan.
- After authorization, each task has a focused check for its material behavior.
- `bun run --cwd packages/pi-harness typecheck` passes.
- `bun run --cwd packages/pi-harness test` passes without filters.
- Extension import succeeds in the supported package environment.
- Search finds no old channel, activation transport, registry/receipt API, replay/session authorization state, receipt-specific acceptance gate, or stale test fixture.
- Scoped diff contains no unrelated hunks; independent review confirms current-call authority drift and preserved protocol invariants.

## Compatibility, rollback, and stop conditions

Removal is preferred over a compatibility shim. Migration impact is limited to direct activation callers and tests evidenced in this package; any newly found consumer blocks deletion until authority is amended. Rollback means restore the pre-change source/test revision, not reintroduce a partial duplicate state machine.

Stop before or during implementation if a fifth unrelated source surface is needed, a Pi/Host seam or persistence is proposed, planned resolution still requires a receipt, current-call drift cannot be checked without user-acceptance state, tests expose a side effect on rejected input, authority identities drift, or repository search finds an unowned consumer. Return to documentation review for any substantive boundary change.

## Explicit non-goals

No replacement confirmation token, marker, flag, audit event, receipt, persistence, authentication, UI ceremony, natural-language classifier, per-Handoff confirmation, task binding, Pi-core modification, reload, staging, or commit.

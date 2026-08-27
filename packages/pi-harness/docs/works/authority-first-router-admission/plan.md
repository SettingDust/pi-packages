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

Confirm the six documents' identities and current worktree ownership, search all package and repository references to the old channel, module exports, registry, receipts, acceptance codes, callback, and helper names, and record any consumer not covered by current evidence. Stop on an external/unknown consumer or mixed unrelated ownership.

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

# Waves: Router Tasks-to-Waves Migration

- [Work](work.md) | [Plan](plan.md)

`waves.md` is the sole executable item graph for this Work. Each item has one observable completion predicate. Wave membership communicates readiness and conflict safety; it is not a global barrier. An item may run when its own dependencies and its containing Wave's predecessor gates are satisfied and its admission conditions are satisfied. Gates `W0`, `W1`, `W2`, and `W3` establish the migration outcome and required evidence defined in [Plan §5](plan.md#5-acceptance); their release does not itself establish overall migration acceptance or live conformance.

## Graph rules

- Every item has one Handler and one Result.
- Dependencies are item IDs, not informal ordering notes.
- A Wave ID also identifies its release gate. A gate is satisfied only after every listed item has an adoptable `completed` Result with the required focused verification evidence and the stated release predicate has been verified. `partial`, `failed`, `blocked`, missing Results, or insufficient evidence leave the item and gate unsatisfied. The Router projects each terminal Result truthfully before evaluating release and makes a fresh decision afterward; a gate releases only work that explicitly depends on it.
- A failed dependency or unsatisfied predecessor gate blocks only its dependents; unrelated ready branches remain eligible. Wave numbering and document order add no barrier.
- `write ownership` names the files/surfaces an item may change. Items with overlapping ownership are ordered unless the overlap is explicitly reconciled.
- Side effects are limited to the declared ownership. No item may edit authority, runtime, tests, or lockfiles outside its ownership.
- All implementation items must preserve confirmation, resolve-to-spawn order, full Result retrieval, truthful Todo projection, tool-contract limits, and no silent Tasks fallback.

## Wave 0: establish the migration contract

- **Wave ID:** W0.
- **Incremental outcome:** Settled planning/documentation vocabulary and protocol/admission contracts for the confirmed migration.
- **Items:** W0-DOC, W0-PROTO.
- **Predecessor Wave gates:** none.
- **Release predicate:** W0-DOC and W0-PROTO satisfy their completion predicates with completed Results and required evidence; verify that their focused checks establish consistent Work/Context/Plan/Waves vocabulary and registration, Waves-aware admission, explicit historical Tasks migration, confirmation, and resolve-before-spawn semantics.

### W0-DOC — Migrate planning/documentation Skill vocabulary and registration

- **Completion predicate:** The owning planning/documentation Skills and registration guidance consistently describe Work/Context/Plan/Waves for new plans, identify `waves.md` as the executable graph, and state that historical Tasks require explicit migration.
- **Authority and inputs:** Router Delegation Spec; ADR-0001; ADR-0007; current planning/documentation Skill files and registration surfaces.
- **Dependencies:** none.
- **Write ownership/conflicts:** planning/documentation Skill files and their registration/discovery documentation only; conflicts with other documentation edits require reconciliation before completion.
- **Side effects:** Changes model guidance and discovery behavior; does not rewrite historical Work entries.
- **Focused verification:** Search all owning Skill and registration references for stale new-plan `tasks.md` instructions; run the minimal Skill/documentation tests or checks covering registration and required frontmatter.
- **Result consumer:** W1-ROUTER consumes the settled vocabulary and registration contract; W2-TEST and W3-REVIEW consume its verification evidence.

### W0-PROTO — Define protocol/admission migration contract

- **Completion predicate:** The protocol/admission surface explicitly accepts `waves.md` for new planned invocations, rejects implicit interpretation of unfinished historical Tasks, and preserves confirmation and resolve-before-spawn admission semantics.
- **Authority and inputs:** Router Delegation Spec; ADR-0001; ADR-0007; current protocol/admission implementation and tests.
- **Dependencies:** none.
- **Write ownership/conflicts:** protocol/admission implementation and its focused tests only; may not modify planning Skills or Router schema.
- **Side effects:** Changes what graph representation can be admitted and how legacy plans are rejected or explicitly migrated.
- **Focused verification:** Exercise accepted Waves, unconfirmed work, unfinished legacy Tasks without migration, and exact resolve-before-spawn ordering; record failure-specific admission errors.
- **Result consumer:** W1-ROUTER consumes the admission contract; W2-TEST and W3-REVIEW consume focused behavior evidence.

## Wave 1: integrate Router behavior

- **Wave ID:** W1.
- **Incremental outcome:** Router instructions and schema integrate the settled vocabulary and admission contracts.
- **Items:** W1-ROUTER.
- **Predecessor Wave gates:** W0.
- **Release predicate:** W1-ROUTER satisfies its completion predicate with a completed Result and required evidence; verify the recorded static/schema and focused prompt/schema checks for confirmation, Waves selection, historical migration, dependency blocking, Result retrieval, and truthful Todo projection.

### W1-ROUTER — Extend Router instructions and schema

- **Completion predicate:** Router instructions/schema decompose only after confirmation, reference `waves.md` as the executable graph, require explicit historical Tasks migration, preserve one-Result and full-Result retrieval semantics, and project Todo state truthfully.
- **Authority and inputs:** W0-DOC Result; W0-PROTO Result; Router Delegation Spec; ADR-0001; ADR-0007; current Router prompt/schema files.
- **Dependencies:** W0-DOC, W0-PROTO.
- **Write ownership/conflicts:** Router instruction and schema files only; no edits to Skills, protocol implementation, authority documents, or tests.
- **Side effects:** Changes Router admission/decomposition guidance and schema validation.
- **Focused verification:** Static checks for required clauses and schema validity; focused prompt/schema tests for confirmation boundary, migration decision, dependency-specific blocking, Result retrieval, and truthful Todo projection.
- **Result consumer:** W2-TEST and W3-REVIEW consume the Router Result.

## Wave 2: focused regression evidence

- **Wave ID:** W2.
- **Incremental outcome:** Focused regression evidence covers the migrated graph and preserved admission invariants.
- **Items:** W2-TEST.
- **Predecessor Wave gates:** W1.
- **Release predicate:** W2-TEST satisfies its completion predicate with a completed Result and required evidence; verify that the relevant focused tests and any repository-required typecheck/lint pass, cover its stated invariants, and report unresolved bootstrap limitations without claiming live verification.

### W2-TEST — Add focused migration and admission tests

- **Completion predicate:** Focused tests cover the new graph representation and the preserved admission invariants, including independent Results, full Result retrieval, failure-specific dependency blocking, no silent Tasks fallback, tool-contract limits, and no automatic scheduler.
- **Authority and inputs:** W0-DOC Result; W0-PROTO Result; W1-ROUTER Result; all current focused test conventions.
- **Dependencies:** W1-ROUTER.
- **Write ownership/conflicts:** focused test files and fixtures only; no production, Skill, authority, or lockfile edits.
- **Side effects:** Adds regression coverage and may require fixture-only test data.
- **Focused verification:** Run the smallest relevant test files, then typecheck/lint only where required by the repository’s existing test contract; report pass/fail counts and unresolved bootstrap limitations exactly.
- **Result consumer:** W3-REVIEW consumes the test Result and evidence.

## Wave 3: independent final review

- **Wave ID:** W3.
- **Incremental outcome:** Independent review evidence records conformance findings and unresolved limitations over the complete implementation evidence set.
- **Items:** W3-REVIEW.
- **Predecessor Wave gates:** W2.
- **Release predicate:** W3-REVIEW satisfies its completion predicate with a completed Result and required evidence; verify that the review inspects all required predecessor Results and the selected bundle, records scope/authority/graph/evidence findings, and explicitly classifies the live admission limitation. Completion of review evidence is not a waiver of findings or an acceptance decision.

### W3-REVIEW — Review scope, authority, graph, and evidence

- **Completion predicate:** An independent review records whether the implementation matches the Spec/ADRs and confirmed scope, verifies no historical Tasks rewrite or silent fallback, checks ownership/conflicts and focused evidence, and calls out any unresolved live Resolver bootstrap limitation without claiming acceptance.
- **Authority and inputs:** W0-DOC Result; W0-PROTO Result; W1-ROUTER Result; W2-TEST Result; Work/Context/Plan/Waves bundle.
- **Dependencies:** W0-DOC, W0-PROTO, W1-ROUTER, W2-TEST.
- **Write ownership/conflicts:** review report or review artifact only; must not modify implementation, authority, tests, or historical Work entries.
- **Side effects:** Produces independent review evidence; no product/runtime behavior changes.
- **Focused verification:** Re-read changed paths and authority links; validate graph predicates and dependency blocking; inspect test output and git diff for scope leaks; explicitly classify live admission as verified, limited, or unverified.
- **Result consumer:** Router consumes the review Result to decide whether the migration is ready for a separate implementation/acceptance workflow.

## Dependency graph

```text
W0-DOC   ─────┐
              ├──> W1-ROUTER ───> W2-TEST ───┐
W0-PROTO ─────┘                              ├──> W3-REVIEW
W0-DOC   ─────────────────────────────────────┘
W0-PROTO ─────────────────────────────────────┘
```

The two Wave 0 branches have no item or predecessor-gate dependency on each other and are independent by ownership; they may proceed in parallel only if the actual Handler write boundaries and effective delegate-tool contract permit it. Gate `W0` waits for both because W1-ROUTER already requires both Results; it adds no barrier between those branches. W1-ROUTER is the integration point; W2-TEST and W3-REVIEW remain separate Results, with review last because it must inspect the complete evidence set. The explicit gate chain is `W0 -> W1 -> W2 -> W3`; the item dependencies above remain independently required, including W3-REVIEW's direct dependencies on all predecessor items.

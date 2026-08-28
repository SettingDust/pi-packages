# Terminal Input Barrier Work

- **Status:** product implementation and ordinary deterministic regressions are committed in `2a49f9936cc3c6e76041696ea11004a1afbf93ff`; collector/Q1 acceptance is withdrawn; independently reviewed exact-path cleanup and ordinary post-cleanup verification are historical records; this ten-file documentation reconciliation remains uncommitted
- **Goal:** preserve the accepted child terminal-input barrier and remove the obsolete collector/Q1 acceptance infrastructure without changing product behavior or ordinary regression coverage.
- **Authority:** [Terminal Input Barrier Specification](../../spec/terminal-input-barrier.md); [Runtime Lifecycle Specification](../../spec/runtime-lifecycle.md).
- **Derived coordination:** [Context](context.md); [Plan](plan.md); [Tasks](tasks.md); [Acceptance Matrix](acceptance-matrix.md); [Deletion Inventory](deletion-inventory.md).

## Current Stage

The accepted `active -> settling -> settled` implementation is present in `extensions/pane-child.ts`. Its deterministic regression coverage is present in `tests/pane-child.test.ts`. Both source/test changes are committed in `2a49f9936cc3c6e76041696ea11004a1afbf93ff` and are outside this documentation reconciliation boundary.

The user accepted removal of the entire collector/Q1 real-environment acceptance path. After the required independent deletion-boundary review, all 32 approved collector/Q1/obsolete-attempt files were deleted by exact path. Q1, attempts 4/5, historical failed-preflight records, collector scripts and tests, replay artifacts, the attempt ledger, and obsolete real-attempt evidence are no longer acceptance or completion gates.

The exact deletion set and explicit preservation set remain recorded in [Deletion Inventory](deletion-inventory.md) as the reviewed audit record. Pre-deletion checks confirmed all 32 delete paths and all 13 preserve paths existed, the sets did not intersect, and `evidence/q1/` contained exactly the 29 listed Q1 files. Post-deletion checks confirmed all 32 delete paths absent and all preserved paths present with unchanged content hashes.

## Product Completion Signal

The product behavior is complete when:

1. the specialized Spec remains satisfied by the child implementation;
2. the focused deterministic barrier and persistence regressions pass;
3. ordinary package typecheck and tests pass;
4. owned source/test changes reconcile with the accepted behavior; and
5. a fresh independent correctness review has no unresolved product finding.

No collector, Q1, Herdr/CIM fixture, child process, sentinel, real attempt, replay, or evidence ledger is required.

## Cleanup Completion Signal

Documentation cleanup is recorded as complete for the historical cleanup operation: the independently reviewed exact deletion set was removed without touching preserved paths, retained references were reconciled, focused tests passed 9/9, package typecheck passed, the full package suite passed 133/133, the 32/13 boundary and product hashes were audited, and `git diff --check` passed. Those product checks were not rerun by this documentation reconciliation. No staging or commit was performed during that historical cleanup operation.

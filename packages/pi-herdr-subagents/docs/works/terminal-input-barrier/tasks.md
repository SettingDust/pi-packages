# Terminal Input Barrier Tasks

- **Status:** product task is complete and source/test changes are committed in `2a49f9936cc3c6e76041696ea11004a1afbf93ff`; authority amendment, independent deletion review, exact-path cleanup, and ordinary verification are historical records; this ten-file documentation reconciliation remains uncommitted
- **Work:** [Work](work.md)
- **Spec:** [Terminal Input Barrier Specification](../../spec/terminal-input-barrier.md)
- **Context:** [Work Context](context.md)
- **Plan:** [Implementation Plan](plan.md)
- **Matrix:** [Acceptance Matrix](acceptance-matrix.md)
- **Inventory:** [Deletion Inventory](deletion-inventory.md)

## Task 1: Product State, Persistence, And Barrier Regression

- **Dependency:** accepted product authority
- **Objective:** implement the minimum child-side state, input barrier, persistence recovery, and idempotence behavior.
- **Expected touched surfaces:** `extensions/pane-child.ts`, `tests/pane-child.test.ts`.
- **Completion evidence:** complete; source and ordinary tests are committed in `2a49f9936cc3c6e76041696ea11004a1afbf93ff`; F0 is retained, and the focused 9/9 result plus hashes and package gates are recorded historical evidence.

## Task 2: Withdraw Collector/Q1 Acceptance And Inventory Cleanup

- **Dependency:** user-accepted deletion boundary
- **Objective:** remove collector/Q1 and real-environment evidence from product acceptance, then record exact deletion and preservation sets.
- **Expected touched surfaces:** terminal-input-barrier Spec and Work documentation only.
- **Constraints:** documentation/inventory only; no deletion, source/test edit, collector/Q1/Herdr/CIM/fixture/child/attempt execution, staging, or commit.
- **Completion evidence:** complete; Spec, Work, Plan, Tasks, Context, Matrix, implementation evidence, and deletion inventory agree that collector/Q1 is withdrawn.

## Task 3: Fresh Independent Deletion-Boundary Review

- **Dependency:** Task 2
- **Objective:** independently verify every deletion candidate is collector/Q1/obsolete real-acceptance-only and every product/lifecycle/ordinary-regression asset is preserved.
- **Required evidence:** path-by-path disposition with no unresolved finding; review must include the specialized Spec, runtime implementation, ordinary child tests, and exact inventory.
- **Constraints:** read-only; do not run collector, Q1, Herdr, CIM, fixtures, child processes, replay, or attempts.
- **Completion evidence:** complete; a fresh independent review approved the exact deletion/preservation boundary with no unresolved finding before destructive execution.

## Task 4: Execute Exact-Path Cleanup

- **Dependency:** Task 3 clean independent review
- **Objective:** delete exactly the approved obsolete paths from `deletion-inventory.md`.
- **Constraints:** no globbed or recursive directory deletion; preserve every listed product/ordinary-regression path; do not modify source or ordinary tests; do not run collector/Q1/Herdr/CIM/fixtures/children/attempts; no staging or commit unless separately authorized. This is the historical cleanup boundary, not the later source/test commit or this documentation reconciliation.
- **Completion evidence:** complete; preflight proved 32/32 delete paths and 13/13 preservation paths existed, the sets were disjoint, and Q1 contained exactly its 29 listed files; postflight proved all 32 absent and all 13 preserved with unchanged hashes.

## Task 5: Reconcile Documents And Run Ordinary Verification

- **Dependency:** Task 4
- **Objective:** remove stale links/status and verify retained product behavior through ordinary checks only.
- **Required checks:** focused `pane-child` tests, package typecheck/tests as applicable to the product source/test changes already committed in `2a49f9936cc3c6e76041696ea11004a1afbf93ff`, document-reference check, exact status/diff reconciliation, and `git diff --check`.
- **Completion evidence:** historical cleanup evidence records focused tests 9/9, package typecheck, full package tests 133/133, the exact absence/preservation and product-hash audit, retained relative links, and `git diff --check`; this documentation reconciliation does not rerun product checks and runs only documentation-focused checks.

## Dependency Order

```text
Task 1 product implementation (complete, committed in 2a49f993)
Task 2 authority amendment + exact inventory (complete)
  -> Task 3 independent review (complete)
  -> Task 4 exact deletion (complete)
  -> Task 5 ordinary verification (complete)
```

Collector repair, Q1, attempts 4/5, real-Herdr replay, and collector review are removed tasks and must not be executed.

## Product Coverage

| Behavior | Owning evidence |
| --- | --- |
| active input compatibility and pre-barrier ordering | focused deterministic child test |
| settling input consumption and duplicate completion joining | focused deterministic child test |
| settled input consumption, first-success preservation, one shutdown | focused deterministic child test |
| write/rename failure rollback and retry | focused deterministic child tests |
| continuation/nudge compatibility and atomic Result persistence | existing ordinary child tests |
| Pi `handled` and deferred-shutdown interpretation | retained pinned Pi-source evidence |

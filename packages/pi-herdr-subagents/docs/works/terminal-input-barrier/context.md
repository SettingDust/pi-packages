# Terminal Input Barrier Work Context

- **Status:** product implementation and ordinary regressions are committed in `2a49f9936cc3c6e76041696ea11004a1afbf93ff`; collector/Q1 acceptance is withdrawn; independently reviewed exact-path cleanup and ordinary verification are historical records; this ten-file documentation reconciliation remains uncommitted
- **Work:** [Work](work.md)
- **Spec:** [Terminal Input Barrier Specification](../../spec/terminal-input-barrier.md)
- **Plan:** [Implementation Plan](plan.md)
- **Tasks:** [Tasks](tasks.md)
- **Matrix:** [Acceptance Matrix](acceptance-matrix.md)
- **Inventory:** [Deletion Inventory](deletion-inventory.md)

## Objective

Preserve the child-side input barrier that consumes input during and after successful completion persistence while removing the entire collector/Q1 real-environment acceptance path.

## Accepted Decisions

- Child lifecycle remains `active -> settling -> settled` on successful persistence and `active -> settling -> active` on write or rename failure.
- Input is consumed while `settling` and `settled`; restored `active` uses the existing input path.
- Persistence failure is observable, does not shut down, and permits retry. Duplicate calls join the in-flight attempt; the first successfully persisted Result wins.
- The user withdrew collector-based real-environment acceptance in full. Collector scripts/tests, Q1/preflight/replay evidence, attempts 4/5, the attempt ledger, and obsolete real-attempt evidence are not product acceptance, completion, or release gates.
- Historical collector and real-attempt artifacts carry no retained acceptance role and are deletion candidates. Their former classifications need not be replayed or migrated after deletion.
- A fresh independent review of the exact deletion and preservation inventories was mandatory before destructive edits. That deletion-safety gate completed before the exact-path cleanup.

## Product Boundary

### Preserved implementation and ordinary regressions

- `extensions/pane-child.ts` owns the accepted completion state, shared in-flight persistence, rollback, first-success behavior, synchronous input barrier, and one shutdown.
- `tests/pane-child.test.ts` owns deterministic coverage for active/pre-barrier input, settling and settled input, duplicate joining, write and rename failures, retry, first-success preservation, nudge compatibility, and atomic Result persistence.
- `evidence/f0-red.md`, `evidence/implementation.md`, and `evidence/pi-source.md` remain product-focused supporting evidence.
- `../../spec/runtime-lifecycle.md` remains lifecycle authority and retains its specialized-reference relationship to this Work's Spec.

### Withdrawn acceptance infrastructure

Every path listed under **Delete after independent review** in [Deletion Inventory](deletion-inventory.md) existed solely for the collector/Q1 or obsolete real-environment acceptance path. After independent review and a fail-closed inventory preflight, all 32 listed paths were deleted exactly; no preserved product path changed.

`acceptance-matrix.md` is retained and reduced to product behavior plus deletion-safety coordination; its collector/Q1 rows are removed rather than preserved as history.

## Established Product Evidence

Primary-source inspection in this handoff confirms:

- `extensions/pane-child.ts` contains `active`/`settling`/`settled`, one pending completion promise, rollback to `active` on persistence failure, `handled` input outside `active`, and shutdown after persistence success.
- `tests/pane-child.test.ts` contains nine ordinary tests, including focused barrier, duplicate, failure/retry, Result-preservation, nudge, and atomic-persistence cases.
- `evidence/implementation.md` records the historical implementation run and historical cleanup run: focused 9/9, package 133/133, typecheck, exact boundary/hash audit, retained-link audit, and diff check.
- `evidence/pi-source.md` retains the pinned Pi 0.84.2 semantics used to interpret `{ action: "handled" }` and deferred shutdown.

These are retained facts from inspected repository sources. The historical cleanup operation recorded the ordinary product checks; this documentation reconciliation does not rerun them and runs only documentation-focused checks.

## Scope And Ownership Boundary

This amendment may modify product authority and derived terminal-input-barrier documentation. It must not modify or delete product source, ordinary tests, lifecycle authority unrelated to collector acceptance, settings, Herdr state, dependencies, or Git history.

The completed destructive task was restricted to the exact reviewed deletion paths. No directory-level inference, wildcard expansion, or opportunistic cleanup was used.

## Current Status

1. **Product behavior:** implemented; source/test changes are committed in `2a49f9936cc3c6e76041696ea11004a1afbf93ff`; the focused 9/9, typecheck, and full package 133/133 results are recorded historical verification.
2. **Collector/Q1 acceptance:** withdrawn; no repair, preflight, attempt, replay, or real-Herdr proof is required or was run.
3. **Documentation amendment:** reconciled in this documentation-only change; these ten documentation/evidence files remain uncommitted.
4. **Independent inventory review:** complete before deletion.
5. **Destructive cleanup:** complete for exactly the reviewed 32 paths; all 13 preserve paths retained.
6. **Staging/commit:** no staging or commit was performed for this documentation reconciliation; the source/test commit is `2a49f9936cc3c6e76041696ea11004a1afbf93ff`.

## Source Objects

Inspected during this handoff:

| Locator | Claim and support | Scope |
| --- | --- | --- |
| `extensions/pane-child.ts:6-81` | explicit state, shared persistence, rollback, input barrier, shutdown, and `subagent_done` registration are present | retained product implementation |
| `tests/pane-child.test.ts:111-306` | nine ordinary deterministic lifecycle/barrier/persistence tests are present | retained ordinary regressions |
| `evidence/implementation.md` | records implementation hashes and historical focused/package results | retained product evidence |
| `evidence/f0-red.md` | records the pre-fix failing barrier assertion | retained product evidence |
| `evidence/pi-source.md` | records pinned Pi 0.84.2 source hashes and behavior excerpts | retained framework evidence |
| reviewed Work-directory inventory and cleanup pre/postflight | proves the exact 32-path deletion boundary, 13-path preservation boundary, disjoint sets, exact 29-file Q1 inventory before deletion, and resulting absence/preservation | deletion execution evidence |

## Remaining Limitation

The product source/test change is committed in `2a49f9936cc3c6e76041696ea11004a1afbf93ff`; this documentation reconciliation remains uncommitted. No collector/Q1/Herdr real-environment acceptance was run because that path is explicitly withdrawn and prohibited for this cleanup.

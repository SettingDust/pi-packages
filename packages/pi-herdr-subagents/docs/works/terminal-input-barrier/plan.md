# Terminal Input Barrier Implementation Plan

- **Status:** product implementation and ordinary deterministic regressions are committed in `2a49f9936cc3c6e76041696ea11004a1afbf93ff`; collector/Q1 acceptance is withdrawn; independently reviewed exact-path cleanup and ordinary post-cleanup verification are historical records; this ten-file documentation reconciliation remains uncommitted
- **Authority:** [Terminal Input Barrier Specification](../../spec/terminal-input-barrier.md)
- **Work:** [Work](work.md)
- **Context:** [Work Context](context.md)
- **Tasks:** [Tasks](tasks.md)
- **Inventory:** [Deletion Inventory](deletion-inventory.md)

## Objective

Preserve the implemented child terminal-input barrier and its ordinary regressions while removing the obsolete collector/Q1 real-environment acceptance infrastructure.

## Scope

- Preserve `extensions/pane-child.ts` and `tests/pane-child.test.ts` unchanged during cleanup.
- Preserve the `active`/`settling`/`settled` behavior, shared in-flight persistence, failure rollback, retry, first-successful-Result rule, synchronous input consumption, and one shutdown.
- Remove collector scripts, collector-only tests, Q1/preflight/replay records and sidecars, attempt 4/5 flow, the attempt ledger, and obsolete real-attempt evidence only after independent inventory review. This reviewed exact-path cleanup is complete.
- Retain product-focused authority, coordination, F0 evidence, implementation evidence, and pinned Pi-source evidence.

## Non-Goals

Do not change product source, ordinary product tests, parent runtime behavior, `subagent_steer`, Herdr transport, lifecycle behavior unrelated to the barrier, dependencies, configuration, settings, Herdr state, or Git history.

Do not run collector, Q1, Herdr, CIM, fixtures, child processes, sentinels, replay, or attempts 4/5. Do not preserve speculative collector compatibility or migration support after the accepted deletion.

## Minimum Strategy

1. Amend the specialized Spec and derived Work documents so deterministic product verification is sufficient and collector/Q1 is no longer an acceptance or completion gate.
2. Record one exact path-level deletion inventory and one explicit preservation inventory without deleting anything.
3. Obtain a fresh independent review of the amended authority, deletion set, and preservation boundary.
4. Only after that review, delete exactly the approved obsolete paths. Do not broaden deletion by directory glob or inference.
5. Reconcile links and status after deletion, then run the smallest ordinary verification: focused child tests, package typecheck/test if affected by the retained product diff, document references, and `git diff --check`.

## Dependencies And Gates

```text
accepted collector/Q1 withdrawal
  -> authority and inventory amendment
  -> fresh independent deletion-boundary review
  -> exact-path destructive cleanup
  -> ordinary product/document verification
```

The independent review gates destructive cleanup. Collector correctness, Q1, attempt 4, attempt 5, replay, and real-Herdr evidence do not gate product completion or cleanup.

## Executed Cleanup

The required independent inventory review completed before execution. The cleanup then:

- proved all 32 delete paths and all 13 preserve paths existed;
- proved the sets were disjoint and `evidence/q1/` contained exactly the 29 reviewed Q1 files;
- deleted each approved file by exact path, without a glob or recursive directory deletion; and
- proved all 32 paths absent and all 13 preserved paths present with unchanged content hashes.

## Verification

For the historical cleanup operation, recorded verification was:

- confirmed every approved deletion path absent and every preserved path present with unchanged content hashes;
- `bun test tests/pane-child.test.ts`: 9 pass, 0 fail, 40 assertions;
- `bun run typecheck`: passed;
- `bun test`: 133 pass, 0 fail, 1066 assertions;
- retained-document link audit: 11 Markdown documents checked, 0 broken relative links;
- product hash reconciliation: both source/test hashes match the recorded final hashes; and
- `git diff --check -- packages/pi-herdr-subagents`: passed.

## Risks And Mitigations

- **Product assets deleted with collector debris:** mitigated by exact reviewed path deletion plus before/after preservation hash checks.
- **Stale authority silently keeps Q1 mandatory:** the specialized Spec and all derived Work documents are amended together.
- **Historical collector artifacts are mistaken for product evidence:** classify them as obsolete deletion candidates, not completion evidence.
- **Cleanup claimed without execution:** avoided; this Plan records the completed deletion and its direct checks.

No commit was authorized or required by this Plan during the historical cleanup operation. That historical boundary does not describe the later source/test commit `2a49f9936cc3c6e76041696ea11004a1afbf93ff` or this documentation reconciliation, which remains uncommitted.

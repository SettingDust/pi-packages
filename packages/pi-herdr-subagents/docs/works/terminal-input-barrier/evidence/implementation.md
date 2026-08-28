# Terminal Input Barrier Implementation Evidence

## Outcome

The bounded child extension and deterministic tests are implemented. Fake evidence F1-F8 passed in the recorded implementation run. The later accepted deletion boundary withdrew collector/Q1 and real-environment attempts from acceptance; after independent review, all 32 obsolete artifact paths were deleted exactly and all 13 preservation paths remained unchanged.

## Owned Baseline And Final State

Repository baseline/current revision at the recorded implementation run: `e68e234165f8bb9efe95b628314074f7ce8d7b15` (`e68e234`). No commit was created for that historical implementation run. The source and ordinary test changes were later committed in `2a49f9936cc3c6e76041696ea11004a1afbf93ff`. The ten documentation/evidence files in this Work remain uncommitted in this reconciliation.

| Path | Baseline SHA-256 | Final SHA-256 |
| --- | --- | --- |
| `extensions/pane-child.ts` | `1f0e600ec1e337f87b9ae0757a4ab4306d35cd3ccdcc7cdba476db48516cb529` | `25a9963df76b72437cac2a55c5a45a0b4d2ec315c212ec975fe358c93026e472` |
| `tests/pane-child.test.ts` | `0d6f398406fbb5928c3dbd0e6161a2a7384689071b118217c3f169e3e2e5dd20` | `46492a55a5881ec827bdd346255f4ffc7b2dea5721a4f9b80c8d7443083bd16b` |

The exact owned product diff is limited to explicit `active`/`settling`/`settled` completion state, one shared pending persistence promise, awaited write/rename with failure recovery, synchronous input handling outside `active`, a narrow injectable operations seam, and focused child tests. No parent runtime or `subagent_steer` source was changed by this Work.

## Deterministic Evidence

F0 is retained in [f0-red.md](f0-red.md). Recorded final command:

```text
bun test tests/pane-child.test.ts
9 pass, 0 fail, 38 expect() calls
```

Coverage mapping:

- F1/F4: `preserves active and pre-barrier input decisions`.
- F2/F5/F6: `consumes every settling input and shares one completion attempt`.
- F3/F8: `consumes settled input before shutdown returns and preserves the first Result`.
- F7/F8: shared write rejection and rename rejection tests restore active, expose failure, permit retry, preserve the retry winner, and avoid duplicate shutdown.
- Existing nudge dedupe, lifecycle cleanup, later unfinished-turn continuation, and atomic Result behavior remain covered by the other four child tests.

## Recorded Package Gates

- `bun run typecheck`: passed after `bun install --frozen-lockfile` restored the missing workspace `pi-herdr` link; the install reported no dependency or lockfile changes.
- `bun test`: passed, 80/80 tests and 422 assertions. The child suite passed 9/9.
- Bounded `git diff --check` for the Spec, Work, source, and test paths passed; Git emitted only line-ending conversion warnings for the two tracked implementation files.

These are retained historical results. This documentation-only amendment did not rerun product tests.

## Current Remaining Gates

Product reconciliation requires the specialized Spec's deterministic matrix, ordinary package checks, pinned Pi-source semantics, owned diff/hash reconciliation, document checks, and fresh independent product review.

Collector repair/review, Q1, attempts 4/5, Herdr/CIM fixtures, sentinels, ledgers, liveness proof, and replay are not remaining gates. The separate fresh independent deletion review completed before exact-path cleanup. Preflight proved the 32 delete paths and 13 preserve paths existed, the sets were disjoint, and Q1 contained exactly its 29 listed files; postflight proved all 32 absent and all preserved files present with unchanged hashes. No staging or commit was performed during that historical cleanup operation.

## Historical Cleanup Verification

Executed after the independently reviewed exact-path cleanup:

- `bun test tests/pane-child.test.ts`: **9 pass, 0 fail, 40 assertions**.
- `bun run typecheck`: **passed**.
- `bun test`: **133 pass, 0 fail, 1066 assertions**.
- Exact boundary audit: **32 delete paths absent; 13 preserve paths present; intersection empty**.
- Product hash reconciliation: `extensions/pane-child.ts` and `tests/pane-child.test.ts` both match the recorded final SHA-256 values above.
- Retained-document audit: **11 Markdown documents checked; 0 broken relative links**.
- `git diff --check -- packages/pi-herdr-subagents`: **passed**.

The historical cleanup operation ran no collector, Q1, Herdr, CIM, fixture, replay, sentinel, attempt 4/5, staging, or commit command. This documentation reconciliation runs only documentation-focused checks.

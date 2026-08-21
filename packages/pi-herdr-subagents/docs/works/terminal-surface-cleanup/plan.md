# Terminal Surface Cleanup Implementation Plan

- **Status:** Phase A completed and landed in `569b7ba`; Phase B implementation, bounded final-review P1-1/P2-1/P2-2 repairs, refreshed verification, and the second fresh independent final review are complete. The review found P0/P1/P2 = 0. Phase B is ready for an ownership-isolated selective commit and remains uncommitted.
- **Work:** [work.md](work.md)
- **Authority:** [runtime-lifecycle.md](../../spec/runtime-lifecycle.md), sections 3 and 10; [task-derived-subagent-id.md](../../spec/task-derived-subagent-id.md), sections 5 and 6; [automatic-terminal-surface-cleanup.md](../../adr/automatic-terminal-surface-cleanup.md)
- **Context:** [context.md](context.md)
- **Tasks:** [tasks.md](tasks.md)
- **Implementation evidence:** [evidence/README.md](evidence/README.md)

## Objective

Release durable automatic closure of each terminal generation's dedicated Herdr tab without making a rollback erase newer manifest data or changing terminal Results and retained artifacts.

## Scope

### Phase A: manifest compatibility baseline

- Read and migrate both V1 legacy and V1 canonical identity forms to V2.
- Preserve V1 canonical `subagentId`, exact `taskSlug`, session/artifact paths, and Result identity; preserve V1 legacy ID and absent slug.
- Preserve every unknown top-level manifest field as the same semantic JSON value on every validated V1/V2 rewrite.
- **Status:** Complete and landed in `569b7ba` (`fix(subagents): preserve manifest compatibility`). It is the required standalone source-plus-test rollback floor for Phase B.
- Do not introduce, interpret, validate, normalize, or act on `surfaceCleanups`; do not close terminal surfaces.

### Phase B: automatic terminal cleanup

- Add accepted-tab close and not-found classification to the injected Herdr transport.
- Add per-generation cleanup records, validation, defensive-copy snapshots, preserve unknown whole array entries as opaque semantic JSON values, and preserve unknown fields inside recognized entries.
- Integrate cleanup with Result settlement, cancellation, monitor/recovery failures, accepted-surface launch failures, resume, remove, join, inspect, and notification ordering.
- Coalesce one settlement and cleanup operation per task generation.
- Verify with focused fake-transport tests and one disposable real Herdr acceptance check. A Phase B source commit is permitted only after its own final verification and independent-review gate; the Phase A gate cannot authorize a Phase B commit.

## Non-Goals

- No automatic artifact/session deletion, parent-workspace cleanup, shared-tab support, retry daemon, timeout policy, or new dependency.
- No change to Handler Result, task identity, notification payload, continuation, steering, or widget rendering semantics.
- No work on `#18`; no absorption or modification of `#13` authority or Tasks.
- No byte-for-byte JSON preservation guarantee; unknown parsed values are preserved semantically.
- No rollback promise to a pre-Phase-A runtime and no recreation of tabs already closed by Phase B.

## Dependency Matrix

| Unit | Depends on | Independent gate | Enables | May share a release/commit? |
| --- | --- | --- | --- | --- |
| `#13` V2 lifecycle baseline | its own accepted authority and Work | accepted implementation, tests, review, and landed commit | one required input to Phase B | remains separate from this Work |
| Phase A compatibility baseline | current task-ID and lifecycle authority | focused V1 legacy/canonical migration tests, unknown-field passthrough tests, typecheck, full package tests, independent review, and accepted Phase A release gate | supported rollback floor and second required input to Phase B | no; must precede Phase B; standalone source-plus-test commit is required only after the gate |
| Phase B automatic cleanup | both landed `#13` and accepted Phase A commit | complete fake matrix, typecheck/full tests, disposable real Herdr check, independent correctness/evidence review | auto-close release | no; separate from Phase A |

`#18` is excluded and is not a dependency. Phase A and `#13` are logically independent prerequisites, but overlapping dirty source/test ownership must be coordinated. Phase B starts only after both gates are satisfied.

## Preconditions

1. A fresh reviewer must check the Specs, ADR, Context, Plan, and Tasks against then-current source, tests, installed Herdr CLI evidence, and dirty ownership.
2. The user must explicitly accept the reviewed Plan in the current main session. Generic pacing commands are not acceptance.
3. Ownership of dirty `src/index.ts` and `tests/runtime.test.ts` must be clear; implementation must preserve concurrent queue/widget/migration work.
4. `#13` must be accepted, implemented, reviewed, and landed before Phase B. This Plan does not modify its Tasks or use EOF-related scope as cleanup authority.
5. Phase A must pass its independent gates and, after explicit Plan acceptance, land as a standalone source-plus-test commit before any Phase B source change begins.
6. Real Herdr verification is Phase B only and must use an isolated disposable tab in the captured parent workspace with best-effort cleanup.

## Phase A Strategy

### 1. Complete supported V1 identity migration

Extend the existing manifest reader/validator so V1 canonical records are supported alongside V1 legacy records. A V1 canonical rewrite changes the owned version/lifecycle representation to V2 but retains exact `subagentId`, exact `taskSlug`, original session and artifact paths, generation Result identity, and all existing lifecycle behavior. It must not allocate, normalize, or infer a slug. A V1 legacy rewrite retains its exact legacy ID and keeps `taskSlug` absent.

Malformed identity relationships remain ignored under current recovery rules. No retained task is renamed and no path is moved.

### 2. Establish generic unknown-field passthrough

When a validated V1 or V2 manifest is rewritten, merge runtime-owned fields into the parsed record and retain all unknown top-level fields as the same JSON values. This applies to normal persistence, recovery migration, terminal settlement, notification-marker updates, resume, and other existing rewrite paths.

Phase A treats `surfaceCleanups` only as an unknown top-level field. It must not define a cleanup type, inspect array entries, normalize the value, create a default, issue close calls, or alter lifecycle ordering for cleanup.

### 3. Verify and commit Phase A independently

Focus on the supported V1 identity migration and generic top-level passthrough. After explicit Plan acceptance, focused tests must cover V1 canonical and V1 legacy recovery/migration, running and terminal records, exact identity/path/Result retention, malformed identity rejection, and unknown scalar/object/array/null passthrough across representative rewrite paths. Existing package typecheck and full tests must pass. A fresh review must confirm no cleanup behavior entered the change. The Phase A release gate then authorizes source and tests to land in one standalone commit; that commit is the Phase B rollback floor.

## Phase B Strategy

### 1. Add one transport-level tab close contract

Extend `HerdrTransport` with accepted-tab close returning `closed` or `already_closed`. Implement it with `herdr tab close <tabId>` and classify Herdr `tab_not_found` as `already_closed`; other failures throw. Keep pane close only for rejected partial create responses before accepted ownership.
### 2. Persist per-generation cleanup evidence

Add section-10 `surfaceCleanups` records to runtime state and manifests. Recognized entries require validation of generation uniqueness, identities, status-specific fields, timestamps, and bounded diagnostics. Unknown whole array entries are retained as opaque semantic JSON values and ignored for cleanup decisions; unknown fields inside recognized entries are retained while understood cleanup fields are updated. Runtime-created entries use the exact canonical shape. Expose cleanup evidence through defensive copies and retain prior-generation entries across resume.

### 3. Route terminal transitions through one cleanup sequence

Use the shared settlement path for Result completion, invalid Result, monitor failure, pane closure, accepted-surface launch failure, cancellation, and recovery:

```text
one settlement promise -> terminal Result/status -> atomic terminal manifest
-> cleanup record pending -> accepted-tab close -> cleanup manifest -> notify
```

The first terminal trigger owns Result/status, cleanup, and notification writes. Concurrent triggers await the same promise. Cleanup errors are caught, persisted as `failed`, and cannot replace the terminal state, original error, Result, or notification meaning.

Recovery retries each actionable `pending` or `failed` record at most once per recovery call. It never re-closes final/non-actionable records and never lets old-generation cleanup mutate the current generation.

### 4. Preserve tool contracts

- `inspect` returns promptly and may expose `pending`; snapshots are defensive copies.
- `join` awaits known settlement/cleanup; caller abort stops only that wait.
- Notifications retain summary-only original status/reason after cleanup evidence is durable.
- `resume` keeps identity/session/prior records and opens a new tab.
- `remove` retries actionable cleanup; repeat failure rejects removal and retains files.
- Active remove retains fail-before-delete safety.
### 5. Verify fake transport, then real Herdr

Use fake transport to cover state, ordering, retry, concurrency, snapshot isolation, preservation of unknown whole array entries and unknown fields inside recognized entries, generation isolation, and error paths. Then use a disposable real Herdr tab to prove close-by-`tabId` removes both tab and root pane and repeated close classifies as already closed. Capture IDs without focus changes and clean up surviving resources in `finally`.

## Phase A Acceptance Matrix

| Scenario | Required result | Forbidden regression |
| --- | --- | --- |
| V1 legacy rewrite | V2, same legacy ID, absent `taskSlug`, same session/artifact/Result identity | slug synthesis or path rename |
| V1 canonical unsuffixed rewrite | V2, same ID and exact slug | normalization, allocation, or path rename |
| V1 canonical suffixed rewrite | V2, same suffixed ID and base slug | suffix reallocation or slug loss |
| malformed V1 canonical relation | ignored under existing recovery contract | adoption or rewrite |
| running and terminal V1 canonical records | lifecycle recovery unchanged after migration | relaunch or Result identity change |
| unknown top-level scalar/object/array/null | same semantic JSON value after each representative rewrite | drop, replacement, or normalization |
| unknown top-level `surfaceCleanups` | preserved as an opaque value | parsing, validation, creation, or close call |
| rollback baseline | standalone reviewed source-plus-test commit | Phase B code in the same commit |

## Phase B Acceptance Matrix

| Scenario | Expected terminal state | Cleanup record | Surface call | Retained / visible behavior |
| --- | --- | --- | --- | --- |
| completed Result | `completed` | `closed` | one tab close by `tabId` | Result/session/manifest retained; join succeeds |
| failed or invalid Result | `failed` | `closed` | one tab close by `tabId` | original error retained |
| explicit cancel | `cancelled` | `closed` | close after cancelled Result/status persist | notification unchanged |
| `pane_closed` | `failed` + original reason | `closed` or `already_closed` | close when accepted `tabId` exists | reason retained |
| tab already absent | unchanged | `already_closed` | one classified attempt | no later retry |
| close throws | unchanged | `failed` + normalized diagnostic | one attempt per trigger | join/inspect/notification continue; files retained |
| concurrent terminal triggers | first terminal state | one record | one close and settlement | no duplicate Result, close, or notification |
| concurrent join and inspect | terminal state | `pending` until settled | join awaits; inspect returns | defensive copies; abort affects only caller wait |
| restart after `pending`/`failed` | unchanged | updated outcome | at most one retry per recovery | no duplicate terminal transition |
| restart after final cleanup | unchanged | unchanged | none | idempotent |
| surface never accepted | launch `failed` | `not_created` | none | launch failure remains primary |
| accepted surface then launch failure/cancel/remove | original lifecycle state | close outcome | tab close by accepted `tabId` | no pane-only close |
| rejected partial create | rejection path | no accepted ownership | pane-only rejection cleanup if needed | no tab close or guessed ID |
| terminal record lacks usable identity | unchanged | `identity_missing` | none | auditable, no guessed close |
| resume | prior state unchanged; next generation running | prior record retained | one new tab create | same task/session, new surface IDs |
| remove after cleanup failure | unchanged unless retry succeeds | failed retained on repeat failure | retry tab close | reject and retain files |
| Phase A rollback writer | unrelated fields updated | complete unknown cleanup value preserved | none | cleanup evidence not erased |
| Phase B unknown whole array entries | unchanged | retained as opaque semantic JSON values | none | ignored by cleanup logic; no validation, normalization, retry, close call, or deletion based on the unknown entry |
| Phase B unknown fields in recognized entries | unchanged | understood fields updated; unknown fields preserved semantically | as scenario requires | unknown fields not dropped, replaced, or interpreted as runtime-owned |
| notification | original status/reason | cleanup durable first | none in notifier | no Result or cleanup diagnostic added |

## Verification Gates

### Phase A

1. Focused migration/passthrough tests satisfy every Phase A matrix row.
2. Existing recovery, notification, resume, Result identity, task-ID, and widget regressions remain passing.
3. `bun run --cwd packages/pi-herdr-subagents typecheck`.
4. `bun run --cwd packages/pi-herdr-subagents test`.
5. `git diff --check -- packages/pi-herdr-subagents` and ownership review prove no `surfaceCleanups` semantics, close operation, `#18`, steering, or unrelated work entered Phase A.
6. Fresh independent correctness/evidence review passes.
7. After explicit Plan acceptance and once this Phase A gate passes, source and tests must land together in a standalone commit before Phase B starts.

### Phase B

1. Focused fake tests cover every Phase B matrix row, operation order, exact call counts, concurrency, manifest contents, defensive-copy isolation, preservation of unknown whole array entries and unknown fields inside recognized entries, generation isolation, retained files, and unchanged notifications.
2. Existing recovery, notification, join-abort, resume, cancel, remove, migration, widget, and transport tests remain passing.
3. Package typecheck and full tests pass.
4. Disposable real Herdr acceptance proves create identities, tab/root-pane disappearance, repeat-close classification, and cleanup.
5. `git diff --check` and ownership review prove no `#18`, `#13`, widget, queue, steering, or unrelated authority work entered Phase B.
6. Fresh independent correctness/evidence review passes against Spec section 10 and both matrices.
7. A Phase B source commit is authorized only after this Phase B gate, including its final independent correctness/evidence review, passes; it must remain separate from the Phase A commit.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Pre-Phase-A rollback erases cleanup evidence | make Phase A a required standalone rollback floor before Phase B |
| V1 canonical migration loses slug or moves paths | exact identity/path/Result tests for unsuffixed and suffixed records |
| Phase A accidentally starts cleanup semantics | opaque-value tests plus diff review forbidding cleanup fields and close calls |
| Concurrent dirty lifecycle work is overwritten | reconcile ownership; patch current files, never restore them |
| Cleanup failure changes terminal meaning | persist terminal first; separate cleanup record; catch close errors |
| Duplicate terminal effects | key one settlement/cleanup operation by task and generation |
| Resume loses old cleanup evidence | retain records by generation |
| Caller mutates returned state | defensive copies |
| Real tab close differs from fake contract | disposable real Herdr acceptance before completion |
| Remove deletes failure evidence | actionable close failure blocks deletion |

## Rollback

Phase A is independently reversible before Phase B because it adds no cleanup semantics or surface effect. Once Phase B is released, the minimum supported rollback target is the reviewed Phase A commit or any later runtime that preserves unknown top-level manifest fields. Rollback to a pre-Phase-A runtime is unsupported and must not be claimed safe. Existing `surfaceCleanups` values remain opaque but preserved under Phase A; tabs already closed by Phase B are not recreated. Phase A and Phase B require separate commits and separate evidence.

## Concurrency Detail

Phase B keys settlement and in-flight cleanup by `<subagentId>:<generation>`. `inspect` stays non-blocking and may return `pending`; `join` awaits the keyed operation and returns final cleanup evidence, while caller abort stops only that wait. Recovery, resume, and remove first coalesce with that operation so they cannot double-close or overwrite evidence. Fake tests must force overlaps rather than relying only on sequential calls.

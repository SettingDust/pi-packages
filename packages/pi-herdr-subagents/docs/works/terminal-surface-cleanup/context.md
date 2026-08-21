# Terminal Surface Cleanup Context

- **Status:** Phase A and `#13` prerequisites landed; Phase B plus bounded final-review P1-1/P2-1/P2-2 repairs are implemented in the working tree. Task 6 final verification and the second fresh independent final review are complete with P0/P1/P2 = 0. An ownership-isolated selective commit remains pending.
- **Work:** [work.md](work.md)
- **Authority Spec:** [Runtime lifecycle specification](../../spec/runtime-lifecycle.md), section 10
- **Decision:** [Automatic terminal surface cleanup ADR](../../adr/automatic-terminal-surface-cleanup.md)
- **Plan:** [plan.md](plan.md)
- **Tasks:** [tasks.md](tasks.md)
- **Recorded delivery:** Phase A compatibility baseline `569b7ba` (`fix(subagents): preserve manifest compatibility`); `#13` V2 lifecycle baseline `e68e234` (`feat(subagents): add progress status`).

## Objective

Release automatic terminal-tab cleanup without making rollback erase newer manifest data: first land a compatibility-only manifest baseline, then add cleanup while retaining session, Result, manifest, and launch artifacts until explicit removal.

## Accepted Boundary

- Terminal coverage: `completed`, `failed`, and `cancelled`, including `pane_closed` and launch/verification/Result failures.
- Ownership: a generation owns a tab only after its `createTab` response is accepted; accepted surfaces close by `tabId`.
- Surface effect: close the generation's Herdr tab; the root pane disappears with it.
- Partial create: pane-only close is allowed only when a create response is rejected before a task surface is accepted.
- Retention: session, generation Results, manifest, and launch artifacts remain.
- Failure rule: terminal status, Result, and original error remain authoritative; cleanup failure is separate durable evidence.
- Settlement: one terminal settlement promise and one cleanup operation per `<subagentId>:<generation>`; `join` awaits, `inspect` remains non-blocking.
- Manifest migration: V1 legacy and V1 canonical are readable inputs; V1 canonical rewrites to V2 with exact `subagentId`, `taskSlug`, session/artifact paths, and Result identity, while V1 legacy retains its ID and absent slug.
- Compatibility: Phase A preserves every unknown top-level field as the same semantic JSON value and neither understands nor creates `surfaceCleanups`; Phase B preserves unknown nested cleanup members.
- Manifest cleanup: Phase B owns the exact runtime-created cleanup entry shape, defensive-copy exposure, and bounded diagnostic.
- Resume: stable task/session identity, incremented generation, and a newly created tab.
- Isolation: `#18` remains excluded. `#13` remains separate Work, but its accepted and landed V2 lifecycle baseline is an explicit Phase B dependency rather than scope absorbed here.

## Release Sequence

```text
#13 V2 lifecycle baseline -----+
                              +--> Phase B automatic cleanup
Phase A passthrough commit ----+
```

Phase A is independently testable and releasable. It adds no cleanup field and performs no surface close. Its reviewed source-plus-test commit is the minimum supported rollback target for Phase B. Phase B may not start from a pre-Phase-A writer.

## Current Implementation Evidence

| Evidence | Current behavior relevant to this Work |
| --- | --- |
| `src/index.ts`, `HerdrTransport` | exposes accepted-tab `closeTab` with `closed` / `already_closed` outcomes while retaining pane-only close for rejected partial creates |
| `createHerdrTransport` | maps accepted cleanup to `herdr tab close <tab_id>` and classifies structured/text `tab_not_found`; real Herdr `0.8.2-preview.2026-08-19-b5c4a0176e91` acceptance passed |
| `SubagentRuntime.settle` | coalesces terminal settlement, persists terminal state plus cleanup intent before close, persists the cleanup outcome, then notifies |
| `SubagentRuntime.cancel` | atomically writes the cancelled Result once, then shares the terminal cleanup path; close failure no longer changes cancellation meaning |
| `SubagentRuntime.recover` | validates and preserves cleanup entries, retries each actionable generation once per call, and leaves final outcomes idempotent |
| `SubagentRuntime.resume` | retains prior cleanup evidence and stable identity/session while creating a new generation tab |
| `SubagentRuntime.remove` | retries actionable cleanup; repeated failure retains files, while success permits deletion |
| `tests/runtime.test.ts` | focused Phase B matrix covers lifecycle states, ordering, coalescing, retries, failure isolation, preservation, defensive copies, generations, remove/resume, and artifact retention |

The package has unrelated dirty source and test ownership at planning time, including `src/index.ts`, `tests/runtime.test.ts`, lifecycle migration tests, and progress/status work. This Work does not edit or normalize those files. Implementation must start from the then-current accepted source and coordinate ownership before touching overlapping files. P1-5 specifically assigns runtime and regression-test ownership to `src/index.ts` and `tests/runtime.test.ts`; `#18` remains excluded, while `#13` remains separately owned and is used only as a Phase B dependency.

## Control Flow

```text
Result / cancel / monitor / recovery
                  |
                  v
       one terminal settlement promise
       persist original terminal state
       + exact cleanup record = pending
                  |
                  v
     accepted surface? -- no --> not_created / identity_missing
            |
           yes
            v
       close accepted tab by tabId
            /                         \
    closed/already_closed             exception
           |                              |
           v                              v
  persist final cleanup             persist failed + diagnostic
           \                         /
            +-----------------------+
                  |
                  v
       summary notification; join awaits
       inspect snapshot remains non-blocking
       retain session + Result + manifest
```

```text
terminal generation N --resume--> generation N+1
         |                              |
  cleanup record N retained        create a new tab
         |                              |
  old tab never reused             cleanup record N+1
```

## Cleanup Record

The manifest owns an optional per-generation `surfaceCleanups` array. Runtime-created entries have exactly:

- `generation`: positive integer, unique within the array;
- optional `tabId` and `paneId`: captured identity strings;
- `status`: `pending | closed | already_closed | not_created | identity_missing | failed`;
- `attemptedAt`: ISO timestamp for attempt or classification; and
- `error`: whitespace-normalized diagnostic, at most 160 characters, only for `failed`.

Older manifests without `surfaceCleanups` remain readable. A Phase A runtime preserves the complete unknown top-level value semantically; a Phase B runtime also preserves unknown nested members while updating understood cleanup data. Recovery validates known fields before using a record, while snapshots expose defensive copies. Recovery creates the current terminal generation's record from retained identities and evidence; it does not claim that a missing historical identity was successfully closed.

## Authority Coverage

| Boundary | Owner | Disposition |
| --- | --- | --- |
| Product intent | existing package product authority | unchanged; no PRD needed |
| Lifecycle state, recovery, notification, resume, remove | `runtime-lifecycle.md` | amended by section 10 |
| Cleanup architecture and rationale | `automatic-terminal-surface-cleanup.md` | accepted decision revised for P1 findings |
| Implementation sequence and checks | this Work Plan and Tasks | derived, not authority |
| Runtime and regression-test ownership | `src/index.ts`, `tests/runtime.test.ts` | explicit P1-5 baseline; coordinate existing dirty work |
| `#18` terminal input barrier | separate authority/work | excluded |
| `#13` V2 lifecycle baseline | separate authority/work | not absorbed; accepted and landed baseline is required before Phase B |
| Phase A manifest compatibility | runtime persistence/recovery plus focused tests | standalone commit gate; no `surfaceCleanups` semantics or close behavior |
| Phase B automatic cleanup | this Work | depends on both `#13` and Phase A |

## Review Readiness

Fresh review originally found five P1 gaps plus an omitted V1 canonical migration and an impossible rollback guarantee before an unknown-field passthrough baseline. Authority and planning require exact V1 canonical-to-V2 preservation and an independently tested standalone Phase A commit before Phase B; that Phase A baseline is recorded above as `569b7ba`. The original accepted-tab, settlement, cleanup-record, defensive-copy, source ownership, and exclusion contracts remain. The current-session Phase B admission gate passed. The final-review P1-1/P2-1/P2-2 findings are repaired and self-verified with current evidence in [`evidence/`](evidence/README.md); the second fresh independent final correctness/evidence review is complete with P0/P1/P2 = 0. An ownership-isolated selective commit remains pending.

## Source Evidence Note

Disposable real-Herdr evidence records accepted `tabId` / root `paneId`, terminal-plus-`pending` persistence before close, root-pane disappearance, `closed`, repeated-close `already_closed`, and retained session/Result/manifest/launch artifacts. See [`evidence/real-herdr-acceptance.json`](evidence/real-herdr-acceptance.json).

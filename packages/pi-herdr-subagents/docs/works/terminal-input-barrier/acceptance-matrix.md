# Terminal Input Barrier Acceptance Matrix

This matrix is derived from [Terminal Input Barrier Specification](../../spec/terminal-input-barrier.md). It is coordination material, not authority. Collector/Q1 and real-environment attempts are intentionally absent because the user withdrew that acceptance path during the historical cleanup.

## Product Matrix

| ID | Scenario | Required behavior | Forbidden behavior | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| F0 | pre-fix input arrives after completion persistence begins | retained test reproduces missing `handled` result | defect claimed from inspection alone | `evidence/f0-red.md` | complete |
| F1 | input begins while active | preserve existing active input path/bookkeeping | barrier consumes active input | deterministic child test | complete |
| F2 | completion enters settling before input | return `{ action: "handled" }`; start no turn | user/start event, nudge, Result mutation, or second write | deferred-write child test | complete |
| F3 | persistence succeeds before shutdown completes, then input arrives | return `{ action: "handled" }`; preserve first Result | second turn, overwrite, or second shutdown | shutdown-callback child test | complete |
| F4 | input handler begins active before completion enters settling | retain active decision | retroactive cancellation | ordered child test | complete |
| F5 | repeated input during settling/settled | consume every input with no turn | duplicate turn or barrier side effect | repeated-input child test | complete |
| F6 | duplicate completion while settling | share one persistence outcome | second write/rename or competing Result | in-flight child test | complete |
| F7 | write or rename rejects | restore active before observable failure; no shutdown; retry allowed | false success, detached rejection, stuck settling | rejection child tests | complete |
| F8 | failed attempt, successful retry, later duplicate | retry Result wins; one shutdown; no overwrite | failed/later Result wins | retry and Result assertions | complete |
| S1 | Pi input/shutdown interpretation | retain versioned source paths, excerpts, and hashes | unversioned summary as sole support | `evidence/pi-source.md` | complete |
| G1 | ordinary product verification | focused child tests, package typecheck/tests, owned diff/hash reconciliation, document checks, independent product review | collector/Q1/Herdr evidence required as a substitute | ordinary package and review evidence | complete based on recorded historical focused 9/9, typecheck, package 133/133, hashes and links checks |

## Cleanup-Safety Matrix

These rows coordinate deletion safety only. They are not product acceptance conditions.

| ID | Condition | Required evidence | Status |
| --- | --- | --- | --- |
| D1 | authority no longer requires collector/Q1 | Spec, Work, Plan, Tasks, Context, and this Matrix agree | complete in the historical cleanup amendment |
| D2 | deletion boundary is independently reviewed | fresh path-by-path review of deletion and preservation inventories | complete before deletion in the historical cleanup operation |
| D3 | destructive cleanup follows reviewed inventory | only approved deletion paths absent; all preservation paths present | complete in historical post-cleanup verification; 32 absent and 13 preserved with unchanged hashes |
| D4 | post-cleanup reconciliation | no stale links; ordinary focused/package/document/diff checks pass | complete in historical post-cleanup verification |

## Evidence Boundary

- Deterministic child tests certify extension state, event ordering, persistence failure/retry, Result preservation, and shutdown calls.
- Pinned Pi source certifies framework semantics used to interpret `handled` and deferred shutdown.
- Ordinary package checks certify retained code integration; the recorded results are historical for this documentation reconciliation.
- Collector, Q1, CIM/Herdr fixtures, real attempts, sentinels, ledgers, and replay are neither required nor accepted substitutes.
- Parent steering, notification, join, cancellation, removal, recovery, task identity, generation, and terminal-surface cleanup remain outside this Work except for ordinary regression protection.

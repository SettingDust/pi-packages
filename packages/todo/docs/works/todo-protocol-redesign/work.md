# Work: Todo Protocol Redesign

- Status: **Completed by explicit user direction; recorded T0-T8/T10 technical evidence and review results remain historical evidence, with commit still unperformed.**
- Scope: Preserve the completed four-tool protocol and frozen 41-entry inventory while defining the narrow T10 authority needed for two final correctness repairs.
- Related Context: [context.md](context.md)
- Related Spec: [spec.md](spec.md)
- Related Plan: [plan.md](plan.md)
- Related Tasks: [tasks.md](tasks.md)

## Goal

Define a reviewable protocol for `todo_set`, `todo_add`, `todo_transition`, and `todo_view`, using one shared coordinator and canonical `tasks[].todos[]` state.

## Selected Model

The canonical snapshot is exactly `{tasks,workingOn?}`. A task group is exactly `{name,todos}`. A todo is exactly `{name,description,status}`. Creation input is exactly `{name,description}` and never includes `status`; every todo created by `todo_set` or `todo_add` starts as `pending`. `todo_set` has no `initialTransitions`. Lifecycle changes are performed only by `todo_transition`.

Names and descriptions are trimmed non-empty strings, matching is exact and case-sensitive, task names are globally unique, and todo names are unique within a task. Status is one of `pending`, `in_progress`, `completed`, or `cancelled`. `workingOn` is derived from the first `in_progress` todo in task order then todo order; it is absent when none exists. A supplied `workingOn` must equal that derived value. The active group is the group containing that derived todo, or absent when no such todo exists; active group and `workingOn` are derived, never independently selected.

Persistence is minimal and Host-aligned: retain Host session tool-result restore semantics, with no package-owned sidecar, database, persistence adapter, or Pi-core seam. Only a successful complete Todo `toolResult` already recorded in the current session branch is a branch-local restore checkpoint. Extension `execute` return is neither append nor persistence acknowledgement. No fsync, power-loss, cross-branch, or future-version durability is promised.

## Finding Closure

| Finding | Closure |
| --- | --- |
| P0 producer-before-verifier graph | Plan section 3 and Tasks section 2 now use `T9 -> T0 -> T1 -> T3 -> T2 -> T5 -> T4 -> T6 -> T7 -> T8`; T4 verifies behavior produced by T2/T5. Owner handoffs are synchronized. |
| P1 per-tool schemas and status policy | Spec section 2 defines exact four request objects, required fields, `additionalProperties:false`, array minima, creation shape, pending creation, and transition-only lifecycle. Context and Work repeat the same binding facts. |
| P1 legacy status contradiction | Spec section 5, Context section 4, Work, Plan, and Tasks require legacy task `status`; no optional status or `legacyIdentifier`. |
| P1 Host checkpoint provenance | Context section 5 and Spec section 4 now bind checkpoint authority only to directly verified `@earendil-works/pi-coding-agent` 0.84.2 Host branch behavior: `AgentSession` records the successful complete `toolResult` through `SessionManager.appendMessage` on `message_end`, and `SessionManager.getBranch` can observe it. The inspected `ReadonlySessionManager` exposes no `append`, `flush`, or `ack`; no pi-agent-core loaded-byte or runtime-loaded-core provenance is required or claimed. The exact Host source paths and raw-byte hashes remain recorded. |
| T5 completion evidence | The four accepted ownership entries remain implementation/T5. Independent validation freezes the 14-path T5 boundary: 13 paths changed and the existing `packages/todo/test/visibility.test.ts` is unchanged. Focused 6-file/31-test and full 12-file/69-test runs passed, as did typecheck, diff-check, four-tool registration smoke, and legacy scan. |

## Lifecycle and Repair Boundary

T9 is complete for the exact final tuple: the user renewed acceptance of the final T5 ownership amendment after a GO decision review. T0, T1, T3, T2, and T5 are complete for their recorded boundaries. T5 reconciles `postTaskSha256` for all 14 T5 paths in `evidence/t0-manifest.json`; 13 entries differ from baseline and the existing `packages/todo/test/visibility.test.ts` entry equals baseline. Independent validation passed focused 6 files/31 tests, full 12 files/69 tests, typecheck, diff-check, four-tool registration smoke, and legacy scan.


T6 is complete after fresh read-only revalidation of the current authority tuple and frozen manifest: all five authority hashes matched, the manifest retained 41 entries and 24 post-task hashes with zero mismatches, aggregate SHA-256 remained `58ded69287e2a2d45a21d1d107c8ae68773589c4f30df3fe6853ce1ad2fcd4a9`, `bun run typecheck` passed, and `bun run test` passed with 12 files and 69 tests. No files were modified by T6. T7 completed with no P0-P2 findings and one P3 live-activation limitation. T8 closes that limitation with the separately recorded Pi 0.84.4 live activation smoke: the final active inventory contained exactly `todo_set`, `todo_add`, `todo_transition`, and `todo_view`; each executed successfully, and all eight registered lifecycle handlers dispatched without failure. T8 reconciled README and CHANGELOG to the clean-break protocol. The smoke does not claim power-loss durability, cross-branch restore, or future Host-version behavior. No protocol, schema, state semantics, restore boundary, task dependency, path inventory, source, test, manifest, dependency, settings, staging, commit, reload, or deployment changed.
T4 passed independent functional and boundary revalidation after the bounded consumer-wiring repair: direct 7/7 checks, focused 31/31 checks, full 12 files/69 tests, typecheck, four-tool/8-hook/render smoke, publication ordering, queue and atomicity, projections, and checkpoint semantics all passed. Boundary/status remediation retained the 41-path inventory and identified exactly two expected completed-owner hash drifts: `packages/todo/src/tool.ts` and `packages/todo/test/index.test.ts`; `packages/todo/src/index.ts` remains at its recorded post-task hash. This reconciliation records the two current raw-byte hashes and makes T4 durably complete. The executable sequence was T9 -> T0 -> T1 -> T3 -> T2 -> T5 -> T4 -> T6 -> T7 -> T8; all tasks are now complete.

## T10 Accepted Correctness-Repair Amendment

T10 is an accepted narrow amendment implemented only in `packages/todo/src/widget.ts`, `packages/todo/src/tool.ts`, `packages/todo/src/persistence.ts`, `packages/todo/test/index.test.ts`, and `packages/todo/test/persistence.test.ts`. Their existing inventory entries, classifications, and original owner history remain unchanged.

T10 implements two invariants. First, before projecting restored state to a UI, restore resets that same UI's terminal-widget lifecycle: it cancels any stale terminal-clear timer and removes the stale lifecycle entry. This reset applies to shared restore paths and does not alter the five-second terminal-summary behavior after a normal mutation. Second, a restore checkpoint is eligible only when `toolResult.isError` is a boolean strictly equal to `false`; `true`, an absent value, and every non-boolean value are skipped with the existing non-payload diagnostic behavior while scanning continues, so a newer invalid candidate cannot replace an older valid checkpoint.

### T10 Manifest Evidence Semantics

T10 addresses five existing implementation entries only. Their pre-T10 `postTaskSha256` values remain historical completion evidence for the original owners. The current T10 hashes, exact five-path boundary, aggregate, manifest identities, and verification facts are recorded in [t10-technical-validation.md](evidence/t10-technical-validation.md).

Each entry keeps classification `implementation` and its original owner: `src/widget.ts` remains T5, `src/tool.ts` and `test/index.test.ts` remain T2, and `src/persistence.ts` and `test/persistence.test.ts` remain T3. The 41-entry ordered path list is unchanged; only those five current `postTaskSha256` values and derived manifest evidence were reconciled.

T10 implementation, technical validation, and both fresh final reviews are complete with GO: correctness review P0-P3=0 and evidence/selective-boundary review P0-P3=0. The current local commit candidate contains 34 Todo paths, with no staged paths; it is reviewed and pending explicit user submission authorization. No commit has been made.

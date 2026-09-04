# Context: Todo Protocol Redesign

- Status: **Processed implementation context - T0 through T8 complete; T10 complete with technical validation and both fresh final reviews GO (P0-P3=0); 34-path commit candidate reviewed and pending explicit user submission authorization.**
- Related Work: [work.md](work.md)
- Related Spec: [spec.md](spec.md)
- Related Plan: [plan.md](plan.md)
- Related Tasks: [tasks.md](tasks.md)

## Purpose

Processed evidence for the completed protocol and the narrow T10 correctness-repair amendment. This document is not product or technical authority and cannot authorize code.

## Settled Direction

There are exactly four provider-visible tools: `todo_set`, `todo_add`, `todo_transition`, and `todo_view`. One coordinator owns strict validation, canonical state, invocation ordering, projections, and results. Request objects are strict: `todo_set` is exactly `{tasks}`, `todo_add` exactly `{task,todos}`, `todo_transition` exactly `{transitions,workingOn?}`, and `todo_view` exactly `{}`. Every object has `additionalProperties:false`; `tasks` and `transitions` have `minItems:0` only where empty replacement is valid, while `todo_add.todos` and `todo_transition.transitions` have `minItems:1`.

Creation input is exactly `{name,description}` with both required trimmed non-empty strings and no `status`; `todo_set` and `todo_add` create `pending` todos. Canonical todos are exactly `{name,description,status}`. There is no `initialTransitions`. `todo_transition` alone changes lifecycle status and each transition item is exactly `{task,todo,status}`. Matching is exact and case-sensitive. Task names are globally unique; todo names are unique within a task. Duplicate transition targets are rejected. `workingOn` and active group are derived from the first `in_progress` todo in array order; a supplied `workingOn` must match the derived description.

## Evidence Register

- **Fact:** The binding schema research supplied for this repair fixes the four request shapes, creation shape, pending creation, no `initialTransitions`, and producer order `T1 -> T3 -> T2 -> T5 -> T4`. **Source:** repair evidence supplied with the Work. **Scope:** protocol and task graph.
- **Fact:** Prior review found the producer/verifier deadlock, undefined per-tool fields/status policy, legacy status contradiction, and unsupported Host checkpoint assertions. **Source:** fresh review findings supplied with the Work. **Scope:** authority tuple.
- **Fact:** Directly verified Host checkpoint evidence is tied to `@earendil-works/pi-coding-agent@0.84.2`. Its resolved path, key-file hashes, and symbols are recorded in section 5. **Source:** read-only Host research supplied with this repair. **Scope:** current Host branch boundary; no loaded pi-agent-core byte identity is inferred. |
- **Conclusion:** Spec owns normative protocol and restore mechanics; Plan owns sequence and manifest; Tasks own executable boundaries and gates; Work records the selected boundary and closure.

## T5 Ownership Adjudication

The final T5 ownership amendment is accepted: the existing entries `packages/todo/src/visibility.ts`, `packages/todo/src/widget-layout.ts`, `packages/todo/test/helpers.ts`, and `packages/todo/test/visibility.test.ts` are implementation/T5. The existing visibility regression test covers the four canonical results, all visibility modes, and unknown/missing-action hiding. The user renewed T9 acceptance after a GO decision review. T5 is complete: all 14 T5 entries have post-task hashes, 13 paths changed, and the existing visibility regression entry is unchanged. Independent validation passed focused 6 files/31 tests, full 12 files/69 tests, typecheck, diff-check, four-tool registration smoke, and legacy scan.

## T4 Revalidation and Reconciliation

Independent final T4 revalidation passed direct 7/7 checks, focused 31/31 checks, full 12 files/69 tests, typecheck, and four-tool/8-hook/render smoke. It also passed publication ordering, queue and atomicity, projection, checkpoint, functional, and 41-path boundary/status checks. The bounded consumer-wiring repair leaves exactly two expected completed-owner drift entries: `packages/todo/src/tool.ts` raw SHA-256 `67ab66399e257ceb92abc818dc59d78c89571c9ebad121f25c2af6ae91802316` and `packages/todo/test/index.test.ts` raw SHA-256 `e08d891569f11a2926875fa836d7839bf0601934b3c1bb6eb095bf227bb9d4df`. `packages/todo/src/index.ts` retains its recorded raw SHA-256 `4014f43f2fd59734981afaa0d4643de197a7b423552da95dfd095bc535a0e326`. Updating those two manifest entries is the sole T4 reconciliation; no source, test, inventory, classification, owner, baseline, protocol, schema, state, restore, or task-graph change is made here.

## 4. Legacy Shape

Legacy restore accepts only strict root `{phases,workingOn?}`, phase `{name,tasks}`, and task `{name,description,status}`. `status` is required, never optional, and uses the canonical enum. All objects reject unknown keys, including `legacyIdentifier`, which is not an input field. Phase names are globally unique and task names unique within each phase. Phase maps to task group and task maps to todo, preserving order. Supplied `workingOn` must match the derived first in-progress description and must be absent when no task is in progress. Legacy is restore-only.

## 5. Host Checkpoint Evidence

The following supplied read-only Host evidence remains the basis for the recorded checkpoint boundary:

| Field | Recorded evidence |
| --- | --- |
| Host package | `@earendil-works/pi-coding-agent` 0.84.2 |
| Resolved package path | `E:/Projects/pi-packages/node_modules/@earendil-works/pi-coding-agent` (`package.json` version `0.84.2`) |
| Key source hashes | `E:/Projects/pi-packages/node_modules/@earendil-works/pi-coding-agent/dist/core/agent-session.js` SHA-256 `9f065b4a277857db100e3277c4d18316c89cd46b11f6ba8140122f19efbe47c4`; `.../dist/core/session-manager.js` SHA-256 `af809d47818a3bf6a10173c167905e013ad7303261919a5a35a8466b801daf2e`. These are raw-byte SHA-256 values for the inspected Host files. |
| Directly verified Host path | `AgentSession` handles `message_end` by calling `SessionManager.appendMessage`; `SessionManager` updates branch/leaf state and exposes the record through `getBranch`. The exact inspected symbols are `AgentSession`, `_handleAgentEvent`, `appendMessage`, and `getBranch`. |
| Negative seam evidence | The inspected 0.84.2 `ReadonlySessionManager` exposes no `append`, `flush`, or `ack` seam. This is scoped to the inspected Host source and is not a claim about future versions. |

The protocol conclusion is deliberately narrow: only a successful complete Todo tool result that Host has actually recorded and that is observable in the current session branch through `getBranch()` is a branch-local restore checkpoint. Extension return is not an append or persistence acknowledgement. If the execute-to-`toolResult` internal generation order is not independently established by current authority, Todo does not use it as a normative premise. No pi-agent-core loaded-byte identity is required, inferred, or used. No fsync, power-loss durability, cross-branch restore, or future-version behavior is claimed.

## 6. Negative Evidence and Lifecycle

Renewed T9 is complete for the exact final Work/Context/Spec/Plan/Tasks tuple after the GO decision review and the user's acceptance of the final T5 ownership amendment. This acceptance preceded T5 implementation evidence. T5 is complete after its 14-path manifest reconciliation: 13 paths differ from baseline and the existing `packages/todo/test/visibility.test.ts` entry equals baseline. T4 is functionally and boundary revalidated and becomes durably complete only through its two-hash manifest reconciliation. T6, T7, and T8 are also complete based on the full validation, independent review, and live activation evidence recorded below. No pending T6-T8 lifecycle state remains.

The prior accepted review baseline is the following raw-byte SHA-256 set: Work `e37e4aef3d3b24a18bd98eba6eb5f502db80e70fd2ca39a7f43b587facb52e02`; Context `314d4699f442b235dd9d3b96b084f9da4f3044a855d2fc013b1b6292aee1340b`; Spec `a71e9f2d47d0d4470273910984792ccb1e1533ec55ec943748bb82de79051abf`; Plan `2bb56beb2162e7f92722fc15464eb5c8a2d4150dc5d57eb6ebda2c9d7412dc33`; Tasks `f699963d4b27d23d6eb971f8c24f45ee3521e9db1b97e7e7ce905eaa97f52063`.

## 7. T6 Full Validation

Fresh read-only T6 validation confirmed all five authority hashes against current raw bytes; the frozen manifest contains 41 entries and 24 post-task hashes with zero mismatches, and its aggregate SHA-256 is `58ded69287e2a2d45a21d1d107c8ae68773589c4f30df3fe6853ce1ad2fcd4a9`. From `packages/todo`, `bun run typecheck` passed and `bun run test` passed with 12 test files and 69 tests. No files were modified by T6. T7 and T8 subsequently completed on the evidence recorded in this document. Git commit activity is outside T0-T8 and remains excluded from this amendment.

The prior confirmation authorized implementation in the exact order T9 -> T0 -> T1 -> T3 -> T2 -> T5 -> T4 -> T6 -> T7 -> T8. T0 reconciled the frozen 41-path manifest without changing its inventory, classifications, owners, or baseline hashes. T1 completed with 7/7 focused tests, T3 completed with 7/7 focused tests, and T2 completed with 20/20 focused tests; their current post-task hashes are recorded in `evidence/t0-manifest.json`. T5 completed its 14-path boundary with raw-byte post-task hashes recorded in the manifest: focused 6 files/31 tests, full 12 files/69 tests, typecheck, diff-check, four-tool registration smoke, and legacy scan all passed; 13 paths changed and the existing visibility regression entry is unchanged. T4 then passed direct 7/7, focused 31/31, full 12 files/69 tests, typecheck, four-tool/8-hook/render smoke, publication ordering, queue/atomicity, projection, checkpoint, functional, and boundary/status revalidation. The two expected completed-owner drifts are reconciled as current raw-byte `postTaskSha256` values for `src/tool.ts` and `test/index.test.ts`; `src/index.ts` retains its recorded value. The four existing ownership-amendment paths remain implementation/T5. No protocol, schema, state semantics, restore boundary, task graph, or path inventory changed.

## 8. T10 Boundary and Implementation Evidence

The accepted T10 implementation addresses two correctness defects in already completed paths. `session_start` and `session_tree` both route through `TodoCoordinator.restore`; restore replaces coordinator state and immediately projects the widget. Widget lifecycle is module-local and keyed by UI, so a prior open-state mutation on the same UI could leave `hadOpenTodos` and a terminal-clear timer live. The repair resets that lifecycle at the shared restore boundary before projection, cancelling the stale timer and deleting the lifecycle entry without changing normal mutation behavior.

The implementation also narrows checkpoint success to `toolResult.isError` with boolean value `false`. `true`, missing, string, number, object, array, and null candidates use the existing non-payload skip diagnostic and scanning continues to an older valid checkpoint.

The exact implementation and regression boundary is five existing paths: `packages/todo/src/widget.ts`, `packages/todo/src/tool.ts`, `packages/todo/src/persistence.ts`, `packages/todo/test/index.test.ts`, and `packages/todo/test/persistence.test.ts`. The canonical verification record is [evidence/t10-technical-validation.md](evidence/t10-technical-validation.md). It records the accepted and implemented lifecycle, GO technical validation, five current hashes, historical owner/hash provenance, manifest identities, and remaining fresh post-implementation review and commit gates.

## 9. T10 Manifest Evidence Semantics

T10 preserves the five existing entries' classifications and original owner history: `src/widget.ts` is implementation/T5, `src/tool.ts` and `test/index.test.ts` are implementation/T2, and `src/persistence.ts` and `test/persistence.test.ts` are implementation/T3. Their pre-T10 `postTaskSha256` values remain historical evidence, while the current T10 hashes are reconciled in `evidence/t0-manifest.json`.

The 41-entry ordered path list remains unchanged and unique. Exactly the five T10 paths differ from their historical `postTaskSha256` values; all other 19 recorded post-task hashes match current raw bytes. The aggregate is recomputed from the unchanged ordered entries, and raw/derived manifest identities are recorded in the canonical T10 evidence. No new inventory path, owner, classification, or implementation scope is introduced.

T10 is accepted and implemented, and its technical validation is GO. Fresh correctness review is GO with P0-P3=0, and fresh evidence/selective-boundary review is GO with P0-P3=0. The current local commit candidate contains 34 Todo paths with no staged paths; it is reviewed and pending explicit user submission authorization. No commit has been made. The five current `postTaskSha256` values, 41-entry manifest identities, and `index` empty state are recorded in the canonical evidence.

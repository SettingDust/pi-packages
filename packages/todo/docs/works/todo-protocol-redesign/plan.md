# Plan: Todo Four-Tool Protocol

- Status: **T0 through T8 complete. T10 complete with technical validation and both fresh final reviews GO (P0-P3=0); 34-path commit candidate reviewed and pending explicit user submission authorization.**
- Owner: `packages/todo`
- Related Work: [work.md](work.md)
- Related Context: [context.md](context.md)
- Governing Spec: [spec.md](spec.md)
- Governing Tasks: [tasks.md](tasks.md)

## 1. Objective and Non-goals

Implement exactly four tools over one shared coordinator and canonical `{name,todos}` groups, with restore-only legacy `{name,tasks}` migration. Creation is `{name,description}` and always produces `pending`; transitions alone change lifecycle. Keep Host session tool-result restore semantics. Do not add package-owned persistence, sidecar/database storage, adapter, or Pi-core seam. T8 completed the README/CHANGELOG public clean-break documentation; LICENSE remains excluded.

## 2. Minimum Strategy

Use one strict schema source, or prove provider/runtime equivalence. The coordinator queues mutations by invocation order, validates current state, builds and validates a complete candidate, atomically replaces memory, updates projections, and returns. `todo_view` reads only. Restore accepts only successful complete canonical Todo tool results that Host has actually recorded and that are observable in the current branch through `getBranch()`. Extension execute return is not append or persistence acknowledgement. If the execute-to-`toolResult` internal generation order is not independently established by current authority, it is not a normative premise. Legacy is parsed only after unambiguous canonical discrimination failure. Runtime must enforce trimmed non-empty values, exact case-sensitive matching, uniqueness, duplicate transition targets, derived active group/`workingOn`, and atomicity.

## 3. Producer-First Dependencies and Owner Handoffs

The executable graph is serial and exact: **T9 confirmation -> T0 manifest -> T1 types/schemas/state -> T3 persistence/restore -> T2 shared coordinator and four handlers -> T5 projections -> T4 integration verification -> T6 full validation -> T7 independent review -> T8 docs/lifecycle**. T4 verifies only behavior already produced by T2 and T5; it is not a prerequisite for handler production. Each arrow is a mechanical dependency and the Tasks table must remain identical.

Owner handoff: T0 owns the frozen 41-path manifest; T1 owns types/schema/state paths; T3 owns persistence paths; T2 owns registration/handler paths; T5 owns consumer paths, including the four existing implementation/T5 entries `packages/todo/src/visibility.ts`, `packages/todo/src/widget-layout.ts`, `packages/todo/test/helpers.ts`, and `packages/todo/test/visibility.test.ts`; T4 owns no implementation path and records integration evidence; T6 owns no implementation path and records validation output; T7 owns separate review evidence; T8 owns README/CHANGELOG and authorized lifecycle reconciliation. Shared authority documents remain protected and are reconciled in T0 owner order.

T5 exact boundary: `packages/todo/src/visibility.ts` uses the canonical result set; `packages/todo/src/widget-layout.ts` uses task/todo canonical projections; `packages/todo/test/helpers.ts` uses `TodoCreation`; and the existing `packages/todo/test/visibility.test.ts` entry verifies the four canonical results (`set`, `add`, `transition`, `view`), the `all`, `set-only`, and `none` visibility modes, and hiding of unknown or missing actions. The final ownership amendment is accepted by renewed T9 after a GO decision review. T5 is complete: all 14 owned paths have post-task hashes; 13 changed and the existing visibility regression entry is unchanged.

## 4. T0 Manifest and Reconciliation

When implementation is authorized, T0 creates only `packages/todo/docs/works/todo-protocol-redesign/evidence/t0-manifest.json`, UTF-8/LF, with strict fields `manifestVersion`, `work`, `entries`, `aggregateSha256`, and `reconciliation`. Every entry has `path`, `classification`, `owner`, and raw-byte `baselineSha256`; completed owner evidence adds applicable `postTaskSha256`. Entries are sorted by normalized repository path UTF-8 bytes. Aggregate is SHA-256 of compact JSON UTF-8/LF serialization of ordered entries, without trailing newline. Authority hashes cover all five documents.

Reconciliation runs before each T1-T8 step. Unstarted owners equal baseline; completed owners equal post-task hash. Shared paths hand off in owner order and equal prior post-task hash. The sole new-path exception is the recorded T0 manifest. Any other new path, unowned dirty path, missing path, or mismatch blocks and requires authority amendment, fresh review, new five-document hashes, and renewed T9. T5 reconciliation records raw-byte `postTaskSha256` for its 14 existing entries, with 13 changed hashes and the unchanged `packages/todo/test/visibility.test.ts` hash; no inventory, classification, owner, or baseline changed.

For T10, the five existing implementation entries retain their original owner and classification: `src/widget.ts` remains T5, `src/tool.ts` and `test/index.test.ts` remain T2, and `src/persistence.ts` and `test/persistence.test.ts` remain T3. Their pre-T10 `postTaskSha256` values are historical owner evidence. After authorized implementation, update only those five entries' current `postTaskSha256` values, record T10 repair provenance with the pre-T10 and T10 hash mapping and verification/review evidence, and recompute `aggregateSha256` plus any raw or derived manifest identity from the unchanged ordered 41-entry list. The recomputed identities are derived evidence, not an added path or scope change.

The frozen inventory remains exactly these 41 paths and owners:

| Path | Classification | Owner |
| --- | --- | --- |
| `packages/todo/CHANGELOG.md` | public-breaking-doc | T8 |
| `packages/todo/LICENSE` | excluded | none |
| `packages/todo/README.md` | public-breaking-doc | T8 |
| `packages/todo/docs/works/todo-protocol-redesign/context.md` | protected | T0 |
| `packages/todo/docs/works/todo-protocol-redesign/plan.md` | protected | T0 |
| `packages/todo/docs/works/todo-protocol-redesign/spec.md` | protected | T0 |
| `packages/todo/docs/works/todo-protocol-redesign/tasks.md` | protected | T0 |
| `packages/todo/docs/works/todo-protocol-redesign/work.md` | protected | T0 |
| `packages/todo/package.json` | protected | T0 |
| `packages/todo/src/format.ts` | implementation | T5 |
| `packages/todo/src/glyphs.ts` | protected | T0 |
| `packages/todo/src/index.ts` | implementation | T2 |
| `packages/todo/src/persistence.ts` | implementation | T3 |
| `packages/todo/src/reminder-cadence.ts` | protected | T0 |
| `packages/todo/src/reminder.ts` | implementation | T5 |
| `packages/todo/src/renderer.ts` | implementation | T5 |
| `packages/todo/src/schema.ts` | implementation | T1 |
| `packages/todo/src/settings.ts` | protected | T0 |
| `packages/todo/src/state.ts` | implementation | T1 |
| `packages/todo/src/tool-frame.ts` | implementation | T5 |
| `packages/todo/src/tool.ts` | implementation | T2 |
| `packages/todo/src/types.ts` | implementation | T1 |
| `packages/todo/src/visibility.ts` | implementation | T5 |
| `packages/todo/src/widget-component.ts` | protected | T0 |
| `packages/todo/src/widget-layout.ts` | implementation | T5 |
| `packages/todo/src/widget.ts` | implementation | T5 |
| `packages/todo/test/format.test.ts` | implementation | T5 |
| `packages/todo/test/helpers.ts` | implementation | T5 |
| `packages/todo/test/index.test.ts` | implementation | T2 |
| `packages/todo/test/persistence.test.ts` | implementation | T3 |
| `packages/todo/test/reminder-cadence.test.ts` | protected | T0 |
| `packages/todo/test/reminder.test.ts` | implementation | T5 |
| `packages/todo/test/renderer.test.ts` | implementation | T5 |
| `packages/todo/test/schema.test.ts` | implementation | T1 |
| `packages/todo/test/settings.test.ts` | protected | T0 |
| `packages/todo/test/state.test.ts` | implementation | T1 |
| `packages/todo/test/tool-frame.test.ts` | implementation | T5 |
| `packages/todo/test/visibility.test.ts` | implementation | T5 |
| `packages/todo/test/widget.test.ts` | implementation | T5 |
| `packages/todo/tsconfig.json` | protected | T0 |
| `packages/todo/vitest.config.ts` | protected | T0 |

## 5. Verification and Lifecycle

T1 verifies exact schemas and runtime invariants. T3 verifies the directly inspected `@earendil-works/pi-coding-agent` 0.84.2 Host branch checkpoint behavior, including the recorded Host source paths and raw-byte hashes, `message_end` -> `AgentSession.appendMessage`, `SessionManager.getBranch` observability, strict legacy mapping, and skip diagnostics. T3 does not verify or require any pi-agent-core loaded-byte, runtime-loaded-core, or core raw-hash identity. T2 verifies four handlers and result shapes. Recorded completion evidence is T1 7/7 focused tests, T3 7/7 focused tests, and T2 20/20 focused tests. T5 completed its 14-path consumer boundary after independent validation passed focused 6 files/31 tests, full 12 files/69 tests, typecheck, diff-check, four-tool registration smoke, and legacy scan; its manifest entries show 13 changed paths and one unchanged existing visibility regression test. T4 is complete after independent direct 7/7, focused 31/31, full 12 files/69 tests, typecheck, and four-tool/8-hook/render smoke passed, along with publication ordering, queue/atomicity, projections, checkpoint semantics, and 41-path boundary/status revalidation. Its bounded consumer-wiring repair requires only the current raw-byte `postTaskSha256` values for `src/tool.ts` and `test/index.test.ts`; `src/index.ts` remains unchanged. T6 completed fresh read-only validation: all five authority hashes matched, manifest integrity passed with 41 entries and 24 post-task hashes, aggregate SHA-256 `58ded69287e2a2d45a21d1d107c8ae68773589c4f30df3fe6853ce1ad2fcd4a9`, `bun run typecheck` passed, and `bun run test` passed with 12 files/69 tests. T7 completed with no P0-P2 correctness findings, subject only to the live-activation P3 limitation. T8 completed after the recorded Pi 0.84.4 live smoke loaded the installed extension, observed the exact four-tool active inventory, executed all four tools, and dispatched all eight lifecycle handlers without failure; README and CHANGELOG now document the clean-break protocol. The smoke remains limited to that Host/version/run and does not prove power-loss durability, cross-branch restore, or future Host-version behavior.
This Plan remains accepted for the exact final tuple including the accepted T5 ownership amendment and T10 repair amendment. T0 through T8 are complete; T10 implementation and technical validation are complete as recorded in `evidence/t10-technical-validation.md`. The four existing ownership-amendment paths remain implementation/T5. No protocol, schema, state semantics, task dependency, or path inventory changed.

## 6. T10 Accepted Correctness-Repair Plan

T10 is accepted, implemented, technically validated, and freshly reviewed. Correctness review is GO with P0-P3=0; evidence/selective-boundary review is GO with P0-P3=0. The reviewed local commit candidate contains 34 Todo paths, has no staged paths, and is pending explicit user submission authorization. No commit has been made.

The implementation resets the current UI's stale terminal lifecycle before the shared restore projection, cancelling its stale clear timer and removing the lifecycle entry. Normal mutation terminal summaries retain their five-second behavior. Checkpoint eligibility requires `toolResult.isError === false` with boolean type; `true`, missing, and non-boolean values use the existing skip-and-continue path rather than overriding an older valid checkpoint.

No other source or test path, manifest inventory, classification, owner, baseline, schema, state model, `workingOn`, Host checkpoint source, sidecar/database persistence, Pi-core surface, dependency, setting, public document, or Git state is in T10 scope. The complete hash mapping and verification facts are in `evidence/t10-technical-validation.md`.

### T10 Manifest Evidence Semantics

T10 retains the original classification and owner history for all five existing implementation entries: `src/widget.ts` is T5; `src/tool.ts` and `test/index.test.ts` are T2; `src/persistence.ts` and `test/persistence.test.ts` are T3. Their pre-T10 `postTaskSha256` values remain historical evidence, and their current raw-byte T10 hashes are recorded in the manifest and canonical evidence. The ordered 41-entry inventory remains unchanged and unique; the aggregate and manifest raw/derived identities are derived from that same list. No additional path or scope is implied.

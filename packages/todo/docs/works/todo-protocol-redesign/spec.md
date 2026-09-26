# Spec: Todo Multi-Tool Protocol

- **Status**: **Accepted baseline T0-T8/T9/T10 evidence and accepted complete-removal amendment; A0 21-path ownership inventory reconciled; bounded implementation boundary authorized; implementation verification pending. The exact Section 1 T0 presentation-anchor amendment candidate with SHA-256 `70fea8a639db2a2ba2a35d21be375d6d3ee458511fd55c73fe60620b3094695e` passed independent B1 authority review as `GO_COMPACT_SPEC_AMENDMENT`, P0=0/P1=0/P2=0/P3=0, and was subsequently explicitly accepted at Gate B; that narrow amendment is now accepted authority and T1 synchronization may begin.** Runtime acceptance is held outside this document; this Spec records the accepted contract and gates, not an acceptance receipt or digest. The candidate-stage label in Section 1 remains byte-for-byte part of the exact accepted subject and does not override this later lifecycle status. This lifecycle-only write changes the containing Spec file hash but not the identified accepted subject or any normative contract. Compact Work/Context/Plan remain draft and unaccepted; T1 output, T2, Gate C, implementation Tasks, and UI implementation remain unaccepted and unauthorized.
- **Owner**: `packages/todo`
- **Removal Work**: [`../todo-workingon-contract/work.md`](../todo-workingon-contract/work.md)
- **Removal Context**: [`../todo-workingon-contract/context.md`](../todo-workingon-contract/context.md)
- **Removal Plan**: [`../todo-workingon-contract/plan.md`](../todo-workingon-contract/plan.md)
- **Removal Tasks**: [`../todo-workingon-contract/tasks.md`](../todo-workingon-contract/tasks.md)

## 1. Accepted Baseline Boundary and Model

Exactly four provider-visible tools exist: `todo_set`, `todo_add`, `todo_transition`, and `todo_view`. One coordinator owns validation, committed state, invocation-order serialization, projections, and results. The canonical snapshot is exactly `{tasks}`. A task group is exactly `{name,todos}`. A todo is exactly `{name,description,status}`. All objects use `additionalProperties:false`.

Names and descriptions must be trimmed non-empty strings. Matching is exact and case-sensitive. Task names are globally unique and todo names are unique within a task. Status is exactly one of `pending`, `in_progress`, `completed`, `cancelled`. New todos are always `pending`. Multiple task groups may contain `in_progress` todos simultaneously; each group remains represented in `tasks` and no single active summary is selected or derived.

**Unaccepted T0 presentation-anchor amendment candidate (not authority):** For presentation only, a consumer may derive a deterministic read-only anchor from existing canonical task and todo order. This creates no canonical primary, selected, or unique active todo; does not mutate, serialize, persist, write back, or feed business logic; does not compress or replace active groups; and introduces no priority, timestamp, hidden selection, or fallback state. Every group containing `in_progress` todos remains independently represented, and the prohibition on a canonical or protocol single-active summary remains in force. This candidate changes no request, result, schema, canonical state, restore, queueing, persistence, tool behavior, complete-removal authority, implementation boundary, or other protocol contract.

## 2. Exact Request Schemas

JSON Schema draft 2020-12 applies. These are the complete request contracts; every listed object has `additionalProperties:false` and every omitted property is rejected. `minItems` is normative.

```json
{"type":"object","additionalProperties":false,"required":["tasks"],"properties":{"tasks":{"type":"array","minItems":0,"items":{"type":"object","additionalProperties":false,"required":["name","todos"],"properties":{"name":{"type":"string"},"todos":{"type":"array","minItems":0,"items":{"type":"object","additionalProperties":false,"required":["name","description"],"properties":{"name":{"type":"string"},"description":{"type":"string"}}}}}}}}}
```

`todo_set` accepts only `{tasks}`. It replaces the complete state; each creation item is exactly `{name,description}` and produces status `pending`. It does not accept `status` or `initialTransitions`.

```json
{"type":"object","additionalProperties":false,"required":["task","todos"],"properties":{"task":{"type":"string"},"todos":{"type":"array","minItems":1,"items":{"type":"object","additionalProperties":false,"required":["name","description"],"properties":{"name":{"type":"string"},"description":{"type":"string"}}}}}}
```

`todo_add` accepts only `{task,todos}`. `task` is the exact, case-sensitive name of an existing group. Each new todo is pending.

```json
{"type":"object","additionalProperties":false,"required":["transitions"],"properties":{"transitions":{"type":"array","minItems":1,"items":{"type":"object","additionalProperties":false,"required":["task","todo","status"],"properties":{"task":{"type":"string"},"todo":{"type":"string"},"status":{"type":"string","enum":["pending","in_progress","completed","cancelled"]}}}}}}
```

`todo_transition` accepts only `{transitions}`. Every transition item is exactly `{task,todo,status}`. Duplicate transition targets are rejected. Unknown input is rejected by the strict schema.

```json
{"type":"object","additionalProperties":false,"required":[],"properties":{}}
```

`todo_view` accepts only `{}` and never mutates or writes persistence. Runtime invariants include trimmed non-empty values, uniqueness, exact existing-name lookup, duplicate transition targets, atomicity, queue ordering, preservation of each group's todo statuses, and restore classification.

## 3. Results, Errors, Queue, and Atomicity

Success is exactly `{result,snapshot}`, with result `set`, `add`, `transition`, or `view`. Failure is exactly `{result:"error",error:{code,message}}`; error messages must not expose payload values. Invalid request, duplicate names, missing task/todo, and duplicate transition target are rejected according to the documented precedence and transition/source order.

The coordinator serializes mutations in invocation order, validates current state, builds a complete candidate, checks runtime invariants, atomically replaces committed state, updates widget/reminder/formatter projections, then returns. A failed mutation changes neither state nor projections. No package-owned persistence operation occurs before or after publication.

## 4. Restore and Accepted Host Boundary

Only a successful complete canonical Todo `toolResult` already present in the current session branch is a branch-local restore checkpoint. `execute` return is not append or persistence acknowledgement. Restore scans current branch records, newest completion sequence first, then nearest ancestors; ties use physical position. Invalid, incomplete, failed, wrong-tool, wrong-version, and malformed records are skipped with one non-payload diagnostic per candidate; no valid record yields `{tasks:[]}`.

Host checkpoint evidence is pinned only to the directly inspected `@earendil-works/pi-coding-agent` 0.84.2 files and establishes the Host branch boundary only. It does not claim pi-agent-core loaded-byte, runtime-loaded-core-module, or future-version identity.

## 5. Legacy Restore

Legacy parsing occurs only after canonical discrimination fails and the root is unambiguously legacy. Strict root shape is `{phases}` with required `phases`; phase shape is exactly `{name,tasks}`; task shape is exactly `{name,description,status}`. `status` is required, uses the same enum, and is never optional. Every object rejects unknown keys, including `legacyIdentifier`. Names/descriptions are trimmed non-empty; phase names are globally unique and task names unique within each phase. Phase maps to task group and task maps to todo, preserving order. Legacy is restore-only and maps no identifier.

## 6. Accepted Complete-Removal Amendment (A0 Reconciled)

This section is the accepted normative amendment. It supersedes any baseline wording that defines a `workingOn` field or projection. The current session acceptance is held outside the documents; no acceptance receipt or digest is recorded here.

The clean break is exact: there is **no request-level `workingOn`**, **no `TodoState.workingOn`**, **no snapshot or restore `workingOn` field or alias**, **no setter**, **no compatibility parsing**, **no dual-read**, **no dual-write**, and **no migration window**. Empty fields and equivalent single-value summaries are also forbidden. `workingOn` must not be accepted, produced, persisted, restored, rendered, or consumed anywhere in the Todo contract.

The canonical snapshot/result remains `{tasks}` and preserves every non-target field and behavior in sections 1-5. Multiple groups with status-expanded todos remain independently represented; they are never compressed into a single active summary. The four tool names, non-target request fields, statuses, queue order, failed-mutation atomicity, persistence boundary, canonical/legacy discrimination, and non-target restore behavior remain as specified above.

Remove only the dedicated request assertion/schema/type/error paths, state derivation, snapshot/result serialization, checkpoint/restore and legacy rules, and formatter/reminder/renderer/visibility/widget/layout/component/lifecycle/compaction or other consumer projections that exist solely for `workingOn`. In `renderer.ts`, the implementation must no longer call `selectedTodoTaskIndex` or any removed first-active summary, while preserving `renderResult` rows, tool/result rendering, and all non-`workingOn` behavior. Public documentation, tests, helpers, and fixtures must not preserve obsolete semantics or compatibility promises.

The A0 ownership inventory is complete and reconciled to the user-authorized 21-path boundary:

- **Source (11):** `packages/todo/src/state.ts`, `packages/todo/src/types.ts`, `packages/todo/src/persistence.ts`, `packages/todo/src/format.ts`, `packages/todo/src/reminder.ts`, `packages/todo/src/widget-layout.ts`, `packages/todo/src/widget-component.ts`, `packages/todo/src/widget.ts`, `packages/todo/src/renderer.ts`, `packages/todo/src/schema.ts`, `packages/todo/src/tool.ts`.
- **Tests (8):** `packages/todo/test/state.test.ts`, `packages/todo/test/persistence.test.ts`, `packages/todo/test/format.test.ts`, `packages/todo/test/reminder.test.ts`, `packages/todo/test/widget.test.ts`, `packages/todo/test/index.test.ts`, `packages/todo/test/renderer.test.ts`, `packages/todo/test/schema.test.ts`.
- **Public documentation (2):** `packages/todo/README.md` and current/unreleased claims in `packages/todo/CHANGELOG.md`.

The total is **21 implementation boundary paths**. `packages/todo/pnpm-lock.yaml` and `packages/todo/pnpm-workspace.yaml` are explicit exclusions and must not be added to the boundary or commit.

The current worktree contains changes across the 21 boundary paths. This Spec does not treat those changes, or this documentation reconciliation, as proof that source implementation is complete. Later implementation verification must explicitly recheck that `packages/todo/src/schema.ts` has no request-level `workingOn` property and that `packages/todo/src/tool.ts` has no old `workingOn` error branch. It must also recheck renderer removal of `selectedTodoTaskIndex`/first-active summary usage while preserving `renderResult` rows and tool/result rendering.

The supplied current verification evidence records 11 test files and `git diff --check` passing. No reproducible typecheck evidence is recorded here; typecheck remains a required implementation and commit gate. Fresh same-byte authority review and final implementation verification remain required. The accepted amendment authorizes only the bounded 21-path implementation; it does not certify implementation completion, commit, merge, reload, deploy, or release. Rollback must restore a complete mutually compatible Spec, Work, Context, Plan, Tasks, source, test, fixture, and documentation artifact set; partial restoration is invalid.

## 7. Historical Baseline Evidence (Non-Authoritative for Complete Removal)

The former T9/T10 records, focused checks, typecheck, runtime replay, Host smoke, ownership manifests, and review outcomes describe the prior accepted baseline and its later correctness repair. They are retained as historical provenance only. They do not prove that the complete-removal amendment is implemented, source-verified, or complete, and they do not satisfy the later T1-T6 implementation or verification evidence requirements.

## 8. Consumer and Exclusion Boundary

Under the accepted contract, formatter, widget, tool frame, reminder, and compaction read only the coordinator snapshot, render required fields and empty/error states, and do not maintain a second model or mutate state. Those consumers must have no dedicated `workingOn` projection. Excluded remain IDs, rename/edit/delete, current-call legacy compatibility, package persistence infrastructure, filters, pagination, and provider variants.

### Compact Widget Status Counts

In the persistent compact Todo widget's first summary row only, each status count must be displayed as `<glyph> <decimal count>` instead of a status-name/count label, with one ordinary space (U+0020) between each glyph and count in both glyph modes. The row must retain the `Todos` title, the existing ` · ` separators, the fixed order `in_progress`, `pending`, `completed`, `cancelled`, and all four counts including zeros. For this count row, `in_progress` uses the static Nerd Font `nf-md-progress_clock` glyph `󰦖` (U+F0996), or `◔` (U+25D4) with `fallbackGlyphs`. The remaining counts keep the existing `todoGlyph(status, fallbackGlyphs)` mapping: by default `pending` uses `󰄰` (U+F0130), `completed` uses `󰄴` (U+F0134), and `cancelled` uses `󰍷` (U+F0377); fallback glyphs are `○` (U+25CB), `✓` (U+2713), and `×` (U+00D7), respectively. No new font-detection behavior or configuration is introduced. For example, counts of 1, 2, 0, 0 render as `Todos  󰦖 1 · 󰄰 2 · 󰄴 0 · 󰍷 0` before existing theme and width fitting.

The existing width fitting and one-to-two nonblank-row bound must remain unchanged; narrow widths may truncate the row under existing rules. The optional anchor row, detail overlay, tool rendering, model-context/reminder strings, status data and counts, widget visibility/lifecycle, and navigation must not change. Verification must check both default and fallback glyphs, all four zero and nonzero counts in order, and width-bounded rendering without changing row count or anchor selection.

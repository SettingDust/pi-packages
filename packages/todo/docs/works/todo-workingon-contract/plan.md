# Plan: Todo `workingOn` clean-break authority reconciliation

- **状态**：accepted amendment / A0 reconciled / bounded implementation authorized / verification incomplete
- **Owner**：`packages/todo`
- **Governing Spec**：[`../todo-protocol-redesign/spec.md`](../todo-protocol-redesign/spec.md)
- **Work**：[`work.md`](./work.md)
- **Context**：[`context.md`](./context.md)
- **Tasks**：[`tasks.md`](./tasks.md)

## 1. Objective and scope

Synchronize the accepted clean-break authority with the user-selected 21-path implementation boundary. The immediate outcome is documentation reconciliation only. The later implementation must remove `workingOn` without changing four-tool behavior, multi-group status semantics, queue ordering, failed-mutation atomicity, persistence/recovery, renderer behavior, or widget behavior outside this field.

The two newly authorized source owners are `packages/todo/src/schema.ts` and `packages/todo/src/tool.ts`. `packages/todo/pnpm-lock.yaml` and `packages/todo/pnpm-workspace.yaml` are explicit non-boundary metadata and remain excluded.

## 2. Ownership handoff

| Phase | Observable outcome | Exact boundary |
| --- | --- | --- |
| A0 | Accepted amendment and frozen ownership inventory reconciled to 21 paths. | Governing Spec plus the Work/Context/Plan/Tasks tuple |
| T1 | Request/schema/type/state clean break; no request-level `workingOn`, including strict schema rejection. | `src/schema.ts`, `src/types.ts`, `src/state.ts`, `test/schema.test.ts`, `test/state.test.ts` |
| T2 | Tool/coordinator/result handling no longer exposes the old `workingOn` error branch or contract. | `src/tool.ts`, `test/index.test.ts` |
| T3 | Persistence, checkpoint, canonical restore and legacy restore no longer retain a dedicated `workingOn` path. | `src/persistence.ts`, `test/persistence.test.ts` |
| T4 | Formatter, reminder, renderer, widget and layout/component consumers preserve non-target behavior without a dedicated summary. | `src/format.ts`, `src/reminder.ts`, `src/widget-layout.ts`, `src/widget-component.ts`, `src/widget.ts`, `src/renderer.ts`, `test/format.test.ts`, `test/reminder.test.ts`, `test/widget.test.ts`, `test/renderer.test.ts` |
| T5 | Public documentation and current/unreleased claims match the accepted clean break without a compatibility promise. | `README.md`, `CHANGELOG.md` |
| T6 | Full boundary verification proves clean break, preserved semantics, excluded metadata, and required typecheck evidence. | Verification outputs only; read-only checks over the 21 paths |

The source rows contain 11 paths, the test rows contain 8 paths, and T5 contains 2 public-document paths: 21 in total. No task may expand into unlisted source, tests, dependencies, pnpm metadata, Pi core, runtime, or Git operations.

## 3. Ordered execution and lifecycle

The dependency order is **A0 -> T1 -> T2 -> T3 -> T4 -> T5 -> T6**. The current worktree contains changes across the 21-path boundary, but T1-T5 are not marked complete by this reconciliation. The supplied 11-test-file and diff-check results are recorded evidence, not a substitute for the missing reproducible typecheck result or fresh same-byte authority review.

Implementation verification must explicitly recheck that `src/schema.ts` has no request-level `workingOn` property and that `src/tool.ts` has no old `workingOn` error branch. Renderer verification must recheck removal of `selectedTodoTaskIndex`/first-active summary usage and preservation of `renderResult` rows and tool/result rendering.

## 4. Verification, rollback, and completion

- T1/T2: strict schemas, parser paths, types, state, tool handlers, result shapes, and error mappings reject the removed field and preserve non-target inputs.
- T3: canonical and legacy restore, checkpoint scanning, malformed candidates, and failure handling retain their non-target contracts.
- T4: multiple groups remain independently represented; renderer/widget/formatter/reminder projections do not recreate a single-value summary.
- T5: README and CHANGELOG do not promise compatibility or preserve obsolete semantics.
- T6: reproduce the package test evidence, run renderer coverage, run `git diff --check`, and obtain a reproducible typecheck. Until typecheck is evidenced, the implementation/commit gate stays open.

Rollback must restore a mutually compatible Spec, Work, Context, Plan, Tasks, source, tests, and public-document artifact set. Restoring only one field or one document is invalid. The documentation outcome is complete when the five authority documents agree on lifecycle, exact boundary, exclusions, and gates; source implementation remains incomplete until later evidence closes them.

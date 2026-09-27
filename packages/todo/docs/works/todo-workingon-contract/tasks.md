# Tasks: Todo `workingOn` clean-break authority reconciliation

- **状态**：administratively completed by explicit user direction; T1-T5 implementation evidence remains present but unverified, and T6/review gates remain open
- **Owner**：`packages/todo`
- **Governing Spec**：[`../todo-protocol-redesign/spec.md`](../todo-protocol-redesign/spec.md)
- **Governing Work**：[`work.md`](./work.md)
- **Governing Context**：[`context.md`](./context.md)
- **Governing Plan**：[`plan.md`](./plan.md)

## Administrative closure

用户已明确将本 Work 按完成处理，作为状态簿记关闭。T1-T5 的 `implementation present` 仍是 worktree 状态而非验证通过；T6、review、typecheck、commit 和发布证据不被此关闭补足。

The clean break removes request-level and canonical `workingOn` plus every dedicated serialization, restore, error, setter, compatibility, and consumer projection path. It keeps four tools, multi-active-group status behavior, non-target request fields, queue order, failed-mutation atomicity, persistence/recovery, renderer rows, tool/result rendering, and widget behavior outside the removed field.

The frozen implementation boundary is exactly 21 paths: 11 source owners, 8 test owners, and README/CHANGELOG. `packages/todo/pnpm-lock.yaml` and `packages/todo/pnpm-workspace.yaml` are explicit exclusions. No task authorizes changes outside this list.

## 2. Ordered task graph

| ID | State | Observable outcome | Depends | Exact boundary |
| --- | --- | --- | --- | --- |
| A0 | **Complete** | Accepted amendment and source ownership inventory reconciled to the exact 21-path boundary. | none | Governing Spec and this Work tuple; no source change |
| T1 | **Implementation present; verification open** | Request/schema/type/state clean break; `schema.ts` has no request-level `workingOn`, and strict unknown-property rejection remains. | A0 | `src/schema.ts`, `src/types.ts`, `src/state.ts`, `test/schema.test.ts`, `test/state.test.ts` |
| T2 | **Implementation present; verification open** | Tool/coordinator/result contract no longer contains the old `workingOn` error branch; four handlers and non-target errors remain. | T1 | `src/tool.ts`, `test/index.test.ts` |
| T3 | **Implementation present; verification open** | Persistence/checkpoint/canonical restore/legacy restore remove only the dedicated field paths and retain non-target recovery behavior. | T2 | `src/persistence.ts`, `test/persistence.test.ts` |
| T4 | **Implementation present; verification open** | Consumer projections remove the dedicated summary; renderer no longer uses `selectedTodoTaskIndex` or a first-active summary while preserving result rows and rendering. | T3 | `src/format.ts`, `src/reminder.ts`, `src/widget-layout.ts`, `src/widget-component.ts`, `src/widget.ts`, `src/renderer.ts`, `test/format.test.ts`, `test/reminder.test.ts`, `test/widget.test.ts`, `test/renderer.test.ts` |
| T5 | **Implementation present; verification open** | Public claims describe the clean break without compatibility language. | T4 | `README.md`, `CHANGELOG.md` |
| T6 | **Open** | Reproducible full verification closes clean-break, preservation, boundary, exclusion, renderer, and typecheck gates. | T1, T2, T3, T4, T5 | Verification outputs only; all 21 paths checked read-only |

The graph is serial: **A0 -> T1 -> T2 -> T3 -> T4 -> T5 -> T6**. A fresh same-byte authority review remains an independent review gate for the exact five-document tuple. The supplied evidence says 11 test files and `git diff --check` passed; it does not supply reproducible typecheck evidence, so T6 cannot be complete.

## 3. Required rechecks

1. Recheck `src/schema.ts` for absence of the request-level field, parser acceptance, aliases, and compatibility paths.
2. Recheck `src/tool.ts` for absence of the old `workingOn` error branch and preservation of four result/error contracts.
3. Recheck renderer/widget/consumer behavior, including no `selectedTodoTaskIndex`, preserved `renderResult` rows, tool/result rendering, and independent multi-group expansion.
4. Recheck persistence/recovery and all non-target protocol invariants.
5. Run the package checks required by Plan, including a reproducible typecheck. Do not mark implementation or commit-ready until it passes.

## 4. Evidence and rollback

This documentation reconciliation records current worktree facts only; it does not claim source completion, fresh review GO, typecheck success, commit, merge, reload, deploy, or push. Rollback must restore the complete mutually compatible authority/source/test/public-document set, never a partial old-field artifact.

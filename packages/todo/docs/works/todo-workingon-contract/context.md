# Context: Todo `workingOn` clean-break authority reconciliation

- **状态**：processed authority context / accepted amendment / A0 reconciled / implementation verification incomplete
- **权威性**：这是派生 Context，不是 PRD、ADR 或 Spec，不保存 acceptance receipt/digest，也不能单独授权 source implementation。
- **Governing Spec**：[`../todo-protocol-redesign/spec.md`](../todo-protocol-redesign/spec.md)
- **Work tuple**：[`work.md`](./work.md)、[`context.md`](./context.md)、[`plan.md`](./plan.md)、[`tasks.md`](./tasks.md)

## Settled decision

`workingOn` 是 clean-break removal：不再存在于 request、schema/type、canonical state、snapshot/result、checkpoint/restore、legacy restore 或任何 consumer projection。多个 Todo group 可以同时因 status 展开，不能保留或引入单值 active summary。

用户已接受扩大 source boundary 的决定：在原 9 个 source owners 之外，新增 `packages/todo/src/schema.ts` 与 `packages/todo/src/tool.ts`。因此本次 frozen boundary 是 11 source + 8 test + README/CHANGELOG，共 21 条路径。

## Processed implementation facts

- 当前 worktree 已显示 21 条 boundary paths 的修改；本次仅同步文档，不修改这些 source、tests、README 或 CHANGELOG。
- `src/schema.ts` 当前的 transition schema 不再声明 request-level `workingOn`；后续 T1/T6 必须复核字段、parser 和 strict unknown-property rejection。
- `src/tool.ts` 当前不再包含旧的 `workingOn` error-code branch；后续 T2/T6 必须复核该 branch、错误映射和四个 handler 的 result/error contract。
- `src/renderer.ts` 已移除对 `selectedTodoTaskIndex` 的调用；后续验证必须同时证明 `renderResult` rows、tool/result rendering 与非目标 renderer 行为保留。
- supplied fresh verification 记录 11 个 test files 和 `git diff --check` 通过；没有可复现的 typecheck evidence，因此不得记录 typecheck passed。

## Lifecycle and gates

Amendment acceptance 和 A0 ownership reconciliation 已完成；bounded implementation boundary 已明确。当前 implementation status 仍是 worktree changes present / completion unverified。fresh same-byte authority review、implementation verification、renderer checks 和 typecheck 仍是后续门槛；本 outcome 不产生 source completion、commit 或 release evidence。

## Boundary and exclusions

Source owners (11): `src/state.ts`, `src/types.ts`, `src/persistence.ts`, `src/format.ts`, `src/reminder.ts`, `src/widget-layout.ts`, `src/widget-component.ts`, `src/widget.ts`, `src/renderer.ts`, `src/schema.ts`, `src/tool.ts`。

Test owners (8): `test/state.test.ts`, `test/persistence.test.ts`, `test/format.test.ts`, `test/reminder.test.ts`, `test/widget.test.ts`, `test/index.test.ts`, `test/renderer.test.ts`, `test/schema.test.ts`。

Public documentation owners (2): `README.md` and current/unreleased `CHANGELOG.md` claims. The exact repository paths are listed in Work and Tasks. `packages/todo/pnpm-lock.yaml` and `packages/todo/pnpm-workspace.yaml` remain outside the boundary and must not enter the commit.

## Preserved semantics

Keep `todo_set`, `todo_add`, `todo_transition`, and `todo_view`; multiple active groups; queue order; atomic failed mutations; persistence/recovery boundary; widget and renderer non-target behavior; and all non-`workingOn` fields. No compatibility window or replacement summary is permitted.

This Context is reconciled for the current evidence only. It must be updated again after implementation verification rather than being used to infer completion from documentation status.

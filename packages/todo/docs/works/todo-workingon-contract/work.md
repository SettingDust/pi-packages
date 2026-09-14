# Work: Todo `workingOn` clean-break authority reconciliation

- **状态**：accepted amendment / A0 ownership reconciled / bounded implementation authorized / implementation verification incomplete
- **Owner**：`packages/todo`
- **本次范围**：只同步本 Work、Context、Plan、Tasks 与 governing Spec 的 authority/lifecycle 记录。本次不完成 source implementation，不提交或修改 Git。
- **Work 目录**：`packages/todo/docs/works/todo-workingon-contract/`
- **Governing Spec**：[`../todo-protocol-redesign/spec.md`](../todo-protocol-redesign/spec.md)
- **Tuple**：[`work.md`](./work.md)、[`context.md`](./context.md)、[`plan.md`](./plan.md)、[`tasks.md`](./tasks.md)

## Decision and lifecycle

当前 session 用户已接受 `workingOn` complete-removal amendment，并明确选择扩大 source boundary，将 `schema.ts` 与 `tool.ts` 纳入本次 clean break。该决定形成可审查的 21-path implementation boundary；acceptance receipt 和 digest 仍由运行时持有，不写入 Markdown。

A0 inventory reconciliation 已完成。bounded implementation 仅可在下列 21 条路径内进行；当前 worktree 已有这些路径的 source/test/public-document changes，但本次文档同步不把 modified state 视为 implementation complete。fresh same-byte authority review、implementation verification 和 typecheck gate 仍然有效。

当前已记录的 implementation facts：

- `packages/todo/src/schema.ts` 的 `TodoTransitionParamsSchema` 已删除 request-level `workingOn` property；后续 implementation verification 必须复核 schema、parser 和 strict rejection。
- `packages/todo/src/tool.ts` 的旧 `workingOn` error branch 已删除；后续 implementation verification 必须复核 `errorCode` 与所有 handler error paths。
- renderer correction 已在 worktree 中，后续必须复核不再调用 `selectedTodoTaskIndex` 或 removed first-active summary，同时保留 `renderResult` rows、tool/result rendering 和非目标行为。
- 当前 supplied fresh verification 报告 11 个 test files 与 `git diff --check` 通过；本 outcome 不重新声称或生成 typecheck 证据，typecheck 仍是提交门槛。

## Clean-break contract

必须完整移除 request-level、canonical state、snapshot/result、restore/checkpoint、legacy restore 及 consumer projection 中仅服务于 `workingOn` 的字段、规则、setter、错误和兼容路径。不得保留空字段、别名、compatibility parsing、dual-read、dual-write、migration window 或等价 single-value summary。

必须保留多 active Todo groups、四个既有工具、非目标 request fields、status model、队列顺序、failed-mutation atomicity、persistence/recovery、renderer 与 widget 的非目标语义。

## Frozen 21-path boundary

**Source owners (11)**

- `packages/todo/src/state.ts`
- `packages/todo/src/types.ts`
- `packages/todo/src/persistence.ts`
- `packages/todo/src/format.ts`
- `packages/todo/src/reminder.ts`
- `packages/todo/src/widget-layout.ts`
- `packages/todo/src/widget-component.ts`
- `packages/todo/src/widget.ts`
- `packages/todo/src/renderer.ts`
- `packages/todo/src/schema.ts`
- `packages/todo/src/tool.ts`

**Test owners (8)**

- `packages/todo/test/state.test.ts`
- `packages/todo/test/persistence.test.ts`
- `packages/todo/test/format.test.ts`
- `packages/todo/test/reminder.test.ts`
- `packages/todo/test/widget.test.ts`
- `packages/todo/test/index.test.ts`
- `packages/todo/test/renderer.test.ts`
- `packages/todo/test/schema.test.ts`

**Public documentation owners (2)**

- `packages/todo/README.md`
- `packages/todo/CHANGELOG.md` current/unreleased claims

总计 **21 implementation boundary paths**。`packages/todo/pnpm-lock.yaml` 与 `packages/todo/pnpm-workspace.yaml` 是明确排除项，不得作为 boundary、验证变更或 commit 内容。

## Completion signal

本次 outcome 只有在五份 authority documents 的 owner、boundary、lifecycle、verification gate 和 exclusion statements 一致时完成。该信号不等于 source implementation、fresh review、typecheck、commit 或发布完成；任何一项仍缺证据都必须继续保持 implementation verification incomplete。

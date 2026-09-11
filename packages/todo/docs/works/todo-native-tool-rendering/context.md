# Context: Todo Native Tool Rendering

- Status: **draft, unaccepted, unimplemented**
- Related Work: [work.md](work.md)
- Related Protocol Spec: [todo-protocol-redesign/spec.md](../todo-protocol-redesign/spec.md)
- Overlap Authority: 本 Context 不复制或替代另一未提交 worktree 的 authority；共享路径 owner 状态须以实施前重新取得的实际证据为准。

## Purpose

这是 Todo 原生工具调用渲染迁移的处理后 Context，不是产品或技术权威，不授权源码修改，也不代表实现或测试完成。它只保留当前审计结论、相关源码事实、边界和待 Plan 决策。

## Settled Product Contract

- 四工具使用原生 shell；自定义 renderCall 在所有有效输入阶段保留工具名和业务动作文本，不返回空 Container。调用与最终结果均不得按 set-only/none 隐藏。
- 不再按 `set-only` 或 `none` 隐藏成功卡片。业务内容、状态、错误、展开信息，以及有证据仍需要的 visibility 相关内容继续保留。
- visibility 迁移只移除专用于成功调用隐藏的包内策略/设置接缝；默认 shell 的行为不复制为 Todo 设置，不新增设置，不改变设置持久化。仍有 Host 内容合同依据的 visibility 输入保留，具体逐项核对留给 Plan。
- 删除 Todo 专属自绘 frame 的 `Box`、标题、padding、background；常驻 widget 不在范围内。
- `workingOn` 只能作为可选的一致性校验，并由候选状态派生；省略可成功，过期值或未结束旧 `in_progress` 值会失败。本 Work 不删除、静默改写或放宽此规则。
- 四工具注册 Schema 与嵌套对象已经闭合为 `additionalProperties:false`。Schema 只验证，不改生产 Schema 或协议；可选验证仅限注册快照断言。

## Evidence Register

### Native Rendering Audit

来源：[audit-native-tool-rendering result](C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/audit-native-tool-rendering-artifacts/result-1.json)。审计确认 Todo 是明确存在自绘工具外框的包：注册和 `renderCall`/`renderResult` 位于 [src/tool.ts](../../../src/tool.ts)，自绘入口位于 [src/tool-frame.ts](../../../src/tool-frame.ts)。其他被审计的 Harness/Herdr 工具只返回内容，不在包内创建外框，因此本迁移默认不改它们。

`tool.ts` 当前在部分结果路径调用 `shouldRenderTodoAction`，并用 `TodoToolFrame` 包装 pending、success、error 内容；`renderResult` 还根据 expanded 选项调用 [src/renderer.ts](../../../src/renderer.ts)。这些是待 Plan 按 visibility 决策核对的迁移接缝，不是已完成的实现。

### Strict Schema Audit

来源：[audit-strict-todo-schemas result](C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/audit-strict-todo-schemas-artifacts/result-1.json)。审计确认注册层和运行时 parser 均拒绝未知字段，四个根对象及嵌套对象均已 `additionalProperties:false`。因此本 Work 不把 Schema 放宽或修改作为迁移手段；验证必须保持只验证性质，并与渲染迁移边界分开。

### `workingOn` Diagnosis

来源：[diagnose-todo-workingon-contract result](C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/diagnose-todo-workingon-contract-artifacts/result-1.json)。相关实现事实位于 [src/visibility.ts](../../../src/visibility.ts) 及 Todo 状态/工具调用链；本 Work 只记录诊断结论，不扩大到状态模型修改。`workingOn` 失败主要来自调用方把它当成独立选择，或切换时没有结束旧的 `in_progress` 项；这不是由省略字段造成的实现缺陷。

## Rendering State Matrix Required By Plan

Plan §5 分开定义 running/success/error/partial/empty/expanded 合同，分项验收调用身份可见及结果业务内容/状态/错误/展开信息可见。Host 默认标题仅在未提供自定义 renderCall 的原生默认分支可用；自定义回调返回空 Container 不会使 Host 补标题。本方案保留自定义回调，故必须提供零 padding 的业务调用 Text，而不是 Todo 自绘标题。

现有 falsey snapshot 兜底保持：缺失 details/snapshot、null、false、0、空字符串使用首个 text 或 No todos.。truthy malformed（如 {}、非数组 tasks、非对象 task、缺失/非数组 todos）不受保证；不增加 renderer 防御逻辑。0.84.2 仅为当前 package peer 匹配的验证基线，不保证任意版本兼容。

## Implementation Boundary

当前固定候选路径：

- `packages/todo/src/tool.ts`
- `packages/todo/src/tool-frame.ts`
- `packages/todo/src/renderer.ts`，仅必要内容
- `packages/todo/src/visibility.ts`，仅在废弃逻辑有证据时清理
- `packages/todo/test/tool-frame.test.ts`
- `packages/todo/test/index.test.ts`
- 必要的 Schema 注册断言

默认排除 `widget.ts`、`widget-layout.ts`、`persistence.ts`、`state.ts`、`types.ts`。不修改源码、测试、依赖、lockfile、settings、session、runtime 或 Git；不 stage、commit、push、reload 或 deploy。上述路径中的当前实现和测试只能作为草案证据，不能被描述为本 Work 已交付。

## Overlap And Bounded Amendment

若原生渲染与多展开候选在实际路径上重叠，两个功能不得并行修改该共享路径，必须先完成该路径冻结或由当前 owner 书面移交；无重叠则各自独立推进。最终实施前重新核对实际路径、当前 diff 与 HEAD；若冻结或移交需要改变其他 authority，则本 Work 停止。

若最终删除 `src/tool-frame.ts` 或 `test/tool-frame.test.ts`，必须在后续 Plan/Tasks 中作为 41-path/T5 manifest 的 bounded amendment 明列删除、T5 ownership/inventory/manifest 更新和回归责任，并在实现前独立 GO 复审；本草案不修改 manifest、T5 authority、multi-expand 文档或协议 Spec。

## Admission Gates

同目录 Plan 已存在但未接受；本次不创建 Tasks。实现前需准确 Work、Context、相关 Spec/authority、Plan、Tasks tuple 的独立 GO（P0-P3=0）与用户明确接受；三文档修订本身不授权实现。authority、边界或 overlap 漂移须重新复审。

## Host Baseline And Open Work

Plan §6 给出后续真实 Pi `0.84.2` 交互 Host 的加载、依赖阻断、请求序列及观察证据合同；旧 activation smoke 仅作历史注册证据。当前未执行 Host 验证、测试、reload、提交或部署。需完成独立同字节三文档复审，再满足 Tasks、T5 删除 amendment、multi-expand 冻结/交接和明确接受门；不得改变协议或其他 Work authority。

## Verification Required Later

本次仅对三文档现场回读、raw SHA256、非空及尾随空白进行验证；后续实现测试与真实 Host smoke 尚未执行。三文档均为 draft/unaccepted/unimplemented，不是实现授权或完成证据。

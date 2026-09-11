# Work: Todo Native Tool Rendering

- Status: **implementation accepted, T2/T3 complete, T4 pending execution**
- Scope: 为 Todo 四个工具调用卡片迁移到 Pi 默认原生 shell 建立独立的 Work/Context 草案。
- Related Context: [context.md](context.md)
- Related Protocol Spec: [todo-protocol-redesign/spec.md](../todo-protocol-redesign/spec.md)
- Overlap Authority: 本 Work 不引入另一未提交 worktree 的 authority；共享路径的 owner 状态必须在实施前按实际证据重新核对。

## Goal

在不改变 Todo 业务状态模型、常驻 widget 或已确认四工具协议的前提下，使四工具的渲染回调接入 Pi 默认原生 shell；每次工具调用都保留可辨识的调用身份/动作内容，最终结果也不再按 `set-only` 或 `none` 隐藏。Host 负责外框和装饰；Todo 不自绘 Box、标题、padding 或 background。

## Confirmed Product Decisions

- 四工具使用原生 shell；每次 `renderCall` 必须提供可辨识的工具身份或动作内容，每次有结果的 `renderResult` 必须提供业务结果、状态、错误或展开内容。Host 默认标题仅在已验证的原生 Host 会从注册工具名/调用记录生成且仍保留调用身份时可用；不能把成功 `renderCall` 置为空 Container 作为其替代。
- 保留业务内容、状态、错误、展开信息，以及仍有依据的必要 visibility 相关内容。
- 删除 `TodoToolFrame` 自绘的 `Box`、标题、padding 和 background；不改常驻 Todo widget。
- visibility 迁移决策：移除只服务于成功调用 `set-only`/`none` 隐藏的包内策略和设置接缝；保留仍被默认 shell 内容合同或错误/展开语义使用的 visibility 输入。不得为迁移新增设置、改变设置持久化或把 Host 默认行为复制到 Todo 设置中。
- `workingOn` 是可选一致性校验与派生输出，不是选择器：省略成功，过期值或未结束的旧 `in_progress` 值会失败。本 Work 不删除、静默改写或放宽该语义。
- 四工具注册 Schema 及嵌套对象已经 `additionalProperties: false`。Schema 只做验证，不改 Schema 生产代码或协议；最多补充注册快照断言。

## Candidate Boundary

候选实现和验证路径固定为：

- `packages/todo/src/tool.ts`
- `packages/todo/src/tool-frame.ts`
- `packages/todo/src/renderer.ts`（仅必要内容）
- `packages/todo/src/visibility.ts`（仅在上述迁移决策有证据时清理）
- `packages/todo/test/tool-frame.test.ts`
- `packages/todo/test/index.test.ts`
- 必要的 Schema 注册断言

默认不改 `widget.ts`、`widget-layout.ts`、`persistence.ts`、`state.ts`、`types.ts` 或其他设置、依赖和锁文件；后续 Plan 若有证据，可显式修订边界。

## Rendering Contract To Settle In Plan

Plan §5 分别定义 running/success/error/partial/empty/expanded 的调用与结果合同。四工具的自定义 renderCall 在所有有效输入阶段返回含工具名和业务动作的零 padding Text，不返回空 Container；Host 原生默认标题仅在未提供自定义 renderCall 的默认分支可用，不能因自定义回调返回空组件而期待 Host 补标题。验收分为调用身份可见与结果业务内容/状态/错误/展开信息可见。snapshot 兜底仅保证现有 falsey 路径；truthy malformed 不承诺安全渲染，不为此修改 renderer。

## Overlap and Ownership

若原生渲染与多展开候选在实际共享路径上重叠，实施前必须冻结该路径，或由当前 owner 书面移交本 Work 所需路径；若无重叠，两项工作可各自独立推进。最终实施前必须重新核对实际路径、当前 diff 与 HEAD；若冻结或移交门不能在不改变其他 authority 的情况下满足，本 Work 停止且不修改其他 authority 文档。

删除 `tool-frame.ts` 或其专属测试若成为最终方案，属于对既有 41-path/T5 manifest 的 bounded amendment：必须由后续 Plan/Tasks 明确列出删除、更新 T5 ownership/inventory/manifest 及回归责任，并经独立 GO 复审后才能实现。本 Work 不修改 manifest、T5 authority 或协议 Spec。

## Admission And Completion Gates

实现已获接受；T2（四工具原生 shell business content）与 T3（renderer/result visibility contracts）已完成。T4（focused integration and deletion regression coverage）待执行。后续仍须遵守 Plan/Tasks 中的依赖、路径边界、T5 静态验证和 T6 真实 Host 验收门；本次状态同步不写 acceptance receipt，不改变 Plan、Tasks 或 Context。

完成信号包括 Plan §6 的真实 Pi `0.84.2` 交互 Host 原生 shell 验证：版本、依赖、加载入口、实际工具请求和终端观察证据缺一不可；旧 activation smoke 不替代。另需 focused tests、typecheck、Schema 只验证及未跟踪文件检查。

## Remaining Gates

T4 尚待执行，随后依次完成 T5 focused static verification 与 T6 authorized real Pi `0.84.2` Host acceptance。仍须重新核对实际路径、当前 diff、HEAD、overlap/freeze 或 owner handoff，以及 T5 bounded amendment 的删除、inventory、manifest 和 regression responsibility 证据。
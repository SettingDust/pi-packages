# Work：Router 按需加载委派策略

- 状态：**策略、Router prompt 与 Herdr ready-branch dispatch 已按用户最新决定完成状态收敛；T4 live 遵循证据仍未建立。** 静态、单测和隔离 fixture 证据保留其原有限定。
- [Context](context.md) | [Plan](plan.md) | [Tasks](tasks.md) | [Proposal](../../proposals/router-parallel-evidence-scheduling.md)

# Administrative closure

User direction closes the Router strategy and Herdr continuous-dispatch coordination outcome. This is status bookkeeping only: the documented live matrix, effective registration, and model-following limitations remain unverified and are not promoted to passes.



Router 需要委派时，自己从现有 Skill 目录选择并读取 `delegation-strategy`，在构造 Handoff/能力请求前应用分支、粒度与能力匹配、依赖/冲突、dispatch/等待策略；常驻 prompt 保留最小引导及不可选的角色、授权、单结果、调用与结果正确性约束。最低足够能力粒度原则和条件性后台重叠现属接受的规范，Skill/prompt 的 T2 实现已完成聚焦核验。没有额外 strategist 子代理或隐藏 scheduler。此前全内联 Router、无 Skill 修改的候选架构已失效；Herdr 描述的条件性修订现已完成 T3 owned 源码/单测，但没有更新既有会话的有效已注册合同。

用户在收到具体 T2/T3 文件、行为、验证及风险披露后，以“按你说的开始”授权本 Work 的既定实施范围；它不是对新接口、Host inventory 草案或后发现实质扩展的确认。T2 已新增策略 Skill、修改 Router prompt 与 Harness extension 测试；T3 已修改 Herdr owned `subagent_spawn` 描述、README、对应断言并新增确定性双 active 回归。T4 重跑两包全套测试/typecheck，发现 Harness Skill 数量断言尚未计入 T2 新增 Skill，在 T2 范围内修正；Herdr 未改 runtime、schema 或生命周期。保留既有 done duplicate-output 修复、其它 dirty 工作和 Git index。T4 live 仍为开放结果。

## 权威与待办

当前权威：[Router Spec](../../spec/router-delegation.md#13-evidence-branch-scheduling-and-strategy-loading)、[Skill Library Spec](../../spec/skill-library.md)、[Backend Spec](../../spec/backend-adaptation.md)、[ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md)、[ADR-0005](../../adr/0005-let-router-adapt-delegate-tools-directly.md)、[PRD](../../prd/router-delegation.md)。Herdr [lifecycle Spec](../../../../pi-herdr-subagents/docs/spec/runtime-lifecycle.md) 继续拥有通知与恢复。

已接受的边界包括协调 Skill 加载顺序、单结果证据分支/最终交付区分、精确顺序 resolve→launch、仅在有效 backend 合同允许时后台重叠及四态投影。[Backend Spec §3](../../spec/backend-adaptation.md#3-settingdustpi-herdr-subagents-mapping) 已有界调和 Herdr dispatch pacing：在有效工具合同与资源允许时方可继续独立 ready 分支；未更新/未激活的旧描述仍约束实际工具。其它环境仍按自己的有效合同运行，Herdr [lifecycle Spec](../../../../pi-herdr-subagents/docs/spec/runtime-lifecycle.md) 的通知/恢复不变。集成式工具、`invocationRef` 与 draft Host compatibility amendment 不在本次范围。

## 完成标准与证据限制

T2 完成标准已按 Harness 静态/单测层核验：`bun test tests/extension.test.ts` 为 7 pass/0 fail，`bun run typecheck` 通过；新增 Skill frontmatter/正文、目录可见性与 customPrompt 旁路有聚焦断言。本次未重跑 Harness 检查。

T3 已完成 owned 描述/README 与双 active 回归：在 `packages/pi-herdr-subagents` 运行 `bun test tests/runtime.test.ts` 为 107 pass/0 fail、1239 expect，`bun run typecheck` 通过；Herdr 三份目标文件的 `git diff --check` 通过；Work/Tasks 已复读及通过 Markdown 检查，两份未跟踪文件的 `git diff --no-index --check` 无 whitespace 错误（差异退出 1，仅 Git 的 LF→CRLF 提示）。新测试用每分支独立 deferred launch/completion 控制，先后两个 spawn tool 返回不同 running id，均无 Result/终态通知；先完成 C，等待其通知后 join 取 C Result，A 仍 running/无 Result，再完成 A，核验 id、generation、session/Result path、通知、Result 和 cleanup 隔离。无任意 sleep 作为重叠证明，也未在派发第二条前等待首任务完成或 join。

T4 集成验证本次实际重跑两包全套测试及 typecheck：[证据、矩阵和受限父级运行命令](evidence/t4-integrated-acceptance.md)。Harness 首轮 138 pass/2 fail（旧 Skill 清单预期 29 项，未包含 `delegation-strategy`）；修正该 T2 库存断言后为 141 pass/0 fail、typecheck 通过。Herdr 为 143 pass/0 fail、typecheck 通过。隔离 live 入口已准备并通过 Bun 构建，但当前 Handler 不具备独立 Router 委派权限，未执行授权的 live 验收。一次入口预检错误继承当前 `HERDR_WORKSPACE_ID`、短暂启动 Pi RPC 后超时；轨迹仅一条成功 Skill read，无 resolve/spawn，临时 fixture 已删除；随后入口添加新工作区 ID/label 强制校验并通过对当前工作区的拒绝检查。它采集有效注册描述、实际工具调用和完整 Result 的脱敏时间线，不能仅凭模型叙述宣称通过；未执行的 Plan 矩阵仍开放。当前 parent 工具要求首个 spawn 后 end-turn；源码变化不更新当前注册。无安装、全局激活/配置改动、外部项目编辑、staging、commit 或子代理派发。

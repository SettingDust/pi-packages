# Tasks：Router 按需委派策略

- 状态：**已按用户最新决定完成 Router 策略与 Herdr continuous dispatch 的状态收敛；live 模型遵循/完整场景仍未验证。** T2/T3/T4 的静态、单测和隔离 fixture 证据保留原有限定，不转化为 live 通过。
- [Work](work.md) | [Context](context.md) | [Proposal](../../proposals/router-parallel-evidence-scheduling.md)
- 旧 T2“只改 Router/工具描述、无新 Skill”边界已替换。具体实施范围已授权；新发现的实质扩展仍须确认，静态检查不代表实际模型行为。

## 依赖

```text
T1 已接受 Router/Skill 权威 + 有界 Herdr Backend Spec §3 [文档已对齐]
  → 具体实施 Plan 已披露/确认；执行仍核对有效工具合同/资源 [门槛]
    ├→ T2 Harness 策略 Skill + Router prompt + 聚焦测试 [完成，静态/单测]
    └→ T3 Herdr owned 描述 + 测试/README + 双 active 回归 [完成，源码/单测]
         T2 + T3 → T4 集成验证/证据 [静态与全包单测已完成，live 矩阵仍开放]
```

T2/T3 是不同文件所有者的独立结果，可在门槛后分别实施；T4 依赖二者。T3 不是接口候选选择：已有 `resolve_delegation`→`subagent_spawn` 参数逐字不变；无需同时发起工具调用。只有授权 Router 的隔离运行才能证明 live 遵循。

## T1 — 有界规范一致性

- 状态：完成（文档权威更新；实施另需确认）。
- 单一结果：按需 Router 协调方法、现有角色/授权与有效工具约束及 Herdr 条件性同轮 dispatch 已在对应规范所有者中一致表达；尚未修改可执行工具合同。
- 输入：Proposal 的激活协议/所有者表/待接受规范清单；Context 中源码证据；Router、Skill Library、Backend Specs 与 ADR-0001/0005。
- 约束：未接受的 Host inventory 草案保持未接受；修订前/尚有效的 Herdr 第一 spawn 后 end-turn 工具描述继续约束执行；不引入 integrated tool、`invocationRef` 或 Herdr-only Router 通用合同。
- 完成证据：[PRD](../../prd/router-delegation.md)、[Router Spec §1.3](../../spec/router-delegation.md#13-evidence-branch-scheduling-and-strategy-loading)、[Skill Spec](../../spec/skill-library.md)、[Backend Spec §3](../../spec/backend-adaptation.md#3-settingdustpi-herdr-subagents-mapping)、ADR-0001/0005；Proposal 仍为部分接受。具体 Plan 已披露并获实施授权；有效工具合同仍必须另行核对，Tasks/status/resolve 成功不是工具许可。

## T2 — Router 按需策略边界

- 状态：完成 Harness 文件及聚焦静态/单测；live 激活、误交 Handler 及有效后端合同留 T4。

- 依赖：T1、这份具体实施 Plan 的披露/确认；执行仍须遵守当前有效工具合同。T2 不依赖 T3 字节完成。
- 单一结果：纯协调方法从内联 prompt 移到 Router 直接加载的普通可见 Skill，常驻正确性约束仍成立；Skill 负责已接受的最低足够能力粒度原则。
- 文件：`packages/pi-harness/skills/delegation-strategy/SKILL.md`（已新增）、`extensions/pi-harness.ts`、`tests/extension.test.ts`（均在 Harness 包下）。
- 输入：Plan 激活控制流、Proposal 不变量所有者表、当前 Handler/Resolver 和目录机制。
- 约束：按实际 location 读取；加载在 Handoff/能力请求前，失败阻塞新委派；先识别真实边界和必要上下文，再独立评估 reasoning/impact。上游决策可降低下游不确定性；impact 只按实际隔离的后果调整，不按文件/任务数量降级；计入委派、移交、集成成本与整体核验，避免无价值碎片。保留无委派直接响应、customPrompt 不注入、角色/授权/exact forwarding/Result 安全。保留全可见 enum，禁止把协调策略派给 Handler；不改 Registry/Resolver/Handler Agent，不新建分类元数据、loader 或状态。
- 完成证据：`bun test tests/extension.test.ts`（7 pass/0 fail）、`bun run typecheck`（通过），均在 `packages/pi-harness` 运行；测试覆盖引导/失败闭锁提示、Skill frontmatter 与方法、可见目录及 enum、customPrompt 旁路和常驻合同。静态/单测不证明实际读取、Router 行为或误交 Handler 的 live 结果；T4 保留这些场景。

## T3 — Herdr ready-branch dispatch 合同对齐

- 状态：完成 owned 源码/README 与确定性 runtime 单测；既有会话的旧 end-turn 合同未激活更新，live 同轮验收留 T4。
- 依赖：T1、这份具体实施 Plan 的披露/确认；先核对当前有效注册工具描述、资源与任务 id/完整 Result 获取。T3 与 T2 可分别实施，live 同轮验收依赖二者的有效版本。
- 单一结果：Herdr 自有 `subagent_spawn` 的下一条独立 ready 分支派发许可与已接受规范一致；只有当前有效已注册描述和资源允许，才在 active spawn 后继续同轮 resolve→exact spawn；否则结束 turn/按合同等待通知。其它后端不变。
- 文件：`packages/pi-herdr-subagents/src/index.ts` 的 tool description、`tests/runtime.test.ts` 的描述断言和受控双 active 用例、`README.md` 的合同说明。**不**修改 `SubagentRuntime.spawn/start`、参数/schema、通知/join/lifecycle Spec；若测试暴露真正 runtime 缺陷，先记录并重新确认范围。
- 约束：单分支成功 resolve 后下一环境动作必须是该 branch 的原样 spawn；不得预 resolve、轮询或为未知容量假定并发。受控 deferred transport 依次发起两个有效 spawn，第一任务未结束/未 join 时第二任务返回 active，两个 id 独立且都可关联；该证据证明 bounded runtime overlap 而非 live 模型遵循或实际资源无限。
- 完成证据：owned 描述、对应断言与 README 已一致表达 conditional ready-branch dispatch、每分支 exact resolve→spawn、eligible wave/实际边界后 end-turn 和通知后 join；未改参数/schema、`SubagentRuntime.spawn/start` 或通知/join 生命周期。`successive ready-branch spawn calls return two active identities before either completion` 通过两条独立 launch/completion deferred gates，先后调用 spawn tool 并各自返回 running；此时两 Result 均不存在、无终态通知/cleanup。随后先释放 C，等待其终态通知后 join，A 仍 running/无 Result；再释放 A，验证各自 id、generation、session/Result path、摘要通知、完整 Result 与 tab cleanup 隔离。没有 sleep/polling 断言或首任务完成/join 屏障。
- 验证：在 `packages/pi-herdr-subagents` 运行 `bun test tests/runtime.test.ts`（107 pass/0 fail，1239 expect）、`bun run typecheck`（通过）；三份 Herdr 目标文件的 `git diff --check` 通过；Work/Tasks 已复读及通过 Markdown 检查，两份未跟踪文件的 `git diff --no-index --check` 无 whitespace 错误（差异退出 1，仅 Git 的 LF→CRLF 提示）。保留原 done duplicate-output 修复、Harness T2、Todo dirty 工作和 Git index；无安装、激活、commit 或嵌套委派。当前 parent 工具仍要求每次 spawn 后 end-turn；源码变化不更新已注册工具，本次 fake transport 不证明实际资源或 live 模型遵循，T4 保持开放。

## T4 — 集成验证与证据

- 状态：集成静态/单测已执行，live 场景仍开放；不得据此宣称 T4 完成。
- [T4 实际执行结果、矩阵和隔离父级运行入口](evidence/t4-integrated-acceptance.md)。Harness 全包第一次失败（旧 29 Skill 库存断言遗漏新增策略）；在 T2 范围内将其更新为 30 个后，全包 141 pass/0 fail、typecheck 通过。Herdr 全包 143 pass/0 fail、typecheck 通过。该结果由本次重新执行，非此前 T2/T3 报告结果。此 Handler 不能启动独立委派 Router；旧 parent 注册仍要求首个 spawn 后 end-turn，源码修改不会改变现有注册。
- 依赖：T2/T3 的实施字节、Herdr 已注册有效描述与资源事实，以及独立授权的 Router live 验收环境。若该环境不可用，可记录 static/unit 结果，但不得标记 live 已完成.
- 单一结果：候选实现的验证结论明确区分静态、unit 与 live 边界。
- 执行：分别在 Harness 包运行 `bun test tests/extension.test.ts`、`bun run typecheck`，在 Herdr 包运行 `bun test tests/runtime.test.ts`、`bun run typecheck`；检查目标 diff/whitespace 和新 Skill 文本，保留原 dirty 工作/index。禁止通过安装、激活或重载伪造验收环境。
- 场景：Plan 矩阵中的触发/无委派、missing-hidden-read failure、恢复重读、enum 与误交 Handler、customPrompt、粒度/影响评分、B 独立依赖、写冲突与授权、四态/重复/畸形/取消。核心 live 轨迹由**具备委派权限且隔离的 Router** 记录 effective tool description/资源与 `resolve A → spawn A → resolve C → spawn C`（B 有身份依赖）、各 active id/时间段、完整 Result、Todo 和单 writer；旧 end-turn/未知能力路径记录串行或阻塞。只读 Handler 不能 spawn，不能充当模型验收执行者。
- 完成证据：逐项给出实际命令结果、工具合同、轨迹/时间线及未验证项。Herdr fake transport 两 active 是确定性 runtime 证据，非真实资源或 live 模型遵循；缺权限、有效注册或 live 环境必须明确标注阻塞，不能标全场景通过。修复仅限已确认范围。

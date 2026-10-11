# Work: Todo 单向派生显示运行规则

- 当前状态：**当前用户已明确确认五文件源码范围；Root 已采纳 completed Result，认定 `I-TDV-01` 源码完成、`W-TDV-01` 源码完成谓词满足；尚未启用。**
- [Context](context.md) | [Plan](plan.md) | [Waves](waves.md)

## 目标与选定 tuple

把已经修订的 Todo 单向派生契约落实到同一套运行指令及其聚焦静态验证：允许从明确选定来源重建、替换或清空显示，不再以旧账闭合、身份连续或投影成功作为显示/业务准入条件；保留真实执行、完整 Result 采纳与依赖门槛。

本 Work 只有一个已完成的源码实施范围，不需要 overview 或第二阶段图。已选定的同目录 unsliced tuple 保持不变：

| 角色 | 直接成员 |
| --- | --- |
| Work：交付入口 | [work.md](work.md) |
| Context：处理后事实，不是 authority selector | [context.md](context.md) |
| Plan：实施范围 | [plan.md](plan.md) |
| Waves：唯一可执行图 | [waves.md](waves.md) |

稳定图标识为 `W-TDV-01` / `I-TDV-01`：一个 Wave、一个 item、一个 Handler、一个 Result。初次四文件准备是 standalone 结果；这些文件不是其自身准备的先决输入。后续 graph-bound 实施保留 planned tuple/current-call/JIT、实际权限、scope confirmation、prerequisite、冲突和 gate 检查；路径和标题不证明 runtime admission。

## 已确认源码范围摘要（原实施边界）

- 主运行指令 owner：`extensions/pi-harness.ts` 的 `routerPrompt`、`skills/delegation-strategy/SKILL.md`。替换旧 Cleanup 1–6 及前置/终态投影与执行、Result、release 的耦合；保持请求变化不改固定指令、角色边界、Resolver 与 Result 读取/投影契约。
- 必要指令镜像：`skills/documentation-plan-writing/SKILL.md` Method 10 原把 truthful Todo projection 写在 release 之前；已将该一句同步为事实通过 Todo 或普通消息诚实呈现，release 只依赖完整关联 Result、item evidence 和 gate。它是同一治理修正的已证实影响面，不是独立 Skill 重写或新决定。
- 验证 owner：`tests/extension.test.ts`、`tests/skills.test.ts`。改受影响投影断言、T1–T16 wording/order 与 Router 固定文本哈希，增加镜像的最小独立性断言；保留 Handler/Herdr 固定绑定哈希、任务动态尾、Resolver、Result summary/full 投影及执行门槛测试。
- 完成边界：这五个文件形成一致的源码/指令候选，两个现有测试文件、包 TypeScript 检查及三个 changed TS 路径的主动 LSP 覆盖有充分证据。静态规则和 synthetic fixtures 不证明真实模型遵循。

item 的具体语义、步骤、ownership、证据和冲突只列于 Waves；Plan 不另造任务图。

## Authority 与历史

- [Router Delegation PRD](../../prd/router-delegation.md)：单向显示产品要求。
- [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md)：同一职责分离决定的显示修订。
- [Router Delegation Spec](../../spec/router-delegation.md)：行为、失败与 T1–T16；同时是 tuple/图语法唯一 owner。
- [ADR-0007](../../adr/0007-authority-first-router-admission.md) 与 [Skill Library Spec](../../spec/skill-library.md)：复用现有准入、权限、Skill composition 边界，不改 authority。
- [旧 cleanup Work](../todo-cleanup-contract/work.md) 与 [旧 Plan](../todo-cleanup-contract/plan.md)：保留完成交付历史及位置例。既不重开旧图，也不把旧 scope 确认或历史测试当成本目标的确认/完成证据。

本四文件只是派生协调材料，不创造 PRD、ADR、Spec、receipt 或授权历史。

## 准备历史与当前完成事实

初始准备阶段已完整读取所需 authority/实现/测试输入及修订 Result envelope 并 JSON 解码；三家族当前 `reuse` 的理由及实施前镜像证据在 Context。当时四文件结构、真实引用、相互指向、唯一图及空依赖的静态检查只是准备证据，不是实施测试。

当前用户已在实际 `ask_response` 选择「确认修改（推荐）」，确认五个 owner、两个测试/typecheck/active TS 与排除项。Root 随后启动实施，完整读取并关联 `implement-todo-derived-view-rules` generation 1 的 completed Result，认定 `I-TDV-01` 源码范围完成、`W-TDV-01` 源码完成谓词满足；无后继或依赖需释放。本次只记录该既定事实，不重新采纳、决定或释放 gate，不造确认日期或 receipt，也不复用旧 scope 确认。

[源码 Result 与验证限制](context.md#当前源码完成证据与启用限制)记录五文件 270 additions / 198 deletions、89 pass / 0 fail、typecheck 退出 0、三 TS primary/error 主动检查通过及辅助覆盖限制。未来调用仍需当时有效的权限、authority、tuple 字节、prerequisite/gate、冲突及 delegate contract；实质变化返回 Root，不静默扩图。

## 排除项与限制

不修改 authority、旧 Work 图、Todo API/包、Resolver/Handler/Herdr 实现、依赖或锁文件；不新增 tasks、审计/历史恢复/model benchmark/形式证明节点、receipt、ID/CAS、同步器或调度器。不选所有历史 Work 或当前临时项，不要求旧 Todo 的关闭 Result，不操作 Todo/Waves/Result/manifest 状态，不删除证据或调用 `subagent_remove`。

初始准备只新建本目录四文件，当时未实施或运行测试/模型；后续源码 item 已完成，本次仅同步四文件事实，不重跑其验证。源码完成不包括真实 Todo 重建、model trace、当前 Host 加载证明、安装、reload、启用、部署或 Git 写入。真实启用需要另行说明及授权，不是 `W-TDV-01` 的隐含 gate。

风险：set+transition 是多调用显示派生，失败可能只部分对齐；必须诚实报告，不反向阻塞已满足的业务谓词。修改源码不会替换当前 Host 已注入 prompt 或已加载 Skill；源码完成不能宣称新规则已经启用。

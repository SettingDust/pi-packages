# Plan: Todo 单向派生运行指令的一致源码交付

- [Work](work.md) | [Context](context.md) | [Waves](waves.md)
- 当前状态：**五文件源码范围已获当前用户明确确认；Root 已采纳 completed Result 并认定源码范围完成，尚未启用。**

## 1. Outcome 与 authority

本 Plan 只有一个 outcome：两个 Router 运行指令及一处已证实的 Plan-writing release 镜像，连同对应静态/源码验证，一致表达 Todo 从选定事实单向派生，不让旧显示生命周期或 Todo 投影成功反向约束重建、Result 采纳或执行。源码一致性和聚焦证据是完成边界；真实模型、工具执行、Host 启用不是本 outcome。

- [PRD](../../prd/router-delegation.md)：明确选定来源的可替换显示产品目标。
- [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md)：沿用职责分离决定，不新增 ledger/同步架构。
- [Router Spec](../../spec/router-delegation.md#todo-cleanup-lifecycle)：真实工具、状态与失败；同一 Spec 的 [planned document/release contract](../../spec/router-delegation.md#new-planned-work-document-and-release-contract) 独占 tuple/图语法；[T1–T16](../../spec/router-delegation.md#todo-cleanup-acceptance-scenarios) 是本静态覆盖的规范映射。
- [ADR-0007](../../adr/0007-authority-first-router-admission.md) 与 [Skill Library](../../spec/skill-library.md)：原准入、权限、确认、Skill/Handler 边界继续复用。

三家族 `reuse` 及当前版本证据在 Context；本 Plan 不复制/修订 authority，不引入未接受选择。简单耦合治理修正使用一个 Plan，无 overview 或 staged route。唯一可执行分解在 Waves；以下是范围与策略，不是第二套 item 图。

## 2. 实施范围与最小策略

以当前 `routerPrompt`、strategy 的对应文字为共同修正入口，删除旧 Cleanup 1–6 的旧账资格、先关闭角色、整表 survivor/identity 连续性、原子跨调用和 retain-on-uncertainty 前提；改为真实显示操作的来源/工具/效果判断。同步 Phase 2/3/4 与 strategy Method 6/7 的 pre-action/终态投影、duplicate/replay、release 关系，避免只换 cleanup 段而留下投影成功 gate。

初始准备读取发现第三处真实镜像：`documentation-plan-writing` Method 10；已确认范围包含此文件，其 Todo-before-release 一句已同步，没有重写整项方法或其它 Skills。这是同一规范实施的必要一致性，不追加独立文档审计结果。

| ownership | 已确认源码写边界（保持原范围） |
| --- | --- |
| Router 注入模板 | `packages/pi-harness/extensions/pi-harness.ts`：仅固定 `routerPrompt` 的相关显示/投影治理文字。 |
| Router-only 协调方法 | `packages/pi-harness/skills/delegation-strategy/SKILL.md`：对应 method/cleanup 与 checkpoint 关系。 |
| 派生 Plan 指导镜像 | `packages/pi-harness/skills/documentation-plan-writing/SKILL.md`：仅 Method 10 的 Todo/release 耦合句。 |
| 聚焦回归 | `packages/pi-harness/tests/extension.test.ts`、`packages/pi-harness/tests/skills.test.ts`：受影响的生成提示/strategy/T 场景/顺序/哈希，及镜像最小断言。 |

item 具体执行步骤、全部写 owner、约束、冲突和检查证据在 Waves。所有改动共用一个语义/失败/验证边界，不按文件拆分，不加入独立 review 节点。

## 3. 必须保持的边界

- 正常 whole-view set+transition 与 clear 不要求旧账闭合、旧身份/字段/状态保全或跨调用事务；局部 remove 仍按真实工具精确选择、保全非目标及原子无效批拒绝。新集合名称应不歧义，但不新增 execution IDs/CAS/ledger。
- four native states 来自可靠来源；partial/failed/blocked 用 description 或普通消息保持，不能投影 completed。未启动撤出和未确认取消的 active 执行不能混为一谈。
- 重派生与 Result 采纳/依赖释放分离；旧通知不凭同名作用于新项。完整阅读/关联、重复采纳幂等、冲突 fail closed、权限、scope、prerequisite 与 Wave gates 不削弱。
- set 已成功而 transition 失败，或效果未知，分别诚实报告；不盲目重试、补偿或恢复旧快照。投影失败/缺失用既有普通消息呈现，不阻塞独立满足的业务采纳/执行谓词。
- 显示不取消 active 执行、不改变图或删除 Results/sessions/manifests/artifacts。实际职责仍需沟通，但不形成清空前置。
- 请求变化不修改固定 Router/Handler 指令；Handler Agent/Herdr completion suffix 固定哈希、Resolver protected binding/单次调用、summary/full Result 投影、解码和执行门槛保持。只更新确实因本指令修改而失效的 Router 哈希及其段锚点，不删测试来掩盖回归。

## 4. Dependencies、confirmation 与 completion

selected tuple 为本目录 `work.md` / `plan.md` / `waves.md`；Context 是 processed input，不是第四个 admission authority selector。未来调用需把这三个 distinct canonical refs 各列一次，按照当时 Spec/Resolver 的 current-call/JIT 规则处理，不发 receipt/acceptance 字段。不以 Markdown 标题/status/路径自证 runtime document kind 或权限。

本图 item prerequisites 与 predecessor Wave gates 都为空；没有来自旧图、旧 Todo、全部 Work、未选定显示来源或历史 T 结果的依赖。唯一所需 completion gate 是 `W-TDV-01`，它只证明本 scope 的源码/指令一致性及所列聚焦证据。

实施前的确认要求已由实际当前用户 `ask_response` 选择「确认修改（推荐）」满足，包含五处文件、两个测试/typecheck/active TS 及 Todo API/重建/模型/安装/reload/Git 排除项；Root 随后启动并采纳实施。此前待确认是准备历史，准备 ready 与旧 scope 确认不替代本次实际确认，不造日期或 receipt。当时有效 authority/权限、tuple/readiness、冲突及 delegate contract 的实施边界保持不变。一个完整、可靠关联的 Handler `completed` Result 与所需 evidence、gate 共同满足源码完成；partial/failed/blocked/missing Result 不满足，Todo 缺项/失败也不替代或阻碍独立完成判断。Waves 的编号/显示顺序不形成 barrier，Wave 不自动派发或调度。

## 5. Verification、风险与 exclusions

最小验证是现有两个测试文件（生成 prompt/strategy、新 T 对照与必要回归）、现有包 typecheck，以及 changed TS 三路径的主动 LSP；命令、覆盖要点和完成证据只详列于 Waves。测试 fixture/Schema/字符串断言只能证明静态合约与已有离线逻辑，不能声称真实模型分类、Todo 工具效果或 Host 实际加载。初始准备期间未运行这些检查；后续源码实施已留下聚焦证据，本次事实同步不重跑。

Root 已完整读取、关联并采纳 `implement-todo-derived-view-rules` generation 1 的 completed Result，认定 `I-TDV-01` 源码完成、`W-TDV-01` 源码完成谓词满足；本次不重新决定或释放 gate，图无后继或依赖需释放。[Context 当前证据](context.md#当前源码完成证据与启用限制)保留五文件 270 additions / 198 deletions、89 pass / 0 fail、typecheck 退出 0、三 TS primary/error clean=1 / 0 diagnostics / 0 inconclusive；all-server 辅助 43 条旧提示/警告及 timeout、push-only silent-on-clean 两项覆盖限制也保留，不能声称所有服务无诊断。当前会话加载新规则、模型/Todo 真实效果仍未证实。

- **遗漏耦合残留**：仅替换 cleanup 段仍可能留下 pre-action 或 after-projection release；以同 item 的正/负断言覆盖各实际入口和 Method 10。
- **hash 更新掩盖误改**：Router 整段及切片 hash 随授权指令改变；边界锚点必须存在且唯一，保留动态 task/绑定/Handler/Herdr 和其它未受影响检查，不新增冻结 ledger。
- **非事务派生**：set 与 transition 可部分成功，不能承诺原子四态对齐；必须报告已知范围/未知效果，不让失败升级为业务门槛。
- **历史/启用误读**：保留旧完成图；新源码完成不是旧 graph 重开，更不是当前 Host 已启用新文本。实际加载、Todo 重建、模型 trace、安装/reload/启用另需说明/授权，不作为本 gate。

不改 authority、现有 Work/图、Todo 工具/API、Resolver/Handler/Herdr 实现、依赖/锁文件；不新增 tasks、同步器、调度器、ledger、receipt、IDs/CAS、mock framework 或独立 source audit/历史恢复/benchmark/形式证明节点。不操作 Todo 或推进图/Result 状态，不选择全库显示来源，不执行 Git 写入/安装/reload/模型。

无需数据迁移或新增 API。若将来另获授权撤销源码修正，应让上述指令/镜像/对应断言保持一致；这不是本图的 rollback item 或运行启用方案。发现实质范围、owner、gate、重要风险或 authority 变化时，受影响部分返回 Root，不自行补一个节点或改 authority。

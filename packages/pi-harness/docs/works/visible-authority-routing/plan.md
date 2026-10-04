# Plan: Visible Authority Routing

- [Work](work.md) | [Context](context.md) | [Waves](waves.md)
- State: **source delivery 与独立 source review 完成**；live model/provider/Host、reload、installed-runtime freshness 验收仍未完成。证据见 [Context](context.md#delivery-evidence)。
- Selected pair: 本目录 `plan.md` / `waves.md`；唯一 Work 为直接成员 `work.md`，无 overview 或 Tasks 层。Waves 是 sole executable graph，item 细节只在 Waves。

## Objective and authority

未来一个 coherent source-delivery scope：把可见 authority 评估与条件 SDD 的 accepted contract 最小对齐到现有 Router prompt、方法入口及 source assertions，并取得独立只读 final review。不把“指令可检查”升级为“模型会照做”。本图最初为准备产物；后续 source implementation 与独立 review 已完成。

权威输入：[PRD](../../prd/router-delegation.md#success-criteria)、[ADR-0010 Decision](../../adr/0010-visible-authority-assessment-and-conditional-sdd.md#decision)、[Router Spec C1/assessment](../../spec/router-delegation.md#visible-authority-assessment)、[§1.3](../../spec/router-delegation.md#13-evidence-branch-scheduling-and-strategy-loading)、[Skill Library conditional method](../../spec/skill-library.md#conditional-authority-first-method) 与 [composition](../../spec/skill-library.md#3-composition-rules)。已采用 dispositions/版本见 [Context](context.md#authority-dispositions)。没有 material 产品或架构选择由 Plan 创造；新 gap 返回 Router，不擅改 authority。

## Implementation scope

以下是供 Router 实质披露并取得明确当前用户确认的具体未来变化，不是当前写入授权。路径相对 `packages/pi-harness/`，八个允许写入的既有路径；共同 source predicate 与共享测试由一个 writer 拥有，不按 Skill 或文件分成独立任务。

| Owner/path | 最小具体变化与保全边界 |
| --- | --- |
| [extensions/pi-harness.ts](../../../extensions/pi-harness.ts) | 仅 `routerPrompt`：Phase 1 authority-before-plan 段要求可见五类 disposition/owner/path/reason、可靠 reuse 与局部重评；Phase 3 Skill selection 说明条件 SDD/窄 writer 与缺领域证据时的单独 assessment outcome。按需要在相应原段澄清而非新增固定 Phase；Router 不做领域评估。其余 schema、execute、registration、candidate、renderer 与整个 Phase 4 cleanup/progression 保留。 |
| [skills/delegation-strategy/SKILL.md](../../../skills/delegation-strategy/SKILL.md) | 既有授权/effect/admission 与领域选择之间增加同一 routing judgment：先使用已有 assessment，缺领域证据才委派单 outcome，必要 reconciliation 完成才能 dependent planning；条件 SDD、freshness 与直接窄 writer。只作为 Router-only source 编辑，不作为 Handler primary/companion 执行；六段 cleanup 和其顺序保留。 |
| [skills/spec-driven-development/SKILL.md](../../../skills/spec-driven-development/SKILL.md) | description/Method/Completion 的必要局部对齐：条件适用而非每阶段必经，当前 outcome 的 family handling/reuse，material gap 与重要 uncertainty，正常 primary/companion/conditional loading；将问用户/跨阶段措辞改为返回 evidence/gap，由 Router 决定沟通/授权/dispatch。保留既有窄 exceptions、preparation 及单结果完成边界。 |
| [skills/documentation/SKILL.md](../../../skills/documentation/SKILL.md) | branch action 加 `reuse`、owner/path/一句 evidence reason；对 false/missing/material gap/重要疑问使用正常加载的 SDD。将 “Complete all unblocked branches” 限定为当前 predicate 内部方法，独立 authority-writing/planning outcomes 不在同 Handler 暗中完成。复用既有 owning writers/ADR lifecycle，无新的文档分层。 |
| [skills/plan-implementation/SKILL.md](../../../skills/plan-implementation/SKILL.md) | planning 前消费覆盖当前版本的可见 assessment，缺失证据/重要疑问时条件加载 SDD 并报告/停止受影响 planning；可靠 reuse 不变成强制单独 assessment、逐阶段重载或新的写入权限。保留一个 coherent Plan、standalone 首份准备、Router scope confirmation 与 sole Waves graph。 |
| [skills/documentation-plan-writing/SKILL.md](../../../skills/documentation-plan-writing/SKILL.md) | 同样补齐直接 owning planner 的 pre-planning assessment/freshness/条件 method 边界；其余 matched tuple、unique IDs/DAG/gates、one Handler/Result 与不创造 authority 规则保留。 |
| [tests/extension.test.ts](../../../tests/extension.test.ts) | 扩展现有 synthetic generated-prompt checks：A1–A10 适用的可见义务、正/禁止条款与文本顺序；检查 assessment-before-dependent-planning、条件而非普遍 SDD、Router-only evidence consumption。保留 closed schema、single launch、绑定/raw evidence、standalone/planned 与既有 cleanup T1–T16 的全部断言/顺序。 |
| [tests/skills.test.ts](../../../tests/skills.test.ts) | 用既有 readSkill/metadata/discovery 模式补五个 modified methods 的有界条款与 A1–A10 对比断言，复用只读 ADR writer lifecycle 断言；保持全部原 metadata/library/Waves/SDD-preparation/strategy/T1–T16 coverage。不增加 helper registry、fixtures、测试框架或新测试文件。 |

不修改 `documentation-work`、ADR/PRD/Spec writers、`implement-plan`、`implement-change`、其他 Skills 或 Handler Agent：当前正文已有 owning/lifecycle/单结果/停止或确认边界，未发现本范围必须重写的相反条款。新增 evidence 若需扩大 owner 范围，报告 scope 变化而非无声加入写入。

## Strategy and compatibility

把同一 accepted contract 放在已有 routing 和 owning-method seams，source writer 在最新 baseline 上做最小 prose/description/断言变化；内部 verification 是这个同一 conformance predicate 的证据，不另拆一个 test outcome。随后独立 reviewer 对完整 Result 与相同当前字节进行只读判断；依赖和 release 只在 [Waves](waves.md) 定义。

- 逐 family 可见 assessment 用已有协调说明或有界 Result；不增加 assessment JSON/schema/文件/Result field/receipt/registry/CAS。
- 不复制整份 Spec、不强制每个阶段加载 SDD、不强制新 ADR。语义 coverage 和 identity lifecycle 不按文件数或调用数计量。
- Resolver 继续仅结构、references、tuple/current bytes、protected binding 与单次 selected-tool launch/raw evidence；不加入 semantic authority classifier、权限判定或 loaded-state 机制。
- 保留 [C8–C10](../../spec/router-delegation.md#12-collaborative-authority-and-layered-delivery)、[首份 preparation](../../spec/router-delegation.md#preparation-boundary)、[planned graph/release](../../spec/router-delegation.md#new-planned-work-document-and-release-contract)。准备不需要将创建的 tuple；实施不能借 standalone 绕过确认或 gate。
- [cleanup T1–T16](../../spec/router-delegation.md#todo-cleanup-acceptance-scenarios) 与两处 Cleanup 1–6 原文/顺序完整保全；正常模型评估、atomic/lossless 工具证明、current/active/unresolved 保留、失败/未知/重复/并发边界和 evidence preservation 均不变化。不引入 fixed tool/package dependency。

## Clause coverage

D1–D6 是本派生范围的引用标签，不是新规范、Result schema 或 graph IDs：D1 可见 family handling；D2 条件 SDD/必要 reconciliation；D3 freshness；D4 ADR identity/未接受选择；D5 窄 entry/exceptions/preparation/planned 保全；D6 Router/Handler 单结果职责。以下逐条消费 [A1–A10](../../spec/router-delegation.md#authority-assessment-acceptance-scenarios)；**所有拟议 checks 都只是 source/instruction assertions，真实模型 decision/Skill read 仍未验证**。

| Spec scenario / derived clause | 指令中须表达的义务与 source check 落点 |
| --- | --- |
| A1 / D1 | PRD/ADR/Spec 每 family 在 dependent planning 前有 `reuse/update/create/skip/blocked`、owner、existing/intended path 与一句 evidence reason，适用既有 authority 时 reuse；extension/strategy 的可见 routing 和 SDD/documentation/两个 planning methods 的 consumption；检查五类均有含义而非仅字符串列表。 |
| A2 / D4 | 同一 accepted ADR identity 的 amendment 是 `update` existing owner/path；documentation/SDD/Router guidance + skills 中只读 ADR writer lifecycle 对照，不新建 competing owner。 |
| A3 / D1+D4 | 必要 authority 缺失或不同 accepted lifecycle 才 `create`；目标 path 不伪装 readable ref，未知 ownership 不 invent；两份测试检查对应 instruction contrasts，无新实际 ADR 或未来 ref fixture。 |
| A4 / D4+D6 | 未接受/重要未决选择不写 accepted ADR、不 silently settle normative choice；Handler 返回 evidence/gap、Router 沟通，dependent planning blocked；SDD/documentation/两 planner/Router 正向与禁止条款。 |
| A5 / D5 | C8–C10 有明确 evidence 的 `reuse/skip`；不制造新 permission/SDD reload/ADR/Spec/Plan，不回溯重批 unchanged confirmed work；extension 和 skills 保全/对比 checks。 |
| A6 / D2 | false/missing/materially incomplete/important unresolved coverage question 触发 normally loaded SDD，可 primary/companion/条件加载；必要 reconciliation 先于 dependent planning，缺 owner/evidence/permission/intent 可见 blocked；各必要入口条款与文本顺序 checks。 |
| A7 / D3 | reliable prior assessment 覆盖 current scope/decisions/owners/versions 可 reuse；material change、contradiction、important uncertainty 只重评受影响部分；两测试排除每阶段/每 Handler 必重载或重做的正向强制要求。 |
| A8 / D2+D5 | settled evidence 支持窄 writer 直入而 assessment/authority/authorization 义务不免；SDD 非 exclusive ADR entrance，documentation/SDD/Router/planning 入口的成对正/禁止断言。 |
| A9 / D5 | first preparation 用 standalone/current readable inputs/declared outputs，不要求未来 tuple；graph-bound planned 前提不能 bypass，prepared/accepted 不等于实施确认；两测试保留既有 preparation/closed schema/tuple/gate checks。 |
| A10 / D6 | SDD/documentation/owning methods 仅当前 predicate；Handler 不问用户、dispatch、执行 independent branches、选择 continuation 或推进 Result/Waves/Todo；Router 缺领域证据委派单 assessment，不亲自 domain work；instruction contrasts 与现有单结果边界保全。 |

断言的负例应针对“每阶段必须 SDD”“每变更新 ADR”“assessment 授权实施”“Handler 可执行其他 outcome”等相反正向命令；不能因为 prohibition 含 `receipt`、`dispatch` 等单词就误判。复用现有测试模式，不实现 semantic classifier 或受控对话模拟器。

## Dependencies and conflicts

本范围 authority 已齐备；准备时 scope confirmation pending 已被后续完成实施及采用 review 的状态取代，非当前阻断。[peer Result/ownership/freshness 外部前提](context.md#peer-review-boundary) 中的真实 cleanup review 已完整读取，并由 Router 采用为满足 cleanup `W0/W1/W2/W3` 的 source evidence，无 in-scope blocking findings；不再把这个前置列为 pending，也不确认本 routing scope。未来相交写入只须核对当时 ownership、新 repair/review 冲突、authority/baseline/freshness 并保全已 reviewed cleanup；不产生本图外部 item ID、假 ref 或重新审批已确认且未变 cleanup 的轮次。本次不派发、协调 peer 或修改 cleanup gate。

一个 writer 拥有八路径；任何 cleanup repair、其他 prompt/strategy/test writer 与本范围 serialize，不能按同文件不同段落并行。final reviewer 与 candidate mutation 冲突，冻结其读取期间的相关字节；repair 后对应测试和独立 review 失效并需刷新。cleanup 若消费后来共享新字节，它自己的 verification/review/repair 依赖仍须保留，不能拿本 final review 替代。只读相同 sources/authority 不冲突；后台/测试资源重叠仍服从实际 delegate/tool 限制，未知时串行。

## Verification and completion

source writer 和独立 reviewer 所用最小 runnable checks（原准备未执行；后续 reviewer 已复现，见 Context；本次文档同步不重跑）：

```sh
bun test packages/pi-harness/tests/extension.test.ts packages/pi-harness/tests/skills.test.ts
bun run --cwd packages/pi-harness typecheck
```

并检查 owned-path diff/whitespace、A1–A10 source coverage、当前 tuple links/anchors/IDs/DAG/gates；逐字保全最新 baseline 两处 Cleanup 1–6 和两份 T1–T16/顺序断言，以及非 prompt Extension/schema/execute 和其他 inputs。只需现有 focused checks，不 full suite、不 Todo package tests/typecheck、不 LSP/live/新 harness runner；必要 in-scope failure 用同一 owner repair 后重跑，实质 scope/authority 改变回 Router。

实施完成要求 `W0` 和 `W1` gates：source predicate 的完整 completed Result、实际通过 checks、独立 review completed 且无未解决 blocking finding、与被消费字节匹配；仅 completed review 状态不抹去 blocking findings。具体 release rules 在 Waves。原四文档准备检查仅证明派生图一致性；当前 source gates 的完成依据是后续实施及独立 review Result，而非准备检查。

## Risks and exclusions

- Boilerplate action 列表或 stale assessment 看似合规：要求 owner/path/evidence reason 与 current-version reuse/局部重评的语义措辞和 reviewer 对照。
- broad method 易越界或强制新 ADR：局部缩紧 current predicate，复用 ADR writer；不要把 SDD 方法当永久协调控制器。
- 同源 cleanup 字节冲突：已有 peer review 已采用；执行前核对当时 ownership/freshness，保留新出现的相关 review/repair 资源，保全 reviewed cleanup。后来新字节不能沿用旧 review 身份，也不回溯否定旧字节已完成 source delivery。
- 静态 check 上限：不证明模型实际加载、评估可见性或遗漏率改善。真实 conversation/delegation 验收需 catalog/prompt/Skill reads/单结果 Handoff/完整 Result 证据，是本图之外且未授权执行的独立边界，不增加新 item 或 fake ref。
- 改动可局部撤销：若需撤回，仅由 owning writer 移除本范围新增 instruction/assertions，保留后来 cleanup/用户改动，不整文件回滚、不 Git reset/checkout。无需迁移或 release 机制。

本 scope 不含 authority/其他 Work/Agents/Resolver/protocol/backend/Todo/public release docs、settings/依赖/locks/generated files；不新增 assessment artifact/schema/receipt/registry/CAS/scheduler；不 install/reload/deploy/live、Git stage/commit/push/amend、当前 Todo mutation、Result/session/manifest/artifact 删除改写。任何 commit/runtime/model success 都不是本准备或本 source graph 的完成标准。

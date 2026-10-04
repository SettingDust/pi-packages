# Context: Visible Authority Routing

- [Work](work.md) | [Plan](plan.md) | [Waves](waves.md)
- 处理证据时间：2026-10-04；读取工作区 HEAD `09909e2a5acada2f9a18f68cc5750eb9c8a7ef35`。这是准备输入快照，不是安装宿主或未来执行字节证明。

## Authority dispositions

复用 parent 已采用的完整 reconciliation Result；本次只核对相关 authority 的正文与 SHA-256 是否仍覆盖同一范围，没有另做独立 assessment outcome。五类 action `reuse/update/create/skip/blocked` 的通用含义仍由 [Spec](../../spec/router-delegation.md#visible-authority-assessment) 拥有，不需要本范围同时采用所有 action。

| Family | 当前 action、owner/path | 一句话依据 |
| --- | --- | --- |
| PRD | `reuse`；Router 产品 owner，[router-delegation.md](../../prd/router-delegation.md) | Product、Preparation outcome、Success Criteria 已覆盖产品目的、Router/Handler 分工和独立实施确认，可见评估是既有 owning Specs 的技术细化，未发现 material product gap。 |
| ADR | `reuse`；[ADR-0010](../../adr/0010-visible-authority-assessment-and-conditional-sdd.md)，identity `pre-planning-authority-assessment-and-conditional-sdd-v1` | 已接受的同一决策直接覆盖可见评估和条件 SDD，本次不改变决策或创建新的 accepted lifecycle。 |
| Spec | `reuse`；Router 与 Skill Library 两个既有 owner，[Router Spec](../../spec/router-delegation.md)、[Skill Library Spec](../../spec/skill-library.md) | 前置 Result 的 `update` 已完成并采用，当前两个 hash 相同，C1/可见评估/条件 SDD/A1–A10 与单结果规范足以派生本 Plan。 |

这里将前置阶段的 Spec `update` 与现在消费已完成 authority 的 `reuse` 分开；没有把尚未完成的修改当作覆盖。若未来范围、decision、owner 或相关版本有 material change、反证或重要 coverage uncertainty，只重评受影响部分；未知 owner/path/权限/意图不能编造。assessment 不等于 authority-writing permission 或 implementation confirmation。

## Accepted constraints

- 正常 Skill 机制加载 SDD 的触发是 authority missing/false/materially incomplete/重要未决 coverage 问题；primary、companion、条件加载均可。settled 窄 writer 可直接进入，不逐阶段重复加载。
- ADR 同一 identity 复用/必要时 update existing owner；只有不同且 accepted 的生命周期才 create；未接受选择不写 accepted ADR。复用 [ADR writer 原方法](../../../skills/documentation-adr-writing/SKILL.md#method)，不以新 ADR 数量或 SDD 次数衡量覆盖。
- Router 使用已有协调证据，缺领域证据时委派单一 assessment 并消费完整 Result，不亲自做领域阅读/评估。Handler 的方法只服务当前 predicate，不问用户、不 dispatch、不执行其他独立 outcome；授权、用户沟通和 Result/Waves/Todo 推进仍归 Router。
- [首份 standalone preparation](../../spec/router-delegation.md#preparation-boundary) 使用真实 inputs 和声明的未来 outputs，不依赖将创建的 tuple；图绑定实施保留 planned、scope confirmation、item/Wave gates 和当前字节校验。C8–C10 不新增 permission，不回溯否定已确认且未变的 cleanup scope。

## Evidence provenance

以下是本机可读的输入 Result 容器，不是可移植仓库 artifact；均读取了完整 Result。locator 只标识现有证据，不授予写入权限或选择后续动作。

- `reconcile-visible-authority-routing-specs` generation 1，completed，parent 已采用：`c:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/reconcile-visible-authority-routing-specs-artifacts/result-1.json`。容器 SHA-256 `FA459FD06E97487D342D855408316FEC3E0FA76AC0A80F7EC762BE7827C1AE86`。其 PRD reuse/ADR reuse/Specs update、9 assertions/50 links 与保全检查是前置报告的实做，不是本次复跑；它记录 ADR 与签名 commit `1c118475f65d7fe7ba826390871acadf0fd073a5` 一致，本次不另做签名/信任审计。
- `trace-sdd-adr-adoption` generation 1，completed：`c:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/trace-sdd-adr-adoption-artifacts/result-1.json`。容器 SHA-256 `1AAF38F67EA98614163A5E4C1C120408960BD0C7BA1F24DD471ABCA2E159E155`。调查时 HEAD 是 `4d6e8fdabb14ebaea66547f920ee875fd6f5e42e`；支持入口/可观察性不对称，不证明少加载 SDD 导致 ADR 遗漏、真实加载率或需要更多新 ADR。
- `implement-router-active-cleanup` generation 1，completed：`c:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/implement-router-active-cleanup-artifacts/result-1.json`。容器 SHA-256 `DBA9686FA01EF7F363DF9B8B996A6A6E88388344F18DDA8E047B7DDF4C675A22`。其 I-RTR 四文件/T1–T16 source candidate、53 pass/1111 assertions/typecheck 是该 Result 的验证，不是本次测试或 cleanup final review。

## Current instruction evidence

以下为 preparation history 的指令差距快照，已被下文 Delivery evidence 中的 source implementation 与独立 review 取代；不是当前欠交付清单。

完整读取 Router extension、strategy、SDD、documentation、ADR writer、两个 planning methods、Work method，以及 PRD/Spec writers、implement-plan/change 和 Handler；读取现有聚焦测试相关段落作为 impact 输入。strategy 仅是 Router-only source 输入，不作为本 Handler 的协调方法执行。

- Router Phase 1 已含 authority-first、standalone/planned 和 scope disclosure；尚无逐 family 的五类可见 disposition/freshness/条件 SDD 明示。Phase 3 的 Resolver 仍结构/绑定/单次 launch；本 Plan 不改工具执行或 schema。
- strategy 已有完整 admission 与六段 cleanup；领域选择前缺相同可见评估和条件入口。SDD 已有 authority ownership/复用/确认原则，但 “settle ... with the user” 等跨阶段措辞需改为当前 Handler 返回 evidence/gap，并明确条件方法与 reliable reuse。
- documentation 当前 action 没有 `reuse`，且 “Complete all unblocked branches” 可能误导单 Handler 执行多个独立 outcome；本次只计划 current-predicate 分类/owner 方法对齐。
- plan-implementation 与 documentation-plan-writing 的直接规划入口须在消费 authority 前识别可复用的可见 assessment，遇 material gap 条件用 SDD 并停受影响规划；无需常态新评估/重载。Work method、ADR/PRD/Spec writers、implement-plan/change、Handler 已有相关 owning/single-result/停止或确认边界，本最小范围保留不改，不全面重写 library。
- 现有 `tests/extension.test.ts` 通过 synthetic `before_agent_start` 检查生成 prompt、闭合 schema/单次 dispatch 与生命周期顺序；`tests/skills.test.ts` 有 readSkill、metadata/discovery、Waves/SDD preparation/strategy/T1–T16 检查，可就地扩展，不新增测试框架或文件。规范中的历史状态文字不能替代当前 source 或 installed-runtime 证据。

## Input byte identities

路径相对 `packages/pi-harness/`；以下准备快照与前置 Result 对应 hash 均相符。未来 writer 必须使用处理 peer review/repair 后的最新 baseline，不能以本表冻结或覆盖后来字节。

| Path | SHA-256 |
| --- | --- |
| `docs/prd/router-delegation.md` | `90F605BCBC9A349B21E6667B98824D618C3DB1CBB955AF962552E6FD94F4200D` |
| `docs/adr/0010-visible-authority-assessment-and-conditional-sdd.md` | `F138C58C617D60AB9D14C9DD8AF9CEDB1F9A93EBB08F85247E72288F14D4195D` |
| `docs/spec/router-delegation.md` | `01F8671CE63D9E128BDF526FB53ABA048733F66AF60611331E38B8390CCDDF4D` |
| `docs/spec/skill-library.md` | `5627B27B5C4A60C42799D09BF2DA75E2FA2BDFE3D4C87A1EA6B575F30E2B398D` |
| `extensions/pi-harness.ts` | `12F9F49C1A996E04D07FDC35130CDB475C9C25AB3C1C185F0F29393C177FD104` |
| `skills/delegation-strategy/SKILL.md` | `720920B5E82DEF03FB22FDFDE70CBA43951D7BC311DD9C0A5EBEA1D30934139F` |
| `skills/spec-driven-development/SKILL.md` | `4BD1A4FEB76BCB6903B57655B4D974290283DCB7B6FD85C306F79409BD819648` |
| `tests/extension.test.ts` | `2FCB6B67BF95FF50F744893AED8F12A5268F28BC5DD5CB847C39F030784990F3` |
| `tests/skills.test.ts` | `0232618C5364C6C3FD4DB735366E49BEB1A7A058ADFC5D690FAB6953302819B6` |

## Peer review boundary

以下保留准备时的 peer evidence/freshness 历史；其中“当前文件”、未实施及未来 writer 均指当时。后续共享字节保全和 routing source review 见 Delivery evidence。

初次 Handoff 的 active peer 事实已被 Router 补充状态取代：`review-tool-agnostic-todo-cleanup` generation 1 完整 Result 已读取并采用，无 in-scope blocking findings；Router 已认定 cleanup `W0/W1/W2/W3` 满足 source delivery。这是外部 source evidence 的采用，不是本 routing implementation scope confirmation 或模型验收。本 Handler 没有协调/派发 peer，也没有修改 cleanup 文档或 gate。

本次另完整读取该真实 Result：`C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/review-tool-agnostic-todo-cleanup-artifacts/result-1.json`。容器 SHA-256 `16AC09FDD11EA1BA4C596DD08BAA0A9400C762EA8B4B34F929770B27B4D07262`。该 reviewer 实际复跑 53 Harness/114 Todo tests、两包 typecheck、scope/freshness 通过，均是其 verification，不是本准备运行；其四个共享 Harness 文件原始 hash 与本 Context/当前文件一致。真实 runtime/model 行为及 ADR-0010 指令实施均明确未验收。外部 Result 一处称 `Cleanup 1–11`，当前两个指令载体及两份顺序测试实际为 `Cleanup 1–6`；本图按真实 source 的六段及 T1–T16 保全，不据报告编号创造新段落或条款。

外部 review 取得/采用前置已满足，不再等待不存在的 output 或未知 repair；review 无需因本四份派生文件新增而重做。未来 source writer 仍须核对执行时共享文件 write ownership、没有新出现的重叠 repair/冻结 review、authority 与 baseline/freshness，并保全已 reviewed cleanup。缺新当前证据只阻断受影响相交写入；不创造 receipt、审批服务或新的 cleanup 确认轮次。

[cleanup Work](../todo-cleanup-contract/work.md) 及其 [Waves](../todo-cleanup-contract/waves.md#wave-w3-independent-source-delivery-review) 仅是外部 ownership/契约证据，不是本次 tuple。本文件记录 Router 的已有 gate 采用，不代它改 Status。此后本范围修改共享文件将改变整文件 hash，即使 cleanup 段落保留，也不能继续将旧 hash 的 review 报为新字节 review；若后续 cleanup 验收消费这些新字节，其既有 owner 必须保留所需刷新验证/独立 review/repair 的资源依赖。本图的 final review 只证明本图范围，不能代替 cleanup W3 或 Todo/provider/model 验收，也不回溯否定已完成的旧字节 source delivery。

## Remaining limitations

无新 material 产品/架构选择。source implementation 与独立 review 已完成，历史 confirmation pending 不再是当前阻断。真实模型 A1–A10 conformance、实际 provider/Host 效果、installed-runtime freshness、reload/deploy、SDD 加载率与 ADR 遗漏率仍未验证；source assertions 不能证明这些行为。

## Delivery evidence

当前 Handoff 明示采用的独立 review：`C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/review-visible-authority-routing-artifacts/result-1.json`；identity `review-visible-authority-routing`、generation 1、completed。其完整 report 核对了 `implement-visible-authority-routing` generation 2 的八路径 candidate，A1–A10/D1–D6、cleanup/non-prompt 保全均通过，无 blocking finding，支持 `I-ALIGN`/`W0` 与 `I-FINAL-REVIEW`/`W1` 的 source delivery。

reviewer 独立复现 59 Harness tests、1318 assertions、Harness typecheck，以及 53 links/anchors、tuple/IDs/DAG 检查。本次文档同步只采用该已读 Result 的历史验证，没有重跑 package tests/typecheck，也没有进行 live/model/provider/reload/installed-runtime 验收。

旧 cleanup review 的四个共享 Harness hashes 是准备基线，不是 routing 后的新字节身份；routing reviewer 通过逆向重建核对旧 baseline 和 Cleanup 1–6/T1–T16 保全。该 preservation evidence 不替代 Todo/provider 验收，也不重做 cleanup W3。上述 input hash 表及 peer 当时的 hash 相符声明均保留为历史证据；本次两份 owning Specs 和 tuple 状态文字变化后，不再声称这些文档仍等于旧 hash。

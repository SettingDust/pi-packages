# Waves: Visible Authority Routing

- [Work](work.md) | [Plan](plan.md) | [Context](context.md)
- State: **source delivery 与独立 review 完成。** 已采用证据支持 `I-ALIGN` / `W0` 及 `I-FINAL-REVIEW` / `W1` 的 source predicates；见 [delivery evidence](context.md#delivery-evidence)。本次仅同步已有证据，不作新 gate release、runtime 验收或授权。

本文件是所选 Plan 的 sole executable graph。Plan 定义 source/instruction alignment 加独立只读 final review 的同一范围；`W0`、`W1` 共同建立该 source-delivery outcome，不建立 runtime/model acceptance。本文件不执行 delegation、审批或调度。

## Admission and release rules

- 未来 implementation invocation 显式选择本目录直接 tuple `work.md`/`plan.md`/`waves.md`，以 `context.md` 为派生输入；不得选 cleanup tuple 或静默把 Tasks 当 Waves。准备时 Router disclosure/explicit current-user scope confirmation 曾 pending；该历史状态已被完成交付证据取代。prepared/accepted/路径/Resolver success 本身仍不能替代确认。
- 每个 item 只有一个 observable predicate、一位 Handler 与一个完整 Result；内部读取/测试是同一 predicate 的证据，不是独立测试 outcome。Handler 不协调其他工作、问用户、选择 continuation 或管理 Result/Waves/Todo；domain methods 只服务该 predicate。
- Router 先消费完整且 safely correlated Result 并 truthfully project，然后判断 item 和 gate。只有 `completed` 加 required evidence 才满足 item；`partial/failed/blocked`、missing/unadoptable Result、不足/冲突证据均不 release。独立 review 的 completed fact 若有 blocking findings，也不能使 source delivery gate 通过。
- 每个 gate 需列出的所有 items 及 release checks；只释放显式 dependents。item prerequisites 和所属 Wave 的 predecessor gates 同时满足；显示顺序和编号不产生其他依赖/全局 barrier。IDs/edges 仅本文件内解释。
- latest-state 写入与 review/repair serialize；共享只读 inputs 不冲突，未知资源或 delegate overlap 权限使用合法串行或 block。任何未来 action 都保留实际 tool/end-turn 契约；Waves 不是 scheduler、receipt、approval service 或固定 Result-to-action 映射。
- item 内 in-scope repair 由同一 owner 执行并实际 reverify；changed bytes 使相关 downstream review evidence 失效，Router 另取符合本 review predicate 的独立 assessment。变化若使 authority 无效或 scope 实质扩大，仅停受影响部分并报告 Router，不能扩大本图或擅写 authority。byte-only drift 不自动要求 unchanged confirmed scope 重批。

## Wave W0: Source instruction alignment

- **Wave ID:** `W0`
- **Items:** `I-ALIGN`
- **Predecessor Wave gates:** none
- **Incremental outcome:** 六个既有 instruction surfaces 与两份 focused tests 表达可见 assessment/conditional SDD 的一致 source contract，cleanup/preparation/planned/角色边界不变。
- **Release predicate:** 完整 `I-ALIGN` Result 为 completed 且下面全部 source checks/evidence 实际通过；A1–A10/D1–D6 coverage、scope/byte 保全与当前 tuple 合法，无未解决 in-scope source failure。只 release `W1` 及 `I-FINAL-REVIEW` 的相应 prerequisites，不宣告本 Plan 最终完成、cleanup W3 或模型 conformance。

### I-ALIGN — Coherent instruction contract and source assertions

- **Method:** 一位 Handler、一个 Result；domain primary `implement-change`，companion `llm-instruction-writing`。strategy 仅 read/edit input，不作为 Handler method。SDD 若新 evidence 符合条件则正常加载且只服务当前 predicate，不能利用它执行独立 reconciliation/planning outcome。
- **Scope/effects:** 在 [Plan 八路径边界](plan.md#implementation-scope) 内做最小 instruction/description/assertion 对齐；一个 writer 持有这些相互耦合的行为和共享 tests，不拆文件/Skill 任务。没有 authority 或新 runtime/schema 变化。
- **Completion predicate:** 所有需改变的入口一致表达 D1–D6/A1–A10 的 accepted meaning，既有 cleanup T1–T16、首份 standalone、planned gates/confirmation、Resolver structural/binding/single launch/raw evidence 与 Handler 单结果边界完整保全，且聚焦 source verification 实际通过；声明严格限 source/instruction conformance。
- **Prerequisite item IDs:** none
- **External prerequisites:** 准备时本 routing scope 的 Router disclosure/明确当前用户确认曾 pending；现有已采用 source delivery/review 证据已取代该历史阻断。`review-tool-agnostic-todo-cleanup` generation 1 完整 review 已真实读取并由 Router 采用，cleanup `W0/W1/W2/W3` source delivery 已满足，无 in-scope blocking findings；不再等待该 review，也不将它当本图 implementation 确认。执行前核对当时 shared write ownership、authority/baseline/freshness 与新出现的冲突 review/repair/freeze 责任，保全已 reviewed cleanup，依 [Context](context.md#peer-review-boundary) 判断受影响前提；没有新 receipt、本图外部 item ID 或假 ref。缺确认或实际当前前提 block 未来受影响写入。
- **Write ownership:** 只限 `packages/pi-harness/extensions/pi-harness.ts` 的相关 `routerPrompt` 段；`packages/pi-harness/skills/delegation-strategy/SKILL.md`、`packages/pi-harness/skills/spec-driven-development/SKILL.md`、`packages/pi-harness/skills/documentation/SKILL.md`、`packages/pi-harness/skills/plan-implementation/SKILL.md`、`packages/pi-harness/skills/documentation-plan-writing/SKILL.md` 的必要局部；`packages/pi-harness/tests/extension.test.ts`、`packages/pi-harness/tests/skills.test.ts` 的新增/受影响 focused instruction assertions。其他 paths 不写。
- **Conflicts:** 所有共享 extension/strategy/tests writers、cleanup 的未决修复或需冻结字节的 review 与本 writer serialize；不因不同段落允许并行。同一 contract 的其他 method edits 也需 ownership 核对。不能覆盖准备时 hash 后的新改动。不得操作 Todo、cleanup Work 或 Results/sessions/Git。
- **Internal work:** 完整读 selected tuple/authority/current owners/tests 及 Router 提供的真实 peer evidence；核对适用 assessment 的可靠 reuse。以处理 peer findings 后的最新字节为 baseline，保留既有 cleanup sections/test cases，按 Plan scope/coverage 局部改文案和 source assertions；有新 material gap 则只报告 block/change，不选择新规范。执行聚焦 checks、baseline span/范围比对，记录实际字节、变更与限制。
- **Required evidence:** 完整 Result 指明写入 inventory/当前字节 SHA-256、实际 eight-path-or-subset diff、D1–D6/A1–A10 的 instruction/assertion mapping；实际 `bun test packages/pi-harness/tests/extension.test.ts packages/pi-harness/tests/skills.test.ts` 与 `bun run --cwd packages/pi-harness typecheck` 命令/退出/输出；owned diff whitespace/scope 与本 tuple links/anchors/IDs/DAG 检查；最新 baseline 两处 Cleanup 1–6 原文/顺序、两份 T1–T16/顺序 tests 及 non-prompt extension/schema/execute/其他 inputs 保全证明。peer Result provenance/ownership/freshness 与 scope confirmation 由 Router 现有上下文提供，不生成 receipt、manifest 或新身份机制。不能用前置的 53 pass/1111 assertions 代替本次 checks。
- **Result consumers:** 本图 `I-FINAL-REVIEW`；Router 单独判断 source progression 和共享新字节对 cleanup verification/review freshness 的影响，不由 Handler决定续行。

## Wave W1: Independent source final review

- **Wave ID:** `W1`
- **Items:** `I-FINAL-REVIEW`
- **Predecessor Wave gates:** `W0`
- **Incremental outcome:** 一个独立只读 conformance/evidence assessment 判断同一 source candidate 的实际覆盖、保全和证据上限。
- **Release predicate:** 完整 `I-FINAL-REVIEW` Result completed，引用当前被消费字节及完整 source Result，required review checks 通过，无 unresolved blocking source finding/ownership 或 evidence conflict；blocking finding 即使 review completed 也不 release。连同 `W0` 才建立 Plan source-delivery completion。没有下游 executable item；不自动 commit、reload、model acceptance 或 cleanup gate release。

### I-FINAL-REVIEW — Independent read-only conformance and evidence assessment

- **Method:** 一位独立 Handler、一个 Result；primary `review-correctness`，companion `review-evidence`。不能是本 candidate 的 implementer。
- **Scope/effects:** 只读完整 `I-ALIGN` Result、selected tuple、accepted authority、当前 candidate/必要只读输入与实际 test evidence；复现最小 source integration checks，在 Result 内报告 findings/limits，不 repair、创建 review.md 或变更任何项目文件。
- **Completion predicate:** 独立 assessment 准确判断当前 source candidate 是否满足已确认范围及 D1–D6/A1–A10，保全 cleanup/standalone/planned/ADR identity/单结果边界，给出可复现证据、findings、blocking disposition 与 source-versus-model limitations，没有把关键词通过或 review status 当 runtime 成功。
- **Prerequisite item IDs:** `I-ALIGN`
- **Write ownership:** none；只有 Result report。无项目、测试、authority、Work、依赖/锁/generated output、Git/runtime/Todo/evidence 写入。
- **Conflicts:** 前提是 `W0` 已实际满足，不是 terminal summary 或旧 candidate 通过。review 的相关字节读取期不与 writer/cleanup repair overlap；漂移必须明确标识受影响检查，不能报 same-byte completion。只读复现 checks 需无 install/仓库输出写入并符合实际资源契约。它不改或满足另一 Work 的 I-REVIEW/W3。
- **Required evidence:** 完整 prerequisite Result provenance/current reviewed SHA-256 与确认范围；对 Plan coverage 逐行检查 actual instruction/assertions、已有 ADR writer reuse，反向防止独立 outcome/强制 SDD/新 ADR 数/新 schema/权限侵入；逐字与最新 baseline 检查 cleanup 保全并检查 source diff ownership。实际复现同两份 Harness focused tests 和 Harness typecheck，报告命令/退出/输出；tuple links/anchors/ID uniqueness/item+gate DAG/非自依赖及 diff/whitespace；明确 peer review/repair freshness、无当前 live/model 验收或实际加载率声明。无需两包 typecheck/full suite/LSP/live；cleanup reviewer 的 commands 不能归为本 reviewer 实做。
- **Result consumers:** Router 判本 Plan source completion；独立 runtime/model 或 cleanup acceptance 不在此图且不能由本 Result 代替。

## Exact graph and outcome gates

```text
I-ALIGN -> I-FINAL-REVIEW
```

item prerequisites exactly: `I-ALIGN: []`，`I-FINAL-REVIEW: [I-ALIGN]`。
gate prerequisites exactly: `W0: []`，`W1: [W0]`。

每个 gate 还依赖自己的 listed item predicate；combined dependency order 为 `I-ALIGN -> W0 -> I-FINAL-REVIEW -> W1`，且 review 另有明确 item edge `I-ALIGN -> I-FINAL-REVIEW`，不存在 gate 自依赖。external confirmation/peer/ownership/freshness 是实际执行前提，不是本图造出的未来结果或 approval gate。只有 `W0`、`W1` 合计满足 Plan outcome；当前 source 完成状态依据 Context 中已采用的实施及独立 review 证据；不以 prepared 字段或 review status 单独推导完成。

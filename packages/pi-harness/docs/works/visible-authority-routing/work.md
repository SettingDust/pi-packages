# Work: Visible Authority Routing

- Status: source/instruction delivery 已完成，独立只读 review 已通过，无 blocking finding；live model/provider/Host 验收、reload 和 installed-runtime freshness 仍未验证。见 [delivery evidence](context.md#delivery-evidence)。
- [Context](context.md) | [Plan](plan.md) | [Waves](waves.md)

## Objective

从已接受的 ADR-0010 与已同步的两个 owning Specs，准备一个最小、可确认的指令对齐范围：规划前可见 PRD/ADR/Spec disposition，必要时条件加载 SDD，可靠评估复用及窄 writer 直入，同时保持 Handler 单结果和 Router 协调职责。当前唯一产出是本目录四份派生文档；不实施其内容。

## Authority

- [Router Delegation PRD](../../prd/router-delegation.md#success-criteria)：复用既有产品意图和角色边界。
- [ADR-0010](../../adr/0010-visible-authority-assessment-and-conditional-sdd.md#decision)：复用 accepted identity `pre-planning-authority-assessment-and-conditional-sdd-v1`；决策接受不等于实施确认。
- [Router Delegation Spec](../../spec/router-delegation.md#visible-authority-assessment) 与 [Skill Library Spec](../../spec/skill-library.md#conditional-authority-first-method)：已完成 owning Spec reconciliation；本 Work 不再修改 authority。

当前 dispositions 与证据版本见 [Context](context.md#authority-dispositions)。Work/Context/Plan/Waves 是派生材料，不授予权限，不建立 acceptance/receipt 或持久 admission 状态。

## Selected scope

只有一个直接配对 tuple：本目录 `work.md`、`plan.md`、`waves.md`，以及派生输入 `context.md`。Plan 描述同一个 source/instruction 对齐范围；Waves 是唯一可执行图，不创建 `tasks.md` 或 overview。未来每个 planned invocation 必须显式选择该配对并满足当前字节与实际前提，不能借用 cleanup 的 tuple。

建议确认的未来效果是六个既有指令表面及两份现有聚焦测试的最小对齐，随后独立只读 final review；具体 owners、重要排除、验证、取舍和完成标准见 [Plan](plan.md#implementation-scope)。当前不会派发任何 item。这是准备阶段的历史披露边界；当时的 confirmation pending 不再是当前阻断。现有 source delivery 与独立 review 已完成，不新增审批工具或逐 item 授权轮次。

## Dependencies and exclusions

cleanup peer 完整 review 现已读取并由 Router 采用为满足 `W0/W1/W2/W3` 的 source evidence，见 [Context 的外部资源前提](context.md#peer-review-boundary)；这不确认本 routing scope。未来写入与其 extension/strategy/tests 相交，仍核对执行时 ownership/freshness，保全已 reviewed cleanup 并按实际新字节影响保留所需刷新验证/review/repair 资源。本 Work 不自行判定或改写 cleanup gate/文档，也不要求 unchanged confirmed cleanup scope 重新授权。

不改 PRD/ADR/Specs、其他 Work、Handler Agent、Resolver/schema/backend、Todo package、依赖/锁、公共发布文档；不新增 assessment 持久文件、JSON 字段/schema、receipt、registry、CAS 或 scheduler。不安装/reload/deploy/live、不做 Git writes/stage/commit/push/amend、不操作当前 Todo，不删除或改写 Results/sessions/manifests/artifacts。

## Completion signal

Current source delivery is complete: `W0` and `W1` have completed Results and passing release checks, and the independent final review found no blocking source or evidence findings. The routing source review independently reproduced 59 Harness tests/1318 assertions, Harness typecheck, and tuple/links/IDs/DAG checks. Actual Router model behavior, provider/Host behavior, reload freshness, and installed-runtime acceptance remain separate and unverified.

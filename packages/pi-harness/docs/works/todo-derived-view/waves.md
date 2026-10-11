# Waves: Todo 单向派生运行规则

- [Work](work.md) | [Plan](plan.md) | [Context](context.md)
- 本文件是该 Plan 的**唯一可执行图**。初始图的结构、谓词与 owner 保持不变；当前仅补记 Root 已确认/采纳的源码完成事实，不重新决定或释放 gate。
- 一个 Wave / 一个 item / 一个 Handler / 一个 Result；内部检查没有独立 Result，不按文件、检查或显示顺序拆节点。

## W-TDV-01

- itemIds: [I-TDV-01]
- prerequisiteWaveGates: []
- Incremental outcome：Router 模板、strategy、必要 release 指令镜像及其聚焦断言共同符合 Todo 单向派生规范，保留独立执行/采纳/gate 边界。
- Plan outcome coverage：本 Wave 唯一 gate 证明 Plan 的全部源码/指令候选与聚焦证据 outcome；不证明已启用或 live acceptance。
- waveGate：Root 完整读取并可靠关联 `I-TDV-01` 的单一 Handler Result；该 Result 为 `completed` 且满足下述唯一完成谓词/所有必要验证证据；Root 另外核对最终五文件 scope、一致语义及证据充分性，才能认定本 Plan 的源码范围完成。`partial`、`failed`、`blocked`、missing/unadoptable Result 或不足证据都不满足。
- Gate exclusions：不要求旧 Todo/角色闭合、Todo 存在/成功投影、旧身份或 survivor 连续性、先选择显示来源、历史 T 结果、真实 Todo 重建、model trace、Host loaded-byte 证明、安装/reload/启用或 Git。事实可用 Todo 或普通消息诚实呈现；显示失败不改变独立 gate 判断。
- dependentWaveGates: []

没有 item 或 gate 自依赖、循环、隐式 predecessor 或待补外部 graph 依赖。该 gate 没有自动后继派发；Wave 编号和文档/display order 不形成 barrier。实际权限、scope confirmation 和当时有效 tuple/current-call/JIT、冲突、delegate contract 是实施准入边界，不是 Todo 显示 gate。

## I-TDV-01

- prerequisiteItemIds: []
- containingWave: W-TDV-01
- Execution unit：一个 bounded Handler 完成下面的同一治理修正并返回一个完整 Result；不运行 Router-only strategy 协调，不派发其它工作。

### Objective 与唯一完成谓词

在确认后的下列五文件写边界内，使运行规则和必要指导镜像允许由明确选定来源重建/替换/清空 Todo，删除旧显示生命周期和 projection-before-admission/adoption/release 耦合，同时保留实际执行/完整 Result/依赖门槛；对应新规范和未变契约的聚焦测试、TypeScript 和 changed TS LSP 有充分通过/覆盖证据，且没有未解决的 scope 内缺陷。

这是一个耦合源码合约修正的单一完成谓词。步骤、哈希调整和验证都是它的手段，不产生独立 audit、review、历史恢复或模型实验结果。源码完成不包含当前 Host 已加载或实际模型遵循。

### Required inputs 与 permission boundary

- [Work](work.md)、[Context](context.md)、[Plan](plan.md) 和本 Waves 是已存在的选定 tuple/processed context；未来 planned Handoff 的 authority refs 是 work/plan/waves 各一次，不把 Context 加为 selector。
- [PRD](../../prd/router-delegation.md)、[ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md)、[Router Spec](../../spec/router-delegation.md)，重点是派生显示、planned release、§1.3 与 T1–T16；[ADR-0007](../../adr/0007-authority-first-router-admission.md) 和 [Skill Library](../../spec/skill-library.md) 保持权限、准入与角色边界。
- 下表五个 owner 的当前内容和现有 tests/fixtures；[package.json](../../../package.json) 与 [tsconfig.json](../../../tsconfig.json) 仅作为既有验证配置输入。
- 当前用户已在实际 `ask_response` 选择「确认修改（推荐）」，明确确认五文件变化、两个测试/typecheck/active TS 与 Todo API/重建/模型/安装/reload/Git 排除项；Root 随后启动并采纳实施。此前待确认属于准备历史，不新增确认日期/receipt/admission 字段；旧 authority 同意、修复原则或旧 Plan scope 确认不替代本次实际确认。
- [旧 Work](../todo-cleanup-contract/work.md) / [旧 Plan](../todo-cleanup-contract/plan.md) 只读历史，绝不重开/执行/复写其完成图。无旧 Todo 关闭证据依赖。

### Write ownership 与 conflicts

| 已确认独占写 owner（原实施范围） | 允许 effects / 不变边界 |
| --- | --- |
| [extensions/pi-harness.ts](../../../extensions/pi-harness.ts) | 仅 `routerPrompt` 的旧 cleanup 段、后续 checkpoint 及 Phase 2/3/4 相关显示/投影耦合。保留其它确认/authority/role/capability/binding 规则和动态 catalog/candidate 尾；不改 schema、Resolver execute、renderers、Result hooks 或注册行为。 |
| [skills/delegation-strategy/SKILL.md](../../../skills/delegation-strategy/SKILL.md) | 同步 Method 6/7、cleanup/checkpoint 的对应单向显示规则；只有确实携带相同旧关系的措辞随之调整，保持 Router-only、admission、工具/权限及完整 Result 契约。 |
| [skills/documentation-plan-writing/SKILL.md](../../../skills/documentation-plan-writing/SKILL.md) | 仅 Method 10 的 `projects truthful Todo state before release decisions` 句，改为 Todo/普通消息诚实表达与 release 独立；保留其 completed/evidence/显式 dependents、完整 Result、confirmation 和图规则。Context 已给出实际读取证据。 |
| [tests/extension.test.ts](../../../tests/extension.test.ts) | 改受治理修订影响的生成 prompt、projection/release ordering、strategy/T 对照及三处 Router 固定文本哈希/段锚点。保留 task scalar 不改固定指令、Handler/Herdr 哈希、protected binding、单次调用、Resolver/raw-return、Result summary/full/offline SDK 投影与执行 gates。 |
| [tests/skills.test.ts](../../../tests/skills.test.ts) | 改 strategy 的旧 T1–T16/cleanupOrder；在现有 new-plan Skill 测试中增加 Method 10 的最小解耦正/负断言。保留 discovery/frontmatter、authority/standalone/planned、角色、唯一 Waves 图和依赖检查。 |

五文件由本 item 一个 Handler 持有同一写边界。不与写相同文件、相同指令/authority/行为合约或相关副作用的工作重叠；发生冲突序列化到最新状态并由 Root 判断。共享只读 authority/历史不是冲突。没有其它 item 或为了顺序形成的全局 barrier；新增确实必要 owner 或实质 scope/gate/风险变化返回 Root，不静默扩写。

### Internal execution steps

以下保留原实施步骤与准入条件，供已完成源码范围追溯；初始准备未执行，后续实施证据见下节。本次仅记录事实，不重新执行：

1. 读取当前 tuple/authority/五 owner，确认本 scope 及既有输入仍匹配；使用实际所需方法，不把 strategy 当作 Handler 协调技能。保留 unrelated user edits，不恢复旧文件/旧 Todo。
2. 在 Router 固定模板与 strategy 中一次性替换旧生命周期限制并解耦三个入口：前置协调事实可经 Todo 或普通消息可见，projection 成功不作为 launch 准入；终态 full Result 读取/关联/采纳与 Todo 更新分离；item/Wave release 只据证据和谓词。同步 Plan-writing Method 10 的已证实镜像，不改其它方法。
3. 用既有测试 harness/fixture 改受影响断言和 T1–T16 对照，加入关键旧 blocker 的负断言及 mirror 最小回归；不新增 Todo API mock 或实际 Todo mutation。保留读取、权限、scope/prerequisite/gate 与固定绑定的原测试强度。
4. 在最终授权文本上重算三处受影响 Router hash：pre-Phase-4 切片（包含 Phase 2/3）、替换 cleanup 后的尾段、完整固定 Router literal。若段标题改名，先更新切片 anchor 并断言其存在/唯一，再取 hash，不能让 `indexOf` 的负值或空切片成为“通过”。不改 Handler body/Herdr suffix 的未受影响哈希，不新增 freeze ledger。
5. 运行下列最小验证，修复 scope 内问题并仅重跑受影响检查；完整 Result 给出实际 diff/scope、语义覆盖、命令结果、主动 LSP 覆盖与未启用/未验证模型的限制。无法建立必要证据则不称完成；实质新决定/权限/范围变化返回 Root。

### Semantic coverage 与最小 source assertions

这是静态 instruction/schema wording 覆盖，不是实际工具效果或模型行为验证。复用两个现有测试文件，T IDs 由当前 Spec 拥有：

| Spec scenarios | 必要正/负对照 |
| --- | --- |
| T1–T4 | 明确选定 Work/authority/Plan-Waves/可靠事实/当前协调项才是来源；旧 cancelled/unstarted/missing Result/current/active/unresolved/same-name/status regression 不阻止整表重建/替换/清空；仍不推断采纳或业务完成，不要求先关闭角色/当前职责。 |
| T5–T8、T11 | 真正可调用 schema/description/contract 决定能力，无固定包依赖或新 ID/CAS；局部 remove 精确选择、保全非目标并原子拒绝无效批；group/full clear 无旧子项/container 闭合门槛，`todo_set({tasks: []})` 允许清空且不取消 actual active 执行。 |
| T9–T10 | set 无 status 输入；set 后新集合不歧义精确名称的 transition 是正常派生，明确 pending/in_progress/completed/cancelled 的来源；partial/failed/blocked 留在 description/消息且非 completed；未启动撤出与未确认 active cancellation 分开。不得保留禁止 set+transition、要求 lossless 整表 survivor 或跨调用事务的旧断言。 |
| T12、T14 | 显示重派生允许，旧通知不按同名 retarget；重复采纳/release 幂等与冲突/不确定关联 fail closed 保留，restart/replay 不把这个业务安全条件变成显示 retain/rebuild 禁令。 |
| T13、T15–T16 | 部分 set/transition 对齐与未知效果分别报告，不盲目重试/恢复旧快照；active/已完成 effects 的职责独立但不形成 clear-before 条件；投影缺失/失败通过普通消息呈现，不阻塞独立满足的采纳/admission。显示不修改图/Results/sessions/manifests/artifacts 或调用 subagent_remove。 |
| 独立 execution/release 与 mirror | Full Result 阅读/可靠关联、四 Handler 状态、实际权限/确认、prerequisite/冲突/Wave gates 保持；删除“先成功 project Todo 才 resolve/release”的 ordering/断言，替换为事实诚实可见且不以显示结果作 gate。Method 10 同样包含该正向关系，并拒绝旧 `projects truthful Todo state before release decisions` 句。 |

保留既有 unrelated schema、dispatch、ordinary JSON read/decode、Result summary/full、固定 instruction/task-tail 与 item/Wave 门槛回归，不能为通过新 wording 断言而弱化它们。每个新 T 对照同时检查核心允许/禁止关系，不以只有新标题存在作为覆盖。

### Verification 与 required evidence

在 repository root，复用已安装环境：

```text
bun test packages/pi-harness/tests/extension.test.ts packages/pi-harness/tests/skills.test.ts
bun run --cwd packages/pi-harness typecheck
```

主动 LSP probe 覆盖三个 changed TS 路径：

```text
packages/pi-harness/extensions/pi-harness.ts
packages/pi-harness/tests/extension.test.ts
packages/pi-harness/tests/skills.test.ts
```

必要证据是上述两个现有测试文件的实际通过结果（含 generated prompt、strategy、新 T 对照、Method 10、保留回归），现有 TypeScript 检查通过，三个 changed TS 的主动 LSP 结果/覆盖情况，以及最终五文件变化符合限定 owner/语义。仅空 session diagnostics cache 不算 LSP clean；实际 unavailable/timeout/未覆盖必须如实报告，不能伪造通过。不得有未解决的新 scope 内错误；已有无关诊断需标明证据和边界。

无需全库测试或 source 审计节点；若聚焦失败证实需扩大验证或 scope，保留具体原因，实质变化由 Root 判断。所有证据来自本 item 的内部验证；没有独立 review Result、历史 T 通过前置或实际 Todo/API mutation。源码/Schema/静态 prompt 检查不声称实际模型遵循或 Host 启用。

### Root 已采纳的源码完成事实

- [源码实施 Result envelope](c:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/implement-todo-derived-view-rules-artifacts/result-1.json)：本次完整读取并 JSON 解码，`subagentId: implement-todo-derived-view-rules`、`generation: 1`、transport/Handler 均 `completed`，无 envelope error。
- Root 已完整读取、关联并采纳 Result，核对五文件 scope 与证据，认定 `I-TDV-01` 源码范围完成、`W-TDV-01` 源码完成谓词满足；没有未解决的 scope 内错误。此处只记录既定 Parent 决定，不由本 Handler 重新评审、采纳或释放 gate；图无后继或依赖需释放。
- 五个既定 owner 的源码 diff 为 270 additions / 198 deletions；两个测试 89 pass / 0 fail（38 + 51），typecheck 退出 0；三个 changed TS 的 primary-server/error 主动检查各 clean=1、0 diagnostics、0 inconclusive。
- all-server 辅助检查仍有 43 条未改区域旧提示/警告，timeout 与 push-only silent-on-clean 两项覆盖未确认；后续 primary/error 结果不证明全部服务/全部严重度 clean。[Context](context.md#当前源码完成证据与启用限制)保留摘要与限制，本次未重跑测试/typecheck/LSP。
- 完成仅限源码/指令候选；未安装/reload、验证当前 Host loaded bytes、模型 trace 或真实 Todo 重建，未 Git 写入。当前会话加载新规则及真实模型/Todo 效果未证实，均不加入原 gate。

### Exclusions 与 material risks

不改 PRD/ADR/Spec、其它 Skills、旧 Work/图、Todo API/包、Resolver/Handler/Herdr 代码、依赖/锁文件；不加同步器、scheduler/queue、ledger/receipt/IDs/CAS、新工具、mock framework 或 tasks。禁止借显示改图状态、删除证据、subagent_remove、当前 Todo 重建或挑选全部 Work/临时项。

两个关键限制必须随 Result 披露：set+transition 非跨调用事务，可有部分显示对齐，未知效果不能自动重试/复原；源码和静态测试不会更新当前 Host 已注入 prompt/已加载 Skill，不证明模型遵循。实际 Host loaded-byte 证明、真实重建、model trace、模型实验、安装/reload/启用/部署、Git 均不在这个源码 item，另需说明/授权而不是隐含 waveGate。

# Context: Todo 单向派生显示

- [Work](work.md) | [Plan](plan.md) | [Waves](waves.md)
- 本文件仅保存处理后事实、输入引用、目标和未完成限制；不复制 raw transcript、完整 Handler report 或执行日志。

## 当前 authority 与可靠评估复用

Root 已披露并完整采纳三 owner 修订。当前版本一致规定 Todo 是可重建/替换/清空的单向显示；不重复写 authority，不重作已经覆盖当前 scope 的 assessment。

| Family / action | 当前 owner | 复用理由 |
| --- | --- | --- |
| PRD / `reuse` | [Router Delegation PRD](../../prd/router-delegation.md) | Todo amendment、Product、Scope、Success Criteria 已表达明确来源、可替换显示和执行/采纳独立性，覆盖本次运行规则修正。 |
| ADR / `reuse` | [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md) | 沿用同一职责分离决定，已撤销整表旧账闭合/保留保证，保留实际执行职责与显示的分离；不需要新 ADR。 |
| Spec / `reuse` | [Router Delegation Spec](../../spec/router-delegation.md) | Boundary、历史 cleanup anchor、planned release、§1.3、§6 与修订 T1–T16 已给出来源、真实 API、错误/未知效果、独立 gate 和同目录 tuple/图规则。 |

[ADR-0007](../../adr/0007-authority-first-router-admission.md) 与 [Skill Library Spec](../../spec/skill-library.md) 的既有权限、standalone/planned、tuple/current-call/JIT、确认及 Skill/Handler 边界继续 `reuse`。没有重要未决产品/架构选择；已知 instruction drift 是实施影响面，不是 authority gap。assessment 不授予写 authority 或实施权限。

三 owner 修订 Result 的既有记录（原 envelope 未入库，非可移植原报告入口）：初始准备时完整读取并实际 JSON 解码；`subagentId: sync-todo-derived-view-authority`、`generation: 1`、transport `status: completed`、无 `error`，解码后 Handler `status: completed`。其当前三 owner 修订、真实工具边界、未改指令/未启用/未验证模型等限制与 Handoff 中 Root 采纳事实共同构成复用依据；不追加历史评估/会话恢复任务。

## 处理后的必要规则

1. 来源是明确选定的 Work 入口、accepted authority、Plan/Waves 范围、可靠执行事实和当前明确协调项。Work 不是唯一 authority；真实显示操作才选择具体来源，本准备不选择所有历史 Work 或当前临时项。
2. 旧取消、未启动、缺 Result、同名、状态回退及 current/active/unresolved 职责，不阻止重建/替换/清空或整组删除。整表没有旧身份、survivor 字段/order/status 连续性要求；实际职责仍存在，必要时通过普通消息可见，但不成为 clear-before 门槛。
3. 使用当时可调用工具的真实 schema/description/contract。`todo_set` 仅接收名称/description，没有 status；set 后按新集合不歧义精确名称通过 `todo_transition` 赋 pending/in_progress/completed/cancelled；`todo_set({tasks: []})` 可以清空，不要求跨调用事务。局部 remove 保全非目标并按实际契约原子拒绝无效混合目标；它不是整表保全条件。
4. native 状态来自实际来源；partial/failed/blocked 保留在 description 或普通消息且不能改成 completed。未启动撤出与未确认取消的 active 执行分开。
5. set 成功、transition 失败是已确认的部分对齐；效果未知则不声称成功或无效果，不盲目重试/补偿/恢复旧快照。缺失或失败的 Todo 投影通过普通消息报告，不增加 Result 采纳或执行准入门槛。
6. 完整 Result 阅读/可靠 task-generation-scope 关联、四种 Handler 状态、实际权限、确认、prerequisite、冲突和 Wave gate 始终独立。显示重派生不重复 Result 采纳或依赖释放，旧通知不按同名直接更新/删除新项；关联不确定仍阻塞受影响 Result 的采纳/release，而非显示替换/清空。显示操作不取消真实任务、不修改图或 Results/sessions/manifests/artifacts。

规则 owner 是上述 Spec；这份提要不扩充规范。

## 实施前历史定位与已证实影响面

以下是初始准备阶段读取的实施前 snapshot；行号、旧措辞和待修改描述不是当前源码现状。五 owner 已按确认范围完成，当前证据见下节；历史定位保留用于解释实施范围，不是当前 Host 加载或模型行为证明。

| 输入 owner | 实施前证据 / 限定影响 |
| --- | --- |
| [Router extension](../../../extensions/pi-harness.ts) | `routerPrompt` 位于第 321–364 行；Phase 2/3/4（338/340/342）含 pre-action projection、重复通知限制和 after-projection release 耦合；344–358 的 Cleanup 1–6 与后续 checkpoint 仍要求 Result/role closure、旧身份与 survivor/stability 证明并禁止 set+transition。只规划该固定模板的相关治理措辞，不改 Resolver/schema/renderer/Result hook。 |
| [Delegation strategy](../../../skills/delegation-strategy/SKILL.md) | Method 6/7（19/20）及 Todo cleanup（22–36）镜像上述投影与生命周期限制。作为只读实施输入；没有把 Router-only 方法加载为本 Handler 的执行方法。 |
| [Plan-writing 指令](../../../skills/documentation-plan-writing/SKILL.md) | 初始准备时 companion 正常加载后发现 Method 10（19）明确写 `projects truthful Todo state before release decisions`。必须在同一个治理 item 内同步这句，否则后续 Plan 指导会重新施加反向 gate。只改这句关系，保留 full Result、completed/evidence、显式 dependents、confirmation 和 graph 规则。 |
| [Extension tests](../../../tests/extension.test.ts) | 214–231 的 ordinary-read/两段 source 哈希、233–267 的固定 Router 文本/动态 task/绑定测试；667–711 的投影与 release wording/order；792–895 的旧 T 场景/cleanupOrder。重新定位被替换段的哈希锚点并只更新受影响值；保留 Handler/Herdr 哈希与所有不相关断言。 |
| [Skill tests](../../../tests/skills.test.ts) | 93–110 的 Waves 唯一图测试可容纳 Method 10 最小回归；238–342 的旧 strategy T1–T16/lifecycle order 要改为新契约。metadata/discovery、authority/admission/角色等不相关覆盖保留。 |
| [Package manifest](../../../package.json) / [TypeScript config](../../../tsconfig.json) | 现有 `test: bun test`、`typecheck: tsc --noEmit -p tsconfig.json`；复用既有脚本/fixtures，无依赖、工具或 mock framework 扩展。 |

## 当前源码完成证据与启用限制

源码实施 Result 的既有记录（原 envelope 未入库）：当时完整读取并 JSON 解码：`subagentId: implement-todo-derived-view-rules`、`generation: 1`、transport `status: completed`、无 `error`，解码后 Handler `status: completed`。Root 已完整读取、关联并采纳该 Result；下列是已采纳证据摘要，不是完整原报告的替代，也不是本次重跑或独立评审。本次维护仅核对仓库记载，无法据此完整复核原报告与历史执行；不改变既有完成与 gate 判断。

- 当前用户实际 `ask_response` 选择「确认修改（推荐）」，明确确认五处文件、两个测试/typecheck/active TS 及排除 Todo API、重建、模型、安装/reload/Git 的源码 scope。Root 随后启动并采纳实施；此前待确认只是准备 snapshot，不造确认日期、receipt 或 admission 字段。
- 五个 artifact 对应 Router 模板、strategy、Method 10 镜像、两个测试 owner，限定源码 diff 为 270 additions / 198 deletions。旧显示阻塞及投影耦合已替换，真实执行/完整 Result/独立 gate 边界保留。
- 两个现有测试文件：extension 38 pass、skills 51 pass，合计 89 pass / 0 fail，退出 0；包 typecheck 退出 0。三个 changed TS（extension 与两个测试）逐文件 primary-server/error 主动检查均 clean=1、0 diagnostics、0 inconclusive。
- 首轮 all-server 辅助检查有 43 条未改区域旧提示/警告，两项覆盖未确认分别涉及 timeout 与 push-only silent-on-clean；后续 primary/error 覆盖不能表述为所有服务/全部严重度无诊断。
- Root 已认定 `I-TDV-01` 源码范围完成，`W-TDV-01` 源码完成谓词满足；没有未解决的 scope 内错误，无后继或依赖需释放。本文件仅记录既定 Parent 协调决定，不重新判断或释放 gate。
- 未执行真实 Todo mutation/重建、模型 trace、当前 Host loaded-byte 验证、安装/reload/启用或 Git；源码编辑不会更新已注入 prompt/已加载 Skill，当前会话加载新规则及真实模型/Todo 效果仍未证实。非事务 set+transition 仍可能部分对齐，未知效果须诚实报告。

## 历史边界、目标与未完成限制

[旧 cleanup Work](../todo-cleanup-contract/work.md) 与 [旧 Plan](../todo-cleanup-contract/plan.md) 保持 source delivery/review completed 历史；其中保留规则属于旧范围，新 Work 不覆盖其状态、图或确认记录。旧测试数字/模型未验限制不作为本 item 的执行前置或新完成证据。

初始准备目标仅是四文件 matched tuple 及其可披露范围；后续已确认并完成两个运行指令、一处已证实必要镜像和两个现有测试文件。步骤和验证仍只有 Waves 的 `I-TDV-01` 拥有，没有第二个审计、历史恢复、独立 review、模型实验或安装 item。本次仅同步四文件事实，不重新实施或规划。

当前确认/源码验证事实见上节，不新增确认时间/receipt。源码范围完成不包括真实启用；安装/reload/启用、Git 与 live acceptance 需要独立说明/授权，不放进源码 gate。若出现另一个确实必须同步的 owner 或实质 scope/gate/authority 变化，返回 Root 的影响证据，不默默扩大图或改 authority。

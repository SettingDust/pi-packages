# Proposal：Router 按需加载委派策略 Skill

- 状态：**已选方案部分接受并已交付/按用户决定结案**。按需 Router 策略、独立证据分支、条件性后台重叠、成本/能力分轴与结果如实投影已在 [PRD](../prd/router-delegation.md)、[Router Spec](../spec/router-delegation.md#13-evidence-branch-scheduling-and-strategy-loading)、[Skill Spec](../spec/skill-library.md) 及 ADR-0001/0005 成为权威；仅 Herdr pacing 在 [Backend Spec §3](../spec/backend-adaptation.md#3-settingdustpi-herdr-subagents-mapping) 有界调和。T2 策略 Skill/Router prompt 与 T3 Herdr owned 描述/测试/README 已实施；T4 两包全套测试/typecheck 通过，隔离 live fixture 已通过，但广泛模型场景未验证。部分接受指本提案的候选并未整体成为权威，不表示所选实现仍待开发。一体化工具与 `invocationRef` 未获接受，也不在本轮范围。
- 本文为非权威决策记录，现行合同以上述权威为准。用户已选定并授权策略/Router prompt 与 Herdr ready-branch dispatch 的有界实施，随后明确将 Router 策略和 Herdr continuous-dispatch 协调结果标为完成，见 [Work](../works/router-parallel-evidence-scheduling/work.md) 与 [Tasks](../works/router-parallel-evidence-scheduling/tasks.md)。[T4 记录](../works/router-parallel-evidence-scheduling/evidence/t4-integrated-acceptance.md) 和 [live fixture](../works/router-parallel-evidence-scheduling/evidence/live-acceptance-result.json) 限定实际核验范围；未接受后发现的实质扩展或已撤回的 Host inventory 路线。下文保留旧设计背景，未来时态和旧 Plan/Context 状态不构成待执行任务或当前实现事实。
- 新方向来自当前明确要求：委派策略是由 Router 自己选择并加载的独立 Skill。此前“把全部调度规则继续写进 Router Phase 1–4、且不新增 Skill”的候选方案已过时；其历史观察仍可作有限证据，不能充当当前架构已接受的证明。

## 既定方案与交付形态

已交付的普通可见 Skill 为 [`delegation-strategy`](../../skills/delegation-strategy/SKILL.md)。正文只指导 Router 执行其已有协调职责，不执行项目领域工作、不返回 Handler Result、不启动额外 strategist 子代理。它采用现有 `name`/`description` frontmatter、Method/Boundary 风格，description 指明加载先于领域 Skill/Handoff/能力请求。

现有机制已足够加载：`extensions/pi-harness.ts` 的 `routerPrompt` 把 `event.systemPromptOptions.skills` 中非 `disableModelInvocation` 项交给 `formatSkillsForPrompt`；Pi formatter 提供名字、描述、实际 `location` 和通过 `read` 加载正文的说明。`package.json` 已注册 `pi.skills: ["./skills"]`。Router 保留工具访问；[Skill Library Spec §1](../spec/skill-library.md) 已明确允许为路由读取完整 Skill 指令。因此不存在需要新增 loader/tool/runtime 才能读取正文的技术障碍，也不需要新注册表、Skill 类型元数据或配置。

规范现已将“协调策略 Skill 的引导加载”排在“每个 Handler 的领域 primary/companion Skills 选择”之前，避免旧 Phase 1 将两者混作同一动作的循环；常驻 Router 仍不执行项目领域工作。

## 非循环激活协议

1. 常驻 Router 首先仅判断当前是否需要实质领域委派。澄清、授权沟通、总结已知 Result、说明阻塞或完成报告可直接响应；这些路径不加载策略。这个触发判断不能依赖策略先完成分解。
2. 一旦需要委派，Router 从当前可见目录按确切名称选择 `delegation-strategy`，按目录的真实 location 通过正常 `read` 机制完整加载。不要把仓库相对路径当成已安装路径，不用 Resolver 或 Handler 来替自己读取/运行策略。
3. 加载成功后，Router 应用策略识别和呈现终态、独立证据分支、依赖及冲突；之后才选择领域 Skills、构造具体 Handoff/admission、计算独立 reasoning/impact 请求。所有额外读取、兼容性判断、Todo 更新均在该分支 resolve 前完成。
4. 同一 Router 上下文中正文完整且可确定对应当前可见目录时可复用；新会话、恢复/压缩后正文缺失、目录变化或内容身份不确定时，在下一次委派准备前重读。无需持久 loaded 标记、digest registry 或新 Hook；不能在 resolved 与 spawn 之间补读。
5. Skill 不可见、被隐藏、文件不存在/不可读、正文不完整或与常驻不变量冲突时，说明具体阻塞且不构造/提交新的委派、不自行执行领域工作，也不静默回到旧内联策略。仍须处理已有 Result 的最低正确性义务。策略可用但后台重叠能力未知时，才使用策略内的串行路径；这与“加载失败可绕过策略”不同。
6. 收到终态通知时，常驻合同允许按实际工具协议取完整 Result 并关联、如实投影；只有需要准备新的委派时才触发/恢复策略。无后续委派的总结不强制加载。

这是已接受的规范加载协议；[Router prompt](../../extensions/pi-harness.ts) 和 Skill 已实现静态引导，[Harness 检查](../works/router-parallel-evidence-scheduling/evidence/t4-integrated-acceptance.md) 验证文本/测试，而仅一次隔离 live fixture 观察到实际策略 read 在 resolve 前。其他会话的持续模型遵循、缺失/恢复等路径不由静态断言或该 fixture 证明。

## 不变量与过程的唯一所有者

| 内容 | 常驻 Router / 工具合同保留什么 | 按需策略承载什么及理由 |
| --- | --- | --- |
| 角色与激活 | Router 独占协调；禁止领域执行；直接响应范围；上面的触发/加载失败边界；Handler 不协调 | 如何在已有授权和可见上下文中准备委派；不重新定义角色权限 |
| 单结果与依赖安全 | 每 Handoff 一个完整 bundle 的可验证终态；独立状态不得合并；依赖未满足或存在冲突不得并发 | 独立终态辨别例子、证据分支分解、可执行集合与依赖/冲突检查步骤 |
| 权威与授权 | 现有需求/Spec/Plan/Tasks、范围披露与当前用户确认、实质变更重确认、既有窄例外及外部高影响动作边界继续常驻 | 在选择 ready 分支时引用这些门槛，不复制整套确认流程，不借 Skill 加载创造授权 |
| 能力与调用 | 闭合 Handoff/admission、独立有限非负 reasoning/impact、现有能力语义示例、Resolver 唯一选择及 exact forwarding；成功 resolve 后下一环境动作必须是固定 `handler` 的原样 spawn，含独立 label/taskSlug | 对已选分支应用已有能力要求；不引入 Skill→能力映射；不重复参数协议 |
| 并发与等待 | 必须遵守当前有效工具/Host 合同和已知资源限制；未知时串行或阻塞；禁止冲突、poll、隐藏调度器/重试引擎 | 一条条 resolve→立即 spawn、后台重叠的 eligible wave、等待点及新 Result 后重新选择 |
| 结果与状态 | 完整 Result 关联后立即如实投影，四态不合并；重复幂等，畸形/冲突 fail closed；满足依赖才释放；保留活跃/未决记录；resume/replay 安全与不删除 artifacts 等约束常驻 | 将结果映射回证据分支，重新计算 eligible 集合，单一最终 writer 的消费次序；不创建固定 Result→行动映射 |

策略是程序性方法的唯一模型指令所有者；Router 只保留引导和不可选的正确性约束，不把策略正文拼进 system prompt，也不保留一份同等详细的 Phase 1–4 调度副本。权威 Spec 仍定义规范，测试分别验证常驻不变量与 Skill 方法。必要的短引用不等于复制整套规则。授权和异常恢复等细节本轮不顺带抽离，以免扩大审查面。

## 策略中的任务粒度与调度方法

用户已确认并纳入规范、且策略 Skill 已承载的**粒度原则**：

> 优先拆出边界明确、可独立验证、上下文负担较小的执行单元，使其能够由最低足够能力完成；不得为了降低评分而切断必要上下文、隐藏实际影响，或制造无独立价值的碎片任务

其程序性所有者是已交付的 `delegation-strategy` Skill；Router 常驻只保留单结果、授权、能力轴和调用安全等不变量，不复制完整粒度判断方法。策略先确定真实结果边界、必要上下文、依赖和所有权，再评估每个可独立消费单元的 reasoning/impact；上游已解决的不确定性可以简化下游执行，但影响只有在后果确实隔离时才降低，不能因文件数或任务数少而自动降低。分拆还需计入委派、上下文移交和集成成本，保留跨单元所需的整体核验；不可分的高上下文任务留作一个完整 Handoff。

一个最终比较报告可有 A/B/C 三条证据分支：每条有明确问题、只读或非冲突效果、独立可消费 Result 与失败/恢复边界；最终报告是依赖这些证据的单一 writer。不要把内部检查硬拆成分支，也不要把三条证据伪称三份用户请求的最终报告。Todo 各自保留终态与父目标关系。

建立所需 Result、输入、权威和授权依赖；共享只读资料本身不冲突，同文件写入以及所有权、行为合同、副作用冲突均串行。B 的身份未知只阻塞 B 的对应边，不制造 A/C 的全局发现屏障。领域身份调查本身由 bounded Handler 完成，Router 不自行开展调查。

对每条当前 ready 分支，在 resolve 前完成 pre-action `in_progress` 与必要检查，然后 `resolve A → exact spawn A → resolve B → exact spawn B …`。严禁先批量 resolve 再批量 spawn；成功 resolve 与其 spawn 之间不放读取、Todo、说明或另一调用。spawn 返回 active 后，在有效合同确实允许且资源可用时继续准备下一条独立分支，无需等待不相关 Result。工具调用串行与子任务后台生命周期重叠并不矛盾。

全部当前 eligible 分支已发出，或依赖、资源/能力限制、工具 end-turn 要求阻止继续时结束 Router turn，等待终态通知；不轮询或例行 join。Herdr 通知仅摘要，通知后通过 join 取得完整 Result 才投影；通知不是完成事实本身。已有完整可见 Result 先投影，再做依赖它的判断。每次结果投影后 Router 重新决定，不按通知顺序强制全局批量 join。writer 仅在实际所需分支谓词满足时启动；partial/blocked/failed 不自动放行，任何有依据的部分报告范围变化仍由 Router 决策并遵守授权。

resolve/spawn 单分支失败不抹掉兄弟状态、不自动重试；取消/新指示停止受影响的未发工作，评估运行中任务和既成效果。未知或过时重叠证据走串行；连普通委派兼容性都不成立则阻塞，不把串行当万能授权。

## 粒度验收场景（尚未覆盖的模型场景，不是本次实际遵循证据）

- 已由上游确认接口/决策、下游变更边界清楚且可单独验收：下游使用最低足够 reasoning，仍带齐接口与验证上下文；只在后果实际隔离时降低 impact。
- 根因、设计取舍与跨模块效果仍互相牵连：保留一个完整高上下文单元和必要能力请求，不为压低评分拆散。
- 单文件或极少代码触及权限、共享合同或广泛消费者：按真实影响请求 impact，不按小文件数降级。
- 可拆但移交、重复上下文、集成及整体核验成本超过收益：保持合并；确实独立的证据分支仍按现有并行资格派发。

## Resolver 与目录影响：选择最小改动

当前 `visibleSkills` 只过滤 `disableModelInvocation`，不区分 Router/Handler；`createResolverTool` 的 primary 与 companion enum 包含全部可见项；`src/protocol.ts` 的 `resolveDelegation` 也仅核对名字是否在传入集合等结构条件。`delegation-strategy` 作为可见 Skill 进入了 primary 与 companion enum；结构可选不等于 Router 协调权可委派。它未被 `disable-model-invocation: true` 隐藏，因为这同时破坏 Router 的正常发现与按需触发。

现有实现保持此边界：**未改 Resolver/目录过滤/Registry**。与 Skill Library Spec“所有模型可见 Skill 可被结构性选择、无 control/leaf manifest”一致。Router 常驻选择约束和 Skill 开头明确：本策略由 Router 自用，不得作为 primary/companion 委派它的协调工作；每次 Handoff 仍选对应领域方法。结构上接受名字不等于语义上允许协调任务。Handler 现有“不协调、不委派、不决定下一步”优先；Skill 已声明误交 Handler 时返回 `blocked` 且不开始协调。现有 Handler 可按证据动态加载其他领域 Skills 的规则保持。

测试已核对 enum 含该可见名字，不声称 Resolver 拒绝它；Skill 正文明确 Handler 误交时应 `blocked`，但误交 Handler 的实际模型行为仍无 live 验证。若以后要结构性排除 Router-only Skills，那将修改已接受的全目录可选合同、需要独立权威与范围，本轮未选择。`customPrompt` 分支仍禁用 Resolver 并不替换自定义 Agent prompt，不能向 Handler 自动注入 Router 策略。

## Herdr 工具合同：旧约束与现行条件

原提案记录的旧工具描述要求 “After spawning, end the Router turn”；当该描述仍是某会话的有效注册合同时，仍必须在首个 spawn 后结束 turn。如今 Herdr 自有 [`subagent_spawn` 描述](../../../pi-herdr-subagents/src/index.ts)、runtime 测试和 README 已有界修改：仅当**有效已注册**工具合同与资源允许时，active spawn 后才可继续同轮独立、已授权、无冲突的 ready 分支；逐分支 `resolve_delegation` 后下一环境动作必须原样 spawn，不能批量 resolve。边界到达后结束 turn，通知后 join 取完整 Result。源码/README 修订不自动更新旧会话的有效注册描述，也不授权其它后端。确定性双 active 测试与隔离 live fixture 证明各自范围内的重叠，不证明无限容量或其它会话的有效合同；见 [Tasks T3/T4](../works/router-parallel-evidence-scheduling/tasks.md) 和 [Backend Spec §3](../spec/backend-adaptation.md#3-settingdustpi-herdr-subagents-mapping)。Herdr lifecycle Spec 的通知/恢复边界保持不变。

## 规范归属、交付与证据边界

| 所有者 | 当前状态与边界 |
| --- | --- |
| `docs/prd/router-delegation.md` | 已接受用户成果：独立证据分支在共同交付物下保持真实状态；背景重叠取决于有效环境许可 |
| `docs/spec/router-delegation.md` §1/1.1/1.3、`docs/spec/skill-library.md` | 已接受策略先加载再选择领域 Skills、单一完整结果、顺序精确派发、依赖冲突及四态投影；Router prompt/Skill 已实施并经静态/单测核验，live fixture 仅覆盖一条路径 |
| `docs/adr/0001-router-resolver-handler-boundaries.md`、`0005-let-router-adapt-delegate-tools-directly.md` | 历史同时工具调用前提由条件性后台重叠修订；职责不转移；draft Host 修订已撤回、不在本方案 |
| `docs/spec/backend-adaptation.md` §3 | 已接受 Herdr pacing 的有界修订；Herdr owned 描述/测试/README 已实施，旧有效注册仍需遵守；已撤回的 Host inventory 草案不因此复活，现行 §2/§6–8 共享要求不变 |
| Herdr lifecycle Spec | 通知/恢复合同未改；无已证实需要新增持久状态或修改生命周期的理由 |

一体化工具与独立 resolve 后的 `invocationRef` 未选择；其它后端仍可在证明共享能力要求、完整 Result 取回映射及自身有效合同后使用，不以 Herdr 描述作为通用授权。提案旧版“Skill 未创建”“prompt/Skill 实施待做”“Herdr 修订未决”“实施未完成”与“实施前核对”的未来表述仅描述旧阶段，现不能用作剩余代码工作证据。所选 Router 策略和 Herdr dispatch 已按用户决定结案；真正未覆盖的是 T4 广泛 live 遵循/失败/恢复/权限/资源场景，而非又一项已批准实施任务。若要将该矩阵逐项提升为接受证据，需要另行确定验收范围、授权隔离 Router/Herdr 环境并核对每次有效注册工具合同；不能凭本提案将它们标记通过或默认为新开发承诺。

## 历史证据与替代方案

旧提案记录 `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-cloche--/2026-09-26T19-48-28-195Z_01a0df43-0ba3-7696-8006-8634ea05c989.jsonl` 曾有三次 resolve 后三次 spawn 与独立结果；本次没有重放该外部会话。它至多支持那次后台重叠，不证明交替调用合规、当前 effective winner 或现行工具许可。[历史 T1](../works/router-coordination-flow-repair/evidence/t1-host-task-capability.md) 的 Pi 0.84.4 能力模糊/串行记录同样不是当前能力。已完成的 collaborative workflow alignment 及其后续 dirty 证据不重开。

继续全内联虽少一文件，却不满足明确的按需 Skill 方向；交给 strategist Handler 会转移 Router 协调权并造成激活循环；新增 scheduler/队列/注册表无实际必要。已交付方案复用现有发现/read；指令遵循与加载失败仍是可观察条件。上述静态和单条 live fixture 不把未测场景变成通过；[Plan](../works/router-parallel-evidence-scheduling/plan.md) 的历史实施顺序与未更新状态应按 [Tasks](../works/router-parallel-evidence-scheduling/tasks.md) 和 [T4 证据](../works/router-parallel-evidence-scheduling/evidence/t4-integrated-acceptance.md) 解读，而非再次启动已结案的实施。

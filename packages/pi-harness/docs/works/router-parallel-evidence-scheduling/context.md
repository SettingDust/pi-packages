# Context：Router 按需委派策略

- 状态：已处理的设计证据；非规范、非实施记录。规范的有界部分已接受，用户已选择策略 + Router prompt + Herdr ready-branch dispatch 方向；实现未开始。
- [Work](work.md) | [Proposal](../../proposals/router-parallel-evidence-scheduling.md) | [Plan](plan.md)

## 当前意图与替代关系

当前已接受 Router 自己选择并读取独立 `delegation-strategy`，在构造 Handoff 和能力请求前应用策略；尚未创建 Skill 或修改常驻 prompt。最低足够能力的任务粒度原则现见 Router Spec；先定可独立验证的边界与必要上下文，再按实际 reasoning/impact 评分；上游决策可化解下游不确定性，影响只有真实隔离才下降，分拆须计入移交、集成和整体核验成本。此前准备的“Router 内联全部调度、不新增 Skill”方案已过时。保留单一最终 writer、独立证据分支、exact resolve→launch 和通知优先；用户在收到实施策略 + Router prompt 并修订/验证 Herdr dispatch 的明确推荐后选择开始该方向；不据此接受新发现的实质扩展或替代接口。

## 已读源码与权威事实

| 来源 | 观察 | 设计含义 |
| --- | --- | --- |
| `packages/pi-harness/extensions/pi-harness.ts`：`routerPrompt`、`visibleSkills`、`createResolverTool` | Router 禁止实质领域执行；完整目录通过 formatter 放入 prompt；可见 Skills 仅按 disableModelInvocation 过滤，全部进入 Resolver enum；自定义 prompt 路径停用 Resolver | 可复用现有 read，不能假设已有 Router-only 目录；无需新 loader |
| `packages/pi-harness/package.json`；依赖 `@earendil-works/pi-coding-agent/dist/core/skills.js:275` 的 formatter | 包注册 ./skills；formatter 输出实际 location，提示用 read 读取正文；隐藏项不入目录 | 策略保留可见性，按实际目录加载而非硬编码安装路径；发现并不等于加载正文 |
| `docs/spec/skill-library.md` §1 | Router 可读完整 Skill 为路由决策，不得执行项目领域 method；全部可见 Skill 可作为 primary/companion | 要澄清允许 Router 应用纯协调方法，不是解除所有领域禁令；保留结构可选与角色执行约束的区别 |
| Router prompt Phase 1、`docs/spec/router-delegation.md` §1.1 | outcomes 必须先于“choosing Skills” | 必须将引导加载协调策略与领域 Skills 选择区分，否则策略分解与加载互相等待 |
| `src/protocol.ts:133–174` | schema/validation 检查提供的 Skill 集合，不辨别执行角色 | 新策略会结构性可选；推荐不增加 Resolver 过滤，让 Router 选择约束和 Handler 角色拒绝误委派，不声称协议已拒绝名字 |
| `agents/handler.md` | 禁止协调/委派/下一行动；须加载所选 Skills，可按需要加载其他 Skills | 策略不交 Handler；误选不能靠加载覆盖角色，须 blocked；动态领域 Skill 组合保持 |
| Router Phase 2–4 与 Router Spec | 权威/范围确认、独立能力轴、exact spawn、四态投影、幂等/失败/replay/清理边界已经存在 | 保留常驻安全/正确性要求，抽离调度过程，避免在两个 prompt 中复制完整规则 |
| `packages/pi-herdr-subagents/src/index.ts` 的 `subagent_spawn` 描述、tests/runtime.test.ts、README | 现有有效注册仍可能要求第一 spawn 后结束 Router turn；源码中当前描述也如此 | 被选中的 Herdr dispatch 工作需有界修订 tool description/对应 test/README；修订、发布或加载之前不能违反有效描述；其它环境不继承 Herdr 改动 |
| Herdr `SubagentRuntime.spawn/start` | 多个任务 ID/map，start 在 transport 启动后返回 running，无等待子任务结束的 join | 支持顺序 spawn 后台重叠的源码推论；需专门两 active 回归和真实会话证据；不预设 runtime 改造 |
| Herdr `docs/spec/runtime-lifecycle.md` §4 | 通知是摘要、完整 Result 经 join；active parent 延后投递，idle/agent_settled 才发 | 结束 eligible wave 后等通知可复用原生命周期；不能将通知状态当 Handler Result |
| ADR-0001、ADR-0005、Router/Backend Specs | accepted 的 ADR-0005 支持按有效工具合同依次后台 launch；Backend Spec §3 是 Herdr 映射的权威，原 end-turn 与所选方向冲突；Host inventory 仍为未接受草案 | 有界修订 Backend Spec §3 的 Herdr pacing，保留 `resolved`→单次 exact spawn 与通知/Result 规则；不接受草案 Host profile |

## 边界、待证事项与保留记录

本次准备工作仅限现有 pi-harness Proposal/Work 与 Backend Spec §3 的 Herdr pacing 有界修订；不改 runtime/测试/可执行 Skill、其它项目、安装内容、配置或 index。独立完成合同已有 dirty 修复，保持原状；不重新开启 Herdr lifecycle 或 join。既有 dirty 编辑均保留。已完成的 `router-collaborative-workflow-alignment` 不重开。

旧 Proposal 的 cloche 会话描述和旧 Pi 0.84.4 T1 结论均为继承历史材料，本次未重新检查外部会话；不是当前 effective tool winner、资源上限或模型行为证明。本次没有 live spawn、模型场景测试或新 runtime 回归执行。没有证明无限并发，也没有必要虚构固定并发数。

现行规范已接受 `delegation-strategy`、现有目录/read、保留全可见集合与 Resolver 边界。Herdr ready-branch dispatch 是本次选定且限定于工具描述、对应测试/README 的实施范围，不是新集成接口；`invocationRef` 和一体化工具仍排除。后续需按实质披露确认这份具体 Plan，再核验已注册的有效工具合同/资源限制和真实模型轨迹。missing/hidden/unreadable Skill 阻塞新委派；未知后台重叠能力只有在普通委派兼容时串行或等待通知，不能推断同轮许可。

## 本次验证口径

本次验收限文档权威、Proposal 与 Work 的映射、链接和范围检查。Plan 中的运行命令与场景是未来验收要求，不是本次测试成功声明。实施完成、加载成功、双任务重叠或 live 模型符合性均未建立。

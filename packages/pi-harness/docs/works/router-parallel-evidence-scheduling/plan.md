# Plan：Router 按需加载 delegation-strategy

- 状态：已接受的策略/证据分支权威、用户选定的 Router + Herdr dispatch 方向及具体 T2/T3 实施范围已对齐；用户在披露具体文件、行为与验证后以“按你说的开始”授权执行。T2 Harness 策略已实施并完成聚焦静态/单测核验；T3/T4 尚未完成，未声称 live 模型遵循。
- [Work](work.md) | [Context](context.md) | [Tasks](tasks.md) | [Proposal](../../proposals/router-parallel-evidence-scheduling.md)
- 本文取代旧“全部调度内联 Router、无 Skill 改动”准备方案，并将先前未决的 backend 路径固定为本次选定的 **Herdr ready-branch dispatch 描述**。不选择新调用接口，不将这一路径施加于其它环境；具体实施范围已披露并获用户授权，新增实质扩展仍需确认。

## 目标、边界与门槛

形成一个协调方法边界：Router 识别需要委派，直接按现有目录/read 加载 `delegation-strategy`，再准备单结果 Handoff；策略管理独立证据分支、任务粒度与能力匹配、依赖/冲突、顺序 exact dispatch 和等待点。Router 永远是协调和下一行动所有者，Handler 只做领域单结果任务。常驻不变量和有效工具合同不因按需加载消失。

现已接受的策略原则（接受规范不等于批准整份实施 Plan）：

> 优先拆出边界明确、可独立验证、上下文负担较小的执行单元，使其能够由最低足够能力完成；不得为了降低评分而切断必要上下文、隐藏实际影响，或制造无独立价值的碎片任务

拟议 Skill 拥有这项程序性粒度判断，Router 常驻不重复完整方法。先划真实结果边界、必要上下文及依赖，再对独立单元评估 reasoning/impact：上游解决不确定性可使下游执行简单；impact 仅在实际后果隔离时下降，绝不按任务/文件数自动降级。比较拆分收益与委派、上下文移交、集成及整体核验成本；不可分的高上下文工作保持完整，拆分后仍做必要的跨单元验证。

T2 Harness 策略 Skill/prompt 已在同一 Work 下实现并核验聚焦测试；Herdr 映射权威修订已完成，但 T3 描述/README/测试及有效已注册版本尚未改。[Backend Spec §3](../../spec/backend-adaptation.md#3-settingdustpi-herdr-subagents-mapping) 是 Herdr tool pacing 的规范所有者，现已限定为“**有效已注册合同 + 资源允许**才能在一次 active spawn 后继续下一条独立 ready 分支”。旧 end-turn 约束在其仍有效时继续适用；draft Host compatibility amendment 保持未接受。用户选择的策略、Router prompt 与 Herdr ready-branch dispatch 修订/验证已在具体实施范围披露后授权；这不是新发现实质扩展的授权，也不替代有效工具合同。

## 所有者与最小候选修改

| 文件（相对仓库根） | 拟修改与限制 |
| --- | --- |
| `packages/pi-harness/skills/delegation-strategy/SKILL.md` | T2 已新增普通可见 Skill。Router-only 协调方法、触发描述、边界优先的粒度/独立能力评估、分支/依赖/冲突分析、ready 集合、dispatch/等待/结果后重算；计入移交/集成成本与整体核验。正文开头要求 Handler 不执行协调并报告 blocked。无子代理、领域执行或新基础设施 |
| `packages/pi-harness/extensions/pi-harness.ts` | `routerPrompt` 增加最小触发和实际目录/read 引导；允许纯协调方法；明确先加载协调策略、后选择领域 Skills。把过程/案例移到 Skill，仅保留 Proposal 不变量表的强制合同、现有授权/能力语义和恢复安全要求。不得自动内联整个 Skill。保留所有无关 dirty 内容 |
| `packages/pi-harness/tests/extension.test.ts` | 从“全部四 Phase 文本必须内联”的断言改为所有权分离验证；加载引导、常驻不变量、Skill 正文方法、缺失时阻塞、customPrompt 不注入、普通 Skill 目录/enum 不变。可在同一测试文件读取新 Skill，无需新测试框架 |
| `packages/pi-herdr-subagents/src/index.ts` | **已选 T3 owner**：仅修改 `subagent_spawn` 描述的第一 spawn end-turn 文字为条件性同轮准备下一独立 ready 分支（effective contract/resources 允许时）；每条仍先 exact resolve、再一次 spawn；没有新参数、集成 API、`invocationRef` 或 lifecycle/join 变更 |
| `packages/pi-herdr-subagents/tests/runtime.test.ts`, `packages/pi-herdr-subagents/README.md` | 同步 owned 描述断言与用户文档；用受控 deferred transport 做两个相继 spawn 均 active 的确定性回归，维持各自 id/关联且不提前 join/通知。无需为此先假定 runtime 改造；若暴露真实限制，仅在已确认范围内处置 |

`package.json` 已发现 ./skills，不改。Resolver 源码、schema、可见 Skill 过滤、Registry、Handler Agent 正文默认不改：所有模型可见名字仍结构可选；Router 不向 Handler 选择该策略，Handler 的既有角色限制拒绝执行协调方法。以描述/正文声明处理语义边界，不能声称有结构性 Router-only 隔离。若要求这种隔离，需另行接受全目录选择合同变更，本候选不引入。

不新增 runtime scheduler、batch API、queue、retry engine、loader、持久加载标记、全局并发控制、依赖、配置或安装/激活操作。不做一体化 delegate API、`invocationRef`、abandoned lifecycle/join 修复或 payload 优化，也不改其它 backend 的有效合同。Herdr runtime 当前 `spawn/start` 将 active 任务登记在各自 id/map 并在执行完成前返回；有后台重叠能力的源码迹象，只需 bounded 描述/测试/README 变更，**不**由此推断模型可不顾有效工具指令或资源限制继续发起第二个调用。若受控双 active 测试暴露 runtime 缺陷，先记录和重新确认范围。

## 控制流与归属

详见 Proposal 的激活协议和不变量表，实施必须逐项对应：

- bootstrap 只判断“需要领域委派吗”，不要求先完成分解；需要时在实际可见目录找 `delegation-strategy` 并完整读取，再识别完整协调集合、选领域方法、Handoff/admission 和能力请求。无委派路径仍直接响应。无正文或身份不确定则在下一委派准备前重读；缺失/隐藏/失败阻塞，不能转委派策略加载。
- 常驻保留角色、单结果、权威/确认、闭合字段、独立能力、exact spawn、依赖/冲突安全、有效工具许可、四态投影与 fail-closed/replay/清理约束。完整调度案例与操作次序只在策略中；不移动整套授权/能力指导来扩大范围。
- 所有 read、兼容性检查和 pre-action Todo 在 resolve 前完成。单条 `resolve → exact spawn` 后才能考虑下一条；无需同时工具调用。仅 Herdr 修订后的**有效已注册**合同及资源允许时在同轮开始下一独立 ready 分支，不能把 Spec 文本、source 或假 transport 当作 live 许可。旧 end-turn 描述仍有效时必须在第一 spawn 后结束本轮；其它环境遵守各自合同。
- 一报告可有 A/B/C 的独立可消费证据结果，各有状态，writer 只等待实际所需谓词。未知 B 身份不阻塞 ready A/C，共享读取不自动冲突；写入/所有权/权限/行为/副作用冲突串行。先验边界，再分别按真实不确定性与实际影响请求能力；不能为了降低评分把必要上下文或整体核验拆走。
- eligible wave 发完或受真实边界阻止时结束 turn；摘要通知后取完整 Result、投影，再由 Router 决定。失败不自动重试，部分结果不冒充 completed，取消不抹除运行效果。Skill 丢失时，常驻约束仍允许安全收取/投影既有 Result，禁止新委派。

## 实现顺序与依赖

1. **权威与范围。** 本 Work 的现有 PRD/Router Spec/Skill Spec/ADR-0001/0005 保持已接受；Backend Spec §3 只对 Herdr pacing 作有界修订，不接受 §2/§6–8 draft Host inventory。已披露本 Plan 的 T2、T3、验证和风险，用户随后确认开始；新增实质扩展仍需确认。核对目标环境的有效注册工具描述、资源限制、id/完整 Result 路径；源码或历史轨迹不是 effective winner。若普通委派不可用则阻塞，仅同轮重叠不明则保守串行/等待通知。
2. **T2 Harness owner。** 新建策略 Skill，收缩 Router prompt 为触发/引导与强制不变量，调整 `extension.test.ts` 聚焦断言；保持全可见目录/enum、customPrompt、Handler 和 Resolver 合同。Skill 不替代任何工具 end-turn 指令。
3. **T3 Herdr owner。** 将 `subagent_spawn` owned 描述、`runtime.test.ts` 与 README 对齐为条件性同轮 ready-branch dispatch。按现有 `spawn/start` 路径做双 active 回归，验证两条独立 id 与不提前 join；不改 schema/runtime，除非新的实证缺陷和范围确认要求。先后实施顺序 T2/T3 可互换，最终验收依赖二者。
4. **T4 集中验收。** 对实际修改的两个包运行各自聚焦测试/typecheck 与 diff 检查。另在**隔离且允许委派的 Router 验收运行**中，让获授权的 Router 使用其有效工具合同按顺序 `resolve A → spawn A → resolve C → spawn C`，B 若有独立身份依赖仅暂缓 B，收取完整结果后再触发单 writer；记录有效工具文本、时间线、任务 id、资源与完整 Result。只读 Handler 不能自行 spawn：若只有只读 Handler 或未暴露/未加载修订后的工具，报告 live 验收阻塞，不借工具探测规避权限，也不把 unit/静态通过说成模型遵循。

## 验证矩阵（T2 静态/单测已核验；T3/T4 和 live 场景待检查）

| 场景 | 必须观察到的事实 | 证据层次 |
| --- | --- | --- |
| 普通委派首次激活 | 需要领域工作 → 目录 location 的 read → 完整加载 → 分解/领域 Skill/能力请求/Handoff → resolve；没有额外 strategist 子代理 | prompt+Skill 检查；实际模型 ordered trace |
| 无需委派 | 澄清、已有结果总结、完成/阻塞说明不读取策略，不 resolve/spawn；无 candidate 时也不能自行做领域工作 | 实际对话 trace，静态合同辅助 |
| Skill missing/hidden/read denied/truncated | 在 resolve/spawn 前阻塞；不硬编码替代路径、无内联 fallback、无转委派加载；已有 Result 仍可安全投影 | 目录/描述单测 + 故障注入模型 trace |
| 恢复/压缩/目录改变 | 正文缺失或身份不确定时下一委派前重读；同上下文完整正文可复用；成功 resolve 后绝无补读 | 多 turn trace |
| 目录及误交 Handler | 策略可见即出现在 primary/companion enum；普通外部 Skills 不被过滤；Router 不选择策略为领域方法；故意误交时 Handler blocked 且零协调调用 | schema 单测 + Handler 行为 trace；不谎称 Resolver 会拒绝名字 |
| customPrompt | Handler/其他自定义 Agent 保留其 prompt，Resolver 停用，不自动注入策略 | 现有 extension 回归 |
| 三证据分支、一份最终报告 | A/B/C 各自 Result/Todo；已注册 Herdr 合同与资源允许时依次 `resolve A → launch A → resolve C → launch C`，B 独立身份依赖仅暂缓 B；每次 exact launch 是下一环境动作。active 生命周期可重叠；旧 end-turn 环境只按自身合同发起。通知后收完整结果，单 writer 消费必要结果 | Herdr 确定性双 active 回归 + 授权 Router live trace，分别记录 |
| Herdr 描述与实际能力 | 当前旧 end-turn 文本对照修订后的 owned tool description、测试和 README；有效注册文本须另行确认。受控 transport 在两个先后 spawn 返回 active 后两 id 均在运行，不调用 join/等待第一个完成；真实资源限制不由 fake 测试推断 | 描述断言 + runtime 假 transport 回归（非 live） |
| 已定决策后的下游工作 | 上游已解决设计不确定性，下游边界明确、上下文齐全且单独可验收：使用最低足够 reasoning；impact 只有后果实际隔离才降，最终仍做必要整体核验 | 场景 trace；prompt/Skill 静态检查只证明指令存在 |
| 不可分的高上下文工作 | 相互牵连的根因/设计/跨模块效果保留在同一完整单元，不为低分拆散 | 场景 trace |
| 小改动、大影响 | 单文件/少量代码影响权限或共享合同，impact 按真实后果而非文件/任务数请求 | 场景 trace |
| 无收益的碎片化 | 拆分产生的委派、上下文移交、集成与整体核验成本高于收益时保持合并；真正独立的证据分支仍可并行 | 场景 trace |
| B 身份未知、共享只读 | B 有独立识别依赖，A/C 可先开始；无全局发现屏障；Router 不自行读领域项目 | 实际模型 trace |
| end-turn 旧合同或重叠能力未知/过时/资源拒绝 | 不用 Skill 覆盖合同，串行/受限停止并说明原因；普通调用也不兼容则阻塞；不制造固定容量 | 注入合同/失败 trace |
| 写冲突/授权未满足 | 各结果保留独立状态，同文件 writer 串行；无授权不启动；加载不改变现有确认规则 | 场景 trace |
| 失败/partial/blocked/重复或畸形 Result | 通知后按需 join 取完整 Result，四态如实投影；重复不重复释放；畸形/冲突 fail closed；writer 谓词未满足不运行 | Result 场景 trace |
| 取消/变更方向 | 停受影响未发分支，评估运行中任务/效果，保留兄弟和已完成事实，无自动重试 | 场景 trace |

Harness：`bun test tests/extension.test.ts`、`bun run typecheck` 已在 `packages/pi-harness` 通过。Herdr：`bun test tests/runtime.test.ts`、`bun run typecheck`（工作目录 `packages/pi-herdr-subagents`）仍待 T3。目标已跟踪 diff 的 `git diff --check` 已通过；新 Skill 未跟踪，文本/格式另检。无依赖安装。live 验收需要另一隔离且具委派权限的 Router 会话：真实加载 Skill、检查有效注册描述并执行场景；本只读 Handler 无 spawn 能力，不能替代该会话。记录调用次序、active 区间、id、Result/Todo 和受限路径，不能以源码容量或模型静态断言代替 live 轨迹。

## 风险与完成标准

按需策略降低内联过程重复，但加载可靠性取决于模型遵循；缺失必须可见阻塞，不能降低强制不变量。保留全目录可选意味着角色隔离是语义合同而非 Resolver 类型防线，应明确记录并验证误用。后台重叠依赖实际工具/资源，不作通用并发保证；假 transport 不证明真实子进程或模型调度。

T2 Harness 策略 Skill、Router bootstrap 和聚焦测试已实施：`bun test tests/extension.test.ts` 为 7 pass/0 fail，`bun run typecheck` 通过（均在 `packages/pi-harness`）。这是静态/单测证据，不证明 Router 实际读取/遵循、误交 Handler 行为或有效 Herdr 合同。T3/T4 仍待实施/验收，不能宣称双 active、同轮派发或 live 场景通过；后续有实质范围变化需按既有授权规则确认。

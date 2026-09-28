# completed 后卡住与取消失效：责任归因

调查日期：2026-09-26。范围：Windows，实际安装 Pi **0.87.1**、内嵌 OpenAI Node SDK **6.40.0**、内嵌 undici **8.10.2**；运行时 **Bun 1.4.0** 对照已有 **Node v24.15.0**。没有请求真实模型，没有改安装目录、启动器、配置或活动会话。

## 判断

**已经定位到两个可独立复现的责任边界：Pi 的 Responses 消费者把业务完成依赖于 HTTP body 结束；取消失效则可由 Bun 的 Node streams 兼容缺陷，在 Pi 安装的 undici fetch 中触发。** 单测里的“不合作 body”现在有了真实本地 HTTP 对应机制，不再只是人为构造的假设。

- **确认的运行时兼容缺陷：** Bun 1.4.0 对可读的 Web `ReadableStream` 调用 `node:stream.isReadable()` 返回 `null`，Node v24.15.0 返回 `true`。undici 用这个判断决定是否执行 `controller.error()`，因此 Bun 下 abort/断线会关闭连接，却不唤醒已经 pending 的 body read。裸 fetch 已复现，无须 Pi 消费者或 OpenAI SDK。
- **确认的 Pi 健壮性缺口：** `processResponsesStream` 在 `response.completed` / `response.incomplete` 只更新结果，继续 `for await`；adapter 要等它返回才发送最终 `done`。所以即使用 Node，完成事件后 body 不结束也会一直等待。Pi 同时是把 undici fetch 安装进 Bun 的集成边界，应该对这个组合负责。
- **SDK 的职责和限制：** 正确传递 AbortSignal；abort 在正常 transport 上能结束迭代。通用 SSE parser 不把 `response.completed` 当作 HTTP EOF，也没有给每个 pending read 独立的取消兜底；迭代器退出还会等待 reader cancel。这些限制放大了故障，但实验排除了“必须是 SDK 才会取消失败”。
- **上游暂不定责：** 没有真实网络收尾记录，不能证明服务端没有结束响应，更不能证明违反协议。真实本地断线也会在有缺陷的组合上留下 pending read，所以日志中的 `body.next` pending **不等于线路仍开着**。

对该活动会话，结论是：**找到了与现场版本、默认调用链和症状吻合的具体可复现机制；尚未直接证明现场那个请求实际经过的 fetch 身份及其 abort/error 回调。** 不把“本地已证明”写成“现场已直接观测”。

## 实验设计与结果

复用实际安装 adapter/SDK；仅绑定 `127.0.0.1` 随机端口，发本地 SSE，保留 body、正常 EOF 或主动断线。`bare`、`sdk`、`pi` 三层使用同一 fetch；分别走原生 async iterator 和强制 `getReader()` fallback。包装只记录真实 read/return/cancel 的时间，未替换底层流实现。每次等首个 chunk 后观察 100 ms，取消/断线后的收敛期限为 1500 ms；清理等待也有界。

关键区别：**默认 Bun fetch 不是 Pi CLI 默认采用的 fetch。** 安装包 `cli-runtime.js` / `rpc-entry.js` 调用 `configureHttpDispatcher()`；该函数在默认全局 fetch 未被其他代码替换时执行 `undici.install()`。`--pi-fetch` 在独立进程调用这个实际安装函数，并仅在该进程排除代理环境变量，确保本地连接直达。

| 运行时与 transport | 案例数 | 取消/断线后超时数 | 结果 |
| --- | ---: | ---: | --- |
| Bun 1.4.0 原生 fetch | 48 | 0 | 三层、两种迭代方式都能取消/处理断线 |
| Node v24.15.0 原生 fetch | 48 | 0 | 同上 |
| Node + Pi configureHttpDispatcher / undici | 48 | 0 | 同上 |
| Bun + Pi configureHttpDispatcher / undici | 48 | **32** | bare/SDK/Pi 的 pending read 均可卡住 |
| Bun + 同一 Pi transport，仅诊断性改变 readable guard | 18 | **0** | 所有取消前/后完成与断线案例恢复 |

48 案例矩阵包含：完成后保持 body 开放、完成后 EOF、完成前取消、完成后取消、断线、`response.failed`、`error`、`[DONE]` 后保持开放、bare/SDK 提前 break，以及临时副本中 Pi 完成后 break。各模式组合数量见 JSON；不是把 48 个全部当作独立根因。

具体反例与含义：

1. **完成后开放且未取消：** 四组 baseline 的 Pi 都 pending；EOF 都得到 `stop`。这把完成依赖问题定位在消费者契约，而非 Bun 独有行为。
2. **完成前/后取消：** 正常 transport 的 bare 抛 `AbortError`，SDK 吞掉 abort 并正常结束通用迭代，Pi 检查调用方 signal 后返回 `aborted`。Bun + Pi transport 三层均可能超时，证明不是 agent 没有传 signal。
3. **Bun + Pi transport，裸 fetch 代表案例：** 132.9 ms 用户 abort，133.0 ms fetch signal abort，136.2 ms 本地服务端观察连接关闭；pending `next()` 在观察及清理期限后仍未返回。这直接区分了“取消没有到 transport”和“transport 关闭连接但流没有 error”。
4. **主动断线：** 正常 transport 得到 `TypeError` / Pi `error`；有缺陷组合继续 pending。它不依赖 `response.completed` 或取消动作本身。
5. **业务失败事件：** Pi 对 `response.failed` / `error` 主动 throw，触发 iterator return/cancel；四组都能返回 `error`。因此不能泛称 Bun 上所有 reader cancellation 都坏了。
6. **提前退出：** bare/SDK break、临时 Pi consumer break 在真实本地 transport 中均能结束；native `return()` 与 fallback `cancel()` 都有时间记录。但既有离线 fixture 已证明 cancel promise 被挂起时 break 仍会等；简单 break 不是通用的有界取消保证。
7. **`[DONE]`：** 该 SDK 的通用 parser 设置 `done=true` 后仍继续读取底层 SSE，直到 EOF；不能假设加这个标志就能救活连接收尾。

## 根因的最小反事实

undici `lib/web/fetch/index.js` 的 `abortFetch`（372–403 行）与 `onAborted`（2162–2183 行）均包含：

```js
if (isReadable(stream)) controller.error(reason);
```

`isReadable` 来自 `node:stream`。Node v24.15.0 的 Web ReadableStream 提供随流状态变化的 `Symbol.for('nodejs.stream.readable')` getter；Bun 1.4.0 实测没有这个标记。两者的 `isReadable` 判断都先看该标记，否则普通 Web stream 没有布尔 `readable` 属性，返回 `null`。

独立的 `check-readable-compat.mjs` 还证明：Bun 手工调用 `controller.error()` **可以**令 pending read 拒绝。问题在 undici 所依赖的可读状态判定，没有证据指向 Bun 的所有流 read/error 原语都不能工作。

诊断性反事实只在本地 fixture 刚拿到真实 response headers 时，为该 body 设置 `Symbol.for('nodejs.stream.readable') = true`，不修改安装源码、不修改 SDK/Pi 消费循环。三层 × 两模式 × 三场景的 **18 个** read 全部恢复：abort 返回 AbortError / SDK end / Pi aborted；断线返回 TypeError / Pi error。代表裸 fetch 在 129.4 ms 收到 signal，130.9 ms read 拒绝。与 baseline 唯一关键变量相符，足以确定这条本地故障因果链。

**这不是修复方案或 polyfill。** 常量 true 不追踪 closed/errored 状态，不可用于生产；实际修复必须正确实现整个状态契约。

## 完成语义、取消所有权与上游契约

调用链是 agent 的 active-run AbortController → `streamAssistantResponse` options.signal → Responses adapter 请求 options.signal → SDK `fetchWithTimeout` 监听调用者 signal → SDK 自己的 controller.signal → fetch/undici → response.body → SSE iterator → Pi consumer → 输出队列。

SDK 的 fetch timeout 在拿到 headers、fetch promise 结束后清除，不能把它理解为完整流生命周期 deadline。主动 break/throw 反向调用嵌套 iterator.return；native 路径交给 ReadableStream iterator，fallback 调用 reader.cancel、releaseLock 后等待 cancel promise；SDK 外层 finally 在未自然读完时再 abort controller。pending next 没完成时，这些 finally 也不一定到达。

版本固定的 OpenAI 6.40.0 类型注释把 `ResponseCompletedEvent` 定义为 “Emitted when the model response is complete”；这支持业务响应已完成。相同版本的通用 `Stream.fromSSEResponse` 和高级 `ResponseStream` 实现仍遍历底层 stream，不支持凭事件名字推出“SDK 保证此处立即返回”。已检查的官方流式文档与类型/实现也没有给出完成事件后 HTTP EOF 的强制毫秒期限。SSE 的业务事件与 HTTP body 结束是不同事实。

因此：对“完成事件已到但 UI 一直等”的修复 owner 是 Pi Responses consumer；对“已 abort/断线但 pending read 不返回”的已证实最底层缺陷 owner 是 Bun 的 Node/Web streams 兼容层，Pi 的 Bun/undici transport 集成也应建立兼容性检查或选用已验证 transport。undici 在受支持的 Node 环境通过同样实验，当前证据不支持把它定为独立的 Node 实现错误。SDK 可以增加有界取消健壮性，但它不是本次真实 transport 失效的必要条件。

## 现场证据与尚未确定的触发

重新窄读给定日志，保留脱敏摘要 `transport-live-summary.json`。选择条件为顶层 request=158542、event=await.snapshot、flags 含 cancel.delivered；该选择得到 286 条。最新读到 seq=7008：body.next age=3,611,814 ms，cancel.idle age=3,606,358 ms，body.next 已完成次数仍是 178，flags 为 response.completed / signal.aborted / cancel.delivered，overflow=false。该计数仅代表上述选择，不替代此前 1709 条快照的其他统计口径。

`cancel.delivered` 只说明 agent abort 返回。现场日志未记录 fetch 实现身份、fetch controller signal 的触发、undici onAborted guard 结果或线路 EOF，因此仍不知道：

- 最初是上游/代理保持流开放、网络断线、idle timeout，还是其他触发。
- 活动进程是否有扩展覆盖了默认 fetch，是否使用自定义 transport；源码默认路径不能替代该进程实例证据。
- 现场是不是恰好这条已复现 guard 路径。匹配程度很高，但未对活动进程做侵入验证。

没有真实 provider 测试，未覆盖 TLS、HTTP/2、代理隧道或生产并发。调查足以确定默认本地组合的缺陷与合理修复边界，不能替上游判定协议违规。

## 可复现文件与清理

在仓库根目录执行（均使用现有运行时）：

```powershell
bun packages/pi-harness/tools/pi-stall-diagnostics/check-response-transport.mjs
node packages/pi-harness/tools/pi-stall-diagnostics/check-response-transport.mjs
bun packages/pi-harness/tools/pi-stall-diagnostics/check-response-transport.mjs --pi-fetch
node packages/pi-harness/tools/pi-stall-diagnostics/check-response-transport.mjs --pi-fetch
bun packages/pi-harness/tools/pi-stall-diagnostics/check-response-transport.mjs --pi-fetch --readable-guard-probe
bun packages/pi-harness/tools/pi-stall-diagnostics/check-readable-compat.mjs
node packages/pi-harness/tools/pi-stall-diagnostics/check-readable-compat.mjs
```

已实际运行四组 48 案例和 18 案例反事实，四组 JSON 无 fixtureError；compat 两运行时断言通过。所有服务端 socket 都由 fixture 销毁，server.close 有界等待；临时安装副本在 finally 删除，Pi dispatcher 最后 destroy，命令已退出。故障组合的未结算任务标为 `cleanup.task.pending`，没有伪称这些 promise 已被清理成功；它们随独立测试进程退出消失。

原始矩阵：`transport-bun.json`、`transport-node.json`、`transport-bun-pi-fetch.json`、`transport-node-pi-fetch.json`。反事实：`transport-bun-guard-probe.json`。兼容探针：`readable-bun.json`、`readable-node.json`。没有提交代码或应用生产修复。

## 来源登记与检索边界

以下来源均于 2026-09-26 访问；本地 locator 的安装根目录为 `D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent`。类型/实现是事实；责任分配是由事实导出的结论；现场具体触发保留为不确定。

| ID / 标题 | locator | claim / support | scope |
| --- | --- | --- | --- |
| S1 实际 Pi 安装包 | 安装根目录 `package.json`、`npm-shrinkwrap.json`、`dist/bundle/cli-runtime.js`、`rpc-entry.js` | Pi 0.87.1、SDK 6.40.0；启动调用 configureHttpDispatcher | 安装实例，含现有诊断探针 |
| S2 Pi HTTP 初始化 | `dist/bundle/chunks/chunk-OJP47DM6.js`，configureHttpDispatcher / abort / streamAssistantResponse | 默认安装 undici fetch；调用方 signal 所有权；默认 idle timeout=300000 ms | 函数源码，不证明活动实例无后续覆盖 |
| S3 Pi completion | `dist/bundle/chunks/chunk-WIUZI2CJ.js` processResponsesStream；`openai-responses-HWEUZ6WZ.js` adapter | finalize 后继续迭代；返回后才结束输出 | 实际安装消费者与 adapter |
| S4 实际 SDK | `dist/bundle/chunks/chunk-NUHFSC37.js` fromSSEResponse / ReadableStreamToAsyncIterable / fetchWithTimeout | abort 传递、EOF 依赖、cleanup 等待 | 实际安装版本 |
| S5 undici | `D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/undici/package.json`；`lib/web/fetch/index.js:372`、`:2162`；S2 内嵌同名函数 | 8.10.2，engines Node >=22.19.0；isReadable guard 决定 error body | 安装源与内嵌代码相互核对 |
| S6 Bun 兼容实现 | https://raw.githubusercontent.com/oven-sh/bun/bun-v1.4.0/src/js/internal/streams/utils.ts | isReadable 先读 node 标记，否则要求布尔 readable；运行时探针证明 Web stream 不满足 | 固定 bun-v1.4.0；没有检查其他 Bun 版本 |
| S7 Node 契约与实现 | https://raw.githubusercontent.com/nodejs/node/v24.15.0/doc/api/stream.md （stream.isReadable）；https://raw.githubusercontent.com/nodejs/node/v24.15.0/lib/internal/webstreams/readablestream.js （291–297）；https://raw.githubusercontent.com/nodejs/node/v24.15.0/lib/internal/streams/utils.js | 合法 ReadableStream 不应返回 null；Node 用状态 getter 实现 | 固定 v24.15.0 |
| S8 SDK 主源 | https://raw.githubusercontent.com/openai/openai-node/v6.40.0/src/core/streaming.ts ；https://raw.githubusercontent.com/openai/openai-node/v6.40.0/src/internal/stream-utils.ts | 通用流迭代与 cleanup 对应安装代码 | 固定 v6.40.0 |
| S9 完成语义 | https://raw.githubusercontent.com/openai/openai-node/v6.40.0/src/resources/responses/responses.ts （ResponseCompletedEvent）；https://raw.githubusercontent.com/openai/openai-node/v6.40.0/src/lib/responses/ResponseStream.ts | 模型响应完成；高级 helper 仍迭代 stream | 固定 v6.40.0，未推导 EOF deadline |
| S10 官方 streaming guide | https://platform.openai.com/docs/guides/streaming-responses （重定向官方开发文档） | 列举流式生命周期及 completed 事件 | 当前文档，非版本固定协议 |
| S11 实验 | 本目录 transport-*.json、readable-*.json；tools/pi-stall-diagnostics/check-response-transport.mjs、check-readable-compat.mjs | 192 案例对照、18 反事实、状态探针 | 本地 HTTP/1.1；具体 timing 可重跑变化 |
| S12 现场 | 给定 `C:/Users/WINDOWS/AppData/Local/pi-stall-logs/265708-42670dcb-4598-4e59-a7b2-cd02dbab4f48.0.jsonl`；本目录 transport-live-summary.json | seq 7008 等待位置、flags 与计数 | 只读筛选，无内容/凭据复制 |

安装 chunk SHA-256：

- `chunk-OJP47DM6.js`: `ded16555bcb4f06e7a5c4feabbfadac044abb89a86ab866a2617d74eaaec54d7`
- `chunk-NUHFSC37.js`: `6ff38d5389f66b75728d9bf38e7c0d12e51e9766f056c7e8cca771527562ea4a`
- `chunk-WIUZI2CJ.js`: `a85d542043c502be8f1c204929762774b5373fae0f3a21b918bf2df151a1edb8`
- `openai-responses-HWEUZ6WZ.js`: `464a0fe16527006e378ceaeb19a221bfed39923d457c56e0b8ce8ea26c4ff454`

负证据：S8–S10 对 completed/终止处理的定点检查，未建立“完成事件后必须在固定时间内 EOF”的规范，结论为 **inconclusive**，不是宣称不存在这种约定。S12 按上述 request/flags 选择，只含 agent/SDK 观测，缺少 fetch identity 与 transport abort 观测，结论为 **inconclusive**。四组矩阵中原生 Bun fetch 未见同样失败，scope 仅是已测本地案例，不能扩大为所有 Bun 网络操作都正确。

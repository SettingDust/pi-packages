# Subagent CPU / memory investigation

以下为修复前调研记录；后续 SDD 修复与验证见 [Recovery performance Context](../docs/works/recovery-performance/context.md)。用户确认当前 Pi 未加载 subagent 和 harness；结果来自独立 Bun 测试进程，不用于归因当前 Pi 的资源占用。

## 已确认的 CPU 回归

工作区尚未提交的图片输入改动在 `src/index.ts:1273` 新增 `cleanupImageInputs()`，并在 terminal settlement 中无条件调用它。没有图片的历史任务也会先通过 `imageInputDirectory()` 调用 `checkedImageDirectory()`，递归对每个祖先目录执行同步 `lstatSync` 和 `realpathSync`，随后扫描 artifact 目录。

扩展的 `session_start` 和每轮 `before_agent_start` 均通过 `recoverCurrent()` 调用 `runtime.recover()`。`recoverScope()` 清空内存任务表，然后重新恢复所有 task；每个 terminal task 都再次进入 `settle(..., recovering=true)`，重复读取 Result、更新 `updatedAt` 并原子重写 manifest，随后执行图片清理。这使新增同步文件系统检查的成本乘以全部历史 task 数量，即使本轮没有启动子 agent 或传入图片。

使用真实历史记录的隔离副本：1,803 个 task，1,722 completed、62 failed、19 cancelled，没有 image-input 目录。副本只含 manifest 和当前 generation 的 Result；session 路径重定向到临时目录，不复制或渲染 transcript。Herdr transport 为禁止启动的替身。

| 对照 | 初次测量，每轮 wall time | 后续测量，每轮 wall time |
| --- | --- | --- |
| HEAD，无图片输入改动 | 6.8–9.4 s | 7.10–7.12 s |
| 工作区版本 | 17.6–18.4 s | 12.2–12.6 s |
| 工作区，仅在测试进程中跳过图片清理 | 7.0–7.1 s | 7.4–8.9 s，连续四轮 |

初次测量图片清理自身占 10.8–11.4 s；后续占 4.78–4.82 s。后续工作区每轮 CPU time 11.7–12.0 s，HEAD 6.34–6.47 s。绝对时间受系统缓存和文件写入负载影响；差分和单路径跳过实验都将新增 CPU 成本定位到图片清理。

所有版本每轮均调用 `persist` 1,803 次、`readResult` 7,184 次。旧版全量恢复本身已昂贵，新增图片清理进一步放大它。

## 内存结论与范围

- 恢复后任务表保留约 7.4 MB Result 文本；会重复分配 JSON、task 和 cleanup 数据。
- 跳过图片清理后连续恢复四轮，GC 后 heap 约 26.5、26.3、23.8、23.7 MB；RSS 约 129、146、147、146 MB。
- 完整工作区版本两轮 GC 后 heap 约 26.6、23.9 MB；RSS 约 127、123 MB。HEAD 两轮 GC 后 heap 均约 26.5 MB。
- 这些运行均无活动 monitor、待处理 settlement、image cleanup closure，也没有 transport 调用或实际子进程启动。
- 因此本次复现确认 CPU 回归、历史 Result 常驻和重复分配，没有复现持续内存泄漏。不能把此测试外推为所有图片请求、TUI 渲染或其他运行场景均无泄漏。
- harness 统计的 1,803 次 notifier 调用仅是 runtime 回调次数，未调用真实 `pi.sendMessage`，不能据此认定实际发送了 1,803 条消息。

## 修正文件时间线判断

1,803 个 task 是历史积累，全部已结束。恢复时用临时文件替换 `task.json` 会刷新 Windows 文件创建时间，不能把集中出现的文件时间解释为集中启动了 1,803 个子 agent。

## 建议修复位置

1. 让同一 scope 的稳定 terminal task 恢复保持幂等：状态/Result/cleanup intent 未变化时避免重复 settlement、更新时戳和写 manifest，同时保留待处理 cleanup、未送达通知、Result 优先级及跨 scope 恢复行为。
2. 没有已知图片清理责任或候选图片目录时跳过昂贵图片校验；实际发现图片、持有 publication ownership 或删除文件时，仍须完整检查身份、祖先重定向及访问权限。
3. 在历史任务较多且全部无图片的场景保留一个可运行的性能回归检查，覆盖连续同 scope 恢复。只把文件系统调用改成 async 会改善事件循环响应，但不能消除重复工作。

后续修复保留 settlement/Result 重检、通知重放与清理重试，仅跳过未变化终态的写盘和无图片任务的递归校验。`fixed.jsonl` 两轮为 1.35 / 1.28 秒，manifest 写入次数为 0；GC 后堆约 26.6 / 26.5 MB。后续同数据 HEAD 对照为 3.37 / 3.21 秒，每轮写入 1,803 次（`baseline-after-fix.jsonl`）。宿主负载与缓存影响绝对耗时；正式验收由 SDD Context 记录。

## 复现

从仓库根目录执行，`<tasks-directory>` 为全部已结束且没有图片输入目录的历史 tasks 目录：

```powershell
bun packages/pi-herdr-subagents/.perf-investigation/recovery.ts '<tasks-directory>' working 2
bun packages/pi-herdr-subagents/.perf-investigation/recovery.ts '<tasks-directory>' baseline 2
bun packages/pi-herdr-subagents/.perf-investigation/recovery.ts '<tasks-directory>' working-no-image-cleanup 4
```

脚本读取原始文件，创建临时副本，只修改副本并在 `finally` 删除它。baseline 模式从 `git show HEAD:packages/pi-herdr-subagents/src/index.ts` 临时生成同目录 baseline module，结束后删除。应串行运行比较，避免互相争抢 CPU 和 I/O。

后续测量的原始 JSON 输出保存在 `working.jsonl`、`baseline.jsonl`、`no-image-cleanup.jsonl`。

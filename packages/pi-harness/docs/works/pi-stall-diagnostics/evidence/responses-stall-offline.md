# Offline Responses completion and cancellation reproduction

Run from `E:/Projects/pi-packages`:

```sh
bun packages/pi-harness/tools/pi-stall-diagnostics/check-response-stall.mjs
```

Bun 1.4.0 (Windows), Pi 0.87.1 installed chunks read-only. The inspected installed SHA-256 values are `chunk-NUHFSC37.js` `6ff38d5389f66b75728d9bf38e7c0d12e51e9766f056c7e8cca771527562ea4a`, `chunk-WIUZI2CJ.js` `a85d542043c502be8f1c204929762774b5373fae0f3a21b918bf2df151a1edb8`, and `openai-responses-HWEUZ6WZ.js` `464a0fe16527006e378ceaeb19a221bfed39923d457c56e0b8ce8ea26c4ff454`. The fixture rejects global fetch, passes a fake fetch returning HTTP 200 and an in-memory `ReadableStream`, and exercises the real `openai-responses-HWEUZ6WZ.js` adapter, `chunk-WIUZI2CJ.js` consumer, and `chunk-NUHFSC37.js` SDK. It copies chunks to an OS temp directory for the guarded *counterfactual only*, then removes the copy. Every fixture observation and cleanup wait is bounded at 700 ms; no provider request or running Pi process is touched. The valid SSE frame is `response.completed` with `status: completed` and empty output.

## Results (2026-09-24 fixture run)

| Scenario | At 40 ms after start/abort | After fixture releases body/cancel |
| --- | --- | --- |
| Terminal then EOF | `start,done`; result `stop`; iterator ended | Unchanged |
| Terminal, body open | only `start`; result and iterator pending | EOF yields `done`, `stop` |
| Terminal, abort, cooperative body error | `start,error`; result `aborted`; fetch signal aborted | Unchanged |
| Terminal, abort, noncooperative body | only `start`; result and iterator pending **despite aborted fetch signal** | EOF yields `error`, `aborted` |
| Disposable consumer breaks after terminal, reader cancel resolves | `start,done`; result `stop`; transport signal aborted; cancel called once | Unchanged |
| Same early break, reader cancel promise held | only `start`; result and iterator pending; cancel called once, fetch signal not yet aborted | Releasing cancel yields `done`, `stop`; fetch signal aborts |

The installed consumer finalizes metadata on `response.completed` but its `for await` continues until SDK iteration ends. The counterfactual replaces only that branch in a temporary copy with `finalizeResponse(event.response);break`. It proves that breaking **can** settle an open stream when `iterator.return()` cleanup settles, and also that the same break **cannot** guarantee settlement if cleanup hangs. In the latter case `ReadableStream` iterator `return()` awaits `reader.cancel()`; nested generator `finally` and SDK controller abort run only afterward. Baseline open-body behavior is reproducible; it alone is not evidence that the actual HTTP transport violates abort.

## Boundary and confidence

Live evidence inspected: `C:/Users/WINDOWS/AppData/Local/pi-stall-logs/265708-42670dcb-4598-4e59-a7b2-cd02dbab4f48.0.jsonl`, sequences 3335-3437 and 5146. Request 158542 got HTTP 200 and `response.completed` (snapshot flag), then agent `abort.enter`; snapshot 5146 shows pending producer/body.next/forward.next/assistant.next/cancel.idle, 178 settled body.next calls, `signal.aborted` and `cancel.delivered`, no overflow. The log does **not** prove the transport saw or obeyed abort. The earliest observed pending read is SDK `iterSSEChunks` body.next. The local in-memory fixture reproduces the topology and proves the independent completion dependency, not the live transport's reason for remaining open.

Installed source trace: `chunk-OJP47DM6.js` agent `abort()` aborts `activeRun.abortController`; `streamAssistantResponse` passes the signal into the adapter; `openai-responses-HWEUZ6WZ.js` passes `options.signal` through request options; `chunk-NUHFSC37.js` `fetchWithTimeout` listens for abort and aborts its fetch controller. After HTTP 200 the SDK reads `response.body` via `ReadableStreamToAsyncIterable`/`iterSSEChunks` and has no independent abort-aware race on a pending `reader.read()`. The fake fetch confirms signal propagation to fetch, including after headers, but a deliberately noncooperative body stays pending. Real Bun/fetch cancellation propagation and live reader state are **not** established; a real transport may terminate correctly when signalled, or may fail independently.

Smallest supported completion boundary is terminal handling in shared `processResponsesStream` (also used by Azure and Codex adapters), with explicit cleanup semantics; simply ending the downstream queues or adding an agent idle guard would treat downstream symptoms. A naive `break` is only a conditional correction: it awaits `return()` and `reader.cancel()`, which can themselves remain pending. Cancellation requires a separate bounded signal-to-pending-read/iterator-cleanup contract at the SDK/reader boundary when the transport is noncooperative; the exact implementation cannot be selected from this fixture without verifying real fetch cancellation and ensuring no unhandled read, lock leak, or lost terminal data. Do not assume early break fixes the live abort. No installed or production correction was applied.

Regression criteria: with terminal response and open body, completion resolves once cleanup succeeds; ordinary EOF retains `stop`; abort while reading settles as `aborted` when body cooperates; noncooperative pending read and pending `return()`/`cancel()` have bounded cancellation with safe reader lock/resource cleanup, not just a timeout around `waitForIdle`. Recheck Azure and Codex shared-consumer paths before changing it. This fixture establishes the first three behaviors and exposes the latter two gaps; it does not establish a production-safe bounded cleanup mechanism.

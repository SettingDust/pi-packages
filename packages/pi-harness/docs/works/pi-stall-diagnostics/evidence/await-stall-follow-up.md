# Captured HTTP 200 / abort stall: follow-up evidence

This is a planning summary of the supplied 2026-09-24 investigation, not a fresh inspection of the preserved process. Exact pending await remains **unproven**.

- PID 265264 was matched by creation time `2026-09-24T05:01:13.7757050Z` and session header UUID `01a0d1ca-09e4-73ef-8e63-67c03cbdaf78`. At 05:37:53Z the log ended at sequences 571–574: `assistant.enter` (operation 146, turn 144, request 145), `provider.request`, HTTP 200 `provider.response` at 05:02:57.601Z, then `abort.enter` (operation 147) at 05:05:04.436Z. No later settlement record was observed.
- No inspect flag, owned TCP/UDP endpoint or documented accessible async snapshot was found in the bounded investigation. This does not exclude all runtime facilities or prove event-loop responsiveness. A new inspected Bun process has been suggested separately; its existence is not established.
- Response logging precedes the awaited response callback. Generic `emit(event)` awaits individual handlers without message_end probes. Current known response handlers weaken the callback hypothesis: pi-retry is synchronous; pi-cache-optimizer's explicit await is on HTTP 400, not 200. These are current source candidates, not proof of registrations loaded in that process.
- Session abort calls `abortRetry()`, `abortCompaction()`, `abortBranchSummary()`, `agent.abort()`, then awaits `waitForIdle()`. Agent abort calls `activeRun?.abortController.abort()`. The existing abort entry proves neither helper completion nor cancellation delivery nor idle-wait entry. Logger failure also suppresses later records; silence alone is not proof of a pending await.
- Prior actual-adapter fake transport reproduced pending gated onResponse and noncooperative body reads after transport abort. `response.completed` or `[DONE]` with an open body remained pending. EOF, body rejection, response.failed and completed-plus-EOF settled. A bare queue `end()` ended iteration without settling `result()` until supplied a result; the real adapter pushes a terminal event before end, so this fixture does not prove an adapter bug.

## Provenance and source locators

Complete supplied report: `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-09-22T05-31-12-636Z_01a0c798-c37c-72be-9f9c-91c7661a645d/tasks/inspect-pi-stall-async-state-artifacts/result-1.json`.

Prior runnable fixture and results: `C:/Users/WINDOWS/AppData/Local/Temp/pi-responses-settlement-J904TM/probe.mjs`, `result.json`, `sources.json`. Preserve these inputs; port the fixture into the kit during T3 rather than leaving its executable verification dependent on Temp. The prior report verified all six source hashes; this planning unit read source boundaries but did not repeat the reproduction or hash verification.

All paths below are relative to `D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent/dist/bundle/chunks/`. Hashes are recorded incident bytes, not promised future patched hashes.

| File | Incident SHA-256 | Source boundary |
| --- | --- | --- |
| chunk-OJP47DM6.js | b1c6995246bb393df5fda23dc3a286f7d8f26814a09fc2aa140760ba78207d3c | generic `async emit(event)`; `streamAssistantResponse`; session and agent abort; `handleProviderResponse` |
| openai-responses-HWEUZ6WZ.js | 4ebfa8cec003119c431c92b8306f28f5b9359bde82e213bc8afa6ed764d5bde8 | existing awaited onResponse, processResponsesStream, terminal push/end |
| chunk-NUHFSC37.js | 9b724435ac1da15eaa4465e7eaca0aa9a23617c6f1efa7b6261db6d17dbe755b | fromSSEResponse; _iterSSEMessages; iterSSEChunks; ReadableStreamToAsyncIterable |
| chunk-WIUZI2CJ.js | a85d542043c502be8f1c204929762774b5373fae0f3a21b918bf2df151a1edb8 | processResponsesStream / finalizeResponse; read-only in T3 |
| chunk-A3JYRWB6.js | 39a18bfbaf6a8edd098844da7988e1ff4a5551520e47c4aacbfc95e7c669a843 | EventStream push/end/iterator/result; read-only in T3 |
| chunk-RCZIEVGO.js | 7b2c0b36b01c1cedb11e7ab525a3fade0967f56b0cbd286fc32ffa25f5965055 | lazyStream / forwardStream |

Minimal partition: callback/individual generic handler; producer versus body-next/cleanup; inner versus outer queue consumption and result; cancellation helpers versus controller return versus idle wait. Queue internals and response processing internals need no patch initially: observe their existing caller boundaries and the SDK's fixed terminal markers. These observations identify outstanding layers, not necessarily one causal root when several consumers wait behind one producer.

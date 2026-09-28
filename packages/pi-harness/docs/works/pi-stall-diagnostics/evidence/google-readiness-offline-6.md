# Google offline coverage: Pi 0.87.1 / offline-6-google

**T1-G is complete. Overall T1 remains incomplete; activation is disabled.** The staged main/Google SDK pair passes the selected offline coverage, affected correlation, isolated CLI smoke and changed-code performance checks. T1-P paired installer/recovery and independent T2 activation were not performed.

## Implementation and source ownership

`stage.mjs` retains nine main boundary fingerprints and checks the exact entry/runtime hashes, both original target hashes, both unchanged adapter hashes and all 16 original Google source excerpts. Staging creates exactly two canonical target entries with exclusively written, verified original backups and staged files. All source reads use the explicitly supplied installation, resolved to 0.87.1; no installed bytes were changed.

| File | Original SHA-256 | Staged SHA-256 |
| --- | --- | --- |
| `chunk-OJP47DM6.js` | `81c81a21ec81e84200205f561687408ff5e3738fbbbb3c2a6c186b348d376020` | `b1c6995246bb393df5fda23dc3a286f7d8f26814a09fc2aa140760ba78207d3c` |
| `chunk-FUXEF6JQ.js` | `b7d0697d0f4c7d3b54c6aee545d3b27c5981c27d0470e1c79876898f28f2c472` | `32b6ff866b6a64fc2613fa12474f7ada5ca1483a362d0be7680735bdaedc1200` |

The SDK sends only integer HTTP status through `pi.stall.google.response.v1` immediately after the existing awaited fetch assignment. A private token is passed from the two `Models.generateContentStreamInternal` call sites through `requestStream`, `streamApiCall` and `apiCall`; arbitrary SDK calls under ambient request context do not qualify. Added optional parameters have defaults, preserving method arities. The existing fetch expression, awaits, retry/status/body handling and catch/dispose path remain intact. No global fetch or prototype interception is used.

The main request wrapper enters Google eligibility only around the selected provider invocation. Source-verified API names are `google-generative-ai` and `google-vertex`; the SDK token provides the additional model-stream boundary. The subscriber requires a live request token, preserves operation/session/turn/request attribution and clears tool attribution. Payload callbacks run outside eligibility; callback receiver, arguments, returned Promise and thrown error identities are preserved. The SDK catches setup/publication failures and the owned subscriber catches its entire body. Disabled loggers do not subscribe; subscriptions are removed when active scopes finish. This does not isolate arbitrary external subscribers that deliberately throw on the same public Node diagnostics channel.

The legacy installer explicitly refuses pair manifests before mutation. This safety refusal is the only installer change; no paired recovery implementation was added.

## Verification and applicability

Commands and source hashes are embedded in durable JSON; runnable commands are in the [kit README](../../../../tools/pi-stall-diagnostics/README.md).

- [Google checks](google-offline-6.json): both actual adapter call-site excerpts, actual lazy-API wrapper, main request and SDK model/request/transport methods execute with fake surrounding dependencies. Success, non-OK, retry, rejection and abort pass for both adapters. Response/error/signal identities, request linkage, Google/non-Google concurrency, unrelated SDK/auth traffic, user callbacks while the request remains active, expired contexts, invalid status notifications, privacy and cleanup pass. Baseline/disabled/enabled microtask traces match for both adapters on success/retry/non-OK/rejection/abort. Logger write failure, SDK channel setup/publication failure, an exception inside the owned subscriber and forced rotation failure do not alter request results. Three-file retention is checked at a reduced test cap.
- [Correlation regression](correlation-offline-6.json): 226 events; concurrent sessions and requests, nested/continued runs, tool identity, deferred callbacks/turns, abort attribution, errors, fixed schema and original/patched async ordering pass for current main/logger bytes.
- [Pair staging smoke](staging-offline-6.json): both staged files parse; both are placed only in a disposable copy. Fresh `--version` returns `0.87.1` with network/process creation blocked, no inherited credentials and an isolated empty home that remains empty. Main and SDK unknown-byte refusal, exclusive writes and unchanged installed source guards pass.
- [Final reconciliation](reconciliation-offline-6.json): records current source/evidence hashes, fresh installed guards, additional eligibility selectors, syntax and whitespace checks. Its historical evidence hashes distinguish retained offline-5 results from current verification.

The fake runtime does not execute complete provider adapters, real credential acquisition, the SDK's real retry scheduler or stream decoding. The lazy loader uses fake load/forwarding dependencies. Those are unchanged surrounding dependencies; this evidence establishes the patched boundaries and their async contract, not real-provider behavior or full CLI throughput. The CLI smoke proves loading a consistent copied pair, not paired installer recovery. Test development corrected fake-auth recursion and an assertion that confused unrelated auth signals with the model signal; final accepted checks pass.

## Changed-code costs

[Benchmark JSON](turns-offline-6.json) contains environment, commands, hashes and complete counts. Each sample runs actual extracted loop/request/handler/append/hook/tool boundaries with fake dependencies, 32 deltas, two message dispatches, two handlers per dispatch, two appends and two tools/hooks per turn. Google scenarios additionally run the actual extracted SDK transport chain. Modes execute identical work in rotating order, with 20 warmups and 200 measured samples; forced rotation uses 50 measured samples and a 4 KiB cap. Production retention remains three files of 5 MiB.

All timings below are median / p95 milliseconds. Counts exclude warmups and include rotated-out events.

| Workload | Baseline | Disabled | Enabled | Enabled events / bytes |
| --- | --- | --- | --- | --- |
| Existing non-Google whole turn | 0.0859 / 0.1505 | 0.1399 / 0.2677 | 8.0178 / 14.1939 | 6600 / 1389528 |
| Google success | 0.6461 / 1.0272 | 0.6704 / 0.9745 | 9.6666 / 13.1485 | 6600 / 1398551 |
| Google 503 then 200 | 0.6099 / 0.9543 | 0.6039 / 0.9934 | 8.6785 / 10.7700 | 6800 / 1442343 |
| Concurrent Gemini retry + Vertex success | 1.0358 / 1.6812 | 1.0806 / 1.5725 | 16.5126 / 22.5939 | 13400 / 2861350 |
| Google success with forced rotation | 0.5754 / 0.8728 | 0.5340 / 0.7493 | 12.5512 / 17.6063 | 1650 / 346094 |

Enabled added median/p95 costs are 9.0205/12.1213 ms for Google success, 8.0686/9.8157 ms for retry, 15.4768/20.9127 ms for a concurrent pair, and 11.9758/16.7335 ms with forced rotation. Disabled median/p95 differences are respectively 0.0243/−0.0527, −0.0060/0.0391, 0.0448/−0.1087 and −0.0414/−0.1235 ms. Negative differences reflect independently sampled distributions, not a speedup claim; none are percentiles of paired differences.

Sink observers time synchronous append/mkdir/rm/rename work and count submitted bytes, adding constant test-only overhead. Enabled sink median/p95 is 8.2158/11.2802 ms for success, 7.3499/9.2274 ms for retry, 13.9968/19.4855 ms for a concurrent pair and 10.9030/15.5206 ms with rotation. These distribution summaries show that disk operations dominate the cost. All 50 measured rotation samples rotate; their complete-turn rotation latency is 12.5512/17.6063 ms, not isolated rename latency.

Event amplification is exact and bounded: 33 records for one successful whole turn, 34 with one extra settled attempt, and 67 for the concurrent two-turn case. Rejected/aborted fetches before settlement add no response event; there are no per-token records. The bridge adds a synchronous notification and one existing-schema record per settled attempt, without adding await boundaries. Concurrent cost grows approximately with the number of records; forced rotation increases disk work. Success is slower than retry in this run largely because measured sink time is higher; retry adds exactly one record. Historical offline-5 overhead was 7.2775/9.6698 ms; the current non-Google result is 7.9319/14.0434 ms. These separate runs do not isolate a causal regression. Current disabled cost remains small and directly measured Google sink cost explains the substantial enabled blocking; no unbounded growth or altered async ordering was observed.

Under the accepted Plan's provisional tradeoff, this remains a measurable but bounded cost for temporary opt-in diagnostics. It is not negligible, a latency guarantee or activation approval. No real-provider latency was measured, and no new performance threshold is imposed.

## Remaining boundary

Historical `*-0.87.1.json` and `readiness-0.87.1.md` files remain unchanged for their recorded revisions. In particular, old single-file installer/rollback evidence does not verify this pair. Current correlation, Google, staging and performance evidence use new filenames and exact current hashes. Unchanged logger sink/retention behavior reuses the historical coverage, supplemented by current privacy/write-failure/rotation/rotation-failure checks; the full legacy installer suite was not rerun.

T1-P still requires serialized paired install/recovery, verified same-directory replacement, both mixed-state restorations, restart with stale journal progress, interruption and unknown-byte/corrupt-backup refusal, concurrent-operation refusal and smoke-failure recovery, all on disposable copies. T2 remains independently selected and requires complete T1, fresh real-target guards and reliable inactivity proof, verified backups, consistent-pair smoke, idempotence and an exact rollback drill. No live installation, provider request, process interruption or user-session change occurred. `activationAllowed: false` throughout.

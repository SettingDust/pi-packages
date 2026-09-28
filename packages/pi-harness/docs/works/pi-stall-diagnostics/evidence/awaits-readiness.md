# Outstanding-await diagnostics: T3 offline acceptance passed

T3 is complete for **offline-7-awaits**, under Bun 1.4.0. [Reproducible evidence](awaits-offline.json) records the command, kit/source hashes, exact selectors, five-target manifest, comparisons, timing and final source/recovery checks. The new revision has `activationAllowed: false` and is **not installed**. The existing runtime, incident process/session and original recovery material were not changed.

```sh
bun packages/pi-harness/tools/pi-stall-diagnostics/check-awaits.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/awaits-offline.json
```

This command now exits **0** only after focused acceptance passes. The earlier baseline-only exit-2 checkpoint is superseded. Evidence is saved after each accepted unit. The runner reads the installation and existing backups, restores originals only into a disposable package tree, generates exclusive stages/backups, and verifies the installed seven-file hashes, entry/current mappings and recovery bytes again at completion.

## Implementation and source ownership

`awaits.mjs` reuses the existing `stage.mjs` transformations and `logger.mjs` sink without changing their offline-6 bytes. Keeping that base intact allows exact reproduction of the installed main and unchanged Google patch from verified recovery originals. It also leaves the old two-file installer on its established revision.

Four staged files change: main `chunk-OJP47DM6.js`, adapter `openai-responses-HWEUZ6WZ.js`, SDK `chunk-NUHFSC37.js`, and lazy forwarder `chunk-RCZIEVGO.js`. The fifth target retains the exact existing Google probe bytes in `chunk-FUXEF6JQ.js`. Read-only guards cover `chunk-WIUZI2CJ.js` and `chunk-A3JYRWB6.js`. The manifest records canonical disposable targets, original/base/new hashes, verified backups, staged paths and exact selector fingerprints. All five parse and retain relative import/export mappings.

The existing main logger gains a versioned `pi.stall.await.v1` subscriber in staged output only. It tracks acquisition, callback, individual generic handlers, producer, body next/cleanup, forwarding setup/next/result, assistant next/result, cancellation helpers/controller and idle. Generic handlers have dispatch parents and opaque handler IDs. Inner and outer queue IDs are distinct. Fixed flags distinguish parsed completion/failure, SSE DONE, body EOF/error, terminal push/end and delivered cancellation. SDK observations require an active provider context; user callbacks and expired scopes cannot borrow that eligibility.

Iterator façades return the original next/return promise and preserve receiver/arguments. The existing consumer await and finally boundaries clear slots; instrumentation adds no promise races, settlement observers or async callback wrappers. EOF clears the next slot before a subsequent result wait or trailing decoded data, avoiding a false simultaneous next/result wait. Actual-source comparisons verify ordinary failures, swallowed handler errors, callback receivers, identities and changed-boundary microtask traces.

## Bounded collection and interpretation

At most 128 request summaries and 32 outstanding slots per summary are retained. Progress saturates at 1,000,000. A summary is limited to 16 KiB; the existing three-by-5-MiB sink remains in use. Overflow is explicit, including a bounded unattributed overflow record while rejected requests remain active. There is no eviction presented as complete evidence.

One unref'ed one-second sampler runs while summaries or overflow requests remain active. Abort and settlement also snapshot. Handler/chunk transitions update memory only. Two actual sampling intervals, rotation retention, idle cleanup, logger failure, owned subscriber failure, publisher/setup failure, disabled mode, sentinel privacy, concurrent attribution and expired handles passed. A million-transition check produced two lifecycle records with saturated progress and no remaining slots.

Snapshots describe an outstanding set, not a unique causal root. A terminal frame with an open body does not mean the producer settled. Missing sampling can mean event-loop blockage, disabled/failed logging or process exit; it is not proof of an await. Arbitrary third-party throwing subscribers to the same Node diagnostics channel remain outside ownership; the publisher catch and the entire owned subscriber are isolated, matching the existing bridge ownership contract.

## Focused verification

The runner preserves the ten captured fixtures and adds synchronous callback rejection, gated iterator cleanup and two concurrent requests in one turn: **14 fixtures per comparison**. Actual original, patched-disabled and patched-enabled adapter/SDK/queue sources have equal settlement outcomes and recorded microtask traces. Enabled fallback-reader cases also pass; native async iteration is asserted available in the native cases. Controlled releases distinguish callback, body read and cleanup waits; completion/DONE with an open body retains flags and pending producer/body state without false completion.

Actual extracted main/forwarder boundaries verify the three generic event kinds, dispatch parent IDs, swallowed failures, acquisition versus outer next versus message dispatch, outer/forwarding result waits, lazy setup, cancellation-helper order and failure classification, and controller signal delivery before idle. The noncooperative-body fixture executes the actual session abort method and proves transport cancellation precedes its still-pending idle wait. The bare queue fixture remains a synthetic distinction, not evidence of an adapter bug.

All five stages parse and preserve mappings. Fresh isolated provider-free Bun CLI smoke loads the staged main and both Google adapters and verifies two append records with an empty home; the fake-transport comparisons import the actual staged OpenAI adapter/SDK. Network/process creation is blocked inside fixture children. The old installer reaches its manifest guard, rejects the new revision/set, and leaves all five target hashes unchanged.

## Measured costs

Forty samples after five warmups each process 2,048 chunks and 2,048 actual generic handlers. These are synthetic extracted actual loops plus the synchronous sink, not provider or full-CLI latency.

| Mode | Median ms | p95 ms | Added median/p95 ms | Records / bytes over 81,920 chunks |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 3.3214 | 5.6418 | — | 0 / 0 |
| Disabled | 3.6087 | 6.1571 | 0.2873 / 0.5153 | 0 / 0 |
| Enabled | 6.1706 | 10.0348 | 2.8492 / 4.3930 | 40 / 16,488 |
| Forced rotation | 7.0570 | 9.7708 | 3.7356 / 4.1290 | 40 / 16,490 |

Sixty snapshot-only samples measured enabled median/p95 **0.1722/0.2892 ms**, forced rotation **0.3597/2.2839 ms**, disabled **0.0001/0.0002 ms**. The JSON also records elapsed measured time, retained bytes and snapshot counts. Records follow lifecycle/cadence rather than chunk count. Added map/channel operations and synchronous writes have visible, bounded costs; rotation increases blocking. This supports the accepted temporary opt-in diagnostic tradeoff, not a real-provider latency guarantee. Historical performance evidence remains attached to its original bytes.

## Deployment conditions

No activation or expanded installer was implemented. Later activation requires separate selection, expanded-set guarded recovery and mixed-version compatibility proof, fresh canonical mapping/source hashes and verified backups, safe replacement evidence, and fresh consistent-set provider-free smoke. The prior two-file installation/recovery proof does not establish these conditions for five targets. Do not feed the new manifest to the historical pair installer or modify the current incident to obtain coverage. Only a future process using a subsequently admitted installation can emit these new snapshots.

# Tasks: Pi Stall Diagnostics

## T4. Prepare And Verify Five-Target Installation And Recovery Offline

- **Status:** complete offline for `offline-7-awaits`; [161-check acceptance](evidence/await-install-readiness.md) and [hash-bound evidence](evidence/await-install-offline.json). The live seven-file installation, canonical mapping and existing recovery contents remain unchanged. Expanded activation was not executed. PID 265264 was unavailable to read-only inspection before/after the final run; no continued-process-preservation claim is made.
- **Outcome:** exact five-target `offline-7-awaits` installation/recovery is supported by the kit and proved on disposable copies. Actual activation is excluded.
- **Targets:** under `0.87.1/dist/bundle/chunks`: `chunk-OJP47DM6.js`, `openai-responses-HWEUZ6WZ.js`, `chunk-NUHFSC37.js`, `chunk-RCZIEVGO.js`, `chunk-FUXEF6JQ.js`. Guard read-only `chunk-WIUZI2CJ.js`/`chunk-A3JYRWB6.js`, entry/runtime and Google adapter mappings. Source hashes/selectors come from `evidence/awaits-offline.json:sourceHashes`, `originalHashes`, and `awaitManifest`, not caller-invented values.
- **Surfaces under `packages/pi-harness/tools/pi-stall-diagnostics/`:** `install.mjs:classify/disposable/admission/operate` (including guard/replace/restore), `applyLive/liveCompatibility`; `activate.mjs:status` and prepare/install/rollback dispatch; `awaits.mjs:stageAwaits` only if preparation/rebinding requires it. Reuse `check-awaits.mjs` original-copy/reproduction logic, `check-pair.mjs` recovery fixtures, `check-live-runtime.mjs` cache/sharing checks, and `smoke.mjs`/`smoke-probe.mjs` isolation. Preserve stage/logger and await transformation bytes unless a concrete failed check requires correction.
- **Artifacts:** focused `check-await-install.mjs`, new `evidence/await-install-offline.json` and `evidence/await-install-readiness.md`, affected kit README commands and T4 status. Bind new evidence to current installer/check hashes and reused T3 hashes. Preserve historical evidence.

### Bounded acceptance

1. Check T3 kit/source/output hashes before reusing passing evidence. Reconstruct original main/Google only from verified existing recovery backups in disposable trees and reproduce the installed pair exactly. Independently verify canonical mappings when rebinding staged paths; never trust edited manifests. New recovery material preserves originals and the full pre-upgrade baseline. Existing recovery directory contents stay unchanged. No repeated diagnostic or cost suites for unchanged bytes.
2. Implement only five-target revision admission/state expansion and required command routing. Prove baseline-to-new install/repeated install without rewrites, default expanded rollback/repeated rollback to baseline, and explicit pristine restoration on disposable copies. Keep offline-6 recovery working with a focused affected-path regression. Handle equal base/original/new hashes and skip unchanged Google on upgrade. Keep manifests `activationAllowed: false`; invoke no real-target mutation.
3. Inject failure/voluntary fixture-worker exit before/after each changed replacement on install and recovery. Restart with stale/truncated journal; restore known mixtures to exact baseline before a separate install attempt. Cover interrupted/repeated restore and smoke failure. Check ownership conflict, Windows open-reader refusal preserving bytes, unknown target, missing/corrupt original/base/stage, duplicate/escaping/linked paths, selector/mapping/recovery drift before/between writes. Preserve unknown bytes and report five residual hashes if recovery is unsafe. Reuse unaffected historical cases.
4. Verify import/export contracts and Bun 1.4.0 runtime behavior for all 16 baseline/new main/adapter/OpenAI-SDK/forwarder combinations with unchanged Google. Reuse bounded actual-source fake transport/queue fixtures for lazy setup/forwarding, success and cancellation settlement/identity, enabled/disabled logging and absent subscriber/publisher. Partial diagnostic coverage is acceptable; program behavior changes are not. Exercise cached modules followed by lazy imports across replacement. Fresh isolated provider-free CLI/Google and OpenAI fake-runtime smoke passes for consistent new/baseline/pristine sets. Mixed loads occur only in compatibility fixtures.
5. Persist exact command/current hashes, passed cases and limitations; verify read-source seven-file hashes/current mapping and existing recovery directory contents unchanged. Document later commands and baseline versus pristine rollback without executing them. No providers, session creation, debugger, process termination or inspector-env change; preserve PID 265264. No all-process inactivity requirement, live rollback drill or new approval. Completion is disposable recovery/compatibility evidence, not activation.

Reproduce the completed focused acceptance with:

```sh
bun packages/pi-harness/tools/pi-stall-diagnostics/check-await-install.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/await-install-offline.json
```

### Exact T4 planned selector

```yaml
objective: Execute only T4. Prepare And Verify Five-Target Installation And Recovery Offline
primarySkill: implement-plan
companionSkills: [ponytail]
context:
  - ref: E:/Projects/pi-packages/packages/pi-harness/docs/works/pi-stall-diagnostics/work.md
    purpose: Selected diagnostic Work and preserved incident boundary
  - ref: E:/Projects/pi-packages/packages/pi-harness/docs/works/pi-stall-diagnostics/plan.md
    purpose: Selected T4 installation and recovery Plan
  - ref: E:/Projects/pi-packages/packages/pi-harness/docs/works/pi-stall-diagnostics/tasks.md
    purpose: Execute only T4 and bounded acceptance
  - ref: E:/Projects/pi-packages/packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/awaits-readiness.md
    purpose: Completed T3 acceptance and deployment conditions
  - ref: E:/Projects/pi-packages/packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/awaits-offline.json
    purpose: Exact reusable hashes, selectors, manifest and results
  - ref: E:/Projects/pi-packages/packages/pi-harness/tools/pi-stall-diagnostics/
    purpose: Existing staging, installer, recovery and disposable fixtures
constraints:
  - Implement and verify only on disposable copies; no actual activation or installed mutation.
  - Preserve PID 265264, sessions, original recovery directory and installed offline-6 pair.
  - Preserve pristine backups and pre-upgrade baseline; default expanded rollback restores baseline.
  - Require exact source guards, mixed-version runtime proof and safe serialized replacement evidence.
  - Reuse passing evidence only with matching hashes; no broad unaffected T3 rerun.
  - No provider calls, debugger, process termination or inspector-env changes.
  - No blanket inactivity gate, live rollback drill or new approval for this preparation.
deliverables:
  - Five-target installer/recovery preparation with focused disposable acceptance evidence and later commands; activation excluded.
```

This selector defines only T4; its offline implementation and acceptance are now complete. It does not rerun T3, select historical T1/T2, or activate the expanded revision.

## T3. Implement And Verify Outstanding-Await Diagnostics Offline

- **Status:** complete offline for `offline-7-awaits`; activation remains disabled. [Acceptance report](evidence/awaits-readiness.md); [reproducible evidence](evidence/awaits-offline.json). The command exits 0 after four-file instrumentation, five-target disposable staging and focused acceptance pass. Existing installed/recovery bytes and mappings remain unchanged. This selector does not execute historical T1/T2 or activation.
- **Delivered:** bounded correlated outstanding sets; callback/handler, producer/body/cleanup, inner/outer next/result and cancellation/idle partition; fixed terminal flags; one unref'ed sampler; exact source/backup guards; unchanged Google probe; legacy-installer refusal. Fourteen fixtures per original/disabled/enabled comparison and enabled fallback-reader verification passed, along with actual-source handler/cancellation/queue traces, caps/privacy/failure isolation, timing and isolated staged Bun smoke.
- **Measured added cost:** per 2,048 chunks plus 2,048 handlers, enabled median/p95 `2.8492/4.3930 ms`; forced rotation `3.7356/4.1290 ms`; disabled `0.2873/0.5153 ms`. Enabled logging wrote 40 lifecycle records over 81,920 measured chunks. Snapshot-only enabled median/p95 `0.1722/0.2892 ms`; rotation `0.3597/2.2839 ms`. Synthetic results, not provider latency.
- **Deployment boundary:** separate activation selection, expanded recovery/mixed-version compatibility, fresh guards/backups and safe replacement evidence remain required. The old pair proof is insufficient for this set.
- **Outcome:** a staged, metadata-only diagnostic revision whose offline observations distinguish outstanding callback/handler, producer/body/queue/result and cancellation/idle boundaries without changing settlement.
- **Depends on/context:** current T3 section of [Plan](plan.md), [Work](work.md), [incident/source evidence](evidence/await-stall-follow-up.md), existing kit and the exact Temp probe/results/source inventory linked by that evidence. Completed T1/T2 establish the existing kit only. No unresolved user decision blocks offline work; source drift, missing verified backup or inability to preserve semantics must be reported concretely.
- **Repository surfaces:** `packages/pi-harness/tools/pi-stall-diagnostics/stage.mjs`, `logger.mjs`, new `check-awaits.mjs` (port/reuse captured probe), `check-stage.mjs` only for expanded disposable staging, and `README.md`; affected extraction helpers only if needed. Persist new `evidence/awaits-offline.json` and `evidence/awaits-readiness.md` under this Work; update T3 status. No installer/activation implementation or installed-file edits.

### Exact source targets and observation contract

Targets are under the canonical `0.87.1/dist/bundle/chunks` package directory recorded in the incident evidence. Revalidate full hashes/import mappings and persist unique source excerpts/fingerprints before transformation; offsets in the captured inventory are navigation aids, not patch guards.

| Changed file | Minimal source selectors | Required partition |
| --- | --- | --- |
| `chunk-OJP47DM6.js` | `async emit(event){` through `async emitCacheWarmingDecision(event){`; `streamAssistantResponse` through `failToolCallsFromTruncatedMessage`; session abort through `waitForIdle`; agent `abort(){this.activeRun?.abortController.abort()}` | Generic individual handlers only for after_provider_response/message_start/message_update, with opaque handler/dispatch IDs; assistant response acquisition, outer iterator wait versus message dispatch and both response.result awaits; each cancellation helper completion, controller call enter/return and signal.aborted, idle enter/settle/error. Preserve swallowed handler-error behavior. |
| `openai-responses-HWEUZ6WZ.js` | existing `await options?.onResponse?.(...)`; `await processResponsesStream(...)`; `stream2.push` terminal branches and `stream2.end()` | Callback enter/settle/error, producer enter/settle/error, inner terminal push/end and source signal state. Do not wrap a sync callback in a new async function; instrument its existing awaited caller. |
| `chunk-NUHFSC37.js` | `Stream.fromSSEResponse` local iterator; `_iterSSEMessages`; `iterSSEChunks`; `ReadableStreamToAsyncIterable` native and fallback branches | Actual body iteration wait/EOF/error and iterator cleanup, separately from decoded event delivery; fixed flags for parsed response.completed/failed and SSE [DONE], without copying payloads. Cover native Symbol.asyncIterator as well as fallback reader.read/cancel; probing fallback alone is insufficient. |
| `chunk-RCZIEVGO.js` | `async function forwardStream(target,source)` and `function lazyStream(model,setup)` | Setup pending, inner next/EOF/error, forward termination, source.result pending/settled and outer end. Distinguish inner and outer opaque queue IDs without editing EventStream internals. |

`chunk-WIUZI2CJ.js:processResponsesStream/finalizeResponse` and `chunk-A3JYRWB6.js:EventStream` remain read-only guards/fixture references. SDK markers distinguish a terminal frame seen with a still-open body from no terminal seen; they do not imply producer/result settlement. Multiple layers may remain pending simultaneously; report the outstanding set and avoid claiming the downstream queue caused the upstream wait.

Apply the Plan's capped memory/snapshot model and privacy/semantic constraints. Keep onResponse and generic-handler scopes distinct. Do not lose request correlation at lazy imports, async generators or external abort; omit ambiguous owner IDs rather than borrowing another request. No disk writes per token or per message_update handler; snapshots must retain the final pending phase even when no more chunks arrive.

### Smallest verification and completion

Implement the runnable command from repository root:

```sh
bun packages/pi-harness/tools/pi-stall-diagnostics/check-awaits.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/awaits-offline.json
```

The command uses the installation only as a guarded read source, copies to disposable trees, ports the Temp probe without overwriting it, blocks real transport, and runs identical baseline/disabled/enabled fixtures against actual source. Use controlled release gates and bounded cleanup, not log silence or elapsed time alone as proof of which gate is pending.

1. Reuse `abort_during_onResponse`, `abort_noncooperative_body`, `completed_body_left_open`, `DONE_body_left_open`, `completed_and_EOF`, `EOF_without_terminal`, `body_read_rejects`, `response_failed_open_body`, `abort_cooperative_body`, and `bare_queue_end_without_result`. Require callback versus body pending to differ; terminal-open cases must retain terminal-seen plus body pending without false stream completion; queue-end-only must expose result pending after EOF. Release gates and preserve every original result/iteration/transport-abort outcome. Bare queue fixture remains a synthetic distinction, not a diagnosis of the adapter.
2. Reuse correlation harness to add gated generic handlers for the three selected event kinds, including swallowed failures, outer versus forwarding result waits and cancellation-helper/controller/idle phases. Assert cancellation delivery before idle wait for noncooperative body; helper failure must not be mislabeled idle. Verify concurrent requests and deferred/expired scopes, receiver/argument/value/error/signal identity, and baseline/disabled/enabled async trace equality at the changed boundaries. No broad rerun of unchanged provider suites.
3. Assert a stuck phase remains observable across at least two sampling intervals with no new chunks, and across rotation; normal settlement clears it. Check 128-request/32-slot/16-KiB caps, overflow visibility, sampler shutdown/unref, disabled mode, throwing publisher/subscriber/sink and sentinel privacy. A many-chunk/message_update workload must show disk record counts bounded by snapshot cadence and lifecycle events, not chunk count; report median/p95 overhead and bytes including rotation.
4. Parse all five staged targets (four changed files plus unchanged Google SDK probe), verify exact import/export mappings, run isolated provider-free Bun CLI/adapter smoke on the consistent disposable set, confirm read-source hashes unchanged, and assert existing installer refuses the new revision/manifest without writes. Record canonical base/original/new hashes and selectors. Missing source/backup or changed ordering blocks readiness; never relax guards.

Completion leaves reproducible offline evidence and staged source diagnostics only. Expanded-set guarded recovery/compatibility and activation remain unproved and excluded. Authorized reversible diagnostic implementation does not need another user approval.

### Exact T3 planned selector

Select `primarySkill: implement-plan`, objective `Execute only T3. Implement And Verify Outstanding-Await Diagnostics Offline`, with the three canonical Work/Plan/Tasks references exactly once each:

```yaml
context:
  - ref: E:/Projects/pi-packages/packages/pi-harness/docs/works/pi-stall-diagnostics/work.md
    purpose: Selected diagnostic Work
  - ref: E:/Projects/pi-packages/packages/pi-harness/docs/works/pi-stall-diagnostics/plan.md
    purpose: Selected T3 implementation Plan
  - ref: E:/Projects/pi-packages/packages/pi-harness/docs/works/pi-stall-diagnostics/tasks.md
    purpose: Execute only T3 outstanding-await diagnostics offline
  - ref: E:/Projects/pi-packages/packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/await-stall-follow-up.md
    purpose: Incident limitations, exact sources and reusable fixtures
```

Retain offline-only, metadata-only, no-provider, no-process-change and no-activation constraints. This selector does not execute historical T1/T2 or select a later activation unit.


## Direct activation completed (2026-09-24)

The latest explicit user direction supersedes the historical blanket inactivity gate and live rollback drill below. T2 is complete: the real 0.87.1 pair is patched/patched, repeated installation was idempotent, and isolated Bun 1.4.0 smoke loaded the main plus both lazy Google adapters and emitted two actual append boundary records without creating a session or calling a provider. See [final evidence](evidence/direct-activation-final.json), [runtime compatibility](evidence/live-runtime-activation.json), and [changed admission checks](evidence/direct-activation-checks.json). Historical blocked statements below describe earlier attempts only.

Windows open-reader replacement returned EPERM without changing bytes; after closing the disposable reader, replacement succeeded. Bun cached modules stayed old even with an import query suffix. All four old/new main/SDK combinations loaded successfully; the SDK token/signature changes stay within one file and exports are identical. Old main has no subscriber; old SDK has no notification. This permits compatible partial diagnostic coverage in existing processes, not a claim that they are instrumented. Exact pair/hash/backup/source guards, serialized replacements and recovery remain enforced. No live rollback/reinstall cycle was performed.

Logging is configured in the Windows user environment as PI_STALL_LOG_DIR=C:/Users/WINDOWS/AppData/Local/pi-stall-logs. Two provider-free records were verified there. Existing parent environments and sessions are unchanged. A newly launched Pi needs this variable in its inherited environment; from an existing PowerShell terminal set it explicitly before launching Pi. Recovery materials are retained at C:/Users/WINDOWS/AppData/Local/pi-stall-recovery-0.87.1. Supported start/rollback commands are in the kit README.


- **Historical status:** offline T1 was complete; T2 was selected and activation was blocked by runtime occupancy; guarded live tooling was verified on disposable copies. The later direct-activation result is recorded above.
- Plan: [plan.md](plan.md); [Work](work.md); [Context](context.md).

## Dependency

`T1-G Google offline coverage -> T1-P paired installer recovery -> T2 independent activation`. Execute one named unit per Handoff, serially because staging/manifest surfaces overlap. Preserve completed offline-5 non-Google evidence, rerunning only checks affected by changed bytes.

## T1-G. Implement And Verify Google Offline Coverage

- **Status:** complete for `offline-6-google`; activation remains disabled. [Current report](evidence/google-readiness-offline-6.md), [Google checks](evidence/google-offline-6.json), [correlation](evidence/correlation-offline-6.json), [pair staging smoke](evidence/staging-offline-6.json), [costs](evidence/turns-offline-6.json), [reconciliation](evidence/reconciliation-offline-6.json).
- **Delivered:** guarded two-target staging/backups; numeric-only shared-SDK response bridge with private model-stream token and active main request correlation; callback/expired-context exclusion; both-adapter fake success/error/abort/retry/concurrency and async-identity checks; affected privacy/failure/retention regression and isolated copied-pair CLI smoke. Installed source remains unchanged. At the T1-G checkpoint the legacy installer refused pair manifests; T1-P below now provides disposable paired recovery.
- **Measured costs:** Google success enabled overhead median/p95 `9.0205/12.1213 ms`; retry `8.0686/9.8157 ms`; concurrent pair `15.4768/20.9127 ms`; forced-rotation turn `11.9758/16.7335 ms`. Exactly 33/34/67 boundary records for success/retry/concurrent samples. Synchronous sink measurements explain the dominant blocking cost; disabled deltas and bytes are recorded in the report. This is synthetic boundary execution, not provider latency. The accepted provisional opt-in tradeoff remains explicit.
- **Residual:** T1-P below completes offline pair evidence without changing probe bytes. T2 requires independent selection and fresh real-target inactivity/hash proof. Historical evidence below remains attached to its recorded bytes.

- **Outcome:** staged main-plus-shared-SDK instrumentation records correctly correlated numeric HTTP status for both Google adapters with unchanged runtime semantics.
- **Context:** this Work/Plan/Context; `evidence/google-http-0.87.1.md` and its `.json` selectors; `evidence/readiness-0.87.1.md`; existing correlation evidence. Evidence paths are relative to this Work.
- **Touched surfaces:** `packages/pi-harness/tools/pi-stall-diagnostics/stage.mjs`, `logger.mjs`, focused `check-google.mjs`, `check-turns.mjs`, and existing check helpers/README only where pair staging or changed-path checks require it. Write new sanitized evidence; preserve historical evidence. Installer recovery belongs to T1-P.
- **Implementation selectors:** `stage.mjs:inspect`, `instrument`, `stage`; `logger.mjs:createDiagnostics`, `scope`, `track`, `untrack`, `emit`; main `streamAssistantResponse` request scope; SDK `ApiClient.apiCall/runFetch` exact fetch-settlement excerpt and, if needed for model-only scope, `Models.generateContentStreamInternal` with its two `requestStream` calls. Use Plan hashes and unique excerpts from `google-http-0.87.1.json`, retaining nine main boundaries. Source-verify Google eligibility; ambient ALS alone is insufficient.
- **Constraints:** all Plan invariants; numeric-only dedicated bridge, active Google request/operation attribution, no adapter edits/global/prototype interception. Extend staging/manifest to exactly two files with verified original backups and newly computed patched hashes; advance revision. Stage exclusively outside installation; `activationAllowed: false`. Do not apply the old single-file installer to the pair.
- **Verification:** actual-source fake transport for both adapters: success/non-OK/retry/reject/abort, concurrent Google/non-Google, unrelated SDK/auth/callback and expired-context exclusion, operation/session/turn/request linkage, unchanged response/error/signal/callback identities and baseline/enabled/disabled async traces. Check logger/subscriber failures and sentinel privacy. Parse both stages, run isolated network/process-blocked disposable pair CLI smoke, verify read-source hashes unchanged. Reuse unaffected evidence; check changed scope/logger paths. Extend synthetic benchmark for Google success/retry/concurrency and rotation-case latency; record median/p95, disabled cost and event/byte counts and explain changes per Plan.
- **Completion:** new pair manifest/hashes/source guards, runnable focused checks and durable sanitized Google/performance evidence; update T1-G status. Unproven behavior remains a limitation; insertion alone does not establish coverage.

## T1-P. Implement And Verify Paired Installer Recovery

- **Status:** complete for disposable `offline-6-google` copies. [Pair evidence](evidence/pair-offline-6.json), [readiness and limitations](evidence/pair-readiness-offline-6.md), [final reconciliation](evidence/pair-reconciliation-offline-6.json). Offline T1 is complete; `activationAllowed: false`.
- **Delivered:** Windows kernel ownership; canonical isolated-copy admission; exact per-file/selector/entry/runtime/adapter guards; verified backups and stages; exclusive flushed same-directory temporary files; flushed intent/progress and hash-driven recovery; both mixed states restore originals before a separate install attempt; idempotent install/rollback; guarded smoke-failure restoration and residual per-file refusal states. There is no atomic two-file replacement or live activation path.
- **Verified:** first/repeated operations and unchanged repeat mtimes; thrown faults and voluntary worker exits before/after both install/rollback writes; interrupted mixed recovery and stale/truncated journal restart; unknown bytes, missing/corrupt backups/stages, malformed/legacy/duplicate/escaping paths, selector/version/mapping drift, hard links, concurrent operation and active/inconclusive inactivity refusals; target/material/manifest drift and inactivity loss between writes; temporary drift/collision preservation; smoke-failure recovery; patched/restored isolated network/process-blocked `--version`. Final disposable and read-source main/SDK hashes are exact originals.
- **Reused:** stage/logger and Google/correlation/staging/benchmark source and evidence hashes remain unchanged. The runnable pair check asserts this before claiming T1 completion; new installer/check hashes supersede historical single-file installation evidence only. Synthetic performance costs and T1-G limitations remain as recorded.
- **Residual:** disposable inactivity is an injected controlled-fixture assertion, not a real-target inspection result. Tested process interruption is not power-loss durability. T2 requires separate selection, a live admission path under that scope, fresh real-target guards and reliable inactivity proof, verified backups, supported per-file replacement, consistent-pair smoke/idempotence and an exact rollback drill. No real installed mutation, provider call, existing-process termination or session change occurred.
- **Depends on:** completed T1-G pair schema and verified stages.
- **Outcome:** installer restores exact originals after partial replacement and restart, demonstrated only on disposable copies.
- **Context:** same Work/Plan/Context and T1-G manifest/evidence; historical readiness only for unchanged checks.
- **Touched surfaces/selectors:** `packages/pi-harness/tools/pi-stall-diagnostics/install.mjs:apply`, `inactive`; `stage.mjs:inspect` only as needed for known pair states; focused `check-pair.mjs` or minimal existing fixture extension, affected smoke helpers/README and new sanitized evidence.
- **Constraints:** Plan paired-state/recovery contract: per-file original/patched hashes, verified backups/stages, serialized ownership, same-directory staged replacement, immediate drift/inactivity checks. No atomic-pair promise. Keep live activation disabled and enforce refusal for the real target; any disposable test path must be explicitly isolated. Preserve unknown bytes/recovery material. No providers, sessions, process interruption or source-target mutation.
- **Verification:** disposable first/repeated install without rewriting; both mixed states; failure before/after each replacement; restart with stale progress; interrupted/repeated rollback; both original hashes restored. Refuse unknown bytes, corrupt backup/stage, mapping/version drift, active/inconclusive process inspection and concurrent operations. Inject post-install smoke failure and verify guarded recovery. Never smoke a mixed pair. Run isolated patched/restored CLI smoke on consistent copies; confirm source-target hashes unchanged. Report final per-file states even on refusal.
- **Completion:** runnable recovery check, sanitized pair evidence, kit instructions and T1-P status; reconcile T1 readiness against changed hashes without enabling activation.

## Historical T2. Guarded Activation And Rollback Drill (Earlier blocked disposition)

- **Historical status:** live installation and real rollback drill were blocked by fresh metadata-only runtime occupancy evidence. The real pair remained original/original; diagnostics were not enabled. [Disposition and commands](evidence/activation-t2.md), [final target snapshot](evidence/activation-t2-final.json), [focused activation checks](evidence/activation-checks-t2-final.json), [74 paired regression cases](evidence/pair-t2-final.json).
- **Delivered:** fixed-target live admission without injected inactivity/smoke/fault options; conservative metadata-only Node/Bun/Pi refusal including inaccessible runtime paths; fixed isolated credential-free, network/process-blocked smoke; guarded status/prepare/install/rollback CLI and exact later activation/start/stop instructions. Legacy disposable admission remains isolated. Final state reporting now rejects known-byte pair drift during smoke.
- **Verified:** occupied real-target refusal without mutation, classifier fail-closed cases, disposable fixed smoke/install/idempotence/rollback and smoke-state drift restoration; all 74 existing pair recovery cases pass for the changed installer. Probe/stage/logger hashes remain unchanged. Successful live writes, live idempotence and the real rollback drill have **not** run. No live backup/stage was prepared while occupancy blocked activation.
- **External prerequisite:** exit Pi and other JS runtimes normally, including this agent; maintain a launch-free interval from a plain PowerShell terminal. Snapshots cannot prevent subsequent launches and the mutex serializes only cooperating installers. Follow README; never use fixture inactivity or kill processes to pass admission.

- **Depends on:** completed T1-G and T1-P, a separately selected activation Handoff and fresh real-target guards/inactivity proof.
- **Outcome:** exact inactive pair installed idempotently, provider-free smoke succeeds, rollback restores both original hashes and final per-file state is reported. Optional reinstall requires fresh checks.
- **Context:** same Work/Plan/Context and new Google/pair evidence/manifests.
- **Constraints/evidence:** all Plan activation/recovery gates. Disposable process checks do not establish real-target inactivity. No interruption, sessions or providers. Unknown state or inconclusive inactivity blocks mutation; failed smoke restores only under verified guards.

## Historical Progress

The following records are preserved. Current Plan and tasks supersede historical one-file, repeat-permission and non-Google verification blockers.

## T1 Progress (2026-09-23)

- Recovered `stage.mjs`, `logger.mjs`, `check.mjs`; added tool hook probes, corrected stream terminal timing, disposable guarded installer/rollback and usage instructions under `packages/pi-harness/tools/pi-stall-diagnostics/`. No installed bytes modified.
- `node packages/pi-harness/tools/pi-stall-diagnostics/check.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent'` passed. Revalidated version `0.86.1`, original SHA-256 `2d5dc2025bf5cb9632f83491472677a281f8bfa375840bf785d38a9d7f103e1b`, patched SHA-256 `020e8b848a4545525876897f060af29dada27944d7b9d20cbdf763563852c155`; six selectors. Artifact: `C:/Users/WINDOWS/AppData/Local/Temp/pi-stall-check-91DSB2/evidence.json` with stage/backup/manifest and fixture logs nearby. Patched disposable CLI `--version` returned `0.86.1`; idempotence, unknown-byte refusal and rollback passed on a copy. Fake logger benchmark (1000 batches of five events): off median/p95 `0.0002/0.0004 ms`; on `0.9293/1.8180 ms`, 5000 events, 754707 bytes. This is logger-only timing, not actual turn latency.
- T1 remains incomplete: HTTP responses are recorded only when a provider calls `onResponse` (Google adapters do not); no cross-boundary session/turn/request/tool correlation; fake-turn benchmark does not establish actual Pi slowdown. Consequently `activationAllowed: false`; do not execute T2 or install on the real target. The installer process-inspection/atomic-replacement path has only disposable-copy verification.

## T1 Continuation Recovery: Target Drift

- The explicit `current` package root now resolves to `D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent`. Its package metadata reports `0.87.1`; the recovered patcher accepts only `0.86.1`. Calling `inspect(root)` failed with `Unsupported package/version/entry`; a focused assertion reproduced that fail-closed refusal. No staging or installed mutation followed.
- Recovered source is revision `offline-3`, with an added `runLoop` scope and AsyncLocalStorage correlation changes. These edits are preserved, but the previous six-boundary `020e8b...` verification does **not** verify them. Inspection of persisted temp evidence found no later successful generation covering these edits. Concurrency, session identity, async preservation and whole-turn overhead remain unverified.
- Durable sanitized evidence: [recovery-target-drift.json](evidence/recovery-target-drift.json). It records the target metadata hash, recovered source hashes, refusal check and a historical copy of the previous evidence, explicitly distinguished from current verification. Historical timing is logger-only; no representative baseline/patched whole-turn median/p95 or event/byte counts were established in this continuation.
- Google response coverage and single-file feasibility remain unresolved; this continuation did not establish a transport design adjustment. The immediate prerequisite is reconciliation of the target version: an explicitly selected supported `0.86.1` installation, or authorization to retarget and revalidate the kit against `0.87.1` with new mapping, selectors and hashes. No guard was relaxed and no target was silently substituted.
- `activationAllowed` remains false. T1 is incomplete; T2, live installation, session changes, process interruption and provider requests were not performed.

## T1 Bounded 0.87.1 Staging Recovery

- Retargeted revision `offline-4` to the currently installed `0.87.1`, selected through `dist/bundle/cli.js -> cli-runtime.js -> chunks/chunk-OJP47DM6.js`. Exact original SHA-256: `81c81a21ec81e84200205f561687408ff5e3738fbbbb3c2a6c186b348d376020`. Unsupported versions and mismatched bytes still fail closed. The previous target-selection blocker is resolved by the current authorized Handoff; older records above are historical.
- All seven existing boundary selectors/shapes match this bundle. The first staging check exposed a recovered syntax defect: the `emitToolCall` replacement omitted the semicolon before the following `if` (`SyntaxError: Unexpected token 'if'`). Restored that separator without altering the correlation design; the corrected staged file passed syntax checking.
- Added `check-stage.mjs` for this bounded compatibility check. It stages, uses a disposable package copy, runs `--version` with an isolated empty home and network/process-creation blocker, tests hash drift refusal/exclusive staging, and checks installed bytes remain unchanged. The broader `check.mjs` version assertion now uses the manifest version; the broader suite was not rerun in this unit.
- Current verification evidence belongs in [staging-0.87.1.json](evidence/staging-0.87.1.json). Source syntax checks passed for `stage.mjs`, `check-stage.mjs`, and `check.mjs`; `git diff --check` passed. The directories are untracked, so changed-file whitespace is checked separately.
- T1 overall remains incomplete: Google transport coverage, correlation/concurrency and async semantics, representative whole-turn benchmarks and the remaining full runtime/privacy/retention and installer checks must still be established for this revision. `activationAllowed: false`; T2 and live activation remain excluded.

## T1 Bounded Correlation Correctness

- Recovered `offline-4` and advanced only the correlation patch to `offline-5`; the target version/hash guard is unchanged. Existing session identity used copied message-array objects and changed between runs. Request IDs mutated shared ALS stores, and wrapper promises added microtask delays. Fixed these at actual run/request scopes using opaque salted session IDs, isolated stores, response-context restoration and direct returns from non-async scope wrappers. Initial user-message handlers/appends now receive session/turn attribution before the request.
- Provider response callbacks retain their request even when invoked outside its async context; callback arguments/receiver/results are preserved. Hook and execute events share tool IDs scoped by session/turn/request. Tool failure now records exit in `finally`. Active scopes clean up on success/error; external abort adopts only an unambiguous active session/turn/request and omits ambiguous or unavailable IDs.
- Added `check-correlation.mjs`. It stages the actual guarded bundle, parses the entire patched file, and executes extracted actual boundaries with fake dependencies. Verification covers concurrent sessions, concurrent requests within one turn, parallel tools, nested/repeated/continued runs, overlapping runs of one session, deferred response callbacks, deferred old-turn work, pending handlers, append/hook/tool/provider failures, abort signal/error identity, external abort attribution, fixed-schema privacy, and baseline/patched enabled/disabled microtask trace equality on success/error paths.
- Durable sanitized evidence: [correlation-0.87.1.json](evidence/correlation-0.87.1.json), including source hashes, original/patched bundle hashes, nine selector fingerprints, representative correlation sequences, privacy assertions and the baseline async trace. Command: `node packages/pi-harness/tools/pi-stall-diagnostics/check-correlation.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/correlation-0.87.1.json`. Passed; installed SHA-256 unchanged. No provider calls or installed activation.
- Existing staging and broad-check extraction helpers were adjusted for nine boundaries/non-async scope wrappers. Those broader suites were not rerun. The earlier `offline-4` CLI smoke is historical and does not verify the changed `offline-5` bytes. This regression exercises actual extracted functions, not a complete running CLI or all surrounding dependency behavior.
- T1 remains incomplete: Google HTTP transport coverage, representative whole-turn performance, full runtime/privacy/retention and installer gates, and fresh disposable CLI smoke for changed bytes. `activationAllowed: false`; T2 not started. No authoritative Plan/PRD/Spec/ADR changed.

## T1 Bounded Google HTTP Coverage Determination

- Source investigation is complete for the guarded `0.87.1` / `offline-5` target. Both lazy-loaded Google adapters import `GoogleGenAI` from `chunk-FUXEF6JQ.js`; its `Models.generateContentStreamInternal -> ApiClient.requestStream -> streamApiCall -> apiCall/runFetch` path owns the raw fetch response. Both adapters reject custom fetch and contain no `onResponse` reference. The SDK path exposes no response callback to the existing main-file wrapper.
- No safe exposed provider-scoped hook was established within the single-file boundary; no probe was implemented and no guard was weakened. [Technical determination](evidence/google-http-0.87.1.md) and [exact source evidence](evidence/google-http-0.87.1.json) persist file hashes, symbols, locations, 16 unique source excerpts, rejected alternatives and verification. This is a bounded determination about the inspected seams, not a claim that every possible one-file technique is impossible.
- Minimal proposed adjustment: authorize one additional installed file, the shared SDK `chunk-FUXEF6JQ.js`, and notify the existing main logger immediately after its existing awaited fetch settles, before retry/status/body handling. Use a fail-isolated numeric-status bridge with existing Google request correlation; preserve callbacks, responses/errors, signals and awaits. Both-file hash/backup/staging/rollback ownership and partial-replacement recovery require explicit reconciliation before implementation. The accepted Plan was not changed.
- Verified exact installed main version/hash/entry mapping, unique excerpts, absent adapter `onResponse`, unchanged stage/logger hashes against correlation evidence, and unchanged installed main hash. No new transport tests were run because no probe was added. Existing correlation evidence and implementation remain unchanged.
- The source question is resolved; Google HTTP coverage remains unimplemented pending the proposed boundary adjustment. Overall T1 remains incomplete, including the other runtime/performance/retention/CLI-smoke/installer gates. `activationAllowed: false`; T2 not started. No live installation, provider requests, process interruption or session changes occurred.

## T1 Non-Google Offline Readiness Reconciliation

- Completed broad runtime/privacy/retention/failure-isolation checks, including forced rotation failure and two-process isolation. Disposable install, idempotence without rewriting, backup/installed-byte drift refusal, exact rollback and isolated patched/restored CLI smokes passed. Fresh staged `offline-5` CLI smoke passed. Evidence: [runtime](evidence/runtime-0.87.1.json), [staging](evidence/staging-0.87.1.json), [readiness report](evidence/readiness-0.87.1.md).
- Added identical baseline/patched synthetic whole-turn verification with fake streams, handlers, appends and tools. For 200 measured turns after 20 warmups: baseline median/p95 `0.0742/0.1319 ms`, patched disabled `0.1226/0.2415 ms`, enabled `7.3517/9.8017 ms`; enabled 6600 events / 1396092 bytes. Added enabled overhead is `7.2775/9.6698 ms`. [Benchmark evidence](evidence/turns-0.87.1.json) records host, command and workload. This is not real-provider or full CLI latency; performance acceptance remains unresolved.
- Harness changes harden isolated smoke environments, durable output, rotation failure and installer guards; runtime `stage.mjs`, `logger.mjs`, `install.mjs` and patched SHA-256 remain unchanged. [Reconciliation](evidence/reconciliation-0.87.1.json) matches current runtime/benchmark/correlation source hashes and confirms all seven source syntax checks and unchanged installed main bytes. Existing correlation evidence remains applicable without a rerun. Whitespace checks passed.
- These results supersede historical outstanding non-Google verification statements above. T1 overall remains incomplete: Google HTTP coverage still requires the documented boundary adjustment and implementation, and measured performance has not been cleared for activation. `activationAllowed: false`; T2 not started. No live installation, provider requests, session changes or process interruption.

## T2 Status

Selected and attempted only through read-only real-target assessment and guarded admission refusal. Live activation remains blocked by runtime occupancy, including a Bun process with unavailable executable path. Repository tooling is implemented and disposable verification passed; real installed bytes remain exact originals. See [T2 report](evidence/activation-t2.md) for supported commands and remaining user action.

## Exact Planned Selector

One subsequent planned Handoff selects `primarySkill: implement-plan`, explicitly names only `T1-G. Implement And Verify Google Offline Coverage` or only `T1-P. Implement And Verify Paired Installer Recovery` as its execution boundary, and supplies these three references exactly once each (plus the selected unit's evidence):

```yaml
context:
  - ref: E:/Projects/pi-packages/packages/pi-harness/docs/works/pi-stall-diagnostics/work.md
    purpose: Selected diagnostic Work
  - ref: E:/Projects/pi-packages/packages/pi-harness/docs/works/pi-stall-diagnostics/plan.md
    purpose: Selected implementation Plan
  - ref: E:/Projects/pi-packages/packages/pi-harness/docs/works/pi-stall-diagnostics/tasks.md
    purpose: Selected executable Tasks
```

No status field or directory order selects a tuple or task. Select T1-G first; T1-P depends on its evidence. The Handoff must retain offline-only, diagnostic-only, no-provider and no-active-install-mutation constraints. This tuple does not authorize automatic execution of T2.

## Current Reconciliation

The planning Handoff resolved the two-file implementation boundary. T1-G and T1-P are now complete for the hashes and limitations in [Google evidence](evidence/google-readiness-offline-6.md) and [pair evidence](evidence/pair-readiness-offline-6.md). Initial Work/Plan status text and older one-file/performance statements remain historical; this current task reconciliation records offline T1 completion. Changed-code measurements retain the visible provisional synchronous-I/O tradeoff; no real-provider latency or activation clearance is claimed. The probe/staging sources and T1-G evidence remain unchanged, while new paired recovery checks cover the changed installer. T2 was subsequently independently selected; its current blocked disposition and verified tooling are recorded above. Successful real activation remains unperformed and requires fresh real-target proof and the exact activation/rollback conditions above. No authoritative PRD, Spec, ADR or Plan changed; offline manifests retain `activationAllowed: false`. The new live wrapper can permit a verified patched pair only after its runtime gates pass; no real pair has passed activation here.

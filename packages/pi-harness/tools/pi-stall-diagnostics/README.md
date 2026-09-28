# Pi stall diagnostic kit — await probes installed

The five-target `offline-7-awaits` set is installed under Bun 1.4.0. [Activation evidence](../../docs/works/pi-stall-diagnostics/evidence/await-activation-final.md) records the populated recovery directory, guarded baseline rollback, final hashes and new-process limitation. The `bun --inspect` launcher is unchanged. Earlier two-target and offline preparation instructions below are historical.

## Earlier two-target activation

The real Pi 0.87.1 pair is installed and verified under Bun 1.4.0. [Final evidence](../../docs/works/pi-stall-diagnostics/evidence/direct-activation-final.json) records exact hashes, retained backups, idempotence, isolated CLI/adapter smoke and two actual append records. This section supersedes the historical occupancy and activation instructions below.

Logging is persistently configured in the Windows **user environment** at C:/Users/WINDOWS/AppData/Local/pi-stall-logs. Existing Pi sessions and parent environments are unchanged. For a new normal Pi launch from an already-open PowerShell terminal:

```powershell
$env:PI_STALL_LOG_DIR = 'C:/Users/WINDOWS/AppData/Local/pi-stall-logs'
pi
```

The verified offline log is 276432-ef48e461-0e18-451c-aed8-851cbf10be37.0.jsonl; these are synthetic append boundary records, not a real user session. Normal runs use their own PID/UUID files with three files of 5 MiB maximum each. No existing process was injected, terminated or reconfigured. Launches from refreshed Windows user environments inherit the persistent setting; existing shells may require the explicit assignment above.

Retain C:/Users/WINDOWS/AppData/Local/pi-stall-recovery-0.87.1. Roll back instrumentation and restore the prior user setting with:

```powershell
$kit = 'E:/Projects/pi-packages/packages/pi-harness/tools/pi-stall-diagnostics'
$stage = 'C:/Users/WINDOWS/AppData/Local/pi-stall-recovery-0.87.1'
bun "$kit/activate.mjs" rollback $stage
if ($LASTEXITCODE -ne 0) { throw 'Rollback refused; preserve recovery material' }
$prior = Get-Content "$stage/logging-environment.json" -Raw | ConvertFrom-Json
[Environment]::SetEnvironmentVariable('PI_STALL_LOG_DIR', $prior.previous, 'User')
Remove-Item Env:PI_STALL_LOG_DIR -ErrorAction SilentlyContinue
```

Rollback requires the exact original hashes listed in the manifest; unknown bytes refuse mutation. Existing loaded modules keep their current instrumentation until normal exit. Windows may refuse replacement while a reader holds a file; errors preserve evidence and trigger guarded recovery. The pair is not atomically replaced. Process presence alone does not block admission: actual Bun compatibility, source/version/hash guards and backups do. The successful disposable rollback and live idempotence checks avoid an unnecessary live rollback/reinstall cycle.

## T4 five-target installation and recovery preparation

The expanded installer has separate `originalHash`, `baseHash` and `patchedHash` states for all five targets. `rollback-awaits` restores the pre-upgrade offline-6 diagnostic baseline; `pristine-awaits` explicitly restores the pristine originals. Equal hashes belong to both sets: Google is unchanged on upgrade, and the other three baseline files are pristine. Repeated operations skip matching bytes.

Run the focused disposable acceptance from the repository root:

```sh
bun packages/pi-harness/tools/pi-stall-diagnostics/check-await-install.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/await-install-offline.json
```

Current disposition and limitations are recorded in [T4 acceptance](../../docs/works/pi-stall-diagnostics/evidence/await-install-readiness.md) and [hash-bound evidence](../../docs/works/pi-stall-diagnostics/evidence/await-install-offline.json). The runner exercises replacement/recovery only in disposable trees. It reuses matching T3 diagnostics evidence, tests actual OpenAI fake transport and lazy forwarding for all 16 four-module combinations in enabled/disabled modes, and smokes consistent baseline/new/pristine sets. The pair-only installer continues rejecting expanded manifests.

The following commands are for a separately selected activation, not part of offline acceptance. Use a **new** recovery directory; preserve `pi-stall-recovery-0.87.1` unchanged. These commands do not change logging environment settings or existing sessions.

```powershell
$kit = 'E:/Projects/pi-packages/packages/pi-harness/tools/pi-stall-diagnostics'
$awaitStage = Join-Path $env:LOCALAPPDATA 'pi-stall-recovery-0.87.1-awaits'
bun "$kit/activate.mjs" status-awaits
New-Item -ItemType Directory -Path $awaitStage -ErrorAction Stop | Out-Null
bun "$kit/activate.mjs" prepare-awaits $awaitStage
if ($LASTEXITCODE -ne 0) { throw 'Preparation refused; preserve material' }
bun "$kit/activate.mjs" install-awaits $awaitStage
if ($LASTEXITCODE -ne 0) { throw 'Installation refused; inspect five residual hashes' }
```

For recovery, retain the exact new directory and choose the required destination:

```powershell
# Restore the installed offline-6 diagnostic baseline:
bun "$kit/activate.mjs" rollback-awaits $awaitStage
# Separate explicit operation: remove both old and new diagnostics:
bun "$kit/activate.mjs" pristine-awaits $awaitStage
```

Do not run both recovery commands as a routine drill. The five replacements are serialized under Windows kernel ownership, not atomic. A known mixed set first restores the full baseline and reports `recovered-baseline-retry-install`; installation requires a separate invocation. Unknown bytes or invalid materials stop mutation and report all five residual states. Preserve all originals, baselines, stages and journals on refusal. Windows sharing refusal can leave recovery pending until the reader closes normally.

Expanded live operations require hash-matching completed offline acceptance, the verified Bun 1.4.0 runtime, fresh canonical mapping/source/material guards and consistent-set isolated smoke. No blanket process-inactivity gate is added. Cached processes keep their loaded modules and may have partial diagnostic coverage; this does not instrument the captured incident retroactively. All prepared manifests retain `activationAllowed: false`; live commands are separate entry points.

## T3 verified offline — new revision not installed

`offline-7-awaits` implements bounded outstanding-await snapshots in four staged source files and retains the existing Google probe as a fifth staged target. The existing installed pair, incident process/session and recovery material remain unchanged. [Acceptance report](../../docs/works/pi-stall-diagnostics/evidence/awaits-readiness.md) and [reproducible evidence](../../docs/works/pi-stall-diagnostics/evidence/awaits-offline.json) record guards, manifests, verification and measured costs.

```sh
bun packages/pi-harness/tools/pi-stall-diagnostics/check-awaits.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/awaits-offline.json
```

The command now exits **0** after focused acceptance; the prior incomplete exit-2 checkpoint is superseded. It verifies originals from existing recovery backups, reproduces the old patches, and writes only disposable source/stage/fixture trees and the requested evidence. `awaits.mjs` reuses the unchanged offline-6 stage/logger base; three focused check helpers cover runtime limits, actual boundaries and costs. Fourteen adapter/queue fixtures compare original/disabled/enabled settlement and traces, with additional enabled fallback-reader coverage. Staged syntax/mappings, isolated provider-free Bun smoke and legacy installer refusal pass.

Snapshots expose callback/individual handler, producer/body/cleanup, forwarding/assistant next/result and cancellation/idle waits, with fixed terminal flags and opaque correlation. Limits are 128 requests, 32 slots/request, 16 KiB/summary, saturating counters and one unref'ed one-second sampler; transitions do not write per token. Overflow remains explicit. Missing samples can mean event-loop blockage, logger failure or process exit. Outstanding layers do not identify a unique causal root.

Enabled synthetic overhead was median/p95 **2.8492/4.3930 ms** per 2,048 chunks and handlers, with 40 lifecycle records across 81,920 chunks. Snapshot-only median/p95 was **0.1722/0.2892 ms**, or **0.3597/2.2839 ms** with forced rotation. These measurements are not provider latency; see the report for disabled costs and limitations.

`activationAllowed` remains **false**. T4 above supplies the expanded installer/recovery and mixed-version acceptance; fresh guards/backups and separately selected activation still apply. Pair-only admission rejects the five-target manifest; its historical evidence alone does not establish expanded recovery.

## Historical kit instructions and evidence

# Pi stall diagnostic kit (guarded activation available; currently not activated)

Revision `offline-6-google` stages exactly the Pi `0.87.1` main chunk `chunk-OJP47DM6.js` and shared Google SDK `chunk-FUXEF6JQ.js`. Both adapters remain unchanged. Exact original hashes, entry/runtime hashes, import mapping, 16 source excerpts and nine main boundary shapes are checked before exclusive staging outside the installation. Each manifest records two canonical targets, original backups, staged paths, selector fingerprints and computed hashes. `activationAllowed` remains `false`.

Google response instrumentation sends only integer status (100–599) over `pi.stall.google.response.v1` after the existing fetch await. A private SDK token follows only the two `Models.generateContentStreamInternal` request paths; unrelated SDK calls and auth do not inherit it. The main subscriber requires an active eligible Google request and reuses its operation/session/turn/request IDs, without tool IDs. User payload callbacks run outside Google eligibility, with receiver/arguments/return/error preserved. SDK publication and the entire owned subscriber body catch failures. Disabled loggers do not subscribe; active-request cleanup removes subscriptions. Arbitrary third-party subscribers to the same diagnostics channel are outside this ownership boundary.

Logging remains fixed-schema JSONL with no payloads, headers, URLs, exception text or external IDs, no per-token writes, and three files of 5 MiB per process/run. Synchronous disk I/O has measurable cost; see the [current Google evidence and performance assessment](../../docs/works/pi-stall-diagnostics/evidence/google-readiness-offline-6.md).

From the repository root, use the installation only as a read source:

```sh
node packages/pi-harness/tools/pi-stall-diagnostics/check-pair.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/pair-offline-6.json
node packages/pi-harness/tools/pi-stall-diagnostics/check-google.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/google-offline-6.json
node packages/pi-harness/tools/pi-stall-diagnostics/check-correlation.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/correlation-offline-6.json
node packages/pi-harness/tools/pi-stall-diagnostics/check-stage.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/staging-offline-6.json
node packages/pi-harness/tools/pi-stall-diagnostics/check-turns.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/turns-offline-6.json
```

`check-google.mjs` executes extracted actual request, lazy-API, adapter call-site and SDK methods with fake transport, auth, retry scheduling and decoding. It covers both adapters, settled success/non-OK/retries, rejection/abort, concurrency, callback and expired-scope exclusion, response/error/signal identities, enabled/disabled async ordering, invalid notifications, subscriber/logger failures, sentinel privacy and forced rotation failure. This is bounded offline coverage, not full adapter/SDK integration or real-provider validation.

`check-stage.mjs` parses both stages and replaces both files only in a disposable package copy. Its provider-free `--version` child uses an empty isolated home, no inherited credentials and a preload blocking network and child-process creation; the home remains empty. Main/SDK drift and exclusive-stage checks fail closed. `check-turns.mjs` compares identical baseline/disabled/enabled synthetic whole turns, plus Google success, retry, two concurrent requests and forced rotation. Counts include rotated-out records; sink observers add constant test-only cost. Timing is not real-provider or full CLI latency.

For staging only: `node packages/pi-harness/tools/pi-stall-diagnostics/stage.mjs stage TARGET_ROOT EXISTING_EMPTY_STAGE_DIR`. Temporary stages are reproducible scratch data; repository JSON/report files are the durable evidence.

**T1-G, T1-P and overall offline T1 are complete for the recorded hashes; the real pair remains original/original.** The historical pair check passed 74 recorded cases. `install.mjs:apply` retains its canonical disposable-only admission. T2 adds a separate fixed-target `applyLive(directory, action)` entry with no injected inactivity/smoke/fault options; use the commands below. `apply(root, directory, action, options)` returns a Promise for admitted copies and synchronously refuses live paths; the default call remains disabled. A Windows kernel mutex serializes cooperating operations across processes and releases after an interrupted worker exits. Package/import guards, exact per-file hashes, selector fingerprints, verified backups/stages, canonical paths and single-link files are rechecked before each same-directory replacement. The two renames are **not atomic as a pair**.

Recovery classifies actual bytes, never journal claims. Either mixed state restores both originals and requires a separate install attempt. Rollback skips originals, restores patched files and is idempotent. Unknown bytes, invalid metadata, corrupt/missing recovery material or lost inactivity stop mutation and expose residual per-file states. Backups, stages and the flushed intent/progress journal remain available; abandoned temporary files from interrupted workers are retained. Never load the CLI while mixed. Smoke failure attempts restoration only while all guards hold.

`check-pair.mjs` persists each accepted disposable failure/restart/rollback case incrementally and runs isolated patched/restored CLI smokes. It injects fixture inactivity results and voluntary worker exits, not real-target process proof. The [pair report](../../docs/works/pi-stall-diagnostics/evidence/pair-readiness-offline-6.md) and [Tasks](../../docs/works/pi-stall-diagnostics/tasks.md) own current completion status. Staging's unchanged `gaps` text records the T1-G checkpoint; it does not override newer evidence. Legacy `check.mjs` and single-file installer results remain historical and are not current pair-verification commands.

T2 was independently selected but real activation is blocked by runtime occupancy; see [T2 evidence and disposition](../../docs/works/pi-stall-diagnostics/evidence/activation-t2.md). No installed bytes, user sessions or existing processes were changed. The live wrapper and disposable checks are available; successful real installation/rollback remains unperformed.

The [offline-5 readiness report](../../docs/works/pi-stall-diagnostics/evidence/readiness-0.87.1.md) and its runtime/staging/correlation/turn evidence remain historical for their recorded hashes. Their installer results do not establish pair recovery. The accepted [Plan](../../docs/works/pi-stall-diagnostics/plan.md) supersedes those reports' old boundary/performance permission language; current status is in [Tasks](../../docs/works/pi-stall-diagnostics/tasks.md).

## Supported T2 activation commands

Use an ordinary PowerShell terminal after exiting Pi normally, including the agent running this task. Keep Pi launchers/watchers stopped for the entire maintenance interval. The metadata-only guard refuses **all other Node/Bun/Pi runtimes**, including unrelated ones or those with unavailable executable paths. Close those applications normally as needed; never terminate them through this kit. `status` prints only PID/name/executable metadata, hashes and source checks. A clear snapshot cannot prevent another application launching Pi later; the user must maintain this launch-free interval. The kernel mutex serializes installers, not Pi launches.

The target is pinned to the canonical `0.87.1` installation and `current` must still resolve there. Drift refuses operation. In a PowerShell terminal at the repository root:

```powershell
$kit = 'E:/Projects/pi-packages/packages/pi-harness/tools/pi-stall-diagnostics'
$stage = Join-Path $env:LOCALAPPDATA 'pi-stall-recovery-0.87.1'
node "$kit/activate.mjs" status
if ($LASTEXITCODE -ne 0) { throw 'Status failed' }
# Stop here while blockers is nonempty. Status is read-only, not authorization.
New-Item -ItemType Directory -Path $stage -ErrorAction Stop | Out-Null
node "$kit/activate.mjs" prepare $stage
if ($LASTEXITCODE -ne 0) { throw 'Preparation blocked' }
node "$kit/activate.mjs" install $stage
if ($LASTEXITCODE -ne 0) { throw 'Installation blocked; preserve stage and inspect reported states' }
node "$kit/activate.mjs" install $stage
if ($LASTEXITCODE -ne 0) { throw 'Idempotence check blocked' }
node "$kit/activate.mjs" rollback $stage
if ($LASTEXITCODE -ne 0) { throw 'Rollback blocked; preserve stage and inspect reported states' }
node "$kit/activate.mjs" rollback $stage
if ($LASTEXITCODE -ne 0) { throw 'Rollback idempotence check blocked' }
node "$kit/activate.mjs" status
```

Do not recreate/overwrite a stage for recovery. Retain that exact directory, both backups, staged files, manifest and journal. `prepare` checks inactivity and exact original source/selectors, then exclusively stages outside the installation; it does not modify installed bytes. Every live operation checks fresh inactivity, canonical paths, version/import hashes, both exact file hashes and recovery material before each replacement. Install and repeated install run the fixed isolated provider-free smoke; rollback and repeated rollback also smoke the restored pair. CLI output and credentials are not persisted. Smoke failure attempts guarded restoration; unavailable inactivity or unknown bytes stops recovery and reports residual hashes. Any `recovered-originals-retry-install` result means only recovery occurred: perform a separate install attempt before the install/idempotence/rollback drill. Never launch Pi on mixed or unknown bytes.

The sequence ends with original/original and logging disabled. After the drill succeeds, an optional final `node "$kit/activate.mjs" install $stage` again checks fresh inactivity/hashes and runs smoke. Confirm both states are `patched` and the command succeeded before starting a new normal Pi process. No command sets a persistent environment variable or alters existing sessions.

For a **new** diagnostic process only, in that terminal:

```powershell
$env:PI_STALL_LOG_DIR = Join-Path $env:LOCALAPPDATA 'pi-stall-logs'
pi
```

This starts the user's normal Pi workflow; it is not a provider-free test and was not executed by this task. Records appear on instrumented boundaries under `%LOCALAPPDATA%/pi-stall-logs/<PID>-<run-UUID>.0.jsonl` with rotations `.1.jsonl` and `.2.jsonl`, at most 5 MiB each. No log file is guaranteed until a boundary executes; setting the variable alone is not proof of logging. To stop logging, exit that Pi process normally and run `Remove-Item Env:PI_STALL_LOG_DIR -ErrorAction SilentlyContinue` before a new launch. To remove instrumentation, exit all runtime processes normally, keep the launch-free interval, and run `node "$kit/activate.mjs" rollback $stage`; both returned hashes must be originals. Keep logs and recovery material for diagnosis. The kit cannot change the environment/logger of an already running process.

Focused reproducible checks (disposable writes only):

```powershell
node "$kit/check-activation.mjs" NEW_ACTIVATION_EVIDENCE.json
node "$kit/check-pair.mjs" 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent' NEW_PAIR_EVIDENCE.json
```

`check-activation` deliberately requires an occupied host to verify real admission refusal, then verifies fixed smoke and pair operations on a copy. It does not provide a live inactivity override. Historical offline evidence remains unchanged; current T2 evidence names the new installer hashes.

# Paired installer recovery: offline-6-google

**T1-P and overall offline T1 are complete for `offline-6-google`. Activation remains disabled; T2 was not performed.** The [incrementally persisted check](pair-offline-6.json) passed 74 recorded cases on Windows with Node `v24.15.0`. [Final reconciliation](pair-reconciliation-offline-6.json) binds current sources and documents to that result.

The installer admits only a canonical `pi-stall-pair-*` disposable workspace under the host temporary directory, with separate `fixture` and `stage` directories created by `disposable(source)`. The source installation is read and copied, never passed to the mutation path. A disposable option alone cannot admit the real installation. Canonical regular-file and single-link checks reject redirected targets, backups and stages.

Operations take a Windows kernel named mutex through a PowerShell helper. The helper holds ownership until the caller closes its input or exits; no process is stopped and no stale PID lock is stolen. Unsupported ownership hosts fail closed. Disposable checks inject a controlled inactivity assertion and exercise active/inconclusive refusals; this is not evidence of real-target inactivity.

Before replacement, both files must have known original/patched hashes, both backups and stages must match their expected hashes, and package/version/entry/runtime/adapter mappings must agree. Same-directory temporary files are exclusively created, flushed and verified. Intent is flushed before each rename; progress follows it. Each rename replaces one file: **the pair is not atomic**. Recovery reads actual target hashes and ignores journal progress when deciding what to restore. Mixed pairs restore to both originals and require a separate install attempt. Unknown targets or damaged recovery material stop mutation. Install smoke runs only after a consistent patched pair; smoke failure attempts guarded restoration.

The existing `stage.mjs`, `logger.mjs`, Google/correlation/staging/benchmark harnesses and instrumented pair hashes remain unchanged. T1-G evidence and its synthetic performance assessment can be reused for those exact bytes; the old installer evidence cannot prove this implementation. Staging's historical `gaps` string still describes the T1-G checkpoint, not current completion; current task status and the new recovery evidence own readiness.

The runnable check is:

```sh
node packages/pi-harness/tools/pi-stall-diagnostics/check-pair.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/pair-offline-6.json
```

The check persists sanitized progress after each accepted case. The final run passed:

- First/repeated install and rollback, with unchanged modification times on repeated operations; patched and restored isolated CLI smokes returned `0.87.1` and left the isolated home empty.
- Both mixed states restored exact originals and required a separate install attempt. Thrown faults before/after each of the two install and rollback replacements left guarded recoverable states. Eight disposable worker exits covered those same boundaries; two more interrupted mixed recovery. Restart succeeded despite intentionally misleading/truncated journal progress.
- Unknown bytes, missing/corrupt backups or stages, malformed/old/unknown revisions, duplicate/escaping targets and aliases, selector/hash/version/entry/runtime/adapter drift, hard links, concurrent ownership, active/inconclusive inspection and absent positive inactivity proof all refused mutation.
- Target, backup, stage and manifest drift between writes blocked unsafe replacement/recovery and exposed per-file residual hashes. Losing inactivity after the first write preserved the mixed pair. Temporary-file drift and an exclusive-name collision preserved unrelated bytes. Cases that deliberately damaged fixture data repaired only their disposable setup before demonstrating guarded recovery; the installer never overwrote unknown target bytes.
- Injected post-install smoke failure restored both originals. Final repeated rollback and a fresh restored CLI smoke passed. Read-source main, SDK, adapter and entry/runtime guards remained unchanged. Source/evidence hash comparisons established reuse of the existing T1-G checks without rerunning unrelated instrumentation suites.

Test process interruption means a disposable worker voluntarily exits; existing processes are never terminated. The CLI smoke uses an empty isolated home, an allowlisted environment without inherited credentials, and a preload blocking network and child-process creation. Full provider runtime, real-target inactivity and power-loss durability are outside this evidence.

| File | Final disposable and read-source SHA-256 | State |
| --- | --- | --- |
| `chunk-OJP47DM6.js` | `81c81a21ec81e84200205f561687408ff5e3738fbbbb3c2a6c186b348d376020` | Original |
| `chunk-FUXEF6JQ.js` | `b7d0697d0f4c7d3b54c6aee545d3b27c5981c27d0470e1c79876898f28f2c472` | Original |

New verified installer SHA-256: `bca3490831a03c77b949fad57556d097d1bfc331fe6d5bd59b4c27f8a1ac6326`. New recovery-check SHA-256: `66a822d368daff07616002ecf66997758560759d05025e7d46dc1a179fc11720`. The [pair JSON](pair-offline-6.json) records all unchanged source/evidence hashes, both original/patched hashes, selector fingerprints, case outcomes and residual states. Neither the Google probes nor their prior performance evidence changed. Enabled synchronous logging remains the bounded, measurable provisional tradeoff described in [T1-G's report](google-readiness-offline-6.md), not a real-provider latency claim.

T2 remains a separately selected task. It requires complete T1, fresh real-target version/import/hash/selector checks, reliable inactivity proof, verified pair backups and supported replacement semantics, followed by consistent-pair provider-free smoke, idempotence and exact rollback. The current installer deliberately has no live activation path; no activation flag is enabled by recovery tests.

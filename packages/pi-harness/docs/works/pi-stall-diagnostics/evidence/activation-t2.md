# T2 guarded activation disposition

**Activation is blocked; the installed pair remains original/original and this kit's diagnostics are not enabled.** T2 was independently selected. The former disposable-only implementation now has a separate guarded live path, with disposable verification; successful real installation, real idempotence and the real rollback drill were not performed.

## Real target and blocker

[Initial observation](activation-t2.json) and [final observation](activation-t2-final.json) resolve `current` to `D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent`. Fresh package/version, exact entry/runtime/import hashes, Google adapter/source excerpts and nine main/seven SDK transformation boundaries match the verified offline kit. In-memory transformation produces the unchanged expected patched hashes; no installed write or real-target stage/backup was made.

| File | Installed SHA-256 | State |
| --- | --- | --- |
| `chunk-OJP47DM6.js` | `81c81a21ec81e84200205f561687408ff5e3738fbbbb3c2a6c186b348d376020` | original |
| `chunk-FUXEF6JQ.js` | `b7d0697d0f4c7d3b54c6aee545d3b27c5981c27d0470e1c79876898f28f2c472` | original |

The metadata snapshot contains multiple Node/Bun runtimes, including Bun PID `270124` whose executable path is unavailable. This does not prove which processes load the selected target; it **prevents reliable inactivity proof**. The new guard conservatively refuses every other Node/NodeJS/Bun/Pi runtime, including inaccessible paths. No command lines, credentials or process environments are collected. PIDs are observations, not instructions to terminate anything. Active agent sessions may themselves account for blockers. The first shell metadata query had a quoting error; a corrected metadata-only query succeeded and persisted observations come from the implemented collector.

## Implemented and verified path

`install.mjs:applyLive(directory, action)` pins both the canonical `0.87.1` target and the `current` mapping. It accepts no caller-provided inactivity, smoke, fault or disposable options. Legacy `apply` retains disposable isolation. Both paths reuse the existing kernel mutex, manifest/source guards, verified backups/stages, same-directory flushed replacement and hash-driven mixed-state recovery. The live path uses the fixed isolated smoke for installation, idempotence and rollback. Final consistent-state checks also prevent reporting stale success if known installed bytes change during smoke. Manifests remain offline-6-google and keep `activationAllowed: false`; the live result reports admission only for a consistent verified patched pair. No environment variable is enabled by installation.

[Focused verification](activation-checks-t2-final.json) passed four groups: metadata refusal/inconclusive cases; occupied real-target admission refusal (including ignored extra bypass options) with unchanged hashes; disposable install/idempotence/rollback using the new fixed provider-free smoke; and known-byte drift during smoke followed by exact guarded restoration. Patched/restored `--version` returned `0.87.1`; isolated homes stayed empty, credentials were not inherited, network/process creation was blocked.

[Full affected pair regression](pair-t2-final.json) passed all **74** existing disposable cases, including interruption/restart, mixed recovery, unknown/corrupt bytes, drift, concurrent ownership, inactivity loss and smoke failure. It verifies reuse of unchanged T1-G source/evidence hashes. The installer hash in both final check reports is `6152079e728866767f4b6f6de4529b175ba38008523d54315ab6a3fbf58ab151`. Earlier provisional T2 check outputs were removed after final code changes; only `*-final.json` check results establish current verification. Historical T1 evidence was preserved.

The final read-only snapshot at `2026-09-23T20:13:57.216Z` recorded 22 conservative runtime blockers and both original hashes. Final reconciliation matched both check reports' source hashes to current files, parsed all four changed/new JavaScript files, and passed focused whitespace plus `git diff --check`. The latter emitted only an existing unrelated ADR line-ending warning.

Reproduce from the repository root (use new output filenames):

```powershell
node packages/pi-harness/tools/pi-stall-diagnostics/activate.mjs status
node packages/pi-harness/tools/pi-stall-diagnostics/check-activation.mjs NEW_ACTIVATION_EVIDENCE.json
node packages/pi-harness/tools/pi-stall-diagnostics/check-pair.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent' NEW_PAIR_EVIDENCE.json
```

The focused check requires an occupied-host refusal scenario and never installs on an inactive real target. The pair check writes only disposable copies. Successful live admission/write/smoke/recovery branches are not demonstrated on the real installation while it may be occupied. Disposable test success is not inactivity proof, power-loss durability or a guarantee against simultaneous noncooperating Pi launches.

## Later activation and logging

The [README supported T2 commands](../../../../tools/pi-stall-diagnostics/README.md#supported-t2-activation-commands) give the executable PowerShell sequence: fresh status; exclusive prepare into a retained external directory; install; repeated install; rollback; repeated rollback; final status. Each live operation rechecks inactivity and exact hashes; the sequence ends at originals. An optional final install requires the same fresh guards again. This is an implemented live command path, not a disposable installer command relabeled for production.

The user must first exit Pi normally, including the current agent and other Node/Bun applications that trigger conservative admission. Run maintenance from a plain PowerShell terminal and keep launchers/watchers from starting Pi until it ends. The kernel mutex protects installer concurrency only. A process snapshot cannot enforce that maintenance interval. Do not terminate processes, bypass blockers or launch Pi with a mixed/unknown pair. Preserve recovery material and use guarded rollback after resolving occupancy; unknown bytes require assessment rather than overwrite.

Only after a successful final install, a new normal Pi process may opt in with `PI_STALL_LOG_DIR=%LOCALAPPDATA%/pi-stall-logs`. Logs use `<PID>-<run-UUID>.0.jsonl` and rotations `.1.jsonl`/`.2.jsonl` (three files, 5 MiB each). No real diagnostic logs were produced or claimed here; smoke locations in evidence are disposable. Setting an environment variable does not prove a record was written. Stop logging by exiting that diagnostic process normally and removing `PI_STALL_LOG_DIR` before a new launch. To remove instrumentation, exit runtime processes normally and run the supported `rollback` with the retained stage; require both original hashes. Existing process environments/sessions were not inspected or changed.

# Non-Google offline readiness: Pi 0.87.1

The requested non-Google verification and evidence reconciliation are complete for revision `offline-5`. Runtime, privacy, retention, failure-isolation, disposable installer/rollback, staged CLI loading and synthetic whole-turn checks passed. **T1 remains incomplete; `activationAllowed: false`; T2 has not started.** This report does not approve activation.

## Evidence and applicability

- [Runtime and disposable installer evidence](runtime-0.87.1.json): nine patched boundaries; stream success/error/rejection/abort; pending second handler and hook; append/hook/tool errors; abort ordering; sentinel privacy; three-file rotation at a reduced 1 KiB test cap; logger setup/write failures; forced rotation failure; distinct child-process log identities. The forced rotation failure preserves the existing record and disables further writes without throwing. The production default remains three files of 5 MiB each; the test accelerates rotation rather than filling that capacity.
- Disposable installation passed original/patched hash checks, idempotence without rewriting, backup-drift refusal, unknown-byte refusal for both install and rollback, preservation of refused bytes, exact backup restoration and restored CLI `--version`. Windows process inspection and atomic replacement were exercised on the disposable copy only. Final disposable bytes match the original hash.
- [Fresh staged CLI evidence](staging-0.87.1.json): `offline-5`, nine unique selectors, syntax, exclusive staging, unknown-byte refusal and patched `--version` returning `0.87.1`. The accepted staged, installed-copy and restored-copy smokes use empty isolated homes, an environment without inherited credentials, and a preload blocking fetch, socket connections and child-process creation; homes remain empty. The initial legacy broad invocation preceded smoke hardening and is not the accepted isolation evidence.
- [Existing correlation evidence](correlation-0.87.1.json): concurrent sessions/requests/tools, nested/continued runs, deferred callbacks, stable opaque IDs, failure/abort attribution and original/patched enabled/disabled microtask equality. This suite was not rerun: its implementation and test source hashes still match exactly.
- [Reconciliation](reconciliation-0.87.1.json): runtime, turn-benchmark and correlation source hashes match current files; all seven `.mjs` files pass `node --check`; the installed main chunk is unchanged. `git diff --check` passed; explicit whitespace checks cover the otherwise untracked kit/Work files.

Original main SHA-256: `81c81a21ec81e84200205f561687408ff5e3738fbbbb3c2a6c186b348d376020`.
Patched main SHA-256: `7db71a2ea905b0fdc495348d0c6cfc3c52e2acfd6d1a7caea78c890bbe65ddfd`.
No runtime implementation fix was required, and these patched bytes are unchanged from the correlation evidence. No failing assertion is recorded in the accepted verification runs. Check-harness changes hardened smoke isolation, durable evidence output, installer refusal/idempotence/rollback assertions and rotation-failure coverage.

## Synthetic whole turns

[Benchmark evidence and exact environment](turns-0.87.1.json) records 20 warmups and 200 measured turns per mode, interleaved in rotating order. Identical extracted actual loop/request/handler/append/hook/tool functions execute one fake stream with 32 deltas, two message dispatches with two handlers each, two appends and two tools with one hook each. Surrounding dependencies are fake; there are no artificial network waits.

| Mode | Median ms | p95 ms | Measured events | Measured bytes |
| --- | ---: | ---: | ---: | ---: |
| Original baseline | 0.0742 | 0.1319 | 0 | 0 |
| Patched, logging disabled | 0.1226 | 0.2415 | 0 | 0 |
| Patched, logging enabled | 7.3517 | 9.8017 | 6600 | 1396092 |

Enabled logging adds **7.2775 ms at the median and 9.6698 ms at p95** relative to the original baseline in this workload. Disabled instrumentation adds 0.0484 ms and 0.1096 ms respectively. These are differences between distribution statistics, not percentiles of paired differences. Enabled output is exactly 33 boundary records per turn, with no per-token records; including warmups it is 7260 events / 1532410 bytes. Host: Windows `10.0.19045`, x64, Node `v24.15.0`, Intel Core i5-13490F, 16 logical CPUs.

This measures synchronous metadata I/O and instrumentation around synthetic whole turns, not real Pi turn latency, real-provider latency or full CLI throughput. The substantial absolute cost must remain visible; no accepted performance budget or real-workload slowdown clearance was established. The older five-event logger-only benchmark in runtime evidence is not the whole-turn result.

## Reproduce

From the repository root, with the explicit installation used only as a read source:

```sh
node packages/pi-harness/tools/pi-stall-diagnostics/check.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/runtime-0.87.1.json
node packages/pi-harness/tools/pi-stall-diagnostics/check-stage.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/staging-0.87.1.json
node packages/pi-harness/tools/pi-stall-diagnostics/check-turns.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/turns-0.87.1.json
```

Evidence contains fixed metadata, hashes, commands, synthetic counts and test locations, not session/provider payloads. Temporary fixtures are reproducible scratch data; repository JSON and this report are the durable results.

## Residual blockers

Google HTTP-response coverage remains unimplemented: [the existing determination](google-http-0.87.1.md) requires reconciliation of the one-file boundary before adding the shared SDK probe and both-file installation/recovery guarantees. No Google code or authoritative Plan was changed. Performance acceptance remains unresolved given the measured synchronous-write cost. T2 still requires a complete T1, fresh real-target inactivity/hash proof and authorized guarded activation/rollback verification; disposable results do not establish those conditions. No installed files were modified, diagnostics activated, processes interrupted, real provider requests made or user sessions changed by the accepted checks.

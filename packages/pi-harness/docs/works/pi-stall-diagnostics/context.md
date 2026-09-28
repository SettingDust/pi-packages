# Context: Pi Stall Diagnostics

## Direct activation completed (2026-09-24)

The latest explicit user direction supersedes the historical blanket inactivity gate and live rollback drill below. T2 is complete: the real 0.87.1 pair is patched/patched, repeated installation was idempotent, and isolated Bun 1.4.0 smoke loaded the main plus both lazy Google adapters and emitted two actual append boundary records without creating a session or calling a provider. See [final evidence](evidence/direct-activation-final.json), [runtime compatibility](evidence/live-runtime-activation.json), and [changed admission checks](evidence/direct-activation-checks.json). Historical blocked statements below describe earlier attempts only.

Windows open-reader replacement returned EPERM without changing bytes; after closing the disposable reader, replacement succeeded. Bun cached modules stayed old even with an import query suffix. All four old/new main/SDK combinations loaded successfully; the SDK token/signature changes stay within one file and exports are identical. Old main has no subscriber; old SDK has no notification. This permits compatible partial diagnostic coverage in existing processes, not a claim that they are instrumented. Exact pair/hash/backup/source guards, serialized replacements and recovery remain enforced. No live rollback/reinstall cycle was performed.

Logging is configured in the Windows user environment as PI_STALL_LOG_DIR=C:/Users/WINDOWS/AppData/Local/pi-stall-logs. Two provider-free records were verified there. Existing parent environments and sessions are unchanged. A newly launched Pi needs this variable in its inherited environment; from an existing PowerShell terminal set it explicitly before launching Pi. Recovery materials are retained at C:/Users/WINDOWS/AppData/Local/pi-stall-recovery-0.87.1. Supported start/rollback commands are in the kit README.


- Source: approved scope and observations in current Handoff; processed planning context, not normative product authority.
- State: offline-5 non-Google kit verified on 0.87.1; Google and paired recovery follow-up planned. No installed-file modification or activation performed.

## Known Observations (Revalidate)

Previously observed CLI `0.86.1` at `D:/Applications/Scoop/apps/pi-coding-agent-bun/current/node_modules/@earendil-works/pi-coding-agent`; its `dist/bundle/cli-runtime.js` loaded `chunks/chunk-CMRUVXTE.js`. Readable `dist/core/extensions/runner.js:650-731` contained sequential awaited handlers including `message_end`; `dist/core/session-manager.js:770-790` contained append/persist. An ordinary extension cannot wrap handlers registered before it. Repository dependencies differ from the actual installation. These observations are discovery leads, never permanent version, path, byte or insertion selectors.

## Approved Invariants

- Record provider request start, HTTP response, stream terminal/error; `message_end` dispatch and each handler enter/exit/error; append enter/exit; tool hooks and execution enter/exit/error; abort. Correlate PID, process run/session/turn/request/tool IDs where available, sequence, monotonic and wall time. Never derive IDs from sensitive content.
- Fixed schema, metadata only. No prompts, generated text, summaries, parameters, bodies, headers, credentials or raw stacks. No per-token events; any progress sampling must be bounded and justified.
- Process-isolated rotating JSONL, proposed ceiling three files of 5 MiB per process/run; logger failure must never alter Pi control flow. Preserve crash evidence and measure logging overhead.
- Require target version and original/patched SHA-256 guards, exact verified backup, idempotent install/rollback and refusal on unknown bytes. Stage separately and activate only when no process uses the selected installation; never terminate a process. Existing sessions remain untouched.

## Implementation Checks

Resolve the current CLI entry/import graph and loaded bundle mapping; prove every required anchor is unique and preserves sync/async ordering, return values, error identity and abort semantics. The original one-file assumption required stopping and reconciling before widening; it was not a user-imposed prohibition. The current planning Handoff reconciles exactly the main `chunk-OJP47DM6.js` and shared SDK `chunk-FUXEF6JQ.js` for offline follow-up based on [source evidence](evidence/google-http-0.87.1.md). No adapter edits or broader transport interception are authorized. See [Plan](plan.md) for per-file guards, numeric-only notification, safe correlation and partial-pair recovery. Activation remains a later independent task. Validate that process-use detection is reliable on this host and that the provider-free smoke does not create/resume a session. Failure to establish inactivity must block installation, not bypass the guard.

## Reconciled Performance Evidence

[Readiness](evidence/readiness-0.87.1.md) records synthetic enabled overhead of 7.2775 ms median and 9.6698 ms p95 for 33 records per turn. The Plan treats this as a visible but provisionally reasonable cost for temporary reversible diagnostics, not real-provider latency or an automatic approval requirement. Changed Google/bridge bytes still require focused synthetic concurrency/retry/rotation checks and a reasoned assessment. Existing successful evidence is retained; historical blocker statements apply to their recorded revisions.

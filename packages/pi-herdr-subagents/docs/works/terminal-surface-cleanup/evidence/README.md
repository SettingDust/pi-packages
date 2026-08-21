# Phase B Terminal Surface Cleanup Evidence

- **Implementation state:** Final-review P1-1/P2-1/P2-2 repaired and self-verified; the second fresh independent correctness/evidence review is complete with P0/P1/P2 = 0. Phase B remains uncommitted pending an ownership-isolated selective commit.
- **Verified:** 2026-08-21
- **Authority:** [`runtime-lifecycle.md`, section 10](../../../spec/runtime-lifecycle.md#10-automatic-terminal-surface-cleanup); [`automatic-terminal-surface-cleanup.md`](../../../adr/automatic-terminal-surface-cleanup.md)

## Deterministic Checks

| Check | Result |
| --- | --- |
| `bun test tests/runtime.test.ts tests/lifecycle-migration.test.ts` | 87 passed, 0 failed |
| `bun run test` | 118 passed, 0 failed, 695 assertions across 8 files |
| `bun run typecheck` | passed (`tsc --noEmit -p tsconfig.json`) |
| `git diff --check -- .` | passed; only existing line-ending warnings were emitted |

The focused matrix covers completed, failed, cancelled, `pane_closed`, launch/create failures, missing identity, persistence-before-close, one close under concurrent joins/cancels, pending visibility, caller-only join abort, defensive copies, close-failure isolation, recovery retry/idempotence, unknown whole entries, unknown recognized-entry fields, generation isolation, resume, remove failure retention, V1/V2 compatibility, repeat-close classification, and artifact retention.

The final-review repair adds direct coverage for individually valid same-generation duplicates across pending/failed/final combinations. One runtime-owned rule deterministically prefers the first actionable pending/failed candidate over final duplicates, preserves every unselected entry unchanged, and permits at most one close for a generation in one operation. A still-actionable duplicate blocks remove; a close failure persists bounded failed evidence and retains the task, session, manifest, Result/launch artifacts, and opaque duplicate data. Table-driven validation covers malformed and noncanonical timestamps, blank/missing/forbidden status-specific identity and error fields, and exact 160/161-character validation and normalization boundaries.

## Real Herdr Acceptance

- Actual CLI output: `herdr 0.8.2-preview.2026-08-19-b5c4a0176e91` from `herdr --version`.
- Current `src/index.ts` SHA-256: `c6da5edbdee580078d3c6f6768bbd2021980f3978c321cb856ba2c9e85d6d363`.
- Exact acceptance-script SHA-256: `326c79a3423db5c79b3cbe209ec1efa010c07aafcf6e323e2a6e67e6b9966161`.
- Captured workspace: `wC`.
- Disposable accepted tab/root pane: `wC:t14` / `wC:pJX`.
- Exactly one acceptance-script execution created exactly one no-focus disposable tab. A preceding PowerShell environment-assignment syntax error failed before Bun or the script launched and created no Herdr resource.
- Before close: the root pane existed.
- At the runtime close call: terminal status `completed`, cleanup status `pending`, and the generation Result already existed.
- Runtime outcome: cleanup status `closed`.
- After close: the root pane no longer existed; a repeated tab close classified as `already_closed`.
- Retention: session, Result, manifest, PowerShell launch script, and bootstrap launch script all remained readable.
- Finally evidence: no accepted tab remained; the successful scenario had already removed it, so the `finally` fallback attempted no second close.

Reproduce with:

```powershell
$env:HERDR_WORKSPACE_ID = "wC"
bun docs/works/terminal-surface-cleanup/evidence/real-herdr-acceptance.ts
```

Machine-readable output: [`real-herdr-acceptance.json`](real-herdr-acceptance.json). It binds the actual CLI version output and current source/script bytes to the recorded command order, IDs, outcomes, retention checks, repeat-close classification, and `finally` state. The script uses exactly one no-focus disposable tab and never launches a child Pi process.

## Release Gate

The Phase B implementation, bounded repair, deterministic verification, real Herdr acceptance, and second fresh independent correctness/evidence review are complete. The remaining operation is the ownership-isolated selective commit; no unrelated work is included.

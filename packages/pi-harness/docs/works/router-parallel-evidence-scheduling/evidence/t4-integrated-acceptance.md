# T4 integrated acceptance evidence

## Parent-executed live fixture result

The parent subsequently ran `run-live-acceptance.ps1` in a newly created, owned `pi-t4-live` workspace. `live-acceptance-result.json` records **passed**, all eight fixture checks true, 177304 ms duration, no timeout, no recorded errors, and no failed tab cleanup. The outer command exited 0 and Herdr confirmed workspace closure. The recorded inner RPC exit code 143 reflects the runner terminating its own process after its completion predicate, not a failed fixture.

Observed: effective tool registration and conditional dispatch contract; strategy read before resolution; ordered A/C branches and exact adjacent resolve/spawn pairs; actual runtime overlap; complete notified Results before the dependent writer; one final writer producing both supported facts. These observations supersede the earlier open status for this fixture only. The broader matrix's unexercised failure, role, recovery, resource and other scenarios remain open; T4 is not fully complete.

## Executed in this Handler

- `packages/pi-harness`: `bun test` initially 138 pass/2 fail because the T2-added `delegation-strategy` was absent from the exact built-in Skill inventory. Added it to `tests/skills.test.ts` (30 Skills); reran the full suite: **141 pass/0 fail, 691 assertions**. `bun run typecheck` passed. This is an in-scope T2 catalog regression correction, not a change to registration or permissions.
- `packages/pi-herdr-subagents`: `bun test` **143 pass/0 fail, 1439 assertions**; `bun run typecheck` passed. This includes the controlled two-active-spawn regression (fake deferred Herdr transport), not a real Herdr/model trace.
- `bun build` of `evidence/live-acceptance.ts` and `evidence/acceptance-trace.ts` with `--target=bun` succeeded. `git diff --check` on both packages' modified source/tests/README passed; Git emitted only a working-copy LF-to-CRLF warning for `tests/skills.test.ts`. New evidence files are untracked; no staging or commit occurred.
- A local preflight command inadvertently inherited this Handler's `HERDR_WORKSPACE_ID` and started the RPC script for 30 seconds before the command timeout. This was **not** authorized live acceptance. The captured trace had a successful strategy read, no resolve and **no spawn**; the first snapshot ran before Herdr registration and cannot prove the effective contract. The timed-out probe process exited and its temporary fixture was removed. The script now checks the workspace ID and exact `pi-t4-live` label **before starting Pi** and samples effective tools at `agent_start`; the corrected path was build-checked, not live-executed. No existing Herdr tabs/workspaces were closed or changed. This unintended probe must not be counted as acceptance evidence.
- Read the actual Plan, T2/T3 source/tests, Pi CLI usage, Herdr workspace commands and the effective Handler tool surface. `pi --help` confirms `--mode rpc`, isolated `--session-dir`, `--no-extensions` plus explicit `-e`, and `--skill`. `pi list` shows both repo packages configured. `herdr workspace list` exposes live workspace IDs; `herdr workspace get`/`close` and tab commands are available. These are capability observations, **not** proof of active tools in a fresh Router or model adherence.

## Acceptance matrix

| Observation | Evidence/status |
| --- | --- |
| Router bootstrap, visible strategy catalog, customPrompt bypass, Handler guard text, capability/exact-forwarding contract | Harness static/extension tests pass; actual Router read and Handler misdelivery remain unobserved. |
| Conditional Herdr spawn description, exact per-branch order, two active independent IDs before either completion, full Result after notification | Owned source/README and deterministic runtime tests pass. Existing parent tool registration still says end turn after first spawn; source changes did not update that registration. |
| Effective registered contract and real backend resources | Not verified in this Handler. The parent-owned runner records `getAllTools` descriptions/active flags in a fresh Pi RPC process, verifies an explicitly supplied Herdr workspace and observes real tab IDs. |
| Live strategy read before resolution, `resolve A -> spawn A -> resolve C -> spawn C` adjacency, overlap, full Results before final-writer release | **Open.** The inadvertent preflight observed one read but no resolve/spawn and is not authorized acceptance. Runner emits a sanitized ordered tool/notification timeline with task IDs, status, timestamps, Result hashes and fixture-fact markers; all checks must pass, otherwise result is `open`. B's separate identity-dependent release is not exercised by this fixture. |
| No-delegation, missing/hidden/read failure and recovery, wrong-role Handler, customPrompt live, scoring/granularity, write conflict/authorization, malformed/duplicate/partial/blocked/cancelled Results, old-end-turn/resource rejection | **Open live scenarios.** Existing static/unit coverage is not substituted for controlled model traces; the single ready-branch fixture does not exercise this whole matrix. |

## Parent-owned live entrypoint

From `E:\Projects\pi-packages` in a **separate authorized Router-capable parent**, with authenticated Pi model and working Herdr server, create a disposable Herdr workspace and run the bounded acceptance script. This cannot be invoked by the current Handler: its available delegation authority forbids child coordination, and its existing `subagent_spawn` description requires ending the parent turn after one spawn. The script itself does not bypass either rule. Parent must own workspace creation/cleanup; never supply an existing shared workspace ID.

```powershell
$evidence = 'packages/pi-harness/docs/works/router-parallel-evidence-scheduling/evidence'
$previousWorkspace = $env:HERDR_WORKSPACE_ID
$created = herdr workspace create --cwd (Join-Path (Get-Location).Path $evidence) --label pi-t4-live --no-focus | ConvertFrom-Json
$id = $created.result.workspace.workspace_id
if (-not $id) { throw 'No isolated workspace ID returned; inspect Herdr response before proceeding' }
try {
  $env:HERDR_WORKSPACE_ID = $id
  bun (Join-Path $evidence 'live-acceptance.ts')
} finally {
  if ($previousWorkspace) { $env:HERDR_WORKSPACE_ID = $previousWorkspace }
  else { Remove-Item Env:HERDR_WORKSPACE_ID -ErrorAction SilentlyContinue }
  herdr workspace close $id
}
```

Prerequisites: a separately authorized parent (not this Handler), Pi auth for `api2api/gpt-6-astra` or `PI_T4_MODEL` set to a configured candidate, configured `harness.candidates`, and Herdr server with workspace/tab support. The script rejects an inherited/shared workspace unless its ID and exact `pi-t4-live` label match the parent-created workspace; label validation does not replace the parent's obligation to create and own that workspace. Inspect `evidence/live-acceptance-result.json` after the run. The script loads repo Harness and Herdr extension source explicitly, an isolated Pi session in a temporary fixture, and three repo Skills; it captures actual tool calls and Results, not narrated intentions. It stops its own RPC process within eight minutes, closes only spawned tabs on an early stop, and deletes its own fixture unless tab cleanup fails. The parent `finally` closes only the newly created workspace, covering any tab whose spawn response was not recorded. Only sanitized metadata and Result SHA-256 digests enter the durable JSON artifact; neither RPC stdout/stderr nor prompts/Result bodies/credentials are saved. `passed` means the fixture checks succeeded, **not** the remaining matrix rows above.

The Handler did not produce live evidence; the subsequent parent run produced `live-acceptance-result.json` as recorded above. T4 remains partially verified until the remaining accepted matrix is covered.

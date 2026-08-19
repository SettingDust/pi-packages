# Parent Workspace Pinning Plan

- **Status:** Accepted; implementation complete; no commit created by this status reconciliation
- **Authority:** [Parent Workspace Pinning Specification](../../spec/parent-workspace-pinning.md)
- **Decision:** [Parent Workspace Ownership And Pinning ADR](../../adr/parent-workspace-pinning.md) (accepted)
- **Context:** [Work Context](context.md)

## Objective

Make every Herdr child tab creation prove ownership by the parent workspace captured at transport construction, while preserving existing task lifecycle, explicit pane identity, recovery, generic CLI boundaries, non-Herdr loading, and observable failure tokens.

## Scope

- Capture the parent workspace target at the concrete transport boundary without making construction fail in a non-Herdr process.
- Add the target to `herdr tab create` arguments and validate the returned workspace, tab, and root-pane identities.
- Classify unsupported workspace contracts separately from unrelated Herdr command failures.
- Clean up a response-rejected surface with one best-effort close of its explicit returned root pane when available.
- Preserve existing spawn, resume, recovery, launch failure, and retained-pane behavior, including workspace tokens in propagated `Error.message` values.
- Add fake transport/client regression coverage and a mandatory controlled real Herdr `wF -> w8` acceptance run.
- Obtain fresh independent review and package verification.

## Non-Goals

Do not modify `packages/pi-herdr/src/index.ts`, add workspace persistence to task manifests, re-home existing panes, discover or list workspaces, infer targets from cwd/session/IDs/prefixes/foreground state, add fallback/retry behavior, add dependencies, create a new adapter abstraction, or perform Herdr mutations during documentation preparation.

## Implementation Admission Record

1. Fresh review assessed the revised authority package; the recorded `needs-revision` findings were remediated.
2. The user explicitly accepted the #14 workspace-pinning Plan before implementation.
3. Workspace admission was completed before the source/test work. The implementation remains in a shared dirty worktree with #9, #11, and #13 surfaces, so selective staging and commit admission are still required; this status update does not claim a commit.
4. The real Herdr gate ran in a managed parent environment with `HERDR_WORKSPACE_ID`, two distinguishable workspaces, foreground `w8` while the parent remained in `wF`, and cleanup permission. Its observed results are retained in [real-herdr-acceptance.json](evidence/real-herdr-acceptance.json).
5. The pre-implementation research was read-only. The required later acceptance mutated Herdr only as recorded in that evidence file.

## Implementation Strategy

### 1. Transport Target Capture And Delayed Failure Boundary

Keep the existing narrow `HerdrTransport` seam. Add the smallest target input needed to make the concrete transport deterministic in tests, while the production constructor captures `HERDR_WORKSPACE_ID` once. Construction must remain loadable when the target is absent or unusable; validate missing and invalid values at `createTab` before any Herdr call. Do not read the environment on each create, and do not derive the target from another runtime value.

Focused fake transport/client tests must prove target capture is immutable after environment mutation, constructor loading without a target, and invalid target rejection before Herdr invocation or foreground fallback.

### 2. Create Arguments, Classification, And Explicit Response Validation

Extend only the concrete `createHerdrTransport.createTab` command argument list with `--workspace <target>`, preserving cwd, label, no-focus, and env argument forwarding. Require `result.tab.tab_id`, `result.tab.workspace_id`, and `result.root_pane.pane_id`; compare returned workspace exactly to the captured target.

Classify explicit rejection of the workspace option or a successful response missing a required string identity as `parent_workspace_contract_unsupported`. Preserve unrelated Herdr command failures on the existing command-failure path. Classify an exact returned workspace difference as `parent_workspace_mismatch`. Every local workspace rejection must put its stable token in `Error.message`.

When response validation rejects a response containing an explicit non-empty root pane ID, make one best-effort close call for that exact pane before returning the primary failure. Preserve the primary token if cleanup fails; do not retry, discover tabs, guess IDs, or return a successful surface. A response with no explicit root pane ID receives no guessed cleanup command.

Tests must capture exact Herdr argv, validate explicit IDs, assert classification and token messages, assert one cleanup attempt where possible, and assert no child `run` or task-surface adoption after create rejection.

### 3. Existing Pane Lifecycle And Recovery Compatibility

Keep `SubagentRuntime` task persistence and generation semantics unchanged. Spawn uses the validated create surface. Resume retains identity/session and creates its new surface through the same pinned transport. Recovery adopts persisted explicit pane IDs without tab creation or re-homing. Run, steer, close, and pane-existence checks remain pane-ID operations.

Existing runtime create failure persistence must retain the transport `Error.message`, including the workspace reason token. A failed start must not allocate a replacement surface or fall back to the foreground/default workspace.

Add focused fake transport tests for spawn failure, resume failure, retained-pane recovery, delayed non-Herdr construction, no fallback, token propagation, and unchanged task/notification persistence. Do not add a manifest workspace field or alter `pi-herdr`.

### 4. Completed Real Herdr Mutation Acceptance

After the focused coverage passed, the controlled acceptance ran in the managed parent process. It recorded parent `HERDR_WORKSPACE_ID` `wF`, foreground workspace `w8`, fresh child spawn and resume surfaces, and exact returned workspace equality with explicit tab/pane identities. The observed version, command/result evidence, child Result status, and cleanup outcomes are retained in [real-herdr-acceptance.json](evidence/real-herdr-acceptance.json).

The record distinguishes observed evidence from incident chronology. It is completion evidence for the recorded environment and Herdr version; an independent reproduction still requires the same managed-workspace, foreground-control, mutation/cleanup-permission, and child-capable-Pi prerequisites.

### 5. Completed Final Review And Gate

Two reviewers independent of the implementation completed final reviews, including a post-remediation review. Both found no executable correctness defects. The final reported verification passed package typecheck, the full package test suite with 52 tests and 274 expectations, acceptance-evidence JSON parsing, and `git diff --check`. No commit is part of this status reconciliation.

## ASCII Control Flow

```text
parent managed process
  -> HERDR_WORKSPACE_ID = wF
  -> createHerdrTransport()
  -> capture wF once without constructor rejection

foreground changes to w8
  -> transport target remains wF

spawn/resume
  -> createTab({cwd, label, env})
  -> require captured wF
  -> herdr tab create --workspace wF --cwd ... --label ... --no-focus ...
  -> read result.tab.tab_id, result.tab.workspace_id, result.root_pane.pane_id
  -> require result.tab.workspace_id == wF
  -> launch child in explicit root_pane.pane_id
```

```text
missing/invalid/unsupported/mismatch
  -> stable token in Error.message
  -> response rejection: close explicit root pane once when available
  -> no default/foreground retry
  -> no child launch
  -> existing task failure persistence
```

```text
restart/recovery
  -> new transport captures current managed workspace
  -> recover persisted task + explicit pane ID
  -> adopt retained pane; no tab create
  -> future resume/spawn uses new captured target
```

## Completed Dependency And Ownership Order

```text
fresh review + user acceptance + workspace admission
  -> Task 1 -> Task 2 -> Task 3 -> Task 4 -> Task 5 -> Task 6
  -> implementation, evidence, and final reviews complete
```

The tasks are strictly serial. Tasks 1 through 4 overlap `packages/pi-herdr-subagents/src/index.ts` and/or `tests/runtime.test.ts`, which are also owned or modified by #9, #11, and #13. No implementation task is parallel-safe. Workspace admission is an ownership gate, not permission to edit another Work's changes. Workspace-pinning fix completion blocks related runtime work until the pinned create contract is implemented and accepted; this is an ordering dependency, not permission to edit their work prematurely.

## Risks And Mitigations

- **Foreground race or wrong workspace:** capture once, pass `--workspace`, and verify returned `workspace_id`.
- **Silent downgrade on old Herdr:** treat explicit option rejection and missing required response fields as incompatible and fail closed.
- **Workspace inference drift:** explicitly test cwd/session/ID/prefix changes do not affect target.
- **Response-rejected surface remains:** close only the exact returned root pane once; preserve cleanup failure as diagnostic and never claim cleanup without evidence.
- **Error classification disappears across runtime layers:** require the stable workspace token in `Error.message` and test persisted launch failure text.
- **Constructor breaks non-Herdr use:** defer target validation to `createTab` and test extension-load-compatible construction.
- **Lifecycle regression:** preserve existing task/session/generation artifacts and test spawn/resume/recovery separately.
- **Dirty shared worktree:** block source writes until #9/#11/#13 ownership is resolved or isolate the worktree.
- **False acceptance:** require real Herdr mutation, distinct parent/foreground workspaces, returned IDs, child launch evidence, cleanup outcomes, and command results.

## Completion Record

Completion is established by the accepted authority and Plan, completed serial implementation, focused coverage, the passing controlled real Herdr `wF -> w8` evidence record, final package typecheck and full tests, acceptance-evidence JSON parsing, `git diff --check`, and two independent final reviews without executable correctness findings.

The evidence is reproducible only with the recorded real-Herdr prerequisites. The shared dirty worktree still requires selective staging and commit admission. No source, test, Herdr state, staging, or commit is changed by this status-only documentation update.

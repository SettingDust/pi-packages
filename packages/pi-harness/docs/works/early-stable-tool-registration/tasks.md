# Tasks: Early Stable Harness and Herdr Tool Registration

- Status: draft candidate decomposition; unaccepted; unimplemented
- Updated: 2026-08-22
- Plan: [plan.md](plan.md)

## Dependencies

```text
Host T2 interface
  -> T1 Harness adapter
      -> T2 Herdr adapter
          -> T3 integrated #36 verification
```

The tasks are serial by default because host and package integration may touch shared fixtures and Harness files.

## T1. Implement Harness Contributor Adapter

- Outcome: `resolve_delegation` contributes through host preparation with positive main/child facts and current Skill/Role definition inputs.
- Depends on: accepted/tested host interface.
- Constraints: preserve Resolver/admission behavior; no host provenance, snapshot, compatibility, winner, or dispatch logic; no execute-time-only child workaround.
- Verification: A36-01, A36-02, A36-05, A36-06 and Harness package tests.
- Status: not started.

## T2. Implement Herdr Atomic Contributor Adapter

- Outcome: parent Herdr contributes all seven exact tools atomically, pane children contribute none, and current-state preflight remains before lifecycle side effects.
- Depends on: T1 or a source-proven non-overlapping host fixture boundary.
- Constraints: no partial owner set, task allocation, tab/pane/process creation during preparation, source self-attestation, or unrelated Herdr repair.
- Verification: A36-03 through A36-06, zero-side-effect failures, and Herdr package tests.
- Status: not started.

## T3. Verify Original #36 Lifecycle Shape

- Outcome: one reproducible integration report proves the intended tools survive Toolbelt-before-freeze and a trigger-first completion turn without ordinary-prompt rescue.
- Depends on: T1-T2 and host module.
- Evidence: registered contribution, active set, frozen provider inventory, compatibility outcomes, execution result, and side-effect inventory.
- Constraints: preserve E36-1/E36-2 distinction from CTRL-FRESH; no Toolbelt source/settings change; no task-loss claim.
- Status: not started.

## Excluded

No separate task for host inventory implementation, Router consumer logic, #18, #29, #39, Toolbelt policy, staging, or commit. Those remain in their owning Work.

## Added Lifecycle and Revocation Coverage

Future adapter verification must also cover queued/current-turn versus later-turn refresh, exact provider/executor object binding, host `revoked` before package side effects, stale reload callback, and preservation of nested host failure codes. These checks remain unexecuted.

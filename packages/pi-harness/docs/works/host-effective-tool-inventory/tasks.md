# Tasks: Host Effective Tool Inventory

- Status: abandoned historical candidate task set; unaccepted; unimplemented; unexecuted
- Updated: 2026-09-28
- Plan: [plan.md](plan.md)

Abandoned with the Host Work under the no-Pi-core-change decision. T0-T6 and their "not started" labels below are historical, not queued tasks; #36 adapters were already withdrawn and dependent #3 Host-consumer work will not proceed. No matrix ran.

## Dependency Graph

```text
T0 fresh review/confirmation gate
  -> T1 finalize source map and trusted profile fixture
      -> T2 host lifecycle/object-snapshot implementation
          -> T3 #36 adapters
              -> T4 #3 consumer
                  -> T5 integrated acceptance
                      -> T6 independent final review
```

## T0. Review the Repaired Package

- Outcome: independent review of every artifact in [review-manifest.md](review-manifest.md).
- Constraints: read-only; all runtime claims remain planned and matrices unexecuted.
- Gate: only a clean review permits one later consolidated user confirmation; no mechanism is prescribed.
- Status: not started.

## T1. Finalize Source Map and Profile Fixture

- Outcome: reviewed implementation locators plus concrete `@settingdust/pi-herdr-subagents/subagent_spawn` v1 profile values.
- Depends on: T0 and later confirmation.
- Inputs: [compatibility-profile.md](compatibility-profile.md) and Pi 0.84.2 source hashes/ranges.
- Constraints: retain configured/resolved paths separately; exact loader-path matching only; no jiti-byte/closure/cross-alias claims; identify every execution option.
- Stop: any contradiction to common first-turn preparation, later-turn revalidation, same-object execution, or execution guard returns to authority.
- Status: not started.

## T2. Implement Host Lifecycle and Object Snapshot

- Outcome: first and later provider turns authorize exact `context.tools` objects; provider and executor use those objects; generation/revocation blocks are enforced.
- Depends on: compatible T1.
- Expected surfaces: AgentSession `_runAgentPrompt`, Agent context creation/later-turn preparation, agent-loop provider/execute seam, minimal host-private compatibility module, focused tests.
- Constraints: reuse existing host tool arrays/maps; no second registry or package workaround.
- Verification: H01-H16 and native host gates.
- Status: not started.

## T3. Implement #36 Contributors

- Outcome: Harness/Herdr contribute definitions and positive eligibility inputs at the host seam with package JIT checks.
- Depends on: stable tested T2 interface.
- Constraints: atomic Herdr set; no provider exposure for child/indeterminate; no host ownership duplication.
- Verification: A36-01 through A36-08 and #36 matrix.
- Status: not started.

## T4. Implement #3 Consumer

- Outcome: Harness/Router consume the current host outcome, preserve nested `host.code`, and map one successful resolution to one pinned spawn.
- Depends on: T3 and admitted profile.
- Constraints: no model provenance, name fallback, retry, queue, or backend source change.
- Verification: C3-01 through C3-08.
- Status: not started.

## T5. Run Integrated Acceptance

- Outcome: reproducible evidence for every matrix row on one revision.
- Depends on: T2-T4.
- Evidence: revision, profile version, exact object-reference observations, definitions, host outcome, run/turn generation, revocation, dispatched object, and side effects.
- Constraints: triggerTurn-first receives no ordinary-prompt rescue; security revocation and ordinary changes are distinct.
- Status: not started.

## T6. Independently Review Final Implementation

- Outcome: read-only correctness/security/evidence review of exact diff and T5 evidence.
- Depends on: T5.
- Constraint: actionable findings return to their owning task and require fresh T5/T6.
- Status: not started.

## Parallelism and Exclusions

No parallel implementation is assumed. T2 defines the interface for T3, and T3 precedes T4. No task covers #18, #29, #39, Toolbelt policy, unrelated Herdr lifecycle work, settings mutation, staging, or commit.

# Plan: Host Effective Tool Inventory

- Status: draft; unaccepted; unimplemented; not authorized for execution
- Updated: 2026-08-22
- Work: [work.md](work.md)
- Context: [context.md](context.md)
- Tasks: [tasks.md](tasks.md)

## Objective

Implement the smallest host-owned seam that authorizes and binds each provider turn's exact `context.tools` objects, then adapt #36 contributors and #3 consumers.

## Preconditions

The repaired authority set must receive fresh independent review and one later consolidated user confirmation. Concrete implementation still requires separate authorization. Stop if source inspection contradicts the object-snapshot, lifecycle, or execution-guard contract.

## Scope and Non-Goals

Implement only positive eligibility, common first-turn preparation, later-turn revalidation, exact tool-object binding, generation/revocation, deterministic winner behavior, versioned compatibility profiles, #36 adapters, and #3 consumption. Do not add a second registry, wrapper DSL, persistent snapshot store, publisher PKI, dependency attestation, jiti-byte/closure proof, Windows file-identity layer, Toolbelt policy, retry, or fallback.

## Serial Strategy

```text
P0 fresh authority review + later consolidated confirmation
  -> P1 freeze exact host source map/profile fixture values
      -> P2 implement host object-snapshot seam
          -> P3 implement #36 contributors
              -> P4 implement #3 consumer
                  -> P5 integrated verification
                      -> P6 independent final review
```

No implementation phases are parallel by default.

## P1. Confirm Host Surfaces and Fixture Inputs

Recheck the recorded Pi 0.84.2 hashes/ranges. Record exact implementation repository surfaces, platform/runtime values, extension configured/resolved paths, reviewed digest scope, and every execution option. Do not claim evaluated-byte or closure identity. If the host cannot prepare before both `_runAgentPrompt` paths, revalidate before `prepareNextTurnWithContext`, or guard execution, stop.

## P2. Implement Host Seam

At the existing AgentSession/Agent seam:

1. derive positive eligibility before protected provider exposure;
2. run adapter preparation and inventory mutators before `Agent.prompt/createContextSnapshot` for ordinary and triggerTurn-first;
3. authorize and retain exact `agent.state.tools` objects as the first `context.tools`;
4. re-run authorization before later-turn `prepareNextTurnWithContext` replacement;
5. serialize and execute from the same exact objects;
6. add run/turn generation and revocation guards before `tool.execute`;
7. evaluate `effective-tool-compatibility/v1` and expose only its coded projection;
8. preserve exact configured/resolved paths and deterministic semantic evidence.

Reuse current arrays/maps and existing duplicate order; do not build a parallel registry.

## P3. Adapt #36 Contributors

Harness contributes current Resolver definition inputs and positive main/custom-prompt-child facts. Herdr contributes its seven definitions atomically and positive parent/pane-child facts. Both retain package JIT checks. Neither owns profile evaluation, snapshot, winner, generation, or dispatch.

## P4. Adapt #3 Consumer

Harness reads the private current-turn outcome; Router consumes the host-owned coded projection before resolution and preserves nested `host.code`. After `resolved`, one exact `subagent_spawn` remains the next environment action. No model-side path/digest/schema provenance logic or name fallback.

## P5. Integrate

Run all Host/#36/#3 matrix rows on one exact revision. Capture contribution, active membership, exact object identity, provider definition, compatibility outcome, execution object, run/turn generation, revocation state, and side effects separately. All current matrices are unexecuted until this phase.

## Verification

Minimum gates:

- ordinary and triggerTurn-first common-seam tests;
- queued/current-turn versus later-turn refresh tests;
- positive eligibility/precedence negatives;
- exact-path and unsupported-Windows-alias failures;
- semantic field and each changed execution-option test;
- duplicate winner, ordinary removal, security revocation, reload, and stale callback;
- nested host-code mapping and exact one-spawn consumer behavior;
- native host/package type/test checks found during implementation.

## Rollback

Revert host/profile, #36, and #3 changes as one compatibility unit unless a compile-safe boundary is proven. No persisted data migration is expected.

## Final Gate

All matrices pass on one revision; provider and executor object identity is directly observed; no unsupported attestation claim remains; Host -> #36 -> #3 order is preserved; and independent review has no actionable finding. Status reconciliation and commit remain separate work.

# Plan: Early Stable Harness and Herdr Tool Registration

- Status: draft; unaccepted; unimplemented; not authorized for execution
- Updated: 2026-08-22
- Work: [work.md](work.md)
- Host Plan: [Host Effective Tool Inventory Plan](../host-effective-tool-inventory/plan.md)
- Tasks: [tasks.md](tasks.md)

## Objective

Implement only the Harness/Herdr contributor adapters required by the accepted host effective-inventory interface, preserving current-state execution guards and child exclusion.

## Preconditions

- The complete host authority set has passed independent review and received later user confirmation.
- Host task T2 has delivered a stable tested adapter interface.
- Exact package implementation Handoffs are separately admitted under current project authority.
- Shared dirty files are protected.

## Strategy

1. Recheck package source against the accepted host adapter interface.
2. Implement Harness contribution and eligibility facts with the smallest reuse of existing Resolver-definition construction.
3. Implement Herdr's atomic seven-definition contribution and pane-child facts using existing definition constructors and runtime validation.
4. Run adapter-focused tests.
5. Participate in the host integration matrix.

Do not add a package wrapper, registry, compatibility evaluator, source hashing, snapshot, duplicate resolver, or dispatch layer.

## Harness Phase

- Expose one adapter contribution for `resolve_delegation`.
- Supply current Skill/Role definition inputs during host preparation.
- Supply positive standard-main eligibility and custom-prompt/Handler exclusion facts.
- Preserve existing Resolver/admission/JIT validation and deterministic blocks.
- Test ordinary-first/trigger-first equivalence through the host fixture and child exclusion before provider freeze.

## Herdr Phase

- Preconstruct the seven existing definitions as one atomic owner set.
- Supply positive parent and pane-child exclusion facts.
- Supply current Agent/model definition inputs during host preparation without task/pane/process side effects.
- Reuse runtime preflight for stale Agent/model/workspace/task state.
- Test zero partial contribution and zero lifecycle side effects on failure.

## Integration

Run A36-01 through A36-06 and the original E36 ordering fixture on the same revision as the host module. Capture candidate contribution, post-Toolbelt active set, frozen visibility, compatibility, and execution separately. Do not insert an ordinary prompt into trigger-first cases.

## Rollback

Revert package adapter changes with the compatible host consumer changes unless build/test evidence proves a safe isolated revert. No data migration is expected. Rollback restores the known #36 gap.

## Final Gate

Package tests, all A36 matrix rows, original incident-shape regression, host generation/dispatch tests, and independent final review must pass. Status reconciliation and commit are separate work.

## Host Seam Binding

The accepted implementation interface must invoke these adapters before `Agent.prompt/createContextSnapshot` for ordinary and triggerTurn-first entries, and before `prepareNextTurnWithContext` for later provider turns. Tests observe that the host serializes and executes the same exact tool objects. Ordinary changes wait for the later-turn boundary; host security revocation/reload blocks before execute. No behavior in this section is implemented or executed yet.

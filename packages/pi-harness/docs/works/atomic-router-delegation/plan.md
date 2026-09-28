# Plan: Atomic Router Delegation

- Status: draft independent #3 plan; Host-dependent phases abandoned; unaccepted; unimplemented; not authorized for execution
- Updated: 2026-09-28
- Work: [work.md](work.md)
- Host Plan: [Host Effective Tool Inventory Plan](../host-effective-tool-inventory/plan.md)
- Tasks: [tasks.md](tasks.md)

The Host plan linked above is abandoned under the no-Pi-core-change decision. Sections below preserve the earlier combined plan but are not executable as written. Independent Handoff decomposition/Model Role scope remains a draft candidate; Host outcome consumption, C3 rows, and integrated Host/#36/#3 verification are abandoned, not queued. Herdr child `--exclude-tools` addresses the selected isolation need only.

## Objective

Implement the smallest #3 change that validates one clear Handoff outcome and consumes the Host v1 current provider-turn outcome while selecting a Model Role matched to ambiguity, risk, and verification burden. The change must preserve the existing Resolver, Result, and backend contracts owned elsewhere.

## Preconditions

- Complete repaired authority package is independently reviewed and later confirmed once by the user.
- Host object-snapshot module and #36 adapters are implemented and tested.
- Host exposes the approved `@settingdust/pi-herdr-subagents/subagent_spawn` v1 outcome through the private Harness read path and Host-owned Router projection.
- The semantic backend evidence remains compatible with the current backend source.
- Any concrete implementation Handoff has an independently checkable boundary and stopping condition.

## Scope

- Handoff outcome, boundary, stopping-condition, dependency, and parallel-safety validation.
- Model Role selection against ambiguity, risk, and verification burden.
- Host compatibility consumption before any applicable resolution.
- Preservation of nested `host.code` and distinct coordination failures.
- Backend mapping only as specified by the owning Backend Adaptation Specification.
- Planned checks D3-01 through D3-05 and C3-01 through C3-08.

No source hashing, object/winner lookup, snapshot formation, package adapter, backend source change, wrapper, registry, retry, fallback, queue, or persistent Router coordination state is added by #3.

## Strategy

1. Validate the Handoff bundle as one subject and block multiple outcomes, conflicting boundaries, or unsafe dependencies before work.
2. Assess material dependencies and parallel-safety; allow independent scheduling and serialize dependent/conflicting work.
3. Select an available Model Role against ambiguity, consequence/risk, and verification burden without silent fallback.
4. Read the current Host outcome through the authorized non-model-addressable path when delegation requires it.
5. Preserve the Host/Router failure boundary and backend mapping owned by the Backend Adaptation Specification.
6. Run the planned decomposition, model-selection, Host-outcome, and consumer checks; all remain unexecuted in this documentation revision.

## Host Lifecycle Dependency

Host first-turn preparation runs before `Agent.prompt/createContextSnapshot` on common `_runAgentPrompt`, including ordinary and triggerTurn-first. Later-turn revalidation runs before `prepareNextTurnWithContext`. Queued steer/follow-up retains the current batch until that boundary. Security revocation/reload must block before package side effects. Router tests observe these outcomes but do not implement them.

## Verification

Planned checks cover one-outcome boundaries, multi-outcome blocking, dependency and parallel-safety decisions, Model Role risk matching, forged Host projections, compatible and incompatible Host outcomes, nested codes, Resolver states, stale/revoked guards, launch errors, dynamic Skills, and unchanged Result/notification semantics. No dynamic matrix execution is claimed.

## Final Gate

The former combined Host/#36/#3 final gate was not run and is no longer scheduled. Independent #3 decomposition scope needs its own authority and authorization before implementation; this historical plan does not supply them.

# Atomic Router Delegation Context

- Status: draft processed consumer context; not authority; unaccepted; unimplemented
- Updated: 2026-08-22
- T1 evidence: [research.md](research.md)

## Objective Boundary

#3 governs neutral Handoff decomposition and Model Role selection, plus consumption of the Host outcome. It does not own Host eligibility, profiles, tool-object selection, lifecycle snapshots, execution authority, backend lifecycle, or #36 contributions.

## Settled Candidate Direction

- Each Handoff has one primary-owned observable outcome, an independently checkable boundary, and a stopping condition.
- A proposed Handoff is split only when it contains multiple independently verifiable outcomes, conflicting boundaries, or unsafe dependencies.
- Material prerequisites, affected ownership, and parallel-safety are explicit. Independent Handoffs may run concurrently; dependent or conflicting Handoffs are serialized.
- The selected Model Role is matched to ambiguity, risk, and verification burden without silent fallback.
- Companion Skills refine method or evidence discipline but cannot add an outcome or broaden the boundary.
- These properties do not encode a workflow phase, document type, or fixed Skill taxonomy.

## Host Compatibility Boundary

```text
current provider-turn's exact context.tools snapshot
  -> Host effective-tool-compatibility/v1 outcome
       -> incompatible/absent/stale/revoked before resolution: Router block with nested host.code
       -> compatible: Router may schedule the Handoff subject to its declared dependencies and safety
            -> backend adaptation, when applicable, consumes the resolved invocation
                 -> Host dispatches the same pinned context.tools object
```

Router/Harness do not compare or authenticate paths, digests, object identities, generations, package/version, or visible contracts. Harness reads the private Host outcome; Router consumes the Host-owned coded projection. Model input cannot submit or replace that outcome.

## Pi 0.84.2 Lifecycle

Host first-turn preparation occurs on common `_runAgentPrompt` before `Agent.prompt/createContextSnapshot`, covering ordinary and triggerTurn-first. Later provider turns revalidate before `prepareNextTurnWithContext`. Queued steer/follow-up retains the current tool batch until that later boundary. Ordinary change affects a later turn; security revocation/reload blocks not-yet-started execution before package side effects.

## T1 Evidence Role

[T1 research](research.md) maps expected backend semantics: Agent resolution, prompt/model/thinking forwarding, child instructions/read access, task identity, Result persistence, notification, and join. It cannot establish the current winner, current tool object, runtime generation, Host outcome, or executed object. Every applicable delegation still requires the current Host outcome.

## Planned Acceptance Rows

| ID | Scenario | Required evidence |
|---|---|---|
| D3-01 | One bounded Handoff | One observable outcome, checkable boundary, and stopping condition are recorded. |
| D3-02 | Multi-outcome or conflicting Handoff | The bundle is blocked before any outcome is performed. |
| D3-03 | Dependencies and parallel safety | Independent work may run concurrently; dependent or conflicting work is serialized. |
| D3-04 | Model Role choice | Selected model/thinking is explainably matched to ambiguity, risk, and verification burden; unavailable choices do not silently fall back. |
| D3-05 | Forged Host projection | Model-supplied compatibility fields cannot replace the private current-turn outcome or trigger resolution/launch. |

All rows are planned and unexecuted.

## Failure Matrix

| Host state | Router action |
|---|---|
| `tool_unavailable` before resolution | `delegation_tool_unavailable`; preserve nested code; no resolve |
| eligibility/path/digest/version/platform/semantic/option/profile mismatch | `delegation_contract_incompatible`; preserve exact nested code; no resolve |
| stale before resolution | `delegation_contract_incompatible` + `host.code: stale_generation`; no resolve |
| stale/revoked at pinned dispatch or execute guard after resolution | `delegation_launch_failed` + exact nested Host code; zero package side effects/fallback |
| Resolver blocked | preserve Resolver code; no backend launch |
| backend reject/invalid identity | stable launch code; no retry or substitution |

## Status and Risks

All runtime claims and matrix rows are planned/unexecuted; all Host-consumer materials remain draft, unaccepted, unimplemented, and unauthorized. Host output must remain non-model-forgeable and provider-turn scoped. T1 may drift and must be rechecked before profile admission.

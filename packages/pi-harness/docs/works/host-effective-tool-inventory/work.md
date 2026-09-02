# Work: Host Effective Tool Inventory

- Status: draft; unaccepted; unimplemented
- Updated: 2026-08-22
- Nature: derived coordination material; not authority or acceptance evidence

## Objective

Deliver the host `context.tools` object-snapshot contract defined by [ADR-0008](../../adr/0008-host-owned-effective-tool-inventory.md) and the [Effective Tool Inventory Specification](../../spec/effective-tool-inventory.md), then adapt #36 contributors and #3 consumers to that single seam.

## Authority

- [ADR-0008](../../adr/0008-host-owned-effective-tool-inventory.md)
- [Effective Tool Inventory Specification](../../spec/effective-tool-inventory.md)
- [#36 adapter Specification](../../spec/early-stable-tool-registration.md)
- [Router Delegation Specification](../../spec/router-delegation.md), Amendment Extension B
- [Backend Adaptation Specification](../../spec/backend-adaptation.md)

## Derived Materials

- [Context](context.md)
- [Plan](plan.md)
- [Tasks](tasks.md)
- [Acceptance matrix](acceptance-matrix.md)
- [Compatibility profile v1](compatibility-profile.md)
- [Cross-package review manifest](review-manifest.md)

## Scope

Included:

- positive standard-main/custom-prompt child/Herdr pane-child/indeterminate classification;
- common `_runAgentPrompt` preparation before `Agent.prompt/createContextSnapshot`;
- later-turn revalidation before `prepareNextTurnWithContext`;
- exact `context.tools` object binding for provider definitions and execute closure;
- deterministic duplicate winner, run/turn generation, revocation, reload, and stale callback behavior;
- exact loader-resolved path matching and narrowly scoped reviewed digest compatibility evidence;
- `effective-tool-compatibility/v1` and `@settingdust/pi-herdr-subagents/subagent_spawn` profile fixture contract;
- #36 contributors, #3 consumer, and integrated verification.

Excluded:

- exact pre-transform/transformed/evaluated jiti byte or execute-closure attestation;
- publisher, dependency-graph, or runtime authentication;
- cross-alias Windows physical identity;
- wrapper registries, Toolbelt policy, #18/#29/#39, unrelated Herdr behavior, settings/session/Herdr mutations during this documentation unit, staging, or commit.

## Current State

The Pi 0.84.2 source map establishes usable host lifecycle seams and the limits above. No runtime behavior is implemented or verified. All matrices remain unexecuted, and the complete repaired set still requires fresh independent review.

## Dependency and Stop Rule

Implementation order is strictly Host -> #36 -> #3 -> integrated verification -> independent final review. Stop for authority reconciliation if implementation cannot bind compatibility/provider/executor to the same `context.tools` objects, cannot run preparation before both first-turn paths, or cannot enforce generation/revocation before execution.

## Completion Signal

Future delivery completes only when every required matrix row passes on one revision, the profile fixture is generated and independently reviewed, no host seam contradicts authority, and statuses are reconciled truthfully under separately authorized work.

## Acceptance Boundary

This complete repaired Host/#36/#3 set remains draft, unaccepted, unimplemented, and unexecuted. After fresh independent review, one later consolidated user confirmation of that reviewed set is required. No mechanism is prescribed; this Work creates no review, confirmation, implementation authority, staging, or commit.

- [Consistency report](consistency-report.md)

# Work: Host Effective Tool Inventory

- Status: abandoned historical Work; unaccepted; unimplemented; unexecuted
- Updated: 2026-09-28
- Nature: derived coordination material; not authority or acceptance evidence

## Closure

Abandoned with the withdrawn ADR-0008 and effective-tool-inventory Spec under the no-Pi-core-change decision. Herdr child `--exclude-tools` meets the selected child-isolation need but does not deliver the proposed Host inventory guarantees. The linked Context, Plan, Tasks, matrix, profile, manifest, and report are retained as historical records, not executable follow-up; #36 adapters were already withdrawn. No Host/#36/#3 implementation or verification ran under this package. Independent accepted Router/delegation scope is not withdrawn by this closure.

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

The Pi 0.84.2 source map recorded possible host lifecycle seams and limits. No runtime behavior was implemented or verified. All matrices remain unexecuted; the former fresh-review gate is closed with this Work.

## Dependency and Stop Rule

The historical implementation order was Host -> #36 -> #3 -> integrated verification -> independent final review. It is cancelled, not an instruction to proceed. The proposed stop condition was to reconcile authority if host seams could not meet the contract.

## Completion Signal

This completion signal was never reached and is no longer an active gate: every required matrix row would have needed to pass on one revision, with a reviewed profile and independent review. No such delivery was performed.

## Acceptance Boundary

The earlier combined Host/#36/#3 review and confirmation boundary was not completed and is abandoned. This Work creates no review, confirmation, implementation authority, staging, or commit.

- [Consistency report](consistency-report.md)

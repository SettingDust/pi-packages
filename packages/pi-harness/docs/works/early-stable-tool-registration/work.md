# Work: Early Stable Harness and Herdr Tool Registration

- Status: draft; unaccepted; unimplemented
- Updated: 2026-08-22
- Nature: existing #36 adapter Work; derived coordination material

## Intent

Adapt Harness and Herdr tool owners to the host effective-inventory contract so ordinary-first and trigger-first runs receive equivalent eligible contributions, while package execution remains fail closed on current state.

## Authority

- [ADR-0008](../../adr/0008-host-owned-effective-tool-inventory.md)
- [Effective Tool Inventory Specification](../../spec/effective-tool-inventory.md)
- [#36 adapter Proposal](../../proposals/early-stable-tool-registration.md)
- [#36 adapter Specification](../../spec/early-stable-tool-registration.md)

## Materials

- [Context](context.md)
- [Plan](plan.md)
- [Tasks](tasks.md)
- [Acceptance matrix](acceptance-matrix.md)

## Included

- Harness `resolve_delegation` contribution and positive main/child facts;
- Herdr atomic seven-tool parent contribution and pane-child exclusion facts;
- dynamic Skill/Role/Agent/model preparation before host freeze;
- package JIT validation before side effects;
- adapter-specific tests and integrated host matrix participation.

## Excluded

The Pi host owns source identity, runtime generation, registration identity, Toolbelt ordering, effective winner, immutable snapshot, compatibility result, and pinned dispatch. This Work does not implement or duplicate those concerns. It also excludes Toolbelt policy, #3 Router consumption, #18, #29, #39, unrelated dirty work, implementation during this documentation unit, staging, and commit.

## Dependency

Implementation depends on an accepted and implemented host interface from [Host Effective Tool Inventory Work](../host-effective-tool-inventory/work.md). Package-only early registration is not completion evidence.

## Completion Definition

Future #36 work completes only when its adapter tests and A36 rows in the Host acceptance matrix pass on the same revision as the host module, including the original Toolbelt snapshot/trigger-first shape without ordinary-prompt rescue, positive child exclusion, atomic Herdr contribution, and stale-state JIT rejection.

## Acceptance Boundary

This Work tuple remains draft, unaccepted, and unimplemented. It participates in the complete host authority review and later single user confirmation; editing these files is not review, acceptance, authorization, staging, or commit.

## Host Lifecycle Dependency

The Host v1 interface is tied to concrete Pi 0.84.2 seams: first-turn preparation inside `_runAgentPrompt` before `Agent.prompt/createContextSnapshot`, later-turn refresh before `prepareNextTurnWithContext`, and execution-time generation/revocation checks against the exact current `context.tools` object. #36 remains a contributor only; all runtime claims and matrices are unexecuted.

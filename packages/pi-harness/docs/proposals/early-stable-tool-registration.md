# Proposal: Harness and Herdr Effective-Inventory Adapters

- Status: withdrawn (closed by user decision 2026-09-28); unaccepted; unimplemented
- Date: 2026-08-22
- Owners: `@settingdust/pi-harness` and `@settingdust/pi-herdr-subagents` as package adapters
- Host authority: [ADR-0008](../adr/0008-host-owned-effective-tool-inventory.md), [Effective Tool Inventory Specification](../spec/effective-tool-inventory.md)
- Candidate adapter contract: [Early Stable Tool Registration Specification](../spec/early-stable-tool-registration.md)
- Existing Work: [Early Stable Tool Registration Work](../works/early-stable-tool-registration/work.md)

## Problem

Harness and Herdr currently assemble dynamic tools in `before_agent_start`. Existing #36 evidence shows that a Toolbelt-style earlier active snapshot and a trigger-first completion turn can therefore omit the package tools until an ordinary prompt runs.

Package-local early registration alone cannot solve the full problem. Cross-extension winner selection, source provenance, immutable per-run inventory, Toolbelt ordering, and dispatch identity belong to the Pi host under ADR-0008.

## Candidate Change

Adapt the two packages to the host effective-inventory seam:

- Harness contributes `resolve_delegation`, current Skill/Role definition inputs, and host-verifiable standard-main/child eligibility facts.
- Herdr contributes its seven `subagent_*` definitions as one owner set in parent runtimes and positive pane-child exclusion facts.
- Both retain execute-time validation of mutable package state before side effects.
- Both permit host preparation to obtain equivalent contributions for ordinary-first and trigger-first runs without depending on `before_agent_start` as the only path.

The packages do not issue source anchors, registration identities, compatibility approvals, runtime generations, snapshots, effective winners, or dispatch pins. They do not create a shared wrapper or registry.

## Why This Direction

The host already owns extension loading, duplicate resolution, provider inventory formation, runtime replacement, and dispatch. Package adapters remain narrow: they provide owned definitions and validation; the host hides inventory complexity behind one interface.

## Alternatives

- **Keep late registration:** rejected because it preserves the demonstrated trigger-first gap.
- **Load-time registration as complete authority:** rejected because it cannot control Toolbelt ordering, cross-extension winners, or dispatch.
- **Package wrapper/registry:** rejected because it duplicates host ownership and couples independent packages.
- **Toolbelt-only patch:** rejected because the contract must hold for every host inventory path, not one mutator.

## Consequences

Positive:

- #36 reuses the host run-preparation/freeze lifecycle.
- Child exclusion and package JIT validation stay close to their owners.
- Trigger-first and ordinary-first paths share one host contract.

Negative:

- #36 implementation depends on the accepted and implemented host authority.
- Package tests need a host-adapter fixture rather than assuming package registration alone establishes final visibility.
- A package preparation failure must be represented to the host without partial owner-set claims.

## Exclusions

No Pi host implementation is authorized by this Proposal; that work belongs to the Host Effective Tool Inventory Work. No Toolbelt policy change, backend compatibility consumer, #18, #29, #39, unrelated Herdr lifecycle change, settings change, source/test edit during this documentation Handoff, staging, or commit is included.

## Closure

Withdrawn by user decision after the blacklist/inventory comparison (`C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/compare-tool-blacklist-inventory-artifacts/result-1.json`). Existing Herdr child `--exclude-tools` filtering meets the selected child-isolation need; broader host effective-inventory and package-adapter work is not being pursued. This is a scope decision, not technical replacement or delivery: the blacklist does not establish ordinary-first/trigger-first equivalence, host inventory snapshots or dispatch guards. The incident evidence above remains historical. The candidate adapter Spec and #36 Work tuple are withdrawn with this Proposal; independent host draft authority is not accepted, withdrawn, or implemented by this decision.

## Historical Acceptance Boundary

The following was the pre-withdrawal candidate boundary, not an active review or implementation gate:

This Proposal, candidate adapter Spec, and existing #36 Work tuple remain draft, unaccepted, and unimplemented. They require independent review as part of the complete host authority set and one later user confirmation of that reviewed set. No interaction mechanism is prescribed, and this authoring creates no acceptance or implementation authorization.

# Atomic Router Delegation Work

- Status: draft; unaccepted; unimplemented
- Updated: 2026-08-22
- Nature: #3 consumer coordination material; not authority or acceptance evidence

## Goal

Define the smallest #3 consumer change that gives each Handoff one clear observable outcome, an independently checkable boundary and stopping condition, explicit dependencies and parallel-safety, and a Model Role matched to ambiguity, risk, and verification burden. The Work also records how the Router consumes the Host's current provider-turn compatibility outcome without taking ownership of Host state.

## Authority Candidates

- [ADR-0005 draft host-consumer amendment](../../adr/0005-let-router-adapt-delegate-tools-directly.md)
- [ADR-0008](../../adr/0008-host-owned-effective-tool-inventory.md)
- [Effective Tool Inventory Specification](../../spec/effective-tool-inventory.md)
- [Router Delegation Specification](../../spec/router-delegation.md), Amendment Extension B
- [Backend Adaptation Specification](../../spec/backend-adaptation.md)

## Materials

- [Context](context.md)
- [Plan](plan.md)
- [Tasks](tasks.md)
- [T1 source mapping](research.md)
- [Host profile v1](../host-effective-tool-inventory/compatibility-profile.md)
- [Cross-package manifest](../host-effective-tool-inventory/review-manifest.md)

## Scope

- One Handoff per clear primary-owned observable outcome.
- Independently checkable scope boundary and stopping condition.
- Explicit material dependencies and a concurrency-safety assessment.
- Model Role selection matched to ambiguity, consequence/risk, and verification burden.
- Splitting only for multiple independently verifiable outcomes, conflicting boundaries, or unsafe dependencies.
- Host compatibility consumption for the current provider-turn tool-object snapshot, with nested Host failure codes preserved.
- Backend invocation behavior only where required by the owning Backend Adaptation Specification.

## Exclusions

#3 does not own Host eligibility, profiles, tool-object selection, lifecycle snapshots, execution authority, backend lifecycle, or #36 contributions. It does not define a workflow-phase taxonomy or use document type, Skill name, or phase labels as decomposition proof.

## Dependency and Parallel-Safety Contract

#3 consumes a compatible, implemented Host object-snapshot seam and #36 adapters before any delegation that needs them. Independent Handoffs may be scheduled concurrently when their declared inputs, outputs, ownership, and side effects do not conflict. Handoffs with data, authority, ownership, or behavioral dependencies must be serialized by the Router. The Router may schedule more than one independent Handoff in a scheduling interval; no one-pass or adjacency rule follows from decomposition.

## Current State

Amendment Extension B and Backend Adaptation define Host compatibility consumption. T1 remains semantic backend evidence only and cannot prove a current effective object. All #3 amendment material remains draft, unaccepted, unimplemented, unauthorized, and unexecuted.

## Host-Bound Lifecycle Contract

The Host outcome binds the exact provider-turn `context.tools` object used for provider serialization and execution. Router does not receive or submit execute closure, object identity, source path, digest, or profile approval. A model-submitted compatible projection, profile/version, generation, path/digest, or host code cannot replace the private Host outcome. Path/digest/version data is compatibility admission only, not publisher/runtime/jiti-byte/closure attestation.

## Completion Signal

Completion requires the planned decomposition, dependency, parallel-safety, Model Role, Host-outcome, nested-code, and C3 consumer checks to pass on one integrated revision, followed by independent review. Runtime checks remain unexecuted in this documentation revision.

## Acceptance Boundary

The complete repaired Host/#36/#3 set requires fresh independent review and one later consolidated user confirmation before acceptance. This file prescribes no mechanism and creates no review, confirmation, implementation authority, staging, or commit.

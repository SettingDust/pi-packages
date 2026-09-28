# Atomic Router Delegation Work

- Status: draft independent #3 decomposition scope; Host-dependent consumer abandoned; unaccepted; unimplemented
- Updated: 2026-09-28
- Nature: #3 consumer coordination material; not authority or acceptance evidence

## Host Dependency Closure

The Host effective-tool-inventory ADR/Spec/Work are withdrawn under the no-Pi-core-change decision, and #36 adapters were already withdrawn. Host outcome consumption, nested Host-code integration, and the Host -> #36 -> #3 delivery chain below are historical, not executable follow-up. Existing Herdr child `--exclude-tools` meets the selected child-isolation need but does not implement the proposed Host compatibility contract. Independent neutral decomposition/Model Role scope and accepted Router/delegation base remain distinct; this Work does not claim their acceptance or implementation.

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

The Host-dependent part of #3 would have consumed a compatible, implemented Host object-snapshot seam and #36 adapters; that path is abandoned. The independent Handoff dependency/parallel-safety criteria below remain candidate scope, not an authorized task. Independent Handoffs may be scheduled concurrently when their declared inputs, outputs, ownership, and side effects do not conflict. Handoffs with data, authority, ownership, or behavioral dependencies must be serialized by the Router. The Router may schedule more than one independent Handoff in a scheduling interval; no one-pass or adjacency rule follows from decomposition.

## Current State

Amendment Extension B's independent decomposition scope remains draft. The Host-dependent compatibility-consumer work is abandoned; T1 remains historical semantic backend evidence, not proof of a current effective object. No #3 candidate work in this package is authorized or executed.

## Host-Bound Lifecycle Contract

The Host outcome binds the exact provider-turn `context.tools` object used for provider serialization and execution. Router does not receive or submit execute closure, object identity, source path, digest, or profile approval. A model-submitted compatible projection, profile/version, generation, path/digest, or host code cannot replace the private Host outcome. Path/digest/version data is compatibility admission only, not publisher/runtime/jiti-byte/closure attestation.

## Completion Signal

The independent decomposition and Model Role checks below are candidate checks; Host-outcome, nested-code, and C3 consumer checks are abandoned with the Host program, not pending gates. No runtime checks were executed.

## Acceptance Boundary

The earlier combined Host/#36/#3 acceptance boundary was not completed and is abandoned. Independent #3 scope remains unaccepted and requires separate authority and authorization before implementation; this Work creates none.

# ADR-0008: Host-Owned Effective Tool Inventory

- Status: draft; unaccepted; unimplemented
- Date: 2026-08-22
- Owners: Pi host `AgentSession`/Agent tool-context lifecycle
- Specification: [Effective Tool Inventory Specification](../spec/effective-tool-inventory.md)
- Work: [Host Effective Tool Inventory](../works/host-effective-tool-inventory/work.md)

## Context

Pi 0.84.2 has no public extension interface that proves which exact tool objects a provider sees or which `execute` closure later runs. `getAllTools()` exposes metadata and `getActiveTools()` exposes names. The concrete shared authority already present in the host is the low-level Agent `context.tools` object array: provider serialization and execution both read those same objects.

Ordinary prompts pass through `before_agent_start`, but `sendCustomMessage({triggerTurn:true})` can enter `_runAgentPrompt()` directly. Later provider turns refresh tools through `prepareNextTurnWithContext`. Consequently the reliable seam is not package registration or `before_agent_start` alone; it is host preparation before `Agent.prompt()`/`createContextSnapshot()` and revalidation before each later-turn context replacement.

Pi delegates TypeScript loading and transformation to jiti and does not expose the exact original/transformed/evaluated bytes or execute-closure identity. Windows loader resolution also provides no canonical cross-alias physical identity guarantee. Earlier draft claims requiring those unavailable observations were therefore unsound.

## Decision

The Pi host will own one effective-tool-inventory module at the Agent tool-context seam. It will:

1. positively classify standard main, custom-prompt Handler child, Herdr pane child, and indeterminate contexts before protected provider exposure;
2. prepare ordinary and triggerTurn-first runs through the common `_runAgentPrompt()` path before `Agent.prompt()` creates the first context;
3. revalidate later provider turns before `prepareNextTurnWithContext` installs their tools;
4. treat each turn's exact `context.tools` objects as authoritative for both provider-visible definitions and execution;
5. use existing configured-order/active-mutation output to select deterministic duplicate winners without a second registry;
6. enforce run/turn generation and security revocation immediately before execution;
7. evaluate one versioned host-owned compatibility-profile interface and expose a non-model-addressable coded result to Harness/Router;
8. preserve original configured path separately from the actual Pi-loader resolved path and compare exact loader-produced strings;
9. treat reviewed path/digest/version evidence only as trusted compatibility admission, not publisher authentication, dependency/runtime attestation, transformed-byte proof, or execute-closure proof.

Runtime sameness is established by object identity: compatibility, provider serialization, lookup, validation, and execution use the same pinned `context.tools` object. It is not established by a file hash or registration ID.

## Decision Drivers

- `context.tools` is the only concrete Pi 0.84.2 object set shared by provider inventory and execution.
- `_runAgentPrompt()` covers ordinary and triggerTurn-first entries; `prepareNextTurnWithContext` is the existing later-turn refresh seam.
- Host-owned generation/revocation checks are required because active-list changes do not retroactively remove an object already visible in the current provider turn.
- Exact host-loader resolved-path matching is truthful; guessed Windows canonical identity is not.
- A small host interface avoids a Harness wrapper, duplicate registry, or package-owned dispatch layer.

## Alternatives Considered

### Exact pre-transform or evaluated jiti byte attestation

Rejected for v1. Pi 0.84.2 does not expose those bytes, dependency graph, or transformation result. Rehashing the current path afterward is not proof of what was evaluated.

### Cross-alias Windows physical identity

Rejected for v1. Current source does not establish case, drive alias, UNC, short-name, symlink, junction, hardlink, or file-ID equivalence. Unsupported equivalence fails closed.

### Package-local wrapper or provenance registry

Rejected. It sees names/metadata rather than the current low-level objects and would duplicate host state while leaving dispatch drift possible.

### Name/schema/description plus package version

Rejected as runtime authority. These fields remain semantic/profile inputs and diagnostics only.

### Immutable tool set for the entire low-level Agent run

Rejected as inconsistent with current Pi lifecycle. Each provider turn has a concrete context snapshot; queued input retains the current snapshot until the later-turn refresh boundary. The contract preserves this behavior and adds revalidation plus execution-time revocation.

## Consequences

Positive:

- Provider-visible definitions and execution closure come from the same exact objects.
- Ordinary, triggerTurn-first, queued, and later-turn behavior is stated against actual Pi seams.
- Security removal and reload can fail closed before side effects without pretending the current snapshot never existed.
- #36 contributes definitions/facts; #3 consumes one host outcome; neither duplicates host routing.
- Compatibility claims are narrow and reproducible.

Negative:

- Pi host/core changes are required; public extension APIs alone cannot implement the contract.
- A current provider turn may retain its ordinary snapshot after non-security changes; security removal requires explicit revocation/generation invalidation.
- Profiles are trusted reviewed compatibility inputs, not cryptographic software attestation.
- Unsupported Windows alias equivalence can reject a semantically identical file reached by a different path.

## Compatibility and Migration

The first profile is `pi-herdr-subagents/subagent_spawn` v1. It records Pi/agent-core versions, platform/runtime, configured/resolved paths, reviewed digest scope, semantic fields, execution options, snapshot binding, and the Router/Harness read path. Existing tool definitions remain the contributor format. No persistent user/task migration is required. Reload starts a new run generation; old callbacks and calls fail stale.

## Revisit Criteria

Reconsider this decision if Pi exposes loader-owned evaluated-byte/dependency identities, signed artifacts, canonical file identity, process-isolated execution, or a stronger native object-capability interface. Any stronger attestation claim requires new authority defining its exact observed bytes, dependency scope, and failure semantics.

## Acceptance Boundary

This ADR, its Specification, and the Host/#36/#3 derived package remain draft, unaccepted, unimplemented, and unexecuted. They require fresh independent review and one later consolidated user confirmation. This document prescribes no confirmation mechanism and creates no review, confirmation, implementation authorization, staging, or commit.

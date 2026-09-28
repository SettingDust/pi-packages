# Early Stable Tool Registration Specification

- Status: withdrawn candidate adapter specification (proposal closed by user decision 2026-09-28); unaccepted; unimplemented
- Date: 2026-08-22
- Host authority: [ADR-0008](../adr/0008-host-owned-effective-tool-inventory.md), [Effective Tool Inventory Specification](effective-tool-inventory.md)
- Proposal: [Harness and Herdr Effective-Inventory Adapters](../proposals/early-stable-tool-registration.md)
- Work: [Early Stable Tool Registration Work](../works/early-stable-tool-registration/work.md)

## 1. Scope

This candidate contract defines only the Harness and Herdr adapter obligations at the Pi host effective-inventory seam:

- Harness: `resolve_delegation` contribution, dynamic definition preparation, host-observable origin inputs, and execute-time validation.
- Herdr: seven `subagent_*` contributions, host-observable pane origin inputs, owner-set preparation, and execute-time validation.

The [Effective Tool Inventory Specification](effective-tool-inventory.md) exclusively owns source anchors, runtime generations, registration identities, Toolbelt/mutator ordering, effective winners, provider-turn snapshots, compatibility outcomes, and pinned dispatch.

## 2. Adapter Interface Requirements

Each owner must expose the minimum host adapter needed to:

1. contribute its complete owned definition set without starting package runtime work;
2. provide current dynamic inputs during host run preparation;
3. expose package launch/origin markers that the host can combine with its own process/session construction facts before provider inventory;
4. declare whether its contribution is atomic as an owner set;
5. retain package-owned JIT validation inside execution.

An adapter must not register a wrapper tool, maintain a parallel effective registry, select a cross-extension winner, or accept model-supplied provenance.

## 3. Global Adapter Invariants

1. Equivalent ordinary-first and trigger-first host preparation must yield equivalent package contributions under equivalent current state.
2. Adapter preparation must finish before the host forms the next provider-turn snapshot.
3. `before_agent_start` may refresh adapter inputs but must not be the only path by which the host obtains a trigger-first contribution.
4. Preparation must perform no task allocation, pane/process creation, settings mutation, network access, or background-resource startup.
5. Rich provider-visible schemas are advisory; package execution must validate current mutable state before side effects.
6. The host, not the package, decides active/visible membership and duplicate winners.
7. Package/version, schema, description, or name must not be presented as host provenance.
8. An adapter failure must be deterministic and must not claim a partially completed atomic owner set.

## 4. Harness Adapter

### 4.1 Owned contribution

Harness owns exactly `resolve_delegation`. Its contribution must preserve the established Resolver input/output, authority-admission, and blocked-result contracts.

### 4.2 Positive eligibility facts

Harness must expose the existing custom-prompt/Handler-child marker early enough for the host to classify before the first `context.tools` snapshot. The host—not Harness—establishes `sessionOrigin` from session construction and applies the authoritative precedence in the Effective Tool Inventory Specification. Missing, conflicting, or late evidence is indeterminate and must not default to eligible.

Harness must not rely on execute-time rejection to repair provider exposure in a child.

### 4.3 Dynamic preparation

For each new host run and each later provider-turn refresh, Harness preparation must supply current model-visible Skill names/descriptions and currently available Role names/descriptions. A stale schema may remain inside an already-formed provider-turn snapshot, but execution must revalidate current Skill, Role, model, thinking, Handoff/reference, and admission state.

A failed preparation must fail closed for Resolver compatibility/visibility under the host contract and must not serialize or launch a Handler.

## 5. Herdr Adapter

### 5.1 Owned contribution

A parent Herdr runtime owns this atomic set:

```text
subagent_spawn
subagent_resume
subagent_inspect
subagent_join
subagent_steer
subagent_cancel
subagent_remove
```

The adapter must construct the complete set before contribution. It must not expose a partial set if one definition cannot be prepared.

### 5.2 Positive eligibility facts

A pane child must expose its host-observed launch marker before extension contribution. The host—not Herdr—establishes `paneOrigin` and applies authoritative classification. A pane child contributes none of the seven parent tools; missing or conflicting origin evidence must not default to parent eligibility.

### 5.3 Dynamic preparation

For each new host run and each later provider-turn refresh, Herdr preparation may supply current Agent and model constraints and current operation descriptions. Preparation may perform bounded read-only discovery/recovery needed to describe current state only where the accepted implementation plan permits; it must not allocate a task or create a tab, pane, monitor, or process.

Immediately before any lifecycle side effect, existing runtime validation must check current Agent, explicit model, task slug, workspace identity, runtime registration, target lifecycle state, and operation input. A stale frozen schema cannot authorize spawn.

## 6. Host Interaction

Package adapters contribute candidates before the host prepares the first Agent context on the common `_runAgentPrompt` path. For later provider turns they refresh before `prepareNextTurnWithContext`. The host runs configured inventory mutators, resolves winners, evaluates compatibility against the exact next `context.tools` objects, and installs those same objects. Adapters must not mutate an installed snapshot.

Same-owner dynamic replacement before freeze is permitted through the host interface. Cross-extension collision behavior is host-owned and tested by the Host acceptance matrix. A package must not rename a tool or re-register repeatedly to steal a winner.

## 7. Failure Contract

| Failure | Adapter behavior |
|---|---|
| eligibility indeterminate | provide no eligible protected contribution; host fails closed |
| dynamic discovery/preparation fails | return deterministic adapter failure; start no work |
| one Herdr definition build fails | contribute no partial seven-tool set |
| mutable Skill/Role/Agent/model disappears after freeze | package JIT validation blocks before delegation/spawn side effects |
| old runtime callback reaches new generation | host `stale_generation` guard rejects before package execute |
| host security revokes a current tool | host `revoked` guard rejects before package execute; later turns omit/re-evaluate |
| host profile/path/digest/semantic mismatch | package must not override or self-attest compatibility |

## 8. Acceptance Conditions

Acceptance is governed by A36-01 through A36-08 in the [Host acceptance matrix](../works/host-effective-tool-inventory/acceptance-matrix.md) and the adapter-specific matrix in the existing #36 Work. Required evidence separates contribution, host-active membership, provider visibility, compatibility, and package execution.

## 9. Non-Goals

No host provenance or dispatch implementation, package-owned effective registry, Toolbelt policy change, backend mapping, new tool name, persistent registration state, #18, #29, #39, unrelated lifecycle repair, staging, or commit is part of this adapter contract.

## 10. Disposition

Withdrawn with the linked Proposal. Sections 1-9 preserve the unimplemented candidate contract and historical ordinary-first/trigger-first, eligibility, and host-guard limits; they are not current implementation requirements or evidence that child `--exclude-tools` filtering supplies host effective-inventory behavior. The independent draft host ADR/Specification are not withdrawn here.

The former acceptance boundary required review and later confirmation of the host/#36 set. That path is no longer active for this adapter candidate.

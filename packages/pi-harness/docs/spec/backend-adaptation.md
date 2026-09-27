# Backend Adaptation Specification

- Status: accepted base contract with selected §3 Herdr dispatch-pacing clarification (not implemented); draft host-compatibility amendment in §§2, 6–8 remains unaccepted and unimplemented
- Host authority candidate: [ADR-0008](../adr/0008-host-owned-effective-tool-inventory.md), [Effective Tool Inventory Specification](effective-tool-inventory.md)

## 1. Inputs

After `resolve_delegation` succeeds, the Router receives:

```yaml
status: resolved
prompt: yaml-handoff
model: provider/model
thinking: configured-thinking-level
```

The Handler is the fixed Agent named `handler`. The Resolver does not discover, select, or call a delegate tool and returns no Handler path or body.

### #42 Accepted Resolved-Selection Source

Under the accepted #42 amendment, `resolved.model` is `provider + '/' + modelId` from the Resolver's exact separate provider/model Registry match, and `resolved.thinking` is the exact selected thinking string. The Resolver selects once from the resolve-time Registry snapshot using both capability dimensions and deterministic surplus ordering. Fresh T5 and independent T6 returned GO with P0-P3 zero. T5 command attribution is config-command `13/22`, config `21/22`, settings-store `19/37`, Extension `6/95`, affected `46/154`, distinct subset `53/81`, focused `94/250`, and full `136/538`; typecheck, import, activation, and execute passed. The canonical 1085-byte LF manifest retains aggregate `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`, while rejected 1095-byte literal-backslash-n aggregate is `3fd52e65a90f2d7eaee47b587e50d467abd2960fdb7ead118131bcfb0ce70525`. Exact selective-commit review is GO; staging and commit remain pending. The backend does not parse the display form, repeat selection, rewrite either field, substitute a candidate, or fall back. This amendment changes no backend source or ownership and makes no live-backend, reload, settings/runtime, Herdr, Pi-core, push, or deployment claim. The unrelated Herdr failure remains outside #42.


## 2. Compatibility Ownership

The Pi host effective-inventory module owns host-observed effective-tool preparation, active winner selection, exact provider-turn `context.tools` snapshots, compatibility-profile evaluation, runtime-generation validity, and dispatch pinning.

Before each delegation, Router/Harness must consume the current provider-turn `context.tools` snapshot's host-issued compatibility outcome for the intended backend profile. They must not establish compatibility from tool name, model-visible schema/description, package/version, model-supplied provenance, or historical source evidence.

A compatible outcome must cover:

1. the exact effective winning tool object in the current provider-turn `context.tools` snapshot and the active runtime generation;
2. the host's semantic compatibility outcome for that object; exact configured/resolved path and reviewed digest values may be included only as compatibility-admission evidence;
3. the fixed `handler` Agent capability;
4. the exact prompt, label, taskSlug, model, and thinking invocation contract;
5. normal dynamic Skill loading and reference read access;
6. stable task identity;
7. Handler Result persistence and return/notification;
8. host dispatch pinning to that same `context.tools` object.

Pi 0.84.2 does not expose the original, transformed, or evaluated jiti bytes, dependency graph, or execute-closure identity. Therefore the host outcome must not claim exact loaded-source-byte attestation, publisher/runtime attestation, or cryptographic closure sameness.

An absent, stale, malformed, or incompatible host outcome blocks before resolution. Package name/version are diagnostic only. Historical research defines expected semantic behavior but never proves the current effective registration.

Compatibility does not create a static Skill allowlist. The Resolver's current model-visible Skill set remains authoritative for Handoff validation.

## 3. `@settingdust/pi-herdr-subagents` Mapping

When the host issues a compatible outcome for the approved `@settingdust/pi-herdr-subagents/subagent_spawn` profile, Router maps one resolved invocation to:

```yaml
subagent_spawn:
  agent: handler
  prompt: resolved.prompt
  label: concise delegated objective
  taskSlug: canonical-task-slug
  model: resolved.model
  thinking: resolved.thinking
```

`taskSlug` is 3-48 lowercase ASCII letters or digits separated by single hyphens and must not begin with `subagent-`. `taskSlug` and `label` are invocation fields, not Handoff, admission, or Resolver fields.

After `resolved`, this call must be the Router's next environment action in the same Router pass. It must not emit prose, call another tool, batch another resolution, or retain the invocation for later. The host dispatches the exact snapshot-pinned winning registration rather than performing a fresh name-only lookup.

A successful launch returns a non-empty stable `subagentId` and active status. For the selected Herdr ready-branch dispatch behavior, the Router may prepare and launch another independent, authorized, nonconflicting branch in the same turn only when the **effective registered** `subagent_spawn` contract and available resources permit a subsequent call. Each branch still uses its own ordered exact `resolve_delegation` -> `subagent_spawn` pair; no batch resolution or simultaneous tool calls are required. If the effective contract still requires ending the turn after the first spawn, the Router ends the turn and waits for notification; unknown or stale overlap permission is not permission to continue. Routine immediate polling/join remains forbidden. The tool description and its focused regression test and README must reflect this conditional rule before it can be used; changing this Specification alone does not change the effective registration or prove live overlap. This amendment changes only Herdr dispatch pacing, not the invocation fields, notification/join lifecycle, resource limits, or another backend's contract.

The accepted [Router evidence-branch scheduling requirements](router-delegation.md#13-evidence-branch-scheduling-and-strategy-loading) remain backend-neutral. A different backend still needs its own compatibility profile and full Result retrieval mapping before use. The draft host-compatibility requirements in sections 2, 6-8 remain unaccepted and unimplemented; this dispatch-pacing decision does not accept them. Deterministic two-active runtime tests and an authorized live Router trace are separate evidence requirements, not claims established by this text.

## 4. Source-Mapping Evidence

[Atomic Router Delegation T1 research](../works/atomic-router-delegation/research.md) is the preserved source mapping for the first backend profile. It documents Agent resolution, invocation forwarding, child instructions/read access, stable task identity, Result persistence, notification, and join.

T1 is an input to defining and reviewing the host semantic profile. It is not source-anchor authority, does not identify the current effective winner, and cannot substitute for the current host compatibility outcome.

A different delegate tool remains possible under ADR-0005, but requires its own approved host compatibility profile and semantic mapping. Router must not improvise one after resolution.

## 5. Launch and Completion

An accepted asynchronous launch exposes enough information for correlation:

```yaml
status: running
taskId: backend-assigned-id
objective: delegated-objective
```

For Herdr, `subagentId` is the stable `taskId`. Completion notification and later join preserve the generation-specific Result under the Router Delegation Specification. Notification delivery remains environment-owned.

## 6. Failure Behavior

| Condition | Router behavior |
|---|---|
| host reports tool unavailable before resolution | `delegation_tool_unavailable`; do not resolve or substitute |
| host reports ineligible runtime, source mismatch, semantic mismatch, or stale pre-resolution outcome | `delegation_contract_incompatible`; include actionable host code; do not resolve |
| generation becomes stale or is revoked after `resolved` at pinned dispatch/execute guard | `delegation_launch_failed`; no name-only fallback or substitution |
| launch lacks stable identity or active status | `delegation_launch_result_invalid`; do not claim running |
| Resolver returns blocked | preserve Resolver code; no launch |
| Handler Result malformed/missing | do not report successful work |

No unavailable model or thinking value may fall back silently. Compatibility, launch failures, Resolver blocks, and Handler Results remain distinct.

## 7. Acceptance Conditions

- The current host compatibility outcome is required before every resolution.
- The exact current-turn `context.tools` object approved by compatibility is the object dispatched and executed; no name-only rebind is allowed.
- Configured/resolved path and reviewed digest values, when present, are compatibility-admission evidence only.
- Pi 0.84.2 source mapping, tool name, schema/description, and package/version alone fail compatibility.
- `resolved` is followed by one exact spawn call as the next action.
- Old generations and changed registrations fail without fallback.
- A model-submitted compatible projection, profile/version, run/turn generation, path/digest, or host code cannot replace the private current-turn outcome or trigger resolution/launch.
- Before resolution, stale outcome maps only to `delegation_contract_incompatible`; after `resolved`, stale/revoked pinned dispatch or execute guard maps only to `delegation_launch_failed`.

## 8. Acceptance Boundary

The host-compatibility amendment in this Specification remains draft, unaccepted, and unimplemented. It requires independent review with the complete host authority package and one later user confirmation of that reviewed set. No interaction mechanism is prescribed, and authoring creates no implementation authorization.

## Host Outcome and Object Binding

The host compatibility outcome is `effective-tool-compatibility/v1`, current-turn scoped, and non-model-addressable. It binds the exact `context.tools` object used for provider serialization and execution plus opaque run/turn generations. Path/digest/version evidence is trusted compatibility admission only; it is not publisher/runtime attestation, jiti evaluated-byte proof, or execute-closure proof.

First-turn preparation runs before `Agent.prompt/createContextSnapshot` on common `_runAgentPrompt`, covering ordinary and triggerTurn-first. Later-turn revalidation runs before `prepareNextTurnWithContext`. Current queued steer/follow-up retains the current tool batch; ordinary changes apply at the later-turn boundary. Host revocation/reload blocks before package side effects.

# Backend Adaptation Specification

- Status: accepted base contract with selected §3 Herdr dispatch-pacing clarification (not implemented)

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


## 2. Compatibility Requirements

Before calling a delegate tool, the Router must establish from the effective tool contract that it can:

1. start independent execution using the fixed `handler` Agent and its instructions;
2. guarantee the exact resolved `prompt`, `model`, and `thinking` values;
3. provide normal dynamic Skill loading and read access to every Handoff reference;
4. return a stable task identity; and
5. return or later make available the full Handler YAML Result.

The package does not prescribe backend argument names. A backend is incompatible when any requirement cannot be established. The Router reports the block and must not omit or replace required values. The Resolver's current model-visible Skill set remains authoritative for Handoff validation.

## 3. `@settingdust/pi-herdr-subagents` Mapping

When the effective `@settingdust/pi-herdr-subagents` tools support the requirements in section 2, Router maps one resolved invocation to:

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

After `resolved`, this call must be the Router's next environment action in the same Router pass. It must not emit prose, call another tool, batch another resolution, or retain the invocation for later.

A successful launch returns a non-empty stable `subagentId` and active status. For the selected Herdr ready-branch dispatch behavior, the Router may prepare and launch another independent, authorized, nonconflicting branch in the same turn only when the **effective registered** `subagent_spawn` contract and available resources permit a subsequent call. Each branch still uses its own ordered exact `resolve_delegation` -> `subagent_spawn` pair; no batch resolution or simultaneous tool calls are required. If the effective contract still requires ending the turn after the first spawn, the Router ends the turn and waits for notification; unknown or stale overlap permission is not permission to continue. Routine immediate polling/join remains forbidden. The tool description and its focused regression test and README must reflect this conditional rule before it can be used; changing this Specification alone does not change the effective registration or prove live overlap. This amendment changes only Herdr dispatch pacing, not the invocation fields, notification/join lifecycle, resource limits, or another backend's contract.

The accepted [Router evidence-branch scheduling requirements](router-delegation.md#13-evidence-branch-scheduling-and-strategy-loading) remain backend-neutral. A different backend still needs to establish section 2 capabilities and its full Result retrieval mapping before use. Deterministic two-active runtime tests and an authorized live Router trace are separate evidence requirements, not claims established by this text.

## 4. Source-Mapping Evidence

[Atomic Router Delegation T1 research](../works/atomic-router-delegation/research.md) preserves source mapping for the Herdr backend. It documents Agent resolution, invocation forwarding, child instructions/read access, stable task identity, Result persistence, notification, and join.

T1 describes expected backend behavior; the Router must still establish the effective tool's contract before use.

A different delegate tool remains possible under ADR-0005, but requires its own capability assessment and Result retrieval mapping. Router must not improvise one after resolution.

## 5. Launch and Completion

An asynchronous launch exposes enough information for correlation:

```yaml
status: running
taskId: backend-assigned-id
objective: delegated-objective
```

A synchronous backend may instead return the completed Result with stable task identity. The Router must recover the full Result without guessing identity in either case.

For Herdr, `subagentId` is the stable `taskId`. Completion notification and later join preserve the generation-specific Result under the Router Delegation Specification. Notification delivery remains environment-owned.

## 6. Failure Behavior

| Condition | Router behavior |
|---|---|
| backend capability or fixed `handler` Agent unavailable before launch | block delegation; do not omit or substitute required values |
| backend launch fails | report backend failure, not a Resolver failure; do not substitute |
| launch lacks stable identity or active status | do not claim running |
| Resolver returns blocked | preserve Resolver code; no launch |
| Handler Result malformed/missing | do not report successful work |

No unavailable model or thinking value may fall back silently. Backend compatibility, launch failures, Resolver blocks, and Handler Results remain distinct.

## 7. Acceptance Conditions

- The effective delegate contract establishes the section 2 capabilities before launch; missing capability blocks without substitution.
- `resolved` is followed by one exact spawn call as the next action.
- The fixed `handler` Agent, exact resolved prompt/model/thinking, stable task identity, and full Handler Result remain verifiable across launch and completion.
- Herdr same-turn branch dispatch requires permission from the effective registered tool contract and available resources; otherwise the Router ends the turn.

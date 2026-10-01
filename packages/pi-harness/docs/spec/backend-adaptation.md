# Backend Adaptation Specification

- Status: accepted base contract with selected §3 Herdr dispatch-pacing clarification (not implemented)
- Resolver raw-return and Router progression amendment: accepted under explicit user confirmation; documentation authority only, not runtime implementation or live bootstrap acceptance.

## 1. Inputs

`resolve_delegation` validates the Router's closed request, resolves the exact Handler invocation, and invokes the selected registered delegate tool in the same call. Its response separates resolution from unclassified nested launch evidence:

```yaml
resolution:
  status: resolved
  prompt: yaml-handoff
  model: provider/model
  thinking: configured-thinking-level
launch:
  tool: configured-registered-tool
  rawReturn: backend-defined nested value
```

`launch` identifies only the selected tool and preserves exactly one of `rawReturn` (the nested tool returned) or `rawError` (the invocation threw). These fields describe the call boundary, not business success. A returned backend error envelope remains `rawReturn`, including its error flags, status, identity, content, and details; it is not rewritten into a thrown error. A thrown error remains error evidence, not a Handler Result. There is no Resolver-derived `launch.status`, `taskId`, or `objective`; backend-provided fields remain inside the raw evidence. Examples are schematic response data, not installed-runtime evidence or a universal backend return schema.

The closed delegate request is `delegate: { name: string, params: object }`. `name` must identify an already registered tool; `params` must be a plain startup object. The Router supplies startup fields such as `label` and canonical `taskSlug`. Resolver-owned protected bindings are exact and collision-free: `agent: handler`, `prompt: resolution.prompt`, `model: resolution.model`, and `thinking: resolution.thinking`. A request that supplies any protected key, duplicates a binding, or has malformed/unknown structure is rejected before execution. The backend remains free to choose its other parameter names and semantics.

`resolution.status: blocked` means no launch was attempted; the response retains the precise resolution code/message and contains no launch evidence. Once invocation is attempted, resolution remains resolved even if the tool returns an error or throws. A raw return value alone proves neither active execution nor successful work. The Resolver preserves available raw return or error evidence without interpreting Handler Result business content, correlating or projecting Results, or advancing work. The Router alone interprets status/evidence under the effective backend contract, obtains and correlates the full Result, projects Todo/Waves state, and releases satisfied dependencies under the [Router Spec](router-delegation.md#launch-evidence-and-router-progression).

For example, a pre-launch reference rejection contains no `launch`:

```yaml
resolution:
  status: blocked
  code: invalid_reference
  message: A required Handoff reference is unreadable.
```

If the Resolver response itself is missing or unusable, absence of `launch` is not proof that no invocation occurred; only an adoptable pre-launch blocked resolution establishes that fact. The Router preserves the available transport/backend evidence and treats unestablished effects as uncertain without synthesizing a Handler Result.

There is no automatic retry, fallback, join, cancel, remove, or lifecycle orchestration. The Router owns semantic eligibility and must establish the effective tool contract before supplying the request.

### #42 Accepted Resolved-Selection Source

Under the accepted #42 amendment, `resolved.model` is `provider + '/' + modelId` from the Resolver's exact separate provider/model Registry match, and `resolved.thinking` is the exact selected thinking string. The Resolver selects once from the resolve-time Registry snapshot using both capability dimensions and deterministic surplus ordering. Fresh T5 and independent T6 returned GO with P0-P3 zero. T5 command attribution is config-command `13/22`, config `21/22`, settings-store `19/37`, Extension `6/95`, affected `46/154`, distinct subset `53/81`, focused `94/250`, and full `136/538`; typecheck, import, activation, and execute passed. The canonical 1085-byte LF manifest retains aggregate `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`, while rejected 1095-byte literal-backslash-n aggregate is `3fd52e65a90f2d7eaee47b587e50d467abd2960fdb7ead118131bcfb0ce70525`. Exact selective-commit review is GO; staging and commit remain pending. The backend does not parse the display form, repeat selection, rewrite either field, substitute a candidate, or fall back. This amendment changes no backend source or ownership and makes no live-backend, reload, settings/runtime, Herdr, Pi-core, push, or deployment claim. The unrelated Herdr failure remains outside #42.


## 2. Compatibility Requirements

Before calling `resolve_delegation`, the Router must establish from the effective registered tool contract that it can:

1. start independent execution using the fixed `handler` Agent and its instructions;
2. accept the exact resolved `prompt`, `model`, and `thinking` values;
3. provide normal dynamic Skill loading and read access to every Handoff reference;
4. return a stable task identity; and
5. return or later make available the full Handler YAML Result.

The Router owns this semantic compatibility/eligibility decision. The Resolver checks request structure and protected bindings but does not apply a second tool-category or registry allowlist.

## 3. `@settingdust/pi-herdr-subagents` Mapping

When the effective Herdr tool supports section 2, Resolver invokes the Router-selected registered tool with the equivalent startup object:

```yaml
agent: handler
prompt: resolved.prompt
label: router-supplied-label
taskSlug: router-supplied-canonical-task-slug
model: resolved.model
thinking: resolved.thinking
```

The displayed `taskSlug` indentation is illustrative YAML; the actual object has `taskSlug` as a sibling of the other fields. Herdr's suffix allocation on repeated slugs remains backend behavior. The Router supplies the tool name and non-protected startup parameters; Resolver supplies the protected values exactly.
`taskSlug` is 3-48 lowercase ASCII letters or digits separated by single hyphens and must not begin with `subagent-`. `taskSlug` and `label` are invocation fields, not Handoff, admission, or Resolver fields.

The Resolver's delegate-tool call is the execution action after resolution. It must not emit prose, call another tool, batch another resolution, or retain the invocation for later. Any permitted background overlap is governed by the effective registered tool contract and resources; it does not change this ordered per-call contract.

For Herdr, the Router recognizes successful active launch only when raw backend evidence establishes a non-empty stable `subagentId` and active status. Resolution success or a returned value alone is insufficient. For the selected Herdr ready-branch dispatch behavior, the Router may prepare and launch another independent, authorized, nonconflicting branch in the same turn only when the **effective registered** `subagent_spawn` contract and available resources permit a subsequent call. Each branch still uses its own ordered exact `resolve_delegation` -> `subagent_spawn` pair; no batch resolution or simultaneous tool calls are required. If the effective contract still requires ending the turn after the first spawn, the Router ends the turn and waits for notification; unknown or stale overlap permission is not permission to continue. Routine immediate polling/join remains forbidden. The tool description and its focused regression test and README must reflect this conditional rule before it can be used; changing this Specification alone does not change the effective registration or prove live overlap. This amendment changes only Herdr dispatch pacing, not the invocation fields, notification/join lifecycle, resource limits, or another backend's contract.

The accepted [Router evidence-branch scheduling requirements](router-delegation.md#13-evidence-branch-scheduling-and-strategy-loading) remain backend-neutral. A different backend still needs to establish section 2 capabilities and its full Result retrieval mapping before use. Deterministic two-active runtime tests and an authorized live Router trace are separate evidence requirements, not claims established by this text.

## 4. Source-Mapping Evidence

[Atomic Router Delegation T1 research](../works/atomic-router-delegation/research.md) preserves source mapping for the Herdr backend. It documents Agent resolution, invocation forwarding, child instructions/read access, stable task identity, Result persistence, notification, and join.

T1 describes expected backend behavior; the Router must still establish the effective tool's contract before use.

A different delegate tool remains possible under ADR-0005, but requires its own capability assessment and Result retrieval mapping. Router must not improvise one after resolution.

## 5. Launch and Completion

The Resolver preserves `resolution` and raw `launch` evidence in one response. An asynchronous backend might return:

```yaml
resolution:
  status: resolved
  prompt: yaml-handoff
  model: provider/model
  thinking: configured-thinking-level
launch:
  tool: configured-registered-tool
  rawReturn:
    subagentId: backend-assigned-id
    status: running
```

Here `subagentId` and `status` belong to the illustrative backend payload, not a Resolver-normalized launch schema. The Router establishes their meaning from the effective backend contract. A synchronous backend may instead return stable identity and the full Handler Result inside `rawReturn`; the Resolver forwards it without parsing or adopting it. The Router reads the full Result using the supported return or retrieval path and applies the correlation and progression rules in the [Router Spec](router-delegation.md#launch-evidence-and-router-progression).

A returned error envelope remains a return, for example:

```yaml
resolution:
  status: resolved
  prompt: yaml-handoff
  model: provider/model
  thinking: configured-thinking-level
launch:
  tool: configured-registered-tool
  rawReturn:
    isError: true
    content:
      - type: text
        text: Backend launch error evidence.
```

This illustrative envelope is interpreted by the Router against the actual tool contract; its error flag does not establish a Handler `failed` Result or absence of effects.

If invocation throws, resolution does not become blocked:

```yaml
resolution:
  status: resolved
  prompt: yaml-handoff
  model: provider/model
  thinking: configured-thinking-level
launch:
  tool: configured-registered-tool
  rawError: backend exception evidence
```

The raw error example does not prescribe an exception serialization or imply that no backend effects occurred. The Router must distinguish proven launch failure or cancellation from uncertain effects. Missing, ambiguous, or contradictory identity/state/Result evidence leaves the affected completion predicate unsatisfied; `uncertain` is Router evidence classification, not a fifth Handler Result status or a Resolver-produced launch status.

For Herdr, the Router uses the backend `subagentId` as stable task identity and retains the applicable generation association. Completion notification and later supported retrieval preserve the full generation-specific Result under the Router Delegation Specification. Notification delivery remains environment-owned; this contract adds no join or lifecycle orchestration.

## 6. Failure Behavior

| Condition | Resolver behavior | Router interpretation/progression |
|---|---|---|
| semantic compatibility/eligibility not established | No delegate request to execute | Do not submit; report the missing contract |
| malformed request, protected collision, or resolution failure | Return precise `resolution.status: blocked`; no launch | Preserve the admission block, distinct from a Handler `blocked` Result |
| nested tool returns an error envelope | Preserve it as `launch.rawReturn` with resolved resolution | Interpret backend failure evidence; do not invent a Handler `failed` Result or infer absent effects |
| invocation throws | Preserve `launch.rawError` with resolved resolution | Determine failure/effect uncertainty from available evidence; no automatic retry or substitution |
| backend reports cancellation | Preserve the raw return/error as received | Record cancellation separately from Handler status; account for known or uncertain effects |
| Resolver response missing or unusable | No adoptable response available to classify | Do not infer no launch; retain available evidence and report uncertain effects |
| launch effect, active state, or identity ambiguous | Preserve raw evidence without synthesizing a status | Report uncertainty; do not claim running/completed or release affected dependents |
| backend terminal but full Result missing/malformed | Preserve raw evidence without Result interpretation | No successful-work claim or completion projection; retain the affected unsatisfied predicate |
| safely correlated Handler `partial`, `blocked`, or `failed` | No business-content interpretation | Project the actual distinct Result status; do not complete or release its dependents |
| safely correlated Handler `completed` | No business-content interpretation | Check required evidence and item/Wave predicates before completion or dependency release |

No unavailable model or thinking value may fall back silently. Resolution rejection, backend error/cancellation, uncertain effects, and Handler Results remain distinct; a call return or backend terminal status cannot manufacture work completion.

## 7. Acceptance Conditions

- The effective delegate contract establishes the section 2 capabilities before the Router submits the closed request; missing capability blocks without substitution.
- Resolver returns resolved resolution plus exactly one raw nested return/error capture after invocation, or precise blocked resolution with no launch before invocation. It does not synthesize launch status, interpret Handler Result business content, correlate/project Results, or advance work.
- Router verification distinguishes returned error envelopes, thrown errors, cancellation, uncertain effects, and missing/malformed/conflicting Results; no such evidence alone proves completion or releases dependents. Full safely correlated Results retain all four statuses, with required evidence and item/Wave predicates checked before release.
- The fixed `handler` Agent, exact resolved prompt/model/thinking, stable task identity, and full Handler Result remain verifiable across launch and completion.
- Herdr same-turn branch dispatch requires permission from the effective registered tool contract and available resources; otherwise the Router does not submit another branch.

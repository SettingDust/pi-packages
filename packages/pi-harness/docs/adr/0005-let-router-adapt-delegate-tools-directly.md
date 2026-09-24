# ADR-0005: Let Router Adapt Delegate Tools Directly

- Status: accepted base decision; draft host-inventory amendment unaccepted and unimplemented
- Date: 2026-08-17
- Amended candidate: 2026-08-22
- Host authority candidate: [ADR-0008](0008-host-owned-effective-tool-inventory.md), [Effective Tool Inventory Specification](../spec/effective-tool-inventory.md)

## Context

The Resolver produces a provider-neutral Handler invocation, while environments may delegate through different tools. A package-owned wrapper or backend registry would duplicate tool schemas and couple `@settingdust/pi-harness` to runtimes it does not own.

The accepted base decision let the Router adapt directly from the currently available tool contract. Later #3 research established a limit: tool name, schema, description, package/version, and historical source mapping cannot prove that the current effective registration is the reviewed implementation or that dispatch will reach that registration.

The draft host authority assigns host-observed effective-tool preparation, exact per-turn `context.tools` snapshots, compatibility evaluation, and dispatch pinning to Pi. It therefore needs a consumer amendment rather than a Harness wrapper.

## Accepted Base Decision

The Router adapts a resolved invocation directly to a compatible environment delegate tool. `@settingdust/pi-harness` does not register a delegate wrapper, callback interface, backend registry, or backend-specific adapter.

A compatible backend must start an independent Handler, guarantee exact resolved model/thinking, apply the fixed `handler` Agent, preserve normal Skill/reference access, return stable task identity, and preserve the Handler YAML Result.

### Accepted Router Workflow Clarification

The user-approved workflow orders Router coordination by visible outcome: (1) identify and present independently observable user-requested outcomes and completion predicates using existing visible coordination surfaces before Skill or Handoff selection; (2) select one executable outcome; (3) resolve its exact one-result Handoff and directly launch the compatible delegate with the unchanged resolved prompt, model, and thinking as the next environment action after `resolved`; (4) receive and truthfully project its Result before deciding on subsequent work. The Router keeps separate execution and terminal states for independent user results even if it later combines reporting. Internal checks for one bug or alternatives for one comparison may share one outcome when they serve one terminal predicate. This does not alter authorization, the fixed `handler` Agent, closed Handoff/admission schemas, Result ownership, or failure recovery. See the [Router Delegation Specification](../spec/router-delegation.md#11-generic-single-result-delegation-contract) and [PRD](../prd/router-delegation.md).

Independent outcomes may run concurrent resolve-to-spawn chains only on positively proven current Host/tool-call parallel capability and without conflicting inputs, outputs, writes, dependencies, ownership, authority, behavioral contracts, or side effects. Shared read-only sources alone are not a conflict. Distinct outcomes writing the same file remain distinct and serialize; unavailable, stale, incompatible, or ambiguous capability also falls back to serial execution. This remains a Router judgment, not a new scheduler or Host capability claim.

## Draft Amendment: Consume Host-Issued Compatibility

If accepted and implemented, the proposed Pi host effective-inventory module would own host-observed effective-tool preparation, active winner selection, exact per-turn `context.tools` snapshots, compatibility-profile evaluation, runtime-generation validity, and dispatch pinning. Neither the accepted workflow clarification nor the current base decision establishes that Host capability.

For each Router pass, Harness and Router must consume the compatibility outcome issued by the host effective-inventory snapshot for the selected backend profile. They must not independently authenticate provenance from model-visible name/schema/description, package/version, a source path supplied by the model, or historical research.

A compatible host outcome means that the current provider-turn `context.tools` snapshot contains the exact effective winning tool object, the host has evaluated the approved semantic compatibility profile for that object, the active run/turn generations are valid, and dispatch remains pinned to that same object. The outcome is valid only for that current snapshot. The host may also report exact configured/resolved path and reviewed digest compatibility evidence; Pi 0.84.2 does not expose the original, transformed, or evaluated jiti bytes, dependency graph, or execute-closure identity, so those fields must not be described as loaded-byte or closure attestation.

Historical source research remains the semantic mapping used to define the host profile. It is not current-registration provenance and cannot substitute for a host-issued compatible outcome.

After compatibility is established and `resolve_delegation` returns `resolved`, the Router still maps directly to the same delegate tool as its next environment action. No wrapper, second lookup, compatibility callback, or adapter registry is introduced.

## Consequences

For the accepted workflow clarification, independent results and their terminal states remain visible before combined reporting, while direct delegation stays unchanged. The Router must track and serialize conflicting outcomes even when one final response reports them together.

The following consequences apply only to the unaccepted host-consumer amendment:

Positive:

- Harness would stay independent of delegate implementation code.
- Compatibility assessment and dispatch would refer to one exact host-pinned winner.
- The Router would consume a coded host outcome before one exact mapping.
- T1 backend research would remain useful without being overstated as provenance.

Negative:

- The amended behavior would depend on host support from ADR-0008.
- A missing, stale, incompatible, or malformed host outcome would block before resolution even when the visible schema appears suitable.
- A different backend would need an approved host compatibility profile before use.

## Revisit

Revisit the accepted workflow if direct delegation can no longer preserve exact resolved invocation or visible outcome/Result correspondence; any Host-issued compatibility requirement remains a separate draft decision until accepted.

## Non-Goals

No wrapper, package registry, retry, fallback, queue, automatic join, backend source change, publisher attestation, full dependency hash, #18, #29, #39, unrelated lifecycle change, staging, or commit is authorized here.

## Amendment Acceptance Boundary

The base decision remains historical accepted authority. The host-consumer amendment is draft, unaccepted, unimplemented, and becomes authoritative only after independent review of the complete host authority package and one later user confirmation of that reviewed set. This ADR prescribes no confirmation mechanism; editing it creates no acceptance or implementation authorization.

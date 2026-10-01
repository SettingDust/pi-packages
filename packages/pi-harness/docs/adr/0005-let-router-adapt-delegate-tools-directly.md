# ADR-0005: Let Router Adapt Delegate Tools Directly

- Status: accepted
- Date: 2026-08-17
- Resolver raw-return and Router progression amendment: accepted under explicit user confirmation; documentation reconciliation only, not runtime implementation or live bootstrap acceptance.

## Context

The Resolver produces a provider-neutral Handler invocation, while environments may delegate through different tools. A package-owned wrapper or backend registry would duplicate tool schemas and couple `@settingdust/pi-harness` to runtimes it does not own.

## Decision

The Router selects a registered delegate-tool name and startup parameters after establishing semantic eligibility from the effective tool contract. The Resolver directly invokes that selected tool after structural validation and exact protected binding. `@settingdust/pi-harness` does not register a delegate wrapper, callback interface, backend registry, or arbitrary-tool executor.

A compatible backend must start an independent Handler, guarantee exact resolved model/thinking, apply the fixed `handler` Agent, preserve normal Skill/reference access, return stable task identity, and preserve the Handler YAML Result. Router establishes this semantic eligibility; Resolver validates the closed `delegate.name`/`delegate.params` shape, rejects protected collisions, binds exact `agent`, `prompt`, `model`, and `thinking`, and calls the selected registered tool. If any required capability cannot be established, the Router blocks rather than silently degrading. Resolver does not choose an alternate tool, apply a second category allowlist, retry, or manage lifecycle.
Router adaptation remains construction of the eligible delegate request; Resolver execution is validation, exact binding, and invocation, not ownership of the backend or workflow. After invoking the tool, the Resolver returns resolution plus raw launch return or error evidence under the [Backend Adaptation Spec](../spec/backend-adaptation.md); it does not interpret Handler Result business content, normalize backend status into a Handler outcome, or advance work. The Router interprets launch status/evidence, correlates the full Result, projects Todo/Waves state, verifies predicates, and releases only satisfied dependencies under the [Router Spec](../spec/router-delegation.md#launch-evidence-and-router-progression). This refines the existing direct-adaptation decision without introducing a wrapper or a new decision lifecycle.

### Accepted Router Workflow Clarification

The user-approved workflow orders Router coordination by visible outcome: (1) identify and present independently observable user-requested outcomes and completion predicates using existing visible coordination surfaces before Skill or Handoff selection; (2) select one executable outcome; (3) supply its exact one-result Handoff plus the Router-eligible registered delegate-tool request, letting Resolver validate and execute the selected tool with the unchanged resolved prompt, model, and thinking; (4) receive and truthfully project its Result before deciding on subsequent work. The Router keeps separate execution and terminal states for independent user results even if it later combines reporting. Internal checks for one bug or alternatives for one comparison may share one outcome when they serve one terminal predicate. This does not alter authorization, the fixed `handler` Agent, closed Handoff/admission schemas, Result ownership, or failure recovery. See the [Router Delegation Specification](../spec/router-delegation.md#11-generic-single-result-delegation-contract) and [PRD](../prd/router-delegation.md).

The earlier clarification constrained simultaneous Resolver execution calls to positively proven Host/tool-call parallel capability. Under the later accepted [evidence-branch scheduling amendment](../spec/router-delegation.md#13-evidence-branch-scheduling-and-strategy-loading), each ready outcome still uses one ordered Resolver execution call; independent Handlers may overlap in the background after successive calls only when the effective delegate tool contract and resources allow it. Shared read-only sources alone are not a conflict. Distinct outcomes writing the same file remain distinct and serialize, as do dependency, ownership, authority, behavioral-contract, and side-effect conflicts. Unknown or ambiguous capability requires serial execution under the actual contract or a block. The Router loads its coordination-only strategy before new delegation; it does not delegate that role to a Handler. This is a scheduling decision, not approval of a new interface or evidence that the present Herdr tool description permits multiple same-turn launches.

## Consequences

The package remains independent of delegate runtimes when their contracts are clear. Compatibility assessment remains a Router responsibility and depends on the effective delegate contract. Backend lifecycle, cancellation, retry, capacity, isolation, and notification transport stay outside Harness.

The accepted workflow keeps independent results and their terminal states visible before combined reporting. Resolution rejection, launch error or cancellation, uncertain effects, and Handler `partial`, `blocked`, and `failed` remain distinct; none proves completion or releases dependents. The Router tracks and serializes conflicting outcomes even when one final response reports them together.

## Revisit

Revisit the accepted workflow if direct delegation can no longer preserve exact resolved invocation or visible outcome/Result correspondence.

## Non-Goals

No wrapper, package registry, retry, fallback, queue, automatic join, backend source change, #18, #29, #39, unrelated lifecycle change, staging, or commit is authorized here. A separate integrated delegation tool and an `invocationRef` are still alternative unaccepted interface designs, not consequences of the scheduling amendment; direct invocation within the existing Resolver contract does not select either design.

# ADR-0011: Opt-In, Bounded In-Process Observation with a Privacy Allowlist

- Status: withdrawn by the user; historical acceptance retained, no current observation obligation
- Date: 2026-10-08 (original acceptance)
- Decision identity: `in-process-observation-privacy-v1`
- Historical acceptance basis: the user compared the alternatives and accepted direction A, including the observation boundary recorded here. Exact technical parameters remained undecided.
- Withdrawal basis: the user's subsequent explicit instruction, “不需要观测” (observation is not needed), cancels the previously accepted, not-yet-implemented observation requirement.
- Delivery boundary: record the withdrawal only; do not implement observation, collect observation data, or provide an observation enablement or viewing entry point under this ADR.
- Related: [Router Delegation PRD](../prd/router-delegation.md#stable-delegation-and-protected-result-reading), [Router Delegation Specification](../spec/router-delegation.md#1-boundary-and-trust-ownership), [ADR-0001](0001-router-resolver-handler-boundaries.md#decision), [ADR-0002](0002-structured-handoff-and-yaml-results.md#decision).

## Withdrawal and current authority

The user has withdrawn the need for observation. The earlier acceptance is retained as history, but its observation decision is no longer current authority. There is no current obligation under this ADR to implement observation, collect or retain measurements, expose enable/disable or viewing entry points, resolve the historical observation Spec gaps, or perform the historical runtime acceptance checks. The conclusion for the cancelled requirement is **do not implement observation**; default-off operation is not a reason to retain an obligation to build it.

The withdrawal records the same decision lifecycle and identity. It selects no replacement architecture and has no superseding ADR. ADR-0002 retains ownership of structured messages and protected Result reading; this withdrawal changes none of its decisions.

The related PRD and Router Specification require their owners to remove observation from current goals, requirements, unresolved parameters, and acceptance criteria wherever still present. Their reconciliation is outside this ADR-only change. References to those documents in the historical record describe the authority at acceptance and do not reinstate the cancelled requirement.

## Decision history

- **2026-10-08 — accepted:** direction A established a default-off, bounded in-process observation boundary with a measurement allowlist. The decision was accepted but not implemented.
- **Subsequent user instruction — withdrawn:** the user explicitly stated “不需要观测”. This authorized withdrawal removes current observation obligations while preserving the acceptance record. The supplied instruction gives no withdrawal date; none is inferred here.

Reconsider observation only if the user explicitly accepts a renewed requirement and the owning authority is reconciled. The historical alternatives, gaps, rollback conditions, and revisit criteria below do not themselves authorize or require renewed work.

## Historical accepted record (non-operative)

Everything below, from **Context and ownership** through **Rollback and revisit criteria**, preserves the original decision, rationale, alternatives, consequences, and verification limits. All requirement language in that record is historical and withdrawn, including implementation, collection, controls, Spec reconciliation, runtime verification, and operational rollback obligations. It must not be treated as a current delivery requirement.

## Context and ownership

The accepted direction A needs a way to observe local reading and actual SDK usage without retaining delegated content or creating a new tracking surface. The [product requirements](../prd/router-delegation.md#required-product-behavior) already require default-off, bounded process-local observation, unavailable metrics reported as `unknown`, and no telemetry persistence or additional network reporting.

This is a distinct decision lifecycle for observation privacy, retention, and evidence limits. ADR-0002 continues to own structured Handoff and four-state YAML Result messages, including any separately authorized stable-rendering amendment; this record neither rewrites nor supersedes that owner. ADR-0001 and the Router Specification continue to own business judgment, permissions, Result adoption, and dependency release. Observation is not a source of authority for any of those decisions.

## Decision drivers

- Minimize content exposure and avoid durable identity or cross-task tracking.
- Keep optional measurements bounded and disposable, independent of delegation correctness.
- Distinguish locally measured quantities from actual SDK evidence and unavailable data.
- Avoid claiming provider cache behavior or savings from stable rendering, byte length, or local timing.
- Preserve existing document owners while leaving unaccepted implementation choices to the owning Spec.

## Decision

1. **Off by default.** Observation requires explicit enablement. While disabled, it collects and retains no observation data.
2. **Only the accepted measurement allowlist.** When enabled, retain only bounded in-process memory data for byte lengths, read counts, local elapsed time, and actual token/cache usage supplied by the SDK. This is a category-level boundary, not a field schema. Anything outside this allowlist is excluded by default.
3. **No content or identifying metadata.** Do not record prompts, Results, images, paths, path markers, task labels, or provider identity. Do not introduce session, task, or provider identifiers, identity registration, hashes or salts for tracking, persistent hashes, or cross-task association. Hashing or pseudonymizing excluded information does not make it admissible observation data. Existing identities used by the delegation contract are not imported into observation.
4. **No telemetry persistence or new reporting network.** Observation writes no telemetry to disk and adds no network reporting. This restriction concerns the observation data, not the existence of this decision document or existing authorized delegation artifacts.
5. **Truthful evidence.** Missing SDK metrics are `unknown`, never zero, estimated token/cache usage, or inferred cache hits. Local byte lengths, read counts, and elapsed time remain distinct from measured SDK usage. Actual cache rates require actual SDK measurements sufficient to establish them; local length or timing is not a provider cache hit. Reporting `unknown` does not require a new SDK/provider feature or justify collecting excluded data. No token, cost, latency, or cache benefit is promised.
6. **Disposable lifecycle.** Disabling observation or ending the session clears the retained observation data. No observation history is persisted or restored, and no cross-task correlation is introduced. The precise bounds, retention mechanics, and control entry point remain for Spec reconciliation.
7. **Non-authoritative and non-disruptive.** Disabled observation, unavailable metrics, or observation failures must not change delegation validation, permissions, exact invocation, Result reading/adoption, Handler status, or dependency judgment. Observation failure cannot become business failure or success evidence, bypass a safety check, substitute for full Result reading, or trigger persistence/network reporting as a fallback. Existing delegation failures and missing Result evidence retain their existing semantics.

## Alternatives considered

- **A: bounded, opt-in in-memory observation.** Selected. It permits the accepted local measurements and actual SDK evidence while minimizing retention and keeping the delegation contract independent of observation. Its ceiling is intentionally disposable, non-identifying data rather than durable trend analysis.
- **B: persistent statistics.** Not selected. Persistence retains observation beyond the accepted lifecycle and expands privacy and identity obligations; it is outside the accepted process-local boundary. B's broader canonical-envelope and layered-material direction was also not selected. This ADR creates no envelope, layered storage, persistent identity/version registry, or substitute tracking scheme.

These alternatives come from the accepted comparison. This record adds no new comparative trial or measured cache-benefit claim.

## Consequences and compatibility

Positive: the default produces no observation data; the opt-in surface is small, bounded, and cleared with its lifecycle. Measurements can be reported without capturing source content or tracking identities, and missing SDK evidence stays visible rather than being manufactured.

Costs and limits: there is no durable observation history, per-provider/task tracking, cross-task analysis, or recovery of cleared observations. SDK availability may leave token/cache measurements unknown. In-memory observation still needs a verifiable bound and lifecycle clearing; this decision alone proves neither implementation nor privacy conformance.

The Handoff/Result schemas, admission and permission boundaries, exact forwarding, backend identity used for safe Result correlation, and Router-only business judgments remain unchanged. No runtime migration, configuration key, control command, dependency, or SDK/provider extension is selected here. In particular, the prohibition on observation identities does not remove identities required by existing protected Result reading and correlation.

## Spec gaps and delivery boundary

The [Router Specification](../spec/router-delegation.md) remains the owner of delegation behavior and its preserved responsibility boundaries. The [PRD's unresolved technical parameters](../prd/router-delegation.md) remain unresolved. Before dependent implementation planning, technical authority must reconcile the observation contract under that owner without silently selecting new product or architectural behavior.

Still to be specified and verified:

- Exact capacity, bounding/retention behavior, and behavior at the bound.
- Measurement fields and units, byte accounting, and representation of unavailable data.
- Actual SDK metric sources, availability, and sufficiency for any token/cache-rate claim; no new provider capability is assumed.
- The explicit enable/disable control entry point and lifecycle clearing/failure contracts that preserve delegation correctness.

This ADR accepts none of those concrete choices. It changes no PRD, Spec, other ADR, index, plan, code, or configuration and grants no implementation or runtime activation permission.

## Verification boundary

Local document, link/anchor, diff, and persisted-byte checks establish only this ADR's delivery. Later implementation verification must demonstrate default-off emptiness, bounded allowlisted memory when enabled, truthful `unknown` handling, clearing on disable/session end, absence of excluded content/identities and telemetry disk/network effects, and unchanged delegation correctness on observation failure. Those runtime checks have not been performed by this record.

## Rollback and revisit criteria

The operational rollback boundary is to disable observation and clear its retained memory while leaving delegation behavior intact; this is a requirement for later implementation, not an action performed here. If a future implementation cannot preserve the allowlist, bound, clearing lifecycle, or correctness separation, observation must not remain enabled by weakening those constraints.

Revisit or supersede this decision if an evidenced need requires durable statistics, identity-based or cross-task analysis, telemetry disk/network reporting, or broader measurement categories; if SDK evidence cannot support a proposed cache claim; or if the privacy/lifecycle contract cannot be implemented without a different accepted boundary. Broader collection or retention requires an explicitly accepted decision and owning Spec reconciliation, not a capacity/schema detail or implementation shortcut.

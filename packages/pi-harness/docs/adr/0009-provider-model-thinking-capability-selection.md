# ADR-0009: Provider/Model/Thinking Capability Selection

- Status: accepted current decision; implementation, fresh T5 verification, and independent T6 review complete; exact selective-commit review GO; commit pending
- Date: 2026-08-26
- Decision identity: `#42-provider-model-thinking-capability-selection-v1`
- Related: [#42 PRD](../prd/provider-model-thinking-capability-selection.md), [#42 Specification](../spec/provider-model-thinking-capability-selection.md), [Router Delegation PRD](../prd/router-delegation.md), [Router Delegation Specification](../spec/router-delegation.md)

## Context

The accepted baseline in [ADR-0003](0003-user-model-roles.md) stores named Model Roles containing one model and thinking value. #42 requires a clean break from that selection model. The Router must state only the capability investment needed for a delegation; the Resolver must choose a currently usable provider/model/thinking candidate without exposing provider details in the Handoff or relying on a role name.

The inspected package surfaces are `src/config.ts`, `src/settings-store.ts`, `src/config-command.ts`, `src/protocol.ts`, `extensions/pi-harness.ts`, and related tests. Existing Global/trusted-Project scope, unrelated-key preservation, and `proper-lockfile` are compatibility constraints. The backend receives resolved model/thinking values and remains unchanged.

## Decision

#42 completely replaces the old Role-based selection authority. Configuration is nested under `harness.candidates`: each exact `providerModelKey := provider + '/' + modelId` is split at the first slash only; `provider` and `modelId` must both be non-empty and contain no control characters, `provider` must not contain a slash, and `modelId` may contain later slashes and dots. The Pi Registry is addressed by separate exact provider and modelId fields. Last-slash parsing, dot parsing, and parsing the display form are forbidden. Each thinking entry contains only non-negative integer `reasoning` and `impact` fields. There is no `harness.version`.

A candidate's canonical complete identity is the structured tuple `(provider, modelId, thinking)`. For deterministic ordering, encode it as `JSON.stringify([provider, modelId, thinking])` using the exact strings and ordinary lexicographic comparison. This is mechanically reversible and avoids parsing the display form `provider/modelId.thinking`; the display form is derived only for diagnostics and resolved metadata.

The Resolver root carries top-level non-negative integer `reasoning` and `impact`; the Handoff carries neither model information nor capability requirements. A candidate qualifies only when both capabilities meet the request. Select the ordered tuple:

1. `candidate.impact - request.impact` ascending;
2. `candidate.reasoning - request.reasoning` ascending;
3. canonical complete candidate identity lexicographically ascending.

The selected provider/model and thinking pass through unchanged. There is no silent fallback, cross-provider fallback, migration, ignore behavior, or automatic replacement.

The old `roles`/`modelRole` format, unknown fields, raw duplicate JSON keys before normalization, duplicate canonical `(provider, modelId, thinking)` tuples, malformed candidates, invalid numbers, unavailable candidates, and no qualified candidate fail closed with explicit manual replacement required. Numeric validation requires finite non-negative integers. Rejection precedence is: structural parse/type, raw duplicate/unknown/duplicate-canonical-tuple shape, legacy fields, then numeric validation; within numeric validation, non-number/non-finite precedes non-integer, which precedes negative. Unknown fields or invalid configuration shapes—including a mixture with `roles` or `modelRole`—remain `invalid_configuration` and must not be downgraded to legacy; only pure recognized legacy configuration is `legacy_configuration`. Missing required numbers are invalid. The parser-level procedure must inspect raw object entries and reject duplicate JSON keys before object normalization; fixtures must separately prove raw duplicate-key and duplicate canonical-tuple rejection. Canonical tuple formation uses the exact first-slash parse and exact thinking string only; it performs no trim, case folding, aliasing, dot parsing, last-slash parsing, display parsing, or other normalization. Existing Handoff/reference/admission legality precedence remains in force before candidate selection.

The Router receives a semantic 0..3 scale with examples, but the scale is request vocabulary, not a workflow-phase taxonomy. Research and implementation phases have no fixed levels.

Dynamic resolver schema generation does not read the Registry, filter configured candidates by availability, or attest configured candidate availability. It exposes only the closed root request shape and relevant static descriptions. During one resolve execution, after structural and numeric validation and before qualification and selection, the Resolver reads the Pi model Registry exactly once. That observation is the only authoritative snapshot for all candidate availability and thinking-support checks. No schema-time Registry observation, second read, or implicit retry is permitted.

## Rationale

Capability requirements belong to the Router's current work request, while concrete provider/model/thinking selection belongs to the Resolver's current environment. Comparing both surplus dimensions prevents over-investment; the canonical structured identity makes equal-capability choices reproducible without ambiguous parsing, insertion-order dependence, or a second policy.

A clean break is smaller and safer than a compatibility layer: retaining Roles would create two grammars and ambiguous precedence. Explicit replacement makes stale or malformed configuration visible instead of silently changing execution.

## Supersession and reconciliation

This ADR supersedes the model-role storage and selection decision in ADR-0003. ADR-0003 is superseded for that portion while retaining its historical rationale and compatible Global/trusted-Project, lock, malformed-file, and explicit-confirmation protections as restated by #42.

The dependent artifacts carry the accepted reconciliation required by this ADR: ADR-0001 replaces Router/Resolver Model Role wording with root capability requests and Resolver candidate selection; the Router Delegation PRD and Specification replace Role selection and unavailable-Role language with capability candidate resolution while preserving Handoff exclusion and Router confirmation/coordination ownership; Protocol Prototype replaces Role fixtures/assertions with nested candidates, parser-level duplicate fixtures, integer validation, single-snapshot availability, and canonical-identity ordering; Backend Adaptation identifies #42 as the accepted source of exact resolved model/thinking while preserving pass-through and backend neutrality. Fresh T5 and independent T6 returned GO with P0-P3 zero. T5 command attribution is config-command `13/22`, config `21/22`, settings-store `19/37`, Extension `6/95`, affected `46/154`, distinct subset `53/81`, focused `94/250`, and full `136/538`; typecheck, import, activation, and execute passed. The canonical 1085-byte LF manifest retains aggregate `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`; rejected 1095-byte literal-backslash-n aggregate is `3fd52e65a90f2d7eaee47b587e50d467abd2960fdb7ead118131bcfb0ce70525`. Implementation, validation, and final review are complete; exact selective-commit review is GO. Staging and commit remain pending, and no live backend, reload, settings/runtime, Herdr, Pi-core, push, or deployment behavior is claimed. The unrelated Herdr failure remains outside #42.


## Alternatives considered

- **Retain named Model Roles:** rejected for #42; it preserves provider coupling and cannot express independent capability requirements.
- **Migrate old Roles automatically:** rejected; migration can change user intent and makes clean-break precedence ambiguous.
- **Ignore old fields or fall back to a default candidate:** rejected; invalid configuration must be visible and fail closed.
- **Use only one capability dimension or a weighted score:** rejected; both dimensions are required and the settled lexicographic surplus rule is deterministic without an arbitrary weight.
- **Parse a display key by delimiters:** rejected; provider/model ID or thinking strings can make delimiter parsing ambiguous. The structured tuple encoding is the ordering identity.
- **Read the Registry repeatedly or retry implicitly:** rejected; one resolve-time snapshot provides one authoritative decision boundary.
- **Add `harness.version`:** rejected; the clean-break format has no version discriminator.

## Consequences

Positive: Handoffs stay provider-neutral; selection is deterministic and explainable; requests are semantic integers; exact backend pass-through is preserved; settings scope and locking can be reused; no backend or dependency change is needed.

Negative: Existing Role configuration requires explicit manual replacement; the config UI and Resolver schema change together; unavailable Registry entries can block a request; dependent accepted documents need explicit reconciliation before implementation.

## Revisit criteria

Revisit if provider/model/thinking must be selected by user preference rather than minimum capability surplus, if capability dimensions acquire different semantics, if migration becomes explicitly required, if candidate strings need a broader grammar than the reversible tuple supports, or if the backend cannot preserve exact pass-through. Any such change requires a fresh reviewed authority decision.

## Acceptance boundary

This ADR is the accepted current #42 decision and activates the defined partial supersession of ADR-0003. The bounded implementation, fresh T5 verification, and independent T6 review are complete with GO and P0-P3 zero. Exact selective-commit review is GO; staging and commit remain pending. Backend, Pi core, reload, settings/runtime mutation, deployment, and the unrelated Herdr failure remain excluded.

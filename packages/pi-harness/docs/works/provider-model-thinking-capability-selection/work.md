# Work: #42 Provider/Model/Thinking Capability Selection

- Status: completed bounded delivery; fresh T5 GO and independent T6 GO reconciled; exact selective-commit review GO; commit pending

- Updated: 2026-08-26
- Nature: derived coordination material; not authority or acceptance evidence
- Decision identity: `#42-provider-model-thinking-capability-selection-v1`

## Objective

Coordinate the accepted package-local clean break from Role-based model selection to deterministic provider/model/thinking capability selection. This Work records derived delivery status and evidence; authority remains in the linked PRD, ADR, and Specification.

## Authority

- [PRD](../../prd/provider-model-thinking-capability-selection.md)
- [ADR](../../adr/0009-provider-model-thinking-capability-selection.md)
- [Specification](../../spec/provider-model-thinking-capability-selection.md)

Related authority accepted as the #42 amendment:

- [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md)
- [Router Delegation PRD](../../prd/router-delegation.md)
- [Router Delegation Specification](../../spec/router-delegation.md)
- [Protocol Prototype](../../spec/protocol-prototype.md)
- [Backend Adaptation Specification](../../spec/backend-adaptation.md)
- superseded model-role portions of [ADR-0003](../../adr/0003-user-model-roles.md)

The complete #42 authority set and amendments passed fresh authority review with GO and P0-P3 all zero and were explicitly accepted. T2-T4 implementation and the bounded P1 repair remain frozen on the exact ten technical paths. Fresh T5 verification records P0-P3 zero with exact command attribution; independent T6 review records GO with P0-P3 zero. Implementation, validation, and final review are complete. Exact selective-commit preparation is authorized, but no staging, commit, reload, push, settings, runtime, or backend operation was performed.

## Exact implementation path scope

The accepted implementation boundary is:

- `packages/pi-harness/src/config.ts`
- `packages/pi-harness/src/settings-store.ts`
- `packages/pi-harness/src/config-command.ts`
- `packages/pi-harness/src/protocol.ts`
- `packages/pi-harness/extensions/pi-harness.ts`
- `packages/pi-harness/tests/config.test.ts`
- `packages/pi-harness/tests/settings-store.test.ts`
- `packages/pi-harness/tests/config-command.test.ts`
- `packages/pi-harness/tests/protocol.test.ts`
- `packages/pi-harness/tests/extension.test.ts`

The seven #42 documents and six dependent authority documents are the documentation outputs for this reconciliation unit. Only those thirteen paths may change in this unit. Source, tests, settings, backend packages, `@settingdust/pi-herdr-subagents`, Pi core/Host, dependencies, runtime, sessions, and Git operations are excluded.

## Contract checkpoint

The implementation contract is: nested `harness.candidates[providerModelKey][thinking]`; split `providerModelKey` at the first slash only; non-empty provider/model ID without control characters; no slash in provider; slash and dot permitted in model ID; separate exact Registry field lookup; only exact known fields; raw duplicate JSON keys rejected before object normalization; duplicate canonical `(provider, modelId, thinking)` tuples rejected; exact thinking keys, including `__proto__`, retained as own data properties; no trim, case folding, aliasing, dot parsing, last-slash parsing, display parsing, or other normalization; finite non-negative integer capabilities and requests; non-integers rejected before negative values; root request fields only; Handoff free of model and capability fields; dynamic schema limited to the closed root request shape and relevant static descriptions with no Registry read, candidate availability filtering, or availability attestation; both-capability qualification; impact surplus, reasoning surplus, then reversible `JSON.stringify([provider, modelId, thinking])` ordering; exactly one authoritative Registry snapshot read during resolve after structural/numeric validation and before qualification/selection; exact pass-through; and explicit manual-replacement fail-closed behavior for old Roles and every invalid, unavailable, or insufficient configuration. Configuration classification preserves `invalid_configuration` for mixed unknown-plus-legacy or invalid-shape input before pure recognized `roles`/`modelRole` is classified as `legacy_configuration`.

## Current evidence

The P1 repair evidence records default-loader raw-duplicate preflight rejection before Registry read or Resolver selection (zero each), plus a runtime regression for both trusted and untrusted scope. Independent validation records P0/P1/P3 PASS and requires only this narrow P2 evidence correction. Supplied package/source observations are config-command `13/13` (`22` assertions), affected `46/46` (`154` assertions), focused `94/94` (`250` assertions), and full `136/136` (`538` assertions); package typecheck, import, activation, and execute passed. The exact `__proto__` thinking key remains an own enumerable data property without prototype pollution or normalization. The canonical ten-file candidate remains frozen at the 1085-byte LF manifest with aggregate SHA-256 `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`; its rows and executable reproduction are recorded in [Context](context.md#canonical-frozen-candidate-manifest). The rejected 1095-byte literal-backslash-n construction reproducibly hashes to `3fd52e65a90f2d7eaee47b587e50d467abd2960fdb7ead118131bcfb0ce70525`; it is not canonical candidate evidence. An unrelated Herdr failure remains outside #42.


This is package/source-level evidence only: it does not claim live backend behavior, reload, settings/runtime mutation, Herdr verification, Pi-core changes, staging, commit, push, deployment, or live runtime completion. The unrelated Herdr failure remains outside #42.

## Current gate

Fresh T5 verification and T6 independent read-only correctness, security, and evidence review are complete with GO and P0-P3 all zero. Implementation, validation, and final review are complete. Exact selective-commit review is GO; commit remains pending and no Git operation was performed.

## Stop rules

Stop before implementation if cross-document reconciliation, numeric/rejection precedence, nested grammar, raw duplicate-key or duplicate canonical-tuple policy, zero-read schema semantics, one-snapshot resolve semantics, stable block codes, or explicit replacement behavior is materially ambiguous. Stop if a proposed change requires backend, Herdr, Pi core/Host, dependency, settings/runtime, or Git work.

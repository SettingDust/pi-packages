# #42 Provider/Model/Thinking Capability Selection PRD

- Status: accepted current product authority; implementation, fresh T5 verification, and independent T6 review complete; exact selective-commit review GO; commit pending
- Date: 2026-08-26
- Decision identity: `#42-provider-model-thinking-capability-selection-v1`
- Related: [Router Delegation PRD](router-delegation.md), [#42 ADR](../adr/0009-provider-model-thinking-capability-selection.md), [#42 Specification](../spec/provider-model-thinking-capability-selection.md)
- Supersession note: #42 replaces the model-role selection portions of [ADR-0003](../adr/0003-user-model-roles.md). ADR-0001, the Router Delegation PRD/Specification, [Protocol Prototype](../spec/protocol-prototype.md), and [Backend Adaptation Specification](../spec/backend-adaptation.md) contain the accepted #42 reconciliation. Fresh T5 and independent T6 returned GO with P0-P3 zero. T5 command attribution is config-command `13/22`, config `21/22`, settings-store `19/37`, Extension `6/95`, affected `46/154`, distinct subset `53/81`, focused `94/250`, and full `136/538`; typecheck, import, activation, and execute passed. The 1085-byte LF manifest aggregate is `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`; rejected 1095-byte literal-backslash-n aggregate is `3fd52e65a90f2d7eaee47b587e50d467abd2960fdb7ead118131bcfb0ce70525`. Implementation, validation, and final review are complete; exact selective-commit review is GO, while staging and commit remain pending. This does not claim live backend, reload, settings/runtime, Herdr, Pi-core, push, or deployment behavior; the unrelated Herdr failure remains outside #42.

## router-level-guidance clarification

- Amendment date: 2026-09-11; accepted wording under existing user implementation acceptance recorded in the T1 Handoff, not a new acceptance or receipt.
- Accepted tuple: [Work](../works/router-level-guidance/work.md), [Plan](../works/router-level-guidance/plan.md), [Tasks](../works/router-level-guidance/tasks.md); [Context](../works/router-level-guidance/context.md) completes the same-byte review set.
- Review: `c:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/final-review-router-plan-history-artifacts/result-1.json`, generation 1, GO with P0-P3 zero for planning inputs only.
- Clarification: independent axes, least-sufficient uncapped integers, ordinary/simple/complex reasoning distinctions and independent impact examples, without automatic planning/review uplift or label mapping, as required below and in Spec §6.
- Implementation status: prompt/test implementation verified by T3 technical checks and T4 GO with P0-P3 zero for pre-T5 bytes; [evidence and limitations](../works/router-level-guidance/context.md#t3-t4-evidence). T5 documentary reconciliation requires final same-byte review before selective-commit eligibility. Historical #42 completion is unchanged and is not clarification completion evidence.


## Problem

The Router currently selects a named Model Role whose provider/model and thinking value are stored together. That couples project-domain delegation to a mutable user-facing role vocabulary and provides no explicit, comparable capability contract. A clean break is required: the Router requests the minimum semantic reasoning and impact capability it needs, while the Resolver selects an available configured provider/model/thinking candidate deterministically.

## Actors and outcome

- **Router:** chooses one primary Skill, optional companions, Handoff context, and semantic integer `reasoning`/`impact` requirements. It does not put model information or capability requirements in the Handoff.
- **Resolver:** validates the request and one current candidate snapshot, selects exactly one qualified candidate, and returns its provider/model and thinking unchanged.
- **User/configuration:** defines candidate capability metadata in Pi settings through the existing Global/trusted-Project scope and locking behavior.
- **Delegate backend:** receives the resolved provider/model and thinking values unchanged. Backend implementation is not part of #42.

Success means a valid request resolves to the deterministic minimum-qualified candidate, while invalid, legacy, duplicate, unavailable, or insufficient configuration fails closed with explicit replacement required. No silent migration, ignore, or fallback is allowed.

## Requirements

1. Configuration uses `harness.candidates`, keyed by `providerModelKey := provider + '/' + modelId`. Split the source key at the first slash only: provider and model ID must be non-empty and contain no control characters; provider cannot contain a slash; model ID may contain later slashes and dots. Registry lookup uses separate exact provider and model ID fields. Each value is keyed by exact non-empty thinking strings and each thinking entry contains only non-negative integer `reasoning` and `impact` fields. The complete candidate identity is the reversible structured tuple `(provider, modelId, thinking)`, with canonical ordering identity `JSON.stringify([provider, modelId, thinking])`; the display key `provider/modelId.thinking` is derived from that tuple and is never parsed to recover fields. Last-slash and dot parsing are forbidden.
2. Candidate qualification requires both `candidate.reasoning >= request.reasoning` and `candidate.impact >= request.impact`.
3. Selection minimizes impact surplus first, then reasoning surplus, then the canonical complete candidate identity lexicographically.
4. The Resolver root carries top-level non-negative integer `reasoning` and `impact` request fields. The Handoff contains no model information or capability requirements.
5. A resolved invocation passes the selected provider/model and thinking value through exactly; no backend rewrite, fallback, or cross-provider substitution is permitted.
6. The old `roles`/`modelRole` format, unknown fields, raw duplicate JSON keys before normalization, duplicate canonical `(provider, modelId, thinking)` tuples, malformed candidates, invalid numbers, unavailable candidates, and an empty qualified candidate set fail closed and explicitly require manual settings replacement. No migration, ignore, fallback, or automatic replacement is allowed. Unknown fields or invalid configuration shapes, including mixed unknown-plus-legacy input, return `invalid_configuration` before pure recognized legacy `roles`/`modelRole` input returns `legacy_configuration`. Parser-level fixtures must prove raw duplicate-key detection occurs before settings object normalization and must separately prove duplicate canonical-tuple rejection. Canonical tuples use the exact strings produced by first-slash parsing and perform no trim, case folding, aliasing, dot parsing, last-slash parsing, display parsing, or other normalization.
7. Numeric rejection is deterministic: parse/type, raw-duplicate/unknown-field/duplicate-canonical-tuple shape, and legacy-field errors are reported before numeric validation; within a numeric field, non-number/non-finite is rejected first, then non-integer, then negative. Missing required numeric fields are invalid. The same rule applies to request and candidate capabilities.
8. The Router prompt must express the independent-axis guidance in [Router semantics](../spec/provider-model-thinking-capability-selection.md#6-router-semantics): fresh concrete judgment, least-sufficient finite non-negative integers, and common `0..3` examples without a protocol cap. Reasoning estimates correctness and verification work; impact estimates actual consequence. Ordinary Plan/Tasks and independent review normally require reasoning at least `2`, while simple reconciliation may require `1` and difficult final review may require `3`; these are not Skill, document, or phase mappings. Planning/review must not automatically increase impact. No combined score or automatic classifier is introduced.
9. Existing settings scope, trusted-project inheritance/materialization/reset, unrelated Pi-key preservation, and `proper-lockfile` serialization remain unchanged.
10. Dynamic resolver schema generation does not read the Pi model Registry, filter configured candidates by availability, or attest configured candidate availability; it exposes only the closed root request shape and relevant static descriptions. During resolve execution, after structural and numeric validation and before qualification and selection, the Resolver reads the Registry exactly once and treats that observation as the only authoritative snapshot for all availability and thinking-support checks in that resolution. No second read or implicit retry may alter the result.

## Scope

Included: package-local settings parsing/normalization, `/harness config` candidate replacement UX, Resolver schema/input/output changes, Router prompt and delegation mapping, focused tests, and package-local documentation reconciliation.

Excluded: `@settingdust/pi-herdr-subagents`, any delegate backend change, Pi core/Host changes, new dependencies, settings/session/runtime mutation outside existing package behavior, automatic migration, fallback, cross-provider policy, and Git operations.

## Success criteria

- Candidate settings and Resolver requests use only the new capability-selection contract.
- Deterministic selection is demonstrated for both surplus dimensions and canonical complete-identity ties.
- Legacy, unknown, mixed unknown-plus-legacy, raw duplicate-key, duplicate canonical-tuple, malformed, invalid-number, unavailable, and no-qualified-candidate cases are blocked with explicit replacement language and the stated precedence.
- Handoff YAML contains no model or capability request fields; resolved metadata contains the exact selected model and thinking.
- Router prompt expresses the independent reasoning/impact guidance and all examples in [Router semantics](../spec/provider-model-thinking-capability-selection.md#6-router-semantics), including ordinary reasoning `2`, simple reconciliation `1`, complex final review `3`, no automatic planning/review impact uplift, least-sufficient finite non-negative integers, and `0..3` not being a cap; no Skill/document/phase mapping or combined score is used.
- One Registry snapshot is read per resolve execution and is used for every availability decision.
- Existing scope/locking and unrelated settings preservation tests remain green.
- A fresh independent review of the exact authority package and implementation/test diff is a completion gate.

## Acceptance boundary

This PRD is accepted current product authority for #42. The bounded implementation, fresh T5 verification, and independent T6 review are complete with GO and P0-P3 zero. Exact selective-commit review is GO; staging and commit remain pending. Backend, Pi core, reload, settings/runtime mutation, deployment, and the unrelated Herdr failure remain excluded.

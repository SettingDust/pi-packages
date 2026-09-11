# Provider/Model/Thinking Capability Selection Specification

- Status: accepted current technical authority; implementation, fresh T5 verification, and independent T6 review complete; exact selective-commit review GO; commit pending
- Date: 2026-08-26
- Decision identity: `#42-provider-model-thinking-capability-selection-v1`
- Authority: [#42 PRD](../prd/provider-model-thinking-capability-selection.md), [#42 ADR](../adr/0009-provider-model-thinking-capability-selection.md)
- Reconciled dependencies: [ADR-0001](../adr/0001-router-resolver-handler-boundaries.md), [Router Delegation PRD](../prd/router-delegation.md), [Router Delegation Specification](router-delegation.md), [Protocol Prototype](protocol-prototype.md), [Backend Adaptation Specification](backend-adaptation.md), and the activated partial supersession in [ADR-0003](../adr/0003-user-model-roles.md); all #42 amendments are accepted. The canonical technical candidate is frozen and final T5/T6 are complete.

## router-level-guidance clarification

- Amendment date: 2026-09-11; accepted wording under existing user implementation acceptance recorded in the T1 Handoff, not a new acceptance or receipt.
- Accepted tuple: [Work](../works/router-level-guidance/work.md), [Plan](../works/router-level-guidance/plan.md), [Tasks](../works/router-level-guidance/tasks.md); [Context](../works/router-level-guidance/context.md) completes the same-byte review set.
- Review: `c:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/final-review-router-plan-history-artifacts/result-1.json`, generation 1, GO with P0-P3 zero for planning inputs only.
- Clarification: §6 requires independent axes, least-sufficient uncapped integers, ordinary/simple/complex reasoning distinctions and independent impact examples, without automatic planning/review uplift or label mapping. §§3-4 and Resolver behavior remain unchanged.
- Implementation status: prompt/test implementation verified by T3 technical checks and T4 GO with P0-P3 zero for pre-T5 bytes; [evidence and limitations](../works/router-level-guidance/context.md#t3-t4-evidence). T5 documentary reconciliation requires final same-byte review before selective-commit eligibility. Historical #42 completion is unchanged and is not clarification completion evidence.

## 1. Boundary and ownership

The Router owns semantic request selection. The Resolver owns request/configuration validation and deterministic selection. Pi settings own candidate configuration. The model Registry is the source of current provider/model/thinking availability. The delegate backend consumes resolved metadata and owns no #42 selection policy.

The Handoff remains the structured work request (`objective`, Skills, context, constraints, deliverables). It must not contain model information, `reasoning`, or `impact`. Resolver request fields are separate top-level fields.

## 2. Configuration grammar

The candidate configuration is package-local under the existing `harness` settings key:

```yaml
harness:
  candidates:
    anthropic/claude-sonnet-4:
      medium:
        reasoning: 2
        impact: 1
```

`candidates` is an object. Each key is `providerModelKey := provider + '/' + modelId`, split at the first slash only. Provider and model ID must be non-empty and contain no control characters; provider cannot contain a slash; model ID may contain later slashes and dots. Registry lookup uses the separate exact provider and model ID fields and requires exact field equality. Last-slash parsing and dot parsing are forbidden. The value is an object whose keys are exact non-empty thinking values. Each thinking entry contains exactly `reasoning` and `impact`, both finite non-negative integers. No unknown field is accepted at any level. Raw duplicate JSON keys are invalid and must be detected before object normalization. A parsed candidate representation is also invalid if the same canonical `(provider, modelId, thinking)` tuple occurs more than once. Parser-level fixtures must separately demonstrate raw duplicate-key and duplicate canonical-tuple rejection before a candidate object is admitted.

The parser retains provider/model ID/thinking as structured exact strings. The canonical complete identity for ordering and duplicate detection is `JSON.stringify([provider, modelId, thinking])`, with no whitespace added and no trim, case folding, aliasing, dot parsing, last-slash parsing, display parsing, or other normalization. A valid exact thinking key, including `__proto__`, must be retained as an own data property rather than assigned through an inherited prototype setter. The display identity `provider/modelId.thinking` is derived from the tuple and is never parsed. This makes identity mechanically reversible even when display delimiters would otherwise be ambiguous. There is no `harness.version`, and `roles` is not an alternate grammar.

## 3. Resolver input and output

The Resolver root contains the Handoff, existing admission data, and top-level finite non-negative integer `reasoning` and `impact` request fields. Requests are not capped at 3; 0..3 is Router guidance. The Handoff rejects model fields and capability fields.

Validation order is deterministic:

1. Parse and validate the closed root/Handoff/configuration shape, including raw duplicate JSON keys, unknown fields, and duplicate canonical tuples.
2. Apply existing readable-reference, Skill, and admission legality precedence.
3. Reject legacy `roles` or `modelRole` fields/configuration.
4. Validate required request and candidate numeric fields.
5. Read the Registry once and validate candidate availability.
6. Qualify and select.

For any numeric field, reject non-number or non-finite values first, then non-integers, then negative values. Missing required numeric values are invalid. Thus a value that is both negative and non-integer is rejected as non-integer; it must not be normalized, rounded, clamped, or reported as a valid negative integer. Structural, raw duplicate-key, unknown-field, duplicate-canonical-tuple, legacy, and existing Handoff/reference/admission errors take precedence over numeric errors as ordered above. An unknown field or invalid configuration shape, including mixed unknown-plus-legacy input, must return `invalid_configuration` before pure recognized `roles`/`modelRole` input is classified as `legacy_configuration`.

A successful resolution returns:

```yaml
status: resolved
prompt: yaml-handoff-without-selection-fields
model: provider/model
thinking: configured-thinking-level
```

`model` and `thinking` are the exact structured values from the selected candidate. The prompt contains no candidate configuration, selection metadata, or Resolver-only request fields.

## 4. Registry snapshot, qualification, and selection

Dynamic resolver schema generation does not read the Registry, filter configured candidates by availability, or attest configured candidate availability. It exposes only the closed root request shape and relevant static descriptions. After structural and numeric validation and immediately before qualification and selection, the Resolver reads the Pi model Registry exactly once for the current resolve execution. That read is the only authoritative immutable snapshot for every candidate availability and thinking-support check in the execution. No schema-time Registry read, second resolve-time read, or implicit retry is allowed. A changed Registry on a later execution is observed by that later execution.

A candidate is available only if the snapshot contains a Registry entry whose separate provider and model ID fields exactly equal the parsed values and that entry supports the exact thinking value. An available candidate qualifies only when:

- `candidate.reasoning >= request.reasoning`; and
- `candidate.impact >= request.impact`.

Choose the lexicographically least ordered tuple:

```text
(candidate.impact - request.impact,
candidate.reasoning - request.reasoning,
JSON.stringify([provider, modelId, thinking]))
```

The first two comparisons are numeric. The final comparison is ordinary deterministic lexicographic comparison of the canonical complete identity. Do not compare model IDs, provider names, thinking levels, Role names, insertion order, display-key parsing, or a weighted sum.

## 5. Fail-closed behavior

The Resolver blocks before backend launch for malformed input, raw duplicate JSON keys, unknown fields, duplicate canonical tuples, legacy `roles`/`modelRole`, missing/invalid numeric fields, unavailable or unsupported candidates, and no qualified candidate. Configuration failures and insufficient candidate configuration state explicitly that manual replacement is required. The system must not migrate, ignore, choose a default, retry implicitly, silently fall back, substitute across providers, or automatically replace settings. Invalid JSON remains protected from overwrite; replacement of a parsed invalid scope requires the existing explicit user confirmation boundary.

Use these stable public block codes:

| Condition | Code |
|---|---|
| malformed root/Handoff, unknown field, raw duplicate key, or duplicate canonical tuple | `invalid_configuration` or existing precise Handoff/reference code |
| legacy `roles`/`modelRole` | `legacy_configuration` |
| invalid request integer | `invalid_capability_request` |
| invalid candidate integer or candidate shape | `invalid_configuration` |
| unavailable provider/model/thinking | `unavailable_candidate` |
| no candidate meets both requests | `no_qualified_candidate` |

Every configuration, legacy, availability, and qualification block includes explicit replacement-required language. Existing precise Handoff/reference/admission errors retain their established precedence and wording where they identify the actual earlier failure. A mixed unknown-plus-legacy or invalid-shape configuration is an `invalid_configuration` block, not a legacy downgrade.

## 6. Router semantics

The Router must treat `reasoning` and `impact` as independent axes, not a total score, weighted score, priority, or phase level. For every delegation it must judge the concrete objective, ambiguity, reasoning needed for correctness, verification burden, and actual consequence, requesting the least sufficient value on each axis. A high requirement on one axis does not imply a high requirement on the other.

Common `reasoning` guidance:

- **0:** mechanical work with clear boundaries and low ambiguity.
- **1:** a small settled implementation or check, simple state reconciliation, or simple documentation reconciliation.
- **2:** ordinary Plan or Tasks work, independent review, or multi-file impact analysis.
- **3:** final review involving architecture, security, migration, authority conflict, a complex root cause, or unusually difficult uncertainty.

Ordinary Plan, Tasks, and independent review work normally require at least reasoning `2` because of synthesis or independent judgment, not a Skill name, document type, planning/review phase, or other workflow label. Simple mechanical reconciliation may still require only `1`; clearly bounded, low-ambiguity mechanical work may use `0` when sufficient. No Skill/document/phase mapping or natural-language automatic classifier is introduced.

Common `impact` guidance:

- **0:** local, reversible, and without external impact.
- **1:** bounded to one module.
- **2:** cross-module or materially affects behavior or compatibility.
- **3:** high-consequence, hard to reverse, or involves security, data, or external-system risk.

Planning or review does not by itself increase impact. The `0..3` values are common guidance, not a protocol range or upper bound; any finite non-negative integer is valid.

The Router supplies root requirements to resolve and passes the resolved model/thinking unchanged to the delegation tool. It does not put selection fields in the Handoff, select a candidate in prose, or substitute after resolution.

## 7. Settings and backend compatibility

Global and trusted-Project scope, first project materialization, reset-to-inheritance, unrelated Pi-key preservation, malformed-settings protection, and `proper-lockfile` retry behavior remain unchanged. `/harness config` edits or explicitly replaces the nested candidate configuration through the existing confirmation seam.

The backend remains out of scope. Exact resolved `model` and `thinking` values continue through the existing backend adaptation unchanged. No `@settingdust/pi-herdr-subagents`, Pi core/Host, dependency, session, or runtime change belongs to #42.

## 8. Cross-document reconciliation

ADR-0001, Router Delegation PRD/Specification, Protocol Prototype, Backend Adaptation Specification, and ADR-0003 contain the accepted reconciliation required by ADR-0009. ADR-0009 supersedes ADR-0003's Role storage/selection decision while preserving its history and compatible safeguards. The complete reconciled set passed fresh review and was explicitly accepted. The frozen candidate received the P1 repair, fresh T5 verification, and independent T6 review; both final gates returned GO with P0-P3 zero.

## 9. Verification and acceptance

Fresh T5 records default-loader raw-duplicate preflight rejection before Registry read or Resolver selection (zero each), with a companion runtime regression across trusted and untrusted scope. Command attribution: config-command `13/22`, config `21/22`, settings-store `19/37`, Extension `6/95`, affected `46/154`, distinct subset `53/81`, focused `94/250`, and full `136/538`; package typecheck, import, activation, and execute passed. Independent T6 returned GO with P0-P3 zero and no actionable finding. The exact 23-path dirty set has an empty index. The ten frozen implementation/test paths reproduce as a path-sorted LF manifest of 1085 bytes and aggregate SHA-256 `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`; [Work Context](../works/provider-model-thinking-capability-selection/context.md#canonical-frozen-candidate-manifest) records its exact rows and Node reproduction. The rejected 1095-byte literal-backslash-n construction reproducibly hashes to `3fd52e65a90f2d7eaee47b587e50d467abd2960fdb7ead118131bcfb0ce70525` and is not canonical candidate evidence. The exact 13-document boundary, ten technical hashes, 50 links, diff check, and manifest byte-stability checks passed.


Implementation, validation, and final review are complete. Exact selective-commit review is GO; staging and commit remain pending. The evidence is package/source-level only and does not claim a live backend, reload, settings/runtime mutation, Herdr verification, Pi-core change, push, deployment, or live runtime completion. An unrelated Herdr failure remains outside #42.

## 10. Non-goals and acceptance boundary

No migration, compatibility shim, ignore/fallback path, weighted score, phase-to-level taxonomy, `harness.version`, backend change, Herdr change, Pi core/Host change, dependency, new settings scope, persistent selection state, or Git operation is included.

This Specification is accepted current technical authority for #42. The bounded serial implementation, fresh T5 verification, and independent T6 review are complete with GO and P0-P3 zero. Exact selective-commit review is GO; staging and commit remain pending. Backend, Pi core, reload, settings/runtime mutation, deployment, and the unrelated Herdr failure remain excluded.

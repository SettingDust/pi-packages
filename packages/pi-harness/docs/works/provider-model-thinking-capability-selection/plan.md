# Plan: #42 Provider/Model/Thinking Capability Selection

- Status: accepted and completed; fresh T5 GO and independent T6 GO reconciled; exact selective-commit review GO; commit pending
- Updated: 2026-08-26
- Work: [work.md](work.md)
- Context: [context.md](context.md)
- Authority: [PRD](../../prd/provider-model-thinking-capability-selection.md), [ADR](../../adr/0009-provider-model-thinking-capability-selection.md), [Spec](../../spec/provider-model-thinking-capability-selection.md)
- Decision identity: `#42-provider-model-thinking-capability-selection-v1`

## Objective

Implement the smallest package-local clean break from named Roles to deterministic provider/model/thinking capability selection, with focused verification and no backend changes.

## Preconditions and current gate

The exact thirteen-path authority set passed fresh authority review with GO and P0-P3 all zero and was explicitly accepted. T2-T4 implementation and the bounded P1 repair froze the ten technical paths. Fresh T5 verification records P0-P3 zero with exact command attribution; independent T6 review records GO with P0-P3 zero. Implementation, validation, and final review are complete. Exact selective-commit preparation is authorized, but staging, commit, reload, push, settings, runtime, and backend operations were not performed.


## Scope and non-goals

Scope is limited to the exact package source/test paths listed in `work.md`. The seven #42 authority/Work artifacts are documentation outputs only. Reuse the existing settings repository, scope, locking, model Registry, Resolver, Router prompt, and backend mapping seams.

Non-goals: migration, compatibility shim, ignore/fallback, weighted scoring, `harness.version`, backend or Herdr changes, Pi core/Host changes, new dependencies, new persistence, settings/session/runtime mutation outside requested package behavior, and Git operations.

## Serial strategy

```text
P0 cross-document reconciliation and fresh authority review
  -> P1 explicit acceptance and freeze nested grammar/integer rules/codes/Registry boundary
      -> P2 change settings normalization/replacement UI
          -> P3 change Resolver schema/validation/selection/output
              -> P4 change Router prompt and delegation mapping
                  -> P5 focused and package verification
                      -> P6 fresh independent correctness/security/evidence review
```

No implementation phase is parallel by default because configuration, protocol, and Extension schemas share the same contract and files.

## P0-P1. Reconciled and frozen contract (completed)

Review the exact thirteen-path reconciliation, then accept and freeze nested `harness.candidates[providerModelKey][thinking]`; first-slash parsing; exact separate provider/model ID Registry fields; provider slash and control-character rejection; model ID slash/dot allowance; exact known fields; raw duplicate JSON-key detection before object normalization; duplicate canonical-tuple rejection; no trim, case folding, aliasing, dot parsing, last-slash parsing, display parsing, or other normalization; finite non-negative integers with non-integer precedence; stable block codes; manual replacement; root-only requests; canonical tuple ordering; schema generation with no Registry read/filtering/availability attestation; and exactly one authoritative Registry snapshot per resolve after structural/numeric validation and before qualification/selection. Stop on any contradiction with Handoff exclusion, exact pass-through, or existing settings protections. No source mutation is authorized during P0-P1.

## P2. Implement settings and configuration UI (completed)

Replace Role parsing and editing with the nested candidate representation. Preserve Global/trusted-Project overlay, first project materialization, reset inheritance, unrelated-key preservation, lock/retry behavior, malformed-file protection, and explicit replacement confirmation. Parse raw settings entries before object normalization so duplicate JSON keys cannot disappear; reject raw duplicates, duplicate canonical tuples, unknown fields, invalid shapes, legacy fields, malformed values, and invalid-number configuration without migration or silent fallback. Mixed unknown-plus-legacy or invalid-shape input must retain `invalid_configuration` precedence; only pure recognized `roles`/`modelRole` input uses `legacy_configuration`. Preserve canonical tuple identity through configuration edits: display-label lookup must not replace tuple lookup, and collision, cancellation, and overwrite regressions must remain covered. Form canonical tuples only from exact first-slash parsing and exact thinking strings; introduce no normalization.


## P3. Implement Resolver capability selection (completed)

Change the resolver input to root integer `reasoning`/`impact` plus the existing Handoff/admission contract. Split `providerModelKey` at the first slash only, reject invalid provider/model strings, and call Registry lookup with exact separate fields. Keep dynamic schema generation Registry-free and limited to the closed root request shape and relevant static descriptions, without availability filtering or attestation. Apply the documented validation precedence, read the Registry exactly once during each resolve execution after structural and numeric validation and before qualification and selection, validate availability against that snapshot, qualify on both dimensions, select by impact surplus, reasoning surplus, and canonical `JSON.stringify([provider, modelId, thinking])`, then return exact model/thinking. Keep Handoff free of selection fields and preserve existing legality precedence.

## P4. Update Router prompt and environment mapping (completed)

Describe semantic 0..3 guidance and examples without phase bindings. Ensure the Router supplies root requirements and passes resolved model/thinking unchanged to the existing delegation tool after resolution. Do not change backend code or introduce a wrapper/registry.

## P5. Fresh verification (completed)

Fresh T5 reproduced the frozen candidate evidence: config-command `13/22`, config `21/22`, settings-store `19/37`, Extension `6/95`, affected `46/154`, distinct subset `53/81`, focused `94/250`, and full `136/538`; package typecheck, import, activation, and execute passed. Exact 23-path, empty-index, link, diff, manifest byte-stability, and ten technical hash checks passed. No stage, commit, reload, push, settings, runtime, or backend operation occurred.

## Rollback

Because this is a clean-break contract spanning settings, Resolver, and Extension schema, revert the package source/test change as one compatibility unit if verification fails. Do not add a migration shim or retain mixed old/new behavior as rollback. Reconcile documentation status separately from source rollback.

## Final review gate (T5/T6 completed)

Fresh T5 is GO with P0-P3 zero and the exact command attribution above. Independent T6 is GO with P0-P3 zero and no actionable finding. Implementation, validation, and final review are complete; exact selective-commit review is GO. Commit remains pending. The unrelated Herdr failure remains excluded.

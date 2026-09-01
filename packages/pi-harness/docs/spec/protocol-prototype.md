# Protocol Prototype Validation

- #42 status: accepted protocol obligations; implementation, fresh T5 verification, and independent T6 review complete; exact selective-commit review GO; commit pending

## Purpose

Prove the contract in isolation before using Pi runtime APIs or a delegate backend. The prototype uses deterministic synthetic inputs and one runnable test command.

## Fixtures

- visible Skill names with descriptions, including package and external examples;
- nested `harness.candidates` entries with available and unavailable exact provider/model/thinking combinations;
- raw duplicate candidate and thinking JSON keys, duplicate canonical `(provider, modelId, thinking)` tuples, unknown fields, pure and mixed unknown-plus-legacy `roles`/`modelRole` configuration, and malformed/non-finite/fractional/negative capability values;
- a trusted workspace containing one readable reference and one missing reference;
- valid Handoffs with ref and inline context, plus root capability requests and Handoffs containing forbidden selection fields; and
- valid and malformed Handler Result YAML values.

## Assertions

1. Dynamic schema generation includes all supplied model-visible Skills, exposes only the closed root request shape and relevant static descriptions, and neither reads the Registry nor filters or attests configured candidate availability.
2. Replacing Skills affects the next schema generation; changing candidate availability affects only the next resolve execution's single authoritative Registry snapshot, without stale selection state.
3. A valid root request and Handoff return `status: resolved`, preserve objective/Skills/contexts in YAML, keep referenced file content out of the prompt, omit model/capability fields from the prompt, and return exact selected model/thinking settings.
4. Missing/unreadable references return `invalid_reference` before serialization completes.
5. Unknown Skills, repeated companion Skills, and a companion equal to primary return `invalid_skill`.
6. Missing, malformed, unavailable, legacy, raw duplicate-key, duplicate canonical-tuple, or insufficient candidates return the corresponding blocked code with explicit replacement-required language and without migration or fallback. Unknown fields or invalid shapes—including mixed unknown-plus-legacy input—return `invalid_configuration` before pure recognized legacy input returns `legacy_configuration`.
7. Qualification requires both dimensions; ordering minimizes impact surplus, reasoning surplus, then `JSON.stringify([provider, modelId, thinking])` lexicographically.
8. `providerModelKey` splits at the first slash only; exact Registry field matching permits slash and dot in model ID, rejects slash in provider and control characters in either field, and never uses last-slash, dot, or display parsing.
9. Result parsing accepts `completed`, `partial`, `blocked`, and `failed` only when `summary` and `report` exist.
10. Result parsing rejects workflow fields such as `suggestedNext`, `nextAction`, and `nextSkill`.
11. Artifact references remain report data and become validated input only when reused in a later Handoff.

## Parser-Level Duplicate Obligation

The prototype must feed duplicate JSON keys through the raw parser representation and assert rejection before object normalization erases the duplicate. It must separately prove rejection of raw duplicate candidate/thinking keys and duplicate canonical `(provider, modelId, thinking)` tuples; an object-level fixture that has already lost a raw duplicate is insufficient evidence. Canonical tuples use only the exact first-slash provider/model parse and exact thinking string. No fixture or assertion may imply trim, case folding, aliasing, dot parsing, last-slash parsing, display parsing, or any other normalization.

## Validation Result

The #42 candidate implementation and its deterministic nested-candidate and parser-level duplicate checks completed fresh T5 verification and independent T6 review with GO and P0-P3 zero. T5 command attribution is config-command `13/22`, config `21/22`, settings-store `19/37`, Extension `6/95`, affected `46/154`, distinct subset `53/81`, focused `94/250`, and full `136/538`; typecheck, import, activation, and execute passed. The frozen ten-file evidence manifest is the 1085-byte path-sorted LF aggregate `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`, reproduced in [#42 Context](../works/provider-model-thinking-capability-selection/context.md#canonical-frozen-candidate-manifest); rejected 1095-byte literal-backslash-n aggregate is `3fd52e65a90f2d7eaee47b587e50d467abd2960fdb7ead118131bcfb0ce70525`. Exact selective-commit review is GO; staging and commit remain pending. This package/source evidence does not claim live backend, reload, settings/runtime, Herdr, Pi-core, push, or deployment behavior; the unrelated Herdr failure remains outside #42.


## Residual Risk

The Extension core now binds `before_agent_start`, dynamic tool replacement, loaded Skills, and Pi's model registry using the same supported APIs already exercised by Pi Dust Harness. Live TUI behavior, prompt-only Router restraint, Skill instruction conflicts, concurrency conflicts, unbounded routing loops, and backend Result delivery remain separate integration and evaluation work.

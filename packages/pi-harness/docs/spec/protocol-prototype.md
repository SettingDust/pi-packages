# Protocol Prototype Validation

## Purpose

Prove the contract in isolation before using Pi runtime APIs or a delegate backend. The prototype uses deterministic synthetic inputs and one runnable test command.

## Fixtures

- visible Skill names with descriptions, including package and external examples;
- available and unavailable Model Roles with model/thinking selections;
- a trusted workspace containing one readable reference and one missing reference;
- valid Handoffs with ref and inline context; and
- valid and malformed Handler Result YAML values.

## Assertions

1. Schema generation includes all supplied model-visible Skills and excludes unavailable Roles.
2. Replacing Skills or Role availability produces a new schema without stale enum values.
3. A valid Handoff returns `status: resolved`, preserves objective/Skills/contexts in YAML, keeps referenced file content out of the prompt, omits `modelRole` from the prompt, and returns only the prompt and resolved model settings.
4. Missing/unreadable references return `invalid_reference` before serialization completes.
5. Unknown Skills, repeated companion Skills, and a companion equal to primary return `invalid_skill`.
6. Missing, malformed, unavailable, or invalid-thinking Roles return the corresponding blocked code without fallback.
7. Result parsing accepts `completed`, `partial`, `blocked`, and `failed` only when `summary` and `report` exist.
8. Result parsing rejects workflow fields such as `suggestedNext`, `nextAction`, and `nextSkill`.
9. Artifact references remain report data and become validated input only when reused in a later Handoff.

## Validation Result

Implemented in `src/protocol.ts` with deterministic checks in `tests/protocol.test.ts`. The package test command also covers Pi Settings Role normalization and Extension binding in `tests/config.test.ts` and `tests/extension.test.ts`.

## Residual Risk

The Extension core now binds `before_agent_start`, dynamic tool replacement, loaded Skills, and Pi's model registry using the same supported APIs already exercised by Pi Dust Harness. Live TUI behavior, prompt-only Router restraint, Skill instruction conflicts, concurrency conflicts, unbounded routing loops, and backend Result delivery remain separate integration and evaluation work.

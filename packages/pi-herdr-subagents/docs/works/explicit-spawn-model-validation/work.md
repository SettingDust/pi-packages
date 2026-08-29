# Explicit Spawn Model Validation Work

- **Task:** `#29`
- **Status:** #29 implementation, recorded historical validation, final independent review, ownership release, and the isolated eight-path commit are complete. Commit `8ff926068a45a2590f05c9f136da05b5155bd1ff` (`fix(herdr): validate explicit spawn models`) contains the six #29 documents, `src/index.ts`, and `tests/runtime.test.ts`; this separate reconciliation changes only the six documents.
- **Goal:** Reject invalid explicit initial-spawn models and broken registry integration from Pi `0.84.2`'s catalog/auth available snapshot before any allocation/effect. Explicit references use the exact slash-delimited `${provider}/${modelId}` grammar: Unicode is preserved without normalization, provider and model ID are non-empty, provider excludes `/`, the first `/` is the separator, later `/` remains in model ID, ASCII controls U+0000-U+001F/U+007F are rejected, and UTF-8 length is at most 256 bytes before registry access. Shape/control/length failures use `invalid_model_reference` with one bounded escaped detail and no registry access. Generation-1 uses separate model/thinking flags while legacy generation-2 resume launch is preserved.
- **Authority:** [Specification](../../spec/explicit-spawn-model-validation.md); [ADR](../../adr/exact-explicit-spawn-model-reference.md).
- **Derived coordination:** [Context](context.md); [Plan](plan.md); [Tasks](tasks.md).

## Delivery Boundary

This Work covers initial `SubagentRuntime.spawn(input, registry?)`, runtime `unknown` model validation, the invocation-local structural registry handoff, one typed `ExplicitSpawnModelError` transport with exact `code`, `detail`, and optional closed `operation`, the production Pi fifth-context adapter mapping to the same JSON/details fields, a separate initial-spawn launch seam, deterministic fake checks with a complete zero-effect ledger, one temporary fail-closed real Pi `0.84.2` adapter fixture, and later post-implementation documentation reconciliation.

Availability is exact `ModelRegistry.getAvailable()` catalog/auth snapshot membership only. `ExtensionContext.scopedModels`, `enabledModels`, and `--models` are excluded from v0.1 admission; an explicit model outside the session cycling scope may pass.

Thinking behavior is upstream-aligned: empty string emits no flag; invalid non-empty syntax follows Pi CLI warning/default; valid capability-unsupported values follow AgentSession clamping. Resume is not validated or normalized: a persisted generation-1 model+thinking must relaunch generation 2 as one legacy `--model model:thinking` value.

Task `#37` Phase B, `#18`, `#36`, `#3`, and unrelated lifecycle/tool work remain excluded. Exact hunk mapping, eight-path overlay isolation, excluded-path hash stability, and the user's instruction to commit all work unrelated to `#40` completed the ownership-release/isolated-commit gate for #29. The seven `#40` paths and residual Herdr docs remain excluded from this reconciliation.

## Current Stage

```text
settled decisions + previously authorized implementation
                          |
                          v
runtime + adapter + launch implementation and deterministic coverage complete
                          |
                          v
recorded historical focused/typecheck/import/suite evidence complete
                          |
                          v
final independent review: runtime/tests P0-P3 zero; P1 stale status identified
                          |
                          v
ownership release + isolated eight-path implementation commit complete
                          |
                          v
six-document factual reconciliation
                          |
                          v
post-edit document identity and boundary check passed
                          |
                          v
GO: isolated six-document documentation commit
```

The revision closes the fresh review's authority/status contradiction without changing the settled underlying behavior. Across the six #29 authority/coordination documents it records:

1. catalog/auth availability only; no scoped/enabled filtering in v0.1;
2. exact `SubagentRuntime.spawn(input, registry?)` handoff: `input.model` is runtime `unknown`; omitted/`undefined` may omit the invocation-local structural registry; explicit input receives only the production fifth context's `ctx.modelRegistry` through the second argument; and missing registry fails at `registry`;
3. one typed `ExplicitSpawnModelError` with exact `code`, `detail`, optional closed safe `operation`, direct-caller rejection behavior, adapter JSON/details mapping, exact point-of-failure precedence, and no fallback/cause exposure;
4. separate initial-spawn/resume launch seams and exact generation-2 legacy tokens;
5. exact slash-delimited `${provider}/${modelId}` grammar: Unicode preserved without normalization, non-empty provider and model ID, provider excludes `/`, first-slash split, later `/` in model ID, rejection of U+0000-U+001F/U+007F, and UTF-8 length at most 256 bytes before registry access;
6. absent/`undefined` versus every present non-string model input;
7. empty, invalid-syntax, and capability-unsupported thinking stages;
8. the prior Pi `0.84.2` fifth-context run only as historical provenance—not current independently reproducible evidence—because its temporary collector, raw fd-1 record, command output, and inventories were deleted; and
9. non-absent malformed or mismatched `find` identities and malformed `getAvailable` entries fail as registry integration errors, while only absent `find` and a fully valid snapshot without the exact pair retain `model_not_found` and `model_unavailable`;
10. exact unknown-provider derivation plus active Task `#37` Phase B/shared-owner pre-commit gates.

The revision closes the final review's authority/status contradiction without changing settled underlying behavior. The final independent review, ownership release, isolated implementation commit, and this six-document reconciliation's post-edit identity and boundary verification are complete. This Work is coordination state, not a new acceptance receipt; the reconciliation is GO for a separate documentation-only commit.

- **Implemented, verified as supported:** runtime-first `unknown` model validation, typed error transport, invocation-local registry handoff, fifth-context adapter mapping, separate generation-1 launch flags, preserved generation-2 resume flags, and focused zero-effect/argv coverage.
- **Recorded historical evidence:** focused tests `20 pass`, `0 fail`, `673 assertions`; typecheck zero diagnostics; import smoke passed; candidate full suite `134 pass`, `1 fail`, `1347 assertions`; exact HEAD baseline `114 pass`, `1 fail`, `671 assertions`, reproducing the same sole spawn-description failure. The suite is not globally green. Fresh execution was not performed for this reconciliation because the unmodified workspace lacks local `tsc`; this is an environment evidence limitation, not a behavioral failure.
- **Historical provenance only:** Pi `0.84.2` fifth-context collector material was deleted and is unavailable/non-current. It is not recreated or claimed as fresh evidence.
- **Completion:** the final independent review, ownership release, isolated implementation commit, and post-edit six-document identity/boundary verification are complete. This reconciliation changes neither source nor test identity and is GO for a separate documentation-only commit.

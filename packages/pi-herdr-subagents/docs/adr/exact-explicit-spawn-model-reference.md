# ADR: Exact Explicit Spawn Model References

- **Status:** #29 implementation, recorded historical validation, final independent review, ownership release, and the isolated eight-path commit are complete. Commit `8ff926068a45a2590f05c9f136da05b5155bd1ff` (`fix(herdr): validate explicit spawn models`) contains this ADR, the five companion authority/Work documents, `src/index.ts`, and `tests/runtime.test.ts`. This separate six-document factual reconciliation grants no new behavior scope.
- **Date:** 2026-08-21
- **Scope:** `packages/pi-herdr-subagents`, explicit initial spawn model admission and generation-1 child launch flags
- **Authority:** [Explicit `subagent_spawn` model validation specification](../spec/explicit-spawn-model-validation.md)
- **Derived Work:** [Explicit spawn model validation Work](../works/explicit-spawn-model-validation/work.md)

## Context

Pi `0.84.2` supports broad model resolution for CLI/interactive UX. Its private resolver can match exact references, scoped models, shorthand, names, fuzzy substrings, and custom fallbacks. Before the previously authorized #29 implementation, `pi-herdr-subagents` forwarded an explicit model without preflight validation and combined model/thinking into one `--model` value inside shared spawn/resume launch code.

Background admission is a different boundary: a child-side failure occurs after identity, files, runtime state, Herdr surface, and notification consequences. The selected requirement is side-effect-free rejection using Pi's public per-invocation registry snapshot, without copying private resolution policy.

Pi `0.84.2` exposes two distinct sets. `ModelRegistry.getAvailable()` is the held catalog/auth available snapshot. `ExtensionContext.scopedModels` is the separate read-only session set derived from `--models`/`enabledModels` for selection/cycling. The earlier “catalog/auth/filter” description incorrectly merged them.

Pi CLI accepts separate `--model` and `--thinking`; invalid non-empty thinking syntax yields a CLI warning/default, while valid capability-unsupported levels are later clamped by `AgentSession`. Resume currently relaunches persisted model/thinking in the legacy combined `--model model:thinking` form.

## Decision

1. Explicit **initial** spawn accepts only an exact case-sensitive slash-delimited `${provider}/${modelId}` reference present in Pi's current catalog/auth available snapshot. Provider and model identity may contain Unicode without normalization. The reference has one non-empty provider, one non-empty model ID, splits on the first `/` only, rejects `/` in the provider and every ASCII control character (U+0000-U+001F and U+007F), and rejects UTF-8 encodings longer than 256 bytes before registry access; later `/` characters belong to `modelId`.
2. `scopedModels`, `enabledModels`, and `--models` do not participate in v0.1 admission. An explicit model can therefore pass even when outside the current session cycling scope.
3. Runtime input is `unknown`: only absent/`undefined` is omitted. Every present non-string, including `null`, number, object, array, and boolean, is `invalid_model_reference` with bounded escaped/type detail.
4. The runtime classifies malformed references, unknown providers, unconfigured auth, missing exact models, and exact-but-unavailable models in the Specification's stable order.
5. A missing/invalid registry, missing/non-callable required method, throwing member access, synchronous required-operation throw, or synchronous available-snapshot read failure is `model_registry_error` with exact fields `code`, `detail`, and `operation`; detail is `Model registry integration failed at ${operation}.`, where `operation` is only `registry`, `getProvider`, `auth`, `find`, or `getAvailable`.
6. Integration failures are not any of the four catalog codes. Later operations do not run, and there is no cause exposure, catch-and-fallback, cache, refresh, or retry.
7. Unknown-provider classification requires exact `getProvider(token) === undefined`; it performs no validator-owned refresh or secret/network call.
8. Explicit initial spawn uses the exact runtime seam `SubagentRuntime.spawn(input, registry?)`. `input.model` is `unknown`; only absent/`undefined` is omitted. The invocation-local structural registry is optional only for that omitted path and is never captured or cached. An explicit model requires the production adapter's fifth Pi context to pass `ctx.modelRegistry` through the exact second argument. The required methods are `getProvider`, `getProviderAuthStatus`, `find`, and `getAvailable`; missing/invalid registry wiring fails at operation `registry`.
9. Validation uses only synchronous `getProvider`, `getProviderAuthStatus`, `find`, and `getAvailable`; no private resolver, cache, refresh, auth-secret resolution, network, health, 429, or cooldown policy is added.
10. Newly admitted generation 1 emits separate `--model <exact reference>` and optional `--thinking <non-empty string>` tokens. Empty thinking is omitted.
11. Non-empty invalid thinking syntax is passed to Pi CLI warning/default behavior. Valid capability-unsupported thinking is passed to Pi AgentSession clamping. The package adds no `invalid_thinking`.
12. Spawn and resume use separate launch-policy seams before shared lifecycle launch. Resume is not validated or normalized and retains persisted legacy combined flags on generation 2.
13. Omitted model preserves child-default behavior, no parent-model inference, and no thinking flag.
14. Model-admission failures use one typed `ExplicitSpawnModelError` transport. Runtime callers catch it and read exactly `code`, `detail`, and optional closed `operation`; the production tool adapter maps those same fields to JSON text content and `details`. No rejected-result alternative, raw cause, stack, context, registry, auth, secret, prompt, header, environment value, or caller-controlled fragment is exposed.
15. Real Pi acceptance first proves a fixture-local startup model is selectable because Pi `0.84.2` print mode requires one before command dispatch. The command then intercepts before any provider request, emits one raw-fd machine record, and cleans only its unique `mkdtemp` run root.

## Rationale

- Exact references make background targets and errors deterministic; the bounded control/length grammar also keeps malformed input out of registry access. The accepted reference is not normalized or rewritten.
- Runtime-first `unknown` validation covers direct/untyped/schema-mutated callers.
- `getAvailable()` is the narrow upstream catalog/auth snapshot; importing session cycling scope would add a separate policy not settled for v0.1.
- Separate generation-1 flags align with Pi CLI and preserve model IDs containing `/`.
- Separate launch seams prevent a shared `start` refactor from changing generation-2 persisted compatibility.
- Passing thinking upstream avoids duplicate syntax/capability tables and preserves Pi's warning/default and clamp stages.
- Snapshot-only admission avoids credentials/network side effects and false live-health claims after Pi delivers the invocation context; ordinary offline Pi startup may still initialize local catalog/auth snapshots.
- One integration code with closed operation labels makes broken registry wiring diagnosable without leaking causes, registry/auth state, or secrets.

## Alternatives Considered

### Use Pi's private fuzzy/custom resolver

Rejected: broader interactive policy, private coupling, and unstable no-side-effect classifications.

### Let child Pi reject after launch

Rejected: identity, files, runtime records, Herdr, and child effects already exist.

### Treat `scopedModels`/`enabledModels` as availability

Rejected for v0.1. Pi `0.84.2` exposes it separately from `getAvailable()`, and it represents session selection/cycling. Adding it would reject otherwise catalog/auth-available explicit background targets and needs a separate product decision.

### Accept any exact catalog model regardless of `getAvailable()`

Rejected: ignores current catalog/auth availability and defers a known admission failure.

### Refresh/probe provider health

Rejected: latency, credential/network effects, nondeterminism, and misleading health semantics.

### Reject invalid or unsupported thinking in this package

Rejected: Pi CLI owns syntax warnings/defaults; AgentSession owns capability clamping.

### Normalize resume with generation-1 flags

Rejected: resume has persisted compatibility consequences and is outside this decision.

## Consequences

### Positive

- Invalid explicit requests fail deterministically before allocation/effects.
- Errors distinguish provider/auth, catalog absence, and catalog/auth snapshot absence.
- Direct/tool callers share one runtime enforcement point.
- Generation-1 launch matches native CLI token shape while generation-2 resume remains compatible.
- Thinking policy stays upstream-owned.

### Negative And Operational

- Fuzzy, shorthand, bare-ID, alias, display-name, and custom-fallback inputs now fail.
- A model outside `scopedModels` can still pass explicit background admission in v0.1.
- Snapshot acceptance still cannot predict provider/network/request success.
- Direct explicit-model callers must supply the registry seam; missing/broken seams fail with only the fixed operation label.
- Shared launch code needs an explicit spawn/resume policy seam, not one truthiness branch.
- Existing arbitrary model test labels need canonical fake entries.
- Real acceptance needs a temporary Pi extension fixture plus unique run-owned collector root, deterministic fixture-local startup-model preflight, raw-fd evidence, and bounded cleanup, but no Herdr or production process abstraction.

## Compatibility Boundary

Unchanged: omitted model, thinking without model, Pi CLI invalid-thinking warning/default, Pi capability clamp, resume inputs and validation, task identity, lifecycle, persistence, notifications, cleanup, Agent discovery, workspace targeting, and Windows bootstrap invocation.

Mandatory resume regression:

```text
persisted generation 1: model=acme/family/model, thinking=high
resumed generation 2:  ["--model", "acme/family/model:high"]
                         and no --thinking token
```

Task `#37` Phase B currently owns shared `src/index.ts` and runtime-test launch/lifecycle seams. Tasks `#18`, `#36`, and `#3` also have unresolved shared-file ownership. They remain excluded behavior. Exact hunk mapping, eight-path overlay isolation, excluded-path hash stability, and the user's instruction to commit all work unrelated to `#40` completed the ownership-release/isolated-commit gate for #29; the seven `#40` paths and residual Herdr docs remain excluded.

## Revisit And Supersession

Revisit if Pi exposes a stable public canonical resolver, available/scoped semantics materially change, the package adopts an explicit scoped/custom-model policy, resume gains model overrides/migration, thinking-without-model changes, or child launch no longer accepts separate flags.

A later ADR must supersede this one for fuzzy/custom resolution, scoped/enabled admission, live provider checks, or resume normalization.

This ADR governed the previously authorized underlying implementation. Isolated commit `8ff926068a45a2590f05c9f136da05b5155bd1ff` completed the eight-path #29 delivery; before this reconciliation, all eight committed blobs matched `HEAD` byte-for-byte. The historical Pi `0.84.2` fifth-context run remains provenance only because its temporary collector, raw record, command output, and inventories were deleted; it is unavailable/non-current and is neither recreated nor claimed as fresh evidence.

Recorded historical validation was focused tests `20 pass`, `0 fail`, `673 assertions`; typecheck zero diagnostics; import smoke passed; candidate full suite `134 pass`, `1 fail`, `1347 assertions`; and exact-HEAD baseline `114 pass`, `1 fail`, `671 assertions` with the same sole spawn-description failure. The full suite is therefore not globally green. These results were not freshly rerun for this reconciliation because the unmodified workspace lacks local `tsc`, an environment evidence limitation rather than a behavioral failure.

The final independent review found runtime/tests P0-P3 zero; its P1 finding was stale six-document completion state, which this factual reconciliation corrected. Ownership release and the isolated implementation commit are complete. Post-reconciliation document identities, links, and the six-file boundary have been verified; this reconciliation is GO for one isolated six-document documentation commit.

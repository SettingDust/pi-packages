# Explicit `subagent_spawn` Model Validation Specification

- **Status:** #29 implementation and supported current verification are complete in the uncommitted working tree. The corrected-path final review found runtime/tests P0-P3 zero; its only NO-GO was stale document status, repaired here. The final same-byte truthfulness/identity check is pending, and no commit has been performed.
- **Scope:** `packages/pi-herdr-subagents`, initial `SubagentRuntime.spawn` only.
- **Decision record:** [Exact explicit spawn model references ADR](../adr/exact-explicit-spawn-model-reference.md)
- **Derived Work:** [Explicit spawn model validation Work](../works/explicit-spawn-model-validation/work.md)
- **Upstream baseline:** Pi coding agent `0.84.2`

## 1. Purpose And Ownership

This Specification owns validation of an explicitly supplied `subagent_spawn.model`, the validation failure contract, validation ordering, and generation-1 explicit-spawn model/thinking launch flags.

`SubagentRuntime.spawn` owns the behavioral decision. The Pi tool wrapper owns only adaptation of the invocation's `ExtensionContext.modelRegistry` into that runtime call. Pi owns model catalogs, provider authentication, the catalog/auth available snapshot, session-scoped model cycling, default-model resolution, thinking-level clamping, CLI parsing, and request-time behavior.

This v0.1 admission contract deliberately does not use `ExtensionContext.scopedModels` or the `enabledModels`/`--models` configuration from which Pi derives that separate session scope. It does not create a PRD or change package product intent.

## 2. Inputs And Terms

The runtime trust-boundary input is:

```ts
type SpawnInput = {
  agent: string;
  prompt: string;
  label: string;
  taskSlug?: string;
  model?: unknown; // schemas and TypeScript may be bypassed
  thinking?: string;
  cwd: string;
  parentSessionFile?: string;
};
```

Terms:

- **explicit model request:** any `model` value other than absent/`undefined`; this includes `""` and every present non-string such as `null`, a number, object, array, or boolean;
- **omitted model:** the `model` property is absent or its value is `undefined`, and only those cases;
- **canonical model reference:** the exact case-sensitive string `${provider}/${modelId}` for one model in Pi's current registry catalog;
- **known provider:** `modelRegistry.getProvider(provider) !== undefined`;
- **configured provider:** `modelRegistry.getProviderAuthStatus(provider).configured === true` in the invocation's current snapshot;
- **catalog model:** `modelRegistry.find(provider, modelId)` returns an exact model;
- **available model:** the same exact `(provider, modelId)` pair is present in `modelRegistry.getAvailable()` for the invocation's current catalog/auth snapshot;
- **launchable thinking value:** a non-empty string; `""` is omitted from launch arguments;
- **snapshot:** synchronous registry state already held by Pi for this invocation, not a live health probe or the session's scoped-model set.

Runtime validation accepts `unknown` because the TypeBox schema is not the enforcement boundary: direct callers, tests, compatibility hooks, or post-registration argument/schema mutation can bypass it.

```ts
type SpawnModelRegistry = {
  getProvider(provider: string): unknown;
  getProviderAuthStatus(provider: string): { configured?: unknown };
  find(provider: string, modelId: string): { provider: string; id: string } | undefined;
  getAvailable(): readonly { provider: string; id: string }[];
};
```

`SubagentRuntime.spawn(input: SpawnInput, registry?: SpawnModelRegistry)` is the exact runtime seam. `input.model` is `unknown` at runtime. `registry` is invocation-local: it is supplied for one call, never captured, cached, refreshed, or read from global state. The omitted/`undefined` model path may omit `registry`; an explicit model requires the production tool adapter's fifth Pi context to pass that invocation's `ctx.modelRegistry` as the second argument through this exact call. A missing fifth context or missing/invalid registry is therefore handled by the runtime, not by a wrapper precheck.

The structural registry above is the complete required interface for v0.1. Its four methods are checked and called only at their ordered validation point. `getProviderAuthStatus` must expose `configured`; `find` and each `getAvailable()` entry must expose the exact `provider` and `id` pair used for comparison. Other Pi registry members are outside this contract.

## 3. Canonical Reference Grammar

An explicit string must use the exact slash-delimited syntax `provider/modelId`:

```text
canonical-reference = provider "/" model-id
provider            = 1*provider-character
model-id            = 1*model-character
```

The grammar's `/` is the literal separator. `provider-character` is any Unicode code point except `/` and an ASCII control character. `model-character` is any Unicode code point except an ASCII control character; later `/` characters are therefore part of `model-id`. An ASCII control character is U+0000-U+001F or U+007F. The reference's UTF-8 encoding must be at most 256 bytes. These shape, control, and byte-length checks occur before registry access and use the same invalid-reference detail when more than one condition fails.

The first `/` separates provider from model ID. Acceptance additionally requires exact, case-sensitive equality with `${model.provider}/${model.id}` from the current catalog. No Unicode normalization is performed.

| Input | Result |
| --- | --- |
| `acme/model` | Well-formed; continue to registry validation and exact catalog/availability checks. |
| `提供者/模型/版本` | Well-formed Unicode identity; provider is `提供者` and model ID is `模型/版本`; continue to exact catalog/availability checks without normalization. |
| missing slash, empty provider, or empty model ID | `invalid_model_reference`; no registry access. |
| any ASCII control character, including U+0000-U+001F or U+007F | `invalid_model_reference`; no registry access. |
| UTF-8 encoding longer than 256 bytes | `invalid_model_reference`; no registry access. |

A present string that fails the shape, control, or length rules fails as `invalid_model_reference`; it is never treated as omitted. Validation must not trim, case-fold, normalize Unicode, rewrite aliases, split a thinking suffix, perform fuzzy matching, resolve a display name, infer a provider, accept a bare model ID, accept Pi's `provider:model` shorthand, or construct a custom fallback. Leading/trailing whitespace and case differences fail unless they literally occur in the catalog identity.

Residual risk: the 256-byte bound and control rejection bound the registry input but do not prove catalog membership, endpoint reachability, live health, quota, account permission, or later request success. The current catalog/auth snapshot can also change between invocations.

## 4. Ordered Validation Algorithm

The first operation performed by `SubagentRuntime.spawn` must be:

```text
validateExplicitSpawnModel(input.model, registry)
```

The validator must perform these steps in order and stop at the first failure:

1. If `model` is absent or `undefined`, return success without requiring, validating, or reading a registry.
2. If `model` is not a string, reject with `invalid_model_reference` and the bounded type detail in section 5.
3. Parse the canonical-reference grammar, including the no-control-character and UTF-8-at-most-256-byte rules. On failure, reject with `invalid_model_reference` and the bounded escaped value detail in section 5.
4. Require a non-null registry object. If it is absent or not an object, reject with `model_registry_error` at operation `registry`.
5. Require callable `getProvider`, then call it exactly once. A missing/non-callable member, throwing property access, or synchronous call throw rejects with `model_registry_error` at operation `getProvider`. If the successful result is `undefined`, reject with `provider_unavailable` and the unknown-provider detail.
6. Require callable `getProviderAuthStatus`, then call it exactly once. A missing/non-callable member, throwing property access, or synchronous call throw rejects with `model_registry_error` at operation `auth`. If the successful result has `configured !== true`, reject with `provider_unavailable` and the unconfigured-auth detail.
7. Require callable `find`, then call it exactly once. A missing/non-callable member, throwing property access, synchronous call throw, malformed non-absent returned identity, or returned identity different from the requested pair rejects with `model_registry_error` at operation `find`. Only an absent successful result rejects with `model_not_found`.
8. Require callable `getAvailable`, then call it exactly once. Before matching, structurally validate every returned entry as a non-empty slash/control/length-conforming provider/model identity; any malformed entry is `model_registry_error` at operation `getAvailable`, even if another entry is an exact match. A missing/non-callable member, throwing property access, synchronous call throw, or synchronous failure while reading that returned snapshot has the same classification. Only a fully structurally valid readable snapshot lacking the exact pair rejects with `model_unavailable`.
9. Otherwise return the catalog model or an immutable result sufficient for launch. Do not mutate or cache registry/runtime state.

Registry members are checked only when their ordered operation is reached; the validator must not preflight later methods. Provider/auth checking deliberately precedes exact model lookup. A known unconfigured provider is `provider_unavailable` even when its requested model ID is absent.

`model_registry_error` is the sole registry-integration classification. It must not be converted to any catalog code, expose the cause, or trigger catch-and-fallback, cache, refresh, retry, or later operation.

## 5. Stable Failure Contract

```ts
type ExplicitSpawnModelFailureCode =
  | "invalid_model_reference"
  | "provider_unavailable"
  | "model_not_found"
  | "model_unavailable"
  | "model_registry_error";

type ExplicitSpawnModelErrorFields = {
  code: ExplicitSpawnModelFailureCode;
  detail: string;
  operation?: "registry" | "getProvider" | "auth" | "find" | "getAvailable";
};

class ExplicitSpawnModelError extends Error implements ExplicitSpawnModelErrorFields {
  readonly code: ExplicitSpawnModelFailureCode;
  readonly detail: string;
  readonly operation?: ExplicitSpawnModelErrorFields["operation"];
}
```

For this contract, `SubagentRuntime.spawn` rejects with `ExplicitSpawnModelError`; it does not return a rejected-result union. The error's machine-readable payload is exactly `code`, `detail`, and, only for `model_registry_error`, the optional closed `operation`. `detail` is also the fixed safe `Error.message`. A direct runtime caller must catch this typed error and inspect those fields; it must not inspect or serialize a cause. The production `subagent_spawn` adapter must catch this typed error and return the same payload as both its JSON text content and `details`, so the tool-visible message includes the code and exact detail. It must not expose any other error field. Non-validation runtime failures retain their existing handling and are not converted to this contract.

For bounded stable details:

- `kind(value) = "null"` for `null`, `"array"` for arrays, otherwise JavaScript `typeof value`;
- `B(value)` for a string is its first 120 Unicode code points plus `…` only when truncated; and
- `Q(value) = JSON.stringify(B(value))`.

The validator never stringifies or traverses an object/array input; it reports only `Q(kind(value))`. `Q` escapes controls and quotes. Every caller-controlled detail fragment is bounded.

For a malformed, control-bearing, or overlong string, the validator emits exactly the one bounded escaped value detail above; it does not add a second reason or include the byte count. `B` truncates by Unicode code point, while the admission limit is measured independently on the UTF-8 encoding.

| Condition | Code | Exact detail template |
| --- | --- | --- |
| present non-string model | `invalid_model_reference` | `Expected an exact provider/modelId string; received type ${Q(kind(model))}.` |
| malformed shape, ASCII control, or UTF-8 length over 256 string | `invalid_model_reference` | `Expected an exact provider/modelId reference; received ${Q(model)}.` |
| unknown exact provider | `provider_unavailable` | `Provider ${Q(provider)} is unavailable: unknown provider.` |
| known provider, auth not configured | `provider_unavailable` | `Provider ${Q(provider)} is unavailable: authentication is not configured.` |
| configured known provider, no exact catalog model | `model_not_found` | `Model ${Q(canonicalReference)} was not found.` |
| exact catalog model absent from available snapshot | `model_unavailable` | `Model ${Q(canonicalReference)} is unavailable in the current catalog/auth snapshot.` |
| registry integration failure | `model_registry_error` | `Model registry integration failed at ${operation}.` |

For `model_registry_error`, `operation` must be exactly one closed, non-caller-controlled label: `registry`, `getProvider`, `auth`, `find`, or `getAvailable`. Missing registry uses `registry`; missing/non-callable methods, throwing property access, synchronous invocation throws, and synchronous returned-snapshot read failures use the operation reached in section 4. The code and detail are identical for all causes at that operation. No raw cause, cause message, stack, adapter/context object, registry dump, auth source, secret, prompt, header, environment value, or caller-provided fragment may appear.

The tool-visible message must include the code and exact detail. A typed-error validation failure is an ordinary spawn failure: no `subagentId`, generation, inspectable state, Result, or terminal notification exists.

## 6. Pi 0.84.2 Snapshot Semantics

Pi `0.84.2` `ModelRegistry.getAvailable()` returns a copy of `ModelRuntime.getAvailableSnapshot()`. `ModelRuntime` builds that held list from the current catalog and provider auth/configuration availability. For this contract, “available” means only exact membership in that catalog/auth snapshot.

Validation must not consult `ExtensionContext.scopedModels`, `--models`, or `enabledModels`. Consequently, an exact model may pass admission even when it is outside the current session's scoped cycling set. That consequence is intentional in v0.1; adding scoped/enabled admission policy requires new authority.

After Pi delivers the invocation `ExtensionContext`, the adapter/validator may use only `getProvider`, `getProviderAuthStatus`, `find`, and `getAvailable`. It must not call refresh, discovery, auth-secret resolution, OAuth, API-key/header resolution, model-list endpoints, completion APIs, retries, cooldown state, or another network/credential API.

This restriction does not claim that Pi performs no work before context delivery. Pi `0.84.2` may initialize its ordinary local catalog and auth snapshots while constructing an offline session, and print mode requires a selected startup model before command dispatch. The real fixture in section 15 must bound and record that startup prerequisite separately. It must still perform no model inference/provider request, and fixture-owned provider-request instrumentation must remain zero.

Snapshot membership does not prove endpoint reachability, live health, quota, absence of 429/rate limiting, cooldown state, account permission, future request success, or continued availability. A model can pass and fail later during child startup or requests. Each explicit initial spawn uses its invocation registry; no accepted result is cached across invocations.

## 7. No-Side-Effect Ordering

For every rejected explicit request, validation must complete before:

1. `taskSlug` validation/normalization;
2. Agent lookup, file reading, or discovery;
3. scope selection/recovery/switching;
4. task-ID or suffix reservation;
5. identity or generation allocation;
6. task/artifact/session/Result/manifest/launch/bootstrap path creation;
7. directory creation, task file reads/writes, temporary writes, or renames;
8. task-map insertion/mutation;
9. observer subscription/emission or widget invalidation;
10. monitor/timer/notifier creation or cancellation;
11. completion notification registration/delivery; or
12. any Herdr transport call, wrapper/bootstrap execution, or child process.

A rejected request leaves no identity, task/artifact directory, file, task update, monitor, notification, tab, pane, or child and does not disturb existing tasks/scope. Invalid model dominates invalid/missing `taskSlug` and Agent input.

## 8. Runtime And Tool-Wrapper Ownership

`SubagentRuntime.spawn(input, registry?)` remains the single enforcement boundary for direct and Pi tool callers. The adapter must:

- accept Pi's fifth tool-execute argument (`ExtensionContext`);
- pass that invocation's `ctx.modelRegistry` as the exact second argument to `SubagentRuntime.spawn(input, registry?)`;
- ignore `ctx.scopedModels`, `enabledModels`, and parent `ctx.model` for v0.1 admission;
- avoid captured/stale registries and refresh/auth/network APIs; and
- leave all non-spawn tools unchanged.

The runtime must use the smallest Node-compatible structural registry interface defined in section 2. It must not duplicate Pi's private resolver. Omitted model must work without a registry adapter. For a well-formed explicit model, an absent fifth context or absent/invalid `ctx.modelRegistry` must reach the runtime as an unavailable registry and produce the typed `ExplicitSpawnModelError` with `{ code: "model_registry_error", detail: "Model registry integration failed at registry.", operation: "registry" }` before section-7 effects; the wrapper must not throw or stringify the raw context first. The adapter maps that same safe field set to its tool result.

## 9. Separate Initial-Spawn And Resume Launch Seams

The implementation must have separate caller-owned launch-argument seams (or an explicit origin discriminator) before shared lifecycle launch:

- the initial-spawn seam admits and emits generation-1 explicit model/thinking flags under this Specification;
- the resume seam emits the persisted legacy combined model/thinking value unchanged.

Shared `start`/transport/bootstrap code may remain, but it must receive the already-selected launch arguments/policy. It must not infer the policy from truthiness alone, revalidate resume, or silently apply generation-1 normalization to generation 2.

For newly admitted generation 1:

```text
--model <exact-provider/modelId>
--thinking <level>                 # only for a non-empty string
```

| `model` | `thinking` | Generation-1 child arguments |
| --- | --- | --- |
| omitted | omitted or any current typed value | neither flag; current default/thinking-without-model behavior |
| valid explicit | omitted or `""` | `--model`, exact canonical reference |
| valid explicit | non-empty string | `--model`, exact reference, then `--thinking`, exact supplied value |
| invalid explicit | any | no launch construction; spawn rejects |

Exact token acceptance examples:

```text
new spawn, model=acme/family/model, thinking=high
["--model", "acme/family/model", "--thinking", "high"]

new spawn, model=acme/model, thinking=""
["--model", "acme/model"]
```

Argument values remain distinct array elements through PowerShell and Node/Bun bootstrap. Existing direct invocation of the active runtime and Pi entry script remains unchanged.

## 10. Thinking Semantics

This package defines only launch emission:

- `""` is omitted and preserves current behavior;
- a syntactically valid non-empty Pi level is passed unchanged;
- a syntactically invalid non-empty string is also passed unchanged; Pi `0.84.2` CLI emits its warning and leaves parsed thinking unset, so Pi's default behavior applies;
- a syntactically valid level unsupported by the selected model is not rejected; Pi `AgentSession.setThinkingLevel` applies `clampThinkingLevel` against model capability.

There is no `invalid_thinking`, capability matrix, or private thinking resolver. CLI syntax handling and AgentSession capability clamping are distinct upstream stages and must have separate regressions. Thinking without model remains retained only by the existing task data path and produces no child thinking flag.

## 11. Omitted Model Compatibility

When model is absent/`undefined`, validation returns immediately, no parent model is inferred/persisted, launch omits model/thinking flags, Pi retains child/default-model resolution, and identity/lifecycle/notification behavior remains unchanged. This Specification does not make the child default observable or stable.

## 12. Resume Compatibility Contract

`SubagentRuntime.resume` and `subagent_resume` remain excluded: no registry is supplied/read, no model is revalidated, no override is accepted, and persisted values are not migrated.

A completed generation-1 task persisted with `model = "acme/family/model"` and `thinking = "high"` must launch generation 2 with the exact legacy token subsequence:

```text
["--model", "acme/family/model:high"]
```

Generation 2 must contain no `--thinking` token. With persisted model and empty/omitted thinking, it remains `["--model", "acme/family/model"]`. The generated PowerShell/bootstrap argv must preserve that single combined value byte-for-byte. This regression is mandatory so refactoring shared `start` cannot normalize resume accidentally.

Future resume validation, overrides, migration, or stale-model policy require separate authority.

## 13. Compatibility And Observability

Only explicit initial spawn is narrowed: fuzzy, bare-ID, alias, shorthand, display-name, and custom-fallback values reject; exact canonical catalog/auth-available references launch; omitted model remains default; generation-1 flags separate; empty thinking remains omitted; invalid CLI syntax warns/defaults in Pi; valid capability-unsupported thinking clamps in Pi; generation-2 resume remains legacy-combined.

Inspect/join/cancel/remove/recovery/notification/widget/steering contracts remain unchanged. Rejection writes no failure artifact and emits no terminal notification.

## 14. Non-Goals

This Specification does not validate/change resume; consult `scopedModels`/`enabledModels`; probe health/429/cooldown/quota; refresh catalog/auth; support fuzzy/custom resolution; validate thinking syntax/capability; infer parent model; activate thinking without model; change Agent discovery, IDs, lifecycle, cleanup, notifications, workspace targeting, or Windows invocation; implement Task `#37` Phase B, `#18`, `#36`, or `#3`; add dependencies; or add Bun-only runtime requirements.

## 15. Acceptance Conditions

Implementation is conformant only when:

1. red baseline proves current invalid explicit models reach launch and current shared launch combines model/thinking;
2. fake matrix covers absent/undefined, malformed shape, empty sides, ASCII controls U+0000-U+001F/U+007F, UTF-8 lengths of 256 and 257 bytes, `null`/number/object/array/boolean, every missing registry/method and synchronous registry-operation throw, unknown provider, auth, exact catalog/availability, case, later `/`, snapshot changes, and scoped-model exclusion;
3. every rejection proves section-7 state/filesystem/observer/notification/transport zeros and invalid-model precedence; every integration row additionally proves the typed error's exact fields, closed operation detail, and zero later registry operations;
4. direct runtime and production tool adapter paths share runtime-first validation, including absent fifth context/registry behavior;
5. the production tool's actual five-argument `execute(..., ctx)` path proves the fifth context's `modelRegistry` reaches runtime;
6. generation-1 exact tokens cover omitted/empty/non-empty thinking, syntactically invalid warning/default behavior, and capability-unsupported AgentSession clamping;
7. a persisted model+thinking generation-2 resume proves exact legacy `["--model", "provider/modelId:thinking"]` and no `--thinking` token through bootstrap;
8. an isolated Pi `0.84.2` fixture creates a unique `node:fs.mkdtemp` run root under `node:os.tmpdir()`, preflights and explicitly selects a fixture-local startup model, and treats failed selection or missing command entry as failure/inconclusive rather than adapter success;
9. the fixture command owns `try`/`catch`/`finally`, calls the production five-argument adapter, derives an unknown provider only when `ctx.modelRegistry.getProvider(token) === undefined`, performs no post-context refresh/network/auth-secret call, and records zero provider request and `transport.run` counts;
10. the command sets nonzero `process.exitCode` on every assertion, adapter, inventory, evidence-write, or cleanup failure and attempts exactly one machine JSON record through `node:fs.writeSync(1, bytes)` containing command entry, Pi version, non-secret startup-model provenance, adapter invocation, exact typed failure `{code,detail,operation?}`, complete before/after ledger, transport counts, artifact inventories, and cleanup result;
11. the run root contains all fixture/runtime paths, pre-inventory is asserted, post-inventory is captured, and only that run-owned root is removed in `finally`; an outer collector performs the same bounded fallback cleanup when startup fails before command entry;
12. zero `transport.run` plus absence of launch/bootstrap files is accepted as transitive proof that no wrapper/bootstrap/child executed; no new process abstraction is added; and
13. Before a commit, current package checks, Markdown validation, shared-file ownership, and a fresh post-reconciliation independent correctness/evidence review must support the exact committed revision.

## 16. Authority And Ownership Gate

This package's underlying #29 implementation was previously authorized and is implemented in the uncommitted working tree. Exact hunk mapping, eight-path overlay isolation, excluded-path hash stability, and the user's instruction to commit all work unrelated to `#40` satisfy the prior shared-owner release/isolated-commit gate for this candidate; the seven `#40` paths and residual Herdr docs remain excluded. The corrected-path final review found runtime/tests P0-P3 zero and identified only stale document status as its NO-GO. It did not review the hashes produced by this reconciliation. The historical Pi `0.84.2` fifth-context run remains unavailable/non-current and is neither recreated nor used as current completion evidence. The final same-byte truthfulness/identity check is pending; no commit has been performed.


## 17. Current Repair Evidence (2026-08-21)

Current #29 verification is: focused tests `20 pass`, `0 fail`, `673 assertions`; typecheck zero diagnostics; import smoke passed; candidate full suite `134 pass`, `1 fail`, `1347 assertions`; and the exact HEAD baseline reproduced the same sole spawn-description failure with `114 pass`, `1 fail`, `671 assertions`. The full suite is not globally green. The current focused/typecheck/import/full-suite evidence is distinct from unavailable historical real-Pi fifth-context provenance: its temporary collector, raw fd-1 record, command output, and inventories were deleted and must not be recreated or claimed. Implementation and verification are complete as supported; final same-byte truthfulness/identity check pending; commit not yet performed.

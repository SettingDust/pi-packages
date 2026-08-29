# Explicit Spawn Model Validation Implementation Plan

- **Task:** `#29`
- **Status:** #29 implementation, recorded historical validation, final independent review, ownership release, and the isolated eight-path commit are complete. Commit `8ff926068a45a2590f05c9f136da05b5155bd1ff` (`fix(herdr): validate explicit spawn models`) contains the six #29 documents, `src/index.ts`, and `tests/runtime.test.ts`; this separate reconciliation changes only the six documents.
- **Work:** [work.md](work.md)
- **Authority:** [Specification](../../spec/explicit-spawn-model-validation.md); [ADR](../../adr/exact-explicit-spawn-model-reference.md)
- **Context:** [context.md](context.md)
- **Tasks:** [tasks.md](tasks.md)

## Objective

The previously authorized #29 implementation is complete in commit `8ff926068a45a2590f05c9f136da05b5155bd1ff`: it applies the smallest runtime-first validator at `SubagentRuntime.spawn(input, registry?)` using Pi `0.84.2`'s catalog/auth snapshot; passes the invocation-local `ctx.modelRegistry` from the production fifth-context adapter as the exact second argument; rejects via one typed `ExplicitSpawnModelError` with exact `code`, `detail`, and optional closed `operation`; emits separate generation-1 flags; and preserves omitted-model, thinking stages, and legacy generation-2 resume. Broken registry wiring has one stable non-catalog error contract and fails before all lifecycle effects. Recorded historical verification and final independent review are complete; this factual reconciliation changes no behavior.

## Scope

- One focused validator at the first `SubagentRuntime.spawn(input, registry?)` operation, accepting `unknown` model input and the smallest Node-compatible structural registry (`getProvider`, `getProviderAuthStatus`, `find`, `getAvailable`).
- One typed `ExplicitSpawnModelError` transport; direct callers catch its exact fields and the production adapter maps the same fields to JSON text and `details`.
- Spawn tool fifth-context `ctx.modelRegistry` adaptation only; omitted/`undefined` model may omit the registry.
- Public-doc reconciliation only after implementation exists.

## Non-Goals

No scoped/enabled-model admission; resume validation/override/migration; refresh/auth-secret/network/live-health/429/cooldown work; private resolver; package thinking syntax/capability rejection; parent-model inference; thinking activation without model; Agent discovery/dependency/lifecycle/notification/workspace/Windows invocation change; Task `#37` Phase B, `#18`, `#36`, `#3`; or unrelated repair.

## Reconciled Completion Boundary

The exact hunk mapping, eight-path overlay isolation, excluded-path hash stability, and the user's instruction to commit all work unrelated to `#40` completed the shared-owner release/isolated-commit gate for #29. Commit `8ff926068a45a2590f05c9f136da05b5155bd1ff` is the resulting isolated eight-path commit; the seven `#40` paths and residual Herdr docs remain excluded. The final independent review found runtime/tests P0-P3 zero and only stale document status as its P1 finding. Recorded historical focused, typecheck, import-smoke, and candidate/full-baseline suite evidence is stated below. Historical real-Pi fifth-context material is unavailable/non-current and is not recreated or claimed as fresh evidence. This six-document update requires its own identity and boundary check before an optional documentation-only commit.

## Minimum Implementation Strategy

### 1. Red baseline and ledger

Before production edits, add focused expectations proving current behavior:

- invalid explicit model reaches allocation/launch;
- current model+thinking is combined;
- current thinking without model emits neither flag;
- current generation-2 resume uses persisted combined model+thinking;
- intended invalid-model error should dominate slug/Agent errors.

Create one reusable assertion ledger over IDs/reservations, root entries, task map/scope, updates/widgets, monitors, notifications, transport calls, and launch/bootstrap files. Retain expected red output; never commit it.

The exact slash-delimited grammar is `${provider}/${modelId}`: provider and model ID are non-empty, provider excludes `/`, the first `/` separates them, later `/` characters remain in the model ID, Unicode is preserved without normalization, ASCII controls U+0000-U+001F and U+007F are rejected, and UTF-8 length must be at most 256 bytes before registry access. Shape, control, and length failures are `invalid_model_reference` with one bounded escaped detail and no registry access.

Use a small synchronous function in the existing module unless ownership makes a tiny local module safer. The runtime seam is `SubagentRuntime.spawn(input, registry?)`; `input.model` is `unknown`, and `registry` is invocation-local rather than captured or cached.

```text
absent/undefined -> success, no registry read
present non-string -> typed ExplicitSpawnModelError: invalid_model_reference
malformed shape/control/length -> typed ExplicitSpawnModelError: invalid_model_reference + bounded escaped value
missing/invalid registry -> model_registry_error / registry
missing/non-callable or throwing getProvider -> model_registry_error / getProvider
missing/non-callable or throwing auth -> model_registry_error / auth
missing/non-callable or throwing find -> model_registry_error / find
missing/non-callable, throwing getAvailable, or snapshot-read throw -> model_registry_error / getAvailable
getProvider(provider) === undefined -> provider_unavailable / unknown
find absent -> model_not_found
find non-absent malformed or identity mismatch -> model_registry_error / find
getAvailable malformed entry -> model_registry_error / getAvailable
fully valid available snapshot lacking exact pair -> model_unavailable
exact available pair -> admitted canonical model; no registry/runtime mutation
```

Every admission failure carries exactly `code`, `detail`, and optional closed `operation`; direct callers catch the typed error and the adapter maps those fields without raw causes. Check each member only at its ordered point. Integration failure is never a catalog code and never falls back, caches, refreshes, retries, or exposes the cause. Read only the four structural methods. Do not traverse non-string objects, read scoped/auth/network/private resolver APIs, or stringify raw adapter/context errors.

Change the existing tool helper only enough for its execute callback to receive Pi's fifth `ExtensionContext`. Only spawn passes that invocation's `ctx.modelRegistry` as the exact second argument to `SubagentRuntime.spawn(input, registry?)`; omitted/`undefined` model may omit it. The adapter catches `ExplicitSpawnModelError` and maps exactly `code`, `detail`, and optional closed `operation` to JSON text and `details`. Ignore `ctx.scopedModels` and `ctx.model`; other tools remain unchanged.

### 4. Separate launch-policy seams

Do not let shared `start` choose both policies through one changed truthiness branch. Have spawn and resume select launch arguments/policy explicitly before shared lifecycle transport/bootstrap work.

Generation-1 expected subsequences:

| Model | Thinking | Tokens |
| --- | --- | --- |
| omitted | any current typed value | none |
| explicit | omitted/`""` | `["--model", "provider/modelId"]` |
| explicit | non-empty | `["--model", "provider/modelId", "--thinking", "value"]` |

Generation-2 persisted compatibility:

```text
model=acme/family/model, thinking=high
["--model", "acme/family/model:high"]
no --thinking token
```

Preserve each token through generated PowerShell and Node/Bun bootstrap. Do not alter executable discovery, runtime/entry invocation, or quoting.

### 5. Deterministic fake matrices

#### Input/error matrix

| Case | Expected |
| --- | --- |
| property absent / `undefined`, no registry | unchanged default path |
| `null`, number, plain object, array, boolean | exact `invalid_model_reference` type detail |
| empty/no slash/empty side/control-bearing/overlong string | exact bounded escaped `invalid_model_reference`; no registry access |
| 256-byte well-formed reference | continue to registry validation |
| 257-byte reference or any ASCII control | `invalid_model_reference`; no registry access |
| missing/invalid registry | `model_registry_error` / `registry` |
| missing/non-callable/throwing `getProvider` | `model_registry_error` / `getProvider` |
| missing/non-callable/throwing auth | `model_registry_error` / `auth` |
| missing/non-callable/throwing `find` | `model_registry_error` / `find` |
| missing/non-callable/throwing `getAvailable` or returned snapshot read | `model_registry_error` / `getAvailable` |
| `getProvider` exact absence | unknown `provider_unavailable` |
| known provider, unconfigured auth, missing/known model | auth `provider_unavailable` |
| configured provider, exact model absent | `model_not_found` |
| exact catalog model absent from `getAvailable` | `model_unavailable` |
| exact available pair | admitted |
| case mismatch | ordered exact failure; no fuzzy match |
| model ID with later `/` | admitted exact; split first slash only |
| changed invocation snapshots | no cache; each current result |

Every integration row asserts the exact fixed safe detail, zero later registry operations, no catalog-code conversion, no raw cause, and the full zero-effect ledger.

#### Availability/scope matrix

Use the same catalog/auth snapshot with two different `scopedModels`/enabled-model fixtures. Admission outcome must be identical. An exact catalog/auth-available model absent from scope must pass; no validator call reads scoped/enabled data.

#### Thinking matrix

| Case | Expected |
| --- | --- |
| explicit model + `""` | model only |
| valid supported non-empty | separate thinking token |
| invalid non-empty syntax | package passes token; Pi CLI parser fixture observes warning and unset/default thinking |
| valid capability-unsupported | package passes token; Pi AgentSession fixture observes upstream clamp |
| thinking without model | neither model nor thinking token |

#### Resume matrix

Recover or seed a completed persisted generation-1 record with model+thinking, call `resume`, and inspect generation-2 PowerShell/bootstrap argv. Require exact combined value and no separate thinking token. Also cover persisted model with empty/omitted thinking.

For every rejection, the full ledger is zero and existing tasks/scope are byte-equivalent. Invalid model competes with invalid slug and Agent to prove precedence.

### 6. Temporary real Pi adapter fixture

Create a unique run-owned root with Node-compatible `mkdtemp` under `os.tmpdir`; all fixture/runtime/support paths remain below it. Assert the pre-inventory before startup, capture post-inventory, and remove only this root in `finally`. No fixed `%TEMP%` path, shared-parent recursive deletion, stale-run reuse, or concurrent-run ambiguity is permitted.

The collector first performs a deterministic local preflight that selects one fixture-registered startup model. Pi `0.84.2` print mode requires a startup model before command dispatch; a missing, ambiguous, or failed selection is a nonzero fail/inconclusive result and cannot claim command entry or adapter success. That selected model exists only to construct the real session. After ExtensionContext delivery, validator-owned work may not refresh, resolve auth secrets, use OAuth/model-list/completion/network APIs, or make inference; ordinary offline Pi startup may initialize local catalog/auth snapshots.

The command handler owns `try`/`catch`/`finally`, invokes the real five-argument adapter, and explicitly sets nonzero `process.exitCode` for every assertion, adapter, inventory, evidence-write, or cleanup failure. It emits exactly one newline-terminated machine JSON record through direct `node:fs.writeSync(1, bytes)`, with command entry, Pi version, secret-free selected startup-model provenance, adapter invocation, exact failure code/detail, full before/after ledger, transport counts, artifact inventories, provider-request count, and cleanup result. The installed `output-guard.js:38-63,69-88` is cited only for stdout takeover/redirection and its separate raw writer/flush path; the fixture's console behavior is a package-level contract requirement. Missing command entry, extra/malformed record, failed cleanup, or any provider request is fail/inconclusive, never a silent pass.

Fixture contract:

1. Register a static fixture-local startup provider/model and a fail-on-call provider adapter; startup construction may read local catalog/auth state but must not request a model.
2. Capture the production spawn definition and call `spawnTool.execute(callId, params, undefined, undefined, ctx)` so Pi's real fifth context enters the production adapter.
3. Derive candidates until the exact assertion `ctx.modelRegistry.getProvider(token) === undefined` passes; call no post-context refresh/auth-secret/OAuth/model-list/completion/network API.
4. Use a fail-on-call/counting in-memory `HerdrTransport`; never create a real Herdr client.
5. Snapshot task/scope/root/update/notification/transport observations and complete root-relative artifact inventories before and after.
6. Assert exact unknown-provider failure, all counts zero, especially `transport.run === 0`, and no runtime task/artifact/manifest/session/launch/bootstrap/Result file.
7. Use zero `transport.run` plus absent launch/bootstrap as transitive no-wrapper/bootstrap/child proof; add no process seam.
8. The historical fixture was run only after implementation authorization. Its evidence is now unavailable/non-current because the temporary artifacts were deleted; do not recreate it or treat its absence as current focused/typecheck/import/full-suite evidence.

### 7. Reconcile and verify

After behavior exists, reconcile README and status/evidence only to the actual stage. Keep snapshot-not-health, scoped exclusion, thinking stages, and resume legacy compatibility explicit.

## Completed Delivery State

```text
previously authorized implementation
  -> runtime, adapter, launch seams, and deterministic coverage complete
  -> recorded historical focused/typecheck/import/suite evidence complete
  -> final independent review: runtime/tests P0-P3 zero; P1 stale status identified
  -> ownership release and isolated eight-path implementation commit complete
  -> six-document factual reconciliation
  -> post-edit document identity and boundary check passed
  -> GO: isolated six-document documentation commit
```

The historical real-Pi fifth-context report remains unavailable/non-current because its temporary artifacts were deleted. It is not recreated or used as fresh evidence. Current fresh execution is unavailable without workspace mutation because local `tsc` is absent; this is an environment evidence limitation, not a behavioral failure.

## Verification Gates

### Focused red/green

Expected baseline failures are recorded before production edits; same checks pass afterward; no red state is committed.

### Deterministic fake

- exact code/detail matrix, including every missing registry/method and synchronous throw/read failure;
- exact closed operation precedence and zero later calls for each integration row;
- scoped/enabled exclusion with identical admission outcomes;
- complete zero ledger for each rejection and no suffix consumption;
- exact generation-1 separate tokens;
- empty/invalid/capability thinking stages;
- exact generation-2 persisted combined token through bootstrap;
- omitted/default behavior unchanged.

### Package and Markdown

```text
bun run --cwd packages/pi-herdr-subagents typecheck
bun run --cwd packages/pi-herdr-subagents test
git diff --check -- packages/pi-herdr-subagents
```

Also run a deterministic Markdown script checking all six local links resolve, required draft markers remain, forbidden deprecated availability wording is absent, scoped exclusion and generation-2 token text are present, and no trailing whitespace exists.

### Real acceptance

- unique `mkdtemp` run root under `os.tmpdir`, asserted pre-inventory, captured post-inventory, and root-only `finally` cleanup;
- deterministic startup-model preflight succeeds before print command entry, or fails closed without claiming adapter evidence;
- exact installed Pi `0.84.2` entry and temporary extension command recorded;
- actual fifth context reaches production adapter;
- unknown token accepted only after `getProvider(token) === undefined`;
- no post-context refresh/network/auth-secret call or provider request;
- exact failure fields and every side-effect/transport count zero;
- one raw fd-1 JSON record and explicit nonzero exit on every failure;
- zero `transport.run`, no launch/bootstrap/runtime artifacts, hence no child;
- no user Herdr state touched.

### Reconciliation identity gate

The final independent review and pre-reconciliation eight-path identity review are complete. The factual six-document update has passed its SHA-256 identity, link, source/test-stability, path-scope, trailing-whitespace, and `git diff --check` verification; it is GO for an isolated documentation-only commit.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| schema mutation bypasses string type | runtime accepts `unknown`; present non-strings tested |
| input detail leaks/is unbounded | bounded string/type-only formatter; no object traversal |
| scoped set accidentally narrows admission | no scoped argument in validator; changed-scope invariant test |
| stale/captured registry | invocation fifth context only; no setter/cache |
| thinking stages conflated | separate CLI warning/default and AgentSession clamp checks |
| resume normalized by shared refactor | separate policy seam and exact generation-2 bootstrap regression |
| child/process claim overstated | zero `run` + no bootstrap; document sole spawn chain; no new abstraction |
| unknown provider assumption becomes stale | derive via exact `getProvider(token) === undefined` each run |
| fixture startup model unavailable | deterministic local preflight; fail/inconclusive before claiming command/adapter evidence |
| fixture output/cleanup is masked | raw fd-1 single record, explicit exit code, unique mkdtemp root, inventory, and finally cleanup |
| shared active work | exact hunk mapping, eight-path overlay isolation, excluded-path hash stability, and the user's #40-excluding commit instruction satisfy the prior candidate gate; do not include the seven #40 paths or residual Herdr docs |

## Rollback And Authority Drift

No migration/durable rejected state is introduced. Before commit, revert only ownership-clean Task `#29` hunks; after an isolated commit, revert that coherent commit. Existing persisted tasks keep resume behavior.

Stop if Pi APIs, current launch/resume flow, or review evidence contradict this package. Any change to grammar, errors, availability/scope, thinking, omitted/default, resume, no-effect, or real-fixture criteria requires a fresh authority amendment and user acceptance.

## Recorded Execution Evidence (2026-08-21)

- Historical focused tests: `20 pass`, `0 fail`, `673 assertions`; typecheck zero diagnostics; import smoke passed.
- Historical candidate full suite: `134 pass`, `1 fail`, `1347 assertions`. Exact HEAD baseline: `114 pass`, `1 fail`, `671 assertions`, reproducing the same sole spawn-description failure. The suite is not globally green.
- Final independent review: runtime/tests P0-P3 zero; its P1 finding was stale six-document completion wording. Ownership release and isolated commit `8ff926068a45a2590f05c9f136da05b5155bd1ff` are complete.
- These tests were not freshly rerun for this reconciliation because the unmodified workspace lacks local `tsc`; this is an environment evidence limitation, not a behavioral failure. Historical Pi `0.84.2` fifth-context evidence remains unavailable/non-current and is not recreated or claimed as fresh evidence.

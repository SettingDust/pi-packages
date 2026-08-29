# Explicit Spawn Model Validation Context

- **Task:** `#29`
- **Status:** #29 implementation, recorded historical validation, final independent review, ownership release, and the isolated eight-path commit are complete. Commit `8ff926068a45a2590f05c9f136da05b5155bd1ff` (`fix(herdr): validate explicit spawn models`) contains the six #29 documents, `src/index.ts`, and `tests/runtime.test.ts`; this separate reconciliation changes only the six documents.

- **Work:** [work.md](work.md)
- **Authority Spec:** [Specification](../../spec/explicit-spawn-model-validation.md)
- **Decision:** [ADR](../../adr/exact-explicit-spawn-model-reference.md)
- **Plan:** [plan.md](plan.md)
- **Tasks:** [tasks.md](tasks.md)
- **Evidence baseline:** installed `@earendil-works/pi-coding-agent` `0.84.2` at `D:/Applications/Scoop/apps/pi-coding-agent-bun/0.84.2/node_modules/@earendil-works/pi-coding-agent/`; inspected 2026-08-21

## Objective

Record settled evidence and boundaries for side-effect-free explicit initial-spawn model validation. The Spec owns normative behavior; the ADR owns the resolution/launch decision; this file records provenance, current behavior, review corrections, risks, and ownership.

## Settled Decisions

1. Exact case-sensitive slash-delimited `${provider}/${modelId}` only for explicit initial spawn; Unicode identities are preserved without normalization, both sides are non-empty, provider excludes `/`, later `/` characters remain in `modelId`, ASCII controls U+0000-U+001F/U+007F fail, and UTF-8 length must be at most 256 bytes before registry access.
2. Availability means Pi `0.84.2` catalog/auth `ModelRegistry.getAvailable()` snapshot membership only.
3. Do not consult `ExtensionContext.scopedModels`, `enabledModels`, or `--models` in v0.1. A model outside session cycling scope can pass.
4. Unknown provider and unconfigured auth are `provider_unavailable`; configured provider with missing exact model is `model_not_found`; exact catalog model absent from catalog/auth availability is `model_unavailable`.
5. Runtime model input is `unknown`; only absent/`undefined` is omitted. Present non-strings, including `null`, number, object, array, and boolean, are `invalid_model_reference` with bounded escaped/type details.
6. Initial spawn only; resume receives no registry, performs no validation, and retains persisted legacy combined launch.
7. Initial generation 1 uses separate `--model` and non-empty `--thinking`; empty thinking remains omitted.
8. Invalid non-empty thinking syntax follows Pi CLI warning/default; valid capability-unsupported thinking follows AgentSession clamping. No `invalid_thinking` exists.
9. Validation is the first runtime operation, before slug/Agent/allocation/files/state/observation/notification/Herdr/child effects.
10. No private fuzzy/custom resolver, refresh, auth-secret, network, health, 429, cooldown, or cache path.
11. The #29 implementation is complete in isolated commit `8ff926068a45a2590f05c9f136da05b5155bd1ff`. The final independent review found runtime/tests P0-P3 zero; stale six-document completion wording was its only P1 finding. Exact hunk mapping, eight-path overlay isolation, excluded-path hash stability, and the user's instruction to commit all work unrelated to `#40` completed the ownership-release/isolated-commit gate; the seven `#40` paths and residual Herdr docs remain excluded. The historical Pi `0.84.2` fifth-context run is unavailable/non-current because supporting artifacts were deleted; it is not recreated or used as fresh evidence.

## Current Package Flow

Inspected `src/index.ts` currently follows:

```text
tool params
  -> createSubagentTools receives the fifth ExtensionContext
  -> subagent_spawn passes ctx.modelRegistry to SubagentRuntime.spawn(input, registry?)
  -> runtime-first explicit model validation
  -> taskSlug validation
  -> AgentRegistry.get
  -> tasksDir/selectScope/reserveSubagentId
  -> shared start
  -> persist queued task + update
  -> transport.createTab
  -> separate generation-1 model/thinking launch args
  -> write bootstrap + PowerShell launch files
  -> transport.run
  -> bootstrap spawnSync child
```

The accepted implementation now enforces `SubagentRuntime.spawn(input, registry?)`. `input.model` is `unknown`; `registry` is one invocation-local structural object with only `getProvider`, `getProviderAuthStatus`, `find`, and `getAvailable`. Omitted/`undefined` model may omit it. The production five-argument adapter passes `ctx.modelRegistry` as the exact second argument for explicit model calls. Missing/invalid registry is a runtime `ExplicitSpawnModelError` with `{ code: "model_registry_error", detail: "Model registry integration failed at registry.", operation: "registry" }`.

`resume` still calls the same shared `start` with persisted `model`/`thinking` and generation incremented, but selects the preserved legacy combined launch policy. Initial generation 1 uses separate model/thinking flags. Recorded historical focused, typecheck, import-smoke, candidate/full-baseline suite, and final-review evidence supports the source behavior; historical real-Pi fifth-context evidence remains unavailable/non-current. Fresh execution was not performed for this reconciliation because the unmodified workspace lacks local `tsc`; this is an environment evidence limitation, not a behavioral failure.


Runtime validation now rejects explicit model identity/auth/availability failures before allocation. The production adapter maps the typed error's `code`, `detail`, and optional closed `operation` to JSON text and `details`.

## Pi 0.84.2 Source Objects

All upstream locators are under:

`D:/Applications/Scoop/apps/pi-coding-agent-bun/0.84.2/node_modules/@earendil-works/pi-coding-agent/`

Accessed 2026-08-21. Claims apply only to installed `0.84.2`.

| Locator / title | Claim and direct support | Scope / limit |
| --- | --- | --- |
| `package.json:2-10`, package identity/bin | Version is `0.84.2`; CLI entry is `dist/cli.js`. | Supports exact fixture command. |
| Scoop `manifest.json:15-25`, installation wrapper | Installed `pi.cmd` invokes Bun with that exact CLI entry. | Fixture may invoke Bun + entry directly, avoiding shim ambiguity. |
| `dist/main.js:568-626`, extension/runtime creation | CLI resolves explicit extension paths and supplies them to runtime resource loading; the runtime then exposes the extension context. | Current installed `0.84.2` extension-loading locator; the implementation source is present, while the reported real-Pi execution is historical provenance only. |
| `dist/main.js:726-728`, print-mode startup guard | Non-interactive mode exits when no session model is selected. | Explains the fixture's required startup-model preflight. |
| `dist/core/extensions/types.d.ts:209-229`, `ExtensionContext` | `modelRegistry` and separate `scopedModels` are present; comments define scoped models as `--models`/`enabledModels` session scope. | Proves separation; does not authorize scoped admission. |
| `dist/core/extensions/types.d.ts:344-373`, `ToolDefinition.execute` | Tool execute receives context as fifth argument. | Production adapter seam. |
| `dist/core/extensions/types.d.ts:852-857`, `RegisteredCommand.handler`; `dist/core/extensions/types.d.ts:901-904`, `ExtensionAPI.registerCommand` | Registered command handlers receive a real command context, and extensions can register the fixture command. | Command-entry seam. |
| `dist/core/extensions/types.d.ts:964-1015`, `registerProvider` | An extension can register static provider/model metadata and a custom stream adapter. | Deterministic fixture-local startup model; not spawn admission. |
| `dist/core/model-registry.js:18-25,59-64`, registry facade | `getAvailable`, `find`, `getProvider`, and `getProviderAuthStatus` synchronously forward to runtime and may propagate synchronous failures. | Required structural reads and integration boundary only. |
| `dist/core/model-runtime.js:51-57,166-172,190-196,302-304`, runtime snapshot | Snapshot has `all`, `available`, configured providers/auth; held available list is updated from catalog/auth state. | Supports “catalog/auth snapshot,” not live health or scoped filtering. |
| `dist/core/model-runtime.js:411-420`, auth status | `getProviderAuthStatus` resolves current held credential/config/auth state. | No validator secret resolution required for read. |
| `dist/core/agent-session.js:797-805`, prompt command order | Extension command execution is attempted before model/auth checks and returns when handled. | Real command can intercept before provider request once session has a model. |
| `dist/core/agent-session.js:924-946`, command catch | Pi catches command errors outside the handler. | Fixture must not rely on this catch; handler owns fail-closed exit/evidence. |
| `dist/core/output-guard.js:38-63,69-88`, stdout guard | `takeOverStdout` replaces `process.stdout.write` with a stderr path while active, and `writeRawStdout`/`flushRawStdout` use a separate saved stdout writer and flush path. | Direct `node:fs.writeSync(1, bytes)` remains the machine channel. The fixture's console behavior is a package-level test/contract requirement, not a claim established by this locator. |
| `dist/cli/args.js:6-9,97-107`, thinking parse | Valid levels are accepted; invalid non-empty value produces warning and leaves parsed thinking unset. | CLI syntax behavior, not capability behavior. |
| `dist/core/agent-session.js:1270-1294,1313-1335`, thinking management | `setThinkingLevel` clamps unavailable valid levels through `clampThinkingLevel` based on model capabilities. | AgentSession capability stage. |

Material conclusion: the corrected v0.1 validator uses only catalog/auth availability and excludes scope filtering. The second fresh review additionally requires a closed registry-integration error contract and a real fixture that satisfies Pi's startup-model prerequisite without confusing ordinary local startup initialization with post-context validator behavior.

## Package Source Objects

| Locator / title | Claim and direct support | Planned use |
| --- | --- | --- |
| `src/index.ts:353-369`, `SubagentRuntime.spawn` | Runtime-first model validation now precedes slug validation, Agent/scope/reservation/shared start. | Fresh focused review closed the malformed `find()` repair and full-spawn zero-effect ledger rows; broader reports are historical. |
| `src/index.ts:452-469`, `resume` | Persisted model/thinking are forwarded to shared start for next generation. | Mandatory generation-2 compatibility check; earlier execution report is historical. |
| `src/index.ts:507-595`, `start` | Persists state, creates tab, writes launch/bootstrap files, and calls transport; caller-selected launch args now distinguish initial spawn from resume. | Current source behavior; earlier argv and real-Pi reports are historical. |
| `src/index.ts:1127-1146`, `createSubagentTools` | Execute helper now forwards the fifth context; spawn passes `ctx.modelRegistry` to runtime and maps typed validation errors. | Current source behavior; earlier tool-path and real-Pi reports are historical. |
| `src/index.ts:104-125`, bootstrap | Bootstrap alone calls `spawnSync` for child. | Zero `transport.run` plus no bootstrap file is transitive no-child evidence. |

## Deterministic Classification Matrix

| Input/snapshot | Outcome |
| --- | --- |
| property absent or `undefined` | omitted/default path; no registry object/method access |
| `null`, number, object, array, boolean | `invalid_model_reference`, bounded type detail; no registry access |
| empty/malformed/control-bearing/overlong string | `invalid_model_reference`, bounded escaped value detail; no registry access |
| 256-byte well-formed reference | continue to registry validation |
| 257-byte reference or any ASCII control | `invalid_model_reference`, no registry access |
| well-formed explicit + missing/invalid registry | `model_registry_error`, operation `registry` |
| required method missing/non-callable or property access/call throws | `model_registry_error`, operation reached: `getProvider`, `auth`, `find`, or `getAvailable` |
| `getProvider(provider) === undefined` | `provider_unavailable`, unknown detail |
| known provider, `configured !== true` | `provider_unavailable`, auth detail |
| configured provider, successful `find` absent | `model_not_found` |
| non-absent `find` identity malformed or different from the requested pair | `model_registry_error`, operation `find` |
| every `getAvailable()` entry valid, exact catalog pair absent | `model_unavailable` |
| any `getAvailable()` entry malformed, including after an exact match | `model_registry_error`, operation `getAvailable` |
| exact pair in `getAvailable()` | admitted regardless of `scopedModels` |

Checks are pointwise in that order; later methods are not prechecked. Provider/auth precedes model lookup. No invocation result is cached, refreshed, retried, or converted from integration failure to a catalog code.

## Launch And Resume Matrix

| Origin/input | Exact owned token subsequence |
| --- | --- |
| generation-1 omitted model | no `--model`/`--thinking` |
| generation-1 explicit model, thinking omitted/`""` | `["--model", "provider/modelId"]` |
| generation-1 explicit model, non-empty thinking | `["--model", "provider/modelId", "--thinking", "value"]` |
| generation-2 persisted model+thinking | `["--model", "provider/modelId:thinking"]`; no `--thinking` |
| generation-2 persisted model without non-empty thinking | `["--model", "provider/modelId"]` |

Separate initial-spawn and resume policy seams are required before shared lifecycle launch. Generation number is test evidence, not a substitute for an explicit caller-origin policy.

## Thinking Evidence Matrix

| Value | Package behavior | Upstream behavior to prove |
| --- | --- | --- |
| `""` | omit `--thinking` | current default path |
| valid non-empty supported | pass exact token | Pi accepts it |
| invalid non-empty syntax | pass exact token | CLI warning; parsed thinking unset/default |
| valid non-empty but capability-unsupported | pass exact token | AgentSession clamps via `clampThinkingLevel` |

No capability-based package rejection is permitted.

## No-Side-Effect Evidence Surface

Every rejection must leave zero/unchanged:

| Surface | Observation |
| --- | --- |
| identity | no ID, generation, reservation, suffix, session or Result path |
| filesystem | no task/artifact directory, manifest, session, launch/bootstrap/Result/temp file |
| runtime | no task-map/scope/recovery mutation; existing tasks unchanged |
| observation | no update/widget/monitor/timer/notifier/terminal message |
| transport | zero calls, including `createTab` and `run` |
| execution | no wrapper/bootstrap/child |
| precedence | invalid model wins over invalid slug/Agent |

The fake integration matrix must use one full section-7 ledger for every row; `0` below means no registry call and `1` means the single ordered successful or throwing call. Missing/non-callable and throwing property access use call count `0` at that operation while still producing its fixed operation detail.

| Registry fault | Code/detail operation | `getProvider` | auth | `find` | `getAvailable` | All section-7 effects |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| registry absent/`null`/primitive | `model_registry_error` / `registry` | 0 | 0 | 0 | 0 | 0 |
| `getProvider` missing/non-callable/property throws | `model_registry_error` / `getProvider` | 0 | 0 | 0 | 0 | 0 |
| `getProvider` call throws | `model_registry_error` / `getProvider` | 1 | 0 | 0 | 0 | 0 |
| auth method missing/non-callable/property throws | `model_registry_error` / `auth` | 1 | 0 | 0 | 0 | 0 |
| auth call throws | `model_registry_error` / `auth` | 1 | 1 | 0 | 0 | 0 |
| `find` missing/non-callable/property throws | `model_registry_error` / `find` | 1 | 1 | 0 | 0 | 0 |
| `find` call throws | `model_registry_error` / `find` | 1 | 1 | 1 | 0 | 0 |
| `getAvailable` missing/non-callable/property throws | `model_registry_error` / `getAvailable` | 1 | 1 | 1 | 0 | 0 |
| `getAvailable` call or returned-snapshot read throws | `model_registry_error` / `getAvailable` | 1 | 1 | 1 | 1 | 0 |

Each row also asserts exact fixed detail, no raw sentinel cause/secret in code/detail/tool message, no fallback/catalog code, zero later operations, invalid-model precedence over slug/Agent, and all identity/filesystem/runtime/observation/transport/execution ledger fields zero. The child can only execute when the generated bootstrap is written and submitted through `transport.run`; therefore zero `transport.run` plus absent launch/bootstrap files is sufficient transitive proof of no wrapper/bootstrap/child. No process abstraction is needed.

## Historical Real-Pi Fixture Provenance (Not Current Evidence)

A prior temporary fixture and collector reported the contract and observations below. Its collector, raw fd-1 record, command output, and inventories were deleted. The run is unavailable historical provenance: it cannot be independently reproduced, must not be used as current completion evidence, and must not be reconstructed. The behavioral contract remains owned by the Specification, Plan, and Tasks.

The historical report states the temporary test/collector created one run-owned root per attempt with Node-compatible APIs:

```ts
const runRoot = await mkdtemp(join(tmpdir(), "pi-herdr-task29-real-"));
const fixturePath = join(runRoot, "task29-explicit-spawn-model-validation.ts");
const runtimeRoot = join(runRoot, "runtime-root");
```

No fixed `%TEMP%` path is permitted. Fixture source, runtime root, captured diagnostics, and any generated support file live only below `runRoot`. Recursive inventories use root-relative path, entry type, and byte size without file contents. Before Pi starts, the collector asserts that `runRoot` contains only the expected fixture/support files and that `runtimeRoot` is absent. Unique `mkdtemp` ownership prevents stale/concurrent-run ambiguity.

### Selectable startup-model preflight

Pi `0.84.2` print mode rejects before command dispatch when no startup model is selected. The fixture therefore registers one static provider/model, `task29-fixture/startup`, during extension load. It uses a fixed non-secret fixture credential and an instrumented local `streamSimple` that increments `providerRequestCount` and fails if called; its model has static metadata only. This model exists solely to construct the real Pi session and is not the explicit spawn candidate.

The collector first executes the installed Bun + Pi entry directly, without a shell:

```text
bun <pi-0.84.2-dist/cli.js> --offline --no-extensions --extension <fixturePath> --no-context-files --no-skills --no-prompt-templates --no-session --list-models task29-fixture/startup
```

It records executable/entry identity, Pi version, exit status, and the exact selected provider/model row, but no credential or environment value. Preflight passes only on exit `0` and one exact `task29-fixture` / `startup` match. Missing, ambiguous, or failed selection is a nonzero fail/inconclusive gate: the collector must not claim command entry or adapter success and must remove only `runRoot` in its outer `finally`.

### Real command entry

After preflight, the collector runs:

```text
bun <pi-0.84.2-dist/cli.js> --offline --no-extensions --extension <fixturePath> --no-context-files --no-skills --no-prompt-templates --no-session --model task29-fixture/startup --print "/task29-explicit-spawn-model-validation"
```

`--no-extensions` disables discovery while explicit `--extension` still loads the fixture. The selected startup model satisfies print-mode construction. The registered command intercepts before a prompt/provider request, imports production `createSubagentTools`/runtime, captures the production spawn definition, and invokes its real adapter exactly as:

```ts
adapterInvoked = true;
await spawnTool.execute(callId, params, undefined, undefined, ctx);
```

The command derives a non-sensitive unknown-provider token only by repeated exact `ctx.modelRegistry.getProvider(token)` checks and asserts the final result is `undefined`. It does not use the fixture startup provider as the candidate.

### Fail-closed command and evidence

The command handler, not Pi's outer command catch, owns all `try`/`catch`/`finally` behavior. It sets `process.exitCode = 1` before assertions, catches the expected production rejection and every unexpected error without rethrowing through Pi, and keeps that nonzero code for any assertion, adapter, inventory, cleanup, record-construction, or fd-write failure. It sets `process.exitCode = 0` only after a passing record has been written successfully.

The handler captures the complete pre/post section-7 ledger, all transport-method counts, and before/after recursive artifact inventories. In `finally`, after those observations are captured, it removes only `runRoot`, records whether removal succeeded and whether the root remains, and never recursively deletes a shared parent. The collector repeats that same run-root-only cleanup as a fallback when Pi fails before command entry.

The fixture's console and ordinary `process.stdout` behavior is a package-level test/contract requirement, not a claim established by the Pi output-guard locator. The installed `output-guard.js:38-63,69-88` directly establishes stdout takeover/redirection and a separate raw stdout writer/flush path. As its last output action, the command attempts exactly one newline-terminated JSON record through direct `node:fs.writeSync(1, Buffer.from(JSON.stringify(record) + "\n"))`. The record contains exactly the evidence fields needed to decide the gate: `commandEntered`, Pi version, secret-free startup model `{provider,id,source:"fixture-registerProvider"}`, `adapterInvoked`, `providerRequestCount`, unknown candidate, exact failure `{code,detail}`, full before/after side-effect ledger, every transport count, before/post artifact inventories, and cleanup `{attempted,ok,rootExistsAfter}`. It contains no credential, auth source, raw cause/stack, registry/context object, prompt, headers, or environment.

The collector requires process exit `0`, exactly one parseable fd-1 JSON record, `commandEntered === true`, `adapterInvoked === true`, `providerRequestCount === 0`, exact `provider_unavailable` unknown-provider detail derived from real `ctx.modelRegistry`, all ledger/transport counts zero, no runtime/launch/bootstrap artifact, and successful cleanup. Missing/extra/malformed records, nonzero exit, failed preflight, absent command entry, adapter non-invocation, provider request, inventory mismatch, or cleanup failure is fail/inconclusive, never a silent pass.

The no-refresh/auth-secret/network restriction begins after Pi delivers the command `ExtensionContext` to the fixture/production adapter. Ordinary `--offline` Pi startup may initialize local catalog/auth snapshots; the gate must not falsely classify those local reads as validator violations. No model inference/provider request may occur in preflight or command execution.

## Negative-Evidence Boundary

Inspected sources do not establish endpoint reachability, health, quota, absence of 429/cooldown, account permission, future success, or scoped-model admission. Lack of those guarantees is not evidence of failure; it is a limit on claims. Tests must use “catalog/auth available snapshot,” never “healthy,” “live,” “reachable,” “requestable,” or “filtered available.”

## Shared-File Ownership And Review Disposition

Task `#37` Phase B and Tasks `#18`, `#36`, and `#3` remain excluded behavior and their unrelated hunks must not be absorbed, reverted, normalized, or committed as #29 work. For the #29 candidate, exact hunk mapping, eight-path overlay isolation, excluded-path hash stability, and the user's instruction to commit all work unrelated to `#40` satisfy the prior shared-owner release/isolated-commit gate. The seven `#40` paths and residual Herdr docs remain excluded.

The final independent review found runtime/tests P0-P3 zero. Its sole P1 finding was stale six-document completion wording corrected by this reconciliation; ownership release and the isolated eight-path commit are complete. Earlier review findings concerning availability/scope, launch seams, runtime input, thinking stages, fifth-context adaptation, integration errors, no-effect ledgers, and fixture safety are closed by the implemented behavior and recorded historical focused/typecheck/import/suite evidence where applicable. Historical real-Pi fifth-context material remains unavailable/non-current, not recreated, and not used as fresh evidence.

## Reconciliation State

The pre-reconciliation eight-path byte-identity review, final independent review, ownership release, isolated implementation commit, and post-reconciliation six-document identity, link, and worktree-boundary checks are complete. No behavioral decision is open; this reconciliation is GO for one isolated six-document documentation commit.


## T6 Historical Real-Pi Report (2026-08-21; Not Current Evidence)

The temporary collector, raw fd-1 record, command output, and inventories were deleted. The following reported observations are unavailable historical provenance only; they cannot be independently reproduced, must not be used as completion evidence, and must not be reconstructed.

- Final collector passed with exit `0` for both startup preflight and command.
- Unique Node `mkdtemp` run root was used under the OS temp directory; fixture, runtime root, config, and inventories stayed below it; root-only cleanup passed and `rootExistsAfter` was `false`.
- Pi `0.84.2` was invoked directly through `D:/Applications/Scoop/shims/bun.exe` and the installed `dist/cli.js` entry. Preflight selected exactly one `task29-fixture/startup` row with exit `0` and `exactMatches: 1`.
- The real command delivered Pi's fifth `ExtensionContext` to the production `subagent_spawn` adapter. It derived `task29-unknown-0` only after exact `ctx.modelRegistry.getProvider(token) === undefined`, then produced exactly `{ code: "provider_unavailable", detail: "Provider \"task29-unknown-0\" is unavailable: unknown provider." }` with no operation field.
- Provider-request count was `0`; in-memory transport counts were all `0`, including `run: 0`; runtime task count and update/notification counts were `0`; runtime root was absent; before/after inventories were identical; one parseable newline-terminated fd-1 JSON record was emitted.
- No project files, user Herdr state, or commit were changed by the fixture. The temporary fixture and collector were removed after execution.


Recorded historical #29 evidence is: focused tests `20 pass`, `0 fail`, `673 assertions`; typecheck zero diagnostics; import smoke passed; candidate full suite `134 pass`, `1 fail`, `1347 assertions`; and exact HEAD baseline `114 pass`, `1 fail`, `671 assertions` with the same sole spawn-description failure. The full suite is not globally green. These results were not freshly rerun for this reconciliation because the unmodified workspace lacks local `tsc`; that is an environment evidence limitation, not a behavioral failure. The historical real-Pi fifth-context report remains unavailable/non-current and is neither recreated nor claimed as fresh evidence.

The bounded repair enforces the settled fail-closed distinction for malformed/mismatched `find()` identities and malformed `getAvailable()` entries, adds one Unicode identity regression, and seeds an existing completed task/scope before the rejection matrix to prove byte/structural invariance and no new lifecycle effects. The recorded historical focused/typecheck/import/full-suite evidence is stated above. The final independent review, ownership release, and isolated implementation commit are complete; this reconciliation does not change source or test identities.

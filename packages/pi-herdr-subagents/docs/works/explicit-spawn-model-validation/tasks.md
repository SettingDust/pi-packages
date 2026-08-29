# Explicit Spawn Model Validation Tasks

- **Task:** `#29`
- **Status:** #29 implementation, recorded historical validation, final independent review, ownership release, and the isolated eight-path commit are complete. Commit `8ff926068a45a2590f05c9f136da05b5155bd1ff` (`fix(herdr): validate explicit spawn models`) contains the six #29 documents, `src/index.ts`, and `tests/runtime.test.ts`; this separate reconciliation changes only the six documents.
- **Work:** [work.md](work.md)
- **Plan:** [plan.md](plan.md)
- **Authority:** [Specification](../../spec/explicit-spawn-model-validation.md)
- **ADR:** [Exact explicit spawn model references](../../adr/exact-explicit-spawn-model-reference.md)

These Tasks remain the derived decomposition for the completed #29 implementation. Final independent review, ownership release, isolated implementation commit `8ff926068a45a2590f05c9f136da05b5155bd1ff`, and this reconciliation's post-edit six-document identity and boundary verification are complete. This reconciliation is GO for a separate documentation-only commit.

## Task 1: Fresh Authority, Evidence, And Ownership Review

- **Status:** Completed for the corrected path: runtime/tests P0-P3 are zero. The review's sole NO-GO was stale six-document status, repaired here; it did not review these new document hashes.
- **Objective:** Independently verify the six #29 authority/coordination documents against current implementation evidence, source/tests, and installed Pi `0.84.2`.
- **Checks:**
  - catalog/auth `getAvailable()` semantics and explicit exclusion/consequence of `scopedModels`/`enabledModels`;
  - exact slash-delimited `${provider}/${modelId}` grammar: non-empty provider/model ID, provider excludes `/`, first-slash split, later `/` preserved in model ID, Unicode preserved without normalization, ASCII controls U+0000-U+001F/U+007F rejected, UTF-8 length at most 256 bytes before registry access, bounded detail, and accepted/failure matrix;
  - exact `SubagentRuntime.spawn(input, registry?)` seam, runtime `unknown` model input, invocation-local structural registry, fifth-context handoff, missing-registry behavior, and bounded details;
  - one typed `ExplicitSpawnModelError` transport with exact fields, direct-caller behavior, adapter JSON/details mapping, closed operation labels, and stable precedence;
  - first-operation full no-effect boundary;
  - Pi output-guard source attribution limited to stdout takeover/redirection and its separate raw writer/flush path; direct `node:fs.writeSync(1, bytes)` machine output and the fixture console behavior contract boundary;
  - actual fifth-context production adapter feasibility;
  - separate initial-spawn/resume policy seams and exact generation-2 persisted legacy token;
  - empty, invalid-syntax, and capability-unsupported thinking stages;
  - active Task `#37` Phase B and Task `#18/#36/#3` file/hunk ownership.
- **Completion evidence:** Corrected-path final review found no runtime/test P0-P3 findings. Exact hunk mapping, eight-path overlay isolation, excluded-path hash stability, and the user's instruction to commit all work unrelated to `#40` satisfy the prior ownership-isolation gate for the candidate; seven `#40` paths and residual Herdr docs remain excluded.
- **Commit:** Completed in isolated implementation commit `8ff926068a45a2590f05c9f136da05b5155bd1ff`.

## Task 2: Red Baseline And Complete Side-Effect Ledger

- **Status:** Historical red baseline is implementation provenance; current supported verification is recorded in Tasks 5 and 7. No red state is claimed as a current check.
- **Dependency:** Task 1 complete; all shared ownership released/bounded.
- **Objective:** Prove current defect and establish one reusable zero ledger.
- **Expected surfaces:** focused existing runtime/task-ID tests only.
- **Required red checks:**
  - unknown explicit provider currently reaches allocation/launch;
  - generation-1 model+thinking currently combines into `--model`;
  - thinking without model emits neither flag;
  - persisted generation-1 model+thinking resumes generation 2 as combined legacy value;
  - intended model failure should precede invalid slug/Agent.
- **Ledger:** IDs/reservations/suffixes, root entries/files, task map/scope, updates/widgets, monitors/timers, notifiers/messages, every transport method, launch/bootstrap files.
- **Completion evidence:** Historical red baseline evidence established the defect before production changes; current supported verification is recorded in Tasks 5 and 7. No red state was committed.
- **Commit:** Completed in isolated implementation commit `8ff926068a45a2590f05c9f136da05b5155bd1ff`.

## Task 3: Runtime-First Unknown-Input Validator

- **Status:** Implemented and supported by current focused verification; no behavioral change is made by this documentation repair.
- **Dependency:** Task 2 red evidence.
- **Required behavior:**
  - model parameter treated as `unknown` at `SubagentRuntime.spawn(input, registry?)`;
  - absent/`undefined` only omitted, with no registry read;
  - `null`, number, object, array, boolean and all other present non-strings fail `invalid_model_reference` without traversal;
  - malformed strings use bounded JSON-escaped details;
  - missing/invalid registry or missing/non-callable/throwing ordered registry operation fails through typed `ExplicitSpawnModelError` as `model_registry_error`, with only `registry`, `getProvider`, `auth`, `find`, or `getAvailable` operation;
  - exact first-slash/provider/auth/model/available order; absent successful `find` alone is `model_not_found`; malformed or mismatched non-absent `find` is `model_registry_error/find`; every available entry is validated before matching and any malformed entry is `model_registry_error/getAvailable`; later operations are not preflighted;
  - unknown provider only when `getProvider(provider) === undefined`;
  - no scoped/enabled read, refresh, auth-secret, network, private resolver, cache, fallback, or retry;
  - invalid model dominates all later validation/effects.
- **Completion evidence:** Historical focused verification is `20 pass`, `0 fail`, `673 assertions`; historical typecheck had zero diagnostics and import smoke passed. Historical real-Pi evidence remains unavailable/non-current. Fresh execution was not performed for this reconciliation because the unmodified workspace lacks local `tsc`; this is an environment evidence limitation, not a behavioral failure.
- **Commit:** Completed in isolated implementation commit `8ff926068a45a2590f05c9f136da05b5155bd1ff`.

## Task 4: Fifth-Context Adapter And Separate Launch Seams

- **Status:** Implemented; historical focused/typecheck/import evidence supports the runtime and launch seams. Historical real-Pi fifth-context material remains unavailable/non-current.
- **Dependency:** Task 3.
- **Objective:** Connect Pi's invocation registry and split generation-1 policy from resume compatibility.
  - tool helper accepts actual fifth `ExtensionContext`;
  - spawn alone passes `ctx.modelRegistry` as the exact second argument to `SubagentRuntime.spawn(input, registry?)`; omitted/`undefined` model may omit registry;
  - adapter maps the typed error's exact `code`, `detail`, and optional closed `operation` to JSON text and `details`; no raw cause;
  - ignores `ctx.scopedModels` and `ctx.model`;
  - other tools unchanged; no captured registry/global setter;
  - initial spawn selects separate model/thinking tokens;
  - resume selects persisted legacy combined token before shared lifecycle start;
  - shared transport/bootstrap receives explicit policy/args and does not normalize resume;
  - Windows structural invocation unchanged.
- **Exact token evidence:**

```text
generation 1 model+high: ["--model", "provider/modelId", "--thinking", "high"]
generation 1 model+"":   ["--model", "provider/modelId"]
generation 2 persisted:  ["--model", "provider/modelId:high"] and no --thinking
```

- **Completion evidence:** Historical focused verification supports the direct/tool and bootstrap-argv path; historical real-Pi evidence is not fresh completion evidence. Fresh execution was not performed for this reconciliation because the unmodified workspace lacks local `tsc`; this is an environment evidence limitation, not a behavioral failure.
- **Commit:** Completed in isolated implementation commit `8ff926068a45a2590f05c9f136da05b5155bd1ff`.

## Task 5: Deterministic Error, Scope, Thinking, And Resume Matrices

- **Status:** Deterministic matrix implementation is complete and supported by recorded historical focused verification. The final independent review found runtime/tests P0-P3 zero; no behavioral finding remains.
- **Dependency:** Task 4.
- **Objective:** Complete all deterministic fake coverage with existing seams.
- **Required input/error scenarios:** absent/`undefined`; non-string classes; malformed shape, empty sides, ASCII controls U+0000-U+001F/U+007F, UTF-8 lengths of 256 and 257 bytes; missing/invalid registry; missing/non-callable/throwing `getProvider`, auth, `find`, and `getAvailable`; unknown provider; unconfigured auth with known/missing model; configured missing model; exact catalog model unavailable; exact available; case mismatch; later `/`; changed snapshots/no cache; invalid model plus invalid slug/Agent; direct and tool paths.
- **Required integration ledger:** each row asserts the typed `ExplicitSpawnModelError` fields, fixed `model_registry_error` detail/operation, zero later registry calls, no catalog-code conversion/raw cause, and zero identity/filesystem/runtime/observation/transport/execution effects.
- **Required scope scenario:** same registry snapshot and explicit model under different `scopedModels`/enabled-model fixtures has identical admission; exact available-but-unscoped model passes.
- **Required thinking scenarios:**
  - empty omitted;
  - valid supported passed separately;
  - invalid non-empty passed and Pi CLI parser warns/leaves thinking unset/default;
  - valid capability-unsupported passed and Pi AgentSession clamps;
  - thinking without model emits neither flag.
- **Required resume scenario:** seed/recover completed persisted generation 1 with model+thinking; generation-2 PowerShell/bootstrap argv contains one exact combined value and no `--thinking`; no registry read/revalidation. Also cover no non-empty persisted thinking.
- **No-effect requirement:** full Task-2 ledger zero for every rejection; existing tasks/scope unchanged; no process abstraction added.
- **Regression boundary:** omitted/default, lifecycle, recovery, notifications, join/remove/cleanup/steer/widget, Agent resolution, workspace targeting, Windows bootstrap.
- **Completion evidence:** Historical focused tests reported `20 pass`, `0 fail`, and `673 assertions`; historical typecheck had zero diagnostics and import smoke passed. Historical candidate full suite reported `134 pass`, `1 fail`, `1347 assertions`; exact HEAD baseline reproduced the same sole spawn-description failure with `114 pass`, `1 fail`, `671 assertions`. The suite is not globally green. Fresh execution was not performed for this reconciliation because the unmodified workspace lacks local `tsc`; this is an environment evidence limitation, not a behavioral failure.
- **Commit:** Completed in isolated implementation commit `8ff926068a45a2590f05c9f136da05b5155bd1ff`.

## Task 6: Real Pi Fifth-Context Production-Adapter Acceptance

- **Status:** Historical execution provenance only, unavailable/non-current because the prior Node `mkdtemp` Pi `0.84.2` collector's temporary collector, raw fd-1 record, command output, and inventories were deleted. It is not recreated or claimed as current evidence; this limitation does not replace or invalidate the separate current focused/typecheck/import/full-suite evidence.
- **Dependency:** Task 5.
- **Objective:** Use a temporary Pi extension to prove real invocation context reaches the production spawn adapter and rejects before launch/effects, with a fail-closed startup prerequisite.
- **Run root:** one unique `node:fs.mkdtemp` directory under `node:os.tmpdir()` per attempt; fixture, runtime root, support files, inventories, and captured evidence are below it. Pre-inventory is asserted; post-inventory is captured; only this root is removed in `finally` plus bounded collector fallback.
- **Startup preflight:** Pi `0.84.2` print mode requires a selected model before command dispatch. Register/select a static fixture-local startup model using deterministic local preflight. Missing, ambiguous, or failed selection is nonzero fail/inconclusive before claiming command entry or adapter invocation. The startup model is construction-only; no inference/provider request is allowed.
- **Command/evidence:** command owns `try`/`catch`/`finally`, invokes the real five-argument adapter, uses direct `node:fs.writeSync(1, bytes)` for exactly one machine JSON record, and sets nonzero `process.exitCode` on every assertion, adapter, inventory, evidence-write, or cleanup failure. The installed `output-guard.js:38-63,69-88` directly supports only stdout takeover/redirection and its separate raw writer/flush path; the fixture's console behavior is a package-level contract requirement. The record includes command entry, Pi version, secret-free startup provenance, adapter invocation, exact failure code/detail, complete ledger, transport count, artifact inventories, provider-request count, and cleanup result.
- **Boundary:** after ExtensionContext delivery, no refresh/auth-secret/OAuth/model-list/completion/network call; ordinary Pi offline startup may initialize local catalog/auth snapshots. No model inference/provider request.

- **Fixture requirements:**
  - import/register production `createSubagentTools` with package runtime and fail-on-call/counting in-memory transport;
  - invoke production spawn definition as `execute(callId, params, undefined, undefined, ctx)` using Pi's real fifth context;
  - derive candidate until exact `ctx.modelRegistry.getProvider(token) === undefined`; assert again immediately before call;
  - call no post-context refresh, auth-secret/OAuth, model-list, completion, provider/network, or real Herdr API;
  - compare task/scope/root/update/notification/transport observations and full root-relative inventories before/after;
  - require exact unknown-provider code/detail, every transport/provider-request count zero, especially `run === 0`, and no task/artifact/manifest/session/launch/bootstrap/Result file;
  - use zero `transport.run` plus absent launch/bootstrap as transitive no-wrapper/bootstrap/child proof; add no process seam;
  - require exactly one parseable fd-1 record, successful cleanup, and exit `0` only after evidence succeeds. Never silently pass failed preflight, missing command entry, extra/malformed output, inventory mismatch, or cleanup failure.
- **Completion evidence:** Historical only and unavailable/non-current; current focused/typecheck/import/full-suite evidence is separate and does not recreate this fixture.
- **Commit:** Completed in isolated implementation commit `8ff926068a45a2590f05c9f136da05b5155bd1ff`.

## Task 7: Documentation Reconciliation And Package Verification

- **Status:** Documentation reconciliation and package verification evidence are recorded historical evidence: focused tests `20 pass`/`0 fail`/`673 assertions`, typecheck zero diagnostics, import smoke passed, candidate full suite `134 pass`/`1 fail`/`1347 assertions`, and exact HEAD baseline `114 pass`/`1 fail`/`671 assertions` with the same sole spawn-description failure. No all-green claim is made. Fresh execution was not performed for this reconciliation because the unmodified workspace lacks local `tsc`; this is an environment evidence limitation rather than a behavioral failure.
- **Dependency:** Implemented behavior and recorded current evidence; unavailable historical real-Pi material is not a current gating dependency.
- **Objective:** Reconcile public docs only after behavior exists and run deterministic gates.
- **Documentation:** README exact syntax/failure timing; catalog/auth-not-health; scoped exclusion/consequence; generation-1 separate flags; empty/invalid/capability thinking stages; generation-2 legacy resume; truthful statuses/evidence.
- **Commands:**

```text
bun run --cwd packages/pi-herdr-subagents typecheck
bun run --cwd packages/pi-herdr-subagents test
git diff --check -- packages/pi-herdr-subagents
```

- **Markdown check:** all six local links resolve; completed-status and evidence wording agree; forbidden deprecated availability wording is absent; required scoped exclusion and generation-2 token text are present; no trailing whitespace.
- **Completion evidence:** The listed historical evidence is recorded above; the full suite is explicitly not globally green. The final independent review found runtime/tests P0-P3 zero and only stale document status as its P1 finding.
- **Commit:** Completed in isolated implementation commit `8ff926068a45a2590f05c9f136da05b5155bd1ff`; this reconciliation requires a separate documentation-only commit decision.

## Task 8: Final Independent Reviews And Isolated Commit Gate

- **Status:** Final independent review completed with runtime/tests P0-P3 zero. Its only P1 finding was stale six-document status; ownership release, isolated implementation commit, and this factual update's post-edit six-document identity and boundary checks are complete. This reconciliation is GO for a separate documentation-only commit.
- **Dependency:** Task 7 reconciliation complete.
- **Objective:** Reconcile behavior/evidence and decide commit readiness.
- **Review questions:** literal first operation; exact unknown input/error details; stable integration code and closed safe operation labels; complete missing/throwing no-effect matrix; no catalog-code fallback; catalog/auth-only semantics; no scoped read; actual fifth context; deterministic startup preflight; raw fd-1 single record; explicit failure exit; unique run-root inventories/cleanup; thinking stage separation; generation-1 tokens; generation-2 persisted compatibility; zero-run transitive evidence; no Task `#37` Phase B or `#18/#36/#3` hunk.
- **Completion evidence:** Source/tests matched the isolated commit before this reconciliation; exact hunk mapping, eight-path overlay isolation, excluded-path hash stability, and the user's #40-excluding commit instruction completed the ownership gate. Historical real-Pi evidence remains unavailable/non-current. The final independent review and pre-reconciliation byte-identity review are complete.
- **Commit gate:** Decide a separate documentation-only commit from this reconciliation's post-edit identity and boundary evidence.

## Historical Execution Order

```text
T1 review + ownership
 -> T2 red ledger
 -> T3 validator
 -> T4 adapter + launch seams
 -> T5 deterministic matrices
 -> T6 real Pi fixture
 -> T7 docs/package checks
 -> T8 independent reviews/commit decision
```

This is the completed underlying implementation sequence. The final independent review, ownership release, isolated implementation commit, and separate six-document reconciliation identity/boundary verification are complete.

## Coverage Check

Every Plan commitment maps once: authority/ownership (T1), red ledger (T2), runtime validator (T3), fifth context and launch seams (T4), fake scope/thinking/resume evidence (T5), real fixture (T6), docs/package checks (T7), final reviews/commit isolation (T8). No task implements scoped/enabled admission, resume validation, live health, fuzzy/custom resolution, package thinking policy, Task `#37` Phase B, `#18`, `#36`, or `#3`.


## Completion Status (2026-08-21)

- Implementation, historical validation, final independent review, ownership release, and isolated commit `8ff926068a45a2590f05c9f136da05b5155bd1ff` are complete. Historical focused tests: `20 pass`, `0 fail`, `673 assertions`; typecheck: zero diagnostics; import smoke: passed.
- Historical candidate full suite: `134 pass`, `1 fail`, `1347 assertions`; exact HEAD baseline: `114 pass`, `1 fail`, `671 assertions`, with the same sole spawn-description failure. The suite is not globally green.
- The final independent review found runtime/tests P0-P3 zero and only stale six-document completion wording as P1. Historical Pi fifth-context evidence remains unavailable/non-current and is not recreated or claimed as fresh evidence.
- Fresh execution was not performed for this reconciliation because the unmodified workspace lacks local `tsc`; this is an environment evidence limitation, not a behavioral failure. Post-edit document identities and the six-file worktree boundary passed; this reconciliation is GO for the separate documentation-only commit.

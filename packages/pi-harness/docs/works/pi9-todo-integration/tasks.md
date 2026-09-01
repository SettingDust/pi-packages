# Tasks: pi9 Todo Integration

- **Status:** Accepted scope. Implemented and validated candidate. T7 final fresh review completed with GO; T8 selective commit is pending.
- Related Work: [work.md](work.md)
- Related Context: [context.md](context.md)
- Related Research: [research.md](research.md)
- Related Plan: [plan.md](plan.md)
- **Acceptance basis:** User-confirmed implementation scope for upstream `Chase-C/pi9@94405f79bb1e400fcba5e1b973778ef82d8378b2`, the exact 42-path integration boundary, required attribution, dependency/runner closure, README correction, and recorded validation evidence. The former 17-source/12-test-only description is superseded by the reconciled Plan.
- **Implementation state:** T0, T1, T2, T4, T5, T6, and T7 are complete from retained evidence. The former Host-observer T3 is cancelled and was not implemented. T8 selective commit remains pending; no staging or commit is authorized by this artifact.

## Boundary

The result is a user-facing `@pi9/todo` capability. Router Todo coordination remains internal and unchanged.

### Included

- The exact 42-path integration boundary recorded by the reconciled Plan and Research, including the imported package source/tests, package metadata/config, README, MIT `LICENSE`, attribution, dependency closure, and validation closure.
- The upstream-derived inventory remains 36 package paths, with 31 applicable upstream files byte-identical to `Chase-C/pi9@94405f79bb1e400fcba5e1b973778ef82d8378b2`.
- Direct `typebox@1.3.7`, development `vitest@^4.1.6`, and only the necessary `bun.lock` closure.
- The corrected README command `bun --cwd=packages/todo run test`.
- Exactly 12 upstream test files, with their names frozen by T1.
- The package metadata/config required by the port, `README.md`, and the MIT `LICENSE` with `(c) 2026 Chase Cummings` attribution.
- Package-local compatibility adaptations, dependency/runner changes, and validation closure established by the reconciled candidate; no Host/Pi-core adaptation.

### Excluded

- Upstream media, `dist`, the upstream repository-root lockfile, release material, `.pi`, Pi-core or Host/tool-inventory work, Pi installation/restart/resume changes, Router Todo semantics/data, a second persistence layer, an alternate tool name, wrapper DSLs, speculative abstractions, broad dependency upgrades, Bun-native runner work, UI redesign, unrelated dirty work, and unrelated settings/session data.

## Dependency graph

`T0 -> T1 -> T2 -> T4 -> T5 -> T6 -> T7 -> T8`; cancelled T3 is not a prerequisite.

The tasks are serial across the implemented package and validation work. T3 is cancelled because the former Host-observer gate was not required for this candidate and was not implemented. No parallel-safe group is declared; shared package files, authority identity, and the final selective commit make concurrent execution unsafe.

## Tasks

### T0 — Establish authority and worktree boundary
**State:** Complete. Boundary and protected-path evidence retained from the implemented candidate.
- **Outcome:** Confirm the accepted implementation tuple, fixed candidate identity, package destination, and protected worktree boundary before any implementation mutation.
- **Depends on:** None.
- **Inputs:** `work.md`, `context.md`, `research.md`, `plan.md`, and the acceptance basis above.
- **Paths/surfaces:** `packages/pi-harness/docs/works/pi9-todo-integration/{work.md,context.md,research.md,plan.md,tasks.md}` read-only; repository Git status/diff read-only; planned package path `packages/todo/`.
- **Evidence:** The accepted scope and exact upstream SHA are recorded; current unrelated dirty paths are inventoried; selected Work/Plan/Tasks references are same-directory and directly matched; the planned destination and upstream ownership/attribution treatment are explicit.
- **Acceptance:** No unowned authority, permission, workspace, or acceptance ambiguity remains. Existing dirty work is preserved and excluded from all later edits. The reconciled accepted lifecycle must remain consistent with the supplied acceptance; if it contradicts the supplied acceptance in a way that cannot be reconciled within the authorized scope, stop.
- **Fail closed / stop:** Missing or unreadable authority reference, absent acceptance, dirty-path ownership conflict, inaccessible worktree, authority identity drift, or unresolved license/package ownership.
- **Unlocks:** T1 only after the boundary and protected paths are recorded.

### T1 — Freeze source, file inventory, license, and README provenance
**State:** Complete. Pinned-source, inventory, attribution, and exclusion evidence retained from the implemented candidate.
- **Outcome:** Produce a reproducible manifest for the pinned candidate and freeze the exact files allowed into the port.
- **Depends on:** T0.
- **Inputs:** `Chase-C/pi9@94405f79bb1e400fcba5e1b973778ef82d8378b2`, `@pi9/todo@0.3.7`, research sources S1–S5, and the upstream package tree.
- **Paths/surfaces:** Candidate source `packages/todo/src/{format.ts,glyphs.ts,index.ts,persistence.ts,reminder-cadence.ts,reminder.ts,renderer.ts,schema.ts,settings.ts,state.ts,tool-frame.ts,tool.ts,types.ts,visibility.ts,widget-component.ts,widget-layout.ts,widget.ts}`; exactly 12 upstream test paths under `packages/todo/` to be enumerated in the manifest; `packages/todo/{package.json,README.md,LICENSE}`; no upstream `media/`, `dist/`, root lockfile, release, or `.pi` paths.
- **Evidence:** Per-file SHA-256 comparison against the pinned commit; package/version and manifest evidence; exact 17-source and 12-test inventory; MIT text and copyright evidence; recorded npm `gitHead` discrepancy and its evidence-based disposition; explicit exclusion manifest.
- **Acceptance:** Every included source file is same-byte reproducible from the pinned commit; all 12 test files and `README`/`LICENSE` are identified; no branch/latest-version substitution or transitive source expansion is present; attribution placement is valid for copied or materially adapted code.
- **Fail closed / stop:** Any hash mismatch, missing file, unverified test count, irreconcilable identity discrepancy, changed license/attribution, or request to include excluded material.
- **Unlocks:** T2 may decide compatibility only from this frozen manifest.

### T2 — Decide TypeBox ownership and Bun/TypeScript runner contract
**State:** Complete. Direct TypeBox ownership and the Vitest runner contract were selected and applied.
- **Outcome:** Select one auditable schema dependency basis and one reproducible local test/typecheck strategy.
- **Depends on:** T1.
- **Inputs:** Frozen manifest; installed Pi 0.84.2 declarations/runtime; workspace Bun 1.3.14 and TypeScript 5.9.3; upstream imports and `vitest run` script; `pi-harness` scripts.
- **Paths/surfaces:** `packages/todo/package.json`; `packages/todo/tsconfig.json` or the smallest required package config; workspace/package dependency-resolution metadata; temporary probe material only if it is outside the repository and leaves no project mutation.
- **Evidence:** Exact required TypeBox exports (`Type`, `StringEnum`, object/array/optional/union/literal) resolve in both type and runtime paths; choose exactly one: (a) an explicit direct locked `typebox` dependency, or (b) a verified Pi-supported re-export. Record module path, version, type/runtime resolution, and why it is supported. Execute a minimal Bun/TS probe and establish whether focused checks run under `bun test`; record the smallest runner adaptation if needed. Record package-local/workspace lockfile effects before mutation.
- **Acceptance:** No transitive dependency assumption; no `@sinclair/typebox` substitution by name alone; no Vitest migration. The selected basis, runner, package config, and any unavoidable lockfile effect are auditable and authorized. An upstream Vitest result remains separate from local evidence.
- **Fail closed / stop:** Missing export, type/runtime mismatch, ambiguous ownership, undeclared dependency, unresolved Bun/TS adaptation, broad runner change, or unexplained/unauthorized lockfile effect.
- **Unlocks:** T4 only after the boundary and compatibility decision are recorded.

### T3 — Verify clean main-session inventory and Herdr isolation

- **State:** Cancelled. The former Host-observer/main-session inventory gate was superseded during reconciliation and was not implemented.
- **Reason:** This candidate does not include Host/tool-inventory expansion, Pi-core work, or a full live TUI/session replay. The retained package validation does not claim those outcomes.
- **Disposition:** T3 is not a prerequisite for T4, T5, T6, T7, or T8. No Host or Pi-core work is reopened by this Tasks artifact.

### T4 — Port the frozen minimal package boundary

**State:** Complete. The exact 42-path candidate boundary was imported and the README correction was applied.

- **Outcome:** Add the authorized user-facing todo package without expanding the frozen upstream boundary or coupling Router coordination.
- **Depends on:** T2; cancelled T3 is not required.
- **Inputs:** T1 same-byte manifest; T2 dependency/runner decision; accepted product boundary.
- **Paths/surfaces:** The exact 42-path `packages/todo/` integration boundary, including its 17 source files, 12 test files, metadata/config, README, LICENSE, dependency closure, and validation closure; no Host/Pi-core paths.
- **Evidence:** File manifest and post-port hashes/diffs; adaptation ledger mapping every changed upstream byte to a verified package-local incompatibility; import and smoke trace showing only the `todo` user-facing capability; attribution/license check; README-command check; exclusion check.
- **Acceptance:** The port contains exactly 17 source files and 12 tests plus authorized metadata/config, README, and LICENSE. `src/index.ts` remains the entrypoint; tool name remains `todo`; Router Todo code/data and excluded upstream material are untouched; no wrapper/factory/new persistence layer is introduced.
- **Fail closed / stop:** Scope expansion, same-byte drift without an adaptation record, unapproved adaptation, incomplete attribution, Router coupling, incompatible API, or any unrelated dirty hunk touched.
- **Unlocks:** T5 may verify the selected dependency/config effects and package behavior.

### T5 — Apply dependency/config effects and pass typecheck plus focused tests

**State:** Complete. Direct `typebox@1.3.7`, development `vitest@^4.1.6`, and the necessary `bun.lock` closure are present; the Bun-native runner mock was reverted and Vitest restored.

- **Outcome:** Make the selected dependency/runner configuration reproducible and obtain passing local compile and focused-test evidence.
- **Depends on:** T4.
- **Inputs:** T2 locked decision; T4 port; frozen file manifest; package/workspace lockfile policy.
- **Paths/surfaces:** `packages/todo/package.json`, package config, `packages/todo/tests/`, and only the lockfile path proven unavoidable by T2; no broad workspace dependency or test-framework changes.
- **Evidence:** Package typecheck passed; `bun --cwd=packages/todo run test` passed 12 test files and 92 tests under Vitest; package entry import and `todo` plus eight handlers smoke checks passed; `git diff --check` and the exact-boundary diff check passed. The README command is the supported local command. No full live TUI/session replay is claimed.
- **Acceptance:** Typecheck and all authorized focused tests pass reproducibly under the selected Bun/TS contract; dependency is explicit and locked or the verified re-export is demonstrated; lockfile effect matches T2; no upstream-only claim is presented as local verification.
- **Fail closed / stop:** Compile failure, test failure, flaky/unreproducible result, undeclared/incompatible dependency, unauthorized lockfile/root-workspace mutation, runner migration, or excluded file change.
- **Unlocks:** T6 records the bounded retained validation; T7 may independently assess the complete evidence set.

### T6 — Validate bounded package behavior and stated limits

- **State:** Complete for the retained non-live validation evidence; full live TUI/session replay remains unperformed and explicitly limited.
- **Outcome:** Validate the integrated package through entry import, the `todo` tool and eight handlers smoke check, typecheck, the README Vitest command, and the recorded 12-file/92-test result.
- **Depends on:** T5.
- **Inputs:** Passing T5 build/tests and the reconciled Plan/Research evidence.
- **Paths/surfaces:** `packages/todo/**` within the exact 42-path boundary; no Host/Pi-core work, unrelated settings, session mutation, Router records, Results, or full live TUI/session replay.
- **Evidence:** Entry import, `todo` plus eight handlers smoke, package typecheck, Vitest command, 12 test files/92 tests, and integration diff checks passed as retained candidate evidence. The reverted Bun-native mock and restored Vitest contract are recorded. Unsupported live TUI/session-replay behavior remains a limitation.
- **Acceptance:** The bounded package evidence is complete and does not overclaim Host inventory, live TUI, session replay, or Pi-core behavior.
- **Fail closed / stop:** Any attempt to present bounded evidence as full live-session completion, or any scope expansion into Host/Pi-core/session state.
- **Unlocks:** T7 may independently assess correctness and evidence; T8 remains blocked on a clean T7 review.

### T7 — Independently review correctness and evidence

- **State:** Complete. Final fresh independent review `final-review-todo` generation 1 returned GO with P0/P1/P2/P3 all zero.
- **Depends on:** T6.
- **Inputs:** All T0–T6 evidence; final package diff; Work/Context/Research/Plan/Tasks; lockfile, README, runner, provenance, and stated-limits evidence. No clean live-session record is required or implied.
- **Paths/surfaces:** `packages/todo/**` within the exact boundary; `packages/pi-harness/docs/works/pi9-todo-integration/{work.md,context.md,research.md,plan.md,tasks.md}` read-only; Git diff/status and retained evidence read-only.
- **Evidence:** The final review Result records a read-only independent correctness and evidence review, same-byte recheck, adaptation review, bounded verification matrix, license/README review, and explicit disposition of the cancelled T3 and live TUI/session-replay limitation. It reports GO with zero P0/P1/P2/P3 findings.
- **Acceptance:** Complete. No blocking finding remained; provenance, exact commit boundary, and retained verification evidence were confirmed. The review did not modify source, authority, settings, runtime, or session state.
- **Fail closed / stop:** Any correctness/security/evidence finding, source hash drift, incomplete verification, unresolved risk, authority drift, or missing acceptance/rollback disclosure.
- **Unlocks:** T8 may reconcile status and create the exact selective commit.

### T8 — Reconcile status and create the exact selective commit

- **State:** Pending. Selective commit remains pending and is explicitly excluded from this reconciliation.
- **Depends on:** T7.
- **Inputs:** Clean T7 review; T0–T6 evidence; user-accepted scope; final same-byte manifest; final Git status/diff.
- **Paths/surfaces:** Exact `packages/todo/src/` 17-file set; exact `packages/todo/tests/` 12-file set; `packages/todo/{package.json,README.md,LICENSE}`; smallest authorized config; only the dependency/lockfile paths explicitly authorized by T2; synchronized authority/status artifacts only when their update is within the accepted documentation boundary. Exclude unrelated dirty paths, upstream media/dist/root lockfile/release/.pi, Pi core, settings, session state, Router coordination, and Results.
- **Evidence:** Final JIT same-byte/hash check and adaptation ledger; complete typecheck/test/runtime verification rerun or validated retained evidence; authority/status reconciliation showing no draft/unimplemented/unauthorized claim remains for the committed slice; exact staged path list and diff; `git diff --cached --check`; typecheck/tests at the staged/committed revision; commit ID and contents.
- **Acceptance:** The commit compiles and passes the required tests at the committed revision, contains no unrelated hunk or excluded material, preserves attribution, and matches the accepted scope exactly. No push, reload, deploy, installation, restart, resume, or other externally affecting action follows this task.
- **Fail closed / stop:** Same-byte mismatch, incomplete or stale verification, authority/status drift, dirty unrelated hunk, unexpected staged path, compile/test failure at commit revision, or any request for push/reload/deploy.
- **Unlocks:** None. This is the terminal task.

## Plan consistency evidence

| Plan stage/requirement | Covered by | Consistency check |
|---|---|---|
| Freeze pinned identity, exact 42-path boundary, license, attribution, exclusions | T0–T1 | Candidate manifest and retained hashes establish the boundary and provenance. |
| TypeBox ownership, Pi API, Bun/TS runner, lockfile effect | T2 | Exactly one dependency basis and one runner contract must be selected before porting. |
| Former Host-observer/main-session inventory gate | T3 | Cancelled; no Host/Pi-core work or full live TUI/session replay is claimed. |
| Minimal port with unchanged Router coordination | T4 | Exact file boundary and adaptation ledger prevent scope expansion. |
| Dependency/config plus local typecheck/tests | T5 | Local evidence is distinct from upstream reported results. |
| Bounded package validation and explicit limits | T6 | Entry import, smoke, typecheck, Vitest 12-file/92-test, and diff evidence are retained; live TUI/session replay remains unperformed. |
| Independent review, reconciliation, rollback, exact commit | T7–T8 | Review precedes status/commit; staged revision must compile and test. |

## Global completion and rollback rules

- A task is complete only when its listed evidence and acceptance conditions are recorded; a later task cannot silently absorb a failed earlier gate.
- Any unknown runtime inventory, dependency/API/license decision, source identity, test result, authority identity, or workspace effect is a stop condition, not an assumption.
- Rollback removes only introduced integration files, dependencies, authorized settings entries, and tests; retain attribution until copied/adapted code is gone. Never delete or rewrite session data, Results, Router coordination, unrelated settings, or unrelated dirty work.
- This artifact records the reconciled implementation lifecycle: package implementation, bounded validation, and fresh T7 review are complete; selective commit remains pending. It does not authorize staging, commit, or claim full live TUI/session replay.

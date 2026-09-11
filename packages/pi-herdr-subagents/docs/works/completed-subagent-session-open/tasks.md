# Completed Subagent Session Open Tasks

- **Status:** implementation accepted; T1-T3 completed; T4 Host smoke not executed. T4-T6 remain required completion gates.
- **Work:** [work.md](work.md)
- **Context:** [context.md](context.md)
- **Plan:** [plan.md](plan.md)
- **Authority:** [Runtime lifecycle specification](../../spec/runtime-lifecycle.md), sections 3.1–3.3 and 10

## Authorization Boundary

The exact Work/Context/Plan/Tasks tuple was independently reviewed and accepted by the user for implementation. T1-T3 are complete. T4 Host smoke has not been executed; T4, T5, and T6 remain required gates. Material scope, behavior, risk, identity, or authority drift requires renewed review and acceptance.

The current drafting output contains four Work-directory documents: Work, Context, Plan, and this Tasks document. This count describes the current documentation state only. Later implementation uses the approved path set below and must not incorrectly preserve four-document scope as an implementation limit.

## Task Contract

Each task has one terminal outcome. Dependencies are explicit. No task adds generation snapshots, a ready handshake, a status file, a custom viewer, duplicate-open registry, or task lifecycle behavior. The command remains task-level: one current terminal entry per eligible task, opening its cumulative retained `sessionFile`; success ends at accepted tab creation and exact command submission.

### T0 — Accepted identities, path, and baseline gate

**Outcome:** Establish an accepted, identity-stable, no-drift implementation baseline, or stop with the actual blocking evidence.

**Depends on:** Final independent Work/Context/Plan/Tasks review is GO; explicit user acceptance of the exact tuple; no unresolved authority or scope ambiguity.

**Owned paths:** Read-only authority and current implementation paths; no product file may be changed. Dependency materialization must not edit tracked files, package files, lockfiles, settings, or files outside this worktree.

**Work:**

- Verify the accepted Work/Context/Plan/Tasks identities and bytes, target worktree, empty Git index, and ownership-isolated candidate state.
- Re-read the lifecycle authority, installed Pi session behavior, and current launcher, path, recovery, and Herdr seams.
- Restore supported `@settingdust/pi-herdr` workspace dependency resolution without tracked drift or install side effects.
- Run the package typecheck and full test suite and record the actual results.

**Checks:** Typecheck and full package tests, plus identity, target-worktree, index, and scoped-diff checks.
**Commands:** From the worktree root, run `bun --cwd packages/pi-herdr-subagents run typecheck` and `bun --cwd packages/pi-herdr-subagents test`; use `git diff --cached --quiet` and `git status --short --untracked-files=all` for index and candidate checks. Record output; do not convert the known missing-dependency failure into a pass.


**Stop when:** Any acceptance, hash, worktree, index, dependency, authority, parent-scope, path, Pi invocation, launcher, or ownership check is ambiguous or fails. The known starting baseline is not a pass: dependency resolution currently lacks materialized `@settingdust/pi-herdr`, and the resulting `TS2307`/derivative diagnostics must not be reclassified as source evidence.

### T1 — Current-task projection and path validation

**Outcome:** Implement and test the bounded current-task projection and preflight/JIT validation contract.

**Depends on:** T0 passes; no authority or Plan drift.

**Owned paths:** `packages/pi-herdr-subagents/src/index.ts`; focused tests in `packages/pi-herdr-subagents/tests/runtime.test.ts`.

**Work:**

- Project at most one item per current task and only its current terminal generation.
- Require a non-empty persisted parent session identity and reject missing identity without cwd fallback.
- Bind selection to current parent scope, `subagentId`, and observed current generation.
- Derive and validate canonical task, Result, and retained-session ownership; require existence, regular-file, and no-symlink checks.
- Parse and match current Result identity, generation, and terminal status; repeat current-state and path checks immediately before tab creation.
- Use bounded metadata with truthful `Result file modified time` naming when no semantic settlement time exists; expose no Result body.
- Keep empty and cancel outcomes side-effect-free.

**Checks:** Focused tests cover parent isolation, one current item, stale generation, terminal status, Result/session malformed or missing/directory/symlink/cross-root/identity cases, truthful timestamp naming, empty, cancel, and no mutation.
**Commands:** Run `bun test packages/pi-herdr-subagents/tests/runtime.test.ts` and the package typecheck after the focused changes. Use the test doubles and assertions already present in that test file; do not add a new fixture/state mechanism.


**Stop when:** Any path is caller-supplied, cwd fallback establishes ownership, historical-generation content is implied, a stale selection can reach tab creation, or validation requires new persistence or lifecycle behavior.

### T2 — Launch submission and rollback

**Outcome:** Prove exact captured-workspace launch submission and bounded accepted-tab rollback.

**Depends on:** T1 passes; existing transport and launcher seams remain usable.

**Owned paths:** `packages/pi-herdr-subagents/src/index.ts`; `packages/pi-herdr-subagents/tests/runtime.test.ts`.

**Work:**

- Reuse the existing captured-workspace transport and validate returned tab/pane ownership.
- Submit the resolved Pi invocation with only the existing invocation prefix plus `--session <validated-retained-sessionFile>`; send no prompt and no Result environment.
- Preserve the PowerShell call operator and Windows escaping for spaces, quotes, backslashes, Unicode, and shell metacharacters; assert decoded arguments.
- Cover tab creation failure and synchronous submission failure.
- After accepted-tab submission failure, close exactly the returned `tabId`, preserve the primary error, and report bounded close failure separately.
- After accepted submission, do not wait for readiness or roll back.
- Prove duplicate explicit opens create independent tabs and snapshot task, Result, manifest, cleanup, notification, and generation state for no mutation.

**Checks:** Existing fake transport/launcher tests and decoded-argv assertions.
**Commands:** Run `bun test packages/pi-herdr-subagents/tests/runtime.test.ts` and inspect the decoded launcher assertions; run `git diff --check -- packages/pi-herdr-subagents/src/index.ts packages/pi-herdr-subagents/tests/runtime.test.ts`.


**Stop when:** Workspace pinning is bypassed, command submission is treated as child readiness, cleanup guesses a pane/workspace, or any lifecycle/artifact mutation appears.

### T3 — Command and README wiring

**Outcome:** Expose the approved behavior through the interactive parent command and truthful concise documentation.

**Depends on:** T1 and T2 pass.

**Owned paths:** `packages/pi-herdr-subagents/src/index.ts`; `packages/pi-herdr-subagents/README.md`; `packages/pi-herdr-subagents/tests/runtime.test.ts` only for wiring coverage.

**Work:**

- Register `/subagent-open` through `subagentsExtension`, never the child pane extension.
- Guard TUI and persisted-parent-session eligibility before picker creation.
- Use the existing Pi TUI selection seam with explicit cancel handling and metadata-only rows.
- Pass only the bound selection key to JIT resolution.
- Document current-task/current-generation metadata, cumulative retained session semantics, independent duplicate tabs, narrow submission success, and Pi-native writable/migration consequences.

**Checks:** Command registration, non-TUI/missing-parent guards, cancel, metadata-only selection, and README link/wording checks. Locate the repository's existing link checker from repository documentation or package scripts, record its exact path and command, and use it for the README links; if no checker is available, record that blocker rather than inventing one.
**Commands:** Run `bun test packages/pi-herdr-subagents/tests/runtime.test.ts`; run the located existing link-check command from the repository root and record its output, or record the unavailable-checker blocker.


**Stop when:** Documentation claims historical-generation identity, read-only behavior, loaded-session acknowledgement, or any excluded protocol/state is introduced.

### T4 — Package gates and bounded real smoke

**Outcome:** Produce passing package gates and bounded observation evidence for the authorized implementation.

**Depends on:** T3 passes; disposable managed resources and supported dependency baseline are available.

**Owned paths:** No additional production paths; tests may use existing harnesses. Smoke resources are disposable runtime/session/tab state only.

**Work:**

- Run package typecheck and full tests.
- Locate the repository's existing managed-smoke entry point from repository documentation or package scripts and record its exact path and command; do not invent a replacement.
- Use only disposable parent/task/session/tab resources. Invoke `/subagent-open` with the selected current terminal task, capture workspace/tab/root-pane identity and submitted argv, and compare task/Result/generation state before and after.
- Observe current terminal metadata, the new tab/root pane in the captured workspace, exact `--session <retained-sessionFile>` submission, no automatic prompt, no task/Result/generation mutation, process startup, and independent duplicate tabs.
- Exercise cancel, stale/missing input, tab-create failure, and synchronous submission failure. The latter must close exactly the returned tab; tab-create failure must leave no accepted-tab ownership.
- Close only smoke-created tab IDs in `finally` and verify no disposable resource remains. Never delete retained artifacts or touch user-owned tabs.

**Checks:** Typecheck, full tests, exact recorded smoke command/action sequence, inputs, captured identities/argv, before/after artifact comparison, process-start observation, duplicate-tab observation, and cleanup result. Success does not claim child-loaded identity, readiness, or historical-generation content.
**Commands:** Run `bun --cwd packages/pi-herdr-subagents run typecheck` and `bun --cwd packages/pi-herdr-subagents test`; run the located managed smoke command with disposable resources and record its exact invocation and output. An unavailable smoke entry point or unbounded cleanup is a blocking result, not a pass.

**Stop when:** Baseline is unavailable, a smoke observation would require claiming child-loaded identity/readiness, disposable cleanup cannot be bounded, or user-owned state would be touched.

### T5 — Independent correctness and security review

**Outcome:** Obtain an independent GO review of the exact implementation diff and T0-T4 evidence, or return findings for bounded correction.

**Depends on:** T0-T4 pass with recorded evidence.

**Owned paths:** Read-only review of the exact source/test/README diff and Work/Context/Plan/Tasks evidence.

**Review checks:**

- Parent isolation cannot fall back to cwd.
- One item per task and stale current-generation protection do not imply historical content.
- Result/session canonical containment, regular/no-symlink rules, and identity checks fail closed for observed invalid inputs.
- Threat-boundary, command-submission, workspace-pinning, escaping, accepted-tab ownership, and rollback claims are accurate and bounded.
- No full Result, prompt, lifecycle action, task mutation, sidecar, handshake, snapshot, or unsupported persistence was introduced.
- Tests and smoke support every completion claim.

**Stop when:** Any P0–P3 finding remains, evidence is missing, or authority and implementation claims differ. Correct only the bounded affected work and repeat the affected gates and review; do not bypass review.
**Commands:** Review `git diff -- packages/pi-herdr-subagents/src/index.ts packages/pi-herdr-subagents/tests/runtime.test.ts packages/pi-herdr-subagents/README.md` and the recorded T0-T4 evidence; run `git diff --check` on the reviewed paths. The independent reviewer records GO or findings; no implementation changes occur during review.


### T6 — Truthful lifecycle reconciliation

**Outcome:** Reconcile authority coordination documents and final evidence to the actually implemented and reviewed state.

**Depends on:** T1-T5 pass and T5 returns GO.

**Owned paths:** `packages/pi-herdr-subagents/docs/works/completed-subagent-session-open/work.md`; `context.md`; `plan.md`; `tasks.md`; `packages/pi-herdr-subagents/README.md`; plus the approved source/test paths from T1-T3. No unrelated paths.

**Work:**

- Update lifecycle/status text from draft/unaccepted/unimplemented only to the repository's truthful implemented/reviewed state; preserve acceptance evidence in its owning workflow rather than inventing a Markdown receipt.
- Ensure README describes only observed behavior and known Pi-native write/migration consequences.
- Run link checks, package gates, scoped diff checks, and `git diff --check`.
- Verify the final candidate contains exactly the accepted source/test/README changes and reconciled Work artifacts, with no unrelated files.
- Do not require implemented code to coexist with `unimplemented` coordination text.

**Checks:** Final document integrity, links, typecheck, full tests, smoke evidence, independent GO review, scoped diff, and `git diff --check`.
**Commands:** Run the existing link checker; `bun --cwd packages/pi-herdr-subagents run typecheck`; `bun --cwd packages/pi-herdr-subagents test`; `git diff --check`; and scoped `git status --short --untracked-files=all`/diff inspection. Record each result before status reconciliation.


**Stop when:** Evidence does not support a lifecycle status, file ownership expands, or reconciliation would change authority meaning rather than record the implemented result.

## Dependency And Parallelism

The critical path is serial: `T0 -> T1 -> T2 -> T3 -> T4 -> T5 -> T6`. T1 and T2 share source/test ownership and are not parallel-safe. T3 depends on both and shares those paths. T4 consumes the complete implementation. T5 and T6 are inherently downstream review/reconciliation gates. No parallel group is authorized by this Tasks draft.
**Commands:** No parallel command group is authorized. Execute each task's listed command only after its dependency gate passes.


## Final Verification Gate

Before this Tasks draft is considered complete, verify only this drafting change: `work.md`, `context.md`, `plan.md`, and `tasks.md` are the only documentation candidates in this Work directory; their identities match the authoritative manifest below; the Git index is empty; links resolve; and all four files pass blank/whitespace checks. Any change to any of the four drafts invalidates the whole manifest: recompute all four entries and obtain a fresh independent review of the exact Work/Context/Plan/Tasks set before user acceptance. Do not report package tests, implementation tests, or real smoke as passed by this drafting verification. No source, test, dependency, settings, session, runtime, Herdr state, or Git-history change is authorized here.

The manifest's authority is this section of `tasks.md`. `work.md`, `context.md`, and `plan.md` use SHA-256 over each file's complete raw bytes. To avoid an impossible self-referential fixed point, the `tasks.md` entry uses SHA-256 over its complete raw bytes after replacing everything from the line immediately after `<!-- identity-manifest:start -->` through the line immediately before `<!-- identity-manifest:end -->` with the single UTF-8 line `IDENTITY-MANIFEST-CONTENTS\n`; the two marker lines remain in the hashed bytes. No newline normalization, encoding conversion, path metadata, or Git object framing is applied. Thus the Tasks digest covers the whole document and the manifest's location while deliberately excluding only the four changing digest-value lines.

<!-- identity-manifest:start -->
- `work.md` raw SHA-256: `ee6c03738364c3081fe22163a23d5a13addda1b2b7c154075d1b49dfe39423a4`
- `context.md` raw SHA-256: `820f69bfae9339901dd50665adac98362246162d6c2ceedc1836898d1e5cc025`
- `plan.md` raw SHA-256: `8bafb9963e7e2ebf0d160222a0ccb1c42b9fa5219c25c125328ca10b0698fce8`
- `tasks.md` canonical SHA-256: `eb37f508f5f01e1b622508a125cac19162d0d4f4c20f19f70631f4087e944fb2`
<!-- identity-manifest:end -->

**Commands:** Recompute all four manifest entries using the byte boundaries above; run the repository's existing link checker if one is located and record its exact command; run `git diff --check` (or an equivalent whitespace check that includes untracked documents), confirm `git diff --cached --quiet`, and inspect `git status --short --untracked-files=all`. These are drafting checks only; do not run or report implementation gates as passed.

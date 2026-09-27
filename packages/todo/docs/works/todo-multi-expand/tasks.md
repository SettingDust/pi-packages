# Tasks: Todo Status-Derived Multi-Expand

- Status: **Administrative closure recorded as completed by explicit user direction; T0 baseline evidence is historical and T1-T4 implementation/verification remain unperformed.**
- Owner: `packages/todo`
- Governing Work: [work.md](work.md)
- Governing Context: [context.md](context.md)
- Governing Plan: [plan.md](plan.md)
- Implementation authorization: **The current Handoff reports explicit user acceptance of the bounded implementation. This document records that fact, not a new grant or receipt. T0 technical baseline passed; T1-T4 remain pending.** See [lifecycle evidence](#6-pre-t1-lifecycle-evidence).

## Administrative closure

The user directed this Work to be treated as completed for status bookkeeping. Preserve the existing T0 baseline, pending T1-T4 decomposition, and explicit absence of implementation/test evidence; this is not a pass for any failed or unrun check.

These Tasks derive exactly the accepted Plan's T0-T4 sequence for the persistent Todo widget. The implementation owner boundary is exactly:

- `packages/todo/src/widget-layout.ts`
- `packages/todo/test/widget.test.ts`

No other source, test, authority, settings, dependency, lockfile, or lifecycle path may be changed. `packages/todo/src/widget.ts` is explicitly excluded; the current wiring already supplies the canonical snapshot and `maxVisibleTasks`.

The behavior accepted by the user according to the current Handoff is: expand every and only task group containing an `in_progress` todo, in canonical task-array order; when none are active, use the existing `selectedTodoTaskIndex()` fallback. Each expanded group gets its own visible-row limit and `+N more`; the terminal summary appears at most once for the original selected/fallback group.

## 2. Ordered Task Graph

The graph is strictly serial: **T0 -> T1 -> T2 -> T3 -> T4**. A later Task cannot start until its dependency passes. T3 is a separate read-only review outcome and is never combined with T1 implementation.

| ID | Observable outcome | Depends | Allowed paths / outputs |
| --- | --- | --- | --- |
| T0 | A current authority and repository baseline proves that the accepted tuple still authorizes the same two-path implementation boundary and has no behavioral drift. | None | Evidence only; no project-file edits |
| T1 | The bounded widget projection and its focused regression tests implement the fixed multi-expand rendering contract. | T0 plus explicit user acceptance of the Work/Context/Plan/Tasks tuple | `packages/todo/src/widget-layout.ts`, `packages/todo/test/widget.test.ts` only |
| T2 | Focused tests, full package tests, typecheck, whitespace validation, and exact path/status inspection pass for the T1 bytes. | T1 | Verification outputs only; no implementation-path edits |
| T3 | A fresh independent read-only correctness review returns no material finding against the accepted tuple and exact post-T2 bytes. | T2 | Review evidence only; no implementation-path edits |
| T4 | Lifecycle documents and evidence are reconciled truthfully, and final checks establish commit readiness without performing a commit. | T3 | `tasks.md` and lifecycle/evidence records only as authorized by the reconciliation procedure; no staging or commit |

## 3. Task Specifications

### T0: Authority, Identity, and Boundary Baseline

**Input:** [work.md](work.md), [context.md](context.md), [plan.md](plan.md), the derived `tasks.md`, repository status, staged-path list, scoped diff, and the baseline commit `c9d6c1627c1c1ce509a3abc3fbdf45278342a93d`.

**Procedure and allowed scope:**

- Require explicit user acceptance of the then-current Work/Context/Plan/Tasks tuple before any implementation Task can begin. This Task itself is not acceptance and does not grant implementation authorization.
- Recompute the canonical authority identities from the document-specified algorithm and verify all Work/Context/Plan/Tasks links and lifecycle statements agree with actual acceptance and implementation evidence. Current state: user acceptance reported by the Handoff, T0 technical baseline passed, T1-T4 pending, unimplemented.
- Confirm the repository baseline is exactly `c9d6c1627c1c1ce509a3abc3fbdf45278342a93` for the intended comparison.
- Record raw-byte SHA-256 identities for the authority tuple and both owned implementation paths, plus `git status --short --untracked-files=all`, `git diff --cached --name-only`, and the scoped diff.
- Confirm the only possible implementation paths remain exactly `widget-layout.ts` and `widget.test.ts`; verify there are exactly two implementation paths and no unexplained path or behavior drift.

**Acceptance evidence:** Reproducible identity record, baseline revision record, status/index/scoped-diff output, resolved link checks, and an explicit statement that only the two named implementation paths are eligible.

**Stop conditions:** Stop before T1 on missing or changed authority, unreadable link, baseline mismatch, non-empty index, unexplained dirty path, more or fewer than two implementation paths, or any scope/behavior drift. Require amendment and renewed acceptance; do not choose a narrower outcome.

**Next dependency:** T1 may start only after T0 passes and explicit user acceptance is recorded for the current tuple.

### T1: Bounded Projection and Regression Coverage

**Input:** T0 evidence and the current accepted Work/Context/Plan/Tasks tuple.

**Allowed paths:** Modify only `packages/todo/src/widget-layout.ts` and `packages/todo/test/widget.test.ts`. No `widget.ts` change is permitted. Keep the pure layout seam and existing helpers/interfaces; add no exported abstraction, `Set`, cache, cursor, toggle model, persisted UI state, dependency, or lockfile.

**Required implementation behavior:**

- Derive expanded indexes on every `renderTodoWidgetLines()` projection by scanning canonical `TodoState.tasks` in array order for groups containing at least one `in_progress` todo.
- Expand all and only those active groups concurrently. If there are no active groups, use the existing `selectedTodoTaskIndex()` fallback; if it is negative, preserve the existing empty result.
- Render every task title once in canonical order, retaining existing selected/muted styling, markers, counts, spacing, and truncation.
- Apply the existing `maxVisibleTasks`/`maxVisible` open-todo limit independently to each expanded group, preserving active-first/status-priority and stable source order. Preserve the existing behavior that all active todos remain visible when a group exceeds the limit.
- Compute and place each expanded group's own `+N more` immediately after that group's visible todo rows; never aggregate counts across groups.
- Render the terminal summary only for the unchanged original selected/fallback group, at most once, after that group's rows and optional `+N more`, before the next title.
- Preserve the final `workingOn` block and existing width-fitting path.
- Add focused tests through `renderTodoWidgetLines()` without changing canonical state, tool protocols, lifecycle, or UI state.

**Explicitly forbidden changes:** `widget.ts`; all four tool protocols or registrations; `TodoState`, task/todo shapes, status transitions, or `workingOn` derivation; renderer or Host row-level `expanded`; persistence/recovery/session lifecycle; formatter, reminder, visibility, or terminal behavior; descriptions; keyboard interaction, cursor handling, toggles, custom overlays, or local UI state; dependencies and lockfiles; any authority file other than the later lifecycle reconciliation permitted by T4.

**Acceptance evidence:** Focused test cases and exact two-path diff showing the fixed rendering contract, with no forbidden-path changes and no implementation authorization claim.

**Stop conditions:** Stop and return to authority review on any need for a third path, changed setting semantics, new UI state, altered excluded behavior, unresolved rendering decision, or test that passes only by weakening the contract.

**Next dependency:** T2 starts only after T1's two-path diff and focused tests are complete.

### T2: Verification and Boundary Recheck

**Input:** Exact post-T1 bytes, T1 focused test evidence, and T0 baseline/evidence.

**Allowed paths:** Verification outputs only; do not modify source, tests, authority, dependencies, or lockfiles.

**Required checks:**

- Run the smallest focused command covering `packages/todo/test/widget.test.ts`.
- Run the package's full test command and typecheck.
- Run `git diff --check`.
- Inspect final status, index, exact path diff, and forbidden-path boundary.
- Verify the test matrix covers zero/one/multiple active groups; canonical ordering; independent per-group `+N more`; terminal summary exactly once and in the required position; narrow width; empty and terminal-only groups; and mutation/restore status recomputation with no additional UI state.

**Acceptance evidence:** Exact commands and pass/fail results, test counts, typecheck result, diff-check result, status/index output, and a path-boundary report identifying only the two owned paths.

**Stop conditions:** Stop before T3 on any test, typecheck, diff-check, path, index, status, width, ordering, summary, fallback, mutation/restore, or forbidden-behavior failure. Do not weaken assertions or repair implementation during T2.

**Next dependency:** T3 starts only with all checks passing against unchanged post-T2 bytes.

### T3: Independent Correctness Review

**Input:** Accepted Work/Context/Plan/Tasks tuple, T0 evidence, exact post-T2 source/test bytes, T2 verification evidence, and final scoped diff.

**Allowed paths:** Read-only review evidence; no source, test, authority, dependency, or lockfile edits.

**Review scope:** Independently assess group selection, canonical ordering, per-group visibility limits and hidden counts, one-time terminal-summary placement, narrow-width safety, fallback compatibility, empty/terminal groups, mutation and restore recomputation, unchanged formatting and `workingOn`, excluded lifecycle/state/protocol behavior, test sufficiency, and exact two-path containment.

**Acceptance evidence:** Fresh reviewer identity/context, reviewed byte identities, findings ordered by severity, and an explicit GO/no-material-finding decision or actionable findings.

**Stop conditions:** Any material correctness, evidence, scope, or authority finding invalidates T2/T3 completion and returns the work to T1 after the finding is resolved; do not merge review and implementation into one result.

**Next dependency:** T4 starts only after a fresh GO with no unresolved material finding.

### T4: Lifecycle Reconciliation and Commit Readiness

**Input:** Clean T3 review, all prior evidence, current authority documents, and exact final bytes.

**Allowed paths:** Reconcile lifecycle/evidence statements only as needed to truthfully record completion; no source/test expansion. Do not modify existing product or technical authority. Do not modify `work.md`, `context.md`, or `plan.md` unless a separately authorized lifecycle procedure explicitly permits it; this Tasks derivation deliverable itself modifies only `tasks.md`.

**Required procedure:**

- Reconcile the Work, Context, Plan, and Tasks lifecycle statements with actual implementation and verification evidence while retaining truthful authority/authorization semantics.
- Record final raw-byte identities for both owned implementation paths and the reconciled authority tuple.
- Rerun focused tests, full package tests, typecheck, `git diff --check`, status, index, and exact path-boundary checks after reconciliation.
- At the pre-implementation draft/candidate stage, confirm this Work directory has exactly four untracked documents: `work.md`, `context.md`, `plan.md`, and `tasks.md`; confirm the Git index is empty. This is not a post-implementation requirement: source, test, and evidence status must be recorded from actual changes and verification.
- Declare only commit readiness. This Task does not stage, commit, push, reload, deploy, reset, or clean.

- **Acceptance evidence:** Reconciled lifecycle/evidence record, final identities, rerun results, actual source/test/evidence status, empty-index result, and passing diff-check. The exact four-untracked-document listing is evidence only for the pre-implementation draft/candidate stage.

- **Stop conditions:** Stop without declaring readiness on lifecycle mismatch, stale or unsupported evidence, identity drift, failed rerun, a draft-stage document-boundary violation, non-empty index, forbidden path, or any request to perform a prohibited action.

**Terminal outcome:** Commit readiness only; implementation completion and commit execution remain separate authorization boundaries.

## 4. Verification Matrix

| Behavior | Required evidence owner |
| --- | --- |
| Zero active groups and selected/fallback behavior | T1 tests, T2 execution, T3 review |
| One active group with collapsed siblings | T1 tests, T2 execution |
| Multiple active groups in canonical order | T1 tests, T2 execution, T3 review |
| Independent per-group `maxVisibleTasks` and `+N more` | T1 tests, T2 execution, T3 review |
| Terminal summary once, selected/fallback group only, correct placement | T1 tests, T2 execution, T3 review |
| Narrow width and existing fit path | T1 tests, T2 execution, T3 review |
| Empty and terminal-only groups | T1 tests, T2 execution |
| Mutation and restore-derived recomputation without UI state | T1 tests, T2 execution, T3 review |
| Existing titles, markers, counts, rows, descriptions omission, `workingOn`, and formatting | T1 tests, T2 execution, T3 review |
| Exact two-path ownership and final four-document candidate | T0, T2, T4 |

## 5. Completion Rules

- Tasks derivation is complete as documentation; the former draft/unaccepted labels are superseded by the current Handoff's user-acceptance fact. Execution is not complete: T0 technical baseline passed; T1-T4 remain pending.
- T1 implementation is not authorized by creating, reviewing, or completing Tasks. It requires the explicit acceptance gate stated in T0 and the project workflow.
- No parallel execution is permitted: all five Tasks share the projection contract and the two-path diff boundary.

## 6. Pre-T1 Lifecycle Evidence

The current lifecycle-synchronization Handoff reports user implementation acceptance and authorizes only lifecycle/evidence edits to these four documents. Neither this record nor the T0 Result creates an acceptance receipt, persistent admission state, or new implementation authority. No additional confirmation gate or summary mechanism is introduced.

T0 source: `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/verify-todo-multi-expand-t0-artifacts/result-1.json`.

The T0 Result reports matching tuple and implementation-path identities, matching HEAD, no staged or tracked-path changes, readable references, and the exact two-path boundary. It identifies the stale lifecycle labels as the pre-T1 discrepancy addressed here. It did not independently verify a user-confirmation transcript or prior review Result and did not run functional tests or typecheck; this synchronization does not claim otherwise.

Acceptance-time raw-byte SHA-256 identities, preserved from T0 and rechecked before this synchronization:

| Document | SHA-256 |
| --- | --- |
| work.md | `d2be8d8a207e6d9b3605aa64ed4bbec9e5453ca81fd38f14244627d4429d142c` |
| context.md | `7458379ebd0ae0e10bbe7131538104c98097f4c362bbb9cc7daf8948e994db21` |
| plan.md | `2f105ba08eebd312de8ffb7c5fae33bc9f7172749242a55d21bc6191e8be221d` |
| tasks.md | `2062e4f6e34c795f656661bd1050c6c696eaa5789f4aa6fd0459e5181c1d3ab2` |

The synchronization Result reports the resulting four-document identities separately; these are not the unchanged acceptance-time bytes. T0 technical baseline is passed; T1, T2, T3, and T4 are pending. The accepted rendering contract, two implementation paths, serial dependencies, and verification conditions are unchanged. No implementation completion or commit readiness is claimed.

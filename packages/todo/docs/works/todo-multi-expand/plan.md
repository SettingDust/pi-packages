# Plan: Todo Status-Derived Multi-Expand

- Status: **Implementation accepted by the user (Handoff-reported fact); T0 technical baseline passed; T1-T4 pending; unimplemented.**
- Owner: `packages/todo`
- Related Work: [work.md](work.md)
- Related Context: [context.md](context.md)
- Existing Authority: [Todo Protocol Redesign Work](../todo-protocol-redesign/work.md), [Context](../todo-protocol-redesign/context.md), [Spec](../todo-protocol-redesign/spec.md), [Plan](../todo-protocol-redesign/plan.md), and [Tasks](../todo-protocol-redesign/tasks.md)
- Implementation authorization: **The current Handoff reports explicit user acceptance of the bounded implementation. This document records that fact, not a new grant or receipt. T0 technical baseline passed; T1-T4 remain pending.** See [Tasks evidence](tasks.md#6-pre-t1-lifecycle-evidence).

## 1. Objective

Change only the persistent Todo widget projection so every task group containing at least one `in_progress` todo is expanded at the same time, in canonical `TodoState.tasks` array order. When no group is active, expand only the group returned by the existing `selectedTodoTaskIndex()` fallback.

The projection remains entirely derived from the current canonical snapshot on every render. It adds no UI state and changes no protocol, canonical model, lifecycle, persistence, or Host renderer behavior.

## 2. Rendering Contract

For each call to `renderTodoWidgetLines()`:

1. Compute the existing `selectedTodoTaskIndex(tasks)` once. If it is negative, return the existing empty result.
2. Scan `tasks` in canonical array order for indexes whose group contains at least one todo with status `in_progress`.
3. If that scan is non-empty, expand exactly those indexes. Otherwise, expand exactly the existing selected/fallback index.
4. Continue rendering every task title once and in canonical order. A title uses the existing selected styling when its group is expanded and the existing muted styling otherwise; no title, marker, progress count, spacing, or truncation format changes.
5. For each expanded group independently, reuse `visibleTodos()` and the current status-priority/stable-source-order behavior. `maxVisibleTasks`, passed internally as `maxVisible`, retains its current actual meaning: it is the visible open-todo limit for each expanded group. It is not a limit on expanded task-group count. As today, if one group has more active todos than the limit, all of that group's active todos remain visible.
6. For each expanded group independently, calculate hidden count as that group's open-todo count minus that group's visible-todo count. Place that group's existing `    +N more` row immediately after its visible todo rows when the count is positive. Never aggregate hidden rows across groups.
7. Preserve the existing terminal-summary selection rule rather than attaching a summary to every expanded group. Compute it only for the group at the unchanged `selectedTodoTaskIndex()`: with active groups this is the first active group found by the existing canonical active-task derivation; with no active groups it is the fallback group. Render at most one summary, after that selected group's visible todo rows and optional `+N more`, before the next task title. Terminal summaries belonging only to other simultaneously expanded active groups are not rendered.
8. Preserve the existing final `workingOn` block and width fitting. Every nonblank row continues through the same outer indent and `fit()` path; multiple expanded groups add rows but create no new height cap or overlay behavior.

Empty groups and terminal-only groups remain collapsed while any active group exists. With no active group, the existing fallback remains: first group with an open todo, otherwise last non-empty group, otherwise no widget rows from this layout function.

## 3. Minimum Implementation Strategy

Keep the existing pure layout module as the single seam for group selection, ordering, row projection, and width fitting.

- `packages/todo/src/widget-layout.ts`: derive expanded indexes from canonical todo statuses, then reuse the existing title, open-todo ordering, todo-row, per-group hidden-count, selected terminal-summary, and width-fitting logic inside the canonical task loop. Prefer a direct array/index computation; do not add an exported abstraction, `Set`, cache, cursor, toggle model, or persisted UI state.
- `packages/todo/test/widget.test.ts`: replace the obsolete single-active-group expectation where necessary and add focused table/state cases through `renderTodoWidgetLines()`. Reuse existing helpers and assertions.

`packages/todo/src/widget.ts` is excluded from the implementation boundary. Current code already passes the complete canonical snapshot and existing `maxVisibleTasks` value into `TodoWidgetComponent`, so no lifecycle wiring is required. Bringing `widget.ts` or any other path into scope requires new code evidence, an explicit Plan amendment, independent review, and renewed user acceptance before implementation continues.

No migration, compatibility adapter, setting rename, dependency, or release mechanism is needed. Reverting the bounded source change restores the prior single-group projection without data conversion because no state shape or persisted value changes.

## 4. Ownership and Non-goals

The implementation may own exactly these paths after acceptance:

- `packages/todo/src/widget-layout.ts`
- `packages/todo/test/widget.test.ts`

This Plan does not authorize changes to:

- the four tool schemas or interfaces;
- `TodoState`, `tasks[].todos[]`, status transitions, or `workingOn` derivation;
- tool-result rendering or the Host row-level `expanded` option;
- settings names or meanings, including the externally named `maxVisibleTasks`;
- formatter, reminder, visibility, persistence, restore, session-branch, or terminal-widget lifecycle behavior;
- task/todo descriptions, keyboard handling, cursor state, toggles, custom overlays, or local detail views;
- existing PRD, ADR, Spec, Work, Plan, Tasks, evidence, source, or test paths outside the two implementation paths above.

## 5. Ordered Gates

The execution graph is serial: **T0 baseline -> T1 bounded implementation -> T2 verification -> T3 independent review -> T4 lifecycle reconciliation and commit readiness**. A later gate may start only after the prior gate passes. Parallel implementation or review against moving bytes is not allowed because both implementation paths define one projection behavior and one shared regression surface.

### T0: Authority, Path, and Hash Baseline

Before editing implementation files:

- require explicit user acceptance of the then-current Work, Context, Plan, and derived Tasks tuple; this requirement is reported satisfied by the current Handoff, not by the mere existence of this Plan;
- verify the Work/Context/Plan/Tasks links resolve and all four still describe the same status-derived behavior and exclusions;
- record raw-byte SHA-256 baselines for the accepted authority tuple and both owned implementation paths;
- record `git status --short --untracked-files=all`, `git diff --cached --name-only`, and the scoped diff so pre-existing work is distinguishable;
- require the implementation candidate boundary to remain exactly the two owned source/test paths, with no unexplained drift. Any authority hash, path, or behavior drift stops execution for amendment and renewed acceptance.

### T1: Bounded Implementation

Update `renderTodoWidgetLines()` at the existing layout seam and adjust focused widget tests. Preserve all existing helpers and interfaces unless the smallest direct change demonstrably requires a private helper. Do not modify `widget.ts`, lifecycle code, state derivation, settings, or persistence.

### T2: Verification

Run the smallest focused test command covering `packages/todo/test/widget.test.ts`, then the package's full test command and typecheck. Also run `git diff --check` and inspect the final path diff. A failure blocks progression; do not weaken an assertion to accept behavior outside this contract.

### T3: Independent Review

Obtain a fresh read-only correctness review against the accepted tuple and exact post-T2 bytes. The review must assess group selection, ordering, per-group limits/counts, one-time terminal-summary placement, narrow-width safety, fallback compatibility, excluded lifecycle/state behavior, test sufficiency, and path containment. Any material finding returns to T1 and invalidates prior T2/T3 evidence.

### T4: Lifecycle Reconciliation and Commit Readiness

After a clean T3 result:

- reconcile Work, Context, Plan, and Tasks lifecycle statements with actual implementation and verification evidence without changing product or technical authority;
- record final hashes for the two owned implementation paths and the reconciled authority tuple;
- rerun focused tests, full package tests, typecheck, `git diff --check`, status, index, and exact path-boundary checks after reconciliation;
- declare only commit readiness. Do not stage, commit, push, reload, deploy, reset, or clean without separate explicit authorization.

## 6. Verification Matrix

| Case | Required evidence |
| --- | --- |
| Zero active groups | Only `selectedTodoTaskIndex()` fallback group expands; first open group wins, terminal-only fallback remains the last non-empty group, and no usable group yields no layout rows. |
| One active group | Exactly that group expands; pending/terminal-only siblings remain title-only. |
| Multiple active groups | Every and only active group expands simultaneously in canonical task-array order. |
| Per-group `maxVisibleTasks` | Apply the existing open-todo limit independently to each expanded group while retaining the existing all-active-over-limit behavior within each group. |
| Per-group `+N more` | Each expanded group computes and places its own hidden count directly after its visible rows; no global combined count appears. |
| Terminal summary | At most one summary appears, only for the unchanged selected/fallback group, after its own optional `+N more` and before the next task title; it is not repeated for other active groups. |
| Canonical and todo ordering | Task titles and expanded blocks follow `tasks` order; each block preserves active-first, pending-next, stable original todo order. |
| Narrow width | At widths already exercised by the suite, every rendered line remains within `visibleWidth <= width`, including titles, todo rows, per-group `+N more`, summary, and working line. |
| Empty and terminal groups | Such groups remain title-only while active groups exist; existing no-active fallback behavior remains intact. |
| Mutation-derived recomputation | Rendering a changed canonical snapshot immediately changes expanded groups solely from statuses, with no retained expansion state. |
| Restore-derived recomputation | Rendering an equivalent restored snapshot produces the same lines as mutation output and requires no persisted UI state or lifecycle wiring. |
| Existing presentation | Task titles, progress counts, markers, todo rows, colors, descriptions omission, `workingOn`, width truncation, and canonical task order remain unchanged except for the newly repeated active-group rows. |

## 7. Risks and Mitigations

- **Accidental global cap:** treating `maxVisibleTasks` as a group limit would collapse required groups. Mitigation: per-group row-count assertions with multiple active groups.
- **Cross-group hidden count:** sharing visible/open arrays would produce a global `+N more`. Mitigation: construct and assert each count inside its group projection.
- **Repeated terminal summaries:** naively reusing the entire selected block for every active group would duplicate summaries. Mitigation: keep summary eligibility tied to the unchanged selected index and assert exact occurrence count and placement.
- **Projection state drift:** retaining expanded indexes outside a render would diverge after mutation or restore. Mitigation: derive indexes locally from the supplied snapshot and compare equivalent mutation/restore render output.
- **Unnecessary lifecycle scope:** changing `widget.ts` could disturb the five-second terminal display behavior. Mitigation: keep it excluded; current wiring already supplies all required inputs.

## 8. Lifecycle Status

The former draft-stage criteria are historical: linked Work/Context, four untracked candidate documents, no staged changes, and passing `git diff --check`. The T0 Result records that technical baseline and the acceptance-time tuple identities. The current Handoff reports user acceptance and authorizes this lifecycle-only synchronization; implementation remains uncompleted. After implementation, source, test, and evidence status must be reconciled from actual changes and verification rather than required to remain untracked.

T0 technical baseline passed. T1-T4 remain pending and retain all existing dependencies, behavior, ownership, review, and verification conditions. This synchronization changes no implementation contract and supplies no implementation or test result.

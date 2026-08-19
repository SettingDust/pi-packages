# Task-Derived Subagent ID Tasks

- Review disposition: `accepted-ready`; fresh review `subagent-47` closed all three findings, and the user explicitly accepted and queued implementation in the current main session. This records review and session acceptance only; it does not authorize a future session or satisfy any implementation gate.
- Plan: [Task-derived subagent ID Plan](plan.md)
- Authority: [Task-derived subagent ID specification](../../spec/task-derived-subagent-id.md)
- Context: [Work Context](context.md)

## Task 0: Establish The Workspace Admission Gate And Fresh Baseline

- Status: completed.
- Dependency: external `running-status-widget` Task 1 workspace state.
- Objective: select a conflict-free implementation location and establish a fresh package baseline before task-derived source or test writes.
- Expected touched surfaces: none; do not edit or revert the shared dirty `src/index.ts` or `tests/runtime.test.ts` status-widget changes.
- Constraints: the shared dirty worktree is not an allowed location for task-derived Task 1. Either begin from the status-widget Task 1 commit itself, or use a separate worktree and keep it separate until reconciliation. The historical `HEAD 3b3ee81` and 26-test record are context only.
- Completion evidence:
  - The selected baseline commit and worktree path are recorded.
  - The chosen location is either based on the committed status-widget Task 1 change or is isolated from the shared dirty worktree.
  - Fresh baseline commands pass before Task 1 writes source or tests:
    - `bun run --cwd packages/pi-harness test`
    - `bun run --cwd packages/pi-herdr-subagents typecheck`
    - `bun run --cwd packages/pi-herdr-subagents test`
    - `git diff --check -- packages/pi-harness/extensions/pi-harness.ts packages/pi-harness/tests/extension.test.ts packages/pi-herdr-subagents`
  - The actual baseline result is recorded; no historical test count is presented as a rerun.

## Task 1: Add The Router And Spawn Input Contract

- Status: completed.
- Dependency: Task 0.
- Objective: make `taskSlug` a required post-resolution spawn input while preserving the current Handoff and Resolver protocol and defining the stable allocation-error boundary.
- Expected touched surfaces: `packages/pi-harness/extensions/pi-harness.ts`, `packages/pi-harness/tests/extension.test.ts`, `packages/pi-herdr-subagents/src/index.ts`, `packages/pi-herdr-subagents/tests/runtime.test.ts`, `packages/pi-herdr-subagents/tests/renderer.test.ts`.
- Constraints: Router derives the slug from concrete Handoff execution; it passes an independent label. Do not add `taskSlug` to `Handoff`, `ResolverInput`, or `ResolvedInvocation`. Runtime validation remains authoritative; no random or semantic runtime generation. Do not start this task in the shared dirty worktree.
- Completion evidence:
  - Router prompt regression coverage requires `agent: "handler"`, resolved prompt/model/thinking, Router-derived `taskSlug`, and separate label at the spawn boundary.
  - Existing Resolver protocol tests prove the Handoff and resolved output remain unchanged.
  - `subagent_spawn` rejects a missing slug at the tool/runtime boundary with the Spec-defined `TaskIdAllocationError`, code `invalid_task_slug`, and exact message `Invalid task slug.`; it exposes a documented required `taskSlug` input.
  - Spawn call/result rendering works with canonical IDs and reports the final allocated ID.
  - The failure test asserts stable class/code/message rather than a schema or operating-system error string.

## Task 2: Implement Canonical Allocation, Reservation, And Failure Classification

- Status: completed.
- Dependency: Task 1.
- Objective: replace numeric new-task allocation with exact slug validation and atomic, bounded artifact-directory reservation with the complete stable failure taxonomy.
- Expected touched surfaces: `packages/pi-herdr-subagents/src/index.ts`, `packages/pi-herdr-subagents/tests/runtime.test.ts`.
- Constraints: use only canonical 3-48-character lowercase ASCII slugs; reject `subagent-` prefix and invalid separators/characters without normalization. Try base, `-2`, through `-100`; retain current artifact reservations; do not add lockfiles, databases, or process-local allocation sequence. Export and use `TaskIdAllocationError` with the exact class name and messages from Spec section 4.1.
- Completion evidence:
  - Tests cover valid minimum and maximum lengths, invalid too-short and too-long values, uppercase, whitespace, dots, slashes, underscores, consecutive/edge hyphens, and reserved prefix.
  - Invalid/missing values create no artifact directory, manifest, session, tab, pane, or launch script and yield only `TaskIdAllocationError`, `invalid_task_slug`, `Invalid task slug.`.
  - Pre-existing artifact directories and generation-one sessions produce ordered `-2` and `-3` allocation without overwrite; `EEXIST` is asserted as a collision, not a filesystem failure.
  - Two independent runtime instances sharing one tasks directory reserve distinct candidates despite concurrent spawn requests.
  - All 100 occupied candidates cause only `TaskIdAllocationError`, `task_id_exhausted`, `Task ID allocation exhausted.`, with no tab/pane creation and no fallback numeric/random ID.
  - An injected ordinary non-`EEXIST` filesystem failure before reservation causes only `TaskIdAllocationError`, `filesystem_reservation_failed`, `Task ID filesystem reservation failed.`, preserves the original error object as `cause`, and creates no tab or pane. The test does not assert platform-specific error text.
  - The three negative classification checks prove that each condition does not receive either of the other two codes.
  - `bun run --cwd packages/pi-herdr-subagents typecheck` passes.

## Task 3: Persist, Recover, And Preserve Lifecycle Compatibility

- Status: completed.
- Dependency: Task 2.
- Objective: persist canonical task slugs in version-1 manifests and make every lifecycle path use final IDs while retaining legacy numeric records.
- Expected touched surfaces: `packages/pi-herdr-subagents/src/index.ts`, `packages/pi-herdr-subagents/tests/runtime.test.ts`, `packages/pi-herdr-subagents/tests/renderer.test.ts`.
- Constraints: no manifest version migration. New canonical manifests must contain `taskSlug`; legacy numeric manifests may omit it. Do not rename old paths or alter Result/notification payload shapes.
- Completion evidence:
  - New manifests validate final-ID/task-slug relation and matching artifact/session paths; malformed canonical records are ignored during recovery.
  - Final ID is consistent in session, Result, launch artifact, environment, result identity checking, completion notification, tool rendering, inspect, join, steer, cancel, resume, and remove tests.
  - Restart recovery restores canonical running-pane and terminal-Result tasks without relaunching or changing identity.
  - Legacy `subagent-N` fixtures recover, read Results, generate notifications, resume, render, and remove exactly as before, with no rename.
  - Explicit remove deletes canonical artifacts and session; a fresh runtime then reuses the unsuffixed slug.

## Task 4: Integration Gate And Fresh Correctness Review

- Status: completed.
- Dependency: Task 3 and any required reconciliation with the committed `running-status-widget` Task 1 baseline.
- Objective: verify the bounded implementation and independently inspect it against the Spec after the final worktree is reconciled.
- Expected touched surfaces: corrections only when required by failed verification or review findings.
- Constraints: run the final gates from the selected/reconciled baseline. Do not claim the historical 26-test record as a fresh result. Do not modify unrelated documents, source, tests, README, metadata, or the status-widget work outside required reconciliation.
- Completion evidence:
  - `bun run --cwd packages/pi-harness test` passes.
  - `bun run --cwd packages/pi-herdr-subagents typecheck` passes.
  - `bun run --cwd packages/pi-herdr-subagents test` passes.
  - `git diff --check -- packages/pi-harness/extensions/pi-harness.ts packages/pi-harness/tests/extension.test.ts packages/pi-herdr-subagents` passes.
  - A fresh review confirms strict non-normalizing validation, atomic collision behavior, stable class/code/message and cause handling, exhaustion isolation, ordinary filesystem-failure isolation, legacy compatibility, final-ID propagation, Router/Handoff separation, and no prohibited document or metadata edits.
  - The final review disposition and actual command results are recorded; no completion claim relies solely on historical evidence.

## Execution Order

`Task 0 -> Task 1 -> Task 2 -> Task 3 -> Task 4`

No task group is parallel-safe. Task 1 is blocked until the status-widget workspace admission gate is satisfied, and Tasks 1 through 3 share the Router-to-runtime contract and the same runtime and test fixtures. Task 4 verifies the combined result after any worktree reconciliation.

## Unresolved Questions

None.

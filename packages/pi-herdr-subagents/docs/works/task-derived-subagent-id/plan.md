# Task-Derived Subagent ID Plan

- Review disposition: `needs-revision` findings are addressed in this document revision. This is not a final implementation acceptance; source, test, and fresh-review gates remain pending.
- Authority: [Task-derived subagent ID specification](../../spec/task-derived-subagent-id.md)
- Context: [Work Context](context.md)

## Objective

Make new subagent identities deterministic from Router-provided execution slugs, safely resolve collisions across runtimes, expose stable allocation failures, and retain full legacy numeric-task recovery behavior.

## Scope

- Add required `taskSlug` to the runtime and `subagent_spawn` boundary.
- Update Router prompt guidance to derive the slug from each resolved Handoff and pass it separately from `label`.
- Replace process-local numeric allocation with strict validation and atomic artifact-directory reservation.
- Expose stable `TaskIdAllocationError` failures for invalid slug, candidate exhaustion, and ordinary filesystem reservation failure.
- Record and validate new canonical ID relationships in version-1 manifests.
- Recover both canonical and legacy numeric tasks without migration or renaming.
- Preserve final-ID use across paths, results, environment, notifications, rendering, resume, and removal.
- Add focused regression coverage and complete a fresh correctness review.

## Non-Goals

Do not change the Handoff schema, Handler Result protocol, model resolution output, Agent discovery, result transport, Router scheduling, README, package metadata, shared document index, `running-status-widget`, or `steer-input-submission`. Do not add random names, runtime semantic parsing, locks, databases, automatic cleanup, a manifest-version migration, or global cross-scope coordination.

## External Workspace Prerequisite

`running-status-widget` Task 1 currently owns dirty changes in `packages/pi-herdr-subagents/src/index.ts` and `packages/pi-herdr-subagents/tests/runtime.test.ts`. Task-derived Task 1 requires those same files. It is an external workspace-admission prerequisite, not a parallel-safe implementation opportunity.

Before any task-derived Task 1 source or test write, use exactly one of these paths:

1. Wait for the status-widget Task 1 changes to be committed, then start from that same baseline commit.
2. Start task-derived work in an isolated worktree and keep it isolated until the status-widget Task 1 commit is reconciled; rerun the fresh final gates after reconciliation.

Do not write task-derived Task 1 into the shared dirty worktree. Do not modify, revert, amend, or silently absorb the status-widget changes.

## Strategy

### 0. Admit a fresh implementation baseline

First satisfy the external workspace prerequisite. Record the selected baseline commit and worktree location, then run a fresh baseline check before source changes:

```text
bun run --cwd packages/pi-harness test
bun run --cwd packages/pi-herdr-subagents typecheck
bun run --cwd packages/pi-herdr-subagents test
git diff --check -- packages/pi-harness/extensions/pi-harness.ts packages/pi-harness/tests/extension.test.ts packages/pi-herdr-subagents
```

The historical 26-test record remains historical evidence only. Record actual command outcomes without reusing its count or claiming it was rerun by this documentation revision.

### 1. Establish the Router-to-spawn schema boundary

Update the Router system prompt in `packages/pi-harness/extensions/pi-harness.ts` to require a canonical task slug derived from the concrete Handoff execution before it calls `subagent_spawn`. Preserve the current `resolve_delegation` Handoff and Resolver output types in `packages/pi-harness/src/protocol.ts`: the Router derives `taskSlug` after resolution and passes it with `agent: "handler"`, prompt, model, thinking, and the independent label.

Add a required `taskSlug` string to `SubagentRuntime.spawn()` and the dynamic `subagent_spawn` tool schema. The runtime must own validation, so schema-level checks are advisory only and must not be the only enforcement point. The tool boundary must preserve the stable allocation-error contract for missing and invalid values. Update the spawn call renderer to tolerate the new input and the result renderer to show the actual final ID.

### 2. Replace the allocator at its existing runtime seam

Remove the process-local `sequence` ownership from task-derived allocation. Add one narrow allocator/validator seam adjacent to `reserveSubagentId()` in `SubagentRuntime` that:

1. validates the exact canonical grammar and reserved prefix from the Spec without normalization;
2. tries the base slug followed by suffixes `-2` through `-100`;
3. treats an existing generation-one session or artifact directory as unavailable;
4. reserves a candidate exclusively through non-recursive artifact-directory creation; and
5. reports invalid input, filesystem failure, or bounded exhaustion before spawning a tab or pane.

Implement and export the Spec-defined `TaskIdAllocationError` at this boundary. Every direct `spawn()` and `subagent_spawn` allocation failure must expose the exact class name, code, and message from Spec section 4.1. A non-`EEXIST` filesystem failure must retain its original error as `cause`; tests may assert cause identity or structured fields, but must not assert platform-dependent error text. `EEXIST` remains a collision rather than a filesystem-reservation failure.

Do not introduce a lockfile or process-global state. The existing artifact directory is the cross-runtime reservation primitive. Preserve retained reservations after launch failure and terminal state. Removal continues to delete the session and directory, which makes future allocation reusable.

### 3. Extend manifest and lifecycle validation without migration

Extend the existing version-1 record with `taskSlug` for all new canonical tasks. Carry the requested slug in runtime task state as needed to persist and validate it. Require the final ID to equal the task slug or a legal collision suffix; derive all session, Result, launch, environment, and notification values from the final ID.

Keep the existing version field so old records remain readable. Generalize recovery directory discovery and record validation to accept either supported legacy numeric records without `taskSlug` or canonical records with the exact slug/final-ID relation. Reject malformed combinations safely. Preserve resume's stable ID/session behavior, current Result identity matching, completion notification summaries, and explicit remove semantics.

### 4. Verify collisions, failure classification, compatibility, and visible output

Update focused runtime tests from numeric-new-task expectations to canonical-new-task expectations. Retain representative numeric fixtures as explicit legacy regression cases rather than rewriting them as if no old artifacts exist. Cover validation boundaries, no-side-effect rejection, existing-session and existing-directory collisions, concurrent independent runtime allocation, bounded exhaustion, ordinary filesystem failure, final-ID propagation, explicit-remove-and-restart reuse, retained canonical recovery, and legacy recovery/result/notification/resume/remove behavior.

For each allocation failure, add both positive and negative classification checks:

- invalid or missing slug yields only `TaskIdAllocationError` / `invalid_task_slug` / `Invalid task slug.` and no allocation side effects;
- 100 unavailable candidates yields only `TaskIdAllocationError` / `task_id_exhausted` / `Task ID allocation exhausted.`, without tab/pane creation or fallback;
- an injected ordinary non-`EEXIST` filesystem error yields only `TaskIdAllocationError` / `filesystem_reservation_failed` / `Task ID filesystem reservation failed.`, preserves the original error as `cause`, and creates no tab or pane; and
- `EEXIST` remains a collision path, not `filesystem_reservation_failed`.

Update renderer tests to prove the spawn result reports an unsuffixed or suffixed final ID correctly and join rendering accepts both canonical and legacy IDs. Update Harness extension tests only for Router prompt contract; assert the Handoff/Resolver protocol remains unchanged.

### 5. Run fresh final gates and review

Run focused relevant tests while implementing, then repeat the full gates on the selected, reconciled baseline:

```text
bun run --cwd packages/pi-harness test
bun run --cwd packages/pi-herdr-subagents typecheck
bun run --cwd packages/pi-herdr-subagents test
git diff --check -- packages/pi-harness/extensions/pi-harness.ts packages/pi-harness/tests/extension.test.ts packages/pi-herdr-subagents
```

Perform a fresh read-only correctness review after those commands. Review specifically for workspace-isolation compliance, unnormalized invalid slug handling, exact stable error classification, `EEXIST` races, session/artifact collision behavior, exhaustion and filesystem-failure side effects, stale numeric-only recovery validation, accidental Handoff schema expansion, broken retained-pane recovery, and remove/reuse semantics. Record actual test outcomes and final-review disposition rather than relying on the historical 26-test evidence.

## Dependency Order

1. External status-widget Task 1 workspace admission and fresh baseline gate.
2. Router and runtime interface authority checks establish the input and stable-error boundary.
3. Runtime allocator and manifest/recovery work is the shared implementation core.
4. Focused tests and renderers validate the core and its compatibility effects.
5. Full gates and fresh review validate the integrated change after any required worktree reconciliation.

The work is serial. Task-derived Task 1 is blocked until the external workspace gate is satisfied. Tasks 1 through 3 share the Router-to-runtime contract and the runtime's single source file and test fixtures; no task group is parallel-safe.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Shared dirty status-widget edits are overwritten or become an unreviewed mixed diff | Block Task-derived Task 1 until the status-widget commit is the baseline or use an isolated worktree, then rerun final gates after reconciliation. |
| Two runtimes allocate the same task | Use the already-owned exclusive artifact-directory creation as reservation; test concurrent instances in one task scope. |
| Invalid slug becomes another semantic task | Validate once at the runtime boundary and reject before filesystem or Herdr side effects; test no normalization, stable error code/message, and no side effects. |
| Filesystem behavior leaks platform-specific text into the caller contract | Use the stable `TaskIdAllocationError` code/message and preserve the original failure only as `cause`; assert no OS-specific message text. |
| Artifact retention prevents expected reuse | Treat retained artifacts as collisions and test explicit remove plus reconstructed-runtime reuse. |
| Existing users lose resumability | Preserve version-1 numeric records and add legacy recovery, Result, notification, resume, and removal regression cases. |
| Canonical relation can be forged during recovery | Validate directory name, manifest `taskSlug`, final ID, and expected session path together before adoption. |
| Router expands durable Handoff protocol unnecessarily | Keep `taskSlug` post-resolution; test existing Handoff schema behavior unchanged. |
| Scope drifts into current UI or steer work | Restrict edits to the stated Router/runtime/test surfaces and the new document path. |

## Completion Gate

Completion requires the external workspace gate, a fresh baseline run, every acceptance item in the Spec, all final Plan verification commands, and a fresh correctness review. The final diff must not modify README, package metadata, shared documentation index, `running-status-widget`, `steer-input-submission`, or unrelated runtime behavior.

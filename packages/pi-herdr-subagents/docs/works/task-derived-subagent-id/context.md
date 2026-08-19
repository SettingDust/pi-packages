# Task-Derived Subagent ID Context

## Goal

Replace new numeric subagent allocation with Router-derived, collision-safe task IDs while preserving permanent recovery compatibility for existing `subagent-N` tasks.

## Authority

- [Task-derived subagent ID specification](../../spec/task-derived-subagent-id.md)

## Fresh Review And Session Acceptance

Fresh review `subagent-47` closed all three prior findings and judged the current Plan and Tasks `accepted-ready`. The user then explicitly accepted the reviewed Plan and Tasks for implementation queueing in the current main session.

| Finding | Closed evidence |
| --- | --- |
| P1 #9: task-derived Task 1 would modify the same dirty `src/index.ts` and `tests/runtime.test.ts` surfaces as `running-status-widget` Task 1 | Task 0 and the Plan's workspace-admission prerequisite prohibit writes to either shared surface until the status-widget Task 1 commit is the selected baseline or this work uses an isolated worktree. The work is not parallel-safe. |
| P2: Context evidence used stale source line numbers | Context uses stable symbols, test-module behavior names, and document headings rather than source line-number claims. |
| P2: invalid slug, candidate exhaustion, and ordinary filesystem failures lacked a stable observable distinction | Spec section 4.1, Plan section 2, and Tasks 1 through 2 require `TaskIdAllocationError`, `invalid_task_slug`, `task_id_exhausted`, and `filesystem_reservation_failed`, exact stable messages, and filesystem-cause retention. |

This acceptance records a completed review and current-session user decision only. It does not authorize implementation in a future session, override Task 0's workspace-admission gate, or claim that source, test, or final verification gates have run.
## Accepted Product Boundary

The user accepted these decisions:

- The Router derives a concrete execution slug, for example `fix-steer-submit`, from its Handoff and passes it directly to spawn.
- `label` remains a separate complete task description, for example `Repair steer input submission`.
- The runtime validates and reserves a supplied slug. It does not generate semantics or random adjective-noun names.
- Collisions use `-2`, `-3`, and later numeric suffixes.
- Explicit removal deletes artifacts so a restarted runtime can reuse the slug.
- Existing numeric `subagent-N` tasks remain indefinitely recoverable and are never renamed.

## Established Evidence

| Class | Source | Supported claim |
| --- | --- | --- |
| Fact | `SubagentRuntime.spawn()`, `selectScope()`, and `reserveSubagentId()` in `src/index.ts` | `spawn()` currently accepts no slug and allocates `subagent-${++sequence}` through atomic artifact-directory creation after checking the generation-one session path. |
| Fact | `SubagentRuntime.recover()` and `readTaskRecord()` in `src/index.ts` | Recovery currently discovers and validates only `subagent-<digits>-artifacts` version-1 records, with a matching numeric ID and session path. |
| Fact | `SubagentRuntime.resume()`, `remove()`, `readResult()`, and `start()` in `src/index.ts` | Resume retains `subagentId` and its session path; remove deletes the session and artifact directory; Result identity checks use the task ID and generation. |
| Fact | `SubagentRuntime.start()`, `persist()`, `notifyTerminal()`, `createSubagentTools()`, and the spawn/join renderers in `src/index.ts` | The final task ID crosses tab environment, Result storage, notifications, renderers, and tool calls. The existing spawn schema has `agent`, `prompt`, `label`, `model`, and `thinking`, but not `taskSlug`. |
| Fact | `Handoff`, `ResolvedInvocation`, and `resolveDelegation()` in `packages/pi-harness/src/protocol.ts` | Handoff has no task-ID field; Resolver validates references and returns only prompt, model, and thinking. |
| Fact | `routerPrompt()` in `packages/pi-harness/extensions/pi-harness.ts` | The Router prompt already requires resolved prompt/model/thinking and `agent: "handler"` when it calls spawn, but does not require a task slug. |
| Fact | `pi-herdr-subagents runtime` tests in `tests/runtime.test.ts` | Current coverage assumes numeric IDs for launch, reconstruction, recovery, generation, and completion-notification behavior. |
| Fact | `renders named-Agent spawn and join actions` in `tests/renderer.test.ts` | Spawn and join renderers display numeric IDs but do not otherwise depend on their semantics. |
| Fact | [Running status widget Context](../running-status-widget/context.md), `Baseline Status` | An earlier recorded baseline says cancellation-slug partial implementation was cleared, and package typecheck plus the 26-test suite passed. |
| Fact | Accepted Handoff inline context, supplied for this work | The user supplied and accepted the slug, collision, removal, legacy-compatibility, stable-failure, and no-random-name decisions above. |

## Evidence Scope And Limits

The implementation evidence above was read from the current checked-out files. The prior green baseline is historical evidence quoted from the existing Work Context and the accepted Handoff; this documentation task did not rerun typecheck or tests and must not claim a new baseline run.

No implementation source, tests, package metadata, README, shared documentation index, `running-status-widget`, or `steer-input-submission` document was changed by this Work. The `docs/` directory is currently untracked, so existing document state is working-tree evidence rather than committed-package evidence.

## Workspace Coordination

`running-status-widget` Task 1 has dirty implementation changes in `src/index.ts` and `tests/runtime.test.ts`; those are out of scope for this Work and must not be reverted, amended, or incorporated incidentally. Because task-derived Task 1 requires the same two files, status-widget Task 1 is an external workspace-admission prerequisite.

Before task-derived Task 1 writes source or tests, one of these conditions must hold:

1. The status-widget Task 1 change is committed, and the task-derived work begins from that same baseline commit.
2. The task-derived work starts and remains in an isolated worktree. It must reconcile with the status-widget Task 1 commit before integration and rerun the fresh final gates after that reconciliation.

The shared dirty worktree is not an allowed implementation location for task-derived Task 1. This is a conflict-isolation gate, not a claim that the two feature changes are parallel-safe.

## Current State

New tasks use process-local numeric sequencing. A reconstructed runtime avoids retained numeric artifacts only because the new local sequence begins at one and skips paths that already exist. That behavior cannot produce task-derived names and does not define a bounded collision contract for independent runtimes.

The allocator already uses exclusive artifact-directory creation, which is the smallest existing filesystem primitive suitable for cross-runtime reservation. The Plan must preserve it rather than add a lock file, database, or global coordinator.

## Impact Boundary

The accepted authority affects these implementation surfaces:

- `packages/pi-harness/extensions/pi-harness.ts`: Router instruction to derive and pass the slug after resolution.
- `packages/pi-harness/tests/extension.test.ts`: Router-prompt and invocation-contract coverage.
- `packages/pi-herdr-subagents/src/index.ts`: spawn input, strict validation, reservation, allocation error contract, manifest validation, recovery discovery, tool schema, notification ID validation, and renderer inputs.
- `packages/pi-herdr-subagents/tests/runtime.test.ts`: allocator, failure taxonomy, recovery, lifecycle, manifest, Result, environment, and notification regression coverage.
- `packages/pi-herdr-subagents/tests/renderer.test.ts`: spawn call/result and legacy/canonical render compatibility.

The accepted authority does not require edits to `packages/pi-harness/src/protocol.ts`, because `taskSlug` is deliberately not a Handoff field. It requires an explicit regression assertion that this remains true.

## Baseline Record

A prior independent cleanup removed a cancelled partial slug implementation and recorded a green baseline at `HEAD 3b3ee81`: `bun run --cwd packages/pi-herdr-subagents typecheck` passed and `bun run --cwd packages/pi-herdr-subagents test` passed with 26 tests. Source: [running-status-widget Context](../running-status-widget/context.md), `Baseline Status`. This is inherited historical evidence, not a result of this Work.

## Unresolved Questions

None. The canonical 3-48-character grammar, 100-candidate allocation bound, final-ID manifest relation, legacy recovery rules, stable allocation-failure contract, and workspace-admission gate are resolved by the Spec and Plan so implementation does not need to invent behavior.

## Completion Signal

The Plan's serial tasks are complete when the external workspace-admission gate is satisfied, the new Spec acceptance conditions pass, current numeric-task behavior is covered as legacy compatibility, the Router-to-spawn boundary carries a distinct slug, the three allocation errors are observably distinct, and a fresh correctness review verifies no accidental semantic generation, error-contract drift, or recovery regression.

## Implementation Execution Evidence

### Task 0: Workspace Admission And Fresh Baseline

- Selected baseline commit: `acff33f621a780b5f49d5aa4decf398bf7479e95` (`feat(subagents): show running task status`).
- Implementation workspace: `E:\Projects\pi-packages` on `main`. At admission it contained only the untracked `steer-input-submission` and `task-derived-subagent-id` documentation directories; no tracked source or test changes were present. The steer documentation remains untouched.
- Fresh baseline, run before source or test changes:
  - `bun run --cwd packages/pi-harness test`: passed, 77 tests.
  - `bun run --cwd packages/pi-herdr-subagents typecheck`: passed.
  - `bun run --cwd packages/pi-herdr-subagents test`: passed, 34 tests.
  - `git diff --check -- packages/pi-harness/extensions/pi-harness.ts packages/pi-harness/tests/extension.test.ts packages/pi-herdr-subagents`: passed with no output.

The prior 26-test record was not reused as fresh evidence.

### Tasks 1-3: Implementation And Focused Evidence

- Router prompt now derives `taskSlug` after resolution and keeps `label` independent; Harness tests confirm neither Resolver schema nor resolved output contains `taskSlug`.
- Runtime validates exact canonical slugs before filesystem or Herdr effects and exports the stable `TaskIdAllocationError` taxonomy.
- Allocation uses the artifact directory as the exclusive reservation, tries base through `-100`, checks retained generation-one sessions, persists `taskSlug`, and recovers canonical plus legacy version-1 records.
- Final identity continues through session, result, launch, environment, notification, renderer, resume, remove, and recovery paths.
- Focused command `bun test packages/pi-herdr-subagents/tests/runtime.test.ts packages/pi-herdr-subagents/tests/renderer.test.ts packages/pi-herdr-subagents/tests/task-derived-id.test.ts`: passed, 35 tests.
- Intermediate full gates after integration: Harness 77 tests passed; subagent typecheck passed; subagent suite 39 tests passed.

### Task 4: Fresh Final Gates And Review

Fresh final commands on the reconciled `acff33f621a780b5f49d5aa4decf398bf7479e95` baseline plus this uncommitted implementation:

- `bun run --cwd packages/pi-harness test`: passed, 77 tests and 358 expectations.
- `bun run --cwd packages/pi-herdr-subagents typecheck`: passed.
- `bun run --cwd packages/pi-herdr-subagents test`: passed, 41 tests and 220 expectations.
- `git diff --check -- packages/pi-harness/extensions/pi-harness.ts packages/pi-harness/tests/extension.test.ts packages/pi-herdr-subagents`: passed; Git emitted only expected LF-to-CRLF working-copy warnings.

Fresh read-only correctness/evidence review disposition: `pass`. The review inspected strict non-normalizing validation, validation-before-side-effects, exact allocation error class/code/message and cause retention, artifact/session collisions, atomic concurrent reservation, bounded exhaustion, canonical manifest relationships, malformed-record rejection, canonical and legacy notification identity, running and terminal recovery, final-ID propagation, legacy resume/removal, canonical remove/reuse, Router-derived invocation-only `taskSlug`, and unchanged Handoff/Resolver output. A notification-validator ambiguity and a malformed-record test-placement issue found during review were corrected, then the full gates above were rerun. No prohibited `steer-input-submission`, `running-status-widget`, README, package metadata, shared index, or `protocol.ts` file was modified. No commit was created.

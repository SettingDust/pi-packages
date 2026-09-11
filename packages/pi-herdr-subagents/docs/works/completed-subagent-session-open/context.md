# Completed Subagent Session Open Context

- **Lifecycle:** implementation accepted; T1–T3 completed; T4 Host smoke not executed. This Context records implementation state and does not claim T4 completion.
- **Work:** [work.md](work.md)
- **Plan:** [plan.md](plan.md), implementation accepted; T1–T3 completed; T4 Host smoke not executed
- **Tasks:** [tasks.md](tasks.md), implementation accepted; T1–T3 completed; T4–T6 remain required gates
- **Authority baseline:** [Runtime lifecycle specification](../../spec/runtime-lifecycle.md), sections 3.1–3.3 and 10
- **Research sources:** [completed capability research](C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/retry-completed-subagent-reopen-research-artifacts/result-1.json) and [independent draft review](C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/retry-session-open-authority-review-artifacts/result-1.json)

## Objective

Open the current cumulative retained session of a user-selected terminal task through Pi in a new Herdr tab. The parent command presents at most one entry per eligible current-parent task. It shows that task's current generation only as current-state metadata, resolves the task's retained `sessionFile`, and leaves display and later interaction to Pi's native session UI.

This is not a historical generation viewer. A resumed task increments generation while reusing and appending to its original generation-one session file. Pi's `--session` option accepts a session path or ID, not a generation selector. Therefore no available identity can reopen the transcript exactly as it existed at an earlier generation boundary.

This is also not `subagent_resume`: the command sends no prompt, creates no generation or Result, invokes no resume/steer/cancel/remove operation, and does not alter task, Result, cleanup, or notification state. Pi may later write or migrate the opened session or accept user interaction; the capability is not described as read-only.

## Settled Decisions

1. The entry point is `/subagent-open` in the interactive parent Pi session.
2. The picker is task-level and metadata-only. It has at most one item per task and never includes a full Handler Result or error body.
3. An item is eligible only when the task belongs to the current persisted parent-session scope, its current generation is terminal, its current-generation Result is valid, and its retained session file is valid and available.
4. Displayed metadata includes task label or slug, `subagentId`, current generation, terminal status, and either a semantically established settlement timestamp or a clearly labelled non-authoritative Result file modified time. Filesystem mtime is never called completion or retention time.
5. Selection identity binds the canonical current-parent scope, `subagentId`, and the observed current generation. It is not a generation-history address. JIT resolution must find the same task and current terminal generation before tab creation.
6. The opened path is the one cumulative retained `sessionFile` from the current task persistence/recovery record. There is no generation snapshot, fork, or free-form path input.
7. The command requires a non-empty persisted current `parentSessionFile`. It must not use cwd fallback to establish parent ownership. A Pi session with the same cwd but no persisted parent session is ineligible.
8. The new tab is created in the Herdr workspace captured when the transport was constructed. Each explicit repeat creates a separate independent tab.
9. Success means tab creation was accepted in that workspace and the existing launcher path accepted submission of the exact Pi `--session <retained-sessionFile>` invocation. It does not mean Pi acknowledged, loaded, or displayed an exact identity.
10. If command submission fails synchronously after tab creation, close exactly the newly accepted tab. After submission succeeds, do not auto-close for lack of a readiness signal.
11. Cancel and every preflight eligibility failure are side-effect-free before tab creation.
12. No temporary Extension, status file, nonce handshake, sidecar, snapshot, duplicate-open registry, or persistent open record is added.

## Evidence Trace

### Task and generation semantics

1. The lifecycle authority defines `subagentId` as stable task identity and generation as an execution revision.
2. It stores the original session at `<tasksDir>/<subagentId>-g1.jsonl`; resume retains that same session path while incrementing generation; Results alone are generation-specific.
3. Current source follows this contract: `resume` passes `old.sessionFile`, and `start` uses it instead of allocating a new path.
4. Pi documents `--session <path|id>` but no generation parameter.
5. Conclusion: a picker key may bind current task state and guard staleness, but it cannot identify generation-specific historical session content. The selected product semantics are therefore one current retained-session entry per terminal task.

### Current-parent ownership

1. `recover(cwd, parentSessionFile)` selects and rebuilds one runtime scope.
2. Current `tasksDir` has a documented cwd fallback when `parentSessionFile` is absent.
3. Same-cwd parent processes without persisted sessions can share that fallback, so cwd does not prove current-parent ownership.
4. Conclusion: `/subagent-open` must require `ctx.sessionManager.getSessionFile()` to yield a non-empty persisted parent file, derive the one scope from that identity, and reject absence without falling back.

### Retained-path and Result ownership

1. Current recovery validates the manifest's lexical expected session path and current Result identity/status, but ordinary file reads do not by themselves prove canonical containment, regular-file type, or absence of a symlink.
2. The command exposes an existing retained artifact to another Pi process, so it needs stronger read-time preflight than filename matching.
3. Conclusion: derive, never accept, paths from the recovered current task; establish canonical parent/task roots; require exact expected ownership and containment; use `lstat` plus canonical resolution to reject symlinks, directories, missing files, and cross-root paths; parse the current Result and match `subagentId`, current generation, and terminal status.
4. Repeat these checks immediately before tab creation. They close observed stale-selection and path-confusion cases, not all same-user filesystem races after the check.

### Herdr and Pi launch

1. Existing `HerdrTransport.createTab` uses the workspace captured at construction, requests `--workspace`, and validates returned workspace/tab/root-pane identities.
2. Existing `transport.run` submits through a PowerShell call operator with quoted arguments; the launcher resolves the current Pi invocation through the Node/Bun bootstrap.
3. Herdr pane-run success may have empty stdout and proves command submission, not child readiness.
4. Pi may create or migrate session state when opening a path and provides no existing parent-visible loaded-session acknowledgement in this launch seam.
5. Conclusion: reuse the transport, wrapper, and bootstrap; submit only `--session` and the validated path; define success at accepted submission; use a real smoke only to observe process startup and visible behavior without treating it as a protocol acknowledgement.

## Required Validation Contract

Before tab creation, one operation must establish all of the following from a fresh current snapshot:

- current command context has a non-empty persisted `parentSessionFile` that identifies the active parent scope;
- the recovered scope corresponds to that parent identity and not to cwd fallback;
- selected `subagentId` still identifies the same current task;
- task generation still equals the generation observed by the picker and remains terminal;
- task artifact root is the expected canonical root under the active tasks scope and is not a symlink;
- `result-<current-generation>.json` is canonically contained by that root, exists, is a regular non-symlink file, and its parsed `subagentId`, generation, and terminal status match the current task;
- `sessionFile` comes from the current task record, equals the expected retained task session path, is canonically contained by the active task scope, exists, and is a regular non-symlink file;
- no selected or caller-supplied filesystem path is accepted.

Failure of any check is reported before `createTab` and does not write, normalize, or repair the artifacts.

## Failure And Side-Effect Boundary

- Missing parent session, non-TUI invocation, no eligible task, and cancel: no tab or filesystem/task side effect.
- Missing, directory, symlink, cross-root, malformed, identity-mismatched, non-terminal, or stale current Result/session/task: reject before tab creation.
- Parent workspace or tab-create failure: preserve existing transport classification; no accepted tab is owned by the operation.
- Accepted tab followed by synchronous command-submission failure: close that tab by its returned `tabId`; preserve the primary error and report bounded cleanup failure separately.
- Accepted submission: leave the independent tab open. Do not infer readiness from stdout, add a timer, or roll back because no ready signal arrives.
- Duplicate open: create another independent tab; failure of one operation affects only its own tab.
- Every path: no automatic prompt, resume, steer, cancel, remove, generation allocation, Result write, task mutation, notification mutation, or lifecycle cleanup-record mutation.

## Verification State And Authorization

The exact Work/Context/Plan/Tasks tuple was reviewed and accepted by the user for implementation. T1–T3 are complete. T4 Host smoke has not been executed; no Host smoke, independent review, or complete-delivery claim is made here.

In this isolated worktree, `@settingdust/pi-herdr` is not materialized through supported workspace dependency resolution. The reviewed full test and typecheck baseline was therefore not reproducible, and a fresh typecheck likewise fails first on the missing module with derivative implicit-`any` diagnostics. None of those runs is recorded as passing or as evidence of a source defect. Implementation T0 must restore supported resolution without tracked drift and rerun typecheck and full tests.

T4 Host smoke, T5 independent review, and T6 final reconciliation remain outstanding. Status must not advance beyond the evidence actually produced.

## Exclusions And Remaining Limits

- No exact historical-generation open, session snapshot, fork, or generation-specific session persistence.
- No custom transcript renderer or full Result display.
- No promise of read-only native Pi behavior.
- No claim that preflight prevents a trusted same-user concurrent replacement after the final check.
- No claim that command submission proves Pi loaded the requested session, entered TUI, or acknowledged identity.
- No additional source, test, README, dependency, lockfile, setting, runtime, session, Herdr state, or Git-history change is authorized by this context synchronization.

# Completed Subagent Session Open Work

- **Lifecycle:** implementation accepted; T1–T3 completed; T4 Host smoke not executed.
- **Goal:** Add a current-parent-session command that lists at most one eligible entry per task and opens that task's current retained Pi session in an independent new Herdr tab.
- **Authority baseline:** [Runtime lifecycle specification](../../spec/runtime-lifecycle.md), especially task identity, current generation, retained session reuse, Result identity, and artifact retention in sections 3.1–3.3 and 10. This Work does not amend that authority.
- **Research:** [Completed capability research](C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/retry-completed-subagent-reopen-research-artifacts/result-1.json) and [independent draft review](C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/retry-session-open-authority-review-artifacts/result-1.json); processed evidence is in [Context](context.md).
- **Derived coordination:** [Context](context.md), the accepted [Plan](plan.md), and [Tasks](tasks.md).

## Delivery Boundary

The picker is task-level, not retained-generation history. It contains at most one entry for each task in the current persisted parent-session scope, and only when that task's current generation is terminal and its retained `sessionFile` and current-generation Result pass the required checks. The displayed current generation is task-state metadata. It does not claim that Pi can open generation-specific historical content: every generation of a task cumulatively reuses the same retained session file.

Selection binds the current parent-session scope, `subagentId`, and the observed current terminal generation. Immediately before tab creation, the operation re-establishes the same current task, generation, terminal status, Result identity, and retained path. It then opens the task's cumulative retained `sessionFile`, not a generation snapshot.

The command is eligible only when the current parent Pi session exposes a non-empty persisted `parentSessionFile`. Absence is a side-effect-free failure. The existing cwd fallback remains a runtime recovery compatibility behavior but is not evidence of parent-session ownership and is forbidden for this command; another Pi session in the same cwd without a persisted parent session is ineligible.

The new tab uses the already captured parent Herdr workspace. The success contract ends when Herdr has accepted creation of that tab and the existing PowerShell/Node-or-Bun launcher path has successfully submitted the exact Pi invocation for `--session <validated-retained-sessionFile>`. It does not assert that Pi loaded a particular session identity, entered its TUI, or returned an acknowledgement.

Pi's native session runtime owns display and later interaction. It may write to or migrate the opened session, so this is not a read-only viewer. The command itself sends no prompt and does not resume, steer, cancel, remove, allocate a generation, or mutate task/Result artifacts.

## Safety And Failure Boundary

The command accepts no caller-supplied path. The retained session path must come from the current parent scope's recovered persistence record and must pass canonical scope/ownership, existence, regular-file, no-symlink, and just-in-time current-task checks. The current-generation Result must be canonically contained by the same task's artifact root, be a regular non-symlink file, and match `subagentId`, generation, and terminal status when read. A filename alone is not ownership evidence.

The threat boundary is a trusted same-user local filesystem. Preflight rejects observed traversal, symlink, directory, cross-root, missing, stale, and mismatched inputs. It does not claim to prevent a same-user process from replacing a checked file concurrently after preflight.

Cancel, no eligible task, missing parent session, stale selection, non-terminal current generation, or invalid/missing/out-of-scope artifacts must fail before tab creation and without mutation. A synchronous command-submission failure after accepted tab creation closes only that new tab. Once submission succeeds, absence of a readiness signal does not trigger automatic rollback. Repeated explicit opens create independent tabs.

No temporary Extension, status file, nonce handshake, sidecar, generation snapshot, or new persistent state is introduced.

## Planning And Authorization State

The exact Work/Context/Plan/Tasks tuple was accepted for implementation. T1, T2, and T3 are complete. T4 Host smoke has not been executed; no Host smoke completion claim is made here. The remaining lifecycle and review evidence must be reconciled only from work actually performed.

The isolated worktree baseline previously could not reproduce the package typecheck/full-test baseline because the `@settingdust/pi-herdr` workspace dependency was not materialized there. This remains a verification limitation unless later evidence records a supported dependency resolution and passing gates.

## Completion Signal

This Work is implementation-accepted with T1–T3 completed. T4 Host smoke remains outstanding and is explicitly not claimed. Final delivery completion requires the remaining authorized verification and truthful reconciliation of Work/Context/Plan/Tasks; this file must not claim Host smoke, independent review, or complete delivery without corresponding evidence.

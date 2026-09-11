# Completed Subagent Session Open Implementation Plan

- **Status:** implementation accepted; T1–T3 completed; T4 Host smoke not executed.
- **Work:** [work.md](work.md)
- **Context:** [context.md](context.md)
- **Authority:** [Runtime lifecycle specification](../../spec/runtime-lifecycle.md), sections 3.1–3.3 and 10; this Plan does not amend authority.
- **Research:** [completed capability research](C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/retry-completed-subagent-reopen-research-artifacts/result-1.json) and [independent draft review](C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/retry-session-open-authority-review-artifacts/result-1.json)

## Objective

Add `/subagent-open` to the interactive parent extension. It presents at most one eligible item per current-parent task and opens that task's cumulative retained Pi `sessionFile` in a separately created Herdr tab pinned to the captured parent workspace. The current generation is task-state metadata and a stale-selection guard, not a historical content address.

## Scope and non-goals

The implementation requires a non-empty persisted parent `sessionFile`, current-parent scoping, one terminal current-generation item per task, canonical ownership and regular/no-symlink checks for Result and session files, JIT revalidation, captured-workspace tab creation, exact `--session <validated-retained-sessionFile>` launcher submission, synchronous-failure rollback of the accepted tab, and independent repeat opens.

It does not add generation snapshots, historical transcript selection, caller paths, prompts, lifecycle actions, task/artifact mutation, sidecars, handshakes, new persistence, Pi-core/Herdr/dependency changes, readiness claims, or automatic rollback after accepted submission.

## Authorization and lifecycle reconciliation

The exact Work/Context/Plan/Tasks tuple was accepted for implementation. T1, T2, and T3 are complete. T4 Host smoke has not been executed. No Host smoke, independent review, complete-delivery, or passing package-gate claim is made here.

The isolated worktree baseline previously could not reproduce the package typecheck/full-test baseline because `@settingdust/pi-herdr` was not materialized; this remains a verification limitation unless later evidence records supported dependency resolution and passing gates.

## Ordered gates and current evidence

- **T1 — current-task projection and path tests:** completed. Current terminal-task projection, parent-session gate, selection binding, canonical Result/session checks, JIT checks, truthful metadata, and no-side-effect empty/cancel behavior are implemented and tested.
- **T2 — launch submission and rollback tests:** completed. Workspace pinning, exact session-only launch arguments, Windows escaping, tab-create/submission failure handling, accepted-tab rollback, no-ready-wait behavior, duplicate opens, and no-mutation assertions are covered.
- **T3 — command and documentation wiring:** completed. `/subagent-open` is registered in the interactive parent extension, guarded by TUI and persisted parent-session eligibility, uses metadata-only selection, passes only the bound key to JIT resolution, and documents the narrow contract.
- **T4 — integration gates and bounded real smoke:** not executed. It must run the supported package gates and repository-documented managed smoke entry point, if available, and record exact command/action, identities, submitted argv, artifact comparison, and cleanup. An unavailable smoke entry point or unbounded cleanup is blocking; do not invent a replacement or claim success.
- **T5 — independent correctness/security review:** outstanding; requires the exact implemented diff and T4 evidence.
- **T6 — final reconciliation:** outstanding; only after T1–T5 actually pass may Work/Context/Plan/Tasks and README be reconciled to final truthful state.

## Verification matrix (remaining)

T4 must verify parent-scope isolation, current-generation selection, stale and invalid artifact rejection, cancel/empty no-side-effect behavior, captured workspace and exact `--session` submission, submission rollback, duplicate opens, no lifecycle/artifact mutation, observable child startup, and cleanup of only smoke-created resources. It must not claim loaded-session identity, readiness, or historical-generation content.

T5 must verify no cwd fallback, no historical-content implication, fail-closed path checks, bounded threat/readiness claims, workspace/escaping/rollback behavior, absence of forbidden lifecycle or persistence changes, and evidence sufficiency.

Final integrity requires supported dependency resolution, package typecheck/full tests, managed smoke, independent GO review, link/scoped-diff checks, and `git diff --check`. No stage, commit, push, reload, or deployment is authorized by this Plan.

## Current boundary

This Plan is implementation-accepted with T1–T3 completed. T4 Host smoke, T5 independent review, and T6 final reconciliation remain outstanding. The Plan must not claim Host smoke, independent review, or complete delivery without corresponding evidence.

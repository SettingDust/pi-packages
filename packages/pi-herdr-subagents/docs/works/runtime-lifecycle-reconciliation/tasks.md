# Runtime Lifecycle Reconciliation Tasks

- **Work Context:** [context.md](context.md)
- **Authority Spec:** [runtime-lifecycle.md](../../spec/runtime-lifecycle.md)
- **ADR:** [runtime-lifecycle-authority-reconciliation.md](../../adr/runtime-lifecycle-authority-reconciliation.md)
- **Status:** review documentation findings remediated; continuation coverage follow-up pending; no commit requested
- **Important boundary:** these Tasks do not re-authorize or change the already-committed implementation. They define remaining review and evidence work.

## Task 1: Fresh Independent Authority Review

- **Status:** completed-with-findings; documentation findings remediated
- **Dependency:** documentation reconciliation files exist
- **Objective:** independently assess the current implementation and tests against the lifecycle Spec and ADR.
- **Scope:** recovery, notification, continuation, the bounded join caller-cancellation amendment, cross-references, authority chronology, and evidence separation.
- **Required checks:**
  - verify manifest, Result, pane, generation, resume, remove, and scope-recovery claims against `SubagentRuntime`;
  - verify every terminal path and summary-only notification boundary;
  - verify dedupe and pending replay behavior, including parent-session markers;
  - verify child continuation's single timer, lifecycle cleanup, same session/generation behavior, and no retry/time limit;
  - verify that the join caller `AbortSignal` terminates only Result retrieval and does not mutate task lifecycle;
  - confirm the review does not mistake current-checkout tests for isolated historical-commit tests;
  - explicitly disposition the notification callback/marker crash window;
  - confirm no unrelated Spec or Work was silently changed; and
  - distinguish external `#18` terminal input barrier and future completed-pane auto-close from lifecycle implementation verification.
- **Completion evidence:** the independent review completed with findings. The four-document remediation corrects the Spec H1, replaces stale `41 pass`/dirty-source/#9-blocker claims with HEAD `a43f0e1`, `56 pass`, `0 fail`, `299 assertions`, and clean `src`/`tests` state, records the bounded join amendment evidence chain, and excludes the two unrelated future boundaries. This disposition does not claim additional continuation test coverage or notification crash-window closure.

## Recorded Bounded Post-Reconciliation Amendment Evidence

- **Status:** recorded; no source or test work is authorized by this Task.
- **Commit:** `a43f0e1f557c02c1a31cecf45733e33b482882c4` (`fix(subagents): abort join wait, keep task alive`).
- **Source evidence:** `src/index.ts` implements the optional `AbortSignal` in `SubagentRuntime.join` by applying it only to the delay while waiting; `createSubagentTools` forwards the tool invocation signal to `runtime.join`.
- **Focused test evidence:** `tests/runtime.test.ts` contains `aborting join leaves the running task unchanged until explicit cancellation` and `passes the join tool AbortSignal to the runtime wait`.
- **Supported boundary:** aborting `subagent_join` stops only that caller's wait. It does not cancel the child, close a pane, write a Result, change task/generation state, persist a manifest change, or emit a terminal notification. A later join may retrieve the Result; `subagent_cancel` and `remove` retain task-mutating ownership.
- **Historical boundary:** this is a later bounded Spec amendment, not a fourth original behavior in the retrospective recovery/notification/continuation chronology.

## Task 2: Add Any Uncovered Regression Coverage

- **Status:** pending
- **Dependency:** Task 1
- **Objective:** close only concrete behavior or evidence gaps identified by Task 1.
- **Constraints:** source and test edits require an explicitly bounded follow-up change; do not broaden notification, recovery, continuation, or join-cancellation semantics without updating the Spec/ADR first.
- **Required continuation regression checks from the fresh review:**
  - input cleanup: schedule a continuation, emit `input`, run all pending timers, and assert that no follow-up message is sent;
  - independent `agent_start` reset: schedule a continuation, emit `agent_start`, assert the pending timer is cleared, then emit a new unfinished `agent_end` and assert exactly one follow-up is sent;
  - post-nudge shutdown: let one scheduled nudge fire, emit `session_shutdown`, and assert that no additional continuation is scheduled or sent;
  - multiple cycles: let a first unfinished continuation fire, model a second unfinished turn with a later `agent_end`, let its continuation fire, and assert two follow-up messages in the same child fixture without a terminal Result or generation change.
- **Other candidate checks for review to confirm or reject:**
  - recovery from a terminal manifest with a missing Result;
  - notification retry after notifier rejection and marker persistence behavior;
  - a crash-window or marker-order regression if the chosen guarantee requires one;
  - repeated `subagent_done` calls and a Result-write failure.
- **Explicitly excluded from this Task:**
  - `#18` terminal input barrier: no repository-local issue, authority document, source symbol, or test locator was supplied to this Work. It is an external pending boundary and must receive separate authority before implementation or verification.
  - automatic completed-pane closure: this future cleanup policy is neither required nor verified here. Explicit `remove` remains the documented cleanup boundary; any auto-close work needs separate authority and bounded source/test scope.
- **Completion evidence:** each accepted finding has a focused regression test or an explicit reason that existing coverage is sufficient; any authority change is reconciled before implementation. The continuation checks above are not covered by the current reconciliation and require a separately bounded source/test change; no source or test change was made here. The join caller-cancellation evidence is already recorded above and is not an uncovered Task 2 regression.

## Task 3: Documentation Review And Commit

- **Status:** not started; no commit requested
- **Dependency:** Task 1 documentation disposition is recorded. Task 2 may remain pending when its gaps are accurately represented; a commit requires separate user or owning-workflow authorization.
- **Objective:** verify the documentation package as a coherent authority set and, only when separately authorized, prepare a documentation-only commit.
- **Checks:**
  - validate links and headings for the new Spec, ADR, Context, and Tasks;
  - validate the authority coverage matrix and implementation-versus-authority findings;
  - ensure historical commit hashes remain distinct from current test evidence and later bounded amendments;
  - ensure no claim says the original three behaviors were accepted before implementation;
  - ensure the continuation test gaps, notification crash window, external `#18` boundary, and future completed-pane auto-close remain accurately bounded;
  - rerun the smallest documentation integrity check plus the package verification required by any code change; and
  - confirm `git diff --check` for the documentation paths.
- **Completion evidence:** four-document links/headings/whitespace checks pass, the review documentation findings are incorporated, and a separately authorized documentation-only diff is verified. No commit is part of this reconciliation run.

## Execution Order

`Task 1 -> Task 2 if separately scoped -> Task 3 only when a commit is authorized`

Task 2 is conditional. It remains pending because the continuation coverage gaps are real and intentionally visible. The Router/owner decides the next workflow action; these Tasks do not authorize implementation or commit by themselves.

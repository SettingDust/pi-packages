# Terminal Surface Cleanup Tasks

- **Status:** Phase A Tasks 1–3 complete and landed in `569b7ba`; Phase B Tasks 4 and 5, including the bounded final-review P1-1/P2-1/P2-2 repairs, are complete in the working tree. Task 6 final verification and the second fresh independent correctness/evidence review are complete with P0/P1/P2 = 0. Phase B is ready for an ownership-isolated selective commit and remains uncommitted.
- **Work:** [work.md](work.md)
- **Plan:** [plan.md](plan.md)
- **Authority:** [runtime-lifecycle.md](../../spec/runtime-lifecycle.md), sections 3 and 10; [task-derived-subagent-id.md](../../spec/task-derived-subagent-id.md), sections 5 and 6
- **ADR:** [automatic-terminal-surface-cleanup.md](../../adr/automatic-terminal-surface-cleanup.md)

## Task 1: Fresh Authority And Plan Review

- **Status:** Complete for Phase A and Phase B admission; the reviewed Phase B tuple received explicit current-session user acceptance.
- **Dependency:** none
- **Objective:** Independently review the Specs, ADR, Context, Plan, dependency matrix, acceptance matrices, current source/tests, installed Herdr evidence, and dirty ownership.
- **Checks:** V1 legacy and canonical migration; exact ID/slug/path/Result preservation; generic top-level passthrough; Phase A opacity for `surfaceCleanups`; Phase A standalone commit gate; Phase B dependency on accepted/landed `#13` and Phase A; accepted-tab ownership; partial-create exception; settlement concurrency; cleanup record shape; rollback floor; `#18` exclusion.
- **Completion evidence:** findings with exact locators, resolved P0/P1 findings, and explicit current-session user acceptance of the reviewed Plan.

## Task 2: Phase A V1 Migration And Passthrough Baseline

- **Status:** Complete and landed in `569b7ba`.
- **Dependency:** Task 1 accepted; no Phase B source changes
- **Objective:** Implement the smallest shared persistence/recovery change that migrates supported V1 legacy and V1 canonical records to V2 while preserving identity, `taskSlug` presence/absence, session/artifact paths, Result identity, and lifecycle behavior.
- **Required behavior:**
  - V1 canonical unsuffixed and suffixed identity validation and migration;
  - V1 legacy migration without slug synthesis;
  - malformed identity rejection under existing recovery rules;
  - semantic preservation of every unknown top-level manifest field across representative rewrite paths;
  - opaque passthrough of unknown `surfaceCleanups`, with no cleanup type, validation, close call, or automatic terminal cleanup;
  - no path, identity, Result, notification, resume, removal, or widget contract changes.
- **Expected surfaces:** current runtime persistence/recovery source and focused migration tests only; coordinate shared-file ownership before edits.
- **Completion evidence:** focused Phase A tests, package typecheck/full tests, diff/ownership review, fresh independent review, and source/test changes ready for the standalone source-plus-test commit. The commit is required only after explicit Plan acceptance and the Task 3 release gate; it is the minimum Phase B rollback target.

## Task 3: Phase A Release Gate

- **Status:** Complete; standalone Phase A source-plus-test commit `569b7ba` landed.
- **Dependency:** Task 2
- **Objective:** Reconcile Phase A evidence with authority and release it as the compatibility baseline.
- **Checks:** all Phase A acceptance rows; no `surfaceCleanups` semantics; no Herdr close calls; no `#18`, `#13`, widget, queue, steering, or unrelated authority changes; source and tests are ready for the standalone commit.
- **Completion evidence:** accepted Phase A gate followed by the landed standalone source-plus-test commit identifier. After explicit Plan acceptance, this task is the Phase A standalone source-plus-test commit authorization point. Phase B is blocked until this task completes.

## Task 4: Implement Phase B Cleanup And Fake Regressions

- **Status:** Complete in the working tree, including deterministic fail-safe duplicate selection and validator/diagnostic boundary regressions. Focused verification passed 87 tests / 515 assertions; the change remains uncommitted pending the isolated selective commit. The `#13` V2 lifecycle baseline remains `e68e234`.
- **Dependency:** fresh Phase B review and current-session Plan acceptance, Task 3 complete, and accepted/landed `#13` V2 lifecycle baseline
- **Objective:** Implement section 10 through the smallest shared runtime/transport change and focused deterministic tests, building on Phase A passthrough.
- **Required behavior:**
  - transport tab close and not-found classification;
  - accepted-tab ownership, with pane-only close only for rejected partial creates;
  - validated exact per-generation cleanup records;
  - unknown whole array entries retained as opaque semantic JSON values and ignored by cleanup logic;
  - unknown fields inside recognized entries preserved while understood fields are updated;
  - defensive-copy cleanup evidence;
  - one settlement promise and one cleanup operation per task generation;
  - terminal state/Result durable before cleanup;
  - shared cleanup path for completed, failed, cancelled, pane-closed, launch, and recovery outcomes;
  - close failure preserves terminal status/error and does not block join/inspect/notification;
  - recovery retry/idempotence, missing identity outcomes, remove retry/preservation, resume with a new tab;
  - no weakening of Phase A identity/path/Result/passthrough contracts.
- **Completion evidence:** focused fake tests cover every Phase B matrix row, call order/counts, generation isolation, defensive copies, preservation of unknown whole array entries and unknown fields inside recognized entries, retained files, unchanged notifications, typecheck, and full package tests.

## Task 5: Real Herdr Acceptance

- **Status:** Complete; after the bounded repair, exactly one acceptance-script execution created one disposable no-focus tab and passed with actual Herdr `0.8.2-preview.2026-08-19-b5c4a0176e91` plus current source/script SHA-256 provenance. See [evidence](evidence/README.md).
- **Dependency:** Task 4
- **Objective:** Verify the actual Herdr surface contract independently of fake transport.
- **Constraints:** use one disposable no-focus tab in the captured parent workspace; record only non-sensitive IDs/results; always run best-effort `finally` cleanup; do not touch user tabs, panes, tasks, sessions, or artifacts.
- **Checks:** create returns `tab_id` and root `pane_id`; accepted close uses `tab close`; tab and root pane are both absent afterward; repeated close is classified as already closed; rejected partial create may use pane close only before ownership acceptance.
- **Completion evidence:** command/version, disposable IDs, close response, post-close checks, repeat-close classification, and cleanup outcome.

## Task 6: Final Verification And Independent Review

- **Status:** Complete. Focused verification passed 87 tests / 515 assertions; full verification passed 118 tests / 695 assertions; package typecheck, current-byte/version-bound real-Herdr acceptance, diff, ownership review, and the second fresh independent correctness/evidence review all passed. The final review found P0/P1/P2 = 0. A separate ownership-isolated selective commit is authorized but remains pending; no commit is created by this Task.
- **Dependency:** Tasks 4 and 5
- **Objective:** Reconcile Phase B implementation evidence with authority without expanding behavior.
- **Checks:** focused and full package gates, `git diff --check`, dirty ownership review, both acceptance matrices, exact migration/passthrough/cleanup records, artifact retention, rollback-floor confirmation, and independent correctness/evidence review.
- **Completion evidence:** no unexplained Spec drift, no unrelated file changes, all gates pass, and remaining limits are explicit. This final gate must pass before a separate Phase B source commit is authorized; it does not authorize Phase A implementation or commit.

## Execution Order

```text
Task 1 authority/plan review + current-session acceptance
  |\
  | +--> accepted/landed #13 V2 lifecycle baseline
  v
Task 2 Phase A implementation
  v
Task 3 Phase A independent release gate + standalone commit
  \
   +--> Task 4 Phase B fake implementation
             v
        Task 5 real Herdr check
             v
        Task 6 final review
```

Task 2 and `#13` are independent after Task 1, but Task 4 cannot start until both are accepted/landed. Phase A and Phase B must not share a commit.

## Concurrency Coverage Clarification

Phase B Task 4 must force overlap between terminal settlement and `join`, `inspect`, recovery, resume, and remove. Evidence must show one settlement promise and one in-flight close per task generation, non-blocking `inspect` with visible `pending`, `join` returning final cleanup evidence, caller-aborted join leaving settlement/cleanup active, defensive-copy isolation, no duplicate close, and no overwriting of Phase A-preserved unknown values.

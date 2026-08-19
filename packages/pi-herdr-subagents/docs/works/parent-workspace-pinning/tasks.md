# Parent Workspace Pinning Tasks

- **Status:** Completed; implementation, real acceptance, and final review complete
- **Plan:** [Parent Workspace Pinning Plan](plan.md)
- **Authority:** [Parent Workspace Pinning Specification](../../spec/parent-workspace-pinning.md)
- **Context:** [Work Context](context.md)

## Completed Global Gates

- Fresh independent review completed; its initial `needs-revision` findings were remediated.
- The user explicitly accepted the #14 workspace-pinning Plan before implementation.
- Workspace admission completed before source/test work. The shared dirty worktree still requires selective staging and commit admission across #9, #11, #13, and #14 ownership; no commit is asserted here.
- The controlled real Herdr environment ran with parent `wF`, foreground `w8`, and cleanup permission; observed results are retained in [real-herdr-acceptance.json](evidence/real-herdr-acceptance.json).

## Task 1: Establish Transport Target Capture And Delayed Failure

- **Status:** completed.
- **Dependency:** global gates.
- **Objective:** capture one parent workspace identity at concrete transport construction while keeping construction loadable with no usable target; make missing/invalid target behavior stable only when creation is requested.
- **Context:** Spec sections 2, 3, 5, 7; Plan section 1.
- **Constraints:** use `HERDR_WORKSPACE_ID` for production; do not infer from cwd/session/IDs/prefix/foreground; do not read environment per create; construction with absent/unusable target must not throw; no source writes in the shared dirty worktree.
- **Expected ownership:** `packages/pi-herdr-subagents/src/index.ts`; fake transport/client setup in `tests/runtime.test.ts`.
- **Verification:** tests prove exact capture timing, environment mutation immutability, constructor remains usable in a non-Herdr environment, missing target rejection at `createTab` before Herdr invocation, invalid whitespace rejection at `createTab`, stable `Error.message` tokens, and no default/foreground fallback.

## Task 2: Add Workspace Argument, Failure Classification, And Response Cleanup

- **Status:** completed.
- **Dependency:** Task 1.
- **Objective:** include `--workspace <captured-target>` on every tab create, validate returned workspace and explicit IDs, distinguish unsupported contract from unrelated command failure, and clean up response-rejected explicit panes.
- **Context:** Spec sections 4-5 and failure table; Plan section 2.
- **Constraints:** preserve cwd/label/no-focus/env arguments; require `result.tab.tab_id`, `result.tab.workspace_id`, and `result.root_pane.pane_id`; classify only explicit workspace-option rejection or missing required response strings as `parent_workspace_contract_unsupported`; preserve unrelated command failures; reject mismatch with `parent_workspace_mismatch`; no retry without workspace.
- **Expected ownership:** `src/index.ts`, `tests/runtime.test.ts`.
- **Verification:** exact argv assertions; explicit tab/pane return assertions; unsupported-option, missing response fields, and workspace mismatch each expose the required token in `Error.message`; unrelated command failures retain their existing path; response rejection closes the exact explicit root pane at most once, preserves the primary error when close fails, makes no guessed cleanup call when no pane ID exists, creates no successful surface, and is never followed by `pane run`.

## Task 3: Preserve Spawn, Resume, Recovery, And Error Propagation

- **Status:** completed.
- **Dependency:** Task 2.
- **Objective:** integrate the pinned create surface without changing task identity, generation, session, Result, notification, steering, or removal semantics, while retaining workspace failure tokens in existing start failure propagation.
- **Context:** Spec section 6; existing `runtime-lifecycle.md`; Plan section 3.
- **Constraints:** no workspace field in `task.json`; no tab discovery/re-homing; recovery adopts retained explicit pane IDs without create; resume uses the transport's current captured target; create failure retains existing runtime failure persistence and the transport `Error.message`; no fallback or replacement surface.
- **Expected ownership:** `src/index.ts`, `tests/runtime.test.ts`; do not modify `pi-herdr/src/index.ts`.
- **Verification:** fake transport tests cover spawn failure/no fallback/token propagation, resume identity/session/generation behavior and token propagation, retained-pane restart recovery without create, future resume target after transport restart, explicit pane operations, and unchanged completion notification behavior.

## Task 4: Complete Focused Fake Transport And Runtime Regressions

- **Status:** completed.
- **Dependency:** Task 3.
- **Objective:** close all deterministic acceptance checks in the Spec before real Herdr mutation.
- **Context:** Spec acceptance conditions 1-9; Plan sections 1-3.
- **Constraints:** tests only; preserve #9/#11/#13 ownership boundaries; do not claim real workspace safety from fake responses alone; do not hide stable tokens in wrapper-only fields that callers cannot observe through `Error.message`.
- **Expected ownership:** `tests/runtime.test.ts` and any existing package test surface required by the selected baseline.
- **Verification:** package typecheck and focused tests pass; generic `packages/pi-herdr/src/index.ts` remains unchanged and its arbitrary args test passes; all missing/invalid/unsupported/mismatch paths prove the required token in `Error.message`; cleanup and cleanup-failure assertions pass; `git diff --check` is clean for the bounded implementation.

## Task 5: Run Controlled Real Herdr `wF -> w8` Acceptance

- **Status:** completed; controlled `wF -> w8` acceptance passed and is retained in [real-herdr-acceptance.json](evidence/real-herdr-acceptance.json).
- **Dependency:** Task 4.
- **Objective:** demonstrate in real Herdr that a parent in `wF` creates the child tab/root pane in `wF` while `w8` is foregrounded.
- **Context:** Spec acceptance condition 10; Context Incident Chronology and Verification Gate; Plan section 4.
- **Constraints:** this is a required mutation gate; create a fresh named controlled child through the real runtime; do not reuse incidental tasks; record Herdr version, parent/foreground workspace identities, command/result data, returned tab/pane IDs, child launch evidence, attempt outcome, and cleanup. Preserve no secrets or unrelated session data. If preconditions fail, record blocked rather than fabricating success.
- **Expected ownership:** `docs/works/parent-workspace-pinning/evidence/real-herdr-acceptance.json`; no source changes during evidence capture.
- **Verification:** retained record proves requested target, returned workspace equality, explicit tab/pane identities, child launch in the target workspace, foreground `w8` condition, and successful cleanup. It records any response-rejected surface cleanup attempt, including its primary reason token and cleanup outcome, when that scenario is exercised. Evidence must distinguish observed facts from the earlier incident chronology.

## Task 6: Fresh Independent Review And Final Gate

- **Status:** completed; two independent final reviews, including post-remediation review, found no executable correctness defects.
- **Dependency:** Task 5.
- **Objective:** independently review authority, implementation, tests, and real evidence, then run final package/documentation checks.
- **Context:** full Spec/ADR/Work/Plan/Tasks; real evidence record; #9/#11/#13 ownership gate.
- **Constraints:** read-only review; report findings first; do not commit; if review changes the contract, return to authority and regenerate affected Plan/Tasks before implementation continues.
- **Expected ownership:** none unless review requires a bounded correction.
- **Verification:** review explicitly disposes capture timing, delayed constructor failure, fail-closed missing/invalid/unsupported/mismatch classification, token propagation through `Error.message`, response-rejected cleanup, explicit response IDs, restart/recovery/resume compatibility, no generic-client change, no inference fallback, incident evidence boundary, #9/#11/#13 workspace ownership, and cleanup. Run package typecheck, full package tests, documentation link/reference check, and `git diff --check`.

## Execution Order And Parallel Safety

```text
global review/acceptance + #9/#11/#13 workspace admission
  -> 1 -> 2 -> 3 -> 4 -> 5 -> 6
```

All tasks are serial. Tasks 1 through 4 overlap `src/index.ts` and/or `tests/runtime.test.ts`, which are shared with #9, #11, and #13. The workspace-pinning fix must be completed before related runtime implementation may proceed because their source/test changes depend on the create surface contract. This is an ownership conflict gate, not authorization to overwrite their changes.

## Completion Record

All six tasks are complete. The final reported verification passed package typecheck, the full package test suite with 52 tests and 274 expectations, acceptance-evidence JSON parsing, and `git diff --check`. The controlled real Herdr gate is completion evidence for its recorded managed environment and version; independent reproduction still requires the same real-Herdr prerequisites.

No source, test, Herdr state, staging, or commit is changed by this status-only update. The shared dirty worktree remains subject to selective staging and commit admission.

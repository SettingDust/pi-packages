# Tasks: #42 Inline Model Capability Guidance

- Status: draft; implementation confirmed; T1/T2 complete; T3 reviewed with no P0-P2 findings; T4 review and implementation merge complete; four-document review, commit, re-merge, and cleanup pending
- Updated: 2026-08-26
- Work: [work.md](work.md)
- Plan: [plan.md](plan.md)
- Context: [context.md](context.md)
- Decision identity: `#42-model-capability-guidance-v1` (draft)
- Authority: derived coordination material only; this task set does not authorize implementation, acceptance, or Git activity
- Implementation gate: user implementation confirmation was received before T1. T4 final same-byte review returned GO with P0-P3=0, and the implementation commit `7d30b947a7c69ca630599e0b284b08b5e04a3302` was merged into main by merge commit `287645575e4510d7d66303237eca2311aa55043b`. The four-document independent review, documentation commit, subsequent main merge, and worktree/branch cleanup remain pending.

## Dependency graph

```text
T0 baseline/freeze
  -> T1 implement both input-title guidance strings and focused copy assertions
      -> T2 focused/full/typecheck verification
          -> T3 independent review
              -> T4 local commit, only after review GO
```

## T0. Establish baseline and freeze the bounded change

- Outcome: the current implementation and focused test baseline were recorded, the permitted two-file scope was frozen, and the exact source/test anchors were re-confirmed.
- Depends on: none.
- Context: `work.md`, `context.md`, `plan.md`; accepted #42 authority links named by `plan.md`; current `src/config-command.ts` and `tests/config-command.test.ts`.
- Constraints: read-only baseline/review preparation; no source or test edits; no settings, schema, Resolver, algorithm, README, ADR, custom UI, dependency, runtime, session, or Git changes. Do not treat this draft task set as implementation authorization.
- Expected touched surfaces: none for the baseline itself.
- Fixed anchors to verify: `src/config-command.ts` symbol `inputCapabilities`, with the two `ctx.ui.input` title literals now containing the agreed guidance; `tests/config-command.test.ts` test `"adds a candidate with explicit capability values"`, whose `"2"`/`"1"` inputs, `reasoning: 2`/`impact: 1` assertion, and both visible-title assertions are the current capability anchor.
- Completion evidence: baseline diff/status, the exact two permitted implementation paths, and the fixed source/test anchors were recorded; the final title wording and protected behaviors match `plan.md`.
- Status: completed; baseline and scope freeze recorded.

## T1. Implement the two existing input-title guidance strings

- Outcome: the two existing `ui.input` titles in `inputCapabilities` expose complete, independent reasoning and impact guidance, and the focused test asserts the visible wording.
- Depends on: T0 and confirmed implementation authorization.
- Context: `work.md` Proposed Bounded Change and Alternatives Considered; `context.md` Proposed UI Guidance, Alternatives Evidence, and Fixed Evidence Anchors; `plan.md` Scope, Alternatives and Rationale, Fixed Source and Test Anchors, and Implementation Strategy; current `src/config-command.ts` and `tests/config-command.test.ts`.
- Constraints: change only `packages/pi-harness/src/config-command.ts` and `packages/pi-harness/tests/config-command.test.ts`. Update only the two existing input title literals and the smallest test harness/assertions needed to observe and assert them. Preserve the finite integer `>= 0` contract, the meanings `0 routine`, `1 modest`, `2 substantial`, `3 exceptional`, and that `0-3` is guidance rather than an upper bound. Keep reasoning and impact visibly independent. Do not imply a combined score, weighting, hard maximum, or phase mapping. Do not change input order, defaults, cancellation, numeric conversion, validation, schema, Resolver request shape, selection, qualification, settings key, persistence, or any excluded surface.
- Expected touched surfaces: `packages/pi-harness/src/config-command.ts`; `packages/pi-harness/tests/config-command.test.ts`.
- Completion evidence: focused assertions independently cover both visible titles; the diff contains no production behavior change other than title text and no out-of-scope path changes.
- Status: completed; bounded two-file implementation and focused title assertions present.

## T2. Run focused, full, and typecheck verification

- Outcome: verification demonstrates the title guidance and preserves the existing configuration behavior.
- Depends on: T1.
- Context: `plan.md` Verification; T1 implementation diff and focused assertions; T0's recorded source/test anchors.
- Constraints: verification only; no source, documentation, settings, runtime, session, or Git changes. The focused check must cover both titles, reasoning before impact, ordinary numeric values, and rejection of non-finite, fractional, or negative values. Full package tests and typecheck must also pass. Inspect the final diff and confirm only the two permitted paths changed.
- Expected touched surfaces: none.
- Completion evidence: focused `config-command` test passes; full package test command passes; package typecheck passes; final diff/path check is clean. Any failure returns to the owning task and blocks T3.
- Status: completed; focused `13/13`, full `136/136` (539 assertions), typecheck, diff-check, and frozen-install verification passed.

## T3. Perform independent review

- Outcome: an independent read-only review returns GO with no actionable correctness, scope, evidence, or contract finding for the bounded two-title change.
- Depends on: T2.
- Context: `work.md`, `context.md`, `plan.md`, exact T1 diff, T2 verification output, T0's recorded anchors, and the accepted #42 authority links named by `plan.md`.
- Constraints: read-only review; no implementation, authority-document, README, settings, runtime, session, or Git changes. Check wording completeness, independent axes, no implied cap/combined scale/phase mapping, preserved validation and input flow, exact two-file scope, and truthful verification evidence. Any finding returns to T1 or T2 and requires fresh verification and review.
- Expected touched surfaces: none.
- Completion evidence: independent review record states GO and records zero actionable findings; review does not imply acceptance or commit authorization by itself.
- Status: reviewed; no P0-P2 findings. T3 did not authorize commit; its stale-lifecycle finding is reconciled by this document update.

- ## T4. Reconcile implementation review and merge evidence

- Outcome: the verified bounded implementation received final same-byte review GO and was committed and merged into main.
- Depends on: T3 GO and the implementation commit and main merge already recorded in the review evidence.
- Context: T1 implementation, T2 verification, T3 review, T0's recorded anchors, and the exact permitted two-file diff.
- Constraints: the implementation operation was limited to the authorized two-file scope; no push, deploy, reload, settings, README, ADR, algorithm, schema, settings-key, custom-UI, phase-mapping, or unrelated changes were included.
- Expected touched surfaces: only the already-authorized implementation/test paths in the local commit; this draft `tasks.md` is not an implementation authorization or a substitute for the required confirmation.
- Completion evidence: final same-byte review GO with P0-P3=0; focused `13/13`; full `136/136` (539 assertions); typecheck; implementation commit `7d30b947a7c69ca630599e0b284b08b5e04a3302`; and main merge commit `287645575e4510d7d66303237eca2311aa55043b`.
- Status: completed; implementation review and merge evidence recorded. The separate four-document review, documentation commit, subsequent main merge, and worktree/branch cleanup are outside T4 and remain pending.

## Parallelism and exclusions

Tasks are serial because implementation, its assertions, verification, independent review, and the conditional local commit share the same two-file behavior boundary. No task covers README, ADR, PRD, Specification, accepted #42 Work/Context, schema, Resolver, selection or qualification algorithms, settings key or persistence, custom UI, phase mapping, backend, Herdr, Pi core/Host, dependencies, runtime, sessions, reload, deployment, push, or unrelated Git work.

## Draft completion boundary
- This artifact is reconciled as draft coordination material when it truthfully records the confirmed implementation, completed T1-T4 evidence, fixed T0-T4 order, and pending four-document lifecycle. It does not authorize acceptance or any further Git activity.

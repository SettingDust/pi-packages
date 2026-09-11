# Context: Router Reasoning/Impact Level Guidance

- Status: implementation reviewed at T4 GO; T5 evidence synchronization in progress; final same-byte review and selective-commit eligibility pending
- Updated: 2026-08-26
- Work: [work.md](work.md)
- Work identity: `router-level-guidance`

## Historical baseline facts and constraints

- The current Router prompt is assembled by `routerPrompt` in `packages/pi-harness/extensions/pi-harness.ts`. It already states that levels are semantic 0..3 guidance, rejects mappings to Skill names, document types, research phases, and implementation phases, and asks for a fresh request based on objective, ambiguity, consequence, and verification burden.
- The current prompt does not give the needed planning/review distinctions: ordinary Plan/Tasks and independent review are normally at least reasoning 2, simple documentation reconciliation may be reasoning 1, and complex final review may be reasoning 3.
- The current prompt does not clearly require impact to be judged independently or state that planning/review does not automatically increase impact.
- `packages/pi-harness/docs/spec/provider-model-thinking-capability-selection.md` §3 defines requests as finite non-negative integers and explicitly says 0..3 is Router guidance, not a cap. §4 requires both-axis qualification and orders candidates by impact surplus, reasoning surplus, and canonical identity. §6 is the current Router semantic guidance and is the direct authority synchronization target.
- `packages/pi-harness/docs/spec/router-delegation.md` contains the accepted `#42` capability-selection amendment. Its amendment wording is the second direct authority synchronization target.
- The Plan resolves PRD synchronization: both related PRDs and both Specs are included in the exact six-path implementation boundary. Prior accepted history and completion evidence must be preserved through bounded clarification records.
- The Router prompt test in `packages/pi-harness/tests/extension.test.ts` already checks the semantic scale, representative 0 and 3 text, no Handoff capability fields, exact forwarding, and related Router contract text. It is the likely focused regression surface for the prompt clarification.
- The Resolver implementation and tests are not in the candidate path unless planning finds an actual contract regression. The settled Resolver behaviors must remain unchanged: finite non-negative integer contract, both-axis qualification, impact-surplus then reasoning-surplus ordering, one Registry snapshot, and least-sufficient selection.
- No natural-language classifier, level inference engine, `/harness config` classification UI, or full protocol schema classification table is part of the baseline recommendation.

## Evidence sources

| Source | Verified fact | Use |
|---|---|---|
| `packages/pi-harness/extensions/pi-harness.ts` | `routerPrompt` is the model-facing guidance surface; current text has generic 0..3 examples and phase-neutral language. | Bound prompt change. |
| `packages/pi-harness/tests/extension.test.ts` | Prompt-contract assertions cover existing capability guidance and Router invariants. | Bound focused regression test. |
| `packages/pi-harness/docs/spec/provider-model-thinking-capability-selection.md` §3, §4, §6 | Numeric contract, two-axis selection, and current semantic guidance. | Preserve authority and identify §6 amendment. |
| `packages/pi-harness/docs/spec/router-delegation.md` `#42 Accepted Capability-Selection Amendment` | Accepted Router/Resolver capability-selection summary. | Reconcile amendment wording. |
| `packages/pi-harness/docs/prd/provider-model-thinking-capability-selection.md` and `docs/prd/router-delegation.md` | Product-level 0..3 and phase-neutral wording exists. | Synchronize both PRDs as settled by the Plan; preserve historical acceptance. |
| Baseline audit Result | Audit found a guidance-contract gap, not an algorithm defect; recommended the same minimal path and excluded `/harness config` and Resolver changes. | Scope and risk baseline. |

## Worktree and dependency constraints

- All work is confined to `E:/Projects/pi-packages/.worktree/router-level-guidance`.
- Existing T0 Result records `bun install --frozen-lockfile` from `E:/Projects/pi-packages/.worktree/router-level-guidance/packages/pi-harness`, using authorized Bun `1.4.0 (34cbb9a40)` despite root `bun@1.3.14`: 174 packages installed, including `proper-lockfile@4.1.2`, without manifest or lockfile changes. Dependency materialization is an authorized environment write, not read-only verification.
- From the same package directory, the Result reports `bun test`: exit 0, 136 pass, 0 fail, 539 expect() calls, 7 files; `bun run typecheck`: exit 0, `tsc --noEmit -p tsconfig.json`. These are prior baseline checks, not checks rerun by this repair.
- The baseline records no path overlap with the three other worktrees. This Work must preserve that isolation and must not modify their files or absorb their changes.
- The index is empty at baseline. No staging, commit, push, reload, deploy, reset, clean, settings/session mutation, dependency or lockfile change is allowed.

## Decisions resolved by the accepted planning scope

1. **Authority synchronization:** both PRDs and both Specs are included, alongside only `routerPrompt` and its existing prompt-contract test: six implementation paths. No ADR changes.
2. **Verification scope:** generated-prompt assertions are the focused check; unchanged protocol regressions, full package tests, typecheck, and source/path review support regression and boundary evidence. They do not test a model's actual level selection.
3. **PRD history:** retain accepted #42 identity, acceptance history, and prior completion evidence; add bounded Router-guidance clarification records rather than retrospectively changing historical facts.
4. **Wording:** Plan's settled guidance contract owns independent axes, fresh concrete judgment, ordinary reasoning examples, no automatic impact uplift, and finite non-negative integer legality. Both `candidateStatus` and main prompt cap-like phrases and the old test assertion must change.

The preceding baseline and planning facts describe the pre-implementation state, superseded for implementation status by the T3/T4 evidence below. Existing acceptance is preserved; this reconciliation creates no receipt. Final same-byte review of T5 bytes and selective-commit eligibility remain pending.

## Existing T0 dependency evidence

Source: `c:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/restore-router-deps-t0-baseline-artifacts/result-1.json`, task `restore-router-deps-t0-baseline`, generation 1. This supersedes the unknown-command/missing-dependency premise. The Result reports boundary preservation but does not embed raw pre/post tracked-file hash inventories or identify the shell; do not invent those details. The current Handoff records implementation acceptance and permission for frozen installation; this documentation repair is not an acceptance receipt or independent review approval. Historical pre-T0 lifecycle wording is not a new confirmation requirement. Limited searches not locating an older review do not establish its absence. No installation occurs in this repair.

## Verification record boundaries

The earlier two-file creation and three-file repair records are historical, not current file-count gates. This consistency repair controls exactly Work, Context, Plan, and the already-derived Tasks. The `planned-admission tuple` is Work/Plan/Tasks; the four-document `same-byte review/lifecycle set` includes Context. Later implementation checks compare the exact six approved implementation paths plus the separately authorized four lifecycle reconciliation paths. T5 additionally owns status/evidence-only updates within the four authority paths' existing `router-level-guidance clarification` records; these remain within the six implementation paths, not four additional paths. T5 must preserve authority semantics and history and verify/review its final changed bytes. This repair performs no source, test, authority, dependency, settings, runtime, staging, or history changes.

## T3-T4 evidence

- T3 source: `c:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/router-t3-integration-verify-artifacts/result-1.json`, generation 1. Its inner Result is partial: Extension 6/6, protocol 35/35, full package 136/136, typecheck, relative targets, diff-check, empty index, and manifest/lockfile stability passed; boundary assessment deferred because of four known untracked lifecycle documents.
- T4 source: `c:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/review-router-guidance-implementation-artifacts/result-1.json`, generation 1, GO with P0=0, P1=0, P2=0, P3=0. Review explicitly accepts the six implementation plus four lifecycle boundary. This is pre-T5 evidence, not review of reconciled bytes.
- T5 entry freeze: `extensions/pi-harness.ts` SHA-256 `66eabd5a55551bf9ee2e740186be55322feb70fa55ac4433fc2f185b3cffae7f`; `tests/extension.test.ts` SHA-256 `cd4608f1563f463d266bb239000475c36bba8490eb09a8861949ca5ef5ee565c`. Paths are relative to `packages/pi-harness`.
- No tests were rerun by documentation reconciliation. Evidence establishes package/generated-prompt behavior, not live model classification, reload, or deployment. Final same-byte review, historical three-document inventory corroboration, and merge-order overlap assessment remain outstanding; selective-commit eligibility is not established. T6 is not declared complete.

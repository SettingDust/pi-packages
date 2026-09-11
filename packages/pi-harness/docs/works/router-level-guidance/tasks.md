# Tasks: Router Reasoning/Impact Level Guidance

- Status: implementation reviewed at T4 GO; T5 evidence synchronization in progress; final same-byte review and selective-commit eligibility pending
- Updated: 2026-08-26
- Work: [work.md](work.md)
- Context: [context.md](context.md)
- Plan: [plan.md](plan.md)
- Work identity: `router-level-guidance`
- Nature: derived execution units; not product or technical authority, acceptance evidence, or implementation authorization

## Authorization boundary

These Tasks derive only from the accepted Plan. They do not authorize source, test, authority, dependency, Git, settings, session, runtime, reload, merge, deploy, or implementation changes.

Planning-review conditions below are historical. [Context](context.md#t3-t4-evidence) records T3 technical checks and T4 GO/P0-P3 zero for pre-reconciliation bytes. T5 documentation synchronization does not create a receipt; final same-byte review and selective-commit eligibility remain pending.

Before T0, the exact Work/Plan/Tasks planned-admission tuple plus Context as the four-document same-byte review/lifecycle set must receive independent same-byte review with GO and P0-P3 all zero, bound to the existing user implementation acceptance; no post-review re-acceptance or Markdown receipt is created by this repair. Any substantive identity, scope, behavior, architecture, dependency, risk, acceptance-criteria, or six-path drift stops execution and requires renewed review and acceptance.

- `reasoning` and `impact` remain independent. Ordinary Plan/Tasks and independent review normally require `reasoning >= 2`; architecture, security, migration, authority conflict, complex root cause, or unusually difficult uncertainty commonly requires `reasoning 3`. Every level is chosen from concrete ambiguity, consequence, reasoning, and verification burden—not from a Skill, artifact, or workflow label.

## Fixed ownership and path boundary

T1-T2 may modify exactly these six existing paths:

1. `packages/pi-harness/docs/prd/provider-model-thinking-capability-selection.md`
2. `packages/pi-harness/docs/prd/router-delegation.md`
3. `packages/pi-harness/docs/spec/provider-model-thinking-capability-selection.md`
4. `packages/pi-harness/docs/spec/router-delegation.md`
5. `packages/pi-harness/extensions/pi-harness.ts` — only `routerPrompt` capability-guidance prose, including both current cap-like wording locations
6. `packages/pi-harness/tests/extension.test.ts` — only the existing Router prompt-contract coverage

Work lifecycle files under `packages/pi-harness/docs/works/router-level-guidance/` are separate controlled lifecycle surfaces, not part of the six-path product implementation diff. No task may modify Resolver/schema/protocol/config/settings/backend/Registry/Herdr/Pi Host behavior, protocol tests, ADRs, dependencies, manifests, lockfiles, generated files, unrelated Works, other worktrees, Git history, or the Git index except under a later separately authorized operational action.

## Dependency graph

```text
T0 -> T1 -> T2 -> T3 -> T4 -> T5
```

All tasks are serial. There are no parallel-safe implementation groups: T1 establishes the single authority wording consumed by T2; T3 verifies the completed candidate; T4 reviews those exact bytes; T5 consumes the accepted verification and review evidence.

## T0 — Freeze identities, baseline, overlap, and dependency evidence

**Observable outcome:** a reproducible baseline records authorized dependency environment writes separately from subsequent verification, preserving lifecycle identities and the six-path boundary before product mutation. T0 as a whole is not read-only.

**Required context:** Work, Context, Plan, these Tasks, Plan T0, and all six controlled implementation paths.

**Actions and constraints:**

1. Re-read and hash the exact Work, Context, Plan, and Tasks bytes; confirm canonical paths, links, work identity, reviewed/accepted identities, and the six-path list. Stop if any identity, scope, or authority has drifted.
2. Record branch, base, index, tracked/untracked inventory, existing diffs, and path ownership in this worktree. Recheck all worktrees for committed or uncommitted overlap; do not absorb unrelated work.
3. Cite [existing T0 evidence](context.md#existing-t0-dependency-evidence): `bun install --frozen-lockfile` from `E:/Projects/pi-packages/.worktree/router-level-guidance/packages/pi-harness`, authorized Bun `1.4.0 (34cbb9a40)` despite root `bun@1.3.14`, 174 packages installed. The command/version are no longer unknown; do not invent shell provenance, upgrade, add packages, or re-resolve the lockfile.
4. Materialization is an already-authorized environment write, not read-only verification or a new confirmation gate. The Result reports only ignored dependency materialization and no manifest/lockfile/tracked/index drift, but does not embed raw pre/post hash inventories. Preserve pre/post tracked paths, status, cached diff, untracked inventory, and every tracked-file SHA-256 for any later materialization; stop on unauthorized drift.
5. Baseline checking is a separate post-install operation: the existing Result reports `bun test` exit 0 (136 pass, 0 fail, 539 expect() calls, 7 files) and `bun run typecheck` exit 0 (`tsc --noEmit -p tsconfig.json`), both from `packages/pi-harness`. This repair cites prior verification, performs neither operation again, and does not claim independent review approval.

**Completion evidence:** lifecycle hashes, identity/link and overlap evidence remain distinct from the cited dependency/baseline Result. Do not present that Result as raw hash inventories or as verification of the repaired document bytes. No new acceptance receipt is created.

## T1 — Synchronize the four authority owners

**Depends on:** T0.

**Observable outcome:** both PRDs and both Specs express one semantically identical, history-preserving Router guidance contract.

**Owned paths:** the four authority paths listed above; no others.

**Actions and constraints:**

1. Reconcile the settled Plan wording across both PRDs, capability-selection Spec §6, and Router Delegation Spec amendment `#42`.
2. Preserve independent reasoning/impact axes, fresh concrete judgment, least-sufficient values, finite non-negative integer legality, common `0..3` guidance without a cap, ordinary `reasoning >= 2` examples, complex-final-review `reasoning 3` examples, and no automatic planning/review impact uplift.
3. Preserve Resolver ownership and behavior: both-axis qualification, one Registry snapshot, impact-surplus then reasoning-surplus ordering, canonical tie-break, exact forwarding, Handoff exclusions, and failure behavior.
4. Add bounded `router-level-guidance clarification` records with the actual amendment date and exact accepted tuple/review references while preserving accepted identities, dates, history, and prior completion evidence. Do not backdate or infer acceptance from editing.
5. Confirm the prose is guidance, not a Skill/document/phase mapping, combined score, classifier, schema copy, or algorithm.
6. Stop on ADR conflict, authority contradiction, identity drift, or any need to change Resolver behavior.

**Completion evidence:** four-path diff only; direct semantic comparison showing one contract; preserved history/identity evidence; no forbidden classification or Resolver change; authority links resolve.

## T2 — Update `routerPrompt` and its existing contract test

**Depends on:** T1.

**Observable outcome:** generated Router prompt prose matches T1 authority and its existing test guards all contract-bearing distinctions without changing runtime selection behavior.

**Owned paths:** `packages/pi-harness/extensions/pi-harness.ts` and `packages/pi-harness/tests/extension.test.ts`; no others.

**Actions and constraints:**

1. Change only capability-guidance prose in both `routerPrompt` wording locations: the ready-candidate `candidateStatus` branch and main prompt.
2. Replace both `0 to 3` cap-like phrases with finite non-negative integer requirements and common `0..3` guidance that is not an upper bound.
3. Preserve unrelated Router instructions, candidate branching behavior, Resolver registration/invocation, exact metadata forwarding, Skills, admission, Todo, and backend text.
4. In the existing Registry-free root capability-resolver test, replace the old cap-like assertion with stable `toContain` assertions covering: independent axes; fresh concrete judgment; reasoning 0/1/2/3 distinctions; ordinary Plan/Tasks/independent review usually at least 2 without label mapping; complex final-review examples; impact 0/1/2/3; no automatic planning/review uplift; finite non-negative integers; and `0..3` not being an upper bound.
5. Assert prohibited total/weighted/priority/phase interpretations and absence of both old cap-like phrases. Do not snapshot the whole prompt or simulate a natural-language classifier.

**Completion evidence:** two-path diff only; focused generated-prompt assertions cover the Plan's prompt-text contract rows; the remaining matrix rows are established by the specified Resolver regressions, authority review, and source/path-boundary verification; no schema, protocol, Resolver, config, or protocol-test diff.

## T3 — Run focused, full, and boundary verification

**Depends on:** T2.

**Observable outcome:** the exact six-path candidate passes direct contract checks and unchanged package regressions with no boundary or side-effect violation.

**Owned surfaces:** read-only verification outputs; fixes, if required, remain within the owning T1 or T2 path and invalidate affected evidence.

**Checks:**

1. From `packages/pi-harness`: `bun test tests/extension.test.ts`.
2. `bun test tests/protocol.test.ts`.
3. `bun test`.
4. `bun run typecheck`.
5. Inspect the exact six-path diff, stable tracked manifests/lockfile, empty index, and `git diff --check`.
6. Verify Work ↔ Context ↔ Plan ↔ Tasks links and all four authority links.
7. Verify no forbidden worktree, Git, dependency, settings, session, runtime, reload, deployment, or generated-file side effect.

**Completion evidence:** command, working directory, exit status, and unabridged decision-relevant output for every check; final changed-path inventory; hashes of reviewed candidate files; explicit attribution and rerun evidence for any corrected failure. Earlier dependency limitations cannot waive failures.

## T4 — Independently review exact candidate and evidence

**Depends on:** T3.

**Observable outcome:** an independent read-only review returns GO with P0-P3 all zero for the exact same-byte candidate.

**Review boundary:**

- Correctness: settled guidance semantics, prompt ownership, required positive/negative distinctions, authority consistency, exclusions, and unchanged Resolver behavior.
- Evidence: commands and outputs, byte identities, changed-path inventory, links, baseline attribution, index and side-effect checks, and absence of unsupported runtime claims.

The review must not mutate candidate files. Any repair invalidates affected T3 evidence and the prior review; rerun the smallest relevant verification and obtain a fresh same-byte review.

**Completion evidence:** durable review Result naming exact hashes, GO, P0=0, P1=0, P2=0, P3=0, and explicit correctness/evidence conclusions.

## T5 — Reconcile lifecycle and prove selective-commit eligibility

**Depends on:** T4 GO.

**Observable outcome:** lifecycle documents truthfully reflect actual acceptance, implementation, verification, and review evidence, and the candidate is proven eligible for a later separately authorized selective commit.

**Owned paths:** Work, Context, Plan, and Tasks plus the four existing PRD/Spec paths listed in the six-path boundary, only under separate reconciliation authorization covering these surfaces. Authority-file edits are limited to actual T3/T4 evidence references and implementation status in the T1-created `router-level-guidance clarification` records. Preserve authority semantics, accepted identity/history, source, and tests. Substantive correction returns to its owning gate for renewed affected verification/review. This task does not authorize staging or commit.

**Actions and constraints:**

1. Reconcile all four lifecycle documents and backfill actual T3/T4 evidence and implementation status in all four authority clarification records without rewriting authority acceptance history or claiming unperformed work.
2. Prove the product implementation diff contains exactly the six authorized paths and that separately authorized lifecycle changes contain only the four lifecycle files, with no unrelated path or hunk.
3. Verify final lifecycle and implementation-path identities, links, empty index, `git diff --check`, tracked manifest/lockfile stability, and no forbidden side effects.
4. Preserve evidence that the initial draft-stage candidate contained exactly the three untracked Work, Context, and Plan files before Tasks derivation and implementation authorization.
5. Reassess main-branch drift and all-worktree overlap in actual completion/merge order.
6. Mark selective-commit eligibility only when authority and lifecycle text truthfully reflects implementation evidence. T5 creates new bytes: preserve T4 as pre-reconciliation evidence, rerun final path/hash/link/diff checks, and obtain independent read-only review of the exact final six-plus-four candidate (GO, P0-P3 all zero) before eligibility. T4 hashes do not review T5 bytes.

A later commit is an operational action requiring its own confirmation and verification at the execution boundary. It must selectively include the exact authorized product and lifecycle hunks, preserve compilation at the committed revision, and exclude unrelated changes. Merge, reload, and deploy are likewise separate operational actions; none is authorized here.

**Completion evidence:** reconciled four-document hashes and links; status/evidence-only diffs for all four authority clarification records; exact six-plus-four path/hunk inventory; final verification, pre-reconciliation T4 references, and independent final same-byte review; index-empty and diff-check proof; drift/overlap assessment; explicit selective-commit eligibility statement without performing a commit.

## Coverage check

- Plan T0 maps to Task T0.
- Plan T1 maps to Task T1.
- Plan T2 maps to Task T2.
- Plan T3 maps to Task T3.
- Plan T4 maps to Task T4.
- Plan T5 maps to Task T5.
- Every task has one observable outcome, explicit ownership, dependencies, constraints, and completion evidence.
- No duplicate or hidden work exists. The current Handoff records implementation acceptance and permission for frozen installation; historical pre-T0 acceptance wording is not a repeat confirmation gate. Existing dependency/baseline evidence is cited above; this repair does not claim an independent review passed.

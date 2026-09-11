# Plan: Router Reasoning/Impact Level Guidance

- Status: implementation reviewed at T4 GO; T5 evidence synchronization in progress; final same-byte review and selective-commit eligibility pending
- Updated: 2026-08-26
- Work: [work.md](work.md)
- Context: [context.md](context.md)
- Authority: [Capability-selection PRD](../../prd/provider-model-thinking-capability-selection.md), [Router delegation PRD](../../prd/router-delegation.md), [Capability-selection Spec](../../spec/provider-model-thinking-capability-selection.md), and [Router delegation Spec](../../spec/router-delegation.md)
- Work identity: `router-level-guidance`
- Nature: derived implementation strategy; not product or technical authority, acceptance evidence, Tasks authorization, or implementation authorization

## Objective

Clarify the Router's model-facing `reasoning` and `impact` guidance so every delegation requests the least sufficient semantic capabilities from the concrete work, while leaving Resolver validation, qualification, ordering, and selection behavior unchanged.

This Plan has one observable delivery outcome: one synchronized six-path authority/source/test change that states the guidance contract, verifies the prompt contract, and preserves the existing Resolver contract.

## Current state and authorization boundary

The accepted authority already owns finite non-negative integer requests, independent `reasoning` and `impact` qualification, deterministic least-sufficient selection, and phase-neutral 0..3 examples. The [baseline audit](context.md#evidence-sources) found a wording gap rather than an algorithm defect: ordinary planning/review reasoning, simple reconciliation, complex final review, and independent impact judgment are not explicit enough in the Router prompt or synchronized authority.

Historical planning-review conditions below preceded implementation. Current T3/T4 evidence is recorded in [Context](context.md#t3-t4-evidence): technical checks passed, and T4 returned GO/P0-P3 zero for the pre-reconciliation candidate. T5 documentary updates do not create acceptance or establish final same-byte review; selective-commit eligibility remains pending.

The pre-T0 review/acceptance sequence above is historical, not a new confirmation gate: the current Handoff records user implementation acceptance and permission for frozen installation. Dependency-command and baseline evidence now exists in [Context](context.md#existing-t0-dependency-evidence); this repair cites it without claiming independent review approval or creating an acceptance receipt. The unchanged set authorizes bounded T0-T4 execution without a second T1 confirmation. Substantive scope, behavior, risk, dependency, architecture, acceptance-criteria, or identity drift requires renewed review and acceptance; T5 lifecycle reconciliation remains separately authorized.

## Settled guidance wording contract

T1 authority wording and T2 `routerPrompt` wording must express the following normative contract without weakening, reinterpreting, or duplicating it into a classifier:

> Treat `reasoning` and `impact` as independent axes. Do not combine them into a total score, weighted score, priority, or phase level. For every delegation, judge the concrete objective, ambiguity, reasoning needed for correctness, verification burden, and actual consequence.
>
> Common `reasoning` guidance: `0` is mechanical work with clear boundaries and low ambiguity; `1` is a small settled implementation or check, simple state reconciliation, or simple documentation reconciliation; `2` is ordinary Plan or Tasks work, independent review, or multi-file impact analysis; `3` is final review involving architecture, security, migration, authority conflict, a complex root cause, or unusually difficult uncertainty. Ordinary Plan, Tasks, and independent review work normally require at least reasoning `2`, but this is not a mapping from a Skill name, document type, planning/review phase, or other workflow label; a simple mechanical reconciliation may still require only `1`.
>
> Common `impact` guidance: `0` is local, reversible, and without external impact; `1` is bounded to one module; `2` is cross-module or materially affects behavior or compatibility; `3` is high-consequence, hard to reverse, or involves security, data, or external-system risk. Planning or review does not by itself increase impact.
>
> The `0..3` values are common guidance, not a protocol range or upper bound. Any finite non-negative integer is valid. Request the least sufficient value on each axis from the concrete work.

The final prose may be minimally tightened for grammar across the four authority documents and prompt, but every emphasized distinction and example above is contract-bearing. T1 must settle one semantically identical wording set before T2 begins; T2 must not invent a separate interpretation.

### Required interpretation

- `reasoning` estimates cognitive work needed for correctness and adequate verification; `impact` estimates actual consequence.
- A high value on one axis does not imply a high value on the other.
- Ordinary Plan/Tasks/independent review is usually `reasoning >= 2` because synthesis or independent judgment is normally required, not because of its Skill, artifact, or phase label.
- A bounded mechanical reconciliation may be `reasoning 1`; mechanical, clearly bounded, low-ambiguity work remains represented by `reasoning 0` where that is actually sufficient.
- Architecture, security, migration, authority conflict, complex-root-cause, or unusually uncertain final review commonly warrants `reasoning 3`; `3` remains only an example, not a cap.
- Planning/review has no automatic impact uplift. A review with local reversible consequences may remain low impact; actual cross-module, compatibility, security, data, irreversibility, or external-system consequence raises impact.
- No Skill-name table, document-type table, phase taxonomy, priority scale, combined score, weighted score, heuristic classifier, or natural-language automatic classifier is introduced.

## Exact six-path delivery boundary

Only these six existing paths may change during T1-T2:

| Ownership | Exact path | Permitted change |
|---|---|---|
| Product authority | `packages/pi-harness/docs/prd/provider-model-thinking-capability-selection.md` | Reconcile Router semantic requirements and success criteria with the settled independent-axis guidance. |
| Product authority | `packages/pi-harness/docs/prd/router-delegation.md` | Reconcile `Capability Request Semantics` with the same Router guidance. |
| Technical authority | `packages/pi-harness/docs/spec/provider-model-thinking-capability-selection.md` | Amend §6 `Router semantics`; preserve §§3-4 numeric and Resolver selection contracts. |
| Technical authority | `packages/pi-harness/docs/spec/router-delegation.md` | Amend the accepted `#42 Accepted Capability-Selection Amendment` Router semantics; preserve Resolver and Registry-snapshot requirements. |
| Model-facing source | `packages/pi-harness/extensions/pi-harness.ts` | Change only `routerPrompt` capability-guidance prose. |
| Prompt-contract test | `packages/pi-harness/tests/extension.test.ts` | Extend only the existing Router prompt-contract assertions with stable contract-bearing phrases. |

Work lifecycle documents under `packages/pi-harness/docs/works/router-level-guidance/` are controlled inputs/outputs for lifecycle reconciliation, but they are not part of the six-path product implementation diff. The Work/Plan/Tasks documents form the `planned-admission tuple`; Context joins them only in the four-document `same-byte review/lifecycle set`. T0 must freeze their identities separately, and T5 may update the lifecycle status of all four documents only after the required evidence exists and only under separate authorization appropriate to that reconciliation.

## Exclusions and invariants

The implementation must not modify or semantically change:

- `createResolverTool` schema, its keys, TypeBox shape, capability parameter descriptions, rendering, or execute mapping;
- `packages/pi-harness/src/protocol.ts`, including `buildResolverSchema`, numeric validation, `resolveDelegation`, `selectCandidate`, and Handoff exclusion rules;
- `packages/pi-harness/tests/protocol.test.ts`; it is an unchanged regression target only;
- `packages/pi-harness/src/config-command.ts`, settings grammar/storage/UI, candidate Registry access, or backend adaptation;
- any Registry, backend, Herdr, Pi core/Host, session, runtime, or settings behavior;
- `packages/pi-harness/docs/works/model-capability-guidance/`, whose accepted scope is only `/harness config` wording;
- any ADR. Existing ADR text currently has no demonstrated conflict. If T1 finds a real normative conflict, stop and report the exact evidence; do not expand the path boundary or edit an ADR under this Plan;
- Resolver finite non-negative integer legality, both-axis qualification, one Registry snapshot, surplus ordering, canonical identity tie-break, failure behavior, or least-sufficient selection;
- dependencies, lockfile bytes, package manifests, generated files, unrelated worktrees, Git index, or history.

No migration, fallback, compatibility shim, schema copy of the guidance table, automatic classification, telemetry, configuration knob, wrapper, abstraction, or new dependency is needed.

## Serial execution gates

```text
T0 freeze identities, overlap, baseline, and dependencies
  -> T1 synchronize four authority wording owners
      -> T2 update routerPrompt and its existing prompt-contract test
          -> T3 run focused, regression, package, type, path, and document checks
              -> T4 independent correctness and evidence review
                  -> T5 reconcile lifecycle and selective-commit eligibility
```

All gates are serial. The four authority files must agree before source prose is changed; source and its contract test share one interface; verification and review consume the exact completed candidate. No gate may infer success from a later gate.

### T0 — Freeze exact inputs and materialize the baseline

1. Re-read the final Work, Plan, Tasks, and Context bytes and every controlled path. Compute and record canonical path and byte identities for the exact accepted set. Stop if Tasks are absent, any document remains unresolved, the tuple is not the reviewed/accepted tuple, or authority has drifted.
2. Check the target worktree branch, base, index, tracked/untracked state, and six-path diff boundary. Confirm no unowned or pre-existing edits overlap the candidate.
3. Re-check all current worktrees for committed and uncommitted path overlap. Baseline evidence records no overlap with `completed-subagent-session-open` (`packages/pi-herdr-subagents/**`) or `todo-multi-expand` (`packages/todo/**`); preserve that isolation. At later merge time, revalidate main and all candidate paths in completion order rather than trusting this snapshot.
4. Preserve the earlier missing-`proper-lockfile` failure as historical only. The existing T0 Result cited in Context reports subsequent `bun test` exit 0 (136 pass, 0 fail, 539 expect() calls, 7 files) and `bun run typecheck` exit 0 (`tsc --noEmit -p tsconfig.json`), both from `packages/pi-harness`.
5. Dependency materialization was an authorized environment write, not a read-only check: `bun install --frozen-lockfile` ran from `E:/Projects/pi-packages/.worktree/router-level-guidance/packages/pi-harness` using authorized Bun `1.4.0 (34cbb9a40)` despite root `bun@1.3.14`; 174 packages were installed. The Result reports only ignored dependency materialization and no manifest, lockfile, tracked, or index drift. It does not embed raw hash inventories or shell provenance; do not claim those were independently verified here. For any later materialization, preserve pre/post tracked paths, status, cached diff, untracked inventory, and every tracked-file SHA-256; only ignored dependencies may differ. No upgrade, added package, intentional re-resolution, or lockfile/declaration change is allowed.
6. Baseline tests/typecheck are a separate operation after materialization. Cite the existing successful pre-change checks rather than retaining an unknown-command blocker or requiring another installation. Current identities and overlap still require accurate evidence before T1; prior baseline results do not validate changed implementation bytes. This repair performs no install or baseline rerun.

### T1 — Synchronize authority wording

1. Apply the settled guidance contract to capability-selection Spec §6 and the Router Delegation Spec's accepted `#42` amendment.
2. Apply corresponding product semantics and success-criteria wording to both related PRDs so accepted product and technical authority remain aligned.
3. Preserve the existing Router/Resolver ownership split, finite non-negative integer grammar, 0..3-not-a-cap statement, independent qualification, deterministic surplus ordering, one-snapshot rule, exact pass-through, and Handoff exclusions.
4. Confirm the four documents describe guidance examples, not an automatic classification algorithm or artifact/phase mapping.
   Preserve all four documents' existing accepted identity, acceptance dates/history, and completed historical evidence. Add a bounded record named `router-level-guidance clarification`, with actual amendment date, exact accepted tuple/review references, and the newly clarified guidance. Do not relabel the whole historical document as draft or rewrite #42 completion facts. Before T5 the clarification must truthfully distinguish accepted wording from still-unverified implementation; only T5 may attach actual T3/T4 completion evidence and update this clarification's implementation status. Never backdate or infer acceptance from an edit.
5. Stop on any actual ADR conflict, authority contradiction, identity drift, or need to alter Resolver behavior. T1 cannot silently widen scope.

T1 is the authority synchronization gate within the already accepted tuple. Check consistency before T2; no additional user acceptance is required when the settled contract and identities have not substantively drifted. Stop for renewed review/acceptance only on substantive deviation; retain T4 independent review.

### T2 — Update the prompt interface and focused test

1. Change capability-guidance prose in both `routerPrompt` locations: the ready-candidate `candidateStatus` branch (`Request semantic ... from 0 to 3`) and the main prompt (`assign ... from 0 to 3`). Replace both cap-like phrases with finite non-negative integer requirements and common 0..3 guidance that is not an upper bound, using T1's single meaning contract.
2. Preserve all unrelated Router instructions, Resolver invocation flow, exact resolved metadata forwarding, registration behavior, candidate-status branching/behavior (not its corrected guidance prose), Skills rendering, and admission/Todo/backend text.
3. Update the existing `registers a Registry-free root capability resolver and forwards exact resolution` test, removing/replacing its old `requirements from 0 to 3` assertion. Assert the generated prompt's finite non-negative integer contract, common 0..3 examples, and not-an-upper-bound distinction across both wording locations; ensure neither old cap-like phrase remains. Prefer stable `toContain` phrases over a whole-prompt snapshot.
4. Assert all required positive and negative semantics listed in the verification matrix. Do not implement or test a natural-language classifier, exhaustive Skill matrix, document matrix, or phase matrix.
5. Do not modify the Resolver schema or protocol test to carry duplicate guidance.

### T3 — Verification and boundary gate

Run the smallest checks that directly establish the change, followed by unchanged integration regressions:

1. focused Extension contract: `bun test tests/extension.test.ts` from `packages/pi-harness`;
2. unchanged protocol regression: `bun test tests/protocol.test.ts`;
3. full package suite: `bun test`;
4. package typecheck: `bun run typecheck`;
5. six-path diff/path-boundary inspection, tracked lockfile/package-manifest stability, and `git diff --check`;
6. documentation link checks for Work ↔ Context ↔ Plan and all four authority links;
7. index-empty and no forbidden worktree/Git/settings/runtime side-effect checks.

Failures must be attributed, corrected within the accepted boundary, and rerun. Do not waive a failure based on the earlier missing-dependency baseline; T0 exists to remove that environmental limitation.

### T4 — Independent review

Review the exact same-byte candidate after T3:

- correctness review: guidance semantics, prompt ownership, exclusions, no contradiction, and Resolver behavior preservation;
- evidence review: command outputs, identities, changed-path inventory, link checks, baseline attribution, and absence of unsupported runtime claims.

The gate passes only with GO and P0-P3 all zero for the exact candidate. Any repair invalidates prior affected evidence and requires the smallest relevant T3 rerun plus a fresh same-byte review. Review must not mutate candidate files.

### T5 — Lifecycle reconciliation and selective-commit eligibility

Only after T4 GO and separate reconciliation authorization covering the following ownership:

**Owned paths:** all four Work/Context/Plan/Tasks lifecycle documents plus the four existing PRD/Spec paths listed in the six-path boundary. Authority-file edits are limited to actual T3/T4 evidence references and implementation status in the T1-created `router-level-guidance clarification` records. No authority semantics, accepted identity/history, source, or test edits belong to T5; substantive correction returns to its owning gate and requires renewed affected verification/review.

1. reconcile Work/Plan/Tasks/Context lifecycle status and completion evidence, and backfill actual T3/T4 evidence and implementation status in all four authority clarification records, without rewriting accepted authority history or claiming unperformed work;
2. prove the final candidate contains exactly the six authorized implementation paths plus the separately authorized lifecycle-document reconciliation, with no unrelated path or hunk; the four lifecycle documents are not counted in the six-path product implementation diff;
3. verify Work/Context/Plan/Tasks links, final path and byte identities for all four lifecycle documents and the six implementation paths, empty index, `git diff --check`, and link checks;
4. confirm the initial draft-stage candidate was exactly three untracked documents—`work.md`, `context.md`, and `plan.md`—before later Tasks or implementation work was authorized;
5. reassess main-branch drift and path overlap in actual completion/merge order;
6. determine selective-commit eligibility only after authority and lifecycle text truthfully reflects implementation evidence. T5 edits produce new bytes: preserve T4 as pre-reconciliation evidence, rerun final path/hash/link/diff checks, and obtain independent read-only review of the exact final six-plus-four candidate (GO, P0-P3 all zero) before eligibility. Do not treat T4 hashes as review of T5 bytes.

This Plan does not authorize staging or commit. Any later staging/commit requires its own explicit authorized action and must exclude unrelated hunks.

## Verification matrix

All prompt-test entries below establish generated text contracts only, through the synthetic `before_agent_start` event, not an LLM. Absence of new classifier/mapping/algorithm code is established by complete source-diff and path-scope review, supported by unchanged Resolver regressions, not by string assertions. No model's actual reasoning/impact choices are tested or claimed.

| Contract or invariant | Primary evidence | Regression/negative evidence |
|---|---|---|
| Reasoning and impact are independent axes | Prompt assertion for “independent axes” | Prompt rejects total score, weighted score, priority, and phase level; authority says the same. |
| Fresh semantic judgment | Generated prompt contains concrete objective, ambiguity, correctness reasoning, verification burden, and actual consequence | Source/path review confirms no classifier or mapping code was introduced; unchanged Resolver regressions support behavior preservation. |
| Reasoning `0` guidance | Prompt contains mechanical, clear-boundary, low-ambiguity wording | No assertion treats `0` as the only valid low-risk workflow class. |
| Reasoning `1` guidance | Generated prompt contains small settled implementation/check and simple state/document reconciliation | Assertion verifies wording that simple mechanical reconciliation may remain `1`, not a model decision. |
| Ordinary Plan/Tasks/independent review usually at least reasoning `2` | Stable prompt assertion names all three and the usual minimum | Adjacent assertion says this is not hard-coded by Skill, document type, or planning/review phase. |
| Reasoning `3` guidance | Prompt assertion covers architecture, security, migration, authority conflict, complex root cause, and unusually difficult uncertainty in final review | Assertion states `3` is not an upper bound. |
| Any finite non-negative integer remains legal | Prompt and Spec state 0..3 is common guidance, not a protocol range/cap | Unchanged protocol regression continues finite non-negative integer validation. |
| Impact `0` | Prompt contains local, reversible, no external impact | No reasoning value is inferred. |
| Impact `1` | Prompt contains bounded single-module consequence | No document/phase inference. |
| Impact `2` | Prompt contains cross-module or material behavior/compatibility consequence | No reasoning value is inferred. |
| Impact `3` | Prompt contains high consequence, difficult reversal, or security/data/external-system risk | `3` remains guidance, not a cap. |
| Planning/review does not automatically raise impact | Direct stable prompt assertion | No planning/review-to-impact mapping appears in source or authority diff. |
| Resolver least-sufficient selection is unchanged | Existing Extension registration/forwarding assertions and unchanged `tests/protocol.test.ts` pass | No diff in schema, `src/protocol.ts`, protocol test, Registry, config, settings, or backend paths. |
| Four authority owners remain aligned | Same-byte review of both PRDs and both Specs | ADR inventory shows no actual conflict; otherwise stop rather than edit. |
| Six-path scope is preserved | Final changed-path inventory equals the authorized set for T1-T2 | Lockfile/manifests stable; index empty; no other worktree changed. |

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Examples become a hidden phase or artifact taxonomy | Pair every usual-level example with the fresh-judgment and no-Skill/document/phase rule; test both clauses. |
| The two axes are accidentally collapsed | State independence and prohibited combined forms explicitly in authority and prompt; add a stable negative contract assertion. |
| Prompt wording drifts from accepted authority | Complete T1 consistency checks before T2 under the single accepted tuple; review same-byte semantics across all five wording surfaces. |
| Scope expands into Resolver/schema/config behavior | Enforce the six-path list and unchanged protocol regression; stop on evidence that behavior must change. |
| Tests overfit prose or simulate a classifier | Assert short contract-bearing phrases in the existing prompt test; do not snapshot the full prompt or feed classification cases to runtime logic. |
| Isolated worktree dependency failure obscures regressions | Use tracked `bun.lock` to materialize existing dependencies at T0, prove no tracked drift, and rerun baseline before changes. |
| Parallel work or main drift contaminates the candidate | Recheck all worktrees at T0 and main/merge order at T5; never absorb `session-open` or `todo-multi-expand` paths. |
| Lifecycle text falsely authorizes or claims completion | Record accepted planning and completed Tasks derivation separately from pending final review and the **historical pre-acceptance state described as unauthorized/unimplemented execution**; reconcile only from actual acceptance and verification evidence. |

## Rollback and compatibility

The implementation is prose plus prompt-contract assertions and introduces no state or migration. If verification or review fails, revert the synchronized six-path candidate as one compatibility unit rather than retaining mismatched authority and prompt wording. Do not add fallback logic, mixed guidance versions, or Resolver compatibility behavior.

No live Pi reload, backend execution, automatic classification, settings mutation, or deployment claim is required. Package tests and exact source/authority review are the relevant evidence because the runtime selection interface and Resolver behavior do not change.

## Completion criteria

The work is complete only when:

- the exact guidance contract is synchronized across both PRDs, both Specs, and `routerPrompt`;
- the existing Extension prompt-contract test covers every required reasoning/impact distinction and prohibition;
- focused Extension, unchanged protocol, full package, and typecheck gates pass after locked dependency materialization;
- the changed-path boundary, links, diff check, lockfile stability, and empty index are verified;
- an independent same-byte correctness/evidence review returns GO with P0-P3 all zero;
- lifecycle artifacts truthfully reconcile acceptance and implementation evidence; and
- Resolver selection behavior, schema, protocol, configuration, settings, Registry, backend, ADRs, other Works, other worktrees, and Git history remain unchanged.

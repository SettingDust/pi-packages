# Waves: Router Cleanup and Todo Explicit Removal

- [Work](work.md) | [Plan](plan.md) | [Context](context.md)
- State: **Source delivery complete; independent source review passed.** The adopted cleanup review supports `I-RTR`, `I-REMOVE`, `I-RESTORE`, `I-CONSUMERS`, `I-REVIEW` and source gates `W0`–`W3`; see [delivery evidence](context.md#delivery-evidence). This records existing evidence, not a new release decision or live acceptance.

This is the sole executable graph for the selected **source delivery and independent review** scope. Plan explains scope, strategy, authority, and acceptance; it is not a second execution graph. Actual provider/Host acceptance and real Router model acceptance are distinct additional boundaries outside this selected graph, retained in [Plan](plan.md#additional-runtime-acceptance). Their absence cannot block source delivery or become a live-conformance claim.

Preparation history: the former prepared/no-Result state is superseded by the delivery evidence above. The following admission and release rules remain the graph contract; they are not a renewed confirmation request for the completed scope.

## Admission and release rules

- Before any item runs, the Router must substantively disclose this selected scope and obtain explicit current-user implementation confirmation. Prepared files, accepted authority, a Handoff, and successful Resolver admission do not grant confirmation.
- Every item has one Handler invocation and one Result for its single observable completion predicate. Suggested domain Skills below are method inputs, not delegations performed by this document. `delegation-strategy` is read/edited as a source input in `I-RTR`, never selected as a Handler method or used by a Handler to coordinate.
- Only a full safely correlated `completed` Result with the required evidence satisfies an item predicate. `partial`, `failed`, `blocked`, missing/unadoptable Results, and insufficient evidence leave that predicate unsatisfied. Router projection precedes gate judgment.
- Each gate requires every listed item predicate plus its stated release checks. A gate releases only explicit dependents. Item prerequisites and containing-Wave predecessor gates are both required. Display order/Wave numbering creates no implicit dependency, global barrier, or scheduler.
- Write, ownership, enum, test, behavioral-contract, authority, and side-effect conflicts serialize against current bytes. Shared read-only inputs do not conflict. Background overlap additionally requires the effective tool contract and resources; otherwise serialize.
- No item changes authority, dependencies/locks, settings, package registration metadata, Handler definitions, Resolver implementation, other Skills, or historical Tasks. No install/reload/deploy/live run, staging/commit/push, current Todo cleanup, or evidence deletion is included.
- In-scope repair stays in its owning item, receives fresh checks and a full Result, and invalidates affected downstream evidence for changed bytes. The Router obtains a fresh independent review after repair. Substantive scope/authority changes require disclosure and the applicable confirmation, not silent expansion.

## Wave W0: Router cleanup coordination

- **Wave ID:** `W0`
- **Incremental outcome:** Source instructions and their acceptance checks express the complete provider-neutral Router cleanup lifecycle.
- **Items:** `I-RTR`
- **Predecessor Wave gates:** none
- **Release predicate:** `I-RTR` has a completed Result and passing focused instruction/type checks. Compare prompt and strategy against all T1–T16 coverage below; verify required ordering and prohibitions and retain the static-versus-model limitation. Releases only the corresponding prerequisites of `I-REVIEW`.

### I-RTR — Router prompt, strategy, and instruction acceptance

- **Method:** One Handler; primary Skill `implement-change`, companion `llm-instruction-writing`; one Result.
- **Scope/effects:** Revise only the cleanup-related Router prompt and Router-only coordination method and their focused checks. Preserve existing confirmation, admission, full-Result retrieval, semantic projection, item/Wave judgment, and backend limits.
- **Completion predicate:** Both instruction surfaces consistently require active cleanup inspection after applying a complete correlated terminal Result and completing relevant gate/dependency judgment, before handoff/wait/stop/final report; require qualification, current-role closure, actual capability inspection, stable targeting, atomic/lossless mutation and return verification; and conservatively retain/report all unsafe cases under T1–T16. Truthful partial/failed/blocked Results remain distinct and unresolved records remain protected; cleanup never establishes dependent completion.
- **Prerequisite item IDs:** none
- **Write ownership:** `packages/pi-harness/extensions/pi-harness.ts` (Router cleanup prompt only); `packages/pi-harness/skills/delegation-strategy/SKILL.md`; `packages/pi-harness/tests/extension.test.ts`; `packages/pi-harness/tests/skills.test.ts` (cleanup-related instruction checks only).
- **Conflicts:** Same-file or Router-contract instruction edits serialize. No Todo source, Resolver/schema redesign, Agent, authority, or public-package-document edits. Independent of `I-REMOVE` by ownership and provider-neutral contract.
- **Internal steps:** Integrate the checkpoint into Phase 4 and strategy Result-progression guidance; preserve pre-handoff/wait/stop/report and cancellation/effects ordering; express actual-tool proof and uncertainty rules without a mandatory tool name/package; add focused positive/negative and ordering assertions covering T1–T16.
- **Required evidence:** Changed-path inventory; authority-to-clause/assertion mapping; actual commands/results for `bun test packages/pi-harness/tests/extension.test.ts packages/pi-harness/tests/skills.test.ts` and `bun run --cwd packages/pi-harness typecheck`; whitespace/scope checks. Assertions establish wording/order only, not actual classification, deletion, coordination, or model behavior.
- **Result consumers:** `I-REVIEW`; later separately authorized real Router acceptance.

## Wave W1: Todo complete explicit data operation

- **Wave ID:** `W1`
- **Incremental outcome:** A strict fifth data operation runs through the existing coordinator with complete independent snapshots and no legacy action widening.
- **Items:** `I-REMOVE`
- **Predecessor Wave gates:** none
- **Release predicate:** `I-REMOVE` has a completed Result, passing schema/state/queued-operation/registration/legacy-guard evidence, and a package typecheck. Verify the all-status operation, full-batch atomic failure, survivor preservation, result shape, five registered strict tools, unchanged four-tool behavior, and legacy four-action guard. Releases `W2` and the corresponding prerequisite of `I-REVIEW`. This is not deployable integrated acceptance before `W2`.

### I-REMOVE — Todo strict removal operation and queue publication

- **Method:** One Handler; primary Skill `implement-change`; one Result.
- **Scope/effects:** Add canonical result/type and request types/schema, parser/candidate construction, coordinator method, registration/description, call/result handling and focused operation checks. As a necessary compatibility guard when expanding `TODO_RESULTS`, decouple the legacy four-action allowlist in persistence; do not add canonical removal restore until `I-RESTORE`.
- **Completion predicate:** The registered `todo_remove` accepts only `{removals}` with at least one strict disjoint `{task,todo}` or `{task}` selection; implements the specified validation precedence and exact case-sensitive matching without fuzzy lookup; atomically removes the complete valid batch in invocation order against latest committed state; preserves every survivor's fields/order/status and local empty groups; returns cloned complete `{result:"remove",snapshot:{tasks}}`; publishes once on success, never on failure, and recovers the queue after rejection without changing the four existing tools or accepting legacy `todo` action `remove`.
- **Prerequisite item IDs:** none
- **Write ownership:** `packages/todo/src/types.ts`; `packages/todo/src/schema.ts`; `packages/todo/src/state.ts`; `packages/todo/src/tool.ts`; `packages/todo/src/persistence.ts` (legacy action guard only); `packages/todo/test/schema.test.ts`; `packages/todo/test/state.test.ts`; `packages/todo/test/index.test.ts` (operation/registration/rendering/queue checks); `packages/todo/test/persistence.test.ts` (legacy guard regressions only).
- **Conflicts:** `TODO_RESULTS`, `tool.ts`, `persistence.ts`, and both shared test files are serialized before `I-RESTORE` and `I-CONSUMERS`; no competing writer or overlap by test section. Canonical checkpoint integration is explicitly deferred; no installation/activation may expose the intermediate candidate. No consumer source or public-document writes here.
- **Internal steps:** Reuse strict-object/text validation and clone/canonical candidate construction; validate state, then all request shape/text in request order, then all duplicates/overlaps, then full request-ordered existence (task before todo), then candidate invariants; register through the existing queue/commit/error/render path; protect the legacy allowlist when extending the canonical enum; add the smallest focused tests of these checks and non-target behavior.
- **Required evidence:** Schema/runtime agreement; current-state-before-request, shape/text-before-duplicate, duplicate/overlap-before-existence, and ordered-existence mixed-invalid tests; no payload leakage or success snapshot on errors. Test all four statuses, same todo name in different groups, delimiter-containing names, local last-todo removal, unselected empty groups, explicit empty/populated/all-group deletion, clone independence, null/supplied-null-todo/unknown `force` or `status`/untrimmed/empty/non-string input, duplicate pairs/groups and overlaps in both orders, valid-then-invalid atomic failure, latest-state lookup after earlier queued add/transition/remove, one/zero projection publications, later valid operation, exactly five registrations, native call/result partial/error rendering, and all four existing behaviors. Commands: `bun --cwd=packages/todo run test --no-cache --configLoader runner test/schema.test.ts test/state.test.ts test/index.test.ts test/persistence.test.ts`; `bun --cwd=packages/todo run typecheck`; changed-boundary whitespace/scope checks. No provider invocation is performed against current user Todo state.
- **Result consumers:** `I-RESTORE`, `I-CONSUMERS`, `I-REVIEW`.

## Wave W2: recovery and presentation lifecycle

- **Wave ID:** `W2`
- **Incremental outcome:** Removal checkpoints, complete-snapshot consumers, and public claims match the operation without non-target behavior drift.
- **Items:** `I-RESTORE`, `I-CONSUMERS`
- **Predecessor Wave gates:** `W1`
- **Release predicate:** Both items have completed Results with their listed evidence and a Todo package typecheck. Verify that canonical recovery recognizes `remove` without legacy widening, consumer regressions cover actual remaining snapshots/lifecycle, and README/current CHANGELOG match the contract. Releases the corresponding prerequisites of `I-REVIEW`; no live acceptance follows.

### I-RESTORE — Todo canonical removal checkpoint recovery

- **Method:** One Handler; primary Skill `implement-change`; one Result.
- **Scope/effects:** Extend only canonical tool/result recognition to `todo_remove`/`remove` and its existing current-branch recovery path; preserve the explicit legacy guard from `I-REMOVE`. Add restore and Host-recorded replay regressions in existing tests.
- **Completion predicate:** Complete canonical `todo_remove`/`remove` checkpoints with strict `{result,snapshot}` details and boolean `isError:false` restore all remaining fields/order/status, retained empty groups or `{tasks:[]}` as independent cloned state; malformed/incomplete/error/mismatched/extra-field/missing-or-non-boolean-false `isError` candidates diagnose without payload leakage and fall back; all four previous canonical pairs and exactly four legacy actions remain valid, legacy `remove` remains invalid, and execute return is never claimed as Host append acknowledgement.
- **Prerequisite item IDs:** `I-REMOVE`
- **Write ownership:** `packages/todo/src/persistence.ts`; `packages/todo/test/persistence.test.ts`; `packages/todo/test/index.test.ts` (restore/replay regressions). These files are shared with `I-REMOVE` and must be edited only after its completed Result.
- **Conflicts:** No changes to `types.ts`, `schema.ts`, `state.ts`, `tool.ts`, consumer sources/tests, or public docs. Same-file recovery writers serialize. Shared source/enum inputs from the completed operation are read-only.
- **Internal steps:** Add the canonical pair and let existing branch scanning, discrimination and cloning handle the full snapshot; prove newest eligible checkpoint/fallback using Host-recorded branch fixtures and current SessionManager test patterns; verify restored snapshot isolation and four-action legacy rejection.
- **Required evidence:** Retained mixed-status and empty-group/all-group removal checkpoints; invalid-newer fallback and non-payload diagnostics; all old canonical pairs and four legacy actions; clone isolation; recorded replay tests distinguish explicit Host recording from `execute` returns. Commands: `bun --cwd=packages/todo run test --no-cache --configLoader runner test/persistence.test.ts test/index.test.ts`; `bun --cwd=packages/todo run typecheck`; boundary whitespace/scope checks. Test use of Host APIs/fixtures is source verification, not live loaded-byte or persistence durability proof.
- **Result consumers:** `I-REVIEW`; later separately authorized provider/Host acceptance.

### I-CONSUMERS — Todo post-removal projection and public contract

- **Method:** One Handler; primary Skill `implement-change`; one Result.
- **Scope/effects:** Establish coherent post-removal snapshots across visibility, native result rendering, widget refresh and lifecycle, and ordinary public guidance. Existing generic behavior is reused; do not source-edit a consumer when a regression check suffices. Public synchronization is part of this same provider-visible removal contract, not a separate redesign or release.
- **Completion predicate:** `remove` is recognized by the helper's `all` policy and hidden by `set-only`/`none`; unknown/missing results stay hidden; native results render only the complete post-removal state with preserved partial/error behavior; widget refresh preserves surviving exact-name expansion, discards removed expansion, updates counts/representatives/details, retains empty headers when visible, retires stale input listeners, and preserves viewport/selection, terminal grace/clear and set/restore reset semantics; README/current CHANGELOG accurately describe explicit removal and its caller-owned policy/concurrency/downgrade limits.
- **Prerequisite item IDs:** `I-REMOVE`, `I-RESTORE`
- **Write ownership:** Tests: `packages/todo/test/visibility.test.ts`, `packages/todo/test/renderer.test.ts`, `packages/todo/test/widget.test.ts`, coordinator widget regressions in `packages/todo/test/index.test.ts`. Ordinary docs: `packages/todo/README.md`, `packages/todo/CHANGELOG.md` (current/unreleased claims only). Conditional source corrections if required by focused evidence: `packages/todo/src/visibility.ts`, `packages/todo/src/renderer.ts`, `packages/todo/src/widget.ts`, `packages/todo/src/widget-component.ts`. No planned write to `widget-layout.ts`, format/reminder/settings/detail-overlay or their tests; they are regression inputs. If a defect needs those additional writes, record the finding and reconcile ownership/scope at the Router before dispatch, never silently widen this item.
- **Conflicts:** No operation, enum, or persistence-source writes. Shared `test/index.test.ts` writes require serialization after the completed `I-RESTORE` Result (which already follows `I-REMOVE`); do not overlap by test section. Overlapping consumer writers also serialize. Native rendering is not gated by the compatibility visibility helper; do not reintroduce hiding or redesign.
- **Internal steps:** Feed complete post-removal snapshots into existing generic renderer/layout/refresh; add focused helper/renderer/widget regressions and only required consumer fixes; synchronize five-tool list and removal semantics/concurrency/downgrade wording in README/current CHANGELOG while preserving historical entries and unrelated inline-presentation claims.
- **Required evidence:** Visibility remove/unknown policies; collapsed/expanded/empty/error/partial complete-snapshot native results; name-based surviving expansion after a preceding group is removed, removed-name re-add does not inherit expansion, retained empty headers, recomputed counts/rows, selection/viewport reachability, stale listener teardown/reentry, terminal-only five-second grace and immediate clear with no todos, complete set/restore reset. Read regression inputs for reminder/compaction/settings/non-target layout. Commands: `bun --cwd=packages/todo run test --no-cache --configLoader runner test/visibility.test.ts test/renderer.test.ts test/widget.test.ts test/index.test.ts`; `bun --cwd=packages/todo run typecheck`; public-contract/whitespace/scope checks. Source generic renderer/widget files remain unchanged when these checks already hold.
- **Result consumers:** `I-REVIEW`; later separately authorized provider/Host acceptance.

## Wave W3: independent source delivery review

- **Wave ID:** `W3`
- **Incremental outcome:** Independent read-only evidence evaluates the full source candidate and all source Results against authority and the confirmed selected scope, without a live-conformance claim.
- **Items:** `I-REVIEW`
- **Predecessor Wave gates:** `W0`, `W1`, `W2`
- **Release predicate:** `I-REVIEW` has a completed Result after reading every prerequisite Result in full and current relevant bytes. Its conformance and evidence assessment has no unresolved blocking source defect; source checks, scope/ownership, T1–T16/Section 11 coverage, graph and compatibility checks pass. A completed review with blocking findings establishes a review fact but does not release source delivery. Actual runtime/model acceptance remains unverified until its distinct checks pass.

### I-REVIEW — Independent read-only source and evidence assessment

- **Method:** One independent Handler; primary Skill `review-correctness`, companion `review-evidence`; one Result. It must not be the implementer of the candidate it reviews.
- **Scope/effects:** Read the accepted PRD/ADR/Specs, tuple, four prerequisite Results, changed candidate files and focused test outputs; independently reproduce the smallest integration checks on the same reviewed bytes. Report conformance, findings, compatibility and evidence limitations; make no repair or new artifact.
- **Completion predicate:** An independent assessment accurately determines whether the full source candidate satisfies the confirmed scope and accepted contract, verifies the legacy boundary, caller-policy separation, survivor/atomicity/consumer regressions and instruction coverage, and records reproducible evidence and any remaining source/live limitations without conflation or waiver.
- **Prerequisite item IDs:** `I-RTR`, `I-REMOVE`, `I-RESTORE`, `I-CONSUMERS`
- **Write ownership:** none; one Result contains the report. No `review.md`, authority, implementation, test, Work, dependency, lockfile, Git, runtime-state or evidence writes.
- **Conflicts:** Wait for real full completed prerequisite Results and current candidate bytes, not placeholder summaries or terminal backend state. Candidate changes invalidate relevant same-byte review evidence and require refreshed verification/review. Read-only test execution must avoid installs and repository output writes.
- **Required evidence:** Exact reviewed-path/byte identification in the Result (no new manifest); full Result provenance and reported command/results; smallest combined source checks across the changed Harness instruction tests and Todo schema/state/index/persistence/visibility/renderer/widget files with no-cache existing loader; both package typechecks; tuple/link/unique-ID/DAG/gate checks; source ownership/scope/whitespace checks; requirement coverage and limitations. No full suite, LSP result, live run, or host version claim unless actually checked.
- **Result consumers:** Router judges source delivery under `W3`; future independently authorized runtime acceptance uses the source Results/review but cannot reinterpret them as live acceptance.

## Authority coverage

The [Router Spec cleanup scenarios](../../spec/router-delegation.md#todo-cleanup-acceptance-scenarios) define actual behavioral acceptance, not present verification. `I-RTR` owns all static instruction checks; `I-REVIEW` checks their sufficiency. The distinct real-model boundary in Plan must later exercise the behaviors, including a differently named equivalent provider without Router name/package coupling.

| Scenario | Required static instruction and later real-model evidence |
| --- | --- |
| T1 | Active check after complete Result application and gate judgment, before each handoff/wait/stop/final-report boundary; execute only with qualified stable targets and proven capability. |
| T2 | Summary/backend status/missing/incomplete/conflicting/unapplied Result cannot justify deletion, completion, or dependency release. |
| T3 | Current verification/repair/review/user decision/coordination duty protects the record even if native status is completed. |
| T4 | Explicit closure or handoff of current role with retained evidence precedes final requalification/deletion/report. |
| T5 | Exact local/set deletion preserves every survivor field/order/status and active/unresolved/current records. |
| T6 | Group container and each child independently qualify; completed children do not suffice. |
| T7 | Proven whole-group operation preserves other groups; full clear requires every record/container to qualify and no survivors. |
| T8 | Inspect actually callable schema/description/known contract; existing exact-selection, stable-ID, safe-filter or single atomic lossless replacement capabilities under any name/provider may qualify. Package installation/name proves nothing; no new identity mechanism is introduced. |
| T9 | Tool accepts arbitrary statuses; Router still protects active/unresolved and truthfully closed partial/failed/blocked never releases unsatisfied dependents. |
| T10 | Reject set-then-transition, status rewrites, UI hiding, invented/unavailable tool; retain and explain. |
| T11 | Invalid/mixed targets prove atomic rejection; report failure without automatic retry or success claim. |
| T12 | Guard concurrency, same-name recreation and replacement survivor drift; retain on unsafe/unproven targeting. |
| T13 | Failure/error/missing/unknown return effects cause no automatic retry, reconstruction or success inference; completed work remains completed. |
| T14 | Duplicate/replay causes no repeated projection/release/deletion or deletion of a new same-name record; orphan duplicate needs observable matching/non-canonical identity. |
| T15 | Cancellation/change of direction first accounts for active work and completed effects, then checks cleanup; unlaunched/unresolved work is not automatically qualified. |
| T16 | Completed work and capability/cleanup limitation are separate; preserve Todos and all Results/sessions/manifests/artifacts; never `subagent_remove`. |

[Todo Spec §11](../../../../todo/docs/works/todo-protocol-redesign/spec.md#11-accepted-general-explicit-atomic-local-removal-amendment-implementation-pending) and §§1–5/8 constrain the operation. `I-REMOVE` covers types/schema/state/queue/registration/error precedence and cloning, `I-RESTORE` canonical/legacy/checkpoint lifecycle, `I-CONSUMERS` visibility/renderer/widget/public claims; `I-REVIEW` checks all evidence. Exact all-status deletion is data capability, never Router cleanup permission; a single queued mutation is not a read–qualify–delete transaction.

## Explicit graph and outcome gates

```text
I-RTR    -> I-REVIEW
I-REMOVE -> I-RESTORE -> I-CONSUMERS -> I-REVIEW
I-REMOVE -> I-CONSUMERS
I-REMOVE -> I-REVIEW
I-RESTORE -> I-REVIEW
```

Gate prerequisites: `W0: []`, `W1: []`, `W2: [W1]`, `W3: [W0,W1,W2]`. Item edges are exactly the prerequisite lists above; the diagram includes all direct edges. `W0`/`W1` can progress independently when permitted by the effective backend contract. The Todo lifecycle is serialized as `I-REMOVE -> I-RESTORE -> I-CONSUMERS` for the genuinely shared `test/index.test.ts` ownership, and operation/recovery also share persistence source/tests. This intra-`W2` item dependency does not depend on its own containing Wave gate. The selected Plan source-delivery outcome requires `W0`, `W1`, `W2`, and `W3`; live/provider/model boundaries are not prerequisites of this graph.

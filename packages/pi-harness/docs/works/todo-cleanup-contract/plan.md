# Plan: Router Cleanup and Todo Explicit Removal

- [Work](work.md) | [Waves](waves.md) | [Context](context.md)
- Status: **Source delivery and independent source review complete; live model/provider/Host acceptance, reload and installed-runtime freshness remain unverified.** See [current evidence](context.md#delivery-evidence).

## 1. Decision and authority

Prepare one implementation scope from the accepted Router cleanup contract and the accepted Todo explicit atomic-removal contract. The Router owns workflow eligibility, cleanup proof, callable-capability selection, Result correlation, gate/dependency judgment, and retention on uncertainty. The Todo package owns strict data validation, queued mutation, atomic candidate publication, projections, and checkpoint recovery. The Resolver does not choose cleanup tools or interpret business Results, and the Router does not depend on a fixed Todo package or tool name.

This Plan derives from:

- [Router Delegation PRD](../../prd/router-delegation.md)
- [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md)
- [Router Delegation Spec](../../spec/router-delegation.md)
- [Todo Multi-Tool Protocol Spec](../../../../todo/docs/works/todo-protocol-redesign/spec.md)

Preparation history: accepted authority was sufficient for planning but did not itself confirm the scope; Router disclosure and current-user confirmation were required before implementation. That preparation-stage pending state is superseded by the completed source delivery and adopted independent review recorded in Context; this text grants no new authorization.

## 2. Intended outcome

Deliver a source and focused-evidence candidate in which:

1. Router instructions perform an active, conservative cleanup check at the required lifecycle boundaries, using the actual current tool contract and preserving work and evidence whenever eligibility, target stability, atomicity, or return evidence is unproven.
2. Todo exposes a strict fifth canonical `todo_remove` operation that removes exact todos or explicitly selected groups, accepts every status, preserves every survivor, commits one queued mutation atomically, and returns a complete post-removal snapshot.
3. Todo recovery recognizes the canonical removal checkpoint while retaining the legacy four-action boundary and existing branch scan, cloning, diagnostic, and fallback behavior.
4. Todo visibility, renderer, widget, registration, tests, README, and CHANGELOG remain coherent with the new result and preserved non-target behavior.
5. Independent source review assesses complete implementation Results and candidate bytes, while actual provider/Host and Router model acceptance remain separate additional boundaries. Missing live evidence does not block source delivery or permit a false runtime claim.

The sole executable decomposition is [waves.md](waves.md). This Plan does not repeat item steps or create a second task graph.

## 3. Scope and ownership boundaries

### Router cleanup coordination

The Router branch owns the generated prompt in `packages/pi-harness/extensions/pi-harness.ts`, Router-only method guidance in `packages/pi-harness/skills/delegation-strategy/SKILL.md`, and their focused acceptance checks in `packages/pi-harness/tests/extension.test.ts` and `packages/pi-harness/tests/skills.test.ts`.

The behavior must cover the accepted T1–T16 contract: cleanup follows a complete correlated terminal Result and relevant gate/dependency judgment; current, active, unresolved, identity-uncertain, dependency-required, unstable, or capability-uncertain records remain visible with a concrete limitation; the Router inspects real callable schema/description/contract; exact local, group, and full-clear conditions are respected; survivors retain fields/order/status; failed or unknown mutation effects are not retried or declared successful; duplicate/replay signals cannot delete a same-name recreation; and `subagent_remove`, package hardcoding, status rewriting, UI hiding, replacement reconstruction, scheduler, registry, receipt, IDs, revision/CAS, and automatic terminal deletion remain excluded.

Existing equivalent provider capabilities remain eligible: exact selection, existing stable IDs, safe filters, or a single atomic lossless replacement may qualify when the actual callable contract proves safe targeting and preservation of every survivor field/order/status. No new IDs or capabilities are created here. The reconstruction prohibition covers unsafe/lossy replacement and compensating reconstruction after uncertain effects, not T8's proven single atomic lossless replacement.

These checks establish instruction and schema wording only. They do not establish a real Router model trace.

### Todo explicit operation

The operation branch owns the canonical result/type, strict request schema, parser and candidate construction, coordinator queue and publication, registration, and operation-level tests. Its source boundary is `packages/todo/src/types.ts`, `src/schema.ts`, `src/state.ts`, and the operation portions of `src/tool.ts`; its focused checks are the schema/state tests and the operation/registration portions of `test/index.test.ts`. Extending the shared canonical enum must simultaneously pin the existing four-action legacy allowlist in `src/persistence.ts` with a focused regression in `test/persistence.test.ts`; this is an invariant of the enum change, not the later canonical checkpoint recovery outcome.

It must preserve all four existing tools and their errors while adding strict `{removals}` validation, disjoint local/group selection, source-order error precedence, latest committed-state lookup at queued execution, one commit and projection publication per successful batch, no publication on failure, full snapshot results, cloned candidate/snapshot data, retained empty groups after local deletion, explicit group-only deletion, all-status removability, and no caller policy about completion or dependency state.

### Todo recovery lifecycle

The recovery branch owns `packages/todo/src/persistence.ts`, `test/persistence.test.ts`, and recovery/replay checks in `test/index.test.ts`. It depends on the completed operation Result and is serialized after it because all three recovery paths overlap the enum-change compatibility guard and operation checks. It extends only the canonical tool/result map and preserves the already protected legacy boundary.

It must accept only complete successful canonical `todo_remove`/`remove` records, preserve all earlier canonical pairs, retain exactly the four legacy `todo` actions, reject legacy `remove`, clone restored state, and continue scanning after malformed, incomplete, failed, mismatched, extra-field, invalid snapshot, or non-boolean-false candidates with non-payload diagnostics.

### Todo consumer and public surfaces

The consumer branch owns focused checks in `packages/todo/test/visibility.test.ts`, `test/renderer.test.ts`, `test/widget.test.ts`, and coordinator widget checks in `test/index.test.ts`, plus `README.md` and current/unreleased `CHANGELOG.md` removal claims. The current visibility helper derives recognition from `TODO_RESULTS`, renderer consumes snapshots generically, and widget refresh already transfers expansion by exact surviving name; no source change to these consumers is assumed. If a focused removal-specific failure requires a correction, ownership is bounded to `src/visibility.ts`, `src/renderer.ts`, `src/widget.ts`, or `src/widget-component.ts`. `src/widget-layout.ts`, format/reminder/cadence/settings/detail-overlay and their tests are read-only regression inputs. Other necessary writes require Router reconciliation, not silent scope expansion.

The branch must show that `remove` is handled by visibility policy, removal snapshots render as complete surviving state, widget refresh keeps surviving expansion by exact task name and retires removed listeners, retained empty groups remain visible when applicable, counts and representative/detail rows update, and existing placement, terminal-clear, viewport, selection, reset, reminder, compaction, and settings behavior remains intact. Public documentation must describe explicit removal and caller-owned cleanup without implying automatic pruning. Because coordinator widget checks share `test/index.test.ts`, this branch follows the completed recovery Result; all three Todo items are serialized on genuine shared-file ownership.

### Additional runtime acceptance

Actual Todo provider/Host acceptance and real Router model acceptance remain two independently observable verification outcomes outside this selected source graph. This Plan records their acceptance conditions, without adding executable items, a second graph, live authorization, or a required install/reload route. They would require distinct future Handler Results and suitable explicit scope/authority from the Router; they cannot be bundled into one Handler outcome.

| Boundary | Evidence required before a runtime claim | Prerequisite/limitation |
| --- | --- | --- |
| Actual Todo provider/Host | Freshly loaded five-tool registration and complete tool Results; valid mixed-status local/group/all-group deletion and atomic invalid-batch rejection; survivor field/order/status equality; actual Host-recorded removal checkpoint and branch restore; relevant native rendering/widget refresh, name-based surviving expansion, listener retirement, no-todo clear and terminal grace observations. | Source candidate and source review, observed Host/provider loaded-byte identity, disposable session/state, and authorized runtime execution. Execute return alone is not Host append/persistence acknowledgement; no power-loss/future-version claim. |
| Real Router model | Real conversation/tool trace for T1–T16: full correlated Result reading, projection and gate/dependency judgment, current role protection/closure, concrete target qualification, actual callable schema/description/contract inspection, atomic exact deletion and survivor preservation, group/full-clear qualification, status-independent capability versus caller policy, concurrency/same-name/replay safeguards, failure/unknown-return retention, and concrete capability-gap reporting. Include a differently named equivalent provider to establish selection freedom. | Confirmed source scope is not runtime authorization. Requires actually available model/backend/loaded prompt/Skill and safe disposable coordination state. Tool-only scripts, synthetic action sequences and passing static assertions do not establish Router model behavior. |

If capability, stable targeting, loaded bytes, or permission is unavailable, report the concrete missing prerequisite and leave that runtime outcome unverified. Source completion still uses the selected graph's independent review. Existing source checks cannot satisfy either runtime boundary, and a real run must not mutate current user Todos, delete evidence, or silently install/reload/deploy. Later changes to these runtime effects require their own disclosure/authorization.

## 4. Compatibility, transition, and rollback

The key compatibility boundary is the shared canonical result enumeration versus the legacy `todo` checkpoint action enumeration. The implementation must use separate explicit recognition so adding canonical `remove` cannot make legacy `action: "remove"` valid.

The Todo removal operation is caller-neutral. It must not encode Router cleanup eligibility, reject pending/in-progress records, infer stale work, or create a cross-call transaction. A caller that cannot prove stable targeting or a safe atomic capability retains the record. Older readers may skip an unrecognized removal checkpoint and fall back according to the accepted Spec; no downgrade promise is added.

No rollback is executed or Git/release authority granted by this graph. If later authorized, rollback must restore a mutually coherent operation/result enum, canonical/legacy checkpoint recognition, consumers, tests and public claims, not revert one shared surface in isolation. A four-tool reader can skip removal checkpoints and restore older deleted records; that accepted downgrade limitation must be disclosed before any such rollback. No migration, dependency, lockfile, receipt or runtime rollback mechanism is introduced.

## 5. Verification and completion

The Router must evaluate item prerequisites, containing Wave gates, write conflicts, current authority, and confirmation before dispatch. Each item returns one complete Handler Result. Only a `completed` Result with its required evidence satisfies an item predicate; `partial`, `failed`, `blocked`, missing, malformed, or insufficient evidence leaves dependent gates unsatisfied.

Source delivery requires `W0`, `W1`, `W2`, and `W3` in [Waves](waves.md): four implementation Results followed by one independent read-only source review. Every gate requires completed item Results plus its verification; a completed review with unresolved blocking source findings does not release delivery. No actual provider/Host or real Router model run is an item prerequisite in this graph. The selected outcome is source delivery with focused evidence and a truthful runtime limitation, not full runtime acceptance. The Router must disclose that completion boundary before confirmation.

The smallest focused source checks are the targeted existing tests and both package typechecks. The final independent review consumes all full prerequisite Results and checks the combined changed test set on current candidate bytes. No dependency installation or repository-generated output is permitted. Whitespace/scope checks may use read-only `git diff --check` only if the later execution boundary permits Git reads; otherwise use equivalent file checks. Full suites are justified only by a failure or existing repository requirement. Runtime commands/versions and LSP findings are reported only if actually observed; the original preparation ran document checks only. The subsequent source delivery and independent review passed the focused checks recorded in Context; this status reconciliation does not rerun them.

## 6. Risks and material decisions

- **False Router capability assumption:** tool names, package installation, source code, or remembered conventions do not prove callable atomic lossless deletion. Mitigation: inspect the actual schema, description, and contract at runtime; retain on gaps.
- **Legacy compatibility leak:** adding `remove` to `TODO_RESULTS` can accidentally widen legacy restore. Mitigation: an explicit legacy four-action list and tests for legacy `remove` rejection.
- **Non-transactional caller boundary:** separate read/eligibility/delete calls can race with deletion or same-name recreation. Mitigation: require stable targeting or an existing atomic identity/state check; do not invent IDs, locks, CAS, or receipts.
- **Projection regression:** deletion can reset surviving widget state or expose removed records. Mitigation: name-based refresh tests, complete post-removal render checks, listener teardown checks, and regression coverage for empty/terminal groups.
- **Evidence overclaim:** static checks or one tool mutation can be mistaken for model behavior. Mitigation: retain distinct additional provider/Host and real Router acceptance boundaries; independent `W3` source review reports them as unverified without blocking source delivery.
- **Scope drift:** shared enum/test files can pull unrelated cleanup into the change. Mitigation: the Waves ownership table, explicit test-file serialization, and independent final review.

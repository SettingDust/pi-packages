# Waves: Router Standalone/Planned Admission and Skill-Owned Preparation

- [Work](work.md) | [Plan](plan.md)

This is the sole executable graph for the bounded source-and-instruction implementation described by [Plan](plan.md). IDs are stable and retained from the predecessor graph because the three-result decomposition remains coherent. The original preparation executed no item; its then-unsatisfied Result/gate snapshot is superseded by the adopted delivery status in [Work current status](work.md#current-delivery-status). Graph and gate definitions below are unchanged, and end-to-end live acceptance remains unverified. Display order, status text, document readiness, and Resolver admission do not create dependencies or confirmation.

## Explicit graph

```yaml
waves:
  - {id: W-RUNTIME, items: [PREP-RUNTIME], predecessorGates: []}
  - {id: W-COORDINATION, items: [PREP-COORDINATION], predecessorGates: [W-RUNTIME]}
  - {id: W-VERIFY, items: [PREP-VERIFY], predecessorGates: [W-COORDINATION]}
items:
  - {id: PREP-RUNTIME, wave: W-RUNTIME, prerequisites: []}
  - {id: PREP-COORDINATION, wave: W-COORDINATION, prerequisites: [PREP-RUNTIME]}
  - {id: PREP-VERIFY, wave: W-VERIFY, prerequisites: [PREP-RUNTIME, PREP-COORDINATION]}
```

## Admission, conflicts, and release

Before implementation, the Router must substantively disclose [Plan](plan.md) and obtain explicit current-user confirmation. The renderer-fix writer has ended; the compact-renderer parent is commit `8b5c7956e58b3596e411c93742abdf6a653c05d5`, and the current cold-start renderer repair is signed commit `883996b5ff2e5c231197dc8c6fc9033278fe691b`, verified with `git show`. Preserve its render-only changes and check only for renewed or other conflicting writers before shared extension/test writes. This execution ownership prerequisite is not fabricated as an item or prerequisite Result. Serialize any other ownership, authority, behavioral-contract, or side-effect conflict against the latest bytes. Shared read-only authority inputs do not conflict. No formal loaded-provenance gate is introduced.

Every item has exactly one `handler` invocation and one independently observable Result. A gate releases only its explicit dependents after every member has an adoptable `completed` Result with required evidence and the gate verification passes. The Router retrieves and correlates the full Result and projects its truthful terminal state before evaluating release. `partial`, `failed`, `blocked`, missing, malformed, stale, uncorrelatable, or insufficient evidence leaves the relevant predicate unsatisfied. Item prerequisites and predecessor gates must both hold. Waves is not an automatic scheduler, polling loop, retry engine, approval service, or authorization state.

All items use the accepted [PRD](../../prd/router-delegation.md#preparation-outcome), [ADR](../../adr/0007-authority-first-router-admission.md#preparation-admission-and-skill-owned-method), [Spec standalone contract](../../spec/router-delegation.md#standalone-admission), [preparation boundary](../../spec/router-delegation.md#preparation-boundary), [P1-P11 scenarios](../../spec/router-delegation.md#preparation-acceptance-scenarios), and [Context](context.md). Later planned invocations must select this Work, Plan, and Waves once each as actual readable refs and use the closed planned tuple. The Router owns semantic authorization, confirmation, classification, and graph readiness; Resolver checks structural legality, readable refs, planned tuple/current bytes, binding, and selected-tool invocation.

| Wave ID | Incremental outcome | Verifiable release predicate |
| --- | --- | --- |
| W-RUNTIME | The renamed/expanded standalone admission works at the closed schema/runtime boundary without weakening planned or existing launch contracts. | `PREP-RUNTIME` is completed with reproducible runtime/schema/dispatch evidence for P1, P2, P4, P8, and P9: only standalone/planned are accepted, old paths do not alias, invalid arrays retain `invalid_atomic_basis`, actual refs retain `invalid_reference`, preparation performs no planned subject/JIT observation, blocked cases launch zero times, and an allowed stub dispatch captures exactly one raw return or error. |
| W-COORDINATION | The existing strategy Skill and Router prompt own standalone/planned classification and preparation boundaries without widening Router/Resolver roles. | `PREP-COORDINATION` is completed with current source and synthetic instruction evidence for P3, P5, P6, P7, P9, P10, and P11, plus preserved P8/runtime checks on the latest shared bytes. Synthetic coverage is explicitly not live authorization, model obedience, backend permission, or bootstrap evidence. |
| W-VERIFY | Independent review supports the complete bounded implementation scope and its evidence limits. | `PREP-VERIFY` is completed only when both predecessor Results are adopted, P1-P11 and retained planned/raw-Result contracts have current evidence, links/tuple/IDs/prerequisites/gates/write scope are valid, focused tests/typecheck pass, and no in-scope violation remains. Review completion alone waives no missing evidence or unresolved finding. |

## PREP-RUNTIME: Implement the closed standalone runtime contract

- **Handler:** `handler`; one Result for the coupled runtime/schema/tests predicate.
- **Objective and effects:** Replace the atomic admission type/branch with standalone, update the registered closed TypeBox union, migrate affected existing fixtures, and add focused checks for validation, reference precedence, direct candidate selection, and exact dispatch. Preserve planned Work/Plan/Waves legality, protected binding, raw evidence, and Handler Result parsing. No semantic authorization classifier or live Handler start.
- **Completion predicate:** Source and focused checks establish the exact standalone/planned shape, precise array and path errors, no planned tuple/subject/JIT requirement for standalone, unchanged actual-reference behavior, and preserved planned/dispatch/Result contracts.
- **Required inputs:** `src/protocol.ts`, `src/admission.ts` read-only, `extensions/pi-harness.ts`, `tests/protocol.test.ts`, `tests/dispatch.test.ts`, `tests/extension.test.ts`, `tests/admission.test.ts`, directly affected settings-store fixtures, accepted authority, and current shared bytes after renderer ownership is clear.
- **Write ownership:** Only `packages/pi-harness/src/protocol.ts`, the admission-schema portion of `extensions/pi-harness.ts`, and directly coupled existing test fixtures/assertions in the named tests. Preserve renderer-only changes and unrelated work.
- **Conflicts and constraints:** Must complete before `PREP-COORDINATION`; serialize all other writers of selected files. No Skill/prompt changes in this item, no `src/admission.ts` change without direct evidence, no authority/Git/runtime effects.
- **Expected artifacts and required evidence:** Focused source/test diff and full Result with actual commands/outcomes. Cover non-empty/whitespace-only/missing/non-array/non-string arrays, unknown/authority/receipt/output-selector fields, `atomic`/`preparation` rejection, ordinary invalid Skill/capability/candidate/delegate/protected bindings, zero calls on blocks, zero planned-subject observations for standalone, exact one allowed stub call, raw returned error versus thrown Error/object/undefined, and existing planned tuple/Tasks/drift/Result regressions.
- **Smallest verification:** Relevant existing protocol/dispatch/extension/admission/settings-store tests and package typecheck. In-memory stubs only; no actual Handler starts. Compare runtime and TypeBox closed alternatives and do not infer permission from a passing test.
- **Result consumer:** `PREP-COORDINATION` and `PREP-VERIFY`, through Router adoption of the complete Result.

## PREP-COORDINATION: Implement Skill-owned preparation routing

- **Handler:** `handler`; one Result for the independently verifiable coordination-instruction predicate.
- **Objective and effects:** Extend the existing Router-only `delegation-strategy` Skill, reconcile the Router prompt, and add focused instruction assertions. Keep Router authorization/confirmation/roles/loading/Result ownership and Resolver validation/binding/single-call/raw-return ownership intact.
- **Completion predicate:** The strategy, Router prompt, and focused assertions consistently express standalone/planned selection, preparation limits, one-outcome decomposition, P1-P11 boundaries, old-path rejection, and the distinction between synthetic instruction coverage and live behavior, without a third path or permission from Skill loading.
- **Required inputs:** Accepted authority, complete `PREP-RUNTIME` Result, latest extension/schema/test bytes, `skills/delegation-strategy/SKILL.md`, Router prompt, `tests/extension.test.ts`, `tests/skills.test.ts`, and the read-only [Handler contract](../../../agents/handler.md).
- **Write ownership:** Only `packages/pi-harness/skills/delegation-strategy/SKILL.md`, the Router prompt portion of `extensions/pi-harness.ts`, and directly coupled instruction assertions in `tests/extension.test.ts` and `tests/skills.test.ts`.
- **Conflicts and constraints:** Consume the latest runtime/schema state after `W-RUNTIME`; preserve renderer and runtime changes. No new coordinator, inline fallback method, strategist Handler, domain Skill/Agent edits, formal loaded-provenance gate, automatic progression, permission from loading, or live launch.
- **Expected artifacts and required evidence:** Scoped Skill/prompt/test diff and full Result with exact source checks and actual test outputs. Classification uses complete effects and authorization, not labels/file counts/tuple availability; actual refs remain required; future outputs are ordinary text/inline context; missing implementation inputs never justify relabeling; authority writing needs permission and settled intent; unavailable strategy blocks; preparation completion does not confirm implementation; unsupported runtime reports a block without fallback or fabricated tuple.
- **Smallest verification:** Existing Skill and generated prompt/schema tests with positive/negative assertions, followed by the Plan's integrated six-file suite and typecheck on the latest shared candidate. Synthetic instruction checks must not be reported as conversation, authorization, or live acceptance.
- **Result consumer:** `PREP-VERIFY`, through full Result adoption and `W-COORDINATION` verification.

## PREP-VERIFY: Independently verify source conformance and evidence

- **Handler:** `handler`; one independent Result for the source/evidence assessment predicate.
- **Objective and effects:** Read both predecessor Results, current owned source/tests, authority, graph, and actual evidence; verify P1-P11, retained planned/binding/single-launch/raw-Result contracts, links, tuple, DAG, and scope; report supported findings and limitations. No repair, document reconciliation, or project artifact write.
- **Completion predicate:** The review provides reproducible current-candidate findings for every mapped obligation, distinguishes executable schema/runtime evidence from synthetic instruction evidence and unverified live behavior, and reports any missing prerequisite or unresolved violation truthfully. A `completed` review with findings does not satisfy the gate while a violation remains unresolved.
- **Required inputs:** Full `PREP-RUNTIME` and `PREP-COORDINATION` Results, current diff/bytes, accepted authority, Work/Context/Plan/Waves, predecessor unsupported-runtime probe, and actual focused test/typecheck output.
- **Write ownership:** None beyond the Handler Result. Read-only inspection only; no new evidence file, test edit, authority/status edit, install/reload, live launch, or Git write.
- **Conflicts and constraints:** Runs only after both predecessor items and `W-COORDINATION`; preserve independent judgment. Never synthesize user confirmation, waive a blocked gate, count static assertions as model obedience, or introduce installed-host provenance as a prerequisite.
- **Expected artifacts and required evidence:** Full Result with inspected paths/diff, P1-P11 correspondence, actual commands and outcomes, exact link/tuple/acyclic-DAG/write-scope checks, findings, and explicit live limitations. Reuse evidence only when its current-candidate correspondence holds; rerun the smallest relevant checks needed for reproducibility.
- **Smallest verification:** Read-only authority/source/evidence comparison plus relevant focused suite/typecheck reproduction. Report authorization, classification, full Result correlation, backend permission, reload, and bootstrap as unverified; any live acceptance is outside this graph.
- **Result consumer:** Router alone; later workflow judgment is outside this item.

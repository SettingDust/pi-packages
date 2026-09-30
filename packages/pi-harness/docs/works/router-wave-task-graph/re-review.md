# Independent re-review — Router Tasks-to-Waves migration

## Findings and verdict

**No new actionable source-correctness defect was established in the inspected migration candidate. F1, F2, and F3 are closed for their originally reported graph, instruction, and lifecycle-document defects.** This review supplies independent review evidence; it does not release Wave gates or attest overall migration acceptance. **Live Router/Resolver/Handler bootstrap: unverified.** Source-level and mocked verification have the limits described below.

| Historical finding | Disposition | Independently inspected repair |
| --- | --- | --- |
| F1 — missing selected-bundle graph contract | **Closed** | [Plan](plan.md) opening links select Work and one distinct Waves target; §5 identifies all four required gates. [Waves](waves.md) links the same Work/Plan, declares W0–W3 IDs, nonempty item sets, predecessor gates and separate release predicates. Every item/consumer reference resolves, including the corrected W0-DOC consumer W1-ROUTER. The combined item/gate dependency graph is acyclic. |
| F2 — Router omits distinct gate readiness | **Closed at the source instruction boundary** | [Router prompt](../../../extensions/pi-harness.ts), `routerPrompt`, lines 168 and 172, now requires pre-resolution reciprocal links, valid IDs/references/acyclic prerequisites, both item readiness and containing-Wave gates, then separate gate verification after full Result retrieval and truthful projection. [Extension tests](../../../tests/extension.test.ts), phase-specific assertions around lines 180–303, cover these clauses and ordering. Actual model/backend execution remains unverified. |
| F3 — preparation-only/Tasks-only current-state claims | **Closed** | [Work](work.md) status, [Plan](plan.md) §§1–2 and 5–6, [Context](context.md) candidate/provenance/verification sections, [Spec](../../spec/router-delegation.md) current implementation qualifications, [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md) Waves amendment and [ADR-0007](../../adr/0007-authority-first-router-admission.md) amendment/Decision distinguish the current source candidate from historical Tasks evidence and unverified live bootstrap. Their pending-review wording describes the state supplied to this review; this artifact records the subsequent assessment without rewriting those inputs. |

The original [review.md](review.md) remains unchanged historical evidence. Closing these findings does not retroactively authenticate predecessor executions, repair historical ownership departures, or imply successful live scheduling.

## Claims and evidence classification

These classifications distinguish direct source facts from conclusions about actual execution. All material **source-repair** claims are supported within the inspected boundary; end-to-end workflow claims remain only partially supported.

| Claim | Classification | Evidence and practical limit |
| --- | --- | --- |
| New planned admission selects Waves and rejects Tasks aliases/fallback | **Supported** for source behavior | `src/protocol.ts:279–282` closes selectors to work/plan/waves; `src/admission.ts:93–103` validates distinct same-directory matching members. Filesystem-backed protocol tests accept matching names, reject old Tasks selectors, missing Waves and malformed tuples, and preserve historical fixture bytes. |
| Canonical identity and current-call validation survive migration | **Supported** | `buildPlannedSubject` in `src/admission.ts:41` and `resolveDelegation` in `src/protocol.ts:165` retain canonical references, document and Handoff identity, duplicate/missing-reference rejection, and final JIT checks. Reproduced tests cover invalid UTF-8, each member's drift, Waves disappearing at JIT, and subject/subject/Registry/return ordering. |
| Selected bundle has explicit consistent gates and no artificial barrier between W0 branches | **Supported** as a document property | Direct graph inspection plus the read-only probe below: five unique items, four unique gates, valid consumers, reciprocal links and an acyclic combined graph. W0-DOC and W0-PROTO have neither mutual dependencies nor predecessor gates. W1 already needs both Results, so its W0 gate adds no unrelated branch barrier. |
| Confirmation remains Router-owned before implementation decomposition | **Partially-supported** as operational behavior | Phase 1 explicitly requires disclosure and confirmation; tests reject model-supplied confirmation fields. The test allowing an unconfirmed document to resolve structurally is intentional: Resolver legality cannot grant authorization. No live confirmation trace was reproduced. |
| Resolve occurs before exact Handler launch | **Partially-supported** | Phase 3 requires exact prompt/model/thinking forwarding and no intervening action. Resolver tests establish current-call legality/order before returning metadata. Extension doubles provide no Handler launch capability; they do not prove a live resolve-to-spawn sequence. |
| One Handler/Result, full retrieval, truthful Todo projection and failure-specific release | **Partially-supported** | Prompt phases 1/2/4 require independent outcomes, full retrieval, truthful terminal projection and separate gate checks. Result parsing tests preserve status/report/artifacts and reject summary-only, malformed/bundled Results and workflow-control fields. Static assertions do not execute backend retrieval, Todo mutation, or gate release. |
| New-plan Skills/discovery consistently select Waves | **Supported** at source/discovery level | Changed planning/documentation Skills, `docs/README.md`, `docs/spec/skill-library.md`, and the passing Skill suite describe sole-graph Waves with historical Tasks compatibility only. Pi discovery checks metadata; they do not attest model compliance. |
| Historical Tasks and lockfiles remain unchanged | **Supported relative to inspected HEAD/worktree** | Tracked changed-path inspection has no historical `tasks.md` or lockfile; the selected Work contains no `tasks.md`. This is not a claim about every earlier session. The changed `documentation-tasks-writing/SKILL.md` is migration guidance, not a historical Tasks record. |
| All historical execution obeyed declared owners and one-Handler boundaries | **Not-reproducible; cannot be certified** | Context explicitly attributes F2 edits to the parent coding session after two blocked Handlers. That account describes a departure from Router-only coordination if the parent was operating as Router. Current source checks cannot convert those edits into a completed W1 Handler Result or authenticate prior per-owner writes. Original full predecessor Results/confirmation and tool traces were not independently reconstructed. |
| Live Waves bootstrap or join-hang resolution is established | **Unsupported** | No authorized live trace was supplied or produced. Current documents expressly retain this limitation. Overall live bootstrap classification is **unverified**, not verified by mocks. |

## Ownership and acceptance boundaries

The graph's declared ownership is coherent: W0-DOC owns planning/discovery guidance, W0-PROTO owns protocol/admission and focused tests, W1-ROUTER owns Router instructions/schema, W2-TEST owns test surfaces, and W3-REVIEW owns its review artifact. W2's possible overlap with W0-PROTO tests is serialized through W1. Shared read-only authority is not a write conflict. Existing Spec/ADR amendments are authority inputs, not writes attributable to an implementation item merely because they share the aggregate diff.

The inspected aggregate tracks 23 changed package files: five documentation/authority files, eleven Skills, one extension, two source files and four tests. These are within the disclosed migration surfaces, but aggregate placement alone proves neither individual Handler ownership nor historical tool-contract compliance. The F2 provenance limitation above remains decision-relevant even with its source defect closed.

Plan §5 requires adoptable completed Results and evidence for every listed item, plus verified gate predicates. This review checks definitions and current evidence; it does not invent missing predecessor Results, mark gates complete, mutate Todo state, or decide migration acceptance. Required Router semantics remain prompt-owned; no graph parser, scheduler or confirmation receipt was added by this review.

## Reproduced verification

Executed from `E:/Projects/pi-packages` on 2026-10-01 (+08:00), against dirty source candidate above HEAD `f7c9271a78d7a7280205efdec84a431780224b2c`:

```text
bun test packages/pi-harness/tests/admission.test.ts packages/pi-harness/tests/protocol.test.ts packages/pi-harness/tests/extension.test.ts packages/pi-harness/tests/skills.test.ts
123 pass, 0 fail, 818 expect() calls, 4 files
Bun 1.4.2 (744846f84); exit 0

bun run --cwd packages/pi-harness typecheck
Passed: tsc --noEmit -p tsconfig.json; exit 0

git -c core.safecrlf=false diff --check
Passed: no whitespace diagnostics; exit 0
```

This independently reproduces Context's combined count. Historical review's `123/802` remains evidence for its earlier candidate; the attributed parent Extension-only `7/278` and other predecessor counts were not separately reconstructed. No full package suite, install, reload, standalone live activation, delegation or launch was performed. Extension tests exercise source registration through doubles.

An in-memory Python probe, run through PowerShell stdin without adding a script file, extracted actual `Wave ID`, `Items`, `Predecessor Wave gates`, item headings, `Dependencies`, and `Result consumer` fields. It checked uniqueness, membership, reference resolution, required per-item fields, Plan gate references, and combined item/gate acyclicity. It also resolved local Markdown links and referenced heading anchors in Work/Plan/Waves/Context. Results:

```text
Items: W0-DOC, W0-PROTO, W1-ROUTER, W2-TEST, W3-REVIEW
Gates: W0(items DOC+PROTO, predecessors none)
       W1(item ROUTER, predecessor W0)
       W2(item TEST, predecessor W1)
       W3(item REVIEW, predecessor W2)
Combined item/gate DAG: PASS
Consumer and dependency IDs: all resolve
Reciprocal Work/Plan/Waves links: PASS
Local links/anchors checked: 28, all resolve
Historical tasks.md / lockfile tracked changes: empty
Selected Work/tasks.md: absent
```

The first probe incorrectly required one occurrence of a Waves link in Plan and failed because the same target is linked repeatedly. The corrected check requires one **distinct Waves target**, matching the Spec; the rerun passed. This was a probe correction, not a repository repair. Manual review checked release-predicate meaning and conflict ordering; the probe's field-presence checks alone do not prove those semantics. Neither check evaluates actual gate satisfaction.

## Source provenance and preservation

Source objects accessed on the date above comprise the eight exact Handoff references; the changed Skills/discovery documents; `src/admission.ts`, `src/protocol.ts`, `extensions/pi-harness.ts`; and the four focused test files. Authority supplies expectations, Work supplies scope, source supplies implemented behavior, and executed checks supply the bounded reproduction evidence. Historical reported counts supply attributed history only.

For reproducible candidate identity, collect `git diff HEAD --name-only`, add the selected Work's `work.md`, `context.md`, `plan.md`, `waves.md`, `review.md`, sort paths lexically, and construct UTF-8 lines `path<TAB>sha256(raw file bytes)<LF>`. The 28-file manifest SHA-256 at review time was:

```text
a97e3e07ecddaa2ee893e90f98b8c5cffcc17ffc769529ac08b5b60b475aacce
```

Historical `review.md` raw-byte SHA-256 before and during verification:

```text
d1820bd0eb57923f923e71e5c52b8b1f2589d1a323b3a8a970c75726328b2971
```

Negative-evidence searches were bounded to current changed paths and package source/extension/agent callers. No historical Tasks/lockfile edit appeared; source selector references consistently use Waves. Existing references to historical Tasks in compatibility guidance are expected. Git's LF-to-CRLF warnings do not indicate a review mutation or a failed typecheck.

## Residual limits

Live confirmation, registered Resolver freshness, exact launch forwarding, stable backend correlation, full Result retrieval, actual Todo mutation, gate release, and effective overlap/end-turn behavior remain unverified. Closing that evidence gap would require an authorized trace on the actual backend; none is initiated here. Source tests cannot establish join-hang resolution. Historical execution provenance also remains limited as explicitly recorded above.

This artifact is the only intentional repository write by this review. The historical review, implementation, tests, Skills, authority, historical Tasks and lockfiles are preserved.

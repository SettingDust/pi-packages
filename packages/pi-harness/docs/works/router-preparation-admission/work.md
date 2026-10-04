# Work: Router Standalone/Planned Admission and Skill-Owned Preparation

- Status: source/instruction delivery complete; Router-adopted bounded source/evidence gates satisfied; end-to-end live acceptance remains unverified.
- [Context](context.md) | [Plan](plan.md) | [Waves](waves.md)

## Current delivery status

This is the current status entry point for standalone/planned admission and Skill-owned preparation. The [protocol](../../../src/protocol.ts) and [registered schema/Router prompt](../../../extensions/pi-harness.ts) implement the two closed paths, reject `atomic` and `preparation`, and retain `invalid_atomic_basis`. The existing [delegation-strategy](../../../skills/delegation-strategy/SKILL.md) implements effect classification, admission selection, single-outcome decomposition, and strategy-loading boundaries. Earlier preparation-time gap and confirmation-pending statements below and in Context/Plan/Waves are historical snapshots, not current unstarted status.

The Router adopted the complete final `PREP-VERIFY` Result after the F1 label-based routing defect was corrected. `PREP-RUNTIME`, corrected `PREP-COORDINATION`, and `PREP-VERIFY` support the satisfied `W-RUNTIME`, `W-COORDINATION`, and bounded source/evidence `W-VERIFY` predicates. This records the Router's prior adoption; this documentation correction and its source inspection do not independently release gates or change their definitions.

### Adopted historical evidence

The parent session is `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4.jsonl`. Its adopted session-history ranges are `21653–21657` for the final independent review and `21658–21683` for the subsequent admission/commit sequence. Full Result locators under that session's sibling `2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/` directory were read during this status correction:

- `review-standalone-after-f1-fix-artifacts/result-1.json`, generation 1, completed: no unresolved in-scope findings, F1 closed; 181 tests and 1374 assertions passed, with typecheck, whitespace, 42 document links, tuple, and DAG checks passing. Runtime/schema evidence and synthetic instruction evidence were explicitly separated from live acceptance.
- `commit-standalone-planned-implementation-artifacts/result-1.json`, generation 1, completed: signed eight-file commit `4d6e8fdabb14ebaea66547f920ee875fd6f5e42e`; its narrower commit-time check reported 175 tests and 1334 assertions passing. The commit/signature and exact eight-file manifest were corroborated read-only; no push was performed by that delivery.

The recorded reload followed by one accepted standalone admission establishes only that request's admission. It does not establish end-to-end Router/Resolver/Handler execution, full live launch-to-Result correlation, model obedience or effect classification, actual user-authorization judgment, provider capability/permission, installed-runtime freshness/conformance, deployment, or host acceptance. These live boundaries remain unverified. This status correction reran only scoped documentation checks, not those historical tests or live operations.

## Objective

Prepare one concrete implementation scope for the accepted two-path Router admission contract: rename and expand the former atomic branch to `standalone`, retain `planned` for one selected Work/Plan/Waves tuple, and put preparation classification, admission selection, and single-outcome decomposition in the existing Router-only `delegation-strategy` Skill. The later implementation must preserve Resolver structural/binding-only ownership, exact selected-tool invocation, protected bindings, raw launch evidence, and Handler Result semantics.

Historical preparation snapshot: authoring this Work/Context/Plan/Waves set prepared the scope; it did not implement or execute it. Subsequent delivery is recorded in [Current delivery status](#current-delivery-status).

## Authority

- [Router Delegation PRD](../../prd/router-delegation.md#preparation-outcome)
- [ADR-0007](../../adr/0007-authority-first-router-admission.md#preparation-admission-and-skill-owned-method)
- [Router Delegation Spec](../../spec/router-delegation.md#standalone-admission)
- [Router Delegation Spec preparation boundary](../../spec/router-delegation.md#preparation-boundary)
- [Router Delegation Spec planned-work contract](../../spec/router-delegation.md#new-planned-work-document-and-release-contract)
- [Router Delegation Spec acceptance scenarios](../../spec/router-delegation.md#preparation-acceptance-scenarios)

These accepted documents are read-only inputs. Work, Context, Plan, and Waves are derived coordination material; their status, links, and checks establish neither user confirmation nor runtime conformance.

## Bounded implementation disclosure

The disclosed scope, now delivered within the source/evidence boundary above, is one coherent source-and-instruction delivery with two implementation outcomes and one final read-only review in the sole executable graph, [Waves](waves.md):

- runtime/schema/tests: accept closed `standalone` and `planned` admission, with standalone direct candidate selection and no planned subject/JIT requirement;
- Skill/Router instructions/tests: make the existing `delegation-strategy` Skill own effect classification, standalone/planned selection, and single-outcome decomposition while Router authorization and Resolver legality remain in their current roles; and
- independent source/evidence review: verify the combined candidate against accepted authority and P1-P11 without editing it.

The runtime item owns `src/protocol.ts`, the admission-schema portion of `extensions/pi-harness.ts`, and directly coupled fixtures/assertions in `tests/protocol.test.ts`, `tests/dispatch.test.ts`, `tests/extension.test.ts`, and `tests/settings-store.test.ts`. The instruction item owns `skills/delegation-strategy/SKILL.md`, the Router prompt portion of the same extension, and instruction assertions in `tests/extension.test.ts` and `tests/skills.test.ts`. `src/admission.ts`, `src/index.ts`, the Handler Agent, and `tests/admission.test.ts` remain read-only regression inputs. A repair outside these ownership boundaries is reported for bounded scope reconciliation; a material expansion requires disclosure and reconfirmation.

Historical preparation-time disclosure requirement: the Router must disclose this scope, exclusions, ownership, dependencies, P1-P11 evidence boundary, and risks in an ordinary message and obtain explicit current-user confirmation before implementation. The preparation Handoff, accepted authority, document readiness, and structural checks do not supply that confirmation.

## Completion signal

All three Waves gates are required: `W-RUNTIME`, `W-COORDINATION`, and `W-VERIFY`; their adopted bounded source/evidence status is recorded in [Current delivery status](#current-delivery-status). The earlier no-Result/unstarted preparation snapshot is superseded by that evidence. Neither preparation completion nor the later source/evidence gate satisfaction authorizes runtime activation or establishes end-to-end live acceptance.

Before any later item acquires shared extension/test files, use the supplied coordination context that the known renderer-fix writer has ended, preserve its render-only changes, check for renewed or other conflicting writers, and consume the latest bytes. The compact-renderer parent is `8b5c7956e58b3596e411c93742abdf6a653c05d5` and the current cold-start renderer repair is signed commit `883996b5ff2e5c231197dc8c6fc9033278fe691b`, verified with `git show`. This is an execution ownership prerequisite, not a fabricated graph Result and not a formal loaded-provenance gate. Other writers of the selected protocol, extension, Skill, or test files must likewise be serialized. Preserve unrelated work, historical evidence, and all changes outside this Work.

## Exclusions

Historical preparation exclusions: no authority, production code, configuration, dependency, lockfile, Agent, Skill, prompt, test, installation, reload, deployment, Git staging/commit/merge, live child launch, plan execution, new Work/Plan/Tasks/overview, compatibility alias, fallback, migration subsystem, receipt, authorization state, scheduler, retry engine, or backend interface was changed by preparing this document set. Historical Tasks remain compatibility records and are not silently rewritten or selected as Waves.

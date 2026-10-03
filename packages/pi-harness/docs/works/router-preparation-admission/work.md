# Work: Router Standalone/Planned Admission and Skill-Owned Preparation

- Status: ready for substantive Router disclosure; implementation scope is not confirmed and execution is unstarted.
- [Context](context.md) | [Plan](plan.md) | [Waves](waves.md)

## Objective

Prepare one concrete implementation scope for the accepted two-path Router admission contract: rename and expand the former atomic branch to `standalone`, retain `planned` for one selected Work/Plan/Waves tuple, and put preparation classification, admission selection, and single-outcome decomposition in the existing Router-only `delegation-strategy` Skill. The later implementation must preserve Resolver structural/binding-only ownership, exact selected-tool invocation, protected bindings, raw launch evidence, and Handler Result semantics.

This Work updates only its four derived documents. It does not implement or execute the scope.

## Authority

- [Router Delegation PRD](../../prd/router-delegation.md#preparation-outcome)
- [ADR-0007](../../adr/0007-authority-first-router-admission.md#preparation-admission-and-skill-owned-method)
- [Router Delegation Spec](../../spec/router-delegation.md#standalone-admission)
- [Router Delegation Spec preparation boundary](../../spec/router-delegation.md#preparation-boundary)
- [Router Delegation Spec planned-work contract](../../spec/router-delegation.md#new-planned-work-document-and-release-contract)
- [Router Delegation Spec acceptance scenarios](../../spec/router-delegation.md#preparation-acceptance-scenarios)

These accepted documents are read-only inputs. Work, Context, Plan, and Waves are derived coordination material; their status, links, and checks establish neither user confirmation nor runtime conformance.

## Bounded implementation disclosure

The ready scope is one coherent source-and-instruction delivery with two implementation outcomes and one final read-only review in the sole executable graph, [Waves](waves.md):

- runtime/schema/tests: accept closed `standalone` and `planned` admission, with standalone direct candidate selection and no planned subject/JIT requirement;
- Skill/Router instructions/tests: make the existing `delegation-strategy` Skill own effect classification, standalone/planned selection, and single-outcome decomposition while Router authorization and Resolver legality remain in their current roles; and
- independent source/evidence review: verify the combined candidate against accepted authority and P1-P11 without editing it.

The runtime item owns `src/protocol.ts`, the admission-schema portion of `extensions/pi-harness.ts`, and directly coupled fixtures/assertions in `tests/protocol.test.ts`, `tests/dispatch.test.ts`, `tests/extension.test.ts`, and `tests/settings-store.test.ts`. The instruction item owns `skills/delegation-strategy/SKILL.md`, the Router prompt portion of the same extension, and instruction assertions in `tests/extension.test.ts` and `tests/skills.test.ts`. `src/admission.ts`, `src/index.ts`, the Handler Agent, and `tests/admission.test.ts` remain read-only regression inputs. A repair outside these ownership boundaries is reported for bounded scope reconciliation; a material expansion requires disclosure and reconfirmation.

The Router must disclose this scope, exclusions, ownership, dependencies, P1-P11 evidence boundary, and risks in an ordinary message and obtain explicit current-user confirmation before implementation. This Handoff, accepted authority, document readiness, and structural checks do not supply that confirmation.

## Completion signal

All three Waves gates are required: `W-RUNTIME`, `W-COORDINATION`, and `W-VERIFY`. No item Result or gate evidence exists. Completion of this preparation only yields a ready implementation disclosure; it does not release implementation, confirm a plan, authorize runtime activation, or establish live Router/Resolver/Handler behavior.

Before any later item acquires shared extension/test files, use the supplied coordination context that the known renderer-fix writer has ended, preserve its render-only changes, check for renewed or other conflicting writers, and consume the latest bytes. The compact-renderer parent is `8b5c7956e58b3596e411c93742abdf6a653c05d5` and the current cold-start renderer repair is signed commit `883996b5ff2e5c231197dc8c6fc9033278fe691b`, verified with `git show`. This is an execution ownership prerequisite, not a fabricated graph Result and not a formal loaded-provenance gate. Other writers of the selected protocol, extension, Skill, or test files must likewise be serialized. Preserve unrelated work, historical evidence, and all changes outside this Work.

## Exclusions

No authority, production code, configuration, dependency, lockfile, Agent, Skill, prompt, test, installation, reload, deployment, Git staging/commit/merge, live child launch, plan execution, new Work/Plan/Tasks/overview, compatibility alias, fallback, migration subsystem, receipt, authorization state, scheduler, retry engine, or backend interface is changed by this preparation. Historical Tasks remain compatibility records and are not silently rewritten or selected as Waves.

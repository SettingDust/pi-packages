# Context: Router Standalone/Planned Admission and Skill-Owned Preparation

- [Work](work.md) | [Plan](plan.md) | [Waves](waves.md)

## Settled authority

The accepted contract has exactly two closed admission alternatives:

- `admission: { path: "standalone", basis: [...], verification: [...] }`
- `admission: { path: "planned", authority: { work, plan, waves } }`

`standalone` is the direct rename and expansion of the former atomic branch. It covers authorized non-tuple work, including read-only investigation, explicitly authorized PRD/ADR/Spec writing, initial Work/Context/Plan/Waves preparation, and bounded independent changes where applicable authority and authorization permit them. Complexity, size, file count, or Skill name is not an admission selector. A graph-bound implementation or selected item that needs planned prerequisites remains planned; missing tuple, dependency, gate, readiness, or scope confirmation is a block, not a standalone exception.

Both standalone arrays remain non-empty arrays of strings with non-whitespace content. With all three exact keys present, invalid array values or entries retain the existing machine-readable `invalid_atomic_basis` code despite the new path name. Missing or extra keys are structural `invalid_admission` errors. Malformed or unknown standalone structure, old `atomic`, and old `preparation` paths retain `invalid_admission`; no alias, translation, fallback, or new error rename is authorized. Actual unreadable references retain `invalid_reference`. Closed schema rejection may occur before Resolver runtime validation and must prevent launch.

Preparation is an effect category inside standalone, not a third Resolver path. It permits read-only analysis/clarification/review, explicitly authorized authority writing, and initial derived Work/Context/Plan/Waves preparation from settled authority. Future output targets are ordinary Handoff text or inline context and must not be supplied as absent `context[].ref` values. Every actual reference remains readable. Preparation excludes production code, configuration, dependencies, lockfiles, LLM instructions, installation/reload/deployment, Git writes, and execution of the prepared plan. A preparation Result or accepted authority does not confirm a later implementation scope.

The existing `delegation-strategy` Skill owns effect classification, standalone/planned selection, and decomposition before domain Skill selection, Handoff construction, or capability requests. The Router retains authorization, roles, outcome/Result coordination, confirmation, and on-demand loading. The Resolver remains structural and binding-only: it validates closed shape and readable actual references, performs planned tuple/current-byte checks only for planned admission, binds protected invocation fields, and invokes the selected registered tool once. It does not classify effects, infer permission, choose a tool, or advance work.

## Current implementation evidence

The predecessor Work/Context/Plan/Waves proposed adding a third `PreparationAdmission` branch and covered P1-P9. That derived design is superseded by the accepted two-path authority; it must not remain an implementation target. The inspected source never acquired a preparation branch. `AtomicAdmission` and the public `atomic` discriminator are the obsolete state to replace; there is no preparation runtime state, stored receipt, settings migration, or extra semantic classifier to remove. Historical probe evidence below is retained with its original scope.

Scoped source inspection found the following affected surfaces and current gap:

- [protocol.ts](../../../src/protocol.ts): `AtomicAdmission`, `AdmissionInput`, `validateAdmission`, and the direct atomic/planned branch; `stringArray` already rejects whitespace-only entries through `nonEmptyString`, but there is no standalone type or branch, and the old path error still says atomic or planned.
- [extension](../../../extensions/pi-harness.ts): the registered resolver schema exposes exactly two admission alternatives and the Router prompt still instructs atomic/planned selection. This file also contains the known renderer-fix shared ownership.
- [delegation-strategy](../../../skills/delegation-strategy/SKILL.md): current method covers outcomes, capabilities, dispatch, and Results but does not state the accepted preparation classification/admission method.
- [protocol tests](../../../tests/protocol.test.ts): atomic fixtures and planned subject/JIT regressions; no standalone coverage.
- [dispatch tests](../../../tests/dispatch.test.ts): atomic dispatch fixture and pre-launch/raw-evidence coverage.
- [extension tests](../../../tests/extension.test.ts): two-branch closed schema assertions, Router prompt assertions, and atomic resolver execution fixtures.
- [Skill tests](../../../tests/skills.test.ts): Skill-library/instruction assertions; preparation-specific classification assertions are absent.
- [settings-store tests](../../../tests/settings-store.test.ts): an atomic resolver fixture that will need the renamed path in the later runtime migration; it is not modified by this preparation.
- [admission tests](../../../tests/admission.test.ts) and [admission.ts](../../../src/admission.ts): planned Work/Plan/Waves tuple, canonical bytes, and direct-member grammar evidence; no standalone implementation is present or required in the current source inspection.

The current source therefore accepts only `atomic` and `planned`. Historical evidence inherited from the predecessor Context records a Bun 1.4.2 probe before this directory existed: `path: "preparation"` with a readable Spec ref and all four future targets inline returned `invalid_admission`, message `Admission path must be atomic or planned`, and no launch. Supplying the then-absent future Work as an actual reference instead returned `invalid_reference` and no launch. Across both probes there were zero planned-subject observations, Registry reads, and stub delegate invocations. Those probes were not rerun in this update and did not test standalone. They support only the predecessor gap/reference-precedence claim; current source inspection establishes that standalone is also unsupported. Neither source inspection nor historical probes establish future standalone behavior, current installed registration, model behavior, or live acceptance.

## Ownership and conflicts

- `PREP-RUNTIME` owns the coupled runtime type/validation, registered schema, direct dispatch behavior, and focused protocol/dispatch/extension/admission regression evidence as one Result.
- `PREP-COORDINATION` owns the existing Skill, Router prompt, and focused instruction assertions as one independently verifiable Result. It consumes the latest runtime/schema state and does not create a coordinator or permission.
- `PREP-VERIFY` is read-only and independently assesses both Results, current source/test bytes, links, tuple, graph, P1-P11 coverage, and limitations.
- Supplied current coordination context states that the renderer-fix writer has ended. The compact-renderer parent is commit `8b5c7956e58b3596e411c93742abdf6a653c05d5`, and the current cold-start renderer repair is signed commit `883996b5ff2e5c231197dc8c6fc9033278fe691b`; `git show` confirms the parent and render-only extension/test changes. Preserve those changes. Before implementation, check only for renewed or other conflicting writers and consume the latest bytes; do not reopen the completed ownership handoff or impose a formal provenance gate. Current Skill loading remains an instruction/runtime boundary to check synthetically, not a separate graph item or formal loaded-provenance prerequisite.
- Any other writer of `src/protocol.ts`, `extensions/pi-harness.ts`, the strategy Skill, or named tests is serialized against the latest bytes. Shared read-only authority inputs do not conflict.
- Root Pi/package upgrades, manifests/lockfile, installed-host provenance, Todo work, historical Tasks, raw-return work, and unrelated package changes are outside this scope and must be preserved.

## Evidence boundaries and open status

Runtime/schema tests can establish closed shape, error precedence, reference handling, subject-builder avoidance for standalone, candidate selection, exact protected binding, single raw launch capture, and preservation of planned/Result behavior. Synthetic Skill/Router tests can establish wording and ordering for P1-P11. Neither can prove real authorization, user confirmation, model classification/obedience, effective backend permission, full live Result correlation, dependency release, installed-runtime freshness, or live Router/Resolver/Handler bootstrap.

No implementation item has run, no implementation confirmation has been supplied, and no live check has been performed. There is no unresolved authority or design decision for this bounded scope. Router disclosure/confirmation remains pending. The renderer-fix writer is ended according to supplied coordination context; ordinary checks for renewed or newly conflicting writers remain necessary before later shared-file writes. These execution conditions do not block this authorized four-document preparation or authorize implementation.

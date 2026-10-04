# Plan: Router Standalone/Planned Admission and Skill-Owned Preparation

- [Work](work.md) | [Waves](waves.md)
- Source/instruction implementation and bounded independent review are complete. [Work current status](work.md#current-delivery-status) owns the adopted Results, source/evidence gate status, historical locators, and unverified live boundary. The requirements and preparation-time disclosure language below retain the original Plan; they are not a current unstarted or confirmation-pending report.

## Outcome and authority

Deliver one bounded source-and-instruction implementation scope for the accepted two-path admission contract. The former atomic branch becomes `standalone` and admits authorized non-tuple work, including Skill-owned preparation; `planned` remains bound to one selected same-directory Work/Plan/Waves tuple. The implementation must preserve ordinary Handoff/Skill/capability/candidate/delegate/protected-binding validation, planned tuple and current-byte checks, exact one selected-tool invocation, raw launch evidence, and four-state Handler Result semantics.

This Plan derives only from the accepted [PRD preparation outcome](../../prd/router-delegation.md#preparation-outcome), [ADR preparation decision](../../adr/0007-authority-first-router-admission.md#preparation-admission-and-skill-owned-method), and [Router Spec standalone admission](../../spec/router-delegation.md#standalone-admission), [preparation boundary](../../spec/router-delegation.md#preparation-boundary), [planned-work contract](../../spec/router-delegation.md#new-planned-work-document-and-release-contract), and P1-P11 acceptance scenarios. The predecessor third-path preparation design is superseded and is not an implementation target. Work, Context, Plan, and Waves do not create authority. Waves is the sole executable graph.

## Scope for Router disclosure

### Runtime/schema/tests outcome

Update the existing runtime and registered closed schema to replace `AtomicAdmission` with the standalone contract and extend `AdmissionInput` to `StandaloneAdmission | PlannedAdmission`. Standalone validation must accept exactly `path`, `basis`, and `verification`; require non-empty arrays whose entries are non-empty after trimming; retain `invalid_atomic_basis` for invalid array content; reject malformed/unknown structure, `atomic`, and `preparation` with `invalid_admission`; and preserve `invalid_reference` for unreadable actual context refs. Standalone selects candidates directly after ordinary legality checks and must not invoke planned subject construction, authority selectors, tuple membership, or planned current-call/JIT checks.

Extend the TypeBox admission union in `extensions/pi-harness.ts` to expose only `standalone` and `planned`, and migrate focused existing fixtures/call sites from the old `atomic` discriminator without adding an alias. Keep planned Work/Plan/Waves selectors, Tasks rejection, tuple grammar, drift, candidate, protected-binding, delegate, raw-return, raw-error, and Result parsing behavior unchanged. Reuse `src/admission.ts`; no change is planned there. Directly coupled tests are `tests/protocol.test.ts`, `tests/dispatch.test.ts`, `tests/extension.test.ts`, and the existing `tests/settings-store.test.ts` fixture where the renamed path is exercised. `tests/admission.test.ts` remains a read-only planned-tuple regression input.

### Skill/Router instruction outcome

Update only the existing `skills/delegation-strategy/SKILL.md`, the Router prompt portion of `extensions/pi-harness.ts`, and focused assertions in `tests/extension.test.ts` and `tests/skills.test.ts`. The loaded strategy must classify effects and select standalone versus planned before domain Skill/Handoff/capability work, decompose independently valuable outcomes, and distinguish preparation from implementation. It must express:

- authorized non-tuple investigation, settled authority writing, initial derived-document preparation, and applicable authorized independent changes as standalone;
- preparation's write/effect exclusions, future output targets as inline/ordinary text, and actual refs as readable inputs;
- planned admission for graph-bound work whose prerequisites, gates, readiness, conflicts, or confirmation are required;
- no relabeling of missing implementation prerequisites as standalone;
- no permission from Skill loading, accepted documents, path/readiness text, or a completed preparation Result;
- Router-owned authorization, confirmation, Result projection, dependency release, and on-demand loading;
- Resolver structural/reference/binding-only behavior with no semantic classifier or fallback; and
- P1-P11 instruction boundaries, including old discriminator rejection and no fabricated tuple.

The runtime item owns `src/protocol.ts`, the admission-schema portion of `extensions/pi-harness.ts`, and directly coupled fixtures/assertions in `tests/protocol.test.ts`, `tests/dispatch.test.ts`, `tests/extension.test.ts`, and `tests/settings-store.test.ts`. The instruction item owns `skills/delegation-strategy/SKILL.md`, the Router prompt portion of the same extension, and instruction assertions in `tests/extension.test.ts` and `tests/skills.test.ts`. `src/admission.ts`, `src/index.ts`, the Handler Agent, and `tests/admission.test.ts` remain read-only regression inputs. A repair outside the named ownership boundary requires scope reconciliation and reconfirmation.

### Independent verification outcome

After both implementation Results, a read-only Handler independently inspects the current diff and bytes, authority links, selected tuple grammar, Waves IDs/references/prerequisites/gates, write scope, and actual test/typecheck output. It maps P1-P11 and retained planned/atomic-rename/binding/single-launch/raw-evidence/Result contracts to reproducible evidence, reports findings, and separates executable runtime/schema evidence from synthetic instruction evidence and unverified live behavior. It writes no artifact and cannot waive a missing prerequisite or unresolved violation.

## Dependencies, ownership, and sequencing

`PREP-RUNTIME` and `PREP-COORDINATION` are separate results because their runtime/schema and instruction contracts have independently observable checks, but they are serialized: coordination consumes the latest runtime/schema and shared extension/test bytes. The renderer-fix writer has ended; the compact-renderer parent is commit `8b5c7956e58b3596e411c93742abdf6a653c05d5`, and the current cold-start renderer repair is signed commit `883996b5ff2e5c231197dc8c6fc9033278fe691b`, verified with `git show`. Preserve the render-only changes. Before `PREP-RUNTIME` acquires extension/test files, check for newly conflicting writers and use the latest bytes. Any other conflicting writer must be handled the same way. This is explicit shared-file ownership, not an automatic scheduler and not a formal loaded-provenance prerequisite.

`PREP-VERIFY` depends on both implementation Results and is read-only. At preparation time no step ran; subsequent delivery and adoption are recorded in [Work current status](work.md#current-delivery-status). All later work remains inside the confirmed scope; material changes to outcome, behavior, ownership, architecture, dependency, risk, or verification require the Spec's C6 disclosure and reconfirmation rule.

## P1-P11 verification map

| ID | Required later evidence | Evidence boundary |
| --- | --- | --- |
| P1 | Valid standalone preparation with readable current refs and absent future targets declared inline; no tuple selectors, planned subject/JIT observations, or implementation confirmation; exactly one allowed stub dispatch after ordinary validation. | Runtime/schema plus synthetic Router contract; authorization and live dispatch remain unverified. |
| P2 | Supplying an absent future output as an actual `context[].ref` returns `invalid_reference`, no launch, and no subject/candidate/Registry work beyond the documented validation precedence. | Executable reference-precedence check. |
| P3 | Strategy/prompt requires explicit permission and settled intent for PRD/ADR/Spec writing, reuses owners, and does not treat authority acceptance as implementation permission. | Synthetic instruction check; no authority is edited here. |
| P4 | Closed two-branch schema rejects unknown fields and old paths; standalone malformed structure returns `invalid_admission`; empty, non-array, non-string, empty, or whitespace-only arrays retain `invalid_atomic_basis`; ordinary Skill/capability/candidate/delegate/protected-binding blocks remain intact. | Schema/runtime checks; prose is not permission evidence. |
| P5 | Strategy/prompt keeps preparation effects bounded and decomposes independently valuable implementation or other outcomes; invalid mixed bundles block before work. | Synthetic instruction/Handler contract; no model-obedience claim. |
| P6 | Missing/hidden/unreadable/incomplete/conflicting strategy blocks new delegation; loaded domain Skills do not widen permission; no inline fallback or strategist Handler. | Synthetic loading/role assertions; no formal loaded-provenance gate or live catalog claim. |
| P7 | Preparation completion preserves full Result projection and requires later substantive implementation disclosure and explicit confirmation; no automatic plan execution or gate bypass. | Synthetic Router contract and preserved Result parsing; live projection unverified. |
| P8 | Existing standalone array error name, planned tuple/Tasks rejection/current-byte/JIT behavior, exact binding, single invocation, raw return/error capture, and four Handler statuses remain covered. | Regression suite and typecheck. |
| P9 | Runtime lacking standalone reports a pre-launch admission block; conforming updated runtime rejects `atomic` and `preparation` without fallback or fabricated tuple. | Current source negative evidence plus later runtime/instruction checks; no legacy-runtime switch. |
| P10 | Complex or multi-file read-only investigation with one non-tuple predicate remains eligible for standalone; size/complexity alone is not a selector and one-result decomposition still applies. | Synthetic strategy/prompt check; semantic eligibility remains Router-owned. |
| P11 | Authorized independent change without required planned inputs may use standalone under its own authority; graph-bound work uses planned and retains prerequisites, gates, conflicts, and confirmation. | Synthetic strategy/prompt check plus closed schema; authorization and live readiness remain unverified. |

## Verification and completion

Each implementing Handler runs the smallest focused checks for its own result. The integrated candidate check is:

```text
bun test packages/pi-harness/tests/protocol.test.ts packages/pi-harness/tests/dispatch.test.ts packages/pi-harness/tests/extension.test.ts packages/pi-harness/tests/skills.test.ts packages/pi-harness/tests/admission.test.ts packages/pi-harness/tests/settings-store.test.ts
bun run --cwd packages/pi-harness typecheck
```

The final review reruns only the relevant focused checks needed for reproducibility and records actual outputs. It must validate document links, exact Work/Plan/Waves tuple members, stable IDs, reference resolution, acyclic prerequisites, gate predicates, changed-file scope, and P1-P11 coverage. It must report synthetic instruction coverage separately from executable schema/runtime evidence and state that authorization judgment, model behavior, effective tool permission, full live Result correlation, installed runtime, reload, and bootstrap remain unverified.

All three gates in [Waves](waves.md) are required. A `completed` review Result does not waive missing predecessor evidence or an unresolved in-scope violation. `partial`, `failed`, `blocked`, missing, stale, or uncorrelatable Results leave the affected gate unsatisfied.

## Risks and exclusions

- The rename is a caller-visible compatibility break. Do not add an alias, error rename, migration layer, or fallback. Retain `invalid_atomic_basis` deliberately.
- The standalone branch must bypass only planned tuple/subject checks; it must retain ordinary reference, Skill, capability, candidate, delegate, protected-binding, and launch legality.
- Shared extension/test writes can overwrite the known renderer fix or another current writer. Serialize against terminal evidence and the latest bytes.
- Static checks cannot prove user permission, confirmation, classification, obedience, real backend overlap, full Result retrieval/correlation, dependency release, or live bootstrap.
- Exclude authority edits, other Skills/Agents, `src/admission.ts` changes without direct evidence, historical Tasks migration, manifests/lockfiles, package/Todo work, backend selection, schedulers/retries/lifecycle, installation/reload/deployment, live launch, staging, commit, and merge.

Historical preparation-time disclosure requirement: the Router must disclose this Plan's outcome, changes, owners, sequencing, P1-P11 evidence boundary, risks, and exclusions and obtain explicit current-user confirmation before implementation. The preparation Handoff did not provide that confirmation; subsequent adopted delivery is recorded in [Work current status](work.md#current-delivery-status).

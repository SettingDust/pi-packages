# Context: Router Tasks-to-Waves Migration

## Authority and current evidence

This Work is derived from:

- [Router Delegation Spec](../../spec/router-delegation.md), including the current Work/Plan/Waves model and explicit Tasks migration authority.
- [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md), which preserves Router, Resolver, and Handler responsibilities.
- [ADR-0007](../../adr/0007-authority-first-router-admission.md), which requires authority-first admission and constrains migration behavior.

The user confirmed the disclosed migration scope: new planned invocations use `waves.md`; historical Tasks remain unchanged; unfinished old plans need explicit migration; no silent fallback. The original preparation was documentation-only. The source migration candidate is now present, and the user explicitly confirmed remediation of W3 findings F1/F2/F3; this outcome reconciles F3 lifecycle prose only.

## Existing repository state

The target directory `packages/pi-harness/docs/works/router-wave-task-graph/` was absent at the initial preparation inspection. Preparation created Work, Context, Plan, and Waves, deliberately creating no `tasks.md`, and preserved the three authority files' unrelated/previously authorized dirty changes. The current bundle also contains the historical [W3 review](review.md). Existing historical Work/Tasks records remain unchanged.

## Invariants to carry into implementation

- The Router owns confirmation, decomposition, continuation, and the decision to delegate.
- Handoff construction is not proof that the user accepted the work.
- Resolver validates an admitted Handoff and resolves the selected Skill and capability before spawn; Handler executes one admitted unit and returns exactly one Result.
- The required order is resolve, then spawn. Do not invent a scheduler or bypass admission.
- Independent Results remain separate; the Router retrieves complete Results and projects Todo state truthfully.
- Failure-specific dependency blocking must prevent downstream execution only when the failed prerequisite is actually required.
- Tool contracts, user-confirmation boundaries, full Result retrieval, and no silent Tasks fallback are part of the implementation contract.

## Work/Plan/Waves migration model

- `plan.md` explains authority, scope, decisions, implementation order, and acceptance.
- `waves.md` is the sole executable graph for new planned invocations.
- Historical `tasks.md` is not rewritten or copied.
- An unfinished historical plan is not implicitly interpreted as Waves. It must be explicitly migrated and reviewed before execution.
- A Wave groups ready, conflict-safe items; a Wave is not a global barrier. Independent branches may proceed when their own dependencies and admission conditions are satisfied.

## Preparation-stage format contradiction

Initial preparation recorded planning/documentation Skills and historical Work entries that still described `tasks.md` as the executable artifact. The inspected source candidate now includes Work/Context/Plan/Waves vocabulary in the owning planning/documentation Skills and discovery guidance; focused Skill tests verify those source instructions. Historical Tasks entries remain records, not a live new-plan format or fallback. Instruction presence does not establish model or runtime compliance.

## Known admission limitation

No live Resolver/Handler bootstrap path capable of executing this graph has been verified. The recorded parent/tool contract required the first spawn to end the turn, and source changes do not update an already registered runtime contract. Therefore no live Router/Resolver/Handler acceptance is claimed. Exact resolve-to-spawn order remains required, and any admission failure must be reported specifically rather than bypassing admission or fabricating a Result. Source installation, activation, live scheduling, and join-hang resolution remain unverified.

## Current source candidate and remediation provenance

The inspected candidate uses closed Work/Plan/Waves selectors, rejects `tasks` as an alias, validates matching tuple members and current-call bytes, and preserves atomic admission and Result parsing. Router prompt/schema and planning/Skill changes are present at source level; this is not an installed-runtime claim.

- F1 graph repair was reported completed by its Handler. The selected bundle now contains reciprocal Work/Plan/Waves links and explicit W0-W3 item sets, predecessor gates, and release predicates; none are marked satisfied here.
- Two F2 Handler invocations reported blocked without edits. The parent coding session subsequently changed `extensions/pi-harness.ts` and `tests/extension.test.ts` directly. The inspected prompt includes pre-resolution reciprocal-link/graph validity checks, both item and containing-Wave prerequisites, Router ownership, completed-plus-evidence item semantics, and separate post-projection Wave gate verification. Tests assert those clauses and ordering.
- The parent reported Extension `7 pass, 0 fail, 278 assertions`, typecheck, and diff check. That Extension-only count remains attributed parent evidence, not an independently reconstructed historical run. The combined run below was reproduced in this F3 outcome and does not authenticate historical execution ownership.
- The original [W3 review](review.md), its verdict, and its `123/802` verification remain unchanged historical evidence. F1/F2 remediation and the current migration candidate still require independent re-review; F3 documentation reconciliation is not that review.

## Verification boundary

The F3 outcome reproduced the requested focused suite: `bun test packages/pi-harness/tests/admission.test.ts packages/pi-harness/tests/protocol.test.ts packages/pi-harness/tests/extension.test.ts packages/pi-harness/tests/skills.test.ts` returned **123 pass, 0 fail, 818 expect() calls across four files**, with Bun `1.4.2 (744846f84)`. `bun run --cwd packages/pi-harness typecheck` passed (`tsc --noEmit -p tsconfig.json`). Graph/link and stale-wording checks support this lifecycle reconciliation only; their results and the required diff check are reported in its Handler Result.

These are focused source checks, not the full package suite or independent acceptance. Resolver filesystem-backed tests exercise structural/current-call admission; mocked extension and prompt assertions do not execute runtime scheduling, Wave release, backend retrieval, or Todo mutation. Overall migration acceptance and live Router/Resolver/Handler bootstrap remain pending.

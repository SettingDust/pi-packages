# Plan: Router Tasks-to-Waves Migration

- [Work](work.md) | [Waves](waves.md)

## 1. Decision and authority

Implement the accepted migration defined by [router-delegation.md](../../spec/router-delegation.md), while preserving [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md) and [ADR-0007](../../adr/0007-authority-first-router-admission.md). The migration changes the planning representation, not the Router/Resolver/Handler boundary or admission contract.

The plan is derived from user confirmation and is limited to the disclosed implementation surfaces. The source migration candidate is now present, and the user explicitly confirmed remediation of W3 findings F1/F2/F3. Current source verification does not establish independent acceptance or live conformance.

## 2. Scope

In scope:

- Update documentation and planning Skills and their registration/discovery guidance from the superseded Tasks shape to Work/Context/Plan/Waves.
- Update protocol/admission documentation and implementation surfaces so a new planned invocation admits `waves.md` as the executable graph, while preserving confirmation, resolve-to-spawn order, and one-Result semantics.
- Extend Router instructions and schema for the new graph and explicit migration of unfinished historical Tasks.
- Add focused tests for graph shape, admission boundaries, dependency blocking, Result separation/retrieval, and truthful Todo projection.
- Perform an independent final review against the Spec, ADRs, confirmed scope, and bundle evidence.

Out of scope:

- Source installation, activation, reload, live backend verification, or join-hang remediation in this lifecycle reconciliation.
- Rewriting historical `tasks.md` or historical Work entries.
- Silent fallback, automatic scheduling, architecture redesign, dependency changes, installs, commits, or unrelated cleanup.

## 3. Decisions

1. **Waves is the executable graph.** New planned invocations read `waves.md`; `plan.md` remains explanatory and is not a second task source.
2. **Historical Tasks are preserved.** Existing `tasks.md` is historical data. Unfinished historical plans require an explicit migration decision and review; they are not silently accepted as Waves.
3. **No global Wave barrier.** Wave grouping communicates readiness and conflict safety. Independent branches may advance without waiting for unrelated branches.
4. **One observable predicate per item.** Shared-state work that cannot be independently verified remains one item; independent work keeps separate Results.
5. **Admission remains explicit.** Router confirmation precedes decomposition; Resolver resolves and validates before spawn; failure-specific dependency blocking is represented in the graph.
6. **Live bootstrap is a verification limitation, not a reason to bypass admission.** The implementation must surface the limitation and preserve truthful evidence.

## 4. Implementation sequence

Execute the items in [waves.md](waves.md) in dependency order:

1. Establish the documentation/Skill vocabulary and registration contract.
2. Update protocol/admission behavior and compatibility boundaries against that vocabulary.
3. Extend Router instructions/schema and explicit historical migration handling.
4. Add focused tests after the contracts they exercise are settled.
5. Run the independent final review over all changed surfaces and evidence.

The graph intentionally permits the documentation branch and the protocol/admission branch to proceed in parallel after their own inputs are read. Router/schema work depends on the resulting vocabulary and admission contract. Tests depend on the relevant implementation surfaces. Final review depends on all implementation and test branches.

## 5. Acceptance

**Intended outcome:** The confirmed Tasks-to-Waves migration is supported by the implementation and focused evidence below, with an independent review of scope, authority, graph integrity, and limitations.

**Required Wave gates:** `W0`, `W1`, `W2`, and `W3` in [waves.md](waves.md). `W0` establishes the vocabulary and admission contracts; `W1` establishes Router integration; `W2` establishes focused regression evidence; `W3` establishes independent review evidence. Plan completion requires every gate's listed items to have completed Results with required evidence and every gate's release verification to pass. A completed review records its findings; it does not waive the acceptance conditions below or imply migration acceptance or live conformance. The Router evaluates gate release; this Plan does not mark any item or gate complete.

The implementation is acceptable only if all of the following are demonstrated by focused evidence:

- New planned invocations use `waves.md` as the executable graph; no new duplicate `tasks.md` is introduced.
- Historical Tasks are unchanged and unfinished historical plans require explicit migration; no silent fallback exists.
- User confirmation remains a hard admission boundary.
- Resolve happens before spawn, with Resolver admission intact.
- One Handler yields one independent Result; complete Results are retrievable and Todo projection is truthful.
- Dependency blocking is failure-specific and does not impose unrelated global barriers.
- Tool-contract limits, write ownership, and conflict boundaries are respected.
- Focused tests cover the graph and admission behaviors; an independent review checks scope, authority, and evidence.
- Any live Resolver bootstrap limitation is reported explicitly; no runtime acceptance is claimed without evidence.

## 6. Verification and reporting

The implementation owner must report changed paths, focused test commands/results, graph consistency, authority correspondence, and any unresolved live admission limitation. The source candidate and reproduced focused checks are recorded in [context.md](context.md). F1/F2 remediation remains subject to independent re-review; this F3 lifecycle reconciliation supplies no overall migration acceptance or live Router/Resolver/Handler conformance and does not release any Wave gate.

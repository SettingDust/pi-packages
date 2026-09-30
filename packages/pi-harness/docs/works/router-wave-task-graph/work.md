# Work: Router Tasks-to-Waves Migration

- Status: **Source migration candidate present; focused verification reproduced; F1/F2 remediation awaits independent re-review; live bootstrap unverified.**
- [Context](context.md) | [Plan](plan.md) | [Waves](waves.md)

This bounded Work derives an executable implementation bundle from the accepted Router Delegation Spec and ADRs for the user-confirmed Tasks-to-Waves migration. It does not authorize runtime, Skill, authority, test, or lockfile edits by itself.

## Confirmed scope

- `waves.md` replaces `tasks.md` for new planned invocations.
- Historical `tasks.md` files remain unchanged.
- Unfinished old plans require explicit migration; there is no silent Tasks fallback.
- The implementation boundary covers documentation and planning Skills, protocol/admission, Router instructions/schema, focused tests, and independent final review.
- Router behavior remains authority-first: user confirmation precedes decomposition and delegation; one Handler produces one Result; full Result retrieval and truthful Todo projection remain required.

## Exclusions

- No source installation, activation, reload, live bootstrap, or join-hang remediation in this lifecycle reconciliation.
- No changes to historical Work entries or duplicate `tasks.md` files.
- No automatic scheduler, silent fallback, new architecture, dependency/install/lockfile work, commit, or delegation.
- No claim of runtime acceptance or live Router/Handler conformance.

## Authority

- [Router Delegation Spec](../../spec/router-delegation.md)
- [ADR-0001: Router, Resolver and Handler boundaries](../../adr/0001-router-resolver-handler-boundaries.md)
- [ADR-0007: Authority-first Router admission](../../adr/0007-authority-first-router-admission.md)

The current Work/Plan/Waves format is governed by the updated Spec. The inspected source candidate includes Waves-aware admission, planning/Skill vocabulary, and Router prompt/schema changes. Current evidence, historical preparation context, remediation provenance, and the unresolved live bootstrap limitation are recorded in [context.md](context.md).

## Execution bundle

The ordered implementation boundary and acceptance conditions are in [plan.md](plan.md). The only executable item graph is [waves.md](waves.md); it contains stable IDs, one completion predicate per item, ownership, dependencies, side effects, focused verification, and Result consumers.

This Work selects that same-directory Plan/Waves pair: Plan links Work and Waves, and Waves links back to the same Plan and Work. Gates `W0`, `W1`, `W2`, and `W3` in Waves establish the migration outcome and evidence required by [Plan §5](plan.md#5-acceptance). Items require both their item prerequisites and containing Wave's predecessor gates; only completed Results with required evidence and verified release predicates satisfy a gate. Gate definitions do not declare current completion or authorize execution beyond the confirmed scope.

## Bundle acceptance

The original preparation predicate required all four files to exist, link to the accepted authority and to each other, represent the confirmed scope without adding migration behavior, and have an internally consistent graph. Preparation checks are not implementation acceptance. The current source candidate and reproduced focused checks are recorded in [context.md](context.md); the original [W3 review](review.md) remains historical evidence, and the F1/F2 remediation still requires independent re-review. This F3 reconciliation does not mark any item or Wave gate complete or claim overall migration acceptance.

# Authority-First Router Admission Work

## Goal

Implement the authority-first admission boundary for `pi-harness` as a bounded follow-up to Router delegation. The delivery must support a verifiable no-plan atomic path and an exact reviewed Work/Plan/Tasks path without introducing a fixed stage machine or cross-session approval.

## Authority

- [Product requirements](../../prd/router-delegation.md)
- [ADR-0001: Router, Resolver, Environment, Handler boundaries](../../adr/0001-router-resolver-handler-boundaries.md)
- [ADR-0002: Structured Handoff and YAML messages](../../adr/0002-structured-handoff-and-yaml-results.md)
- [ADR-0005: Router adapts delegate tools directly](../../adr/0005-let-router-adapt-delegate-tools-directly.md)
- [ADR-0007: Authority-First Router Admission](../../adr/0007-authority-first-router-admission.md)
- [Router Delegation Specification](../../spec/router-delegation.md), Amendment A.1-A.8 (draft)
- [Router Delegation Plan](plan.md)
- [Router Delegation Tasks](tasks.md)

## Scope

- Add the admission input/validation contract to the existing Resolver interaction.
- Add session-scoped acceptance recording owned by the Harness Extension.
- Add exact reviewed Work/Plan/Tasks digest canonicalization and drift checks.
- Add atomic evidence validation with an explicit soft-judgment/audit boundary.
- Add Router rendering and explicit confirmation capture for planned admission.
- Add bounded-amendment handling and invalidation for material authority drift.
- Add focused tests for pure validation/canonicalization and Extension/session behavior.
- Keep `#3 atomic delegation` as a related interface boundary; do not mix its companion rule into this implementation scope.

## Non-goals

- No child write-capability gating.
- No fixed stage machine.
- No CI enforcement.
- No cross-session persistent acceptance or audit log.
- No automatic review generation or reviewer identity discovery.
- No backend adapter, Herdr lifecycle, or package metadata changes.
- No source implementation in this documentation work package.

## Settled Decisions

- Behavior-neutral and small atomic changes may bypass Plan artifacts when planning provides no meaningful control value.
- Multi-step, coordination-heavy, architectural, security, migration, or durable behavior changes require exact Work+Plan+Tasks, fresh independent review, and explicit current-session user acceptance.
- Acceptance is held by the Harness Extension for the current main session only.
- Project Markdown cannot forge acceptance, and generic `start`/`continue`/`next` is not acceptance.
- A bounded amendment can advance an accepted digest only within the accepted boundary; material changes invalidate acceptance and require fresh review and confirmation.
- The Resolver blocks before backend launch when admission is absent, stale, malformed, or unaccepted.

## Evidence and Current Boundary

Existing implementation has `resolveDelegation` in `src/protocol.ts` and dynamic Resolver registration in `extensions/pi-harness.ts`. Existing docs define ordinary Handoff/Role/Skill/reference validation and direct backend adaptation, but they do not define an authority admission gate. Draft Amendment A is the candidate contract in the owning Specification; it is not normative until the unresolved decisions are settled, the exact Work/Plan/Tasks set receives fresh independent review, and the user explicitly accepts it in the current session. No competing Spec is required.

The existing worktree has an unrelated or pre-existing modification in `extensions/pi-harness.ts`; implementation must preserve and reconcile it rather than assume a clean file.

## Admission Paths

- Atomic: Router supplies bounded basis and focused verification; validator checks shape and records soft classification evidence. No Work/Plan/Tasks or acceptance record is required.
- Planned: Router renders exact canonical Work/Plan/Tasks paths and digests, presents them for explicit confirmation, records an independent review and current-session acceptance, then Resolver revalidates the same set before returning `resolved`.

## Open Decisions Blocking Implementation Details

1. Which supported Pi UI confirmation API captures explicit acceptance?
2. What supported Extension value identifies the current main session, and when is it reset?
3. What trusted runtime input represents fresh independent review identity, outcome, and timestamp?
4. Does the package need a user-facing command to inspect the in-memory admission record?
5. Should canonical digesting normalize only UTF-8/LF bytes, or also a repository document representation?

These are genuine implementation/contract decisions. They are not silently guessed in this Work package.

## Completion Signal

The derived Work/Plan/Tasks set requires fresh independent review and explicit current-session acceptance before implementation can begin; implementation remains blocked until the five open decisions that affect behavior are settled.

# Work: Resolver Raw Return and Router Result Progression

- Status: **Review-driven repair scope confirmed; this revision updates planning artifacts only. Repair, effective-registration, and final-review gates remain unsatisfied until their Results are adopted.**
- [Context](context.md) | [Plan](plan.md) | [Waves](waves.md)

This bounded Work retains the accepted Pi host bridge and Resolver direct-dispatch scope and incorporates the confirmed P3 review repairs. The same-directory `waves.md` is the sole executable graph. This planning result performs no runtime implementation or live bootstrap.

## Objective

Reconcile the existing execution graph so Router/strategy/registered-tool single-call wording, thrown-undefined raw-error preservation, and effective loaded delegate-registration evidence gate any further dependency/Resolver implementation and independent final review. Preserve Router ownership of launch interpretation, full Result correlation, Todo/Waves projection, completion predicates, and dependency release.

## Confirmed scope

- Revise only this Work's existing Work/Context/Plan/Waves tuple, preserving reciprocal links, ownership, conflicts, exclusions, and one Handler/Result completion predicate per item.
- Add separate bounded repair outcomes for single-call wording and raw-error serialization, and a separate effective-registration evidence outcome. Keep independent review as the final read-only outcome.
- Preserve existing item identities `P0-PLAN`, `P1-PI`, `P2-RESOLVER`, and `P3-REVIEW`. New repair/evidence items have new IDs; the review finding's historical P3 reference is not proof that the revised final-review gate is complete.
- Reuse the already present dependency and direct-dispatch candidate and earlier evidence. Revalidate the affected predicates after repair rather than repeating the upgrade or rebuilding direct dispatch merely because old derived text said it was absent.
- Keep pre-launch blocked resolution distinct from resolved-on-attempt responses with exactly one raw return/error. Returned nested `isError` envelopes remain raw returns; thrown values remain raw errors. Router alone interprets launch and Handler Result evidence.

## Authority

- [Router Delegation PRD](../../prd/router-delegation.md)
- [ADR-0001: Router, Resolver and Handler boundaries](../../adr/0001-router-resolver-handler-boundaries.md)
- [ADR-0005: Let Router adapt delegate tools directly](../../adr/0005-let-router-adapt-delegate-tools-directly.md)
- [ADR-0007: Authority-first Router admission](../../adr/0007-authority-first-router-admission.md)
- [Router Delegation Spec](../../spec/router-delegation.md)
- [Backend Adaptation Spec](../../spec/backend-adaptation.md)

These are read-only authority inputs. This tuple derives delivery scope and verification from them and does not amend their normative behavior or prove runtime conformance.

## Current evidence and readiness

The current working-tree manifest and lockfile select Pi `0.99.2`; source already contains selected-tool direct dispatch and raw capture. P3 review reported passing static checks, a high wording contradiction, a medium effective loaded-registration provenance gap, and a low thrown-undefined serialization defect. Live Router/Resolver/Handler bootstrap remains unverified. Earlier claims that Pi is still pinned to `0.85.1` and that direct dispatch is absent are superseded; [Context](context.md) records the current source evidence and limits.

The strategy Skill was externally corrected and is read-only for this revision and the planned repairs. The wording repair must reconcile the remaining Router and registered-tool surfaces with that corrected single-call contract. One `resolve_delegation` call itself invokes the selected delegate; the Router must not launch that same outcome a second time after the response.

Effective loaded registration requires provenance and the actual startup, identity/state, Result-path, notification, and end-turn/resource contract. Static tests or repository declarations alone cannot satisfy that predicate. If establishing it requires unavailable live bootstrap, the evidence item returns `blocked`, its gate remains closed, and dependent implementation/review does not proceed. The exact gates and completion conditions are in [Plan](plan.md) and [Waves](waves.md).

## Exclusions and change boundary

- The current planning result owns only `work.md`, `context.md`, `plan.md`, and `waves.md` in this directory. It preserves unrelated dirty changes and existing authority/source/test/dependency/strategy edits without claiming them as work performed here.
- No current source, test, strategy, Agent, authority, README, manifest, lockfile, installation, activation, reload, launch, deployment, commit, or live-bootstrap change is included. Historical `tasks.md` is neither created nor interpreted.
- Later bounded repair/verification items own only the surfaces named by Waves. No new version upgrade, backend mapping, or broader behavior is silently selected by this revision.
- No retry/fallback/substitution, arbitrary tool execution, wrapper or Harness-owned backend registry, scheduler/queue, lifecycle orchestration, polling/join/cancel/remove, automatic progression, or new persistence is added.

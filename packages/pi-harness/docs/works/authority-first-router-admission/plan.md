# Implementation Plan: Authority-First Router Admission

- Status: draft derived planning material, not accepted or normative; informed by accepted ADR-0007 and Router Delegation Specification Amendment A.1-A.8 (draft)
- Work: [authority-first-router-admission](work.md)
- Context: [processed Work Context](context.md)

## Objective

Implement the smallest admission boundary that prevents unreviewed planned delegation from reaching a backend while preserving direct resolution for verifiably bounded atomic work.

## Scope

1. Add typed admission metadata and stable validation outcomes to the Resolver protocol.
2. Canonicalize exact Work/Plan/Tasks material and validate per-file/set digests.
3. Record and validate current-main-session acceptance in the Harness Extension.
4. Render exact planned materials before confirmation and capture explicit user acceptance.
5. Invalidate stale acceptance and support only user-authorized bounded amendments within the accepted boundary.
6. Add focused tests and reconcile implementation evidence with the authority.

## Non-goals

Child write permissions, fixed stages, CI enforcement, cross-session acceptance, automatic review generation, reviewer discovery, backend lifecycle changes, and the #3 atomic companion rule remain outside this Plan.

## Assumptions and Blockers

The following must be settled before the implementation tasks that depend on them can be completed:

- supported Pi confirmation API;
- supported current-main-session identifier/lifetime;
- trusted representation of fresh independent review evidence;
- whether a user-facing admission inspection command is required;
- whether digest input normalization is exactly ADR-0007's UTF-8/LF rule or includes a repository-normalized form.

The Plan does not invent values for these decisions. Task T1 resolves them as a contract/configuration prerequisite; T2-T5 are blocked on the affected decisions.

## Strategy and Dependencies

### Phase 1: Contract and pure state model

Define admission types, path-specific invariants, stable block codes, canonical document/set digest functions, acceptance record shape, and bounded-amendment classification. Keep these functions independent from Pi UI and backend APIs. This establishes deterministic behavior and gives later Extension integration a small surface.

### Phase 2: Extension admission boundary

Add session-scoped acceptance storage and validator ownership to the Extension. Render exact reviewed identities/digests, capture explicit confirmation through the settled Pi API, and reject generic pacing text or Handler Results as acceptance. Recheck current bytes/digests before each planned resolution.

### Phase 3: Resolver integration

Require and validate admission metadata in the resolver invocation. Preserve the existing successful output shape and ordinary Handoff validation. Return the new coded blocked results without emitting a prompt/model/thinking when admission fails. Keep backend adaptation unchanged after successful resolution.

### Phase 4: Drift, amendment, and integration verification

Verify invalidation when any authority material changes, the current session changes, or review/acceptance digests mismatch. Permit only explicitly authorized non-material bounded amendments. Verify that material scope, architecture, dependency, risk, behavior, or acceptance-criteria changes force fresh review and confirmation.

## Data Flow

```text
User request
    |
    v
Router selects path and builds Handoff + admission evidence
    |
    +--> atomic: basis + focused verification ------------------+
    |                                                           |
    +--> planned: read exact Work/Plan/Tasks                   |
                 canonicalize + digest                         |
                 fresh independent review                       |
                 render exact materials                        |
                 explicit current-session confirmation          |
                         |                                      |
                         v                                      |
                 Extension acceptance record                    |
                         |                                      |
                         +--------------------------+-----------+
                                                    v
                                      Resolver admission validator
                                                    |
                              blocked (coded) or resolved invocation
                                                    |
                                                    v
                                      Router adapts compatible backend
```

## Verification Strategy

- Pure unit checks: canonicalization determinism, set ordering, path-specific shape, stable error codes, digest mismatch, session mismatch, amendment boundary classification.
- Extension checks: exact-material rendering precedes recording; explicit confirmation is required; generic commands and Handler Results cannot record acceptance; session reset removes acceptance; drift invalidates.
- Resolver checks: atomic success/block; planned success/block for each missing/stale condition; ordinary Handoff blocks remain unchanged; successful output does not leak admission into Handler YAML.
- Integration check: one planned invocation reaches backend adaptation only after acceptance; one atomic invocation reaches backend adaptation with no planned acceptance; edits and material amendments stop launch.

## Rollback and Compatibility

The change is additive to the Resolver's blocked-result vocabulary but changes the launch precondition for substantive planned work. Existing valid ordinary Handoffs that do not supply admission metadata must now return `invalid_admission` once the admission contract is active. The Extension must keep the existing resolver tool disabled for invalid configuration and preserve existing Handoff/Role/Skill validation behavior. No backend API changes are required.

## Risks and Mitigations

- Soft atomic classification can be abused: require basis and focused verification, render/audit the decision, and document the hard-enforcement ceiling.
- Digest mismatch can be caused by inconsistent newline handling: centralize canonicalization and test CRLF/LF and repeated reads.
- UI confirmation may be confused with generic user input: use a distinct supported confirmation interaction and test negative cases.
- Acceptance may leak across sessions: keep state in Extension memory and bind every record to the current session identifier.
- Handler may attempt to manufacture authority: accept only Extension-captured review/confirmation state, never Result or Markdown claims.

## Final Integration Gate

All Tasks are complete; the exact implementation diff has fresh independent correctness/evidence review; focused tests pass; the integration check demonstrates both flows and drift invalidation; and no implementation behavior contradicts ADR-0007 or draft Router Delegation Specification Amendment A.1-A.8. The #3 atomic companion rule remains explicitly outside the diff.

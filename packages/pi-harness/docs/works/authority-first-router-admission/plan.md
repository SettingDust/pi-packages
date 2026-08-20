# Implementation Plan: Authority-First Router Admission

- Status: implementation under review; derived planning material, not accepted or normative; final D4 multi-slice/same-call contract and accepted v0.1 TOCTOU residual documented; completion not claimed
- Work: [authority-first-router-admission](work.md)
- Context: [processed Work Context](context.md)

## Objective

Implement the smallest admission boundary that prevents unreviewed planned delegation from reaching a backend while preserving direct resolution for verifiably bounded atomic work and keeping all planned receipts private to the Extension.

## Scope

1. Add typed public atomic/planned admission metadata and stable validation outcomes to the Resolver protocol.
2. Canonicalize one exact grammar-valid Work/Plan/Tasks tuple, normalized Handoff, and full subject according to the normative byte/path/JSON algorithm, including unpaired-surrogate rejection.
3. Add an Extension-owned, current-runtime-session private D2/D3 receipt registry that begins empty and clears all entries on shutdown.
4. Render exact planned materials and capture D2 then D3 through separate dialog-capable TUI interactions only when current-subject reuse does not already resolve or continue D3.
5. Bind authority selectors exactly to Handoff context; reject all model-supplied receipt fields and handles; use tuple grammar rather than Skills, Markdown, or D2 as kind proof.
6. Invalidate current acceptance on document, set, Handoff, subject, or session drift; apply the deterministic same-call explicit/bootstrap/bounded-amendment status transition.
7. Add focused tests and reconcile implementation evidence with the authority.

## Non-goals

Child write permissions, fixed stages, CI enforcement, cross-session acceptance, automatic review generation, reviewer discovery, external-review receipt transport, unapproved noninteractive planned receipt issuance, inspection commands, backend lifecycle changes, Work-owned persistent admission lifecycle, and the `#3 atomic delegation` companion rule remain outside this Plan.

## Settled Contract and Implementation Prerequisites

The authority contract settles D1-A JIT canonical digest checks, D2-A Extension-issued `user-review-v1` receipts for the current interactive user, D3-A separate user-witnessed acceptance, D4-A private current-runtime-session receipt storage, and the accepted v0.1 TOCTOU boundary. ADR-0007 and Spec A.1 define the canonical input and subject identity exactly. A user-facing inspection command, immutable authority snapshot, read lock, and backend preflight are out of scope.

Implementation must use supported Pi session and TUI APIs to enforce the settled contract, not replace it with model-supplied receipt metadata, Markdown state, Handler Results, or text parsing. The exact Work/Plan/Tasks set and any additional implementation changes require the applicable review and acceptance; the current implementation remains under review and the final Handler read is not byte-bound.

## Strategy and Dependencies

### Phase 1: Canonical public contract and pure validation

Define atomic/planned admission types, forbidden receipt-shaped fields, stable block codes, exact D1-A document/set/Handoff/subject canonicalization, unpaired-surrogate rejection, direct-member Work/Plan/Tasks tuple grammar, authority-to-context binding, and amendment eligibility classification. Keep these functions independent from Pi UI and backend APIs. The model's planned input is only the three authority paths; it cannot choose or replay a receipt, scan a Work directory, or prove kind from a Skill or Markdown label.

### Phase 2: Private Extension state and lifecycle

Add the private registry inside the Harness Extension ownership boundary. Begin empty for every Extension construction, clear all entries on `session_shutdown`, bind remaining runtime state to the active `sessionManager.getSessionId()`, and distinguish authenticated-prior, current-D2, and currently-valid-D3 lookups. Do not serialize registry state, add a capability handle, or persist it outside the runtime.

### Phase 3: Ordered user-witnessed admission

For planned admission in a dialog-capable TUI, JIT-compute and render the exact subject, obtain D2 approval from the current interactive user, recheck, then render and obtain D3 acceptance. Reuse a matching current D3 without UI in the same active session; reuse matching current D2 only to request D3. Treat external review output only as evidence rendered to the human. Recompute again immediately before resolution and fail closed when required UI is unavailable or any identity changes during the flow. The final recheck ends the v0.1 authority guarantee; no snapshot or backend preflight binds a later Handler read to immutable reviewed bytes.

### Phase 4: Resolver integration, drift, and amendment

Require the public admission shape in resolver invocation while preserving ordinary Handoff validation and the successful output shape. Return coded blocks without prompt/model/thinking on failure. A different stored subject enters the same-call transition: no prior or changed tuple uses explicit D2 then D3; same-tuple affirmative bounded authorization uses new D2 then D3; negative or material authorization returns `amendment_invalidated`; only a subject change during the in-call flow returns `authority_drift`. Keep backend adaptation unchanged after success.

## Data Flow

```text
Router builds Handoff + public admission selectors
  |
  +-> atomic: basis + focused verification
  |     -> Resolver validation
  |
  `-> planned: one grammar-valid tuple bound to Handoff
        -> Extension JIT canonicalizes tuple + Handoff
        -> current D3: resolve
        -> current D2 only: D3 TUI
        -> no current D2: explicit or bounded same-call flow
        -> final JIT mismatch: authority_drift
        -> Resolver validation
             -> blocked (coded) or resolved invocation
             -> Router adapts compatible backend
```

No Work status, directory scan, or Dust lifecycle selects an admission tuple.

No Work status, directory scan, or Dust lifecycle selects an admission tuple.

## Verification Strategy

- Pure unit checks: CRLF/bare-CR/LF byte normalization; canonical path separators and drive letter; direct-member tuple grammar and matching slices; unpaired-surrogate rejection; JSON escaping/key/array ordering; repeatable document/set/Handoff/subject digests; forbidden receipt fields; authority-context mismatch; and ordinary validation regressions.
- Registry checks: private state is never accepted from or returned to a tool call; active-session binding; construction/session-shutdown reset; authenticated-prior versus current-D2 versus currently-valid-D3 state; same-subject reuse; and no cross-session reuse.
- Extension checks: D2 rendering/confirmation precedes D3 when needed; each uses the exact rechecked subject; existing current D3 has no new prompt; current D2 requests only D3; external review material cannot create a receipt; generic commands/Handler Results/Markdown cannot create one; and no-UI statuses follow the next missing receipt.
- Resolver checks: atomic success/block; planned success/block for grammar/context mismatch, missing D2/D3, unavailable UI, session mismatch, forbidden fields, and unpaired surrogates; successful Handler YAML excludes admission/receipt state; same-call branches return explicit, amendment-invalidated, or authority-drift status deterministically.
- Integration check: one planned invocation reaches backend adaptation only after D2/D3; a repeated same-subject invocation reuses D3; one atomic invocation resolves without planned receipts; authority or Handoff edit follows the same-call branch; an affirmative same-path bounded amendment emits new linked receipts; no-prior/path-changing requests use explicit D2/D3; rejected/material bounded attempts do not reuse prior receipts. Evidence must explicitly report the accepted post-recheck TOCTOU residual and must not claim immutable reviewed-byte execution.

## Rollback and Compatibility

The change is additive to the Resolver's blocked-result vocabulary but changes the launch precondition for substantive planned work. Existing valid ordinary Handoffs that do not supply admission metadata must return `invalid_admission` once the admission contract is active. The Extension must keep the existing resolver tool disabled for invalid configuration and preserve existing Handoff/Role/Skill validation behavior. No backend API changes are required.

## Risks and Mitigations

- Soft atomic classification can be abused: require basis and focused verification, render/audit the decision, and document the hard-enforcement ceiling.
- Digest mismatch can be caused by ambiguous serialization: implement Spec A.1 directly, reject unpaired surrogates, and assert exact byte/path/JSON vectors rather than relying on `JSON.stringify`.
- Model-provided receipt fields can forge admission: reject them structurally and keep all registry state private to the Extension.
- A single confirmation can conflate D2 and D3: require distinct ordered TUI confirmations with a recheck between them, while permitting only exact current-subject reuse.
- Acceptance can leak across sessions or runtime reload: begin empty, clear all receipt entries on shutdown, bind private state to the active session, and fail closed when the next required interaction lacks UI.
- Handler authority can drift from the review set: require grammar-valid selectors to be exact Handoff context references and bind the normalized Handoff into the subject.
- Final JIT is the v0.1 authority endpoint: disclose the post-recheck filesystem race because the Handler receives path references without a snapshot, read lock, or backend preflight.

## Final Integration Gate

All Tasks are complete; the exact implementation diff has fresh independent correctness/evidence review; focused tests pass; the integration check demonstrates atomic, D2/D3 planned, same-subject reuse, no-UI status, tuple/context rejection, unpaired-surrogate rejection, Handoff/document drift, and bounded-amendment boundaries; the evidence explicitly preserves the accepted v0.1 TOCTOU residual; and no implementation behavior contradicts ADR-0007 or draft Router Delegation Specification Amendment A.1-A.8. The `#3 atomic delegation` companion rule remains explicitly outside the diff.

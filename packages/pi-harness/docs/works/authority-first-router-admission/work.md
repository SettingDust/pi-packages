# Authority-First Router Admission Work

- Status: implementation under review; derived coordination material, not accepted or normative; D4 multi-slice/same-call revision documented; accepted v0.1 TOCTOU residual recorded; completion not claimed
- Date: 2026-08-19

## Goal

Add a verifiable authority-first admission boundary between Router delegation resolution and backend launch, with a low-friction atomic path and an exact planned path whose D2/D3 receipts are private to the Harness Extension.

## Authority

- [ADR-0007](../../adr/0007-authority-first-router-admission.md)
- [Router Delegation Specification](../../spec/router-delegation.md), draft Amendment A.1-A.8
- [Work Context](context.md)
- [Implementation Plan](plan.md)
- [Tasks](tasks.md)

## Current Stage

The accepted high-level ADR records the two-path admission architecture. D1-A JIT canonicalization, D2-A current-interactive-user review, D3-A explicit acceptance, D4-A Extension-private receipt issuance, and the accepted v0.1 TOCTOU boundary are documented in ADR-0007 and the draft Specification Amendment A. The implementation is under review; this Work package records no source or test changes and does not claim completion or immutable Handler reads.

## Admission Decision Slices

- **D1-A JIT / accepted v0.1 boundary:** every planned resolution recomputes the selected canonical Work/Plan/Tasks tuple, set digest, normalized-Handoff digest, and subject digest immediately before admission. The final JIT recheck ends the authority guarantee; v0.1 does not snapshot documents, hold a read lock, or require a backend preflight, so a later Handler read is not guaranteed to observe the reviewed bytes.
- **Selected multi-slice tuple:** one Work directory may contain multiple direct Plan/Tasks pairs, but each planned resolution selects exactly one grammar-valid `(work.md, plan, tasks)` tuple. Matching optional slices are structural checks only; no directory scan, Work status, document order, Skill, Markdown label, or D2 review selects or proves another member.
- **D2-A runtime receipt / D3-A acceptance:** only the Extension may issue `user-review-v1` after the `current-interactive-user` gives the first TUI approval for the exact subject. A matching D3 is reusable only for the same subject in the active runtime session; a matching D2 without D3 may request only D3. External independent-review material is evidence only, never a receipt.
- **D4-A private channel and lifecycle:** the model selects only the grammar-valid Work/Plan/Tasks paths, each exactly once in Handoff context; it cannot provide receipt fields or handles. The Extension registry begins empty on construction, clears all entries on `session_shutdown`, and never exposes registry data to a Handler or backend.
- **Drift and amendment:** a differing old receipt starts the deterministic same-call transition, not an unconditional `authority_drift`: no-prior or changed-path selections use explicit D2 then D3; an affirmative same-path bounded authorization uses new D2 then D3; negative or material authorization returns `amendment_invalidated`; only a JIT change during the flow returns `authority_drift`. Required D2/D3 issuance is TUI-only, with `review_required`/`acceptance_required` determined by the next missing receipt.

The bounded documentation scope does not include an admission inspection command, backend-specific admission behavior, or the related `#3 atomic delegation` companion rule.

## Completion Signal

The documentation update is complete when D1-A through D4-A, exact canonicalization and unpaired-surrogate rejection, selected multi-slice tuple grammar, authority-to-Handoff binding, current-receipt reuse/lifecycle, deterministic same-call drift/amendment statuses, no-UI fail-closed behavior, the accepted v0.1 TOCTOU residual, and implementation-under-review status are consistent across ADR, Spec, Work, Plan, and Tasks. This Work package does not claim implementation completion.

## Boundary Note

The existing `#3 atomic delegation` companion rule is an adjacent interface concern. This Work package documents the relationship but does not implement or redefine that rule.

## Authority Ownership Audit

| Concern | Owning artifact | Audit result |
|---|---|---|
| Product intent, scope, outcomes, and package non-goals | [Router Delegation PRD](../../prd/router-delegation.md) | Existing PRD remains sufficient; admission is a delivery/governance contract within the existing Router product boundary, not a new product feature branch. |
| Router/Resolver/Environment/Handler ownership | [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md) | Existing boundaries remain valid. Session admission belongs to the Harness Extension/Router boundary; backend launch remains environment-owned. |
| Structured Handoff, Resolver blocked results, YAML messages | [ADR-0002](../../adr/0002-structured-handoff-and-yaml-results.md) and [Router Delegation Specification](../../spec/router-delegation.md) | Existing Handoff/Result contract remains the base. Admission is an additional Resolver precondition and does not change Handler Result workflow ownership. |
| Direct backend adaptation | [ADR-0005](../../adr/0005-let-router-adapt-delegate-tools-directly.md) and [Backend Adaptation Specification](../../spec/backend-adaptation.md) | No backend adapter or lifecycle authority is introduced. Admission completes before existing backend mapping. |
| Accepted admission architecture and governance | [ADR-0007](../../adr/0007-authority-first-router-admission.md) | Records the two-path model, D1-A through D4-A private receipt channel, session ownership, exact subject binding, drift/amendment semantics, and non-goals. |
| Draft admission behavior and failure contract | [Router Delegation Specification](../../spec/router-delegation.md), Amendment A.1-A.8 | The amendment remains a draft contract extension under implementation review; D1-A through D4-A and the v0.1 TOCTOU boundary are settled, while this Work package does not claim implementation completion. |
| Candidate evolution and alternatives | [Authority-First Router Admission Proposal](../../proposals/authority-first-router-admission.md) | Non-authoritative proposal retained as decision history; it does not create a receipt or authorize implementation. |
| Delivery context and execution sequencing | This Work, Context, Plan, and Tasks set | Derived material only; it does not create product or technical authority. |

No existing PRD, ADR, or Spec was superseded. The existing Router Delegation Work remains the prior package-delivery context; this Work is a bounded follow-up for admission and links back to its authority rather than rewriting it.

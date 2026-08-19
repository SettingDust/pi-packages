# Authority-First Router Admission Work

- Status: planned; derived coordination material, not accepted or normative; awaiting fresh independent review and explicit user acceptance
- Date: 2026-08-19

## Goal

Add a verifiable authority-first admission boundary between Router delegation resolution and backend launch, with a low-friction atomic path and an exact reviewed planned path.

## Authority

- [ADR-0007](../../adr/0007-authority-first-router-admission.md)
- [Router Delegation Specification](../../spec/router-delegation.md), Amendment A.1-A.8 (draft)
- [Work Context](context.md)
- [Implementation Plan](plan.md)
- [Tasks](tasks.md)

## Current Stage

The accepted high-level ADR is recorded, and the amendment/derived implementation materials are drafted in the documentation branch. No source or test changes are part of this work package yet. Before implementation, this package requires fresh independent review of the exact Work/Plan/Tasks set and explicit user acceptance recorded by the Harness Extension in the current main session.

## Completion Signal

The implementation is complete when all Tasks pass their focused checks, the integration gate confirms both admission paths and invalidation behavior, and the implementation evidence is reconciled against ADR-0007 and Router Delegation Specification Amendment A.1-A.8.

## Boundary Note

The existing `#3 atomic delegation` companion rule is an adjacent interface concern. This Work package documents the relationship but does not implement or redefine that rule.

## Authority Ownership Audit

| Concern | Owning artifact | Audit result |
|---|---|---|
| Product intent, scope, outcomes, and package non-goals | [Router Delegation PRD](../../prd/router-delegation.md) | Existing PRD remains sufficient; admission is a delivery/governance contract within the existing Router product boundary, not a new product feature branch. |
| Router/Resolver/Environment/Handler ownership | [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md) | Existing boundaries remain valid. Session acceptance belongs to the Harness Extension/Router boundary; backend launch remains environment-owned. |
| Structured Handoff, Resolver blocked results, YAML messages | [ADR-0002](../../adr/0002-structured-handoff-and-yaml-results.md) and [Router Delegation Specification](../../spec/router-delegation.md) | Existing Handoff/Result contract remains the base. Admission is an additional Resolver precondition and does not change Handler Result workflow ownership. |
| Direct backend adaptation | [ADR-0005](../../adr/0005-let-router-adapt-delegate-tools-directly.md) and [Backend Adaptation Specification](../../spec/backend-adaptation.md) | No backend adapter or lifecycle authority is introduced. Admission completes before existing backend mapping. |
| Accepted admission architecture and governance | [ADR-0007](../../adr/0007-authority-first-router-admission.md) | New distinct decision; records the confirmed two-path model, session ownership, exact digest binding, amendment/invalidation, and non-goals. |
| Draft admission behavior and failure contract | [Router Delegation Specification](../../spec/router-delegation.md), Amendment A.1-A.8 | The amendment is a draft contract extension, not normative until unresolved decisions are settled, the exact Work/Plan/Tasks set receives fresh independent review, and the user explicitly accepts it in the current session. |
| Candidate evolution and alternatives | [Authority-First Router Admission Proposal](../../proposals/authority-first-router-admission.md) | Non-authoritative proposal retained as decision history; it distinguishes accepted ADR-0007 from Draft Amendment A. |
| Delivery context and execution sequencing | This Work, Context, Plan, and Tasks set | Derived material only; it does not create product or technical authority. |

No existing PRD, ADR, or Spec was superseded. The existing Router Delegation Work remains the prior package-delivery context; this Work is a bounded follow-up for admission and links back to its authority rather than rewriting it.

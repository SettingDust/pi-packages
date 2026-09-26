---
name: spec-driven-development
description: Coordinate authority-first delivery for durable behavior, interface, architecture, security, migration, or multi-step changes. Use when PRD, ADR, or Spec authority must be established or updated before implementation.
---

# Spec-Driven Development

## Method

1. Classify the change. Use this method when intended behavior, interfaces, constraints, invariants, architecture, security, migration, compatibility, or durable multi-step delivery changes. Apply the limited existing-authorization exceptions below only when their conditions hold.
2. Identify applicable durable authority:
   - PRD owns product intent, users, scope, outcomes, and success criteria;
   - ADR owns accepted architectural or governance decisions and rationale;
   - Spec owns normative behavior, interfaces, constraints, and failures.
3. Inspect current authority and implementation. Settle material intent with the user before specifying new behavior; surface unanswered alternatives and separate intended behavior, observed behavior, and assumptions. Reuse existing authority when it already expresses the agreed behavior.
4. Use `documentation` and the applicable owning writers to create or update only authority that would otherwise be false, missing, or materially incomplete. Update existing ownership instead of creating competing documents.
5. Resolve material intent or evidence gaps before new normative behavior or implementation; express agreed new behavior verifiably in the owning Spec before deriving an implementation Plan. Preparatory analysis, authority reconciliation, and planning follow their own authorization and admission rules without waiting for confirmation of a not-yet-ready implementation Plan.
6. When useful, derive bounded Work Context, Plan, and Tasks through `documentation-work`, `plan-implementation`, and their owning writers. Do not require artifacts that add no control value.
7. Implement only after the Router has disclosed and obtained explicit current-user confirmation of the ready implementation scope. If implementation reveals an upstream authority or material design gap, stop affected work and report it for Router-owned reconciliation and confirmation of the changed portion; continue unchanged confirmed work without repeat approval.
8. Validate delivered behavior against authority and repository checks.

## Exceptions

Under existing explicit authorization, a bounded repair may restore already-authoritative behavior without a new Spec or implementation-plan confirmation: identify authority and divergence, run focused verification, and report. Ambiguous authority or new behavior follows the normal authority and confirmation sequence. During an active security, data-loss, or availability incident, take only the minimum authorized containment action needed to limit harm; check its effect, report it as temporary, and reconcile authority afterward. Destructive or externally high-impact actions still require their separate action authorization; broader follow-on repair needs its own authority and plan confirmation. Small authorized behavior-neutral maintenance may proceed without a new Spec or plan confirmation after a focused unchanged-behavior check. These exceptions grant no authorization by themselves; material behavior, scope, architecture, dependency, or risk changes follow the normal sequence.

## Completion

Complete each delegated outcome against its own authority and evidence checks; derived artifacts must not conflict with applicable authority. Require implementation checks and resolve unexplained implementation drift only when implementation is the delegated outcome. This Skill coordinates owning methods; it does not write every artifact itself.

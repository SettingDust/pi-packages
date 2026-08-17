---
name: spec-driven-development
description: Coordinate authority-first delivery for durable behavior, interface, architecture, security, migration, or multi-step changes. Use when PRD, ADR, or Spec authority must be established or updated before implementation.
---

# Spec-Driven Development

## Method

1. Classify the change. Use this method when intended behavior, interfaces, constraints, invariants, architecture, security, migration, compatibility, or durable multi-step delivery changes. A simple repair that restores already-authoritative behavior may proceed directly.
2. Identify applicable durable authority:
   - PRD owns product intent, users, scope, outcomes, and success criteria;
   - ADR owns accepted architectural or governance decisions and rationale;
   - Spec owns normative behavior, interfaces, constraints, and failures.
3. Inspect current authority and implementation. Separate intended behavior, observed behavior, and assumptions.
4. Use `documentation` and the applicable owning writers to create or update only authority that would otherwise be false, missing, or materially incomplete. Update existing ownership instead of creating competing documents.
5. Resolve material intent or evidence gaps before irreversible design or implementation.
6. When useful, derive bounded Work Context, Plan, and Tasks through `documentation-work`, `plan-implementation`, and their owning writers. Do not require artifacts that add no control value.
7. Implement within accepted authority. If implementation reveals an upstream authority or design gap, stop affected work, reconcile authority first, then regenerate the affected Plan and obtain required acceptance or review.
8. Validate delivered behavior against authority and repository checks.

## Exceptions

A minimal containment change may precede authority updates during an active security, data-loss, or availability incident. Record the bounded exception and complete reconciliation afterward.

## Completion

Complete only when applicable authority is current, derived artifacts do not conflict with it, implementation checks pass, and no unexplained authority or implementation drift remains. This Skill coordinates owning methods; it does not write every artifact itself.

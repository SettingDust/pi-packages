---
name: documentation
description: Classify ownership and coordinate multi-artifact documentation work. Use when a request spans document types, converts a proposal into authority, or has unclear PRD, ADR, Spec, DDD, Work, or ordinary-document ownership.
---

# Documentation

## Method

1. Identify the durable knowledge changed by the request and inspect existing repository documentation conventions.
2. Classify each applicable branch independently:
   - PRD: product intent, users, scope, outcomes, and success criteria;
   - ADR: accepted architecture or governance decision and rationale;
   - Spec: normative behavior, interfaces, constraints, and failures;
   - DDD: domain language, invariants, bounded contexts, and relationships;
   - Proposal: non-authoritative candidate change and lifecycle;
   - ordinary documentation: human guidance or reference not owned above.
3. For each branch choose `create`, `update`, `skip`, or `blocked`, with evidence and target. Update existing ownership instead of duplicating meaning.
4. Use the corresponding owning Skill for every created or updated specialized artifact. Use `documentation-structure` for placement and relationships.
5. Keep derived Work, Context, Plan, and Waves separate from durable authority and create them only when delivery needs them. Historical Tasks artifacts are compatibility records, not a new-plan execution path.
6. Complete all unblocked branches; one blocked branch must not stop independent documentation work.

## Output

For each branch report action, evidence, target, result, and missing information. Do not write specialized artifacts inside this coordinator when an owning Skill exists.

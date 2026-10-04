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
3. Before dependent planning, visibly account for every PRD/ADR/Spec family and each other applicable branch: `reuse` (adequate existing coverage), `update` (amend the same owner or decision identity), `create` (missing required authority or a distinct accepted ADR lifecycle), `skip` (no change needed or not applicable), or `blocked` (unresolved coverage, ownership, evidence, permission, or intent). State owning boundary, existing or intended path, and a one-sentence evidence-backed reason. Unknown ownership is unresolved; intended outputs are not readable references. Assessment supplies neither writing permission nor implementation confirmation. Reuse reliable assessment covering current scope, decisions, owners, and relevant authority versions; material changes, contradictions, or important uncertainty require reassessment only of the affected portion.
4. When authority is missing, false, materially incomplete, or subject to an important unresolved coverage question, load `spec-driven-development` through normal Skill loading as primary, companion, or a conditionally required method. Required reconciliation must be complete before dependent planning; missing required evidence, permission, or decisions blocks affected work. Use the corresponding owning Skill for every authorized created or updated specialized artifact. Use `documentation-structure` for placement and relationships. Apply `documentation-adr-writing` lifecycle: update the owning ADR for the same decision identity; create only for a distinct accepted lifecycle. Never record an unaccepted choice as an accepted ADR.
5. Keep derived Work, Context, Plan, and Waves separate from durable authority and create them only when delivery needs them. Historical Tasks artifacts are compatibility records, not a new-plan execution path.
6. Complete unblocked internal branches only within the current delegated predicate. Do not execute independent authority-writing/planning outcomes or use a blocked branch to choose continuation; return material unsettled choices as evidence and gaps for Router-owned communication. Do not ask the user, dispatch, or advance Result/Waves/Todo state.

Settled evidence permits direct entry to a narrow owning writer without waiving assessment, authority, or authorization duties. SDD is not the exclusive ADR entrance or a mandatory reload at every stage or Handler call. Evidence-backed `reuse` or `skip` preserves authorized restoration/maintenance exceptions without a new ADR, Spec, Plan, or repeat approval of unchanged confirmed work. First Work/Context/Plan/Waves preparation uses standalone with current readable inputs and declared outputs, not the future tuple it creates; graph-bound implementation retains its confirmation, prerequisites, and gates.

## Output

For each branch report action, evidence, target, result, and missing information. Do not write specialized artifacts inside this coordinator when an owning Skill exists.

---
name: documentation-spec-writing
description: Create, update, or validate normative technical behavior, interfaces, constraints, invariants, and failure contracts. Use when implementation needs precise verifiable authority.
---

# Documentation: Spec Writing

## Method

1. Identify the Spec's owned system boundary and applicable PRD and ADR authority. Update an existing owning Spec instead of creating a competing contract.
2. Define actors, inputs, outputs, states, interfaces, data shapes, invariants, permissions, and trust boundaries that are material to behavior.
3. Specify success, empty, invalid, partial, concurrency, timeout, compatibility, and failure behavior where applicable.
4. Use normative language consistently: `must` for requirements, `may` for permitted behavior, and explicit non-goals for excluded behavior.
5. Keep product motivation in PRDs, decision rationale in ADRs, and implementation sequence in Plans or Tasks.
6. Include examples only when they disambiguate the contract; examples must not contradict the normative text.
7. Define verifiable acceptance conditions and map them to realistic checks.
8. Validate internal consistency, referenced schemas, edge cases, and alignment with related authority and current implementation when requested.

## Output

Report the Spec path, created or changed contracts, validation findings, affected implementation surfaces, and unresolved authority gaps. Do not silently encode an undecided architecture choice.

---
name: analyze-solution-directions
description: Generate and compare materially different solution directions against constraints and evidence. Use for architecture or design exploration before committing to one approach.
---

# Analyze Solution Directions

Apply `research-source-grounded` when project or external evidence materially affects the analysis.

## Method

1. Establish the decision, current system boundary, hard constraints, success criteria, and unresolved assumptions.
2. Inspect existing patterns and native capabilities before proposing new mechanisms.
3. Generate at least two materially different viable directions. A parameter tweak or renamed abstraction is not a separate direction.
4. For each direction, describe the interface or operating model, affected ownership boundaries, migration path, failure behavior, testing implications, and what it deliberately omits.
5. Compare directions against the same explicit criteria: correctness, simplicity, coupling, reversibility, operational risk, compatibility, and delivery cost as applicable.
6. Challenge the leading direction with counterexamples and identify conditions that would favor another option.
7. Recommend a direction only when evidence is sufficient; otherwise return the exact decision or research gap.

## Output

Provide a concise comparison, recommendation, rationale, assumptions, risks, and rejected alternatives. Do not write authoritative ADR or Spec content, commit architecture, or implement the choice without a separate authorized objective.

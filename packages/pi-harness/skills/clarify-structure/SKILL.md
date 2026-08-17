---
name: clarify-structure
description: Turn dense, tangled, or poorly organized input into a clear decision structure. Use when the underlying intent is known but options, dependencies, priorities, or information architecture need decomposition.
---

# Clarify Structure

## Method

1. Preserve the supplied meaning; do not introduce new requirements or silently resolve open decisions.
2. Extract goals, actors, objects, constraints, options, dependencies, and acceptance conditions.
3. Group related items and expose conflicts, overlaps, missing links, and ordering constraints.
4. Choose the smallest useful visual structure: comparison table, decision tree, workflow, hierarchy, state list, or before/after skeleton.
5. Label facts, interpretations, and unresolved choices distinctly.
6. Formulate only the questions needed to choose between materially different structures.

## Output

Return a scannable structure plus:

- the organizing principle used;
- preserved facts and constraints;
- unresolved structural choices with concrete alternatives;
- conflicts or missing relationships;
- a recommended structure when evidence is sufficient.

Do not ask the user directly or turn structural cleanup into product, architecture, or implementation decisions. The Router presents questions and owns the next action.

---
name: research-deep
description: Investigate a complex system, architecture, dependency, convention, impact, or risk across multiple sources. Use when the answer requires synthesis rather than one narrow fact.
---

# Research: Deep

Apply `research-source-grounded` to all material claims.

## Method

1. Define the research question, decisions it must inform, exclusions, and evidence thresholds.
2. Decompose the question into the smallest independent lines of inquiry, such as ownership, runtime flow, contracts, dependencies, history, failure behavior, and operational constraints.
3. Trace primary sources for each line. Follow references and callers only far enough to establish the relevant behavior.
4. Reconcile conflicts between documentation, implementation, tests, and history. Treat observed implementation and intended authority as separate facts.
5. Synthesize cross-source findings into mechanisms, constraints, risks, and unresolved gaps. Label inference explicitly.
6. Test the synthesis against counterexamples and meaningful negative evidence before concluding.

## Output

Provide:

- scope and research questions;
- findings organized by line of inquiry;
- source-backed synthesis of how the system works;
- conflicts, risks, uncertainties, and searched negative evidence;
- decision-relevant conclusions without making the decision itself.

Do not edit the subject or turn research into an implementation plan unless the Handoff explicitly requests those deliverables.

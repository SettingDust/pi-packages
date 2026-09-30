---
name: documentation-proposal-writing
description: Create, update, validate, accept, reject, supersede, or withdraw a non-authoritative proposal. Use for candidate changes that need discussion before product or technical authority is updated.
---

# Documentation: Proposal Writing

## Method

1. Identify the requested lifecycle operation and inspect existing proposal conventions and related authority.
2. For creation or update, state the problem, proposed change, motivation, alternatives, tradeoffs, evidence, impact, and unresolved questions. Clearly label the artifact non-authoritative.
3. Keep product requirements, accepted architecture, and normative contracts in their owning authority; link them as current constraints.
4. For validation, check evidence, internal consistency, feasibility assumptions, affected authority, and decision readiness without changing lifecycle state.
5. For acceptance, record the accepted candidate and date or decision evidence, then identify independently which PRD, ADR, and Spec artifacts require creation or update. Acceptance does not itself rewrite authority.
6. For rejection, withdrawal, or supersession, preserve decision history, rationale when supplied, and the replacing proposal or authority reference.
7. Do not derive an implementation Plan or its Waves graph until required authority is current. Historical Tasks remain compatibility records and require an explicit migration decision; do not create a new executable Tasks layer.

## Output

Report proposal path, lifecycle operation and resulting state, evidence or decision reference, affected authority branches, and unresolved gaps.

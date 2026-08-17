---
name: review-decision
description: Independently review a proposed or accepted decision for evidence, alternatives, assumptions, constraints, consequences, and reversibility. Use for read-only PRD, ADR, proposal, or design-decision assessment.
---

# Review Decision

This is read-only. Apply `research-source-grounded` when evaluating source-backed premises.

## Method

1. Identify the decision, owner, status, intended outcome, constraints, and affected stakeholders or systems.
2. Separate facts, assumptions, preferences, and unresolved questions in the decision rationale.
3. Verify that materially different viable alternatives were considered against consistent criteria. Do not require ceremonial alternatives when only one option satisfies hard constraints.
4. Test whether the selected option follows from the evidence and priorities, including negative consequences, migration, lock-in, reversibility, and operational obligations.
5. Search for omitted constraints, contradictory authority, stale premises, and conditions that would invalidate the choice.
6. Report decision defects, missing evidence, and required reconsideration triggers. Do not substitute a new decision unless the Handoff requests a recommendation.

## Output

Return findings ordered by consequence, supported strengths, assumptions, missing evidence, unexamined alternatives, consequence gaps, and an overall readiness assessment. Do not edit or change decision status.

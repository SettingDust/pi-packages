---
name: documentation-adr-writing
description: Create or update an architectural decision record with context, decision, rationale, consequences, and revisit criteria. Use after a technical or governance decision is accepted.
---

# Documentation: ADR Writing

## Method

1. Confirm the decision has been made or the Handoff explicitly authorizes recording it. Use `analyze-solution-directions` or `review-decision` when a choice still needs analysis.
2. Inspect existing ADRs and update the owning decision when its identity remains the same. Create a new ADR only for a distinct decision lifecycle.
3. Record status and stable decision identity, the forcing context, constraints, and decision drivers.
4. State the decision precisely enough to distinguish required behavior from implementation freedom.
5. Summarize materially considered alternatives and why they were not selected. Do not fabricate alternatives after the fact.
6. Record positive and negative consequences, compatibility or migration effects, operational obligations, and follow-up authority changes.
7. Define conditions that would trigger reconsideration or supersession.
8. Link related PRD and Spec authority without copying their owned content.

## Output

Report the ADR path, recorded decision, affected authority, consequences, and unresolved follow-up. Do not present an unaccepted proposal as an accepted ADR.

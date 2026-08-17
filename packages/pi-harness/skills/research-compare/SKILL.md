---
name: research-compare
description: Compare concrete alternatives against explicit criteria and equivalent evidence. Use for libraries, architectures, tools, vendors, workflows, or approaches when a decision needs a defensible tradeoff analysis.
---

# Research: Compare

Apply `research-source-grounded` to material claims about every alternative.

## Method

1. Confirm the alternatives, decision owner, required criteria, constraints, and disqualifiers. Do not add a favored option before evidence is gathered.
2. Define criteria in observable terms and state weighting only when supplied or evidence-backed.
3. Gather comparable primary evidence for each alternative. Mark criteria with unequal evidence quality rather than treating missing data as a low score.
4. Evaluate hard constraints before preferences. Separate current capability, integration cost, operational risk, and future speculation.
5. Identify dominated options, reversible choices, lock-in, and the conditions under which the ranking would change.
6. Recommend an option only when the evidence and supplied priorities support it.

## Output

Return:

- alternatives and explicit criteria;
- a compact evidence matrix using the same criteria for every option;
- disqualifiers, tradeoffs, uncertainty, and negative evidence;
- recommendation with rationale, or the exact decision evidence still missing;
- conditions that would change the recommendation.

Do not hide incomparable evidence behind numeric scores or vendor claims.

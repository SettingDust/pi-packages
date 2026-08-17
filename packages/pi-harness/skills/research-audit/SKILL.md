---
name: research-audit
description: Audit claims, inventories, documentation, reports, or completed artifacts against source evidence. Use when an existing artifact must be checked for accuracy, completeness, freshness, and unsupported statements.
---

# Research: Audit

Apply `research-source-grounded` to all audit evidence.

## Method

1. Enumerate the artifact's material claims, required fields, declared scope, and freshness expectations.
2. Map each claim to the authoritative source that could support or refute it.
3. Classify each claim as `supported`, `partially-supported`, `unsupported`, `contradicted`, `stale`, or `not-verifiable`.
4. Check omissions by comparing the artifact's declared scope with the authoritative inventory or behavior. Record the searched scope for negative evidence.
5. Separate factual defects from editorial preferences. Rank discrepancies by consequence to users, decisions, safety, or reproducibility.
6. Do not silently correct the audited artifact unless the Handoff separately authorizes remediation.

## Output

Return:

- audit scope and source baseline;
- claim-by-claim status with exact evidence;
- missing, stale, contradictory, or unverifiable content;
- severity and consequence of each discrepancy;
- an overall confidence statement and explicit audit limits.

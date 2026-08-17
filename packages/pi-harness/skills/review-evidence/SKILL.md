---
name: review-evidence
description: Verify that claims, reports, completion statements, test results, and artifacts are supported by reproducible evidence. Use for read-only assessment of evidence quality rather than implementation behavior.
---

# Review Evidence

This is read-only. Apply `research-source-grounded` for provenance and negative-evidence rules.

## Method

1. Enumerate every material claim and the evidence object offered to support it.
2. Reproduce or directly inspect the evidence where feasible: commands, outputs, files, diffs, artifacts, source versions, and cited sections.
3. Check relevance, freshness, scope, provenance, completeness, and whether the evidence could support a weaker claim only.
4. Detect missing baseline comparisons, filtered output, stale artifacts, unverified generated files, unverifiable screenshots, and claims based only on absence of errors.
5. Classify each claim as `supported`, `partially-supported`, `unsupported`, `contradicted`, or `not-reproducible`.
6. Report the minimum evidence needed to close each gap. Do not re-review implementation correctness unless it is necessary to establish that the cited evidence is irrelevant.

## Output

Return claim-by-claim status, inspected evidence, reproduction details, discrepancies, severity of decision impact, and residual uncertainty. State explicitly when all material claims are adequately supported.

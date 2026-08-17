---
name: review-correctness
description: Independently review implementation behavior, regressions, failure paths, edge cases, maintainability defects, and verification sufficiency. Use for read-only correctness assessment of code or a change.
---

# Review Correctness

This is read-only. Apply `research-source-grounded` to source-backed findings.

## Method

1. Read the declared change, applicable authority, acceptance checks, diff, and verification evidence.
2. Enumerate changed behaviors and trace relevant inputs, outputs, state transitions, callers, shared ownership, and failure paths.
3. Test success and failure behavior against the contract. Check adjacent regressions, boundary conditions, cleanup, concurrency, compatibility, and error propagation as applicable.
4. Evaluate whether tests would fail for the identified defect and whether verification covers the changed risk.
5. Report only actionable defects with concrete impact and exact source locations. Exclude style preferences and speculative flexibility.
6. When no defect is found, state that clearly and identify only residual test or environment risk.

## Findings

For each finding provide `severity` (`critical`, `high`, `medium`, or `low`), title, violated expectation, impact, exact source objects, and smallest corrective action. Order findings by severity. Do not modify the reviewed subject.

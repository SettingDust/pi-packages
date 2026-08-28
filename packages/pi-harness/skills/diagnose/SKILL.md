---
name: diagnose
description: Reproduce a failure, isolate variables, establish root cause, and identify the smallest evidence-backed correction and regression check. Use for broken, failing, throwing, incorrect, flaky, or unexpectedly slow behavior.
---

# Diagnose

Use `research-source-grounded` when claims depend on inspected project or external sources.

## Method

1. Capture the observed symptom, expected behavior, environment, inputs, frequency, and smallest known reproduction.
2. Reproduce before editing when feasible. If reproduction is impossible, identify the exact missing prerequisite and avoid presenting hypotheses as root cause.
3. Build a short hypothesis set from the execution path. Design isolation checks that eliminate alternatives one variable at a time.
4. Trace all relevant callers and sibling paths before changing a shared function. Locate the earliest boundary where actual behavior diverges from expected behavior.
5. State the root cause as a falsifiable mechanism supported by reproduction and isolation evidence.
6. Identify the smallest correction at the shared causal boundary and one focused regression check that fails before the fix and passes after it.
7. Stop at diagnosis and correction guidance. Repair is always a separate `implement-change` Handoff; a diagnosis Handoff cannot authorize applying the correction.

## Output

Report reproduction, eliminated hypotheses, root cause, supporting evidence, correction boundary, regression check, and any residual uncertainty. Do not patch symptoms at individual callers when one verified shared cause exists.

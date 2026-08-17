---
name: implement-change
description: Perform one bounded code, configuration, or ordinary-documentation change and leave focused verification evidence. Use for a concrete implementation unit whose behavior and scope are already understood.
---

# Implement Change

## Method

1. Read the objective, constraints, relevant authority, target files, callers, and tests before editing. Establish the actual behavior and shared ownership boundary.
2. Reuse existing project patterns, standard library, native platform features, and installed dependencies before adding new mechanisms.
3. Make the smallest change at the causal or owning boundary. Do not add speculative abstractions, compatibility layers, configuration, or unrelated cleanup.
4. Preserve unrelated worktree changes. Update adjacent contracts or documentation only when the requested behavior would otherwise make them false.
5. Validate trust-boundary inputs, protect data integrity, preserve security controls, and retain required accessibility behavior.
6. Add or update the smallest regression check proportional to the changed logic and risk.
7. Run focused checks, then the narrowest broader gate needed to catch integration breakage. Inspect the final diff for accidental scope.

## Output

Report changed behavior and files, verification commands and results, residual risks, and any incomplete requirement. Do not claim completion when required checks fail or were not run.

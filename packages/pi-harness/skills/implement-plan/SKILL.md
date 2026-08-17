---
name: implement-plan
description: Execute an accepted implementation plan in dependency order, using bounded changes and reconciling evidence with authority. Use when an approved Plan and Tasks already define the delivery boundary.
---

# Implement Plan

## Method

1. Read the accepted Plan, Tasks, referenced authority, Work Context, and current repository state. Do not execute a stale or conflicting plan.
2. Select the next unblocked task by dependency order. Confirm its files, ownership boundary, acceptance condition, and verification before editing.
3. Apply `implement-change` to each bounded implementation unit. Preserve unrelated user changes and avoid opportunistic refactors.
4. Run the task's focused checks before marking it complete. Record actual evidence, not expected evidence.
5. Re-evaluate downstream tasks after each material finding. Continue when the finding stays inside accepted authority and scope.
6. If a finding invalidates authority, design, task boundaries, or accepted assumptions, stop affected execution and report the exact upstream reconciliation needed. Do not silently patch the Plan around it.
7. After all tasks, run the plan-level verification and reconcile produced artifacts and task state.

## Completion

Report completed and incomplete tasks, changes, verification, deviations, and blockers. Complete only when every required task and plan-level check passes; otherwise return useful partial progress without claiming the Plan is done.

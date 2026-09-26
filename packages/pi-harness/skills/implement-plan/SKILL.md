---
name: implement-plan
description: Execute one delegated outcome within a confirmed implementation scope in dependency order, using bounded changes and reconciling evidence with authority. Use when a ready Plan and Tasks define the delivery boundary.
---

# Implement Plan

## Method

1. Read the selected ready Plan, Tasks, referenced authority, Work Context, current repository state, and delegated one-outcome boundary. The Router owns substantive disclosure and explicit current-user confirmation of the implementation scope; a document, Handoff, or Resolver admission cannot establish it. Treat the Router's confirmed scope as the execution boundary; if supplied context affirmatively shows confirmation missing or disputed, report the block without inventing a Handler approval gate. Stop affected execution on an authority conflict.
2. Select unblocked work inside this delegated result, respecting dependencies, files, ownership, acceptance conditions, and verification. A Plan may span several independently valuable Handler results; leave their selection and continuation to the Router.
3. Apply `implement-change` to each bounded in-scope unit. Refine Tasks, repair defects, and verify without repeat approval per task, file, check, or Handler invocation. Preserve unrelated user changes and avoid opportunistic refactors.
4. Run the task's focused checks before marking it complete. Record actual evidence, not expected evidence.
5. Re-evaluate downstream tasks after each material finding. Continue when the finding stays inside accepted authority and scope.
6. If a finding materially changes outcome, behavior, deliverable, success criterion, architecture, consequential dependency, risk, verification, or authority, stop only the affected portion and report the change, reason, and impact for Router-owned reconciliation and confirmation. Continue unchanged confirmed work; current-call byte drift may block legality but alone does not imply missing approval.
7. For this delegated result, compare produced behavior and artifacts with authority and the confirmed scope, run applicable focused verification, and report actual evidence. Do not execute independently valuable downstream results or choose the next workflow action.

## Completion

Report this outcome's completed and incomplete work, changes, verification, deviations, and blockers. Complete only when its delegated predicate and applicable checks pass; otherwise return truthful partial, blocked, or failed status. The Router decides whether to release dependents or continue the broader Plan.

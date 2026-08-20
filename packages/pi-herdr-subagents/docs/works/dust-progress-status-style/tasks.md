# Dust Progress Status Style Tasks

- **Status:** `implementation-complete-evidence-reconciliation`.
- **Plan:** [Dust Progress Status Style Plan](plan.md)
- **Authority:** [Status widget Spec](../../spec/running-status-widget.md)
- **ADR:** [Dust-inspired progress status ADR](../../adr/dust-inspired-progress-status-widget.md)
- **Context:** [Work Context](context.md)
- **Acceptance:** not inferred; independent review and explicit current-session user acceptance remain required.

## Scope Gates

- Preserve the implemented #13 behavior and its shared source/test ownership.
- Keep automatic terminal surface cleanup and the external `#18` terminal-input barrier
  separate. The `#18` EOF blocker remains external and unresolved.
- Do not change steering, workspace pinning, task IDs, auto-close, Herdr state, or commits
  as part of this bounded repair.
- Preserve unrelated `tests/runtime.test.ts` changes, including the #6 hunks.
- Repaired package evidence: 74 tests, 378 assertions, and typecheck passed; no independent
  rereview, acceptance, staging, or commit is claimed.
## Completed Implementation Evidence

### Task 1: Lifecycle Observation, Persistence, And Legacy Migration

- **Status:** implemented; repaired evidence recorded; independent rereview pending.
- **Owner:** `SubagentRuntime` in `packages/pi-herdr-subagents/src/index.ts`.
- **Evidence:** queued/running/terminal states; required V2 `queuedAt`/`updatedAt`;
  optional V2 `startedAt` with running-state requirement; valid distinct V2 timestamp
  recovery; rejection fixtures for missing/invalid V2 lifecycle timestamps; V1
  `createdAt` migration; explicit legacy `starting` Result/pane/verification outcomes;
  resume generation timestamp isolation; lifecycle-only defensive observations.
- **Boundary:** V1 record `createdAt` remains migration input and is not exposed by
  `listTasks()`; the internal `SubagentTask.createdAt` compatibility alias remains seeded
  from `queuedAt` so existing `inspect()` and `join()` task visibility is unchanged.
  Result, prompt, error body, paths, model, thinking, and transport IDs remain outside the
  observation.
### Task 2: Package-Owned Settings Store

- **Status:** implemented; repaired evidence recorded; independent rereview pending.
- **Owner:** `SubagentSettingsStore` in `packages/pi-herdr-subagents/src/index.ts`.
- **Evidence:** canonical path `join(getAgentDir(), "subagent", "settings.json")`, injected
  test path, complete-object parse, defaults/warnings, legacy `widgetLayout` mapping,
  warning for an invalid legacy layout even with a valid `widgetMode`, semantic
  unrelated-value preservation, malformed-file fallback, atomic temp-plus-rename, and
  temporary cleanup after failed replacement.
- **Boundary:** cleanup is best effort; no byte-preservation, lock, or concurrent-writer
  merge guarantee.
### Task 3: Component, Epoch Clock, And Explicit Icon Policy

- **Status:** implemented; repaired evidence recorded; independent rereview pending.
- **Owner:** parent-only widget factory and integration in `src/index.ts`.
- **Evidence:** injected epoch `WidgetClock`, invalid/future elapsed clamp, explicit NF/ASCII
  capability, ANSI-aware width rendering, CJK/emoji and combining-sequence fixtures,
  six-row overflow, summary mode, one-second active-progress refresh, cleanup, and UI
  exception isolation.
### Task 4: Privacy And Lifecycle Integration

- **Status:** implemented; evidence reconciled.
- **Evidence:** widget consumes only `SubagentTaskObservation`; terminal rows are excluded
  from progress rendering; settings/load/render failures are isolated; the widget path
  does not call `inspect()` or `join()` or read child activity, Result, or session content;
  completion notification remains independent.

## Future Verification Task

### Task 5: Close Recovery Evidence Gaps

- **Status:** future; no source change authorized by this Work.
- **Dependency:** Task 6 independent review plus explicit current-session acceptance.
- **Owner boundary:** focused verification and authority clarification only.
- **Required cases:**
  - malformed V1 `createdAt` and `updatedAt` records, including rejection and
    non-observation behavior;
  - malformed V1 Result precedence and persisted `invalid_result` settlement; and
  - V2 records with future `startedAt`, including a decision to reject them during
    recovery or retain them while rendering zero elapsed.
- **Constraint:** do not weaken current invalid/future render clamping, do not alter the
  lifecycle owner, and do not expand into auto-close, `#18`, steering, workspace, task-ID,
  or EOF-blocker work.
## Review Task

### Task 6: Independent Authority And Evidence Review

- **Status:** pending fresh rereview.
- **Dependency:** Tasks 1-4 evidence and explicit current-session acceptance.
- **Owner boundary:** read-only review of Spec, ADR, Work Context, Plan, Tasks, source
  evidence, privacy boundary, settings semantics, migration, repaired findings, and
  remaining verification gaps.
- **Completion evidence:** links resolve without whitespace errors; the five documents are
  internally consistent; implementation claims are backed by source/package evidence;
  future hardening Task 5 depends on this review rather than vice versa; auto-close and
  `#18`/EOF remain isolated; no source/test/Herdr/staging/commit mutation occurs during
  review.

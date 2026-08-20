# Dust-Inspired Progress Status Widget Implementation Plan

- **Disposition:** `implementation-complete-evidence-reconciliation`.
- **Authority:** [Status widget Spec](../../spec/running-status-widget.md)
- **ADR:** [Dust-inspired progress status ADR](../../adr/dust-inspired-progress-status-widget.md)
- **Context:** [Work Context](context.md)
- **Tasks:** [Tasks](tasks.md)
- **Acceptance:** not inferred from implementation or package checks; independent review and explicit user acceptance remain gates.

## Objective

Reconcile the accepted status-widget authority with the implemented runtime and extension:
lifecycle-safe queued/running observation, persisted timestamps and V1 migration, the
package-owned settings store, the width-aware `pi-tui` Component, deterministic
epoch-clock/icon behavior, and focused verification. Child activity remains outside the
boundary.

## Implemented Scope

- Runtime records and observations use queued/running timestamps and lifecycle invalidations.
- V1 `createdAt` records and legacy `starting` recovery are read and migrated; `createdAt`
  is not exposed by the observation, while V2 requires `queuedAt` and `updatedAt`.
- `SubagentSettingsStore` owns `join(getAgentDir(), "subagent", "settings.json")`, parses
  and merges complete settings objects, preserves unrelated parsed values, and writes via
  same-directory temporary file plus rename.
- Progress/summary rendering uses an installed `pi-tui` Component, injected epoch clock,
  explicit `useNerdFont`, six-row overflow, width-aware truncation, and cleanup.
- The widget receives lifecycle-only observation data and does not collect child activity,
  inspect/join data, Result artifacts, session content, or private execution fields.

## Non-Goals And Scope Protection

Do not change tool schemas, Result parsing, completion messages, Agent resolution, task IDs,
steering, inspect/join semantics, transport, dependency graph, child activity collection,
pane polling, or terminal retention outside the widget projection and lifecycle persistence
required by the Spec. The separate auto-close Work and external `#18` terminal-input barrier
remain excluded; the `#18` EOF blocker remains unresolved and must not be absorbed here.
`#18` and `#13` remain isolated. No commit is part of this reconciliation.

## Review Gates

1. Task 6 independently rereviews the repaired Spec, ADR, Context, Plan, Tasks, source,
   tests, and evidence; that rereview is not claimed here.
2. Explicit current-session user acceptance remains required.
3. Future hardening Task 5 depends on Task 6 and acceptance; Task 6 depends only on Tasks
   1-4 evidence, so the dependency graph is acyclic.
4. Preserve ownership of `src/index.ts`, `tests/runtime.test.ts`, and
   `tests/renderer.test.ts`; the repair did not edit `tests/runtime.test.ts` and preserves
   its unrelated #6 hunks.
5. Fresh repaired package evidence is 74 tests, 378 assertions, and typecheck passed. This
   is evidence, not rereview or acceptance.
## Reconciled Implementation Evidence

### 1. Lifecycle, observation, and migration

`SubagentRuntime` remains the source of truth. The implementation persists and publishes
`queued` before child-surface creation, then persists and publishes `running` after
execution admission. V1 `starting` records are mapped through current Result, pane, and
verification evidence; V2 records persist required `queuedAt`/`updatedAt` and optional
`startedAt` with the running-state requirement. Resume receives fresh generation times.
The internal `SubagentTask.createdAt` compatibility alias remains seeded from `queuedAt`
for unchanged `inspect()`/`join()` visibility, but it is absent from widget observations
and V2 records.

Covered evidence includes queue/running/terminal transitions, migration outcomes,
persistence/recovery, valid distinct V2 timestamps, missing/invalid required V2 timestamp
rejection, resume isolation, defensive snapshots, listener isolation, and no
activity/Result leakage.
### 2. Package-Owned Settings Boundary

`SubagentSettingsStore` is implemented at the canonical package path. It parses the
complete object, normalizes placement/mode/icon settings, warns and falls back on invalid
values without blocking runtime operations, validates invalid legacy layout independently
of a valid `widgetMode`, preserves unrelated parsed values on save, and uses
same-directory temp write plus rename. Cleanup is best effort and cannot mask the primary
write/rename outcome. The guarantee is semantic value preservation, not byte identity or
concurrent-writer merging.

Covered evidence includes missing/invalid load, defaults, legacy layout mapping and
warnings, warning isolation, true/false icon policy, nested/unknown values,
malformed-file save behavior, failed-replacement temp cleanup, off/placement/progress/
summary, and atomic replacement.
### 3. Component, Epoch Clock, And Privacy Policy

The parent-only Component uses `Date.now` in production or an injected epoch clock in
tests, parses ISO timestamps in that domain, clamps invalid/future elapsed to zero, and
uses explicit `useNerdFont` without terminal probing. It applies ordering, label-first
identity, six-row overflow, ANSI-aware width handling, CJK/emoji and combining-sequence
fixtures, narrow fallback, summary counts, one-second active-progress refresh, and
failure-isolated cleanup. The widget path consumes only lifecycle observations.
### 4. Remaining verification gaps

The implementation/evidence package does not yet establish focused coverage for malformed
V1 `createdAt`/`updatedAt`, malformed V1 Result precedence and persisted `invalid_result`,
or the policy for a V2 future `startedAt`. These are future Tasks and are not treated as
runtime defects or silently claimed as covered.

## Control Flow

```text
runtime queue admission
  -> lifecycle persistence (queuedAt/status=queued)
  -> queued invalidation
  -> execution admission
  -> lifecycle persistence (startedAt/status=running)
  -> running invalidation
  -> Component render with epoch clock/icons
  -> 1s render refresh
  -> terminal persistence + independent notification
```

```text
session lifecycle
  -> load package settings with warning isolation
  -> dispose old widget/timer and stop monitors
  -> recover/validate/migrate selected scope
  -> one final invalidation
  -> mount one Component
```

## Review And Future-Task Order

```text
repaired implementation evidence
  -> authority/work reconciliation
  -> Task 6 independent fresh rereview + explicit acceptance
  -> future hardening Task 5 (malformed V1 timestamps/Result, future V2 startedAt)
```

The implemented Tasks 1-4 and five final-audit repairs are complete in the current
worktree. Future hardening Task 5 follows Task 6 rereview and explicit current-session
acceptance; Task 6 depends only on Tasks 1-4 evidence, avoiding a review/hardening cycle.
The future task must not expand into auto-close, `#18`, steering, workspace, task-ID, or
EOF-blocker work.
## Risks And Mitigations

- **Legacy or future-record evidence gap:** add focused fixtures for malformed V1
  `createdAt`/`updatedAt`, malformed V1 Result precedence, and V2 future `startedAt`;
  decide and document the future-start recovery policy before claiming full coverage.
- **Clock-domain mismatch:** use epoch milliseconds for both injected clock and ISO parsing;
  the current renderer clamps invalid/future elapsed values to zero.
- **Settings data loss:** parse/merge the complete object and preserve unrelated parsed
  values; bytes, locking, and concurrent-writer merging remain outside the contract.
- **NF environment variance:** persist explicit `useNerdFont`, default true, pass the
  boolean into the renderer, and use same-snapshot NF/ASCII evidence.
- **Private data leaks:** retain lifecycle-only observation and negative checks for Result,
  activity, paths, prompt, model, thinking, and transport data.
- **Scope drift:** keep auto-close and `#18` isolated; the external `#18` EOF blocker is
  not resolved or verified by this Work.

## Rollback

Keep implementation bounded to the widget amendment. If verification fails, disable the
widget with the already-defined `off` setting or revert only the bounded source/test
change after ownership is reconciled. Do not alter completion notification or Result
retrieval as rollback behavior.

## Final Gate

This bounded repair is complete when the Spec, ADR, Context, Plan, and Tasks agree with
the repaired source/tests, fresh package evidence records 74 passing tests and 378
assertions plus typecheck, the Task 5/6 graph is acyclic, and the scoped diff preserves
unrelated #6 runtime-test work. Independent Task 6 rereview and explicit acceptance remain
required for authority closure. No Herdr state, staging, or commit change is part of this
repair.

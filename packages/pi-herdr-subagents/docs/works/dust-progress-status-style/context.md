# Dust Progress Status Style Context

## Status

- Work state: `final-audit-findings-repaired-rereview-pending`.
- The #13 progress/status implementation and bounded final-audit repairs are present in
  `src/index.ts` and focused tests.
- The repair does not authorize unrelated source, package metadata, dependency, Herdr
  state, staging, or commit changes.
- Independent fresh rereview and explicit current-session acceptance remain separate
  gates and are not claimed by this Work update.
## Goal

Revise the accepted running-only surface into a Dust-inspired parent progress widget:
queued/running lifecycle, elapsed time, configurable placement/mode, a custom
width-aware `pi-tui` Component, six-row overflow, accepted Octicons with explicit
fallback, terminal-row removal independent from completion notification, and no child
activity. The result is inspired by Dust, not exact parity.

## Authority

- [Status widget Spec](../../spec/running-status-widget.md)
- [Dust-inspired progress status ADR](../../adr/dust-inspired-progress-status-widget.md)
- [Previous completed running-only Work Context](../running-status-widget/context.md)
- [Pi Dust widget reference](E:/Projects/pi-dust/packages/subagent/src/widget.ts)
- [Pi Dust settings reference](E:/Projects/pi-dust/packages/subagent/src/settings.ts)

The Spec is normative once reviewed and accepted. This Work records processed evidence
and coordination state; it does not accept the Plan or Tasks.

## Settled Decisions

- Default placement/mode: `aboveEditor` + `progress`.
- Queued and running generations are visible; terminal rows are not progress rows.
- Queue admission records required `queuedAt`; execution admission records stable
  `startedAt`; `updatedAt` changes with observable lifecycle changes.
- `SubagentTaskObservation.queuedAt` is required; `startedAt` is optional unless the
  state is running. The internal `SubagentTask.createdAt` compatibility alias remains
  seeded from `queuedAt` so existing `inspect()` and `join()` task visibility stays
  unchanged; it is outside widget observation and V2 persistence.
- V2 records require `queuedAt` and `updatedAt`; `startedAt` is required for `running`
  and optional for queued/terminal records.
- V1 `createdAt` records remain readable and are migrated before the final recovery
  invalidation. Legacy V1 `starting` maps first to a queued-equivalent state, then to
  running with `startedAt = createdAt` when a retained pane exists, to terminal Result
  when a current Result exists, or to failed with the existing pane/verification reason.
- Elapsed uses one injected epoch-millisecond clock domain. ISO values are parsed into
  epoch milliseconds; future/invalid render timestamps clamp elapsed to zero.
- `SubagentSettingsStore` is implemented at `join(getAgentDir(), "subagent", "settings.json")`.
  Its normalized defaults are `aboveEditor`, `progress`, and `useNerdFont: true`; valid
  unrelated parsed settings survive save, while malformed files fall back to defaults.
- Invalid legacy `widgetLayout` values warn even when `widgetMode` is otherwise valid;
  the valid mode remains authoritative.
- Temporary-file cleanup is best effort and cannot replace the primary write/rename
  outcome.
- The Component uses ANSI-aware width handling, six rows plus one overflow row, and
  failure-isolated cleanup.
- Activity is not collected, stored, inferred, or displayed. The widget path does not
  call `inspect()` or `join()` or read Result/session content.
## Evidence And Boundaries

Current source and focused test evidence supports the repaired implementation:

- `packages/pi-herdr-subagents/src/index.ts` owns `SubagentRuntime.tasks`, queued/running
  lifecycle transitions, V1/V2 persistence and migration, `SubagentSettingsStore`, the
  `WidgetClock`, the parent-only Component, lifecycle-only observation projection,
  independent legacy-layout validation, and best-effort temporary cleanup.
- `listTasks()` exposes `subagentId`, `generation`, `agent`, `label`, `status`, required
  `queuedAt`, optional `startedAt`, and `updatedAt`; it does not expose `createdAt`.
- The widget receives only an observation snapshot. It does not call `inspect()` or
  `join()`, read Result artifacts/session files, poll child activity, or render private
  execution data.
- Focused fixtures now cover valid distinct V2 lifecycle timestamps, missing/invalid V2
  required timestamps, combining-sequence truncation, invalid legacy layout with valid
  mode, and temp cleanup after failed replacement.
- Package verification after repair is 74 tests, 378 assertions, and typecheck passed.
- The upstream Dust files remain behavioral references only and are not dependencies.
- `tests/runtime.test.ts`, including unrelated #6 hunks, was not edited by this repair.
## Shared-File Gate And Scope Protection

The implementation and bounded repair occupy shared source/test surfaces. Future changes
must preserve ownership and must not absorb unrelated Work:

| File | Ownership boundary | Widget consequence |
| --- | --- | --- |
| `packages/pi-herdr-subagents/src/index.ts` | runtime, settings, widget, and external Work changes share this file | preserve unrelated source hunks |
| `packages/pi-herdr-subagents/tests/runtime.test.ts` | lifecycle, task identity, cancellation/join, recovery, and widget assertions overlap | preserve unrelated Work tests, including #6 hunks |
| `packages/pi-herdr-subagents/tests/renderer.test.ts` | task-ID and renderer expectations overlap | update only under the owning Work's review |

The separate auto-close Work and `#18` terminal-input barrier remain excluded. The `#18`
EOF blocker is external and unresolved; this Work does not absorb or verify it. `#18` and
`#13` remain isolated. The bounded source/test repair is recorded above; no Herdr state,
staging, or commit change is authorized or claimed.
## Future Verification Gaps

These cases are recorded as future Tasks rather than implied by the green package
verification evidence:

- malformed V1 `createdAt` or `updatedAt` records and their rejection/non-observation;
- malformed V1 Result precedence and persisted `invalid_result` settlement; and
- V2 `startedAt` values in the future, including the decision to reject them during
  recovery or retain them with the renderer's zero-elapsed clamp.

## Review Finding Closure Mapping

| Final-audit finding | Repair/evidence owner |
| --- | --- |
| Task 5/Task 6 dependency cycle | Task 6 now depends only on Tasks 1-4 evidence and acceptance; future hardening Task 5 depends on Task 6. |
| Valid `widgetMode` suppressed invalid legacy-layout warning | `normalizeSubagentUiSettings` validates `widgetLayout` independently; `settings.test.ts` covers the combination. |
| Evidence counts were stale | All five authority/Work documents record the fresh 74-test/378-assertion/typecheck result. |
| Required V2 timestamp and combining-sequence fixtures were missing | `lifecycle-migration.test.ts` covers stable and missing/invalid V2 timestamps; `progress-widget.test.ts` covers a combining sequence at the truncation boundary. |
| Cleanup and `createdAt` wording were inaccurate | `writeAtomic` makes temp cleanup best effort with failed-replacement coverage; docs distinguish V1 migration input, the internal compatibility alias, observation, and V2 persistence. |

Independent rereview and explicit current-session acceptance remain pending. The repair
makes no claim of rereview, acceptance, staging, or commit.
## Completion Signal

This repair unit is complete when the Spec, ADR, Context, Plan, and Tasks consistently
record the five bounded audit repairs, package tests report 74 passing tests and 378
assertions, typecheck passes, and the scoped diff preserves unrelated #6 runtime-test
hunks. Fresh independent Task 6 rereview and explicit current-session acceptance remain
pending; future hardening Task 5 follows those gates. Delivery is not a claim of rereview,
acceptance, live UI evidence, closure of the external `#18` EOF blocker, or completion of
auto-close work. No commit is part of this repair.

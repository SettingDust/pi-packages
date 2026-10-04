# Changelog

All notable changes to `@settingdust/pi-todo` will be documented in this file.

## [Unreleased]
### Changed

- Replace the phased Todo API with `todo_set`, `todo_add`, `todo_transition`, `todo_remove`, and `todo_view` over canonical `tasks[].todos[]` state.
- Add strict explicit `todo_remove { removals }` for a nonempty disjoint batch of exact case-sensitive `{ task, todo }` or whole-group `{ task }` selections in any status, without `force` or status changes. Invalid, missing, duplicate, or overlapping selections fail atomically; success returns the complete remaining snapshot, preserves every survivor's fields/status/order, and retains locally emptied groups without automatic pruning.
- Keep cleanup eligibility and target stability caller-owned. One queued mutation is atomic; separate read–qualify–delete calls are not a transaction and names cannot identify a same-name recreation.
- Extend only canonical checkpoints with `todo_remove`/`remove`, strict complete `{ result, snapshot }` details and boolean `isError: false`; preserve the legacy `todo` action allowlist of `set`, `add`, `transition`, and `view`. Older readers may skip removal checkpoints and revive earlier deleted records; lossless downgrade is not promised, and execute return is not Host append acknowledgement.
- Verify post-removal visibility policies, native complete-snapshot rendering and widget refresh/lifecycle in source tests; this does not certify current installed Host activation or live acceptance.
- Make creation pending by default and reserve lifecycle status changes for strict `todo_transition { transitions }`.
- Remove the obsolete `workingOn` request, state, result, restore, formatter, reminder, renderer, and widget projections; multiple in-progress todos remain independently represented.
- Reject request-level `workingOn` as unknown input, with no old-client compatibility parsing, dual-read, dual-write, or migration window.
- Document the branch-local Host-recorded restore boundary and update public Todo terminology from phases/tasks to tasks/todos.
- Show the complete task count and four status counts in the Todo widget, followed by one representative row per task without a task limit; keep the existing visibility lifecycle and detail overlay.

## [0.3.7] - 2026-08-03

### Changed

- Add a package gallery image showing an active todo plan.

## [0.3.6] - 2026-07-26

### Changed

- Update Pi development dependencies to 0.82.1.

## [0.3.5] - 2026-07-23

### Changed

- Streamline the model-facing task schema and planning guidance around names, status transitions, verification, and active work.
- Improve tool summaries by separating active and pending counts, always showing current work, and naming conflicting active phases in validation errors.

## [0.3.4] - 2026-07-17

### Changed

- Use the pending empty-circle glyph and normal text color for active tasks in expanded tool calls and the widget.
- Strengthen tool guidance to prefer a few broad phases, cancel stale tasks, and add newly discovered work instead of expanding existing task scope.

## [0.3.3] - 2026-07-17

### Changed


## [0.3.2] - 2026-07-16

### Changed

- Simplify Todo tool calls by removing lifecycle labels and expansion hints, and show a muted live phase/task summary while arguments stream and after completion.
- Use the muted theme color instead of dim for secondary Todo widget text.
- Match expanded tool output to widget phase progress and task colors, and remove the redundant `Todos` heading.

## [0.3.1] - 2026-07-15

### Changed

- Refine the working indicator's styling and distinguish active and idle states.
- Add a one-character outer margin to the widget.

## [0.3.0] - 2026-07-14

### Changed

- Require `set` and `add` to contain non-empty phases with described tasks, expose descriptions in full-plan `view` results and model reminders, and reject persisted phases or tasks that do not meet those requirements.
- Change `view` to return only the full plan rather than filtering by phase.
- Keep the final terminal widget summary visible for five seconds before clearing it, including across repeated terminal-state refreshes.
- Refresh the README with a product screenshot and a concise, user-focused overview of features and settings.

## [0.2.0] - 2026-07-13

### Added

- Add configurable, transient plan reminders based on agent turns and output tokens, with per-run limits and resets after Todo interactions.
- Restore the full phased plan to model context once after manual or automatic compaction without altering session history or compaction summaries.

### Changed

- Refine model-facing Todo guidance to keep plans and task statuses current.
- Add spacing below the above-editor Todo widget.

## [0.1.0] - 2026-07-11

### Added

- Add a provider-compatible phased planning tool with atomic `set`, `add`, `transition`, and `view` operations, immutable name-addressed tasks, and branch-aware state restoration.
- Add compact and expanded task rendering with phase progress, status styling, completion metadata, live plan updates, and native tool shells.
- Add a persistent configurable widget with focused phase previews, terminal-task summaries, animated activity markers, and flexible placement.
- Add validated global and trusted-project settings for widget presentation, glyph fallback, and tool-output visibility.

[Unreleased]: https://github.com/Chase-C/pi9/compare/todo-v0.3.7...HEAD
[0.3.7]: https://github.com/Chase-C/pi9/compare/todo-v0.3.6...todo-v0.3.7
[0.3.6]: https://github.com/Chase-C/pi9/compare/todo-v0.3.5...todo-v0.3.6
[0.3.5]: https://github.com/Chase-C/pi9/compare/todo-v0.3.4...todo-v0.3.5
[0.3.4]: https://github.com/Chase-C/pi9/compare/todo-v0.3.3...todo-v0.3.4
[0.3.3]: https://github.com/Chase-C/pi9/compare/todo-v0.3.2...todo-v0.3.3
[0.3.2]: https://github.com/Chase-C/pi9/compare/todo-v0.3.1...todo-v0.3.2
[0.3.1]: https://github.com/Chase-C/pi9/compare/todo-v0.3.0...todo-v0.3.1
[0.3.0]: https://github.com/Chase-C/pi9/compare/todo-v0.2.0...todo-v0.3.0
[0.2.0]: https://github.com/Chase-C/pi9/compare/todo-v0.1.0...todo-v0.2.0
[0.1.0]: https://github.com/Chase-C/pi9/releases/tag/todo-v0.1.0

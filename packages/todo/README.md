# @settingdust/pi-todo

Manage a session-local Todo plan in the [Pi coding agent](https://github.com/earendil-works/pi-mono). The source interface exposes five tools over one canonical `tasks[].todos[]` snapshot and renders the current plan in a persistent widget.

Imported from [`Chase-C/pi9`](https://github.com/Chase-C/pi9) commit [`94405f79bb1e400fcba5e1b973778ef82d8378b2`](https://github.com/Chase-C/pi9/tree/94405f79bb1e400fcba5e1b973778ef82d8378b2/packages/todo). See [LICENSE](LICENSE) for the preserved MIT copyright notice.

## Todo protocol

The source registers exactly five tools:

- `todo_set { tasks }` replaces the plan. Each task is `{ name, todos }`; each creation is `{ name, description }` and starts `pending`.
- `todo_add { task, todos }` appends one or more pending todos to the exact existing task, or creates a task at the end of the plan if it is missing. Existing task/todo order, names, descriptions, and statuses are preserved; new todos follow request order.
- `todo_transition { transitions }` is the only status-changing operation. A transition is `{ task, todo, status }`; request-level `workingOn` is not accepted, and old requests carrying it fail closed as unknown input.
- `todo_remove { removals }` atomically removes exact todos (`{ task, todo }`) or explicitly selected whole task groups (`{ task }`, including empty groups). The batch must be nonempty and disjoint; every status is removable without `force` or a transition.
- `todo_view {}` reads the current snapshot without changing it.

A snapshot is `{ tasks }`. Every task has globally unique `name` and `todos`; every todo has a task-local unique `name`, `description`, and `status`. Status is `pending`, `in_progress`, `completed`, or `cancelled`. Names and descriptions are trimmed non-empty strings and matching is exact and case-sensitive. A typo or different case in `todo_add` creates a distinct task: `BUILD` does not append to `Build`. Duplicate todo names within an add request or against its existing target fail without changing the plan; the same todo name in different tasks is allowed. `todo_transition` still rejects missing targets. Multiple task groups may contain `in_progress` todos simultaneously; each remains represented independently.

`workingOn` is not part of the state, request, result, restore, or widget contract. Old-version clients are unsupported; there is no compatibility parsing, dual-read, dual-write, or migration window.

### Explicit removal and caller-owned cleanup

Removal accepts only `{ removals }` and strict `{ task, todo }` / `{ task }` items, with trimmed non-empty names and exact case-sensitive matching. Unknown fields (including `force` or `status`), supplied null `todo`, malformed input, missing targets, duplicate selections, or a whole-group/child overlap fail the entire batch without changing state or projections. Success returns the complete `{ result: "remove", snapshot: { tasks } }`, not just selected records. Every survivor retains its fields, status, and relative order. Removing the last todo locally retains its empty group; only explicit `{ task }` selection removes a group. Explicitly selecting every group yields `{ tasks: [] }`. No empty or terminal group is automatically pruned.

Cleanup eligibility is caller-owned: the data operation does not infer stale work, completed Results, unresolved decisions, or dependencies, and accepts `pending`, `in_progress`, `completed`, and `cancelled` equally. Callers must protect active, unresolved, or still-needed records according to their own policy. Mutation atomicity covers one invocation-ordered queued operation on the latest committed state, not a separate read–qualify–delete transaction. Names provide no stable identity across deletion and same-name recreation. A caller relying on earlier qualification must exclude concurrent target/eligibility changes until deletion executes; unknown stability means retaining the record, not relying on stale selection.

### Restore and compatibility boundary

Todo state restores only from a successful complete Todo tool result already recorded in the current Pi session branch. Canonical pairs are `todo_set`/`set`, `todo_add`/`add`, `todo_transition`/`transition`, `todo_remove`/`remove`, and `todo_view`/`view`, with strict complete `{ result, snapshot }` details and boolean `isError: false`. Recorded removal restores the complete remaining snapshot, including retained empty groups or `{ tasks: [] }`; invalid newer candidates diagnose without payload details and fall back to the next eligible checkpoint. Legacy `todo` checkpoints retain exactly the `set`, `add`, `transition`, and `view` action allowlist; legacy `action: "remove"` is invalid.

An older reader may skip an unknown removal checkpoint and restore an earlier state (potentially reviving deleted records) or empty state. Lossless downgrade and preservation of the latest deletion are not promised. Returning from `execute` is not Host append or persistence acknowledgement. This source contract does not certify that a current installed Host has loaded these bytes, cross-branch restore, power-loss durability, or behavior on future Pi Host versions.

## Features

- **Canonical task/todo state.** Five focused tools create, change, explicitly remove, and view a single validated plan.
- **Session-aware state.** Recorded Todo results restore the plan associated with the current Pi session branch.
- **Persistent widget.** Show the complete task count, status counts, and one representative todo per task above or below the editor, with configurable placement and status glyphs. The detail overlay shows the full plan.
- **Adaptive reminders.** System reminders refresh the model's awareness of stale plans during long runs and restore the full plan after context compaction.
- **Native tool rendering.** Compact tool output summarizes task progress and expands into task rows.

## Local development

```bash
bun --cwd packages/todo run typecheck
bun --cwd=packages/todo run test
```

## UI settings

The settings loader reads global settings from `~/.pi/agent/todo/settings.json`. For a trusted project, `.pi/todo/settings.json` overrides the global values. Pi's project-trust decision is required before the project file is read; an untrusted project cannot affect these settings.

```json
{
  "widgetPlacement": "aboveEditor",
  "maxVisibleTasks": 5,
  "fallbackGlyphs": false,
  "toolVisibility": "set-only",
  "dynamicReminders": true,
  "reminderMinTurns": 4,
  "reminderMaxTurns": 8,
  "reminderOutputTokens": 16000,
  "reminderMaxPerRun": 2
}
```

`widgetPlacement` accepts `"aboveEditor"`, `"belowEditor"`, or `"off"`. `maxVisibleTasks` must be a positive integer but does not limit task rows in the persistent widget; it remains accepted for compatibility with existing settings. `fallbackGlyphs` must be a boolean. Nerd Font status glyphs are the default; set `fallbackGlyphs` to `true` to use broadly supported Unicode symbols instead.

`toolVisibility` accepts the legacy compatibility values `"all"`, `"set-only"`, and `"none"`. They do not hide or otherwise control native Todo tool calls or final results. Expanded output stays synchronized with the latest plan on the active branch.

Dynamic reminders keep the model aware of the plan during longer runs without adding messages to session history. The turn, output-token, and per-run settings control their cadence; set `dynamicReminders` to `false` to disable them.

After Pi compacts the context window, the extension supplies the full Todo plan once on the next turn so work can continue without losing task state. This does not alter Pi's compaction summary or session history.

The widget refreshes after Todo changes and `/tree` navigation. Its summary counts all tasks (including empty groups) and all four todo statuses; each task row shows the first in-progress todo, otherwise its first todo, or only its name when empty. A finite terminal may clip rows; `/todo-details` shows the full plan. After all todos become terminal, the widget shows the final task summary for five seconds before clearing. Set `widgetPlacement` to `"off"` to disable the widget.

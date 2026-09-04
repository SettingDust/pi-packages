# @settingdust/pi-todo

Manage a session-local Todo plan in the [Pi coding agent](https://github.com/earendil-works/pi-mono). The extension exposes four tools over one canonical `tasks[].todos[]` snapshot and renders the current plan in a persistent widget.

Imported from [`Chase-C/pi9`](https://github.com/Chase-C/pi9) commit [`94405f79bb1e400fcba5e1b973778ef82d8378b2`](https://github.com/Chase-C/pi9/tree/94405f79bb1e400fcba5e1b973778ef82d8378b2/packages/todo). See [LICENSE](LICENSE) for the preserved MIT copyright notice.

## Todo protocol

Pi receives exactly four tools:

- `todo_set { tasks }` replaces the plan. Each task is `{ name, todos }`; each creation is `{ name, description }` and starts `pending`.
- `todo_add { task, todos }` appends one or more pending todos to an existing task.
- `todo_transition { transitions, workingOn? }` is the only lifecycle operation. A transition is `{ task, todo, status }`.
- `todo_view {}` reads the current snapshot without changing it.

A snapshot is `{ tasks, workingOn? }`. Every task has globally unique `name` and `todos`; every todo has a task-local unique `name`, `description`, and `status`. Status is `pending`, `in_progress`, `completed`, or `cancelled`. Names and descriptions are trimmed non-empty strings and matching is exact and case-sensitive.

`workingOn` is derived, not independently selected: it is the description of the first `in_progress` todo in task order and then todo order, and is absent when no todo is in progress. A supplied `workingOn` must equal that value. The widget's active task group follows the same derived todo.

Todo state restores only from a successful complete Todo tool result already recorded in the current Pi session branch. This does not promise cross-branch restore, power-loss durability, or behavior on future Pi Host versions.

## Features

- **Canonical task/todo state.** Four focused tools create, change, and view a single validated plan.
- **Session-aware state.** Recorded Todo results restore the plan associated with the current Pi session branch.
- **Persistent widget.** Keep active work visible above or below the editor, with configurable placement, task limits, and status glyphs.
- **Adaptive reminders.** System reminders refresh the model's awareness of stale plans during long runs and restore the full plan after context compaction.
- **Native tool rendering.** Compact tool output summarizes active work and expands into task progress while respecting configurable visibility settings.

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

`widgetPlacement` accepts `"aboveEditor"`, `"belowEditor"`, or `"off"`. `maxVisibleTasks` must be a positive integer, and `fallbackGlyphs` must be a boolean. Nerd Font status glyphs are the default; set `fallbackGlyphs` to `true` to use broadly supported Unicode symbols instead.

`toolVisibility` controls Todo tool output in the terminal UI only:

- `"all"` shows every Todo action.
- `"set-only"` shows only `set` operations.
- `"none"` hides normal Todo activity.

Errors are always shown, while hidden successful operations take up no terminal space. Expanded output stays synchronized with the latest plan on the active branch.

Dynamic reminders keep the model aware of the plan during longer runs without adding messages to session history. The turn, output-token, and per-run settings control their cadence; set `dynamicReminders` to `false` to disable them.

After Pi compacts the context window, the extension supplies the full Todo plan once on the next turn so work can continue without losing task state. This does not alter Pi's compaction summary or session history.

Settings load when a session starts. The widget refreshes after Todo changes and `/tree` navigation. Active todos keep their normal status glyph; when work is active, a separate indented current-work line below the plan uses Pi's standard spinner and dim text. After all todos become terminal, the widget shows the final task summary for five seconds before clearing. Set `widgetPlacement` to `"off"` to disable the widget.

# Subagent Status Widget Specification

## Amendment Status

This document records the implemented Dust-inspired progress/status widget and reconciles
its authority with the current source and verification evidence. The implementation is
present in `src/index.ts`; this document remains subject to the package's independent
review and acceptance process. It is not a request to change source, tests, Herdr state,
or unrelated Work items.

The widget is Dust-inspired, not an exact Pi Dust port. It adopts the useful progress
surface while deliberately changing activity collection, defaults, icons, and summary
semantics as stated in section 16.
## 1. Scope And Boundary

`pi-herdr-subagents` will provide a parent-session subagent status widget with:

- queued and running generations visible;
- identity, state, and elapsed time on each active progress row;
- one elapsed-time render refresh per second while active progress content exists;
- no child activity collected, stored, observed, inferred, or displayed;
- a Pi `Component` factory registered through `ctx.ui.setWidget`;
- ANSI-aware visible-width truncation with an ellipsis;
- at most six visible progress rows, followed by one `+N more` row when needed;
- terminal rows absent from progress rendering;
- configurable placement, progress/summary mode, and Nerd Font/ASCII icon policy;
- parent-process installation only. A child identified by
  `PI_HERDR_SUBAGENT_RESULT_PATH` must not install the widget.

The source implementation is evidence for the behavior below; the Spec remains the
normative contract. The implementation does not change task execution, Result parsing,
completion notification delivery, `subagent_inspect`, `subagent_join`, steering,
cancellation, removal, Agent resolution, or existing persistence ownership except for
lifecycle fields required by this contract.

## 2. Observation Contract

The runtime exposes an observation-safe projection:

```ts
export type SubagentTaskObservation = Readonly<{
  subagentId: string;
  generation: number;
  agent: string;
  label: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  queuedAt: string;
  startedAt?: string;
  updatedAt: string;
}>;

listTasks(): readonly SubagentTaskObservation[];
onTaskUpdate(listener: () => void): () => void;
```

The public observation contains only fields needed by this widget:

- `queuedAt` is present after queue admission for the generation;
- `startedAt` is present after execution admission and the `running` transition;
- `updatedAt` changes when an observable lifecycle field changes;
- elapsed time is derived at render time from the injected epoch-clock contract in
  section 7 and never mutates the observation or persisted task record.

The observation never exposes Result, prompt text, full error bodies, cwd, model,
thinking, session or artifact paths, Herdr tab/pane identifiers, Agent body, raw tool
arguments, raw assistant messages, child activity, or other runtime-internal fields.
Existing `inspect()` and `join()` task-data visibility is unchanged and is outside this
observation contract.

Every `listTasks()` call returns a fresh array and fresh nested objects. Mutating a
returned snapshot cannot mutate runtime state or a later snapshot. `onTaskUpdate()` is
synchronous, payload-free, has no initial event, and returns an idempotent unsubscribe
function. A throwing listener is isolated from other listeners, runtime operations,
completion notification, recovery, and cleanup.

An invalidation is emitted only after observable state is complete for spawn/queue, the
running transition, resume, terminal settlement including cancellation and launch
failure, removal, and successful recovery. A successful recovery emits exactly one
final invalidation after the selected scope is rebuilt, including active-to-empty,
active-to-new-scope, and repeated same-scope recovery. A recovery that throws before its
final state is complete emits no completed-recovery invalidation.

## 3. Lifecycle, Admission, Persistence, And Migration

The current-generation display state machine is:

```text
queue admission -> queued -> running -> completed
                                       -> failed
                                       -> cancelled
```

Queue admission is implemented at the start of `SubagentRuntime.start`: the runtime
persists and publishes `queued` before child-surface creation, then persists and
publishes `running` after execution admission. The source does not fabricate `queued`
only in the renderer. At that boundary, it:

1. allocates the generation identity;
2. assigns `queuedAt` from the lifecycle clock as an ISO timestamp;
3. persists the queued lifecycle record before exposing it as queued;
4. adds/updates the current-generation task record; and
5. emits one payload-free invalidation after the queued state is complete.

The runtime must not fabricate `queued` only in the renderer. If queue admission and
execution admission are synchronous, both are still real ordered lifecycle steps: the
queued record and invalidation precede the running record and invalidation.

Execution admission occurs when the runtime has admitted the generation to its child
execution surface. It assigns `startedAt` once, preserves it for that generation,
persists the running state, then emits an invalidation. It must not be inferred from a
pane poll in the widget path. Terminal settlement persists the terminal state before or
as part of its existing notification path and emits the terminal invalidation after the
observation is terminal. Notification remains independent of widget rendering.

### Persisted record versions

The task-derived ID Spec owns the identity version boundary: V2 is the canonical format for new manifests and persisted migrations, while V1 is readable only as recovery/migration input. Supported input includes V1 legacy and V1 canonical identity forms. The target V2 record shape is:

```ts
type PersistedTaskRecordV2 = {
  version: 2;
  subagentId: string;
  generation: number;
  taskSlug?: string; // Required for canonical IDs; absent for migrated legacy IDs.
  agent: string;
  cwd: string;
  label: string;
  sessionFile: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  queuedAt: string;
  startedAt?: string;
  updatedAt: string;
  // Existing optional execution and notification fields remain preserved.
};
```

V2 `queuedAt` and `updatedAt` are required ISO timestamps. `startedAt` is optional for queued and terminal records and required for a running record. For identity, a new canonical task requires `taskSlug`. A V1 canonical migration retains the exact canonical `subagentId` and `taskSlug`; a V1 legacy migration retains the exact legacy ID and no slug. Both retain session/artifact paths and Result identity. The task-derived ID Spec defines validation and path-preservation rules. The current validator accepts a syntactically valid future `startedAt`; the renderer clamps future elapsed to zero. The validation-policy gap is recorded as a future Task below.

### Persistence and recovery

Persisted task records are the recovery source for lifecycle observation. Recovery
selects the parent task scope, stops old monitors, clears the in-memory current-generation
map, reads and validates records, and rebuilds queued/running and terminal state before
its one final invalidation. Recovery may use existing pane verification and Result
settlement to determine runtime terminal state, but the widget observation receives only
the permitted lifecycle projection. No Result, prompt, child session, activity, or pane
content is a widget data source.

A recovered queued generation renders from its persisted `queuedAt`. A recovered running
generation renders from persisted `startedAt`. New records must never use `queuedAt` as a
running start. Only the explicit legacy migration below may use `createdAt` as a
compatibility fallback for a missing start time. Recovered timestamps remain stable until
a real lifecycle transition.

### V1 `createdAt` migration and `starting` recovery

The prior observation exposed `createdAt` as a display timestamp. That observation
contract is superseded by `queuedAt`, `startedAt`, and `updatedAt`; new observations and
V2 records do not contain `createdAt`. The internal `SubagentTask.createdAt`
compatibility alias remains seeded from `queuedAt` so existing `inspect()` and `join()`
task visibility is unchanged; the widget and V2 persistence do not use that alias for
new lifecycle timing.

A validated V1 record with `createdAt` and no lifecycle timestamps is migrated as
follows:

| V1 record | Initial migrated fields | Recovery outcome and next transition |
| --- | --- | --- |
| `status: "starting"` with a valid retained pane | `queuedAt = createdAt`, no `startedAt`, lifecycle status `queued` | Verify the retained pane. If it exists, admit execution, set `startedAt = createdAt` as the explicitly documented compatibility fallback, transition to `running`, and rewrite V2. |
| `status: "starting"` with no pane or a missing pane | `queuedAt = createdAt`, no `startedAt`, lifecycle status `queued` | No pending queue can be reconstructed after restart. Transition to `failed` with the existing `pane_closed` reason and rewrite V2. |
| `status: "starting"` with pane verification failure | `queuedAt = createdAt`, no `startedAt`, lifecycle status `queued` | Transition to `failed` with the existing verification-failure reason and rewrite V2. |
| `status: "starting"` with a current valid Result | `queuedAt = createdAt`, no `startedAt` | Set the terminal Result status, rewrite V2, and do not create an active row. |
| `status: "running"` with no lifecycle timestamps | `queuedAt = createdAt`, `startedAt = createdAt` | Preserve `running`, rewrite V2, and render from the compatibility start. |
| terminal V1 status with no lifecycle timestamps | `queuedAt = createdAt`, no `startedAt` unless already available | Preserve the terminal state, rewrite V2, and do not create an active row. |

Thus legacy `starting` is never left as an undefined display state: recovery first
maps it to a queued-equivalent migration state, then deterministically transitions it
to running, terminal Result, or failed according to the existing recovery evidence.
The transient queued-equivalent state is not emitted as a completed recovery snapshot
when recovery immediately determines the next outcome.

For all V1 migration rows:

- V1 is readable input only; any persisted migration writes V2 while retaining the exact artifact path, session path, and Result identity. A V1 canonical record retains its exact canonical `subagentId` and `taskSlug`; a V1 legacy record retains the exact legacy ID and absent `taskSlug`;
- V1 record `createdAt` is migration input only and is never exposed by `listTasks()`;
  the internal task compatibility alias described above remains outside widget observation;
- timestamps are accepted only after the existing record validation;
- migrated lifecycle fields are persisted atomically before the completed-recovery
  invalidation;
- a prior generation's timestamp is never reused when `resume` creates a new generation.

A resumed generation retains stable `subagentId` and label but receives new `queuedAt`
and `startedAt` values for its new generation. A terminal prior generation cannot keep
an active row alive.
## 4. Ordering And Visibility

The widget considers only the current generation of each task. `queued` and `running` are
active; terminal states are not rendered after the first refresh that observes them. Rows
are ordered by:

1. `running` before `queued`;
2. ascending `startedAt` for running or `queuedAt` for queued;
3. ascending lexical `subagentId` for equal timestamps.

Invalid active timestamps sort after valid timestamps and then by `subagentId`; this
fallback must not throw or expose an internal error.

## 5. Identity And Label Rules

A non-empty `label` is the main identity. Append the Agent name only when it differs from
the label. The stable `subagentId` may be a muted secondary token when width permits,
but is not required in the primary label.

Labels and Agent names are untrusted display input. Before composition:

- replace CR, LF, tabs, and other controls with one space;
- collapse whitespace and trim;
- remove ANSI escape sequences before width measurement and rendering;
- cap each identity field to a finite display budget;
- preserve CJK and emoji subject to the installed TUI width API.

Rows must never contain prompt, Result, error body, filesystem path, model, thinking,
or Agent instructions.

## 6. Privacy And Activity Exclusion

The widget must not collect, store, observe, infer, or display child activity. This
includes active tool names or input summaries, assistant snippets, latest completed tool
names or summaries, and implicit activity markers.

The widget path must not call `inspect()` or `join()`, read Result artifacts or child
session files, or poll Herdr panes to obtain display content. Raw prompt, assistant text,
tool input/output, Result, error body, path, model, thinking, credentials, environment
values, and transport data must not enter the observation. Source events that cannot
become an allowed lifecycle observation are ignored rather than rendered as activity.

## 7. Timing And Injected Clock

The widget uses one time domain for both live rendering and recovery. The clock seam is
owned by the planned widget factory and is an explicit function:

```ts
type WidgetClock = () => number; // Unix epoch milliseconds
```

`WidgetClock` returns epoch wall-clock milliseconds, not monotonic elapsed ticks. The
production integration passes `Date.now` (or an equivalent epoch-millisecond function).
Tests inject a fixed function. ISO lifecycle timestamps are converted with `Date.parse`
into this same epoch domain. No implementation may subtract an ISO timestamp from a
monotonic counter or claim monotonic recovery continuity.

For a queued row, elapsed is:

```text
max(0, clockNow() - Date.parse(queuedAt))
```

For a running row, elapsed is:

```text
max(0, clockNow() - Date.parse(startedAt))
```

Invalid or future timestamps produce zero elapsed. This contract remains coherent across
process restart and recovery because the persisted ISO value and injected clock share the
epoch domain. System-clock corrections can make wall-clock elapsed time jump; the
contract clamps negative values and deliberately does not promise monotonic duration.
The component does not write timestamps or update persisted records.

During recovery, the component is disposed or detached before the old scope is replaced.
The new component uses recovered timestamps and the injected clock's current value on its
first render. Recovery does not reset timestamps to recovery time and does not retain an
old component clock or timer.

While a mounted progress component has active rows, it requests one render refresh per
second. The timer is created only for mounted active progress content, is unref'd when
the platform supports it, and is cleared on `dispose()`, replacement, removal, `off`,
empty active content, and shutdown. Repeated lifecycle events must not duplicate
subscriptions, components, or timers. There is no activity debounce.

## 8. Settings Contract, Ownership, And Migration

The implemented package-owned settings boundary is `SubagentSettingsStore` at the
production path `join(getAgentDir(), "subagent", "settings.json")`. Tests may inject a
temporary path. The parent UI integration loads normalized settings and passes the
explicit icon capability to the component; the renderer never probes the terminal.

- owner: `SubagentSettingsStore`, a new package-owned class implemented in
  `packages/pi-herdr-subagents/src/index.ts` beside the existing runtime persistence
  helpers, unless the accepted implementation splits that class into a package-local
  module without changing its contract;
- production path: `join(getAgentDir(), "subagent", "settings.json")`;
- test path: an injected temporary path is allowed only for deterministic tests; it is
  not a second production authority;
- load owner: the parent UI integration calls `load()` once per mount/recovery cycle and
  uses the returned normalized settings;
- write owner: the package settings boundary calls `save()` for widget-setting updates;
  the renderer never writes settings;
- atomic behavior: create the parent directory, write JSON to a uniquely named temporary
  file in the same directory, then replace the target with same-directory `rename`.
  A failure leaves the old target in place when the platform rename operation provides
  that guarantee; temporary-file cleanup is best effort. No lock or cross-process merge
  guarantee is part of this amendment.

The loader parses the complete JSON object before normalization. Its normalized return
shape is:

```ts
export type WidgetPlacement = "aboveEditor" | "belowEditor" | "off";
export type WidgetMode = "progress" | "summary";

export interface SubagentUiSettings {
  widgetPlacement: WidgetPlacement;
  widgetMode: WidgetMode;
  useNerdFont: boolean;
}
```

The accepted defaults are `aboveEditor`, `progress`, and `useNerdFont: true`.
`useNerdFont: true` is a configuration default, not a claim that the terminal has the
font. A user or test selects `false` for deterministic ASCII output; the package never
probes terminal cells, child output, or replacement boxes.

The settings boundary must:

- return defaults without warning for a missing file;
- warn and use affected-field defaults for invalid JSON, a non-object root, or invalid
  widget fields without blocking runtime discovery, recovery, notification, inspect, or
  join;
- preserve valid enum/boolean values;
- map legacy `widgetLayout: "columns"` or `"stacked"` to `widgetMode: "progress"` only
  when `widgetMode` is absent;
- warn for any other legacy `widgetLayout` value without overriding the accepted default;
- retain legacy fields unless an explicit future migration removes them;
- on save, merge normalized widget fields into the last successfully parsed complete
  object and retain unrelated and unknown keys as parsed values.

The preservation guarantee is semantic value preservation only. The implementation must
not promise byte-level preservation of unrelated JSON: whitespace, key order, escaping,
and final newline may change after a normalized JSON rewrite. A malformed file cannot
provide parsed unrelated values; loading it warns and a later save writes a valid object
containing normalized widget defaults plus the requested fields. Tests must verify nested
and unknown parsed values survive a valid load/save cycle and must not assert unchanged
bytes.

Placement and mode mean:

- `aboveEditor` mounts above the editor;
- `belowEditor` mounts below the editor;
- `off` clears/unmounts the widget and creates no timer or refresh work;
- `progress` renders active rows with state and elapsed time;
- `summary` renders aggregate counts from the current-generation observation.

Summary counts include queued, running, completed, failed, and cancelled observations
when present. `` marks completed counts and `` marks combined failed/cancelled counts
when `useNerdFont` is true; `+` and `!` are used when it is false. Terminal glyphs are
count markers, not terminal rows. Summary is a display mode, not a second source of truth.

## 9. Component And Rendering Contract

Use installed `pi-tui` APIs (`Component`, `truncateToWidth` or equivalent,
`TUI.requestRender`, and theme colors). No dependency may be added for width, icons,
timers, settings, or rendering.

The implemented factory provides `render(width: number): string[]` and `dispose()`. It
receives one observation snapshot, a `WidgetClock`, and the normalized `useNerdFont`
capability from the parent UI integration. Widths at or below one column must not throw.
Rendering must:

- sort before truncation;
- render at most six active progress rows;
- append exactly one `+N more` row when active rows exceed six;
- measure visible width with the installed ANSI-aware API;
- truncate complete rows with a visible ellipsis;
- avoid splitting surrogate pairs, combining sequences, or CJK cells when supported;
- retain icon, state, and a shortened identity in the narrow fallback;
- never render a terminal row because runtime memory retains it;
- isolate render, timer, theme, and `setWidget` exceptions from runtime, notification,
  inspect, join, and later refresh.

Progress preview:

```text
 build-api · handler  00:12  running
 review-tests · reviewer  00:04  queued
+4 more
```

Summary preview:

```text
 2 running   1 queued   3 completed   1 failed
```

Exact punctuation remains renderer-owned; the state, elapsed, privacy, settings,
capability, and width requirements are normative.

## 10. Nerd Font Map And Reproducible Fallback

The accepted icon map uses the project's Octicons Nerd Font glyphs:

| Meaning | Nerd Font glyph | ASCII fallback |
| --- | --- | --- |
| running | `` | `>` |
| queued | `` | `~` |
| completed count | `` | `+` |
| failed/cancelled count | `` | `!` |
| overflow | `…` | `...` |

The capability owner is the parent UI integration reading `SubagentSettingsStore`; the
renderer receives the resulting boolean and does not detect fonts. The production
default is `useNerdFont: true`. When false, every mapped status glyph uses its ASCII
fallback. When true, the renderer uses the exact mapped Nerd Font glyph. Replacement-box
inspection, child-output inspection, and terminal probing are forbidden.

The reproducible visual check runs the same fixture twice with the same observation
snapshot and settings except for the explicit capability: once with `useNerdFont: true`,
asserting the exact four Octicons code points, and once with `false`, asserting no mapped
Nerd Font code point and the exact ASCII fallback tokens. A non-NF terminal run may be
retained as additional evidence, but the injected-capability test is normative.

## 11. Placement, Notification, And Cleanup Independence

The widget is transient display state. It must not send messages, trigger turns,
acknowledge completion notifications, or include terminal reasons. The existing
`pi-herdr-subagent-completion` message remains the only terminal notification path. A
terminal transition removes its row while notification delivery proceeds independently,
including when rendering or clearing throws.

Repeated session lifecycle events keep at most one observation subscription and one
current component/timer. Shutdown attempts, with failure isolation, component `dispose`,
subscription removal, widget clear, retained-context release, and `runtime.stop()`.
A throwing clear or dispose must not block remaining cleanup.

## 12. ASCII Lifecycle Flows

### Spawn and progress

```text
spawn request
  -> queue admission
  -> persist queuedAt/status=queued
  -> queued invalidation
  -> execution admission
  -> persist startedAt/status=running
  -> running invalidation
  -> Component render
  -> [1s elapsed render timer]
  -> terminal persistence
  -> terminal invalidation + independent completion notification
```

### Recovery and reload

```text
session_start / before_agent_start
  -> load package settings with warning isolation
  -> select parent task scope
  -> dispose old component/timer and stop old monitors
  -> validate records
  -> migrate V1 createdAt, including explicit starting recovery mapping
  -> rebuild queued/running/terminal observations
  -> persist migrated records atomically
  -> emit one final recovery invalidation
  -> mount/reuse one Component with epoch clock and icon capability
  -> render recovered snapshot
```

### Failure isolation

```text
runtime event
  -> observation-safe lifecycle update
  -> immediate refresh
  -> setWidget / Component render throws
  -> swallow and optionally warn
  -> runtime, notification, join, and next refresh continue
  -> shutdown finally clears timer, component, subscription, widget, runtime
```

## 13. Non-Goals

This amendment does not authorize:

- full Result, prompt, error bodies, paths, model, thinking, or raw activity exposure;
- changes to tool schemas or terminal notification semantics;
- a second task store or Pi SettingsManager ownership for package settings;
- activity collection, pane polling, or terminal history;
- interactive row actions, folding, or expansion;
- a new dependency for the widget, settings, icons, timers, or rendering;
- terminal font detection or a claim of automatic NF capability;
- exact visual or behavioral parity with Pi Dust.

It does authorize one package-owned widget settings boundary, because the current
package has no settings owner and the widget cannot otherwise have a reproducible
placement/mode/icon policy.

## 14. Acceptance Checks

Focused implementation verification must cover:

- observation privacy, defensive snapshots, no initial event, synchronous callbacks,
  idempotent unsubscribe, listener isolation, and exact recovery invalidation;
- queue admission, running transition, terminal settlement, resume generation
  isolation, persistence, recovery, V1 legacy and V1 canonical identity migration,
  `starting` mapping and every subsequent outcome, and notification independence;
- epoch-clock elapsed formatting, recovery continuity, future/invalid timestamp
  clamping, one-second refresh, timer disposal, recovery replacement, and no leaked
  timers;
- the new `SubagentSettingsStore` owner/path, missing/invalid load behavior, warning
  isolation, valid fields, defaults including `useNerdFont: true`, legacy migration,
  semantic unrelated-key preservation, atomic temp-and-rename behavior, `off`, and
  summary mode;
- representative render widths, ANSI sequences, CJK/emoji/combining text, ordering,
  six-row cap, one overflow row, terminal removal, and narrow fallback;
- exact Nerd Font and explicit ASCII fallback fixtures using the same snapshot;
- UI/render/theme exceptions without runtime, notification, inspect, join, or refresh
  regressions;
- no forbidden data in observations or rendered output;
- existing completion notification and inspect/join regression tests remain green.

## 15. Shared-File Gate, Scope Protection, And Review State

The current source and test evidence is implementation evidence, not automatic user
acceptance or independent review. The external `#18` terminal-input barrier remains
separate, and its EOF blocker remains unresolved outside this Work. Automatic terminal
surface cleanup is owned by the separate auto-close Work/ADR; this widget neither
implements nor verifies it. Auto-close Phase B depends on this `#13` V2 lifecycle baseline
being accepted and landed, plus the separate Phase A manifest-passthrough gate. That
dependency does not merge the Work ownership or authorize either implementation.

The shared source/test surfaces remain protected:

| File | Ownership boundary | Widget consequence |
| --- | --- | --- |
| `packages/pi-herdr-subagents/src/index.ts` | runtime, settings, widget, and external Work changes share this file | preserve unrelated source hunks |
| `packages/pi-herdr-subagents/tests/runtime.test.ts` | lifecycle, task identity, cancellation/join, recovery, and widget assertions overlap | preserve unrelated Work tests, including #6 hunks |
| `packages/pi-herdr-subagents/tests/renderer.test.ts` | task-ID and renderer expectations overlap | update only under the owning Work's review |

The numeric Work labels are coordination references, not permission to overwrite another
Work. No commit is part of this repair.

The user has confirmed:

1. placement is above the editor by default and `progress` is the default mode;
2. queued and running generations are visible; elapsed is shown and refreshed once per
   second;
3. the project uses a custom width-aware `Component`, a six-row cap, and overflow;
4. the project Octicons map is used when the explicit capability is enabled;
5. activity is neither collected nor displayed;
6. summary is aggregate lifecycle counts from the same observation snapshot;
7. this is Dust-inspired, with the explicit differences in section 16;
8. `useNerdFont` defaults to true and false is the explicit ASCII choice;
9. elapsed uses one epoch-millisecond clock domain across live rendering and recovery.

The repaired implementation evidence is:

- `packages/pi-herdr-subagents/src/index.ts` contains the queued/running lifecycle,
  current V1/V2 persistence and migration, settings store, parent-only widget integration,
  epoch clock, explicit Nerd Font/ASCII policy, width-aware rendering, lifecycle-only
  progress observation, invalid legacy-layout warning, and best-effort temporary cleanup.
  This evidence does not prove V1 canonical `taskSlug` preservation or generic
  unknown-field passthrough; those remain Phase A gates.
- Package verification evidence: 74 tests, 378 assertions, and typecheck passed. Focused
  fixtures cover V2 required timestamp validation and stable recovery, combining-sequence
  truncation, invalid legacy layout with valid `widgetMode`, and failed-replacement cleanup.

These facts do not accept the Spec, ADR, Plan, or Tasks and do not claim independent
rereview. No acceptance is requested by this repair.
## Future Verification Gaps

The current implementation and supplied package checks do not cover these explicit
recovery-policy cases. They remain future Tasks and are not silently upgraded to
implemented guarantees:

- malformed V1 `createdAt` or `updatedAt` records, including expected rejection and
  non-observation behavior;
- malformed V1 Result precedence and persisted `invalid_result` settlement evidence; and
- V2 records with a future `startedAt`: decide whether recovery should reject them or
  retain them while the renderer's zero-elapsed clamp remains the display contract.

## 16. Dust-Inspired Parity Boundary

The package borrows the upstream Dust progress-widget shape and implementation
vocabulary, but does not claim exact parity. The deliberate differences are:

| Area | Dust reference | This package |
| --- | --- | --- |
| Activity | collects and displays current/completed tool or message activity | collects and displays no activity at all |
| Default placement | upstream default is `belowEditor` | default is `aboveEditor` |
| Default mode | upstream default is `summary` | default is `progress` |
| Status icons | upstream uses its own marker choices | project Octicons Nerd Font map with explicit configured ASCII fallback |
| Summary | upstream summary includes retained-conversation semantics | summary counts lifecycle statuses, with completed and failed/cancelled markers |
| Progress cap | upstream display limit is settings-driven | six rows are normative for this amendment |
| Settings owner | upstream owns its own settings implementation | this package adds one explicit package-owned settings boundary |
| Clock/testing | upstream implementation calls wall-clock time directly | this package injects epoch wall-clock milliseconds and uses the same domain after recovery |

The common behavior is limited to queued/running progress presentation, elapsed
formatting, Component-based width-aware rendering, placement/mode settings, and
lifecycle-driven refresh. Upstream files are behavioral references, not dependencies or
authority for this package.

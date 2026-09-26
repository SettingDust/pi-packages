# Plan: Todo Compact Summary and Detail Overlay

- Status: **Gate C design accepted; O0-O3 delivered; O4 automated checks and independent review complete; live interactive acceptance unperformed**
- Owner: `packages/todo`
- Related Work: [work.md](work.md)
- Related Context: [context.md](context.md)
- Governing protocol authority: [Todo Multi-Tool Protocol](../todo-protocol-redesign/spec.md)
- Implementation progression: **O4 and overall delivery remain incomplete pending live regular/fullscreen TUI observation**

## 1. Objective

Deliver one bounded presentation change: keep the existing persistent Todo widget to at most two nonblank summary rows and provide complete, expandable detail in a focused Pi overlay opened by a command or shortcut. Preserve the canonical Todo model and every non-presentation contract.

The later user instruction to proceed authorized implementation. O0-O3 have since been delivered; the exact `0.85.1` graph and automated O4 checks passed. Required interactive O4 evidence is still unperformed; see [Context](context.md) and [Tasks](tasks.md) for current evidence and status. The following design and verification contract remains unchanged.

T1 synchronized this Plan, Work, and Context to the narrow presentation-anchor Spec amendment that passed independent B1 `GO_COMPACT_SPEC_AMENDMENT`, P0=0/P1=0/P2=0/P3=0, and was explicitly accepted at Gate B for exact candidate `70fea8a639db2a2ba2a35d21be375d6d3ee458511fd55c73fe60620b3094695e`. Generation-2 T2 then returned GO with all severity counts zero for the exact derived tuple, followed by the user's separate explicit Gate C acceptance. [Work's Stage C record](work.md) retains the reviewed/accepted pre-recording hashes and provenance. Those historical administrative stages preceded the later implementation authorization and I0-I3 delivery.

## 2. Boundary

### Candidate source ownership

| Path | Planned responsibility |
| --- | --- |
| `packages/todo/src/widget-layout.ts` | Replace task-by-task widget output with fixed-row status/active-or-next summary; retain existing width fitting and theme roles. |
| `packages/todo/src/detail-overlay.ts` (new) | Own the detail component, local cursor/expanded state, bounded rendering, overlay-owned bounded offset/slicing and public mouse composition, keyboard handling, and `done()` dismissal. |
| `packages/todo/src/tool.ts` | After competing-owner release, register exact base command `todo-details` (public invocation resolved by Pi) and shortcut `Key.ctrlShift("t")` (`Ctrl+Shift+T`) at the existing coordinator boundary; pass a cloned `coordinator.snapshot()` into one shared overlay opener. Do not change tool handlers or renderers. |

### Candidate test ownership

| Path | Planned responsibility |
| --- | --- |
| `packages/todo/test/widget.test.ts` | Prove one/two-row summary behavior, presentation-anchor derivation from canonical order, status counts, terminal state, width bounds, and unchanged lifecycle expectations. |
| `packages/todo/test/detail-overlay.test.ts` (new) | Prove initial state, full detail, keyboard transitions, public mouse toggling, scrolling, empty/narrow states, render invalidation, disposal, and no snapshot mutation. |
| `packages/todo/test/index.test.ts` | Prove one command and one shortcut registration, common opener behavior, current snapshot handoff, TUI guard, and unchanged four-tool/event contracts. |

### Candidate dependency ownership

| Path | Planned responsibility |
| --- | --- |
| Root `package.json` | Change the three exact Pi dev dependencies together from `0.84.2` to `0.85.1`; this controls the installed graph consumed across workspaces. |
| `packages/todo/package.json` | Change the same three peer declarations together from exact `0.84.2` to exact `0.85.1`; no other metadata or dependency changes. |
| Root `bun.lock` | Reconcile the repository-native lock to the same exact three-package graph; accept only dependency closure changes attributable to those two manifest edits. |

Root graph effects are verification scope: `packages/pi-harness` and `packages/pi-herdr-subagents` declare wildcard peers and resolve through the root installation. Their manifests and source are not owned, but their package tests and typechecks must pass from the same installed graph before completion.

### Candidate documentation ownership

Only `packages/todo/docs/works/todo-compact-rendering/work.md`, `context.md`, `plan.md`, and `tasks.md` are in scope for this lifecycle reconciliation. README and CHANGELOG remain excluded because visibility wording is separately owned. Public documentation, release notes, and settings require separate authority after that ownership is resolved.

No other source, test, documentation, setting, package metadata, dependency, or lockfile path is owned. In particular, metadata scope is root `package.json` plus `packages/todo/package.json`; dependency scope is only the three exact Pi packages; lockfile scope is only root `bun.lock`; and `widget.ts` and `widget-component.ts` remain unchanged so the existing publication lifecycle, error boundary, fallback-glyph plumbing, and spacer behavior are preserved.

## 3. Rendering Contract

### Persistent summary

`renderTodoWidgetLines()` remains a pure width-aware projection and returns:

1. A first nonblank row headed `Todos` followed by fixed-order counts for `in_progress`, `pending`, `completed`, and `cancelled`. Zero counts remain present so the row's semantic shape does not depend on status mix.
2. A second nonblank row only when open work exists. It identifies `Task / Todo` using a deterministic read-only presentation anchor derived from existing canonical task and todo order: the first `in_progress` todo, otherwise the first pending todo. If neither exists, omit the row. This conditional projection introduces no fallback state. If more todos share that chosen status, append a bounded `+N` count rather than more rows.

The anchor creates no canonical primary, selected, or unique active todo; does not mutate, serialize, persist, write back, or feed business logic; does not compress or replace active groups; and introduces no priority, timestamp, hidden selection, or fallback state. Every group containing `in_progress` todos remains independently represented, and the prohibition on a canonical or protocol single-active summary remains in force. The anchor changes no request, result, schema, canonical state, restore, queueing, persistence, tool behavior, complete-removal authority, implementation boundary, or other protocol contract. The overlay keyboard cursor and expansion/scroll indexes below are separate local interaction state and do not turn the anchor into a canonical selection.

The function returns no task headers, descriptions, individual status rows, hidden-row summaries, or terminal summary rows. Existing width fitting applies to each line. The above-editor component may append its current blank spacer, keeping the entire widget at no more than three terminal rows. Existing empty/off/terminal visibility remains owned by `widget.ts` and is not changed.

### Detail overlay

The shared opener requires `ctx.mode === "tui"`; otherwise it notifies and returns. In TUI mode it clones the coordinator snapshot once and invokes:

```ts
ctx.ui.custom((tui, theme, keybindings, done) => component, {
  overlay: true,
  overlayOptions: { width: "90%", maxHeight: "80%", margin: 1 },
});
```

Exact percentages may be reduced if the selected public API requires it, but the accepted invariants are terminal-relative sizing, at least one-cell edge containment where the terminal permits, no fixed minimum width, and no label-driven outer resizing.

The overlay presents a compact title/status line and canonical task headers. Each task header includes a textual/glyph expanded or collapsed indicator, task name, and progress counts. An expanded task shows every canonical todo in source order with status glyph, name, and the complete description. Descriptions wrap within the current content width and are never vertically elided; PageUp/PageDown make every wrapped line discoverable even when one expanded task exceeds the viewport. Empty tasks remain operable headers. A zero-task snapshot renders one bounded empty state.

The overlay owns overflow with an integer `offset`; do not embed ScrollView or depend on Host layout/updateLayout. Pi calls component.render(width) and externally clips maxHeight, so return an already-sliced viewport. Read public `tui.terminal.rows` only for geometry and use the supplied render width. With the fixed options above, recompute `height = max(1, min(floor(rows * 0.8), max(1, rows - 2)))` on every render. Reserve one title/help row only when height >= 2; otherwise use the sole row for content. No additional borders/footer consume rows. The remaining viewportHeight is at least one. Pad short bodies to viewport height so content/selection never resizes the overlay.

Wrap expanded descriptions in full into width-bounded content lines and derive task-header indexes. Clamp offset to `[0, max(0, contentLines.length - viewportHeight)]` after rewrap/resize, expansion/collapse, and scrolling; return `contentLines.slice(offset, offset + viewportHeight)` plus chrome/padding. Resize rewraps/clamps without forcing the selection into view. Selection/expansion operations minimally reveal the resulting selected header: move offset to headerIndex if above the viewport, or to headerIndex - viewportHeight + 1 if below, then clamp. PageUp/PageDown and wheel freely scroll without changing selection. Rebuild visible header hit areas after each slice; local event row minus chromeRows plus offset locates the content row. Forward only visible header events to their MouseRegion with region-local coordinates, without importing Host dispatch internals. Public `MouseRegion` instances identify rendered task-header hit areas, and the component implements the public `Component.handleMouse` contract. The component must not copy Pi's internal tree/list or dispatch logic, import non-barrel internals, or create a second canonical data model.

## 4. Interaction And Accessibility Contract

- Initial cursor: first task with an `in_progress` todo; otherwise first with pending work; otherwise first nonempty task; otherwise first task.
- Initial expansion: every task containing `in_progress` is expanded. If none is active, only the initial usable task is expanded. Empty snapshots have no cursor or expansion.
- `Up`/`Down`: previous/next task, bounded at ends; minimally scroll to reveal the newly selected header.
- `Home`/`End`: select and reveal the first/last task. They never mean viewport start/end.
- `PageUp`/`PageDown`: scroll the overlay-owned detail viewport by `max(1, viewportHeight - 1)` rows without changing task selection. These scrolling bindings take precedence over selection navigation while a task is expanded.
- Free-scroll policy: PageUp/PageDown may move the selected header off-screen. Up/Down/Home/End/Left/Right/Enter/Space minimally reveal the selected header before applying their operation; they do not reset to the top of an expanded body.
- `Left`: collapse selected task if expanded.
- `Right`: expand selected task if collapsed.
- `Enter`/`Space`: toggle selected task.
- `Escape`: call `done(undefined)` from every overlay state.
- Keyboard matching uses the factory's `KeybindingsManager` for public semantic selection/page bindings and `matchesKey` for explicit Escape/Home/End/Left/Right/Space behavior.
- Every cursor, expansion, or scroll change invokes `tui.requestRender()` once. No-op boundary keys need not render.
- Focused selection and expanded/collapsed state are indicated by glyph/text and theme role, never color alone. Full wrapped description text must be discoverable by keyboard; a many-todo expanded task must reach its final todo through repeated PageDown without mouse input.
- In fullscreen/alternate-screen mode, each rendered task header is associated with a public `MouseRegion`. A primary-button activation first selects that exact task and then invokes the shared `toggleTask(index)` exactly once, including for an initially unselected task. Expand or collapse minimally scrolls to retain the clicked header; the clicked task remains selected, so the next keyboard operation targets it. The event returns handled.
- The outer public `Component.handleMouse` handles wheel before header activation. Within rendered overlay bounds (body, header, or chrome), `event.type === "wheel"` adds `event.wheelDelta ?? 0` to offset and clamps it. The delta already represents logical lines, negative upward: do not decode buttons or multiply it again. Preserve selection/expansion. Return `{ handled: true, render: false }` even at boundaries to contain scrolling; request rendering exactly once only if offset changes. Explicit render suppression avoids the Host's default second request and also applies to header clicks whose shared toggle requested rendering.
- Only `type === "click"` with `button === "left"` on a visible header toggles it. Non-header/non-primary clicks, press/release/move/drag, and out-of-bounds events return unhandled. Press/release must not duplicate a click. Wheel is a separate handled case; no main-layout fallback is assumed.
- Regular mode remains completely keyboard-operable and accepts no Pi-captured mouse input.
- No `onTerminalInput`, raw-input listener, terminal escape parsing, direct terminal input/output (public read-only row geometry is allowed), private import, non-barrel dispatcher, hidden global key state, animation, or timing dependency is introduced.
- Escape completion and normal custom-overlay teardown restore prior focus through Pi's overlay lifecycle. `dispose()` releases any overlay-local regions and derived viewport data; no overlay state survives close.

## 5. State And Control Flow

1. `registerTodoTools()` creates the existing coordinator and registers tools/events unchanged.
2. It registers command name `todo-details` (invoked as `/todo-details` when unique) with description `Open Todo details` and shortcut `Key.ctrlShift("t")` (displayed as `Ctrl+Shift+T`) with the same description; both call one local `openTodoDetails(ctx)` function. Pi's native shortcut resolver remains authoritative: reserved collisions skip this shortcut, non-reserved built-in collisions warn and yield, and a later extension shortcut may supersede it. No dynamic alternate shortcut or extension-side rename is chosen; the resolved Todo command is the fallback entry under the duplicate-command contract below.
3. The opener guards TUI mode, obtains `coordinator.snapshot()`, and passes that clone to `detail-overlay.ts`.
4. The detail component derives initial cursor/expansion locally. It reads but never mutates the cloned snapshot.
5. Input changes only overlay-local cursor/expansion/scroll state and requests a render.
6. Escape resolves `ctx.ui.custom()`. Pi removes the overlay and restores prior focus.
7. A later open obtains a fresh coordinator snapshot, so tool mutation, restore, and branch navigation remain the only sources of Todo truth.

No event handler, coordinator method, widget publication call, persistence path, or tool response changes are needed.

### Duplicate-command contract

Register base name `todo-details` once with description `Open Todo details`. When unique, invoke `/todo-details`. With duplicate base registrations, Pi 0.85.1 suffixes **every** registration (normally `/todo-details:1`, `/todo-details:2`, in loaded order); the unqualified command no longer resolves. Never assume Todo owns `:1` or that suffixes survive reload/reordering. The resolver also skips already-taken invocation names: the resolved list is authoritative.

User discovery uses native slash autocomplete: type `/todo-details` and select the qualified entry carrying `Open Todo details` and Todo's source attribution. Pi builds these entries from resolved invocation names and prefixes descriptions with source tags. This is the fallback when a shortcut collision makes the shortcut unavailable. Public `pi.getCommands()` exposes resolved `name`, `description`, `source`, and `sourceInfo.path` for verification against the loaded Todo source; no private runner import is allowed. Source tags may be non-unique. If description/source tags cannot distinguish Todo, the discoverability gate must visibly fail, reporting candidate invocation names and source paths and requiring duplicate removal before admission. Do not silently choose a suffix or claim an identifiable fallback. No new event handler or runtime command registry is needed.

Deliberately load a second extension registering `todo-details` with a distinct description in an isolated verification fixture/session. Automated verification must exercise pinned public extension-loading/session APIs, not a fake preserving the base name: assert all duplicates are qualified, the unqualified entry is absent, public getCommands identifies the Todo source, and the actual resolved invocation reaches the shared opener. Reverse load order and include ambiguous description/source-tag attribution that visibly fails the gate. In regular and fullscreen interactive checks, deliberately make the shortcut unavailable too, select Todo through autocomplete, open its overlay, and record the actual invocation/source. The public SDK duplicate checks described here passed in the automated I4 report, including reversed load order and ambiguous-attribution fixture rejection. Native autocomplete, shortcut handling, and visible ambiguity rejection in a live interactive Host remain unperformed.

## 6. Ordered Outcomes

### O0: Release competing owners, establish exact Host baseline, and freeze ownership

Historical O0 preflight: Todo Review Fixes Work in `E:/Projects/pi-packages/.worktree/todo-review-fixes` recorded B2, corrected A2, and C2 complete with ownership released, but its accepted fixes initially remained dirty in that separate worktree. A later explicit upstream incorporation Result establishes those fixes locally, including excluded `widget.ts`, before O3. The former incorporation gate is now satisfied. O0 installed the exact `0.85.1` graph, and O1-O3 delivered the bounded projection, overlay, and registration. See [Context](context.md) for current evidence; the following O0 ordering and ownership rules document the executed contract.

After implementation authorization, first inspect authoritative Todo Review Fixes lifecycle evidence in `E:/Projects/pi-packages/.worktree/todo-review-fixes`. Do not write `packages/todo/src/tool.ts` or `packages/todo/test/index.test.ts` while Slice B owns them through B2 or while Slice A subsequently owns `index.test.ts` through A2. Once both releases are evidenced, record fresh hashes/diffs of both paths and run their focused baseline before compact registration work. `packages/todo/README.md` remains Slice C-owned through C2 and excluded from compact writes regardless of release.

Then update root `package.json`, `packages/todo/package.json`, and root `bun.lock`: all three Pi packages move together from exact `0.84.2` to exact `0.85.1`. Install from that lock and compile against public barrel exports for `MouseRegion`, `Component.handleMouse`, public mouse event/result types, `Key.ctrlShift`, `ctx.ui.custom`, public row geometry, and `pi.getCommands()`. Inspect lock closure and run Todo plus wildcard-consumer checks from that same installation.

**Gate:** The two manifests and installed/locked direct graph must agree on exact `0.85.1`, only attributable lock closure may change, all overlapping owners must have released their paths before those paths are touched, and the re-read bytes must still support this Plan. Do not substitute mixed Pi versions, `onTerminalInput`, raw terminal access/parsing, private imports, non-barrel dispatch internals, internal `app.tools.expand`, or fake sidebar behavior.

### O1: Compact the persistent projection

Change only `widget-layout.ts` and focused widget tests. Reuse existing counting, glyph, theme, and width utilities where they already fit; do not extract a general summary framework. Remove obsolete expectations for task-by-task persistent output and prove fixed row count across zero, one, and large snapshots.

**Depends on:** accepted implementation tuple and the metadata portion of O0. This disjoint path may proceed before A/B release only when authorization explicitly permits parallel work and exact path inventories remain disjoint.

### O2: Add the detail overlay

Create one detail component module and focused test file. Use public overlay, keybinding, mouse-region, focus, and render APIs from the O0 baseline. Keep local state minimal: selected task index, expanded task indexes, and overlay-owned bounded offset; derive wrapped lines and visible header positions from current geometry.

**Depends on:** O0's exact installed graph. It may be implemented independently of O1 only if it does not touch `widget-layout.ts` or `widget.test.ts`; shared visual helpers may be imported but not refactored during parallel work. It may proceed before A/B release only on its new, disjoint paths.

### O3: Register one entry path

In `tool.ts`, register base command `todo-details` and `Key.ctrlShift("t")` against the existing coordinator, both calling one opener. Add focused registration tests without changing the four tools, existing event list semantics, coordinator methods, or render callbacks.

**Depends on:** O2's stable opener signature, Slice B B2 release of `tool.ts`/`index.test.ts`, Slice A A2 release of `index.test.ts`, and successful byte/baseline recheck. No compact process may parallel-write either path with Todo Review Fixes.

### O4: Integrate and verify

Run focused tests, package tests, compile/typecheck, static path checks, lock/package-graph checks, and the regular/fullscreen interactive Host matrix. Reconcile only these four Work documents after evidence exists; do not update excluded docs or lifecycle claims owned elsewhere.

**Depends on:** O1, O2, O3.

## 7. Verification Matrix

| Behavior | Focused automated evidence | Interactive Host evidence |
| --- | --- | --- |
| Widget row stability | Snapshots with 0, 1, and many tasks/todos produce no more than two nonblank layout rows; component with spacer produces no more than three total rows. | Observe stable widget height before/after large `todo_set` and transitions at wide/narrow widths. |
| Summary semantics | Assert fixed status-count order including zeros, deterministic read-only anchor from existing canonical task/todo order (`in_progress`, otherwise pending, otherwise no second row), bounded `+N`, description omission, and terminal-only row count. Verify every anchor exclusion in §3, including independent active-group representation and the canonical/protocol single-active-summary prohibition. | Compare visible counts/anchor with the complete `todo_view` snapshot; every active group remains independently represented. |
| Width safety | For widths `1`, `4`, `20`, and `80`, every line satisfies `visibleWidth(line) <= width`; long Unicode names/descriptions do not throw. | Resize regular and fullscreen terminals; no overflow or unstable outer dimensions. |
| Lifecycle preservation | Existing restore, off, refresh, five-second terminal clear, spacer, and warning tests remain passing without edits outside owned tests. | Transition final todo and observe unchanged final-summary timing/clear behavior. |
| Registration and collision fallback | Assert command key `todo-details`, shortcut key `Key.ctrlShift("t")`, description `Open Todo details`, exactly four tools unchanged, existing events unchanged, and one common opener. Exercise shortcut collisions and deliberate duplicate-command qualification through the pinned public loading/session API; assert base-name absence, source-attributed discovery and actual invocation. Reverse load order; ambiguous attribution visibly fails the gate. | Native autocomplete exposes the base name only when unique. Deliberately duplicate the command and disable its shortcut through collision, select the attributed qualified Todo entry, and open its overlay. Record actual invocation/source and native shortcut diagnostics; ambiguous discovery fails admission. |
| TUI guard | Non-TUI context notifies once and does not call `custom`. | RPC/print behavior is noninteractive and nonthrowing where reproducible. |
| Fresh snapshot/no mutation | Open, inspect cloned input, exercise interactions, close, mutate coordinator, reopen, and assert new snapshot; freeze/deep-compare source state. | Reopen after a Todo mutation/branch restore and observe current data. |
| Initial state | Active groups initially expanded; no-active fallback selects/expands the specified group; empty and terminal snapshots are deterministic. | Observe all state classes. |
| Package baseline and workspace effects | Assert root `package.json` and `packages/todo/package.json` pin all three Pi packages to exact `0.85.1`; inspect root `bun.lock` direct resolutions and attributable transitive closure; `bun install --frozen-lockfile` succeeds; Todo, `pi-harness`, and `pi-herdr-subagents` tests/typechecks run from that one installation. Compile imports only public barrels and `Component.handleMouse`. | Launch that exact installed graph used by compile/test evidence and record Host/package versions. |
| Keyboard and oversized body | Table-test Up/Down/Home/End task selection, Left/Right/Enter/Space expansion, PageUp/PageDown free-scroll precedence, Escape, boundary no-ops, one render request per visible change, selected-header reveal after selection/toggle, and full description wrapping. A many-todo single expanded task must begin above the viewport and reach its final todo/description by repeated PageDown only. | Operate entirely by keyboard in regular and fullscreen modes; PageDown reaches the final todo of an oversized expanded task, PageUp returns through it, selection commands restore header visibility, and Escape restores editor focus. |
| Mouse routing and click continuity | Public event tests send primary clicks to selected and unselected headers plus non-primary, non-region, and wheel events. Assert an unselected-header primary click selects and toggles exactly once, keeps that header visible, returns handled, and the next Left/Right/Enter keyboard operation targets it. Wheel consumes the public signed delta over body/header/chrome, preserves selection, clamps offset, and returns handled even at boundaries. Assert render suppression plus one explicit render per change, no boundary-no-op render, and correct hit mapping after scroll/resize. | Verify regular mode has complete keyboard behavior and no Pi-captured mouse acceptance; in fullscreen/alternate-screen click an unselected collapsed header, observe one expansion, operate it by keyboard, collapse by click, and wheel-scroll the same `0.85.1` graph. |
| Large detail | Overlay-owned offset/clamping/slicing keeps all content keyboard-reachable at bounded height, including a one-row content viewport and resize after scrolling; selection/toggle commands reveal the selected header while PageUp/PageDown can move it off-screen. | Navigate first, middle, and last groups, then PageDown through an oversized body without overlay growth or transcript corruption. |
| Focus/disposal | Completion calls `done` once; dispose releases resources; overlay teardown leaves no handlers/state. | Open/close repeatedly and confirm prior editor focus/input behavior returns. |
| Cross-Work ownership | Before O3, verify supplied accepted Todo Review Fixes Work/Context hashes, B2 release of `tool.ts`/`index.test.ts`, subsequent A2 release of `index.test.ts`, and fresh pre-write hashes/baselines. Assert compact never changes `widget.ts` or README. | Confirm no concurrent owner is writing overlapping paths; C retains README through C2. |
| Scope containment | Final compact-owned changed paths equal the six candidate source/test paths, root `package.json`, `packages/todo/package.json`, root `bun.lock`, and these four lifecycle documents; pre-existing released A/B changes are separately attributable and not claimed as compact changes. Lock changes are attributable only to the three-package upgrade; `git diff --check` passes. | Verify no settings, Host/core, README, CHANGELOG, other metadata/dependency/lockfile, or unrelated changes. |

The listed automated commands have been executed as documented in the I4 report linked from [Context](context.md): 360 distinct package tests, three typechecks, frozen install, exact graph and diff checks passed on the declared Bun `1.3.14` graph. Noninteractive RPC/print Host checks also passed. The interactive regular/fullscreen matrix still requires live observation on the same installed graph. Compile/type evidence is not real fullscreen mouse or focus evidence.

## 8. Risks And Mitigations

- **Package graph drift:** upgrading only one manifest/package or accepting unrelated lock churn would invalidate the inspected baseline and can affect wildcard peer consumers. Pin all three packages in root and Todo manifests to exact `0.85.1`, reconcile only root `bun.lock`, inspect attributable closure, and run Todo, `pi-harness`, and `pi-herdr-subagents` checks from one frozen installation.
- **Mouse routing mismatch:** custom overlays have no ScrollView layout pass or main-layout wheel fallback. Own bounded slicing and explicitly consume public wheel deltas. Keep regular mode keyboard-only and primary header clicks single-toggle; verify hit mapping after resize/scroll.
- **Widget lifecycle regression:** changing publication code could alter terminal clearing or error isolation. Keep `widget.ts` and `widget-component.ts` excluded.
- **Second state model:** sharing mutable overlay state with the coordinator could corrupt protocol truth. Pass one clone and keep only presentation indexes local.
- **Narrow-terminal overflow:** borders, descriptions, and fixed minimum widths can exceed the viewport. Use terminal-relative overlay options, public width utilities, and explicit widths down to one column.
- **Keyboard/mouse divergence:** separate toggle implementations can produce different state. Route both through one local `toggleTask(index)` operation.
- **Shortcut conflict:** the public entry is fixed at `Key.ctrlShift("t")`. Preserve Pi's native diagnostics and winner rules; never silently override a reserved binding or choose another shortcut. The discoverably attributed resolved Todo command remains the fallback; duplicate registrations suffix every invocation. Ambiguous attribution visibly fails the admission gate.
- **Ownership collision:** Slice B retains `tool.ts`/`index.test.ts` through B2, Slice A then retains `index.test.ts` through A2, and Slice C retains README through C2. Gate O3 on B2/A2 release and byte recheck; never modify README or `widget.ts`.

## Fresh Review Disposition

The pre-repair tuple received **NO-GO: P0=0/P1=2/P2=0/P3=0**. P1 scrolling is addressed by overlay-owned slicing and explicit public wheel handling (§3–4). P1 duplicate commands is addressed by resolved-name discovery, explicit base-name absence under duplicates, and deliberate automated/interactive checks (§5, §7). Generation-2 T2 reviewed the exact T1 tuple and returned GO with all severity counts zero; the user separately accepted that design at Gate C. This clears document-level findings only, not implementation correctness. Dependency/rollback ownership, fixed summary, focus/accessibility, B2→A2 release sequencing, verification graph, and README/widget exclusions remain unchanged.

## 9. Rollback And Completion

Because the overlay stores no canonical or persisted state, source rollback removes the command/shortcut/detail module and restores the prior widget projection/tests. The dependency upgrade is also reversed: restore the three direct versions in root `package.json` and `packages/todo/package.json` to their pre-compact values and regenerate only the attributable root `bun.lock` closure, preserving unrelated lock entries and concurrent changes. This is required because `0.85.1` was introduced here solely to support compact fullscreen mouse behavior. If later accepted work independently owns or requires `0.85.1`, stop rollback for ownership reconciliation rather than retaining or deleting its graph changes implicitly. Re-run the affected-workspace frozen-install/test/typecheck matrix on the restored graph. No data migration or compatibility adapter is required.

Completion requires all verification-matrix rows to pass against the same implementation bytes and exact coordinated `0.85.1` package graph, an independent correctness review with no unresolved material findings, exact path containment, and truthful lifecycle reconciliation. The design tuple was accepted at Gate C; later user authorization led to O0-O3 delivery. Automated O4 checks and independent read-only correctness review now have passing evidence, without new test reruns in that review. Live regular/fullscreen interaction remains UNPERFORMED due missing interactive observation capability. O4 and overall delivery therefore remain incomplete, without waiving a matrix row or treating lack of observation as a code defect.

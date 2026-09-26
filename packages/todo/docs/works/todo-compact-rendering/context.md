# Context: Todo Compact Summary and Detail Overlay

- Status: **Gate C design accepted; I0-I3 delivered; automated I4 and independent review complete; live interactive acceptance unperformed**
- Related Work: [work.md](work.md)
- Related Plan: [plan.md](plan.md)
- Governing protocol authority: [Todo Multi-Tool Protocol](../todo-protocol-redesign/spec.md)
- Implementation progression: **I4 and overall delivery remain incomplete pending regular/fullscreen live TUI observation**

## Purpose

Processed context for a bounded presentation change: a compact persistent Todo summary plus a Todo-owned expandable detail overlay. This file records evidence, ownership, constraints, and remaining acceptance gaps. It is not product or technical authority.

## Accepted Direction Supplied To This Draft

The Handoff supplies these decisions and constraints:

- Reuse Pi's public mouse interaction path on the exact coordinated `0.85.1` baseline so mouse expansion works in fullscreen/alternate-screen mode.
- Keep the persistent Todo area at a stable one-to-three terminal rows regardless of task count.
- Open complete detail through a command/shortcut into a Todo-owned custom overlay.
- Use only public barrel exports and component contracts; do not claim a sidebar API or public expandable tree/list.
- Keep regular mode fully keyboard-operable and reject Pi-captured mouse input there.
- Do not use internal `app.tools.expand`, non-barrel dispatch internals, `onTerminalInput`, raw terminal input/parsing, private imports, or a simulated sidebar.
- Separately owned review fixes cover widget fault isolation, fallback-glyph propagation, and README visibility wording; this Work must not absorb them.

The supplied source-grounded research resolves the earlier capability discrepancy: exact `0.84.2` peers lack public `MouseRegion`, `handleMouse`, and `TuiMouse*` barrel exports, while the publicly inspected `0.85.1` baseline exposes `Component.handleMouse`, `MouseRegion`, mouse event/result types, custom overlay composition, fullscreen-only routing. Its ScrollView wheel fallback applies to the main layout, not this custom overlay. The exact first intermediate release is unknown; this draft selects the verified supported target `0.85.1` instead of claiming an introduction version.

## Accepted Spec And T1 Reconciliation

The governing [Spec](../todo-protocol-redesign/spec.md) now permits the narrow presentation-only anchor. Exact candidate SHA-256 `70fea8a639db2a2ba2a35d21be375d6d3ee458511fd55c73fe60620b3094695e` passed independent B1 `GO_COMPACT_SPEC_AMENDMENT`, P0=0/P1=0/P2=0/P3=0, and the user subsequently explicitly accepted it at Gate B. The supplied completed acceptance-record Result and current Spec hash `910aabadd6a1f0d92798922f829f37cc891be08ed3f325967e87a2375ac18cca` establish a status-only lifecycle write with Sections 1–8 unchanged. The retained candidate-stage paragraph label does not override that later acceptance.

T1 synchronized this Context, Work, and Plan to accepted authority. Generation-2 T2 returned GO with all severity counts zero for the exact tuple, and the user separately explicitly accepted it at Gate C. [Work's Stage C record](work.md) identifies the accepted pre-recording hashes, review locator, and supplied acceptance provenance. At that stage administrative Tasks reflected only completed stages; B1 GO and Gate B alone did not supply T2 clearance or Gate C acceptance. The later instruction `推进` authorized implementation; current delivery evidence is recorded below.

## Current Delivery Evidence

The user separately authorized implementation after Gate C; the earlier task-preparation-only language below records its historical boundary. I0 delivered the exact `0.85.1` root/Todo manifest and lock graph; I1 delivered `widget-layout.ts` and widget tests; I2 delivered `detail-overlay.ts` and overlay tests. The accepted B2/A2 upstream fixes were explicitly incorporated into this worktree (including excluded `widget.ts`) before I3 delivered the Todo command/shortcut registration and index tests. The supplied I0, I1 generation-2, I2, upstream-incorporation, and I3 Results are linked in [Work](work.md); I3's tool/index-test/widget hashes match the later I4 preflight. The former cross-Work integration gate is met; it is not a current blocker.

The [I4 verification report](C:/Users/WINDOWS/.cache/pi/todo-compact-i4-verification.md) reports `bun@1.3.14` frozen installation without changes; root, Todo, lock and installed graph all at exact `0.85.1`; focused 35 tests and full suites of 82 Todo, 136 pi-harness, and 142 pi-herdr-subagents tests (360 distinct full-suite tests); and all three typechecks passing. Public SDK duplicate-command/collision fixtures and real offline RPC/print Host commands passed. This is automated and noninteractive evidence only. The independent review Result linked in [Work](work.md) found no material correctness issues from read-only inspection and reran no tests.

**Open acceptance:** the I4 report's live regular/fullscreen matrix remains UNPERFORMED: physical keyboard-only navigation, mouse routing/click-then-keyboard/wheel, narrow resize and large detail, editor focus restoration, real native autocomplete/shortcut collisions and ambiguous attribution, summary timing, and restore/reopen behavior on the same installed graph. Available stdin/stdout were redirected and no supported interactive observation surface was available. Stubbed event tests and offline Host exercises do not establish these claims. I4 and overall delivery are incomplete, without a finding that the implementation is defective. [Tasks](tasks.md) records the bounded manual checklist.

## Historical Implementation Preflight (before I0-I3 delivery)

The separate Todo Review Fixes Work at `E:/Projects/pi-packages/.worktree/todo-review-fixes/packages/todo/docs/works/todo-review-fixes/work.md` now reports B2 and corrected A2 complete, releasing `src/tool.ts` and `test/index.test.ts`; C2 releases README ownership, but README stays excluded from Compact. This is later lifecycle evidence than the historical "through B2/A2" descriptions below.

Release is not local incorporation. SHA-256 in this compact worktree: `src/tool.ts` `a6e6d10d84cf21421f1872491b74355198657d8e68001b23e26c8bf5507e7606`, `test/index.test.ts` `438702442bc1a37a50004ed59c84f6786f7e0545c4fd10fdeec2be34c73192e6`, `src/widget.ts` `4d8712276625a1124e3563f8d664fc51554ad6f62438c1839ef89656aa3b95ff`. Separate review-fixes worktree has respectively `e9f2d1b7fa5c9813b75d3d50cb478a85f3207be1363b99dcba79e194398e83b4`, `7580cb0b319a1e995c59dfb3d18629b44d815aa18ccb8bda95154f3895049a8e`, and `dc90aaf25f1137209c043ab15c0b8835a57adbcbe019294dab3175625b35e5f7`; its three paths remain dirty. The accepted fallback-glyph and post-commit-notification fixes are therefore not part of the compact baseline. Before registration/integration, an explicit upstream owner must incorporate those accepted changes into this worktree without Compact editing excluded `widget.ts`; re-read bytes and tests afterward. Metadata/lock, widget layout, and new overlay paths remain disjoint implementation units once dispatched. No upstream incorporation was done here.

The governing Spec's status accepts the narrow Section 1 amendment at Gate B while its retained candidate label and earlier implementation-status prose describe older stages. Neither stale phrase overrides Gate B/Gate C or the later implementation authorization. No change to that authority is part of this reconciliation.

## Historical Todo Ownership Inspection (before I0-I3 delivery)

Source inspection in this worktree establishes:

- `packages/todo/src/tool.ts` owns the single `TodoCoordinator`, current snapshot access, four tool registrations, extension event handlers, and widget publication. It is the narrow registration point for a command/shortcut that must read current state without creating a second store.
- `packages/todo/src/widget.ts` owns widget placement, visibility, restore reset, error notification, and the five-second terminal clear lifecycle. Its existing behavior is outside this change.
- `packages/todo/src/widget-component.ts` delegates width-aware rendering to `renderTodoWidgetLines()` and adds the existing optional blank row below an above-editor widget. No lifecycle or state logic is needed there.
- `packages/todo/src/widget-layout.ts` owns the current task-by-task persistent widget projection, width fitting, task titles, todo rows, status ordering, hidden counts, and terminal summaries. This is the presentation seam for the compact summary.
- `packages/todo/src/format.ts` owns tool/model-context summaries and compaction formatting. Those consumers need complete protocol data and are not the persistent-widget seam.
- `packages/todo/test/widget.test.ts` owns widget layout, width, placement, clear timing, and warning regression coverage.
- `packages/todo/test/index.test.ts` owns extension registration, coordinator behavior, and native tool renderer coverage.

Repository history shows `packages/todo/src/widget-layout.ts` and `packages/todo/test/widget.test.ts` were changed by `6bdb4e0 feat(todo): expand active task groups` and later by `e930778 refactor(todo)!: remove workingOn contract`. The current branch already contains status-derived multi-group widget rendering. This draft supersedes only that persistent projection after acceptance; it does not reopen the protocol or tool-result expansion contracts.

## Historical Host Evidence (before I0 graph installation)

Repository inspection at that pre-I0 checkpoint established that root `package.json` and `packages/todo/package.json` declared exact `0.84.2` for `@earendil-works/pi-ai`, `@earendil-works/pi-coding-agent`, and `@earendil-works/pi-tui`, and that the repository dependency lock is root `bun.lock`. The root exact dev dependencies supply the installed graph for every workspace; `packages/pi-harness` and `packages/pi-herdr-subagents` consume the same packages through `*` peer declarations. Therefore exact `0.85.1` coordination owned both manifests and the lock, affected compilation and runtime resolution outside Todo, and required same-install verification of those affected workspaces.

The supplied source-grounded comparison establishes:

- **Fact, current exact baseline:** the inspected public `0.84.2` package declarations lack public `MouseRegion`, `Component.handleMouse`, and `TuiMouse*` barrel exports.
- **Fact, selected target:** the inspected public `0.85.1` package declarations/barrels expose `Component.handleMouse`, `MouseRegion`, and mouse event/result types. The same baseline exposes custom overlay composition; ScrollView wheel fallback exists for main layout but does not supply scrolling to custom overlays (fresh evidence below).
- **Fact, routing boundary:** Pi routes the public mouse contract only in fullscreen/alternate-screen mode. Regular mode therefore remains keyboard-complete and must not claim or accept Pi-captured mouse input.
- **Conclusion:** all three Pi peers must move together to exact `0.85.1`; mixing `0.84.2` and `0.85.1` would not be the verified package graph.
- **Uncertainty:** the exact first intermediate release containing these APIs was not established. No claim about an earlier introduction version is made or needed.

Public `0.84.2` evidence still supports `ExtensionUIContext.custom()`, focused overlays, `matchesKey`, render requests, and `ScrollView`; it does not support the required public mouse path. No public sidebar/dock or expandable tree/list was found. Internal alternate-screen parsing is explicitly outside the extension contract.

## Presentation And Interaction Decisions

- Persistent summary: at most two nonblank rows. Row one contains counts in the fixed order `in_progress`, `pending`, `completed`, `cancelled`, including zeros. Row two derives a deterministic read-only presentation anchor from existing canonical task and todo order: first `in_progress` todo, otherwise first pending todo; omit it when neither exists. Additional todos with the chosen status appear only as a bounded `+N`. This conditional projection introduces no fallback state. The anchor creates no canonical primary, selected, or unique active todo; does not mutate, serialize, persist, write back, or feed business logic; does not compress or replace active groups; and introduces no priority, timestamp, hidden selection, or fallback state. Every group containing `in_progress` todos remains independently represented, and the prohibition on a canonical or protocol single-active summary remains in force. The existing optional spacer may be the third row. All text uses existing theme roles and width fitting.
- Detail entry is pinned: command name `/todo-details`; shortcut registration `Key.ctrlShift("t")`, displayed as `Ctrl+Shift+T`; description `Open Todo details`. Repository sources, Pi `0.85.1` built-in bindings, and shipped extension examples contain no exact collision for either entry. Pi's own resolver still decides runtime collisions: reserved built-ins skip a conflicting extension shortcut, non-reserved built-ins emit a warning and yield to it, and later extension registration wins an extension/extension collision. The extension registers only the base name and never rebinds it. Pi suffixes every duplicate command registration; `/todo-details` is the fallback only when unique. Native autocomplete exposes actual qualified names with description/source tags. Choose Todo's `Open Todo details` entry and verify resolved name/source via public `pi.getCommands()`; never assume `:1`. Ambiguous attribution visibly fails admission with candidates/source paths and requires duplicate removal. Plan §5 specifies duplicate and reversed-order checks.
- Detail content: task headers remain in canonical order. Expanded groups show every todo's status glyph, name, and description. Color never carries status alone because the glyph and text remain present.
- Initial state: active groups expanded; otherwise only the selected usable group expanded. Cursor and expanded indexes are ephemeral overlay state cloned from the current snapshot. This local keyboard cursor is independent of the summary anchor and creates no canonical primary, selected, or unique active todo.
- Keyboard selection: Up/Down select the previous/next task; Home/End select the first/last task. Each selection command minimally scrolls to reveal the selected header. Left/Right collapse/expand it; Enter/Space toggles it.
- Keyboard viewport: PageUp/PageDown scroll the overlay-owned bounded offset by one viewport minus one row and do not change task selection. They take precedence as scrolling commands even when the selected task is expanded. This free-scroll path may move the selected header off-screen; the next selection or expand/collapse/toggle command minimally reveals that header again. Home/End always mean first/last task selection, never document scrolling.
- Full-detail policy: every nonempty description wraps in full within content width; vertical truncation is forbidden. An expanded task may exceed the viewport, and repeated PageDown must expose its final todo and complete wrapped description entirely by keyboard. Escape remains available from every scroll position, and every visible cursor, expansion, or scroll change requests rendering.
- Mouse: in fullscreen/alternate-screen mode, public `MouseRegion` instances cover task headers and the component's public `handleMouse` contract routes activation. A primary click first selects the clicked task, then invokes the shared toggle exactly once. Expand and collapse minimally scroll to keep the clicked header visible; that task remains the keyboard cursor, so the next keyboard operation applies to it. Non-header/non-primary clicks return unhandled. The outer public Component.handleMouse separately consumes wheel within overlay bounds using signed logical-line wheelDelta, clamps its own offset, preserves selection/expansion, and returns handled even at boundaries. No ScrollView/main-layout fallback is assumed. Render wraps full content, slices a bounded viewport, and maps only visible headers; resize rewraps/clamps. Public read-only tui.terminal.rows supplies height and render(width) supplies width; omit chrome at minimum height to retain one content row. Pair explicit render requests with render: false to avoid Host duplicate requests. Regular mode exposes the same complete keyboard path but accepts no Pi-captured mouse input. No raw terminal subscription, `onTerminalInput`, escape-sequence parser, private import, or non-barrel dispatcher is permitted.
- Responsive behavior: overlay dimensions are terminal-relative with edge margin and no fixed minimum width. Rendering is width-bounded, and long labels/descriptions cannot change the overlay's outer dimensions.
- Focus: `ctx.ui.custom()` owns acquisition and restoration. The component closes through `done()`; no manual global focus stack is introduced.

## Ownership And Non-Overlap

Candidate implementation ownership is limited to:

- `packages/todo/src/tool.ts`
- `packages/todo/src/widget-layout.ts`
- `packages/todo/src/detail-overlay.ts` (new)
- `packages/todo/test/index.test.ts`
- `packages/todo/test/widget.test.ts`
- `packages/todo/test/detail-overlay.test.ts` (new)

Candidate dependency ownership required to establish the verified package graph is limited to:

- Root `package.json` for exact `0.85.1` dev dependencies of `@earendil-works/pi-ai`, `@earendil-works/pi-coding-agent`, and `@earendil-works/pi-tui`; this root owner controls the installed workspace graph.
- `packages/todo/package.json` for matching exact `0.85.1` peer declarations.
- Root `bun.lock` for repository-native lockfile reconciliation against that coordinated exact graph; only closure changes attributable to the three direct version changes are owned.

The root change also affects wildcard peer consumers `packages/pi-harness` and `packages/pi-herdr-subagents`. They are verification subjects, not additional metadata owners: their manifests remain unchanged and their test/typecheck commands must run from the same installed graph.

Candidate lifecycle documentation ownership was limited to this Work directory; the later authorized lifecycle reconciliation owns only `work.md`, `context.md`, `plan.md`, and `tasks.md`.

Explicitly excluded are `widget.ts`, `widget-component.ts`, `glyphs.ts`, `format.ts`, `renderer.ts`, state/schema/types/persistence/reminder/settings files, README, CHANGELOG, all package metadata other than root `package.json` and `packages/todo/package.json`, every dependency other than the three exact Pi packages, every lockfile other than root `bun.lock`, and every other Work's documents. If implementation evidence makes another excluded path necessary, stop for an amendment and renewed review rather than broadening implicitly.

The new detail module may consume existing glyph and type exports without editing their owners. Keeping `widget.ts` and `widget-component.ts` unchanged prevents overlap with the separately owned widget fault-isolation and fallback-glyph work. README wording remains with its current owner.

## Historical Competing Work Evidence And Sequence (before incorporation)

Authoritative evidence was read from `E:/Projects/pi-packages/.worktree/todo-review-fixes`, where Work hash `bf358c28bfbbb0bcdf8035e3d598c22121fc37b32fdd11b7b75677f8323bd49f` and Context hash `ee078a185cec05ce9526a03010cfd61b5d72a23b36d1b1f24d5b2118a25e2853` are the accepted lifecycle tuple supplied for coordination. That directory does not exist in this compact worktree and is not claimed to exist here.

- Slice B owns `packages/todo/src/tool.ts` and `packages/todo/test/index.test.ts` through B2.
- After B2 releases them, Slice A owns `packages/todo/src/widget.ts` and `packages/todo/test/index.test.ts` for A1 through A2; compact never owns `widget.ts`.
- Slice C owns `packages/todo/README.md` through C2; compact excludes README permanently.
- Compact may prepare disjoint `widget-layout.ts`, `widget.test.ts`, and new overlay paths after authorization, but it must not write `tool.ts` or `index.test.ts` until B2 and then A2 have completed and released the overlapping paths. Immediately before those writes, re-read both paths, re-run focused baselines, and amend this draft if the stable opener or test seam changed. Final integration follows all overlapping releases and rechecks changed bytes.

## Historical Implementation Checks (current disposition above)

1. Compile and exercise the public `0.85.1` custom-component/mouse-region composition with overlay-owned offset/clamping/slicing. Focused type/event evidence and real fullscreen interaction must prove signed wheel deltas, boundary handling, coordinate mapping after resize/scroll, one render per change, and complete PageDown description reachability. Direct pinned source evidence establishes the API mechanism, not final interaction acceptance.
2. Inspect the actual loaded extension set and resolved keybindings during same-graph interactive verification. Static evidence pins `Key.ctrlShift("t")`; a shortcut conflict follows Pi's native winner rules and leaves the resolved Todo command as fallback. Deliberately duplicate todo-details, verify base-name absence, discover/invoke Todo's actual qualified name, reverse load order, and fail visibly on ambiguous attribution. No silent alternate shortcut is authorized.
3. Recheck Todo Review Fixes ownership and the exact overlapping bytes before registration work and integration. Missing release evidence blocks those phases, not disjoint planning.

These were implementation checks at the drafting checkpoint. Their automated portions and upstream incorporation now have the bounded evidence recorded above; the live interaction portions remain outstanding. The later instruction to proceed authorized implementation, which is now delivered through I3. No acceptance criteria have been waived.

## Fresh NO-GO Review And Candidate Dispositions

Supplied independent decision: **NO-GO: P0=0/P1=2/P2=0/P3=0**. Reviewed pre-repair SHA-256 identities (all matched before edits):

- Work: `e5ce810cd4cd2362f3fdf80012a69016a2c99be3273483bc93155e1fe0aadafe`
- Context: `1c670baa57bb362baf37868c50b6f0535e7ea387ab5c0aeaa6ca4390b7119a01`
- Plan: `7e6191caf967d099e1da4519bb56608256e19150d0ea5adcf2fa7cdeb014f142`

1. **P1, fact:** custom overlays call render(width) and clip maxHeight externally without ScrollView layout. ScrollView.render returns child lines; updateLayout supplies its scroll bounds. Fullscreen wheel defers to the overlay before routeWheel, which searches main layout. **Candidate conclusion:** own wrapped lines, offset, clamping and slicing; handle public wheel events explicitly and retain PageUp/PageDown full-description reachability (Plan §3–4).
2. **P1, fact:** every duplicate base command is suffixed, leaving no unqualified todo-details. Native autocomplete uses resolved names with source-prefixed descriptions; public pi.getCommands exposes resolved names/source metadata. **Candidate conclusion:** discover the actual qualified Todo entry, never predict suffixes, and require deliberate duplicate automated/interactive checks with visible ambiguous-discovery failure (Plan §5, §7).

No other supported contract was reopened during draft repair. Generation-2 T2 assessed the exact T1 tuple and returned GO with all severity counts zero, clearing the document-level findings; the user separately accepted the design at Gate C. Neither decision supplied runtime correctness evidence. No prototype was run during draft repair: exact pinned renderer, declarations, command mapping, and native autocomplete source established the proposed mechanism. Subsequent I0-I3 delivery and automated I4 checks have the evidence recorded above; real interactive acceptance remains required.

## Provenance And Freshness

### Source objects

| Locator | Title | Claim | Support | Accessed | Scope |
| --- | --- | --- | --- | --- | --- |
| Handoff inline research conclusion | Public Pi mouse API baseline comparison | Exact `0.84.2` lacks the named public mouse exports; exact `0.85.1` exposes `Component.handleMouse`, `MouseRegion`, mouse event/result types, custom overlays, fullscreen-only routing; the earlier ScrollView fallback claim is narrowed by fresh evidence below to main-layout scrolling only. | Supplied source-grounded conclusion from inspected public package artifacts. | Not supplied; freshness limitation retained. | Exact public `0.84.2` and `0.85.1` package baselines only. |
| `E:/Projects/pi-packages/.worktree/todo-compact-rendering/package.json`; `packages/todo/package.json`; root `bun.lock` | Coordinated package graph owners | Both manifests directly pin the three Pi packages to `0.84.2`; root installation owns the workspace graph; Todo owns matching peers; root lock resolves the direct and transitive graph. | Direct file and lock inspection. | 2026-09-19T16:12:05+08:00 | Exact manifest declarations, workspace peer consumers, lock ownership, and package scripts in this worktree. |
| `E:/Projects/pi-packages/.worktree/todo-review-fixes/packages/todo/docs/works/todo-review-fixes/work.md`; `context.md`; Handoff accepted hashes | Todo Review Fixes lifecycle and owners | Accepted tuple supplied as Work `bf358c28bfbbb0bcdf8035e3d598c22121fc37b32fdd11b7b75677f8323bd49f`, Context `ee078a185cec05ce9526a03010cfd61b5d72a23b36d1b1f24d5b2118a25e2853`; Slice B owns `tool.ts`/`index.test.ts` through B2, Slice A subsequently owns `widget.ts`/`index.test.ts` through A2, and Slice C owns README through C2. | Supplied accepted lifecycle hashes plus direct read-only inspection of the authoritative competing worktree. | 2026-09-19T16:12:05+08:00 | Cross-Work sequencing only; the competing worktree is dirty and its current file hashes are not substituted for the supplied accepted tuple. |
| `D:/Applications/Scoop/apps/pi-coding-agent-bun/0.85.1/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts`; `runner.js`; `docs/keybindings.md`; `examples/extensions/preset.ts` | Pi command and shortcut contract | `registerCommand` accepts the command name; `registerShortcut` accepts `KeyId`; examples use `Key.ctrlShift`; built-in/resolved/extension collision behavior is explicit; no exact `Ctrl+Shift+T` built-in/example collision was found. | Direct installed `0.85.1` source/declaration inspection and exact-string search. | 2026-09-19T16:12:05+08:00 | Installed Pi `0.85.1`; runtime user/extension configuration remains environment-dependent. |
| Repository status rooted at `E:/Projects/pi-packages/.worktree/todo-compact-rendering` | Historical draft path containment | At that inspection, these three Work files were the only changed/untracked paths. This is not the later T1 inventory. | `git status --short --untracked-files=all`. | 2026-09-19T16:12:05+08:00 | Historical inspection of this worktree only. |

### Fresh-review source objects

Package locators below are relative to the read-only installed root `D:/Applications/Scoop/apps/pi-coding-agent-bun/0.85.1/node_modules/@earendil-works/`. Inspected pi-tui and pi-coding-agent manifests both report exact `0.85.1`. Accessed **2026-09-19T18:33:32+08:00**. Internal source is evidence only, never an extension import.

| Locator | Title | Claim | Support | Accessed | Scope |
| --- | --- | --- | --- | --- | --- |
| Handoff inline review and hashes | Independent draft review | NO-GO with two P1 findings on the supplied tuple. | Supplied review plus matching SHA-256 preflight. | This repair | Identity/decision only; independent review was not rerun. |
| `pi-tui/dist/tui.js:780–806,915–930`; `pi-tui/dist/components/scroll-view.js` render/updateLayout | Overlay geometry | Custom overlays render then clip; ScrollView.render does not slice and no layout pass supplies its bounds. | Direct source inspection, including percentage floor/margin clamping. | Timestamp above | Installed 0.85.1 custom overlay path. |
| `pi-tui/dist/tui-alt-screen.js:488–503,787–800`; `pi-tui/dist/tui.js:485–513` | Wheel routing | Overlay deferral precedes main-layout fallback; overlay events have local coordinates. | Direct source inspection. | Timestamp above | Fullscreen wheel and overlay bounds. |
| `pi-tui/dist/tui.d.ts:10–45,78` and public terminal declarations; `pi-tui/dist/index.d.ts`; `pi-tui/dist/components/mouse-region.d.ts`; `pi-tui/dist/tui-alt-screen.js` applyMouseDispatchResult | Public input/sizing API | Signed logical wheelDelta, handled/render results, local coordinates, MouseRegion, Component, and row geometry support the proposed mechanism. | Direct declarations, barrels, and render-default inspection. | Timestamp above | Public APIs only; no raw input/private dispatch import. |
| `pi-coding-agent/dist/core/extensions/runner.js:446–488`; `pi-coding-agent/dist/core/extensions/types.d.ts:1001`; `pi-coding-agent/dist/core/slash-commands.d.ts` | Qualified commands | Every duplicate is suffixed; public command inventory includes names/source metadata. | Direct resolver/declaration inspection. | Timestamp above | Loaded order; no stable suffix guarantee. |
| `pi-coding-agent/dist/core/agent-session.js:1988–2000`; `pi-coding-agent/dist/modes/interactive/interactive-mode.js:389–395,464–474` | Native discovery | Inventory/autocomplete use invocationName; description source tags can be non-unique. | Direct mapping/source-tag inspection. | Timestamp above | Mechanism only, not proof of a particular runtime extension set. |

### Negative and uncertain evidence

- Exact public `0.84.2` peers: selection method was the supplied exact-version public declaration/barrel inspection; result `empty` for public `MouseRegion`, `Component.handleMouse`, and `TuiMouse*` barrel exports. This does not prove absence from every historical release.
- Intermediate releases between `0.84.2` and `0.85.1`: not inspected by the supplied research; result `inconclusive`. The draft therefore claims only `0.85.1` as the inspected supported target, not the first introducing release.
- Runtime extension/user shortcut sets: not available in this evidence set; result `inconclusive` for whether another loaded extension claims `Ctrl+Shift+T`. This does not reopen the pinned entry: Pi's inspected shortcut winner rules apply. The resolved Todo command remains the fallback only when discoverably attributed; runtime command duplicates require the Plan §5 verification gate.

Earlier inspection and repair evidence above retains its recorded scope and freshness; T1 did not rerun Host/source inspection or implementation verification. Stage A administrative Tasks acceptance and Stage B Spec acceptance were established separately. T2 GO and Gate C acceptance remain distinct. Subsequent I0-I3 delivery, automated I4 evidence, and independent review are recorded under Current Delivery Evidence. No live interactive acceptance, overall completion, staging, commit, reload, or release is claimed.

# Tasks: Todo Inline Expand/Collapse

- Status: initial T1 and authorized rendering correction implemented with passing headless checks; T2 live observation pending. This derived record is not an approval receipt.
- Work: [work.md](work.md); Context: [context.md](context.md); Plan: [plan.md](plan.md); authority: [Spec section 9](../todo-protocol-redesign/spec.md#9-accepted-above-editor-inline-interaction).

## T1: Implement Inline Entry And Bounded Interaction

**Status:** Implemented; focused and full Todo tests and direct TypeScript typecheck passed. The live behavior in T2 is not verified.

**Depends on:** Explicit disclosure/confirmation of the [Plan's exact implementation scope](plan.md#exact-implementation-scope-for-disclosure). First inspect installed public listener/widget contracts and current dispatch; if public APIs demonstrably cannot support the scope, stop without inventing a Host or overlay alternative.

**Objective:** The existing above-editor widget accepts command/shortcut entry, retains one listener only during active interaction, and renders independently expandable task detail with bounded scrolling. Escape ends selection/listening and resumes editor input but leaves expanded tasks displayed, with expansion retained on reentry in this session. Use the existing Nerd Font/fallback conventions for expand/collapse indicators. Complete set, removal, hide/off/clear, and session restore/switch reset expansion; same-session refresh retains it by task name only. All replacement/hide/restore/terminal-clear/error paths retire the listener. Unavailable modes and placements notify without changing placement/input.

**Expected paths:** `src/tool.ts`, `src/widget.ts`, `src/widget-component.ts`, `src/widget-layout.ts`, `test/index.test.ts`, `test/widget.test.ts` under `packages/todo`. Do not change production code outside these paths without renewed disclosure. Keep the existing four tools/coordinator state, summary counts, baseline row order/width, visibility rules, native command collision behavior, and unrelated documents unchanged. No overlay alternative, raw terminal parser, package/lock change, or global input listener outside interaction.

**Completion evidence:** Focused tests for command/shortcut parity, off/below/absent/non-TUI notices, native collision/qualified discovery, exact-key consumption and passthrough (including bracketed paste), repeated entry, Escape/editor return while expanded content remains visible, reentry retention, refresh by identity and reset boundaries, Nerd Font/fallback arrows, all lifecycle unsubscribe paths, independent expansion, full descriptions, zero/terminal tasks, narrow/short bounds, resize/clamp and keyboard final-description reachability. Run Todo's test and typecheck scripts plus `git diff --check` and scoped status/diff. Do not report live acceptance from mocks or headless tests. Record the unbracketed single-key paste ambiguity.

**Recorded:** Initial T1: `vitest run test/widget.test.ts test/index.test.ts` 32 passed; full package `vitest run` 87 passed (12 files); direct `tsc --noEmit -p packages/todo/tsconfig.json` passed; scoped diff check passed. Correction: focused tests 35 passed, full Todo suite 90 passed (12 files), direct installed `node node_modules/typescript/bin/tsc --noEmit -p packages/todo/tsconfig.json` passed and `git diff --check -- packages/todo/src packages/todo/test packages/todo/docs` passed. The earlier `pnpm --dir packages/todo typecheck` wrapper could not run its script because pnpm attempted an unauthorized install and failed with `ERR_PNPM_IGNORED_BUILDS`; the correction did not repeat it or edit package metadata or lockfiles. Public API inspection found no extension-accessible focused-surface query. No live TUI acceptance is claimed.


## T2: Observe Actual Regular And Fullscreen Behavior

**Status:** Pending. No interactive TUI observation surface was available in this execution.

**Depends on:** T1 automated checks and a usable interactive Pi TUI observation surface on the same installed dependency graph.

**Objective:** Determine whether the approved public-API implementation actually preserves editor/other-surface input and makes the final wrapped description visible in the dock.

**Expected artifacts:** A concise verification record; no production code change unless a correction stays inside the confirmed T1 boundary and focused checks are rerun. Observe entry via command and shortcut (including a collision/qualified Todo command), keys, Escape then ordinary editor input, unrelated shortcut and bracketed paste passthrough, modal/other active-surface behavior, resize/narrow and short terminals, large expanded content to last line, refresh/replacement, hide/off, restore, and five-second terminal clear. Check both regular and fullscreen; do not infer keyboard or viewport behavior from API types alone.

**Completion evidence:** Record environment, observed results and limitations. Failure of input isolation or dock visibility is a stop condition for this approved scope, not an implicit request for Host edits or overlay fallback. If interactive observation is unavailable, leave T2 pending and label overall live acceptance unverified. No separate Tasks approval gate is implied.

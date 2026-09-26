# Plan: Todo Inline Expand/Collapse

- Status: initial T1 and authorized rendering correction implemented with passing headless checks; T2 live observation pending.
- Work and evidence: [work.md](work.md), [context.md](context.md).
- Authority: [Todo protocol Spec section 9](../todo-protocol-redesign/spec.md#9-accepted-above-editor-inline-interaction), with Section 8 governing collapsed presentation.
- Tasks: [tasks.md](tasks.md).

## Exact Implementation Scope For Disclosure

**Outcome:** Both `/todo-details` and the existing Ctrl+Shift+T shortcut enter keyboard interaction on the currently visible above-editor Todo widget. Up/Down selects tasks; Left/Right collapses/expands; Enter/Space toggles. Expanded tasks reveal all todos and complete wrapped descriptions, independently, using Nerd Font expand/collapse glyphs or the existing fallback setting. PageUp/PageDown move a bounded content viewport so the final description is reachable. Escape removes the input listener and selection controls, keeps expanded content visible, and returns ordinary editor input; reentry retains current-session expansion. Complete set, removal, hide/off/clear, and session restore/switch reset it; same-session refresh retains it by task name only. Absent, off, below-editor, non-TUI, or cleared widgets notify and leave placement/input unchanged.

**Exclusions:** No overlay fallback, new command/shortcut, mouse requirement, Host/core or dependency change, settings or protocol change, state mutation, global input subscription outside explicit interaction, staging, or commit. Preserve summary counts, collapsed row count and ordering, optional spacer, visibility/timer rules, qualified-command discovery, and Pi collision rules. Old overlay implementation/tests may remain historical and unused; no deletion is needed for this outcome. The earlier Compact Work's overlay/no-`onTerminalInput` design is superseded only for this interaction.

**Proposed write boundary:**

| Owner | Intended change |
| --- | --- |
| `packages/todo/src/tool.ts` | Reuse one command/shortcut entry point to request interaction on current visible widget; keep coordinator/tools and native collision handling intact. |
| `packages/todo/src/widget.ts` | Track the mounted above-editor component and live interaction; install one public `ctx.ui.onTerminalInput` listener only on entry, unsubscribe on exit/disposal/refresh/hide/off/restore/terminal-clear/error. Decline entry with notice when unavailable. Do not override placement. |
| `packages/todo/src/widget-component.ts` | Own ephemeral selected task, per-task expansion and scroll offset; handle only explicitly routed Todo keys, render bounded viewport, retain expansion after input exit and for matching task names on same-session refresh. |
| `packages/todo/src/widget-layout.ts` | Reuse existing summary/task-row width and glyph helpers for inline headers and wrapped complete todo detail while preserving collapsed projection. Keep layout pure where practical. |
| `packages/todo/test/index.test.ts`, `packages/todo/test/widget.test.ts` | Focused registration/entry/notice and presentation/lifecycle/input regression checks; keep existing protocol tests. |

`packages/todo/src/detail-overlay.ts`, `packages/todo/test/detail-overlay.test.ts`, settings, package metadata, root lockfile, and unrelated Work files are not in the intended write boundary. If a necessary change falls outside it, stop for scope disclosure.

## Execution And Verification

1. **Feasibility gate before implementation claims:** Recheck the installed `0.85.1` public listener/widget contracts and inspect actual dispatch/order; design a short, reproducible live TUI observation for regular/fullscreen editor passthrough, other active Host surfaces, mounted widget visibility, narrow/short terminal geometry and last-description reachability. Public signatures and headless stubs alone cannot pass this gate. If no live interactive surface is available, implementation may proceed only as unverified, never as accepted; if the Host cannot isolate input or expose content within the approved scope, stop instead of adding another interaction path.
2. Route command/shortcut to an existing mounted above-editor component and a single active public listener. Keep editor focus untouched; consume only exact navigation, toggle, scroll and Escape keys while active. Treat bracketed paste frames/payloads, unrecognized keys and unrelated shortcuts as passthrough, even when their content resembles keys. An unbracketed single key-equivalent paste cannot be distinguished at this public boundary; record that limitation in live verification. Repeated entry must not register a second listener; Escape and all lifecycle replacements unsubscribe. Use the existing notice surface for unavailable modes/placements.
3. Adapt existing status glyph, width-fit and wrapped detail logic to the widget. Retain Section 8 projection when nothing is expanded; during interaction and after Escape show expanded task bodies with bounded width/height, using the existing Nerd Font/fallback conventions for headers. Clamp viewport and offset after resize, refresh and toggles. Keep all todo names/descriptions available, not just the first representative, and provide keyboard access to the final wrapped line even when expanded output exceeds the dock. Do not rely solely on Host clipping.
4. Extend focused tests for parity of command/shortcut and native collision/qualified command behavior; listener consumption vs passthrough including bracketed paste and other shortcuts; repeated entry; Escape/editor return; refresh/replacement/hide/restore/terminal timeout/error cleanup; empty and terminal states; per-task expansion, narrow width/one-row height, scroll clamping and final-description reachability. Run `pnpm --dir packages/todo test` and `pnpm --dir packages/todo typecheck`, then live regular/fullscreen checks for real editor input, other surfaces, visible viewport and final description. Record environment and any unmet observations; `git diff --check` and scoped diff/status guard the approved paths.

**Dependencies:** Input/lifecycle ownership and presentation state share the mounted component; implement and test them as one serial task. Live acceptance follows automated checks. No independent parallel implementation unit is required.

**Material risks:** Listener is upstream of focused-component routing and offers no verified public focus query; another active surface may lose keys. Host may clip above-editor rows beyond the component's controlled viewport. Factory refresh, timer and restore may invalidate mounted targets; shortcut collisions vary with loaded extensions. These are verification gates, not presumed solved by `setWidget`, a retained component reference, or overlay `done()` focus behavior. If either input isolation or last-line visibility cannot be proven with public APIs and no Host change, report infeasibility and do not silently alter the accepted scope.

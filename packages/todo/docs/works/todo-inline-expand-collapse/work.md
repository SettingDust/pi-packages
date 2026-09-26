# Work: Todo Inline Expand/Collapse

- Status: T1 rendering correction and selection-background update implemented; latest full Todo suite 94 tests passed with direct installed TypeScript and scoped diff checks; live TUI acceptance remains unverified (T2 pending).
- Owner: `packages/todo`.
- Governing authority: [Todo protocol Spec, section 9](../todo-protocol-redesign/spec.md#9-accepted-above-editor-inline-interaction).
- Processed evidence: [Context](context.md). Executable proposal: [Plan](plan.md) and [Tasks](tasks.md). These Work files are derived, not authority or an approval receipt.

## Outcome

The existing visible above-editor Todo widget becomes a keyboard-accessible inline detail surface via `/todo-details` and its existing Ctrl+Shift+T shortcut. Each task expands independently to expose all todos and full descriptions within a bounded, scrollable viewport. Escape returns to normal editor input while expanded entries remain rendered; reentry retains expansion in the current session. Expanded headers use Nerd Font arrows or the existing fallback setting.

## Delivery Boundary

Only Todo's presentation and command/shortcut routing change. Preserve the four tools, coordinator snapshot, state, restore classification, settings, visibility, summary counts, task order, unrelated consumers, and existing collision/qualified-command behavior. No overlay alternative, new command, Host change, dependency upgrade, or global input activation. The previous Compact Work's overlay/no-terminal-listener requirements are superseded only by Spec section 9; its incomplete live TUI evidence stays incomplete. Its historical implementation records are not rewritten.

## Implementation Evidence

- `/todo-details` and Ctrl+Shift+T enter the mounted above-editor widget. The listener is installed only during interaction and removed on Escape, disposal, refresh/replacement, hide/off, restore, terminal clear, failure and session shutdown. Escape preserves the bounded expanded view without selection controls; reentry retains expansion. Same-session refresh keeps expansion by task name only, while complete set, removal, and session reset discard it. Collapsed rows retain status/count colors and show `󰄾` (U+F013E) between task and todo, or `›` with fallback glyphs; active selection uses theme `selectedBg` on the selected task header with no marker or reserved column. Expanded headers show only the task name after the expand indicator, and child status/name and wrapped description are indented four/six columns respectively. User-authored slashes remain unchanged.
- Correction verification: `vitest run test/widget.test.ts test/index.test.ts` 35 passed; full Todo suite 90 passed (12 files). The subsequent selection-background update passed the full Todo suite with 94 tests (12 files), direct installed `node node_modules/typescript/bin/tsc --noEmit -p packages/todo/tsconfig.json`, and `git diff --check -- packages/todo`. Focused regressions cover glyph modes, Escape/render/reentry, full-description scrolling, refresh identity, complete set reset, session teardown, and selection background with status foregrounds. Original T1 counts in [Tasks](tasks.md) are historical evidence for the initial implementation.
- Installed public `onTerminalInput` invokes listeners before focused-component dispatch. The extension UI contract exposes no focused-surface query; input isolation from a modal/other Host surface cannot be established from headless tests. Bracketed paste passes through; unbracketed single-key-equivalent paste is indistinguishable from a key. Viewport sizing is bounded using terminal rows, but actual dock clipping is not established without rendering in regular/fullscreen Pi.
- No interactive Pi TUI observation surface with input, resize and framebuffer capture was available in this execution. Command/shortcut, editor passthrough, other active surfaces, narrow/short geometry and final-line visibility remain live T2 checks; do not call this live-accepted.

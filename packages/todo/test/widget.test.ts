import assert from "node:assert/strict";
import { visibleWidth } from "@earendil-works/pi-tui";
import { afterEach, test, vi } from "vitest";

import type { TodoState } from "../src/types.js";
import { TodoWidgetComponent } from "../src/widget-component.js";
import { createTodoWidgetLifecycle, enterTodoWidget, resetTodoWidgetLifecycle, updateTodoWidget } from "../src/widget.js";
import { renderTodoWidgetDetailLines, renderTodoWidgetLines } from "../src/widget-layout.js";
import { todo } from "./helpers.js";

afterEach(() => vi.useRealTimers());

const state: TodoState = {
  tasks: [
    { name: "Plan", todos: [
      todo("Active todo", "in_progress", "Updating the todo widget"),
      todo("First pending todo"),
      todo("Finished todo", "completed"),
      todo("Cancelled todo", "cancelled"),
    ] },
    { name: "Build", todos: [todo("Second pending todo")] },
  ],
};

test("todo widget counts complete snapshot and shows one representative per task", () => {
  const before = structuredClone(state);
  const lines = renderTodoWidgetLines(state, undefined, 80, { maxVisible: 1, fallbackGlyphs: true });
  assert.deepEqual(lines, [
    " Todos  2 tasks · ◔ 1 · ○ 2 · ✓ 1 · × 1",
    "  ◔ Plan › Active todo",
    "  ○ Build › Second pending todo",
  ]);
  assert.equal(renderTodoWidgetLines(state, undefined, 80)[0], " Todos  2 tasks · 󰦖 1 · 󰄰 2 · 󰄴 1 · 󰍷 1");
  assert.deepEqual(renderTodoWidgetLines(state, undefined, 80).slice(1), [
    "  󰦖 Plan 󰄾 Active todo", "  󰄰 Build 󰄾 Second pending todo",
  ]);
  assert.doesNotMatch(lines.join("\n"), /Detailed description|First pending todo|Finished todo|Cancelled todo/);
  assert.deepEqual(state, before);
});

test("todo widget uses semantic colors for title, counts and task rows", () => {
  const calls: { color: string; text: string }[] = [];
  renderTodoWidgetLines(state, {
    bold: (text: string) => text,
    fg: (color: string, text: string) => {
      calls.push({ color, text });
      return text;
    },
  } as never, 80, { fallbackGlyphs: true });

  assert.equal(calls.find(({ text }) => text === "Todos")?.color, "toolTitle");
  assert.equal(calls.find(({ text }) => text.includes("◔ 1 · ○ 2"))?.color, "muted");
  assert.equal(calls.find(({ text }) => text === "Plan")?.color, "accent");
  assert.equal(calls.find(({ text }) => text === "Active todo")?.color, "accent");
  assert.equal(calls.find(({ text }) => text === "Build")?.color, "text");
  assert.equal(calls.find(({ text }) => text === "Second pending todo")?.color, "text");
  assert.ok(calls.every(({ color }) => color !== "dim"));
});

test("task and child status colors survive selection, expansion and Escape", () => {
  const snapshot: TodoState = { tasks: [
    { name: "Mixed", todos: [todo("Finished first", "completed"), todo("Still pending")] },
    { name: "Done", todos: [todo("Shipped", "completed")] },
    { name: "Cancelled", todos: [todo("Stopped", "cancelled")] },
    { name: "Empty", todos: [] },
    state.tasks[0]!,
  ] };
  const calls: { color: string; text: string }[] = [];
  const theme = { fg: (color: string, text: string) => {
    calls.push({ color, text });
    return `\x1b[32m${text}\x1b[0m`;
  } } as never;
  const widget = new TodoWidgetComponent(snapshot, theme, { fallbackGlyphs: true }, { terminal: { rows: 40 }, requestRender: vi.fn() } as never);
  widget.render(80);
  for (const [text, color] of [["Mixed", "text"], ["Finished first", "success"], ["Done", "success"], ["Cancelled", "error"], ["Empty", "muted"], ["Plan", "accent"]]) {
    assert.ok(calls.some((call) => call.text === text && call.color === color), `${text}: ${color}`);
  }
  calls.length = 0;
  assert.equal(widget.start(), true);
  widget.handleKey("\x1b[C");
  widget.render(80);
  widget.end();
  widget.render(80);
  for (const [text, color] of [["Active todo", "accent"], ["First pending todo", "text"], ["Finished todo", "success"], ["Cancelled todo", "error"], ["Plan", "accent"]]) {
    assert.ok(calls.some((call) => call.text === text && call.color === color), `${text}: ${color}`);
  }
  assert.ok(widget.render(12).every((line) => visibleWidth(line) <= 12));
});

test("selected header uses theme background without replacing status foreground", () => {
  const backgrounds: { token: string; text: string }[] = [];
  const foregrounds: { token: string; text: string }[] = [];
  const theme = {
    fg: (token: string, text: string) => {
      foregrounds.push({ token, text });
      return `\x1b[32m${text}\x1b[39m`;
    },
    bg: (token: string, text: string) => {
      backgrounds.push({ token, text });
      return `\x1b[42m${text}\x1b[49m`;
    },
  } as never;
  const widget = new TodoWidgetComponent(state, theme, { fallbackGlyphs: true }, { terminal: { rows: 40 }, requestRender: vi.fn() } as never);
  const check = (width: number, selected: string | undefined) => {
    backgrounds.length = 0;
    foregrounds.length = 0;
    const rows = widget.render(width);
    assert.ok(rows.every((row) => visibleWidth(row) <= width));
    assert.equal(backgrounds.length, selected ? 1 : 0);
    if (selected) {
      assert.equal(backgrounds[0]!.token, "selectedBg");
      assert.ok(backgrounds[0]!.text.includes(selected));
      assert.equal(visibleWidth(backgrounds[0]!.text), width);
      assert.ok(rows.some((row) => row.startsWith("\x1b[42m") && row.includes(selected)));
    } else assert.ok(rows.every((row) => !row.startsWith("\x1b[42m")));
    assert.ok(foregrounds.some(({ token, text }) => token === "accent" && text === "Plan"));
    assert.ok(foregrounds.some(({ token, text }) => token === "text" && text === "Build"));
  };
  check(80, undefined);
  assert.equal(widget.start(), true);
  check(80, "Plan");
  widget.handleKey("\x1b[B");
  check(80, "Build");
  widget.handleKey("\x1b[C");
  check(80, "Build");
  widget.end();
  check(80, undefined);
  assert.ok(widget.render(80).some((row) => row.startsWith(" ▾ ") && row.includes("Build")));
  assert.equal(widget.start(), true);
  check(80, "Plan");
  for (const width of [1, 2, 3, 4, 8, 12]) {
    backgrounds.length = 0;
    assert.ok(widget.render(width).every((row) => visibleWidth(row) <= width));
    assert.equal(backgrounds.length, 1);
    assert.equal(visibleWidth(backgrounds[0]!.text), width);
  }
});

test("todo widget selects first active independently for each task", () => {
  const multiState: TodoState = {
    tasks: [
      { name: "Pending first", todos: [todo("first pending")] },
      { name: "First", todos: [todo("earlier pending"), todo("first active", "in_progress"), todo("another active", "in_progress")] },
      { name: "Second", todos: [todo("old", "completed"), todo("second active", "in_progress"), todo("last pending")] },
    ],
  };
  const lines = renderTodoWidgetLines(multiState, undefined, 80, { maxVisible: 1, fallbackGlyphs: true });
  assert.deepEqual(lines, [
    " Todos  3 tasks · ◔ 3 · ○ 3 · ✓ 1 · × 0",
    "  ○ Pending first › first pending",
    "  ◔ First › first active",
    "  ◔ Second › second active",
  ]);
  assert.doesNotMatch(lines.join("\n"), /earlier pending|another active|last pending|\+2/);
});

test("todo widget falls back to the first todo, even terminal, and keeps empty tasks", () => {
  const snapshot: TodoState = {
    tasks: [
      { name: "Done", todos: [todo("old", "completed"), todo("ready")] },
      { name: "Cancelled", todos: [todo("stopped", "cancelled"), todo("later")] },
      { name: "Empty", todos: [] },
    ],
  };
  assert.deepEqual(renderTodoWidgetLines(snapshot, undefined, 80, { fallbackGlyphs: true }), [
    " Todos  3 tasks · ◔ 0 · ○ 2 · ✓ 1 · × 1",
    "  ✓ Done › old",
    "  × Cancelled › stopped",
    "  Empty",
  ]);
  assert.deepEqual(renderTodoWidgetLines({ tasks: [{ name: "Done", todos: [todo("finished", "completed")] }] }, undefined, 80, { fallbackGlyphs: true }), [
    " Todos  1 task · ◔ 0 · ○ 0 · ✓ 1 · × 0",
    "  ✓ Done › finished",
  ]);
  assert.deepEqual(renderTodoWidgetLines(undefined, undefined, 80), [
    " Todos  0 tasks · 󰦖 0 · 󰄰 0 · 󰄴 0 · 󰍷 0",
  ]);
});

test("todo widget emits every task and fits narrow widths", () => {
  const large: TodoState = { tasks: Array.from({ length: 100 }, (_, index) => ({
    name: `Task ${index} ${"Long".repeat(30)}`,
    todos: Array.from({ length: 10 }, (_, item) => todo(`Todo ${item} ${"界".repeat(30)}`, item ? "pending" : "in_progress")),
  })) };
  for (const snapshot of [undefined, { tasks: [] }, state, large]) {
    for (const width of [1, 4, 20, 80]) {
      for (const fallbackGlyphs of [false, true]) {
        const lines = renderTodoWidgetLines(snapshot, undefined, width, { maxVisible: 1, fallbackGlyphs });
        assert.equal(lines.length, 1 + (snapshot?.tasks.length ?? 0));
        assert.ok(lines.every((line) => visibleWidth(line) <= width));
      }
    }
  }
  assert.match(renderTodoWidgetLines(large, undefined, 80, { fallbackGlyphs: true })[0]!, /100 tasks · ◔ 100 · ○ 900 · ✓ 0 · × 0/);
  assert.match(renderTodoWidgetLines(large, undefined, 80, { fallbackGlyphs: true }).at(-1)!, /Task 99/);
  const component = new TodoWidgetComponent(large, undefined, { blankLineBelow: true });
  assert.equal(component.render(20).length, 102);
  assert.equal(component.render(1).length, 102);
});


test("detail lines wrap complete names and descriptions for terminal todos", () => {
  const item = todo("A complete multi word task name", "completed", "The final description continues beyond the viewport");
  const lines = renderTodoWidgetDetailLines(item, undefined, 12, true);
  assert.deepEqual(lines.slice(0, 3), ["    ✓ A", "      comple", "      te"]);
  assert.ok(lines.slice(1).every((line) => line.startsWith("      ")));
  assert.ok(lines.every((line) => visibleWidth(line) <= 12));
  assert.equal(lines.join("").replace(/\s/g, "").includes(item.name.replace(/\s/g, "")), true);
  assert.equal(lines.join("").replace(/\s/g, "").includes(item.description.replace(/\s/g, "")), true);
  for (const width of [1, 2, 3, 7, 12]) {
    const narrow = renderTodoWidgetDetailLines(item, undefined, width, true);
    assert.ok(narrow.every((line) => visibleWidth(line) <= width));
    assert.equal(narrow.join("").replace(/\s/g, "").includes(item.name.replace(/\s/g, "")), true);
    assert.equal(narrow.join("").replace(/\s/g, "").includes(item.description.replace(/\s/g, "")), true);
    assert.ok(narrow.some((line) => line.includes("✓")));
  }
});

 test("inline detail selection, independent expansion and final wrapped description remain reachable", () => {
  const description = `${Array.from({ length: 60 }, (_, index) => `part${index}`).join(" ")} FINAL-DESCRIPTION-LINE`;
  const snapshot: TodoState = { tasks: [
    { name: "Empty", todos: [] },
    { name: "Work", todos: [todo("First item", "in_progress", description), todo("Second item", "completed", "second full description")] },
    { name: "Other", todos: [todo("Third item", "pending", "third full description")] },
  ] };
  const terminal = { rows: 20 };
  const render = vi.fn();
  const widget = new TodoWidgetComponent(snapshot, undefined, { fallbackGlyphs: true }, { terminal, requestRender: render } as never);
  assert.equal(widget.start(), true);
  assert.match(widget.render(20).join("\n"), /Work/);
  assert.equal(widget.handleKey("\r"), true);
  assert.match(widget.render(20).join("\n"), /First item/);
  assert.doesNotMatch(widget.render(20).join("\n"), /third full description/);
  for (let i = 0; i < 100; i++) widget.handleKey("\x1b[6~");
  assert.match(widget.render(20).join("\n"), /N-LINE/);
  assert.equal(widget.render(20).length <= 8, true);
  widget.handleKey("\x1b[B");
  widget.handleKey("\x1b[C");
  for (let i = 0; i < 100; i++) widget.handleKey("\x1b[6~");
  assert.match(widget.render(20).join("\n"), /third full/);
  widget.handleKey("\x1b[5~");
  assert.match(widget.render(80).join("\n"), /Third item/);
  widget.handleKey("\x1b[D");
  assert.doesNotMatch(widget.render(80).join("\n"), /third full description/);
  terminal.rows = 8;
  assert.ok(widget.render(1).every((line) => visibleWidth(line) <= 1));
  assert.ok(widget.render(1).length <= 2);
  terminal.rows = 7;
  assert.equal(widget.handleKey("\x1b[B"), false);
  terminal.rows = 20;
  widget.end();
  assert.match(widget.render(20).join("\n"), /part6/);
  assert.equal(widget.render(20).length <= 8, true);
  assert.equal(widget.handleKey("\x1b[B"), false);
  assert.equal(widget.start(), true);
  widget.handleKey("\x1b[5~");
  assert.match(widget.render(20).join("\n"), /First item/);
  widget.dispose();
  assert.equal(widget.start(), false);
});

test("collapsed separator keeps slashes in user text; expanded header and indented children omit layout separators", () => {
  const snapshot: TodoState = { tasks: [{ name: "Plan / draft", todos: [todo("first / second", "in_progress", "description / text")] }] };
  const tui = { terminal: { rows: 40 }, requestRender: vi.fn() };
  for (const [fallbackGlyphs, separator] of [[false, "󰄾"], [true, "›"]] as const) {
    const widget = new TodoWidgetComponent(snapshot, undefined, { fallbackGlyphs }, tui as never);
    assert.equal(widget.render(80)[1], `  ${fallbackGlyphs ? "◔" : "󰦖"} Plan / draft ${separator} first / second`);
    widget.start();
    widget.handleKey("\x1b[C");
    const rows = widget.render(80);
    assert.equal(rows[1], ` ${fallbackGlyphs ? "▾" : "󰅀"} Plan / draft`);
    assert.equal(rows[2], `    ${fallbackGlyphs ? "◔" : "󰦖"} first / second`);
    assert.equal(rows[3], "      description / text");
    widget.end();
    assert.equal(widget.render(80)[1], ` ${fallbackGlyphs ? "▾" : "󰅀"} Plan / draft`);
  }
});

test("inline listener consumes only exact keys, passes paste and retires on every replacement path", () => {
  const lifecycle = createTodoWidgetLifecycle();
  const listeners = new Set<(data: string) => unknown>();
  const unsubscribe = vi.fn();
  const notices: string[] = [];
  let mounted: TodoWidgetComponent | undefined;
  const tui = { terminal: { rows: 20 }, requestRender: vi.fn() };
  const ui = {
    notify: (message: string) => notices.push(message),
    onTerminalInput: (handler: (data: string) => unknown) => {
      listeners.add(handler);
      return () => { listeners.delete(handler); unsubscribe(); };
    },
    setWidget: (_id: string, factory: ((tui: never, theme: never) => TodoWidgetComponent) | undefined) => {
      mounted?.dispose();
      mounted = factory?.(tui as never, undefined as never);
    },
  };
  const ctx = { mode: "tui", hasUI: true, ui } as never;
  const input = (data: string) => [...listeners][0]?.(data) as { consume?: boolean } | undefined;
  const navigable: TodoState = { tasks: [...state.tasks, { name: "Verify", todos: [todo("Final")] }] };
  enterTodoWidget(ctx, {}, lifecycle);
  assert.match(notices.at(-1)!, /visible above-editor/);
  updateTodoWidget(ctx, navigable, {}, lifecycle);
  enterTodoWidget(ctx, { widgetPlacement: "belowEditor" }, lifecycle);
  enterTodoWidget(ctx, { widgetPlacement: "off" }, lifecycle);
  assert.equal(listeners.size, 0);
  enterTodoWidget(ctx, {}, lifecycle);
  enterTodoWidget(ctx, {}, lifecycle);
  assert.equal(listeners.size, 1);
  assert.deepEqual(input("\x1b[1;1:1B"), { consume: true });
  assert.match(mounted!.render(80)[2]!, /^ 󰅂/);
  assert.equal(input("\x1b[1;1:3B"), undefined);
  assert.match(mounted!.render(80)[2]!, /^ 󰅂/);
  assert.deepEqual(input("\x1b[1;1:2B"), { consume: true });
  assert.match(mounted!.render(80)[3]!, /^ 󰅂/);
  assert.equal(input("\x1b[1;1:3B"), undefined);
  assert.match(mounted!.render(80)[3]!, /^ 󰅂/);
  assert.deepEqual(input("\x1b[1;1:1A"), { consume: true });
  assert.equal(input("\x1b[1;1:3A"), undefined);
  assert.match(mounted!.render(80)[2]!, /^ 󰅂/);
  assert.deepEqual(input("\x1b[13;1:1u"), { consume: true });
  assert.equal(input("\x1b[13;1:3u"), undefined);
  assert.match(mounted!.render(80)[2]!, /^ 󰅀/);
  for (const key of ["x", "\x1b[1;5C", "\x1b[200~ \x1b[201~", "\x1b[200~", " ", "\x1b[201~"]) assert.equal(input(key), undefined);
  assert.equal(input(" ")?.consume, true);
  assert.match(mounted!.render(80)[2]!, /^ 󰅂/);
  assert.equal(input(" ")?.consume, true);
  assert.match(mounted!.render(80)[2]!, /^ 󰅀/);
  assert.equal(input("\x1b[84;6u"), undefined);
  assert.equal(input("\x1b[27;1:3u"), undefined);
  assert.equal(listeners.size, 1);
  assert.deepEqual(input("\x1b"), { consume: true });
  assert.equal(listeners.size, 0);
  assert.equal(unsubscribe.mock.calls.length, 1);
  assert.match(mounted!.render(80).join("\n"), /󰅀 Build.*\n    󰄰 Second pending todo/);
  assert.doesNotMatch(mounted!.render(80).join("\n"), /> 󰅀/);
  enterTodoWidget(ctx, {}, lifecycle);
  assert.equal(listeners.size, 1);
  assert.match(mounted!.render(80).join("\n"), /󰅀 Build.*\n    󰄰 Second pending todo/);
  assert.deepEqual(input("\x1b"), { consume: true });
  assert.equal(listeners.size, 0);
  assert.equal(unsubscribe.mock.calls.length, 2);
  enterTodoWidget(ctx, {}, lifecycle);
  updateTodoWidget(ctx, state, {}, lifecycle);
  assert.equal(listeners.size, 0);
  enterTodoWidget(ctx, {}, lifecycle);
  updateTodoWidget(ctx, state, { widgetPlacement: "belowEditor" }, lifecycle);
  assert.equal(listeners.size, 0);
  enterTodoWidget(ctx, {}, lifecycle);
  assert.match(notices.at(-1)!, /visible above-editor/);
  updateTodoWidget(ctx, state, {}, lifecycle);
  enterTodoWidget(ctx, {}, lifecycle);
  updateTodoWidget(ctx, state, { widgetPlacement: "off" }, lifecycle);
  assert.equal(listeners.size, 0);
  updateTodoWidget(ctx, state, {}, lifecycle);
  enterTodoWidget(ctx, {}, lifecycle);
  updateTodoWidget(ctx, undefined, {}, lifecycle);
  assert.equal(listeners.size, 0);
  updateTodoWidget(ctx, state, {}, lifecycle);
  enterTodoWidget(ctx, {}, lifecycle);
  resetTodoWidgetLifecycle(ctx, lifecycle);
  assert.equal(listeners.size, 0);
  assert.equal(unsubscribe.mock.calls.length, 7);
});

test("collapsed chevrons have exactly one space before status or task name at both glyph widths", () => {
  const snapshot: TodoState = { tasks: [...state.tasks, { name: "Empty", todos: [] }] };
  const tui = { terminal: { rows: 40 }, requestRender: vi.fn() };
  for (const [fallbackGlyphs, chevron, active, pending] of [
    [false, "󰅂", "󰦖", "󰄰"], [true, "▸", "◔", "○"],
  ] as const) {
    const widget = new TodoWidgetComponent(snapshot, undefined, { fallbackGlyphs }, tui as never);
    assert.equal(widget.start(), true);
    const rows = widget.render(80);
    assert.equal(rows[1], ` ${chevron} ${active} Plan ${fallbackGlyphs ? "›" : "󰄾"} Active todo`);
    assert.equal(rows[2], ` ${chevron} ${pending} Build ${fallbackGlyphs ? "›" : "󰄾"} Second pending todo`);
    assert.equal(rows[3], ` ${chevron} Empty`);
    for (const width of [1, 2, 3, 4, 5, 8, 12]) {
      const narrow = widget.render(width);
      assert.ok(narrow.every((row) => visibleWidth(row) <= width));
      if (width >= 8) assert.equal(narrow[1]?.startsWith(` ${chevron} ${active}`), true);
    }
    widget.end();
    assert.equal(widget.render(80)[1], `  ${active} Plan ${fallbackGlyphs ? "›" : "󰄾"} Active todo`);
  }
});

test("expanded glyphs honor Nerd Font and fallback settings without changing compact rows", () => {
  const tui = { terminal: { rows: 20 }, requestRender: vi.fn() };
  for (const [fallbackGlyphs, closed, open] of [[false, "󰅂", "󰅀"], [true, "▸", "▾"]] as const) {
    const widget = new TodoWidgetComponent(state, undefined, { fallbackGlyphs }, tui as never);
    assert.equal(widget.start(), true);
    assert.match(widget.render(80)[1]!, new RegExp(`^ ${closed} .* Plan`));
    widget.handleKey("\x1b[C");
    assert.match(widget.render(80)[1]!, new RegExp(`^ ${open} Plan$`));
    widget.end();
    assert.match(widget.render(80)[1]!, new RegExp(`^ ${open} Plan$`));
    widget.handleKey("\x1b[D");
    assert.match(widget.render(80)[1]!, new RegExp(`^ ${open} Plan$`));
    widget.dispose();
  }
  assert.deepEqual(new TodoWidgetComponent(state, undefined, { fallbackGlyphs: true }).render(80), renderTodoWidgetLines(state, undefined, 80, { fallbackGlyphs: true }));
});

test("refresh retains expansion by task name, prunes removed tasks and resets on session", () => {
  const lifecycle = createTodoWidgetLifecycle();
  const listeners = new Set<(data: string) => unknown>();
  let mounted: TodoWidgetComponent | undefined;
  const ui = {
    onTerminalInput: (listener: (data: string) => unknown) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setWidget: (_id: string, factory: ((tui: never, theme: never) => TodoWidgetComponent) | undefined) => {
      mounted?.dispose();
      mounted = factory?.({ terminal: { rows: 20 }, requestRender: vi.fn() } as never, undefined as never);
    },
  };
  const ctx = { mode: "tui", hasUI: true, ui } as never;
  const input = (key: string) => [...listeners][0]?.(key) as { consume?: boolean } | undefined;
  updateTodoWidget(ctx, state, { fallbackGlyphs: true }, lifecycle);
  enterTodoWidget(ctx, {}, lifecycle);
  assert.equal(input("\x1b[C")?.consume, true);
  assert.equal(input("\x1b")?.consume, true);
  assert.match(mounted!.render(80).join("\n"), /▾ Plan.*\n    ◔ Active todo/);
  const reordered: TodoState = { tasks: [state.tasks[1]!, state.tasks[0]!] };
  updateTodoWidget(ctx, reordered, { fallbackGlyphs: true }, lifecycle);
  assert.equal(listeners.size, 0);
  assert.match(mounted!.render(80)[1]!, /▸ ○ Build › Second pending todo/);
  assert.match(mounted!.render(80)[2]!, /▾ Plan/);
  updateTodoWidget(ctx, { tasks: [state.tasks[1]!] }, { fallbackGlyphs: true }, lifecycle);
  assert.deepEqual(mounted!.render(80), [...renderTodoWidgetLines({ tasks: [state.tasks[1]!] }, undefined, 80, { fallbackGlyphs: true }), ""]);
  updateTodoWidget(ctx, state, { fallbackGlyphs: true }, lifecycle);
  assert.deepEqual(mounted!.render(80), [...renderTodoWidgetLines(state, undefined, 80, { fallbackGlyphs: true }), ""]);
  enterTodoWidget(ctx, {}, lifecycle);
  input("\x1b[C");
  resetTodoWidgetLifecycle(ctx, lifecycle);
  updateTodoWidget(ctx, state, { fallbackGlyphs: true }, lifecycle);
  assert.deepEqual(mounted!.render(80), [...renderTodoWidgetLines(state, undefined, 80, { fallbackGlyphs: true }), ""]);
  assert.equal(listeners.size, 0);
});

test("terminal grace period, hide, disposal, short terminal and failures leave no listener", () => {
  vi.useFakeTimers();
  const lifecycle = createTodoWidgetLifecycle();
  let listener: ((data: string) => unknown) | undefined;
  const unsubscribe = vi.fn(() => { listener = undefined; });
  let mounted: TodoWidgetComponent | undefined;
  const notices: string[] = [];
  const tui = { terminal: { rows: 7 }, requestRender: vi.fn() };
  const ui = {
    notify: (message: string) => notices.push(message),
    onTerminalInput: vi.fn((handler: (data: string) => unknown) => { listener = handler; return unsubscribe; }),
    setWidget: (_id: string, factory: ((tui: never, theme: never) => TodoWidgetComponent) | undefined) => {
      mounted?.dispose(); mounted = factory?.(tui as never, undefined as never);
    },
  };
  const ctx = { mode: "tui", hasUI: true, ui } as never;
  updateTodoWidget(ctx, state, {}, lifecycle);
  enterTodoWidget(ctx, {}, lifecycle);
  assert.match(notices.at(-1)!, /more terminal space/);
  assert.equal(ui.onTerminalInput.mock.calls.length, 0);
  tui.terminal.rows = 20;
  enterTodoWidget(ctx, {}, lifecycle);
  assert.ok(listener);
  tui.terminal.rows = 7;
  mounted?.render(80);
  assert.equal(listener, undefined);
  tui.terminal.rows = 20;
  enterTodoWidget(ctx, {}, lifecycle);
  assert.ok(listener);
  mounted?.dispose();
  assert.equal(listener, undefined);
  updateTodoWidget(ctx, state, {}, lifecycle);
  enterTodoWidget(ctx, {}, lifecycle);
  const terminal: TodoState = { tasks: [{ name: "Done", todos: [todo("Finished", "completed")] }] };
  updateTodoWidget(ctx, terminal, {}, lifecycle);
  assert.equal(listener, undefined);
  enterTodoWidget(ctx, {}, lifecycle);
  assert.ok(listener);
  vi.advanceTimersByTime(5_000);
  assert.equal(listener, undefined);
  enterTodoWidget(ctx, {}, lifecycle);
  assert.match(notices.at(-1)!, /visible above-editor/);
  updateTodoWidget(ctx, state, {}, lifecycle);
  ui.onTerminalInput.mockImplementationOnce(() => { throw new Error("subscriber failed"); });
  enterTodoWidget(ctx, {}, lifecycle);
  assert.match(notices.at(-1)!, /subscriber failed/);
  assert.equal(listener, undefined);
  enterTodoWidget(ctx, {}, lifecycle);
  assert.ok(listener);
  ui.setWidget = (() => { throw new Error("render failed"); }) as typeof ui.setWidget;
  updateTodoWidget(ctx, state, {}, lifecycle);
  assert.equal(listener, undefined);
  assert.match(notices.at(-1)!, /render failed/);
});

test("updateTodoWidget shows terminal state for five seconds before clearing", () => {
  vi.useFakeTimers();
  const calls: unknown[][] = [];
  const context = { hasUI: true, ui: { setWidget: (...args: unknown[]) => calls.push(args) } };
  updateTodoWidget(context, state, {
    widgetPlacement: "aboveEditor",
    maxVisibleTasks: 1,
  });
  assert.equal(calls[0][0], "todo");
  assert.equal(typeof calls[0][1], "function");
  assert.deepEqual(calls[0][2], { placement: "aboveEditor" });
  const component = (calls[0][1] as (tui: never, theme: never) => TodoWidgetComponent)({ requestRender() { } } as never, undefined as never);
  assert.equal(component.render(80).at(-1), "");
  component.dispose();

  updateTodoWidget(context, {
    tasks: [{ name: "Done", todos: [todo("finished", "completed")] }],
  }, {});
  assert.equal(typeof calls[1][1], "function");
  const finalComponent = (calls[1][1] as (tui: never, theme: never) => TodoWidgetComponent)(undefined as never, undefined as never);
  assert.ok(finalComponent.render(80).length > 0);
  vi.advanceTimersByTime(4_999);
  assert.equal(calls.length, 2);
  vi.advanceTimersByTime(1);
  assert.deepEqual(calls[2], ["todo", undefined]);

  updateTodoWidget(context, { tasks: [] }, {});
  assert.deepEqual(calls[3], ["todo", undefined, { placement: "aboveEditor" }]);

  updateTodoWidget({ hasUI: false, ui: { setWidget: (...args: unknown[]) => calls.push(args) } }, state, {});
  assert.equal(calls.length, 4);
});

test("repeated terminal refreshes preserve the final summary until its timer expires", () => {
  vi.useFakeTimers();
  const calls: unknown[][] = [];
  const context = { hasUI: true, ui: { setWidget: (...args: unknown[]) => calls.push(args) } };
  const terminalState: TodoState = {
    tasks: [{ name: "Done", todos: [{ name: "finished", description: "Finished the work.", status: "completed" }] }],
  };

  updateTodoWidget(context, state);
  updateTodoWidget(context, terminalState);
  vi.advanceTimersByTime(2_500);
  updateTodoWidget(context, terminalState);

  assert.equal(typeof calls[2][1], "function");
  vi.advanceTimersByTime(2_499);
  assert.equal(calls.length, 3);
  vi.advanceTimersByTime(1);
  assert.deepEqual(calls[3], ["todo", undefined]);
});

test("an already-terminal restored list stays hidden", () => {
  vi.useFakeTimers();
  const calls: unknown[][] = [];
  const context = { hasUI: true, ui: { setWidget: (...args: unknown[]) => calls.push(args) } };
  updateTodoWidget(context, {
    tasks: [{ name: "Done", todos: [{ name: "finished", description: "Finished the work.", status: "completed" }] }],
  });

  assert.deepEqual(calls, [["todo", undefined, { placement: "aboveEditor" }]]);
  vi.advanceTimersByTime(5_000);
  assert.equal(calls.length, 1);
});

test("new open work cancels a pending terminal clear", () => {
  vi.useFakeTimers();
  const calls: unknown[][] = [];
  const context = { hasUI: true, ui: { setWidget: (...args: unknown[]) => calls.push(args) } };
  const terminalState: TodoState = {
    tasks: [{ name: "Done", todos: [{ name: "finished", description: "Finished the work.", status: "completed" }] }],
  };
  updateTodoWidget(context, state);
  updateTodoWidget(context, terminalState);
  updateTodoWidget(context, state);

  vi.advanceTimersByTime(5_000);
  assert.equal(calls.length, 3);
  assert.equal(typeof calls[2][1], "function");
});

test("updateTodoWidget clears when off and warns if setWidget fails", () => {
  const calls: unknown[][] = [];
  updateTodoWidget({ hasUI: true, ui: { setWidget: (...args: unknown[]) => calls.push(args) } }, state, { widgetPlacement: "off" });
  assert.deepEqual(calls, [["todo", undefined]]);

  const notices: unknown[][] = [];
  updateTodoWidget({
    hasUI: true,
    ui: {
      setWidget() { throw new Error("unavailable"); },
      notify: (...args: unknown[]) => notices.push(args),
    },
  }, state, {});
  assert.match(String(notices[0][0]), /Todo widget update failed: unavailable/);
  assert.equal(notices[0][1], "warning");
});

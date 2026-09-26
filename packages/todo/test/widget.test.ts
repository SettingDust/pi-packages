import assert from "node:assert/strict";
import { visibleWidth } from "@earendil-works/pi-tui";
import { afterEach, test, vi } from "vitest";

import type { TodoState } from "../src/types.js";
import { TodoWidgetComponent } from "../src/widget-component.js";
import { updateTodoWidget } from "../src/widget.js";
import { renderTodoWidgetLines } from "../src/widget-layout.js";
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
    "   ○ Plan / Active todo",
    "   ○ Build / Second pending todo",
  ]);
  assert.equal(renderTodoWidgetLines(state, undefined, 80)[0], " Todos  2 tasks · 󰦖 1 · 󰄰 2 · 󰄴 1 · 󰍷 1");
  assert.deepEqual(renderTodoWidgetLines(state, undefined, 80).slice(1), [
    "   󰄰 Plan / Active todo", "   󰄰 Build / Second pending todo",
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
  assert.equal(calls.find(({ text }) => text.includes("Plan / Active todo"))?.color, "text");
  assert.equal(calls.find(({ text }) => text.includes("Build / Second pending todo"))?.color, "muted");
  assert.ok(calls.every(({ color }) => color !== "dim"));
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
    "   ○ Pending first / first pending",
    "   ○ First / first active",
    "   ○ Second / second active",
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
    "   ✓ Done / old",
    "   × Cancelled / stopped",
    "   Empty",
  ]);
  assert.deepEqual(renderTodoWidgetLines({ tasks: [{ name: "Done", todos: [todo("finished", "completed")] }] }, undefined, 80, { fallbackGlyphs: true }), [
    " Todos  1 task · ◔ 0 · ○ 0 · ✓ 1 · × 0",
    "   ✓ Done / finished",
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

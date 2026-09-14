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

test("todo widget shows only open todos from the selected task", () => {
  const lines = renderTodoWidgetLines(state, undefined, 80, { maxVisible: 2, fallbackGlyphs: true });
  const output = lines.join("\n");

  assert.ok(output.indexOf("Active todo") < output.indexOf("First pending todo"));
  assert.doesNotMatch(output, /Detailed description|Second pending todo|Finished todo|Cancelled todo/);
});

test("todo widget applies semantic colors to todo and secondary rows", () => {
  const calls: { color: string; text: string }[] = [];
  renderTodoWidgetLines(state, {
    bold: (text: string) => text,
    fg: (color: string, text: string) => {
      calls.push({ color, text });
      return text;
    },
  } as never, 80, { maxVisible: 10, fallbackGlyphs: true });

  assert.equal(calls.find(({ text }) => text.includes("Active todo"))?.color, "text");
  assert.equal(calls.find(({ text }) => text.includes("First pending todo"))?.color, "muted");
  assert.equal(calls.find(({ text }) => text.includes("complete todo"))?.color, "muted");
  assert.equal(calls.find(({ text }) => text.includes("Build"))?.color, "muted");
  assert.ok(calls.every(({ color }) => color !== "dim"));
});

test("todo widget prioritizes statuses stably and shows every active todo over the limit", () => {
  const activeState: TodoState = {
    tasks: [{ name: "Work", todos: [
      todo("pending first"),
      todo("active first", "in_progress"),
      todo("completed", "completed"),
      todo("active second", "in_progress"),
      todo("pending second"),
    ] }],
  };
  const lines = renderTodoWidgetLines(activeState, undefined, 80, { maxVisible: 1, fallbackGlyphs: true });
  const text = lines.join("\n");
  assert.ok(text.indexOf("active first") < text.indexOf("active second"));
  assert.doesNotMatch(lines.slice(2).join("\n"), /pending first|completed|pending second/);
  assert.match(text, /\+2 more/);
  assert.match(text, /1 complete todo/);
});

test("todo widget expands every active task in canonical order with independent limits", () => {
  const multiState: TodoState = {
    tasks: [
      { name: "First", todos: [todo("first active", "in_progress"), todo("first pending"), todo("first done", "completed")] },
      { name: "Second", todos: [todo("second pending"), todo("second active", "in_progress"), todo("second done", "completed")] },
      { name: "Third", todos: [todo("third pending")] },
    ],
  };
  const lines = renderTodoWidgetLines(multiState, undefined, 80, { maxVisible: 1, fallbackGlyphs: true });
  const text = lines.join("\n");

  assert.ok(text.indexOf("First") < text.indexOf("first active"));
  assert.ok(text.indexOf("first active") < text.indexOf("Second"));
  assert.ok(text.indexOf("Second") < text.indexOf("second active"));
  assert.doesNotMatch(text, /third pending/);
  assert.equal((text.match(/\+1 more/g) ?? []).length, 2);
  assert.equal((text.match(/1 complete todo/g) ?? []).length, 2);
});

test("todo widget does not select a single task when no task is active", () => {
  const pendingState: TodoState = {
    tasks: [
      { name: "Done", todos: [todo("old", "completed")] },
      { name: "Next", todos: [todo("ready")] },
      { name: "Later", todos: [todo("later")] },
    ],
  };
  const pendingLines = renderTodoWidgetLines(pendingState, undefined, 80, { fallbackGlyphs: true });
  assert.doesNotMatch(pendingLines.join("\n"), /    ○ ready|    ○ later/);

  const terminalLines = renderTodoWidgetLines({
    tasks: [{ name: "Done", todos: [
      todo("finished", "completed"),
      todo("cancelled", "cancelled"),
    ] }],
  }, undefined, 80, { fallbackGlyphs: true });
  assert.doesNotMatch(terminalLines.join("\n"), /1 complete todo · 1 cancelled todo/);
});

test("todo widget remains safe at narrow widths", () => {
  const lines = renderTodoWidgetLines(state, undefined, 4, { maxVisible: 10 });
  for (const line of lines) assert.ok(visibleWidth(line) <= 4);

  const component = new TodoWidgetComponent(state, undefined, { maxVisible: 1 });
  for (const line of component.render(1)) assert.ok(visibleWidth(line) <= 1);
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

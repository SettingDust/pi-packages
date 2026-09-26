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

test("todo widget keeps fixed-order counts and a canonical active anchor in two rows", () => {
  const before = structuredClone(state);
  const lines = renderTodoWidgetLines(state, undefined, 80, { maxVisible: 1, fallbackGlyphs: true });
  assert.equal(lines.length, 2);
  assert.match(lines[0]!, /Todos  in_progress:1 · pending:2 · completed:1 · cancelled:1/);
  assert.match(lines[1]!, /○ Plan \/ Active todo$/);
  assert.doesNotMatch(lines.join("\n"), /Detailed description|First pending todo|Second pending todo|Finished todo|Cancelled todo/);
  assert.deepEqual(state, before);
});

test("todo widget uses semantic colors for title, counts and anchor", () => {
  const calls: { color: string; text: string }[] = [];
  renderTodoWidgetLines(state, {
    bold: (text: string) => text,
    fg: (color: string, text: string) => {
      calls.push({ color, text });
      return text;
    },
  } as never, 80, { fallbackGlyphs: true });

  assert.equal(calls.find(({ text }) => text === "Todos")?.color, "toolTitle");
  assert.equal(calls.find(({ text }) => text.includes("in_progress:1"))?.color, "muted");
  assert.equal(calls.find(({ text }) => text.includes("Plan / Active todo"))?.color, "text");
  assert.ok(calls.every(({ color }) => color !== "dim"));
});

test("todo widget anchors the first active across groups and bounds remaining work to +N", () => {
  const multiState: TodoState = {
    tasks: [
      { name: "Pending first", todos: [todo("first pending")] },
      { name: "First", todos: [todo("first active", "in_progress"), todo("another active", "in_progress")] },
      { name: "Second", todos: [todo("second active", "in_progress"), todo("last pending")] },
    ],
  };
  const lines = renderTodoWidgetLines(multiState, undefined, 80, { maxVisible: 1, fallbackGlyphs: true });
  assert.equal(lines.length, 2);
  assert.match(lines[0]!, /in_progress:3 · pending:2 · completed:0 · cancelled:0/);
  assert.match(lines[1]!, /First \/ first active \+2$/);
  assert.doesNotMatch(lines[1]!, /Pending first|Second|another active|second active/);
  assert.equal(multiState.tasks[2]?.todos[0]?.status, "in_progress");
});

test("todo widget uses first pending only without active work and omits terminal anchor", () => {
  const pendingState: TodoState = {
    tasks: [
      { name: "Done", todos: [todo("old", "completed")] },
      { name: "Next", todos: [todo("ready")] },
      { name: "Later", todos: [todo("later")] },
    ],
  };
  const pendingLines = renderTodoWidgetLines(pendingState, undefined, 80, { fallbackGlyphs: true });
  assert.match(pendingLines[0]!, /in_progress:0 · pending:2 · completed:1 · cancelled:0/);
  assert.match(pendingLines[1]!, /Next \/ ready \+1$/);

  const terminalLines = renderTodoWidgetLines({
    tasks: [{ name: "Done", todos: [todo("finished", "completed"), todo("cancelled", "cancelled")] }],
  }, undefined, 80, { fallbackGlyphs: true });
  assert.equal(terminalLines.length, 1);
  assert.match(terminalLines[0]!, /in_progress:0 · pending:0 · completed:1 · cancelled:1/);
  assert.deepEqual(renderTodoWidgetLines({ tasks: [] }, undefined, 80), [
    " Todos  in_progress:0 · pending:0 · completed:0 · cancelled:0",
  ]);
});

test("todo widget row count and width are stable for large and narrow snapshots", () => {
  const large: TodoState = { tasks: Array.from({ length: 100 }, (_, index) => ({
    name: `Task ${index} ${"Long".repeat(30)}`,
    todos: Array.from({ length: 10 }, (_, item) => todo(`Todo ${item} ${"界".repeat(30)}`, item ? "pending" : "in_progress")),
  })) };
  for (const snapshot of [undefined, { tasks: [] }, state, large]) {
    for (const width of [1, 4, 20, 80]) {
      const lines = renderTodoWidgetLines(snapshot, undefined, width, { fallbackGlyphs: true });
      assert.ok(lines.length >= 1 && lines.length <= 2);
      assert.ok(lines.every((line) => visibleWidth(line) <= width));
    }
  }
  assert.match(renderTodoWidgetLines(large, undefined, 80, { fallbackGlyphs: true })[1]!, /\+99$/);
  const component = new TodoWidgetComponent(large, undefined, { blankLineBelow: true });
  assert.equal(component.render(20).length, 3);
  assert.equal(component.render(1).length, 3);
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

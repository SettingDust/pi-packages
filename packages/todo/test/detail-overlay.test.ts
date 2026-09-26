import assert from "node:assert/strict";
import type { Theme } from "@earendil-works/pi-coding-agent";
import {
  KeybindingsManager, TUI_KEYBINDINGS, stripTerminalSequences, visibleWidth,
  type TUI, type TuiMouseButton, type TuiMouseEvent, type TuiMouseEventType,
} from "@earendil-works/pi-tui";
import { test } from "vitest";

import { TodoDetailOverlay } from "../src/detail-overlay.js";
import type { TodoState } from "../src/types.js";
import { todo } from "./helpers.js";

const keys = { up: "\x1b[A", down: "\x1b[B", left: "\x1b[D", right: "\x1b[C", home: "\x1b[H", end: "\x1b[F", pageUp: "\x1b[5~", pageDown: "\x1b[6~", enter: "\r", space: " ", escape: "\x1b" };
const theme = { fg: (_color: string, text: string) => text, bold: (text: string) => text } as Theme;
const state: TodoState = { tasks: [
  { name: "Earlier", todos: [todo("First", "pending", "An earlier description")] },
  { name: "Active", todos: [todo("Working", "in_progress", "The complete working description"), todo("Done", "completed", "Finished detail")] },
  { name: "Also active", todos: [todo("Review", "in_progress", "Second active description")] },
  { name: "Empty", todos: [] },
] };

function fixture(snapshot: TodoState = state, rows = 20) {
  let renders = 0;
  let closes = 0;
  const terminal = { rows };
  const tui = { terminal, requestRender: () => { renders++; } } as unknown as TUI;
  const overlay = new TodoDetailOverlay(snapshot, tui, theme, new KeybindingsManager(TUI_KEYBINDINGS), () => { closes++; }, true);
  const render = (width = 80) => overlay.render(width);
  const mouse = (type: TuiMouseEventType, y: number, button: TuiMouseButton = "left", wheelDelta?: number, x = 1) => overlay.handleMouse({
    type, button, x, y, screenX: x, screenY: y, width: 80, height: rows,
    shift: false, alt: false, ctrl: false, wheelDelta,
  } satisfies TuiMouseEvent);
  return { overlay, terminal, render, mouse, get renders() { return renders; }, get closes() { return closes; } };
}

function headerRow(lines: string[], name: string): number {
  return lines.findIndex((line) => line.includes(name) && /\[[+-]\]/.test(line));
}

test("initial selection expands every active group and renders complete ordered detail without changing snapshot", () => {
  const before = structuredClone(state);
  const view = fixture(state);
  const lines = view.render();
  assert.ok(headerRow(lines, "Earlier") < headerRow(lines, "Active"));
  assert.match(lines[headerRow(lines, "Earlier")]!, /\[\+\]/);
  assert.match(lines[headerRow(lines, "Active")]!, /^> \[-\] Active .*1\/2/);
  assert.match(lines[headerRow(lines, "Also active")]!, /\[-\]/);
  assert.ok(lines.join("\n").includes("The complete working description"));
  assert.ok(lines.join("\n").includes("Finished detail"));
  assert.ok(lines.join("\n").includes("Second active description"));
  assert.ok(lines.indexOf(lines.find((line) => line.includes("Working"))!) < lines.indexOf(lines.find((line) => line.includes("Done"))!));
  assert.deepEqual(state, before);
});

test("fallback selection, empty task and zero-task snapshot remain operable", () => {
  const fallback = fixture({ tasks: [
    { name: "Empty", todos: [] },
    { name: "Complete", todos: [todo("old", "completed")] },
    { name: "Pending", todos: [todo("next")] },
  ] });
  assert.match(fallback.render()[headerRow(fallback.render(), "Pending")]!, /^> \[-\]/);
  fallback.overlay.handleInput(keys.home);
  assert.match(fallback.render()[headerRow(fallback.render(), "Empty")]!, /^> \[\+\]/);
  fallback.overlay.handleInput(keys.enter);
  assert.match(fallback.render()[headerRow(fallback.render(), "Empty")]!, /^> \[-\]/);
  assert.equal(fallback.renders, 2);
  const terminal = fixture({ tasks: [{ name: "Complete", todos: [todo("old", "completed")] }] });
  assert.match(terminal.render()[headerRow(terminal.render(), "Complete")]!, /^> \[-\]/);
  const empty = fixture({ tasks: [] }, 2);
  assert.deepEqual(empty.render(), [" No todos"]);
  empty.overlay.handleInput(keys.down);
  assert.equal(empty.renders, 0);
});

test("navigation, toggles, boundaries and escape request only necessary renders", () => {
  const view = fixture();
  view.render();
  view.overlay.handleInput(keys.up);
  assert.match(view.render()[headerRow(view.render(), "Earlier")]!, /^> \[\+\]/);
  view.overlay.handleInput(keys.right);
  assert.match(view.render()[headerRow(view.render(), "Earlier")]!, /^> \[-\]/);
  view.overlay.handleInput(keys.right);
  assert.equal(view.renders, 2);
  view.overlay.handleInput(keys.space);
  assert.match(view.render()[headerRow(view.render(), "Earlier")]!, /^> \[\+\]/);
  view.overlay.handleInput(keys.left);
  assert.equal(view.renders, 3);
  view.overlay.handleInput(keys.end);
  assert.match(view.render()[headerRow(view.render(), "Empty")]!, /^> \[\+\]/);
  view.overlay.handleInput(keys.enter);
  assert.match(view.render()[headerRow(view.render(), "Empty")]!, /^> \[-\]/);
  view.overlay.handleInput(keys.down);
  assert.equal(view.renders, 5);
  view.overlay.handleInput(keys.home);
  assert.match(view.render()[headerRow(view.render(), "Earlier")]!, /^> \[\+\]/);
  view.overlay.handleInput(keys.escape);
  view.overlay.handleInput(keys.escape);
  assert.equal(view.closes, 1);
  view.overlay.dispose();
  view.overlay.handleInput(keys.enter);
  assert.equal(view.renders, 6);
});

test("oversized detail remains bounded and its final description is reachable with PageDown alone", () => {
  const long: TodoState = { tasks: [{ name: "Long", todos: Array.from({ length: 30 }, (_, i) => todo(`Item ${i}`, "in_progress", `Description ${i} spans multiple lines in a narrow terminal`)) }] };
  const view = fixture(long, 8);
  const first = view.render(24);
  assert.equal(first.length, 6);
  assert.ok(first.every((line) => visibleWidth(line) <= 24));
  let last = first;
  for (let i = 0; i < 100; i++) {
    view.overlay.handleInput(keys.pageDown);
    last = view.render(24);
  }
  assert.ok(last.join("\n").includes("29"));
  assert.ok(last.join("\n").includes("terminal"));
  const count = view.renders;
  view.overlay.handleInput(keys.pageDown);
  assert.equal(view.renders, count);
  assert.equal(headerRow(last, "Long"), -1);
  view.overlay.handleInput(keys.left);
  assert.match(view.render(24)[1]!, /^> \[\+\] Long/);
  assert.equal(view.renders, count + 1);
  view.overlay.handleInput(keys.pageUp);
  assert.ok(view.renders >= count + 1);
});

test("width 1/4/20/80, resize after scrolling, and one-row geometry never overflow", () => {
  const unicode = fixture({ tasks: [{ name: "界".repeat(20), todos: [todo("long🙂name", "in_progress", "界".repeat(22))] }, { name: "Tail", todos: [] }] }, 8);
  for (const width of [1, 4, 20, 80]) {
    const lines = unicode.render(width);
    assert.equal(lines.length, 6);
    assert.ok(lines.every((line) => visibleWidth(line) <= width));
  }
  unicode.overlay.handleInput(keys.pageDown);
  unicode.render(1);
  unicode.terminal.rows = 2;
  assert.equal(unicode.render(4).length, 1);
  unicode.terminal.rows = 8;
  unicode.overlay.handleInput(keys.home);
  assert.equal(unicode.render(20).length, 6);
  const single = fixture({ tasks: [] }, 1);
  assert.deepEqual(single.render(4).map(stripTerminalSequences), [" No…"]);
  const oneRowTask = fixture({ tasks: [{ name: "Present", todos: [] }] }, 1);
  assert.match(oneRowTask.render(20)[0]!, /^> \[-\] Present/);
});

test("public mouse clicks select one header, toggle once, and keyboard continues on clicked task", () => {
  const view = fixture();
  let lines = view.render();
  const row = headerRow(lines, "Earlier");
  assert.equal(view.mouse("press", row), undefined);
  assert.equal(view.mouse("release", row), undefined);
  assert.equal(view.mouse("click", row, "right"), undefined);
  assert.equal(view.mouse("click", row, "left", undefined, -1), undefined);
  assert.equal(view.mouse("click", 0), undefined);
  assert.equal(view.renders, 0);
  assert.deepEqual(view.mouse("click", row), { handled: true, render: false });
  assert.equal(view.renders, 1);
  lines = view.render();
  assert.match(lines[headerRow(lines, "Earlier")]!, /^> \[-\]/);
  view.overlay.handleInput(keys.left);
  assert.match(view.render()[headerRow(view.render(), "Earlier")]!, /^> \[\+\]/);
  assert.equal(view.renders, 2);
  assert.deepEqual(view.mouse("click", headerRow(view.render(), "Earlier")), { handled: true, render: false });
  assert.match(view.render()[headerRow(view.render(), "Earlier")]!, /^> \[-\]/);
  assert.equal(view.renders, 3);
});

test("free scroll does not move selection; a no-op selection key reveals it after resizing", () => {
  const view = fixture({ tasks: Array.from({ length: 15 }, (_, i) => ({ name: `Task ${i}`, todos: [] })) }, 8);
  view.render(80);
  view.overlay.handleInput(keys.pageDown);
  view.overlay.handleInput(keys.pageDown);
  assert.equal(headerRow(view.render(80), "Task 0"), -1);
  view.terminal.rows = 5;
  assert.equal(view.render(20).length, 3);
  view.overlay.handleInput(keys.right);
  assert.match(view.render(20)[1]!, /^> \[-\] Task 0/);
  assert.equal(view.renders, 3);
  const nextRow = headerRow(view.render(20), "Task 1");
  assert.ok(nextRow > 0);
  assert.deepEqual(view.mouse("click", nextRow), { handled: true, render: false });
  assert.match(view.render(20)[headerRow(view.render(20), "Task 1")]!, /^> \[-\]/);
  view.overlay.handleInput(keys.right);
  assert.equal(view.renders, 4);
});

test("signed wheel contains events on chrome, header and body, preserving selection and clamping", () => {
  const view = fixture({ tasks: Array.from({ length: 18 }, (_, i) => ({ name: `Task ${i}`, todos: [] })) }, 8);
  view.render();
  assert.deepEqual(view.mouse("wheel", 0, "none", 100), { handled: true, render: false });
  assert.equal(view.renders, 1);
  let lines = view.render();
  assert.ok(lines.join("\n").includes("Task 17"));
  assert.equal(headerRow(lines, "Task 0"), -1);
  assert.deepEqual(view.mouse("wheel", 1, "none", 20), { handled: true, render: false });
  assert.equal(view.renders, 1);
  assert.deepEqual(view.mouse("wheel", 2, "none", -2), { handled: true, render: false });
  assert.equal(view.renders, 2);
  lines = view.render();
  assert.ok(lines.join("\n").includes("Task 11"));
  assert.equal(view.mouse("wheel", -1, "none", 1), undefined);
  const clickedRow = headerRow(lines, "Task 13");
  assert.ok(clickedRow > 0);
  view.mouse("click", clickedRow);
  assert.match(view.render()[headerRow(view.render(), "Task 13")]!, /^> \[-\]/);
  view.overlay.invalidate();
  assert.equal(view.mouse("click", clickedRow), undefined);
  view.render();
  assert.deepEqual(view.mouse("click", headerRow(view.render(), "Task 13")), { handled: true, render: false });
  view.overlay.dispose();
  assert.equal(view.mouse("wheel", 0, "none", 1), undefined);
});

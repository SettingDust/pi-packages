import { visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { renderResult } from "../src/renderer.js";
import { applyTodoRemove } from "../src/state.js";
import type { TodoState } from "../src/types.js";
import { todo } from "./helpers.js";

const plainTheme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => `*${text}*`,
};
const line = (text: { render: (width: number) => string[] }, width = 80) => text.render(width)[0]?.trimEnd();

const snapshot: TodoState = {
  tasks: [
    { name: "Planning", todos: [todo("Plan release announcement")] },
    { name: "Build", todos: [
      todo("Implement renderer", "in_progress"),
      todo("Publish package", "completed"),
    ] },
  ],
};

describe("todo renderer", () => {
  it("renders collapsed results as one muted line", () => {
    const colors: string[] = [];
    const theme = {
      ...plainTheme,
      fg: (color: string, text: string) => {
        colors.push(color);
        return text;
      },
    };

    expect(line(renderResult({ details: { snapshot } }, { expanded: false }, theme), 120)).toBe("2 tasks · 3 todos");
    expect(colors).toEqual(["muted"]);
  });

  it("applies widget todo colors in expanded results", () => {
    const calls: { color: string; text: string }[] = [];
    const themed = {
      fg: (color: string, text: string) => {
        calls.push({ color, text });
        return text;
      },
      bold: (text: string) => text,
    };
    renderResult({ details: { snapshot } }, { expanded: true }, themed).render(120);

    expect(calls.find(({ text }) => text.includes("Plan release announcement"))?.color).toBe("muted");
    expect(calls.find(({ text }) => text.includes("Implement renderer"))?.color).toBe("text");
    expect(calls.find(({ text }) => text.includes("Publish package"))?.color).toBe("success");
  });

  it("keeps every task and orders active, pending, then terminal todos", () => {
    const expanded = renderResult({ details: { snapshot: {
      tasks: [
        { name: "Plan", todos: [
          todo("Done first", "completed"),
          todo("Pending first"),
          todo("Active", "in_progress"),
          todo("Pending second"),
          todo("Cancelled", "cancelled"),
        ] },
        { name: "Review", todos: [todo("Review pending")] },
        { name: "Empty", todos: [] },
      ],
    } } }, { expanded: true }, plainTheme, { fallbackGlyphs: true }).render(120).join("\n");

    expect(expanded.indexOf("Active")).toBeLessThan(expanded.indexOf("Pending first"));
    expect(expanded.indexOf("Pending first")).toBeLessThan(expanded.indexOf("Done first"));
    expect(expanded).toContain("3. Empty");
  });

  it("handles narrow and empty states safely", () => {
    const narrow = renderResult({ details: { snapshot } }, { expanded: true }, plainTheme).render(12);
    expect(narrow.every((line) => visibleWidth(line) <= 12)).toBe(true);
    expect(line(renderResult({ details: { snapshot: { tasks: [] } } }, { expanded: false }, plainTheme))).toBe("0 tasks · 0 todos");
    expect(line(renderResult({ details: { snapshot: { tasks: [] } } }, { expanded: true }, plainTheme))).toBe("No todos.");
  });

  it("renders the complete post-removal snapshot, not selected or removed records", () => {
    const before: TodoState = { tasks: [
      { name: "Removed group", todos: [todo("Removed group todo")] },
      { name: "Mixed", todos: [
        todo("Removed active", "in_progress"), todo("Keep pending"),
        todo("Keep active", "in_progress"), todo("Keep done", "completed"), todo("Keep cancelled", "cancelled"),
      ] },
      { name: "Locally empty", todos: [todo("Removed last")] },
      { name: "Already empty", todos: [] },
      { name: "Unselected", todos: [todo("Unselected todo")] },
    ] };
    const snapshot = applyTodoRemove(before, { removals: [
      { task: "Removed group" }, { task: "Mixed", todo: "Removed active" },
      { task: "Locally empty", todo: "Removed last" },
    ] });
    const result = { details: { result: "remove", snapshot } };
    expect(line(renderResult(result, {}, plainTheme))).toBe("4 tasks · 5 todos");
    const expanded = renderResult(result, { expanded: true }, plainTheme, { fallbackGlyphs: true }).render(120).join("\n");
    for (const text of ["1. Mixed · 2/4", "2. Locally empty · 0/0", "3. Already empty · 0/0", "4. Unselected · 0/1",
      "○ Keep pending", "◔ Keep active", "✓ Keep done", "× Keep cancelled", "Unselected todo"]) {
      expect(expanded).toContain(text);
    }
    expect(expanded).not.toMatch(/Removed/);
    expect(renderResult(result, { expanded: true }, plainTheme).render(12).every((row) => visibleWidth(row) <= 12)).toBe(true);
    const empty = applyTodoRemove(snapshot, { removals: snapshot.tasks.map(({ name }) => ({ task: name })) });
    expect(line(renderResult({ details: { snapshot: empty } }, {}, plainTheme))).toBe("0 tasks · 0 todos");
    expect(line(renderResult({ details: { snapshot: empty } }, { expanded: true }, plainTheme))).toBe("No todos.");
  });

  it("falls back on falsey snapshots only", () => {
    const content = [{ type: "text" as const, text: "Todo task does not exist." }];
    for (const snapshot of [undefined, null, false, 0, "", Number.NaN]) {
      expect(line(renderResult({ details: { snapshot: snapshot as never }, content }, {}, plainTheme))).toBe("Todo task does not exist.");
    }
    expect(line(renderResult({ details: {} }, {}, plainTheme))).toBe("No todos.");
    expect(line(renderResult({ content: [{ type: "text", text: "" }] }, {}, plainTheme))).toBe("No todos.");
    // truthy malformed ({}, arrays, invalid tasks) stays outside the guarantee
  });
});

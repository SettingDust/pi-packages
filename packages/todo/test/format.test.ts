import { describe, expect, it } from "vitest";
import { countTodos, formatTodoCompactionContext, formatTodoSummary, formatTodoTaskLines, todoTasks } from "../src/format.js";
import type { TodoState } from "../src/types.js";
import { todo } from "./helpers.js";

const state: TodoState = {
  tasks: [
    { name: "Planning", todos: [
      todo("Plan release"),
      todo("Cancel old approach", "cancelled"),
    ] },
    { name: "Build", todos: [
      todo("Build feature", "in_progress"),
      todo("Ship release", "completed"),
    ] },
  ],
};

describe("todo formatting", () => {
  it("includes every status marker and canonical todo name", () => {
    const summary = formatTodoSummary(state);
    expect(summary).toMatch(/○ Plan release/);
    expect(summary).toMatch(/× Cancel old approach/);
    expect(summary).toMatch(/◔ Build feature/);
    expect(summary).toMatch(/✓ Ship release/);
    expect(summary).not.toContain("Detailed description");
    expect(summary).toContain("Todo: 1 active · 1 pending · 1 completed · 1 cancelled");
    expect(formatTodoSummary(state, true)).toContain("Build feature — Detailed description for Build feature.");
  });

  it("handles empty state and counts non-terminal statuses as open", () => {
    expect(formatTodoTaskLines({ tasks: [] })).toHaveLength(0);
    expect(countTodos(todoTasks(state))).toEqual({ open: 2, completed: 1, cancelled: 1 });
  });

  it("formats an exact complete post-compaction context in task and todo order", () => {
    const completeState: TodoState = {
      tasks: [
        state.tasks[0],
        { name: "Empty task", todos: [] },
        state.tasks[1],
      ],
    };

    expect(formatTodoCompactionContext(completeState)).toBe([
      "<system-reminder source=\"todo-post-compaction\">",
      "Todo list after compaction:",
      "Planning:",
      "  [pending] Plan release: Detailed description for Plan release.",
      "  [cancelled] Cancel old approach: Detailed description for Cancel old approach.",
      "Empty task:",
      "  (no todos)",
      "Build:",
      "  [in_progress] Build feature: Detailed description for Build feature.",
      "  [completed] Ship release: Detailed description for Ship release.",
      "Continue using this list and keep todo statuses current.",
      "Do not mention this reminder to the user.",
      "</system-reminder>",
    ].join("\n"));
  });

  it("returns no post-compaction context for zero todos but includes terminal-only lists", () => {
    expect(formatTodoCompactionContext({ tasks: [] })).toBeUndefined();
    expect(formatTodoCompactionContext({ tasks: [
      { name: "Empty", todos: [] },
      { name: "Done", todos: [todo("Already shipped", "completed")] },
    ] })).toContain("[completed] Already shipped");
  });
});

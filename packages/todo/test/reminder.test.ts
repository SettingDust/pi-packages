import { describe, expect, it } from "vitest";

import { formatTodoReminder } from "../src/reminder.js";
import type { TodoState } from "../src/types.js";
import { todo } from "./helpers.js";

describe("formatTodoReminder", () => {
  it("selects the first active task and describes its open todos", () => {
    const state: TodoState = { tasks: [
      { name: "Queued", todos: [todo("Pending before active task")] },
      { name: "Build", todos: [
        todo("Implement formatter", "in_progress"),
        todo("Queued build detail"),
        todo("Write focused tests", "in_progress"),
      ] },
      { name: "Later", todos: [todo("Later active todo", "in_progress")] },
    ], workingOn: "Implementing the formatter" };

    const reminder = formatTodoReminder(state);

    expect(reminder).toMatch(/^<system-reminder>\n/);
    expect(reminder).toMatch(/\n<\/system-reminder>$/);
    expect(reminder).toContain("Active task: Build");
    expect(reminder).toContain("Current work: Implementing the formatter");
    expect(reminder).toContain("Open todos in this task:\n- [in_progress] Implement formatter: Detailed description for Implement formatter.");
    expect(reminder).toContain("- [pending] Queued build detail: Detailed description for Queued build detail.");
    expect(reminder).toContain("- [in_progress] Write focused tests: Detailed description for Write focused tests.");
    expect(reminder).not.toContain("Pending before active task");
    expect(reminder).not.toContain("Later active todo");
  });

  it("falls back to the first task with pending todos", () => {
    const state: TodoState = { tasks: [
      { name: "Done", todos: [todo("Already finished", "completed")] },
      { name: "Next", todos: [todo("First queued todo"), todo("Second queued todo")] },
      { name: "Later", todos: [todo("Future queued todo")] },
    ] };

    const reminder = formatTodoReminder(state);

    expect(reminder).toContain("Active task: Next");
    expect(reminder).toContain("- [pending] First queued todo: Detailed description for First queued todo.");
    expect(reminder).toContain("- [pending] Second queued todo: Detailed description for Second queued todo.");
    expect(reminder).not.toContain("Future queued todo");
    expect(reminder).toContain("Review and update the todo if its status has changed.");
    expect(reminder).toContain("Do not mention this reminder to the user.");
  });

  it("reports deterministic counts and omits terminal todo details", () => {
    const reminder = formatTodoReminder({ tasks: [
      { name: "Build", todos: [
        todo("Visible active todo", "in_progress"),
        todo("Visible pending one"),
        todo("Visible pending two"),
        todo("Hidden completed", "completed"),
        todo("Hidden cancelled", "cancelled"),
      ] },
    ], workingOn: "Working on the visible todo" });

    expect(reminder).toContain("Counts: 1 in_progress, 2 pending, 1 completed, 1 cancelled.");
    expect(reminder).toContain("Visible active todo");
    expect(reminder).toContain("Visible pending one");
    expect(reminder).toContain("Visible pending two");
    expect(reminder).not.toContain("Hidden completed");
    expect(reminder).not.toContain("Hidden cancelled");
  });

  it("returns undefined for empty and terminal-only lists", () => {
    expect(formatTodoReminder({ tasks: [] })).toBeUndefined();
    expect(formatTodoReminder({ tasks: [
      { name: "Done", todos: [
        todo("Shipped", "completed"),
        todo("Dropped", "cancelled"),
      ] },
    ] })).toBeUndefined();
  });
});

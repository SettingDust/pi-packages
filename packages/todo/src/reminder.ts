import { countTodoStatuses, todoTasks } from "./format.js";
import type { TodoState } from "./types.js";

/** Formats the transient model-context reminder for an unfinished todo list. */
export function formatTodoReminder(state: TodoState): string | undefined {
  const tasks = state.tasks.filter((task) => task.todos.some((todo) => todo.status === "pending" || todo.status === "in_progress"));
  if (tasks.length === 0) return undefined;

  const counts = countTodoStatuses(todoTasks(state));
  return [
    "<system-reminder>",
    ...tasks.flatMap((task) => [
      `Active task: ${task.name}`,
      "Open todos in this task:",
      ...task.todos
        .filter((todo) => todo.status === "pending" || todo.status === "in_progress")
        .map((todo) => `- [${todo.status}] ${todo.name}: ${todo.description}`),
    ]),
    `Counts: ${counts.in_progress} in_progress, ${counts.pending} pending, ${counts.completed} completed, ${counts.cancelled} cancelled.`,
    "Review and update the todo if its status has changed.",
    "Do not mention this reminder to the user.",
    "</system-reminder>",
  ].join("\n");
}

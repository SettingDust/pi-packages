import { countTodoStatuses, todoTasks } from "./format.js";
import { deriveActiveTask } from "./state.js";
import type { TodoState } from "./types.js";

/** Formats the transient model-context reminder for an unfinished todo list. */
export function formatTodoReminder(state: TodoState): string | undefined {
  const activeTask = deriveActiveTask(state.tasks)
    ?? state.tasks.find((task) => task.todos.some((todo) => todo.status === "pending" || todo.status === "in_progress"));
  if (!activeTask) return undefined;

  const openTodos = activeTask.todos.filter((todo) => todo.status === "pending" || todo.status === "in_progress");
  const counts = countTodoStatuses(todoTasks(state));

  return [
    "<system-reminder>",
    `Active task: ${activeTask.name}`,
    ...(state.workingOn ? [`Current work: ${state.workingOn}`] : []),
    "Open todos in this task:",
    ...openTodos.map((todo) => `- [${todo.status}] ${todo.name}: ${todo.description}`),
    `Counts: ${counts.in_progress} in_progress, ${counts.pending} pending, ${counts.completed} completed, ${counts.cancelled} cancelled.`,
    "Review and update the todo if its status has changed.",
    "Do not mention this reminder to the user.",
    "</system-reminder>",
  ].join("\n");
}

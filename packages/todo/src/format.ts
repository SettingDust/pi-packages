import { TODO_DESCRIPTION_SEPARATOR_GLYPH, TODO_SEPARATOR_GLYPH, todoGlyph } from "./glyphs.js";
import type { Todo, TodoState, TodoStatus } from "./types.js";

export interface TodoCounts {
  open: number;
  completed: number;
  cancelled: number;
}

export type TodoStatusCounts = Record<TodoStatus, number>;

/** A small, plain-text representation used in tool results and model context. */
export function formatTodoSummary(state: TodoState | undefined, includeDescriptions = false): string {
  const todos = todoTasks(state);
  if (todos.length === 0) return "No todos.";

  const counts = countTodoStatuses(todos);
  const summary = [
    ...(counts.in_progress ? [`${counts.in_progress} active`] : []),
    ...(counts.pending ? [`${counts.pending} pending`] : []),
    ...(counts.completed ? [`${counts.completed} completed`] : []),
    ...(counts.cancelled ? [`${counts.cancelled} cancelled`] : []),
  ].join(` ${TODO_SEPARATOR_GLYPH} `);

  return [
    `Todo: ${summary}`,
    ...(state?.workingOn ? [`Working on: ${state.workingOn}`] : []),
    ...formatTodoTaskLines(state, includeDescriptions),
  ].join("\n");
}

export function formatTodoTaskLines(state: TodoState | undefined, includeDescriptions = false): string[] {
  if (!state) return [];

  const lines: string[] = [];
  for (const task of state.tasks) {
    if (task.todos.length === 0) continue;
    lines.push(`${task.name}:`);
    lines.push(...task.todos.map((todo) =>
      `  ${taskMarker(todo)} ${todo.name}${includeDescriptions ? ` ${TODO_DESCRIPTION_SEPARATOR_GLYPH} ${todo.description}` : ""}`,
    ));
  }
  return lines;
}

/** Formats the complete one-shot Todo snapshot injected after compaction. */
export function formatTodoCompactionContext(state: TodoState): string | undefined {
  if (!state.tasks.some((task) => task.todos.length > 0)) return undefined;

  const plan = state.tasks.flatMap((task) => [
    `${task.name}:`,
    ...(task.todos.length === 0
      ? ["  (no todos)"]
      : task.todos.map((todo) => `  [${todo.status}] ${todo.name}: ${todo.description}`)),
  ]);
  return [
    "<system-reminder source=\"todo-post-compaction\">",
    "Todo list after compaction:",
    ...(state.workingOn ? [`Current work: ${state.workingOn}`] : []),
    ...plan,
    "Continue using this list and keep todo statuses current.",
    "Do not mention this reminder to the user.",
    "</system-reminder>",
  ].join("\n");
}

export function countTodoStatuses(todos: readonly Todo[]): TodoStatusCounts {
  const counts: TodoStatusCounts = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
  for (const todo of todos) counts[todo.status] += 1;
  return counts;
}

export function countTodos(todos: readonly Todo[]): TodoCounts {
  const counts = countTodoStatuses(todos);
  return {
    open: counts.pending + counts.in_progress,
    completed: counts.completed,
    cancelled: counts.cancelled,
  };
}

export function formatTodoSize(taskCount: number, todoCount: number): string {
  return `${taskCount} ${taskCount === 1 ? "task" : "tasks"} ${TODO_SEPARATOR_GLYPH} ${todoCount} ${todoCount === 1 ? "todo" : "todos"}`;
}

export function formatTodoProgress(label: string, todos: readonly Todo[]): string {
  const counts = countTodoStatuses(todos);
  return [
    label,
    ...(counts.in_progress ? [`${counts.in_progress} active`] : []),
    ...(counts.pending ? [`${counts.pending} pending`] : []),
    ...(counts.completed ? [`${counts.completed} completed`] : []),
    ...(counts.cancelled ? [`${counts.cancelled} cancelled`] : []),
  ].join(` ${TODO_SEPARATOR_GLYPH} `);
}

export function taskMarker(todo: Pick<Todo, "status">): string {
  return todoGlyph(todo.status, true);
}

export function todoTasks(state: TodoState | undefined): readonly Todo[] {
  return state?.tasks.flatMap((task) => task.todos) ?? [];
}

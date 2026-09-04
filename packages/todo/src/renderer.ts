import type { Theme } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

import { formatTodoSize, todoTasks } from "./format.js";
import type { Todo, TodoState } from "./types.js";
import { renderTodoLine, renderTodoTaskTitle, selectedTodoTaskIndex } from "./widget-layout.js";

type ThemeLike = Partial<Pick<Theme, "fg" | "bold" | "strikethrough">>;
type ThemeColor = Parameters<Theme["fg"]>[0];

export type TodoRendererOptions = { fallbackGlyphs?: boolean };

export function renderResult(
  result: { details?: { snapshot?: TodoState }; content?: readonly { type?: string; text?: string }[] },
  options: { expanded?: boolean } = {},
  theme?: ThemeLike,
  rendererOptions: TodoRendererOptions = {},
): Text {
  const state = result.details?.snapshot;
  if (!state) return new Text(fallbackText(result), 0, 0);

  const todos = todoTasks(state);
  if (options.expanded !== true) {
    return new Text(paint(theme, "muted", formatTodoSize(state.tasks.length, todos.length)), 0, 0);
  }
  if (todos.length === 0) return new Text(paint(theme, "muted", "No todos."), 0, 0);

  const selectedTask = selectedTodoTaskIndex(state.tasks);
  const lines: string[] = [];
  for (const [index, task] of state.tasks.entries()) {
    lines.push(renderTodoTaskTitle(task, index, index === selectedTask, theme));
    for (const todo of orderedTodos(task.todos)) {
      lines.push(renderTodoLine(todo, theme, rendererOptions.fallbackGlyphs));
    }
  }
  return new Text(lines.join("\n"), 0, 0);
}

function orderedTodos(todos: readonly Todo[]): Todo[] {
  return todos
    .map((todo, index) => ({ todo, index }))
    .sort((left, right) => todoPriority(left.todo) - todoPriority(right.todo) || left.index - right.index)
    .map(({ todo }) => todo);
}

function todoPriority(todo: Todo): number {
  return todo.status === "in_progress" ? 0 : todo.status === "pending" ? 1 : 2;
}

function paint(theme: ThemeLike | undefined, color: ThemeColor, text: string): string {
  return theme?.fg ? theme.fg(color, text) : text;
}

function fallbackText(result: { content?: readonly { type?: string; text?: string }[] }): string {
  return result.content?.find((part) => part.type === "text")?.text || "No todos.";
}

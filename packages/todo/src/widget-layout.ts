import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";

import { TODO_SEPARATOR_GLYPH, TODO_TRUNCATION_GLYPH, todoGlyph } from "./glyphs.js";
import { countTodoStatuses, todoTasks } from "./format.js";
import type { Todo, TodoState, TodoTask } from "./types.js";

export type TodoWidgetLayoutOptions = {
  maxVisible?: number;
  fallbackGlyphs?: boolean;
};

type ThemeLike = Partial<Pick<Theme, "bold" | "fg" | "strikethrough">>;

/** Produces compact widget rows constrained to the supplied display width. */
export function renderTodoWidgetLines(
  state: TodoState | undefined,
  theme: ThemeLike | undefined,
  width: number,
  options: TodoWidgetLayoutOptions = {},
): string[] {
  const safeWidth = Math.max(1, Math.floor(width) || 1);
  const tasks = state?.tasks ?? [];
  const counts = countTodoStatuses(todoTasks(state));
  const summary = (["in_progress", "pending", "completed", "cancelled"] as const)
    .map((status) => `${status === "in_progress" ? (options.fallbackGlyphs ? "◔" : "󰦖") : todoGlyph(status, options.fallbackGlyphs)} ${counts[status]}`)
    .join(` ${TODO_SEPARATOR_GLYPH} `);
  const title = toolTitle("Todos", theme);
  const lines = [fit(` ${title}  ${theme?.fg ? theme.fg("muted", summary) : summary}`, safeWidth)];

  const status = counts.in_progress ? "in_progress" : "pending";
  if (counts[status]) {
    const task = tasks.find((item) => item.todos.some((todo) => todo.status === status))!;
    const todo = task.todos.find((item) => item.status === status)!;
    const suffix = counts[status] > 1 ? ` +${counts[status] - 1}` : "";
    const anchor = `   ${todoGlyph(status, options.fallbackGlyphs)} ${task.name} / ${todo.name}`;
    const text = visibleWidth(suffix) >= safeWidth
      ? fit(suffix, safeWidth)
      : `${fit(anchor, safeWidth - visibleWidth(suffix))}${suffix}`;
    lines.push(theme?.fg ? theme.fg(status === "in_progress" ? "text" : "muted", text) : text);
  }

  return lines;
}

export function renderTodoTaskTitle(task: TodoTask, taskIndex: number, selected: boolean, theme: ThemeLike | undefined): string {
  const title = `  ${taskIndex + 1}. ${task.name}`;
  const terminal = task.todos.filter(isTerminal).length;
  const progress = `${TODO_SEPARATOR_GLYPH} ${terminal}/${task.todos.length}`;
  if (!selected) {
    const line = `${title} ${progress}`;
    return theme?.fg ? theme.fg("muted", line) : line;
  }
  const mutedProgress = theme?.fg ? theme.fg("muted", progress) : progress;
  return `${toolTitle(title, theme)} ${mutedProgress}`;
}

function toolTitle(text: string, theme: ThemeLike | undefined): string {
  const bold = theme?.bold ? theme.bold(text) : text;
  return theme?.fg ? theme.fg("toolTitle", bold) : bold;
}

export function renderTodoLine(todo: Todo, theme: ThemeLike | undefined, fallbackGlyphs = false): string {
  const marker = todoGlyph(todo.status, fallbackGlyphs);
  const color = todo.status === "in_progress" ? "text" : todo.status === "completed" ? "success" : "muted";
  const name = isTerminal(todo) && theme?.strikethrough ? theme.strikethrough(todo.name) : todo.name;
  const line = `    ${marker} ${name}`;
  return theme?.fg ? theme.fg(color, line) : line;
}

function isTerminal(todo: Todo): boolean {
  return todo.status === "completed" || todo.status === "cancelled";
}

function fit(line: string, width: number): string {
  return visibleWidth(line) <= width ? line : truncateToWidth(line, width, TODO_TRUNCATION_GLYPH);
}

import { truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";

import { TODO_SEPARATOR_GLYPH, TODO_TRUNCATION_GLYPH, todoGlyph } from "./glyphs.js";
import { countTodoStatuses, todoTasks } from "./format.js";
import type { Todo, TodoState, TodoStatus, TodoTask } from "./types.js";

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
    .map((status) => `${todoGlyph(status, options.fallbackGlyphs)} ${counts[status]}`)
    .join(` ${TODO_SEPARATOR_GLYPH} `);
  const title = toolTitle("Todos", theme);
  const lines = [fit(`${title}  ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} ${TODO_SEPARATOR_GLYPH} ${theme?.fg ? theme.fg("muted", summary) : summary}`, safeWidth)];

  for (const task of tasks) lines.push(renderTodoWidgetTaskRow(task, theme, safeWidth, options));

  return lines;
}

function statusColor(status: TodoStatus): "accent" | "text" | "success" | "error" {
  return ({ in_progress: "accent", pending: "text", completed: "success", cancelled: "error" } as const)[status];
}

function taskColor(task: TodoTask): "accent" | "text" | "success" | "error" | "muted" {
  const todos = task.todos;
  if (todos.some((todo) => todo.status === "in_progress")) return "accent";
  if (todos.some((todo) => todo.status === "pending")) return "text";
  if (todos.some((todo) => todo.status === "completed")) return "success";
  return todos.length ? "error" : "muted";
}

export function renderTodoWidgetTaskRow(
  task: TodoTask, theme: ThemeLike | undefined, width: number, options: TodoWidgetLayoutOptions = {}, prefix = " ",
): string {
  const todo = task.todos.find((item) => item.status === "in_progress") ?? task.todos[0];
  const color = (text: string, token: ReturnType<typeof taskColor>) => theme?.fg ? theme.fg(token, text) : text;
  const title = color(task.name, taskColor(task));
  const text = todo
    ? `${prefix}${color(todoGlyph(todo.status, options.fallbackGlyphs), statusColor(todo.status))} ${title} ${options.fallbackGlyphs ? "›" : "󰄾"} ${color(todo.name, statusColor(todo.status))}`
    : `${prefix}${title}`;
  return fit(text, width);
}

export function renderTodoWidgetTaskName(task: TodoTask, theme: ThemeLike | undefined): string {
  return theme?.fg ? theme.fg(taskColor(task), task.name) : task.name;
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

export function renderTodoWidgetDetailLines(todo: Todo, theme: ThemeLike | undefined, width: number, fallbackGlyphs = false): string[] {
  const glyph = todoGlyph(todo.status, fallbackGlyphs);
  const marker = `   ${glyph} `;
  const label = width > visibleWidth(marker) ? marker : width > 2 ? `${glyph} ` : "";
  const indent = " ".repeat(Math.min(visibleWidth(label), Math.max(0, width - 1)));
  return [
    ...(label ? [] : [fit(glyph, width)]),
    ...wrapTextWithAnsi(todo.name, Math.max(1, width - visibleWidth(label))).map((part, index) => fit(`${index === 0 ? label : indent}${theme?.fg ? theme.fg(statusColor(todo.status), part) : part}`, width)),
    ...wrapTextWithAnsi(todo.description, Math.max(1, width - visibleWidth(indent))).map((part) => fit(`${indent}${theme?.fg ? theme.fg("muted", part) : part}`, width)),
  ];
}

function isTerminal(todo: Todo): boolean {
  return todo.status === "completed" || todo.status === "cancelled";
}

export function fit(line: string, width: number): string {
  return visibleWidth(line) <= width ? line : truncateToWidth(line, width, TODO_TRUNCATION_GLYPH);
}

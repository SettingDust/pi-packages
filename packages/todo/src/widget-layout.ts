import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";

import { TODO_SEPARATOR_GLYPH, TODO_TRUNCATION_GLYPH, WORKING_SPINNER_FRAMES, todoGlyph } from "./glyphs.js";
import { deriveActiveTask } from "./state.js";
import type { Todo, TodoState, TodoTask } from "./types.js";

export type TodoWidgetLayoutOptions = {
  maxVisible?: number;
  fallbackGlyphs?: boolean;
  workingMarker?: string;
};

type ThemeLike = Partial<Pick<Theme, "bold" | "fg" | "strikethrough">>;
type DisplayTodo = Todo & { todoIndex: number };

/** Produces compact widget rows constrained to the supplied display width. */
export function renderTodoWidgetLines(
  state: TodoState | undefined,
  theme: ThemeLike | undefined,
  width: number,
  options: TodoWidgetLayoutOptions = {},
): string[] {
  const safeWidth = Math.max(1, Math.floor(width) || 1);
  const tasks = state?.tasks ?? [];
  const selectedTaskIndex = selectedTodoTaskIndex(tasks);
  if (selectedTaskIndex < 0) return [];
  const activeGroups = tasks.map((task) => task.todos.some((todo) => todo.status === "in_progress"));
  const hasActiveGroups = activeGroups.some(Boolean);
  const maxVisible = boundedMaxVisible(options.maxVisible);
  const lines: string[] = [fit(toolTitle("Todos", theme), safeWidth)];

  for (let taskIndex = 0; taskIndex < tasks.length; taskIndex += 1) {
    const task = tasks[taskIndex];
    const expanded = hasActiveGroups ? activeGroups[taskIndex] : taskIndex === selectedTaskIndex;
    lines.push(fit(renderTodoTaskTitle(task, taskIndex, expanded, theme), safeWidth));

    if (expanded) {
      const selectedTodos = visibleTodos(task.todos, maxVisible);
      for (const todo of selectedTodos) {
        lines.push(fit(renderTodoLine(todo, theme, options.fallbackGlyphs), safeWidth));
      }
      const openTodos = task.todos.filter((todo) => !isTerminal(todo));
      const hidden = openTodos.length - selectedTodos.length;
      if (hidden > 0) lines.push(fit(`    +${hidden} more`, safeWidth));
      const terminalSummary = taskIndex === selectedTaskIndex ? terminalTodoSummary(task.todos) : undefined;
      if (terminalSummary) {
        const line = `    + ${terminalSummary}`;
        lines.push(fit(theme?.fg ? theme.fg("muted", line) : line, safeWidth));
      }
    }
  }

  if (state?.workingOn) {
    lines.push("");
    const working = `${options.workingMarker ?? WORKING_SPINNER_FRAMES[0]} ${state.workingOn}`;
    const text = theme?.fg ? theme.fg("muted", working) : working;
    lines.push(fit(`  ${text}`, safeWidth));
  }

  return lines.map((line) => line ? fit(` ${line}`, safeWidth) : line);
}

export function selectedTodoTaskIndex(tasks: readonly TodoTask[]): number {
  const activeTask = deriveActiveTask(tasks);
  if (activeTask) return tasks.indexOf(activeTask);
  const openTaskIndex = tasks.findIndex((task) => task.todos.some((todo) => !isTerminal(todo)));
  return openTaskIndex >= 0 ? openTaskIndex : lastNonEmptyTaskIndex(tasks);
}

function lastNonEmptyTaskIndex(tasks: readonly TodoTask[]): number {
  for (let index = tasks.length - 1; index >= 0; index -= 1) {
    if (tasks[index].todos.length > 0) return index;
  }
  return -1;
}

function boundedMaxVisible(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 5;
  return Math.max(1, Math.floor(value));
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

function visibleTodos(todos: readonly Todo[], maxVisible: number): DisplayTodo[] {
  const ordered = todos
    .map((todo, todoIndex) => ({ ...todo, todoIndex }))
    .filter((todo) => !isTerminal(todo))
    .sort((left, right) => todoPriority(left) - todoPriority(right) || left.todoIndex - right.todoIndex);
  const active = ordered.filter((todo) => todo.status === "in_progress");
  return active.length > maxVisible ? active : ordered.slice(0, maxVisible);
}

export function renderTodoLine(todo: Todo, theme: ThemeLike | undefined, fallbackGlyphs = false): string {
  const marker = todoGlyph(todo.status, fallbackGlyphs);
  const color = todo.status === "in_progress" ? "text" : todo.status === "completed" ? "success" : "muted";
  const name = isTerminal(todo) && theme?.strikethrough
    ? theme.strikethrough(todo.name)
    : todo.name;
  const line = `    ${marker} ${name}`;
  return theme?.fg ? theme.fg(color, line) : line;
}

function terminalTodoSummary(todos: readonly Todo[]): string | undefined {
  const completed = todos.filter((todo) => todo.status === "completed").length;
  const cancelled = todos.filter((todo) => todo.status === "cancelled").length;
  const parts = [
    ...(completed ? [`${completed} complete ${completed === 1 ? "todo" : "todos"}`] : []),
    ...(cancelled ? [`${cancelled} cancelled ${cancelled === 1 ? "todo" : "todos"}`] : []),
  ];
  return parts.length > 0 ? parts.join(` ${TODO_SEPARATOR_GLYPH} `) : undefined;
}

function isTerminal(todo: Todo): boolean {
  return todo.status === "completed" || todo.status === "cancelled";
}

function todoPriority(todo: Todo): number {
  return todo.status === "in_progress" ? 0 : todo.status === "pending" ? 1 : 2;
}

function fit(line: string, width: number): string {
  return visibleWidth(line) <= width ? line : truncateToWidth(line, width, TODO_TRUNCATION_GLYPH);
}

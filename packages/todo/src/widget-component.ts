import { Key, matchesKey, visibleWidth, type Component, type TUI } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";

import type { TodoState } from "./types.js";
import { fit, renderTodoWidgetDetailLines, renderTodoWidgetLines, renderTodoWidgetTaskName, renderTodoWidgetTaskRow, type TodoWidgetLayoutOptions } from "./widget-layout.js";

type TodoWidgetComponentOptions = TodoWidgetLayoutOptions & {
  blankLineBelow?: boolean;
  expandedTasks?: ReadonlySet<string>;
};

const EXPAND_GLYPHS = { nerd: { open: "󰅀", closed: "󰅂" }, fallback: { open: "▾", closed: "▸" } } as const;

/** The mounted widget owns presentation state; coordinator state remains read-only. */
export class TodoWidgetComponent implements Component {
  private selected = -1;
  private readonly expanded: Set<string>;
  private offset = 0;
  private width = 1;
  private viewportHeight = 1;
  private active = false;
  private disposed = false;

  constructor(
    private readonly state: TodoState,
    private readonly theme: Theme | undefined,
    private readonly options: TodoWidgetComponentOptions = {},
    private readonly tui?: Pick<TUI, "requestRender" | "terminal">,
    private readonly onDispose?: () => void,
    private readonly onUnavailable?: () => void,
  ) {
    this.expanded = new Set(state.tasks.filter((task) => options.expandedTasks?.has(task.name)).map((task) => task.name));
  }

  expandedTasks(): Set<string> {
    return new Set(this.expanded);
  }

  start(): boolean {
    if (this.disposed || (this.tui?.terminal?.rows ?? 0) < 8) return false;
    const tasks = this.state.tasks;
    this.selected = tasks.findIndex((task) => task.todos.some((todo) => todo.status === "in_progress"));
    if (this.selected < 0) this.selected = tasks.findIndex((task) => task.todos.some((todo) => todo.status === "pending"));
    if (this.selected < 0) this.selected = tasks.findIndex((task) => task.todos.length > 0);
    if (this.selected < 0 && tasks.length) this.selected = 0;
    this.active = true;
    const { lines, headers } = this.layout();
    this.offset = this.clamp(headers[this.selected] ?? 0, lines.length);
    this.tui?.requestRender();
    return true;
  }

  end(): void {
    if (!this.active) return;
    this.active = false;
    this.selected = -1;
    this.tui?.requestRender();
  }

  handleKey(data: string): boolean {
    if (!this.active || this.disposed) return false;
    if ((this.tui?.terminal?.rows ?? 0) < 8) {
      this.onUnavailable?.();
      this.end();
      return false;
    }
    const keys = [Key.up, Key.down, Key.left, Key.right, Key.enter, Key.space, Key.pageUp, Key.pageDown];
    if (!keys.some((key) => matchesKey(data, key))) return false;
    const { lines } = this.layout();
    this.offset = this.clamp(this.offset, lines.length);
    const before = this.offset;
    const selected = this.selected;
    if (matchesKey(data, Key.pageUp)) this.offset = this.clamp(this.offset - this.viewportHeight, lines.length);
    else if (matchesKey(data, Key.pageDown)) this.offset = this.clamp(this.offset + this.viewportHeight, lines.length);
    else if (matchesKey(data, Key.up) && this.selected >= 0) this.selected = Math.max(0, this.selected - 1);
    else if (matchesKey(data, Key.down) && this.selected >= 0) this.selected = Math.min(this.state.tasks.length - 1, this.selected + 1);
    else if (this.selected >= 0) {
      const name = this.state.tasks[this.selected]!.name;
      if (matchesKey(data, Key.left)) this.expanded.delete(name);
      else if (matchesKey(data, Key.right)) this.expanded.add(name);
      else if (matchesKey(data, Key.enter) || matchesKey(data, Key.space)) {
        if (this.expanded.has(name)) this.expanded.delete(name);
        else this.expanded.add(name);
      }
    }
    if (!matchesKey(data, Key.pageUp) && !matchesKey(data, Key.pageDown)) {
      const next = this.layout();
      this.offset = this.clamp(this.offset, next.lines.length);
      const row = next.headers[this.selected];
      if (row !== undefined) {
        if (row < this.offset) this.offset = row;
        else if (row >= this.offset + this.viewportHeight) this.offset = row - this.viewportHeight + 1;
      }
    }
    if (this.offset !== before || this.selected !== selected || matchesKey(data, Key.enter) || matchesKey(data, Key.space) || matchesKey(data, Key.left) || matchesKey(data, Key.right)) this.tui?.requestRender();
    return true;
  }

  invalidate(): void {}

  render(width: number): string[] {
    this.width = Math.max(1, Math.floor(width) || 1);
    if (this.active && (this.tui?.terminal?.rows ?? 0) < 8) {
      this.onUnavailable?.();
      this.end();
    }
    const { blankLineBelow, ...layoutOptions } = this.options;
    if (!this.active && !this.expanded.size) {
      const lines = renderTodoWidgetLines(this.state, this.theme, this.width, layoutOptions);
      if (blankLineBelow && lines.length > 0) lines.push("");
      return lines;
    }
    const { lines } = this.layout();
    this.offset = this.clamp(this.offset, lines.length);
    const summary = renderTodoWidgetLines(this.state, this.theme, this.width, layoutOptions)[0]!;
    const body = lines.slice(this.offset, this.offset + this.viewportHeight);
    return [summary, ...body];
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.end();
    this.onDispose?.();
  }

  private clamp(value: number, length: number): number {
    return Math.max(0, Math.min(value, Math.max(0, length - this.viewportHeight)));
  }

  private layout(): { lines: string[]; headers: number[] } {
    const rows = this.tui?.terminal?.rows ?? 24;
    this.viewportHeight = Math.max(1, Math.min(Math.floor(rows * 0.4) - 1, rows - 7));
    const lines: string[] = [];
    const headers: number[] = [];
    this.state.tasks.forEach((task, index) => {
      headers[index] = lines.length;
      const glyphs = this.options.fallbackGlyphs ? EXPAND_GLYPHS.fallback : EXPAND_GLYPHS.nerd;
      const prefix = ` ${this.expanded.has(task.name) ? glyphs.open : glyphs.closed} `;
      const row = this.expanded.has(task.name)
        ? fit(`${prefix}${renderTodoWidgetTaskName(task, this.theme)}`, this.width)
        : renderTodoWidgetTaskRow(task, this.theme, this.width, this.options, prefix);
      lines.push(index === this.selected && this.active && this.theme?.bg
        ? this.theme.bg("selectedBg", row + " ".repeat(Math.max(0, this.width - visibleWidth(row))))
        : row);
      if (this.expanded.has(task.name)) {
        for (const todo of task.todos) lines.push(...renderTodoWidgetDetailLines(todo, this.theme, this.width, this.options.fallbackGlyphs));
      }
    });
    if (!lines.length) lines.push(fit(" No todos", this.width));
    return { lines, headers };
  }
}

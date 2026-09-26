import type { Theme } from "@earendil-works/pi-coding-agent";
import {
  Key, matchesKey, MouseRegion, Text, truncateToWidth, visibleWidth, wrapTextWithAnsi,
  type Component, type KeybindingsManager, type TUI, type TuiMouseEvent, type TuiMouseEventResult,
} from "@earendil-works/pi-tui";

import { TODO_SEPARATOR_GLYPH, TODO_TRUNCATION_GLYPH, todoGlyph } from "./glyphs.js";
import type { TodoState } from "./types.js";

/** One open overlay owns its cursor, expansion and scroll position. The snapshot is read-only. */
export class TodoDetailOverlay implements Component {
  private selected = -1;
  private readonly expanded = new Set<number>();
  private offset = 0;
  private width = 1;
  private viewportHeight = 1;
  private renderHeight = 1;
  private bodyLength = 0;
  private readonly regions = new Map<number, MouseRegion>();
  private closed = false;

  constructor(
    private readonly state: TodoState,
    private readonly tui: TUI,
    private readonly theme: Theme,
    private readonly keybindings: KeybindingsManager,
    private readonly done: (value: undefined) => void,
    private readonly fallbackGlyphs = false,
  ) {
    const tasks = state.tasks;
    this.selected = tasks.findIndex((task) => task.todos.some((todo) => todo.status === "in_progress"));
    if (this.selected >= 0) {
      tasks.forEach((task, index) => {
        if (task.todos.some((todo) => todo.status === "in_progress")) this.expanded.add(index);
      });
    } else {
      this.selected = tasks.findIndex((task) => task.todos.some((todo) => todo.status === "pending"));
      if (this.selected < 0) this.selected = tasks.findIndex((task) => task.todos.length > 0);
      if (this.selected < 0 && tasks.length) this.selected = 0;
      if (this.selected >= 0) this.expanded.add(this.selected);
    }
  }

  render(width: number): string[] {
    this.width = Math.max(1, Math.floor(width) || 1);
    const { lines, headers } = this.layout();
    this.offset = this.clamp(this.offset, lines.length);
    this.bodyLength = lines.length;
    this.renderHeight = this.viewportHeight + (this.height() > 1 ? 1 : 0);
    this.regions.clear();

    const body = lines.slice(this.offset, this.offset + this.viewportHeight);
    while (body.length < this.viewportHeight) body.push("");
    for (const [index, row] of headers) {
      const visibleRow = row - this.offset;
      if (visibleRow < 0 || visibleRow >= this.viewportHeight) continue;
      const line = body[visibleRow]!;
      this.regions.set(visibleRow + (this.height() > 1 ? 1 : 0), new MouseRegion(new Text(line, 0, 0), (event) => {
        if (event.type !== "click" || event.button !== "left") return undefined;
        this.selected = index;
        this.toggleTask(index);
        return { handled: true, render: false };
      }));
    }
    if (this.height() === 1) return body;
    const title = ` Todo details ${TODO_SEPARATOR_GLYPH} ${this.state.tasks.length} tasks  Up/Down select  Left/Right expand  PgUp/PgDn scroll  Esc close`;
    return [this.fit(this.theme.fg("toolTitle", this.theme.bold(title))), ...body];
  }

  handleInput(data: string): void {
    if (this.closed) return;
    if (matchesKey(data, Key.escape)) {
      this.closed = true;
      this.done(undefined);
      return;
    }
    const oldOffset = this.offset;
    const oldSelected = this.selected;
    const { lines, headers } = this.layout();
    this.offset = this.clamp(this.offset, lines.length);

    if (this.keybindings.matches(data, "tui.select.pageUp")) {
      this.offset = this.clamp(this.offset - Math.max(1, this.viewportHeight - 1), lines.length);
    } else if (this.keybindings.matches(data, "tui.select.pageDown")) {
      this.offset = this.clamp(this.offset + Math.max(1, this.viewportHeight - 1), lines.length);
    } else if (this.keybindings.matches(data, "tui.select.up")) {
      if (this.selected >= 0) this.selected = Math.max(0, this.selected - 1);
      this.reveal(headers, lines.length);
    } else if (this.keybindings.matches(data, "tui.select.down")) {
      if (this.selected >= 0) this.selected = Math.min(this.state.tasks.length - 1, this.selected + 1);
      this.reveal(headers, lines.length);
    } else if (matchesKey(data, Key.home)) {
      if (this.selected >= 0) this.selected = 0;
      this.reveal(headers, lines.length);
    } else if (matchesKey(data, Key.end)) {
      if (this.selected >= 0) this.selected = this.state.tasks.length - 1;
      this.reveal(headers, lines.length);
    } else if (matchesKey(data, Key.left) || matchesKey(data, Key.right) ||
      matchesKey(data, Key.space) || this.keybindings.matches(data, "tui.select.confirm")) {
      if (this.selected < 0) return;
      const expanded = this.expanded.has(this.selected);
      const toggle = matchesKey(data, Key.space) || this.keybindings.matches(data, "tui.select.confirm");
      if (toggle || (matchesKey(data, Key.left) && expanded) || (matchesKey(data, Key.right) && !expanded)) {
        this.toggleTask(this.selected);
        return;
      }
      this.reveal(headers, lines.length);
    } else {
      return;
    }
    if (this.offset !== oldOffset || this.selected !== oldSelected) this.tui.requestRender();
  }

  handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
    if (this.closed || event.x < 0 || event.x >= this.width || event.y < 0 || event.y >= this.renderHeight) return undefined;
    if (event.type === "wheel") {
      const next = this.clamp(this.offset + (event.wheelDelta ?? 0), this.bodyLength);
      if (next !== this.offset) {
        this.offset = next;
        this.tui.requestRender();
      }
      return { handled: true, render: false };
    }
    const region = this.regions.get(event.y);
    if (!region || event.type !== "click" || event.button !== "left") return undefined;
    return region.handleMouse({ ...event, y: 0, height: 1, width: this.width });
  }

  invalidate(): void {
    this.regions.clear();
  }

  dispose(): void {
    this.closed = true;
    this.regions.clear();
    this.expanded.clear();
    this.bodyLength = 0;
  }

  private height(): number {
    const rows = this.tui.terminal.rows;
    return Math.max(1, Math.min(Math.floor(rows * 0.8), Math.max(1, rows - 2)));
  }

  private clamp(value: number, bodyLength: number): number {
    return Math.max(0, Math.min(value, Math.max(0, bodyLength - this.viewportHeight)));
  }

  private reveal(headers: Map<number, number>, bodyLength: number): void {
    const row = headers.get(this.selected);
    if (row === undefined) return;
    if (row < this.offset) this.offset = row;
    else if (row >= this.offset + this.viewportHeight) this.offset = row - this.viewportHeight + 1;
    this.offset = this.clamp(this.offset, bodyLength);
  }

  private toggleTask(index: number): void {
    if (this.expanded.has(index)) this.expanded.delete(index);
    else this.expanded.add(index);
    const { lines, headers } = this.layout();
    this.offset = this.clamp(this.offset, lines.length);
    this.reveal(headers, lines.length);
    this.tui.requestRender();
  }

  private fit(line: string): string {
    return visibleWidth(line) <= this.width ? line : truncateToWidth(line, this.width, TODO_TRUNCATION_GLYPH);
  }

  private layout(): { lines: string[]; headers: Map<number, number> } {
    const height = this.height();
    this.viewportHeight = Math.max(1, height - (height > 1 ? 1 : 0));
    const lines: string[] = [];
    const headers = new Map<number, number>();
    if (!this.state.tasks.length) lines.push(this.fit(" No todos"));
    this.state.tasks.forEach((task, index) => {
      headers.set(index, lines.length);
      const complete = task.todos.filter((todo) => todo.status === "completed" || todo.status === "cancelled").length;
      const prefix = `${index === this.selected ? ">" : " "} ${this.expanded.has(index) ? "[-]" : "[+]"} `;
      const text = this.fit(`${prefix}${task.name} ${TODO_SEPARATOR_GLYPH} ${complete}/${task.todos.length}`);
      lines.push(index === this.selected ? this.theme.fg("accent", this.theme.bold(text)) : this.theme.fg("muted", text));
      if (!this.expanded.has(index)) return;
      for (const todo of task.todos) {
        const label = this.width >= 5 ? `  ${todoGlyph(todo.status, this.fallbackGlyphs)} ` : "";
        for (const part of wrapTextWithAnsi(todo.name, Math.max(1, this.width - visibleWidth(label)))) {
          lines.push(this.fit(`${label}${part}`));
        }
        const indent = this.width >= 5 ? "    " : "";
        for (const part of wrapTextWithAnsi(todo.description, Math.max(1, this.width - visibleWidth(indent)))) {
          lines.push(this.fit(`${indent}${this.theme.fg("muted", part)}`));
        }
      }
    });
    return { lines, headers };
  }
}

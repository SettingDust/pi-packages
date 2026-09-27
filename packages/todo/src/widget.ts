import { isKeyRelease, Key, matchesKey, type Component, type TUI } from "@earendil-works/pi-tui";
import type { TerminalInputHandler, Theme } from "@earendil-works/pi-coding-agent";

import type { TodoSettings } from "./settings.js";
import type { TodoState } from "./types.js";
import { TodoWidgetComponent } from "./widget-component.js";

export type TodoWidgetSettings = Partial<Pick<TodoSettings, "widgetPlacement" | "maxVisibleTasks" | "fallbackGlyphs">>;

type WidgetComponentFactory = (tui: TUI, theme: Theme) => Component & { dispose?(): void };
type TodoWidgetUI = {
  notify?: (message: string, level?: "info" | "warning" | "error") => void;
  onTerminalInput?: (handler: TerminalInputHandler) => () => void;
  setWidget?: {
    (id: string, content: string[] | undefined, options?: { placement?: "belowEditor" | "aboveEditor" }): void;
    (id: string, content: WidgetComponentFactory | undefined, options?: { placement?: "belowEditor" | "aboveEditor" }): void;
  };
};

const TERMINAL_WIDGET_DELAY_MS = 5_000;
export type TodoWidgetLifecycle = {
  hadOpenTodos: boolean;
  terminalClearTimer?: ReturnType<typeof setTimeout>;
  component?: TodoWidgetComponent;
  unsubscribe?: () => void;
};
const widgetLifecycles = new WeakMap<TodoWidgetUI, TodoWidgetLifecycle>();
export const createTodoWidgetLifecycle = (): TodoWidgetLifecycle => ({ hadOpenTodos: false });

export type TodoWidgetContext = { mode?: string; hasUI?: boolean; isIdle?: () => boolean; ui?: TodoWidgetUI };

function exit(lifecycle: TodoWidgetLifecycle): void {
  const unsubscribe = lifecycle.unsubscribe;
  lifecycle.unsubscribe = undefined;
  unsubscribe?.();
  lifecycle.component?.end();
}

function retire(lifecycle: TodoWidgetLifecycle): void {
  exit(lifecycle);
  lifecycle.component = undefined;
}

export function resetTodoWidgetLifecycle(ctx: TodoWidgetContext | undefined, owned?: TodoWidgetLifecycle): void {
  const lifecycle = owned ?? (ctx?.ui ? widgetLifecycles.get(ctx.ui) : undefined);
  if (!lifecycle) return;
  retire(lifecycle);
  cancelTerminalClear(lifecycle);
  lifecycle.hadOpenTodos = false;
  if (ctx?.ui) widgetLifecycles.delete(ctx.ui);
}

/** Enter only the currently mounted above-editor widget; no other surface is created. */
export function enterTodoWidget(ctx: TodoWidgetContext | undefined, settings: TodoWidgetSettings, owned?: TodoWidgetLifecycle): void {
  const ui = ctx?.ui;
  const lifecycle = owned ?? (ui ? widgetLifecycles.get(ui) : undefined);
  if (ctx?.mode !== "tui") {
    ui?.notify?.("Todo details require the interactive TUI.", "warning");
    return;
  }
  if (!ctx.hasUI || settings.widgetPlacement === "off" || settings.widgetPlacement === "belowEditor" || !lifecycle?.component || !ui?.onTerminalInput) {
    ui?.notify?.("Todo details require a visible above-editor widget.", "warning");
    return;
  }
  if (lifecycle.unsubscribe) return;
  const component = lifecycle.component;
  if (!component.start()) {
    ui.notify?.("Todo details need more terminal space.", "warning");
    return;
  }
  const listener: TerminalInputHandler = (data) => {
    if (lifecycle.component !== component || !lifecycle.unsubscribe) return;
    if (isKeyRelease(data)) return;
    try {
      if (data.includes("\x1b[200~")) {
        exit(lifecycle);
        return;
      }
      if (matchesKey(data, Key.escape)) {
        exit(lifecycle);
        return { consume: true };
      }
      if (component.handleKey(data)) return { consume: true };
      // A passthrough key may open another Host surface; release before it is dispatched.
      exit(lifecycle);
    } catch (error) {
      exit(lifecycle);
      notifyWidgetError(ui, error);
    }
  };
  try {
    lifecycle.unsubscribe = ui.onTerminalInput(listener);
  } catch (error) {
    component.end();
    notifyWidgetError(ui, error);
  }
}

/** Update (or clear) the persistent todo widget without requiring the host UI at runtime. */
export function updateTodoWidget(ctx: TodoWidgetContext | undefined, state: TodoState | undefined, settings: TodoWidgetSettings = {}, owned?: TodoWidgetLifecycle): void {
  if (!ctx?.hasUI || !ctx.ui?.setWidget) return;
  const ui = ctx.ui;
  const lifecycle = owned ?? widgetLifecycles.get(ui) ?? createTodoWidgetLifecycle();
  const expandedTasks = lifecycle.component?.expandedTasks();
  retire(lifecycle);

  try {
    const placement = settings.widgetPlacement ?? "aboveEditor";
    if (placement === "off") {
      cancelTerminalClear(lifecycle);
      lifecycle.hadOpenTodos = false;
      widgetLifecycles.delete(ui);
      ui.setWidget!("todo", undefined);
      return;
    }

    const hasTodos = state?.tasks.some((task) => task.todos.length > 0) ?? false;
    const hasOpenTodos = state?.tasks.some((task) => task.todos.some((todo) => todo.status === "pending" || todo.status === "in_progress")) ?? false;
    const showFinalState = hasTodos && !hasOpenTodos && (lifecycle.hadOpenTodos || lifecycle.terminalClearTimer !== undefined);
    const visibleState = hasOpenTodos || showFinalState ? state : undefined;
    const factory: WidgetComponentFactory | undefined = visibleState
      ? (tui, theme) => {
          const component = new TodoWidgetComponent(visibleState, theme, {
            maxVisible: settings.maxVisibleTasks,
            fallbackGlyphs: settings.fallbackGlyphs,
            blankLineBelow: placement === "aboveEditor",
            expandedTasks: placement === "aboveEditor" ? expandedTasks : undefined,
          }, tui, () => { if (lifecycle.component === component) retire(lifecycle); }, () => exit(lifecycle));
          if (placement === "aboveEditor") lifecycle.component = component;
          return component;
        }
      : undefined;
    ui.setWidget!("todo", factory, { placement });

    if (hasOpenTodos) {
      cancelTerminalClear(lifecycle);
      lifecycle.hadOpenTodos = true;
      widgetLifecycles.set(ui, lifecycle);
    } else if (showFinalState) {
      lifecycle.hadOpenTodos = false;
      if (!lifecycle.terminalClearTimer) {
        const timer = setTimeout(() => {
          if (owned ? owned === lifecycle : widgetLifecycles.get(ui) === lifecycle) {
            retire(lifecycle);
            widgetLifecycles.delete(ui);
            clearWidget(ui);
          }
          delete lifecycle.terminalClearTimer;
        }, TERMINAL_WIDGET_DELAY_MS);
        timer.unref?.();
        lifecycle.terminalClearTimer = timer;
      }
      widgetLifecycles.set(ui, lifecycle);
    } else {
      cancelTerminalClear(lifecycle);
      lifecycle.hadOpenTodos = false;
      widgetLifecycles.delete(ui);
    }
  } catch (error) {
    retire(lifecycle);
    cancelTerminalClear(lifecycle);
    lifecycle.hadOpenTodos = false;
    widgetLifecycles.delete(ui);
    notifyWidgetError(ui, error);
  }
}

function cancelTerminalClear(lifecycle: TodoWidgetLifecycle): void {
  if (lifecycle.terminalClearTimer) clearTimeout(lifecycle.terminalClearTimer);
  delete lifecycle.terminalClearTimer;
}

function clearWidget(ui: TodoWidgetUI): void {
  try {
    ui.setWidget?.("todo", undefined);
  } catch (error) {
    notifyWidgetError(ui, error);
  }
}

function notifyWidgetError(ui: TodoWidgetUI, error: unknown): void {
  try {
    ui.notify?.(`Todo widget update failed: ${error instanceof Error ? error.message : String(error)}`, "warning");
  } catch {
    return;
  }
}

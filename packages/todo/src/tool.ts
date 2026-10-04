import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { Container, Key, Text } from "@earendil-works/pi-tui";
import { formatTodoCompactionContext, formatTodoSize, todoTasks } from "./format.js";
import { restoreTodoState } from "./persistence.js";
import {
  beginReminderAgentRun,
  consumeDueReminder,
  createReminderCadenceState,
  noteReminderTurn,
  noteTodoInteraction,
  type ReminderCadenceConfig,
} from "./reminder-cadence.js";
import { formatTodoReminder } from "./reminder.js";
import { renderResult as renderTodoResult } from "./renderer.js";
import { renderTodoLine } from "./widget-layout.js";
import type { TodoStatus } from "./types.js";
import {
  TodoAddParamsSchema,
  TodoRemoveParamsSchema,
  TodoSetParamsSchema,
  TodoTransitionParamsSchema,
  TodoViewParamsSchema,
} from "./schema.js";
import { DEFAULT_TODO_SETTINGS, loadTodoSettings, type TodoSettings } from "./settings.js";
import {
  applyTodoAdd,
  applyTodoRemove,
  applyTodoSet,
  applyTodoTransition,
  cloneTodoState,
  createTodoState,
  parseTodoViewRequest,
} from "./state.js";
import type { TodoResult, TodoState } from "./types.js";
import { createTodoWidgetLifecycle, enterTodoWidget, resetTodoWidgetLifecycle, updateTodoWidget } from "./widget.js";

type TodoSuccess = { result: TodoResult; snapshot: TodoState };
type TodoFailure = { result: "error"; error: { code: string; message: string } };
type TodoResponse = TodoSuccess | TodoFailure;

class TodoCoordinator {
  private state = createTodoState();
  private queue: Promise<void> = Promise.resolve();
  readonly widgetLifecycle = createTodoWidgetLifecycle();

  restore(ctx: ExtensionContext, settings: TodoSettings): void {
    resetTodoWidgetLifecycle(ctx, this.widgetLifecycle);
    this.state = restoreTodoState(ctx);
    updateTodoWidget(ctx, this.state, settings, this.widgetLifecycle);
  }

  shutdown(): void {
    resetTodoWidgetLifecycle(undefined, this.widgetLifecycle);
  }

  snapshot(): TodoState {
    return cloneTodoState(this.state);
  }

  run(operation: () => TodoSuccess): Promise<TodoSuccess> {
    const pending = this.queue.then(operation);
    this.queue = pending.then(() => undefined, () => undefined);
    return pending;
  }

  set(request: unknown, ctx: ExtensionContext, settings: TodoSettings): Promise<TodoSuccess> {
    return this.run(() => this.commit("set", applyTodoSet(request as never), ctx, settings));
  }

  add(request: unknown, ctx: ExtensionContext, settings: TodoSettings): Promise<TodoSuccess> {
    return this.run(() => this.commit("add", applyTodoAdd(this.state, request as never), ctx, settings));
  }

  transition(request: unknown, ctx: ExtensionContext, settings: TodoSettings): Promise<TodoSuccess> {
    return this.run(() => this.commit("transition", applyTodoTransition(this.state, request as never), ctx, settings));
  }

  remove(request: unknown, ctx: ExtensionContext, settings: TodoSettings): Promise<TodoSuccess> {
    return this.run(() => this.commit("remove", applyTodoRemove(this.state, request as never), ctx, settings));
  }

  view(request: unknown): Promise<TodoSuccess> {
    return this.run(() => {
      parseTodoViewRequest(request);
      return { result: "view", snapshot: cloneTodoState(this.state) };
    });
  }

  private commit(result: TodoResult, candidate: TodoState, ctx: ExtensionContext, settings: TodoSettings): TodoSuccess {
    if (result === "set") resetTodoWidgetLifecycle(ctx, this.widgetLifecycle);
    this.state = candidate;
    const snapshot = cloneTodoState(this.state);
    updateTodoWidget(ctx, snapshot, settings, this.widgetLifecycle);
    return { result, snapshot };
  }
}

type TodoRenderInput = {
  details?: { result?: TodoResult; snapshot?: TodoState };
  content?: readonly { type?: string; text?: string }[];
};

function reminderConfig(settings: TodoSettings): ReminderCadenceConfig {
  return {
    minTurns: settings.reminderMinTurns,
    maxTurns: settings.reminderMaxTurns,
    outputTokens: settings.reminderOutputTokens,
    maxPerRun: settings.reminderMaxPerRun,
  };
}

function renderCallContent(
  action: TodoResult,
  args: unknown,
  state: TodoState,
  theme: Partial<Pick<Theme, "bold" | "fg" | "strikethrough">>,
  fallbackGlyphs: boolean,
  partial = false,
): string {
  const identity = `todo_${action} ${action}`;
  const title = theme.bold ? theme.bold(identity) : identity;
  const coloredTitle = theme.fg ? theme.fg("toolTitle", title) : title;
  const summary = pendingSummary(args, state);
  const lines = [coloredTitle, partial && theme.fg ? theme.fg("muted", summary) : summary];
  const input = (args ?? {}) as {
    tasks?: readonly { name?: string; todos?: readonly { name?: string; description?: string }[] }[];
    task?: string;
    todos?: readonly { name?: string; description?: string }[];
    transitions?: readonly { task?: string; todo?: string; status?: TodoStatus }[];
    removals?: readonly { task?: string; todo?: string }[];
  };

  if (action === "set" && Array.isArray(input.tasks)) {
    for (const task of input.tasks) {
      if (typeof task?.name !== "string") continue;
      lines.push(`  ${task.name}`);
      for (const todo of task.todos ?? []) {
        if (typeof todo?.name !== "string") continue;
        lines.push(renderTodoLine({ name: todo.name, description: todo.description ?? "", status: "pending" }, theme, fallbackGlyphs));
      }
    }
  } else if (action === "add" && typeof input.task === "string") {
    lines.push(`  ${input.task}`);
    for (const todo of input.todos ?? []) {
      if (typeof todo?.name !== "string") continue;
      lines.push(renderTodoLine({ name: todo.name, description: todo.description ?? "", status: "pending" }, theme, fallbackGlyphs));
    }
  } else if (action === "transition") {
    for (const transition of input.transitions ?? []) {
      if (typeof transition.todo !== "string" || !transition.status) continue;
      const task = typeof transition.task === "string" ? `${transition.task}: ` : "";
      lines.push(`${task}${renderTodoLine({ name: transition.todo, description: "", status: transition.status }, theme, fallbackGlyphs)}`);
    }
  } else if (action === "remove" && Array.isArray(input.removals)) {
    for (const removal of input.removals) {
      if (typeof removal?.task !== "string" || ("todo" in removal && typeof removal.todo !== "string")) continue;
      lines.push(typeof removal.todo === "string" ? `  ${removal.task}: ${removal.todo}` : `  ${removal.task} (entire task)`);
    }
  }

  return lines.join("\n");
}

function pendingSummary(args: unknown, state: TodoState): string {
  const input = (args ?? {}) as { tasks?: unknown[]; task?: unknown; todos?: unknown[] };
  if (Array.isArray(input.tasks)) {
    const count = input.tasks.reduce<number>((total, task) => total + (task && typeof task === "object" && Array.isArray((task as { todos?: unknown }).todos) ? (task as { todos: unknown[] }).todos.length : 0), 0);
    return formatTodoSize(input.tasks.length, count);
  }
  if (Array.isArray(input.todos)) {
    const createsTask = typeof input.task === "string" && !state.tasks.some((task) => task.name === input.task);
    return formatTodoSize(state.tasks.length + (createsTask ? 1 : 0), todoTasks(state).length + input.todos.length);
  }
  return formatTodoSize(state.tasks.length, todoTasks(state).length);
}

function registerHandler(
  pi: ExtensionAPI,
  coordinator: TodoCoordinator,
  result: TodoResult,
  description: string,
  parameters: any,
  execute: (params: unknown, ctx: ExtensionContext) => Promise<TodoSuccess>,
  getSettings: () => Readonly<TodoSettings>,
  onSuccess: (result: TodoResult) => void,
): void {
  pi.registerTool({
    name: `todo_${result}`,
    label: `Todo ${result}`,
    description,
    parameters,
    execute: async (_toolCallId, params, _signal, _onUpdate, ctx) => {
      let details: TodoResponse;
      try {
        details = await execute(params, ctx);
        onSuccess(details.result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid Todo request.";
        details = { result: "error", error: { code: errorCode(message), message } };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(details) }], details };
    },
    renderCall(args: unknown, theme: Partial<Pick<Theme, "fg">>, context: { isPartial?: boolean; isError?: boolean }) {
      return new Text(renderCallContent(result, args, coordinator.snapshot(), theme, getSettings().fallbackGlyphs, context.isPartial), 0, 0);
    },
    renderResult(resultValue: any, options: any, theme: any, context: any) {
      if (options.isPartial && !context.isError) return new Container();
      return renderTodoResult(resultValue, options, theme, { fallbackGlyphs: getSettings().fallbackGlyphs });
    },
  });
}

function errorCode(message: string): string {
  if (message.includes("does not exist")) return "not_found";
  if (message.includes("Duplicate")) return "duplicate";
  return "invalid_request";
}

export function registerTodoTools(pi: ExtensionAPI): void {
  const coordinator = new TodoCoordinator();
  let settings: TodoSettings = { ...DEFAULT_TODO_SETTINGS };
  let reminderCadence = createReminderCadenceState();
  let pendingCompactionContext: string | undefined;
  let interactedWithTodoThisTurn = false;

  const resetReminderTracking = (): void => {
    reminderCadence = createReminderCadenceState();
    interactedWithTodoThisTurn = false;
  };

  pi.on("session_start", async (_event, ctx) => {
    const loaded = await loadTodoSettings(ctx);
    settings = loaded.settings;
    if (loaded.warning) ctx.ui?.notify?.(loaded.warning, "warning");
    coordinator.restore(ctx, settings);
    pendingCompactionContext = undefined;
    resetReminderTracking();
  });
  pi.on("session_tree", (_event, ctx) => {
    coordinator.restore(ctx, settings);
    pendingCompactionContext = undefined;
    resetReminderTracking();
  });
  pi.on("session_compact", () => {
    pendingCompactionContext = formatTodoCompactionContext(coordinator.snapshot());
    if (pendingCompactionContext) reminderCadence = noteTodoInteraction(reminderCadence);
  });
  pi.on("session_shutdown", () => coordinator.shutdown());
  pi.on("before_agent_start", () => { reminderCadence = beginReminderAgentRun(reminderCadence); });
  pi.on("agent_start", (_event, ctx) => updateTodoWidget(ctx, coordinator.snapshot(), settings, coordinator.widgetLifecycle));
  pi.on("agent_settled", (_event, ctx) => updateTodoWidget(ctx, coordinator.snapshot(), settings, coordinator.widgetLifecycle));
  pi.on("turn_end", (event) => {
    reminderCadence = interactedWithTodoThisTurn ? noteTodoInteraction(reminderCadence) : noteReminderTurn(reminderCadence, event.message.role === "assistant" ? event.message.usage?.output ?? 0 : 0);
    interactedWithTodoThisTurn = false;
  });
  pi.on("context", (event) => {
    if (pendingCompactionContext) {
      const content = pendingCompactionContext;
      pendingCompactionContext = undefined;
      return { messages: [...event.messages, { role: "user", content, timestamp: Date.now() }] };
    }
    if (!settings.dynamicReminders) return;
    const reminder = formatTodoReminder(coordinator.snapshot());
    if (!reminder) return;
    const consumed = consumeDueReminder(reminderCadence, reminderConfig(settings));
    if (!consumed.due) return;
    reminderCadence = consumed.state;
    return { messages: [...event.messages, { role: "user", content: reminder, timestamp: Date.now() }] };
  });

  const openTodoDetails = (ctx: ExtensionContext): void => enterTodoWidget(ctx, settings, coordinator.widgetLifecycle);
  pi.registerCommand("todo-details", { description: "Open Todo details", handler: async (_args, ctx) => openTodoDetails(ctx) });
  pi.registerShortcut(Key.ctrlShift("t"), { description: "Open Todo details", handler: openTodoDetails });

  const markInteraction = (result: TodoResult): void => {
    if (result !== "view") interactedWithTodoThisTurn = true;
  };
  const getSettings = (): Readonly<TodoSettings> => settings;
  registerHandler(pi, coordinator, "set", "Replace the complete Todo state.", TodoSetParamsSchema, (params, ctx) => coordinator.set(params, ctx, settings), getSettings, markInteraction);
  registerHandler(pi, coordinator, "add", "Append pending todos to an exact, case-sensitive task, or create it at the end if missing.", TodoAddParamsSchema, (params, ctx) => coordinator.add(params, ctx, settings), getSettings, markInteraction);
  registerHandler(pi, coordinator, "transition", "Change Todo statuses by exact task and todo name.", TodoTransitionParamsSchema, (params, ctx) => coordinator.transition(params, ctx, settings), getSettings, markInteraction);
  registerHandler(pi, coordinator, "remove", "Atomically remove exact, case-sensitive todos ({task,todo}) or entire task groups ({task}) in one non-empty disjoint batch. All statuses are removable; caller owns cleanup eligibility and target stability. Missing, duplicate, overlapping, or invalid selections fail the whole batch. Local removal retains empty groups; success returns the complete snapshot.", TodoRemoveParamsSchema, (params, ctx) => coordinator.remove(params, ctx, settings), getSettings, markInteraction);
  registerHandler(pi, coordinator, "view", "Return the complete Todo snapshot without mutation.", TodoViewParamsSchema, (params) => coordinator.view(params), getSettings, markInteraction);
}

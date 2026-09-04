import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Container, Text } from "@earendil-works/pi-tui";
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
import { TodoToolFrame, type TodoToolFrameContent, type TodoToolFrameTheme } from "./tool-frame.js";
import {
  TodoAddParamsSchema,
  TodoSetParamsSchema,
  TodoTransitionParamsSchema,
  TodoViewParamsSchema,
} from "./schema.js";
import { DEFAULT_TODO_SETTINGS, loadTodoSettings, type TodoSettings } from "./settings.js";
import {
  applyTodoAdd,
  applyTodoSet,
  applyTodoTransition,
  cloneTodoState,
  createTodoState,
  parseTodoViewRequest,
} from "./state.js";
import type { TodoState } from "./types.js";
import { shouldRenderTodoAction } from "./visibility.js";
import { resetTodoWidgetLifecycle, updateTodoWidget } from "./widget.js";

type TodoResult = "set" | "add" | "transition" | "view";
type TodoSuccess = { result: TodoResult; snapshot: TodoState };
type TodoFailure = { result: "error"; error: { code: string; message: string } };
type TodoResponse = TodoSuccess | TodoFailure;

class TodoCoordinator {
  private state = createTodoState();
  private queue: Promise<void> = Promise.resolve();

  restore(ctx: ExtensionContext, settings: TodoSettings): void {
    resetTodoWidgetLifecycle(ctx);
    this.state = restoreTodoState(ctx);
    updateTodoWidget(ctx, this.state, settings);
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

  view(request: unknown): Promise<TodoSuccess> {
    return this.run(() => {
      parseTodoViewRequest(request);
      return { result: "view", snapshot: cloneTodoState(this.state) };
    });
  }

  private commit(result: TodoResult, candidate: TodoState, ctx: ExtensionContext, settings: TodoSettings): TodoSuccess {
    this.state = candidate;
    const snapshot = cloneTodoState(this.state);
    updateTodoWidget(ctx, snapshot, settings);
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

function createTodoFrame(state: "pending" | "success" | "error", action: TodoResult | undefined, content: TodoToolFrameContent, theme: TodoToolFrameTheme): TodoToolFrame {
  return new TodoToolFrame({ title: "todo", action, state, content, empty: "frame" }, theme);
}

function pendingSummary(args: unknown, state: TodoState): string {
  const input = args as { tasks?: unknown[]; todos?: unknown[] };
  if (Array.isArray(input.tasks)) {
    const count = input.tasks.reduce<number>((total, task) => total + (task && typeof task === "object" && Array.isArray((task as { todos?: unknown }).todos) ? (task as { todos: unknown[] }).todos.length : 0), 0);
    return formatTodoSize(input.tasks.length, count);
  }
  if (Array.isArray(input.todos)) return formatTodoSize(state.tasks.length, todoTasks(state).length + input.todos.length);
  return formatTodoSize(state.tasks.length, todoTasks(state).length);
}

function registerHandler(
  pi: ExtensionAPI,
  coordinator: TodoCoordinator,
  result: TodoResult,
  description: string,
  parameters: any,
  execute: (params: unknown, ctx: ExtensionContext) => Promise<TodoSuccess>,
  getSettings: () => TodoSettings,
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
    renderCall(args: unknown, theme: TodoToolFrameTheme, context: { isPartial?: boolean; isError?: boolean }) {
      if (!context.isPartial || context.isError) return new Container();
      return createTodoFrame("pending", result, new Text(theme.fg?.("muted", pendingSummary(args, coordinator.snapshot())) ?? pendingSummary(args, coordinator.snapshot()), 0, 0), theme);
    },
    renderResult(resultValue: any, options: any, theme: any, context: any) {
      if (!context.isError && !shouldRenderTodoAction(result, getSettings().toolVisibility)) return new Container();
      if (options.isPartial && !context.isError) return new Container();
      const content = renderTodoResult(resultValue, options, theme);
      return createTodoFrame(context.isError ? "error" : "success", resultValue.details?.result ?? result, content, theme);
    },
  });
}

function errorCode(message: string): string {
  if (message.includes("does not exist")) return "not_found";
  if (message.includes("Duplicate")) return "duplicate";
  if (message.includes("workingOn")) return "invalid_working_on";
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
  pi.on("before_agent_start", () => { reminderCadence = beginReminderAgentRun(reminderCadence); });
  pi.on("agent_start", (_event, ctx) => updateTodoWidget(ctx, coordinator.snapshot(), settings));
  pi.on("agent_settled", (_event, ctx) => updateTodoWidget(ctx, coordinator.snapshot(), settings));
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

  const markInteraction = (result: TodoResult): void => {
    if (result !== "view") interactedWithTodoThisTurn = true;
  };
  registerHandler(pi, coordinator, "set", "Replace the complete Todo state.", TodoSetParamsSchema, (params, ctx) => coordinator.set(params, ctx, settings), () => settings, markInteraction);
  registerHandler(pi, coordinator, "add", "Append pending todos to an existing task.", TodoAddParamsSchema, (params, ctx) => coordinator.add(params, ctx, settings), () => settings, markInteraction);
  registerHandler(pi, coordinator, "transition", "Change Todo statuses by exact task and todo name.", TodoTransitionParamsSchema, (params, ctx) => coordinator.transition(params, ctx, settings), () => settings, markInteraction);
  registerHandler(pi, coordinator, "view", "Return the complete Todo snapshot without mutation.", TodoViewParamsSchema, (params) => coordinator.view(params), () => settings, markInteraction);
}

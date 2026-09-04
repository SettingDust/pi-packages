import { cloneTodoState, createTodoState, isTodoState } from "./state.js";
import { isTodoStatus, TODO_RESULTS, type TodoState } from "./types.js";

const TODO_TOOL_RESULTS = {
  todo_set: "set",
  todo_add: "add",
  todo_transition: "transition",
  todo_view: "view",
} as const;
export const TODO_TOOL_NAMES = Object.keys(TODO_TOOL_RESULTS) as (keyof typeof TODO_TOOL_RESULTS)[];
const LEGACY_TODO_TOOL_NAME = "todo";

type BranchContext = {
  sessionManager: {
    getBranch(): readonly unknown[];
  };
  ui?: {
    notify(message: string, level?: "info" | "warning" | "error"): void;
  };
};

type ToolResult = {
  toolName: string;
  isError?: unknown;
  details?: unknown;
};

function exactObject(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid object.");
  const input = value as Record<string, unknown>;
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !(key in input)) || Object.keys(input).some((key) => !allowed.has(key))) {
    throw new Error("Invalid object shape.");
  }
  return input;
}

function parseLegacyState(value: unknown): TodoState {
  const root = exactObject(value, ["phases"], ["workingOn"]);
  if (!Array.isArray(root.phases)) throw new Error("Invalid legacy phases.");

  const tasks = root.phases.map((value) => {
    const phase = exactObject(value, ["name", "tasks"]);
    if (!Array.isArray(phase.tasks)) throw new Error("Invalid legacy tasks.");
    return {
      name: todoString(phase.name),
      todos: phase.tasks.map((value) => {
        const task = exactObject(value, ["name", "description", "status"]);
        if (!isTodoStatus(task.status)) throw new Error("Invalid legacy status.");
        return {
          name: todoString(task.name),
          description: todoString(task.description),
          status: task.status,
        };
      }),
    };
  });

  const canonical: unknown = {
    tasks,
    ...(root.workingOn === undefined ? {} : { workingOn: todoString(root.workingOn) }),
  };
  if (!isTodoState(canonical)) throw new Error("Invalid legacy state.");
  return cloneTodoState(canonical);
}

function todoString(value: unknown): string {
  if (typeof value !== "string" || value === "" || value !== value.trim()) throw new Error("Invalid Todo text.");
  return value;
}

function parseSnapshot(value: unknown): TodoState {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid snapshot.");
  const root = value as Record<string, unknown>;
  const hasCanonical = Object.hasOwn(root, "tasks");
  const hasLegacy = Object.hasOwn(root, "phases");
  if (hasCanonical === hasLegacy) throw new Error("Ambiguous snapshot.");
  if (hasCanonical) {
    if (!isTodoState(value)) throw new Error("Invalid canonical state.");
    return cloneTodoState(value);
  }
  return parseLegacyState(value);
}

function toolResult(value: unknown): ToolResult | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entry = value as { type?: unknown; message?: unknown };
  if (entry.type !== "message" || !entry.message || typeof entry.message !== "object") return undefined;
  const message = entry.message as { role?: unknown; toolName?: unknown; isError?: unknown; details?: unknown };
  if (message.role !== "toolResult" || typeof message.toolName !== "string") return undefined;
  return { toolName: message.toolName, isError: message.isError, details: message.details };
}

function parseCheckpoint(result: ToolResult): TodoState {
  if (result.isError !== false) throw new Error("Failed checkpoint.");

  if (Object.hasOwn(TODO_TOOL_RESULTS, result.toolName)) {
    const toolName = result.toolName as keyof typeof TODO_TOOL_RESULTS;
    const details = exactObject(result.details, ["result", "snapshot"]);
    if (details.result !== TODO_TOOL_RESULTS[toolName]) throw new Error("Mismatched result.");
    return parseSnapshot(details.snapshot);
  }

  if (result.toolName === LEGACY_TODO_TOOL_NAME) {
    const details = exactObject(result.details, ["action", "state"]);
    if (!TODO_RESULTS.includes(details.action as never)) throw new Error("Invalid legacy action.");
    return parseLegacyState(details.state);
  }

  throw new Error("Wrong tool.");
}

/** Restores the latest valid, complete Todo tool result recorded in the current Host branch. */
export function restoreTodoState(ctx: BranchContext): TodoState {
  const branch = ctx.sessionManager.getBranch();
  for (let index = branch.length - 1; index >= 0; index -= 1) {
    const result = toolResult(branch[index]);
    if (!result) continue;
    try {
      return parseCheckpoint(result);
    } catch {
      ctx.ui?.notify("Skipped invalid Todo restore checkpoint.", "warning");
    }
  }
  return createTodoState();
}

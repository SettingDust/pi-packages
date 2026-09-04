export const TODO_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type TodoStatus = typeof TODO_STATUSES[number];

export function isTodoStatus(value: unknown): value is TodoStatus {
  return typeof value === "string" && (TODO_STATUSES as readonly string[]).includes(value);
}

export const TODO_RESULTS = ["set", "add", "transition", "view"] as const;
export type TodoResult = typeof TODO_RESULTS[number];

export type Todo = {
  readonly name: string;
  readonly description: string;
  readonly status: TodoStatus;
};

/** A canonical task group. */
export type TodoTask = {
  readonly name: string;
  readonly todos: readonly Todo[];
};

/** The complete canonical snapshot. `workingOn` is derived, never chosen independently. */
export type TodoState = {
  readonly tasks: readonly TodoTask[];
  readonly workingOn?: string;
};

export type TodoCreation = {
  readonly name: string;
  readonly description: string;
};

export type TodoTaskCreation = {
  readonly name: string;
  readonly todos: readonly TodoCreation[];
};

export type TodoSetRequest = {
  readonly tasks: readonly TodoTaskCreation[];
};

export type TodoAddRequest = {
  readonly task: string;
  readonly todos: readonly TodoCreation[];
};

export type TodoTransition = {
  readonly task: string;
  readonly todo: string;
  readonly status: TodoStatus;
};

export type TodoTransitionRequest = {
  readonly transitions: readonly TodoTransition[];
  readonly workingOn?: string;
};

export type TodoViewRequest = Record<never, never>;

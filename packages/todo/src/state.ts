import {
  isTodoStatus,
  type Todo,
  type TodoAddRequest,
  type TodoCreation,
  type TodoSetRequest,
  type TodoState,
  type TodoStatus,
  type TodoTask,
  type TodoTaskCreation,
  type TodoTransition,
  type TodoTransitionRequest,
  type TodoViewRequest,
} from "./types.js";

export function createTodoState(): TodoState {
  return { tasks: [] };
}

export function cloneTodoState(state: TodoState): TodoState {
  assertTodoState(state);
  return canonicalState(state.tasks);
}

export function deriveActiveTask(tasks: readonly TodoTask[]): TodoTask | undefined {
  return tasks.find((task) => task.todos.some((todo) => todo.status === "in_progress"));
}

export function deriveWorkingOn(tasks: readonly TodoTask[]): string | undefined {
  return deriveActiveTask(tasks)?.todos.find((todo) => todo.status === "in_progress")?.description;
}

export function applyTodoSet(request: TodoSetRequest): TodoState {
  const parsed = parseTodoSetRequest(request);
  const tasks = parsed.tasks.map((task) => ({
    name: task.name,
    todos: task.todos.map((todo) => ({ ...todo, status: "pending" as const })),
  }));
  return canonicalState(tasks);
}

export function applyTodoAdd(state: TodoState, request: TodoAddRequest): TodoState {
  assertTodoState(state);
  const parsed = parseTodoAddRequest(request);
  const target = state.tasks.find((task) => task.name === parsed.task);
  if (!target) throw new Error("Todo task does not exist.");

  const todoNames = new Set(target.todos.map((todo) => todo.name));
  for (const todo of parsed.todos) {
    if (todoNames.has(todo.name)) throw new Error("Duplicate todo name.");
    todoNames.add(todo.name);
  }

  return canonicalState(state.tasks.map((task) => task.name !== parsed.task
    ? task
    : { ...task, todos: [...task.todos, ...parsed.todos.map((todo) => ({ ...todo, status: "pending" as const }))] }));
}

export function applyTodoTransition(state: TodoState, request: TodoTransitionRequest): TodoState {
  assertTodoState(state);
  const parsed = parseTodoTransitionRequest(request);
  const changes = new Map<string, TodoStatus>();
  for (const transition of parsed.transitions) {
    const key = transitionKey(transition.task, transition.todo);
    const task = state.tasks.find((candidate) => candidate.name === transition.task);
    if (!task || !task.todos.some((todo) => todo.name === transition.todo)) {
      throw new Error("Todo transition target does not exist.");
    }
    changes.set(key, transition.status);
  }

  const next = canonicalState(state.tasks.map((task) => ({
    ...task,
    todos: task.todos.map((todo) => {
      const status = changes.get(transitionKey(task.name, todo.name));
      return status === undefined ? todo : { ...todo, status };
    }),
  })));
  if (parsed.workingOn !== undefined && parsed.workingOn !== next.workingOn) {
    throw new Error("workingOn does not match the derived active todo.");
  }
  return next;
}

export function parseTodoSetRequest(value: unknown): TodoSetRequest {
  const input = exactObject(value, ["tasks"]);
  if (!Array.isArray(input.tasks)) throw new Error("tasks must be an array.");
  const tasks = input.tasks.map(parseTodoTaskCreation);
  assertUnique(tasks.map((task) => task.name), "Duplicate task name.");
  return { tasks };
}

export function parseTodoAddRequest(value: unknown): TodoAddRequest {
  const input = exactObject(value, ["task", "todos"]);
  if (!Array.isArray(input.todos) || input.todos.length === 0) throw new Error("todos must be a non-empty array.");
  const todos = input.todos.map(parseTodoCreation);
  assertUnique(todos.map((todo) => todo.name), "Duplicate todo name.");
  return { task: todoString(input.task), todos };
}

export function parseTodoTransitionRequest(value: unknown): TodoTransitionRequest {
  const input = exactObject(value, ["transitions"], ["workingOn"]);
  if (!Array.isArray(input.transitions) || input.transitions.length === 0) {
    throw new Error("transitions must be a non-empty array.");
  }
  const transitions = input.transitions.map(parseTodoTransition);
  assertUnique(transitions.map((transition) => transitionKey(transition.task, transition.todo)), "Duplicate transition target.");
  return {
    transitions,
    ...(input.workingOn === undefined ? {} : { workingOn: todoString(input.workingOn) }),
  };
}

export function parseTodoViewRequest(value: unknown): TodoViewRequest {
  exactObject(value, []);
  return {};
}

export function isTodoState(value: unknown): value is TodoState {
  try {
    assertTodoState(value);
    return true;
  } catch {
    return false;
  }
}

export function assertTodoState(value: unknown): asserts value is TodoState {
  const input = exactObject(value, ["tasks"], ["workingOn"]);
  if (!Array.isArray(input.tasks)) throw new Error("tasks must be an array.");

  const tasks = input.tasks.map((task) => {
    const group = exactObject(task, ["name", "todos"]);
    if (!Array.isArray(group.todos)) throw new Error("todos must be an array.");
    return {
      name: todoString(group.name),
      todos: group.todos.map((todo) => {
        const item = exactObject(todo, ["name", "description", "status"]);
        if (!isTodoStatus(item.status)) throw new Error("Invalid todo status.");
        return { name: todoString(item.name), description: todoString(item.description), status: item.status };
      }),
    };
  });
  assertTaskShape(tasks);

  const derived = deriveWorkingOn(tasks);
  if (input.workingOn !== undefined && todoString(input.workingOn) !== derived) {
    throw new Error("workingOn does not match the derived active todo.");
  }
  if (input.workingOn === undefined && derived !== undefined) {
    throw new Error("workingOn is required for an active todo.");
  }
}

function canonicalState(tasks: readonly TodoTask[]): TodoState {
  const copied = tasks.map((task) => ({
    name: task.name,
    todos: task.todos.map((todo) => ({ ...todo })),
  }));
  assertTaskShape(copied);
  const workingOn = deriveWorkingOn(copied);
  return workingOn === undefined ? { tasks: copied } : { tasks: copied, workingOn };
}

function parseTodoTaskCreation(value: unknown): TodoTaskCreation {
  const input = exactObject(value, ["name", "todos"]);
  if (!Array.isArray(input.todos)) throw new Error("todos must be an array.");
  const todos = input.todos.map(parseTodoCreation);
  assertUnique(todos.map((todo) => todo.name), "Duplicate todo name.");
  return { name: todoString(input.name), todos };
}

function parseTodoCreation(value: unknown): TodoCreation {
  const input = exactObject(value, ["name", "description"]);
  return { name: todoString(input.name), description: todoString(input.description) };
}

function parseTodoTransition(value: unknown): TodoTransition {
  const input = exactObject(value, ["task", "todo", "status"]);
  if (!isTodoStatus(input.status)) throw new Error("Invalid todo status.");
  return { task: todoString(input.task), todo: todoString(input.todo), status: input.status };
}

function assertTaskShape(tasks: readonly TodoTask[]): void {
  assertUnique(tasks.map((task) => task.name), "Duplicate task name.");
  for (const task of tasks) {
    todoString(task.name);
    assertUnique(task.todos.map((todo) => todo.name), "Duplicate todo name.");
    for (const todo of task.todos) {
      todoString(todo.name);
      todoString(todo.description);
      if (!isTodoStatus(todo.status)) throw new Error("Invalid todo status.");
    }
  }
}

function exactObject(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Value must be an object.");
  const input = value as Record<string, unknown>;
  const allowed = new Set([...required, ...optional]);
  if (Object.keys(input).some((key) => !allowed.has(key)) || required.some((key) => !(key in input))) {
    throw new Error("Object has an invalid shape.");
  }
  return input;
}

function todoString(value: unknown): string {
  if (typeof value !== "string" || value === "" || value !== value.trim()) {
    throw new Error("Todo text must be trimmed and non-empty.");
  }
  return value;
}

function assertUnique(values: readonly string[], message: string): void {
  if (new Set(values).size !== values.length) throw new Error(message);
}

function transitionKey(task: string, todo: string): string {
  return JSON.stringify([task, todo]);
}

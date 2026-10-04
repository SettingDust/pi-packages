import {
  isTodoStatus,
  type Todo,
  type TodoAddRequest,
  type TodoCreation,
  type TodoRemoval,
  type TodoRemoveRequest,
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
  const todoNames = new Set(target?.todos.map((todo) => todo.name));
  for (const todo of parsed.todos) {
    if (todoNames.has(todo.name)) throw new Error("Duplicate todo name.");
    todoNames.add(todo.name);
  }

  const todos = parsed.todos.map((todo) => ({ ...todo, status: "pending" as const }));
  return canonicalState(target
    ? state.tasks.map((task) => task.name !== parsed.task ? task : { ...task, todos: [...task.todos, ...todos] })
    : [...state.tasks, { name: parsed.task, todos }]);
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

  return canonicalState(state.tasks.map((task) => ({
    ...task,
    todos: task.todos.map((todo) => {
      const status = changes.get(transitionKey(task.name, todo.name));
      return status === undefined ? todo : { ...todo, status };
    }),
  })));
}

export function applyTodoRemove(state: TodoState, request: TodoRemoveRequest): TodoState {
  assertTodoState(state);
  const parsed = parseTodoRemoveRequest(request);
  for (const removal of parsed.removals) {
    const task = state.tasks.find((candidate) => candidate.name === removal.task);
    if (!task) throw new Error("Todo removal task does not exist.");
    if (removal.todo !== undefined && !task.todos.some((todo) => todo.name === removal.todo)) {
      throw new Error("Todo removal todo does not exist.");
    }
  }

  const groups = new Set(parsed.removals.filter((removal) => removal.todo === undefined).map((removal) => removal.task));
  const todos = new Set(parsed.removals.filter((removal) => removal.todo !== undefined).map((removal) => transitionKey(removal.task, removal.todo!)));
  return canonicalState(state.tasks.filter((task) => !groups.has(task.name)).map((task) => ({
    ...task,
    todos: task.todos.filter((todo) => !todos.has(transitionKey(task.name, todo.name))),
  })));
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
  const input = exactObject(value, ["transitions"]);
  if (!Array.isArray(input.transitions) || input.transitions.length === 0) {
    throw new Error("transitions must be a non-empty array.");
  }
  const transitions = input.transitions.map(parseTodoTransition);
  assertUnique(transitions.map((transition) => transitionKey(transition.task, transition.todo)), "Duplicate transition target.");
  return { transitions };
}

export function parseTodoRemoveRequest(value: unknown): TodoRemoveRequest {
  const input = exactObject(value, ["removals"]);
  if (!Array.isArray(input.removals) || input.removals.length === 0) {
    throw new Error("removals must be a non-empty array.");
  }
  const removals = input.removals.map(parseTodoRemoval);
  const groups = new Set<string>();
  const tasks = new Set<string>();
  const todos = new Set<string>();
  for (const removal of removals) {
    if (groups.has(removal.task) || (removal.todo === undefined && tasks.has(removal.task))) {
      throw new Error("Duplicate removal selection.");
    }
    if (removal.todo === undefined) {
      groups.add(removal.task);
    } else {
      const key = transitionKey(removal.task, removal.todo);
      if (todos.has(key)) throw new Error("Duplicate removal selection.");
      todos.add(key);
    }
    tasks.add(removal.task);
  }
  return { removals };
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
  const input = exactObject(value, ["tasks"]);
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
}

function canonicalState(tasks: readonly TodoTask[]): TodoState {
  const copied = tasks.map((task) => ({
    name: task.name,
    todos: task.todos.map((todo) => ({ ...todo })),
  }));
  assertTaskShape(copied);
  return { tasks: copied };
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

function parseTodoRemoval(value: unknown): TodoRemoval {
  const input = exactObject(value, ["task"], ["todo"]);
  const task = todoString(input.task);
  return "todo" in input ? { task, todo: todoString(input.todo) } : { task };
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

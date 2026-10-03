import { describe, expect, it } from "vitest";
import {
  applyTodoAdd,
  applyTodoSet,
  applyTodoTransition,
  cloneTodoState,
  isTodoState,
  parseTodoSetRequest,
  parseTodoTransitionRequest,
} from "../src/state.js";
import { TODO_STATUSES, type TodoState } from "../src/types.js";

describe("canonical Todo state", () => {
  const build = () => applyTodoSet(parseTodoSetRequest({
    tasks: [{
      name: "Build",
      todos: [
        { name: "Implement", description: "Implement the protocol." },
        { name: "Verify", description: "Verify the protocol." },
      ],
    }, {
      name: "Release",
      todos: [{ name: "Publish", description: "Publish the package." }],
    }],
  }));

  it("creates only pending todos and permits an empty replacement", () => {
    expect(applyTodoSet(parseTodoSetRequest({ tasks: [] }))).toEqual({ tasks: [] });
    expect(build()).toEqual({
      tasks: [{
        name: "Build",
        todos: [
          { name: "Implement", description: "Implement the protocol.", status: "pending" },
          { name: "Verify", description: "Verify the protocol.", status: "pending" },
        ],
      }, {
        name: "Release",
        todos: [{ name: "Publish", description: "Publish the package.", status: "pending" }],
      }],
    });
  });

  it("appends to an exact task and creates a differently cased task without changing existing tasks", () => {
    const state = build();
    const next = applyTodoAdd(state, {
      task: "Build",
      todos: [
        { name: "Test", description: "Test the protocol." },
        { name: "Publish", description: "Same name in another task is valid." },
      ],
    });
    expect(next).toEqual({ tasks: [{
      ...state.tasks[0],
      todos: [...state.tasks[0].todos,
        { name: "Test", description: "Test the protocol.", status: "pending" },
        { name: "Publish", description: "Same name in another task is valid.", status: "pending" },
      ],
    }, state.tasks[1]] });

    const created = applyTodoAdd(state, {
      task: "build",
      todos: [{ name: "Implement", description: "Same name in a distinct task." }],
    });
    expect(created).toEqual({ tasks: [...state.tasks, {
      name: "build",
      todos: [{ name: "Implement", description: "Same name in a distinct task.", status: "pending" }],
    }] });
    expect(state).toEqual(build());
  });

  it.each([false, true])("creates from empty state or appends to an existing empty task (existing=$0)", (existing) => {
    const state = applyTodoSet({ tasks: existing
      ? [{ name: "Before", todos: [] }, { name: "Empty", todos: [] }, { name: "After", todos: [] }]
      : [] });
    const todos = [{ name: "First", description: "First description." }, { name: "Second", description: "Second description." }];
    const next = applyTodoAdd(state, { task: "Empty", todos });
    const task = { name: "Empty", todos: todos.map((todo) => ({ ...todo, status: "pending" })) };
    expect(next).toEqual({ tasks: existing ? [state.tasks[0], task, state.tasks[2]] : [task] });
    expect(state.tasks.find((task) => task.name === "Empty")?.todos ?? []).toEqual([]);
  });

  it.each(["Build", "New"])("preserves all four statuses and snapshot isolation when adding to %s", (task) => {
    const state: TodoState = { tasks: [{ name: "Before", todos: [] }, {
      name: "Build",
      todos: TODO_STATUSES.map((status) => ({
        name: status, description: `${status} description`, status,
      })),
    }, { name: "After", todos: [] }] };
    const before = structuredClone(state);
    const previous = cloneTodoState(state);
    const request = { task, todos: [{ name: "First", description: "First description." }, { name: "Second", description: "Second description." }] };
    const next = applyTodoAdd(state, request);
    const added = request.todos.map((todo) => ({ ...todo, status: "pending" }));
    expect(next).toEqual({ tasks: task === "New" ? [...before.tasks, { name: task, todos: added }]
      : [before.tasks[0], { ...before.tasks[1], todos: [...before.tasks[1].todos, ...added] }, before.tasks[2]] });
    const target = next.tasks.find((candidate) => candidate.name === task)!;
    expect(Reflect.set(next.tasks[1].todos[0], "description", "Changed returned snapshot.")).toBe(true);
    expect(Reflect.set(target.todos.at(-1)!, "name", "Changed returned todo.")).toBe(true);
    expect(Reflect.set(target, "name", "Changed returned task.")).toBe(true);
    expect(state).toEqual(before);
    expect(previous).toEqual(before);
    expect(request.todos).toEqual([{ name: "First", description: "First description." }, { name: "Second", description: "Second description." }]);
  });

  it.each(["Build", "Missing"])("rejects request duplicates atomically for %s", (task) => {
    const state = build();
    expect(() => applyTodoAdd(state, { task, todos: [
      { name: "Test", description: "Valid first item." },
      { name: "Test", description: "Duplicate second item." },
    ] })).toThrow("Duplicate todo name.");
    expect(state).toEqual(build());
  });

  it("rejects a later existing-target collision without appending the valid first item", () => {
    const state = build();
    expect(() => applyTodoAdd(state, { task: "Build", todos: [
      { name: "Test", description: "Valid first item." },
      { name: "Implement", description: "Existing-target collision." },
    ] })).toThrow("Duplicate todo name.");
    expect(state).toEqual(build());
  });

  it.each(["Build", "Missing"])("rejects malformed adds before any mutation for %s", (task) => {
    const state = build();
    const todo = { name: "Test", description: "Valid description." };
    const valid = { task, todos: [todo] };
    const invalid: unknown[] = [null, [], {}, { task }, { todos: [todo] },
      { ...valid, extra: true }, { ...valid, status: "pending" },
      { ...valid, todos: [] }, { ...valid, todos: null },
      ...[null, {}, { name: "Test" }, { description: "Description." }, { ...todo, extra: true }, { ...todo, status: "pending" }]
        .map((item) => ({ task, todos: [todo, item] })),
      ...[42, "", " ", " padded", "padded "].flatMap((text) => [
        { ...valid, task: text },
        { task, todos: [todo, { ...todo, name: text }] },
        { task, todos: [todo, { name: "Second", description: text }] },
      ]),
    ];
    for (const request of invalid) {
      expect(() => applyTodoAdd(state, request as never)).toThrow();
      expect(state).toEqual(build());
    }
  });

  it("keeps current-state and request validation ahead of target collision checks", () => {
    const state = build();
    expect(() => applyTodoAdd({ ...state, extra: true } as never, { task: "Build", todos: [] }))
      .toThrow("Object has an invalid shape.");
    expect(() => applyTodoAdd(state, { task: "Build", todos: [
      { name: "Implement", description: "Collision." }, { name: "Second", description: "" },
    ] })).toThrow("Todo text must be trimmed and non-empty.");
    expect(() => applyTodoAdd(state, { task: "Build", todos: [
      { name: "Implement", description: "Collision." }, { name: "Second", description: "Second." }, { name: "Second", description: "Duplicate." },
    ] })).toThrow("Duplicate todo name.");
    expect(state).toEqual(build());
  });

  it("preserves every independently active task without a single-value summary", () => {
    const state = applyTodoTransition(build(), parseTodoTransitionRequest({
      transitions: [
        { task: "Release", todo: "Publish", status: "in_progress" },
        { task: "Build", todo: "Verify", status: "in_progress" },
        { task: "Build", todo: "Implement", status: "in_progress" },
      ],
    }));
    expect(state.tasks.filter((task) => task.todos.some((todo) => todo.status === "in_progress")).map((task) => task.name))
      .toEqual(["Build", "Release"]);
    expect(state).not.toHaveProperty("workingOn");
    expect(() => parseTodoTransitionRequest({
      transitions: [{ task: "Build", todo: "Implement", status: "completed" }],
      workingOn: "Wrong description.",
    })).toThrow(/invalid shape/);
  });

  it("rejects invalid canonical snapshots and preserves the original after failed transitions", () => {
    expect(isTodoState({
      tasks: [{ name: "Build", todos: [{ name: "Implement", description: "Implement.", status: "in_progress" }] }],
      workingOn: "Implement.",
    })).toBe(false);
    expect(isTodoState({
      tasks: [{ name: "Build", todos: [{ name: "Implement", description: "Implement.", status: "in_progress" }] }],
      extra: true,
    })).toBe(false);
    const state = build();
    expect(() => applyTodoTransition(state, parseTodoTransitionRequest({
      transitions: [
        { task: "Build", todo: "Implement", status: "completed" },
        { task: "Build", todo: "Missing", status: "completed" },
      ],
    }))).toThrow(/does not exist/);
    expect(() => applyTodoTransition(state, parseTodoTransitionRequest({
      transitions: [
        { task: "Build", todo: "Implement", status: "completed" },
        { task: "Missing", todo: "Implement", status: "completed" },
      ],
    }))).toThrow(/does not exist/);
    expect(state).toEqual(build());
    expect(cloneTodoState(state)).not.toBe(state);
  });

});

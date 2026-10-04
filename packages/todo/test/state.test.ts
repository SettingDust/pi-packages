import { describe, expect, it } from "vitest";
import {
  applyTodoAdd,
  applyTodoRemove,
  applyTodoSet,
  applyTodoTransition,
  cloneTodoState,
  isTodoState,
  parseTodoSetRequest,
  parseTodoTransitionRequest,
} from "../src/state.js";
import { TODO_STATUSES, type TodoState } from "../src/types.js";

describe("explicit atomic Todo removal", () => {
  const mixed = (): TodoState => ({ tasks: [
    { name: "Before", todos: [] },
    { name: "Build", todos: TODO_STATUSES.flatMap((status) => [
      { name: `Remove ${status}`, description: `Target ${status}.`, status },
      { name: `Keep ${status}`, description: `Survivor ${status}.`, status },
    ]) },
    { name: "Other", todos: [
      { name: "Remove pending", description: "Same name in another task.", status: "pending" },
      { name: "Keep", description: "Other survivor.", status: "in_progress" },
    ] },
    { name: "Last", todos: [{ name: "Only", description: "Last local todo.", status: "cancelled" }] },
    { name: "Populated", todos: [{ name: "Whole", description: "Whole group selection.", status: "in_progress" }] },
    { name: "Empty", todos: [] },
    { name: "After", todos: [] },
  ] });

  it("removes every status in one local/group batch, retains empty groups, and clones every survivor", () => {
    const state = mixed();
    const before = structuredClone(state);
    const previous = cloneTodoState(state);
    const request = { removals: [
      ...TODO_STATUSES.map((status) => ({ task: "Build", todo: `Remove ${status}` })),
      { task: "Other", todo: "Remove pending" }, { task: "Last", todo: "Only" },
      { task: "Populated" }, { task: "Empty" },
    ] };
    const next = applyTodoRemove(state, request);
    const expected = { tasks: [before.tasks[0], { ...before.tasks[1], todos: before.tasks[1].todos.filter((todo) => todo.name.startsWith("Keep")) },
      { ...before.tasks[2], todos: [before.tasks[2].todos[1]] }, { name: "Last", todos: [] }, before.tasks[6]] };
    expect(next).toEqual(expected);
    expect(isTodoState(next)).toBe(true);
    const later = applyTodoRemove(next, { removals: [{ task: "Build", todo: "Keep pending" }] });
    expect(next).toEqual(expected);
    for (const [index, task] of next.tasks.entries()) {
      const source = state.tasks.find((candidate) => candidate.name === task.name)!;
      expect(task).not.toBe(source);
      expect(task.todos).not.toBe(source.todos);
      for (const todo of task.todos) expect(todo).not.toBe(source.todos.find((candidate) => candidate.name === todo.name));
      Reflect.set(task, "name", `Changed ${index}`);
    }
    Reflect.set(next.tasks[1].todos[0], "description", "Changed snapshot.");
    Reflect.set(next.tasks[1].todos[0], "status", "cancelled");
    Reflect.set(next.tasks[1].todos, "length", 0);
    Reflect.set(next.tasks, "length", 0);
    expect(state).toEqual(before);
    expect(previous).toEqual(before);
    expect(later.tasks[1].todos).toEqual(before.tasks[1].todos.filter((todo) => todo.name.startsWith("Keep") && todo.status !== "pending"));
    expect(request.removals).toHaveLength(8);
  });

  it("deletes empty or populated groups only by explicit selection, including all groups", () => {
    const state = mixed();
    expect(applyTodoRemove(state, { removals: [{ task: "Empty" }] })).toEqual({ tasks: state.tasks.filter((task) => task.name !== "Empty") });
    expect(applyTodoRemove(state, { removals: state.tasks.map((task) => ({ task: task.name })) })).toEqual({ tasks: [] });
    expect(() => applyTodoRemove(state, { removals: [{ task: "Empty", todo: "Only" }] })).toThrow("Todo removal todo does not exist.");
    expect(state).toEqual(mixed());
  });

  it("matches exact case-sensitive names and never collides on delimiters", () => {
    const names = [["Build", "Code"], ["build", "Code"], ["Build", "code"], ["a/b", "c"], ["a", "b/c"], ["a\u0000b", "c"], ["a", "b\u0000c"], ['a","b', 'c"]d']] as const;
    const state: TodoState = { tasks: [...new Set(names.map(([task]) => task))].map((name) => ({ name, todos: names.filter(([task]) => task === name).map(([, todo]) => ({ name: todo, description: "Exact names.", status: "pending" })) })) };
    const removals = names.map(([task, todo]) => ({ task, todo }));
    expect(applyTodoRemove(state, { removals })).toEqual({ tasks: state.tasks.map((task) => ({ name: task.name, todos: [] })) });
    const next = applyTodoRemove(state, { removals: [{ task: "Build", todo: "Code" }] });
    expect(next.tasks[0].todos.map((todo) => todo.name)).toEqual(["code"]);
    expect(next.tasks[1].todos.map((todo) => todo.name)).toEqual(["Code"]);
    expect(() => applyTodoRemove(state, { removals: [{ task: "BUILD", todo: "Code" }] })).toThrow("Todo removal task does not exist.");
    expect(() => applyTodoRemove(state, { removals: [{ task: "Build", todo: "CODE" }] })).toThrow("Todo removal todo does not exist.");
  });

  it("rejects malformed roots, batches, items, and text without changing state", () => {
    const state = mixed();
    const valid = { task: "Build", todo: "Remove pending" };
    const invalid: unknown[] = [null, [], 42, {}, { removals: null }, { removals: {} }, { removals: [] },
      { removals: [valid], force: true }, { removals: [valid], status: "completed" },
      ...[null, [], {}, { todo: "Only" }, { task: "Last", todo: null }, { task: "Last", todo: undefined },
        { task: "Last", force: true }, { task: "Last", status: "pending" }, { task: "Last", todo: "Only", extra: true },
      ].map((item) => ({ removals: [valid, item] })),
      ...[null, 42, "", " ", " padded", "padded "].flatMap((text) => [
        { removals: [valid, { task: text }] }, { removals: [valid, { task: "Last", todo: text }] },
      ]),
    ];
    for (const request of invalid) {
      expect(() => applyTodoRemove(state, request as never)).toThrow();
      expect(state).toEqual(mixed());
    }
  });

  it("rejects duplicate pairs/groups and overlaps in either order before existence", () => {
    const state = mixed();
    for (const task of ["Build", "Missing"]) {
      for (const selections of [
        [{ task, todo: "Absent" }, { task, todo: "Absent" }],
        [{ task }, { task }], [{ task }, { task, todo: "Absent" }], [{ task, todo: "Absent" }, { task }],
      ]) {
        const request = { removals: [{ task: "Last", todo: "Only" }, ...selections] };
        expect(() => applyTodoRemove(state, request)).toThrow("Duplicate removal selection.");
        expect(state).toEqual(mixed());
      }
    }
  });

  it("validates current state, then every shape/text, then duplicates, then ordered task/todo existence", () => {
    const state = mixed();
    const valid = { task: "Last", todo: "Only" };
    const missing = { task: "Missing", todo: "Secret" };
    const duplicate = { removals: [missing, missing] };
    expect(() => applyTodoRemove({ tasks: [{ name: "Bad", todos: [{ name: "Bad", description: "Bad.", status: "active" }] }] } as never, duplicate))
      .toThrow("Invalid todo status.");
    expect(() => applyTodoRemove({ tasks: [{ name: "Duplicate", todos: [] }, { name: "Duplicate", todos: [] }] }, { removals: [] }))
      .toThrow("Duplicate task name.");
    for (const tail of [{ task: "Build", todo: "" }, { task: "Build", todo: null }, { task: "Build", force: true }]) {
      expect(() => applyTodoRemove(state, { removals: [...duplicate.removals, tail] } as never)).toThrow(/trimmed|invalid shape/);
    }
    expect(() => applyTodoRemove(state, { removals: [valid, { todo: "Only" }, { task: "" }] } as never))
      .toThrow("Object has an invalid shape.");
    expect(() => applyTodoRemove(state, { removals: [valid, { task: "" }, { todo: "Only" }] } as never))
      .toThrow("Todo text must be trimmed and non-empty.");
    expect(() => applyTodoRemove(state, duplicate)).toThrow("Duplicate removal selection.");
    for (const [selections, message] of [
      [[valid, { task: "Build", todo: "Absent" }, missing], "Todo removal todo does not exist."],
      [[valid, missing, { task: "Build", todo: "Absent" }], "Todo removal task does not exist."],
      [[valid, { task: "Missing" }], "Todo removal task does not exist."],
    ] as const) {
      expect(() => applyTodoRemove(state, { removals: selections })).toThrow(message);
      expect(state).toEqual(mixed());
    }
  });
});

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

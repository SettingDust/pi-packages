import { describe, expect, it, vi } from "vitest";
import { restoreTodoState } from "../src/persistence.js";
import { applyTodoAdd, applyTodoRemove } from "../src/state.js";
import { TODO_RESULTS, TODO_STATUSES, type TodoState } from "../src/types.js";

const state = (name: string, status: "pending" | "in_progress" = "pending"): TodoState => ({
  tasks: [{ name, todos: [{ name: `Complete ${name}`, description: `Detailed description for ${name}.`, status }] }],
});

const legacyState = (name: string, status: "pending" | "in_progress" = "pending") => ({
  phases: [{ name, tasks: [{ name: `Complete ${name}`, description: `Detailed description for ${name}.`, status }] }],
});

const contextFor = (entries: unknown[]) => {
  const notify = vi.fn();
  return { context: { sessionManager: { getBranch: () => entries }, ui: { notify } }, notify };
};

const canonicalResult = (snapshot: unknown, options: { isError?: boolean; result?: unknown; toolName?: string } = {}) => ({
  type: "message",
  message: {
    role: "toolResult",
    toolName: options.toolName ?? "todo_set",
    isError: options.isError ?? false,
    details: { result: "result" in options ? options.result : "set", snapshot },
  },
});

const legacyResult = (snapshot: unknown, options: { isError?: boolean; action?: unknown } = {}) => ({
  type: "message",
  message: {
    role: "toolResult",
    toolName: "todo",
    isError: options.isError ?? false,
    details: { action: "action" in options ? options.action : "add", state: snapshot },
  },
});

describe("todo persistence", () => {
  it("restores the newest valid canonical checkpoint", () => {
    const snapshot = state("Build", "in_progress");
    const { context } = contextFor([canonicalResult(state("Plan")), canonicalResult(snapshot, { result: "transition", toolName: "todo_transition" })]);
    const restored = restoreTodoState(context);
    expect(restored).toEqual(snapshot);
    expect(restored).not.toBe(snapshot);
  });

  it.each(["set", "add", "transition", "view"] as const)("preserves canonical todo_%s checkpoints and cloning", (result) => {
    const snapshot = state("Build", "in_progress");
    const { context, notify } = contextFor([canonicalResult(snapshot, { toolName: `todo_${result}`, result })]);
    const restored = restoreTodoState(context);
    expect(restored).toEqual(snapshot);
    Reflect.set(restored.tasks[0].todos[0], "description", "Changed restored snapshot.");
    expect(restoreTodoState(context)).toEqual(snapshot);
    expect(notify).not.toHaveBeenCalled();
  });

  it.each([false, true])("restores and clones complete removal checkpoints with allGroups=%s", (allGroups) => {
    const initial: TodoState = { tasks: [
      { name: "Before", todos: [] },
      { name: "Build", todos: TODO_STATUSES.map((status) => ({ name: status, description: `${status} description.`, status })) },
      { name: "Last", todos: [{ name: "Only", description: "Only description.", status: "cancelled" }] },
      { name: "Whole", todos: [{ name: "Active", description: "Active description.", status: "in_progress" }] },
      { name: "After", todos: [] },
    ] };
    const snapshot = applyTodoRemove(initial, { removals: allGroups
      ? initial.tasks.map(({ name }) => ({ task: name }))
      : [{ task: "Last", todo: "Only" }, { task: "Whole" }] });
    const expected = allGroups ? { tasks: [] } : { tasks: [initial.tasks[0], initial.tasks[1], { name: "Last", todos: [] }, initial.tasks[4]] };
    const { context, notify } = contextFor([canonicalResult(initial), canonicalResult(snapshot, { toolName: "todo_remove", result: "remove" })]);
    const restored = restoreTodoState(context);
    expect(restored).toEqual(expected);
    expect(notify).not.toHaveBeenCalled();
    expect(restored).not.toBe(snapshot);
    expect(restored.tasks).not.toBe(snapshot.tasks);
    for (const [index, task] of restored.tasks.entries()) {
      expect(task).not.toBe(snapshot.tasks[index]);
      expect(task.todos).not.toBe(snapshot.tasks[index].todos);
      for (const [todoIndex, todo] of task.todos.entries()) expect(todo).not.toBe(snapshot.tasks[index].todos[todoIndex]);
    }
    if (!allGroups) {
      Reflect.set(restored.tasks[1], "name", "Changed task.");
      Reflect.set(restored.tasks[1].todos[0], "description", "Changed survivor.");
      Reflect.set(restored.tasks[1].todos[0], "status", "cancelled");
      Reflect.set(restored.tasks[1].todos, "length", 0);
    }
    Reflect.set(restored.tasks, "length", 0);
    Reflect.set(restored.tasks, 0, { name: "Injected", todos: [] });
    expect(snapshot).toEqual(expected);
    expect(restoreTodoState(context)).toEqual(expected);
  });

  it("restores a complete add creation checkpoint with all previous statuses, then appends to the restored task", () => {
    const prior: TodoState = { tasks: [{ name: "Build", todos: TODO_STATUSES.map((status) => ({
      name: status, description: `${status} description.`, status,
    })) }, { name: "Empty", todos: [] }] };
    const snapshot = applyTodoAdd(prior, { task: "New", todos: [{ name: "First", description: "First description." }] });
    const { context, notify } = contextFor([canonicalResult(prior), canonicalResult(snapshot, { result: "add", toolName: "todo_add" })]);
    const restored = restoreTodoState(context);
    expect(restored).toEqual({ tasks: [...prior.tasks, { name: "New", todos: [{ name: "First", description: "First description.", status: "pending" }] }] });
    expect(notify).not.toHaveBeenCalled();
    const appended = applyTodoAdd(restored, { task: "New", todos: [{ name: "Second", description: "Second description." }] });
    expect(appended).toEqual({ tasks: [...prior.tasks, { name: "New", todos: [
      { name: "First", description: "First description.", status: "pending" },
      { name: "Second", description: "Second description.", status: "pending" },
    ] }] });
    expect(restored).toEqual(snapshot);
    expect(Reflect.set(restored.tasks[0].todos[0], "description", "Changed restored snapshot.")).toBe(true);
    expect(snapshot.tasks[0].todos[0].description).toBe("pending description.");
  });

  it("restores strict legacy phases/tasks into canonical state", () => {
    const { context } = contextFor([legacyResult(legacyState("Build", "in_progress"))]);
    expect(restoreTodoState(context)).toEqual(state("Build", "in_progress"));
  });

  it.each(["set", "add", "transition", "view"])("keeps legacy action %s valid after the canonical enum expands", (action) => {
    expect(TODO_RESULTS).toContain("remove");
    const snapshot = legacyState("Build", "in_progress");
    const { context, notify } = contextFor([legacyResult(snapshot, { action })]);
    const restored = restoreTodoState(context);
    expect(restored).toEqual(state("Build", "in_progress"));
    expect(notify).not.toHaveBeenCalled();
    Reflect.set(restored.tasks[0].todos[0], "description", "Changed restored snapshot.");
    expect(snapshot.phases[0].tasks[0].description).toBe("Detailed description for Build.");
  });

  it("rejects legacy remove and other actions without leaking payload or replacing the prior checkpoint", () => {
    const valid = legacyResult(legacyState("Plan"), { action: "set" });
    for (const action of ["remove", "REMOVE", "unknown", null, 42]) {
      const { context, notify } = contextFor([valid, legacyResult(legacyState("Private"), { action })]);
      expect(restoreTodoState(context)).toEqual(state("Plan"));
      expect(notify).toHaveBeenCalledExactlyOnceWith("Skipped invalid Todo restore checkpoint.", "warning");
    }
    expect(restoreTodoState(contextFor([legacyResult(legacyState("Private"), { action: "remove" })]).context)).toEqual({ tasks: [] });
  });

  it("fails closed on mixed or ambiguous roots", () => {
    const valid = canonicalResult(state("Plan"));
    const mixed = canonicalResult({ ...state("Mixed"), phases: [] });
    const neither = canonicalResult({ workingOn: "Nothing" });
    const { context, notify } = contextFor([valid, mixed, neither]);
    expect(restoreTodoState(context)).toEqual(state("Plan"));
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("requires strict legacy status and rejects unknown keys", () => {
    const valid = legacyResult(legacyState("Plan"));
    const missingStatus = legacyResult({ phases: [{ name: "Bad", tasks: [{ name: "Todo", description: "Description." }] }] });
    const unknownRoot = legacyResult({ ...legacyState("Bad"), legacyIdentifier: "id" });
    const unknownPhase = legacyResult({ phases: [{ name: "Bad", tasks: [], legacyIdentifier: "id" }] });
    const unknownTodo = legacyResult({ phases: [{ name: "Bad", tasks: [{ name: "Todo", description: "Description.", status: "pending", legacyIdentifier: "id" }] }] });
    const { context, notify } = contextFor([valid, missingStatus, unknownRoot, unknownPhase, unknownTodo]);
    expect(restoreTodoState(context)).toEqual(state("Plan"));
    expect(notify).toHaveBeenCalledTimes(4);
  });

  it("rejects malformed canonical and legacy invariants", () => {
    const valid = canonicalResult(state("Plan"));
    const badCanonical = canonicalResult({ tasks: [{ name: "Build", todos: [
      { name: "Same", description: "First.", status: "pending" },
      { name: "Same", description: "Second.", status: "completed" },
    ] }] });
    const badLegacy = legacyResult({ phases: [
      { name: "Build", tasks: [{ name: "One", description: "One.", status: "in_progress" }] },
      { name: "Verify", tasks: [{ name: "Two", description: "Two.", status: "pending" }] },
    ], workingOn: "Wrong." });
    const { context, notify } = contextFor([valid, badCanonical, badLegacy]);
    expect(restoreTodoState(context)).toEqual(state("Plan"));
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it.each(["todo_set", "todo_add", "todo_remove"])("skips failed, incomplete, wrong-tool, wrong-version, and malformed %s checkpoints", (toolName) => {
    const result = toolName.slice("todo_".length);
    const valid = canonicalResult(state("Plan"), { toolName, result });
    const failed = canonicalResult(state("Failed"), { toolName, result, isError: true });
    const incomplete = { type: "message", message: { role: "toolResult", toolName, isError: false, details: { result } } };
    const errorEnvelope = { type: "message", message: { role: "toolResult", toolName, isError: false, details: { result: "error", error: { code: "duplicate", message: "Duplicate todo name." } } } };
    const wrongTool = canonicalResult(state("Other"), { toolName: "other", result });
    const wrongVersion = { ...valid, message: { ...valid.message, details: { result, snapshot: state("Future"), version: 2 } } };
    const malformed = canonicalResult({ tasks: [{ name: "Bad", todos: [{ name: "Todo", description: "Description.", status: "active" }] }] }, { toolName, result });
    const unknownResult = canonicalResult(state("Bad"), { toolName, result: "unknown" });
    const mismatchedResult = canonicalResult(state("Mismatch"), { result: "view", toolName });
    const canonicalThroughLegacyTool = legacyResult(state("Not legacy"));
    const candidates = [failed, incomplete, errorEnvelope, wrongTool, wrongVersion, malformed, unknownResult, mismatchedResult, canonicalThroughLegacyTool];
    for (const candidate of candidates) {
      const { context, notify } = contextFor([valid, candidate]);
      expect(restoreTodoState(context)).toEqual(state("Plan"));
      expect(notify).toHaveBeenCalledExactlyOnceWith("Skipped invalid Todo restore checkpoint.", "warning");
    }
  });

  it("continues past every invalid removal candidate to the next eligible removal or empty fallback", () => {
    const snapshot = state("Private", "in_progress");
    const valid = canonicalResult(snapshot, { toolName: "todo_remove", result: "remove" });
    const todo = snapshot.tasks[0].todos[0];
    const invalidSnapshots = [null, [], {}, { tasks: null }, { tasks: {} }, { tasks: [], version: 2 },
      { tasks: [], phases: [] }, { tasks: [null] }, { tasks: [{ name: "Private" }] },
      { tasks: [{ name: "Private", todos: [], extra: "Secret" }] },
      { tasks: [{ name: "Private", todos: [{ name: todo.name, description: todo.description }] }] },
      { tasks: [{ name: "Private", todos: [{ ...todo, extra: "Secret" }] }] },
      { tasks: [{ name: "Private", todos: [{ ...todo, description: " Secret" }] }] },
      { tasks: [{ name: "Private", todos: [todo, todo] }] },
      { tasks: [snapshot.tasks[0], snapshot.tasks[0]] },
    ];
    const invalidDetails = [null, [], "Secret", {}, { snapshot }, { result: "remove", snapshot, extra: "Secret" }];
    const candidates = [
      ...invalidSnapshots.map((snapshot) => canonicalResult(snapshot, { toolName: "todo_remove", result: "remove" })),
      ...invalidDetails.map((details) => ({ ...valid, message: { ...valid.message, details } })),
      ...["set", "add", "transition", "view"].map((result) => canonicalResult(snapshot, { toolName: "todo_remove", result })),
      ...["todo_set", "todo_add", "todo_transition", "todo_view"].map((toolName) => canonicalResult(snapshot, { toolName, result: "remove" })),
    ];
    for (const candidate of candidates) {
      const { context, notify } = contextFor([canonicalResult(state("Earlier")), valid, candidate]);
      expect(restoreTodoState(context)).toEqual(snapshot);
      expect(notify).toHaveBeenCalledExactlyOnceWith("Skipped invalid Todo restore checkpoint.", "warning");
      const fallback = contextFor([candidate]);
      expect(restoreTodoState(fallback.context)).toEqual({ tasks: [] });
      expect(fallback.notify).toHaveBeenCalledExactlyOnceWith("Skipped invalid Todo restore checkpoint.", "warning");
    }
    const { context, notify } = contextFor([valid, ...candidates]);
    expect(restoreTodoState(context)).toEqual(snapshot);
    expect(notify).toHaveBeenCalledTimes(candidates.length);
    expect(notify.mock.calls.every(([message, level]) => message === "Skipped invalid Todo restore checkpoint." && level === "warning")).toBe(true);
  });

  it.each(["todo_set", "todo_add", "todo_remove"])("requires boolean false for %s checkpoint eligibility", (toolName) => {
    const result = toolName.slice("todo_".length);
    const valid = canonicalResult(state("Plan"), { toolName, result });
    for (const isError of [undefined, "false", 0, null, true]) {
      const candidate = canonicalResult(state("Bad"), { toolName, result });
      Reflect.set(candidate.message, "isError", isError);
      if (isError === undefined) Reflect.deleteProperty(candidate.message, "isError");
      const { context, notify } = contextFor([valid, candidate]);
      expect(restoreTodoState(context)).toEqual(state("Plan"));
      expect(notify).toHaveBeenCalledExactlyOnceWith("Skipped invalid Todo restore checkpoint.", "warning");
    }
  });

  it("returns independent empty states when no checkpoint exists", () => {
    const first = restoreTodoState(contextFor([]).context);
    const second = restoreTodoState(contextFor([]).context);
    expect(first).toEqual({ tasks: [] });
    expect(second).not.toBe(first);
    expect(second.tasks).not.toBe(first.tasks);
  });
});

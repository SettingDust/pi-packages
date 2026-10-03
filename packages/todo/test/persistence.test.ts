import { describe, expect, it, vi } from "vitest";
import { restoreTodoState } from "../src/persistence.js";
import { applyTodoAdd } from "../src/state.js";
import { TODO_STATUSES, type TodoState } from "../src/types.js";

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

  it.each(["todo_set", "todo_add"])("skips failed, incomplete, wrong-tool, wrong-version, and malformed %s checkpoints", (toolName) => {
    const result = toolName === "todo_add" ? "add" : "set";
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

  it.each(["todo_set", "todo_add"])("requires boolean false for %s checkpoint eligibility", (toolName) => {
    const result = toolName === "todo_add" ? "add" : "set";
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

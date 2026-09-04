import { describe, expect, it, vi } from "vitest";
import { restoreTodoState } from "../src/persistence.js";
import type { TodoState } from "../src/types.js";

const state = (name: string, status: "pending" | "in_progress" = "pending"): TodoState => ({
  tasks: [{ name, todos: [{
    name: `Complete ${name}`,
    description: `Detailed description for ${name}.`,
    status,
  }] }],
  ...(status === "in_progress" ? { workingOn: `Detailed description for ${name}.` } : {}),
});

const legacyState = (name: string, status: "pending" | "in_progress" = "pending") => ({
  phases: [{ name, tasks: [{
    name: `Complete ${name}`,
    description: `Detailed description for ${name}.`,
    status,
  }] }],
  ...(status === "in_progress" ? { workingOn: `Detailed description for ${name}.` } : {}),
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
  it("restores canonical tasks/todos from the newest current-branch checkpoint", () => {
    const older = canonicalResult(state("Plan"));
    const snapshot = state("Build", "in_progress");
    const newer = canonicalResult(snapshot, { result: "transition", toolName: "todo_transition" });
    const { context } = contextFor([older, { type: "message", message: { role: "assistant" } }, newer]);

    const restored = restoreTodoState(context);
    expect(restored).toEqual(state("Build", "in_progress"));
    expect(restored).not.toBe(snapshot);
    expect(restored.tasks).not.toBe(snapshot.tasks);
  });

  it("migrates a strict legacy phases/tasks checkpoint one way into canonical state", () => {
    const { context } = contextFor([legacyResult(legacyState("Build", "in_progress"))]);
    expect(restoreTodoState(context)).toEqual(state("Build", "in_progress"));
  });

  it("uses canonical-first root discrimination and fails closed on mixed or ambiguous roots", () => {
    const valid = canonicalResult(state("Plan"));
    const mixed = canonicalResult({ ...state("Mixed"), phases: [] });
    const neither = canonicalResult({ workingOn: "Nothing" });
    const { context, notify } = contextFor([valid, mixed, neither]);

    expect(restoreTodoState(context)).toEqual(state("Plan"));
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("requires strict legacy status and rejects unknown keys including legacyIdentifier", () => {
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

  it("skips failed, incomplete, wrong-tool, wrong-version, and malformed checkpoints with safe diagnostics", () => {
    const valid = canonicalResult(state("Plan"));
    const failed = canonicalResult(state("Failed"), { isError: true });
    const incomplete = { type: "message", message: { role: "toolResult", toolName: "todo_set", details: { result: "set" } } };
    const wrongTool = canonicalResult(state("Other"), { toolName: "other" });
    const wrongVersion = { ...canonicalResult(state("Future")), message: { ...canonicalResult(state("Future")).message, details: { result: "set", snapshot: state("Future"), version: 2 } } };
    const malformed = canonicalResult(state("Bad"), { result: "unknown" });
    const mismatchedResult = canonicalResult(state("Mismatch"), { result: "view", toolName: "todo_set" });
    const canonicalThroughLegacyTool = legacyResult(state("Not legacy"));
    const { context, notify } = contextFor([
      valid, failed, incomplete, wrongTool, wrongVersion, malformed, mismatchedResult, canonicalThroughLegacyTool,
    ]);

    expect(restoreTodoState(context)).toEqual(state("Plan"));
    expect(notify).toHaveBeenCalledTimes(7);
    expect(notify).toHaveBeenCalledWith("Skipped invalid Todo restore checkpoint.", "warning");
    expect(notify.mock.calls.flat().join(" ")).not.toContain("Failed");
  });

  it("requires boolean false for checkpoint eligibility and scans older records", () => {
    const valid = canonicalResult(state("Plan"));
    const stringIsError = {
      ...canonicalResult(state("String")),
      message: { ...canonicalResult(state("String")).message, isError: "false" },
    };
    const missingIsError = {
      type: "message",
      message: {
        role: "toolResult",
        toolName: "todo_set",
        details: { result: "set", snapshot: state("Missing") },
      },
    };
    const { context, notify } = contextFor([valid, stringIsError, missingIsError]);

    expect(restoreTodoState(context)).toEqual(state("Plan"));
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("returns independent empty canonical states when no valid checkpoint exists", () => {
    const first = restoreTodoState(contextFor([]).context);
    const second = restoreTodoState(contextFor([]).context);
    expect(first).toEqual({ tasks: [] });
    expect(second).not.toBe(first);
    expect(second.tasks).not.toBe(first.tasks);
  });
});

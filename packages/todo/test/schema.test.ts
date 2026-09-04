import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import {
  TodoAddParamsSchema,
  TodoSetParamsSchema,
  TodoTransitionParamsSchema,
  TodoViewParamsSchema,
} from "../src/schema.js";
import {
  parseTodoAddRequest,
  parseTodoSetRequest,
  parseTodoTransitionRequest,
  parseTodoViewRequest,
} from "../src/state.js";

describe("Todo request schemas", () => {
  it("accepts exactly the four provider request shapes", () => {
    expect(Check(TodoSetParamsSchema, { tasks: [] })).toBe(true);
    expect(Check(TodoSetParamsSchema, {
      tasks: [{ name: "Build", todos: [{ name: "Implement", description: "Implement the protocol." }] }],
    })).toBe(true);
    expect(Check(TodoAddParamsSchema, {
      task: "Build",
      todos: [{ name: "Test", description: "Test the protocol." }],
    })).toBe(true);
    expect(Check(TodoTransitionParamsSchema, {
      transitions: [{ task: "Build", todo: "Implement", status: "in_progress" }],
      workingOn: "Implement the protocol.",
    })).toBe(true);
    expect(Check(TodoViewParamsSchema, {})).toBe(true);
  });

  it("rejects cross-tool fields, creation statuses, and invalid array minima", () => {
    expect(Check(TodoSetParamsSchema, { tasks: [], initialTransitions: [] })).toBe(false);
    expect(Check(TodoSetParamsSchema, {
      tasks: [{ name: "Build", todos: [{ name: "Implement", description: "Implement.", status: "pending" }] }],
    })).toBe(false);
    expect(Check(TodoAddParamsSchema, { task: "Build", todos: [] })).toBe(false);
    expect(Check(TodoTransitionParamsSchema, { transitions: [] })).toBe(false);
    expect(Check(TodoTransitionParamsSchema, {
      transitions: [{ task: "Build", todo: "Implement", status: "active" }],
    })).toBe(false);
    expect(Check(TodoViewParamsSchema, { tasks: [] })).toBe(false);
  });

  it("has equivalent strict runtime parsers for schema-valid inputs", () => {
    expect(parseTodoSetRequest({ tasks: [] })).toEqual({ tasks: [] });
    expect(parseTodoAddRequest({
      task: "Build",
      todos: [{ name: "Test", description: "Test the protocol." }],
    })).toEqual({ task: "Build", todos: [{ name: "Test", description: "Test the protocol." }] });
    expect(parseTodoTransitionRequest({
      transitions: [{ task: "Build", todo: "Test", status: "completed" }],
    })).toEqual({ transitions: [{ task: "Build", todo: "Test", status: "completed" }] });
    expect(parseTodoViewRequest({})).toEqual({});

    expect(() => parseTodoSetRequest({ tasks: [], status: "pending" })).toThrow();
    expect(() => parseTodoAddRequest({ task: " Build", todos: [{ name: "Test", description: "Test." }] })).toThrow();
    expect(() => parseTodoTransitionRequest({
      transitions: [{ task: "Build", todo: "Test", status: "completed" }, { task: "Build", todo: "Test", status: "cancelled" }],
    })).toThrow();
    expect(() => parseTodoViewRequest({ legacyIdentifier: "old" })).toThrow();
  });
});

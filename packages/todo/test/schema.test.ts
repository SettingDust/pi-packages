import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import {
  TodoAddParamsSchema,
  TodoRemoveParamsSchema,
  TodoSetParamsSchema,
  TodoTransitionParamsSchema,
  TodoViewParamsSchema,
} from "../src/schema.js";
import {
  parseTodoAddRequest,
  parseTodoRemoveRequest,
  parseTodoSetRequest,
  parseTodoTransitionRequest,
  parseTodoViewRequest,
} from "../src/state.js";

describe("Todo request schemas", () => {
  it("accepts exactly the five provider request shapes", () => {
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
    })).toBe(true);
    expect(Check(TodoRemoveParamsSchema, { removals: [{ task: "Build", todo: "Implement" }, { task: "Empty" }] })).toBe(true);
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
    expect(Check(TodoTransitionParamsSchema, {
      transitions: [{ task: "Build", todo: "Implement", status: "in_progress" }],
      workingOn: "Implement the protocol.",
    })).toBe(false);
    expect(Check(TodoViewParamsSchema, { tasks: [] })).toBe(false);
  });

  it("keeps add shape and minItems strict while text and uniqueness remain runtime invariants", () => {
    const todo = { name: "Test", description: "Description." };
    const valid = { task: "Missing", todos: [todo] };
    expect(TodoAddParamsSchema.required).toEqual(["task", "todos"]);
    expect(Object.keys(TodoAddParamsSchema.properties)).toEqual(["task", "todos"]);
    expect(TodoAddParamsSchema.properties.todos).toMatchObject({ minItems: 1, items: { additionalProperties: false } });
    expect(Check(TodoAddParamsSchema, valid)).toBe(true);
    expect(parseTodoAddRequest(valid)).toEqual(valid);
    for (const invalid of [
      { task: "Missing" }, { todos: [todo] }, { ...valid, todos: [] }, { ...valid, extra: true },
      { ...valid, todos: [{ name: "Test" }] }, { ...valid, todos: [{ description: "Description." }] },
      { ...valid, todos: [{ ...todo, status: "pending" }] }, { ...valid, todos: [{ ...todo, extra: true }] },
      { ...valid, task: 42 }, { ...valid, todos: [{ ...todo, name: 42 }] }, { ...valid, todos: [{ ...todo, description: 42 }] },
    ]) {
      expect(Check(TodoAddParamsSchema, invalid)).toBe(false);
      expect(() => parseTodoAddRequest(invalid)).toThrow();
    }
    for (const invalid of [
      { ...valid, task: "" }, { ...valid, task: " Missing" },
      { ...valid, todos: [{ ...todo, name: "" }] }, { ...valid, todos: [{ ...todo, name: "Test " }] },
      { ...valid, todos: [{ ...todo, description: "" }] }, { ...valid, todos: [{ ...todo, description: " Description." }] },
      { ...valid, todos: [todo, todo] },
    ]) {
      expect(Check(TodoAddParamsSchema, invalid)).toBe(true);
      expect(() => parseTodoAddRequest(invalid)).toThrow();
    }
  });

  it("keeps removal selections disjoint and strict with runtime text and overlap checks", () => {
    const valid = { removals: [{ task: "Build", todo: "Test" }, { task: "Empty" }] };
    expect(TodoRemoveParamsSchema.required).toEqual(["removals"]);
    expect(Object.keys(TodoRemoveParamsSchema.properties)).toEqual(["removals"]);
    expect(TodoRemoveParamsSchema.properties.removals).toMatchObject({
      minItems: 1,
      items: { oneOf: [
        { type: "object", required: ["task", "todo"], properties: { task: { type: "string" }, todo: { type: "string" } }, additionalProperties: false },
        { type: "object", required: ["task"], properties: { task: { type: "string" } }, additionalProperties: false },
      ] },
    });
    expect(Check(TodoRemoveParamsSchema, valid)).toBe(true);
    expect(parseTodoRemoveRequest(valid)).toEqual(valid);
    for (const invalid of [
      null, [], {}, { ...valid, force: true }, { ...valid, status: "completed" },
      ...[null, {}, "Build", []].map((removals) => ({ removals })),
      ...[null, [], {}, { todo: "Test" }, { task: "Build", todo: null }, { task: "Build", todo: undefined },
        { task: null }, { task: 42 }, { task: "Build", todo: 42 },
        { task: "Build", force: true }, { task: "Build", status: "completed" }, { task: "Build", todo: "Test", extra: true },
      ].map((item) => ({ removals: [valid.removals[0], item] })),
    ]) {
      expect(Check(TodoRemoveParamsSchema, invalid), JSON.stringify(invalid)).toBe(false);
      expect(() => parseTodoRemoveRequest(invalid)).toThrow();
    }
    for (const invalid of [
      ...["", " ", " Build", "Build "].flatMap((text) => [
        { removals: [{ task: text }] }, { removals: [{ task: "Build", todo: text }] },
      ]),
      { removals: [{ task: "Build", todo: "Test" }, { task: "Build", todo: "Test" }] },
      { removals: [{ task: "Build" }, { task: "Build" }] },
      { removals: [{ task: "Build" }, { task: "Build", todo: "Test" }] },
      { removals: [{ task: "Build", todo: "Test" }, { task: "Build" }] },
    ]) {
      expect(Check(TodoRemoveParamsSchema, invalid)).toBe(true);
      expect(() => parseTodoRemoveRequest(invalid)).toThrow();
    }
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

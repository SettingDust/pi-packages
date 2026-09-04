import { describe, expect, it } from "vitest";
import {
  applyTodoAdd,
  applyTodoSet,
  applyTodoTransition,
  cloneTodoState,
  deriveActiveTask,
  isTodoState,
  parseTodoAddRequest,
  parseTodoSetRequest,
  parseTodoTransitionRequest,
} from "../src/state.js";

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

  it("adds pending todos only to an existing exact task", () => {
    const state = build();
    const next = applyTodoAdd(state, parseTodoAddRequest({
      task: "Build",
      todos: [{ name: "Test", description: "Test the protocol." }],
    }));

    expect(next.tasks[0].todos.at(-1)).toEqual({ name: "Test", description: "Test the protocol.", status: "pending" });
    expect(() => applyTodoAdd(state, parseTodoAddRequest({
      task: "build",
      todos: [{ name: "Test", description: "Test the protocol." }],
    }))).toThrow(/does not exist/);
    expect(() => applyTodoAdd(state, parseTodoAddRequest({
      task: "Build",
      todos: [{ name: "Implement", description: "Duplicate." }],
    }))).toThrow(/Duplicate/);
    expect(state.tasks[0].todos).toHaveLength(2);
  });

  it("derives the active task and workingOn from task then todo order", () => {
    const state = applyTodoTransition(build(), parseTodoTransitionRequest({
      transitions: [
        { task: "Release", todo: "Publish", status: "in_progress" },
        { task: "Build", todo: "Verify", status: "in_progress" },
        { task: "Build", todo: "Implement", status: "in_progress" },
      ],
      workingOn: "Implement the protocol.",
    }));

    expect(deriveActiveTask(state.tasks)?.name).toBe("Build");
    expect(state.workingOn).toBe("Implement the protocol.");
    expect(() => applyTodoTransition(state, parseTodoTransitionRequest({
      transitions: [{ task: "Build", todo: "Implement", status: "completed" }],
      workingOn: "Wrong description.",
    }))).toThrow(/does not match/);
    expect(applyTodoTransition(state, parseTodoTransitionRequest({
      transitions: [
        { task: "Build", todo: "Implement", status: "completed" },
        { task: "Build", todo: "Verify", status: "completed" },
        { task: "Release", todo: "Publish", status: "completed" },
      ],
    }))).toEqual(expect.objectContaining({ tasks: expect.any(Array) }));
  });

  it("rejects invalid canonical snapshots and preserves the original after failed transitions", () => {
    expect(isTodoState({
      tasks: [{ name: "Build", todos: [{ name: "Implement", description: "Implement.", status: "in_progress" }] }],
    })).toBe(false);
    expect(isTodoState({
      tasks: [{ name: "Build", todos: [{ name: "Implement", description: "Implement.", status: "in_progress" }] }],
      workingOn: "Implement.",
      extra: true,
    })).toBe(false);

    const state = build();
    expect(() => applyTodoTransition(state, parseTodoTransitionRequest({
      transitions: [
        { task: "Build", todo: "Implement", status: "completed" },
        { task: "Build", todo: "Missing", status: "completed" },
      ],
    }))).toThrow(/does not exist/);
    expect(state.tasks[0].todos[0].status).toBe("pending");
    expect(cloneTodoState(state)).not.toBe(state);
  });
});

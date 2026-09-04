import { describe, expect, it, vi } from "vitest";
import todoExtension from "../src/index.js";

type Tool = {
  name: string;
  parameters: { additionalProperties?: boolean };
  execute: (...args: any[]) => Promise<any>;
};

function setup(): { tools: Map<string, Tool>; handlers: Map<string, (...args: any[]) => unknown>; ctx: any; widgetCalls: any[] } {
  const tools = new Map<string, Tool>();
  const handlers = new Map<string, (...args: any[]) => unknown>();
  const widgetCalls: any[] = [];
  const ctx = { hasUI: true, ui: { setWidget: (id: string, content: unknown) => widgetCalls.push({ id, content }) }, sessionManager: { getBranch: () => [] } };
  todoExtension({
    registerTool: vi.fn((tool: Tool) => tools.set(tool.name, tool)),
    on: vi.fn((event: string, handler: (...args: any[]) => unknown) => handlers.set(event, handler)),
  } as never);
  return { tools, handlers, ctx, widgetCalls };
}

const run = (tool: Tool, params: unknown, ctx?: any) => tool.execute("call", params, undefined, undefined, ctx ?? { sessionManager: { getBranch: () => [] } });

const creation = (name: string) => ({ name, description: `${name} description` });

describe("Todo four-tool coordinator", () => {
  it("registers exactly four strict narrow tools and restore handlers", () => {
    const { tools, handlers } = setup();
    expect([...tools.keys()]).toEqual(["todo_set", "todo_add", "todo_transition", "todo_view"]);
    expect(tools.has("todo")).toBe(false);
    for (const tool of tools.values()) expect(tool.parameters.additionalProperties).toBe(false);
    expect([...handlers.keys()]).toEqual(["session_start", "session_tree", "session_compact", "before_agent_start", "agent_start", "agent_settled", "turn_end", "context"]);
  });

  it("sets pending todos, adds only to an exact existing task, transitions, and returns canonical snapshots", async () => {
    const { tools } = setup();
    const set = await run(tools.get("todo_set")!, {
      tasks: [{ name: "Build", todos: [creation("Code")] }, { name: "build", todos: [] }],
    });
    expect(set.details).toEqual({
      result: "set",
      snapshot: {
        tasks: [
          { name: "Build", todos: [{ ...creation("Code"), status: "pending" }] },
          { name: "build", todos: [] },
        ],
      },
    });

    const add = await run(tools.get("todo_add")!, { task: "Build", todos: [creation("Test")] });
    expect(add.details.snapshot.tasks[0].todos.map((todo: any) => [todo.name, todo.status])).toEqual([
      ["Code", "pending"], ["Test", "pending"],
    ]);
    expect((await run(tools.get("todo_add")!, { task: "BUILD", todos: [creation("Nope")] })).details).toEqual({
      result: "error", error: { code: "not_found", message: "Todo task does not exist." },
    });

    const transition = await run(tools.get("todo_transition")!, {
      transitions: [{ task: "Build", todo: "Test", status: "in_progress" }],
      workingOn: "Test description",
    });
    expect(transition.details).toEqual({
      result: "transition",
      snapshot: {
        tasks: [
          { name: "Build", todos: [{ ...creation("Code"), status: "pending" }, { ...creation("Test"), status: "in_progress" }] },
          { name: "build", todos: [] },
        ],
        workingOn: "Test description",
      },
    });

    const view = await run(tools.get("todo_view")!, {});
    expect(view.details).toEqual({ result: "view", snapshot: transition.details.snapshot });
    expect(JSON.parse(view.content[0].text)).toEqual(view.details);
  });

  it("rejects legacy and cross-tool request fields without changing state", async () => {
    const { tools } = setup();
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("Code")] }] });
    const before = (await run(tools.get("todo_view")!, {})).details.snapshot;

    for (const failure of [
      await run(tools.get("todo_set")!, { action: "set", tasks: [] }),
      await run(tools.get("todo_add")!, { task: "Build", todos: [creation("Bad")], workingOn: "Bad description" }),
      await run(tools.get("todo_transition")!, { transitions: [{ task: "Build", todo: "Code", status: "completed" }], action: "transition" }),
      await run(tools.get("todo_view")!, { action: "view" }),
    ]) expect(failure.details).toEqual({
      result: "error", error: { code: "invalid_request", message: "Object has an invalid shape." },
    });
    expect((await run(tools.get("todo_view")!, {})).details.snapshot).toEqual(before);
  });

  it("keeps failed multi-target transitions atomic and validates derived workingOn before publication", async () => {
    const { tools } = setup();
    await run(tools.get("todo_set")!, {
      tasks: [{ name: "Build", todos: [creation("One"), creation("Two")] }],
    });

    const missing = await run(tools.get("todo_transition")!, {
      transitions: [
        { task: "Build", todo: "One", status: "completed" },
        { task: "Build", todo: "Missing", status: "in_progress" },
      ],
    });
    expect(missing.details).toEqual({
      result: "error", error: { code: "not_found", message: "Todo transition target does not exist." },
    });
    const wrongWorkingOn = await run(tools.get("todo_transition")!, {
      transitions: [{ task: "Build", todo: "Two", status: "in_progress" }],
      workingOn: "wrong",
    });
    expect(wrongWorkingOn.details).toEqual({
      result: "error", error: { code: "invalid_working_on", message: "workingOn does not match the derived active todo." },
    });

    expect((await run(tools.get("todo_view")!, {})).details.snapshot.tasks[0].todos.map((todo: any) => todo.status)).toEqual([
      "pending", "pending",
    ]);
  });

  it("serializes mutations in invocation order and continues after an error result", async () => {
    const { tools } = setup();
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("First")] }] });

    const results = await Promise.allSettled([
      run(tools.get("todo_add")!, { task: "Build", todos: [creation("Second")] }),
      run(tools.get("todo_add")!, { task: "Missing", todos: [creation("Rejected")] }),
      run(tools.get("todo_add")!, { task: "Build", todos: [creation("Third")] }),
    ]);
    expect(results.map(({ status }) => status)).toEqual(["fulfilled", "fulfilled", "fulfilled"]);
    expect(results[1]).toEqual(expect.objectContaining({
      value: expect.objectContaining({ details: expect.objectContaining({ result: "error" }) }),
    }));
    const view = await run(tools.get("todo_view")!, {});
    expect(view.details.snapshot.tasks[0].todos.map((todo: any) => todo.name)).toEqual(["First", "Second", "Third"]);
  });

  it("restores one shared coordinator state for every handler", async () => {
    const { tools, handlers } = setup();
    const snapshot = { tasks: [{ name: "Restored", todos: [{ ...creation("Item"), status: "completed" }] }] };
    await handlers.get("session_tree")?.({}, {
      sessionManager: { getBranch: () => [{
        type: "message",
        message: { role: "toolResult", toolName: "todo_set", isError: false, details: { result: "set", snapshot } },
      }] },
    });
    expect((await run(tools.get("todo_view")!, {})).details.snapshot).toEqual(snapshot);
    expect((await run(tools.get("todo_add")!, { task: "Restored", todos: [creation("More")] })).details.snapshot.tasks[0].todos).toHaveLength(2);
  });
  it("clears stale terminal widget lifecycle before restore projection", async () => {
    const { tools, handlers, ctx, widgetCalls } = setup();
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("Code")] }] }, ctx);
    const snapshot = { tasks: [{ name: "Build", todos: [{ ...creation("Code"), status: "completed" }] }] };
    await handlers.get("session_tree")?.({}, {
      ...ctx,
      sessionManager: { getBranch: () => [{
        type: "message",
        message: { role: "toolResult", toolName: "todo_set", isError: false, details: { result: "set", snapshot } },
      }] },
    });
    expect(widgetCalls).toHaveLength(2);
    expect(widgetCalls[1]).toEqual({ id: "todo", content: undefined });
  });

  it("publishes committed snapshots once for each successful mutation only", async () => {
    const { tools, ctx, widgetCalls } = setup();
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("Code")] }] }, ctx);
    await run(tools.get("todo_add")!, { task: "Build", todos: [creation("Test")] }, ctx);
    await run(tools.get("todo_transition")!, {
      transitions: [{ task: "Build", todo: "Code", status: "completed" }],
    }, ctx);
    const published = widgetCalls.length;
    await run(tools.get("todo_view")!, {}, ctx);
    await run(tools.get("todo_add")!, { task: "Missing", todos: [creation("Rejected")] }, ctx);
    expect(widgetCalls).toHaveLength(published);
    expect(published).toBe(3);
  });
});

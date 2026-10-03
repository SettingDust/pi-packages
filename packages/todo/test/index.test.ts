import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import todoExtension from "../src/index.js";
import { Text, Key } from "@earendil-works/pi-tui";
import { DefaultResourceLoader, SessionManager, createAgentSession, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { FALLBACK_TODO_GLYPHS, NERD_FONT_TODO_GLYPHS } from "../src/glyphs.js";
import { TODO_STATUSES } from "../src/types.js";

type Tool = {
  name: string;
  description: string;
  parameters: { additionalProperties?: boolean };
  execute: (...args: any[]) => Promise<any>;
  renderCall: (args: unknown, theme: any, context?: { isPartial?: boolean; isError?: boolean }) => { render: (width: number) => string[] };
  renderResult: (result: unknown, options: { isPartial?: boolean; expanded?: boolean }, theme: any, context: { isError?: boolean }) => { render: (width: number) => string[] };
};

function setup(): { tools: Map<string, Tool>; handlers: Map<string, (...args: any[]) => unknown>; commands: Map<string, any>; shortcuts: Map<string, any>; ctx: any; widgetCalls: any[] } {
  const tools = new Map<string, Tool>();
  const handlers = new Map<string, (...args: any[]) => unknown>();
  const commands = new Map<string, any>();
  const shortcuts = new Map<string, any>();
  const widgetCalls: any[] = [];
  const ctx = { hasUI: true, ui: { setWidget: (id: string, content: unknown) => widgetCalls.push({ id, content }) }, sessionManager: { getBranch: () => [] } };
  todoExtension({
    registerTool: vi.fn((tool: Tool) => tools.set(tool.name, tool)),
    registerCommand: vi.fn((name: string, options: unknown) => commands.set(name, options)),
    registerShortcut: vi.fn((key: string, options: unknown) => shortcuts.set(key, options)),
    on: vi.fn((event: string, handler: (...args: any[]) => unknown) => handlers.set(event, handler)),
  } as never);
  return { tools, handlers, commands, shortcuts, ctx, widgetCalls };
}

const run = (tool: Tool, params: unknown, ctx?: any) => tool.execute("call", params, undefined, undefined, ctx ?? { sessionManager: { getBranch: () => [] } });

const creation = (name: string) => ({ name, description: `${name} description` });

describe("Todo four-tool coordinator", () => {
  it("registers exactly four strict narrow tools and restore handlers", () => {
    const { tools, handlers } = setup();
    expect([...tools.keys()]).toEqual(["todo_set", "todo_add", "todo_transition", "todo_view"]);
    expect(tools.has("todo")).toBe(false);
    expect(tools.get("todo_add")!.description).toBe("Append pending todos to an exact, case-sensitive task, or create it at the end if missing.");
    for (const tool of tools.values()) expect(tool.parameters.additionalProperties).toBe(false);
    expect([...handlers.keys()]).toEqual(["session_start", "session_tree", "session_compact", "session_shutdown", "before_agent_start", "agent_start", "agent_settled", "turn_end", "context"]);
  });

  it("enters the mounted widget through command and shortcut and declines unavailable contexts", async () => {
    const { tools, commands, shortcuts } = setup();
    expect([...commands.keys()]).toEqual(["todo-details"]);
    expect([...shortcuts.keys()]).toEqual([Key.ctrlShift("t")]);
    const command = commands.get("todo-details");
    const shortcut = shortcuts.get(Key.ctrlShift("t"));
    expect(command.description).toBe("Open Todo details");
    expect(shortcut.description).toBe(command.description);
    const notify = vi.fn();
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((_listener: (data: string) => unknown) => unsubscribe);
    let component: any;
    const tui = { terminal: { rows: 20 }, requestRender: vi.fn() };
    const ctx = { mode: "tui", hasUI: true, ui: {
      notify, onTerminalInput: subscribe,
      setWidget: (_id: string, factory: any) => { component?.dispose(); component = factory?.(tui, undefined); },
    }, sessionManager: { getBranch: () => [] } };
    await command.handler("", ctx);
    expect(notify).toHaveBeenCalledWith("Todo details require a visible above-editor widget.", "warning");
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("Code")] }] }, ctx);
    await command.handler("", ctx);
    await shortcut.handler(ctx);
    expect(subscribe).toHaveBeenCalledOnce();
    expect(component.render(80).join(" ")).toContain("Build");
    expect(subscribe.mock.calls[0]![0]("\x1b")).toEqual({ consume: true });
    expect(unsubscribe).toHaveBeenCalledOnce();
    await shortcut.handler(ctx);
    expect(subscribe).toHaveBeenCalledTimes(2);
    await command.handler("", { ...ctx, mode: "rpc" });
    await shortcut.handler({ ...ctx, mode: "print" });
    expect(notify).toHaveBeenCalledWith("Todo details require the interactive TUI.", "warning");
  });

  it("preserves expansion across add/transition but resets it on complete set", async () => {
    const { tools, commands } = setup();
    let mounted: any;
    const subscribe = vi.fn((_handler: (data: string) => unknown) => vi.fn());
    const ui = {
      onTerminalInput: subscribe,
      setWidget: (_id: string, factory: any) => {
        mounted?.dispose();
        mounted = factory?.({ terminal: { rows: 20 }, requestRender: vi.fn() }, undefined);
      },
    };
    const ctx = { mode: "tui", hasUI: true, ui, sessionManager: { getBranch: () => [] } };
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("Code")] }] }, ctx);
    await commands.get("todo-details").handler("", ctx);
    const input = subscribe.mock.calls[0]![0];
    input("\x1b[C");
    input("\x1b");
    await run(tools.get("todo_add")!, { task: "Build", todos: [creation("Test")] }, ctx);
    expect(mounted.render(80).join("\n")).toContain("Code description");
    await run(tools.get("todo_transition")!, { transitions: [{ task: "Build", todo: "Code", status: "completed" }] }, ctx);
    expect(mounted.render(80).join("\n")).toContain("Code description");
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("New")] }] }, ctx);
    expect(mounted.render(80).join("\n")).not.toContain("New description");
    expect(mounted.render(80)).toHaveLength(3);
  });

  it("discovers qualified Todo commands via public Pi loading in either order and fails ambiguous attribution", async () => {
    const agentDir = await mkdtemp(join(tmpdir(), "todo-command-"));
    try {
      for (const [reverse, ambiguous] of [[false, false], [true, false], [false, true]] as const) {
        let getCommands: ExtensionAPI["getCommands"] | undefined;
        const todo = { name: "todo", factory: (pi: ExtensionAPI) => {
          todoExtension(pi);
          pi.on("session_start", () => { getCommands = () => pi.getCommands(); });
        } };
        const other = { name: ambiguous ? "todo" : "other", factory: (pi: ExtensionAPI) => pi.registerCommand("todo-details", { description: ambiguous ? "Open Todo details" : "Other details", handler: async () => {} }) };
        const loader = new DefaultResourceLoader({ cwd: agentDir, agentDir, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true, extensionFactories: reverse ? [other, todo] : [todo, other] });
        await loader.reload();
        const notify = vi.fn();
        const { session, extensionsResult } = await createAgentSession({ cwd: agentDir, agentDir, resourceLoader: loader, sessionManager: SessionManager.inMemory(agentDir) });
        await session.bindExtensions({ mode: "tui", uiContext: { notify, setWidget: vi.fn() } as never });
        expect(extensionsResult.errors).toEqual([]);
        expect(extensionsResult.extensions.map(({ path, commands }) => [path, [...commands.keys()]])).toEqual(reverse
          ? [["<inline:other>", ["todo-details"]], ["<inline:todo>", ["todo-details"]]]
          : [["<inline:todo>", ["todo-details"]], [ambiguous ? "<inline:todo>" : "<inline:other>", ["todo-details"]]]);
        const commands = getCommands?.().filter((cmd) => cmd.name.startsWith("todo-details")) ?? [];
        expect(commands.map(({ name }) => name)).toEqual(["todo-details:1", "todo-details:2"]);
        expect(commands.every(({ source }) => source === "extension")).toBe(true);
        const discover = (list: typeof commands) => {
          const candidates = list.filter(({ description, sourceInfo }) => description === "Open Todo details" && sourceInfo.path === "<inline:todo>");
          if (candidates.length !== 1) throw new Error(`Ambiguous Todo command: ${candidates.map(({ name, sourceInfo }) => `${name} ${sourceInfo.path}`).join(", ")}`);
          return candidates[0].name;
        };
        if (ambiguous) {
          expect(() => discover(commands)).toThrow("Ambiguous Todo command: todo-details:1 <inline:todo>, todo-details:2 <inline:todo>");
        } else {
          const name = discover(commands);
          expect(name).toBe(reverse ? "todo-details:2" : "todo-details:1");
          await expect(session.prompt(`/${name}`)).resolves.toBeUndefined();
          expect(notify).toHaveBeenCalledWith("Todo details require a visible above-editor widget.", "warning");
        }
      }
    } finally {
      await rm(agentDir, { recursive: true, force: true });
    }
  });


  it("sets pending todos, appends or creates an exact task, transitions, and returns canonical snapshots", async () => {
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
    expect(add.details).toEqual({ result: "add", snapshot: { tasks: [
      { name: "Build", todos: [{ ...creation("Code"), status: "pending" }, { ...creation("Test"), status: "pending" }] },
      { name: "build", todos: [] },
    ] } });
    const created = await run(tools.get("todo_add")!, { task: "BUILD", todos: [creation("Code")] });
    expect(created.details).toEqual({ result: "add", snapshot: { tasks: [
      ...add.details.snapshot.tasks, { name: "BUILD", todos: [{ ...creation("Code"), status: "pending" }] },
    ] } });
    expect(JSON.parse(created.content[0].text)).toEqual(created.details);
    const emptyAppend = await run(tools.get("todo_add")!, { task: "build", todos: [creation("Code")] });
    expect(emptyAppend.details.snapshot.tasks.map((task: any) => task.name)).toEqual(["Build", "build", "BUILD"]);
    expect(emptyAppend.details.snapshot.tasks[1].todos).toEqual([{ ...creation("Code"), status: "pending" }]);

    const transition = await run(tools.get("todo_transition")!, {
      transitions: [{ task: "Build", todo: "Test", status: "in_progress" }],
    });
    expect(transition.details).toEqual({
      result: "transition",
      snapshot: {
        tasks: [
          { name: "Build", todos: [{ ...creation("Code"), status: "pending" }, { ...creation("Test"), status: "in_progress" }] },
          { name: "build", todos: [{ ...creation("Code"), status: "pending" }] },
          { name: "BUILD", todos: [{ ...creation("Code"), status: "pending" }] },
        ],
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

    const oldTransition = await run(tools.get("todo_transition")!, {
      transitions: [{ task: "Build", todo: "Code", status: "completed" }],
      workingOn: "Code description",
    });
    expect(oldTransition.details).toEqual({
      result: "error", error: { code: "invalid_request", message: "Object has an invalid shape." },
    });

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

  it("keeps failed multi-target transitions atomic and rejects old transition requests before publication", async () => {
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
    const oldRequest = await run(tools.get("todo_transition")!, {
      transitions: [{ task: "Build", todo: "Two", status: "in_progress" }],
      workingOn: "wrong",
    });
    expect(oldRequest.details).toEqual({
      result: "error", error: { code: "invalid_request", message: "Object has an invalid shape." },
    });

    const missingTask = await run(tools.get("todo_transition")!, {
      transitions: [{ task: "Missing", todo: "One", status: "completed" }],
    });
    expect(missingTask.details).toEqual({
      result: "error", error: { code: "not_found", message: "Todo transition target does not exist." },
    });
    expect((await run(tools.get("todo_view")!, {})).details.snapshot).toEqual({ tasks: [{
      name: "Build", todos: [creation("One"), creation("Two")].map((todo) => ({ ...todo, status: "pending" })),
    }] });
  });

  it("serializes mutations in invocation order and continues after an error result", async () => {
    const { tools } = setup();
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("First")] }] });

    const results = await Promise.allSettled([
      run(tools.get("todo_add")!, { task: "Build", todos: [creation("Second")] }),
      run(tools.get("todo_add")!, { task: "Build", todos: [creation("Rejected"), creation("Second")] }),
      run(tools.get("todo_add")!, { task: "Build", todos: [creation("Third")] }),
    ]);
    expect(results.map(({ status }) => status)).toEqual(["fulfilled", "fulfilled", "fulfilled"]);
    expect(results[1]).toEqual(expect.objectContaining({
      value: expect.objectContaining({ details: expect.objectContaining({ result: "error" }) }),
    }));
    const view = await run(tools.get("todo_view")!, {});
    expect(view.details.snapshot.tasks[0].todos.map((todo: any) => todo.name)).toEqual(["First", "Second", "Third"]);
  });

  it("creates then appends in the queue, publishes once per success, and recovers after a collision", async () => {
    const { tools, ctx, widgetCalls } = setup();
    const [created, appended, failed, recovered] = await Promise.all([
      run(tools.get("todo_add")!, { task: "New", todos: [creation("First")] }, ctx),
      run(tools.get("todo_add")!, { task: "New", todos: [creation("Second")] }, ctx),
      run(tools.get("todo_add")!, { task: "New", todos: [creation("Rejected"), creation("Second")] }, ctx),
      run(tools.get("todo_add")!, { task: "New", todos: [creation("Third")] }, ctx),
    ]);
    const snapshot = (names: string[]) => ({ tasks: [{ name: "New", todos: names.map((name) => ({ ...creation(name), status: "pending" })) }] });
    expect(created.details).toEqual({ result: "add", snapshot: snapshot(["First"]) });
    expect(appended.details).toEqual({ result: "add", snapshot: snapshot(["First", "Second"]) });
    expect(failed.details).toEqual({ result: "error", error: { code: "duplicate", message: "Duplicate todo name." } });
    expect(recovered.details).toEqual({ result: "add", snapshot: snapshot(["First", "Second", "Third"]) });
    expect(widgetCalls).toHaveLength(3);
    expect(widgetCalls.every(({ id, content }) => id === "todo" && typeof content === "function")).toBe(true);
    created.details.snapshot.tasks[0].todos[0].description = "Changed returned snapshot.";
    expect(appended.details.snapshot).toEqual(snapshot(["First", "Second"]));
    expect((await run(tools.get("todo_view")!, {}, ctx)).details).toEqual({ result: "view", snapshot: snapshot(["First", "Second", "Third"]) });
    expect(widgetCalls).toHaveLength(3);
  });

  it.each(["Build", "Missing"])("returns strict non-payload add errors without publishing for %s", async (task) => {
    const { tools, ctx, widgetCalls } = setup();
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("Existing")] }] }, ctx);
    const before = (await run(tools.get("todo_view")!, {}, ctx)).details.snapshot;
    for (const [params, code, message] of [
      [{ task, todos: [creation("Private"), creation("Private")] }, "duplicate", "Duplicate todo name."],
      [{ task, todos: [] }, "invalid_request", "todos must be a non-empty array."],
      [{ task, todos: [{ ...creation("Private"), status: "pending" }] }, "invalid_request", "Object has an invalid shape."],
      [{ task, todos: [creation("Private")], extra: "Secret" }, "invalid_request", "Object has an invalid shape."],
      [{ task, todos: [{ name: "Private", description: " Secret" }] }, "invalid_request", "Todo text must be trimmed and non-empty."],
    ] as const) {
      const failed = await run(tools.get("todo_add")!, params, ctx);
      expect(failed.details).toEqual({ result: "error", error: { code, message } });
      expect(JSON.parse(failed.content[0].text)).toEqual(failed.details);
      expect((await run(tools.get("todo_view")!, {}, ctx)).details.snapshot).toEqual(before);
      expect(widgetCalls).toHaveLength(1);
    }
  });

  it("replays a Host-recorded add creation checkpoint and appends while failed adds remain ineligible", async () => {
    const { tools, handlers, ctx, widgetCalls } = setup();
    const sessionManager = SessionManager.inMemory();
    const appendMessage = vi.spyOn(sessionManager, "appendMessage");
    const notify = vi.fn();
    const hostCtx = { ...ctx, sessionManager, ui: { ...ctx.ui, notify } };
    const prior = { name: "Build", todos: TODO_STATUSES.map((status) => ({ ...creation(status), status })) };
    sessionManager.appendMessage({ role: "toolResult", toolCallId: "seed", toolName: "todo_set", isError: false,
      content: [], details: { result: "set", snapshot: { tasks: [prior] } }, timestamp: Date.now() });
    await handlers.get("session_tree")?.({}, hostCtx);
    appendMessage.mockClear();
    const created = await run(tools.get("todo_add")!, { task: "New", todos: [creation("First")] }, hostCtx);
    expect(created.details).toEqual({ result: "add", snapshot: { tasks: [prior, { name: "New", todos: [{ ...creation("First"), status: "pending" }] }] } });
    expect(appendMessage).not.toHaveBeenCalled();
    sessionManager.appendMessage({ role: "toolResult", toolCallId: "created", toolName: "todo_add", isError: false,
      content: created.content, details: created.details, timestamp: Date.now() });
    const failed = await run(tools.get("todo_add")!, { task: "New", todos: [creation("Rejected"), creation("First")] }, hostCtx);
    const invalid = await run(tools.get("todo_add")!, { task: "Missing", todos: [] }, hostCtx);
    expect(failed.details.result).toBe("error");
    expect(invalid.details.result).toBe("error");
    expect(appendMessage).toHaveBeenCalledOnce();
    expect(widgetCalls).toHaveLength(2);
    for (const result of [failed, invalid]) sessionManager.appendMessage({ role: "toolResult", toolCallId: "failed", toolName: "todo_add", isError: false,
      content: result.content, details: result.details, timestamp: Date.now() });
    const restored = setup();
    await restored.handlers.get("session_tree")?.({}, hostCtx);
    expect(notify).toHaveBeenCalledTimes(2);
    expect((await run(restored.tools.get("todo_view")!, {}, hostCtx)).details.snapshot).toEqual(created.details.snapshot);
    const appended = await run(restored.tools.get("todo_add")!, { task: "New", todos: [creation("Second")] }, hostCtx);
    expect(appended.details).toEqual({ result: "add", snapshot: { tasks: [prior, {
      name: "New", todos: [creation("First"), creation("Second")].map((todo) => ({ ...todo, status: "pending" })),
    }] } });
    expect(appendMessage).toHaveBeenCalledTimes(3);
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

  it("retains interaction ownership across ExtensionContext instances and tears down on shutdown", async () => {
    const { tools, handlers, commands } = setup();
    let component: any;
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((_handler: (data: string) => unknown) => unsubscribe);
    const ui = {
      onTerminalInput: subscribe,
      setWidget: (_id: string, factory: any) => {
        component?.dispose();
        component = factory?.({ terminal: { rows: 20 }, requestRender: vi.fn() }, undefined);
      },
    };
    const ctx = { mode: "tui", hasUI: true, ui, sessionManager: { getBranch: () => [] } };
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("Code")] }] }, ctx);
    await commands.get("todo-details").handler("", { ...ctx, ui: { ...ui } });
    expect(subscribe).toHaveBeenCalledOnce();
    await handlers.get("session_start")?.({}, { ...ctx, ui: { ...ui } });
    expect(unsubscribe).toHaveBeenCalledOnce();
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("Code")] }] }, ctx);
    await commands.get("todo-details").handler("", { ...ctx, ui: { ...ui } });
    expect(subscribe).toHaveBeenCalledTimes(2);
    await handlers.get("session_shutdown")?.({}, { ...ctx, ui: { ...ui } });
    expect(unsubscribe).toHaveBeenCalledTimes(2);
    expect(component.render(80)).toContain("");
  });

  it("publishes committed snapshots once for each successful mutation only", async () => {
    const { tools, ctx, widgetCalls } = setup();
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("Code")] }] }, ctx);
    await run(tools.get("todo_add")!, { task: "Build", todos: [creation("Test")] }, ctx);
    await run(tools.get("todo_transition")!, {
      transitions: [{ task: "Build", todo: "Code", status: "completed" }],
    }, ctx);
    await run(tools.get("todo_add")!, { task: "New", todos: [creation("Created")] }, ctx);
    expect(widgetCalls).toHaveLength(4);
    const before = (await run(tools.get("todo_view")!, {}, ctx)).details.snapshot;
    const published = widgetCalls.length;
    await run(tools.get("todo_add")!, { task: "Build", todos: [creation("Rejected"), creation("Test")] }, ctx);
    await run(tools.get("todo_add")!, { task: "Missing", todos: [] }, ctx);
    await run(tools.get("todo_transition")!, {
      transitions: [{ task: "Build", todo: "Code", status: "in_progress" }],
      workingOn: "Code description",
    }, ctx);
    expect(widgetCalls).toHaveLength(published);
    expect((await run(tools.get("todo_view")!, {}, ctx)).details.snapshot).toEqual(before);
  });

  it("keeps committed success when widget rendering and notification fail", async () => {
    const { tools } = setup();
    const setWidget = vi.fn(() => { throw new Error("widget unavailable"); });
    const notify = vi.fn(() => { throw new Error("notification unavailable"); });
    const ctx = { hasUI: true, ui: { setWidget, notify }, sessionManager: { getBranch: () => [] } };
    const snapshot = {
      tasks: [{ name: "Build", todos: [{ ...creation("Code"), status: "pending" }] }],
    };

    const set = await run(tools.get("todo_set")!, {
      tasks: [{ name: "Build", todos: [creation("Code")] }],
    }, ctx);

    expect(setWidget).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledOnce();
    expect(set.details).toEqual({ result: "set", snapshot });
    expect(JSON.parse(set.content[0].text)).toEqual(set.details);
    expect((await run(tools.get("todo_view")!, {})).details).toEqual({ result: "view", snapshot });
  });
});

describe("native renderCall identity", () => {
  const contexts = [
    {},
    { isPartial: false },
    { isPartial: true },
    { isError: true },
    { isError: false },
    { isPartial: true, isError: true },
    { isPartial: true, isError: false },
    { isPartial: false, isError: true },
    { isPartial: false, isError: false },
  ];
  const args = {
    set: { tasks: [{ name: "Build", todos: [creation("Code")] }] },
    add: { task: "Build", todos: [creation("Test")] },
    transition: { transitions: [{ task: "Build", todo: "Code", status: "in_progress" }] },
    view: {},
  };

  it("returns a colored native identity and renders concrete operation todos", async () => {
    const { tools } = setup();
    const colors: string[] = [];
    const component = tools.get("todo_transition")!.renderCall({
      transitions: [
        { task: "Build", todo: "Code", status: "in_progress" },
        { task: "Build", todo: "Done", status: "completed" },
      ],
    }, { bold: (text: string) => text, fg: (color: string, text: string) => { colors.push(color); return text; } }, {});

    const output = component.render(120).join("\n");
    expect(output).toContain("todo_transition transition");
    expect(output).toContain("Build:     ");
    expect(output).toContain("Code");
    expect(output).toContain("Done");
    expect(colors).toEqual(expect.arrayContaining(["toolTitle", "text", "success"]));
  });

  it("colors partial summaries even when the operation has no todo rows", () => {
    const { tools } = setup();
    const colors: string[] = [];
    tools.get("todo_view")!.renderCall({}, { fg: (color: string, text: string) => { colors.push(color); return text; } }, { isPartial: true });
    expect(colors).toContain("toolTitle");
    expect(colors).toContain("muted");
  });

  it("counts a created task only when the exact task is missing and retains incomplete-argument summaries", async () => {
    const { tools } = setup();
    const add = tools.get("todo_add")!;
    const summary = (args: unknown) => add.renderCall(args, {}, {}).render(120)[1]?.trimEnd();
    expect(summary({ task: "Build", todos: [creation("First"), creation("Second")] })).toBe("1 task · 2 todos");
    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("Code")] }, { name: "Empty", todos: [] }] });
    expect(summary({ task: "Build", todos: [creation("Test")] })).toBe("2 tasks · 2 todos");
    expect(summary({ task: "Empty", todos: [creation("Test")] })).toBe("2 tasks · 2 todos");
    expect(summary({ task: "BUILD", todos: [creation("Test")] })).toBe("3 tasks · 2 todos");
    expect(summary({ todos: [creation("Test")] })).toBe("2 tasks · 2 todos");
    expect(summary({ task: "Missing" })).toBe("2 tasks · 1 todo");
  });

  it("returns zero-padding identity Text for all four tools and call flags", async () => {
    const { tools } = setup();
    await run(tools.get("todo_set")!, args.set);

    for (const action of ["set", "add", "transition", "view"] as const) {
      const identity = `todo_${action} ${action}`;
      for (const context of contexts) {
        const colors: string[] = [];
        const component = tools.get(`todo_${action}`)!.renderCall(args[action], {
          fg(color: string, text: string) {
            colors.push(color);
            return text;
          },
        }, context);
        expect(component).toBeInstanceOf(Text);
        expect(component.constructor.name).not.toBe("Container");
        expect(component.constructor.name).not.toBe("TodoToolFrame");
        const lines = component.render(80);
        expect(lines[0]?.startsWith(identity)).toBe(true);
        expect(lines.join("\n")).toMatch(/\d+ tasks? · \d+ todos?/);
        if (context.isPartial) expect(colors).toContain("muted");
      }
    }
  });

  it.each([
    { fallbackGlyphs: true, pending: FALLBACK_TODO_GLYPHS.pending, progress: FALLBACK_TODO_GLYPHS.in_progress, opposite: NERD_FONT_TODO_GLYPHS.pending },
    { fallbackGlyphs: false, pending: NERD_FONT_TODO_GLYPHS.pending, progress: NERD_FONT_TODO_GLYPHS.in_progress, opposite: FALLBACK_TODO_GLYPHS.pending },
  ])("uses live fallbackGlyphs=$fallbackGlyphs across registered calls, results, and widget", async ({ fallbackGlyphs, pending, progress, opposite }) => {
    const root = await mkdtemp(join(tmpdir(), "todo-renderer-glyphs-"));
    try {
      const project = join(root, "project");
      const settingsDir = join(project, ".pi", "todo");
      await mkdir(settingsDir, { recursive: true });
      await writeFile(join(settingsDir, "settings.json"), JSON.stringify({ fallbackGlyphs }));

      const { tools, handlers, ctx, widgetCalls } = setup();
      const liveCtx = { ...ctx, cwd: project, isProjectTrusted: () => true };
      await handlers.get("session_start")?.({}, liveCtx);

      const calls = [
        ["todo_set", { tasks: [{ name: "Build", todos: [creation("Code")] }] }, "Code"],
        ["todo_add", { task: "Build", todos: [creation("Test")] }, "Test"],
        ["todo_transition", { transitions: [{ task: "Build", todo: "Code", status: "in_progress" }] }, "Code"],
      ] as const;
      for (const [name, args, todo] of calls) {
        const output = tools.get(name)!.renderCall(args, {}, {}).render(120).join("\n");
        expect(output).toContain(name === "todo_transition" ? progress : pending);
        expect(output).not.toContain(opposite);
        expect(output).toContain(todo);
      }

      await run(tools.get("todo_set")!, calls[0][1], liveCtx);
      await run(tools.get("todo_add")!, calls[1][1], liveCtx);
      const transition = await run(tools.get("todo_transition")!, calls[2][1], liveCtx);
      const result = tools.get("todo_transition")!.renderResult(transition, { expanded: true }, {}, {}).render(120).join("\n");
      expect(result).toContain(progress);
      expect(result).not.toContain(opposite);
      expect(result).toContain("Code");

      const factory = widgetCalls.at(-1)?.content;
      expect(factory).toBeTypeOf("function");
      const widget = factory({}, {}).render(120).join("\n");
      expect(widget).toContain(progress);
      expect(widget).not.toContain(opposite);
      expect(widget).toContain("Code");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

describe("native renderResult content", () => {
  it("keeps result content, errors, and expanded rows independent of shell flags", async () => {
    const { tools } = setup();
    const set = tools.get("todo_set")!;
    const seed = { tasks: [{ name: "Build", todos: [creation("Code")] }] };
    const results = {
      set: await run(set, seed),
      add: await run(tools.get("todo_add")!, { task: "Build", todos: [creation("Test")] }),
      transition: await run(tools.get("todo_transition")!, { transitions: [{ task: "Build", todo: "Code", status: "in_progress" }] }),
      view: await run(tools.get("todo_view")!, {}),
    };
    const themes = { fg: (_color: string, text: string) => text };
    for (const action of ["set", "add", "transition", "view"] as const) {
      const tool = tools.get(`todo_${action}`)!;
      for (const options of [{}, { expanded: true }, { isPartial: true }, { isPartial: true, expanded: true }]) {
        for (const context of [{}, { isError: false }, { isError: true }]) {
          const output = tool.renderResult(results[action], options, themes, context).render(80).join("\n");
          if (options.isPartial && !context.isError) {
            expect(output).toBe("");
          } else if (options.expanded) {
            expect(output).toContain("Code");
          } else {
            expect(output).toMatch(/\d+ tasks? · \d+ todos?/);
          }
        }
      }
    }
    const error = await run(tools.get("todo_add")!, { task: "Build", todos: [creation("Rejected"), creation("Test")] });
    expect(tools.get("todo_add")!.renderResult(error, {}, themes, {}).render(80).join("\n").replace(/\s+/g, "")).toContain("Duplicatetodoname.");
  });
});
});

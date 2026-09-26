import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import todoExtension from "../src/index.js";
import { Text, Key } from "@earendil-works/pi-tui";
import { DefaultResourceLoader, SessionManager, createAgentSession, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { FALLBACK_TODO_GLYPHS, NERD_FONT_TODO_GLYPHS } from "../src/glyphs.js";

type Tool = {
  name: string;
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
    for (const tool of tools.values()) expect(tool.parameters.additionalProperties).toBe(false);
    expect([...handlers.keys()]).toEqual(["session_start", "session_tree", "session_compact", "before_agent_start", "agent_start", "agent_settled", "turn_end", "context"]);
  });

  it("opens current Todo details through the command and shortcut without touching non-TUI contexts", async () => {
    const { tools, commands, shortcuts } = setup();
    expect([...commands.keys()]).toEqual(["todo-details"]);
    expect([...shortcuts.keys()]).toEqual([Key.ctrlShift("t")]);
    const command = commands.get("todo-details");
    const shortcut = shortcuts.get(Key.ctrlShift("t"));
    expect(command.description).toBe("Open Todo details");
    expect(shortcut.description).toBe(command.description);
    const custom = vi.fn();
    const notify = vi.fn();
    const ctx = { mode: "tui", hasUI: true, ui: { custom, notify, setWidget: vi.fn() }, sessionManager: { getBranch: () => [] } };
    await command.handler("", ctx);
    await shortcut.handler(ctx);
    expect(custom).toHaveBeenCalledTimes(2);
    const theme = { fg: (_color: string, text: string) => text, bold: (text: string) => text };
    const tui = { terminal: { rows: 20 }, requestRender: vi.fn() };
    const initial = custom.mock.calls[0][0](tui, theme, {}, vi.fn());
    expect(initial.render(80).join(" ")).toContain("No todos");

    await run(tools.get("todo_set")!, { tasks: [{ name: "Build", todos: [creation("Code")] }] }, ctx);
    await shortcut.handler(ctx);
    const current = custom.mock.calls[2][0](tui, theme, {}, vi.fn());
    expect(current.render(80).join(" ")).toContain("Build");
    expect(initial.render(80).join(" ")).not.toContain("Build");
    await command.handler("", { ...ctx, mode: "rpc" });
    await shortcut.handler({ ...ctx, mode: "print" });
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith("Todo details require the interactive TUI.", "warning");
    expect(custom).toHaveBeenCalledTimes(3);
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
        const custom = vi.fn();
        const { session, extensionsResult } = await createAgentSession({ cwd: agentDir, agentDir, resourceLoader: loader, sessionManager: SessionManager.inMemory(agentDir) });
        await session.bindExtensions({ mode: "tui", uiContext: { custom, notify: vi.fn(), setWidget: vi.fn() } as never });
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
          expect(custom).toHaveBeenCalledTimes(1);
        }
      }
    } finally {
      await rm(agentDir, { recursive: true, force: true });
    }
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
    });
    expect(transition.details).toEqual({
      result: "transition",
      snapshot: {
        tasks: [
          { name: "Build", todos: [{ ...creation("Code"), status: "pending" }, { ...creation("Test"), status: "in_progress" }] },
          { name: "build", todos: [] },
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
    await run(tools.get("todo_transition")!, {
      transitions: [{ task: "Build", todo: "Code", status: "in_progress" }],
      workingOn: "Code description",
    }, ctx);
    expect(widgetCalls).toHaveLength(published);
    expect(published).toBe(3);
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
    { fallbackGlyphs: true, expected: FALLBACK_TODO_GLYPHS.pending, opposite: NERD_FONT_TODO_GLYPHS.pending },
    { fallbackGlyphs: false, expected: NERD_FONT_TODO_GLYPHS.pending, opposite: FALLBACK_TODO_GLYPHS.pending },
  ])("uses live fallbackGlyphs=$fallbackGlyphs across registered calls, results, and widget", async ({ fallbackGlyphs, expected, opposite }) => {
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
        expect(output).toContain(expected);
        expect(output).not.toContain(opposite);
        expect(output).toContain(todo);
      }

      await run(tools.get("todo_set")!, calls[0][1], liveCtx);
      await run(tools.get("todo_add")!, calls[1][1], liveCtx);
      const transition = await run(tools.get("todo_transition")!, calls[2][1], liveCtx);
      const result = tools.get("todo_transition")!.renderResult(transition, { expanded: true }, {}, {}).render(120).join("\n");
      expect(result).toContain(expected);
      expect(result).not.toContain(opposite);
      expect(result).toContain("Code");

      const factory = widgetCalls.at(-1)?.content;
      expect(factory).toBeTypeOf("function");
      const widget = factory({}, {}).render(120).join("\n");
      expect(widget).toContain(expected);
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
    const error = await run(tools.get("todo_add")!, { task: "Missing", todos: [creation("Rejected")] });
    expect(tools.get("todo_add")!.renderResult(error, {}, themes, {}).render(80).join("\n").replace(/\s+/g, "")).toContain("Todotaskdoesnotexist.");
  });
});
});

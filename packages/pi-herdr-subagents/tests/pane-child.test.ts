import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { visibleWidth, type Component } from "@earendil-works/pi-tui";
import paneChild from "../extensions/pane-child.js";

type Handler = (...args: any[]) => unknown;
type DoneTool = {
  execute: (...args: any[]) => Promise<unknown>;
  renderCall: (args: { result?: unknown }, renderTheme: typeof theme, context?: unknown) => Component;
};
const theme = {
  fg(_color: string, text: string) { return text; },
  bold(text: string) { return text; },
};
type Operations = {
  writeFile(path: string, data: string): Promise<void>;
  rename(source: string, destination: string): void;
};

class Deferred {
  readonly promise: Promise<void>;
  resolve!: () => void;
  reject!: (error: Error) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

class FakeTimers {
  private next = 0;
  private callbacks = new Map<number, () => void>();

  setTimeout = (callback: () => void): ReturnType<typeof setTimeout> => {
    const id = ++this.next;
    this.callbacks.set(id, callback);
    return id as unknown as ReturnType<typeof setTimeout>;
  };

  clearTimeout = (id: ReturnType<typeof setTimeout>): void => {
    this.callbacks.delete(id as unknown as number);
  };

  get pending(): number { return this.callbacks.size; }

  runAll(): void {
    const callbacks = [...this.callbacks.values()];
    this.callbacks.clear();
    for (const callback of callbacks) callback();
  }
}

function installFakeTimers(): { timers: FakeTimers; restore(): void } {
  const timers = new FakeTimers();
  const setTimeout = globalThis.setTimeout;
  const clearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = timers.setTimeout as typeof globalThis.setTimeout;
  globalThis.clearTimeout = timers.clearTimeout as typeof globalThis.clearTimeout;
  return { timers, restore: () => { globalThis.setTimeout = setTimeout; globalThis.clearTimeout = clearTimeout; } };
}

function childFixture(operations?: Operations) {
  const root = mkdtempSync(join(tmpdir(), "pane-child-test-"));
  const resultPath = join(root, "result.json");
  const environment = ["PI_HERDR_SUBAGENT_RESULT_PATH", "PI_HERDR_SUBAGENT_ID", "PI_HERDR_SUBAGENT_GENERATION"];
  const previous = new Map(environment.map(name => [name, process.env[name]]));
  process.env.PI_HERDR_SUBAGENT_RESULT_PATH = resultPath;
  process.env.PI_HERDR_SUBAGENT_ID = "subagent-1";
  process.env.PI_HERDR_SUBAGENT_GENERATION = "1";
  const handlers = new Map<string, Handler[]>();
  const tools = new Map<string, DoneTool>();
  const messages: Array<{ text: string; options: unknown }> = [];
  const starts: string[] = [];
  paneChild({
    on(event: string, handler: Handler) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
    registerTool(tool: { name: string } & DoneTool) { tools.set(tool.name, tool); },
    sendUserMessage(text: string, options: unknown) { messages.push({ text, options }); },
  } as any, operations);

  const emit = (event: string, ...args: any[]) => {
    let result: unknown;
    for (const handler of handlers.get(event) ?? []) result = handler(...args);
    return result;
  };
  return {
    resultPath,
    messages,
    starts,
    emit,
    input(source: "interactive" | "rpc" | "extension" = "interactive") {
      const result = emit("input", { type: "input", text: "late input", source });
      if ((result as { action?: string } | undefined)?.action !== "handled") {
        starts.push("before_agent_start", "agent_start");
        emit("before_agent_start");
        emit("agent_start");
      }
      return result;
    },
    done: tools.get("subagent_done")!,
    cleanup() {
      for (const [name, value] of previous) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
      rmSync(root, { recursive: true, force: true });
    },
  };
}

const completed = (summary: string) => `status: completed\nsummary: ${summary}\nreport: ok`;
const realOperations: Operations = { writeFile, rename: renameSync };

function rendered(component: Component, width = 1000): string {
  return component.render(width).map(line => line.trimEnd()).join("\n");
}

test("subagent_done shows the entire Result by default, expanded, after completion, and at narrow widths", async () => {
  const child = childFixture();
  const result = [...Array.from({ length: 20 }, (_, i) => `line-${i}`), "x".repeat(240), "FINAL-MARKER"].join("\n");
  try {
    for (const expanded of [false, true]) {
      expect(rendered(child.done.renderCall({ result }, theme, { expanded }))).toBe(`subagent_done\n${result}`);
    }
    const narrow = child.done.renderCall({ result }, theme).render(12);
    expect(narrow.length).toBeGreaterThan(10);
    expect(narrow.every(line => visibleWidth(line) <= 12)).toBe(true);
    expect(narrow.map(line => line.trimEnd()).join("")).toBe(`subagent_done${result.replaceAll("\n", "")}`);
    expect(await child.done.execute("done-render", { result }, undefined, undefined, { shutdown() {} })).toEqual({
      content: [{ type: "text", text: "Subagent result recorded." }], details: {},
    });
    expect(rendered(child.done.renderCall({ result }, theme, { expanded: false, executionStarted: true, argsComplete: true }))).toBe(`subagent_done\n${result}`);
  } finally {
    child.cleanup();
  }
});

test("subagent_done renders current partial argument snapshots and only a title for non-strings", () => {
  const child = childFixture();
  try {
    for (const args of [{}, { result: null }, { result: 123 }, { result: {} }]) {
      expect(rendered(child.done.renderCall(args, theme, { argsComplete: false }))).toBe("subagent_done");
    }
    for (const result of ["status: comp", "status: completed\nreport: |\n  partial", "replacement"]) {
      expect(rendered(child.done.renderCall({ result }, theme, { argsComplete: false, expanded: false }))).toBe(`subagent_done\n${result}`);
    }
  } finally {
    child.cleanup();
  }
});

test("subagent_done strips supported terminal sequences from display while persisting the raw Result", async () => {
  const child = childFixture();
  const result = "\nstatus: completed\nreport: |\n  \u001b[31mred\u001b[0m\u001b[2K\n  \u001b]8;;https://example.com\u0007link\u001b]8;;\u0007\n  literal\\n\n\n";
  const args = { result };
  try {
    expect(rendered(child.done.renderCall(args, theme))).toBe("subagent_done\n\nstatus: completed\nreport: |\n  red\n  link\n  literal\\n\n\n");
    expect(args.result).toBe(result);
    await child.done.execute("done-raw", args, undefined, undefined, { shutdown() {} });
    expect(JSON.parse(readFileSync(child.resultPath, "utf8")).result).toBe(result);
  } finally {
    child.cleanup();
  }
});

test("nudges one unfinished turn and deduplicates repeated agent_end events", () => {
  const child = childFixture();
  const clock = installFakeTimers();
  try {
    child.emit("agent_end");
    child.emit("agent_end");
    expect(clock.timers.pending).toBe(1);
    clock.timers.runAll();
    expect(child.messages).toEqual([{
      text: "No terminal result has been recorded yet. If your work is finished, call subagent_done with its outcome; otherwise, continue the remaining work.",
      options: { deliverAs: "followUp" },
    }]);
  } finally {
    clock.restore();
    child.cleanup();
  }
});

test("clears pending nudges for child lifecycle activity", () => {
  const child = childFixture();
  const clock = installFakeTimers();
  try {
    for (const event of ["before_agent_start", "agent_start", "input", "session_shutdown"]) {
      child.emit("agent_end");
      expect(clock.timers.pending).toBe(1);
      child.emit(event);
      expect(clock.timers.pending).toBe(0);
      clock.timers.runAll();
    }
    expect(child.messages).toEqual([]);
  } finally {
    clock.restore();
    child.cleanup();
  }
});

test("resumes continuation after active input starts another unfinished turn", () => {
  const child = childFixture();
  const clock = installFakeTimers();
  try {
    child.emit("agent_end");
    expect(child.input()).toBeUndefined();
    child.emit("agent_end");
    clock.timers.runAll();
    expect(child.messages).toHaveLength(1);
  } finally {
    clock.restore();
    child.cleanup();
  }
});

test("preserves active and pre-barrier input decisions", async () => {
  const gate = new Deferred();
  const child = childFixture({
    async writeFile(path, data) { await gate.promise; await writeFile(path, data); },
    rename: renameSync,
  });
  try {
    expect(child.input("rpc")).toBeUndefined();
    expect(child.starts).toEqual(["before_agent_start", "agent_start"]);
    const completion = child.done.execute("done-active", { result: completed("active ordering") }, undefined, undefined, { shutdown() {} });
    expect(child.starts).toEqual(["before_agent_start", "agent_start"]);
    gate.resolve();
    await completion;
  } finally {
    child.cleanup();
  }
});

test("consumes every settling input and shares one completion attempt", async () => {
  const gate = new Deferred();
  let writes = 0;
  let renames = 0;
  let shutdowns = 0;
  const child = childFixture({
    async writeFile(path, data) { writes += 1; await gate.promise; await writeFile(path, data); },
    rename(source, destination) { renames += 1; renameSync(source, destination); },
  });
  try {
    const first = child.done.execute("done-1", { result: completed("first") }, undefined, undefined, { shutdown() { shutdowns += 1; } });
    const duplicate = child.done.execute("done-2", { result: completed("duplicate") }, undefined, undefined, { shutdown() { shutdowns += 1; } });
    for (const source of ["interactive", "rpc", "extension"] as const) {
      expect(child.input(source)).toEqual({ action: "handled" });
    }
    child.emit("agent_end");
    await Promise.resolve();
    expect({ writes, renames, starts: child.starts }).toEqual({ writes: 1, renames: 0, starts: [] });
    gate.resolve();
    await Promise.all([first, duplicate]);
    expect({ writes, renames, shutdowns }).toEqual({ writes: 1, renames: 1, shutdowns: 1 });
    expect(JSON.parse(readFileSync(child.resultPath, "utf8")).result).toBe(completed("first"));
  } finally {
    child.cleanup();
  }
});

test("consumes settled input before shutdown returns and preserves the first Result", async () => {
  const child = childFixture(realOperations);
  let shutdownInput: unknown;
  let shutdowns = 0;
  try {
    await child.done.execute("done-settled", { result: completed("winner") }, undefined, undefined, {
      shutdown() {
        shutdowns += 1;
        shutdownInput = child.input("extension");
      },
    });
    const original = readFileSync(child.resultPath);
    expect(shutdownInput).toEqual({ action: "handled" });
    expect(child.input()).toEqual({ action: "handled" });
    await child.done.execute("done-late", { result: completed("loser") }, undefined, undefined, { shutdown() { shutdowns += 1; } });
    expect(readFileSync(child.resultPath)).toEqual(original);
    expect({ shutdowns, starts: child.starts }).toEqual({ shutdowns: 1, starts: [] });
  } finally {
    child.cleanup();
  }
});

test("propagates a shared write failure, restores active, and accepts one retry", async () => {
  const failure = new Deferred();
  let writes = 0;
  let shutdowns = 0;
  const child = childFixture({
    async writeFile(path, data) {
      writes += 1;
      if (writes === 1) await failure.promise;
      await writeFile(path, data);
    },
    rename: renameSync,
  });
  try {
    const first = child.done.execute("done-fail", { result: completed("failed") }, undefined, undefined, { shutdown() { shutdowns += 1; } });
    const duplicate = child.done.execute("done-fail-duplicate", { result: completed("ignored") }, undefined, undefined, { shutdown() { shutdowns += 1; } });
    expect(child.input()).toEqual({ action: "handled" });
    await Promise.resolve();
    failure.reject(new Error("write rejected"));
    const failures = await Promise.allSettled([first, duplicate]);
    expect(failures.map(result => result.status)).toEqual(["rejected", "rejected"]);
    expect({ writes, shutdowns, authoritative: existsSync(child.resultPath) }).toEqual({ writes: 1, shutdowns: 0, authoritative: false });
    expect(child.input()).toBeUndefined();

    await child.done.execute("done-retry", { result: completed("retry winner") }, undefined, undefined, { shutdown() { shutdowns += 1; } });
    await child.done.execute("done-late", { result: completed("late loser") }, undefined, undefined, { shutdown() { shutdowns += 1; } });
    expect({ writes, shutdowns }).toEqual({ writes: 2, shutdowns: 1 });
    expect(JSON.parse(readFileSync(child.resultPath, "utf8")).result).toBe(completed("retry winner"));
  } finally {
    child.cleanup();
  }
});

test("propagates rename failure and permits active retry", async () => {
  let renames = 0;
  let shutdowns = 0;
  const child = childFixture({
    writeFile,
    rename(source, destination) {
      renames += 1;
      if (renames === 1) throw new Error("rename rejected");
      renameSync(source, destination);
    },
  });
  try {
    await expect(child.done.execute("done-rename-fail", { result: completed("failed") }, undefined, undefined, { shutdown() { shutdowns += 1; } })).rejects.toThrow("rename rejected");
    expect({ shutdowns, authoritative: existsSync(child.resultPath), input: child.input() }).toEqual({ shutdowns: 0, authoritative: false, input: undefined });
    await child.done.execute("done-rename-retry", { result: completed("rename retry") }, undefined, undefined, { shutdown() { shutdowns += 1; } });
    expect({ renames, shutdowns }).toEqual({ renames: 2, shutdowns: 1 });
    expect(JSON.parse(readFileSync(child.resultPath, "utf8")).result).toBe(completed("rename retry"));
  } finally {
    child.cleanup();
  }
});

test("subagent_done clears nudges and atomically records the Result", async () => {
  const child = childFixture();
  const clock = installFakeTimers();
  let shutdowns = 0;
  try {
    child.emit("agent_end");
    await child.done.execute("done-atomic", { result: completed("done") }, undefined, undefined, {
      shutdown() { shutdowns += 1; },
    });
    child.emit("agent_end");
    expect(clock.timers.pending).toBe(0);
    clock.timers.runAll();
    expect(child.messages).toEqual([]);
    expect(JSON.parse(readFileSync(child.resultPath, "utf8"))).toEqual({
      subagentId: "subagent-1",
      generation: 1,
      status: "completed",
      result: completed("done"),
    });
    expect(shutdowns).toBe(1);
  } finally {
    clock.restore();
    child.cleanup();
  }
});

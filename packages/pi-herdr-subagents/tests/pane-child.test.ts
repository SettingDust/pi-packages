import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import paneChild from "../extensions/pane-child.js";

type Handler = (...args: any[]) => unknown;
type DoneTool = { execute: (...args: any[]) => Promise<unknown> };

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

function childFixture() {
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
  paneChild({
    on(event: string, handler: Handler) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
    registerTool(tool: { name: string } & DoneTool) { tools.set(tool.name, tool); },
    sendUserMessage(text: string, options: unknown) { messages.push({ text, options }); },
  } as any);
  return {
    resultPath,
    messages,
    emit(event: string, ...args: any[]) { for (const handler of handlers.get(event) ?? []) handler(...args); },
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

test("nudges one unfinished turn and deduplicates repeated agent_end events", () => {
  const child = childFixture();
  const clock = installFakeTimers();
  try {
    child.emit("agent_end");
    child.emit("agent_end");
    expect(clock.timers.pending).toBe(1);
    clock.timers.runAll();
    expect(child.messages).toEqual([{
      text: "Your task is still active. Call subagent_done when finished.",
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

test("resumes continuation after input starts another unfinished turn", () => {
  const child = childFixture();
  const clock = installFakeTimers();
  try {
    child.emit("agent_end");
    child.emit("input");
    child.emit("before_agent_start");
    child.emit("agent_start");
    child.emit("agent_end");
    clock.timers.runAll();
    expect(child.messages).toHaveLength(1);
  } finally {
    clock.restore();
    child.cleanup();
  }
});

test("subagent_done clears nudges and atomically records the Result", async () => {
  const child = childFixture();
  const clock = installFakeTimers();
  let shutdowns = 0;
  try {
    child.emit("agent_end");
    await child.done.execute("done-1", { result: "status: completed\nsummary: done\nreport: ok" }, undefined, undefined, {
      shutdown() { shutdowns += 1; },
    });
    child.emit("agent_end");
    expect(clock.timers.pending).toBe(0);
    clock.timers.runAll();
    expect(child.messages).toEqual([]);
  } finally {
    clock.restore();
  }
  for (let attempt = 0; !existsSync(child.resultPath) && attempt < 50; attempt++) await Bun.sleep(10);
  try {
    expect(JSON.parse(readFileSync(child.resultPath, "utf8"))).toEqual({
      subagentId: "subagent-1",
      generation: 1,
      status: "completed",
      result: "status: completed\nsummary: done\nreport: ok",
    });
    expect(shutdowns).toBe(1);
  } finally {
    child.cleanup();
  }
});

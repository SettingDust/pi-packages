import { expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { visibleWidth, type Component } from "@earendil-works/pi-tui";
import paneChild from "../extensions/pane-child.js";
import { consumeImages, imageLaunch, protectImageDirectory } from "../src/image-input.js";

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

function childFixture(operations?: Operations, imageInput = false) {
  const root = mkdtempSync(join(tmpdir(), "pane-child-test-"));
  const artifactDir = join(root, "tasks", "subagent-1-artifacts");
  if (imageInput) mkdirSync(artifactDir, { recursive: true });
  const resultPath = imageInput ? join(artifactDir, "result-1.json") : join(root, "result.json");
  const environment = ["PI_HERDR_SUBAGENT_RESULT_PATH", "PI_HERDR_SUBAGENT_ID", "PI_HERDR_SUBAGENT_GENERATION", "PI_HERDR_SUBAGENT_IMAGE_INPUT"];
  const previous = new Map(environment.map(name => [name, process.env[name]]));
  if (imageInput) process.env.PI_HERDR_SUBAGENT_IMAGE_INPUT = "1";
  else delete process.env.PI_HERDR_SUBAGENT_IMAGE_INPUT;
  process.env.PI_HERDR_SUBAGENT_RESULT_PATH = resultPath;
  process.env.PI_HERDR_SUBAGENT_ID = "subagent-1";
  process.env.PI_HERDR_SUBAGENT_GENERATION = "1";
  const imageDirectory = join(artifactDir, "image-input-1");
  const payload = join(imageDirectory, "envelope.json");
  if (imageInput) {
    mkdirSync(imageDirectory, { mode: 0o700 }); protectImageDirectory(imageDirectory);
    writeFileSync(payload, JSON.stringify({ version: 1, subagentId: "subagent-1", generation: 1,
      images: [{ type: "image", data: "AQ==", mimeType: "image/png" }] }), { mode: 0o600 });
  }
  const handlers = new Map<string, Handler[]>();
  const tools = new Map<string, DoneTool>();
  const messages: Array<{ text: string; options: unknown }> = [];
  const starts: string[] = [];
  const control = paneChild({
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
    imageDirectory,
    payload,
    launch: imageInput ? imageLaunch(join(root, "tasks", "subagent-1-g1.jsonl")) : undefined,
    control: control!,
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

for (const ancestor of ["task", "scope"] as const) {
  for (const outcome of ["done", "failure"] as const) {
    for (const timing of ["before-write", "after-write"] as const) {
      test(`image Result writer refuses ${ancestor} redirection ${timing} for ${outcome} and retries safely`, async () => {
        let redirect = () => {};
        let writes = 0;
        let publications = 0;
        const child = childFixture({
          async writeFile(path, data) { writes++; await writeFile(path, data); if (timing === "after-write") redirect(); },
          rename(source, destination) { publications++; renameSync(source, destination); },
        }, true);
        const artifact = dirname(child.resultPath);
        const target = ancestor === "task" ? artifact : dirname(artifact);
        const held = `${target}-held`;
        const outside = join(dirname(dirname(artifact)), "outside");
        const externalArtifact = ancestor === "task" ? outside : join(outside, "subagent-1-artifacts");
        mkdirSync(externalArtifact, { recursive: true });
        writeFileSync(join(externalArtifact, "sentinel"), "untouched");
        let redirected = false;
        let shutdowns = 0;
        redirect = () => {
          if (redirected) return;
          renameSync(target, held);
          fs.symlinkSync(outside, target, process.platform === "win32" ? "junction" : "dir");
          redirected = true;
        };
        const complete = () => outcome === "done"
          ? child.done.execute("done", { result: "OWNED_RESULT" }, undefined, undefined, { shutdown() { shutdowns++; } })
          : child.control.fail("storage", () => { shutdowns++; });
        try {
          if (timing === "before-write") redirect();
          await expect(complete()).rejects.toThrow();
          expect(fs.readdirSync(externalArtifact)).toEqual(["sentinel"]);
          expect(readFileSync(join(externalArtifact, "sentinel"), "utf8")).toBe("untouched");
          expect(writes).toBe(timing === "before-write" ? 0 : 1);
          expect(publications).toBe(0);
          expect(shutdowns).toBe(0);
          expect(child.control.isActive()).toBeTrue();
          rmSync(target, { force: true }); renameSync(held, target); redirected = false;
          redirect = () => {};
          await complete();
          expect(JSON.parse(readFileSync(child.resultPath, "utf8"))).toMatchObject(outcome === "done"
            ? { status: "completed", result: "OWNED_RESULT" } : { status: "failed", error: "image_input_failed:storage" });
          expect(publications).toBe(1);
          expect(shutdowns).toBe(1);
          child.emit("session_shutdown");
          expect(existsSync(child.imageDirectory)).toBeFalse();
          expect(fs.readdirSync(externalArtifact)).toEqual(["sentinel"]);
        } finally {
          if (redirected) { rmSync(target, { force: true }); renameSync(held, target); }
          child.cleanup();
        }
      }, 30_000);
    }
  }
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


test("image failure control shares the completion barrier and keeps first successful Result", async () => {
  const blocked = new Deferred();
  const child = childFixture({ writeFile: async (path, body) => { await blocked.promise; await writeFile(path, body); }, rename: renameSync });
  try {
    expect(child.control.isActive()).toBeTrue();
    const success = child.done.execute("first", { result: "authoritative success" }, undefined, undefined, { shutdown() {} });
    const failure = child.control.fail("normalization");
    expect(child.control.isActive()).toBeFalse();
    expect(child.input("extension")).toEqual({ action: "handled" });
    blocked.resolve();
    await Promise.all([success, failure]);
    expect(JSON.parse(readFileSync(child.resultPath, "utf8"))).toEqual({ subagentId: "subagent-1", generation: 1, status: "completed", result: "authoritative success" });
    await child.control.fail("delivery");
    expect(readFileSync(child.resultPath, "utf8")).not.toContain("image_input_failed");
  } finally { child.cleanup(); }
});

test("published child Result survives failed temporary unlink and later completion", async () => {
  const child = childFixture(undefined, true);
  const unlink = fs.unlinkSync;
  let temporary = "";
  let failOnce = true;
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  const cleanup = spyOn(fs, "unlinkSync").mockImplementation(path => {
    if (String(path).startsWith(child.resultPath + ".") && String(path).endsWith(".tmp")) {
      temporary = String(path);
      if (failOnce) { failOnce = false; throw new Error("private path and payload must not be logged"); }
    }
    return unlink(path);
  });
  let shutdowns = 0;
  try {
    await child.done.execute("first", { result: "FIRST_DURABLE_RESULT" }, undefined, undefined, { shutdown() { shutdowns++; } });
    expect(child.control.isActive()).toBeFalse();
    expect(child.input()).toEqual({ action: "handled" });
    const first = readFileSync(child.resultPath);
    expect(existsSync(temporary)).toBeTrue();
    await child.done.execute("later", { result: "SECOND_RESULT" }, undefined, undefined, { shutdown() { shutdowns++; } });
    expect(existsSync(temporary)).toBeFalse();
    expect(readFileSync(child.resultPath)).toEqual(first);
    expect(JSON.parse(first.toString()).result).toBe("FIRST_DURABLE_RESULT");
    expect(shutdowns).toBe(1);
    expect(warn).toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain("private path and payload must not be logged");
  } finally { cleanup.mockRestore(); warn.mockRestore(); child.cleanup(); }
});

test("child Result temporary creation cannot write through a preexisting hardlink", async () => {
  const child = childFixture(undefined, true);
  const sentinel = join(dirname(dirname(dirname(child.resultPath))), "external-sentinel");
  writeFileSync(sentinel, "DO_NOT_OVERWRITE");
  const original = fsPromises.open;
  let collision = "";
  const writer = spyOn(fsPromises, "open").mockImplementation((path, flags, mode) => {
    if (String(path).startsWith(child.resultPath + ".") && String(path).endsWith(".tmp")) {
      collision = String(path);
      fs.linkSync(sentinel, collision);
    }
    return original(path, flags, mode);
  });
  try {
    await expect(child.done.execute("collision", { result: "OWNED_RESULT" }, undefined, undefined, { shutdown() {} })).rejects.toThrow();
    expect(collision).not.toBe("");
    expect(readFileSync(sentinel, "utf8")).toBe("DO_NOT_OVERWRITE");
    expect(readFileSync(collision, "utf8")).toBe("DO_NOT_OVERWRITE");
    expect(existsSync(child.resultPath)).toBeFalse();
    expect(child.control.isActive()).toBeTrue();
    writer.mockRestore();
    fs.unlinkSync(collision);
    await child.done.execute("safe", { result: "OWNED_RESULT" }, undefined, undefined, { shutdown() {} });
    expect(JSON.parse(readFileSync(child.resultPath, "utf8")).result).toBe("OWNED_RESULT");
  } finally { writer.mockRestore(); child.cleanup(); }
});

for (const leaf of ["hardlink", "symlink"] as const) {
  test(`child refuses preexisting redirected Result ${leaf} and retains active retry`, async () => {
    const child = childFixture(undefined, true);
    const foreign = join(dirname(dirname(dirname(child.resultPath))), "foreign-result");
    const bytes = JSON.stringify({ subagentId: "subagent-1", generation: 1, status: "completed", result: "FOREIGN_RESULT" });
    writeFileSync(foreign, bytes);
    if (leaf === "hardlink") fs.linkSync(foreign, child.resultPath);
    else fs.symlinkSync(foreign, child.resultPath, "file");
    let shutdowns = 0;
    try {
      await expect(child.done.execute("foreign", { result: "OWNED_RESULT" }, undefined, undefined, { shutdown() { shutdowns++; } })).rejects.toThrow();
      expect(child.control.isActive()).toBeTrue();
      expect(shutdowns).toBe(0);
      expect(readFileSync(foreign, "utf8")).toBe(bytes);
      fs.unlinkSync(child.resultPath);
      await child.done.execute("safe", { result: "OWNED_RESULT" }, undefined, undefined, { shutdown() { shutdowns++; } });
      expect(JSON.parse(readFileSync(child.resultPath, "utf8")).result).toBe("OWNED_RESULT");
      expect(shutdowns).toBe(1);
    } finally { child.cleanup(); }
  }, process.platform === "win32" ? 30_000 : 10_000); // Rejection and safe retry retain real serialized ACL checks.
}

test("image failure preserves an already published authoritative Result", async () => {
  const child = childFixture();
  try {
    const original = JSON.stringify({ subagentId: "subagent-1", generation: 1, status: "completed", result: "previous writer" });
    await writeFile(child.resultPath, original);
    await child.control.fail("startup");
    expect(readFileSync(child.resultPath, "utf8")).toBe(original);
    expect(child.control.isActive()).toBeFalse();
  } finally { child.cleanup(); }
});

test("image failure persists a safe stage and shutdown closes image activity", async () => {
  const child = childFixture();
  const clock = installFakeTimers();
  try {
    child.emit("agent_end");
    const failing = child.control.fail("path/payload/decoder detail");
    expect(child.control.isActive()).toBeFalse();
    expect(clock.timers.pending).toBe(0);
    expect(child.input("rpc")).toEqual({ action: "handled" });
    await failing;
    expect(JSON.parse(readFileSync(child.resultPath, "utf8"))).toEqual({ subagentId: "subagent-1", generation: 1, status: "failed", error: "image_input_failed:delivery" });
  } finally { clock.restore(); child.cleanup(); }
  const shutdown = childFixture();
  try {
    shutdown.emit("session_shutdown");
    expect(shutdown.control.isActive()).toBeFalse();
  } finally { shutdown.cleanup(); }
});

test("I-CLEANUP child consumption and read failure delete only the expected payload", async () => {
  for (const scenario of ["success", "read", "envelope"]) {
    const child = childFixture(undefined, true);
    let read: { mockRestore(): void } | undefined;
    try {
      if (scenario === "read") read = spyOn(fsPromises, "open").mockRejectedValue(new Error("SECRET /private/AQ=="));
      if (scenario === "envelope") writeFileSync(child.payload, "{broken");
      if (scenario === "success") {
        expect(await consumeImages(child.launch!, child.control.isActive)).toEqual([{ type: "image", data: "AQ==", mimeType: "image/png" }]);
        await child.control.fail("delivery");
      } else {
        await expect(consumeImages(child.launch!, child.control.isActive)).rejects.toThrow(`Image input failed at ${scenario}.`);
        read?.mockRestore(); // Inject only the consumer read, not the subsequent Result open.
        await child.control.fail(scenario);
      }
      expect(existsSync(child.imageDirectory)).toBeFalse();
      expect(readFileSync(child.resultPath, "utf8")).toContain("image_input_failed:");
      expect(readFileSync(child.resultPath, "utf8")).not.toMatch(/SECRET|private|AQ==|envelope\.json/);
    } finally { read?.mockRestore(); child.cleanup(); }
  }
}, 60_000);

test("I-CLEANUP child completion and shutdown clean pending input, preserve the winning Result", async () => {
  for (const scenario of ["done", "shutdown", "failure"]) {
    const child = childFixture(undefined, true);
    try {
      const other = join(child.imageDirectory, "..", "image-input-2");
      mkdirSync(other); writeFileSync(join(other, "envelope.json"), "other generation");
      if (scenario === "done") await child.done.execute("done", { result: "winning Result" }, undefined, undefined, { shutdown() {} });
      if (scenario === "failure") await child.control.fail("delivery");
      child.emit("session_shutdown");
      expect(child.control.isActive()).toBeFalse();
      expect(existsSync(child.imageDirectory)).toBeFalse();
      expect(readFileSync(join(other, "envelope.json"), "utf8")).toBe("other generation");
      const bytes = scenario !== "shutdown" ? readFileSync(child.resultPath) : undefined;
      child.emit("session_shutdown"); // Missing files are successful cleanup.
      if (bytes) expect(readFileSync(child.resultPath)).toEqual(bytes);
      else expect(existsSync(child.resultPath)).toBeFalse();
      await expect(consumeImages(child.launch!, child.control.isActive)).rejects.toThrow("Image input failed at terminal.");
    } finally { child.cleanup(); }
  }
}, 60_000);

test("I-CLEANUP child delete failure reports safely, preserves Result, and retries at shutdown", async () => {
  const child = childFixture(undefined, true);
  const remove = fs.rmSync;
  const deletion = spyOn(fs, "rmSync").mockImplementation((path, options) => {
    if (String(path) === child.payload) throw new Error("SECRET /private/AQ==");
    return remove(path, options);
  });
  const warnings = spyOn(console, "warn").mockImplementation(() => {});
  try {
    await child.done.execute("done", { result: "winning Result" }, undefined, undefined, { shutdown() {} });
    expect(warnings.mock.calls).toEqual([["Image input cleanup failed for the child generation."]]);
    const bytes = readFileSync(child.resultPath);
    expect(existsSync(child.payload)).toBeTrue();
    await child.control.fail("delivery");
    expect(readFileSync(child.resultPath)).toEqual(bytes);
    deletion.mockRestore();
    child.emit("session_shutdown");
    expect(existsSync(child.imageDirectory)).toBeFalse();
    expect(readFileSync(child.resultPath)).toEqual(bytes);
  } finally { deletion.mockRestore(); warnings.mockRestore(); child.cleanup(); }
}, 60_000);

test("I-CLEANUP shutdown during a pending open prevents attachment and cleans the orphan", async () => {
  const child = childFixture(undefined, true);
  const opened = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const open = fsPromises.open;
  const opening = spyOn(fsPromises, "open").mockImplementation(async (...args: Parameters<typeof fsPromises.open>) => {
    const file = await open(...args);
    opened.resolve(); await release.promise;
    return file;
  });
  const warnings = spyOn(console, "warn").mockImplementation(() => {});
  try {
    const consuming = consumeImages(child.launch!, child.control.isActive);
    await opened.promise;
    child.emit("session_shutdown");
    release.resolve();
    await expect(consuming).rejects.toThrow("Image input failed at terminal.");
    // Windows may retain an open handle until close; the next bounded boundary retries.
    child.emit("session_shutdown");
    expect(existsSync(child.imageDirectory)).toBeFalse();
    expect(existsSync(child.resultPath)).toBeFalse();
  } finally { release.resolve(); opening.mockRestore(); warnings.mockRestore(); child.cleanup(); }
}, 60_000);

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createHerdrClient } from "pi-herdr";
import activateSubagents, { AgentRegistry, SubagentRuntime, createHerdrTransport, createSubagentTools, type CompletionNotification, type HerdrTransport } from "../src/index.js";

function fakeTransport(paneExists: boolean | (() => boolean) = true) {
  const calls: unknown[] = [];
  const transport: HerdrTransport = {
    async createTab(input) { calls.push({ op: "create", input }); return { tabId: "tab-1", paneId: "pane-1" }; },
    async run(paneId, command, args) { calls.push({ op: "run", paneId, command, args }); },
    async sendText(paneId, text) { calls.push({ op: "send", paneId, text }); },
    async closePane(paneId) { calls.push({ op: "close", paneId }); },
    async paneExists(paneId) { calls.push({ op: "exists", paneId }); return typeof paneExists === "function" ? paneExists() : paneExists; },
  };
  return { calls, transport };
}

function handlerRegistry(body = "Handler"): AgentRegistry {
  const registry = new AgentRegistry();
  registry.setFiles([{ path: "/handler.md", content: `---\nname: handler\n---\n${body}` }]);
  return registry;
}

async function waitFor(predicate: () => boolean, timeout = 2500): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for runtime settlement");
    await Bun.sleep(20);
  }
}

describe("pi-herdr-subagents runtime", () => {
  test("parses Herdr tab create identities", async () => {
    const client = createHerdrClient(async () => ({
      code: 0,
      stderr: "",
      stdout: JSON.stringify({ id: "cli:tab:create", result: { root_pane: { pane_id: "wF:p6", tab_id: "wF:t5" }, tab: { tab_id: "wF:t5", workspace_id: "wF" }, type: "tab_created" } }),
    }));
    const transport = createHerdrTransport(client, { workspaceId: "wF" });
    await expect(transport.createTab({ cwd: "/repo", label: "task" })).resolves.toEqual({ tabId: "wF:t5", paneId: "wF:p6" });
  });

  test("positively verifies retained panes", async () => {
    const present = createHerdrTransport(createHerdrClient(async () => ({ code: 0, stdout: "{}", stderr: "" })));
    await expect(present.paneExists("pane-1")).resolves.toBeTrue();
    const missing = createHerdrTransport(createHerdrClient(async () => ({
      code: 1, stderr: "", stdout: JSON.stringify({ error: { code: "pane_not_found" } }),
    })));
    await expect(missing.paneExists("pane-1")).resolves.toBeFalse();
  });

  test("launches Pi through an exact-arguments Node bootstrap", async () => {
    const registry = handlerRegistry("Execute the Handoff.");
    const { calls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-test-"));
    const runtime = new SubagentRuntime(transport, registry, root);
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "Do\nthe work", label: "task", taskSlug: "task", model: "test/model", thinking: "high" });
    expect(task).toMatchObject({ subagentId: "task", generation: 1, sessionFile: join(root, "tasks", "task-g1.jsonl"), status: "running" });
    const manifest = JSON.parse(readFileSync(join(dirname(task.resultPath), "task.json"), "utf8"));
    expect(manifest).toMatchObject({ version: 1, subagentId: task.subagentId, generation: 1, status: "running", paneId: "pane-1" });
    expect(calls[0]).toMatchObject({ op: "create", input: { cwd: "/repo", env: { PI_HERDR_SUBAGENT_ID: "task", PI_HERDR_SUBAGENT_GENERATION: "1" } } });
    const launch = calls[1] as { op: string; command: string; args: string[] };
    expect(launch).toMatchObject({ op: "run", command: "powershell.exe" });
    const scriptPath = launch.args.at(-1)!;
    expect(scriptPath).toBe(join(root, "tasks", "task-artifacts", "launch-1.ps1"));
    const script = readFileSync(scriptPath, "utf8");
    const bootstrapPath = join(root, "tasks", "task-artifacts", "launch-1.cjs");
    expect(script.charCodeAt(0)).toBe(0xfeff);
    expect(script).toContain(bootstrapPath);
    expect(script).not.toContain("Execute the Handoff.");
    expect(script).not.toContain("Do\nthe work");
    const bootstrap = readFileSync(bootstrapPath, "utf8");
    expect(spawnSync("node", ["--check", bootstrapPath]).status).toBe(0);
    expect(bootstrap).toContain("spawnSync(spec.command, spec.args");
    expect(bootstrap).toContain("child_exited_without_result");
    expect(bootstrap).toContain('status: "failed"');
    const encoded = bootstrap.match(/Buffer\.from\(\"([^\"]+)\"/)?.[1];
    const spec = JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as { command: string; args: string[] };
    expect(spec.command).toBe(process.execPath);
    expect(spec.args[0]).toBe(process.argv[1]);
    expect(spec.args).toContain("Execute the Handoff.");
    expect(spec.args).toContain("test/model:high");
    expect(spec.args.at(-1)).toContain("Do\nthe work");

    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "status: completed\nsummary: done\nreport: ok" }));
    await expect(runtime.join(task.subagentId)).resolves.toMatchObject({ status: "completed", result: expect.stringContaining("status: completed") });
  });

  test("resume preserves parent-session identity, while steer, cancel, and remove own lifecycle", async () => {
    const { calls, transport } = fakeTransport();
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-parent-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const runtime = new SubagentRuntime(transport, handlerRegistry());
    const first = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "task", taskSlug: "task", parentSessionFile });
    writeFileSync(first.sessionFile, "");
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry" }));
    const completed = await runtime.join(first.subagentId);
    expect(completed.status).toBe("failed");
    const second = await runtime.resume(first.subagentId, "two");
    expect(second).toMatchObject({
      subagentId: first.subagentId,
      generation: 2,
      sessionFile: first.sessionFile,
      resultPath: join(parentDir, "parent", "tasks", "task-artifacts", "result-2.json"),
    });
    await expect(runtime.steer(first.subagentId, "focus")).resolves.toMatchObject({ generation: 2 });
    await expect(runtime.cancel(first.subagentId)).resolves.toMatchObject({ status: "cancelled" });
    await runtime.remove(first.subagentId);
    expect(existsSync(first.sessionFile)).toBeFalse();
    expect(existsSync(dirname(second.resultPath))).toBeFalse();
    expect(calls.filter(value => (value as { op?: string }).op === "close")).toHaveLength(1);
  });

  test("executes the named-Agent spawn tool under the parent session", async () => {
    const registry = new AgentRegistry();
    registry.setFiles([
      { path: "/handler.md", content: "---\nname: handler\n---\nHandler" },
      { path: "/reviewer.md", content: "---\nname: reviewer\n---\nReviewer" },
    ]);
    const { transport } = fakeTransport();
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-parent-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const tools = createSubagentTools(new SubagentRuntime(transport, registry), "/repo", parentSessionFile);
    expect(tools.map(tool => tool.name)).toEqual(["subagent_spawn", "subagent_resume", "subagent_inspect", "subagent_join", "subagent_steer", "subagent_cancel", "subagent_remove"]);
    const parameters = tools[0]!.parameters as { required?: string[]; properties: Record<string, { enum?: unknown }> };
    expect(parameters.properties.agent?.enum).toEqual(["handler", "reviewer"]);
    expect(parameters.properties).toHaveProperty("taskSlug");
    expect(tools[0]!.description).toContain("taskSlug is required");

    const spawned = await (tools[0]!.execute as any)("call-1", {
      agent: "handler",
      prompt: "Do the work",
      label: "task",
      taskSlug: "tool-spawn",
      model: "test/model",
      thinking: "high",
    });
    expect(spawned.details).toMatchObject({
      model: "test/model",
      thinking: "high",
      sessionFile: join(parentDir, "parent", "tasks", "tool-spawn-g1.jsonl"),
      status: "running",
    });
  });

  test("resolves the requested Agent locally without exposing its body", async () => {
    const registry = new AgentRegistry();
    registry.setFiles([{ path: "/reviewer.md", content: "---\nname: reviewer\n---\nReview the work." }]);
    const { transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-agent-"));
    const runtime = new SubagentRuntime(transport, registry, root);

    const task = await runtime.spawn({ agent: "reviewer", cwd: "/repo", prompt: "Review", label: "review", taskSlug: "task",});
    expect(task).toMatchObject({ agent: "reviewer" });
    expect(task).not.toHaveProperty("handlerBody");
    const bootstrap = readFileSync(join(root, "tasks", "task-artifacts", "launch-1.cjs"), "utf8");
    const encoded = bootstrap.match(/Buffer\.from\(\"([^\"]+)\"/)?.[1];
    const spec = JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as { args: string[] };
    expect(spec.args).toContain("Review the work.");
  });

  test("requires the requested Agent in its registry", async () => {
    const { transport } = fakeTransport();
    const runtime = new SubagentRuntime(transport, new AgentRegistry(), mkdtempSync(join(tmpdir(), "subagents-missing-agent-")));

    await expect(runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "Do the work", label: "task", taskSlug: "task",}))
      .rejects.toThrow("Required Agent is unavailable: handler");
  });

  test("does not reuse persisted task artifacts after runtime reconstruction", async () => {
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-rebuilt-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const first = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "first", label: "first", taskSlug: "task", parentSessionFile,
    });
    writeFileSync(first.sessionFile, "");
    writeFileSync(first.resultPath, JSON.stringify({
      subagentId: first.subagentId, generation: first.generation, status: "completed", result: "old result",
    }));

    const rebuilt = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    const second = await rebuilt.spawn({ agent: "handler", cwd: "/repo", prompt: "second", label: "second", taskSlug: "task", parentSessionFile });
    expect(second).toMatchObject({ subagentId: "task-2", generation: 1, status: "running" });
    expect(second.resultPath).not.toBe(first.resultPath);

    writeFileSync(second.resultPath, JSON.stringify({
      subagentId: second.subagentId, generation: second.generation, status: "completed", result: "new result",
    }));
    await expect(rebuilt.join(second.subagentId)).resolves.toMatchObject({ status: "completed", result: "new result" });
    await rebuilt.remove(second.subagentId);
    expect(existsSync(dirname(first.resultPath))).toBeTrue();
  });

  test("recovers a running pane without relaunching it", async () => {
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-recover-running-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const first = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "work", label: "running", taskSlug: "task", parentSessionFile,
    });
    writeFileSync(first.sessionFile, "");

    const { calls, transport } = fakeTransport(true);
    const rebuilt = new SubagentRuntime(transport, handlerRegistry());
    await rebuilt.recover("/repo", parentSessionFile);
    expect(rebuilt.inspect(first.subagentId)).toMatchObject({ generation: 1, status: "running", paneId: first.paneId });
    await rebuilt.steer(first.subagentId, "continue");
    expect(calls.filter(call => ["create", "run"].includes((call as { op: string }).op))).toHaveLength(0);
    expect(calls).toContainEqual({ op: "exists", paneId: first.paneId });
    expect(calls).toContainEqual({ op: "send", paneId: first.paneId, text: "continue" });
  });

  test("recovers a terminal Result before checking the retained pane", async () => {
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-recover-result-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const first = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "work", label: "done", taskSlug: "task", parentSessionFile,
    });
    writeFileSync(first.resultPath, JSON.stringify({
      subagentId: first.subagentId, generation: first.generation, status: "cancelled",
    }));

    const { calls, transport } = fakeTransport(false);
    const rebuilt = new SubagentRuntime(transport, handlerRegistry());
    await rebuilt.recover("/repo", parentSessionFile);
    await expect(rebuilt.join(first.subagentId)).resolves.toMatchObject({ status: "cancelled", generation: 1 });
    expect(calls).toHaveLength(0);
  });

  test("persists pane_closed when a running task's pane is missing", async () => {
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-recover-missing-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const first = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "work", label: "missing", taskSlug: "task", parentSessionFile,
    });
    writeFileSync(first.sessionFile, "");

    const rebuilt = new SubagentRuntime(fakeTransport(false).transport, handlerRegistry());
    await rebuilt.recover("/repo", parentSessionFile);
    await expect(rebuilt.join(first.subagentId)).resolves.toMatchObject({ status: "failed", error: "pane_closed" });
    const manifest = JSON.parse(readFileSync(join(dirname(first.resultPath), "task.json"), "utf8"));
    expect(manifest).toMatchObject({ version: 1, subagentId: first.subagentId, status: "failed", error: "pane_closed" });
    await rebuilt.remove(first.subagentId);
    expect(existsSync(dirname(first.resultPath))).toBeFalse();
  });

  test("recovers only the current generation and rejects a mismatched Result", async () => {
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-recover-generation-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    const first = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "generation", taskSlug: "task", parentSessionFile });
    writeFileSync(first.sessionFile, "");
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry" }));
    await original.join(first.subagentId);
    const second = await original.resume(first.subagentId, "two");

    const running = new SubagentRuntime(fakeTransport(true).transport, handlerRegistry());
    await running.recover("/repo", parentSessionFile);
    expect(running.inspect(first.subagentId)).toMatchObject({ generation: 2, status: "running", sessionFile: first.sessionFile });

    writeFileSync(second.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "completed", result: "stale" }));
    const rebuilt = new SubagentRuntime(fakeTransport(true).transport, handlerRegistry());
    await rebuilt.recover("/repo", parentSessionFile);
    await expect(rebuilt.join(first.subagentId, 2)).resolves.toMatchObject({ status: "failed", error: "result_identity_mismatch" });
    const third = await rebuilt.resume(first.subagentId, "three");
    expect(third).toMatchObject({ generation: 3, sessionFile: first.sessionFile });
  });

  test("recovery is idempotent and scoped to the current parent session", async () => {
    const parentA = join(mkdtempSync(join(tmpdir(), "subagents-scope-a-")), "parent.jsonl");
    const parentB = join(mkdtempSync(join(tmpdir(), "subagents-scope-b-")), "parent.jsonl");
    const first = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "a", label: "parent-a", taskSlug: "task", parentSessionFile: parentA,
    });
    const second = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "b", label: "parent-b", taskSlug: "task", parentSessionFile: parentB,
    });
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "a" }));
    writeFileSync(second.resultPath, JSON.stringify({ subagentId: second.subagentId, generation: 1, status: "failed", error: "b" }));

    const rebuilt = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    await rebuilt.recover("/repo", parentA);
    await rebuilt.recover("/repo", parentA);
    expect(rebuilt.inspect("task")).toMatchObject({ label: "parent-a", error: "a" });
    await rebuilt.recover("/repo", parentB);
    expect(rebuilt.inspect("task")).toMatchObject({ label: "parent-b", error: "b" });
  });
  test("actively settles completed and failed Results without join or inspect", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-notify-result-"));
    const notifications: CompletionNotification[] = [];
    const runtime = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), root, notification => { notifications.push(notification); });
    const completed = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "complete", taskSlug: "task",});
    writeFileSync(completed.resultPath, JSON.stringify({
      subagentId: completed.subagentId, generation: completed.generation, status: "completed", result: "full YAML must stay private",
    }));
    await waitFor(() => notifications.length === 1);
    expect(runtime.inspect(completed.subagentId)).toMatchObject({ status: "completed", result: "full YAML must stay private" });
    expect(notifications[0]).toEqual({ subagentId: completed.subagentId, generation: 1, status: "completed", label: "complete" });
    expect(notifications[0]).not.toHaveProperty("result");

    const failed = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "fail", taskSlug: "task",});
    writeFileSync(failed.resultPath, JSON.stringify({
      subagentId: failed.subagentId, generation: failed.generation, status: "failed", error: "child failed",
    }));
    await waitFor(() => notifications.length === 2);
    expect(notifications[1]).toEqual({ subagentId: failed.subagentId, generation: 1, status: "failed", label: "fail", reason: "child failed" });
    runtime.stop();
  });

  test("notifies cancellation and an unexpectedly closed pane", async () => {
    let panePresent = true;
    const notifications: CompletionNotification[] = [];
    const runtime = new SubagentRuntime(
      fakeTransport(() => panePresent).transport,
      handlerRegistry(),
      mkdtempSync(join(tmpdir(), "subagents-notify-terminal-")),
      notification => { notifications.push(notification); },
    );
    const cancelled = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "cancel", taskSlug: "task",});
    await runtime.cancel(cancelled.subagentId);
    expect(notifications[0]).toEqual({ subagentId: cancelled.subagentId, generation: 1, status: "cancelled", label: "cancel" });

    const closed = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "closed", taskSlug: "task",});
    panePresent = false;
    await waitFor(() => notifications.length === 2);
    expect(runtime.inspect(closed.subagentId)).toMatchObject({ status: "failed", error: "pane_closed" });
    expect(notifications[1]).toEqual({ subagentId: closed.subagentId, generation: 1, status: "failed", label: "closed", reason: "pane_closed" });
    runtime.stop();
  });

  test("notifies launch failure before spawn rejects", async () => {
    const notifications: CompletionNotification[] = [];
    const transport = fakeTransport().transport;
    transport.createTab = async () => { throw new Error("launch unavailable"); };
    const runtime = new SubagentRuntime(
      transport,
      handlerRegistry(),
      mkdtempSync(join(tmpdir(), "subagents-notify-launch-")),
      notification => { notifications.push(notification); },
    );
    await expect(runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "launch", taskSlug: "task",})).rejects.toThrow("launch unavailable");
    expect(notifications).toEqual([{
      subagentId: "task", generation: 1, status: "failed", label: "launch", reason: "Error: launch unavailable",
    }]);
  });

  test("backfills a missed notification after restart and deduplicates repeated recovery", async () => {
    const parentSessionFile = join(mkdtempSync(join(tmpdir(), "subagents-notify-recover-")), "parent.jsonl");
    const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    const task = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "recover", taskSlug: "task", parentSessionFile });
    original.stop();
    writeFileSync(task.resultPath, JSON.stringify({
      subagentId: task.subagentId, generation: task.generation, status: "completed", result: "full result",
    }));

    const notifications: CompletionNotification[] = [];
    const rebuilt = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), undefined, notification => { notifications.push(notification); });
    await rebuilt.recover("/repo", parentSessionFile);
    expect(notifications).toEqual([{ subagentId: task.subagentId, generation: 1, status: "completed", label: "recover" }]);
    await rebuilt.recover("/repo", parentSessionFile);
    const restartedAgain = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), undefined, notification => { notifications.push(notification); });
    await restartedAgain.recover("/repo", parentSessionFile);
    expect(notifications).toHaveLength(1);
  });

  test("session startup backfills missed notifications and honors parent-session markers", async () => {
    const parentSessionFile = join(mkdtempSync(join(tmpdir(), "subagents-notify-startup-")), "parent.jsonl");
    const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    const consumed = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "consumed", taskSlug: "task", parentSessionFile });
    const missed = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "two", label: "missed", taskSlug: "task", parentSessionFile });
    original.stop();
    for (const task of [consumed, missed]) writeFileSync(task.resultPath, JSON.stringify({
      subagentId: task.subagentId, generation: task.generation, status: "completed", result: "full result",
    }));

    const registry = handlerRegistry();
    const runtime = new SubagentRuntime(fakeTransport().transport, registry);
    const handlers: Record<string, (event: unknown, ctx: any) => Promise<void>> = {};
    const messages: Array<{ message: any; options: any }> = [];
    const childResultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    activateSubagents({
      on(event: string, handler: (event: unknown, ctx: any) => Promise<void>) { handlers[event] = handler; },
      sendMessage(message: unknown, options: unknown) { messages.push({ message, options }); },
    } as any, { runtime, registry });
    if (childResultPath) process.env.PI_HERDR_SUBAGENT_RESULT_PATH = childResultPath;
    const consumedEntry = {
      type: "custom_message",
      customType: "pi-herdr-subagent-completion",
      details: { subagentId: consumed.subagentId, generation: 1, status: "completed", label: "consumed" },
    };
    const ctx = {
      cwd: "/repo",
      sessionManager: { getSessionFile: () => parentSessionFile, getEntries: () => [consumedEntry] },
    };
    await handlers.session_start!({}, ctx);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.message.details).toMatchObject({ subagentId: missed.subagentId, label: "missed" });
    ctx.sessionManager.getEntries = () => [consumedEntry, { ...messages[0]!.message, type: "custom_message" }];
    await handlers.session_start!({}, ctx);
    expect(messages).toHaveLength(1);
  });

  test("injects a summary-only Pi completion message that triggers the parent", async () => {
    const registry = handlerRegistry();
    const runtime = new SubagentRuntime(fakeTransport().transport, registry, mkdtempSync(join(tmpdir(), "subagents-notify-pi-")));
    const messages: Array<{ message: any; options: any }> = [];
    const childResultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    activateSubagents({
      on() {},
      sendMessage(message: unknown, options: unknown) { messages.push({ message, options }); },
    } as any, { runtime, registry });
    if (childResultPath) process.env.PI_HERDR_SUBAGENT_RESULT_PATH = childResultPath;
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "pi", taskSlug: "task",});
    writeFileSync(task.resultPath, JSON.stringify({
      subagentId: task.subagentId, generation: task.generation, status: "completed", result: "secret full YAML",
    }));
    await waitFor(() => messages.length === 1);
    expect(messages[0]!.options).toEqual({ triggerTurn: true, deliverAs: "followUp" });
    expect(messages[0]!.message).toMatchObject({
      customType: "pi-herdr-subagent-completion",
      display: true,
      details: { subagentId: task.subagentId, generation: 1, status: "completed", label: "pi" },
    });
    expect(JSON.stringify(messages[0])).not.toContain("secret full YAML");
    runtime.stop();
  });
});

test("passes pane commands as one quoted PowerShell invocation", async () => {
  const calls: string[][] = [];
  const client = createHerdrClient(async (_command, args) => { calls.push([...args]); return { code: 0, stdout: "", stderr: "" }; });
  const transport = createHerdrTransport(client);
  await transport.run("wF:p6", "pi", ["--session", "C:\\A B\\session.jsonl", "it's done"]);
  expect(calls).toEqual([["pane", "run", "wF:p6", "& 'pi' '--session' 'C:\\A B\\session.jsonl' 'it''s done'"]]);
});

test("discovers package Agents from pi.agents directories", async () => {
  const root = mkdtempSync(join(tmpdir(), "subagents-package-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ pi: { agents: ["./"] } }));
  writeFileSync(join(root, "handler.md"), "---\nname: handler\ndescription: Harness Handler\n---\nUse the validated Handler protocol.");
  const registry = new AgentRegistry();
  await registry.discover("/repo", [root]);
  expect(registry.list().map(agent => agent.name)).toContain("handler");
  expect(registry.get("handler")).toMatchObject({ path: join(root, "handler.md"), body: "Use the validated Handler protocol." });
});


describe("runtime task observation", () => {
  test("projects private task state into defensive snapshots and emits synchronous updates", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-observation-"));
    const notifications: CompletionNotification[] = [];
    const runtime = new SubagentRuntime(fakeTransport().transport, handlerRegistry(), root, notification => { notifications.push(notification); });
    const events: string[] = [];
    const unsubscribeThrowing = runtime.onTaskUpdate(() => { throw new Error("listener failed"); });
    const unsubscribe = runtime.onTaskUpdate(() => {
      events.push(runtime.listTasks()[0]?.status ?? "empty");
    });

    expect(events).toEqual([]);
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "observe", taskSlug: "task", model: "secret-model", thinking: "secret-thinking" });
    expect(events).toEqual(["running"]);
    const snapshot = runtime.listTasks();
    expect(snapshot).toHaveLength(1);
    expect(Object.keys(snapshot[0]!)).toEqual(["subagentId", "generation", "agent", "label", "status", "createdAt"]);
    expect(snapshot[0]).not.toHaveProperty("result");
    expect(snapshot[0]).not.toHaveProperty("error");
    expect(snapshot[0]).not.toHaveProperty("model");
    expect(snapshot[0]).not.toHaveProperty("thinking");
    (snapshot[0] as { label: string }).label = "mutated";
    (snapshot as unknown as unknown[]).pop();
    expect(runtime.listTasks()[0]).toMatchObject({ label: "observe", status: "running" });

    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "private" }));
    await expect(runtime.join(task.subagentId)).resolves.toMatchObject({ status: "completed", result: "private" });
    expect(events).toEqual(["running", "completed"]);
    expect(notifications).toEqual([{ subagentId: task.subagentId, generation: 1, status: "completed", label: "observe" }]);

    await runtime.remove(task.subagentId);
    expect(events).toEqual(["running", "completed", "empty"]);
    unsubscribe();
    unsubscribe();
    unsubscribeThrowing();
    runtime.stop();
  });

  test("resume, cancellation, and launch failure all invalidate after their state changes", async () => {
    const root = mkdtempSync(join(tmpdir(), "subagents-observation-mutations-"));
    const { transport } = fakeTransport();
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
    let updates = 0;
    runtime.onTaskUpdate(() => { updates++; });

    const first = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "resume", taskSlug: "task",});
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry" }));
    await runtime.join(first.subagentId);
    const beforeResume = updates;
    const second = await runtime.resume(first.subagentId, "two");
    expect(updates).toBeGreaterThan(beforeResume);
    const beforeCancel = updates;
    await runtime.cancel(second.subagentId);
    expect(updates).toBeGreaterThan(beforeCancel);

    const failingTransport = fakeTransport().transport;
    failingTransport.createTab = async () => { throw new Error("launch unavailable"); };
    const failing = new SubagentRuntime(failingTransport, handlerRegistry(), mkdtempSync(join(tmpdir(), "subagents-observation-launch-")));
    let failedUpdates = 0;
    failing.onTaskUpdate(() => { failedUpdates++; });
    await expect(failing.spawn({ agent: "handler", cwd: "/repo", prompt: "fail", label: "launch", taskSlug: "task",})).rejects.toThrow("launch unavailable");
    expect(failedUpdates).toBe(2);
    runtime.stop();
    failing.stop();
  });

  test("successful recovery emits exactly once after the final scope, including empty and repeated scopes", async () => {
    const parentA = join(mkdtempSync(join(tmpdir(), "subagents-observation-a-")), "parent.jsonl");
    const parentB = join(mkdtempSync(join(tmpdir(), "subagents-observation-b-")), "parent.jsonl");
    const parentEmpty = join(mkdtempSync(join(tmpdir(), "subagents-observation-empty-")), "parent.jsonl");
    const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    const taskA = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "a", label: "a", taskSlug: "task", parentSessionFile: parentA });
    const taskB = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "b", label: "b", taskSlug: "task", parentSessionFile: parentB });
    original.stop();
    writeFileSync(taskA.sessionFile, "");
    writeFileSync(taskB.sessionFile, "");

    const runtime = new SubagentRuntime(fakeTransport(true).transport, handlerRegistry());
    const updates: string[][] = [];
    runtime.onTaskUpdate(() => { updates.push(runtime.listTasks().map(task => task.label)); });
    await runtime.recover("/repo", parentA);
    expect(updates).toEqual([["a"]]);
    await runtime.recover("/repo", parentB);
    expect(updates).toEqual([["a"], ["b"]]);
    await runtime.recover("/repo", parentB);
    expect(updates).toEqual([["a"], ["b"], ["b"]]);
    await runtime.recover("/repo", parentEmpty);
    expect(updates).toEqual([["a"], ["b"], ["b"], []]);
    expect(runtime.listTasks()).toEqual([]);
    runtime.stop();
  });
});


type WidgetObservation = {
  subagentId: string;
  generation: number;
  agent: string;
  label: string;
  status: "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
};

function widgetRuntime(initialTasks: WidgetObservation[]) {
  let tasks = initialTasks;
  let listener: (() => void) | undefined;
  let savedListener: (() => void) | undefined;
  let notifier: ((notification: CompletionNotification) => void | Promise<void>) | undefined;
  const calls = { list: 0, subscribe: 0, unsubscribe: 0, recover: 0, inspect: 0, join: 0, stop: 0 };
  const runtime = {
    setCompletionNotifier(value: typeof notifier) { notifier = value; },
    listTasks() { calls.list++; return tasks.map(task => ({ ...task })); },
    onTaskUpdate(value: () => void) {
      calls.subscribe++;
      listener = value;
      savedListener = value;
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        calls.unsubscribe++;
        if (listener === value) listener = undefined;
      };
    },
    async recover() { calls.recover++; listener?.(); },
    inspect() { calls.inspect++; throw new Error("widget called inspect"); },
    async join() { calls.join++; return { status: "completed" }; },
    agentNames() { return ["handler"]; },
    stop() { calls.stop++; },
  };
  return {
    runtime,
    calls,
    setTasks(value: WidgetObservation[]) { tasks = value; },
    emit() { listener?.(); },
    emitSaved() { savedListener?.(); },
    async notify(notification: CompletionNotification) { await notifier?.(notification); },
  };
}

function widgetExtensionHarness(runtime: any, setWidget: (...args: any[]) => void) {
  const handlers: Record<string, (event: unknown, ctx: any) => unknown> = {};
  const messages: Array<{ message: any; options: any }> = [];
  const previousChildResultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  try {
    activateSubagents({
      on(event: string, handler: (event: unknown, ctx: any) => unknown) { handlers[event] = handler; },
      sendMessage(message: unknown, options: unknown) { messages.push({ message, options }); },
      registerTool() {},
      getActiveTools() { return []; },
      setActiveTools() {},
    } as any, { runtime, registry: { async discover() {} } as any });
  } finally {
    if (previousChildResultPath === undefined) delete process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
    else process.env.PI_HERDR_SUBAGENT_RESULT_PATH = previousChildResultPath;
  }
  const ctx = {
    cwd: "/repo",
    sessionManager: { getSessionFile: () => "/repo/parent.jsonl", getEntries: () => [] },
    ui: { setWidget },
  };
  return { handlers, messages, ctx };
}

const runningTask = (subagentId: string, createdAt: string, label = subagentId): WidgetObservation => ({
  subagentId, generation: 1, agent: "handler", label, status: "running", createdAt,
});

describe("parent running-task widget", () => {
  test("renders only running tasks above the editor in deterministic order without polling or Result APIs", async () => {
    const timerCalls = { interval: 0, timeout: 0 };
    const originalSetInterval = globalThis.setInterval;
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setInterval = ((..._args: any[]) => { timerCalls.interval++; return 0 as any; }) as typeof setInterval;
    globalThis.setTimeout = ((..._args: any[]) => { timerCalls.timeout++; return 0 as any; }) as typeof setTimeout;
    try {
      const completed = { ...runningTask("task-9", "2026-01-01T00:00:00.000Z"), status: "completed" as const };
      const state = widgetRuntime([
        runningTask("task-2", "2026-01-02T00:00:00.000Z", "two"),
        runningTask("task-3", "2026-01-01T00:00:00.000Z", "three"),
        runningTask("task-10", "2026-01-02T00:00:00.000Z", "ten"),
        completed,
      ]);
      const widgetCalls: any[][] = [];
      const harness = widgetExtensionHarness(state.runtime, (...args) => { widgetCalls.push(args); });

      await harness.handlers.session_start!({}, harness.ctx);
      expect(widgetCalls.at(-1)).toEqual([
        "pi-herdr-subagent-running",
        [
          "task-3 · three · handler · generation 1 · running",
          "task-10 · ten · handler · generation 1 · running",
          "task-2 · two · handler · generation 1 · running",
        ],
        { placement: "aboveEditor" },
      ]);

      state.setTasks([completed]);
      state.emit();
      expect(widgetCalls.at(-1)).toEqual(["pi-herdr-subagent-running", undefined]);
      await harness.handlers.session_start!({}, harness.ctx);
      await harness.handlers.before_agent_start!({}, harness.ctx);

      expect(state.calls.subscribe).toBe(1);
      expect(state.calls.inspect).toBe(0);
      expect(state.calls.join).toBe(0);
      expect(timerCalls.interval).toBe(0);
      expect(timerCalls.timeout).toBe(0);
    } finally {
      globalThis.setInterval = originalSetInterval;
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  test("isolates an initial render failure from later refresh, completion delivery, and join", async () => {
    const state = widgetRuntime([runningTask("task", "2026-01-01T00:00:00.000Z")]);
    let attempts = 0;
    const harness = widgetExtensionHarness(state.runtime, () => {
      attempts++;
      if (attempts === 1) throw new Error("initial render failed");
    });

    await expect(harness.handlers.session_start!({}, harness.ctx)).resolves.toBeUndefined();
    expect(() => state.emit()).not.toThrow();
    expect(attempts).toBe(2);
    await state.notify({ subagentId: "task", generation: 1, status: "completed", label: "task" });
    expect(harness.messages).toHaveLength(1);
    await expect(state.runtime.join()).resolves.toEqual({ status: "completed" });
  });

  test("isolates an update refresh failure and permits the next update", async () => {
    const state = widgetRuntime([runningTask("task", "2026-01-01T00:00:00.000Z")]);
    let attempts = 0;
    const harness = widgetExtensionHarness(state.runtime, () => {
      attempts++;
      if (attempts === 2) throw new Error("update failed");
    });

    await harness.handlers.session_start!({}, harness.ctx);
    expect(() => state.emit()).not.toThrow();
    expect(() => state.emit()).not.toThrow();
    expect(attempts).toBe(3);
  });

  test("isolates an empty-state clear failure and permits a later render", async () => {
    const running = runningTask("task", "2026-01-01T00:00:00.000Z");
    const state = widgetRuntime([running]);
    let attempts = 0;
    const harness = widgetExtensionHarness(state.runtime, (_key, content) => {
      attempts++;
      if (content === undefined) throw new Error("clear failed");
    });

    await harness.handlers.session_start!({}, harness.ctx);
    state.setTasks([{ ...running, status: "failed" }]);
    expect(() => state.emit()).not.toThrow();
    state.setTasks([running]);
    expect(() => state.emit()).not.toThrow();
    expect(attempts).toBe(3);
  });

  test("shutdown clears, unsubscribes, releases the Context, and stops after a clear failure", async () => {
    const state = widgetRuntime([runningTask("task", "2026-01-01T00:00:00.000Z")]);
    let attempts = 0;
    const harness = widgetExtensionHarness(state.runtime, (_key, content) => {
      attempts++;
      if (content === undefined) throw new Error("shutdown clear failed");
    });

    await harness.handlers.session_start!({}, harness.ctx);
    expect(() => harness.handlers.session_shutdown!({}, harness.ctx)).not.toThrow();
    expect(state.calls.unsubscribe).toBe(1);
    expect(state.calls.stop).toBe(1);
    expect(attempts).toBe(2);
    state.emitSaved();
    expect(attempts).toBe(2);
    expect(() => harness.handlers.session_shutdown!({}, harness.ctx)).not.toThrow();
    expect(state.calls.unsubscribe).toBe(1);
    expect(state.calls.stop).toBe(2);
  });
});


test("captures the parent workspace once and preserves create arguments", async () => {
  const previous = process.env.HERDR_WORKSPACE_ID;
  const calls: string[][] = [];
  try {
    process.env.HERDR_WORKSPACE_ID = "wF";
    const client = createHerdrClient(async (_command, args) => {
      calls.push([...args]);
      return {
        code: 0,
        stdout: JSON.stringify({ result: { tab: { tab_id: "wF:t1", workspace_id: "wF" }, root_pane: { pane_id: "wF:p1" } } }),
        stderr: "",
      };
    });
    const transport = createHerdrTransport(client);
    process.env.HERDR_WORKSPACE_ID = "w8";

    await expect(transport.createTab({ cwd: "/repo", label: "pinned", env: { A: "1" } }))
      .resolves.toEqual({ tabId: "wF:t1", paneId: "wF:p1" });
    expect(calls).toEqual([["tab", "create", "--workspace", "wF", "--cwd", "/repo", "--label", "pinned", "--no-focus", "--env", "A=1"]]);
  } finally {
    if (previous === undefined) delete process.env.HERDR_WORKSPACE_ID;
    else process.env.HERDR_WORKSPACE_ID = previous;
  }
});

test("defers missing and invalid workspace rejection until createTab", async () => {
  for (const [options, token] of [[{ workspaceId: undefined }, "parent_workspace_missing"], [{ workspaceId: " \t" }, "parent_workspace_invalid"]] as const) {
    let calls = 0;
    const client = createHerdrClient(async () => {
      calls++;
      return { code: 0, stdout: "{}", stderr: "" };
    });
    const transport = createHerdrTransport(client, options);
    await expect(transport.createTab({ cwd: "/repo", label: "blocked" })).rejects.toThrow(token);
    expect(calls).toBe(0);
  }
});

test("rejects a mismatched response and closes only its explicit root pane", async () => {
  const calls: string[][] = [];
  const client = createHerdrClient(async (_command, args) => {
    calls.push([...args]);
    return args[0] === "pane"
      ? { code: 0, stdout: "{}", stderr: "" }
      : { code: 0, stdout: JSON.stringify({ result: { tab: { tab_id: "w8:t1", workspace_id: "w8" }, root_pane: { pane_id: "w8:p1" } } }), stderr: "" };
  });
  const transport = createHerdrTransport(client, { workspaceId: "wF" });

  await expect(transport.createTab({ cwd: "/repo", label: "mismatch" })).rejects.toThrow("parent_workspace_mismatch");
  expect(calls).toEqual([
    ["tab", "create", "--workspace", "wF", "--cwd", "/repo", "--label", "mismatch", "--no-focus"],
    ["pane", "close", "w8:p1"],
  ]);
});

test("classifies unsupported create contracts and keeps unrelated command failures unchanged", async () => {
  const unsupportedCalls: string[][] = [];
  const unsupported = createHerdrTransport(createHerdrClient(async (_command, args) => {
    unsupportedCalls.push([...args]);
    return { code: 2, stdout: "", stderr: "unknown option --workspace" };
  }), { workspaceId: "wF" });
  await expect(unsupported.createTab({ cwd: "/repo", label: "unsupported" })).rejects.toThrow("parent_workspace_contract_unsupported");
  expect(unsupportedCalls).toHaveLength(1);

  const missingFieldCalls: string[][] = [];
  const missingField = createHerdrTransport(createHerdrClient(async (_command, args) => {
    missingFieldCalls.push([...args]);
    return args[0] === "pane"
      ? { code: 0, stdout: "{}", stderr: "" }
      : { code: 0, stdout: JSON.stringify({ result: { tab: { tab_id: "wF:t2" }, root_pane: { pane_id: "wF:p2" } } }), stderr: "" };
  }), { workspaceId: "wF" });
  await expect(missingField.createTab({ cwd: "/repo", label: "missing-field" })).rejects.toThrow("parent_workspace_contract_unsupported");
  expect(missingFieldCalls).toEqual([
    ["tab", "create", "--workspace", "wF", "--cwd", "/repo", "--label", "missing-field", "--no-focus"],
    ["pane", "close", "wF:p2"],
  ]);

  const commandFailure = createHerdrTransport(createHerdrClient(async () => ({ code: 1, stdout: "", stderr: "backend unavailable" })), { workspaceId: "wF" });
  await expect(commandFailure.createTab({ cwd: "/repo", label: "failure" })).rejects.toThrow("herdr tab create failed: backend unavailable");
  await expect(commandFailure.createTab({ cwd: "/repo", label: "failure" })).rejects.not.toThrow("parent_workspace_contract_unsupported");
});

test("preserves the primary mismatch token when rejected-pane cleanup fails", async () => {
  const calls: string[][] = [];
  const transport = createHerdrTransport(createHerdrClient(async (_command, args) => {
    calls.push([...args]);
    return args[0] === "pane"
      ? { code: 1, stdout: "", stderr: "close denied" }
      : { code: 0, stdout: JSON.stringify({ result: { tab: { tab_id: "w8:t3", workspace_id: "w8" }, root_pane: { pane_id: "w8:p3" } } }), stderr: "" };
  }), { workspaceId: "wF" });

  await expect(transport.createTab({ cwd: "/repo", label: "cleanup" })).rejects.toThrow(/parent_workspace_mismatch.*cleanup failed/);
  expect(calls).toEqual([
    ["tab", "create", "--workspace", "wF", "--cwd", "/repo", "--label", "cleanup", "--no-focus"],
    ["pane", "close", "w8:p3"],
  ]);
});

test("propagates a missing parent workspace through spawn without a fallback launch", async () => {
  let calls = 0;
  const transport = createHerdrTransport(createHerdrClient(async () => {
    calls++;
    return { code: 0, stdout: "{}", stderr: "" };
  }), { workspaceId: undefined });
  const runtime = new SubagentRuntime(transport, handlerRegistry(), mkdtempSync(join(tmpdir(), "subagents-workspace-missing-")));

  await expect(runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "missing", taskSlug: "workspace-missing" }))
    .rejects.toThrow("parent_workspace_missing");
  expect(calls).toBe(0);
  expect(runtime.inspect("workspace-missing")).toMatchObject({ status: "failed", error: "Error: parent_workspace_missing" });
  runtime.stop();
});


test("classifies a successful malformed tab-create response as an unsupported contract without cleanup", async () => {
  const calls: string[][] = [];
  const transport = createHerdrTransport(createHerdrClient(async (_command, args) => {
    calls.push([...args]);
    return { code: 0, stdout: "{", stderr: "" };
  }), { workspaceId: "wF" });

  await expect(transport.createTab({ cwd: "/repo", label: "malformed" }))
    .rejects.toThrow(/parent_workspace_contract_unsupported.*invalid JSON/);
  expect(calls).toEqual([["tab", "create", "--workspace", "wF", "--cwd", "/repo", "--label", "malformed", "--no-focus"]]);
});

test("retains every workspace create rejection without a pane run", async () => {
  const cases: Array<{ name: string; workspaceId: string | undefined; token: string }> = [
    { name: "missing", workspaceId: undefined, token: "parent_workspace_missing" },
    { name: "invalid", workspaceId: " \t", token: "parent_workspace_invalid" },
    { name: "unsupported", workspaceId: "wF", token: "parent_workspace_contract_unsupported" },
    { name: "mismatch", workspaceId: "wF", token: "parent_workspace_mismatch" },
  ];

  for (const { name, workspaceId, token } of cases) {
    const calls: string[][] = [];
    const transport = createHerdrTransport(createHerdrClient(async (_command, args) => {
      calls.push([...args]);
      if (name === "unsupported") return { code: 2, stdout: "", stderr: "unknown option --workspace" };
      if (name === "mismatch") return args[0] === "pane"
        ? { code: 0, stdout: "", stderr: "" }
        : { code: 0, stdout: JSON.stringify({ result: { tab: { tab_id: "w8:t1", workspace_id: "w8" }, root_pane: { pane_id: "w8:p1" } } }), stderr: "" };
      return { code: 0, stdout: "{}", stderr: "" };
    }), { workspaceId });
    const root = mkdtempSync(join(tmpdir(), `subagents-workspace-${name}-`));
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
    const taskSlug = `workspace-${name}`;

    await expect(runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: name, taskSlug })).rejects.toThrow(token);
    expect(calls.some(args => args[0] === "pane" && args[1] === "run")).toBeFalse();
    expect(runtime.inspect(taskSlug)).toMatchObject({ status: "failed", error: expect.stringContaining(token) });
    expect(JSON.parse(readFileSync(join(root, "tasks", `${taskSlug}-artifacts`, "task.json"), "utf8")))
      .toMatchObject({ status: "failed", error: expect.stringContaining(token) });
    runtime.stop();
  }
});

test("recovery retains an existing pane while resumed creation uses the new transport target", async () => {
  const parentSessionFile = join(mkdtempSync(join(tmpdir(), "subagents-workspace-recovery-")), "parent.jsonl");
  const original = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
  const first = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "recover", taskSlug: "workspace-recovery", parentSessionFile });
  writeFileSync(first.sessionFile, "");
  original.stop();

  const calls: string[][] = [];
  const transport = createHerdrTransport(createHerdrClient(async (_command, args) => {
    calls.push([...args]);
    if (args[0] === "pane" && args[1] === "get") return { code: 0, stdout: "{}", stderr: "" };
    if (args[0] === "tab") return { code: 0, stdout: JSON.stringify({ result: { tab: { tab_id: "w8:t2", workspace_id: "w8" }, root_pane: { pane_id: "w8:p2" } } }), stderr: "" };
    return { code: 0, stdout: "", stderr: "" };
  }), { workspaceId: "w8" });
  const rebuilt = new SubagentRuntime(transport, handlerRegistry());

  await rebuilt.recover("/repo", parentSessionFile);
  expect(rebuilt.inspect(first.subagentId)).toMatchObject({ status: "running", paneId: first.paneId });
  expect(calls).toEqual([["pane", "get", first.paneId]]);

  writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry" }));
  await expect(rebuilt.join(first.subagentId)).resolves.toMatchObject({ status: "failed", generation: 1 });
  const second = await rebuilt.resume(first.subagentId, "two");

  expect(second).toMatchObject({ generation: 2, sessionFile: first.sessionFile, tabId: "w8:t2", paneId: "w8:p2" });
  expect(calls).toContainEqual(["tab", "create", "--workspace", "w8", "--cwd", "/repo", "--label", "recover", "--no-focus", "--env", `PI_HERDR_SUBAGENT_ID=${first.subagentId}`, "--env", "PI_HERDR_SUBAGENT_GENERATION=2", "--env", `PI_HERDR_SUBAGENT_RESULT_PATH=${second.resultPath}`]);
  rebuilt.stop();
});

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createHerdrClient } from "pi-herdr";
import { AgentRegistry, SubagentRuntime, createHerdrTransport, createSubagentTools, type HerdrTransport } from "../src/index.js";

function fakeTransport(paneExists = true) {
  const calls: unknown[] = [];
  const transport: HerdrTransport = {
    async createTab(input) { calls.push({ op: "create", input }); return { tabId: "tab-1", paneId: "pane-1" }; },
    async run(paneId, command, args) { calls.push({ op: "run", paneId, command, args }); },
    async sendText(paneId, text) { calls.push({ op: "send", paneId, text }); },
    async closePane(paneId) { calls.push({ op: "close", paneId }); },
    async paneExists(paneId) { calls.push({ op: "exists", paneId }); return paneExists; },
  };
  return { calls, transport };
}

function handlerRegistry(body = "Handler"): AgentRegistry {
  const registry = new AgentRegistry();
  registry.setFiles([{ path: "/handler.md", content: `---\nname: handler\n---\n${body}` }]);
  return registry;
}

describe("pi-herdr-subagents runtime", () => {
  test("parses Herdr tab create identities", async () => {
    const client = createHerdrClient(async () => ({
      code: 0,
      stderr: "",
      stdout: JSON.stringify({ id: "cli:tab:create", result: { root_pane: { pane_id: "wF:p6", tab_id: "wF:t5" }, tab: { tab_id: "wF:t5" }, type: "tab_created" } }),
    }));
    const transport = createHerdrTransport(client);
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
    const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "Do\nthe work", label: "task", model: "test/model", thinking: "high" });
    expect(task).toMatchObject({ subagentId: "subagent-1", generation: 1, sessionFile: join(root, "tasks", "subagent-1-g1.jsonl"), status: "running" });
    const manifest = JSON.parse(readFileSync(join(dirname(task.resultPath), "task.json"), "utf8"));
    expect(manifest).toMatchObject({ version: 1, subagentId: task.subagentId, generation: 1, status: "running", paneId: "pane-1" });
    expect(calls[0]).toMatchObject({ op: "create", input: { cwd: "/repo", env: { PI_HERDR_SUBAGENT_ID: "subagent-1", PI_HERDR_SUBAGENT_GENERATION: "1" } } });
    const launch = calls[1] as { op: string; command: string; args: string[] };
    expect(launch).toMatchObject({ op: "run", command: "powershell.exe" });
    const scriptPath = launch.args.at(-1)!;
    expect(scriptPath).toBe(join(root, "tasks", "subagent-1-artifacts", "launch-1.ps1"));
    const script = readFileSync(scriptPath, "utf8");
    const bootstrapPath = join(root, "tasks", "subagent-1-artifacts", "launch-1.cjs");
    expect(script.charCodeAt(0)).toBe(0xfeff);
    expect(script).toContain(bootstrapPath);
    expect(script).not.toContain("Execute the Handoff.");
    expect(script).not.toContain("Do\nthe work");
    const bootstrap = readFileSync(bootstrapPath, "utf8");
    expect(bootstrap).toContain("spawnSync(spec.command, spec.args");
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
    const first = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "task", parentSessionFile });
    writeFileSync(first.sessionFile, "");
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry" }));
    const completed = await runtime.join(first.subagentId);
    expect(completed.status).toBe("failed");
    const second = await runtime.resume(first.subagentId, "two");
    expect(second).toMatchObject({
      subagentId: first.subagentId,
      generation: 2,
      sessionFile: first.sessionFile,
      resultPath: join(parentDir, "parent", "tasks", "subagent-1-artifacts", "result-2.json"),
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
    const parameters = tools[0]!.parameters as { properties: Record<string, { enum?: unknown }> };
    expect(parameters.properties.agent?.enum).toEqual(["handler", "reviewer"]);

    const spawned = await (tools[0]!.execute as any)("call-1", {
      agent: "handler",
      prompt: "Do the work",
      label: "task",
      model: "test/model",
      thinking: "high",
    });
    expect(spawned.details).toMatchObject({
      model: "test/model",
      thinking: "high",
      sessionFile: join(parentDir, "parent", "tasks", "subagent-1-g1.jsonl"),
      status: "running",
    });
  });

  test("resolves the requested Agent locally without exposing its body", async () => {
    const registry = new AgentRegistry();
    registry.setFiles([{ path: "/reviewer.md", content: "---\nname: reviewer\n---\nReview the work." }]);
    const { transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-agent-"));
    const runtime = new SubagentRuntime(transport, registry, root);

    const task = await runtime.spawn({ agent: "reviewer", cwd: "/repo", prompt: "Review", label: "review" });
    expect(task).toMatchObject({ agent: "reviewer" });
    expect(task).not.toHaveProperty("handlerBody");
    const bootstrap = readFileSync(join(root, "tasks", "subagent-1-artifacts", "launch-1.cjs"), "utf8");
    const encoded = bootstrap.match(/Buffer\.from\(\"([^\"]+)\"/)?.[1];
    const spec = JSON.parse(Buffer.from(encoded!, "base64").toString("utf8")) as { args: string[] };
    expect(spec.args).toContain("Review the work.");
  });

  test("requires the requested Agent in its registry", async () => {
    const { transport } = fakeTransport();
    const runtime = new SubagentRuntime(transport, new AgentRegistry(), mkdtempSync(join(tmpdir(), "subagents-missing-agent-")));

    await expect(runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "Do the work", label: "task" }))
      .rejects.toThrow("Required Agent is unavailable: handler");
  });

  test("does not reuse persisted task artifacts after runtime reconstruction", async () => {
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-rebuilt-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const first = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "first", label: "first", parentSessionFile,
    });
    writeFileSync(first.sessionFile, "");
    writeFileSync(first.resultPath, JSON.stringify({
      subagentId: first.subagentId, generation: first.generation, status: "completed", result: "old result",
    }));

    const rebuilt = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    const second = await rebuilt.spawn({ agent: "handler", cwd: "/repo", prompt: "second", label: "second", parentSessionFile });
    expect(second).toMatchObject({ subagentId: "subagent-2", generation: 1, status: "running" });
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
      agent: "handler", cwd: "/repo", prompt: "work", label: "running", parentSessionFile,
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
      agent: "handler", cwd: "/repo", prompt: "work", label: "done", parentSessionFile,
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
      agent: "handler", cwd: "/repo", prompt: "work", label: "missing", parentSessionFile,
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
    const first = await original.spawn({ agent: "handler", cwd: "/repo", prompt: "one", label: "generation", parentSessionFile });
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
      agent: "handler", cwd: "/repo", prompt: "a", label: "parent-a", parentSessionFile: parentA,
    });
    const second = await new SubagentRuntime(fakeTransport().transport, handlerRegistry()).spawn({
      agent: "handler", cwd: "/repo", prompt: "b", label: "parent-b", parentSessionFile: parentB,
    });
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "a" }));
    writeFileSync(second.resultPath, JSON.stringify({ subagentId: second.subagentId, generation: 1, status: "failed", error: "b" }));

    const rebuilt = new SubagentRuntime(fakeTransport().transport, handlerRegistry());
    await rebuilt.recover("/repo", parentA);
    await rebuilt.recover("/repo", parentA);
    expect(rebuilt.inspect("subagent-1")).toMatchObject({ label: "parent-a", error: "a" });
    await rebuilt.recover("/repo", parentB);
    expect(rebuilt.inspect("subagent-1")).toMatchObject({ label: "parent-b", error: "b" });
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

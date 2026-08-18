import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createHerdrClient } from "pi-herdr";
import { AgentRegistry, SubagentRuntime, createHerdrTransport, createSubagentTools, type HerdrTransport } from "../src/index.js";

function fakeTransport() {
  const calls: unknown[] = [];
  const transport: HerdrTransport = {
    async createTab(input) { calls.push({ op: "create", input }); return { tabId: "tab-1", paneId: "pane-1" }; },
    async run(paneId, command, args) { calls.push({ op: "run", paneId, command, args }); },
    async sendText(paneId, text) { calls.push({ op: "send", paneId, text }); },
    async closePane(paneId) { calls.push({ op: "close", paneId }); },
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

  test("launches Pi through an exact-arguments Node bootstrap", async () => {
    const registry = handlerRegistry("Execute the Handoff.");
    const { calls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-test-"));
    const runtime = new SubagentRuntime(transport, registry, root);
    const task = await runtime.spawn({ cwd: "/repo", prompt: "Do\nthe work", label: "task", model: "test/model", thinking: "high" });
    expect(task).toMatchObject({ subagentId: "subagent-1", generation: 1, sessionFile: join(root, "tasks", "subagent-1-g1.jsonl"), status: "running" });
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

  test("resume preserves identity and session, while steer, cancel, and remove own lifecycle", async () => {
    const { calls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-test-"));
    const runtime = new SubagentRuntime(transport, handlerRegistry(), root);
    const first = await runtime.spawn({ cwd: "/repo", prompt: "one", label: "task" });
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry" }));
    const completed = await runtime.join(first.subagentId);
    expect(completed.status).toBe("failed");
    const second = await runtime.resume(first.subagentId, "two");
    expect(second).toMatchObject({ subagentId: first.subagentId, generation: 2, sessionFile: first.sessionFile });
    await expect(runtime.steer(first.subagentId, "focus")).resolves.toMatchObject({ generation: 2 });
    await expect(runtime.cancel(first.subagentId)).resolves.toMatchObject({ status: "cancelled" });
    await runtime.remove(first.subagentId);
    expect(existsSync(first.sessionFile)).toBeFalse();
    expect(existsSync(dirname(second.resultPath))).toBeFalse();
    expect(calls.filter(value => (value as { op?: string }).op === "close")).toHaveLength(1);
  });

  test("executes the spawn tool with the fixed Handler under the parent session", async () => {
    const registry = handlerRegistry();
    const { transport } = fakeTransport();
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-parent-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const tools = createSubagentTools(new SubagentRuntime(transport, registry), "/repo", parentSessionFile);
    expect(tools.map(tool => tool.name)).toEqual(["subagent_spawn", "subagent_resume", "subagent_inspect", "subagent_join", "subagent_steer", "subagent_cancel", "subagent_remove"]);
    expect((tools[0]!.parameters as { properties: Record<string, unknown> }).properties).not.toHaveProperty("agent");

    const spawned = await (tools[0]!.execute as any)("call-1", {
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

  test("requires the default Handler Agent in its registry", async () => {
    const { transport } = fakeTransport();
    const runtime = new SubagentRuntime(transport, new AgentRegistry(), mkdtempSync(join(tmpdir(), "subagents-missing-handler-")));

    await expect(runtime.spawn({ cwd: "/repo", prompt: "Do the work", label: "task" }))
      .rejects.toThrow("Required Agent is unavailable: handler");
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

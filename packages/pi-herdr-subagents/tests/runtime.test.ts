import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
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

  test("discovers Agent files and launches Pi through a generation script", async () => {
    const registry = new AgentRegistry();
    registry.setFiles([{ path: "/package/handler.md", content: "---\nname: handler\ndescription: Handler\n---\nExecute the Handoff." }]);
    const { calls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-test-"));
    const runtime = new SubagentRuntime(transport, root);
    const task = await runtime.spawn({ cwd: "/repo", agent: registry.get("handler")!, prompt: "Do\nthe work", label: "task", model: "test/model", thinking: "high" });
    expect(task).toMatchObject({ subagentId: "subagent-1", generation: 1, sessionFile: join(root, "tasks", "subagent-1-g1.jsonl"), status: "running" });
    expect(calls[0]).toMatchObject({ op: "create", input: { cwd: "/repo", env: { PI_HERDR_SUBAGENT_ID: "subagent-1", PI_HERDR_SUBAGENT_GENERATION: "1" } } });
    const launch = calls[1] as { op: string; command: string; args: string[] };
    expect(launch).toMatchObject({ op: "run", command: "powershell.exe" });
    const scriptPath = launch.args.at(-1)!;
    expect(scriptPath).toBe(join(root, "tasks", "subagent-1-artifacts", "launch-1.ps1"));
    const script = readFileSync(scriptPath, "utf8");
    expect(script).toContain("& 'pi'");
    expect(script).toContain("'test/model:high'");
    expect(script).toContain("Execute the Handoff.");
    expect(script).toContain("Do\nthe work");

    await Bun.write(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "status: completed\nsummary: done\nreport: ok" }));
    await expect(runtime.join(task.subagentId)).resolves.toMatchObject({ status: "completed", result: expect.stringContaining("status: completed") });
  });

  test("resume preserves identity and session, while steer, cancel, and remove own lifecycle", async () => {
    const { calls, transport } = fakeTransport();
    const root = mkdtempSync(join(tmpdir(), "subagents-test-"));
    const runtime = new SubagentRuntime(transport, root);
    const agent = { name: "handler", path: "/handler.md", body: "Handler", description: "Handler" };
    const first = await runtime.spawn({ cwd: "/repo", agent, prompt: "one", label: "task" });
    await Bun.write(first.resultPath, JSON.stringify({ subagentId: first.subagentId, generation: 1, status: "failed", error: "retry" }));
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

  test("executes the spawn tool with the resolved Agent definition under the parent session", async () => {
    const registry = new AgentRegistry();
    registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nHandler" }]);
    const { transport } = fakeTransport();
    const parentDir = mkdtempSync(join(tmpdir(), "subagents-parent-"));
    const parentSessionFile = join(parentDir, "parent.jsonl");
    const tools = createSubagentTools(new SubagentRuntime(transport), registry, "/repo", parentSessionFile);
    expect(tools.map(tool => tool.name)).toEqual(["subagent_spawn", "subagent_resume", "subagent_inspect", "subagent_join", "subagent_steer", "subagent_cancel", "subagent_remove"]);

    const spawned = await (tools[0]!.execute as any)("call-1", {
      agent: "handler",
      prompt: "Do the work",
      label: "task",
      model: "test/model",
      thinking: "high",
    });
    expect(spawned.details).toMatchObject({
      agent: "handler",
      model: "test/model",
      thinking: "high",
      sessionFile: join(parentDir, "parent", "tasks", "subagent-1-g1.jsonl"),
      status: "running",
    });
  });
});

test("passes pane commands as one quoted PowerShell invocation", async () => {
  const calls: string[][] = [];
  const client = createHerdrClient(async (_command, args) => { calls.push([...args]); return { code: 0, stdout: "", stderr: "" }; });
  const transport = createHerdrTransport(client);
  await transport.run("wF:p6", "pi", ["--session", "C:\\A B\\session.jsonl", "it's done"]);
  expect(calls).toEqual([["pane", "run", "wF:p6", "& 'pi' '--session' 'C:\\A B\\session.jsonl' 'it''s done'"]]);
});

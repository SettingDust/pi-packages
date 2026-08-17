import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgentRegistry, SubagentRuntime, createSubagentTools, type HerdrTransport } from "../src/index.js";

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
  test("discovers Agent files and spawns with exact model, thinking, and private generation paths", async () => {
    const registry = new AgentRegistry();
    registry.setFiles([{ path: "/package/handler.md", content: "---\nname: handler\ndescription: Handler\n---\nExecute the Handoff." }]);
    const { calls, transport } = fakeTransport();
    const runtime = new SubagentRuntime(transport, mkdtempSync(join(tmpdir(), "subagents-test-")));
    const task = await runtime.spawn({ cwd: "/repo", agent: registry.get("handler")!, prompt: "Do the work", label: "task", model: "test/model", thinking: "high" });
    expect(task).toMatchObject({ subagentId: "subagent-1", generation: 1, sessionFile: expect.stringContaining("session.jsonl"), status: "running" });
    expect(calls[0]).toMatchObject({ op: "create", input: { cwd: "/repo", env: { PI_HERDR_SUBAGENT_ID: "subagent-1", PI_HERDR_SUBAGENT_GENERATION: "1" } } });
    expect(calls[1]).toMatchObject({ op: "run", command: "pi" });
    expect(JSON.stringify(calls[1])).toContain("test/model:high");
    expect(JSON.stringify(calls[1])).toContain("Execute the Handoff.");

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
    expect(existsSync(root + "/" + first.subagentId)).toBeFalse();
    expect(calls.filter(value => (value as { op?: string }).op === "close")).toHaveLength(1);
  });

  test("exposes the seven independent prefixed tools", () => {
    const registry = new AgentRegistry();
    registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nHandler" }]);
    const { transport } = fakeTransport();
    const tools = createSubagentTools(new SubagentRuntime(transport), registry, "/repo");
    expect(tools.map(tool => tool.name)).toEqual([
      "subagent_spawn", "subagent_resume", "subagent_inspect", "subagent_join", "subagent_steer", "subagent_cancel", "subagent_remove",
    ]);
  });
});

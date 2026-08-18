import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgentRegistry, SubagentRuntime, createSubagentTools, type HerdrTransport } from "../src/index.js";

const theme = {
  fg(_color: string, text: string) { return text; },
  bold(text: string) { return text; },
};

function render(component: { render(width: number): string[] }): string {
  return component.render(120).map(line => line.trimEnd()).join("\n");
}

test("renders named-Agent spawn and join actions", async () => {
  const transport: HerdrTransport = {
    async createTab() { return { tabId: "tab-1", paneId: "pane-1" }; },
    async run() {},
    async sendText() {},
    async closePane() {},
    async paneExists() { return true; },
  };
  const registry = new AgentRegistry();
  registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nHandler" }]);
  const root = mkdtempSync(join(tmpdir(), "subagent-renderer-"));
  const tools = createSubagentTools(new SubagentRuntime(transport, registry, root), "/repo") as any[];
  const spawn = tools.find(tool => tool.name === "subagent_spawn")!;
  const joinTool = tools.find(tool => tool.name === "subagent_join")!;
  const spawnArgs = { agent: "handler", prompt: "Do the work", label: "Implement renderer" };

  expect(render(spawn.renderCall(spawnArgs, theme))).toBe("subagent spawn  handler · Implement renderer");
  const spawned = await spawn.execute("spawn-1", spawnArgs);
  expect(render(spawn.renderResult(spawned, {}, theme))).toBe(" Started Implement renderer\n  subagent-1");

  const task = spawned.details;
  writeFileSync(task.resultPath, JSON.stringify({
    subagentId: task.subagentId,
    generation: task.generation,
    status: "completed",
    result: "status: completed\nsummary: done\nreport: renderer works",
  }));

  expect(render(joinTool.renderCall({ subagentId: task.subagentId }, theme))).toBe("subagent join  subagent-1");
  let partial: unknown;
  const joined = await joinTool.execute("join-1", { subagentId: task.subagentId }, undefined, (update: unknown) => { partial = update; });
  expect(render(joinTool.renderResult(partial, { isPartial: true }, theme))).toBe(" Implement renderer running\n   waiting for result");
  expect(render(joinTool.renderResult(joined, {}, theme))).toBe(" Implement renderer completed");
  expect(render(joinTool.renderResult(joined, { expanded: true }, theme))).toContain("status: completed\nsummary: done\nreport: renderer works");
});

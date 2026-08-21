import { AgentRegistry, SubagentRuntime, type HerdrTransport } from "../src/index.js";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2]!;
const workerId = process.argv[3]!;
const barrier = join(root, "barrier");
mkdirSync(barrier, { recursive: true });
writeFileSync(join(barrier, `ready-${workerId}`), "");
while (!existsSync(join(barrier, "release"))) await Bun.sleep(5);

const transport: HerdrTransport = {
  async createTab() { return { tabId: `tab-${workerId}`, paneId: `pane-${workerId}` }; },
  async run() {},
  async sendText() {},
  async closePane() {},
  async closeTab() { return "closed"; },
  async paneExists() { return true; },
};
const registry = new AgentRegistry();
registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nHandler" }]);
const runtime = new SubagentRuntime(transport, registry, root);
try {
  const task = await runtime.spawn({ agent: "handler", cwd: "/repo", prompt: "work", label: "Concurrent task", taskSlug: "concurrent-task" });
  runtime.stop();
  process.stdout.write(JSON.stringify({ subagentId: task.subagentId }));
} catch (error) {
  process.stdout.write(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
}

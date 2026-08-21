import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AgentRegistry,
  SubagentRuntime,
  createHerdrTransport,
  type HerdrTransport,
} from "../../../../src/index.ts";

const workspaceId = process.env.HERDR_WORKSPACE_ID;
if (!workspaceId) throw new Error("HERDR_WORKSPACE_ID is required");

const sourcePath = fileURLToPath(new URL("../../../../src/index.ts", import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const live = createHerdrTransport(undefined, { workspaceId });
const registry = new AgentRegistry();
registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nHandler" }]);
const acceptedTabs = new Set<string>();

async function scenario(name: string) {
  const root = mkdtempSync(join(tmpdir(), `pi-herdr-${name}-`));
  const operations: unknown[] = [];
  const transport: HerdrTransport = {
    async createTab(input) {
      const surface = await live.createTab(input);
      acceptedTabs.add(surface.tabId);
      operations.push({ sequence: operations.length + 1, operation: "create_no_focus", ...surface });
      return surface;
    },
    async run() {},
    async sendText() {},
    async closePane(paneId) { await live.closePane(paneId); },
    async closeTab(tabId) {
      const manifestPath = join(root, "tasks", `${name}-artifacts`, "task.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const observation = {
        terminalStatus: manifest.status,
        cleanupStatus: manifest.surfaceCleanups?.find((value: { generation?: number }) => value?.generation === 1)?.status,
        resultExists: existsSync(join(dirname(manifestPath), "result-1.json")),
      };
      operations.push({ sequence: operations.length + 1, operation: "runtime_tab_close", tabId, observation });
      const outcome = await live.closeTab(tabId);
      operations.push({ sequence: operations.length + 1, operation: "runtime_tab_close_outcome", tabId, outcome });
      return outcome;
    },
    async paneExists(paneId) { return live.paneExists(paneId); },
  };
  const runtime = new SubagentRuntime(transport, registry, root);
  try {
    const task = await runtime.spawn({ agent: "handler", cwd: process.cwd(), prompt: "acceptance", label: name, taskSlug: name });
    const paneExistedBefore = await live.paneExists(task.paneId);
    operations.push({ sequence: operations.length + 1, operation: "pane_exists_before", paneId: task.paneId, outcome: paneExistedBefore });
    writeFileSync(task.sessionFile, "retained session\n");
    writeFileSync(task.resultPath, JSON.stringify({ subagentId: task.subagentId, generation: 1, status: "completed", result: "retained result" }));
    operations.push({ sequence: operations.length + 1, operation: "terminal_result_written", resultPath: task.resultPath });
    const settled = await runtime.join(task.subagentId);
    const paneExistsAfter = await live.paneExists(task.paneId);
    operations.push({ sequence: operations.length + 1, operation: "pane_exists_after", paneId: task.paneId, outcome: paneExistsAfter });
    const repeatClose = await live.closeTab(task.tabId);
    operations.push({ sequence: operations.length + 1, operation: "repeat_tab_close", tabId: task.tabId, outcome: repeatClose });
    acceptedTabs.delete(task.tabId);
    return {
      name,
      tabId: task.tabId,
      paneId: task.paneId,
      paneExistedBefore,
      paneExistsAfter,
      operations,
      cleanup: settled.surfaceCleanups?.find((value: unknown) => !!value && typeof value === "object" && (value as { generation?: number }).generation === 1),
      repeatClose,
      retained: {
        session: existsSync(task.sessionFile) && readFileSync(task.sessionFile, "utf8") === "retained session\n",
        result: existsSync(task.resultPath) && JSON.parse(readFileSync(task.resultPath, "utf8")).result === "retained result",
        manifest: existsSync(join(dirname(task.resultPath), "task.json")),
        launchPowerShell: existsSync(join(dirname(task.resultPath), "launch-1.ps1")),
        launchBootstrap: existsSync(join(dirname(task.resultPath), "launch-1.cjs")),
      },
    };
  } finally {
    runtime.stop();
  }
}

const finallyCleanup: unknown[] = [];
let scenarioResult: Awaited<ReturnType<typeof scenario>> | undefined;
try {
  scenarioResult = await scenario("phase-b-real-close");
} finally {
  for (const tabId of [...acceptedTabs]) {
    try {
      const outcome = await live.closeTab(tabId);
      finallyCleanup.push({ tabId, outcome });
      acceptedTabs.delete(tabId);
    } catch (error) {
      finallyCleanup.push({ tabId, outcome: "failed", error: error instanceof Error ? error.message : String(error) });
    }
  }
}
if (!scenarioResult) throw new Error("Real Herdr scenario did not complete");

console.log(JSON.stringify({
  observedAt: new Date().toISOString(),
  provenance: {
    herdrVersion: { command: "herdr --version", output: execFileSync("herdr", ["--version"], { encoding: "utf8" }).trim() },
    source: { path: "src/index.ts", sha256: sha256(sourcePath) },
    acceptanceScript: { path: "docs/works/terminal-surface-cleanup/evidence/real-herdr-acceptance.ts", sha256: sha256(scriptPath) },
  },
  herdrWorkspaceId: workspaceId,
  disposableTabCount: 1,
  scenarios: [scenarioResult],
  finallyCleanup: { attempts: finallyCleanup, remainingAcceptedTabs: [...acceptedTabs] },
}, null, 2));

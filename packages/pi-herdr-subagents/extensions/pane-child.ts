import { renameSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { Type } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, Text } from "@earendil-works/pi-tui";

type CompletionState = "active" | "settling" | "settled";
type PaneChildOperations = {
  writeFile(path: string, data: string): Promise<void>;
  rename(source: string, destination: string): void;
};

export default function paneChild(
  pi: ExtensionAPI,
  operations: PaneChildOperations = { writeFile, rename: renameSync },
): void {
  const resultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  const subagentId = process.env.PI_HERDR_SUBAGENT_ID;
  const generation = Number(process.env.PI_HERDR_SUBAGENT_GENERATION);
  if (!resultPath || !subagentId || !Number.isInteger(generation)) return;
  let completionState: CompletionState = "active";
  let pendingCompletion: Promise<void> | undefined;
  const nudgeDelay = Math.max(1000, Number.parseInt(process.env.PI_SUBAGENT_NUDGE_DELAY_MS ?? "5000", 10) || 5000);
  let nudgeTimer: ReturnType<typeof setTimeout> | undefined;
  let inputAfterAgentEnd = false;
  const clearNudge = () => {
    if (nudgeTimer !== undefined) clearTimeout(nudgeTimer);
    nudgeTimer = undefined;
  };
  const scheduleNudge = () => {
    clearNudge();
    if (completionState !== "active") return;
    nudgeTimer = setTimeout(() => {
      nudgeTimer = undefined;
      if (completionState === "active" && !inputAfterAgentEnd) {
        pi.sendUserMessage("No terminal result has been recorded yet. If your work is finished, call subagent_done with its outcome; otherwise, continue the remaining work.", { deliverAs: "followUp" });
      }
    }, nudgeDelay);
  };
  const on = pi.on.bind(pi) as (event: string, handler: (...args: any[]) => unknown) => void;
  on("before_agent_start", clearNudge);
  on("agent_start", () => { inputAfterAgentEnd = false; clearNudge(); });
  on("agent_end", scheduleNudge);
  on("input", () => {
    if (completionState !== "active") return { action: "handled" };
    inputAfterAgentEnd = true;
    clearNudge();
  });
  on("session_shutdown", clearNudge);
  const finish = (result: string, ctx: { shutdown(): void }): Promise<void> => {
    if (completionState === "settled") return Promise.resolve();
    if (pendingCompletion) return pendingCompletion;

    completionState = "settling";
    clearNudge();
    const temporary = `${resultPath}.${process.pid}.tmp`;
    const persistence = Promise.resolve()
      .then(() => operations.writeFile(temporary, JSON.stringify({ subagentId, generation, status: "completed", result })))
      .then(() => operations.rename(temporary, resultPath));
    pendingCompletion = persistence.then(
      () => {
        completionState = "settled";
        ctx.shutdown();
      },
      error => {
        completionState = "active";
        pendingCompletion = undefined;
        throw error;
      },
    );
    return pendingCompletion;
  };
  pi.registerTool({
    name: "subagent_done",
    label: "Subagent Done",
    description: "Write the complete final result text in the caller/Agent-required format and end this execution.",
    parameters: Type.Object({ result: Type.String({ minLength: 1 }) }),
    renderCall(args, theme) {
      const title = theme.fg("toolTitle", theme.bold("subagent_done"));
      return new Text(typeof args.result === "string" ? `${title}\n${stripTerminalSequences(args.result)}` : title, 0, 0);
    },
    async execute(_id, params, _signal, _update, ctx) {
      await finish(params.result, ctx);
      return { content: [{ type: "text", text: "Subagent result recorded." }], details: {} };
    },
  });
}

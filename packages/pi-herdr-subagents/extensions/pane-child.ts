import { dirname, join } from "node:path";
import { cleanupImages, imageLaunch } from "../src/image-input.js";
import { resultPublisher, type ResultOperations } from "../src/result-publication.js";
import { Type } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, Text } from "@earendil-works/pi-tui";

export type PaneChildControl = {
  isActive(): boolean;
  fail(stage: string, shutdown?: () => void): Promise<void>;
};
export const paneChildControlChannel = "pi-herdr-subagent:control";

type CompletionState = "active" | "settling" | "settled";
export default function paneChild(pi: ExtensionAPI, operations?: ResultOperations): PaneChildControl | undefined {
  const resultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  const subagentId = process.env.PI_HERDR_SUBAGENT_ID;
  const generation = Number(process.env.PI_HERDR_SUBAGENT_GENERATION);
  if (!resultPath || !subagentId || !Number.isInteger(generation)) return;
  const expectsImages = process.env.PI_HERDR_SUBAGENT_IMAGE_INPUT === "1";
  const imageEnvironment = { PI_HERDR_SUBAGENT_IMAGE_INPUT: "1", PI_HERDR_SUBAGENT_RESULT_PATH: resultPath,
    PI_HERDR_SUBAGENT_ID: subagentId, PI_HERDR_SUBAGENT_GENERATION: String(generation) };
  const validateResultStorage = () => {
    if (expectsImages) imageLaunch(join(dirname(dirname(resultPath)), `${subagentId}-g1.jsonl`), imageEnvironment);
  };
  const cleanupImageInput = () => {
    if (!expectsImages) return;
    try { cleanupImages(imageLaunch(join(dirname(dirname(resultPath)), `${subagentId}-g1.jsonl`), imageEnvironment)); }
    catch {
      try { console.warn("Image input cleanup failed for the child generation."); } catch { /* Diagnostics cannot replace the Result. */ }
    }
  };
  let completionState: CompletionState = "active";
  let pendingCompletion: Promise<void> | undefined;
  const publisher = resultPublisher(resultPath, validateResultStorage, operations);
  const cleanupTemporary = publisher.cleanup;
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
  let live = true;
  on("session_shutdown", () => { live = false; clearNudge(); cleanupTemporary(); cleanupImageInput(); });
  const persist = (body: { status: "completed"; result: string } | { status: "failed"; error: string }, ctx: { shutdown(): void }): Promise<void> => {
    if (completionState === "settled") { cleanupTemporary(); return Promise.resolve(); }
    if (pendingCompletion) return pendingCompletion;

    completionState = "settling";
    clearNudge();
    const persistence = Promise.resolve().then(() => publisher.publish(JSON.stringify({ subagentId, generation, ...body })));
    pendingCompletion = persistence.then(
      () => {
        completionState = "settled"; // Publication, not temporary deletion, owns the terminal barrier.
        if (body.status === "completed") cleanupImageInput();
        ctx.shutdown();
      },
      error => {
        cleanupTemporary();
        completionState = "active";
        pendingCompletion = undefined;
        throw error;
      },
    );
    return pendingCompletion;
  };
  const control: PaneChildControl = {
    isActive: () => live && completionState === "active",
    async fail(stage, shutdown = () => {}) {
      // An in-flight successful Result retains precedence over input/startup failure.
      if (pendingCompletion) { try { await pendingCompletion; } catch { /* Failed persistence is retryable. */ } }
      if (completionState === "settled") return;
      const safeStage = /^[a-z_]+$/.test(stage) ? stage : "delivery";
      await persist({ status: "failed", error: `image_input_failed:${safeStage}` }, { shutdown });
    },
  };
  pi.events?.on(paneChildControlChannel, (receive: unknown) => {
    if (typeof receive === "function") receive(control);
  });
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
      await persist({ status: "completed", result: params.result }, ctx);
      return { content: [{ type: "text", text: "Subagent result recorded." }], details: {} };
    },
  });
  return control;
}

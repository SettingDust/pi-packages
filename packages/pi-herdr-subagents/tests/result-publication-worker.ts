// Real child process: production publication/barrier/shutdown with offline Pi hooks.
import { spyOn } from "bun:test";
import * as fs from "node:fs";
import paneChild from "../extensions/pane-child.js";

const handlers = new Map<string, () => void>();
let done: any;
let shutdowns = 0;
let cleanupFailures = 0;
const warnings: string[] = [];
const resultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH!;
const unlink = fs.unlinkSync;
spyOn(fs, "unlinkSync").mockImplementation(path => {
  if (String(path).startsWith(`${resultPath}.`) && String(path).endsWith(".tmp")) {
    cleanupFailures++;
    throw new Error("PRIVATE injected deletion failure");
  }
  unlink(path);
});
spyOn(console, "warn").mockImplementation(message => { warnings.push(String(message)); });
const control = paneChild({
  on(event: string, handler: () => void) { handlers.set(event, handler); },
  registerTool(tool: any) { done = tool; },
  sendUserMessage() { throw new Error("Unexpected continuation"); },
} as any)!;
await done.execute("first", { result: "FIRST_RESULT" }, undefined, undefined, { shutdown() { shutdowns++; } });
const barrier = handlers.get("input")!();
handlers.get("session_shutdown")!();
console.log(JSON.stringify({ childCompletionSucceeded: true, shutdowns, cleanupFailures,
  resultLinks: fs.lstatSync(resultPath).nlink, active: control.isActive(), barrier, warnings }));

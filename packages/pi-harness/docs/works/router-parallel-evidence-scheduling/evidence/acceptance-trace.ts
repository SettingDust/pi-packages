import { createHash } from "node:crypto";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { appendFileSync } from "node:fs";

// Loaded last: records the effective registered tools, never model text or secrets.
export default function acceptanceTrace(pi: ExtensionAPI): void {
  const path = process.env.PI_T4_TRACE;
  if (!path) throw new Error("PI_T4_TRACE is required");
  const emit = (entry: Record<string, unknown>) => appendFileSync(path, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
  let resolved: { prompt: string; model: string; thinking: string } | undefined;
  const calls = new Map<string, Record<string, unknown>>();
  pi.on("agent_start", () => {
    for (const name of ["resolve_delegation", "subagent_spawn", "subagent_join"]) {
      const tool = pi.getAllTools().find(item => item.name === name);
      emit({ kind: "registered", name, active: pi.getActiveTools().includes(name), description: tool?.description ?? null });
    }
  });
  pi.on("message_start", event => {
    const message = event.message as { customType?: string; content?: unknown };
    if (message.customType !== "pi-herdr-subagent-completion" || typeof message.content !== "string") return;
    const match = message.content.match(/^Subagent terminal notification: (\{.*\})\. Call subagent_join/);
    if (!match) return;
    try {
      const notice = JSON.parse(match[1]) as { subagentId?: string; status?: string };
      emit({ kind: "notification", subagentId: notice.subagentId, status: notice.status });
    } catch { /* malformed notice remains unverified */ }
  });
  pi.on("tool_call", event => {
    const input = event.input as Record<string, unknown>;
    const handoff = input.handoff as { objective?: string } | undefined;
    const name = event.toolName;
    const info: Record<string, unknown> = { kind: "call", name, id: event.toolCallId };
    if (name === "read") info.strategy = typeof input.path === "string" && input.path.replaceAll("\\", "/").endsWith("/delegation-strategy/SKILL.md");
    if (name === "resolve_delegation") info.branch = String(handoff?.objective ?? "").match(/\b(branch A|branch C|final writer)\b/i)?.[1] ?? "unknown";
    if (name === "subagent_spawn") {
      info.label = String(input.label ?? "").match(/\b(branch A|branch C|final writer)\b/i)?.[1] ?? "unknown";
      info.exact = Boolean(resolved && input.prompt === resolved.prompt && input.model === resolved.model && input.thinking === resolved.thinking && input.agent === "handler");
      resolved = undefined;
    }
    if (name === "subagent_join") info.subagentId = input.subagentId;
    calls.set(event.toolCallId, info);
    emit(info);
  });
  pi.on("tool_result", event => {
    const call = calls.get(event.toolCallId);
    const name = event.toolName;
    const details = event.details as Record<string, unknown> | undefined;
    const info: Record<string, unknown> = { kind: "result", name, id: event.toolCallId, isError: event.isError };
    if (name === "read") {
      const content = Array.isArray(event.content) ? event.content as { type?: string; text?: string }[] : [];
      info.strategyBody = call?.strategy === true && !event.isError && content.some(part => part.type === "text" && typeof part.text === "string"
        && part.text.includes("name: delegation-strategy") && part.text.includes("Do not introduce a scheduler, queue, retry engine"));
    }
    if (name === "resolve_delegation") {
      info.status = details?.status;
      if (details?.status === "resolved" && typeof details.prompt === "string" && typeof details.model === "string" && typeof details.thinking === "string") {
        resolved = { prompt: details.prompt, model: details.model, thinking: details.thinking };
      }
    }
    if (name === "subagent_spawn" || name === "subagent_join") {
      info.status = details?.status;
      info.subagentId = details?.subagentId;
      info.generation = details?.generation;
      if (name === "subagent_spawn") { info.tabId = details?.tabId; info.startedAt = details?.startedAt; }
      if (name === "subagent_join") {
        info.updatedAt = details?.updatedAt;
        if (typeof details?.result === "string") info.resultSha256 = createHash("sha256").update(details.result).digest("hex");
        let parsed: Record<string, unknown> | undefined;
        try { parsed = typeof details?.result === "string" ? Bun.YAML.parse(details.result) as Record<string, unknown> : undefined; } catch { /* malformed is evidence */ }
        info.fullResult = Boolean(parsed && typeof parsed.status === "string" && typeof parsed.summary === "string" && typeof parsed.report === "string");
        info.resultStatus = parsed?.status;
        const resultText = `${parsed?.summary ?? ""}\n${parsed?.report ?? ""}`;
        info.fixtureFact = resultText.includes("amber") ? "amber" : resultText.includes("cedar") ? "cedar" : null;
        info.artifactCount = Array.isArray(parsed?.artifacts) ? parsed.artifacts.length : 0;
      }
    }
    emit({ ...info, branch: call?.branch ?? call?.label });
  });
}

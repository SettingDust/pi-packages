import { expect, test } from "bun:test";
import { Type } from "@earendil-works/pi-ai";
import { dispatchDelegation } from "../src/protocol.js";

const input = {
  handoff: { objective: "Check dispatch", primarySkill: "implement", context: [] },
  admission: { path: "atomic", basis: ["Bounded"], verification: ["Test"] },
  reasoning: 1, impact: 1,
  delegate: { name: "subagent_spawn", params: { label: "Check", taskSlug: "check-dispatch" } },
};
const options = {
  cwd: process.cwd(), skills: [{ name: "implement", description: "Implement" }],
  candidates: [{ provider: "test", modelId: "model", thinking: "off", reasoning: 1, impact: 1 }],
  modelRegistry: { getAvailable: () => [{ provider: "test", id: "model", reasoning: false }] },
  tools: ["subagent_spawn", "other_tool"].map(name => ({
    name, label: name, description: "Synthetic registration", parameters: Type.Object({}),
    async execute() { throw new Error("Must use host bridge"); },
  })),
};

test.each([
  { delegate: undefined },
  { extra: true },
  { delegate: { ...input.delegate, extra: true } },
  { delegate: { ...input.delegate, name: "missing" } },
  ...[null, [], "{}", Object.create({ label: "inherited" })].map(params => ({ delegate: { ...input.delegate, params } })),
  ...["agent", "prompt", "model", "thinking"].map(key => ({ delegate: { ...input.delegate, params: { [key]: undefined } } })),
  { handoff: { ...input.handoff, context: [{ ref: "missing-authority-for-dispatch.md", purpose: "Required" }] } },
  { handoff: { ...input.handoff, extra: true } },
  { admission: undefined },
  { reasoning: -1 },
])("pre-launch rejection has no evidence: %p", async override => {
  let calls = 0;
  const result = await dispatchDelegation({ ...input, ...override }, {
    ...options, executeTool: async () => { calls++; throw new Error("Unexpected launch"); },
  });
  expect(result.resolution.status).toBe("blocked");
  expect(Object.keys(result)).toEqual(["resolution"]);
  expect(calls).toBe(0);
});

test.each([false, true])("preserves raw returned isError=%s exactly once", async isError => {
  const rawReturn = { toolCall: { type: "toolCall" as const, id: "parent/1", name: "subagent_spawn", arguments: {} }, isError, result: { content: [{ type: "text" as const, text: "Not Handler YAML" }],
    details: { subagentId: "backend-id", generation: 7, status: "failed", result: "malformed" } } };
  const calls: Array<{ name: string; args: unknown }> = [];
  const result = await dispatchDelegation(input, { ...options, executeTool: async (name, args) => {
    calls.push({ name, args }); return rawReturn;
  } });
  expect(result.resolution.status).toBe("resolved");
  if (result.resolution.status !== "resolved") throw new Error("Expected resolution");
  expect(calls).toEqual([{ name: input.delegate.name, args: { ...input.delegate.params, agent: "handler",
    prompt: result.resolution.prompt, model: result.resolution.model, thinking: result.resolution.thinking } }]);
  expect(result.launch?.rawReturn).toBe(rawReturn);
  expect(Object.keys(result.launch!)).toEqual(["tool", "rawReturn"]);
  expect(Bun.YAML.parse(Bun.YAML.stringify(result))).toEqual(result);
});

test.each([new Error("Bridge failed"), { code: "transport_failure" }, undefined])("retains raw thrown bridge evidence: %p", async rawError => {
  let calls = 0;
  const result = await dispatchDelegation(input, { ...options, executeTool: async () => { calls++; throw rawError; } });
  expect(calls).toBe(1);
  expect(result.resolution.status).toBe("resolved");
  expect(result.launch?.rawError).toBe(rawError);
  expect(Object.keys(result.launch!)).toEqual(["tool", "rawError"]);
});

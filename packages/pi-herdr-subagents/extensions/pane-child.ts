import { renameSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { Type } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function paneChild(pi: ExtensionAPI): void {
  const resultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH;
  const subagentId = process.env.PI_HERDR_SUBAGENT_ID;
  const generation = Number(process.env.PI_HERDR_SUBAGENT_GENERATION);
  if (!resultPath || !subagentId || !Number.isInteger(generation)) return;
  let settled = false;
  const finish = (result: string, ctx: { shutdown(): void }) => {
    if (settled) return;
    settled = true;
    const temporary = `${resultPath}.${process.pid}.tmp`;
    void writeFile(temporary, JSON.stringify({ subagentId, generation, status: "completed", result }))
      .then(() => { renameSync(temporary, resultPath); ctx.shutdown(); });
  };
  pi.registerTool({
    name: "subagent_done",
    label: "Subagent Done",
    description: "Write the final YAML Handler Result and end this execution.",
    parameters: Type.Object({ result: Type.String({ minLength: 1 }) }),
    async execute(_id, params, _signal, _update, ctx) {
      finish(params.result, ctx);
      return { content: [{ type: "text", text: "Subagent result recorded." }], details: {} };
    },
  });
}

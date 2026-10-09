import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { AgentRegistry, SubagentRuntime, createSubagentTools, type HerdrTransport } from "../src/index.js";

// Exercise the installed Pi composition, including its fallback on a missing or
// throwing renderCall. Calling renderCall alone cannot catch that privacy regression.
const piDist = dirname(fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent")));
const { ToolExecutionComponent } = await import(pathToFileURL(join(piDist, "modes/interactive/components/tool-execution.js")).href);
const { initTheme } = await import(pathToFileURL(join(piDist, "modes/interactive/theme/theme.js")).href);
initTheme("dark", false);

for (const name of ["subagent_spawn", "subagent_resume"]) {
  test(`${name} image call renderer never reads payload through Pi partial/expanded/narrow rendering`, () => {
    const registry = new AgentRegistry();
    registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nHandler" }]);
    // Rendering must not invoke runtime or transport operations.
    const runtime = new SubagentRuntime({} as HerdrTransport, registry);
    const tool = createSubagentTools(runtime, "/repo").find(tool => tool.name === name)!;
    const data = "QUJD";
    const images = [{ type: "image", data, mimeType: "image/png" }];
    const identity = name === "subagent_spawn" ? { agent: "handler", label: "safe summary" } : { subagentId: "safe-task" };
    const args = { images, ...identity, prompt: "PRIVATE_PROMPT", taskSlug: "safe-task" };
    const ui = { requestRender() {} };
    const output = (component: any, width = 120) => component.render(width).map(stripTerminalSequences).join("\n");
    // Control: the actual fallback leaks this short synthetic payload even collapsed.
    const fallback = new ToolExecutionComponent(name, "control", args, {}, { ...tool, renderCall: undefined }, ui, "/repo");
    expect(output(fallback)).toContain(data);
    fallback.setExpanded(true);
    expect(output(fallback)).toContain(data);

    let payloadReads = 0;
    const forbidden = () => { payloadReads++; throw new Error("payload must not be read"); };
    const cases: unknown[] = [
      args, {}, undefined, null, { images }, { ...identity },
      { ...identity, images: [{ type: "image", get data() { return forbidden(); }, mimeType: "image/png" }] },
      { ...identity, get images() { return forbidden(); } },
      { images, agent: { toString: forbidden }, label: { toString: forbidden }, subagentId: { toString: forbidden } },
      { images, get agent() { throw new Error("partial identity"); }, get label() { throw new Error("partial identity"); }, get subagentId() { throw new Error("partial identity"); } },
      new Proxy({ ...identity }, { get(target, key) { if (key === "images" || key === "toJSON") return forbidden(); return Reflect.get(target, key); }, ownKeys: forbidden }),
    ];
    for (const value of cases) {
      const component = new ToolExecutionComponent(name, "privacy", value, {}, tool, ui, "/repo");
      for (const expanded of [false, true]) {
        component.setExpanded(expanded);
        for (const partial of [true, false]) {
          component.updateArgs(value);
          if (!partial) { component.setArgsComplete(); component.markExecutionStarted(); }
          component.updateResult({ content: [{ type: "text", text: "safe result" }], details: {} }, partial);
          for (const width of [12, 40, 120]) {
            const text = output(component, width);
            expect(text).not.toContain(data);
            expect(text).not.toContain("PRIVATE_PROMPT");
            expect(text).not.toContain("image/png");
            expect(text).not.toContain("images");
            for (const line of text.split("\n")) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
          }
          expect(output(component)).toContain(name.replace("_", " "));
        }
      }
    }
    expect(payloadReads).toBe(0);
    const rendered = output(new ToolExecutionComponent(name, "identity", args, {}, tool, ui, "/repo"));
    expect(rendered).toContain(name === "subagent_spawn" ? "handler · safe summary" : "safe-task");
  });
}

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
    async closeTab() { return "closed"; },
    async paneExists() { return true; },
  };
  const registry = new AgentRegistry();
  registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nHandler" }]);
  const root = mkdtempSync(join(tmpdir(), "subagent-renderer-"));
  const parentSessionFile = join(root, "parent.jsonl");
  const runtime = new SubagentRuntime(transport, registry);
  const tools = createSubagentTools(runtime, "/repo", parentSessionFile) as any[];
  const spawn = tools.find(tool => tool.name === "subagent_spawn")!;
  const joinTool = tools.find(tool => tool.name === "subagent_join")!;
  const spawnArgs = { agent: "handler", prompt: "Do the work", label: "Implement renderer", taskSlug: "implement-renderer" };

  expect(render(spawn.renderCall(spawnArgs, theme))).toBe("subagent spawn  handler · Implement renderer");
  const spawned = await spawn.execute("spawn-1", spawnArgs);
  expect(render(spawn.renderResult(spawned, {}, theme))).toBe(" Implement renderer running\n  Result unavailable · result_not_delivered · full Result not returned");

  const task = runtime.inspect(spawned.details.subagentId);
  writeFileSync(task.resultPath, JSON.stringify({
    subagentId: task.subagentId,
    generation: task.generation,
    status: "completed",
    result: "status: completed\nsummary: done\nreport: renderer works",
  }), { mode: 0o600 });

  expect(render(joinTool.renderCall({ subagentId: task.subagentId }, theme))).toBe("subagent join  implement-renderer");
  let partial: unknown;
  try {
    const joined = await joinTool.execute("join-1", { subagentId: task.subagentId }, undefined, (update: unknown) => { partial = update; }, { cwd: "/repo", sessionManager: { getSessionFile: () => parentSessionFile } });
    expect(render(joinTool.renderResult(partial, { isPartial: true }, theme))).toBe(" Implement renderer running\n   waiting for result");
    // Raw Herdr transport is not Caller delivery. This fixture supplies the full projection explicitly.
    expect(render(joinTool.renderResult(joined, { expanded: true }, theme))).not.toContain("report: renderer works");
    const original = "status: completed\nsummary: done\nreport: renderer works";
    expect(joined.details.result).toBe(original);
    const details = { ...joined.details, resultDelivery: { kind: "full", originalBytes: Buffer.byteLength(original), fullResultReturned: true } };
    delete details.resultSource;
    const projected = { content: [{ type: "text", text: JSON.stringify(details) }], details };
    expect(render(joinTool.renderResult(projected, {}, theme))).toContain("Full Result delivered");
    expect(render(joinTool.renderResult(projected, { expanded: true }, theme))).toContain(original);
  } finally { runtime.stop(); rmSync(root, { recursive: true, force: true }); }
});

for (const name of ["subagent_join", "subagent_inspect", "subagent_spawn", "subagent_resume", "subagent_cancel", "subagent_steer"]) {
  test(`${name} renders only delivered full/summary/unavailable through installed Pi composition`, () => {
    const registry = new AgentRegistry();
    registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nHandler" }]);
    const runtime = new SubagentRuntime({} as HerdrTransport, registry);
    runtime.inspect = () => { throw new Error("renderer must not read runtime cache"); };
    const tool = createSubagentTools(runtime, "/repo").find(tool => tool.name === name)! as any;
    const marker = "HIDDEN_LONG_BODY_MARKER";
    const original = "status: partial\nsummary: done\nreport: short evidence";
    const base = { subagentId: "render-task", generation: 2, agent: "handler", label: "safe label", status: "completed" };
    const path = "/fixture/render-task-artifacts/result-2.json";
    const summary = '  Existing summary "quotes" 中文\\path\nsecond line  ';
    const full = { ...base, result: original, resultPath: path, resultDelivery: { kind: "full", originalBytes: Buffer.byteLength(original), fullResultReturned: true } };
    const navigation = { ...base, resultSummary: summary, resultPath: path, resultDelivery: { kind: "summary", originalBytes: 16385, fullResultReturned: false } };
    const unavailable = { ...base, resultDelivery: { kind: "unavailable", fullResultReturned: false, code: "result_access_unavailable" } };
    const cases = [full, navigation, unavailable, { ...base, result: marker.repeat(1000) },
      { ...navigation, result: marker }, { ...full, result: marker.repeat(1000) },
      { ...full, resultDelivery: { kind: "full", originalBytes: 999, fullResultReturned: true } },
      { ...navigation, resultDelivery: { kind: "summary", originalBytes: 16385, fullResultReturned: true } },
      { ...unavailable, result: marker, resultSummary: marker }, { ...base, agent: undefined, result: marker }];
    for (const details of cases) {
      const before = JSON.stringify(details);
      const value = { content: [{ type: "text", text: marker }], details };
      for (const expanded of [false, true]) {
        const text = render(tool.renderResult(value, { expanded }, theme));
        expect(text).not.toContain(marker);
        if (details === navigation) {
          expect(text).toContain(summary.trimEnd());
          expect(text).toContain(path);
          expect(text).toContain("16385 UTF-8 bytes");
          expect(text).toContain("full Result not returned");
          expect(text).toContain("ordinary read");
          expect(text).toContain("completely decode result");
        }
        if (details === full && expanded) expect(text).toContain(original);
        if (details === unavailable) expect(text).toContain("result_access_unavailable");
        const component = new ToolExecutionComponent(name, "consumer", { subagentId: base.subagentId, agent: "handler", label: base.label }, {}, tool, { requestRender() {} }, "/repo");
        component.setExpanded(expanded);
        component.updateResult(value, false);
        for (const width of [12, 40, 120]) {
          const lines = component.render(width).map(stripTerminalSequences);
          expect(lines.join("\n")).not.toContain(marker);
          for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
        }
        const progress = render(tool.renderResult({ ...value, details: { ...base, result: marker, resultDelivery: full.resultDelivery } }, { expanded, isPartial: true }, theme));
        expect(progress).not.toContain(marker);
        expect(progress).not.toContain("Full Result delivered");
      }
      expect(JSON.stringify(details)).toBe(before);
    }
    expect(render(tool.renderResult({ content: [{ type: "text", text: marker }] }, { expanded: true }, theme))).not.toContain(marker);
    const longSummary = { ...navigation, resultSummary: "长".repeat(6000) + "SUMMARY_END" };
    expect(render(tool.renderResult({ details: longSummary }, {}, theme))).toContain("SUMMARY_END");
    const plain = { ...base, agent: "reviewer", result: "opaque non-Handler original" };
    expect(render(tool.renderResult({ details: plain }, { expanded: true }, theme))).toContain(plain.result);
  });
}

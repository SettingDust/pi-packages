import { expect, test } from "bun:test";
import { existsSync, linkSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync, chmodSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import type { ImageContent } from "@earendil-works/pi-ai";
import { AgentRegistry, SubagentRuntime, type HerdrTransport, type SubagentTask } from "../src/index.js";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

test("I-SEAM preserves stock-hook evidence and verifies an owned SDK boundary offline", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "pi-image-seam-"));
  const packageRoot = realpathSync(process.env.PI_IMAGE_SEAM_PACKAGE_ROOT ?? resolve(import.meta.dir, "../node_modules/@earendil-works/pi-coding-agent"));
  try {
    const child = spawnSync(process.execPath, [join(import.meta.dir, "image-input-worker.ts"), packageRoot, sandbox], {
      cwd: sandbox, encoding: "utf8", timeout: 45_000, maxBuffer: 2 * 1024 * 1024,
      // No user credentials, settings, package catalogs, or project extensions in the worker.
      env: {
        PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
        TEMP: sandbox, TMP: sandbox, HOME: sandbox, USERPROFILE: sandbox, APPDATA: sandbox, LOCALAPPDATA: sandbox,
        PI_CODING_AGENT_DIR: sandbox,
      },
    });
    expect(child.error).toBeUndefined();
    if (child.status !== 0) throw new Error(`I-SEAM worker failed (${child.status}):\n${child.stderr}\n${child.stdout}`);
    // Public InteractiveMode runtime rebinds can emit terminal escape sequences.
    const marker = "I_SEAM_EVIDENCE\n";
    const start = child.stdout.lastIndexOf(marker);
    expect(start).toBeGreaterThanOrEqual(0);
    const evidenceText = child.stdout.slice(start + marker.length);
    const evidence = JSON.parse(evidenceText);
    expect(evidence.status).toBe("completed");
    expect(evidence.stockCliStatus).toBe("blocked");
    expect(evidence.version).toBe("0.99.2");
    expect(evidence.providerCalls).toBe(0);
    expect(evidence.networkAttempts).toBe(0);
    expect(evidence.observations).toHaveLength(17);
    expect(evidence.sdkObservations).toHaveLength(19);
    expect(evidence.sdkObservations.every((item: { label: string; rejectedEarly: number; fileReads: number; compactionRestored: boolean }) =>
      item.rejectedEarly === 4 && item.fileReads === (item.label === "sdk-no-images" ? 0 : 1) && item.compactionRestored)).toBe(true);
    console.log(evidenceText);
  } finally { rmSync(sandbox, { recursive: true, force: true }); }
}, 60_000);

function png(red: number, blue: number): ImageContent {
  function chunk(type: string, data: Buffer): Buffer {
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, body, checksum]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  const bytes = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.from([0, red, 0, blue, 255]))), chunk("IEND", Buffer.alloc(0)),
  ]);
  return { type: "image", mimeType: "image/png", data: bytes.toString("base64") };
}


test("I-CHILD actual processes consume production publication with native SDK normalization and disk resume", async () => {
  const roots: string[] = [];
  const runtimes: SubagentRuntime[] = [];
  const evidence: unknown[] = [];
  const packageRoot = realpathSync(resolve(import.meta.dir, "../node_modules/@earendil-works/pi-coding-agent"));
  const images = [png(255, 0), png(0, 255)];
  const digest = (image: ImageContent) => ({ mimeType: image.mimeType, sha256: createHash("sha256").update(image.data).digest("hex") });
  const registry = new AgentRegistry();
  registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nOwned child system prompt." }]);
  const models = {
    getProvider() { return {}; }, getProviderAuthStatus() { return { configured: true }; },
    find(provider: string, id: string) { return { provider, id }; },
    getAvailable() { return [{ provider: "i-seam-fixture", id: "ordered-images" }, { provider: "i-child-text", id: "text" }]; },
  };
  function fixture() {
    const sandbox = mkdtempSync(join(tmpdir(), "pi-image-child-")); roots.push(sandbox);
    let env: Record<string, string> = {};
    const transport: HerdrTransport = {
      async createTab(input) { env = input.env!; return { tabId: "fixture", paneId: "fixture" }; },
      async run() {}, async sendText() {}, async closePane() {}, async closeTab() { return "closed"; }, async paneExists() { return true; },
    };
    const runtime = new SubagentRuntime(transport, registry, sandbox); runtimes.push(runtime);
    return { sandbox, runtime, environment: () => env };
  }
  const payload = (task: SubagentTask) => join(dirname(task.resultPath), "image-input-" + task.generation, "envelope.json");
  function invoke(f: ReturnType<typeof fixture>, task: SubagentTask, scenario: string, changeEnv = {}) {
    const bootstrap = readFileSync(join(dirname(task.resultPath), "launch-" + task.generation + ".cjs"), "utf8");
    const encoded = bootstrap.match(/Buffer\.from\("([^"]+)"/)![1]!;
    const spec = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    expect(spec.args[0]).toBe("-e");
    expect(spec.args[1]).toContain("runPaneImageChild");
    expect(spec.args[2]).toBe("--");
    const sdkArgs = [...spec.args.slice(3, -1), "--offline", "--no-extensions", "--no-skills", "--no-themes", "--no-prompt-templates", "--no-context-files", spec.args.at(-1)];
    const child = spawnSync(process.execPath, [join(import.meta.dir, "image-input-worker.ts"), packageRoot, f.sandbox, "child", scenario], {
      cwd: f.sandbox, input: JSON.stringify(sdkArgs), encoding: "utf8", timeout: 45_000, maxBuffer: 2 * 1024 * 1024,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
        TEMP: f.sandbox, TMP: f.sandbox, HOME: f.sandbox, USERPROFILE: f.sandbox, APPDATA: f.sandbox, LOCALAPPDATA: f.sandbox,
        PI_CODING_AGENT_DIR: join(f.sandbox, "agent"), ...f.environment(), ...changeEnv },
    });
    expect(child.error).toBeUndefined();
    if (child.status !== 0) throw new Error("I-CHILD controlled worker failed: " + child.stderr);
    const receipt = JSON.parse(child.stdout.slice(child.stdout.indexOf("{")));
    expect(receipt).toMatchObject({ piVersion: "0.99.2", providerCalls: 0, networkAttempts: 0 });
    expect(child.stdout).not.toContain(f.sandbox);
    for (const image of images) expect(child.stdout).not.toContain(image.data);
    evidence.push(receipt);
    return receipt;
  }
  const spawn = (f: ReturnType<typeof fixture>, values = images, model = "i-seam-fixture/ordered-images") =>
    f.runtime.spawn({ agent: "handler", cwd: f.sandbox, prompt: "same designated task text", label: "child", taskSlug: "task", images: values, model }, models);
  try {
    const f = fixture();
    const first = await spawn(f); f.runtime.stop();
    const received = invoke(f, first, "spawn");
    expect(received).toMatchObject({ rawCalls: 1, entries: 3, attempts: 3, rejectedEarly: 7, duplicateRejected: true, deleted: true, tuiStarted: true });
    expect(received.receipts).toEqual(images.map(digest)); // Raw receipt is independent of normalized receipt.
    const { resizeImage } = await import("@earendil-works/pi-coding-agent");
    const normalized = await Promise.all(images.map(image => resizeImage(Buffer.from(image.data, "base64"), image.mimeType)));
    expect(received.normalized[0]).toEqual(normalized.map(image => digest({ type: "image", data: image!.data, mimeType: image!.mimeType })));
    expect(received.contexts).toEqual([[2], [2, 0], [2, 0, 0]]);
    expect(existsSync(first.sessionFile)).toBeTrue();
    expect(readFileSync(first.sessionFile, "utf8")).toContain('"type":"session"');
    expect(existsSync(payload(first))).toBeFalse();
    writeFileSync(first.resultPath, JSON.stringify({ subagentId: "task", generation: 1, status: "completed", result: "fixture done" }));
    await f.runtime.join("task");
    const resumed = await f.runtime.resume("task", "same designated task text", [images[1]!]); f.runtime.stop();
    expect(resumed.sessionFile).toBe(first.sessionFile);
    const next = invoke(f, resumed, "resume");
    expect(next).toMatchObject({ generation: 2, rawCalls: 1, entries: 3, attempts: 3, deleted: true });
    expect(next.receipts).toEqual([digest(images[1]!)]);
    expect(next.contexts).toEqual([[2, 0, 0, 1], [2, 0, 0, 1, 0], [2, 0, 0, 1, 0, 0]]);
    expect(readFileSync(first.resultPath, "utf8")).toContain('"fixture done"');

    for (const scenario of ["corrupt", "nonvisual", "drop-input", "drop-context", "missing", "malformed", "version", "task-identity", "generation", "encoding", "utf8", "marker", "path", "acl", "hardlink", "redirect", "terminal"]) {
      const item = fixture();
      const values = scenario === "corrupt" ? [{ type: "image" as const, mimeType: "image/png", data: Buffer.from("not a raster image").toString("base64") }] : images;
      const task = await spawn(item, values, scenario === "nonvisual" ? "i-child-text/text" : undefined); item.runtime.stop();
      const path = payload(task);
      let env = {};
      const original = JSON.parse(readFileSync(path, "utf8"));
      if (scenario === "missing") unlinkSync(path);
      if (scenario === "malformed") writeFileSync(path, "{broken");
      if (scenario === "version") writeFileSync(path, JSON.stringify({ ...original, version: 2 }));
      if (scenario === "task-identity") writeFileSync(path, JSON.stringify({ ...original, subagentId: "other-task" }));
      if (scenario === "generation") writeFileSync(path, JSON.stringify({ ...original, generation: 2 }));
      if (scenario === "encoding") writeFileSync(path, JSON.stringify({ ...original, images: [{ ...images[0], data: "AQ" }] }));
      if (scenario === "utf8") writeFileSync(path, Buffer.from([0xff]));
      if (scenario === "marker") env = { PI_HERDR_SUBAGENT_IMAGE_INPUT: "0" };
      if (scenario === "path") env = { PI_HERDR_SUBAGENT_RESULT_PATH: join(dirname(task.resultPath), "result-2.json") };
      if (scenario === "hardlink") linkSync(path, join(item.sandbox, "linked"));
      if (scenario === "acl") {
        if (process.platform === "win32") {
          const script = "$ErrorActionPreference='Stop'; $p=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + Buffer.from(path).toString("base64") + "')); $a=[IO.File]::GetAccessControl($p); $a.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-1-0'), 'Read', 'Allow')); [IO.File]::SetAccessControl($p,$a);";
          expect(spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "Invoke-Expression ([Console]::In.ReadToEnd())"], { input: script, encoding: "utf8" }).status).toBe(0);
        } else chmodSync(path, 0o644);
      }
      if (scenario === "redirect") {
        const outside = join(item.sandbox, "outside"); mkdirSync(outside); writeFileSync(join(outside, "envelope.json"), "foreign");
        renameSync(dirname(path), dirname(path) + "-held"); symlinkSync(outside, dirname(path), process.platform === "win32" ? "junction" : "dir");
      }
      const actual = invoke(item, task, scenario, env);
      if (scenario === "terminal") {
        expect(actual).toMatchObject({ rawCalls: 0, entries: 0, attempts: 0, deleted: true });
        expect(readFileSync(task.resultPath, "utf8")).toContain("image_input_failed:fixture_terminal");
      } else {
        expect(actual.stage).toBeDefined();
        expect(actual.attempts).toBe(0);
        expect(actual.entries).toBe(scenario === "drop-context" ? 1 : 0);
        if (!["path", "marker"].includes(scenario)) expect(JSON.parse(readFileSync(task.resultPath, "utf8"))).toMatchObject({ status: "failed", error: "image_input_failed:" + actual.stage });
      }
      if (scenario === "corrupt") expect(actual.stage).toBe("normalization");
      if (scenario === "nonvisual") expect(actual.stage).toBe("model_images");
      if (scenario === "redirect") {
        expect(readFileSync(join(item.sandbox, "outside", "envelope.json"), "utf8")).toBe("foreign");
        rmSync(dirname(path), { force: true });
      }
    }
    console.log("I_CHILD_EVIDENCE\n" + JSON.stringify(evidence));
  } finally {
    for (const runtime of runtimes) runtime.stop();
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}, 300_000);

test("I-CHILD executes the produced bootstrap through the default SDK entry with offline extensions", async () => {
  const require = createRequire(new URL("../src/index.ts", import.meta.url));
  const jiti = require.resolve("jiti");
  expect(require("../package.json").dependencies.jiti).toBe("2.7.0");
  expect(require("jiti/package.json").version).toBe("2.7.0");
  const sandbox = mkdtempSync(join(tmpdir(), "pi-image-launch-"));
  const agentDir = join(sandbox, "agent"); mkdirSync(agentDir);
  writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ quietStartup: true, showChangelog: false, compaction: { enabled: false } }));
  const piRoot = realpathSync(resolve(import.meta.dir, "../node_modules/@earendil-works/pi-coding-agent"));
  const fixtureExtension = join(sandbox, "offline.ts");
  const evidencePath = join(sandbox, "evidence.json");
  writeFileSync(fixtureExtension, `import { createAssistantMessageEventStream } from ${JSON.stringify(pathToFileURL(join(dirname(piRoot), "pi-ai/dist/index.js")).href)};
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import net from 'node:net'; import http from 'node:http'; import https from 'node:https';
const evidence = { receipts: [], context: [], fixtureDelegations: 0, providerCalls: 0, networkAttempts: 0, systemPrompt: false, childTool: false, readTool: false };
const digest = image => ({ mimeType: image.mimeType, sha256: createHash('sha256').update(image.data).digest('hex') });
const deny = () => { evidence.networkAttempts++; throw new Error('network_disabled'); };
globalThis.fetch = deny; net.Socket.prototype.connect = deny; http.request = deny; http.get = deny; https.request = deny; https.get = deny;
process.on('exit', () => writeFileSync(${JSON.stringify(evidencePath)}, JSON.stringify(evidence)));
export default pi => {
 pi.on('before_agent_start', event => { evidence.receipts.push((event.images ?? []).map(digest)); });
 pi.on('agent_end', (_,ctx) => ctx.shutdown());
 pi.registerProvider('i-child-launch', { baseUrl: 'http://offline.invalid', apiKey: 'fixture-only', api: 'openai-responses',
  models: [{ id: 'vision', name: 'offline vision', reasoning: true, input: ['text', 'image'], contextWindow: 100000, maxTokens: 1000, cost: {input:0,output:0,cacheRead:0,cacheWrite:0} }],
  streamSimple(model, context) {
   evidence.fixtureDelegations++;
   evidence.systemPrompt = JSON.stringify(context.messages.filter(message => message.role === 'system')).includes('Owned child system prompt.');
   const tools = context.messages.filter(message => message.role === 'system').flatMap(message => message.toolsAdded ?? []);
   evidence.childTool = tools.some(tool => tool.name === 'subagent_done');
   evidence.readTool = tools.some(tool => tool.name === 'read');
   evidence.context.push(context.messages.filter(m => m.role === 'user').map(m => (Array.isArray(m.content) ? m.content : []).filter(c => c.type === 'image').length));
   const stream = createAssistantMessageEventStream();
   const tool = evidence.fixtureDelegations === 1;
   stream.push({ type: 'done', reason: tool ? 'toolUse' : 'stop', message: { role: 'assistant', content: tool ? [{ type: 'toolCall', id: 'offline-done', name: 'subagent_done', arguments: { result: 'offline bootstrap complete' } }] : [], api: model.api, provider: model.provider, model: model.id, usage: {input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}, stopReason: tool ? 'toolUse' : 'stop', timestamp: Date.now() } });
   return stream;
  }
 });
};`);
  let env: Record<string, string> = {};
  const transport: HerdrTransport = {
    async createTab(input) { env = input.env!; return { tabId: "fixture", paneId: "fixture" }; },
    async run() {}, async sendText() {}, async closePane() {}, async closeTab() { return "closed"; }, async paneExists() { return true; },
  };
  const registry = new AgentRegistry(); registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nOwned child system prompt." }]);
  const runtime = new SubagentRuntime(transport, registry, sandbox);
  const models = { getProvider() { return {}; }, getProviderAuthStatus() { return {configured:true}; }, find() { return {provider:"i-child-launch",id:"vision"}; }, getAvailable() { return [{provider:"i-child-launch",id:"vision"}]; } };
  const images = [png(255, 0), png(0, 255)];
  const reports: unknown[] = [];
  const digest = (image: ImageContent) => ({ mimeType: image.mimeType, sha256: createHash("sha256").update(image.data).digest("hex") });
  async function launch(task: SubagentTask, expected: ImageContent[], counts: number[]) {
    const launchFile = join(dirname(task.resultPath), "launch-" + task.generation + ".cjs");
    const script = readFileSync(launchFile, "utf8");
    const encoded = script.match(/Buffer\.from\("([^"]+)"/)![1]!;
    const spec = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    expect(spec.args[1]).toContain(`require(${JSON.stringify(jiti)}).createJiti(`);
    spec.args.push("-e", fixtureExtension, "--no-extensions", "--no-skills", "--no-prompt-templates", "--no-themes", "--approve");
    writeFileSync(launchFile, script.replace(encoded, Buffer.from(JSON.stringify(spec)).toString("base64")));
    const child = spawnSync(process.execPath, [launchFile], { cwd: sandbox, encoding: "utf8", timeout: 45_000, maxBuffer: 2 * 1024 * 1024,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: sandbox, TMP: sandbox, HOME: sandbox, USERPROFILE: sandbox, APPDATA: sandbox, LOCALAPPDATA: sandbox, TERM: "dumb", PI_OFFLINE: "1", PI_CODING_AGENT_DIR: agentDir, ...env },
    });
    if (child.error) throw new Error("bootstrap did not finish: " + (existsSync(evidencePath) ? readFileSync(evidencePath, "utf8") : "no fixture evidence"));
    const record = JSON.parse(readFileSync(task.resultPath, "utf8"));
    if (record.status !== "completed") throw new Error("bootstrap rejected: " + record.error + " evidence: " + (existsSync(evidencePath) ? readFileSync(evidencePath, "utf8") : "none"));
    expect(child.status).toBe(0);
    const report = JSON.parse(readFileSync(evidencePath, "utf8"));
    expect(report.receipts).toEqual([expected.map(digest)]);
    expect(report.context).toEqual([counts, counts]);
    expect(report.fixtureDelegations).toBe(2);
    expect(report).toMatchObject({ systemPrompt: true, childTool: true, readTool: true });
    expect(readFileSync(task.sessionFile, "utf8")).toContain('"thinkingLevel":"high"');
    expect(report.providerCalls).toBe(0); expect(report.networkAttempts).toBe(0);
    expect(existsSync(join(dirname(task.resultPath), "image-input-" + task.generation))).toBeFalse();
    for (const image of images) { expect(child.stdout).not.toContain(image.data); expect(child.stderr).not.toContain(image.data); }
    reports.push(report);
    expect((await runtime.join(task.subagentId)).status).toBe("completed");
  }
  try {
    const task = await runtime.spawn({ agent: "handler", cwd: sandbox, prompt: "work", label: "launch", taskSlug: "launch", images, model: "i-child-launch/vision", thinking: "high" }, models);
    await launch(task, images, [2]);
    const resumed = await runtime.resume(task.subagentId, "fresh work", [images[1]!]);
    await launch(resumed, [images[1]!], [2, 1]);
    console.log("I_CHILD_BOOTSTRAP_EVIDENCE\n" + JSON.stringify(reports));
  } finally { runtime.stop(); rmSync(sandbox, { recursive: true, force: true }); }
}, 120_000);


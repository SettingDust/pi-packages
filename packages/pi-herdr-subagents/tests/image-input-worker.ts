// I-SEAM only: preserve stock-hook negative evidence and exercise an owned SDK guard offline.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { join } from "node:path";
import tls from "node:tls";
import { pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";
import type { ImageContent } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionFactory, InputSource } from "@earendil-works/pi-coding-agent";

const [packageRoot, sandbox] = process.argv.slice(2);
assert(packageRoot && sandbox, "usage: bun image-input-worker.ts <Pi package root> <empty sandbox>");
let networkAttempts = 0;
let providerCalls = 0;
const denyNetwork = () => { networkAttempts++; throw new Error("I-SEAM forbids network access"); };
globalThis.fetch = Object.assign(denyNetwork, { preconnect: denyNetwork }) as typeof fetch;
http.request = denyNetwork;
https.request = denyNetwork;
net.Socket.prototype.connect = denyNetwork;
tls.connect = denyNetwork;

const pi = await import(pathToFileURL(join(packageRoot, "dist/index.js")).href) as typeof import("@earendil-works/pi-coding-agent");
const runtime = await pi.ModelRuntime.create({
  authPath: join(sandbox, "auth.json"), modelsPath: null,
  modelsStorePath: join(sandbox, "models-store.json"), allowModelNetwork: false, refreshOnCreate: false,
});
runtime.registerProvider("i-seam-fixture", {
  api: "openai-completions", apiKey: "fixture-only", baseUrl: "https://i-seam.invalid",
  streamSimple() { providerCalls++; throw new Error("Provider execution must remain unreachable in I-SEAM"); },
  models: [{
    id: "ordered-images", name: "I-SEAM offline image model", reasoning: false, input: ["text", "image"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 100_000, maxTokens: 100,
  }],
});
const catalogModel = runtime.getModel("i-seam-fixture", "ordered-images");
assert(catalogModel);

// Two distinguishable 1x1 RGBA PNGs, generated without a dependency or binary artifact.
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
const ordered = [png(255, 0), png(0, 255)];
const corrupt: ImageContent = { type: "image", mimeType: "image/png", data: Buffer.from("not a raster image").toString("base64") };
const predecoded = await Promise.all(ordered.map(image => pi.resizeImage(Buffer.from(image.data, "base64"), image.mimeType)));
assert(predecoded.every(image => image && image.width === 1 && image.height === 1), "both valid fixtures must decode in installed Pi");
assert.equal(await pi.resizeImage(Buffer.from(corrupt.data, "base64"), corrupt.mimeType), null);

if (process.argv[4] === "child") {
  await controlledChild(process.argv[5]!);
  process.exit(0);
}

const text = "I-SEAM initial task text";
type Mode = "normal" | "throw-input" | "handled" | "throw-before" | "abort-before" | "shutdown-before" | "late-transform" | "late-mutation" | "late-profile" | "tight" | "resize-off";
type Observation = { label: string; inputs: Array<{ keys: string[]; text: string; source: InputSource; images: number }>; before: Array<{ text: string; images: number }>; agentEntries: number; normalized: Array<{ text: string; images: number; order: number[]; corruptPresent: boolean }>; errors: string[]; commands: number; preflight: string[]; shutdowns: number; returned: boolean };
const observations: Observation[] = [];
async function fixture(label: string, mode: Mode, prompts: Array<{ label: string; text: string; source: InputSource; images?: ImageContent[] }>, generation = 1) {
  process.env.PI_HERDR_SUBAGENT_ID = "i-seam-task";
  process.env.PI_HERDR_SUBAGENT_GENERATION = String(generation);
  process.env.PI_HERDR_SUBAGENT_RESULT_PATH = join(sandbox, `result-${generation}.json`);
  const record: Observation = { label, inputs: [], before: [], agentEntries: 0, normalized: [], errors: [], commands: 0, preflight: [], shutdowns: 0, returned: false };
  const first: ExtensionFactory = api => {
    api.on("input", event => {
      record.inputs.push({ keys: Object.keys(event).sort(), text: event.text, source: event.source, images: event.images?.length ?? 0 });
      if (mode === "throw-input") throw new Error("fixture input rejection");
      if (mode === "handled") return { action: "handled" };
    });
    api.on("before_agent_start", (event, ctx) => {
      record.before.push({ text: event.prompt, images: event.images?.length ?? 0 });
      if (mode === "throw-before") throw new Error("fixture before_agent_start rejection");
      if (mode === "abort-before") ctx.abort();
      if (mode === "shutdown-before") ctx.shutdown();
      if (mode === "late-mutation") event.images![1] = { ...corrupt };
      if (mode === "late-profile") ctx.model!.inputLimits = { images: { resize: { maxBytes: 1 } } };
    });
    api.registerCommand("i-seam-command", { description: "fixture-owned command", handler: async () => { record.commands++; } });
  };
  const later: ExtensionFactory = api => {
    api.on("input", event => {
      if (mode === "late-transform") return { action: "transform", text: event.text, images: [{ ...ordered[0] }, { ...corrupt }] };
    });
  };
  const settingsManager = pi.SettingsManager.inMemory({
    compaction: { enabled: false }, retry: { enabled: false }, images: { autoResize: mode !== "resize-off" },
  });
  const loader = new pi.DefaultResourceLoader({
    cwd: sandbox, agentDir: sandbox, settingsManager, systemPrompt: "Offline I-SEAM fixture.",
    noExtensions: true, noSkills: true, noThemes: true, noPromptTemplates: true, noContextFiles: true,
    extensionFactories: [first, later],
    promptsOverride: () => ({ diagnostics: [], prompts: [{
      name: "i-seam-template", description: "fixture expansion", content: "expanded $@", filePath: "<inline:i-seam-template>",
      sourceInfo: pi.createSyntheticSourceInfo("<inline:i-seam-template>", { source: "inline" }),
    }] }),
  });
  await loader.reload();
  const { session, extensionsResult } = await pi.createAgentSession({
    cwd: sandbox, agentDir: sandbox, modelRuntime: runtime,
    model: { ...catalogModel!, inputLimits: mode === "tight" ? { images: { resize: { maxBytes: 1 } } } : undefined },
    thinkingLevel: "off", tools: [], resourceLoader: loader, settingsManager, sessionManager: pi.SessionManager.inMemory(sandbox),
  });
  assert.equal(extensionsResult.errors.length, 0);
  assert.equal(extensionsResult.extensions.length, 2);
  await session.bindExtensions({ shutdownHandler: () => { record.shutdowns++; }, onError: error => record.errors.push(error.event) });
  // Observation/stop only. This replacement is NOT a supported production rejection hook.
  // Pi's actual input handlers, preflight, processImage, and normalized message builder still execute.
  session.agent.prompt = async messages => {
    record.agentEntries++;
    assert(typeof messages !== "string");
    const user = (Array.isArray(messages) ? messages : [messages]).find(message => message.role === "user");
    assert(user?.role === "user" && Array.isArray(user.content));
    const images = user.content.filter(part => part.type === "image");
    record.normalized.push({
      text: user.content.filter(part => part.type === "text").map(part => part.text).join(""), images: images.length,
      order: images.map(image => ordered.findIndex(original => original.data === image.data && original.mimeType === image.mimeType)),
      corruptPresent: images.some(image => image.data === corrupt.data),
    });
  };
  try {
    for (const prompt of prompts) {
      const start = record.inputs.length;
      await session.prompt(prompt.text, {
        source: prompt.source, images: prompt.images?.map(image => ({ ...image })),
        preflightResult: result => record.preflight.push(`${prompt.label}:${result}`),
      });
      // Labels exist only at this fixture-owned call site, never in the extension event.
      if (label === "early-unrelated") assert.equal(record.inputs.length, start + 1);
    }
    record.returned = true;
    assert.equal(session.model!.id, catalogModel!.id);
    assert.equal(session.model!.provider, catalogModel!.provider);
  } finally { session.dispose(); }
  assert.equal(record.shutdowns, mode === "shutdown-before" ? 1 : 0);
  observations.push(record);
  return record;
}
const initial = (images: ImageContent[] = ordered) => [{ label: "designated", text, source: "interactive" as const, images }];
for (const generation of [1, 2]) {
  const valid = await fixture(`ordered-g${generation}`, "normal", initial(), generation);
  assert.equal(valid.agentEntries, 1);
  assert.deepEqual(valid.normalized, [{ text, images: 2, order: [0, 1], corruptPresent: false }]);
}
const unrelated = await fixture("early-unrelated", "normal", [
  { label: "early-extension", text, source: "extension" },
  { label: "early-rpc", text, source: "rpc" },
  { label: "early-interactive", text, source: "interactive" },
  { label: "designated", text, source: "interactive" },
  { label: "later-interactive", text, source: "interactive" },
  { label: "completion-nudge", text, source: "extension" },
]);
assert.equal(unrelated.agentEntries, 6);
assert.deepEqual(unrelated.inputs[2], unrelated.inputs[3]);
assert.deepEqual(unrelated.inputs[3], unrelated.inputs[4]);
assert(unrelated.normalized.every(message => message.images === 0 && message.text === text));
assert.deepEqual(unrelated.inputs[0].keys, ["images", "source", "streamingBehavior", "text", "type"]);
for (const [label, images, order] of [
  ["corrupt-mixed", [ordered[0], corrupt], [0]],
  ["corrupt-only", [corrupt], []],
] as const) {
  const result = await fixture(label, "normal", initial([...images]));
  assert.equal(result.agentEntries, 1);
  assert.deepEqual(result.normalized[0].order, order);
  assert.match(result.normalized[0].text, /\[Image omitted:/);
  assert.equal(result.returned, true);
}
const thrownInput = await fixture("throw-input", "throw-input", initial([corrupt]));
assert.deepEqual(thrownInput.errors, ["input"]);
assert.equal(thrownInput.agentEntries, 1);
const thrownBefore = await fixture("throw-before", "throw-before", initial([corrupt]));
assert.deepEqual(thrownBefore.errors, ["before_agent_start"]);
assert.equal(thrownBefore.agentEntries, 1);
for (const mode of ["abort-before", "shutdown-before"] as const) {
  const result = await fixture(mode, mode, initial([corrupt]));
  assert.equal(result.agentEntries, 1);
  assert.equal(result.normalized[0].images, 0);
}
const handled = await fixture("handled-early", "handled", initial([corrupt]));
assert.equal(handled.agentEntries, 0);
assert.equal(handled.before.length, 0);
assert.deepEqual(handled.preflight, ["designated:handled"]);
for (const mode of ["late-transform", "late-mutation"] as const) {
  const result = await fixture(mode, mode, initial());
  assert.equal(result.inputs[0].images, 2);
  assert.equal(result.agentEntries, 1);
  assert.deepEqual(result.normalized[0].order, [0]);
  assert.match(result.normalized[0].text, /\[Image omitted:/);
}
for (const mode of ["tight", "late-profile"] as const) {
  const result = await fixture(mode, mode, initial());
  assert.equal(result.agentEntries, 1);
  assert.equal(result.normalized[0].images, 0);
  assert.equal((result.normalized[0].text.match(/\[Image omitted:/g) ?? []).length, 2);
}
const resizeOff = await fixture("resize-off-corrupt", "resize-off", initial([corrupt]));
assert.equal(resizeOff.normalized[0].corruptPresent, true);
const command = await fixture("command-bypass", "normal", [{ label: "designated", text: "/i-seam-command", source: "interactive", images: ordered }]);
assert.equal(command.commands, 1);
assert.equal(command.inputs.length, 0);
assert.equal(command.agentEntries, 0);
const template = await fixture("template-expansion", "normal", [{ label: "designated", text: "/i-seam-template argument", source: "interactive", images: ordered }]);
assert.equal(template.inputs[0].text, "/i-seam-template argument");
assert.equal(template.before[0].text, "expanded argument");
assert.equal(template.normalized[0].text, "expanded argument");
assert.deepEqual(template.normalized[0].order, [0, 1]);
assert.equal(providerCalls, 0);
assert.equal(networkAttempts, 0);

const ai = await import(pathToFileURL(Bun.resolveSync("@earendil-works/pi-ai", join(packageRoot, "dist/index.js"))).href) as typeof import("@earendil-works/pi-ai");
type Session = import("@earendil-works/pi-coding-agent").AgentSession;
type AgentMessage = Session["messages"][number];
type UserMessage = Extract<AgentMessage, { role: "user" }>;
type SdkMode = "normal" | "corrupt" | "resize-off" | "tight" | "late-profile" | "late-transform" | "late-mutation" | "late-reorder" | "input-drop" | "context-drop" | "context-reorder" | "convert-drop" | "request-profile" | "request-text-only" | "handled";
type SdkRecord = {
  label: string; task: string; generation: number; rejectedEarly: number; fileReads: number;
  guardedEntries: number; realAgentEntries: number; streamEntries: number; offlineDelegations: number;
  normalizedOrder: number[]; finalOrder: number[]; error?: string; failureStage?: string;
  continuationImages?: number; compactionRestored: boolean;
};
const sdkObservations: SdkRecord[] = [];

// This is an executable candidate guard, not the observation-only stop used above.
// It forwards accepted calls to the original public Agent.prompt and checks the final
// public streamFunction input after Pi's transformContext/convertToLlm pipeline.
function ownInitial(session: Session, expected: { task: string; generation: number }, record: SdkRecord) {
  const ordinaryPrompt = session.prompt.bind(session);
  const originalAgentPrompt = session.agent.prompt.bind(session.agent);
  const delegateStream = session.agent.streamFunction;
  assert(delegateStream, "fixture must install its offline stream before the production-shaped guard");
  let phase: "reserved" | "running" | "complete" | "failed" = "reserved";
  let claimed = false;
  let images: ImageContent[] = [];
  let ownedUser: UserMessage | undefined;
  let normalizedImages: ImageContent[] = [];
  const reject = (stage: string): never => {
    record.failureStage = stage;
    record.error = `initial_images_rejected:${stage}`;
    throw new Error(record.error);
  };
  // Ordinary SDK/TUI input cannot acquire the reserved call, even with identical text.
  session.prompt = async (...args) => {
    if (phase !== "complete") throw new Error("initial_input_reserved");
    return ordinaryPrompt(...args);
  };
  session.agent.prompt = async (input: AgentMessage | AgentMessage[] | string, ...rest: unknown[]) => {
    if (phase !== "running" || typeof input === "string") return reject("unowned_agent_entry");
    record.guardedEntries++;
    const users = (Array.isArray(input) ? input : [input]).filter((message): message is UserMessage => message.role === "user");
    if (users.length !== 1 || !Array.isArray(users[0].content)) return reject("normalized_user_missing");
    ownedUser = users[0];
    // prepareRequest projects persisted messages into copies. Stamp the declared
    // timestamp field at this already-owned call boundary with a unique session
    // value, rather than matching input text or relying on object identity.
    ownedUser.timestamp = session.messages.reduce((latest, message) => Math.max(latest, message.timestamp), Date.now()) + 1;
    assert(Array.isArray(ownedUser.content));
    const actual = ownedUser.content.filter((part): part is ImageContent => part.type === "image");
    if (actual.length !== images.length) return reject("normalization_omitted_images");
    for (const [index, image] of actual.entries()) {
      if (!await pi.resizeImage(Buffer.from(image.data, "base64"), image.mimeType)) return reject("normalized_decode_failed");
      const original = images[index];
      const expectedImage = session.settingsManager.getImageAutoResize()
        ? await pi.resizeImage(Buffer.from(original.data, "base64"), original.mimeType, session.model?.inputLimits?.images?.resize)
        : original;
      if (!expectedImage || image.data !== expectedImage.data || image.mimeType !== expectedImage.mimeType) return reject("normalized_image_changed");
    }
    normalizedImages = actual.map(image => ({ ...image }));
    record.normalizedOrder = actual.map(image => ordered.findIndex(original => original.data === image.data));
    record.realAgentEntries++;
    // Preserve the original overload and options; do not patch normalization internals.
    return Reflect.apply(originalAgentPrompt, session.agent, [input, ...rest]);
  };
  session.agent.streamFunction = async (model, context, options) => {
    record.streamEntries++;
    const matches = context.messages.filter(message => message.role === "user" && message.timestamp === ownedUser?.timestamp);
    const user = matches.length === 1 ? matches[0] : undefined;
    const actual = user?.role === "user" && Array.isArray(user.content)
      ? user.content.filter((part): part is ImageContent => part.type === "image") : [];
    if (!user || actual.length !== normalizedImages.length || actual.some((image, index) =>
      image.data !== normalizedImages[index].data || image.mimeType !== normalizedImages[index].mimeType)
      || (images.length > 0 && !model.input.includes("image"))) {
      record.failureStage = "final_context_changed";
      record.error = `initial_images_rejected:${record.failureStage}`;
      // A streamFunction throw occurs outside stream consumption's try block.
      // Return the documented error-event stream so the real Agent finishes normally.
      return terminalStream(model, record.error);
    }
    for (const image of actual) {
      const accepted = await pi.resizeImage(Buffer.from(image.data, "base64"), image.mimeType, model.inputLimits?.images?.resize);
      if (!accepted || accepted.data !== image.data || accepted.mimeType !== image.mimeType) {
        record.failureStage = "final_model_image_limits_changed";
        record.error = `initial_images_rejected:${record.failureStage}`;
        return terminalStream(model, record.error);
      }
    }
    record.finalOrder = actual.map(image => ordered.findIndex(original => original.data === image.data));
    return delegateStream(model, context, options);
  };
  return async (path?: string) => {
    if (claimed) throw new Error("initial_input_already_claimed");
    claimed = true; // Before the first await: competing inputs cannot claim the file.
    const compaction = session.settingsManager.getCompactionEnabled();
    session.setAutoCompactionEnabled(false); // Resume preflight compaction otherwise precedes image normalization.
    try {
      if (path !== undefined) {
        record.fileReads++;
        const envelope = JSON.parse(await readFile(path, "utf8"));
        if (!envelope || envelope.version !== 1 || !Array.isArray(envelope.images) || envelope.images.length === 0
          || envelope.images.some((image: ImageContent) => !image || image.type !== "image"
            || typeof image.data !== "string" || typeof image.mimeType !== "string")) return reject("invalid_envelope");
        if (envelope.subagentId !== expected.task) return reject("task_mismatch");
        if (envelope.generation !== expected.generation) return reject("generation_mismatch");
        images = envelope.images.map((image: ImageContent) => ({ ...image }));
        unlinkSync(path);
      }
      phase = "running";
      await ordinaryPrompt(text, { images: images.length ? images.map(image => ({ ...image })) : undefined, source: "interactive" });
      if (!ownedUser) return reject("initial_call_not_started");
      if (record.error) throw new Error(record.error);
      phase = "complete";
      // Successful initial delivery is one-shot. Normal pane follow-ups regain the
      // original methods and do not attach the initial images again.
      session.agent.prompt = originalAgentPrompt;
      session.agent.streamFunction = delegateStream;
    } catch (error) {
      phase = "failed";
      throw error;
    } finally {
      session.setAutoCompactionEnabled(compaction);
      record.compactionRestored = session.settingsManager.getCompactionEnabled() === compaction;
    }
  };
}
function terminalStream(model: NonNullable<Session["model"]>, error?: string) {
  const stream = ai.createAssistantMessageEventStream();
  const message: import("@earendil-works/pi-ai").AssistantMessage = {
    role: "assistant", content: error ? [] : [{ type: "text", text: "offline fixture only" }],
    api: model.api, provider: model.provider, model: model.id, timestamp: Date.now(),
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: error ? "error" : "stop", ...(error ? { errorMessage: error } : {}),
  };
  if (error) stream.push({ type: "error", reason: "error", error: message });
  else stream.push({ type: "done", reason: "stop", message });
  return stream;
}
async function sdkFixture(label: string, mode: SdkMode, generation = 1, noImages = false, staleFile = false, wrongTask = false) {
  const record: SdkRecord = {
    label, task: "sdk-task", generation, rejectedEarly: 0, fileReads: 0, guardedEntries: 0,
    realAgentEntries: 0, streamEntries: 0, offlineDelegations: 0, normalizedOrder: [], finalOrder: [], compactionRestored: false,
  };
  const settingsManager = pi.SettingsManager.inMemory({
    compaction: { enabled: true }, retry: { enabled: false }, images: { autoResize: mode !== "resize-off" },
  });
  const factory: ExtensionFactory = api => {
    api.on("input", event => {
      if (mode === "handled") return { action: "handled" };
      if (mode === "late-transform") return { action: "transform", text: event.text, images: [ordered[0], corrupt] };
      if (mode === "late-reorder") return { action: "transform", text: event.text, images: [...ordered].reverse() };
      if (mode === "input-drop") return { action: "transform", text: event.text, images: [] };
    });
    api.on("before_agent_start", (event, ctx) => {
      if (mode === "late-mutation") event.images![1] = corrupt;
      if (mode === "late-profile") ctx.model!.inputLimits = { images: { resize: { maxBytes: 1 } } };
    });
    api.on("context", event => {
      if (mode === "context-drop" || mode === "context-reorder") return { messages: event.messages.map(message => message.role === "user" && Array.isArray(message.content)
        ? { ...message, content: mode === "context-drop" ? message.content.filter(part => part.type !== "image") : [...message.content].reverse() } : message) };
    });
    api.registerCommand("i-seam-command", { description: "owned fixture command", handler: async () => {} });
  };
  const loader = new pi.DefaultResourceLoader({
    cwd: sandbox, agentDir: sandbox, settingsManager, systemPrompt: "Owned SDK offline fixture.",
    noExtensions: true, noSkills: true, noThemes: true, noPromptTemplates: true, noContextFiles: true, extensionFactories: [factory],
  });
  await loader.reload();
  const { session } = await pi.createAgentSession({
    cwd: sandbox, agentDir: sandbox, modelRuntime: runtime, settingsManager, resourceLoader: loader,
    sessionManager: pi.SessionManager.inMemory(sandbox), tools: [], thinkingLevel: "off",
    model: { ...catalogModel!, inputLimits: mode === "tight" ? { images: { resize: { maxBytes: 1 } } } : undefined },
  });
  await session.bindExtensions({});
  // Test substrate only: an event stream replaces provider I/O, but the original
  // Agent.prompt and actual transformContext/convertToLlm pipeline still run.
  session.agent.streamFunction = (model, context) => {
    record.offlineDelegations++;
    const users = context.messages.filter(message => message.role === "user");
    const last = users.at(-1);
    record.continuationImages = last && Array.isArray(last.content) ? last.content.filter(part => part.type === "image").length : 0;
    return terminalStream(model);
  };
  if (mode === "convert-drop") {
    const convert = session.agent.convertToLlm;
    session.agent.convertToLlm = async messages => (await convert(messages)).map(message => message.role === "user" && Array.isArray(message.content)
      ? { ...message, content: message.content.filter(part => part.type !== "image") } : message);
  }
  if (mode === "request-profile" || mode === "request-text-only") {
    const prepare = session.agent.prepareRequest;
    session.agent.prepareRequest = async (request, signal) => ({
      ...await prepare?.(request, signal),
      model: { ...request.model, ...(mode === "request-profile"
        ? { inputLimits: { images: { resize: { maxBytes: 1 } } } } : { input: ["text"] }) },
    });
  }
  const invoke = ownInitial(session, { task: record.task, generation }, record);
  const directory = join(sandbox, "owned-sdk", record.task, String(generation), label);
  const path = noImages ? undefined : join(directory, "initial.json");
  if (path !== undefined) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    writeFileSync(path, JSON.stringify({
      version: 1, subagentId: wrongTask ? "another-sdk-task" : record.task,
      generation: staleFile ? generation - 1 : generation,
      images: mode === "corrupt" || mode === "resize-off" ? [ordered[0], corrupt] : ordered,
    }), { mode: 0o600, flag: "wx" });
  }
  try {
    for (const source of ["extension", "rpc", "interactive"] as const) {
      await assert.rejects(session.prompt(text, { source }), /initial_input_reserved/);
      record.rejectedEarly++;
    }
    const pending = invoke(path);
    await assert.rejects(session.prompt(text, { source: "interactive" }), /initial_input_reserved/);
    record.rejectedEarly++;
    if (mode === "normal" && !staleFile && !wrongTask) {
      await pending;
      assert.deepEqual(record.normalizedOrder, noImages ? [] : [0, 1]);
      assert.deepEqual(record.finalOrder, noImages ? [] : [0, 1]);
      assert.equal(record.realAgentEntries, 1);
      assert.equal(record.offlineDelegations, 1);
      assert.equal(record.continuationImages, noImages ? 0 : 2);
      await session.prompt(text, { source: "interactive" });
      assert.equal(record.continuationImages, 0, "same-text follow-up must not reattach initial images");
    } else {
      await assert.rejects(pending, /initial_images_rejected:/);
      assert.equal(record.offlineDelegations, 0);
      const lateFailure = ["context-drop", "context-reorder", "convert-drop", "request-profile", "request-text-only"].includes(mode);
      assert.equal(record.realAgentEntries, lateFailure ? 1 : 0);
      if (lateFailure) {
        assert.equal(session.isStreaming, false, "error stream must settle the original Agent");
        assert.equal(session.messages.at(-1)?.role, "assistant");
        assert.equal((session.messages.at(-1) as import("@earendil-works/pi-ai").AssistantMessage).stopReason, "error");
      }
      await assert.rejects(session.prompt(text), /initial_input_reserved/);
    }
    await assert.rejects(invoke(path), /initial_input_already_claimed/);
    assert.equal(record.fileReads, noImages ? 0 : 1);
    assert.equal(record.compactionRestored, true);
    sdkObservations.push(record);
  } finally { session.dispose(); }
}
for (const generation of [1, 2]) await sdkFixture(`sdk-ordered-g${generation}`, "normal", generation);
await sdkFixture("sdk-no-images", "normal", 1, true);
await sdkFixture("sdk-stale-generation", "normal", 2, false, true);
await sdkFixture("sdk-wrong-task", "normal", 1, false, false, true);
for (const mode of ["corrupt", "resize-off", "tight", "late-profile", "late-transform", "late-mutation", "late-reorder", "input-drop", "context-drop", "context-reorder", "convert-drop", "request-profile", "request-text-only", "handled"] as const) {
  await sdkFixture(`sdk-${mode}`, mode);
}

// Public runtime/InteractiveMode construction only. Full terminal I/O requires a
// pane/TTY, outside this offline fixture; no private UI fields are replaced.
const paneSettings = pi.SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false } });
const paneRuntime = await pi.createAgentSessionRuntime(async ({ cwd, sessionManager, sessionStartEvent }) => {
  const services = await pi.createAgentSessionServices({
    cwd, agentDir: sandbox, modelRuntime: runtime, settingsManager: paneSettings,
    resourceLoaderOptions: { noExtensions: true, noSkills: true, noThemes: true, noPromptTemplates: true, noContextFiles: true },
  });
  return { ...await pi.createAgentSessionFromServices({ services, sessionManager, sessionStartEvent, model: catalogModel, tools: [], thinkingLevel: "off" }), services, diagnostics: services.diagnostics };
}, { cwd: sandbox, agentDir: sandbox, sessionManager: pi.SessionManager.inMemory(sandbox) });
const interactive = new pi.InteractiveMode(paneRuntime);
assert.equal(typeof interactive.init, "function");
assert.equal(typeof interactive.run, "function");
const beforeReplacement = paneRuntime.session;
await paneRuntime.newSession();
assert.notEqual(paneRuntime.session, beforeReplacement);
await paneRuntime.dispose();
assert.equal(providerCalls, 0);
assert.equal(networkAttempts, 0);

const sourceAnchors: Record<string, string[]> = {
  "dist/core/agent-session.js": ["async _runInputHandlers(", "async _normalizePromptImages(", "async prompt(text, options)", "emitBeforeAgentStart(expandedText", "const normalized = await this._normalizePromptImages", "preflightResult?.(\"started\")", "await this.agent.prompt(messages)"],
  "dist/core/extensions/runner.js": ["async emitBeforeAgentStart(", "async emitInput("],
  "dist/core/extensions/types.d.ts": ["export interface BeforeAgentStartEvent", "export interface InputEvent", "export type InputEventResult"],
  "dist/core/agent-session.d.ts": ["export interface PromptOptions", "private _normalizePromptImages", "readonly agent: Agent;", "setAutoCompactionEnabled(enabled: boolean)"],
  "dist/utils/image-process.js": ["export async function processImage", "if (!resized)"],
  "dist/utils/image-resize-core.js": ["export async function resizeImageInProcess", "return null;"],
  "dist/core/sdk.d.ts": ["export interface CreateAgentSessionOptions"],
  "dist/index.d.ts": ["createAgentSession", "AgentSessionRuntime", "InteractiveMode"],
  "dist/core/agent-session-runtime.d.ts": ["setRebindSession(", "newSession(", "switchSession(", "dispose()"],
  "dist/modes/interactive/interactive-mode.d.ts": ["constructor(runtimeHost: AgentSessionRuntime", "init(): Promise<void>", "run(): Promise<void>"],
  "dist/modes/interactive/interactive-mode.js": ["this.runtimeHost.setRebindSession(", "images: initialImages", "await this.session.prompt(userInput)"],
  "dist/modes/rpc/rpc-types.d.ts": ["images?: ImageContent[]", "id?: string"],
  "dist/modes/rpc/rpc-mode.js": ["case \"prompt\"", "images: command.images", "if (!preflightSucceeded)"],
  "../pi-agent-core/dist/agent.d.ts": ["convertToLlm:", "transformContext?:", "streamFunction: StreamFn", "prompt(message: AgentMessage | AgentMessage[])", "prompt(input: string, images?: ImageContent[])"],
  "../pi-agent-core/dist/agent-loop.js": ["config.transformContext", "config.convertToLlm", "await streamFunction("],
  "../pi-ai/dist/types.d.ts": ["export interface UserMessage {\n    role: \"user\";\n    content: string | (TextContent | ImageContent)[];\n    timestamp: number;"],
};
const accessed = new Date().toISOString();
const sourceClaims: Record<string, string> = {
  "dist/core/agent-session.js": "Actual normalization omissions append hints and still enter agent.prompt; the start hook precedes normalization.",
  "dist/core/extensions/runner.js": "Input/start handler exceptions are caught and logged; input handled alone short-circuits before normalization.",
  "dist/core/extensions/types.d.ts": "InputEvent exposes text/images/source/streamingBehavior, with no designated task/generation identity or post-normalization rejection result.",
  "dist/core/agent-session.d.ts": "Public readonly session.agent exposes a mutable Agent; normalization remains private and preflightResult lacks normalized content/failure. Public auto-compaction control prevents resume compaction before validation.",
  "dist/utils/image-process.js": "Resize rejection returns ok:false; supported MIME bytes bypass decode when autoResize is disabled.",
  "dist/utils/image-resize-core.js": "Actual decode failure or impossible selected-model resize limit returns null.",
  "dist/core/sdk.d.ts": "SDK supports direct prompt ownership; CreateAgentSessionOptions has no prompt-normalization rejection callback.",
  "dist/index.d.ts": "Package root exports the SDK, AgentSessionRuntime and InteractiveMode used by this executable fixture.",
  "dist/core/agent-session-runtime.d.ts": "Public runtime owns replaceable sessions, rebind callbacks, new/switch session and disposal.",
  "dist/modes/interactive/interactive-mode.d.ts": "InteractiveMode accepts AgentSessionRuntime and exposes init/run; terminal integration was not executed.",
  "dist/modes/interactive/interactive-mode.js": "Interactive mode rebinds extensions on runtime replacement, sends initial images via session.prompt, and uses the same session.prompt for later input.",
  "dist/modes/rpc/rpc-types.d.ts": "Public RPC commands carry structured ImageContent[] and response correlation ids, not Herdr task/generation identity.",
  "dist/modes/rpc/rpc-mode.js": "RPC forwards images into the same session.prompt and acknowledges preflight before Agent entry; errors after that acknowledgement do not become prompt error responses.",
  "../pi-agent-core/dist/agent.d.ts": "Public mutable prompt, transformContext, convertToLlm and streamFunction allow a real delegating SDK guard; this is not a private normalization patch.",
  "../pi-agent-core/dist/agent-loop.js": "Context transformation/conversion and request preparation precede streamFunction; an error event stream safely terminates the real Agent without executing its delegate.",
  "../pi-ai/dist/types.d.ts": "The declared UserMessage timestamp carries the unique invocation marker through persisted projection copies; initial ownership is established before this marker is assigned.",
};
const sources = Object.entries(sourceAnchors).map(([path, anchors]) => {
  const source = readFileSync(join(packageRoot, path), "utf8");
  return {
    locator: join(packageRoot, path), title: path, claim: sourceClaims[path],
    accessed, scope: "Installed unbundled SDK declarations/source and fixture-observed AgentSession path; no provider execution.",
    sha256: createHash("sha256").update(source).digest("hex"),
    support: anchors.map(anchor => {
      const offset = source.indexOf(anchor);
      assert(offset >= 0, `source anchor missing: ${path}: ${anchor}`);
      return { anchor, line: source.slice(0, offset).split("\n").length };
    }),
  };
});
console.log("I_SEAM_EVIDENCE\n" + JSON.stringify({
  status: "completed", stockCliStatus: "blocked", packageRoot, version: JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")).version,
  checkedAt: accessed, validPredecode: [1, 1], corruptPredecode: null,
  instrumentation: "stock CLI observations only: native AgentSession.prompt stops at an observation-only agent.prompt replacement. Separate sdkObservations execute original Agent.prompt with a real delegating guard and a test-only offline provider stream.",
  association: "InputEvent has no task/generation/designated-input identity; identical early, designated, and later interactive calls yield identical events.",
  blocker: "Normalization omits rejected images and still enters agent.prompt; before_agent_start is earlier, its throws are swallowed, and public preflightResult exposes only started/handled/queued, not normalization success or content. No supported fail-closed post-normalization package hook is exposed on this path.",
  providerCalls, networkAttempts, observations, sdkObservations,
  sdkBoundary: "An exclusive, generation-checked SDK call decorates public Agent.prompt with a real guard that delegates accepted calls. Actual Pi normalization omissions, corrupt decode with resizing disabled, and input reordering fail before original Agent.prompt. A public streamFunction guard rejects late context/conversion changes and effective model image limits with an explicit error stream before any delegate, preserving Agent settlement.",
  interactiveBoundary: "Exported AgentSessionRuntime and InteractiveMode constructed offline; public runtime.newSession replacement and disposal executed. init/run and retained pane CLI lifecycle traced in source only; no terminal/herdr integration claimed.",
  rpcBoundary: "RPC prompt has structured images and response id; command handling forwards to the same AgentSession.prompt normalization. Source-only: raw RPC retains omission-and-continue behavior; it is not the SDK guard or a pane replacement.",
  limitations: "Initial preflight auto-compaction is temporarily suspended and restored. Fixtures prove ordered PNG inputs; the guard uses public resizeImage and conservatively rejects other normalization output not reproduced by it, so all MIME conversion variants are not established. Provider-specific payload conversion and real TTY/pane integration were not executed. File modes are requested in an isolated sandbox; Windows ACL/privacy guarantees and complete downstream transport are not established. Failed calls keep ordinary prompt entry closed; production lifecycle wiring must publish generation-scoped failure. Runtime session replacement must reinstall session-local guards.",
  sources,
}, null, 2));
process.exit(0);


// I-CHILD: all image storage, reservation, Agent guards and SDK startup below are
// production code. Only the terminal, catalog auth and final stream are controlled.
async function controlledChild(scenario: string) {
  const { runPaneImageChild } = await import("../src/pane-image-entry.js");
  const { paneChildControlChannel } = await import("../extensions/pane-child.js");
  const args = JSON.parse(await Bun.stdin.text()) as string[];
  const receipts: Array<{ mimeType: string; sha256: string }> = [];
  const normalized: Array<Array<{ mimeType: string; sha256: string }>> = [];
  const contexts: number[][] = [];
  let rawCalls = 0;
  let entries = 0;
  let attempts = 0;
  let rejectedEarly = 0;
  let duplicateRejected = false;
  let deleted = false;
  let stage: string | undefined;
  let tuiStarted = false;
  let currentSession: import("@earendil-works/pi-coding-agent").AgentSession | undefined;
  const resultPath = process.env.PI_HERDR_SUBAGENT_RESULT_PATH!;
  const generation = Number(process.env.PI_HERDR_SUBAGENT_GENERATION);
  const envelope = join(resultPath, "..", "image-input-" + generation, "envelope.json");
  const digest = (image: ImageContent) => ({ mimeType: image.mimeType, sha256: createHash("sha256").update(image.data).digest("hex") });
  let events: ExtensionAPI["events"] | undefined;
  const observer: ExtensionFactory = api => {
    events = api.events;
    api.on("before_agent_start", event => {
      if (event.images?.length) { rawCalls++; receipts.push(...event.images.map(digest)); }
    });
    api.on("input", event => {
      if (scenario === "drop-input" && event.images?.length) return { action: "transform", text: event.text, images: [] };
    });
    api.on("context", event => {
      if (scenario === "drop-context") return { messages: event.messages.map(message => message.role === "user"
        && Array.isArray(message.content) ? { ...message, content: message.content.filter(part => part.type !== "image") } : message) };
    });
  };
  if (scenario === "nonvisual") {
    runtime.registerProvider("i-child-text", {
      api: "openai-completions", apiKey: "fixture-only", baseUrl: "https://i-seam.invalid",
      streamSimple() { providerCalls++; throw new Error("Provider execution forbidden"); },
      models: [{ id: "text", name: "text", reasoning: false, input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 100_000, maxTokens: 100 }],
    });
  }
  const noop = () => {};
  try {
    await runPaneImageChild(args, {
      modelRuntime: runtime,
      settingsManager: pi.SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false }, defaultProjectTrust: "never" }),
      extensionFactories: [observer],
      terminal: { start() { tuiStarted = true; }, stop: noop, drainInput: async () => {}, write: noop,
        columns: 80, rows: 24, kittyProtocolActive: false, moveBy: noop, hideCursor: noop,
        showCursor: noop, clearLine: noop, clearFromCursor: noop, clearScreen: noop, setTitle: noop, setProgress: noop },
      prepareSession(session) {
        currentSession = session;
        const prompt = session.agent.prompt.bind(session.agent);
        session.agent.prompt = async value => {
          entries++;
          assert(typeof value !== "string");
          const user = (Array.isArray(value) ? value : [value]).find(message => message.role === "user");
          assert(user?.role === "user" && Array.isArray(user.content));
          normalized.push(user.content.filter((part): part is ImageContent => part.type === "image").map(digest));
          return prompt(value);
        };
        session.agent.streamFunction = async (model, context) => {
          attempts++;
          deleted = !readable(envelope);
          assert(deleted, "successful storage consumption must precede delegate execution");
          assert.equal(model.provider, session.model!.provider);
          assert.equal(model.id, session.model!.id);
          contexts.push(context.messages.filter(message => message.role === "user").map(message =>
            Array.isArray(message.content) ? message.content.filter(part => part.type === "image").length : 0));
          const { createAssistantMessageEventStream } = await import("@earendil-works/pi-ai");
          const stream = createAssistantMessageEventStream();
          stream.push({ type: "done", reason: "stop", message: {
            role: "assistant", content: [{ type: "text", text: "offline fixture" }], api: model.api, provider: model.provider,
            model: model.id, stopReason: "stop", timestamp: Date.now(),
            usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
          } });
          return stream;
        };
      },
      async runInteractive(mode, invoke, binding) {
        await mode.init();
        try {
          const session = binding.session;
          for (const source of ["interactive", "extension", "rpc"] as const) {
            try { await session.prompt("same designated task text", { source }); } catch { rejectedEarly++; }
          }
          for (const call of [() => session.steer("unrelated"), () => session.followUp("unrelated"),
            () => session.agent.prompt("unrelated", ordered), () => session.agent.continue()]) {
            try { await call(); } catch { rejectedEarly++; }
          }
          assert.equal(rejectedEarly, 7);
          assert.equal(rawCalls, 0);
          if (scenario === "terminal") {
            let control: import("../extensions/pane-child.js").PaneChildControl | undefined;
            events!.emit(paneChildControlChannel, (value: typeof control) => { control = value; });
            assert(control);
            await control.fail("fixture_terminal");
            await invoke();
            assert(readable(envelope), "terminal barrier precedes image I/O");
            return;
          }
          const initial = invoke();
          try { await invoke(); } catch { duplicateRejected = true; }
          assert(duplicateRejected, "reservation happens before await");
          await initial;
          for (let index = 0; index < 2; index++) await session.prompt("image-free continuation", { source: "extension" });
          assert.equal(attempts, 3);
          assert.equal(rawCalls, 1);
          assert.equal(normalized[1]!.length, 0);
          assert.equal(normalized[2]!.length, 0);
        } finally { mode.stop(); }
      },
    });
  } catch (error) {
    assert(error instanceof Error);
    const match = error.message.match(/^Image input failed at ([a-z_]+)\./);
    assert(match, "only fixed safe stages escape production startup/consumption");
    stage = match[1];
    assert(!error.message.includes(resultPath));
    assert(!error.message.includes(corrupt.data));
  }
  assert.equal(providerCalls, 0);
  assert.equal(networkAttempts, 0);
  process.stdout.write(JSON.stringify({ scenario, generation, receipts, normalized, contexts, rawCalls, entries, attempts,
    rejectedEarly, duplicateRejected, deleted: !readable(envelope), stage, tuiStarted,
    model: currentSession ? { provider: currentSession.model?.provider, id: currentSession.model?.id } : undefined,
    providerCalls, networkAttempts, piVersion: pi.VERSION }));
  function readable(path: string) { try { readFileSync(path); return true; } catch { return false; } }
}

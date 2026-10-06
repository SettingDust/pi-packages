import { AsyncLocalStorage } from "node:async_hooks";
import { createAssistantMessageEventStream, type ImageContent } from "@earendil-works/pi-ai";
import { convertToPng, resizeImage, type AgentSession } from "@earendil-works/pi-coding-agent";
import type { PaneChildControl } from "../extensions/pane-child.js";
import { consumeImages, ImageInputError, type ImageLaunch } from "./image-input.js";

type AgentMessage = AgentSession["messages"][number];
type UserMessage = Extract<AgentMessage, { role: "user" }>;

function errorStream(model: NonNullable<AgentSession["model"]>, stage: string) {
  const stream = createAssistantMessageEventStream();
  stream.push({ type: "error", reason: "error", error: {
    role: "assistant", content: [], api: model.api, provider: model.provider, model: model.id,
    timestamp: Date.now(), stopReason: "error", errorMessage: `image_input_failed:${stage}`,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
  } });
  return stream;
}

// Match Pi 0.99.2's public conversion/resize operations, then compare to the actual
// AgentSession-normalized message. Predecoding alone never opens the Agent boundary.
async function expectedImage(session: AgentSession, image: ImageContent): Promise<{ data: string; mimeType: string } | null> {
  const mime = image.mimeType.toLowerCase();
  const supported = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"].includes(mime);
  const normalized = supported ? { data: image.data, mimeType: mime === "image/jpg" ? "image/jpeg" : mime }
    : await convertToPng(image.data, mime);
  if (!normalized) return null;
  // Decode even when the user's native autoResize setting is off.
  const decoded = await resizeImage(Buffer.from(normalized.data, "base64"), normalized.mimeType);
  if (!decoded) return null;
  return session.settingsManager.getImageAutoResize()
    ? await resizeImage(Buffer.from(normalized.data, "base64"), normalized.mimeType, session.model?.inputLimits?.images?.resize)
    : normalized;
}

export function ownImageInitial(session: AgentSession, launch: ImageLaunch, control: PaneChildControl) {
  const ordinary = session.prompt;
  const steer = session.steer;
  const followUp = session.followUp;
  const agentPrompt = session.agent.prompt.bind(session.agent);
  const agentContinue = session.agent.continue;
  const delegateStream = session.agent.streamFunction;
  const owner = new AsyncLocalStorage<boolean>();
  let phase: "reserved" | "running" | "delivered" | "failed" = "reserved";
  let claimed = false;
  let entered = false;
  let images: ImageContent[] = [];
  let normalized: ImageContent[] = [];
  let timestamp: number | undefined;
  let failure: string | undefined;
  let selected: { provider: string; id: string } | undefined;
  const active = () => control.isActive() && phase !== "failed";
  const delivered = () => phase === "delivered";
  const reject = (stage: string): never => { failure = stage; throw new ImageInputError(stage); };
  const reserved = () => { throw new ImageInputError("reserved"); };
  // Calls made by interactive/extension/RPC routes have no access to the captured
  // SDK method. Source/text/first-event matching never authorizes consumption.
  session.prompt = async (...args) => phase === "delivered" ? ordinary.call(session, ...args) : reserved();
  session.steer = async (...args) => phase === "delivered" ? steer.call(session, ...args) : reserved();
  session.followUp = async (...args) => phase === "delivered" ? followUp.call(session, ...args) : reserved();
  session.agent.continue = async () => phase === "delivered" ? agentContinue.call(session.agent) : reserved();
  const restore = () => {
    session.prompt = ordinary;
    session.steer = steer;
    session.followUp = followUp;
    session.agent.prompt = agentPrompt;
    session.agent.continue = agentContinue;
    session.agent.streamFunction = delegateStream;
  };
  session.agent.prompt = async input => {
    if (!owner.getStore()) return reserved();
    if (phase !== "running" || entered || !active() || typeof input === "string") return reject("association");
    entered = true; // Reserve the actual Agent entry before asynchronous decode checks.
    const users = (Array.isArray(input) ? input : [input]).filter((message): message is UserMessage => message.role === "user");
    if (users.length !== 1 || !Array.isArray(users[0].content)) return reject("normalization");
    if (!session.model || session.model.provider !== selected?.provider || session.model.id !== selected.id) return reject("model_identity");
    const actual = users[0].content.filter((part): part is ImageContent => part.type === "image");
    if (actual.length !== images.length) return reject("normalization");
    for (const [index, image] of actual.entries()) {
      const expected = await expectedImage(session, images[index]!);
      if (!active()) return reject("terminal");
      if (!expected || image.data !== expected.data || image.mimeType !== expected.mimeType) return reject("normalization");
    }
    normalized = actual.map(image => ({ ...image }));
    // Public timestamp survives Pi's history projections; it identifies this already
    // owned call in the final context, even when resumed history contains other images.
    timestamp = session.messages.reduce((latest, message) => Math.max(latest, message.timestamp), Date.now()) + 1;
    users[0].timestamp = timestamp;
    if (!session.model.input.includes("image")) return reject("model_images");
    return agentPrompt(input);
  };
  session.agent.streamFunction = async (model, context, options) => {
    // Agent's running loop retains this function even after property restoration.
    // Subsequent tool/settlement turns use the ordinary stream and existing history.
    if (delivered()) return delegateStream!(model, context, options);
    try {
      if (!active() || phase !== "running" || !entered || !delegateStream) return reject("association");
      if (model.provider !== selected?.provider || model.id !== selected.id) return reject("model_identity");
      if (!model.input.includes("image")) return reject("model_images");
      const users = context.messages.filter(message => message.role === "user" && message.timestamp === timestamp);
      const user = users.length === 1 ? users[0] : undefined;
      const actual = user?.role === "user" && Array.isArray(user.content)
        ? user.content.filter((part): part is ImageContent => part.type === "image") : [];
      if (!user || actual.length !== normalized.length || actual.some((image, index) =>
        image.data !== normalized[index]!.data || image.mimeType !== normalized[index]!.mimeType)) return reject("context");
      for (const image of actual) {
        const accepted = await resizeImage(Buffer.from(image.data, "base64"), image.mimeType, model.inputLimits?.images?.resize);
        if (!active()) return reject("terminal");
        if (!accepted || accepted.data !== image.data || accepted.mimeType !== image.mimeType) return reject("model_limits");
      }
      phase = "delivered";
      restore(); // Only the designated first request is guarded; normal history/follow-ups resume.
      return delegateStream(model, context, options);
    } catch {
      phase = "failed";
      await control.fail(failure ?? "delivery");
      // Throwing streamFunction can strand Agent state. Its public error stream settles it.
      return errorStream(model, failure ?? "delivery");
    }
  };
  return async (text: string): Promise<void> => {
    if (!control.isActive()) return; // Terminal barrier before reservation or file I/O.
    if (claimed) throw new ImageInputError("duplicate");
    claimed = true; // Before the first await; the generation has one consumption attempt.
    const compaction = session.settingsManager.getCompactionEnabled();
    session.setAutoCompactionEnabled(false); // Resume preflight must not execute before validation.
    try {
      images = await consumeImages(launch, active);
      if (!active()) return reject("terminal");
      if (!session.model) return reject("model");
      if (!session.model.input.includes("image")) return reject("model_images");
      selected = { provider: session.model.provider, id: session.model.id };
      phase = "running";
      await owner.run(true, () => ordinary.call(session, text, { images: images.map(image => ({ ...image })), source: "interactive" }));
      if (failure || !delivered()) return reject(failure ?? "association");
    } catch (error) {
      phase = "failed";
      const stage = error instanceof ImageInputError ? error.stage : "delivery";
      await control.fail(stage);
      throw new ImageInputError(stage, error instanceof ImageInputError && error.cleanupFailed);
    } finally { session.setAutoCompactionEnabled(compaction); }
  };
}

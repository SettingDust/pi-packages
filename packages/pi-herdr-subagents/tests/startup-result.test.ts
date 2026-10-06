import { expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runInNewContext } from "node:vm";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { AgentRegistry, SubagentRuntime } from "../src/index.js";
import { runPaneImageChild } from "../src/pane-image-entry.js";
import { checkImageAccess } from "../src/image-input.js";
import { resultPublisher } from "../src/result-publication.js";

const require = createRequire(import.meta.url);
const bootstrapModules = new Map<string, unknown>([
  ["node:child_process", { spawnSync: () => ({ status: 1 }) }],
  ["node:fs", fs], ["node:path", require("node:path")],
  [require.resolve("jiti"), require("jiti")],
]);
for (const writer of ["sdk", "bootstrap-images", "bootstrap-text"] as const) {
  for (const generation of [1, 2]) {
    for (const operation of ["join", "recover"] as const) {
      test(`startup Result ${writer} ${operation} recovers first publication in generation ${generation}`, async () => {
        const root = fs.mkdtempSync(join(tmpdir(), "herdr-startup-result-"));
        const registry = new AgentRegistry();
        registry.setFiles([{ path: "/handler.md", content: "---\nname: handler\n---\nOffline" }]);
        const effects: string[] = [];
        let env: Record<string, string> = {};
        const transport = {
          async createTab(input: any) { env = input.env; return { tabId: "offline", paneId: "offline" }; },
          async run() {}, async sendText() {}, async closePane() {},
          async closeTab() { effects.push("close"); return "closed" as const; }, async paneExists() { effects.push("exists"); return true; },
        };
        let runtime = new SubagentRuntime(transport, registry, root, () => { effects.push("notify"); });
        const originalEnv = { ...process.env };
        let deletion: ReturnType<typeof spyOn> | undefined;
        let startup: ReturnType<typeof spyOn> | undefined;
        const warnings = spyOn(console, "warn").mockImplementation(() => {});
        try {
          const images = writer === "bootstrap-text" ? undefined : [{ type: "image" as const, data: "AQ==", mimeType: "image/png" }];
          let task = await runtime.spawn({ agent: "handler", cwd: root, prompt: "offline", label: "offline", taskSlug: "task", images });
          let previous: string | undefined;
          if (generation === 2) {
            await runtime.cancel("task"); previous = fs.readFileSync(task.resultPath, "utf8");
            task = await runtime.resume("task", "offline resumed", images);
          }
          runtime.stop(); effects.length = 0;
          Object.assign(process.env, env);
          if (!images) delete process.env.PI_HERDR_SUBAGENT_IMAGE_INPUT;
          const generated = fs.readFileSync(join(dirname(task.resultPath), `launch-${generation}.cjs`), "utf8");
          const encoded = generated.match(/Buffer\.from\("([^"]+)"/)![1]!;
          const args = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")).args.slice(3);
          let temporary = "";
          let cleanupFailures = 0;
          const unlink = fs.unlinkSync;
          deletion = spyOn(fs, "unlinkSync").mockImplementation(path => {
            if (String(path).startsWith(task.resultPath + ".") && String(path).endsWith(".tmp")) {
              temporary = String(path); cleanupFailures++; throw new Error("PRIVATE injected unlink failure");
            }
            unlink(path);
          });
          const bootstrap = () => runInNewContext(generated, {
            require: (id: string) => { if (!bootstrapModules.has(id)) throw new Error("Unexpected bootstrap module"); return bootstrapModules.get(id); },
            Buffer, console, process: { env: process.env, pid: process.pid, exit() {} },
          });
          if (writer === "sdk") {
            // This SDK boundary precedes resource loading, UI and provider initialization.
            startup = spyOn(SessionManager, "open").mockImplementation(() => { throw new Error("PRIVATE SDK startup failure"); });
            await expect(runPaneImageChild(args)).rejects.toThrow("Image input failed at startup.");
            expect(startup).toHaveBeenCalledTimes(1);
            startup.mockRestore(); startup = undefined;
          } else {
            await bootstrap();
          }
          expect(cleanupFailures).toBeGreaterThan(0);
          const bytes = fs.readFileSync(task.resultPath, "utf8");
          expect(JSON.parse(bytes)).toEqual({ subagentId: "task", generation, status: "failed",
            error: writer === "sdk" ? "image_input_failed:startup" : "child_exit_1" });
          expect(fs.lstatSync(task.resultPath).nlink).toBe(2);
          expect(temporary.slice(task.resultPath.length)).toMatch(/^\.[1-9]\d*-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.tmp$/);
          expect(fs.lstatSync(temporary).ino).toBe(fs.lstatSync(task.resultPath).ino);
          checkImageAccess(dirname(task.resultPath), true);
          checkImageAccess(task.resultPath, false, 2);
          checkImageAccess(temporary, false, 2);
          // A second real bootstrap invocation cannot replace the published failure.
          await bootstrap();
          expect(fs.readFileSync(task.resultPath, "utf8")).toBe(bytes);
          if (operation === "recover") runtime = new SubagentRuntime(transport, registry, root, () => { effects.push("notify"); });
          const act = () => operation === "join" ? runtime.join("task") : runtime.recover(root);
          await expect(act()).rejects.toThrow("Image input failed at storage.");
          expect(effects).toEqual([]);
          deletion.mockRestore(); deletion = undefined;
          await act();
          expect(await runtime.join("task")).toMatchObject({ status: "failed", generation, error: JSON.parse(bytes).error });
          expect(fs.readFileSync(task.resultPath, "utf8")).toBe(bytes);
          expect(fs.lstatSync(task.resultPath).nlink).toBe(1);
          expect(fs.existsSync(temporary)).toBeFalse();
          expect(effects).toEqual(["close", "notify"]);
          if (previous) expect(fs.readFileSync(join(dirname(task.resultPath), "result-1.json"), "utf8")).toBe(previous);
          await runtime.join("task");
          expect(effects).toEqual(["close", "notify"]);
          await runtime.recover(root);
          // Recovery replays the durable outbox; parent branch acknowledgement owns delivery dedupe.
          expect(effects.filter(effect => effect === "close")).toHaveLength(1);
          expect(JSON.stringify(warnings.mock.calls)).not.toContain("PRIVATE");
        } finally {
          startup?.mockRestore(); deletion?.mockRestore(); warnings.mockRestore(); runtime.stop();
          for (const key of new Set([...Object.keys(env), "PI_HERDR_SUBAGENT_IMAGE_INPUT"])) {
            if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key];
          }
          fs.rmSync(root, { recursive: true, force: true });
        }
      }, 60_000);
    }
  }
}

for (const attack of ["foreign-handle", "leaf-replacement", "directory-replacement"] as const) {
  test(`shared Result publisher refuses ${attack} before publication`, async () => {
    const root = fs.mkdtempSync(join(tmpdir(), "herdr-result-publisher-"));
    const directory = join(root, "artifacts"); fs.mkdirSync(directory, { mode: 0o700 });
    const path = join(directory, "result-1.json");
    const foreign = join(root, "foreign"); fs.writeFileSync(foreign, "FOREIGN");
    const open = fsPromises.open;
    let injected = false;
    const opening = spyOn(fsPromises, "open").mockImplementation(async (temporary, flags, mode) => {
      const file = await open(temporary, flags, mode);
      if (attack === "foreign-handle") { await file.close(); return open(foreign, "r+"); }
      const write = file.writeFile.bind(file);
      file.writeFile = async (...args: Parameters<typeof file.writeFile>) => {
        await write(...args);
        injected = true;
        if (attack === "leaf-replacement") {
          fs.renameSync(temporary, String(temporary) + "-held"); fs.writeFileSync(temporary, "FOREIGN");
        } else {
          await file.close(); // Windows cannot rename this directory while its file handle is open.
          fs.renameSync(directory, directory + "-held"); fs.mkdirSync(directory); fs.writeFileSync(temporary, "FOREIGN");
        }
      };
      return file;
    });
    const warnings = spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(resultPublisher(path).publish("OWNED")).rejects.toThrow();
      expect(fs.existsSync(path)).toBeFalse();
      expect(fs.readFileSync(foreign, "utf8")).toBe("FOREIGN");
      if (attack !== "foreign-handle") expect(injected).toBeTrue();
      const leaves = fs.readdirSync(directory).filter(name => name.endsWith(".tmp"));
      expect(leaves).toHaveLength(1);
      if (attack !== "foreign-handle") expect(fs.readFileSync(join(directory, leaves[0]!), "utf8")).toBe("FOREIGN");
    } finally { opening.mockRestore(); warnings.mockRestore(); fs.rmSync(root, { recursive: true, force: true }); }
  });
}

test("shared Result publisher preserves a Result appearing during exclusive creation", async () => {
  const root = fs.mkdtempSync(join(tmpdir(), "herdr-result-race-"));
  const path = join(root, "result-1.json");
  const open = fsPromises.open;
  const opening = spyOn(fsPromises, "open").mockImplementation(async (temporary, flags, mode) => {
    const file = await open(temporary, flags, mode);
    fs.writeFileSync(path, "FIRST", { flag: "wx", mode: 0o600 });
    return file;
  });
  try {
    await resultPublisher(path).publish("CANCELLED_OR_FAILED");
    expect(fs.readFileSync(path, "utf8")).toBe("FIRST");
    expect(fs.readdirSync(root)).toEqual(["result-1.json"]);
  } finally { opening.mockRestore(); fs.rmSync(root, { recursive: true, force: true }); }
});

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import { candidateEntries, configuredCandidates, FileHarnessSettingsRepository, loadHarnessCandidates, resolveDelegation } from "../src/index.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const candidates = {
  "test/model": { medium: { reasoning: 2, impact: 1 } },
};

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "pi-harness-settings-"));
  roots.push(root);
  const cwd = join(root, "project");
  const agentDir = join(root, "agent");
  mkdirSync(cwd, { recursive: true });
  return { cwd, agentDir, repository: new FileHarnessSettingsRepository(cwd, agentDir) };
}

describe("Harness candidate settings storage", () => {
  test("updates Global candidates while preserving unrelated Pi settings", () => {
    const { agentDir, repository } = fixture();
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ theme: "dark", harness: { candidates: {} } }));

    repository.writeCandidates("global", candidates);

    expect(JSON.parse(readFileSync(join(agentDir, "settings.json"), "utf8"))).toEqual({
      theme: "dark",
      harness: { candidates },
    });
  });

  test("writes and removes the Project override", () => {
    const { cwd, repository } = fixture();
    repository.writeCandidates("project", candidates);
    expect(configuredCandidates(repository.read("project"))).toEqual(candidates);

    repository.writeCandidates("project", undefined);
    expect(JSON.parse(readFileSync(join(cwd, CONFIG_DIR_NAME, "settings.json"), "utf8"))).toEqual({});
  });

  test("does not overwrite malformed Pi settings", () => {
    const { agentDir, repository } = fixture();
    mkdirSync(agentDir, { recursive: true });
    const path = join(agentDir, "settings.json");
    writeFileSync(path, "not json");

    expect(() => repository.writeCandidates("global", candidates)).toThrow();
    expect(readFileSync(path, "utf8")).toBe("not json");
  });

  test.each([
    ["candidate", '{"harness":{"candidates":{"test/model":{"medium":{"reasoning":1,"impact":1}},"test/model":{"high":{"reasoning":2,"impact":2}}}}}'],
    ["thinking", '{"harness":{"candidates":{"test/model":{"medium":{"reasoning":1,"impact":1},"medium":{"reasoning":2,"impact":2}}}}}'],
    ["capability", '{"harness":{"candidates":{"test/model":{"medium":{"reasoning":1,"impact":1,"impact":2}}}}}'],
  ])("rejects raw duplicate %s keys before normalization", (_name, content) => {
    const { agentDir, repository } = fixture();
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "settings.json"), content);
    expect(() => repository.read("global")).toThrow(/Duplicate JSON key/);
  });

  test("replaces confirmed duplicate-key settings while preserving unrelated Pi settings", () => {
    const { agentDir, repository } = fixture();
    mkdirSync(agentDir, { recursive: true });
    const path = join(agentDir, "settings.json");
    writeFileSync(path, '{"theme":"dark","harness":{"candidates":{},"candidates":{"old/model":{}}}}');

    repository.replaceCandidatesAfterDuplicateKeyConfirmation("global", candidates);

    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ theme: "dark", harness: { candidates } });
  });

  test.each([
    ["malformed JSON", '{"theme":"dark","harness":{"candidates":{},"candidates":'],
    ["valid JSON without duplicate keys", '{"theme":"dark","harness":{"candidates":{}}}'],
  ])("does not use duplicate-key recovery for %s", (_name, content) => {
    const { agentDir, repository } = fixture();
    mkdirSync(agentDir, { recursive: true });
    const path = join(agentDir, "settings.json");
    writeFileSync(path, content);

    expect(() => repository.replaceCandidatesAfterDuplicateKeyConfirmation("global", candidates)).toThrow();
    expect(readFileSync(path, "utf8")).toBe(content);
  });

  test("rejects legacy raw settings", () => {
    const { agentDir, repository } = fixture();
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "settings.json"), '{"harness":{"roles":{}}}');
    expect(() => configuredCandidates(repository.read("global"))).toThrow(/Legacy harness roles/);
  });

  test.each(["roles", "modelRole"])("prioritizes unknown keys over legacy %s", (field) => {
    expect(() => configuredCandidates({ harness: { [field]: {}, unknown: true } })).toThrow(/only a candidates object/);
  });

  test.each([
    ["trim", " provider/model ", " provider", "model ", "medium"],
    ["case", "Provider/Model", "Provider", "Model", "Medium"],
    ["alias", "vendor/model-latest", "vendor", "model-latest", "max"],
    ["first slash, not last slash", "provider/family/model", "provider", "family/model", "medium"],
    ["dot", "provider/model.v1", "provider", "model.v1", "medium"],
    ["display syntax", "provider/model.medium", "provider", "model.medium", "high"],
  ])("preserves exact identity without %s normalization", (_name, providerModelKey, provider, modelId, thinking) => {
    const parsed = configuredCandidates({
      harness: { candidates: { [providerModelKey]: { [thinking]: { reasoning: 1, impact: 1 } } } },
    });
    expect(parsed).toEqual({ [providerModelKey]: { [thinking]: { reasoning: 1, impact: 1 } } });
    expect(candidateEntries(parsed!)).toEqual([{ provider, modelId, thinking, reasoning: 1, impact: 1 }]);
  });

  test("preserves raw __proto__ thinking beside another candidate without prototype pollution", async () => {
    const { agentDir, repository } = fixture();
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "settings.json"), '{"harness":{"candidates":{"available/model":{"medium":{"reasoning":1,"impact":1}},"missing/model":{"__proto__":{"reasoning":1,"impact":1}}}}}');

    const parsed = configuredCandidates(repository.read("global"));
    const thinkingValues = parsed?.["missing/model"];
    expect(thinkingValues).toBeDefined();
    expect(Object.getPrototypeOf(thinkingValues)).toBe(Object.prototype);
    expect(Object.hasOwn(thinkingValues!, "__proto__")).toBe(true);
    expect(Object.keys(thinkingValues!)).toContain("__proto__");
    expect(thinkingValues?.["__proto__"]).toEqual({ reasoning: 1, impact: 1 });
    expect(({} as Record<string, unknown>).reasoning).toBeUndefined();

    const loaded = loadHarnessCandidates(process.cwd(), false, () => ({
      getGlobalSettings: () => repository.read("global"),
      getProjectSettings: () => ({}),
      drainErrors: () => [],
    }));
    expect(loaded.status).toBe("ready");
    if (loaded.status !== "ready") throw new Error(loaded.message);
    expect(loaded.candidates).toEqual(expect.arrayContaining([
      { provider: "available", modelId: "model", thinking: "medium", reasoning: 1, impact: 1 },
      { provider: "missing", modelId: "model", thinking: "__proto__", reasoning: 1, impact: 1 },
    ]));

    expect(await resolveDelegation({
      handoff: { objective: "Verify settings.", primarySkill: "test", companionSkills: [], context: [] },
      admission: { path: "standalone", basis: ["Bounded."], verification: ["Test."] },
      reasoning: 0,
      impact: 0,
    }, {
      cwd: process.cwd(),
      skills: [{ name: "test", description: "Test." }],
      candidates: loaded.candidates,
      modelRegistry: {
        getAvailable: () => [{ provider: "available", id: "model", reasoning: true, thinkingLevelMap: { medium: {} } }],
      },
    })).toMatchObject({
      status: "blocked",
      code: "unavailable_candidate",
      message: expect.stringContaining("manual settings replacement"),
    });
  });

});

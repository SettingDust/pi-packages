import { afterEach, describe, expect, test } from "bun:test";
import { loadHarnessCandidates, normalizeHarnessCandidates } from "../src/index.js";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function settings(candidates: Record<string, unknown>) {
  return { harness: { candidates } };
}

function candidate(reasoning = 2, impact = 1) {
  return { medium: { reasoning, impact } };
}
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});


describe("Pi Settings candidate configuration", () => {
  test("loads nested candidates with exact provider/model and thinking values", () => {
    expect(normalizeHarnessCandidates(settings({ "test/model.with/slash": candidate() }), {})).toEqual({
      status: "ready",
      candidates: {
        "test/model.with/slash": { medium: { reasoning: 2, impact: 1 } },
      },
    });
  });

  test("shallowly overlays a trusted project harness object", () => {
    const result = normalizeHarnessCandidates(settings({ "test/basic": candidate(1, 1) }), settings({ "test/advanced": candidate(3, 2) }));
    expect(result).toEqual({ status: "ready", candidates: { "test/advanced": candidate(3, 2) } });
  });

  test("accepts an empty harness object as zero candidates", () => {
    expect(normalizeHarnessCandidates({ harness: {} }, {})).toEqual({ status: "ready", candidates: {} });
  });

  test("ignores project settings when the project is untrusted", () => {
    const result = loadHarnessCandidates("/workspace", false, () => ({
      getGlobalSettings: () => settings({ "test/basic": candidate() }),
      getProjectSettings: () => settings({ "test/advanced": candidate() }),
      drainErrors: () => [],
    }));
    expect(result).toEqual({ status: "ready", candidates: [{ provider: "test", modelId: "basic", thinking: "medium", reasoning: 2, impact: 1 }] });
  });
  test("blocks raw duplicate keys through the default SettingsManager loader", () => {
    const root = mkdtempSync(join(tmpdir(), "pi-harness-config-"));
    roots.push(root);
    const cwd = join(root, "project");
    const agentDir = join(root, "agent");
    mkdirSync(cwd, { recursive: true });
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "settings.json"), '{"harness":{"candidates":{},"candidates":{"test/model":{"medium":{"reasoning":1,"impact":1}}}}}');
    const originalAgentDir = process.env.PI_CODING_AGENT_DIR;
    process.env.PI_CODING_AGENT_DIR = agentDir;
    try {
      expect(loadHarnessCandidates(cwd, false)).toMatchObject({ status: "blocked", code: "invalid_configuration", message: expect.stringContaining("could not be read") });
    } finally {
      if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
      else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
    }
  });


  test.each(["roles", "modelRole"])("loads legacy %s drift with a stable replacement code", (field) => {
    expect(loadHarnessCandidates("/workspace", false, () => ({
      getGlobalSettings: () => ({ harness: { [field]: {} } }),
      getProjectSettings: () => ({}),
      drainErrors: () => [],
    }))).toMatchObject({ status: "blocked", code: "legacy_configuration", message: expect.stringContaining("manual replacement") });
  });

  test.each(["roles", "modelRole"])("prioritizes unknown keys over legacy %s", (field) => {
    expect(normalizeHarnessCandidates({ harness: { [field]: {}, unknown: true } }, {})).toMatchObject({
      status: "blocked",
      code: "invalid_configuration",
      message: expect.stringContaining("only a candidates object"),
    });
  });

  test.each([
    [settings({ broken: { medium: { reasoning: 1, impact: 1, extra: 0 } } }), "non-empty provider/model"],
    [{ harness: { candidates: {}, unknown: true } }, "only a candidates object"],
    [{ harness: [] }, "only a candidates object"],
    [settings({ "/model": candidate() }), "non-empty provider/model"],
    [settings({ "test/": candidate() }), "non-empty provider/model"],
    [settings({ "test/model\n": candidate() }), "control characters"],
    [settings({ "test/model": { "": { reasoning: 1, impact: 1 } } }), "exactly reasoning and impact"],
    [settings({ "test/model": { medium: { reasoning: 1.5, impact: 1 } } }), "finite non-negative integers"],
    [settings({ "test/model": { medium: { reasoning: -1, impact: 1 } } }), "finite non-negative integers"],
    [settings({ "test/model": { medium: { reasoning: Number.NaN, impact: 1 } } }), "finite non-negative integers"],
  ])("blocks invalid candidate configuration", (global, message) => {
    expect(normalizeHarnessCandidates(global, {})).toMatchObject({ status: "blocked", code: "invalid_configuration", message: expect.stringContaining(message) });
  });

  test("blocks relevant Pi Settings read errors", () => {
    expect(loadHarnessCandidates("/workspace", true, () => ({
      getGlobalSettings: () => ({}),
      getProjectSettings: () => ({}),
      drainErrors: () => [{ scope: "project" }],
    }))).toEqual({ status: "blocked", code: "invalid_configuration", message: expect.stringContaining("could not be read") });
  });

  test("does not expose arbitrary loader errors", () => {
    const result = loadHarnessCandidates("/workspace", false, () => { throw new Error("secret implementation detail"); });
    expect(result).toEqual({ status: "blocked", code: "invalid_configuration", message: expect.stringContaining("could not be read") });
    if (result.status === "blocked") expect(result.message).not.toContain("secret implementation detail");
  });
});

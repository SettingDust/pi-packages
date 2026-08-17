import { describe, expect, test } from "bun:test";
import { loadHarnessRoles, normalizeHarnessRoles } from "../src/index.js";

const models = [
  { provider: "test", id: "reasoning", reasoning: true },
  { provider: "test", id: "plain", reasoning: false },
] as const;

function settings(roles: Record<string, unknown>) {
  return { harness: { roles } };
}

function role(model = "test/reasoning", thinking = "medium") {
  return { description: "Normal bounded work.", model, thinking };
}

describe("Pi Settings Role configuration", () => {
  test("loads valid global Roles", () => {
    const result = normalizeHarnessRoles(settings({ standard: role() }), {}, models);
    expect(result).toEqual({
      status: "ready",
      roles: [{
        name: "standard",
        description: "Normal bounded work.",
        model: "test/reasoning",
        thinking: "medium",
        available: true,
      }],
    });
  });

  test("shallowly overlays a trusted project harness object", () => {
    const global = settings({ basic: role("test/plain", "off") });
    const project = settings({ advanced: role("test/reasoning", "high") });
    const result = normalizeHarnessRoles(global, project, models);
    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.roles.map(({ name }) => name)).toEqual(["advanced"]);
  });

  test("accepts an empty harness object as zero Roles", () => {
    expect(normalizeHarnessRoles({ harness: {} }, {}, models)).toEqual({ status: "ready", roles: [] });
  });
  test("keeps unavailable and invalid-thinking Roles for precise runtime blocking", () => {
    const result = normalizeHarnessRoles(
      settings({
        missing: role("test/missing", "low"),
        invalidThinking: role("test/plain", "high"),
      }),
      {},
      models,
    );
    expect(result).toMatchObject({
      status: "ready",
      roles: [
        { name: "missing", available: false },
        { name: "invalidThinking", available: false, unavailableCode: "invalid_thinking" },
      ],
    });
  });

  test.each([
    [{ harness: [] }, "harness must contain only a roles object"],
    [{ harness: { roles: [] } }, "harness.roles must be an object"],
    [settings({ broken: { model: "test/reasoning", thinking: "low" } }), "Every harness Role needs"],
    [settings({ broken: { description: "", model: "test/reasoning", thinking: "low" } }), "must be a non-empty string"],
  ])("blocks malformed configuration", (global, message) => {
    expect(normalizeHarnessRoles(global, {}, models)).toMatchObject({ status: "blocked", message: expect.stringContaining(message) });
  });

  test("ignores project settings when the project is untrusted", () => {
    const result = loadHarnessRoles("/workspace", false, models, () => ({
      getGlobalSettings: () => settings({ basic: role("test/plain", "off") }),
      getProjectSettings: () => settings({ advanced: role() }),
      drainErrors: () => [],
    }));
    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.roles.map(({ name }) => name)).toEqual(["basic"]);
  });

  test("blocks relevant Pi Settings read errors", () => {
    const result = loadHarnessRoles("/workspace", true, models, () => ({
      getGlobalSettings: () => ({}),
      getProjectSettings: () => ({}),
      drainErrors: () => [{ scope: "project" }],
    }));
    expect(result).toEqual({ status: "blocked", message: "Pi settings could not be read" });
  });
});

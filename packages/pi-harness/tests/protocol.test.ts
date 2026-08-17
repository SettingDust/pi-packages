import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildResolverSchema,
  parseHandlerResult,
  resolveDelegation,
  type Handoff,
  type ModelRole,
  type ResolveOptions,
  type SkillSummary,
} from "../src/index.js";

const skills: SkillSummary[] = [
  { name: "spec-driven-development", description: "Coordinate durable software delivery." },
  { name: "research-deep", description: "Investigate architecture and risk." },
  { name: "external-review", description: "Project-provided independent review." },
];

const roles: ModelRole[] = [
  {
    name: "standard",
    description: "Normal multi-step work.",
    model: "test/standard",
    thinking: "medium",
    available: true,
  },
  {
    name: "offline",
    description: "Unavailable model.",
    model: "test/offline",
    thinking: "high",
    available: false,
  },
];

let cwd: string;
let readableRef: string;
let options: ResolveOptions;

beforeAll(async () => {
  cwd = await mkdtemp(join(tmpdir(), "pi-harness-"));
  readableRef = join(cwd, "context.md");
  await writeFile(readableRef, "context", "utf8");
  options = { skills, roles, cwd, handlerPath: "agents/handler.md" };
});

afterAll(async () => {
  await rm(cwd, { recursive: true, force: true });
});

function handoff(overrides: Partial<Handoff> = {}): Handoff {
  return {
    objective: "Establish the smallest protocol change.",
    primarySkill: "spec-driven-development",
    companionSkills: ["research-deep"],
    context: [
      { ref: "context.md", purpose: "Accepted protocol context." },
      { inline: "No Pi runtime integration in this prototype.", purpose: "Current scope." },
    ],
    constraints: ["Do not inline referenced content."],
    deliverables: ["A normalized YAML Handoff."],
    ...overrides,
  };
}

describe("dynamic resolver schema", () => {
  test("includes every supplied Skill and only available valid Roles", () => {
    const schema = buildResolverSchema(skills, roles);
    expect(schema.primarySkill.enum).toEqual(skills.map(({ name }) => name));
    expect(schema.companionSkills.enum).toEqual(skills.map(({ name }) => name));
    expect(schema.modelRole.enum).toEqual(["standard"]);
    expect(schema.modelRole.descriptions.standard).toBe("Normal multi-step work.");
  });

  test("refreshes when Skill and Role inputs change", () => {
    const first = buildResolverSchema(skills, roles);
    const second = buildResolverSchema(
      [{ name: "diagnose", description: "Find root cause." }],
      [{ ...roles[1]!, name: "advanced", available: true }],
    );
    expect(first.primarySkill.enum).not.toEqual(second.primarySkill.enum);
    expect(second.primarySkill.enum).toEqual(["diagnose"]);
    expect(second.modelRole.enum).toEqual(["advanced"]);
  });
});

describe("delegation resolution", () => {
  test("resolves a valid Handoff without inlining references or Model Role", async () => {
    const result = await resolveDelegation({ handoff: handoff(), modelRole: "standard" }, options);
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;

    const prompt = Bun.YAML.parse(result.prompt) as Handoff;
    expect(prompt.context[0]).toEqual({ ref: readableRef, purpose: "Accepted protocol context." });
    expect(result.prompt).not.toContain("context\n");
    expect(result.prompt).not.toContain("modelRole");
    expect(result.model).toBe("test/standard");
    expect(result.thinking).toBe("medium");
    expect(result.handler.name).toBe("handler");
  });

  test("defaults omitted companionSkills to an empty list", async () => {
    const candidate = { ...handoff(), companionSkills: undefined };
    const result = await resolveDelegation({ handoff: candidate, modelRole: "standard" }, options);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect((Bun.YAML.parse(result.prompt) as Handoff).companionSkills).toEqual([]);
    }
  });

  test("blocks missing references before serialization", async () => {
    const result = await resolveDelegation(
      { handoff: handoff({ context: [{ ref: "missing.md", purpose: "Required evidence." }] }), modelRole: "standard" },
      options,
    );
    expect(result).toMatchObject({ status: "blocked", code: "invalid_reference" });
  });

  test.each([
    ["unknown primary", handoff({ primarySkill: "missing" })],
    ["duplicate companions", handoff({ companionSkills: ["research-deep", "research-deep"] })],
    ["primary repeated as companion", handoff({ companionSkills: ["spec-driven-development"] })],
  ])("blocks %s", async (_name, candidate) => {
    const result = await resolveDelegation({ handoff: candidate, modelRole: "standard" }, options);
    expect(result).toMatchObject({ status: "blocked", code: "invalid_skill" });
  });

  test.each([
    ["unknown", "missing", roles, "unknown_role"],
    ["unavailable", "offline", roles, "unavailable_model"],
    [
      "unsupported thinking",
      "invalid-thinking",
      [...roles, {
        name: "invalid-thinking",
        description: "Invalid thinking.",
        model: "test/model",
        thinking: "xhigh",
        available: false,
        unavailableCode: "invalid_thinking" as const,
      }],
      "invalid_thinking",
    ],
    [
      "empty description",
      "broken-description",
      [...roles, { name: "broken-description", description: "", model: "test/model", thinking: "low", available: true }],
      "invalid_config",
    ],
    [
      "empty model",
      "broken-model",
      [...roles, { name: "broken-model", description: "Broken.", model: "", thinking: "low", available: true }],
      "unavailable_model",
    ],
    [
      "empty thinking",
      "broken-thinking",
      [...roles, { name: "broken-thinking", description: "Broken.", model: "test/model", thinking: "", available: true }],
      "invalid_thinking",
    ],
  ])("blocks %s Role configuration", async (_name, modelRole, roleFixture, code) => {
    const result = await resolveDelegation(
      { handoff: handoff(), modelRole },
      { ...options, roles: roleFixture as ModelRole[] },
    );
    expect(result).toMatchObject({ status: "blocked", code });
  });
});

describe("Handler Result parsing", () => {
  test.each(["completed", "partial", "blocked", "failed"] as const)("accepts %s", (status) => {
    const parsed = parseHandlerResult(Bun.YAML.stringify({
      status,
      summary: `${status} summary`,
      report: "Evidence-backed report.",
      artifacts: [{ ref: "not-created-yet.md", purpose: "Report-only artifact reference." }],
    }));
    expect(parsed).toMatchObject({ valid: true, result: { status } });
  });

  test.each(["suggestedNext", "nextAction", "nextSkill"])("rejects workflow field %s", (field) => {
    const parsed = parseHandlerResult({
      status: "completed",
      summary: "Done.",
      report: "Evidence.",
      [field]: "implement",
    });
    expect(parsed.valid).toBe(false);
  });

  test("rejects malformed YAML and missing required fields", () => {
    expect(parseHandlerResult("[invalid").valid).toBe(false);
    expect(parseHandlerResult({ status: "completed", summary: "Done." }).valid).toBe(false);
  });
});

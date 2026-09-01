import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPlannedSubject } from "../src/admission.js";
import {
  buildResolverSchema,
  parseHandlerResult,
  resolveDelegation,
  type Handoff,
  type ModelRegistry,
  type RegistryModel,
  type ResolveOptions,
  type SkillSummary,

} from "../src/protocol.js";
import type { CandidateEntry } from "../src/settings-store.js";

const skills: SkillSummary[] = [
  { name: "spec-driven-development", description: "Coordinate delivery." },
  { name: "research-deep", description: "Investigate risk." },
];
const candidates: CandidateEntry[] = [
  { provider: "zeta", modelId: "model/2.0", thinking: "medium", reasoning: 2, impact: 2 },
  { provider: "alpha", modelId: "model.1", thinking: "medium", reasoning: 2, impact: 2 },
  { provider: "alpha", modelId: "model.1", thinking: "off", reasoning: 3, impact: 3 },
];
const atomic = { path: "atomic", basis: ["Bounded."], verification: ["Focused test."] } as const;
const authority = {
  work: "docs/works/admission/work.md",
  plan: "docs/works/admission/plan-slice.md",
  tasks: "docs/works/admission/tasks-slice.md",
};
let cwd: string;
let authorityDir: string;
let options: ResolveOptions;
let registryReads = 0;

beforeAll(async () => {
  cwd = await mkdtemp(join(tmpdir(), "pi-harness-"));
  authorityDir = join(cwd, "docs", "works", "admission");
  await mkdir(authorityDir, { recursive: true });
  await writeFile(join(cwd, "context.md"), "context", "utf8");
  await writeFile(join(authorityDir, "work.md"), "work\n", "utf8");
  await writeFile(join(authorityDir, "plan-slice.md"), "plan\n", "utf8");
  await writeFile(join(authorityDir, "tasks-slice.md"), "tasks\n", "utf8");
  options = { skills, candidates, cwd, modelRegistry: registry() };
});

afterAll(async () => rm(cwd, { recursive: true, force: true }));

function registry(
  models: RegistryModel[] = [
    { provider: "zeta", id: "model/2.0", reasoning: true, thinkingLevelMap: { medium: {} } },
    { provider: "alpha", id: "model.1", reasoning: true, thinkingLevelMap: { medium: {}, off: {} } },
  ],
): ModelRegistry {
  return { getAvailable: () => { registryReads++; return models; } };
}

function handoff(overrides: Partial<Handoff> = {}): Handoff {
  return {
    objective: "Establish the protocol change.",
    primarySkill: skills[0]!.name,
    companionSkills: [skills[1]!.name],
    context: [
      { ref: "context.md", purpose: "Accepted context." },
      { inline: "Scope.", purpose: "Current scope." },
    ],
    constraints: ["Bounded."],
    deliverables: ["Result."],
    ...overrides,
  };
}

function request(candidate: Handoff = handoff(), extra: Record<string, unknown> = {}) {
  return { handoff: candidate, admission: atomic, reasoning: 1, impact: 1, ...extra };
}

function planned(): Handoff {
  return handoff({
    context: [
      { ref: authority.work, purpose: "Work." },
      { ref: authority.plan, purpose: "Plan." },
      { ref: authority.tasks, purpose: "Tasks." },
    ],
  });
}

describe("resolver schema", () => {
  test("is closed, static, and Registry-free", () => {
    registryReads = 0;
    const schema = buildResolverSchema(skills);
    expect(Object.keys(schema).sort()).toEqual(["companionSkills", "impact", "primarySkill", "reasoning"]);
    expect(schema.reasoning).toMatchObject({ type: "integer", minimum: 0 });
    expect(schema.impact).toMatchObject({ type: "integer", minimum: 0 });
    expect(schema.primarySkill.enum).toEqual(skills.map(({ name }) => name));
    expect(registryReads).toBe(0);
  });
});

describe("deterministic capability resolution", () => {
  test("selects exact candidate, reads Registry once, and omits selection from prompt", async () => {
    registryReads = 0;
    const result = await resolveDelegation(request(), options);
    expect(result).toMatchObject({ status: "resolved", model: "alpha/model.1", thinking: "medium" });
    expect(registryReads).toBe(1);
    if (result.status !== "resolved") return;
    const prompt = Bun.YAML.parse(result.prompt) as Record<string, unknown>;
    for (const key of ["reasoning", "impact", "candidate", "selection", "model", "thinking", "admission"]) {
      expect(prompt).not.toHaveProperty(key);
    }
  });

  test("uses impact, then reasoning, then complete canonical identity", async () => {
    const fixture: CandidateEntry[] = [
      { provider: "z", modelId: "m", thinking: "medium", reasoning: 4, impact: 2 },
      { provider: "a", modelId: "m", thinking: "medium", reasoning: 2, impact: 2 },
      { provider: "a", modelId: "a", thinking: "medium", reasoning: 2, impact: 2 },
    ];
    const models = fixture.map(({ provider, modelId, thinking }) => ({
      provider,
      id: modelId,
      reasoning: true,
      thinkingLevelMap: { [thinking]: {} },
    }));
    expect(await resolveDelegation(request(), {
      ...options,
      candidates: fixture,
      modelRegistry: registry(models),
    })).toMatchObject({ status: "resolved", model: "a/a", thinking: "medium" });
  });

  test("impact surplus precedes lower reasoning surplus", async () => {
    const fixture: CandidateEntry[] = [
      { provider: "a", modelId: "reasoning-win", thinking: "medium", reasoning: 1, impact: 3 },
      { provider: "z", modelId: "impact-win", thinking: "medium", reasoning: 9, impact: 1 },
    ];
    const models = fixture.map(({ provider, modelId }) => ({ provider, id: modelId, reasoning: true, thinkingLevelMap: { medium: {} } }));
    expect(await resolveDelegation(request(), { ...options, candidates: fixture, modelRegistry: registry(models) }))
      .toMatchObject({ status: "resolved", model: "z/impact-win" });
  });

  test.each([
    ["fractional", -1.5],
    ["negative", -1],
    ["non-finite", Infinity],
    ["wrong type", "1"],
    ["missing", undefined],
  ])("rejects %s request after existing legality", async (_name, value) => {
    registryReads = 0;
    expect(await resolveDelegation(request(handoff({ primarySkill: "missing" }), { reasoning: value }), options))
      .toMatchObject({ status: "blocked", code: "invalid_skill" });
    expect(registryReads).toBe(0);
  });

  test.each([
    [-1.5, "integer"],
    [-1, "non-negative"],
    [Infinity, "finite"],
    ["1", "finite"],
    [undefined, "finite"],
  ])("applies numeric precedence for %p", async (value, message) => {
    registryReads = 0;
    expect(await resolveDelegation(request(handoff(), { reasoning: value }), options))
      .toMatchObject({ status: "blocked", code: "invalid_capability_request", message: expect.stringContaining(message) });
    expect(registryReads).toBe(0);
  });

  test("rejects nested selection fields and legacy root fields", async () => {
    expect(await resolveDelegation(request({ ...handoff(), model: "x" } as Handoff), options))
      .toMatchObject({ status: "blocked", code: "invalid_configuration" });
    expect(await resolveDelegation({ ...request(), modelRole: "standard" }, options))
      .toMatchObject({ status: "blocked", code: "legacy_configuration" });
  });

  test("requires exact Registry provider, model ID, and thinking support", async () => {
    const exact = [{ ...candidates[0]!, provider: "provider", modelId: "family/model.2" }];
    expect(await resolveDelegation(request(), {
      ...options,
      candidates: exact,
      modelRegistry: registry([{ provider: "Provider", id: "family/model.2", reasoning: true, thinkingLevelMap: { medium: {} } }]),
    })).toMatchObject({ status: "blocked", code: "unavailable_candidate" });
    expect(await resolveDelegation(request(), {
      ...options,
      candidates: exact,
      modelRegistry: registry([{ provider: "provider", id: "family/model.2", reasoning: false }]),
    })).toMatchObject({ status: "blocked", code: "unavailable_candidate" });
    expect(await resolveDelegation(request(), {
      ...options,
      candidates: exact,
      modelRegistry: registry([{ provider: "provider", id: "family/model.2", reasoning: true, thinkingLevelMap: { medium: {} } }]),
    })).toMatchObject({ status: "resolved", model: "provider/family/model.2" });
  });

  test("blocks the whole configuration when one candidate is unavailable", async () => {
    registryReads = 0;
    const fixture: CandidateEntry[] = [
      { provider: "available", modelId: "qualified", thinking: "medium", reasoning: 3, impact: 3 },
      { provider: "missing", modelId: "candidate", thinking: "medium", reasoning: 0, impact: 0 },
    ];
    expect(await resolveDelegation(request(), {
      ...options,
      candidates: fixture,
      modelRegistry: registry([{ provider: "available", id: "qualified", reasoning: true, thinkingLevelMap: { medium: {} } }]),
    })).toMatchObject({ status: "blocked", code: "unavailable_candidate", message: expect.stringContaining("manual") });
    expect(registryReads).toBe(1);
  });

  test("rejects a distinct duplicate canonical candidate tuple", async () => {
    registryReads = 0;
    expect(await resolveDelegation(request(), {
      ...options,
      candidates: [candidates[0]!, { ...candidates[0]!, reasoning: 3 }],
    })).toMatchObject({ status: "blocked", code: "invalid_configuration" });
    expect(registryReads).toBe(0);
  });

  test("fails closed for malformed, duplicate, unavailable, and insufficient candidates", async () => {
    expect(await resolveDelegation(request(), { ...options, candidates: [{ ...candidates[0]!, provider: "bad/provider" }], modelRegistry: registry() }))
      .toMatchObject({ status: "blocked", code: "invalid_configuration" });
    expect(await resolveDelegation(request(), { ...options, candidates: [candidates[0]!, { ...candidates[0]! }], modelRegistry: registry() }))
      .toMatchObject({ status: "blocked", code: "invalid_configuration" });
    expect(await resolveDelegation(request(), { ...options, candidates: [{ ...candidates[0]!, provider: "missing" }], modelRegistry: registry() }))
      .toMatchObject({ status: "blocked", code: "unavailable_candidate", message: expect.stringContaining("manual") });
    expect(await resolveDelegation(request(handoff(), { reasoning: 9, impact: 9 }), options))
      .toMatchObject({ status: "blocked", code: "no_qualified_candidate" });
  });

  test("qualification requires both capability minima", async () => {
    const fixture: CandidateEntry[] = [
      { provider: "a", modelId: "reasoning-only", thinking: "medium", reasoning: 3, impact: 0 },
      { provider: "b", modelId: "impact-only", thinking: "medium", reasoning: 0, impact: 3 },
    ];
    const models: RegistryModel[] = fixture.map(({ provider, modelId }) => ({ provider, id: modelId, reasoning: true }));
    expect(await resolveDelegation(request(handoff(), { reasoning: 1, impact: 1 }), {
      ...options,
      candidates: fixture,
      modelRegistry: registry(models),
    })).toMatchObject({ status: "blocked", code: "no_qualified_candidate" });
  });

  test.each([
    [-1.5, "integer"],
    [-1, "non-negative"],
    [Infinity, "finite"],
    ["1", "finite"],
  ])("rejects candidate capability %p before Registry observation", async (reasoning, message) => {
    registryReads = 0;
    expect(await resolveDelegation(request(), {
      ...options,
      candidates: [{ ...candidates[0]!, reasoning: reasoning as number }],
    })).toMatchObject({ status: "blocked", code: "invalid_configuration", message: expect.stringContaining(message) });
    expect(registryReads).toBe(0);
  });

  test("uses one immutable Registry snapshot without retry", async () => {
    registryReads = 0;
    const modelRegistry: ModelRegistry = {
      getAvailable: () => {
        registryReads++;
        return registryReads === 1
          ? [{ provider: "alpha", id: "model.1", reasoning: true }]
          : [{ provider: "zeta", id: "model/2.0", reasoning: true }];
      },
    };
    expect(await resolveDelegation(request(), {
      ...options,
      candidates: [candidates[1]!],
      modelRegistry,
    })).toMatchObject({ status: "resolved", model: "alpha/model.1" });
    expect(registryReads).toBe(1);
  });
});

describe("admission preservation", () => {
  test("keeps reference precedence and performs no authority observation on early failure", async () => {
    let observations = 0;
    expect(await resolveDelegation(request(handoff({ context: [{ ref: "missing.md", purpose: "Required." }] }), {
      admission: { path: "planned", authority },
    }), {
      ...options,
      subjectBuilder: async (...args) => { observations++; return buildPlannedSubject(...args); },
    })).toMatchObject({ status: "blocked", code: "invalid_reference" });
    expect(observations).toBe(0);
  });

  test("preserves planned admission and final-JIT validation", async () => {
    registryReads = 0;
    let observations = 0;
    const result = await resolveDelegation({
      ...request(planned()),
      admission: { path: "planned", authority },
    }, {
      ...options,
      subjectBuilder: async (...args) => { observations++; return buildPlannedSubject(...args); },
    });
    expect(result.status).toBe("resolved");
    expect(observations).toBe(2);
    expect(registryReads).toBe(1);
  });

  test("blocks authority drift before Registry observation", async () => {
    registryReads = 0;
    let observations = 0;
    const result = await resolveDelegation({ ...request(planned()), admission: { path: "planned", authority } }, {
      ...options,
      subjectBuilder: async (...args) => {
        const subject = await buildPlannedSubject(...args);
        observations++;
        if (observations === 1) await writeFile(join(authorityDir, "work.md"), "changed\n", "utf8");
        return subject;
      },
    });
    expect(result).toMatchObject({ status: "blocked", code: "authority_drift" });
    expect(registryReads).toBe(0);
    await writeFile(join(authorityDir, "work.md"), "work\n", "utf8");
  });
});

describe("Handler Result parsing", () => {
  test.each(["completed", "partial", "blocked", "failed"] as const)("accepts %s", (status) => {
    expect(parseHandlerResult({ status, summary: "Done.", report: "Evidence." }))
      .toMatchObject({ valid: true, result: { status } });
  });
  test.each(["suggestedNext", "nextAction", "nextSkill"])("rejects workflow field %s", (field) => {
    expect(parseHandlerResult({ status: "completed", summary: "Done.", report: "Evidence.", [field]: "implement" }).valid)
      .toBe(false);
  });
});

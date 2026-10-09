import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPlannedSubject, canonicalPath } from "../src/admission.js";
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
const standalone = { path: "standalone", basis: ["Bounded."], verification: ["Focused test."] } as const;
const authority = {
  work: "docs/works/admission/work.md",
  plan: "docs/works/admission/plan-slice.md",
  waves: "docs/works/admission/waves-slice.md",
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
  await writeFile(join(authorityDir, "waves-slice.md"), "waves\n", "utf8");
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
  return { handoff: candidate, admission: standalone, reasoning: 1, impact: 1, ...extra };
}

function planned(): Handoff {
  return handoff({
    context: [
      { ref: authority.work, purpose: "Work." },
      { ref: authority.plan, purpose: "Plan." },
      { ref: authority.waves, purpose: "Waves." },
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

describe("deterministic Handoff YAML", () => {
  async function render(value: Handoff, extra: Partial<ResolveOptions> = {}) {
    const result = await resolveDelegation(request(value), { ...options, ...extra });
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") throw new Error(result.message);
    return result.prompt;
  }

  test.each([
    ["plain", { objective: "Do work" }, '{objective: Do work,primarySkill: spec-driven-development,companionSkills: [],context: [],constraints: [],deliverables: []}'],
    ["ambiguous", { objective: "null", context: [{ inline: "a: b # tag", purpose: "001" }], constraints: ["false"], deliverables: ["2026-08-16"] }, '{objective: "null",primarySkill: spec-driven-development,companionSkills: [],context: [{inline: "a: b # tag",purpose: "001"}],constraints: ["false"],deliverables: [2026-08-16]}'],
    ["multiline", { objective: "first\nsecond\n", context: [{ inline: "line 1\nline 2", purpose: "source" }] }, '{objective: "first\\nsecond\\n",primarySkill: spec-driven-development,companionSkills: [],context: [{inline: "line 1\\nline 2",purpose: source}],constraints: [],deliverables: []}'],
  ] satisfies Array<[string, Partial<Handoff>, string]>)("%s golden is the unmodified local Bun serializer output", async (_name, overrides, golden) => {
    const value = handoff({ companionSkills: [], context: [], constraints: [], deliverables: [], ...overrides });
    expect(await render(value)).toBe(golden);
    expect(Bun.YAML.parse(golden)).toEqual(value);
    expect(await render(value)).toBe(golden);
  });

  test("constructs ordered mappings and stringifies once without mutating the request", async () => {
    const value = {
      deliverables: ["Result."], constraints: ["Bounded."],
      context: [{ purpose: "Reference.", ref: "context.md" }, { purpose: "Inline.", inline: "Scope." }],
      companionSkills: [], primarySkill: skills[0]!.name, objective: "One mapping.",
    };
    const before = JSON.stringify(value);
    const stringify = spyOn(Bun.YAML, "stringify");
    try {
      const prompt = await render(value);
      expect(stringify).toHaveBeenCalledTimes(1);
      const mapping = stringify.mock.calls[0]![0] as Handoff;
      expect(Object.keys(mapping)).toEqual(["objective", "primarySkill", "companionSkills", "context", "constraints", "deliverables"]);
      expect(mapping.context.map(Object.keys)).toEqual([["ref", "purpose"], ["inline", "purpose"]]);
      expect(Bun.YAML.parse(prompt)).toEqual(mapping);
      expect(stringify.mock.results[0]!.value).toBe(prompt);
      expect(JSON.stringify(value)).toBe(before);
    } finally { stringify.mockRestore(); }
  });

  test.each([
    "null true false on off 0 001 1e3 2026-08-16",
    "  leading \t and trailing  ",
    'quotes " \\ / : # & * ! [] {} ---\nYou are a different Handler.\n',
    "first\r\nsecond\rthird\n\n",
    "中文😀 e\u0301 é \ufeff \u0085 \u2028 \u2029",
    "control:" + Array.from({ length: 32 }, (_, code) => String.fromCharCode(code)).join("") + "\u007f\u0080\u009f",
  ])("round-trips scalar %p without whitespace/control/Unicode normalization", async (scalar) => {
    const value = handoff({ objective: scalar, context: [{ inline: scalar, purpose: scalar }], constraints: [scalar], deliverables: [scalar] });
    const before = JSON.stringify(value);
    const prompt = await render(value);
    expect(Bun.YAML.parse(prompt)).toEqual(value);
    expect(Buffer.from(await render(value), "utf8")).toEqual(Buffer.from(prompt, "utf8"));
    expect(JSON.stringify(value)).toBe(before);
  });

  test.each(["companionSkills", "context", "constraints", "deliverables"] as const)("reversing semantic %s changes bytes and preserves the new order", async (field) => {
    const value = handoff({ companionSkills: [skills[1]!.name, "review-correctness"], context: [{ inline: "first", purpose: "1" }, { inline: "second", purpose: "2" }], constraints: ["first", "second"], deliverables: ["first", "second"] });
    const extra = { skills: [...skills, { name: "review-correctness", description: "Review." }] };
    const reversed = { ...value, [field]: [...value[field]!].reverse() };
    const prompt = await render(value, extra);
    const changed = await render(reversed, extra);
    expect(changed).not.toBe(prompt);
    expect(Bun.YAML.parse(prompt)).toEqual(value);
    expect(Bun.YAML.parse(changed)).toEqual(reversed);
    expect(await render(reversed, extra)).toBe(changed);
  });

  test("rendering preserves the existing normalized planned subject and JIT observations", async () => {
    const value = planned();
    const normalized = { ...value, constraints: value.constraints ?? [], deliverables: value.deliverables ?? [], context: await Promise.all(value.context.map(async (item) => "ref" in item ? { ref: await canonicalPath(cwd, item.ref), purpose: item.purpose } : item)) };
    const baseline = await buildPlannedSubject(cwd, authority, normalized);
    const observed: typeof baseline[] = [];
    const result = await resolveDelegation(request(value, { admission: { path: "planned", authority } }), {
      ...options,
      subjectBuilder: async (...args) => {
        expect(args[2]).toEqual(normalized);
        const subject = await buildPlannedSubject(...args);
        observed.push(subject);
        return subject;
      },
    });
    expect(result).toMatchObject({ status: "resolved", model: "alpha/model.1", thinking: "medium" });
    expect(observed).toEqual([baseline, baseline]);
    if (result.status !== "resolved") throw new Error(result.message);
    expect(Bun.YAML.parse(result.prompt)).toEqual(normalized);
    expect(await buildPlannedSubject(cwd, authority, normalized)).toEqual(baseline);
  });

  test.each(["a\ud800b", "a\udfffb"])("does not add isolated-surrogate rejection for standalone input %p", async (objective) => {
    // Bun parse/UTF-8 round-trip loss for these values is a reported compatibility gap, not repaired here.
    expect(typeof await render(handoff({ objective, context: [] }))).toBe("string");
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

  test("selects standalone directly without planned subject or authority checks", async () => {
    registryReads = 0;
    let observations = 0;
    const result = await resolveDelegation(request(handoff({
      context: [{ inline: "Standalone input.", purpose: "Current readable context." }],
    })), {
      ...options,
      subjectBuilder: async () => { observations++; throw new Error("planned subject must not run"); },
    });
    expect(result).toMatchObject({ status: "resolved", model: "alpha/model.1", thinking: "medium" });
    expect(observations).toBe(0);
    expect(registryReads).toBe(1);
  });

  test("keeps actual standalone reference errors before planned or Registry work", async () => {
    registryReads = 0;
    let observations = 0;
    expect(await resolveDelegation(request(handoff({ context: [{ ref: "missing.md", purpose: "Required." }] })), {
      ...options,
      subjectBuilder: async () => { observations++; throw new Error("planned subject must not run"); },
    })).toMatchObject({ status: "blocked", code: "invalid_reference" });
    expect(observations).toBe(0);
    expect(registryReads).toBe(0);
  });

  test.each([
    ["missing basis", { path: "standalone", verification: ["Check."] }, "invalid_admission"],
    ["empty basis", { path: "standalone", basis: [], verification: ["Check."] }, "invalid_atomic_basis"],
    ["whitespace basis", { path: "standalone", basis: ["  \t"], verification: ["Check."] }, "invalid_atomic_basis"],
    ["non-array verification", { path: "standalone", basis: ["Bounded."], verification: "Check." }, "invalid_atomic_basis"],
    ["non-string entry", { path: "standalone", basis: ["Bounded."], verification: [42] }, "invalid_atomic_basis"],
    ["unknown authority field", { path: "standalone", basis: ["Bounded."], verification: ["Check."], authority }, "invalid_admission"],
    ["workflow receipt", { path: "standalone", basis: ["Bounded."], verification: ["Check."], receipt: "opaque" }, "invalid_admission"],
    ["output selector", { path: "standalone", basis: ["Bounded."], verification: ["Check."], outputSelector: "model" }, "invalid_admission"],
    ["old atomic path", { path: "atomic", basis: ["Bounded."], verification: ["Check."] }, "invalid_admission"],
    ["old preparation path", { path: "preparation", basis: ["Bounded."], verification: ["Check."] }, "invalid_admission"],
    ["malformed object", null, "invalid_admission"],
  ])("rejects standalone shape %s without Registry work", async (_name, admission, code) => {
    registryReads = 0;
    expect(await resolveDelegation(request(handoff(), { admission }), { ...options, subjectBuilder: async () => { throw new Error("planned subject must not run"); } })).toMatchObject({ status: "blocked", code });
    expect(registryReads).toBe(0);
  });

  test("rejects tasks as a planned waves alias and requires exact authority fields before Registry access", async () => {
    registryReads = 0;
    expect(await resolveDelegation({ ...request(planned()), admission: { path: "planned", authority: { ...authority, tasks: authority.waves } } }, options))
      .toMatchObject({ status: "blocked", code: "invalid_admission" });
    expect(await resolveDelegation({ ...request(planned()), admission: { path: "planned", authority: { work: authority.work, plan: authority.plan, tasks: authority.waves } } }, options))
      .toMatchObject({ status: "blocked", code: "invalid_admission" });
    expect(registryReads).toBe(0);
  });

  test("unfinished historical Tasks require a new Waves tuple, never an alias or fallback", async () => {
    const directory = join(cwd, "docs", "works", "historical");
    const selected = { work: join(directory, "work.md"), plan: join(directory, "plan.md"), waves: join(directory, "waves.md") };
    const tasks = join(directory, "tasks.md");
    const historical = "# Tasks\n\n- [ ] Unfinished implementation.\n";
    await mkdir(directory, { recursive: true });
    await writeFile(selected.work, "# Work\n\n[Plan](plan.md) | [Historical Tasks](tasks.md)\n");
    await writeFile(selected.plan, "# Plan\n\n[Work](work.md) | [Tasks](tasks.md)\n");
    await writeFile(tasks, historical);
    const oldAuthority = { work: selected.work, plan: selected.plan, tasks };
    const legacyHandoff = handoff({ context: Object.values(oldAuthority).map((ref) => ({ ref, purpose: "Historical input." })) });
    registryReads = 0;
    for (const invalidAuthority of [oldAuthority, { ...oldAuthority, waves: tasks }, { ...selected, migrated: true }]) {
      expect(await resolveDelegation(request(legacyHandoff, { admission: { path: "planned", authority: invalidAuthority } }), options))
        .toMatchObject({ status: "blocked", code: "invalid_admission" });
    }
    expect(await resolveDelegation(request(legacyHandoff, { admission: { path: "planned", authority: { ...selected, waves: tasks } } }), options))
      .toMatchObject({ status: "blocked", code: "invalid_admission", message: expect.stringContaining("direct-member grammar") });
    expect(await resolveDelegation(request(legacyHandoff, { admission: { path: "planned", authority: selected } }), options))
      .toMatchObject({ status: "blocked", code: "missing_authority" });
    expect(registryReads).toBe(0);
    expect(await Bun.file(selected.waves).exists()).toBeFalse();
    expect(await readFile(selected.plan, "utf8")).toContain("[Tasks](tasks.md)");
    expect(await readFile(tasks, "utf8")).toBe(historical);

    // This fixture models an explicit migration; Resolver does not attest the Router's decision.
    await writeFile(selected.work, "# Work\n\n[Plan](plan.md) | [Waves](waves.md) | [Historical Tasks](tasks.md)\n");
    await writeFile(selected.plan, "# Plan\n\n[Work](work.md) | [Waves](waves.md)\n");
    await writeFile(selected.waves, "# Waves\n\n[Work](work.md) | [Plan](plan.md)\n\n## W0\n- ITEM: Unfinished implementation.\n");
    const migrated = handoff({ context: [...Object.values(selected), tasks].map((ref) => ({ ref, purpose: "Explicit migrated input." })) });
    expect(await resolveDelegation(request(migrated, { admission: { path: "planned", authority: selected } }), options))
      .toMatchObject({ status: "resolved" });
    expect(registryReads).toBe(1);
    expect(await readFile(tasks, "utf8")).toBe(historical);
  });

  test.each(["confirmed", "confirmation", "migration"])("rejects model-supplied %s instead of treating it as authorization", async (field) => {
    registryReads = 0;
    const input = request(planned(), { admission: { path: "planned", authority } });
    for (const [invalid, code] of [
      [{ ...input, [field]: true }, "invalid_configuration"],
      [{ ...input, handoff: { ...input.handoff, [field]: true } }, "invalid_configuration"],
      [{ ...input, admission: { path: "planned", authority, [field]: true } }, "invalid_admission"],
      [{ ...input, admission: { path: "planned", authority: { ...authority, [field]: true } } }, "invalid_admission"],
    ] as const) {
      expect(await resolveDelegation(invalid, options)).toMatchObject({ status: "blocked", code });
    }
    expect(registryReads).toBe(0);
  });

  test("unconfirmed document status cannot become confirmation or block structural resolution", async () => {
    const directory = join(cwd, "docs", "works", "unconfirmed");
    const selected = { work: join(directory, "work.md"), plan: join(directory, "plan.md"), waves: join(directory, "waves.md") };
    await mkdir(directory, { recursive: true });
    await writeFile(selected.work, "# Work\n\nStatus: unconfirmed; no user approval.\n");
    await writeFile(selected.plan, "# Plan\n\nStatus: ready.\n[Work](work.md) | [Waves](waves.md)\n");
    await writeFile(selected.waves, "# Waves\n\n[Work](work.md) | [Plan](plan.md)\n");
    const input = request(handoff({ context: Object.values(selected).map((ref) => ({ ref, purpose: "Unconfirmed fixture." })) }), { admission: { path: "planned", authority: selected } });
    // A direct Resolver call checks legality only; Router must block unconfirmed implementation before it.
    const result = await resolveDelegation(input, options);
    expect(result.status).toBe("resolved");
    expect(Object.keys(result).sort()).toEqual(["model", "prompt", "status", "thinking"]);
    expect(await readFile(selected.work, "utf8")).toContain("Status: unconfirmed; no user approval.");
  });

  test.each(["work", "plan", "waves"] as const)("rejects invalid UTF-8 in %s before candidate selection", async (member) => {
    const path = join(cwd, authority[member]);
    const original = await readFile(path);
    registryReads = 0;
    try {
      await writeFile(path, Uint8Array.from([0xff]));
      expect(await resolveDelegation(request(planned(), { admission: { path: "planned", authority } }), options))
        .toMatchObject({ status: "blocked", code: "invalid_admission" });
      expect(registryReads).toBe(0);
    } finally {
      await writeFile(path, original);
    }
  });

  test("fails closed when Waves disappears at the final JIT observation", async () => {
    const path = join(cwd, authority.waves);
    const original = await readFile(path);
    let observations = 0;
    registryReads = 0;
    try {
      expect(await resolveDelegation(request(planned(), { admission: { path: "planned", authority } }), {
        ...options,
        subjectBuilder: async (...args) => {
          observations++;
          const subject = await buildPlannedSubject(...args);
          if (observations === 1) await rm(path);
          return subject;
        },
      })).toMatchObject({ status: "blocked", code: "authority_drift" });
      expect(observations).toBe(2);
      expect(registryReads).toBe(0);
    } finally {
      await writeFile(path, original);
    }
  });

  test.each(["work", "plan", "waves"] as const)("rejects missing and duplicate %s context references", async (member) => {
    const missing = planned();
    missing.context = missing.context.filter((item) => !("ref" in item) || item.ref !== authority[member]);
    expect(await resolveDelegation({ ...request(missing), admission: { path: "planned", authority } }, options))
      .toMatchObject({ status: "blocked", code: "missing_authority" });
    const duplicate = planned();
    duplicate.context = [...duplicate.context, { ref: `./${authority[member]}`, purpose: "Duplicate." }];
    expect(await resolveDelegation({ ...request(duplicate), admission: { path: "planned", authority } }, options))
      .toMatchObject({ status: "blocked", code: "missing_authority" });
  });
  test.each([undefined, null, [], "", 42].map((waves) => [waves]))("rejects malformed waves selector %p", async (waves) => {
    expect(await resolveDelegation({ ...request(planned()), admission: { path: "planned", authority: { ...authority, waves } } }, options))
      .toMatchObject({ status: "blocked", code: "invalid_admission" });
  });

  test.each([["plan.md", "waves.md"], ["stage--plan.md", "stage--waves.md"], ["stage--plan-one.md", "stage--waves-one.md"]])("accepts exact matched %s / %s with normalized paths", async (plan, waves) => {
    const selected = { work: authority.work, plan: `docs/works/admission/${plan}`, waves: `docs/works/admission/${waves}` };
    for (const ref of Object.values(selected)) await writeFile(join(cwd, ref), "fixture\n");
    const context = Object.values(selected).map((ref) => ({ ref: `./${ref}`, purpose: "Selected." }));
    const result = await resolveDelegation({ ...request(handoff({ context })), admission: { path: "planned", authority: selected } }, options);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      const normalized = Bun.YAML.parse(result.prompt) as Handoff;
      expect(normalized.context).toHaveLength(3);
      for (const item of normalized.context) expect("ref" in item && item.ref).toMatch(/\/docs\/works\/admission\//);
    }
  });

  test("preserves planned admission and orders final JIT before resolution metadata", async () => {
    registryReads = 0;
    const events: string[] = [];
    const result = await resolveDelegation({
      ...request(planned()),
      admission: { path: "planned", authority },
    }, {
      ...options,
      subjectBuilder: async (...args) => { events.push("subject"); return buildPlannedSubject(...args); },
      modelRegistry: { getAvailable: () => { events.push("registry"); return options.modelRegistry.getAvailable(); } },
    });
    events.push("returned");
    expect(result.status).toBe("resolved");
    expect(events).toEqual(["subject", "subject", "registry", "returned"]);
    expect(Object.keys(result).sort()).toEqual(["model", "prompt", "status", "thinking"]);
    expect(registryReads).toBe(1);
  });

  test("rejects directory, member, prefix, and slice mismatches", async () => {
    const mismatches = [
      { work: authority.work, plan: "docs/works/admission/nested/plan-slice.md", waves: "docs/works/admission/nested/waves-slice.md" },
      { work: authority.work, plan: "docs/works/admission/plan-one.md", waves: "docs/works/admission/waves-two.md" },
      { work: authority.work, plan: "docs/works/admission/a--plan-slice.md", waves: "docs/works/admission/b--waves-slice.md" },
      { work: authority.work, plan: authority.waves, waves: authority.plan },
      { work: authority.work, plan: authority.plan, waves: "docs/works/admission/plan-other.md" },
      { work: authority.work, plan: "docs/works/admission/a--plan-slice.md", waves: authority.waves },
      { work: "docs/works/admission/not-work.md", plan: authority.plan, waves: authority.waves },
      { work: authority.work, plan: authority.plan, waves: "docs/works/admission/waves.md" },
    ];
    for (const invalidAuthority of mismatches) {
      for (const ref of Object.values(invalidAuthority)) {
        await mkdir(join(cwd, ref, ".."), { recursive: true });
        await writeFile(join(cwd, ref), "fixture\n");
      }
      const context = Object.values(invalidAuthority).map((ref) => ({ ref, purpose: "Selected." }));
      expect(await resolveDelegation({ ...request(handoff({ context })), admission: { path: "planned", authority: invalidAuthority } }, options))
        .toMatchObject({ status: "blocked", code: "invalid_admission" });
    }
  });

  test.each(["work", "plan", "waves"] as const)("blocks %s byte drift before Registry observation", async (member) => {
    registryReads = 0;
    let observations = 0;
    const result = await resolveDelegation({ ...request(planned()), admission: { path: "planned", authority } }, {
      ...options,
      subjectBuilder: async (...args) => {
        const subject = await buildPlannedSubject(...args);
        observations++;
        if (observations === 1) await writeFile(join(cwd, authority[member]), "changed\n", "utf8");
        return subject;
      },
    });
    expect(result).toMatchObject({ status: "blocked", code: "authority_drift" });
    expect(registryReads).toBe(0);
    expect(observations).toBe(2);
    await writeFile(join(cwd, authority[member]), `${member}\n`, "utf8");
  });
});

describe("Handler Result parsing", () => {
  test.each(["completed", "partial", "blocked", "failed"] as const)("preserves the full %s Result and artifacts without conflating terminal statuses", (status) => {
    const result = {
      status,
      summary: "Selected Waves item only.",
      report: "## Evidence\nFocused checks ran.\n\n## Limitations\nNo live bootstrap acceptance.\n",
      artifacts: [{ ref: "checks/result.md", purpose: "Focused evidence." }],
    };
    expect(parseHandlerResult(result)).toEqual({ valid: true, result });
    expect(parseHandlerResult(Bun.YAML.stringify(result))).toEqual({ valid: true, result });
    expect(parseHandlerResult({ status, summary: result.summary, report: result.report }))
      .toEqual({ valid: true, result: { status, summary: result.summary, report: result.report } });
  });

  test.each([
    ["summary-only notification", { status: "completed", summary: "Done." }],
    ["missing status", { summary: "Done.", report: "Evidence." }],
    ["missing summary", { status: "completed", report: "Evidence." }],
    ["empty report", { status: "completed", summary: "Done.", report: " " }],
    ["non-string report", { status: "completed", summary: "Done.", report: { evidence: "Checks." } }],
    ["multiple Results", [{ status: "completed", summary: "One.", report: "Evidence." }, { status: "blocked", summary: "Two.", report: "Missing prerequisite." }]],
    ["bundled Results", { results: [{ status: "completed", summary: "Done.", report: "Evidence." }] }],
    ["malformed artifact", { status: "completed", summary: "Done.", report: "Evidence.", artifacts: [{ ref: "checks/result.md" }] }],
    ["invalid YAML", "status: ["],
  ])("rejects %s without inventing a full Result", (_label, input) => {
    const parsed = parseHandlerResult(input);
    expect(parsed.valid).toBeFalse();
    expect(parsed).not.toHaveProperty("result");
  });
  test.each(["suggestedNext", "nextAction", "nextSkill"])("rejects workflow field %s", (field) => {
    expect(parseHandlerResult({ status: "completed", summary: "Done.", report: "Evidence.", [field]: "implement" }).valid)
      .toBe(false);
  });
});

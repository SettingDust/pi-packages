import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPlannedSubject, canonicalJson, canonicalPath } from "../src/admission.js";
import {
  buildResolverSchema,
  parseHandlerResult,
  resolveDelegation,
  type Handoff,
  type ModelRole,
  type PlannedAdmission,
  type ResolveOptions,
  type SkillSummary,
} from "../src/protocol.js";

const skills: SkillSummary[] = [
  { name: "spec-driven-development", description: "Coordinate durable software delivery." },
  { name: "research-deep", description: "Investigate architecture and risk." },
  { name: "external-review", description: "Project-provided independent review." },
];

const roles: ModelRole[] = [
  { name: "standard", description: "Normal multi-step work.", model: "test/standard", thinking: "medium", available: true },
  { name: "offline", description: "Unavailable model.", model: "test/offline", thinking: "high", available: false },
];

const atomic = { path: "atomic", basis: ["The change is bounded."], verification: ["Run the focused protocol test."] } as const;
let cwd: string;
let readableRef: string;
let authorityDir: string;
let options: ResolveOptions;

beforeAll(async () => {
  cwd = await mkdtemp(join(tmpdir(), "pi-harness-"));
  readableRef = join(cwd, "context.md");
  authorityDir = join(cwd, "docs", "works", "admission");
  await mkdir(authorityDir, { recursive: true });
  await writeFile(readableRef, "context", "utf8");
  await writeFile(join(authorityDir, "work.md"), "work\r\n", "utf8");
  await writeFile(join(authorityDir, "plan-slice.md"), "plan\r", "utf8");
  await writeFile(join(authorityDir, "tasks-slice.md"), "tasks\n", "utf8");
  options = { skills, roles, cwd };
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

function request(candidate: Handoff = handoff(), admission: unknown = atomic, modelRole = "standard") {
  return { handoff: candidate, admission, modelRole };
}

function plannedHandoff(): Handoff {
  return handoff({
    context: [
      { ref: "docs/works/admission/work.md", purpose: "Work authority." },
      { ref: "docs/works/admission/plan-slice.md", purpose: "Plan authority." },
      { ref: "docs/works/admission/tasks-slice.md", purpose: "Tasks authority." },
    ],
  });
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
    const second = buildResolverSchema([{ name: "diagnose", description: "Find root cause." }], [{ ...roles[1]!, name: "advanced", available: true }]);
    expect(first.primarySkill.enum).not.toEqual(second.primarySkill.enum);
    expect(second.primarySkill.enum).toEqual(["diagnose"]);
    expect(second.modelRole.enum).toEqual(["advanced"]);
  });
});

describe("admission resolution", () => {
  test("resolves a valid atomic Handoff without inlining references or admission", async () => {
    const result = await resolveDelegation(request(), options);
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    const prompt = Bun.YAML.parse(result.prompt) as Handoff;
    expect(prompt.context[0]).toEqual({ ref: await canonicalPath(cwd, readableRef), purpose: "Accepted protocol context." });
    expect(result.prompt).not.toContain("context\n");
    expect(result.prompt).not.toContain("modelRole");
    expect(result.prompt).not.toContain("admission");
    expect(result.model).toBe("test/standard");
    expect(result.thinking).toBe("medium");
  });

  test("defaults omitted companionSkills to an empty list", async () => {
    const candidate = handoff();
    delete (candidate as Partial<Handoff>).companionSkills;
    const result = await resolveDelegation(request(candidate), options);
    if (result.status === "resolved") expect((Bun.YAML.parse(result.prompt) as Handoff).companionSkills).toEqual([]);
  });

  test("rejects explicit null companionSkills", async () => {
    const result = await resolveDelegation(request({ ...handoff(), companionSkills: null as unknown as string[] }), options);
    expect(result).toMatchObject({ status: "blocked", code: "invalid_config" });
  });

  for (const admissionPath of ["atomic", "planned"] as const) {
    test.each([
      ["Resolver root", (input: any) => { input.receipt = "model-supplied"; }],
      ["Handoff", (input: any) => { input.handoff.sessionId = "model-supplied"; }],
      ["context item", (input: any) => { input.handoff.context[0].digest = "model-supplied"; }],
    ])(`rejects capability-shaped input at %s under ${admissionPath} admission`, async (_location, addCapability) => {
      const authority = { work: "docs/works/admission/work.md", plan: "docs/works/admission/plan-slice.md", tasks: "docs/works/admission/tasks-slice.md" };
      const input = admissionPath === "atomic"
        ? request()
        : request(plannedHandoff(), { path: "planned", authority });
      addCapability(input);
      let observations = 0;
      const result = await resolveDelegation(input, {
        ...options,
        subjectBuilder: async (subjectCwd, selectors, subjectHandoff) => {
          observations++;
          return buildPlannedSubject(subjectCwd, selectors, subjectHandoff);
        },
      });
      expect(result).toMatchObject({ status: "blocked", code: "invalid_config" });
      expect(result).not.toHaveProperty("prompt");
      expect(observations).toBe(0);
    });
  }

  test("accepts capability words in ordinary Handoff prose", async () => {
    const candidate = handoff({
      objective: "Explain receipt and session behavior.",
      context: [{ inline: "A receipt or session word in prose is not a capability.", purpose: "Scope." }],
    });
    expect(await resolveDelegation(request(candidate), options)).toMatchObject({ status: "resolved" });
  });

  test("materializes omitted optional arrays before planned subject hashing", async () => {
    const authority = { work: "docs/works/admission/work.md", plan: "docs/works/admission/plan-slice.md", tasks: "docs/works/admission/tasks-slice.md" };
    const candidate = plannedHandoff();
    delete candidate.constraints;
    delete candidate.deliverables;
    const result = await resolveDelegation({ handoff: candidate, admission: { path: "planned", authority }, modelRole: "standard" }, options);
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    const prompt = Bun.YAML.parse(result.prompt) as Handoff;
    expect(prompt.constraints).toEqual([]);
    expect(prompt.deliverables).toEqual([]);
    expect(await buildPlannedSubject(cwd, authority, {
      ...candidate,
      constraints: [],
      deliverables: [],
    })).toMatchObject({ subjectSha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
  });

  test("planned admission performs current-call validation and does not leak admission into the prompt", async () => {
    const result = await resolveDelegation({ handoff: plannedHandoff(), admission: { path: "planned", authority: { work: "docs/works/admission/work.md", plan: "docs/works/admission/plan-slice.md", tasks: "docs/works/admission/tasks-slice.md" } }, modelRole: "standard" }, options);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") expect(Bun.YAML.parse(result.prompt)).not.toHaveProperty("admission");
  });

  test.each(["work", "plan"] as const)("fails closed when %s bytes change between subject observations", async (member) => {
    const authority = { work: "docs/works/admission/work.md", plan: "docs/works/admission/plan-slice.md", tasks: "docs/works/admission/tasks-slice.md" };
    const path = join(authorityDir, member === "work" ? "work.md" : "plan-slice.md");
    const original = await Bun.file(path).arrayBuffer();
    let observations = 0;
    try {
      const result = await resolveDelegation({ handoff: plannedHandoff(), admission: { path: "planned", authority }, modelRole: "standard" }, {
        ...options,
        subjectBuilder: async (subjectCwd, selectors, subjectHandoff) => {
          const subject = await buildPlannedSubject(subjectCwd, selectors, subjectHandoff);
          observations++;
          if (observations === 1) await writeFile(path, "changed\n", "utf8");
          return subject;
        },
      });
      expect(result).toMatchObject({ status: "blocked", code: "authority_drift" });
      expect(observations).toBe(2);
    } finally {
      await writeFile(path, new Uint8Array(original));
    }
  });


  test("blocks malformed atomic evidence", async () => {
    expect(await resolveDelegation(request(handoff(), { path: "atomic", basis: [], verification: ["check"] }), options)).toMatchObject({ status: "blocked", code: "invalid_atomic_basis" });
    expect(await resolveDelegation(request(handoff(), { path: "atomic", basis: ["check"], verification: ["check"], receipt: "fake" }), options)).toMatchObject({ status: "blocked", code: "invalid_admission" });
  });


  test("binds one exact authority tuple to context and preserves invalid_reference precedence", async () => {
    const missing = { path: "planned", authority: { work: "missing.md", plan: "plan.md", tasks: "tasks.md" } };
    expect(await resolveDelegation(request(handoff({ context: [{ ref: "missing-context.md", purpose: "Required." }] }), missing), options)).toMatchObject({ status: "blocked", code: "invalid_reference" });
    expect(await resolveDelegation(request(plannedHandoff(), { path: "planned", authority: { work: "docs/works/admission/work.md", plan: "docs/works/admission/plan-slice.md", tasks: "docs/works/admission/other.md" } }), options)).toMatchObject({ status: "blocked", code: "missing_authority" });
  });

  test("rejects forbidden receipt-shaped planned input", async () => {
    const admission = { path: "planned", authority: { work: "work.md", plan: "plan.md", tasks: "tasks.md" }, subjectSha256: "fake" };
    expect(await resolveDelegation(request(plannedHandoff(), admission), options)).toMatchObject({ status: "blocked", code: "invalid_admission" });
  });


  test("production admission API rejects the removed knownMaterialDeviation field", async () => {
    type LegacyFieldAbsent = "knownMaterialDeviation" extends keyof PlannedAdmission ? false : true;
    const legacyFieldAbsent: LegacyFieldAbsent = true;
    expect(legacyFieldAbsent).toBeTrue();

    const admission = {
      path: "planned",
      authority: { work: "work.md", plan: "plan.md", tasks: "tasks.md" },
      knownMaterialDeviation: false,
    };
    expect(await resolveDelegation(request(plannedHandoff(), admission), options)).toMatchObject({ status: "blocked", code: "invalid_admission" });
  });

  test("computes repeatable canonical document and subject digests", async () => {
    const authority = { work: "docs/works/admission/work.md", plan: "docs/works/admission/plan-slice.md", tasks: "docs/works/admission/tasks-slice.md" };
    const first = await buildPlannedSubject(cwd, authority, { ...plannedHandoff(), constraints: plannedHandoff().constraints ?? [], deliverables: plannedHandoff().deliverables ?? [], context: plannedHandoff().context as any });
    const second = await buildPlannedSubject(cwd, authority, { ...plannedHandoff(), constraints: plannedHandoff().constraints ?? [], deliverables: plannedHandoff().deliverables ?? [], context: plannedHandoff().context as any });
    expect(first).toEqual(second);
    expect(first.work.sha256).not.toBe(first.plan.sha256);
    expect(canonicalJson({ text: "quote\" slash\\ tab\t", control: "\u0001", scalar: "中文😀" })).toBe('{"text":"quote\\\" slash\\\\ tab\\t","control":"\\u0001","scalar":"中文😀"}');
    expect(() => canonicalJson("\ud800")).toThrow();
  });

  test("blocks missing admission before a Handler can start", async () => {
    expect(await resolveDelegation({ handoff: handoff(), modelRole: "standard" }, options)).toMatchObject({ status: "blocked", code: "invalid_admission" });
  });

  test.each([
    ["unknown primary", handoff({ primarySkill: "missing" })],
    ["duplicate companions", handoff({ companionSkills: ["research-deep", "research-deep"] })],
    ["primary repeated as companion", handoff({ companionSkills: ["spec-driven-development"] })],
  ])("blocks %s", async (_name, candidate) => {
    expect(await resolveDelegation(request(candidate), options)).toMatchObject({ status: "blocked", code: "invalid_skill" });
  });

  test.each([
    ["unknown", "missing", roles, "unknown_role"],
    ["unavailable", "offline", roles, "unavailable_model"],
    ["unsupported thinking", "invalid-thinking", [...roles, { name: "invalid-thinking", description: "Invalid thinking.", model: "test/model", thinking: "xhigh", available: false, unavailableCode: "invalid_thinking" as const }], "invalid_thinking"],
    ["empty description", "broken-description", [...roles, { name: "broken-description", description: "", model: "test/model", thinking: "low", available: true }], "invalid_config"],
    ["empty model", "broken-model", [...roles, { name: "broken-model", description: "Broken.", model: "", thinking: "low", available: true }], "unavailable_model"],
    ["empty thinking", "broken-thinking", [...roles, { name: "broken-thinking", description: "Broken.", model: "test/model", thinking: "", available: true }], "invalid_thinking"],
  ])("blocks %s Role configuration", async (_name, modelRole, roleFixture, code) => {
    expect(await resolveDelegation(request(handoff(), atomic, modelRole as string), { ...options, roles: roleFixture as ModelRole[] })).toMatchObject({ status: "blocked", code });
  });

  test.each([
    ["null model", null, "low", "unavailable_model"],
    ["numeric model", 42, "low", "unavailable_model"],
    ["null thinking", "test/model", null, "invalid_thinking"],
    ["numeric thinking", "test/model", 42, "invalid_thinking"],
  ])("blocks %s Role configuration without subject observation", async (name, model, thinking, code) => {
    let observations = 0;
    const result = await resolveDelegation(request(
      plannedHandoff(),
      { path: "planned", authority: { work: "docs/works/admission/work.md", plan: "docs/works/admission/plan-slice.md", tasks: "docs/works/admission/tasks-slice.md" } },
      `malformed-${name}`,
    ), {
      ...options,
      roles: [...roles, { name: `malformed-${name}`, description: "Malformed.", model, thinking, available: true } as ModelRole],
      subjectBuilder: async (subjectCwd, selectors, subjectHandoff) => {
        observations++;
        return buildPlannedSubject(subjectCwd, selectors, subjectHandoff);
      },
    });
    expect(result).toMatchObject({ status: "blocked", code });
    expect(observations).toBe(0);
  });
});

describe("Handler Result parsing", () => {
  test.each(["completed", "partial", "blocked", "failed"] as const)("accepts %s", (status) => {
    const parsed = parseHandlerResult(Bun.YAML.stringify({ status, summary: `${status} summary`, report: "Evidence-backed report.", artifacts: [{ ref: "not-created-yet.md", purpose: "Report-only artifact reference." }] }));
    expect(parsed).toMatchObject({ valid: true, result: { status } });
  });

  test.each(["suggestedNext", "nextAction", "nextSkill"])("rejects workflow field %s", (field) => {
    expect(parseHandlerResult({ status: "completed", summary: "Done.", report: "Evidence.", [field]: "implement" }).valid).toBe(false);
  });

  test("rejects malformed YAML and missing required fields", () => {
    expect(parseHandlerResult("[invalid").valid).toBe(false);
    expect(parseHandlerResult({ status: "completed", summary: "Done." }).valid).toBe(false);
  });
});


describe("validation precedence and Windows paths", () => {
  test("ordinary validation precedes malformed admission", async () => {
    expect(await resolveDelegation(request(handoff({ primarySkill: "missing" }), { path: "unknown" }), options)).toMatchObject({ status: "blocked", code: "invalid_skill" });
    expect(await resolveDelegation(request(handoff({ context: [{ ref: "missing-context.md", purpose: "Required." }] }), { path: "unknown" }), options)).toMatchObject({ status: "blocked", code: "invalid_reference" });
  });

  test("accepts lowercase-drive absolute references on Windows-shaped paths", async () => {
    const absolute = await canonicalPath(cwd, readableRef);
    const drivePath = /^[a-zA-Z]:/.test(absolute) ? `${absolute[0] === absolute[0]!.toUpperCase() ? absolute[0]!.toLowerCase() : absolute[0]!.toUpperCase()}${absolute.slice(1)}` : absolute;
    expect(await canonicalPath(cwd, drivePath)).toBe(absolute);
  });
});

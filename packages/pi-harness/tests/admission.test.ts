import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildPlannedSubject,
  canonicalDocumentSnapshot,
  canonicalJson,
  canonicalPath,
  validateTuple,
  type PlannedSubject,
} from "../src/admission.js";

test("planned subject preserves canonical set and Handoff identity", async () => {
  const fixture = await subjectFixture();
  try {
    const second = await buildPlannedSubject(fixture.cwd, fixture.authority, fixture.handoff);
    expect(second).toEqual(fixture.subject);
    expect(second.setSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(second.handoffSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(second.subjectSha256).toMatch(/^[0-9a-f]{64}$/);

    const changed = await buildPlannedSubject(fixture.cwd, fixture.authority, {
      ...fixture.handoff,
      objective: "A different Handoff under the same authority set.",
    });
    expect(changed.setSha256).toBe(second.setSha256);
    expect(changed.handoffSha256).not.toBe(second.handoffSha256);
    expect(changed.subjectSha256).not.toBe(second.subjectSha256);
    expect(changed).not.toHaveProperty("planAuthorizationSha256");
    expect(changed).not.toHaveProperty("a3AuthoritySha256");
    expect(changed).not.toHaveProperty("a3DecisionSha256");
  } finally {
    await fixture.dispose();
  }
});

test("planned Handoff identity covers Skills, ordered context, constraints, and deliverables", async () => {
  const fixture = await subjectFixture();
  try {
    const baseline = fixture.subject;
    for (const handoff of [
      { ...fixture.handoff, primarySkill: "implement-plan" },
      { ...fixture.handoff, companionSkills: ["research-quick"] },
      { ...fixture.handoff, context: [...fixture.handoff.context].reverse() },
      { ...fixture.handoff, context: fixture.handoff.context.map((item) => ({ ...item, purpose: "Changed purpose." })) },
      { ...fixture.handoff, context: [...fixture.handoff.context, { inline: "Additional scope.", purpose: "Scope." }] },
      { ...fixture.handoff, constraints: ["Changed constraint."] },
      { ...fixture.handoff, deliverables: ["Changed deliverable."] },
    ]) {
      const changed = await buildPlannedSubject(fixture.cwd, fixture.authority, handoff);
      expect(changed.setSha256).toBe(baseline.setSha256);
      expect(changed.handoffSha256).not.toBe(baseline.handoffSha256);
      expect(changed.subjectSha256).not.toBe(baseline.subjectSha256);
    }
    expect(baseline).toHaveProperty("waves", { path: await canonicalPath(fixture.cwd, fixture.authority.waves), sha256: baseline.waves.sha256 });
    expect(baseline).not.toHaveProperty("tasks");
  } finally {
    await fixture.dispose();
  }
});

test("canonical document digest preserves BOM and normalizes line endings", async () => {
  const fixture = await subjectFixture(Uint8Array.from([0xef, 0xbb, 0xbf, 0x61, 0x0d, 0x0a, 0x62, 0x0d, 0x63]));
  try {
    expect(fixture.subject.work.sha256).toBe("1a436bdf3c8e6803688ebf5a0492d0957d0b4f16306074734f3a4f038f05a736");
  } finally {
    await fixture.dispose();
  }
});

test("canonical document snapshot derives text and digest from one canonical buffer", async () => {
  const fixture = await subjectFixture();
  try {
    expect(await canonicalDocumentSnapshot(fixture.authority.plan)).toEqual({
      text: "plan\n",
      sha256: fixture.subject.plan.sha256,
    });
  } finally {
    await fixture.dispose();
  }
});

test("canonical JSON preserves key order and rejects unpaired surrogates", () => {
  expect(canonicalJson({ text: "quote\" slash\\ tab\t", scalar: "中文😀" }))
    .toBe('{"text":"quote\\\" slash\\\\ tab\\t","scalar":"中文😀"}');
  expect(() => canonicalJson("\ud800")).toThrow("unpaired surrogate");
});

test("planned tuple keeps Plan and Waves as direct matched members", () => {
  expect(() => validateTuple({
    work: "/workspace/docs/works/demo/work.md",
    plan: "/workspace/docs/works/demo/nested/plan-slice.md",
    waves: "/workspace/docs/works/demo/nested/waves-slice.md",
  })).toThrow("authority members must share one directory");
  expect(() => validateTuple({
    work: "/workspace/docs/works/demo/work.md",
    plan: "/workspace/docs/works/demo/plan-one.md",
    waves: "/workspace/docs/works/demo/waves-two.md",
  })).toThrow("plan/waves slices must match");
  expect(() => validateTuple({
    work: "/workspace/docs/works/demo/work.md",
    plan: "/workspace/docs/works/demo/a--plan-slice.md",
    waves: "/workspace/docs/works/demo/b--waves-slice.md",
  })).toThrow("plan/waves prefixes must match");
});

async function subjectFixture(work: string | Uint8Array = "work\n"): Promise<{
  subject: PlannedSubject;
  cwd: string;
  authority: { work: string; plan: string; waves: string };
  handoff: {
    objective: string;
    primarySkill: string;
    companionSkills: string[];
    context: Array<{ ref: string; purpose: string } | { inline: string; purpose: string }>;
    constraints: string[];
    deliverables: string[];
  };
  dispose(): Promise<void>;
}> {
  const cwd = await mkdtemp(join(process.cwd(), "pi-harness-admission-"));
  const directory = join(cwd, "docs", "works", "demo");
  await mkdir(directory, { recursive: true });
  const authority = {
    work: join(directory, "work.md"),
    plan: join(directory, "plan.md"),
    waves: join(directory, "waves.md"),
  };
  await writeFile(authority.work, work);
  await writeFile(authority.plan, "plan\n");
  await writeFile(authority.waves, "waves\n");
  const handoff = {
    objective: "test",
    primarySkill: "implement-change",
    companionSkills: [],
    context: Object.entries(authority).map(([purpose, ref]) => ({ ref, purpose })),
    constraints: [],
    deliverables: [],
  };
  const subject = await buildPlannedSubject(cwd, authority, handoff);
  return { subject, cwd, authority, handoff, dispose: () => rm(cwd, { recursive: true, force: true }) };
}

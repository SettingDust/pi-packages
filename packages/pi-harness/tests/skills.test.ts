import { describe, expect, test } from "bun:test";
import { loadSkillsFromDir } from "@earendil-works/pi-coding-agent";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const skillsRoot = join(root, "skills");
const expected = [
  "analyze-solution-directions",
  "clarify-intent",
  "clarify-structure",
  "diagnose",
  "documentation",
  "documentation-adr-writing",
  "documentation-domain-driven-design",
  "documentation-plan-writing",
  "documentation-prd-writing",
  "documentation-proposal-writing",
  "documentation-spec-writing",
  "documentation-structure",
  "documentation-tasks-writing",
  "documentation-work",
  "implement-change",
  "implement-plan",
  "llm-instruction-writing",
  "plan-implementation",
  "research-audit",
  "research-compare",
  "research-deep",
  "research-quick",
  "research-source-grounded",
  "research-trace",
  "review-correctness",
  "review-decision",
  "review-evidence",
  "review-security",
  "spec-driven-development",
] as const;

function readSkill(name: string) {
  const text = readFileSync(join(skillsRoot, name, "SKILL.md"), "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/);
  if (!match) throw new Error(`${name} has invalid frontmatter`);
  return { metadata: Bun.YAML.parse(match[1]!) as Record<string, unknown>, body: match[2]! };
}

describe("built-in Skill library", () => {
  test("publishes exactly the specified 29 Skills", () => {
    const actual = readdirSync(skillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map(({ name }) => name)
      .sort();
    expect(actual).toEqual([...expected].sort());
  });

  test.each([...expected])("%s has valid model-visible metadata", (name) => {
    const { metadata, body } = readSkill(name);
    expect(metadata.name).toBe(name);
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).trim().length).toBeGreaterThan(0);
    expect((metadata.description as string).length).toBeLessThanOrEqual(1024);
    expect(metadata["disable-model-invocation"]).toBeUndefined();
    expect(body.trim()).toStartWith("# ");
    expect(body).not.toContain("suggestedNext");
    expect(body).not.toContain("nextAction");
    expect(body).not.toContain("nextSkill");
  });

  test.each(["research-quick", "research-deep", "research-compare", "research-trace", "research-audit"])(
    "%s applies source-grounded evidence discipline",
    (name) => expect(readSkill(name).body).toContain("research-source-grounded"),
  );

  test.each(["plan-implementation", "documentation-tasks-writing"])(
    "%s separates independent outcomes despite execution conflicts",
    (name) => {
      const { body } = readSkill(name);
      expect(body).toContain("Keep independently valuable outcomes separate even when their writes or other effects conflict");
      expect(body).toContain("serialize conflicting tasks and dependencies");
    },
  );

  test("spec-driven preparation completes without implementation checks", () => {
    const { body } = readSkill("spec-driven-development");
    expect(body).toContain("Complete each delegated outcome against its own authority and evidence checks");
    expect(body).toContain("Require implementation checks and resolve unexplained implementation drift only when implementation is the delegated outcome");
  });

  test("package metadata exposes the Skill directory", () => {
    const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(manifest.files).toContain("skills");
    expect(manifest.pi.skills).toEqual(["./skills"]);
  });

  test("Pi discovers every Skill without diagnostics", () => {
    const result = loadSkillsFromDir({ dir: skillsRoot, source: "pi-harness-test" });
    expect(result.diagnostics).toEqual([]);
    expect(result.skills.map(({ name }) => name).sort()).toEqual([...expected].sort());
    expect(result.skills.every(({ disableModelInvocation }) => !disableModelInvocation)).toBeTrue();
  });
});

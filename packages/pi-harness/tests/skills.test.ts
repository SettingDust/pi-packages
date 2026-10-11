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
  "delegation-strategy",
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
  "pragmatic-delivery",
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
  test("publishes exactly the specified 31 Skills", () => {
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

  test.each(["plan-implementation"])(
    "%s separates independent outcomes despite execution conflicts",
    (name) => {
      const { body } = readSkill(name);
      expect(body).toContain("Keep independently valuable outcomes separate even when their writes or other effects conflict");
      expect(body).toContain("serialize conflicting items and dependencies");
    },
  );

  test("historical Tasks Skill cannot become the new executable path", () => {
    const { metadata, body } = readSkill("documentation-tasks-writing");
    expect(metadata.description).toContain("Do not use for new planned work");
    expect(body).toContain("do not silently reinterpret Tasks as Waves");
    expect(body).toContain("replacement Work/Plan/Waves tuple");
  });

  test("new-plan Skills and discovery select Waves as the only executable graph", () => {
    for (const name of ["documentation", "documentation-structure", "documentation-work", "documentation-plan-writing", "plan-implementation", "implement-plan", "spec-driven-development"]) {
      const { body } = readSkill(name);
      expect(body).toContain("Waves");
      expect(body).not.toMatch(/Plan\/Tasks|Plan\+Tasks|Plan and Tasks/);
    }
    const { body } = readSkill("documentation-plan-writing");
    for (const rule of ["sole executable graph", "one Handler and one Result", "prerequisite item IDs", "write ownership", "acyclic dependencies", "no dependencies or global barrier", "`partial`, `failed`, `blocked`", "explicit migration", "silent fallback"]) {
      expect(body).toContain(rule);
    }
    const library = readFileSync(join(root, "docs/spec/skill-library.md"), "utf8");
    expect(library).toContain("Work/Context/Plan/Waves");
    expect(library).toContain("sole executable graph");
    expect(library).toContain("historical Tasks remain compatibility records requiring explicit migration");
    expect(library).not.toMatch(/Plan\/Tasks|Plan and Tasks|derive executable Tasks/);
    expect(readFileSync(join(root, "docs/README.md"), "utf8")).toContain("Work/Context/Plan/Waves");
  });

  test("spec-driven preparation completes without implementation checks", () => {
    const { body } = readSkill("spec-driven-development");
    expect(body).toContain("Complete each delegated outcome against its own authority and evidence checks");
    expect(body).toContain("Require implementation checks and resolve unexplained implementation drift only when implementation is the delegated outcome");
  });

  test("delegation strategy owns admission and preparation boundaries", () => {
    const { body } = readSkill("delegation-strategy");
    for (const phrase of [
      "Classify each outcome by its complete intended effects and applicable authorization",
      "Use `standalone` for authorized work that is not bound to a selected executable Work/Plan/Waves tuple",
      "Use `planned` for graph-bound work or work whose required implementation prerequisites, gates, readiness, conflicts, or scope confirmation belong to a selected Work/Plan/Waves tuple",
      "Missing required implementation prerequisites are a block; never relabel that work `standalone`",
      "Size, complexity, file count, Skill name, and tuple availability alone never select a path",
      "Treat preparation as an effect category under `standalone`, not a third admission path",
      "Future output targets belong in ordinary Handoff text or inline context and are not actual refs",
      "Preparation excludes production code, configuration, dependencies, lockfiles, LLM instructions, installation, reload, deployment, Git writes, and execution of the prepared plan",
      "Loading this Skill or a domain Skill, accepted authority, a path/readiness claim, a Handoff, successful Resolver admission, or a completed preparation Result grants neither permission nor implementation confirmation",
      "If the bundle contains more than one independently valuable outcome for one Handler, block before project work and split it at the Router",
      "If this Skill is missing, hidden, unreadable, incomplete, or conflicts with standing instructions, block new delegation rather than substituting a remembered method, an inline fallback, or another Handler",
      "The Resolver remains structural and binding-only",
      "It does not classify effects, infer permission, choose an alternate tool, fabricate a planned tuple, use an old `atomic` or `preparation` path, fallback, interpret Handler Results, or advance work",
      "If the effective runtime lacks `standalone`, report the pre-launch admission block without fallback or fabricated tuple",
    ]) expect(body).toContain(phrase);
    expect(body.indexOf("Classify each outcome")).toBeLessThan(body.indexOf("choose the domain primary Skill"));
    expect(body.indexOf("Treat preparation as an effect category")).toBeLessThan(body.indexOf("choose the domain primary Skill"));
  });

  test.each(["delegation-strategy", "spec-driven-development", "documentation", "plan-implementation", "documentation-plan-writing"])("%s preserves A1-A10 authority contrasts before planning", (name) => {
    // Source clauses only: no real model decisions or Skill-loading evidence.
    const body = readSkill(name).body.replaceAll("`", "");
    const authorityCases =
    [
      [
        "A1 / D1",
        [
          "reuse (adequate",
          "update (",
          "create (missing required authority",
          "skip (no change needed or not applicable)",
          "blocked (unresolved coverage, ownership, evidence, permission, or intent)",
          "owning boundary, existing or intended path",
          "one-sentence evidence-backed reason"
        ]
      ],
      [
        "A2 / D4",
        [
          "same owner or decision identity"
        ]
      ],
      [
        "A3 / D1+D4",
        [
          "distinct accepted ADR lifecycle",
          "Unknown ownership is unresolved; intended outputs are not readable references"
        ]
      ],
      [
        "A4 / D4+D6",
        [
          "unaccepted choice as an accepted ADR"
        ]
      ],
      [
        "A5 / D5",
        [
          "new ADR, Spec, Plan, or repeat approval of unchanged confirmed work",
          "Assessment supplies neither writing permission nor implementation confirmation"
        ]
      ],
      [
        "A6 / D2",
        [
          "missing, false, materially incomplete, or subject to an important unresolved coverage question",
          "primary, companion, or a conditionally required method",
          "Required reconciliation must be complete before dependent planning"
        ]
      ],
      [
        "A7 / D3",
        [
          "Reuse reliable assessment covering current scope, decisions, owners, and relevant authority versions",
          "material changes, contradictions, or important uncertainty require reassessment only of the affected portion"
        ]
      ],
      [
        "A8 / D2+D5",
        [
          "Settled evidence permits direct entry to a narrow owning writer without waiving assessment, authority, or authorization duties",
          "SDD is not the exclusive ADR entrance or a mandatory reload at every stage or Handler call"
        ]
      ],
      [
        "A10 / D6",
        [
          "Result/Waves/Todo"
        ]
      ]
    ];
    for (const [scenario, clauses] of authorityCases as [string, string[]][]) {
      for (const clause of clauses) expect(body, scenario).toContain(clause);
    }
    expect(body).toMatch(/evidence (?:and )?gaps for Router-owned (?:user )?communication/);
    expect(body).toMatch(/current (?:delegated )?predicate/);
    if (name !== "spec-driven-development") expect(body).toContain("spec-driven-development");
    expect(body).toMatch(/normal Skill (loading|mechanism)/);
    expect(body).toMatch(/standalone/); // A9 / D5: preserve first-tuple preparation.
    expect(body).toMatch(/future tuple|output targets/);
    expect(body).toMatch(/graph-bound/);
    for (const forbidden of ["Load SDD at every stage", "Create a new ADR for every change", "Assessment authorizes implementation", "Complete all unblocked branches", "Settle material intent with the user before specifying new behavior"]) expect(body).not.toContain(forbidden);
    if (name === "delegation-strategy") {
      expect(body.indexOf("make the PRD, ADR, and Spec assessment visible")).toBeLessThan(body.indexOf("choose the domain primary Skill"));
      expect(body).toContain("missing domain evidence requires one delegated authority-assessment outcome, not Router domain reading or assessment");
    } else {
      expect(body).toMatch(/do not ask the user/i);
      expect(body).toContain("dispatch");
    }
  });

  test("ADR lifecycle keeps the same owner and requires an accepted distinct decision", () => {
    const { body } = readSkill("documentation-adr-writing");
    expect(body).toContain("update the owning decision when its identity remains the same");
    expect(body).toContain("Create a new ADR only for a distinct decision lifecycle");
    expect(body).toContain("Do not present an unaccepted proposal as an accepted ADR");
  });

  test("delegation strategy covers cleanup T1-T16 in lifecycle order", () => {
    const { body } = readSkill("delegation-strategy");
    // Static clauses/order only; this does not run a Router model or validate a provider's deletion effects.
    const cleanupCases = [
      ["T1", [
        "After applying a complete correlated terminal Result and completing the relevant gate and dependency judgment",
        "actively inspect cleanup before handing off to another current outcome, waiting, stopping, or making the final report",
        "When eligible stable targets and a suitable actually callable tool are proven, execute cleanup",
        "When no candidate qualifies or required identity",
      ]],
      ["T2", [
        "A summary or backend terminal status, or an absent, incomplete, uncorrelatable, conflicting, or unapplied Result, cannot justify deletion, completion, or dependency release",
      ]],
      ["T3", [
        "Keep the current record while validation, verification, repair/review, a related user decision, or another coordination responsibility remains, even if its native status is completed",
        "Age or native status alone never qualifies a record",
      ]],
      ["T4", [
        "explicitly close or hand off the current role, retaining necessary evidence in the Result or an ordinary coordination explanation, before requalifying it",
      ]],
      ["T5", [
        "prove clear non-contradictory identity and required fields, an already applied complete correlated terminal Result",
        "no current, active, or unresolved role, and no pending dependency, gate, or confirmation still requiring the record",
        "Local deletion must cover only the exact eligible record or set",
        "preservation of every survivor's fields, relative order, and native status",
      ]],
      ["T6", [
        "Whole-group deletion requires every child and the container's own coordination role to qualify; completed children alone are insufficient",
      ]],
      ["T7", [
        "whole-group deletion must preserve other groups",
        "Full clear requires every record and container role to qualify, with no survivors",
        "Verify the return against that tool's actual contract before claiming exact deletion or full clear and survivor preservation",
      ]],
      ["T8", [
        "Inspect currently callable tools through their real schema, description, and known contract",
        "Prove exact selection granularity, atomic success and failure",
        "and return semantics",
        "Existing stable provider IDs, exact targets, safe filtering, or a single atomic lossless replacement may qualify under any tool name or provider",
        "neither packages/todo nor todo_remove is required",
        "a tool name, package installation, source code, or remembered convention proves no capability",
      ]],
      ["T9", [
        "A tool accepting arbitrary native statuses grants no permission to delete current, active, or unresolved work",
        "Keep partial, failed, and blocked truthful; they may qualify only after explicit resolution or closure of remaining responsibilities and all other proofs, without satisfying an unsatisfied dependent completion predicate",
      ]],
      ["T10", [
        "Do not emulate deletion by setting a reduced list and then transitioning survivors, rewrite statuses to enable deletion, hide UI, or invent an unavailable tool",
      ]],
      ["T11", [
        "Rejected, missing, ambiguous, invalid, or mixed-validity targets must leave the entire projection unchanged atomically",
        "Confirmed failure or rejection is not success",
        "Do not automatically retry failed or unknown cleanup",
      ]],
      ["T12", [
        "rule out concurrent changes to target qualification or contents, same-name recreation or retargeting, and replacement survivor-snapshot drift",
        "Use only an established serialized mutation boundary with stable identities or existing atomic identity/state checks that reject drift without mutation",
        "If stability or safe failure cannot be proven, retain affected records and explain the gap",
      ]],
      ["T13", [
        "an error, missing return, or unknown effect proves neither deletion nor absence of effects",
        "Do not automatically retry failed or unknown cleanup, reconstruct state, or delete further on that evidence",
        "Preserve remaining visible records and report the failed or uncertain effect concretely",
        "cleanup failure does not negate an otherwise completed work Result",
      ]],
      ["T14", [
        "Equivalent duplicate notifications must not repeat Result projection or dependency release, replay deletion, or delete a new same-name record",
        "After cleanup, restart, resume, or replay, uncertain correlation retains visible records; never manufacture identity from a name",
        "An orphan duplicate additionally requires an observable matching identity and non-canonical identity",
      ]],
      ["T15", [
        "On cancellation or changed direction, stop affected unlaunched work and first account for active work and completed effects, then perform this check",
        "Cancellation alone never qualifies unresolved or unlaunched records for deletion",
      ]],
      ["T16", [
        "retain affected Todos and explain the concrete limitation",
        "Report completed work separately from cleanup limitations",
        "Cleanup affects only the Todo projection: never call subagent_remove or delete or modify Results, sessions, manifests, or artifacts",
        "Do not add a capability registry, scheduler, receipt, persistence, new IDs, revision/CAS, or automatic status-driven deletion",
      ]],
    ] as const;
    for (const [, clauses] of cleanupCases) {
      for (const clause of clauses) expect(body).toContain(clause);
    }
    const cleanupOrder = [
      "Before first adoption of summary navigation, ordinary `read` must obtain the complete existing compact JSON envelope",
      "completely decode its `result` and read status, summary, report, artifacts and limitations",
      "Correlate existing `subagentId/generation/status/error` with the known task, selected outcome and current caller context",
      "Already visible complete Results still require full reading and correlation before adoption",
      "updates Todo/Waves with the actual",
      "checks completion predicates, and releases dependencies only when their required predicates hold",
      "Cleanup 1 - Checkpoint.",
      "Cleanup 2 - Qualify records.",
      "Cleanup 3 - Prove capability.",
      "Cleanup 4 - Prove stability.",
      "Cleanup 5 - Execute and verify.",
      "Cleanup 6 - Retain and report.",
      "After this checkpoint, recompute ready branches",
    ].map((clause) => body.indexOf(clause));
    expect(cleanupOrder.every((position) => position >= 0)).toBeTrue();
    expect(cleanupOrder).toEqual([...cleanupOrder].sort((a, b) => a - b));
    expect(body.indexOf("explicitly close or hand off the current role")).toBeLessThan(body.indexOf("For each candidate, prove"));
    for (const obsolete of ["remove only records proven stale", "Use todo_remove for cleanup", "require packages/todo", "setting a reduced list and then transitioning survivors is safe"]) {
      expect(body).not.toContain(obsolete);
    }
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

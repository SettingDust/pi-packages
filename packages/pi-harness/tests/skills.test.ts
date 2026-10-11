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
    expect(body).toContain("completely reads and reliably correlates full Results");
    expect(body).toContain("communicates truthful facts through suitable runtime progress tools or ordinary messages");
    expect(body).toContain("judges release from item evidence and gate predicates independently of display success");
    expect(body).not.toContain("projects truthful Todo state before release decisions");
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
          name === "delegation-strategy" ? "Result/Waves/display" : "Result/Waves/Todo"
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

  test("delegation strategy covers one-way display T1-T16 and independent execution gates", () => {
    const { body } = readSkill("delegation-strategy");
    // Static clauses/order only; no Router model or actual display-tool effects.
    const displayCases = [
      ["T1", [
        "Rebuild, replace, remove, or clear without first closing old Results/roles, preserving old identities/survivors, or accounting for active/unresolved duties",
      ], ["For each candidate, prove", "Age or native status alone never qualifies a record"]],
      ["T2", [
        "Never present partial, failed, blocked, missing or uncertain evidence as success",
        "Existing complete Result reading/correlation, permission, scope, prerequisites/conflicts, and item/Wave gates govern adoption/release independently",
      ], ["cannot justify deletion, completion, or dependency release"]],
      ["T3", [
        "Actual active execution and coordination duties remain independent and visible through ordinary messages when needed",
        "this accounting is not a display-change prerequisite",
      ], ["Keep the current record while validation", "before requalifying it"]],
      ["T4", [
        "Use suitable tools provided by the runtime to report progress and help the user track work",
        "Displays are one-way derived views, not execution authority",
        "Derive only from explicitly selected Work entries, accepted authority, selected Plan/Waves scope, reliable execution facts, and identified coordination outcomes, including selected standalone work",
        "Work is an entry, not sole authority, and display selection does not confirm or rewrite scope",
        "one item per independently observable outcome in selected multi-step work, without merging Results",
      ], ["explicitly close or hand off the current role"]],
      ["T5", [
        "Local removal preserves non-targets under the actual tool contract, not a whole-view continuity requirement",
      ], ["Local deletion must cover only the exact eligible record or set"]],
      ["T6", [
        "Rebuild, replace, remove, or clear without first closing old Results/roles",
        "Local removal preserves non-targets under the actual tool contract",
      ], ["Whole-group deletion requires every child and the container's own coordination role to qualify"]],
      ["T7", [
        "Display success, completion labels, or an empty view do not complete work, release gates, cancel active execution",
        "Never call subagent_remove or delete/modify Results, sessions, manifests, or artifacts for display changes",
      ], ["Full clear requires every record and container role to qualify"]],
      ["T8", [
        "Follow actual runtime contracts, not remembered names or installed packages",
      ], ["single atomic lossless replacement may qualify", "Use only an established serialized mutation boundary with stable identities"]],
      ["T9", [
        "Use source facts, not old UI labels",
        "Report only reliable activity and completion evidence",
        "unstarted/not-yet-eligible work, a current coordination action, withdrawal before launch, confirmed execution cancellation, and unconfirmed cancellation requests",
        "Never present partial, failed, blocked, missing or uncertain evidence as success",
      ], ["A tool accepting arbitrary native statuses grants no permission to delete current, active, or unresolved work", "they may qualify only after explicit resolution"]],
      ["T10", [
        "Judge effects by the actual tool contract and report rejection, partial effects, or uncertainty through ordinary messages",
        "errors/missing returns prove neither success nor no effects",
      ], ["Do not emulate deletion by setting a reduced list and then transitioning survivors"]],
      ["T11", [
        "report rejection, partial effects, or uncertainty through ordinary messages",
        "Do not blindly retry, compensate, or restore old snapshots",
      ], ["Rejected, missing, ambiguous, invalid, or mixed-validity targets must leave the entire projection unchanged atomically"]],
      ["T12", [
        "new same-name display items do not inherit execution identity",
        "Uncertain/conflicting association preserves first established facts and blocks affected adoption/release, not rebuilding/clearing",
      ], ["replacement survivor-snapshot drift", "An orphan duplicate additionally requires"]],
      ["T13", [
        "Judge effects by the actual tool contract and report rejection, partial effects, or uncertainty through ordinary messages",
        "errors/missing returns prove neither success nor no effects",
        "Do not blindly retry, compensate, or restore old snapshots",
        "Unavailable/failed displays neither negate reliable work Results nor block otherwise satisfied admission or adoption",
      ], ["Preserve remaining visible records and report the failed or uncertain effect concretely"]],
      ["T14", [
        "Re-derive established facts without duplicate adoption/release or replayed removals",
        "Uncertain/conflicting association preserves first established facts and blocks affected adoption/release, not rebuilding/clearing",
      ], ["must not repeat Result projection", "uncertain correlation retains visible records"]],
      ["T15", [
        "On cancellation or changed direction, stop affected unlaunched work and report active work and completed effects truthfully; this accounting is not a display-change prerequisite",
        "Actual active execution and coordination duties remain independent",
        "Display success, completion labels, or an empty view do not complete work, release gates, cancel active execution",
      ], ["first account for active work and completed effects, then perform this check", "Cancellation alone never qualifies"]],
      ["T16", [
        "Unavailable/failed displays neither negate reliable work Results nor block otherwise satisfied admission or adoption",
        "Existing complete Result reading/correlation, permission, scope, prerequisites/conflicts, and item/Wave gates govern adoption/release independently",
        "or change execution graph/Work/Plan/Waves predicates/status",
        "Never call subagent_remove or delete/modify Results, sessions, manifests, or artifacts for display changes",
        "add no scheduler, ledger, persistence, IDs, CAS, or automatic status-driven deletion",
      ], ["retain affected Todos and explain the concrete limitation", "When no candidate qualifies or required identity"]],
    ] as const;
    for (const [scenario, clauses, forbidden] of displayCases) {
      for (const clause of clauses) expect(body, scenario).toContain(clause);
      for (const clause of forbidden) expect(body, scenario).not.toContain(clause);
    }
    const adoptionOrder = [
      "Before first adoption of summary navigation, ordinary `read` must obtain the complete existing compact JSON envelope",
      "completely decode its `result` and read status, summary, report, artifacts and limitations",
      "Correlate existing `subagentId/generation/status/error` with the known task, selected outcome and current caller context",
      "Already visible complete Results still require full reading and correlation before adoption",
      "communicates the actual",
      "First adoption requires complete reading and reliable correlation, not a successful display update",
      "Make a fresh Router-owned decision, check completion predicates and Wave gate evidence",
      "independently of display success",
      "each Wave gate separately requires every listed item and its stated verification",
    ].map((clause) => body.indexOf(clause));
    expect(adoptionOrder.every((position) => position >= 0)).toBeTrue();
    expect(adoptionOrder).toEqual([...adoptionOrder].sort((a, b) => a - b));
    const progress = body.slice(body.indexOf("## Progress reporting") + "## Progress reporting".length, body.indexOf("Independently of display derivation, recompute ready branches")).trim();
    const source = readFileSync(join(root, "extensions/pi-harness.ts"), "utf8").replace(/\r\n/g, "\n");
    const routerProgress = source.slice(source.indexOf("Progress reporting (Router only):") + "Progress reporting (Router only):".length, source.indexOf("Independently of display derivation, decide")).trim();
    expect(routerProgress).toBe(progress);
    expect(progress).toStartWith("Use suitable tools provided by the runtime to report progress and help the user track work.");
    const method = body.slice(body.indexOf("6. For each branch"), body.indexOf("## Progress reporting"));
    const plan = readSkill("documentation-plan-writing").body.split("\n").find((line) => line.startsWith("10. "))!;
    for (const text of [progress, method, plan]) expect(text).not.toMatch(/\btodo(?:_[a-z]+)?\b|\bset_session_name\b|\bin_progress\b|\{(?:tasks|transitions|removals)\s*:/i);
    for (const clause of [
      "truthfully expose current-action facts through suitable runtime progress tools or ordinary messages",
      "Progress-tool availability or display success is not a launch prerequisite when actual admission predicates hold",
      "Never mark partial, blocked, or failed as completed",
      "only completed plus required evidence satisfies an item predicate by default",
    ]) expect(body).toContain(clause);
    for (const obsolete of ["pre-action Todo projection before resolve", "updates Todo/Waves with the actual", "After this checkpoint", "Cleanup 1 - Checkpoint."]) expect(body).not.toContain(obsolete);
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

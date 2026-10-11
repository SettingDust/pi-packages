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
    expect(body).toContain("communicates truthful facts through Todo or ordinary messages");
    expect(body).toContain("judges release from item evidence and gate predicates independently of Todo mutation success");
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

  test("delegation strategy covers one-way display T1-T16 and independent execution gates", () => {
    const { body } = readSkill("delegation-strategy");
    // Static clauses/order only; no Router model or actual display-tool effects.
    const displayCases = [
      ["T1", [
        "Rebuilding, replacement, whole-group removal, and full clear are allowed without old Result or role closure",
        "Old cancelled, unstarted, missing-Result, current/active/unresolved, same-name records, source-derived status regression, and outstanding dependencies/gates/confirmations do not block display changes",
        "Whole-view replacement requires no old identity continuity or preservation of survivor fields, order, or native states",
      ], ["For each candidate, prove", "Age or native status alone never qualifies a record"]],
      ["T2", [
        "A missing, incomplete, uncorrelatable, conflicting, or unapplied Result permits display changes but never Result adoption, business completion, or affected dependency release",
      ], ["cannot justify deletion, completion, or dependency release"]],
      ["T3", [
        "Actual active execution and coordination duties remain independent and must be communicated through ordinary messages when needed",
        "prior effects accounting, duty closure, or retained active Todo records are not clear-before prerequisites",
      ], ["Keep the current record while validation", "before requalifying it"]],
      ["T4", [
        "Todo is a one-way derived display, not an execution ledger or permission",
        "derive only from explicitly selected Work entries, accepted authority, selected Plan/Waves scope, reliable execution facts, and current explicitly identified coordination outcomes, including selected standalone temporary outcomes",
        "Work is a delivery entry, not sole authority; display selection neither confirms nor rewrites implementation scope",
        "one item per independently observable outcome within selected multi-step scope, without merging Results",
      ], ["explicitly close or hand off the current role"]],
      ["T5", [
        "todo_remove({removals:[{task,todo}]}) or group target {task} selects exact children, groups, or a disjoint mixed set in any native state",
        "preserving all non-target fields, order, and native states, including other groups",
        "This local preservation is not a whole-view survivor-continuity requirement",
      ], ["Local deletion must cover only the exact eligible record or set"]],
      ["T6", [
        "Whole-group removal requires no child/container qualification",
        "outstanding dependencies/gates/confirmations do not block display changes",
        "preserving all non-target fields, order, and native states, including other groups",
      ], ["Whole-group deletion requires every child and the container's own coordination role to qualify"]],
      ["T7", [
        "todo_set({tasks: []}) clears it",
        "Display success, a completed label, or an empty list proves no business completion or gate release and does not cancel actual active execution",
        "never call subagent_remove or delete or modify Results, sessions, manifests, or artifacts",
      ], ["Full clear requires every record and container role to qualify"]],
      ["T8", [
        "Inspect currently callable tools through their real schema, description, and known contract",
        "a tool name, package installation, source code, or remembered convention proves no capability",
        "Neither packages/todo nor a fixed tool name is required",
        "no cross-call transaction, stable old ID, CAS, or new tool is required",
        "Report specific capability or target-selection limitations rather than inventing a tool or demanding an old lifecycle audit",
      ], ["single atomic lossless replacement may qualify", "Use only an established serialized mutation boundary with stable identities"]],
      ["T9", [
        "pending for selected unstarted or not-yet-eligible outcomes",
        "in_progress only for reliable actual active execution or a current coordination action",
        "completed only for a safely correlated completed Result plus required outcome-completion evidence, with Wave gates judged separately",
        "cancelled only for explicit withdrawal/cancellation before launch with no later launch planned, or reliably confirmed cancellation of actual execution under the effective backend contract",
        "An unconfirmed active cancellation request is not cancelled execution",
        "Handler partial, failed, and blocked remain explicit in descriptions or ordinary messages with the closest truthful non-success native state, never completed or invented native statuses",
        "Reliable source facts take precedence over old UI labels",
      ], ["A tool accepting arbitrary native statuses grants no permission to delete current, active, or unresolved work", "they may qualify only after explicit resolution"]],
      ["T10", [
        "todo_set({tasks:[{name,todos:[{name,description}]}]}) replaces the whole display and accepts no status input",
        "todo_transition({transitions:[{task,todo,status}]}) using the new collection's unambiguous exact task/todo names to assign pending, in_progress, completed, or cancelled from source facts",
        "Set followed by transition is normal derivation, not a cleanup bypass",
        "Successful set alone proves no four-state alignment",
      ], ["Do not emulate deletion by setting a reduced list and then transitioning survivors"]],
      ["T11", [
        "Under todo_remove's actual contract, missing, duplicate, overlapping, ambiguous, or otherwise invalid targets reject the whole batch without mutation",
        "Confirmed rejection is not success",
        "without blind retry, compensation, or restoration of the old snapshot",
      ], ["Rejected, missing, ambiguous, invalid, or mixed-validity targets must leave the entire projection unchanged atomically"]],
      ["T12", [
        "A new Todo is not a continuation of old execution identity",
        "old notifications must not directly update or remove a new same-name item by name alone, without reliable selected-source association",
        "Whole-view replacement requires no old identity continuity",
      ], ["replacement survivor-snapshot drift", "An orphan duplicate additionally requires"]],
      ["T13", [
        "Judge each tool return against its actual contract",
        "If set succeeds but transition fails, report the confirmed new collection and partial alignment, not full four-state alignment",
        "An error, missing return, or unknown effect proves neither success nor absence of effects",
        "report the known portion and precise failure/uncertainty through ordinary messages without blind retry, compensation, or restoration of the old snapshot",
        "A reliable work Result is not negated",
      ], ["Preserve remaining visible records and report the failed or uncertain effect concretely"]],
      ["T14", [
        "Re-deriving established selected facts is allowed without repeated Result adoption or dependency release",
        "Equivalent duplicate notifications must not re-adopt a Result, release a dependency twice, or replay removals",
        "On restart, resume, or replay, uncertain association blocks only that Result's adoption/release, not rebuilding or clearing from other established selected facts",
        "Malformed or conflicting association fails closed for the affected semantic outcome and dependents, preserving the first established facts; it is not a display-retention gate",
      ], ["must not repeat Result projection", "uncertain correlation retains visible records"]],
      ["T15", [
        "On cancellation or changed direction, stop affected unlaunched work and communicate active work and completed effects truthfully",
        "that accounting is independent, not a prerequisite for rebuilding, removal, or clear",
        "Actual active execution and coordination duties remain independent",
        "prior effects accounting, duty closure, or retained active Todo records are not clear-before prerequisites",
        "does not cancel actual active execution",
      ], ["first account for active work and completed effects, then perform this check", "Cancellation alone never qualifies"]],
      ["T16", [
        "Absent or failed Todo projection must be reported through ordinary coordination messages and must not block otherwise satisfied execution admission or Result adoption",
        "Complete Result reading/correlation, actual authorization, scope confirmation, tuple/current-call/JIT, prerequisites, conflicts, and item/Wave gates remain independent business checks",
        "Display changes never alter the execution graph or Work/Plan/Waves predicates/status to fit the UI",
        "never call subagent_remove or delete or modify Results, sessions, manifests, or artifacts",
        "Do not add a capability registry, scheduler, receipt, ledger, queue, synchronizer, persistence, new IDs, revision/CAS, or automatic status-driven deletion",
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
      "First adoption requires complete reading and reliable correlation, not a successful Todo update",
      "Make a fresh Router-owned decision, check completion predicates and Wave gate evidence",
      "independently of Todo mutation success",
      "each Wave gate separately requires every listed item and its stated verification",
    ].map((clause) => body.indexOf(clause));
    expect(adoptionOrder.every((position) => position >= 0)).toBeTrue();
    expect(adoptionOrder).toEqual([...adoptionOrder].sort((a, b) => a - b));
    const displayOrder = [
      "## Todo derived display",
      "Display 1 - Select sources.",
      "Display 2 - Replace or clear independently.",
      "Display 3 - Use actual tools.",
      "Display 4 - Derive truthful states.",
      "Display 5 - Keep adoption separate.",
      "Display 6 - Verify and report effects.",
      "Independently of display derivation, recompute ready branches",
    ].map((clause) => body.indexOf(clause));
    expect(displayOrder.every((position) => position >= 0)).toBeTrue();
    expect(displayOrder).toEqual([...displayOrder].sort((a, b) => a - b));
    for (const clause of [
      "truthfully expose current-action facts through Todo fields/descriptions or ordinary messages",
      "Todo tool availability or mutation success is not a launch prerequisite when actual admission predicates hold",
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

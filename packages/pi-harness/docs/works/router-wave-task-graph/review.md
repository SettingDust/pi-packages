# W3-REVIEW — Router Tasks-to-Waves migration

## Findings

### F1 — Medium: the selected executable bundle does not satisfy its own graph contract

**Expectation:** [Router Delegation Spec, §1.2](../../spec/router-delegation.md) lines 91–97 requires reciprocal Work/Plan/Waves links, explicit Wave release predicates and predecessor gates, a Plan identifying its required gates, and resolvable references.

**Evidence:** [plan.md](plan.md) §4 links Waves but never links Work or identifies completion gates. [waves.md](waves.md) has no link to its Plan or Work. Its four Wave headings group items but supply no explicit Wave release predicates or predecessor-gate declarations. The W0-DOC Result consumer at line 24 names `W1-PROTOCOL`, which is not one of the five declared item IDs. The item dependency graph itself is acyclic and its prerequisite IDs resolve; that does not supply the missing Wave contract.

**Impact:** This bundle cannot establish which explicit gates authorize dependent work or establish the Plan outcome. It is not a conforming example of the migration it is supposed to validate. The missing reciprocal links also fail scenario S20 and Work's own bundle-acceptance condition. Current tests pass despite these defects because they check source instructions/schema and synthetic fixtures, not this selected graph.

**Smallest correction:** In the owning bundle, add the reciprocal links, explicit Wave gates and their relation to the Plan outcome, and correct the dangling consumer. Preserve independent-branch eligibility; do not create a global Wave barrier. This review makes none of those edits.

### F2 — Medium: Router instructions omit the distinct Wave-gate readiness check

**Expectation:** The Spec lines 95–97 requires both item prerequisites and containing-Wave prerequisite gates to be satisfied, followed by explicit gate verification before dependent release. Section 2 assigns reciprocal-link and semantic item/gate validation to the Router, not the Resolver.

**Evidence:** [extensions/pi-harness.ts](../../../extensions/pi-harness.ts) line 168 tells the Router to use the linked Waves graph, retain item dependencies, and avoid global barriers. Line 172 says to release only satisfied dependencies. Neither phase instructs it to validate reciprocal links, containing-Wave prerequisite gates, or a Wave's separate verification predicate. The loaded [delegation-strategy Skill](../../../skills/delegation-strategy/SKILL.md) likewise supplies generic branch predicates, not these Wave-specific checks. [src/admission.ts](../../../src/admission.ts), `validateTuple`, checks member names/directories; [src/protocol.ts](../../../src/protocol.ts), `resolveDelegation`, checks selectors, references and current bytes. Neither parses these semantic graph conditions, consistent with their assigned responsibility. Planning Skills describe the missing checks, but they are not a substitute for execution instructions for every Router delegation.

**Impact:** An item with completed item prerequisites can be selected without an explicit instruction to reject an unsatisfied containing-Wave gate; a missing or inconsistent reciprocal link similarly has no explicit Router rejection rule. Generic dependency language is insufficient to demonstrate the newly required distinction. This is a prompt-contract gap, not a claim that a live Router has been observed releasing a gate incorrectly.

**Smallest correction:** Add the specific pre-resolution link/item/Wave-gate checks and post-Result gate verification to the Router instructions, with focused regression assertions for these distinctions. Keep semantic judgment Router-owned; no parser, scheduler or authorization receipt is needed.

### F3 — Low: current-state documents still describe a preparation-only, Tasks-only candidate

**Evidence:** [work.md](work.md) line 3 says implementation has not started; its exclusions and [plan.md](plan.md) §§1–2 and §6 frame the work as preparation without implementation acceptance. The current diff contains implemented admission, Router and test changes. The Spec §2 and final acceptance paragraph still describe existing implementation/tests as Tasks-only, and ADR-0001's Work/Plan/Waves amendment says the prompt/admission implementation has not been updated. These statements were accurate preparation-stage limitations, but do not describe the inspected source candidate.

**Impact:** A reader cannot reliably distinguish completed source migration, outstanding graph/instruction defects, and the separate live-bootstrap uncertainty. These stale statements do not prove that predecessor execution lacked authorization: the complete predecessor confirmation trace was not supplied, and the explicit current Handoff authorizes this review.

**Smallest correction:** The owning documentation workflow should reconcile candidate status while retaining historical evidence and the unverified live-runtime limitation. Do not infer live conformance from passing source tests. This review does not change authority or Work state.

## Verdict

**Changes required; no acceptance of the complete migration bundle.** F1 and F2 prevent a clean graph/authority-conformance verdict. F3 requires truthful lifecycle reconciliation. No critical or high-severity defect was established in the inspected bounded source change.

The source-level Waves selector migration and focused regression checks pass. The independent review outcome is complete even though the candidate is not accepted. **Live Router/Resolver/Handler bootstrap: unverified.** Source-level Resolver and mocked extension verification is available; it is not a live end-to-end acceptance trace.

## Acceptance evidence

All repository locators below refer to the inspected working tree on **2026-09-30**, based on HEAD `f7c9271a78d7a7280205efdec84a431780224b2c` plus the existing unstaged candidate. Claims refer to that candidate, not a committed release. The untracked Work bundle was read separately from the tracked diff.

| Plan §5 acceptance claim | Classification | Inspected support and limit |
| --- | --- | --- |
| New planned invocations use Waves, without duplicate Tasks | Partially supported | `AuthoritySelectors`, `PlannedSubject` and `validateTuple` in `src/admission.ts`; closed planned schema in `extensions/pi-harness.ts`; `validateAdmission` and subject construction in `src/protocol.ts`; passing admission/protocol tests. No new Tasks document found. Source selector support is verified; the actual executable bundle fails F1. |
| Preserve historical Tasks; require explicit migration; no fallback | Supported at source/prompt level | Tracked historical Tasks have no HEAD diff; untracked inventory contains the new Work bundle only. Protocol tests reject `tasks` as alias and reject authority extras; Router phase 2 explicitly stops unfinished Tasks execution pending migration and applicable confirmation. No live migration trace was supplied. |
| Confirmation remains a hard boundary | Partially supported | Router phase 1 requires explicit current-user confirmation before decomposition and phase 2 preserves material-change confirmation. Tests assert that prompt contract and reject model-supplied confirmation/migration fields. The test proving an unconfirmed document can resolve structurally is correct: Resolver success grants no authorization. Actual confirmation behavior is unverified. |
| Resolve precedes exact spawn with admission intact | Partially supported | Router phase 3 explicitly forbids intervening actions and requires fixed `handler` plus exact prompt/model/thinking. Passing tests exercise current-call admission, drift, schema closure and source ordering. They do not execute a live resolve-to-spawn chain. |
| One Handler, one Result; full retrieval and truthful Todo | Partially supported | Router phases 1 and 4 preserve one outcome, full retrieval, correlation, four statuses, duplicate handling and no false completion. Protocol tests preserve complete Results/artifacts, reject summary-only or bundled malformed inputs, and reject workflow fields. They do not demonstrate backend retrieval or actual Todo mutations. |
| Failure-specific dependency blocking, no unrelated barrier | Partially supported | Item graph dependencies resolve and are acyclic. Router phase 2 explicitly leaves unrelated work eligible; phase 4 requires projection before dependent release. Distinct Wave-gate semantics remain incomplete under F1/F2. No executed scheduling trace is available. |
| Tool limits, ownership and conflicts | Partially supported | Prompt preserves effective tool/end-turn limits, pre-resolve checks, serial handling of conflicts, and no invented backend. W0-DOC and W0-PROTO declare separate production surfaces; W1 depends on both; W2's overlapping protocol tests occur after that integration; W3 writes only this report. Aggregate diff supports those surface groupings but cannot prove historical per-Handler writes or actual overlap compliance. |
| Focused tests and independent scope/authority/evidence review | Partially supported | Fresh 123-test run and typecheck pass; this report supplies independent review. Passing tests do not cover the selected bundle's missing links/gates and do not prove live workflow behavior. |
| Explicit bootstrap limitation; no unsupported runtime acceptance | Supported for this review | Live bootstrap is classified unverified. No reload, launch, delegation or runtime acceptance was performed or claimed. |

## Reproduced verification

From repository root:

```text
bun test packages/pi-harness/tests/admission.test.ts packages/pi-harness/tests/protocol.test.ts packages/pi-harness/tests/extension.test.ts packages/pi-harness/tests/skills.test.ts
123 pass, 0 fail, 802 expect() calls, 4 files; Bun 1.4.2 (744846f84)

bun run --cwd packages/pi-harness typecheck
Passed: tsc --noEmit -p tsconfig.json

git -c core.safecrlf=false diff --check
Passed: no output
```

This is a focused suite, not the full package suite. The supplied W0-DOC `42/316`, W0-PROTO `65/193`, W1 static/typecheck, and W2 `81/486` figures are predecessor reports, not independently reconstructed historical executions. The current combined run adds current evidence and does not retroactively authenticate those runs or per-owner attribution.

A read-only Bun probe extracted the selected graph's IDs, dependency lines, consumer IDs and direct Markdown links. It reported:

```text
IDs: W0-DOC, W0-PROTO, W1-ROUTER, W2-TEST, W3-REVIEW
Dependencies: none; none; W0-DOC+W0-PROTO; W1-ROUTER;
              W0-DOC+W0-PROTO+W1-ROUTER+W2-TEST
Unknown consumer: W1-PROTOCOL
Plan -> Work: absent; Plan -> Waves: present
Waves -> Plan: absent; Waves -> Work: absent
Explicit 'release predicate' occurrences in Waves: 0
```

Manual reading confirmed that the missing predicates are not expressed under alternate headings. This small probe checks this artifact only; it is not a general graph parser or a new runtime component.

## Scope and source provenance

The inspected tracked diff contains **23 changed files**, all under `packages/pi-harness`: five documentation/authority files, eleven Skills, one extension, two protocol/admission source files and four test files. The untracked input bundle contains Work, Context, Plan and Waves. Before this report, the index had no staged changes. No dependency, lockfile, backend or Handler-template changes appear in that diff.

| Source objects | Claim supported | Scope/limitation |
| --- | --- | --- |
| `docs/spec/router-delegation.md` §§1.2–3; `docs/adr/0001-router-resolver-handler-boundaries.md` Work/Plan/Waves amendment; `docs/adr/0007-authority-first-router-admission.md` Decision and Waves amendment | Normative graph, confirmation and role boundaries | Authority, not proof of current live behavior; historical evidence sections remain historical. |
| `docs/works/router-wave-task-graph/{work,context,plan,waves}.md` | Selected scope, predicates, ownership and recorded bootstrap limit | Derived execution inputs; reciprocal links/gates and status defects are identified above. |
| `src/admission.ts`, `src/protocol.ts`, `extensions/pi-harness.ts` | Implemented selectors, legality, prompt ordering and Result contract | Source execution and mocked extension registration do not establish host bootstrap. |
| Changed documentation/Skills plus `tests/skills.test.ts` | New-plan vocabulary, historical Tasks boundary and discovery | Fresh Skill tests pass; instruction presence does not prove model compliance. |
| `tests/{admission,protocol,extension}.test.ts` | Success/failure cases, exact schema, drift and Result preservation | Behavioral Resolver tests plus prompt/schema assertions; no actual subagent backend or Todo lifecycle. |

Negative evidence was scoped explicitly: `git diff HEAD --name-only -- "*tasks*.md" "*lock*"` returned empty; the full changed-path and untracked inventories showed no new Tasks or lockfile. This supports preservation relative to HEAD, not an assertion about every prior session. The aggregate diff cannot separate accepted authority amendments from individual predecessor writes; authority changes must not be attributed to W0-DOC merely from their presence. Likewise, the changed Skill test fits the overall test scope, but its individual Handler ownership is not independently established by the supplied summary.

## Residual limitations and smallest corrective action

The review did not inspect a full live Router/Resolver/Handler trace demonstrating registered Waves admission, confirmation, exact launch forwarding, stable correlation, full Result retrieval, failure-specific release, or truthful Todo projection. Current mocks, static assertions and filesystem-backed Resolver tests cannot close that gap. No claim is made about installed runtime freshness or effective backend overlap capability.

The smallest corrective action for acceptance is to repair F1's selected links/gates and F2's Router gate checks with focused evidence, then reconcile the stale candidate-status wording under the appropriate document ownership. Live acceptance would additionally require an authorized trace on the actual backend; no such action is initiated or authorized by this report. Historical Tasks must remain unchanged.

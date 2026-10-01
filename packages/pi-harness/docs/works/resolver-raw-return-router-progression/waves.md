# Waves: Resolver Raw Return and Router Result Progression

- [Work](work.md) | [Plan](plan.md)

This is the sole executable graph for the selected Plan. Original IDs P0-PLAN/P1-PI/P2-RESOLVER/P3-REVIEW and W0/W1/W2/W3 retain their meanings. New P4/P5/P6 and W4/W5/W6 insert the confirmed review repairs and effective-registration evidence before further implementation and final review. Numbering and display order alone create no dependency.

## Graph rules

- Every item has one `handler` invocation, one independent Result, one completion predicate, evidence, explicit prerequisite IDs, ownership/conflicts, and one containing Wave. Internal checks serve that item's predicate.
- A Wave releases only after each listed item has an adoptable `completed` Result, required evidence, and passing release verification. `partial`, `failed`, `blocked`, absent, malformed, contradictory, or insufficient evidence releases no dependent.
- The Router obtains/correlates full Results and projects truthful terminal state before deciding on release. Source presence, historical completion, backend termination, and Todo status alone do not release a revised gate.
- Item and Wave edges below are explicit, resolved, acyclic, and never self-dependent. Shared read-only inputs do not conflict. Shared writes and behavioral contracts serialize against the latest candidate.
- Authority and the externally corrected strategy are read-only. No item creates/interprets `tasks.md`, adds retry/fallback, a scheduler/queue, lifecycle orchestration, arbitrary execution, or automatic progression.
- This planning result executes only P0. Future items require their own bounded delegation; no gate is waived by this document.

## Wave W0: Planning prerequisite

- **Wave ID:** W0
- **Incremental outcome:** Existing tuple incorporates the confirmed repair/evidence scope and passes graph validation.
- **Items:** P0-PLAN
- **Predecessor Wave gates:** none
- **Release predicate:** P0-PLAN has a completed Result demonstrating all tuple/link/graph/ownership checks and scoped documentation-only changes.

### P0-PLAN - Reconcile and validate this tuple

- **Handler:** `handler`
- **Result terminal predicate:** `completed` only when the four existing tuple files record the confirmed repairs, effective evidence block, current candidate, preserved original IDs, dependency order, exclusions, and ownership, with validated reciprocal links and graph and no runtime claim.
- **Required evidence:** four changed tuple paths; exactly one Work/Waves link in Plan; matching Work/Plan links in Waves; all local links readable; stable unique item/Wave IDs; resolved acyclic item/Wave edges; explicit predecessor gates; exactly one Handler and Result predicate per item; ownership/conflict checks; scoped status/content comparison preserving files outside the tuple and no new Tasks file.
- **Prerequisites:** none
- **External inputs:** readable accepted authority, existing tuple, supplied review findings and confirmation, current source evidence.
- **Write ownership:** only `packages/pi-harness/docs/works/resolver-raw-return-router-progression/{work,context,plan,waves}.md`.
- **Conflicts:** preserve existing dirty files; no source, tests, strategy, authority, manifest, lockfile, README, Agent, installation, reload, launch, or commit.
- **Containing Wave:** W0
- **Result consumer:** P4-CALL-CONTRACT
- **Release verification:** re-read the tuple and validate links, IDs, edges, gates, predicates, ownership/conflicts, and changed-path boundary.

## Wave W4: Single-call contract repair

- **Wave ID:** W4
- **Incremental outcome:** Owned Router and registered Resolver wording agrees with the corrected strategy and authoritative single-call contract.
- **Items:** P4-CALL-CONTRACT
- **Predecessor Wave gates:** W0
- **Release predicate:** P4-CALL-CONTRACT has a completed Result with comprehensive bounded wording comparison and focused regression evidence, without a strategy edit.

### P4-CALL-CONTRACT - Reconcile Router and registered-tool wording

- **Handler:** `handler`
- **Result terminal predicate:** `completed` only when all owned Router prompt branches and registered Resolver/schema descriptions/tests consistently say one `resolve_delegation` call binds and internally invokes the selected delegate once, prohibit a separate second launch of the same outcome after the response, and require a separate permitted Resolver call for any later independent outcome; the corrected strategy remains unchanged.
- **Required evidence:** exact owned wording diff; comparison to Backend Adaptation sections 1-3 and Router sections 1/1.1/1.3; read-only corrected-strategy comparison; focused assertions including the active-tools introduction, Phase 3, registered tool/schema descriptions, no separate post-response spawn, and binding effective end-turn/resource limits. Static wording checks must not be reported as live permission.
- **Prerequisites:** P0-PLAN
- **Write ownership:** future wording-only changes in `packages/pi-harness/extensions/pi-harness.ts` and focused `packages/pi-harness/tests/extension.test.ts` checks.
- **Conflicts:** serialized before P5 on shared extension/test files and launch contract; no raw-error serialization, protocol behavior, strategy, external backend registration, dependency, or authority edits. A contradiction in a read-only external registration is evidence for P6, not implicit write authority.
- **Containing Wave:** W4
- **Result consumer:** P5-RAW-ERROR
- **Release verification:** inspect every owned prompt branch and registered description against the corrected Skill; prove no instruction requires launching the same outcome again after Resolver returns.

## Wave W5: Undefined raw-error repair

- **Wave ID:** W5
- **Incremental outcome:** The extension preserves a thrown-undefined raw-error discriminator in details and YAML/text.
- **Items:** P5-RAW-ERROR
- **Predecessor Wave gates:** W4
- **Release predicate:** P5-RAW-ERROR has a completed Result proving internal and serialized exactly-one raw capture, including undefined.

### P5-RAW-ERROR - Preserve undefined raw-error evidence

- **Handler:** `handler`
- **Result terminal predicate:** `completed` only when thrown `Error`, object, and `undefined` preserve resolved resolution, `launch.tool`, an own `rawError` key, and no `rawReturn`, and serialized extension YAML/text parses with the same raw-error discriminator rather than an absent launch or fabricated Handler status.
- **Required evidence:** smallest serialization diff; focused extension tests for all three thrown values checking details and parsed text; own-key/exclusive-key assertions and round-trip evidence; returned nested `isError` remains `rawReturn`; selected invocation occurs exactly once; relevant package checks/typecheck. Record the chosen key-preserving display representation without prescribing new business semantics.
- **Prerequisites:** P4-CALL-CONTRACT
- **Write ownership:** future bounded raw-error display/serialization changes in `packages/pi-harness/extensions/pi-harness.ts` and focused `packages/pi-harness/tests/extension.test.ts` regressions; existing protocol/dispatch tests are read-only supporting evidence.
- **Conflicts:** consume P4's latest extension/test state; no single-call wording regression, dependency/strategy/authority edit, backend mapping, Handler interpretation, or lifecycle behavior.
- **Containing Wave:** W5
- **Result consumer:** P6-EFFECTIVE-REG
- **Release verification:** inspect internal own-key behavior and parsed YAML/text for undefined; ensure returned error envelopes and thrown errors remain distinct and no Handler Result is synthesized.

## Wave W6: Effective loaded registration evidence

- **Wave ID:** W6
- **Incremental outcome:** Actual loaded delegate provenance and contract are established, or their missing prerequisite is truthfully blocked.
- **Items:** P6-EFFECTIVE-REG
- **Predecessor Wave gates:** W5
- **Release predicate:** only a completed P6-EFFECTIVE-REG with every required effective-contract field established releases W1. Static-only evidence or a blocked Result leaves W6 closed.

### P6-EFFECTIVE-REG - Establish the effective loaded delegate contract

- **Handler:** `handler`
- **Result terminal predicate:** `completed` only when observed effective registration establishes the exact tool name and source/version/configuration or observable generation, accepted startup object, fixed Handler execution and Skill/reference access, exact prompt/model/thinking forwarding, stable identity and relevant state, full Handler YAML Result return/retrieval and correlation mapping, applicable generation association, notification ownership, and actual same-turn/end-turn/resource rules. If unavailable without live bootstrap, return `blocked` naming the missing evidence.
- **Required evidence:** observation of the current loaded tool/registration tied to its provenance and the repaired candidate; current parameter/description contract; source mapping supporting each capability; exact identity/state/Result-path/notification mapping; overlap/end-turn/resource limits; explicit classification of repository/static-test evidence versus effective observation. Tool catalog visibility or historical source alone does not satisfy this predicate; no fabricated registration or live trace is accepted.
- **Prerequisites:** P5-RAW-ERROR
- **Write ownership:** none beyond this Handler's evidence Result; read-only inspection of the existing effective environment and corresponding sources.
- **Conflicts:** no source/docs/strategy/test/dependency/authority edits, install, activation, reload, launch, polling, join, or lifecycle action. If those are necessary to establish provenance, report the external prerequisite rather than performing it. No new persistent generation infrastructure is required.
- **Containing Wave:** W6
- **Result consumer:** P1-PI and, transitively, P2-RESOLVER/P3-REVIEW
- **Release verification:** check each required contract field and current loaded/source correspondence. Keep any missing or contradictory field blocked and do not release dependent implementation or review.

## Wave W1: Existing Pi dependency and host verification

- **Wave ID:** W1
- **Incremental outcome:** The current confirmed Pi candidate and target host seam have reusable, current evidence after repair/effective-registration gates.
- **Items:** P1-PI
- **Predecessor Wave gates:** W6
- **Release predicate:** P1-PI has a completed Result verifying the existing target, engine, manifest/lockfile/Pi-family alignment, and installed target bridge without an unrequested repeat upgrade.

### P1-PI - Revalidate the existing dependency and executeTool evidence

- **Handler:** `handler`
- **Result terminal predicate:** `completed` only when current manifest/lockfile and installed target evidence establish the confirmed `0.99.2` Pi-family resolution, Node engine compatibility, and `ExtensionToolContext.executeTool(name: string, args: unknown, options?: ExecuteToolOptions): Promise<AgentToolCallOutcome>` with nested returned-error versus bridge-thrown-error semantics. An unsupported or consequentially changed target/contract is blocked rather than silently upgraded.
- **Required evidence:** correlate any earlier version/upgrade Result to current candidate bytes; manifest/lockfile and resolved versions; target engine and current environment; installed target declaration path/signature/outcome semantics. The earlier registry/latest result and supplied `0.99.0` declaration are historical supporting evidence, not proof of the installed `0.99.2` seam. Record stale or unavailable facts explicitly.
- **Prerequisites:** P6-EFFECTIVE-REG
- **Write ownership:** none in this continuation beyond the verification Result; root `package.json` and `bun.lock` are read-only current-candidate evidence.
- **Conflicts:** no repeat install/upgrade, manifest/lockfile edits, source/tests, strategy, authority, or unrelated changes. A new dependency decision requires a separate Router scope decision.
- **Containing Wave:** W1
- **Result consumer:** P2-RESOLVER
- **Release verification:** compare current target/engine/bridge evidence with the original confirmed scope and P6 contract; preserve raw host errors distinctly from Handler business status.

## Wave W2: Existing Resolver boundary and focused verification

- **Wave ID:** W2
- **Incremental outcome:** The repaired current direct-dispatch candidate satisfies the bounded Resolver contract with focused evidence.
- **Items:** P2-RESOLVER
- **Predecessor Wave gates:** W1
- **Release predicate:** P2-RESOLVER has a completed Result proving controlled dispatch and raw capture against P1/P6, without moving Router interpretation/progression into Resolver.

### P2-RESOLVER - Revalidate direct dispatch and reconcile remaining defects

- **Handler:** `handler`
- **Result terminal predicate:** `completed` only when the present implementation and focused checks prove precise pre-launch blocking with no launch, selected registered-tool dispatch through the verified bridge, exact protected forwarding, resolved-on-attempt behavior, exactly one raw return/error, returned `isError` preservation, undefined text/details preservation, and absence of Resolver-owned Handler interpretation or progression. Missing backend mapping or invalidated P6 evidence remains blocked.
- **Required evidence:** current Resolver/protocol/extension diff; relevant pre-launch, protected-parameter, call-count, returned-envelope, thrown Error/object/undefined, and serialized-discriminator checks; relevant package tests and typecheck; P1 host evidence and P6 effective contract correspondence. Reuse existing implementation; any repair must identify an observed in-scope divergence. Record live-bootstrap limitation rather than treating stubs as loaded-backend proof.
- **Prerequisites:** P1-PI, P6-EFFECTIVE-REG
- **Write ownership:** only demonstrated remaining defects in `packages/pi-harness/src/protocol.ts`, `packages/pi-harness/extensions/pi-harness.ts`, and their focused existing tests. No rewrite is required merely to repeat the original implementation outcome.
- **Conflicts:** preserve P4/P5 repairs; no dependency/strategy/authority changes, Router progression, external registration, backend remapping, or new execution mechanism. If a required change would invalidate P6 correspondence or broaden the contract, block and report it rather than bypassing the gate.
- **Containing Wave:** W2
- **Result consumer:** P3-REVIEW
- **Release verification:** compare the current boundary with Backend Adaptation sections 1/5/6 and Router launch-evidence ownership; Resolver synthesizes no launch status/task identity/objective/Handler status and releases no work.

## Wave W3: Independent final review

- **Wave ID:** W3
- **Incremental outcome:** A fresh independent read-only review records conformance, findings, and remaining runtime limitations for the complete revised scope.
- **Items:** P3-REVIEW
- **Predecessor Wave gates:** W2
- **Release predicate:** a fresh completed P3-REVIEW inspects every predecessor Result and actual candidate/evidence; the earlier P3 findings do not satisfy this revised final gate.

### P3-REVIEW - Independently review repairs and evidence

- **Handler:** `handler`
- **Result terminal predicate:** `completed` only when an independent read-only review records findings from all predecessor Results, actual diffs, authority correspondence, graph/ownership/conflicts, single-call and undefined repairs, effective provenance, host bridge and Resolver evidence, and classifies runtime launch, full Result correlation, and live bootstrap as verified, limited, or unverified without waiving missing predicates.
- **Required evidence:** full P0/P4/P5/P6/P1/P2 Results; actual changed-path/diff and candidate correspondence; PRD/ADR/Spec comparison; link/graph checks; focused tests/typecheck; effective registration and host evidence; unsupported-completion/permission-claim check; explicit live-bootstrap limitation.
- **Prerequisites:** P2-RESOLVER
- **Write ownership:** none beyond the independent Handler Result; no repair or review artifact edit.
- **Conflicts:** last by explicit dependency; cannot edit predecessors, authority, strategy, runtime, tests, dependencies, reinterpret blocked evidence as completed, or claim live conformance from static checks.
- **Containing Wave:** W3
- **Result consumer:** Router; any later decision remains outside this Handler outcome.
- **Release verification:** verify independence, findings and limitations are recorded, and completion of the review fact is distinguishable from acceptance of every runtime behavior.

## Dependency graph

```text
P0-PLAN -> P4-CALL-CONTRACT -> P5-RAW-ERROR -> P6-EFFECTIVE-REG
                                                     |
                                                  P1-PI
                                                     |
                                              P2-RESOLVER
                                                     |
                                               P3-REVIEW

Additional explicit item prerequisite: P6-EFFECTIVE-REG -> P2-RESOLVER
Wave gates: W0 -> W4 -> W5 -> W6 -> W1 -> W2 -> W3
```

The selected Plan requires every listed gate. A blocked P6 leaves W6 closed and blocks P1/P2/P3. No static substitute, hidden Tasks graph, inferred numbering dependency, or automatic continuation is permitted.

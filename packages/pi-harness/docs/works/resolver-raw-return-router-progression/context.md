# Context: Resolver Raw Return and Router Result Progression

## Work and authority

- [Work](work.md) identifies the bounded delivery scope.
- [Plan](plan.md) explains strategy, acceptance, and limitations.
- [Waves](waves.md) is the sole executable graph.
- [Router Delegation PRD](../../prd/router-delegation.md), [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md), [ADR-0005](../../adr/0005-let-router-adapt-delegate-tools-directly.md), [ADR-0007](../../adr/0007-authority-first-router-admission.md), [Router Delegation Spec](../../spec/router-delegation.md), and [Backend Adaptation Spec](../../spec/backend-adaptation.md) are read-only authority inputs.

The user confirmed continuing the P3 review repairs: reconcile single-call wording, preserve thrown-undefined raw-error evidence, and establish effective loaded backend provenance. This revision changes only the four existing tuple files. Confirmation does not make an unverified evidence predicate complete.

## Review findings and current source

- **High, single-call contradiction:** P3 found stale second-launch instructions. The externally corrected [delegation-strategy Skill](../../../skills/delegation-strategy/SKILL.md) now says one Resolver call binds and executes the selected delegate and returns raw evidence, with no separate launch of the same outcome. The current extension's Phase 3 also contains single-call wording, but its active-tools introduction still says the Resolver does not launch a Handler. P4-CALL-CONTRACT must check all Router prompt branches, registered-tool/schema descriptions, and focused tests against the corrected Skill, removing remaining contradictory instructions.
- **Medium, effective provenance:** the actual loaded delegate registration and its contract were not established by P3. P6-EFFECTIVE-REG must distinguish current loaded registration from repository source, historical registration, tool visibility, and static test stubs.
- **Low, undefined serialization:** [src/protocol.ts](../../../src/protocol.ts) preserves thrown `undefined` in an own `launch.rawError` property, but [extensions/pi-harness.ts](../../../extensions/pi-harness.ts) only converts `Error` objects for display before YAML serialization. The undefined-valued key may be omitted. P5-RAW-ERROR must preserve the discriminator at both details and text boundaries.
- P3's supplied review evidence reports passing static checks; this planning result does not rerun or adopt those checks as current repair completion. Live Router/Resolver/Handler bootstrap remains unverified.

## Superseded derived facts

Earlier tuple text said Pi was pinned to `0.85.1`, `resolveDelegation` only returned metadata, and the extension did not dispatch. Those descriptions are superseded by the inspected working-tree candidate:

- Root `package.json` and `bun.lock` now select `@earendil-works/pi-coding-agent`, `@earendil-works/pi-ai`, and `@earendil-works/pi-tui` at `0.99.2`.
- `dispatchDelegation` validates the selected registered name/params, binds `handler` and exact resolved prompt/model/thinking, uses `executeTool`, and preserves either raw return or raw error with resolved resolution after an attempt.
- [tests/dispatch.test.ts](../../../tests/dispatch.test.ts) contains internal raw-error coverage including `undefined`; [tests/extension.test.ts](../../../tests/extension.test.ts) exercises bridge forwarding and ordinary `Error` display. These source observations do not establish undefined text serialization or effective backend registration.

The earlier plan recorded registry latest `0.99.2`, Node `>=22.19.0`, and a supplied local `0.99.0` host declaration exposing `ExtensionToolContext.executeTool(name: string, args: unknown, options?: ExecuteToolOptions): Promise<AgentToolCallOutcome>`. That declaration documents nested tool errors as returned `isError` outcomes rather than rejection. P1-PI retains target-host/version/engine verification against the current candidate; no new registry query, install, or upgrade was performed in this revision. Existing bytes and historical evidence may be reused only when they satisfy the revised predicates.

## Evidence boundary

Single-call prompt/description consistency, closed request validation, protected forwarding, raw union own-key behavior, undefined YAML/text serialization, manifest/lock alignment, target host declarations, and graph/link consistency can be checked statically or with focused stubbed tests. These checks demonstrate their bounded source predicates and cannot establish loaded backend freshness.

P6-EFFECTIVE-REG requires an observation tying the effective registered delegate to the actual registration source/version/configuration or generation where observable. Its current accepted startup contract must establish fixed `handler` execution, dynamic Skill/reference access, exact prompt/model/thinking forwarding, stable execution identity and relevant state, full Handler YAML Result return/retrieval and correlation mapping, applicable generation association, notification ownership, and same-turn/end-turn/resource limits. Source mapping may support that observation but does not replace it. Do not invent a backend or require new persistent identity infrastructure.

Read-only inspection of effective registration may establish this contract without launching a Handler. If the environment cannot supply that evidence without live bootstrap, return `blocked` with the missing fields and evidence available; leave W6 and its declared dependents closed. Live bootstrap is excluded from this planning result, remains unverified, and cannot be silently substituted with static evidence.

## Ownership and conflicts

- P0-PLAN owns only this Work directory's four tuple files.
- P4-CALL-CONTRACT owns a future bounded Router prompt/registered Resolver description/schema wording repair and its focused extension tests. The strategy Skill and any external backend registration are read-only inputs.
- P5-RAW-ERROR owns a future bounded extension raw-error text/display repair and focused regression tests. It is serialized after P4 because both touch `extensions/pi-harness.ts` and `tests/extension.test.ts` and affect the same response contract.
- P6-EFFECTIVE-REG is read-only evidence collection with one Handler Result. Its observed registration must correspond to the repaired candidate; it owns no source, documentation, installation, activation, or lifecycle edits.
- P1-PI retains dependency/host verification for the existing `0.99.2` candidate. It owns no fresh manifest/lockfile edits in this continuation; incompatibility or a consequential version change is reported as blocked for a separate Router decision.
- P2-RESOLVER retains the direct-dispatch boundary and focused verification. Reuse the present implementation; only demonstrated remaining in-scope defects may justify later bounded Resolver/extension/test changes, after repair/evidence gates. It owns no Router progression, dependency, strategy, or authority changes.
- P3-REVIEW remains the separate final independent read-only review, with no repair or waiver authority.

All original IDs retain their meaning. P4/P5/P6 are new review-driven items, not renamed versions of P1/P2/P3. Original Wave IDs remain stable even though new prerequisite Waves execute before them. Work status, prior completion labels, display order, and source presence alone do not release a revised gate.

## Verification and exclusions

P0 checks reciprocal same-directory links, exactly one Work/Waves link in Plan, the matching Work/Plan links in Waves, stable unique IDs, resolved acyclic item and Wave edges, explicit gates, one Handler/Result predicate per item, ownership/conflicts, and scoped file changes. Waves provides all item-sized execution predicates; Plan is explanatory only.

No source, test, strategy, manifest, lockfile, authority, reload, launch, installation, commit, historical Tasks, or live-bootstrap work is performed by P0. The existing dirty tree is preserved. No retry/fallback, scheduler/queue, lifecycle orchestration, arbitrary tool execution, or automatic progression is added.

# Plan: Resolver Raw Return and Router Result Progression

- [Work](work.md) | [Waves](waves.md)

## 1. Decision and authority

Revise the accepted Resolver direct-dispatch scope to incorporate the user-confirmed P3 review repairs and effective-registration evidence before any further implementation or final review. The [Router Delegation PRD](../../prd/router-delegation.md), [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md), [ADR-0005](../../adr/0005-let-router-adapt-delegate-tools-directly.md), [ADR-0007](../../adr/0007-authority-first-router-admission.md), [Router Delegation Spec](../../spec/router-delegation.md), and [Backend Adaptation Spec](../../spec/backend-adaptation.md) remain read-only authority. [Context](context.md) records the current candidate and superseded derived facts.

The Router owns semantic eligibility, launch interpretation, identity/state assessment, full Handler Result retrieval/correlation, truthful Todo/Waves projection, completion predicates, and dependency release. Resolver validates the closed request, binds protected values, invokes only the selected registered delegate, and returns resolution plus raw launch evidence. This revision establishes a delivery graph, not runtime acceptance.

This Plan links exactly one Work and one matched Waves document. Waves links back to the same Work and Plan and is the sole executable graph; the strategy below is explanatory rather than a second item decomposition. No `tasks.md` is created or interpreted.

## 2. Scope and strategy

The current source already contains direct dispatch and the manifest/lockfile select Pi `0.99.2`. Retain that candidate and earlier evidence; remove stale planning claims that it is still pinned to `0.85.1` or lacks dispatch. Preserve original item/Wave identities and add three new review-driven prerequisite outcomes rather than renaming the old outcomes or silently repeating completed side effects.

First reconcile the tuple. Then repair single-call wording across the Router prompt's branches, registered Resolver/schema descriptions, and focused tests, using the externally corrected strategy as a read-only comparison. One `resolve_delegation` call validates, binds, and internally executes the selected registered delegate once; the Router must not call spawn separately for that same outcome after its response. Any later independent outcome requires its own Resolver call and positive effective contract/resource permission. End-turn requirements remain binding.

Next repair thrown-undefined raw-error serialization at the extension boundary. Preserve resolved resolution, selected tool, and exactly one raw discriminator in both details and YAML/text. `Error`, object, and `undefined` throws remain raw errors; returned `isError` envelopes remain raw returns. Choose the smallest key-preserving display representation within the existing authority and prove it by focused parse/round-trip checks. Do not synthesize Handler status or error business content.

Then establish the effective loaded delegate registration and its provenance, startup/forwarding contract, Handler/Skill/reference support, stable identity/state, full Result path and correlation, applicable generation, notification ownership, and same-turn/end-turn/resource limits. Read-only loaded-contract inspection may suffice; source/catalog/test-stub evidence alone does not. If live bootstrap is necessary and unavailable, this evidence outcome is blocked and releases no dependent.

After those gates, revalidate existing Pi dependency/host and Resolver predicates against current candidate bytes. Reuse relevant prior evidence when supported; do not upgrade again or rebuild dispatch merely because old derived text is stale. P1 retains the confirmed `0.99.2` target, Node compatibility, Pi-family consistency, and target `executeTool` contract verification. A newly consequential dependency/API decision blocks instead of silently changing the target. P2 rechecks controlled dispatch and Resolver/Router ownership and permits only demonstrated remaining in-scope repairs.

Independent correctness/evidence review remains a separate final read-only outcome. It consumes the full predecessor Results, actual diffs, authority correspondence, focused evidence, effective provenance, and live limitations. It cannot repair or waive a missing predicate.

## 3. Required gates and dependencies

The selected Plan's complete delivery outcome requires every gate `W0`, `W4`, `W5`, `W6`, `W1`, `W2`, and `W3`, with the final W3 review gate last. The executable item chain is declared only in Waves; original IDs retain their original meanings despite the insertion of new prerequisite Waves.

Single-call and raw-error repairs serialize because they write the same extension/test surfaces and share the launch-response contract. Effective-registration evidence follows them so its observed candidate can be correlated to the repairs. That evidence gates both further dependency/Resolver work and final review; the dependency/host predicate in turn gates Resolver verification/remaining repairs. These are explicit dependencies and conflicts, not barriers inferred from numbering. Shared read-only authority inputs do not conflict.

A gate releases only when its listed item has an adoptable `completed` Result, required evidence, and passing release checks. `partial`, `failed`, `blocked`, absent, malformed, contradictory, or insufficient evidence remains unsatisfied. The Router retrieves and projects full Results before making a release decision; neither terminal backend state nor a completed Todo alone proves gate release. In particular, a blocked effective-registration item cannot be relabeled completed using static checks.

## 4. Ownership and verification

The current P0 outcome owns only the four existing tuple files. It validates reciprocal links, exact Plan/Work/Waves cardinality, stable unique IDs, resolved acyclic item/Wave prerequisites, explicit predecessor gates, one Handler/Result predicate per item, ownership/conflicts, and preservation of paths outside the tuple. It performs no runtime checks or implementation.

Later repair ownership is limited to Router/registered Resolver wording and raw-error extension serialization with focused tests; the strategy stays read-only. Effective registration and final review are separate read-only Results. Dependency/host revalidation observes the existing manifest/lockfile and installed target declarations. Resolver revalidation reuses the existing implementation and changes only demonstrated remaining defects on its named surfaces. Item predicates and exact write ownership live in Waves.

Static verification can establish prompt/schema wording consistency, internal and serialized raw discriminators, pre-launch rejection, protected forwarding, selected-tool call counts, manifest/lockfile alignment, target declarations, and graph/link structure. Focused tests must include `Error`, object, and `undefined` throws; returned nested `isError`; blocked-no-launch; resolved-on-attempt; and exactly-one capture. Run the relevant package tests and required typecheck after source repairs, without treating stubs as runtime provenance.

Effective loaded-registration evidence must tie the actual registered delegate to its source/configuration/version or observable generation and establish the Backend Adaptation capabilities and Result mapping. An authorized live trace would be separate evidence; no current bootstrap or loaded-contract conclusion is asserted here. Final review reports verified, limited, and unverified facts separately and retains the live-bootstrap limitation.

## 5. Risks and blockers

- The externally corrected strategy and partially corrected Router Phase 3 do not establish that every prompt branch and registered description agrees. P4 requires a complete bounded comparison and regression check.
- YAML may omit an undefined-valued property even when the internal union has the correct key. P5 must check details and parsed text, without conflating an absent launch with a raw error.
- Effective delegate registration/provenance and the full Result path may be unavailable without live bootstrap. P6 returns blocked with precise missing evidence; W6 and its declared dependents remain closed.
- Old dependency or bridge evidence may not describe the current installed target/candidate. P1/P2 must correlate reused evidence to current bytes and report unsupported facts rather than repeating an upgrade or inventing a mapping.

## 6. Exclusions

This update performs no source/test/strategy/authority/manifest/lockfile edit, registry upgrade, installation, activation, reload, launch, live bootstrap, staging, commit, or deployment. It preserves unrelated dirty changes. Future items are bounded by existing confirmation and their Waves ownership; a changed consequential dependency or authority decision is not selected here.

No codemode sandbox, new spawn/integrated tool, arbitrary tool execution, tool-category allowlist, wrapper/backend registry, retry/fallback/substitution, scheduler/queue, lifecycle orchestration, polling/join/cancel/remove, automatic progression, persistent identity infrastructure, Node API migration, or historical Tasks migration is included.

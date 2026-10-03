# ADR-0010: Visible Authority Assessment and Conditional SDD

- Status: accepted
- Date: 2026-10-04
- Decision identity: `pre-planning-authority-assessment-and-conditional-sdd-v1`
- Delivery state: accepted decision, implementation pending; dependent authority reconciliation is not performed by this record.
- Acceptance basis: the current user explicitly accepted the visible assessment and conditional SDD direction and authorized recording this decision. This is not acceptance of an implementation Plan, commit, or runtime change.
- Related: [ADR-0004](0004-use-situational-skill-composition.md), [ADR-0001](0001-router-resolver-handler-boundaries.md), [ADR-0007](0007-authority-first-router-admission.md), [Router Delegation PRD](../prd/router-delegation.md), [Router Delegation Specification](../spec/router-delegation.md), [Skill Library Specification](../spec/skill-library.md).

## Context and evidence

The existing authority-first workflow requires settled intent and applicable PRD, ADR, and Spec coverage before dependent implementation planning. Situational composition also permits direct selection of a narrow writer. These are compatible rules, but the applicability judgment can remain implicit: a reader cannot readily distinguish adequate existing authority, a required amendment, a new decision lifecycle, a justified omission, and a blocking gap.

The supplied causal investigation supports an asymmetry between explicit strategy loading and the SDD entry, and a visibility risk in authority classification. It does **not** establish that low SDD usage caused missing ADRs. Its three samples were covered by existing ADRs; the recent Todo cleanup amendment belonged to **ADR-0001**, not ADR-0005. Actual model Skill-loading rates, decision-omission rates, their causal relationship, and installed-runtime conformance were not measured. An explicit SDD load, authority-first delivery, and a newly numbered ADR are different observations.

Evidence provenance: `trace-sdd-adr-adoption`, generation 1, completed investigation; report access time `2026-10-04T02:20:37+08:00`, inspected repository HEAD `4d6e8fdabb14ebaea66547f920ee875fd6f5e42e`. Its source table E1-E11 identifies the inspected instructions, authority, samples, and evidence limitations. The local report locator is:

`c:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/trace-sdd-adr-adoption-artifacts/result-1.json`

Report-container SHA-256: `1AAF38F67EA98614163A5E4C1C120408960BD0C7BA1F24DD471ABCA2E159E155`. This local provenance is not a portable repository artifact or a runtime attestation. The accepted direction comes from the user's decision, not from treating the investigation's recommendations as authorization.

## Decision drivers

- Make authority coverage and ownership observable before dependent planning, without measuring compliance by SDD-call or new-ADR counts.
- Use SDD where authority needs reconciliation, while retaining settled narrow-writer entry and reliable evidence reuse.
- Preserve Router-owned communication and coordination, Handler single-outcome execution, existing authorization, and first-tuple preparation without a prerequisite cycle.
- Reuse document owners and decision lifecycles; do not introduce a new catalog, receipt, registry, Resolver classifier, or mandatory workflow phase.

## Decision

### Visible pre-planning assessment

For a durable behavior change or an accepted architectural or governance change, the Router must make the applicability and disposition of PRD, ADR, and Spec authority visible **before deriving the dependent implementation plan**. Each family must be accounted for; non-applicability must have a reason rather than silently disappearing.

Use existing coordination explanations or a bounded assessment Result to state each family's action, owning boundary and existing or intended path, and a one-sentence evidence-backed reason:

| Action | Meaning |
| --- | --- |
| `reuse` | Existing authority adequately covers the settled scope; name the owner and path. |
| `update` | The same owner or decision identity needs an amendment; identify the material gap and owning path. |
| `create` | Required authority is missing, or an accepted ADR decision has a distinct lifecycle; identify its owner and intended output path. |
| `skip` | That authority family needs no change or is not applicable to this bounded scope; explain why. |
| `blocked` | Required coverage, ownership, evidence, permission, or intent cannot be established; identify the gap instead of permitting dependent planning. |

A new output path is a declared target, not a claim that it already exists or a required readable reference. Unknown ownership must be reported as unresolved, not invented. An assessment establishes coverage and handling, not authority-writing permission or implementation confirmation. Required reconciliation must be complete before dependent planning uses the changed authority.

A sufficiently reliable assessment may be reused when it still covers the current scope, decisions, owners, and relevant authority versions. Material scope or authority changes, contradictory evidence, or important coverage uncertainty require re-assessment of the affected portion; neither every stage nor every Handler call requires a fresh assessment or SDD reread. No separate persisted assessment document, Result field, approval round, or loaded-state receipt is required.

### Conditional SDD and narrow entry

When authority is missing, false, materially incomplete, or subject to an important unresolved coverage question, use the [spec-driven-development method](../../skills/spec-driven-development/SKILL.md) to assess and reconcile the applicable authority. For a bounded domain outcome needing this method, load it through Pi's normal Skill mechanism as primary, companion, or a conditionally required Skill when new evidence establishes the need.

The Router applies routing and coordination rules to available evidence; it must not perform project-domain reading or assessment itself. When it needs domain evidence, it delegates **one authority-assessment outcome** and consumes that Result. An authorized owning-writer outcome may then use settled evidence directly; an assessment Handoff must not also conceal independently valuable PRD, ADR, Spec, planning, or implementation outcomes.

SDD guides only the Handler's current delegated outcome. Its references to clarification, documentation, planning, implementation, or review do not let the Handler schedule stages, create delegations, choose continuation, or ask the user. Material unsettled product or architecture questions are returned as evidence and gaps for Router-owned user communication, not silently decided.

Settled authority and a known narrow writing objective may enter the corresponding writer directly under [ADR-0004](0004-use-situational-skill-composition.md#decision). SDD is not the exclusive ADR entrance, a permanent controller role, or a mandatory reload at each delivery phase. Direct entry does not waive the visible assessment, authority, or authorization obligations where they apply.

### ADR ownership and preparation compatibility

Apply the existing [ADR writer lifecycle method](../../skills/documentation-adr-writing/SKILL.md#method): update the owning ADR for the same decision identity; create a new ADR only for a distinct accepted decision lifecycle. Never record an unaccepted proposal as an accepted ADR. File count, change size, SDD invocation, and an absence of newly numbered ADRs do not determine decision coverage.

This record has a distinct identity: an observable pre-planning assessment obligation and conditional Skill-selection contract. It supplements ADR-0004's general composition decision; it does not supersede that ADR's dynamic eligibility, per-Handoff roles, or narrow direct entry. ADR-0007 continues to own admission and preparation; ADR-0001 continues to own responsibility separation and its Todo cleanup amendment. Neither existing decision is rewritten by this record.

Authorized behavior-neutral maintenance and restoration retain their [existing narrow exceptions](../spec/router-delegation.md#12-collaborative-authority-and-layered-delivery). A focused, evidence-backed `skip` or `reuse` must remain possible; the visibility obligation is not a mandate for a new Spec, ADR, or Plan on every repair. Material ambiguity or new behavior cannot be disguised as maintenance.

Initial assessment, explicitly authorized authority writing, and first Work/Context/Plan/Waves preparation retain [standalone preparation](../spec/router-delegation.md#preparation-boundary). They must not require the future tuple they are preparing as an input. The decision adds no admission path or loop, and cannot relabel selected planned work as standalone to evade its prerequisites. Later implementation still requires its applicable authority, scope disclosure, confirmation, dependencies, and verification.

## Alternatives considered

These alternatives were considered in the accepted discussion; no comparative trial or measured omission reduction is claimed.

- **Keep only the existing implicit judgment.** Not selected: authority-first principles and narrow writers already exist, but the disposition and owner can remain unobservable before planning. The decision adds visible handling rather than assuming a missing writer or proven historical omission.
- **Force SDD on every change or delivery phase.** Not selected: repeated loading adds cost without new evidence for settled work, conflicts with situational narrow entry, and encourages treating a method as a fixed multi-stage Handler workflow. Conditional use addresses material authority gaps.
- **Force a new ADR for every change or accepted amendment.** Not selected: it creates competing authority for the same decision lifecycle and treats normal owner reuse as failure. Coverage and identity, not the number of files, govern create versus update.

## Consequences and costs

Positive: planning inputs have inspectable coverage and owners; `reuse` and justified `skip` remain first-class outcomes; material gaps receive the SDD method; settled writers remain directly usable; unaccepted proposals and distinct decision lifecycles remain distinguishable. Evidence can be reused without an extra permanent artifact or backend mechanism.

Costs and risks: the Router must expose and interpret the assessment; domain evidence can require a bounded assessment delegation; freshness, materiality, and coverage still require judgment. Boilerplate classifications or stale reuse can look compliant without establishing coverage. Loading SDD does not prove model obedience, and this record does not prove fewer omissions. Dependent authority and later instructions need reconciliation to avoid inconsistent obligations.

Compatibility: the new observable duty and conditional selection rule refine workflow expectations but do not change Handoff/Result fields, Skill discovery, Resolver legality checks, admission schemas, backend behavior, or authority-writing permissions. Existing historical records and unrelated ongoing work remain unchanged.

## Affected authority and delivery boundary

This ADR records the accepted decision only. The following existing owners are the reconciliation targets; they are **not changed by this record**:

| Owner | Relationship to this decision |
| --- | --- |
| [Router Delegation Specification, section 1.2 / C1](../spec/router-delegation.md#12-collaborative-authority-and-layered-delivery) | Own the verifiable pre-planning assessment, reuse/handling, and authority-first dependency contract. |
| [Router Delegation Specification, section 1.3](../spec/router-delegation.md#13-evidence-branch-scheduling-and-strategy-loading) | Own Router routing responsibilities and domain-assessment delegation without widening Handler coordination. |
| [Skill Library Specification, sections 1 and 3](../spec/skill-library.md) | Own conditional SDD selection/loading and continued settled narrow entry under situational composition. |
| [Router Delegation PRD, Success Criteria](../prd/router-delegation.md#success-criteria) | Reuse existing product intent and role boundaries; reconcile the observable assessment outcome where product coverage would otherwise be materially incomplete. |

Later instruction alignment belongs to the existing Router prompt, `delegation-strategy`, SDD, and applicable documentation methods, within those owners' separate implementation boundaries. Existing ADR lifecycle guidance is reused, not a reason to rewrite ADR-0001 or manufacture another owner. This ADR neither writes those instructions nor creates Work, Plan, Waves, indexes, tests, or runtime changes, and it does not authorize Git staging, signed commit, installation, reload, or deployment.

## Verification boundary

Later workflow evidence must distinguish adequate coverage -> `reuse`, the same decision identity -> `update`, a distinct accepted lifecycle -> `create`, an unaccepted proposal -> no accepted ADR, justified behavior-neutral maintenance -> `skip`, and an unresolved material gap -> SDD-guided assessment / `blocked` before dependent planning. It must also preserve reliable assessment reuse, settled narrow entry, first-tuple standalone preparation, and Handler evidence return instead of direct user questioning or multi-outcome execution.

Document structure, links, consistency, and diff checks establish this record only. Static instruction assertions would establish wording only. Real conversation/delegation evidence is needed to establish Router/Handler behavior; no model-loading frequency, omission-rate measurement, runtime acceptance, or implementation verification is claimed here.

## Revisit criteria

Revisit or supersede this decision if controlled conversation evidence shows that the conditional boundary consistently misses material coverage gaps, causes repetitive assessments or first-tuple cycles, or permits stale reuse; if settled narrow entry or Router/Handler responsibility boundaries change; or if an evidenced need requires a different assessment surface or loading contract. Any broader gate, receipt, registry, mandatory phase, or changed authority lifecycle requires its own accepted decision, not an implementation shortcut.

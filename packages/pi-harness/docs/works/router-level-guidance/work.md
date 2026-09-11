# Work: Router Reasoning/Impact Level Guidance

- Status: implementation reviewed at T4 GO; T5 evidence synchronization in progress; final same-byte review and selective-commit eligibility pending
- Updated: 2026-08-26
- Nature: derived coordination material; not product or technical authority, acceptance evidence, or implementation authorization
- Work identity: `router-level-guidance`

## Objective

Clarify the Router's reasoning and impact level guidance so it selects the least sufficient semantic capability requirements from the concrete objective, ambiguity, reasoning needed for correctness, consequences, and verification burden. The guidance must remain independent of Skill names, document types, and workflow phases.

## Authority

- [Provider/Model/Thinking Capability Selection Specification](../../spec/provider-model-thinking-capability-selection.md)
- [Router Delegation Specification](../../spec/router-delegation.md)
- Related product authority for possible reconciliation: [Provider/Model/Thinking Capability Selection PRD](../../prd/provider-model-thinking-capability-selection.md) and [Router Delegation PRD](../../prd/router-delegation.md)
- [Processed Context](context.md)

The linked specifications remain the current authority. This Work records accepted planning scope; it does not amend authority or itself prove user acceptance.

## Settled guidance boundary

Reasoning and impact are separate finite non-negative integer requirements. The Router must make a fresh judgment from the concrete work rather than infer a level from a Skill, document type, or phase.

- Reasoning `0`: mechanical work with clear boundaries.
- Reasoning `1`: a settled small implementation or check, or simple documentation reconciliation.
- Reasoning `2`: ordinary Plan/Tasks work, independent review, or multi-file impact analysis.
- Reasoning `3`: final review involving architecture, security, migration, authority conflict, a complex root cause, or unusually difficult uncertainty. `3` is not a protocol maximum.
- Impact `0`: local, reversible, and without external impact.
- Impact `1`: bounded to one module.
- Impact `2`: cross-module or materially behavior/compatibility-affecting.
- Impact `3`: high-consequence, hard-to-reverse, or involving security, data, or external-system risk.

Planning and review do not automatically raise impact. The two axes must not be collapsed into a total score.

## Candidate delivery boundary

The baseline suggests the smallest implementation path:

- update the Router prompt at `packages/pi-harness/extensions/pi-harness.ts#routerPrompt`;
- add or adjust prompt-contract coverage in `packages/pi-harness/tests/extension.test.ts`;
- reconcile the Router semantics in §6 of `packages/pi-harness/docs/spec/provider-model-thinking-capability-selection.md`;
- reconcile amendment `#42` in `packages/pi-harness/docs/spec/router-delegation.md`;
- reconcile both related PRDs within the six-path boundary settled in [Plan](plan.md#exact-six-path-delivery-boundary).

The Resolver contract remains unchanged: finite non-negative integer inputs, qualification on both axes, surplus ordering, one Registry snapshot, and least-sufficient selection. No natural-language automatic classifier is proposed. `/harness config` UI and a complete protocol-schema copy of the classification table are outside the default scope.

## Current stage

Current stage: T3 technical verification passed and T4 independent review returned GO with P0-P3 zero for the pre-reconciliation candidate. T5 updates documentary evidence only. The previous planning-review status below is historical, not a current implementation blocker. T5 bytes require a fresh independent review before selective-commit eligibility; no receipt, T6 completion, or operational authorization is created. See [Context](context.md#t3-t4-evidence).

## Completion signal

This Work is complete only when the accepted scope is implemented and its prompt-contract and authority reconciliation evidence show that the Router guidance reflects both independent axes without introducing phase or artifact-type mappings, while the existing Resolver contract remains intact.

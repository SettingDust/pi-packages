# Work: #42 Model Capability Guidance

- Status: draft; implementation confirmed; T1/T2 complete; T3 reviewed with no P0-P2 findings; T4 review and implementation merge complete; four-document review, commit, re-merge, and cleanup pending
- Updated: 2026-08-26
- Nature: derived coordination material; not product or technical authority and not acceptance evidence
- Decision identity: `#42-model-capability-guidance-v1` (draft)

## Objective

Make the existing `/harness config` capability inputs understandable to users who must provide `reasoning` and `impact` values. The guidance is inline in the two existing input titles; it does not add a command, screen, or selection policy.

This Work records the bounded candidate change and its implementation evidence. It does not authorize acceptance or changes to the accepted #42 selection contract.

## Authority and Baseline

- [Provider/Model/Thinking Capability Selection Specification](../../spec/provider-model-thinking-capability-selection.md)
- [Accepted #42 Work](../provider-model-thinking-capability-selection/work.md)
- [Accepted #42 Context](../provider-model-thinking-capability-selection/context.md)
- [#42 PRD](../../prd/provider-model-thinking-capability-selection.md)
- [#42 ADR](../../adr/0009-provider-model-thinking-capability-selection.md)

The accepted specification already defines finite non-negative integer capabilities and semantic 0..3 Router guidance. This bounded Work addresses only the discoverability gap in the existing configuration UI.

## Problem

In `/harness config`, users currently see the labels `Reasoning capability` and `Impact capability` without enough information to understand the numeric meaning. Users cannot reliably tell whether the values are bounded, what the example levels mean, or whether the two dimensions must be treated as one combined scale.

## Proposed Bounded Change

Add precise inline guidance to the existing two input titles:

- Reasoning: finite integer `>= 0`; `0` routine, `1` modest, `2` substantial, `3` exceptional; `0-3` is guidance, not an upper bound.
- Impact: finite integer `>= 0`; `0` routine, `1` modest, `2` substantial, `3` exceptional; `0-3` is guidance, not an upper bound.

The reasoning and impact axes are independent. The guidance must not imply a weighted score, a combined scale, a hard maximum of 3, or a phase-to-level mapping.
## Alternatives Considered
| Alternative | Discoverability | Change cost | Interaction burden | Compatibility with current config flow |
|---|---|---|---|---|
| Inline guidance in the existing input titles (retained) | Immediate, at the point where each value is entered | Low; two existing title literals and focused assertions | None beyond the existing prompts | Exact; preserves the current inputs, order, validation, and command flow |
| Independent help command | Discoverable only if users know to leave config and look for help | Medium; adds a command and maintained help text | Extra navigation and context switching | Partial; leaves the unclear inputs unchanged and adds a separate surface |
| Custom UI | Potentially high if the new screen is found and understood | High; replaces or substantially wraps the existing config interaction | Higher; adds a new screen and interaction model | Low; introduces a new UI surface for a problem the existing flow can explain |
The retained approach has the lowest cost and interaction burden while putting the contract at the decision point. The alternatives are excluded from this Work and do not authorize a command, screen, or selection-policy change.

## Candidate Implementation Boundary

Only these implementation paths are candidates for this bounded change; both are now implemented and remain the complete implementation boundary:

- `packages/pi-harness/src/config-command.ts`
- `packages/pi-harness/tests/config-command.test.ts`

The fixed source anchor is `config-command.ts` symbol `inputCapabilities`, specifically the two `ctx.ui.input` title literals now containing the agreed guidance (current lines 191-192). The source change is limited to those titles.
The test anchor is `config-command.test.ts` test `"adds a candidate with explicit capability values"`: its input sequence supplies `"2"` and `"1"`, its repository assertion checks `reasoning: 2` and `impact: 1`, and its focused assertion checks both visible titles.

## Explicit Exclusions

- No schema or Resolver request change.
- No selection algorithm, qualification rule, settings key, or persistence change.
- No `help` command, custom UI, new command, new screen, or phase mapping.
- No change to the accepted capability semantics or the independent axes.
- No `docs/README.md` entry in this Work.
- No ADR update, including cleanup of ADR-0002 or the old #42 Work.
- No backend, Herdr, Pi core/Host, dependency, runtime, session, or Git operation.

`docs/README.md` entry and ADR-0002/old Work cleanup are independent follow-up work and are outside this draft.

## Current Stage

- Work, Context, Plan, and Tasks remain derived coordination material and do not constitute product or technical authority. The user confirmed implementation. T0 baseline/freeze was completed, T1 implemented the bounded two-file change, T2 passed focused 13/13, full 136/136 (539 assertions), typecheck, diff-check, and frozen-install verification, and T3 found no P0-P2 findings. T4 final same-byte review returned GO with P0-P3=0. Implementation commit `7d30b947a7c69ca630599e0b284b08b5e04a3302` was merged into main by merge commit `287645575e4510d7d66303237eca2311aa55043b`. The four-document independent review, documentation commit, second main merge, and worktree/branch cleanup remain pending.

## Completion Signal
The four-document lifecycle is reconciled through implementation merge: T0-T4 evidence is recorded, including final same-byte review GO (P0-P3=0), focused 13/13, full 136/136 (539 assertions), typecheck, implementation commit `7d30b947a7c69ca630599e0b284b08b5e04a3302`, and main merge commit `287645575e4510d7d66303237eca2311aa55043b`. Independent review of these four documents, their separate documentation commit, a subsequent main merge, and worktree/branch cleanup remain pending. No such documentation Git operation or cleanup is claimed here.

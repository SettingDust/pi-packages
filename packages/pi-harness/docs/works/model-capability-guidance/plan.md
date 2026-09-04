# Plan: #42 Inline Model Capability Guidance

- Status: draft; implementation confirmed; T1/T2 complete; T3 reviewed with no P0-P2 findings; T4 review and implementation merge complete; four-document review, commit, re-merge, and cleanup pending
- Updated: 2026-08-26
- Work: [work.md](work.md)
- Context: [context.md](context.md)
- Authority baseline: [#42 PRD](../../prd/provider-model-thinking-capability-selection.md), [#42 ADR](../../adr/0009-provider-model-thinking-capability-selection.md), [#42 Specification](../../spec/provider-model-thinking-capability-selection.md)
- Decision identity: `#42-model-capability-guidance-v1` (draft)

## Objective

Make the existing `/harness config` reasoning and impact inputs understandable by adding complete, inline capability guidance to their existing input titles. Preserve the current input flow and finite non-negative integer validation.

This Plan is derived coordination material. It is non-authoritative and does not authorize implementation or acceptance.

## Scope

The bounded implementation changed only:

- `packages/pi-harness/src/config-command.ts`
- `packages/pi-harness/tests/config-command.test.ts`

The source change is limited to the titles passed to the two existing `ui.input` calls in `inputCapabilities`:

- `Reasoning capability (finite integer >= 0; 0 routine, 1 modest, 2 substantial, 3 exceptional; 0-3 guidance, not an upper bound)`
- `Impact capability (finite integer >= 0; 0 routine, 1 modest, 2 substantial, 3 exceptional; 0-3 guidance, not an upper bound)`

Host width constraints may require equivalent wording, but each title must preserve the finite-integer contract, the zero lower bound, all four semantic examples, and the fact that 0-3 is guidance rather than an upper bound. The two axes must remain visibly independent; the wording must not imply a combined score, weighting, hard maximum, or phase mapping.

Tests may add the smallest focused assertions that the two input titles contain the required guidance and may retain or extend the existing input-flow/validation coverage. No production behavior other than visible title text is in scope.
## Alternatives and Rationale
| Alternative | Discoverability | Change cost | Interaction burden | Compatibility with current config flow |
|---|---|---|---|---|
| Inline guidance in the existing input titles (retained) | Immediate where the user enters each value | Low; two title literals plus focused assertions | None beyond the current prompts | Exact; preserves the existing command flow and controls |
| Independent help command | Available only after users navigate away from config | Medium; adds a command and maintained help content | Extra navigation and context switching | Partial; leaves the input titles unclear |
| Custom UI | Potentially high, but only after finding and learning a new screen | High; adds or replaces the established UI structure | Higher; introduces new interaction and maintenance burden | Low; changes the current config surface for a wording problem |
Retain inline title guidance because it gives the needed information at the point of entry with minimal change and no added interaction. The alternatives are out of scope.
## Fixed Source and Test Anchors
The fixed source anchor is `packages/pi-harness/src/config-command.ts`, symbol `inputCapabilities`, specifically the two `ctx.ui.input` title literals at current lines 191-192. The implemented source change is limited to those literals.
The focused test anchor is `packages/pi-harness/tests/config-command.test.ts`, test `"adds a candidate with explicit capability values"`. Its inputs are `"2"` and `"1"`, its repository assertion checks `reasoning: 2` and `impact: 1`, and its focused assertion checks both visible titles.

## Non-goals

- No schema, Resolver request, selection algorithm, qualification rule, or capability semantics change.
- No settings key, persistence, scope, locking, migration, fallback, or replacement behavior change.
- No new command, screen, control, help surface, UI framework, dependency, or README entry.
- No phase-to-level mapping or combined reasoning/impact score.
- No ADR, PRD, Specification, accepted #42 Work/Context, backend, Herdr, Pi core/Host, runtime, session, or Git change.

## Implementation Strategy

1. Update only the two existing input title literals in `inputCapabilities`.
2. Keep the existing defaults, input order, cancellation behavior, numeric conversion, and finite non-negative integer predicate unchanged.
3. Extend the focused command test harness only as needed to observe input titles, then assert the reasoning and impact guidance independently while exercising the existing input path. Avoid broad snapshot or unrelated UI assertions.

No dependency exists between the two title edits beyond their shared contract, but the source and test edits must be reviewed and verified together because the test assertions describe the visible strings.

## Execution Gate and Verification
- T0 baseline/freeze was completed. The user confirmed implementation, T1 completed the bounded source/test change, T2 passed focused 13/13, full 136/136 (539 assertions), typecheck, diff-check, and frozen-install verification, and T3 review found no P0-P2 findings. T4 final same-byte review returned GO with P0-P3=0. Implementation commit `7d30b947a7c69ca630599e0b284b08b5e04a3302` was merged into main by merge commit `287645575e4510d7d66303237eca2311aa55043b`. Independent review of these four documents, their separate documentation commit, a subsequent main merge, and worktree/branch cleanup remain pending. All four documents remain draft derived coordination material and do not constitute product or technical authority.
## Verification

Run the focused `config-command` test file in the isolated worktree. The verification must demonstrate:

- both existing input titles expose the required guidance;
- reasoning is still prompted before impact;
- ordinary numeric values still flow into the existing candidate configuration;
- existing finite non-negative integer rejection remains intact; and
- no unrelated configuration behavior is changed by the bounded edit.

The implementation diff was inspected and confirmed to contain only the two permitted paths. This Plan-writing reconciliation itself requires no source/test execution.

## Rollback and Risks

If the focused verification fails or the host UI cannot display the wording without obscuring the contract, revert only the two title/test changes and preserve the existing configuration behavior. Do not shorten the text by dropping a required semantic fact; use an equivalent title wording only within the same two input labels.

The primary risk is title width reducing discoverability. The mitigation is concise inline wording that retains all contract facts and focused assertions for the visible text. There is no data migration or runtime compatibility risk because the change does not alter parsed values or control flow.

## Completion Boundary

- This Plan remains draft coordination material and now accurately records the two-title boundary, alternatives evidence, fixed anchors, completed T1-T4 evidence, implementation and main merge identities, and the pending four-document lifecycle. This reconciliation performs no source/test change or documentation Git operation or cleanup.

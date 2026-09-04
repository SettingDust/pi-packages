# Context: #42 Model Capability Guidance

- Status: draft processed context; implementation confirmed; T1/T2 complete; T3 reviewed with no P0-P2 findings; T4 review and implementation merge complete; four-document review, commit, re-merge, and cleanup pending
- Updated: 2026-08-26
- Work: [work.md](work.md)
- Decision identity: `#42-model-capability-guidance-v1` (draft)

## Objective and Problem

The existing `/harness config` flow asks for `reasoning` and `impact` through two `ui.input` calls, but their titles do not explain the numeric contract. A user cannot reliably infer the intended scale, whether values above 3 are allowed, or whether the two dimensions are independent.

This is an inline input-guidance problem, not a missing command, schema, selection algorithm, settings-key, or custom-UI problem.

## Accepted Baseline Facts

- The current #42 specification defines candidate capabilities as finite non-negative integers.
- The semantic levels `0`, `1`, `2`, and `3` mean routine, modest, substantial, and exceptional respectively.
- The `0..3` levels are Router guidance and are not a hard maximum; values above 3 remain valid when they are finite integers greater than or equal to zero.
- Reasoning and impact are independent axes. They must not be combined into one score or treated as a phase taxonomy.
- The existing source already validates the entered values as finite integers greater than or equal to zero.
- The existing settings key and nested candidate configuration remain unchanged.

## Proposed UI Guidance

The two existing input titles should each state the complete contract inline:

- `Reasoning capability (finite integer >= 0; 0 routine, 1 modest, 2 substantial, 3 exceptional; 0-3 guidance, not an upper bound)`
- `Impact capability (finite integer >= 0; 0 routine, 1 modest, 2 substantial, 3 exceptional; 0-3 guidance, not an upper bound)`

The wording may be adjusted for the host UI's title-width constraints, but it must preserve all of these facts: finite integer, lower bound zero, the four meanings, no upper bound at three, and independent axes. It must not introduce a new visible control or alter the input behavior.
## Alternatives Evidence
| Alternative | Discoverability | Change cost | Interaction burden | Compatibility with current config flow |
|---|---|---|---|---|
| Inline guidance in the existing input titles (retained) | Immediate at value entry | Low; changes two title literals and focused assertions | None beyond the existing prompts | Exact; preserves the current flow and input behavior |
| Independent help command | Requires leaving config and finding help | Medium; adds a command and separate content | Extra navigation and context switching | Partial; does not repair the unclear prompts |
| Custom UI | Potentially high but depends on finding a new screen | High; adds or replaces UI structure | Higher; introduces another interaction model | Low; changes the established config surface |
Inline guidance is retained because it addresses discoverability at the point of entry with the least code and no additional interaction. The alternatives remain excluded and do not authorize a new command or UI.
## Fixed Evidence Anchors
The implementation source anchor is `config-command.ts` symbol `inputCapabilities`, where the two `ctx.ui.input` title literals now contain the agreed guidance (current lines 191-192). Only those title literals are in the implementation boundary.
The focused test anchor is `config-command.test.ts` test `"adds a candidate with explicit capability values"`. It supplies the two input values `"2"` and `"1"`, asserts persisted `reasoning: 2` and `impact: 1`, and now asserts both input titles.

## Evidence Map

| Source | Observed fact | Use |
|---|---|---|
| [Current config command](../../../src/config-command.ts) | `inputCapabilities` currently prompts with complete inline guidance: finite integer >= 0; 0 routine, 1 modest, 2 substantial, 3 exceptional; and 0-3 guidance rather than an upper bound. The fixed literals are at current lines 191-192. | Candidate source change and regression boundary. |
| [Current config command tests](../../../tests/config-command.test.ts) | `"adds a candidate with explicit capability values"` at current lines 137-147 supplies the reasoning/impact inputs, asserts the resulting `reasoning: 2` and `impact: 1`, and asserts both visible input titles. | T0 baseline anchor and T1 location for the visible-title assertions. |
| [Accepted #42 Context](../provider-model-thinking-capability-selection/context.md) | The accepted capability contract, Router 0..3 semantic guidance, and implementation evidence are recorded there. | Baseline authority and evidence link. |
| [Accepted #42 Specification](../../spec/provider-model-thinking-capability-selection.md) | Numeric validation, uncapped requests/capabilities, independent capabilities, and non-goals are normative. | Preserve the accepted contract. |

## Candidate Scope

Only these paths were changed by the bounded implementation:

- `packages/pi-harness/src/config-command.ts`
- `packages/pi-harness/tests/config-command.test.ts`

The source edit is limited to the labels supplied to the existing two inputs. The test edit is limited to asserting the guidance and ensuring the existing input sequence/validation remains intact.

## Protected Boundaries and Follow-ups

The following are explicitly protected:

- schema and Resolver request shape;
- selection and qualification algorithm;
- `harness` settings key and persistence behavior;
- `help` command, custom UI, new command, new screen, and phase mapping;
- backend, Herdr, Pi core/Host, dependencies, runtime, sessions, and Git;
- accepted #42 authority documents.

Adding an entry to `docs/README.md` and cleaning up ADR-0002 or the old #42 Work are independent follow-up outcomes. They are not part of this Work or Context draft.

## Lifecycle and Open Work

- Work, Context, Plan, and Tasks remain derived coordination material; they do not become product or technical authority through this reconciliation.
- The user confirmed implementation. T0 baseline/freeze was completed, and T1 completed the two-file implementation and focused title assertions.
- T2 completed with focused `13/13`, full `136/136` (539 assertions), typecheck, diff-check, and frozen-install verification. The tracked implementation boundary remained exactly `packages/pi-harness/src/config-command.ts` and `packages/pi-harness/tests/config-command.test.ts`.
- T3 review found no P0-P2 correctness, scope, contract, or evidence findings. Its stale-lifecycle finding is resolved by this four-document reconciliation; T3 is not represented as commit authorization.
- T4 final same-byte review returned GO with P0-P3=0. Implementation commit `7d30b947a7c69ca630599e0b284b08b5e04a3302` was merged into main by merge commit `287645575e4510d7d66303237eca2311aa55043b`. Independent review of these four documents, their separate documentation commit, a subsequent main merge, and worktree/branch cleanup remain pending; none is claimed here.
- T0 baseline/freeze may run without implementation confirmation; it must verify the fixed source and test anchors and freeze the two-file implementation boundary.
- T1 implementation requires explicit implementation confirmation. No source or test changes are included in this documentation repair.
- T2 verification follows T1, T3 review follows T2, and the implementation merge is recorded after T4. The separate four-document review, documentation commit, second main merge, and cleanup remain pending.

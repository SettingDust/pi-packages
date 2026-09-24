# Router Visible-Outcome Workflow Tasks

- Work: [work.md](work.md); selected Plan for decomposition: [plan.md](plan.md).
- Authority: [Router Delegation Specification](../../spec/router-delegation.md), [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md), [ADR-0005](../../adr/0005-let-router-adapt-delegate-tools-directly.md), [ADR-0007](../../adr/0007-authority-first-router-admission.md), [PRD](../../prd/router-delegation.md).
- Status: derived execution units only. The earlier design approval and this document do not accept exact Plan/Tasks bytes, establish an admission receipt, or authorize implementation.

## Prerequisites and order

Normative reconciliation is complete in the compared clauses: Spec SHA-256 `9a3709c73eec8eeacf873838b147dfc2eab5c57d425a5e51c27008c114b0ef47`, ADR-0005 `33a11a84659cc17c6e046963ed17292bc6c01c7fc7d4079acaf5c6d120d3a404`, ADR-0001 `47d665bcf346f50ea4db1d662371d5d4de520291370d8646641defeb29ef96a9`. Do not schedule reconciliation again. The Plan/Work headers still describe older progress; they are not proof of current authority state or exact artifact acceptance.

Before planned delegation for T1, the Router must disclose the selected same-directory Work/Plan/Tasks tuple and decision-relevant authority in an ordinary message and obtain one current-user confirmation for that exact plan. The Router, not the Resolver or this document, owns confirmation. Substantive subsequent Plan/authority drift requires re-disclosure and reconfirmation; structural validation is still performed at resolve time. No receipt or automatic dispatch gate is introduced.

`T1 -> T2 -> T3`. All units are serial against the same candidate; no parallel-safe group is claimed. A failed check returns to its owning task for correction and invalidates affected downstream evidence.

## T1 - Implement prompt and focused tests

**Outcome:** Router instructions follow the four-phase visible-outcome workflow and focused prompt-contract tests guard it.

**Depends on:** reconciled authority and applicable planned-delegation confirmation above.

**Context/owned paths:** this Work, Plan, Tasks and governing authority; `packages/pi-harness/extensions/pi-harness.ts` (`routerPrompt`) and `packages/pi-harness/tests/extension.test.ts` (focused prompt-contract checks) only.

Identify/present independently observable user results and predicates before Skills/Handoffs; select one executable outcome; resolve its one-result Handoff and immediately delegate exact resolved prompt/model/thinking with fixed `handler`; receive and truthfully project the Result before the next decision or dependent release. Reuse visible Todo coordination. Distinguish one bug's internal reproduction/checks and one comparison's alternatives from separate user results. Retain distinct outcomes for conflicting writes and serialize them; allow shared read-only inputs only with no other conflict and positively proven current Host parallel capability, otherwise serialize. Preserve closed Handoff/admission schemas, authorization, existing Todo correlation/replay/recovery obligations, and Resolver/Handler ownership. No Host capability claim, dispatch gate, wrapper, queue, backend, protocol or persistence change.

**Evidence:** bounded two-path diff and focused generated-prompt assertions for phase ordering, outcome boundaries, conflicts, capability fallback, exact forwarding and Result handling. Prompt assertions prove wording, not live Router choices.

## T2 - Verify the candidate

**Outcome:** focused technical checks and distinct behavioral traces establish what the T1 candidate actually supports, with synthetic versus live evidence labeled separately.

**Depends on:** T1. **Context:** same Work, Plan, Tasks, authority, and exact T1 candidate; read-only verification, with fixes returned to T1.

Run `bun test tests/extension.test.ts` and `bun run typecheck` from `packages/pi-harness`; inspect the generated prompt and two-path diff against authority. Exercise traces for three independent requests (three terminal states even with a combined report), one bug with internal checks, one comparison decision, independent writes to one file (serial), and shared-read-only investigations (parallel only on positive current Host capability). Check phase ordering, pre-action `in_progress`, truthful `completed`/`partial`/`blocked`/`failed` projection before dependent release, duplicate/conflicting/replayed Result fail-closed handling, no silent durable-side-effect replay, authorization, and exact Resolver forwarding. If the available environment permits only synthetic prompt-contract traces, record that limit and do not infer live Router or Host behavior.

**Evidence:** commands, exit status, case-by-case observed outcomes and evidence type, changed-path inventory, and explicit gaps; no implementation completion claim from passing prompt tests alone.

## T3 - Independently review

**Outcome:** independent read-only correctness assessment of the exact T1 candidate and T2 evidence, with actionable findings or a supported completion judgment.

**Depends on:** T2. **Context:** same Work, Plan, Tasks and authority, exact candidate bytes/diff, and T2 evidence; no mutation in review.

Check authority correspondence, independent outcome boundaries, concurrency and failure/authorization paths, scope, test sufficiency, and unsupported live-runtime claims. A repair returns to T1 and requires affected T2 checks and fresh review on changed bytes.

**Evidence:** reviewer Result identifying candidate hashes, findings/severity or supported no-findings conclusion, and residual limitations. Review does not itself authorize commit, reload, deployment or any later operational action.

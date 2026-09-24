# Router Visible-Outcome Workflow Work

- Status: design approved by the user; Work established; normative reconciliation and implementation pending.
- Nature: derived coordination material, not product or technical authority or an admission receipt.
- Owner: `packages/pi-harness`.

## Objective

Reorganize Router decision-making around the user's independently observable outcomes before choosing Skills or composing Handoffs. Reuse the existing visible Todo or coordination mechanism. Implement the approved four-phase workflow: identify and present outcomes; select an executable outcome; resolve and delegate its exact invocation; receive and project its Result before selecting subsequent work.

## Authority and Context

- [Router Delegation Specification](../../spec/router-delegation.md)
- [Direct delegate-tool adaptation decision](../../adr/0005-let-router-adapt-delegate-tools-directly.md)
- [Authority-first Router admission decision](../../adr/0007-authority-first-router-admission.md)
- [Router Delegation PRD](../../prd/router-delegation.md)
- [Router/Resolver/Handler boundaries](../../adr/0001-router-resolver-handler-boundaries.md)
- [Completed coordination-flow repair](../router-coordination-flow-repair/work.md), historical context only; do not reopen its completed execution tuple.

The user approved the visible-outcome design with “可以” after the recommendation to replace the Router's organization rather than append prohibitions, and subsequently requested continuation. This approval covers that design; this Work does not manufacture acceptance of future document bytes or claim implementation has occurred.

Processed findings:

- The observed failure combined three independent user requests into one proposed research report. Report format and shared Skills must not determine outcome identity.
- Each outcome retains its user-request correspondence and completion condition. A final combined report does not merge its underlying execution or completion states.
- Reproduction, diagnosis and verification of one bug can remain one outcome. Comparing alternatives for one decision can remain one outcome.
- Independent outcomes that write the same file stay distinct but execute serially. Shared read-only source material alone does not create a dependency; parallel execution still requires positive Host capability evidence and absence of ownership, authority, side-effect or behavioral conflicts.
- The authority lookup found no active matching Work/Plan/Tasks tuple. Specification §1.1 currently requires disjoint inputs and needs reconciliation with the approved shared-read-only rule before implementing that rule.
- No hard dispatch gate was approved. Semantic decomposition remains a Router responsibility; structural correspondence checks would not establish semantic independence.

## Scope and Exclusions

Reconcile the affected Specification and ADR-0005 wording, then reorganize `extensions/pi-harness.ts` Router instructions and focused verification. Preserve current Handoff/admission schemas, exact resolved prompt/model/thinking forwarding, authorization and failure recovery obligations, truthful Result projection and existing Todo ownership.

No new task database, scheduler, queue, wrapper, splitting agent, persistent identity or mandatory dispatch gate. No Handler coordination change, backend implementation, Pi-core change, dependency update, commit, deployment or automatic reload. Resolver rendering, subagent_done streaming, direct Handoff transfer and join rendering remain separate outcomes outside this Work.

## Separate Outcomes and Dependencies

1. Reconcile normative workflow and parallel eligibility in the Specification and ADR-0005. Check supporting authority for actual contradictions without expanding product scope.
2. Derive the implementation Plan from reconciled authority and this Context.
3. Derive executable Tasks from that Plan, keeping prompt implementation, behavioral verification and independent review distinct.
4. Reorganize the Router prompt and focused tests within the resulting implementation boundary.
5. Verify behavior for three independent requests, one bug with internal checks, one comparison decision, and independent changes sharing a writable file.
6. Independently review the candidate and reconcile completion evidence.

Future `plan.md` and `tasks.md` belong directly in this directory. They do not exist at Work creation; this Work alone is not a selected planned-admission tuple. Dependent execution must use the actual established artifacts, not inferred directory state.

## Completion Signal and Current State

Complete only when reconciled authority, implementation and verification agree: independent user results retain separate delegation and completion states; internal checks for one result do not force unnecessary splitting; conflicting writes serialize; eligible shared-read-only investigations may run in parallel; Result handling and exact Resolver forwarding remain intact. Report synthetic verification separately from observed live Router behavior.

Current state: only this Work entry has been created. Normative reconciliation, Plan, Tasks, prompt changes, behavioral verification and independent review remain outstanding. Settled Context is embedded here; a separate context file is unnecessary.

# Router Delegation PRD

- Baseline status: accepted historical product authority
- #41 coordination amendment: accepted final authority; implementation complete; fresh same-byte T5c GO with P0/P1/P2/P3 all zero; T5a generation-2 `t5a-g2-f1` explicitly disposed (no defect found; one-confirmation exact-Plan lifecycle preserved) and `t5a-g2-f2` explicitly disposed with the synthetic/live-runtime limitation retained. Canonical T5c evidence raw `5fb37d6ebf5da11470849d6a534adf951bd3a231156f89ab08de1cc36136f091`, output `f1a490e64101ae270d1a5bf8ef05542c2b25a364d53a0cf2e7645112d8a62bef`, record `cbf8d83f6a5739cf914dafb6c06c7a626010a0aa5c7c4ab1b7d819b418346ea3`. Synthetic prompt-contract and no-live-runtime limitations remain; commit, reload, activation, deployment, staging, and push remain pending and were not performed.

## Problem

A Pi main session needs to handle arbitrary user input without treating every request as immediate domain work. It must decide whether to respond directly or coordinate delegated work, select the Skills and model investment appropriate to that work, and retain control over the next step after a Handler returns.

## Product

`pi-harness` is a dedicated Pi package that replaces the default main-session system prompt with a Router prompt. The Router coordinates work; it does not perform project-domain reading, research, editing, execution, or independent verification itself. When delegation is needed, the Router builds a structured Handoff, selects one primary Skill and optional companion Skills, selects a configured Model Role, resolves the request, and adapts the resolved invocation to an environment-provided delegate backend. The Router maintains a bounded, environment-adaptive main-session Todo projection for multi-step coordination: it uses available native task status and fields when they express the needed fact, otherwise it preserves the closest truthful native status and records partial, failed, blocked, conflict, and stale facts in existing descriptions, subjects, or ordinary Router coordination messages. It uses identity and visible fields/messages already available in the environment for correlation; it does not require persistent subagent identity or generation records, canonical Result digest storage, restart/outbox APIs, exact Todo description mutation, or matching native terminal states. If safe correlation or cleanup cannot be established, it retains the Todo and reports the limitation. Handler Results return to the Router for the next decision.

## Outcomes

- Main-session responses can remain direct for clarification, summaries, completion, blocking conditions, and other work that does not need delegation.
- Delegations carry validated Skills, references, constraints, deliverables, model selection, and a stable YAML handoff prompt.
- Invalid Skill names, inaccessible referenced files, and unavailable Model Roles prevent a Handler from starting.
- Handlers return a normalized YAML Result; the Router alone selects subsequent work.
- Model investment is configurable per user without committing provider or account details to a project.

## Scope

The first package contains:

- an always-on extension that replaces Pi's default system prompt;
- the `resolve_delegation` tool with a runtime-generated schema;
- a user-level Model Role configuration UI opened by `/harness config`;
- a backend-neutral `handler` Agent definition;
- a complete initial library of 29 composable software-work Skills;
- a bounded Router-owned main-session Todo projection for multi-step coordination, with one item per independently observable outcome and environment-adaptive semantic status projection;
- documentation for the Router, Resolver, Handoff, Result, Model Role, Skill library, Todo lifecycle, and backend adaptation contracts.

## Non-goals

The first version does not provide a delegate backend, subagent process lifecycle, worktrees, queues, retries, cancellation, timeouts, automatic loop limits, persistent task ownership, conflict detection, or cross-provider fallback. It does not revoke Pi tools from the Router; Router restraint is defined by its system prompt and operating contract.

The package does not depend on `pi-dust`, `pi-dust-harness`, or other reference projects. Those projects are design evidence only.

## Success Criteria

A configured user can install the package, start Pi, and have the Router reliably produce either a direct response or a resolver-validated delegation request. The Router can select package, user, and project Skills as per-Handoff primary and companion methods. A compatible backend can run the bundled Handler Agent with the returned Handoff and feed its Result back to the Router without requiring a project-specific wrapper protocol.

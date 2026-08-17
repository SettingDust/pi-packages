# Router Delegation PRD

## Problem

A Pi main session needs to handle arbitrary user input without treating every request as immediate domain work. It must decide whether to respond directly or coordinate delegated work, select the Skills and model investment appropriate to that work, and retain control over the next step after a Handler returns.

## Product

`pi-harness` is a dedicated Pi package that replaces the default main-session system prompt with a Router prompt. The Router coordinates work; it does not perform project-domain reading, research, editing, execution, or independent verification itself.

When delegation is needed, the Router builds a structured Handoff, selects one primary Skill and optional companion Skills, selects a configured Model Role, resolves the request, and adapts the resolved invocation to an environment-provided delegate backend. Handler Results return to the Router for the next decision.

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
- documentation for the Router, Resolver, Handoff, Result, Model Role, Skill library, and backend adaptation contracts.

## Non-goals

The first version does not provide a delegate backend, subagent process lifecycle, worktrees, queues, retries, cancellation, timeouts, automatic loop limits, persistent task ownership, conflict detection, or cross-provider fallback. It does not revoke Pi tools from the Router; Router restraint is defined by its system prompt and operating contract.

The package does not depend on `pi-dust`, `pi-dust-harness`, or other reference projects. Those projects are design evidence only.

## Success Criteria

A configured user can install the package, start Pi, and have the Router reliably produce either a direct response or a resolver-validated delegation request. The Router can select package, user, and project Skills as per-Handoff primary and companion methods. A compatible backend can run the bundled Handler Agent with the returned Handoff and feed its Result back to the Router without requiring a project-specific wrapper protocol.

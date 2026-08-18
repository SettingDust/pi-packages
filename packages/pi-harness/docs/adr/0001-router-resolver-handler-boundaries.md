# ADR-0001: Separate Router, Resolver, Environment, and Handler

- Status: accepted
- Date: 2026-08-17

## Context

The main session must select useful work without accidentally doing delegated work itself. A pure resolver is also needed to validate and normalize a delegation without owning a subagent runtime.

## Decision

The package separates four responsibilities:

- **Router**: responds directly when appropriate; otherwise selects Skills, Model Role, context, constraints, and deliverables, then calls `resolve_delegation`. It owns subsequent workflow decisions after Handler Results return.
- **Resolver**: validates a structured Handoff, validates Skills and local references, resolves a configured Model Role, serializes the Handoff to YAML, and returns prompt and model metadata. It does not identify or start a Handler, inspect backend availability, or make another model call.
- **Environment / delegate backend**: resolves the fixed `handler` Agent from its own Agent registry, starts it using its own subagent, terminal, remote-worker, or other mechanism, and adapts the resolved prompt and model settings to its own interface.
- **Handler**: reads the Handoff, follows its selected Skills, performs the delegated work, and returns a normalized Result. It does not select the next workflow action.

The package replaces Pi's default system prompt, making the main session a Router whenever the extension is enabled. The Router retains Pi tool access for coordination materials but is prohibited by its system prompt from doing project-domain work.

The Router may resolve and launch several Handlers concurrently when it judges their work independent. The environment assigns each launched Handler a `taskId`. Each completion notification returns the `taskId`, task objective, normalized Result, and a summary of still-active tasks. The Router makes a fresh decision for every arriving Result: it may start follow-up work, respond to the user, or remain idle for later notifications. There is no batch join rule or wait control tool.

## Consequences

The package can remain backend-neutral. Prompt discipline, not permission removal, enforces Router restraint in v0.1. Backends must be designed and tested independently, and no backend-specific behavior may leak into the Resolver contract.

Concurrent independence is a Router judgment, not a backend guarantee. v0.1 does not provide worktree isolation, locking, conflict detection, or a task scheduler; concurrent writes can therefore conflict.

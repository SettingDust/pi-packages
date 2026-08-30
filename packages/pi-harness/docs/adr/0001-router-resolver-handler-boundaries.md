# ADR-0001: Separate Router, Resolver, Environment, and Handler

- Status: accepted historical baseline; #41 Router Todo amendment accepted final authority; implementation complete; fresh same-byte T5c GO with P0/P1/P2/P3 all zero; T5a generation-2 `t5a-g2-f1` explicitly disposed (no defect found; one-confirmation exact-Plan lifecycle preserved) and `t5a-g2-f2` explicitly disposed with the synthetic/live-runtime limitation retained. Canonical T5c evidence raw `5fb37d6ebf5da11470849d6a534adf951bd3a231156f89ab08de1cc36136f091`, output `f1a490e64101ae270d1a5bf8ef05542c2b25a364d53a0cf2e7645112d8a62bef`, record `cbf8d83f6a5739cf914dafb6c06c7a626010a0aa5c7c4ab1b7d819b418346ea3`. Synthetic prompt-contract and no-live-runtime limitations remain; commit, reload, activation, deployment, staging, and push remain pending and were not performed.
- Date: 2026-08-17

## Context

The main session must select useful work without accidentally doing delegated work itself. A pure resolver is also needed to validate and normalize a delegation without owning a subagent runtime.

## Decision

The package separates four responsibilities:

- **Router**: responds directly when appropriate; otherwise selects Skills, Model Role, context, constraints, and deliverables, then calls `resolve_delegation`. When a delegate tool accepts an Agent argument, it passes the fixed literal `handler`, never a path or Agent body. It owns main-session coordination Todos and subsequent workflow decisions after Handler Results return.
- **Resolver**: validates a structured Handoff, validates Skills and local references, resolves a configured Model Role, serializes the Handoff to YAML, and returns prompt and model metadata. It does not identify or start a Handler, inspect backend availability, make another model call, or manage Router Todos.
- **Environment / delegate backend**: resolves the Router-supplied fixed `handler` Agent from its own Agent registry, starts it using its own subagent, terminal, remote-worker, or other mechanism, and adapts the resolved prompt and model settings to its own interface.
The Router may resolve and launch several Handlers concurrently only when the current Host/tool-call capability is proven and the outcomes are independently verifiable with non-conflicting inputs, outputs, ownership, authority, and side effects. Otherwise it uses serial scheduling. Dependency, shared-file, ownership, authority, and behavioral serialization override parallel capability.

Router Todo lifecycle is bounded to the main-session workflow projection. For multi-step work, the Router creates the complete Todo set immediately, with one item per independently observable outcome; marks the current coordination item `in_progress` immediately before each action; records the matching terminal Result truthfully immediately after notification; releases dependencies only after that semantic update; and performs final cleanup only for records proven stale. Todo coordination adapts to the environment: native task status and fields are used when they express the fact, otherwise the closest truthful native status is preserved and partial, failed, blocked, conflict, and stale facts are encoded in existing descriptions, subjects, or ordinary Router coordination messages. Existing task/runtime identity and visible fields/messages may be used for correlation, but persistent `subagentId`/generation storage, canonical Result digest storage, restart/outbox APIs, exact Todo description mutation, and matching native terminal states are not required. If duplicate/conflict identity, restart replay, safe stale detection, or cleanup cannot be established from available surfaces, the Router retains the Todo and reports the limitation. Never mark completed for partial, failed, or blocked; never delete active or unresolved work. Cleanup never calls `subagent_remove` and never deletes or modifies Results, sessions, manifests, or artifacts.

The package replaces Pi's default system prompt, making the main session a Router whenever the extension is enabled. The Router retains Pi tool access for coordination materials but is prohibited by its system prompt from doing project-domain work.

The environment assigns each launched Handler a `taskId`. Each completion notification returns the `taskId`, task objective, normalized Result, and a summary of still-active tasks. The Router makes a fresh decision for every arriving Result: it may start follow-up work, respond to the user, or remain idle for later notifications. There is no batch join rule or wait control tool.

## Consequences

The package can remain backend-neutral. Prompt discipline, not permission removal, enforces Router restraint in v0.1. Backends must be designed and tested independently, and no backend-specific behavior may leak into the Resolver contract. Main-session Todo state is coordination metadata only and does not replace atomic Handler Results, Resolver legality checks, or durable records that an environment already provides; it is not a new persistent task database or restart/outbox protocol.

Concurrent independence is a Router judgment constrained by proven Host capability, not a backend guarantee. v0.1 does not provide worktree isolation, locking, conflict detection, or a task scheduler; shared-file and other conflicting work therefore remains serialized.

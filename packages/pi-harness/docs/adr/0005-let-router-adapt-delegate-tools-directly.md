# ADR-0005: Let Router Adapt Delegate Tools Directly

- Status: accepted
- Date: 2026-08-17

## Context

The Resolver produces a provider-neutral Handler invocation, but actual environments may delegate through an in-process subagent, a terminal session, a remote worker, or another tool. Some tools can select a named Agent; others accept only prompt text. A package-owned adapter interface or backend registry would duplicate tool schemas and couple `pi-harness` to runtimes it does not own.

## Decision

The Router adapts a resolved invocation directly to a currently available delegate tool by reading that tool's schema and description. `pi-harness` does not register a delegate wrapper, callback interface, backend registry, or backend-specific adapter.

A compatible backend must:

- start an independent Handler;
- guarantee the exact resolved model and thinking level;
- apply `agents/handler.md` through a named-Agent capability or prompt composition;
- make selected Skills and Handoff references readable to the Handler;
- assign and return a stable `taskId`; and
- preserve the Handler's YAML Result in a synchronous tool result or asynchronous completion notification.

Parameter names and transport are backend-specific. A named-Agent backend may use `handler.name`. A prompt-only backend uses `handler.path` to combine the Handler definition with the YAML Handoff. If the backend cannot guarantee model, thinking, Agent instructions, Skill/reference access, task identity, or Result return, the Router blocks delegation rather than silently degrading.

## Consequences

The package remains independent of delegate runtimes and can use newly installed tools without package changes when their contracts are clear. Compatibility assessment remains a Router responsibility and therefore depends on accurate tool descriptions. Backend lifecycle, cancellation, retry, capacity, isolation, and notification transport stay outside `pi-harness`.

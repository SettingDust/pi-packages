# Router Delegation Work

## Goal

Implement the first publishable `pi-harness` package: an always-on Router extension, dynamically constrained delegation resolver, user Model Role TUI, and backend-neutral Handler Agent definition.

## Authoritative Inputs

- [Product requirements](../../prd/router-delegation.md)
- [Router, Resolver, Environment, Handler boundaries](../../adr/0001-router-resolver-handler-boundaries.md)
- [Structured Handoff and Result decision](../../adr/0002-structured-handoff-and-yaml-results.md)
- [User-level Model Roles decision](../../adr/0003-user-model-roles.md)
- [Situational Skill composition decision](../../adr/0004-use-situational-skill-composition.md)
- [Direct backend adaptation decision](../../adr/0005-let-router-adapt-delegate-tools-directly.md)
- [Protocol prototype decision](../../adr/0006-validate-protocol-before-pi-integration.md)
- [Protocol specification](../../spec/router-delegation.md)
- [Skill library specification](../../spec/skill-library.md)
- [Backend adaptation specification](../../spec/backend-adaptation.md)
- [Protocol prototype validation](../../spec/protocol-prototype.md)

## Current Stage

The Extension core is implemented: it reads Roles from Pi Settings, discovers model-visible Skills from `before_agent_start`, replaces the Router prompt, dynamically refreshes `resolve_delegation`, and bundles the backend-neutral Handler Agent. The next work is the `/harness config` Role TUI.

## Completion Signal

`bun run --cwd packages/pi-harness typecheck` and `bun run --cwd packages/pi-harness test` pass for the protocol, Pi Settings loader, dynamic Extension binding, and Handler contract.

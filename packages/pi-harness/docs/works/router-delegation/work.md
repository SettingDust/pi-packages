# Router Delegation Work

## Goal

Implement the first publishable `@settingdust/pi-harness` package: an always-on Router extension, dynamically constrained delegation resolver, user Model Role TUI, and backend-neutral Handler Agent definition.

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

The Extension core, `/harness config` Role TUI, and initial 29-Skill method library are implemented. Pi discovers every built-in Skill as model-visible with no diagnostics. The remaining package integration work is exercising the full Router-to-Handler loop with a real compatible delegation backend.

## Completion Signal

`bun run --cwd packages/pi-harness typecheck` and `bun run --cwd packages/pi-harness test` pass for the protocol, Pi Settings loader and writer, scoped Role TUI, dynamic Extension binding, Handler contract, and Pi-backed Skill discovery.

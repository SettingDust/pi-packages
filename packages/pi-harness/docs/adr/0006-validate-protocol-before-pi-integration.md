# ADR-0006: Validate the Protocol Before Pi Integration

- Status: accepted
- Date: 2026-08-17

## Context

The package has several independent contracts: structured Handoff validation, dynamic Skill and Model Role schema generation, user-level Role configuration, YAML serialization, and normalized Result parsing. Testing all of them first through a live Pi session and a real delegate backend would make failures difficult to localize.

## Decision

The first runnable prototype is a pure protocol prototype with synthetic Skills, Role records, model availability, workspace paths, Handoffs, and Handler Results. It does not start Pi, invoke a delegate backend, or simulate asynchronous lifecycle events.

The prototype must prove:

- the resolver schema contains every supplied model-visible Skill and only currently available Roles;
- valid structured input resolves to `status: resolved` with exact model/thinking and a YAML Handoff that does not inline referenced content or include Model Role;
- invalid Skills, duplicate primary/companion Skills, missing or unreadable refs, malformed Roles, unavailable models, and invalid thinking return coded `status: blocked` results;
- Role and Skill inputs can be replaced and produce a refreshed schema; and
- valid and invalid four-state Handler Results parse without accepting workflow-controlling next-action fields.

The prototype leaves Pi prompt replacement, real TUI rendering, live Skill discovery, model-registry integration, backend capability inspection, task notifications, concurrency, and Router prompt restraint as explicit follow-up validation.

## Consequences

Protocol bugs can be isolated with deterministic assertions before Pi integration. A passing prototype is not evidence that the extension works in a live Pi session; the next integration slice must test actual SDK APIs and event behavior.

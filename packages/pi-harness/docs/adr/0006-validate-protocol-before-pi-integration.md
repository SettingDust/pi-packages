# ADR-0006: Validate the Protocol Before Pi Integration

- Status: accepted historical baseline; Role fixtures, selection, and schema availability superseded by ADR-0009; pure protocol validation before Pi integration remains current
- Date: 2026-08-17

## Context

The Role-specific contracts and prototype assertions below record the historical baseline. They are superseded as defined in [#42 Partial Supersession](#42-partial-supersession).

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

## #42 Partial Supersession

Accepted [ADR-0009](0009-provider-model-thinking-capability-selection.md) supersedes the Role-specific configuration, fixtures, selection, and schema-availability assertions above. Supplying Role records, exposing only currently available Roles in the schema, validating malformed Roles as the supported configuration format, and refreshing the schema when Role inputs change are historical requirements, not current implementation obligations. Legacy `roles`/`modelRole` fields must instead be rejected under ADR-0009.

Current pure protocol validation uses nested candidates and root non-negative integer `reasoning`/`impact` requests. Candidate validation and selection follow ADR-0009, including raw duplicate-key and duplicate canonical-tuple rejection, integer validation, canonical-identity ordering, and one resolve-time Registry snapshot for availability and thinking support. Schema generation must not read the Registry, filter candidates by availability, or attest availability. Skill inputs still determine the dynamic Skill enums; candidate configuration changes do not reinstate a Role availability enum or schema-time Registry checks.

The decision to isolate deterministic protocol validation before live Pi integration remains current. So do structured Handoff validation, Skill legality and uniqueness, readable reference checks without inlining, exact resolved model/thinking output, and four-state Handler Result parsing that rejects workflow-controlling fields. Handoffs exclude both model routing metadata and capability requirements. The deferred live Pi, SDK, lifecycle, and backend checks remain separate verification obligations; this reconciliation claims no new prototype run or live integration evidence and preserves the original date and historical rationale.

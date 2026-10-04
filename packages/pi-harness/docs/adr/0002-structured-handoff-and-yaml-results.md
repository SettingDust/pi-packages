# ADR-0002: Use Structured Resolver Input and YAML Handoff/Result Messages

- Status: accepted historical baseline; Model Role selection and schema availability superseded by ADR-0009; structured Handoff and YAML Result decisions remain current
- Date: 2026-08-17

## Context

The Model Role wording below records the historical baseline. Its selection and schema-availability requirements are superseded as defined in [#42 Partial Supersession](#42-partial-supersession).

Free-text task forwarding copies unnecessary context, weakens validation, and lets workflow instructions drift. The Router also needs Pi to constrain its choice to Skills and Model Roles currently available in the session.

## Decision

The Router calls `resolve_delegation` with a structured Handoff object. The extension generates the tool schema at runtime from discovered Skills and configured Model Roles, so `primarySkill`, `companionSkills`, and `modelRole` are dynamic enums before model generation begins.

The Handoff delivered to a Handler is YAML. It contains `objective`, `primarySkill`, `companionSkills`, `context`, optional `constraints: string[]`, and optional `deliverables: string[]`. Model Role is runtime routing metadata and is not part of the Handoff prompt. `companionSkills` is unique and cannot repeat `primarySkill`.

Each context item is either:

- `{ ref, purpose }` for a readable absolute path or a workspace-relative path; or
- `{ inline, purpose }` for short, unpersisted session decisions.

The Resolver checks and canonicalizes every `ref` without inlining it. URLs and inferred context kinds are out of scope.

Handlers return YAML Results with `status`, `summary`, and Markdown `report`; `artifacts` may reference produced files. `completed`, `partial`, `blocked`, and `failed` distinguish complete work, useful incomplete work, missing external conditions, and attempted technical failure. Results must not contain a workflow-controlling next action or Skill recommendation.

## Consequences

Schema validation happens before delegation and references preserve token savings. The Router receives stable, normalized Result information but remains solely responsible for deciding what happens next. Dynamic schemas must be refreshed when Skills change. The historical requirement to refresh Model Role enums on Role configuration changes is superseded below.

## #42 Partial Supersession

Accepted [ADR-0009](0009-provider-model-thinking-capability-selection.md) supersedes the Model Role selection and schema-availability portion of this ADR. The historical requirements for configured Model Roles, a dynamic `modelRole` enum, and Role-configuration-driven schema refresh are no longer current implementation obligations. Legacy `roles`/`modelRole` fields are rejected under ADR-0009 rather than retained as a compatibility interface.

The current Resolver root carries non-negative integer `reasoning` and `impact` requests, and the Resolver selects a configured provider/model/thinking candidate under ADR-0009. Schema generation does not read the Registry, filter candidates by availability, or attest their availability; candidate availability and thinking support use the single resolve-time Registry snapshot defined there.

The structured Resolver input, dynamic Skill enums, YAML Handoff shape and reference handling, primary/companion Skill uniqueness, and four-state YAML Result contract remain current. The Handoff continues to exclude model routing metadata and now also excludes capability requirements. Router ownership of workflow decisions and the prohibition on workflow-controlling Result fields remain current. This partial supersession preserves the original date and historical rationale; it does not establish live Pi or backend verification.

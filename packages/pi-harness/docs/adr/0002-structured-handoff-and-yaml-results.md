# ADR-0002: Use Structured Resolver Input and YAML Handoff/Result Messages

- Status: accepted
- Date: 2026-08-17

## Context

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

Schema validation happens before delegation and references preserve token savings. The Router receives stable, normalized Result information but remains solely responsible for deciding what happens next. Dynamic schemas must be refreshed when Skills or Model Role configuration changes.

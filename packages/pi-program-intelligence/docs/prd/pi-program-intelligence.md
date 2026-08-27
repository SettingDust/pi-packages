# PRD: pi-program-intelligence

- **Status:** Draft for review; unaccepted and unimplemented
- **Package:** `pi-program-intelligence`
- **Conceptual façade:** Program Intelligence
- **Candidate path:** `packages/pi-program-intelligence/`

## Problem

Consumers that need both static program understanding and runtime debugging otherwise couple to engine-specific identities, coordinates, payloads, lifecycle rules, and failure behavior. That coupling spreads backend selection, source mapping, degraded-result handling, state validation, and mutation safety across callers.

## Actors

- Consumers asking questions about program structure, symbols, definitions, references, and rename admissibility.
- Consumers discovering debug targets, starting and inspecting sessions, reading paused state, controlling execution, and replacing source breakpoints.
- Maintainers implementing internal capability adapters and routing policy.

## Desired outcomes

1. Consumers learn one small, task-oriented Program Intelligence interface.
2. Stable project files use one project-relative identity model; generated, virtual, or runtime-only sources remain opaque.
3. Static and debug operations return one truthful `Outcome<T>`/`Issue` vocabulary.
4. Capability-specific routing hides backend availability and selection without hiding partial, empty, or failed outcomes.
5. Runtime handles cannot escape their owning session or valid state epoch.
6. Mutations fail closed when ownership, state, or completion is uncertain.

## In scope for the candidate first phase

- Provider-free public values for projects, paths, sources, positions, ranges, outcomes, issues, targets, sessions, and owner-bound debug handles.
- Static semantic operations for symbol inspection, definition lookup, reference lookup, and rename admission.
- Debug operations for target discovery, session start and inspection, threads, frames, scopes, variables, source reading, execution control, and source-breakpoint replacement.
- Per-capability routing policy: controlled fallback or composition for eligible reads; fixed ownership for debug descendants; fail-closed mutations.
- Deterministic in-memory contract checks using test adapters only.

## Out of scope for the candidate first phase

- Package creation, manifests, source implementation, dependencies, publication, or workspace integration under this draft.
- Real adapters, real backend connections, engine installation, process management, or persistent indexing.
- Actual debugger execution or attachment under this draft.
- Rename execution, edit production, edit preview, refactoring, or workspace transactions.
- MCP, Pi tools, extensions, CLI, TUI, web UI, or other product integrations.
- Public backend selection, backend configuration, transport details, native payload access, or a wrapper DSL.
- Persistent caches, telemetry infrastructure, background synchronization, or source-map indexing.

## Product requirements

- **PR-1 — Unified façade:** Consumers must access static understanding and runtime debugging through one Program Intelligence interface organized by user tasks rather than backend mechanisms.
- **PR-2 — Provider-free contract:** Public inputs, outputs, issue codes, identities, and handles must not reveal backend or protocol names, native identifiers, native coordinates, connection details, or native payloads.
- **PR-3 — Stable project identity:** A normal project file must be identified by a host-issued opaque `ProjectId` plus an ingress-validated, NFC, case-exact, canonical project-root-relative `ProjectPath`; representability, collisions, filesystem containment, and root rebinding must fail closed without exposing native paths.
- **PR-4 — Opaque non-project sources:** A source that cannot be proven uniquely contained by the project root under the current root/source epoch must remain an opaque, scope-limited source reference.
- **PR-5 — Uniform positions:** Public positions must be 1-based Unicode code-point positions. Every operation must prove all public/native conversions and returned ranges against one immutable source snapshot; stale, ambiguous, unavailable, or invalid proof must invoke nothing.
- **PR-6 — Truthful outcomes:** Complete, partial, empty, and error outcomes must be total and noncontradictory: complete/empty have no error issue, partial has usable value plus a qualifying issue, and error has no value plus an error issue. Public issues must use stable codes and redact internal, host, source, configuration, credential, exception, identifier, and payload data.
- **PR-7 — Capability routing:** Routing policy and semantic authority must be defined per capability independently of registration order. Textual search, syntax tags, parser-only matches, and heuristic names must not satisfy semantic capabilities; overlapping incompatible authority must remain an explicit conflict.
- **PR-8 — Safe static reads:** Definition lookup may use only explicitly classified fallback outcomes; authoritative empty is terminal unless authority explicitly declares otherwise. Reference results may be composed only when coverage, authority, equivalence, ordering, and deduplication are defensible; otherwise incompleteness or conflict must remain explicit.
- **PR-9 — Rename admission only:** The first phase may return only a provider-free admissibility verdict and reasons. It must create no reservation, lease, authority token, edit, transaction, side effect, execution right, or future-success promise; missing, ambiguous, or overlapping ownership must fail closed.
- **PR-10 — Owner-bound debugging:** Target discovery must degrade truthfully and deduplicate only proven equivalents. After session start, each handle must carry only its applicable hidden owner/project/session/generation/pause/source scope and must expire on the defined lifecycle events; calls must never reroute a handle.
- **PR-11 — State-safe mutation:** Debug read and control preconditions must be total. Execution control and source-breakpoint replacement must use one owner and one invocation, have no fallback or automatic retry, distinguish accepted control from later observed state, and report uncertainty as an error rather than assume success.
- **PR-12 — Bounded validation:** The candidate contract must be verifiable with deterministic in-memory adapters. Missing live JetBrains, LSP, Tree-sitter, and DAP evidence is a future adapter gate, not proof of absence or current support.

## Success criteria

| Outcome | Verifiable acceptance |
|---|---|
| Provider-free consumption | A public-contract fixture contains no backend identity, transport, native coordinate, native identifier, connection, or native payload field. |
| Stable file identity | Exact NFC/case canonical spelling, Windows representability/reserved-name/collision rules, filesystem-aware containment, and explicit atomic root rebind with rollback and opaque-source epoch invalidation are exercised. |
| Opaque source safety | Unproven, escaped, aliased, stale, or ambiguously mapped sources cannot be promoted to project files. |
| Position consistency | Unicode/combining/supplementary and LF/CRLF fixtures prove all conversions and returned ranges against one immutable snapshot; drift or invalid bounds invoke nothing. |
| Outcome truthfulness | Valid and malformed complete/partial/empty/error combinations and every prohibited public-message data class are independently exercised. |
| Static routing | False semantic providers are rejected; fallback classes, authoritative empty, reversed registration, composition, and overlapping authority conflicts remain deterministic and explicit. |
| Rename admission | The result contains only admissibility and reasons and creates no token, reservation, lease, authority, edit, transaction, side effect, execution promise, or mutation invocation. |
| Debug ownership | Aggregation degradation/equivalence, per-kind scope, target/session/source/descendant expiry, generation, and pause-epoch invalidation are exercised before adapter invocation. |
| Mutation safety | Every debug action/state precondition is exercised; accepted control is distinguished from observed state; uncertain control or breakpoint completion has one owner, one invocation, no fallback, and no retry. |
| Scope control | No real adapter, connection, persistent index, integration, package implementation, debugger execution, staging, or commit is introduced by this documentation work. |

## Dependencies, assumptions, and risks

- Internal adapters will eventually translate native identity, position, state, and failure models; that work is outside this draft.
- A host capable of issuing stable project identities, validating canonical paths, proving filesystem containment, and performing atomic root rebind will be required by any future implementation.
- Runtime-only sources may remain opaque permanently; forced project mapping would be less truthful.
- Some static reference sets may remain partial when equivalent coverage cannot be proven.
- Live JetBrains, LSP, Tree-sitter, and DAP evidence is incomplete; each remains an explicit future adapter gate and cannot be used as proof of absence or current support.

## Future authority gate

After a clean fresh independent review, the complete PRD, ADR, Spec, Plan, and Tasks set is intended for one later consolidated user confirmation. Until that confirmation, every artifact remains draft and no implementation or integration is authorized. This document prescribes no wording, message count, UI, command, or confirmation mechanism.

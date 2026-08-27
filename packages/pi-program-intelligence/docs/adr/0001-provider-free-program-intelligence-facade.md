# ADR 0001: Provider-free Program Intelligence façade

- **Status:** Draft proposed decision; unaccepted and unimplemented
- **Decision identity:** `pi-program-intelligence/provider-free-program-intelligence-facade`
- **Related PRD:** [pi-program-intelligence](../prd/pi-program-intelligence.md)
- **Related Spec:** [Program understanding and debugging](../spec/program-understanding-and-debugging.md)

## Context

Static program analysis and runtime debugging expose different native identities, source models, coordinate systems, state machines, and mutation risks. Presenting those mechanisms directly would make every consumer perform translation, routing, lifecycle validation, and safety checks.

The supplied design research converged on a provider-free public seam, stable project/path identities, opaque non-project sources, a four-state outcome contract, per-capability routing, and owner-bound runtime handles. Native backend research is sufficient to prove that translation is necessary, but live evidence is not complete enough to make any native schema public authority.

## Proposed decision

`pi-program-intelligence` will present one task-oriented deep module named **Program Intelligence** for static program understanding and runtime debugging.

The public interface will expose only domain values and operations:

1. host-issued `ProjectId` and ingress-validated, NFC/case-exact canonical `ProjectPath` for stable project files, with filesystem-aware containment and atomic root rebind;
2. opaque source references for sources not proven uniquely contained by a project under the current source epoch;
3. 1-based Unicode code-point positions and ranges proven against one immutable source snapshot per operation;
4. total, noncontradictory, redacted `Outcome<T>` and `Issue` values for complete, partial, empty, and error results;
5. semantically authoritative static operations and verdict-only rename admission;
6. debug target, session, and paused-state operations using opaque owner-bound handles with kind-applicable lifetimes.

Backend identities, protocol identities, native coordinates, connection details, lifecycle IDs, native paths, source text, configuration/environment values, secrets, raw exception text, and native payloads remain inside the implementation. Every position-bearing operation uses one immutable source snapshot, and every project mapping proves representability and filesystem containment before invocation.

Routing will be policy-by-capability rather than one global priority chain:

- semantic eligibility requires declared semantic authority; textual search, syntax tags, parser-only matches, and heuristic names cannot satisfy semantic capabilities;
- symbol inspection and definition lookup may use only explicitly classified fallback outcomes, while authoritative empty is terminal unless authority says otherwise;
- references may compose only when authority, coverage, equivalence, ordering, and deterministic deduplication are defensible; overlapping incompatible authority is an explicit conflict;
- rename is admission-only, returns only admissibility and reasons, requires one unambiguous authority, and creates no reservation, lease, token, authority, edit, transaction, side effect, execution right, or future-success promise;
- debug target discovery may compose with explicit degradation and proven equivalence;
- starting a debug session selects one owner and a new generation;
- each handle carries only its applicable hidden scope and expires on defined target, session, source, breakpoint-set, or pause-epoch events;
- debug controls use a total action/state table and distinguish owner acceptance from later observed state;
- debug control and source-breakpoint replacement have one owner and one invocation, no fallback or automatic retry, and fail closed on uncertainty.

## Interface and seam rationale

This is a deep module: callers learn a small provider-free interface while identity translation, coordinate conversion, routing, state validation, ownership, normalization, and safety stay local to one implementation. Static and debug operations share project/source identity and outcome semantics, avoiding two shallow façades that would duplicate those rules.

Internal adapter seams are permitted only where real implementations vary. They are not part of the consumer interface and do not justify public backend configuration.

## Alternatives considered

### Public backend-shaped interfaces

Not selected because they export native identity, coordinate, transport, and lifecycle complexity to every caller and make replacement expensive.

### Separate static-analysis and debugger façades

Not selected for the first contract because project identity, source mapping, positions, outcomes, and capability routing would be duplicated or require another coordination layer. Internal separation remains implementation freedom.

### One global adapter priority order

Not selected because definition fallback, reference composition, target discovery, owner-bound reads, and mutations have materially different correctness requirements.

### Best-effort mutation fallback or retry

Not selected because an ambiguous first attempt can already have changed execution or breakpoint state. Retrying elsewhere could duplicate or contradict the mutation.

## Consequences

### Positive

- Consumers remain independent of backend and protocol churn.
- One identity and result vocabulary spans static and runtime questions.
- Routing and conversion complexity stays local.
- Cross-session, stale-handle, and ambiguous-mutation errors are enforceable at one seam.
- Test adapters can verify the public contract without external systems.

### Negative

- Internal adapters must preserve enough native state and immutable snapshot identity to translate accurately without leaking it.
- Project identity implementation must enforce exact spelling, host representability, filesystem containment, and all-or-nothing root rebinding.
- Some backend richness will not be representable publicly until a provider-free domain need is established.
- Reference composition and target aggregation may return partial results instead of pretending coverage.
- Opaque handles intentionally cannot be inspected, reconstructed, or persisted as general identities.
- Debug ownership and strict expiry can reduce fallback availability after target discovery or session start.

## Compatibility and migration

The old `pi-code-intelligence` draft authority is replaced by this `pi-program-intelligence` draft because the former name and schema covered static orchestration but not the converged runtime-debugging boundary. There is no authorized implementation or consumer migration in this documentation change.

## Revisit criteria

Reconsider this proposed decision if verified implementation evidence shows that:

- static and runtime operations cannot share project/source/outcome semantics without increasing caller complexity;
- a public capability requires backend-specific semantics that cannot be expressed truthfully in provider-free terms;
- owner pinning prevents a required safe recovery model;
- Unicode code-point positions cannot be translated reliably for a supported source class; or
- a mutation can be proven idempotent and safely retryable under a future explicit contract.

## Authority state

This ADR records a proposed decision only. A clean fresh independent review must precede one later consolidated user confirmation for this ADR and its related authority and Work artifacts. Until then it has no implementation authority. This ADR prescribes no wording, message count, UI, command, or confirmation mechanism.

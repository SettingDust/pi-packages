# Plan: Program understanding and debugging

- **Status:** Draft candidate; unaccepted, unimplemented, and not executable
- **Work:** [Program understanding and debugging](work.md)
- **Context:** [Processed Context](context.md)

## Objective

If the complete authority and Work set is later reviewed, confirmed, and separately authorized for execution, implement the smallest in-memory Program Intelligence module that proves the provider-free static and debugger contracts without real integrations.

## Candidate authority dependencies

- [PRD](../../prd/pi-program-intelligence.md)
- [ADR 0001](../../adr/0001-provider-free-program-intelligence-facade.md)
- [Spec](../../spec/program-understanding-and-debugging.md)

This Plan does not authorize any action. A clean fresh independent review must precede one later consolidated user confirmation of the complete set. Execution would still require separate authorization. No wording, message count, UI, command, or confirmation mechanism is prescribed.

## Scope and non-goals

Candidate implementation scope is limited to provider-free value contracts, validation, capability policy/routing, owner-bound in-memory debug state, internal test-adapter seams, and focused deterministic checks.

Excluded: real adapters or connections, native payload exposure, debugger execution, package publication, root integration, persistent indexing, MCP/Pi tools, UI, telemetry, server/process management, rename edits, and speculative infrastructure.

## Minimum candidate strategy

### Phase 1 — Public values and validation

Define the public project, path, source, snapshot/location, `Outcome<T>`, `Issue`, target, session, and handle contracts. Implement fail-closed `ProjectId`/`ProjectPath` ingress; NFC/case exactness; Windows reserved-name, representability, and collision rules; filesystem-aware symlink containment; explicit atomic root rebind with rollback and opaque-source epoch invalidation. Validate all public/native positions and returned ranges against one immutable operation snapshot. Validate total Outcome/Issue combinations and redact prohibited message data before adding routing.

**Candidate verification:** Spec A1–A5, including exact NFC/case and Windows fixtures; reserved/unrepresentable names and collisions; symlink escape/alias; successful rebind invalidation and failed-rebind rollback; changed snapshot, combining marks, supplementary/multibyte text, LF/CRLF, bounds and ordering; malformed outcomes and every redaction class. All invalid proofs must show zero adapter/mutation invocation.

### Phase 2 — Static semantic routing

Implement the four static operations over minimal internal test-adapter callbacks. Encode declared semantic authority and deterministic precedence independently of registration order. Reject textual search, syntax-tag, parser-only, and heuristic-name substitutes. Encode the complete terminal/fallback outcome table, authoritative-empty behavior, evidence-gated reference composition, and explicit authority conflicts. Rename returns only provider-free admissibility and reasons and creates no token, reservation, lease, authority, edit, transaction, side effect, execution promise, or mutation path.

**Candidate verification:** Spec A6–A8, including false-semantic providers, every terminal/fallback class, authoritative empty, reversed registration, unknown/overlapping authority, conflict retention, deterministic composition, verdict-only rename shape, and zero mutation invocation.

### Phase 3 — Debug ownership and read state

Implement target aggregation with explicit complete/empty/partial/error degradation, authority-based equivalence, deterministic owner selection, and discovery-epoch expiry. Implement session start/inspection, threads, frames, scopes, variables, and source reading using an in-memory owner/project/session/generation/pause/source/breakpoint-set model, attaching only applicable hidden scope to each handle. Enforce every target/session/source/descendant invalidation event and the complete read-state table before adapter invocation.

**Candidate verification:** Spec A9–A12, including contributor degradation, proven and false target equivalence, reversed registration, target/authority conflict and expiry, kind-applicable scope, cross-owner/session/generation rejection, source and breakpoint-set expiry, resumed/new-pause invalidation, and every read/control state cell.

### Phase 4 — Fail-closed debug mutations

Implement control acceptance receipts and full-set source-breakpoint replacement through the bound session owner. Serialize same-session mutations. Permit one invocation only; make acceptance distinct from later observed state; normalize ambiguous acceptance/completion without fallback or retry. Reuse Phase 1 snapshot proof for breakpoint positions and invalidate replaced breakpoint handles.

**Candidate verification:** Spec A13–A14, including acceptance-versus-inspection, all action/state preconditions, invocation counters, uncertain acceptance/completion, snapshot-drift fail-before-invocation, replacement desired-state semantics, and stale source/breakpoint rejection.

### Phase 5 — Integrated evidence and truthful reconciliation

Run the smallest package-local checks covering A1–A15. Inventory changed files, compare public exports and serialized issues against every provider-opacity/redaction prohibition, and reconcile documentation status only to the level actually reviewed, accepted, implemented, and verified. Real JetBrains, LSP, Tree-sitter, and DAP adapter claims remain blocked until separate live gates verify current native identity, coordinate, snapshot, state, authority, lifecycle, and failure translation.

**Candidate verification:** one package-local test command, one type/build check if distinct, acceptance-matrix mapping, exact changed-path inventory, and required independent correctness/evidence review.

## Dependencies and sequencing

- Phase 1 precedes every other phase because all operations depend on shared public values and validation.
- Phase 2 may proceed before Phase 3 after Phase 1, but they are not parallel-safe if both edit shared contracts or routing policy.
- Phase 3 precedes Phase 4 because mutations depend on owner/session/state validation.
- Phase 5 follows all implementation phases.
- No work starts while authority is draft or evidence has drifted.

## Candidate ownership shape

Prefer the fewest modules that preserve real seams:

- public contracts and validation;
- capability routing with internal adapter callbacks;
- debug ownership/state;
- focused tests.

Exact filenames are intentionally not authority. Do not add one-interface/one-implementation scaffolding, factories, plugin registries, persistence, or configuration until a real implementation need proves them.

## Risks and mitigations

- **Path or source identity is unsafe:** reject nonexact spelling, collisions, unrepresentable names, containment failures, aliases, stale epochs, and failed rebind; preserve the old root atomically on failure.
- **Snapshot drift misroutes semantics or mutation:** pin one immutable snapshot and invoke nothing without exact conversion proof.
- **False semantic fallback:** require declared semantic authority and exhaustively classify fallback; authoritative empty and conflicts terminate as specified.
- **Target/debug state overclaims:** classify aggregation degradation, keep kind-applicable scope, enforce all expiry/state cells, and separate control acceptance from observation.
- **Sensitive/native concepts leak publicly:** inspect exports and serialized issues; reject malformed outcomes and every prohibited message class.
- **Mutation is duplicated after uncertainty:** one owner, one invocation, no fallback or automatic retry.
- **Draft becomes implicit authorization:** retain draft status and block execution until clean fresh review, one later consolidated confirmation, and separate authorization.
- **Missing live evidence becomes a support claim:** retain explicit JetBrains/LSP/Tree-sitter/DAP adapter gates; missing evidence proves neither absence nor support.

## Rollback and compatibility

There is no implementation or consumer migration yet. For a future unintegrated implementation, rollback would remove candidate source while retaining or truthfully withdrawing authority. Any real adapter or persisted state would require a later Plan amendment.

## Final candidate gate

Future implementation completion would require every deterministic case in A1–A15, exact scope evidence, independent correctness/evidence review, and truthful status reconciliation. Live adapter support, if later proposed, additionally requires its separate evidence gate. Tests cannot substitute for authority confirmation or execution authorization.

# Context: Program understanding and debugging

- **Status:** Draft processed evidence; derived, unaccepted, unimplemented, non-executable, and not authority
- **Evidence mode:** source-grounded, with facts separated from conclusions and uncertainties

## Settled design conclusions

- Candidate package/project name: `pi-program-intelligence`.
- Conceptual deep façade name: **Program Intelligence**.
- Work slug: `program-understanding-and-debugging`.
- One provider-free public interface covers static semantic understanding and runtime debugging.
- Stable files use host-issued `ProjectId` plus ingress-validated, NFC/case-exact canonical `ProjectPath`; filesystem containment and atomic root rebind fail closed.
- Generated, virtual, escaped, aliased, stale, or runtime-only sources stay opaque unless one contained project mapping and current source snapshot are proven.
- Public positions are 1-based Unicode code-point positions, with all conversions and ranges bound to one immutable snapshot per operation.
- Public results use total, noncontradictory complete, partial, empty, and error `Outcome<T>` states with redacted stable `Issue` values.
- Routing is capability-specific and semantically authoritative rather than registration-ordered; textual, syntax-only, parser-only, and heuristic matches cannot satisfy semantic capabilities.
- Definition lookup may use only enumerated fallback outcomes; authoritative empty is terminal unless authority says otherwise; composition exposes overlapping authority as conflict.
- Rename returns only admissibility and reasons and creates no token, reservation, lease, authority, edit, transaction, side effect, or execution promise.
- Debug target discovery has explicit aggregation degradation and equivalence. Session start chooses one owner and generation; each handle uses only applicable hidden scope and expiry. Controls distinguish acceptance from observed state; debug mutations have one owner/invocation and no fallback or retry.

These are draft design conclusions encoded in the proposed ADR and candidate Spec, not accepted authority.

## Backend-native facts retained only as implementation context

The supplied research establishes why native models must be translated behind the public seam:

- Language Server Protocol 3.17 identifies documents with URIs, uses 0-based positions, and negotiates position encoding.
- Tree-sitter exposes byte-oriented offsets and points; these are not interchangeable with public user-facing columns.
- Debug Adapter Protocol models sessions, threads, frames, sources, variables, and breakpoint operations with native lifecycle identifiers and configurable path/line/column conventions.
- The inspected JetBrains reference package communicates with Index, Official, and Debugger MCP surfaces and currently translates extension-facing tool arguments and results around backend-native operations.
- The inspected JetBrains package was a dirty working tree at commit `68c002fffa43d6e1189968bba779ca49861a171f`; working-tree observations are not treated as committed product authority.

None of these names, identifiers, coordinates, connections, or payloads belong in the normative public schema.

## Source objects

### S1 — Backend-native schema research

- **Locator:** `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/research-backend-native-schemas-2-artifacts/result-1.json`
- **Claim/support:** Establishes local JetBrains connection and adapter observations plus official LSP, Tree-sitter, and DAP native identity/coordinate/lifecycle facts.
- **Scope:** Read-only research; live backend probes were not performed.
- **Accessed:** 2026-08-23.
- **Content identity:** SHA-256 `5aad8d5265c8c4f53506d9c633ceca5e5c827aa1de3b74506d6146302a3aa00f` over `result-1.json` bytes.

### S2 — Backend evidence recheck

- **Locator:** `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/recheck-backend-native-schemas-artifacts/result-1.json`
- **Claim/support:** Rechecks MCP lifecycle, adapter schema boundaries, coordinate units, URI/path semantics, and ID lifecycles against local implementation and official specs.
- **Scope:** Read-only; no real IDE, MCP, or debugger connection.
- **Accessed:** 2026-08-23.
- **Content identity:** SHA-256 `044765195780505fee5166885470e0aa709fdb3fba61d2f1c0ecaf13e6676336` over `result-1.json` bytes.

### S3 — Opaque public interface boundary

- **Locator:** `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/design-opaque-public-api-boundary-artifacts/result-1.json`
- **Claim/support:** Recommends one deep task-oriented interface and hiding native evidence, coordinates, IDs, and lifecycle details.
- **Scope:** Design artifact; no authority mutation.
- **Accessed:** 2026-08-23.
- **Content identity:** SHA-256 `e212ba0de907ff7ccfd1f034c0dfb8e2003eb6b3b9360a13e125ced20fb20989` over `result-1.json` bytes.

### S4 — Provider-free public values

- **Locator:** `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/define-provider-free-public-values-artifacts/result-1.json`
- **Claim/support:** Defines stable project-file identity, opaque handles, public positions, and four-state Outcome/Issue semantics.
- **Scope:** Candidate contract design; this Result was explicitly supplied to and read during the P1/P2 repair.
- **Accessed:** 2026-08-23.
- **Content identity:** SHA-256 `a1a25950655630ed957814cf41f4739b35afbdc034fb05c9e517f83aa533cbcd` over `result-1.json` bytes.

### S5 — Project and path identity

- **Locator:** `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/define-project-path-identity-artifacts/result-1.json`
- **Claim/support:** Recommends host-issued stable `ProjectId`, NFC case-exact lexical `ProjectPath`, and evidence-gated source mapping.
- **Scope:** Candidate contract design backed by official protocol/source-map facts.
- **Accessed:** 2026-08-23.
- **Content identity:** SHA-256 `870e9d301c8d61eb2b1bbd11984934955cd46042f056ddbbfe0150a8f8ad93e6` over `result-1.json` bytes.

### S6 — Provider-free debugger contract

- **Locator:** `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/define-provider-free-debugger-artifacts/result-1.json`
- **Claim/support:** Defines target discovery, explicit public session states, owner-bound handles, paused epochs, and minimal debugger operations.
- **Scope:** Candidate first-phase contract; full backend translation deferred.
- **Accessed:** 2026-08-23.
- **Content identity:** SHA-256 `e1b6ad2bf8ab77d3cb2a10ed36a63be774b29b373883d5faca0e8fe0b0764548` over `result-1.json` bytes.

### S7 — Unified capability and routing

- **Locator:** `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/design-unified-code-debug-routing-artifacts/result-1.json`
- **Claim/support:** Defines per-capability fallback/composition, mutation ownership, debug owner pinning, and fail-closed uncertainty behavior.
- **Scope:** Candidate design; no project mutation.
- **Accessed:** 2026-08-23.
- **Content identity:** SHA-256 `a1392e378b6fb36140a010bf225876d6d4f87dfae53193b8c818b27609a7708c` over `result-1.json` bytes.

### S8 — Naming and migration

- **Locator:** `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/name-unified-code-debug-package-artifacts/result-1.json`
- **Claim/support:** Recommends `pi-program-intelligence`, Program Intelligence, and `program-understanding-and-debugging` because they cover static and runtime concerns without naming a mechanism.
- **Scope:** Naming recommendation and documentation-only migration boundary.
- **Accessed:** 2026-08-23.
- **Content identity:** SHA-256 `3b647f583ee40fd63bb4d82ca59d636a03118df0a58d3790b3800d13d98c5bea` over `result-1.json` bytes.

### S9 — Fresh authority review repaired by this draft

- **Locator:** `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/review-program-intelligence-authority-artifacts/result-1.json`
- **Claim/support:** Reports P1-1 through P1-6 and P2-1 through P2-2 covering rename token removal, project/path safety, immutable snapshots, semantic routing, debugger contracts, Outcome/redaction totality, evidence reproducibility, and derived Work wording.
- **Scope:** Read-only fresh review; it found the prior draft not ready and authorized no confirmation or implementation.
- **Accessed:** 2026-08-23.
- **Content identity:** SHA-256 `f9e497d21859699a05eb33ace6f3b17a386a51e2449b32dee59566523691a44a` over `result-1.json` bytes.

## Meaningful negative evidence and uncertainty

- No real JetBrains IDE/plugin handshake or live Index/Official/Debugger schema inventory was performed. Current native schemas, optional fields, and version-specific behavior remain **unverified future adapter gates**.
- No live LSP, Tree-sitter, or DAP probe was performed in the supplied work. Official specifications support protocol facts but do not prove a future adapter implementation; each live translation remains a future adapter gate.
- No stable committed JetBrains implementation baseline was established because the inspected package contained dirty and untracked work.
- No package manifest, source, test, adapter, provider connection, debugger run, dependency, MCP/Pi integration, persistent index, or UI exists as evidence for this candidate package.
- Lack of live evidence proves neither absence nor current support. Support may be claimed only after the applicable future adapter gate verifies native identity, coordinate, snapshot, lifecycle, state, authority, and failure translation.

## Current implementation state

`packages/pi-program-intelligence/` contains this migrated draft documentation only. There is no authorized package implementation. Prospective implementation surfaces in Plan and Tasks are candidates, not current files or commitments.

## Constraints carried forward

- Keep all public contracts provider-free and native-payload-free.
- Validate project/path ingress, filesystem containment, root-rebind preflight/rollback, immutable source snapshots, trust-boundary input, handle ownership, state, and mutation admission before internal invocation.
- Admit only declared semantic authority; never promote textual, syntax-only, parser-only, or heuristic matches to semantic capability results.
- Do not execute or retry an uncertain mutation; distinguish control acceptance from observed state.
- Validate and redact all Outcome/Issue values at the public seam.
- Do not add adapters, connections, runtime execution, persistent indexing, integrations, dependencies, staging, or commits without later accepted authority and separate authorization.
- A clean fresh independent review must precede one later consolidated user confirmation; no wording, message count, UI, command, or confirmation mechanism is prescribed.

# Specification: Program understanding and debugging

- **Status:** Draft candidate authority; unaccepted and unimplemented
- **Candidate package boundary:** `packages/pi-program-intelligence/`
- **Related PRD:** [pi-program-intelligence](../prd/pi-program-intelligence.md)
- **Related ADR:** [ADR 0001](../adr/0001-provider-free-program-intelligence-facade.md)

Normative terms **must**, **must not**, and **may** describe the candidate contract. They have no implementation authority until the complete authority and Work set passes a clean fresh review and one later consolidated user confirmation.

## 1. Module boundary

The **Program Intelligence** module must provide one provider-free interface for static program understanding and runtime debugging. Consumers must not select or configure internal adapters.

The public contract must not expose backend or protocol names, native identifiers, native coordinate conventions, transport or connection details, or native payloads. Internal failures must be normalized before crossing the interface.

## 2. Public identity and location values

The following TypeScript is a semantic skeleton; exact implementation syntax may vary only if these guarantees remain intact.

```ts
declare const projectIdBrand: unique symbol;
declare const projectPathBrand: unique symbol;
declare const handleBrand: unique symbol;

export type ProjectId = string & { readonly [projectIdBrand]: true };
export type ProjectPath = string & { readonly [projectPathBrand]: true };

type Handle<K extends string> = string & { readonly [handleBrand]: K };

export type SourceHandle = Handle<"source">;
export type DebugTargetHandle = Handle<"debug-target">;
export type DebugSessionHandle = Handle<"debug-session">;
export type ThreadHandle = Handle<"thread">;
export type FrameHandle = Handle<"frame">;
export type ScopeHandle = Handle<"scope">;
export type VariableHandle = Handle<"variable">;
export type BreakpointHandle = Handle<"breakpoint">;

export interface ProjectFileRef {
  readonly kind: "project-file";
  readonly project: ProjectId;
  readonly path: ProjectPath;
}

export interface OpaqueSourceRef {
  readonly kind: "opaque-source";
  readonly handle: SourceHandle;
}

export type SourceRef = ProjectFileRef | OpaqueSourceRef;

export interface Position {
  readonly line: number;
  readonly column: number;
}

export interface SourceLocation {
  readonly source: SourceRef;
  readonly position: Position;
  readonly end?: Position;
}
```

### 2.1 `ProjectId` ingress and root binding

- A `ProjectId` must be issued by the host after validating one logical project root and must be treated as opaque by consumers.
- Consumers may compare and return it but must not parse it, derive it from a filesystem location, or manufacture it.
- Every public ingress must reject an unknown, malformed, stale, or caller-manufactured identity with `invalid-input` before adapter or filesystem-backed capability invocation.
- A root binding must retain its canonical filesystem identity privately. Native root paths, link targets, volume identities, and filesystem IDs must not cross the public seam.

### 2.2 `ProjectPath` canonical form and ingress

A valid `ProjectPath` must:

- be project-root-relative and use `/` separators;
- already be normalized to Unicode NFC at ingress;
- use the exact canonical visible spelling and case of every on-disk segment;
- contain no empty, `.` or `..` segment;
- contain no leading or trailing separator; and
- contain no absolute-root, drive, network, query, fragment, NUL, or native-only syntax.

Canonical lexical spelling must not be created by silently case-folding or Unicode-normalizing caller input. Non-NFC or wrong-case input must be rejected as `invalid-input` rather than accepted as an alias.

Before native mapping or access, the implementation must prove that every segment is representable on the bound filesystem and recover the canonical visible segment spelling. On Windows this preflight must reject forbidden characters and control characters, trailing dots or spaces, reserved device names including extension forms, and case-folded or NFC-equivalent collisions. Equivalent host-specific unrepresentability or collision must fail closed on other filesystems. Caller defects return `invalid-input`; ambiguous or colliding identities return `conflict`; inaccessible proof returns `unavailable` or `permission-denied` as applicable.

### 2.3 Filesystem containment, source mapping, and root rebind

- A normal project file must use `ProjectFileRef`.
- A generated, virtual, runtime-only, or otherwise unproven source must use `OpaqueSourceRef`.
- Before filesystem access or opaque-source promotion, the implementation must resolve the bound root and candidate through filesystem-aware link, junction, reparse-point, and symlink semantics and prove that the final object remains contained by the resolved root.
- A lexical path whose resolved object escapes the root must fail closed. Multiple lexical aliases for one resolved object, or one lexical identity resolving ambiguously, must return `conflict` unless a unique canonical project identity is already proven.
- Resolution proof must not expose a native path or link target in an `Issue`.
- An opaque source must not be promoted unless project membership, unique canonical `ProjectPath`, exact NFC/case spelling, representability, containment, and source-snapshot identity are all proven.
- An opaque source handle must be limited to the applicable owner and epoch described in section 5.2 and must not be persisted as stable project identity.

Root rebinding must be an explicit operation naming the existing `ProjectId` and candidate new root. It must preflight the complete affected identity set for accessibility, containment, exact spelling, representability, reserved-name hazards, case/NFC collisions, and unique mapping. The binding swap must be atomic: on any failed or ambiguous preflight, the old binding and every old identity remain unchanged and no partial mapping is visible. Only a successful atomic swap may preserve the `ProjectId`; it must advance the project source epoch and invalidate all opaque-source handles issued under the previous binding. Failure maps to stable provider-free issues and must not expose the candidate native root.

### 2.4 Immutable source snapshots and positions

- `line` and `column` must be positive integers starting at 1.
- `column` counts Unicode code points from the start of the public logical line; combining marks remain separate code points and supplementary-plane characters count as one code point.
- LF and CRLF each delimit one logical line; the CR in CRLF is not a public column. A lone CR is content unless the captured source format explicitly proves another interpretation.
- `end`, when present, must belong to the same source snapshot and must not precede `position`.

Every operation that accepts or returns a public position or range must capture or receive proof of exactly one immutable source snapshot before adapter invocation. All public-to-native input conversion, native-to-public output conversion, returned ranges, line bounds, code-point boundaries, newline interpretation, ordering, and source identity for that operation must be validated against that same snapshot identity. An input must not address the interior of an encoded code point or a CRLF separator.

If snapshot identity, contents, native revision correspondence, or conversion proof is unavailable, stale, changed, or ambiguous before invocation, the operation must return a provider-free error and invoke no adapter or mutation. The snapshot must remain pinned for the operation. Malformed or unprovable returned native ranges must not cross the public seam; they normalize to an `internal` error, and no further adapter invocation is permitted.

## 3. Outcome and Issue contract

```ts
export type IssueCode =
  | "invalid-input"
  | "unsupported"
  | "unavailable"
  | "not-found"
  | "incomplete"
  | "conflict"
  | "fallback-used"
  | "stale-handle"
  | "invalid-state"
  | "cancelled"
  | "timeout"
  | "permission-denied"
  | "uncertain-completion"
  | "internal";

export interface Issue {
  readonly code: IssueCode;
  readonly message: string;
  readonly severity: "warning" | "error";
  readonly retryable: boolean;
}

export type Outcome<T> =
  | { readonly status: "complete"; readonly value: T; readonly issues: readonly Issue[] }
  | { readonly status: "partial"; readonly value: T; readonly issues: readonly [Issue, ...Issue[]] }
  | { readonly status: "empty"; readonly issues: readonly Issue[] }
  | { readonly status: "error"; readonly issues: readonly [Issue, ...Issue[]] };
```

The public seam must validate every outcome, including adapter-produced outcomes, against this total state table:

| Status | Value | Required issues | Forbidden combinations |
|---|---|---|---|
| `complete` | present and contract-valid | zero or more warning issues | any error issue; `incomplete` or `conflict` that contradicts completion |
| `empty` | absent | zero or more warning issues | any error issue; any hidden or optional value |
| `partial` | present, usable, and contract-valid | at least one `incomplete` or `conflict` issue explaining qualification | absent or unusable value; issues unrelated to qualification |
| `error` | absent | at least one error-severity issue | any hidden or optional value; warning-only issues |

Expected invalid, unavailable, stale, state, cancellation, timeout, permission, conflict, and uncertainty conditions must return an `Outcome`; they must not leak internal exceptions. Malformed or contradictory internal outcomes must normalize to `error` with a consumer-safe `internal` issue.

`Issue.message` must not include stack traces, absolute native paths, native URIs, environment or configuration values, source text or excerpts, credentials or secrets, raw exception text, backend or protocol names, connection data, internal/native identifiers, or native request/response payloads. `retryable` is advisory only. Mutations marked non-retryable by this Spec must report `false` even when an internal transport condition might normally be retried.

## 4. Public static semantic operations

The first candidate catalog is:

```ts
export interface RenameAdmission {
  readonly admissible: boolean;
  readonly reasons: readonly RenameReason[];
}

interface StaticProgramIntelligence {
  inspectSymbol(at: SourceLocation): Promise<Outcome<SymbolDescription>>;
  findDefinitions(at: SourceLocation): Promise<Outcome<readonly Definition[]>>;
  findReferences(at: SourceLocation): Promise<Outcome<ReferenceSet>>;
  assessRename(at: SourceLocation, newName: string): Promise<Outcome<RenameAdmission>>;
}
```

`SymbolDescription`, `Definition`, each reference, `RenameReason`, and `RenameAdmission` must use provider-free domain values only. `ReferenceSet` must state whether coverage is `complete`, `partial`, or `unknown`; it must not identify internal contributors.

`assessRename` returns only a present-time admissibility verdict and reasons. Assessment creates no reservation, owner lease, authority, edit, preview, transaction, command, side effect, execution right, or promise that a later rename execution will be admitted or succeed. It must not return a token of any kind. This phase defines no rename execution operation.

### 4.1 Semantic eligibility and authority

An adapter is semantically eligible only when registered authority explicitly proves that it implements the requested semantic relation for the capability, project, source class, immutable snapshot, and requested scope. A symbol capability requires semantic symbol identity; definition and reference capabilities require their corresponding semantic relations; rename assessment requires declared mutation-domain authority even though it performs no mutation.

Textual search hits, lexical matches, syntax tags, parser-only nodes, and heuristic name matches must not satisfy a semantic capability and must not be promoted to semantic values. They may support an internal implementation only when a semantically authoritative adapter independently validates the result.

Registration order must never establish authority or precedence. Authority domains and deterministic precedence must be declared independently of registration. Multiple incompatible or overlapping exclusive authorities must produce `conflict`; they must not be hidden by ordering. For rename, zero authorities produces a negative admissibility verdict when assessment can be completed; multiple or overlapping authorities produce `error` with `conflict`. Neither case invokes a mutation path.

### 4.2 Terminal and fallback-eligible outcomes

For non-composed static reads, the following classifications are exhaustive:

- **Terminal:** `complete`; `partial` with usable value; an authoritative `empty`; `invalid-input`; `permission-denied`; `cancelled`; `conflict`; `stale-handle`; and any outcome after a capability invocation whose completion cannot be safely disregarded.
- **Fallback-eligible:** pre-invocation `unsupported` or `unavailable`; and a read-only `timeout` only when the adapter proves it produced no observable effect and that capability policy explicitly permits timeout fallback.
- A successful but non-authoritative empty may be fallback-eligible only when the authority declaration explicitly says that adapter cannot establish absence for that scope. Otherwise every authoritative empty is terminal.
- `internal` is terminal unless the capability's authority declaration proves the failure happened before invocation and explicitly classifies that normalized failure as fallback-eligible.

`inspectSymbol` and `findDefinitions` may use the above controlled fallback but must not broadcast-merge successful alternatives. A successful fallback must expose a provider-free `fallback-used` warning without contributor identity.

`findReferences` may compose only across explicitly independent authority domains whose coverage, equivalence key, stable ordering, and deterministic deduplication are proven. Unknown overlap or disagreement must expose `conflict`; return `partial` when a usable nonconflicting set remains and `error` otherwise. Authoritative empty is terminal for its domain and contributes an empty domain result rather than triggering fallback.

Cancellation stops scheduling new read attempts. Equivalent input, authority, and snapshot state must produce the same result regardless of adapter registration order.

## 5. Public debugger operations

```ts
type DebugState = "starting" | "running" | "paused" | "ended" | "failed";
type DebugControl = "continue" | "pause" | "step-over" | "step-into" | "step-out" | "terminate";

export interface DebugControlAcceptance {
  readonly accepted: true;
  readonly action: DebugControl;
}

interface RuntimeProgramIntelligence {
  discoverDebugTargets(project: ProjectId): Promise<Outcome<readonly DebugTarget[]>>;
  startDebugSession(target: DebugTargetHandle): Promise<Outcome<DebugSession>>;
  inspectDebugSession(session: DebugSessionHandle): Promise<Outcome<DebugSession>>;
  listThreads(session: DebugSessionHandle): Promise<Outcome<readonly DebugThread[]>>;
  listFrames(thread: ThreadHandle): Promise<Outcome<readonly DebugFrame[]>>;
  listScopes(frame: FrameHandle): Promise<Outcome<readonly DebugScope[]>>;
  listVariables(scopeOrVariable: ScopeHandle | VariableHandle): Promise<Outcome<readonly DebugVariable[]>>;
  readSource(source: SourceRef): Promise<Outcome<SourceText>>;
  controlDebugSession(session: DebugSessionHandle, action: DebugControl): Promise<Outcome<DebugControlAcceptance>>;
  replaceSourceBreakpoints(session: DebugSessionHandle, source: SourceRef, positions: readonly Position[]): Promise<Outcome<readonly Breakpoint[]>>;
}
```

Targets expose only a human-readable label, supported public action, project identity, and opaque handle. Sessions, threads, frames, scopes, variables, sources, and breakpoints expose only provider-free domain values and opaque handles.

### 5.1 Target aggregation and session ownership

Each target contributor must declare an independent discovery authority domain and a private deterministic equivalence key. Targets may deduplicate only when equivalence is proven; same labels, paths, process names, or heuristic similarity are insufficient. Proven equivalents select one owner through authority precedence independent of registration order. Incompatible equivalent claims or overlapping exclusive authorities produce `conflict`.

Aggregation is classified as follows:

- `complete` when every applicable authority domain completed authoritatively and the final target set is non-empty;
- `empty` when every applicable authority domain completed authoritatively and the final target set is empty;
- `partial` with `incomplete` or `conflict` when usable targets remain but an applicable domain is unavailable, unsupported, timed out, ambiguous, or conflicting;
- `error` when no usable targets remain and at least one applicable domain failed or conflicted.

A discovered target handle carries only hidden project, selected owner, and discovery-epoch scope. It expires when its discovery catalog is refreshed, its owner or authority changes, its project root is rebound, or the module discards that catalog. It carries no session or pause epoch.

Starting a valid target invokes exactly its selected owner. Each accepted start creates a new immutable session generation; no existing session is silently reused. The returned session and all descendants remain pinned to that owner and generation. Session start has no fallback or automatic retry after invocation; uncertain acceptance returns `uncertain-completion`.

### 5.2 Applicable handle scope and invalidation

Handles must carry only the hidden scope needed for their kind:

| Handle | Hidden scope | Lifetime and invalidation |
|---|---|---|
| target | project, owner, discovery epoch | section 5.1 expiry events |
| session | owner, session identity, generation | valid for inspection while its in-memory terminal record exists; terminal transition forbids mutation and invalidates descendants but not idempotent inspection |
| thread | owner, session generation, thread identity | invalid on thread removal or session `ended`/`failed` |
| frame | owner, session generation, pause epoch | invalid on resume, accepted step/continue, termination, or any new pause |
| scope | frame scope plus scope identity | invalid whenever the parent frame expires |
| variable | scope/variable ancestry plus pause epoch | invalid whenever its parent or pause epoch expires |
| opaque runtime source | owner, session generation, source epoch; pause epoch only when source content is pause-specific | invalid on source replacement, generation end, project rebind, or applicable pause expiry |
| breakpoint | owner, session generation, source identity, breakpoint-set generation | invalid on next replacement for that source or session `ended`/`failed` |

A stable `ProjectFileRef` is not a debug handle, but every operation still validates the current project root binding and source snapshot. Cross-owner, cross-session, cross-generation, wrong-kind, expired-catalog, stale-source, and stale-pause handles must return `stale-handle` or `invalid-input` before adapter invocation.

### 5.3 Read and control preconditions

`inspectDebugSession` is the only operation allowed to read a retained `ended` or `failed` session. `listThreads` requires `running` or `paused`; frame, scope, and variable reads require the current `paused` epoch. `readSource` requires a valid source lifetime and immutable snapshot proof. Breakpoint replacement is allowed in `starting`, `running`, or `paused`, subject to source and snapshot validation.

Control legality is total:

| Action | `starting` | `running` | `paused` | `ended` | `failed` |
|---|---:|---:|---:|---:|---:|
| `continue` | invalid | invalid | allowed | invalid | invalid |
| `pause` | invalid | allowed | invalid | invalid | invalid |
| `step-over` | invalid | invalid | allowed | invalid | invalid |
| `step-into` | invalid | invalid | allowed | invalid | invalid |
| `step-out` | invalid | invalid | allowed | invalid | invalid |
| `terminate` | allowed | allowed | allowed | invalid | invalid |

Invalid actions return `invalid-state` before invocation. An allowed control calls the bound owner once. A complete `DebugControlAcceptance` proves only that the owner accepted that exact action; it must not claim the requested or predicted state was observed. Callers must use `inspectDebugSession` to observe a later state. If acceptance cannot be proven after invocation, return `error` with non-retryable `uncertain-completion`, make no second invocation, and do not fabricate state.

### 5.4 Debug mutation rules

- `controlDebugSession` and `replaceSourceBreakpoints` are mutations.
- Each must invoke only the session owner, once, with no fallback and no automatic retry.
- Breakpoint replacement must replace the complete desired set for one source within the given session; it must not silently append.
- Invalid ownership, source mapping, state, snapshot, or position proof must fail before mutation invocation.
- Same-session mutations must be serialized or rejected so ordering is unambiguous.
- If completion is uncertain after invocation, return `error` with non-retryable `uncertain-completion`; do not report success or try another owner.

## 6. Capability routing invariants

- Every capability must have an explicit routing policy owned by the module implementation.
- Eligibility must include semantic authority, project/source support, immutable snapshot, required state, and mutation authority where applicable.
- Equivalent inputs and eligible state must produce deterministic selection and classification independent of registration order.
- Read fallback may continue only for the outcomes exhaustively permitted in section 4.2.
- Read composition must define coverage, equivalence, ordering, conflict, and deduplication before use.
- Once an opaque handle is issued, all operations on it must route to its bound owner; global re-selection is forbidden.
- Cancellation must stop scheduling new read attempts. It must not imply that an already-issued mutation was rolled back.

## 7. Failure and concurrency

- Public validation must occur before internal invocation where the required facts are already known.
- One operation must use one immutable routing/ownership snapshot and, when source positions are involved, one immutable source snapshot.
- Concurrent reads may proceed when they do not mutate shared session state.
- A state transition must atomically invalidate affected descendants from the public contract's perspective.
- Internal throws and malformed internal outcomes must normalize to a redacted `internal` error without exposing underlying text or payload.
- This phase must not persist requests, outcomes, handles, runtime state, roots, or indexes.

## 8. Non-goals and future adapter gates

This candidate Spec does not define package implementation, real adapters, live connections, engine lifecycle, debugger execution, rename execution, persistent indexing, dependencies, publishing, MCP/Pi tools, UI, or integration configuration. It does not grant callers primitive access to native payloads or internal adapters.

Missing live JetBrains, LSP, Tree-sitter, and DAP evidence is an explicit future adapter gate. Before any such adapter can claim support, its native identity, coordinate, snapshot/revision, authority, state, and failure translation must be verified against the then-current live implementation. Missing evidence is neither proof of absence nor proof of current support.

## 9. Acceptance matrix

| ID | Candidate contract | Minimum future deterministic verification |
|---|---|---|
| A1 | Public contract is provider-free | Inspect exported types and serialized issues; reject backend/protocol names, connection data, native IDs/coordinates/payloads, stack traces, absolute native paths, environment/configuration values, source text, secrets, and raw exceptions. |
| A2 | Project/path ingress and rebind fail closed | Accept exact NFC/case paths; reject non-NFC, wrong-case Windows paths, reserved/unrepresentable names, case/NFC collisions, malformed forms, symlink escape/alias ambiguity; prove failed rebind rollback and successful atomic rebind with opaque-source epoch invalidation. |
| A3 | Positions use one immutable snapshot | Cover combining marks, supplementary-plane and multibyte characters, LF/CRLF, reversed and out-of-range ranges, code-point boundaries, changed snapshot identity, and stale/ambiguous/unavailable proof; verify fail-before-invocation for invalid input and breakpoints. |
| A4 | Source mapping is evidence-gated | Keep unproven sources opaque; require unique exact-spelling, representable, contained mapping; reject symlink escape, alias ambiguity, stale source epoch, and rebind-invalidated handles. |
| A5 | Outcomes are total and redacted | Exercise every valid state; reject complete/empty with error issues, partial without usable value or qualifying issue, error with value or without an error; normalize malformed outcomes and prove all prohibited message classes are redacted. |
| A6 | Semantic fallback is controlled | Reject textual search, syntax-tag, parser-only, and heuristic-name providers; prove authoritative empty is terminal unless authority explicitly says otherwise; test every terminal/fallback class and reverse registration without changing results. |
| A7 | Composition exposes conflicts | Compose only proven independent coverage; test authoritative empty domains, reversed registration, unknown overlap, incompatible/overlapping authority, deterministic ordering, and partial-versus-error conflict classification. |
| A8 | Rename is verdict-only | Return only provider-free admissibility and reasons; zero/multiple/overlapping authority fails closed as specified and invokes no mutation; prove no token, reservation, lease, authority, edit, transaction, side effect, or execution promise exists. |
| A9 | Debug targets degrade truthfully | Test complete, authoritative empty, partial contributor failure, all-failed error, proven equivalence, false equivalence, reversed registration, authority conflict, target expiry, and deterministic owner selection. All-authoritative-empty yields only `empty`; authoritative targets mixed with authoritative empty domains and no failures yield only `complete`. |
| A10 | Debug descendants are owner-bound | Test applicable hidden scope by kind and reject cross-owner/session/generation, expired target, removed thread, stale source, breakpoint-set generation, and wrong-kind handles before invocation. |
| A11 | Pause descendants expire | Resume, accepted step/continue, termination, and new pause invalidate prior frame, scope, variable, and pause-specific source handles atomically. |
| A12 | Debug state is total | Exercise every cell in the read/control precondition tables and terminal-session inspection behavior. |
| A13 | Control acceptance differs from observed state | Prove acceptance receipt contains no predicted state; observe transitions only through inspection; ambiguous acceptance returns uncertain-completion with one owner, one invocation, no retry or fallback. |
| A14 | Breakpoints replace safely | Repeated replacement yields exactly the latest desired source set; stale state/source/snapshot/position fails before invocation; uncertain completion invokes once and expires replaced breakpoint handles. |
| A15 | Scope and future evidence gates stay bounded | Exact changed-file inventory contains only accepted future package surfaces/checks; live JetBrains/LSP/Tree-sitter/DAP adapter evidence is required later and is not represented as absence or support. |

## 10. Authority and evidence gates

The public design remains draft for review and implementation remains blocked. Backend-native schemas and live compatibility are future adapter evidence, not public authority. No real adapter or debugger probe is authorized by this Spec.

A clean fresh independent review must precede one later consolidated user confirmation of the PRD, ADR, this Spec, Plan, and Tasks. This document does not prescribe wording, message count, UI, command, or confirmation mechanism and cannot accept itself.

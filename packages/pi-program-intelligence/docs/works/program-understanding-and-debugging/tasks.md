# Tasks: Program understanding and debugging

- **Status:** Draft candidate; unaccepted, unimplemented, and not executable
- **Plan:** [Program understanding and debugging](plan.md)

## Admission boundary

These candidate Tasks must not execute unless a clean fresh independent review has completed, the complete PRD/ADR/Spec/Plan/Tasks set has passed one later consolidated user confirmation, and execution has then been separately authorized. No wording, message count, UI, command, or confirmation mechanism is prescribed here. File presence, status text, or Handler completion is not authorization.

## T1 — Establish provider-free values and validation

- **Outcome:** Public project/path/source/snapshot/location/outcome/issue/debug-handle values satisfy the candidate contract, with fail-closed exact path identity, filesystem containment and atomic rebind, immutable coordinate proof, total outcomes, and no sensitive/native leakage.
- **Depends on:** Admission boundary.
- **Expected surfaces:** minimum public contract/validation module and focused checks; exact filenames chosen only during authorized implementation.
- **Constraints:** No real adapter, connection, debugger execution, dependency, integration, persistence, or provider-shaped export.
- **Completion evidence:** Spec A1–A5; exported-surface inventory; NFC and wrong-case Windows ingress; reserved/unrepresentable names; case/NFC collisions; symlink escape/alias; successful root rebind with opaque-source invalidation; failed-rebind rollback; changed snapshots; combining marks, supplementary/multibyte characters, LF/CRLF, bounds, code-point boundaries, and reversed ranges; breakpoint fail-before-invocation; every valid/malformed Outcome combination; redaction of stack traces, absolute paths, environment/config values, source text, secrets, raw exceptions, native IDs, and payloads.

## T2 — Implement static semantic policy and routing

- **Outcome:** Symbol inspection, definitions, references, and verdict-only rename admission apply declared semantic authority, exhaustive terminal/fallback rules, deterministic composition/conflict, and registration-order-independent selection through in-memory test adapters.
- **Depends on:** T1.
- **Expected surfaces:** minimum capability-routing implementation and focused tests.
- **Constraints:** Textual search, syntax tags, parser-only matches, and heuristic names do not satisfy semantic capabilities; definitions do not broadcast-merge; authoritative empty is terminal unless authority explicitly says otherwise; references compose only with proven authority/coverage/equivalence/ordering; overlaps and incompatible authority remain conflict; rename returns only admissibility/reasons and creates no token, reservation, lease, authority, edit, transaction, side effect, execution promise, or mutation path.
- **Completion evidence:** Spec A6–A8; textual/syntax/parser/heuristic false-provider rejection; every terminal/fallback class; authoritative empty; reversed registration; proven composition; unknown/overlapping authority and conflict fixtures; provider-free fallback warning; verdict-only rename shape; zero mutation callbacks.

## T3 — Implement debug ownership and read-state model

- **Outcome:** Target discovery truthfully aggregates contributor degradation and proven equivalence; debug reads use handles carrying only their applicable owner/project/session/generation/pause/source/breakpoint-set scope and expire on every specified event.
- **Depends on:** T1; T2 only where shared routing contracts require it.
- **Expected surfaces:** minimum in-memory debug ownership/state implementation and focused tests.
- **Constraints:** No live debugger; no public native IDs or payloads; no rerouting a handle; validate stale/cross-session handles before adapter invocation.
- **Completion evidence:** Spec A9–A12; all-authoritative-empty aggregation yields only `empty`; authoritative targets mixed with authoritative empty domains and no failures yield only `complete`; partial contributor failure; all-failed error; target equivalence and false equivalence; reversed registration and authority conflict; target expiry; kind-applicable hidden scope; cross-owner/session/generation checks; removed-thread, source, breakpoint-set, resume/step/terminate/new-pause invalidation; every read and control state precondition cell.

## T4 — Implement fail-closed debug mutation policy

- **Outcome:** Control returns acceptance rather than predicted state; control and full-set source-breakpoint replacement invoke only the bound owner once, serialize same-session mutation, and report uncertainty without fallback or retry.
- **Depends on:** T3.
- **Expected surfaces:** minimal mutation integration with debug ownership/state and focused tests.
- **Constraints:** One invocation maximum; no automatic retry; no fallback; no assumed success; no real debugger execution.
- **Completion evidence:** Spec A13–A14; every action/state cell; acceptance-versus-later-inspection; one-invocation counters; uncertain acceptance/completion; stale source/snapshot/position fail-before-invocation; latest desired breakpoint set replaces prior set and expires prior breakpoint handles.

## T5 — Verify integrated contract and reconcile evidence

- **Outcome:** Candidate implementation is checked against every accepted requirement and documentation reports only actual authority, implementation, and evidence state.
- **Depends on:** T1–T4.
- **Expected surfaces:** focused integration checks and package-local documentation reconciliation only.
- **Constraints:** No root changes, external integration, unrelated package changes, settings, staging, commits, or status inflation.
- **Completion evidence:** Every deterministic case in A1–A15, package-local tests, type/build check if distinct, exact changed-path inventory, public-export and serialized-Issue leak audit, future-adapter-gate inventory, and required independent correctness/evidence review.

## Dependency graph

```text
Admission boundary -> T1 -> T2
                        \-> T3 -> T4
T2 + T4 -> T5
```

T2 and T3 are parallel-safe only if an accepted implementation assignment proves they do not share contract or routing files. Default execution is serial to minimize drift and shared-file conflicts.

## Coverage check

- Provider-free identities, exact path ingress, containment/rebind, immutable positions, total outcomes, redaction, and validation: T1.
- Semantic eligibility, terminal/fallback classification, composition/conflict, and verdict-only rename: T2.
- Target aggregation, owner-bound debug reads, kind-applicable scope, state, and expiry: T3.
- Acceptance-versus-observation and fail-closed debug mutations: T4.
- Full matrix, future adapter gates, scope, independent review, and truthful status: T5.
- Real adapters, connections, debugger execution, package integration, persistence, MCP/Pi/UI, staging, and commits: intentionally absent.

# Authority-First Router Admission Work

## Goal

Implement the authority-first admission boundary for `pi-harness` as a bounded follow-up to Router delegation. The delivery must preserve a verifiable no-plan atomic path and an exact planned Work/Plan/Tasks path without introducing a fixed stage machine, cross-session approval, or a model-visible receipt capability.

## Authority

- [Product requirements](../../prd/router-delegation.md)
- [ADR-0001: Router, Resolver, Environment, Handler boundaries](../../adr/0001-router-resolver-handler-boundaries.md)
- [ADR-0002: Structured Handoff and YAML messages](../../adr/0002-structured-handoff-and-yaml-results.md)
- [ADR-0005: Router adapts delegate tools directly](../../adr/0005-let-router-adapt-delegate-tools-directly.md)
- [ADR-0007: Authority-First Router Admission](../../adr/0007-authority-first-router-admission.md)
- [Router Delegation Specification](../../spec/router-delegation.md), draft Amendment A.1-A.8
- [Implementation Plan](plan.md)
- [Tasks](tasks.md)

## Scope

- Add the admission input/validation contract to the existing Resolver interaction.
- Add exact selected Work/Plan/Tasks tuple, normalized-Handoff, and subject canonicalization/digest checks, including unpaired-surrogate rejection for canonical JSON input.
- Define a planned-admission-only direct-member path grammar: one `work.md` plus one explicitly selected, matched Plan/Tasks slice; do not scan or infer a Work lifecycle.
- Add a current-runtime-session private receipt registry owned by the Harness Extension; begin empty on construction and clear all entries on `session_shutdown`.
- Capture D2 then D3 through distinct TUI confirmations only when a current matching receipt does not already supply the next required state.
- Bind authority selectors exactly to Handoff context and reject model-supplied receipt-shaped data; Skills and Markdown conventions remain guidance, not document-kind proof.
- Define deterministic same-call drift/amendment and no-UI statuses: current D3 reuse, partial D2 continuation, explicit bootstrap, bounded amendment, and mid-flow drift.
- Add focused tests only after acceptance; keep `#3 atomic delegation` as a related interface boundary and do not mix its companion rule into this implementation scope.

## Non-goals

- No child write-capability gating.
- No fixed stage machine, Work-owned persistent admission lifecycle, directory scan, status-driven pair selection, or Dust lifecycle import.
- No CI enforcement.
- No cross-session persistent acceptance or audit log.
- No automatic review generation, reviewer discovery, external-review receipt transport, or third-party/non-human review.
- No unapproved noninteractive planned receipt issuance.
- No backend adapter, Herdr lifecycle, or package metadata changes.
- No admission inspection command.
- No source implementation in this documentation work package.

## Settled Decisions

- Behavior-neutral and small atomic changes may bypass Plan artifacts when planning provides no meaningful control value.
- Multi-step, coordination-heavy, architectural, security, migration, or durable behavior changes require one exact selected Work+Plan+Tasks tuple, fresh independent review, and explicit current-session user acceptance.
- Planned tool input selects only `authority.work`, `authority.plan`, and `authority.tasks` paths. It cannot include digests, reviewer/outcome/timestamps, session identity, receipts, or handles; each selector must satisfy the Spec's direct-member grammar and occur exactly once in `handoff.context.ref`.
- One Work may contain multiple Plan/Tasks slices, but the selected tuple alone is admitted. Matching filename slices prevent an inconsistent declaration; filenames, statuses, Skills, and Markdown text do not discover or prove additional authority members.
- The Extension owns private D2/D3 receipt state for its current runtime session. `current-interactive-user` is the D2 reviewer identity; external review reports are evidence only and never receipts. The registry starts empty on construction and clears all entries on `session_shutdown`.
- D2 approval and D3 acceptance are two ordered dialog-capable TUI interactions when needed. A matching current D3 may resolve again in the active session; a matching current D2 without D3 may request only D3. Without UI, the next missing D2 returns `review_required` and the next missing D3 returns `acceptance_required`.
- A currently valid acceptance requires matching JIT document, set, Handoff, subject, and session identity. Canonical JSON rejects unpaired UTF-16 surrogates; an authenticated prior receipt may remain only as same-path-tuple amendment comparison evidence.
- A bounded amendment is same-call only: affirmative current-user bounded authorization is followed by new-subject D2 and D3; no prior or changed paths use the explicit flow; negative or material bounded authorization returns `amendment_invalidated`; only a subject change during the flow returns `authority_drift`.
- The Resolver blocks before backend launch when admission is absent, malformed, unaccepted, or needs unavailable TUI issuance.

## Evidence and Current Boundary

Existing implementation has `resolveDelegation` in `src/protocol.ts`, dynamic Resolver registration in `extensions/pi-harness.ts`, and the admission/receipt path under review. Existing docs define ordinary Handoff/Role/Skill/reference validation and direct backend adaptation. Amendment A records D1-A through D4-A plus the accepted v0.1 TOCTOU boundary: the final JIT recheck is the last authority guarantee; no snapshot, read lock, or backend preflight binds later Handler reads to immutable reviewed bytes. This documentation update does not claim implementation completion or waive unresolved review findings. No competing Spec is required.

The receipt-channel decision closes the prior contract gap: tool-call values are model-controlled and therefore cannot carry review/acceptance facts. D4-A replaces those fields with Extension-derived state and never exports an opaque receipt capability. The exact byte/path/JSON canonicalization and subject binding are normative in Spec A.1; an implementation must not substitute a platform serializer or a set-only digest.

## Admission Paths

- **Atomic:** Router supplies bounded basis and focused verification; validator checks shape and records soft classification evidence. No Work/Plan/Tasks, receipt, or acceptance record is required.
- **Planned:** Router supplies only the exact Work/Plan/Tasks selectors, already present in Handoff context. The Extension JIT-computes the authority and Handoff subject, reuses a matching active-session D3, or when needed obtains D2 user review then D3 acceptance in the TUI, stores private linked receipts, recomputes before resolution, and resolves only a currently valid subject.

JIT validation is performed for every planned resolution. A matching active-session D3 resolves directly; a matching D2 without D3 continues only with D3. Any older document, set, Handoff, or subject is historical comparison evidence, not current acceptance. The final JIT recheck ends the v0.1 authority guarantee; a later Handler read may observe changed bytes because authority paths are not snapshotted or backend-preflighted.

A changed subject starts the deterministic same-call transition. With no authenticated prior acceptance for the same tuple, including a changed path tuple, the Extension starts explicit D2 then D3 for the current subject. With a same-path prior acceptance, it renders the old/new subjects and asks for bounded authorization; affirmative authorization creates new D2 then D3, while negative or material authorization returns `amendment_invalidated` and requires a later explicit flow. A JIT change after the flow begins returns `authority_drift`. Required issuance is TUI-only: absent UI returns `review_required` before D2 or `acceptance_required` after current D2.

## Implementation Mapping Details

1. Use the supported Pi `sessionManager.getSessionId()` lifecycle and Extension event hooks to retain only the active runtime session registry.
2. Use `ctx.mode === "tui"`, `ctx.hasUI === true`, and the supported confirmation primitive for each ordered D2/D3 interaction; no print/json/free-text fallback is permitted.
3. Implement Spec A.1's byte, path, unpaired-surrogate, string, and JSON rules exactly; pass only normalized Handoff YAML after successful private admission.

These are source-mapping requirements, not unresolved authority choices. No admission inspection command or backend work is in scope. The exact Work/Plan/Tasks set and implementation remain under review; this documentation update does not authorize additional source or test work.

## Completion Signal

The derived Work/Plan/Tasks set reflects the final D4 multi-slice/same-call contract and the accepted v0.1 TOCTOU boundary, but remains draft derived material. Implementation is under review and must preserve D1-A through D4-A, the exact canonical algorithm, selected tuple grammar/context binding, receipt lifecycle and reuse, deterministic status flow, all fail-closed boundaries, and the explicit post-recheck filesystem-race limitation.

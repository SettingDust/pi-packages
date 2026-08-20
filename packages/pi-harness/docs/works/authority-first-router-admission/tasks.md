# Tasks: Authority-First Router Admission

- Plan: [Implementation Plan](plan.md)
- Authority: [ADR-0007](../../adr/0007-authority-first-router-admission.md), [Router Delegation Specification](../../spec/router-delegation.md) Amendment A.1-A.8
- Status: implementation under review; derived task list, not accepted or normative; final D4 multi-slice/same-call contract and accepted v0.1 TOCTOU residual documented; completion not claimed

## T1. Map the Settled Private Channel to Supported Pi APIs

- Depends on: fresh independent review and explicit current-session acceptance of this exact Work/Plan/Tasks set.
- Owner boundary: Extension/API integration prerequisite.
- Outcome: map active-session identity, construction/session-shutdown cleanup, dialog-capable TUI detection, the required ordered confirmations, and the final JIT authority endpoint to supported Pi APIs without changing D1-A through D4-A. The v0.1 flow does not bind later Handler reads to immutable reviewed bytes.
- Context: [Work Context](context.md) implementation mapping details; ADR-0007; Spec A.3-A.4.
- Constraints: D2 reviewer is `current-interactive-user`; external review output is evidence only; no text/print/json fallback, receipt persistence, inspection command, backend behavior, Work-owned lifecycle, or `#3` companion behavior.
- Expected surfaces: implementation evidence and the smallest owning source/tests only after acceptance.
- Verification: API evidence demonstrates active session binding, an empty registry on construction, clearing all entries on `session_shutdown`, `ctx.mode === "tui"` plus `ctx.hasUI` gating for issuance, current-D3 reuse, and two ordered confirmation calls; it demonstrates no model-visible receipt transport and records the accepted post-recheck TOCTOU boundary.

## T2. Implement Canonical Admission Input, Subject, and Validator

- Depends on: T1.
- Owner boundary: `src` protocol/admission logic.
- Outcome: typed atomic/planned public input, forbidden receipt-field validation, exact direct-member tuple grammar and authority-to-Handoff-context binding, D1-A document/set/Handoff/subject canonicalization, and stable blocked results with ordinary `invalid_reference` taking precedence over `missing_authority`.
- Context: Spec A.1-A.2 and A.6; ADR-0007 exact identity rule.
- Constraints: planned tool input has only `authority.work`, `authority.plan`, and `authority.tasks` paths; each tuple is one `work.md` plus matched Plan/Tasks slice; preserve ordinary Handoff validation; implement the defined UTF-8 byte, path, unpaired-surrogate, and JSON algorithm rather than a default serializer; do not inline authority documents into Handler YAML or use Skills/Markdown/D2 as kind proof; no snapshot, read lock, or backend preflight is required in v0.1.
- Expected surfaces: Resolver protocol and focused admission module/tests only.
- Verification: deterministic assertions cover CRLF/bare-CR/LF bytes, BOM preservation, paths, unpaired surrogates, tuple grammar/slice matching, string escaping, key/array order, document/set/Handoff/subject vectors, malformed atomic evidence, forbidden receipt fields/handles, and ordinary `invalid_reference` precedence before missing/duplicate/mismatched authority-context checks.

## T3. Add the Private Extension Registry and Lifecycle Guard

- Depends on: T1, T2.
- Owner boundary: `extensions/pi-harness.ts` and an adjacent private session-state module only if needed.
- Outcome: Extension-generated `user-review-v1` D2 and linked D3 records remain in a current-runtime-session registry with exactly one authenticated acceptance head per canonical authority tuple. A D3 that advances a same-tuple lineage links privately to its predecessor head; lookup distinguishes authenticated-prior, current-D2, and currently-valid-D3 states.
- Context: Spec A.3-A.4; ADR-0001 Router ownership.
- Constraints: begin empty on Extension construction and clear all entries on `session_shutdown`; no project Markdown, settings, session artifact, Handler prompt, resolver output, backend request, opaque model handle, cross-session persistence, or Work-owned lifecycle. Retain a drifted record only for same-path-tuple amendment comparison. Missing/non-unique heads, cyclic or cross-tuple predecessor links, and inconsistent receipt fields fail closed as `receipt_corrupt`.
- Expected surfaces: Extension/session state and focused Extension tests.
- Verification: record/read/reset lifecycle, active-session binding, construction/session-shutdown/session-change rejection, no serialized/private state leakage, current-D3 reuse, current-D2-only lookup, deterministic unique-head/prior selection, predecessor advancement, `receipt_corrupt` handling for missing/non-unique/cyclic/cross-tuple/inconsistent lineages, and negative model/Handler/Markdown cases.

## T4. Render and Capture D2 Then D3

- Depends on: T1, T2, T3.
- Owner boundary: Router renderer/user interaction in Extension.
- Outcome: planned admission renders the JIT-computed Work/Plan/Tasks paths, per-document/set/Handoff/subject digests; records D2 only after the first current-interactive-user confirmation; rechecks; then records D3 only after a distinct second confirmation. A matching current D3 resolves without prompting; a matching D2 without D3 requests only D3.
- Context: Spec A.3; ADR-0007 D2-A/D3-A/D4-A.
- Constraints: D2 must precede D3 when issuance is needed; external independent-review output is evidence only; the implementation Handler is not reviewer; generic `start`/`continue`/`next`, Router assertion, Handler Result, and Markdown do not confirm. Without dialog-capable TUI, issue no receipt and return the status for the next missing D2/D3.
- Expected surfaces: Extension renderer/confirmation path and UI tests.
- Verification: exact display, D2 accept/reject, recheck between interactions, D3 accept/reject, final recheck, receipt linkage, no receipt on ambiguous input, same-subject D3 reuse, D2-only continuation, deterministic `review_required`/`acceptance_required` behavior in non-TUI mode, and explicit evidence that the final recheck is the authority endpoint rather than immutable Handler-byte binding.

## T5. Integrate Planned Admission, Drift, and Amendment

- Depends on: T2, T3, T4.
- Owner boundary: Resolver tool registration/execution and existing protocol integration.
- Outcome: resolver blocks invalid, forged, stale, noninteractive, or unaccepted planned admission before producing invocation metadata; it resolves valid atomic/planned inputs and leaves backend adaptation unchanged after success. A different stored subject uses the same-call transition: no-prior or changed-path cases use explicit D2/D3; same-path affirmative bounded authorization uses new D2/D3; negative/material authorization returns `amendment_invalidated`; in-flow JIT changes return `authority_drift`.
- Context: Spec A.2, A.4-A.5; existing `src/protocol.ts` and Extension resolver registration.
- Constraints: retain `status: resolved | blocked`; blocked results contain only coded actionable errors; do not add Handler identity, backend-specific fields, private receipt data, persistent Work lifecycle, or `#3` companion behavior.
- Expected surfaces: protocol input/schema, Extension tool binding, protocol/Extension tests.
- Verification: each admission code path; existing Skill/Role/reference regressions; successful prompt excludes admission/receipt state; backend mapping receives only success; grammar/context/document/Handoff/session drift branches follow the deterministic status table; no-prior and changed-path requests use explicit D2/D3, while negative authorization and material bounded attempts return the defined amendment gate.

## T6. Verify Full Contract and Reconcile Authority

- Depends on: T5.
- Owner boundary: integration verification and authority reconciliation.
- Outcome: runnable checks demonstrate the atomic path, D2/D3 planned path, same-subject D3 reuse, no-UI status boundary, selected tuple/context rejection, subject drift rejection, and bounded-amendment rule.
- Context: ASCII flows below; Plan verification strategy; Spec A.6.
- Constraints: no source scope beyond admission; no backend lifecycle changes; no Dust lifecycle import; preserve unrelated worktree changes and keep `#3` excluded.
- Expected surfaces: focused test additions and evidence report.
- Verification: smallest package typecheck/test command plus targeted assertions for canonical vectors, unpaired-surrogate rejection, tuple grammar, forbidden model receipt input, authority-context binding, current-runtime session state, D2/D3 ordering/reuse, external-evidence-only behavior, no-UI next-receipt status, document/Handoff drift, new-subject amendment receipts, no-prior explicit bootstrap, material invalidation, and the accepted post-recheck TOCTOU residual; fresh review checks the exact diff against accepted authority.

## Dependency Graph

```text
T1 Pi API mapping
  |
  v
T2 public contract + canonical subject
  |
  v
T3 private registry + lineage guard
  |
  v
T4 D2/D3 TUI
  |
  v
T5 resolver, drift, amendment
  |
  v
T6 full-flow verification
```

## ASCII Flow: No-Plan Atomic Path

```text
Router classifies bounded atomic change
  -> supplies basis + focused verification
  -> Resolver validates atomic shape and soft classification evidence
     -> invalid basis: blocked invalid_atomic_basis / invalid_admission
     -> valid: resolved prompt/model/thinking
  -> Router adapts compatible backend
  -> Handler executes focused change and verification
```

## ASCII Flow: Planned Private-Receipt Path

```text
Router classifies planned change
  -> supplies one Work + Plan + Tasks tuple
  -> grammar-valid paths exactly match Handoff context
  -> Extension canonicalizes tuple + normalized Handoff + subject
  -> current matching D3: resolved without a prompt
  -> current matching D2 only: D3 TUI
  -> no current D2: explicit D2, recheck, then D3
  -> final mismatch: blocked authority_drift
  -> valid: resolved prompt/model/thinking
  -> Router adapts compatible backend
```

## ASCII Flow: Drift and Bounded Amendment

```text
current acceptance + active runtime session
  -> document, set, Handoff, or subject changes
  -> old receipt is historical comparison evidence
  -> same canonical path tuple + prior acceptance:
       bounded authorization in this call
       -> affirmative: new D2 + recheck + new D3 + recheck
       -> negative/material: blocked amendment_invalidated
  -> no prior / changed paths:
       explicit D2 + recheck + D3 + recheck in this call
  -> any changed JIT subject after flow begins: blocked authority_drift
  -> resolve only if final subject remains current
```

The flows do not scan a Work directory, use Work status, or import a Dust lifecycle.

## Parallel-Safe Groups

- T1 through T6 are serial. T4 depends on T3's completed private registry and lineage guard, so it cannot run in parallel with T3.
- T5 and T6 are serial because T6 verifies the integrated contract.

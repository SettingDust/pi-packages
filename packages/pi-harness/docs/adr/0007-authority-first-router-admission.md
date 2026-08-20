# ADR-0007: Authority-First Router Admission

- Status: accepted
- Date: 2026-08-19
- Supersedes: none
- Related: [Router Delegation PRD](../prd/router-delegation.md), [ADR-0001](0001-router-resolver-handler-boundaries.md), [ADR-0002](0002-structured-handoff-and-yaml-results.md), [Router Delegation Specification](../spec/router-delegation.md)

## Context

The Router coordinates substantive project-domain work, but a valid Handoff alone does not prove that a multi-step change has a reviewed execution boundary. The admission decision must preserve a low-friction path for genuinely small, behavior-neutral work while preventing a Handler from manufacturing its own authority or acceptance evidence.

The existing package separates Router, Resolver, environment, and Handler responsibilities. The Resolver validates Handoff inputs and resolves invocation metadata; the environment launches the fixed Handler. Admission belongs at the Router/Extension boundary because it depends on user confirmation, current-session state, and reviewed project materials. It must be represented in the Resolver interaction so an incompatible or stale invocation cannot be launched accidentally.

## Decision

`pi-harness` uses authority-first admission with two paths:

1. **Atomic path.** A behavior-neutral, small, single bounded change may be admitted without Work/Plan/Tasks only when the Router supplies invocation metadata describing the bounded change, its verifiable basis, and focused verification. The validator checks structural completeness and evidence references. Whether the change is truly small or behavior-neutral remains a Router judgment in this version; the judgment is recorded as soft evidence and is reviewable, not silently treated as a hard proof.
2. **Planned path.** A multi-step, coordination-heavy, architectural, security, migration, or durable persistent-behavior change requires exact Work, Plan, and Tasks materials, a fresh independent review of those exact materials, and explicit user acceptance in the current main session before delegation is admitted.

The Extension owns acceptance state. It records acceptance only after the Router has rendered the exact Work/Plan/Tasks identities and digests to the user and the user explicitly confirms them. Markdown documents cannot create or forge acceptance. Acceptance is bound to the current main-session identity and the exact reviewed material identity/digest.

A user-authorized bounded amendment may advance an accepted record to a new digest without repeating confirmation only when the amendment remains within the accepted scope, architecture, dependencies, risk, behavior, and acceptance criteria. Any material change in one of those dimensions invalidates acceptance and requires fresh independent review and explicit confirmation.

Admission is not a fixed stage machine. The contract records evidence and decisions, but does not impose mandatory ceremony on atomic work.

The Resolver accepts admission metadata as part of its invocation input and returns a coded `blocked` resolution before serialization/launch when the metadata is missing, malformed, stale, unaccepted, or inconsistent with the selected path. It never launches a Handler and never treats authority-document edits by a Handler as acceptance.

## Runtime Admission Contract Amendments (D1-A through D4-A)

The following bounded contract decisions refine this accepted architecture without adding an implementation or backend dependency:

- **D1-A JIT admission:** before every planned resolution, the Extension/Resolver reads the exact Work, Plan, and Tasks references, applies the canonicalization below, and computes current per-document and set SHA-256 digests. It also canonicalizes the normalized Handoff and computes the current admission subject digest. A previously captured digest is comparison evidence, never a substitute for this just-in-time check.
- **D1-B accepted v0.1 TOCTOU boundary:** the authority guarantee ends when the final JIT recheck succeeds and the Resolver returns `resolved`. v0.1 does not snapshot authority documents, hold a read lock, or require a backend preflight before the Handler reads them. A local writer or another Handler may therefore modify or replace a selected path after that recheck; the later Handler read is not guaranteed to observe the reviewed bytes. This is an accepted security limitation, not evidence that the Handler executed against immutable reviewed material.
- **D2-A runtime review receipt:** an independent review is represented only by an Extension-issued runtime receipt for the exact current subject. The D2 reviewer is the `current-interactive-user`, who is independent of the implementation Handler. Any external independent-review report is evidence the Extension may render to that user; Markdown claims, Handler Results, and the report itself neither create nor reconstruct a receipt.
- **D3-A user-witnessed Extension receipt:** the Extension records acceptance only after it has rendered the exact reviewed paths and digests and received a second, explicit confirmation through the supported Pi interaction. Router prose, generic pacing commands, Handler Results, or edited project files cannot create it.
- **D4-A private receipt channel:** the model supplies only the planned Work/Plan/Tasks selectors. It supplies no digest, reviewer, outcome, timestamp, session ID, receipt field, receipt ID, or receipt handle. The Extension derives the exact selected tuple, issues and looks up D2/D3 receipts solely in its private, current-runtime-session registry, and never exposes a registry handle as an authority capability. D2 and D3 are separate TUI confirmations in that order when issuance is required. A matching current D3 may resolve again in the same active runtime session without another prompt; a matching current D2 without D3 may request only D3. If a required interaction needs a dialog-capable TUI and none is available, planned admission fails closed with the deterministic review/acceptance status and no receipt is issued.

Digest or normalized-Handoff drift invalidates a currently valid acceptance before backend adaptation. The registry retains an **authenticated prior receipt**—one issued by this Extension in this runtime session—for bounded-amendment comparison after it ceases to be a **currently valid acceptance**. For each canonical Work/Plan/Tasks path tuple, its private lineage index must record either no receipts or exactly one unique authenticated acceptance head. A first acceptance has no predecessor. When a same-tuple bounded-amendment flow produces a new D3, it must link privately to that head as its predecessor and atomically become the new head. The A.4 transition renders and evaluates only this head. A missing or non-unique head for a nonempty lineage, a cyclic or cross-tuple predecessor chain, or internally inconsistent issuer, session, or subject fields is receipt corruption: admission fails closed with `receipt_corrupt`, does not prompt or fall through to another flow, and cannot resolve. A differing old receipt starts a same-call transition rather than unconditionally returning `authority_drift`: a same-path authenticated prior may receive current-user bounded authorization and, if affirmative, new D2 then D3 for the new subject; no prior receipt or changed authority paths start the explicit D2-then-D3 flow for the current subject. A negative or material bounded-authorization decision returns `amendment_invalidated` and requires a later explicit flow. `authority_drift` is returned only when the JIT subject changes during the in-call flow or its final recheck. The shortcut is eligible only for the same canonical Work/Plan/Tasks path tuple; it never applies to a material scope, architecture, dependency, risk, behavior, or acceptance-criteria change.

These amendments leave the Resolver's successful output and backend mapping unchanged. They do not add an admission inspection command or backend-specific admission behavior. The v0.1 TOCTOU boundary in D1-B is accepted authority for this review; the Specification Amendment A and its implementation remain under review, and this status does not claim implementation completion.

## Exact Identity and Digest

The reviewed set is one explicitly selected tuple `(work, plan, tasks)`, each identified by its canonical readable path and SHA-256 digest. It must satisfy Specification Amendment A.1's planned-admission-only direct-member grammar: one `work.md` and one matched Plan/Tasks pair under the same `docs/works/<work-name>` directory. A Work may contain multiple paired Plan/Tasks slices, but no directory scan, Work status, filename recency, or document order selects or admits another member. Canonical document bytes are the raw valid UTF-8 bytes after replacing every CRLF and bare CR byte sequence with LF; no BOM removal, trimming, Unicode normalization, or other rewrite occurs. The set digest is SHA-256 over the exact compact canonical JSON byte sequence defined in Specification Amendment A.1: entries are ordered `work`, `plan`, `tasks`, and each entry's keys are ordered `kind`, `path`, `sha256`.

The Extension also derives `handoffSha256` from the exact normalized Handoff that the Handler will receive, including canonical context references, and derives `subjectSha256` from the canonical `{version, setSha256, handoffSha256}` object. D2 and D3 bind this full subject, not only the authority set, so an authority set cannot authorize a different objective, constraint, deliverable, Skill selection, or context. The three authority references must each occur exactly once in the Handoff's readable `context.ref` values after canonicalization. Specification Amendment A.1 rejects every unpaired UTF-16 surrogate in a string it encodes; Skills, Markdown headings/status text, and D2 review aid humans but do not prove document kind.

The canonicalization rule is an implementation contract, not a requirement that the Resolver inline the documents into the Handler prompt. References remain references and are independently readable/validated as existing Resolver context rules require.

## Consequences

Positive:

- Multi-step delegation has a verifiable, exact authority and Handoff boundary through the final JIT recheck.
- Acceptance cannot be forged by a Handler editing repository documents or by a model constructing receipt-shaped tool input.
- The private registry supplies a minimal trusted D2/D3 channel without a backend dependency.
- Receipt history can support a bounded amendment without treating a drifted record as currently valid.
- Atomic work remains practical when planning provides no control value.
- Authority drift invalidates stale confirmation instead of silently launching against changed material.

Negative:

- The Extension must maintain ephemeral session state and provide two explicit confirmation interactions for a new planned subject.
- New or amended planned receipt issuance is unavailable in noninteractive modes; an already matching active-session D3 may resolve without a TUI, but no non-TUI interaction can create, revalidate, or extend it.
- The current interactive user is the v0.1 reviewer identity; third-party, signed, non-human, or cross-session review is not provided.
- Atomic classification cannot be made fully hard-enforceable from repository documents alone in this version.
- A user must reconfirm after material authority or Handoff change, even when the implementation intent feels unchanged.
- The final JIT check does not provide immutable execution binding: the Handler receives path references, so a post-recheck filesystem change may alter what it later reads.
- Resolver input and error handling gain a new admission contract.

## Non-goals

This decision does not add child write-capability gating, a fixed stage machine, CI enforcement, cross-session acceptance persistence, automatic review generation, reviewer identity discovery, external-review receipt transport, a user-facing admission inspection command, backend-specific admission behavior, immutable authority snapshots, read locks, backend preflight, a Work-owned persistent admission lifecycle, or a new adapter abstraction. The related `#3 atomic delegation` companion rule remains outside this decision and its implementation scope.

## Revisit Criteria

Revisit this ADR if the project adopts enforceable child permissions, CI as an authority gate, cross-session approval, a third-party/non-human review model, noninteractive planned admission, or evidence that soft atomic classification causes unacceptable bypasses. Also revisit it if exact reviewed-byte execution becomes a requirement, or if the accepted post-recheck TOCTOU exposure causes an incident or unacceptable risk.

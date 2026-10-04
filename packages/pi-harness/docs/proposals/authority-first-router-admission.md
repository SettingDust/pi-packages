# Proposal: Authority-First Router Admission

- Status: non-authoritative decision history; high-level decision recorded in accepted ADR-0007
- Date: 2026-08-19
- Authority: non-authoritative proposal; the historical Draft Amendment A candidate is superseded by [ADR-0007](../adr/0007-authority-first-router-admission.md) and the current [Handoff and admission input contract](../spec/router-delegation.md#2-handoff-and-admission-input) of the Router Delegation Specification

## Problem

The Router can currently resolve a valid Handoff without evidence that a substantive multi-step change has an accepted execution boundary. A Handler must not be able to satisfy such a gate by editing the authority documents it is supposed to implement, and the Router must not bypass the gate merely by describing work as small.

The package needs a low-friction path for genuinely atomic, behavior-neutral changes while requiring verifiable reviewed authority for changes whose coordination value justifies a Plan.

## Candidate Change

Add an authority-first admission decision between Handoff resolution and backend launch:

- the Router classifies the invocation as either a directly admissible atomic path or a planned path;
- the planned path requires exact reviewed Work, Plan, and Tasks materials, a fresh independent review, and explicit user acceptance in the current main session;
- the Harness Extension records acceptance against the exact reviewed material identities and digests;
- the admission validator rechecks the recorded acceptance and invalidates it on material authority drift;
- a user-authorized bounded amendment may advance the accepted digest without repeating confirmation when it stays within the accepted boundary;
- `resolve_delegation` returns a coded block when required admission metadata or evidence is absent or stale.

The gate is an admission control and audit boundary, not a fixed stage machine. It does not require every request to produce Work/Plan/Tasks.

## Alternatives Considered

1. Require Work/Plan/Tasks for every delegation. Rejected: it adds ceremony to behavior-neutral and small atomic changes without meaningful control value.
2. Let the Router assert `small` or `behavior-neutral`. Rejected: an unverified claim is not sufficient evidence. The atomic classifier may remain a soft judgment in this version, but the invocation must carry an auditable basis and the decision is visible in the admission record/result.
3. Let a Handler edit authority documents to create the required evidence. Rejected: implementation authority and acceptance authority must remain separate; project Markdown cannot forge the current session's user acceptance.
4. Use a fixed stage machine or CI-enforced workflow. Rejected for this version: admission is a verifiable evidence contract, and fixed stages and CI enforcement are future options.
5. Persist acceptance across sessions. Rejected: the confirmed boundary is current-main-session lifetime only.

## Impact

The Extension gains session-scoped acceptance recording and validation. The Router must render exact materials and capture an explicit confirmation before recording acceptance. The Resolver receives admission metadata and blocks before backend launch when the metadata does not satisfy the contract. Existing backend adaptation remains responsible for launching the Handler after resolution.

No source, test, Skill, package metadata, child write-capability, CI enforcement, fixed stage machine, or cross-session acceptance behavior is included in this documentation change.

## Decision Readiness

The core decision is confirmed by the Handoff and is recorded in ADR-0007. The remaining questions are intentionally implementation-level or interaction-level and are listed in the Work Context and Spec; they must be resolved before coding if they affect the contract.

## Unresolved Questions

- Which existing Pi confirmation primitive should the Extension use for the exact-material acceptance interaction?
- What stable main-session identifier is available from the supported Extension API and should be bound into the session acceptance record?
- Should the audit record be exposed only through Handler Result/Router status or also through a user-visible command?
- What evidence format should a fresh independent review use at runtime, beyond the required reviewer identity, reviewed digest, and outcome?

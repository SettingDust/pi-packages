# Tasks: Atomic Router Delegation

- Status: draft candidate task set; unaccepted; unimplemented
- Updated: 2026-08-22
- Plan: [plan.md](plan.md)

## Dependency Graph

```text
Host object-snapshot module + #36 adapters
  -> T1 Handoff boundary and stopping-condition validation
  -> T2 dependency/parallel-safety and Model Role selection
  -> T3 Host outcome consumer and applicable backend mapping
  -> T4 integrated planned verification
```

T1 and T2 may be prepared independently once their shared authority input is available. T3 depends on the Host/#36 seam and on the consumer boundary from T1/T2. T4 depends on T1-T3. The Router may schedule independent Handoffs concurrently and serializes dependent or conflicting work.

## T1. Validate Handoff Outcome Boundaries

- Outcome: determine whether a proposed Handoff contains one clear observable outcome, an independently checkable scope boundary, and a stopping condition.
- Block: multiple independently verifiable outcomes or conflicting boundaries block before any outcome is performed.
- Status: not started.

## T2. Assess Dependencies and Select Model Role

- Outcome: record material prerequisites, affected ownership, parallel-safety, and a Model Role choice matched to ambiguity, risk, and verification burden.
- Constraint: independent work may be concurrent; dependent or conflicting work must be serialized; unavailable models/thinking settings do not silently fall back.
- Planned verification: D3-03 and D3-04.
- Status: not started.

## T3. Consume Host Outcome

- Outcome: read the current provider-turn Host outcome through the authorized path, preserve nested `host.code`, and apply the owning Backend Adaptation mapping without model-supplied provenance or name-only fallback.
- Depends on: implemented/admitted Host profile, #36 adapters, T1, and T2.
- Planned verification: D3-05 and C3-01 through C3-08.
- Status: not started.

## T4. Run Planned Integrated Verification

- Outcome: produce reproducible evidence for the planned decomposition, Model Role, Host-outcome, nested-code, and consumer rows on one revision.
- Evidence: revision, interface/profile version, action/dependency ordering, parallel-safety decision, selected Role, Host/Router codes, exact object-reference observation where applicable, and side-effect inventory.
- Constraint: matrix rows are planned and unexecuted in this documentation revision.
- Status: not started.

## Acceptance Gate and Exclusions

The complete repaired Host/#36/#3 set requires fresh independent review and one later consolidated user confirmation before acceptance. No mechanism is prescribed. Host and #36 implementation remain outside these #3 tasks; other package ownership boundaries remain unchanged. Runtime checks, staging, and commits are not performed by this documentation revision.

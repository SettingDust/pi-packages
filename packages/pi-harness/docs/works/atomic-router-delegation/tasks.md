# Tasks: Atomic Router Delegation

- Status: draft independent #3 tasks; Host-dependent tasks abandoned; unaccepted; unimplemented; unexecuted
- Updated: 2026-09-28
- Plan: [plan.md](plan.md)

The Host -> #36 -> #3 chain below is abandoned under the no-Pi-core-change decision; #36 adapters were already withdrawn. T3 Host-consumer work and its C3/D3-05 checks are cancelled; T4's combined verification is cancelled. T1/T2 describe independent draft decomposition/Model Role scope, not authorized or queued tasks. The original "not started" labels are historical; no checks ran.

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

## T3. Consume Host Outcome (Abandoned)

- Outcome: read the current provider-turn Host outcome through the authorized path, preserve nested `host.code`, and apply the owning Backend Adaptation mapping without model-supplied provenance or name-only fallback.
- Depends on: implemented/admitted Host profile, #36 adapters, T1, and T2.
- Planned verification: D3-05 and C3-01 through C3-08.
- Status: abandoned; never started.

## T4. Run Planned Integrated Verification (Abandoned)

- Outcome: produce reproducible evidence for the planned decomposition, Model Role, Host-outcome, nested-code, and consumer rows on one revision.
- Evidence: revision, interface/profile version, action/dependency ordering, parallel-safety decision, selected Role, Host/Router codes, exact object-reference observation where applicable, and side-effect inventory.
- Constraint: matrix rows were never executed; the Host-dependent portion is abandoned.
- Status: abandoned; never started.

## Acceptance Gate and Exclusions

The combined Host/#36/#3 review and confirmation gate below is historical and no longer queued. Independent #3 scope retains its own unaccepted status; no implementation or runtime check is authorized by these tasks.

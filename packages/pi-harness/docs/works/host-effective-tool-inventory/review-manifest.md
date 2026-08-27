# Cross-Package Review Manifest: Host Effective Tool Inventory

- Status: derived draft review manifest; unaccepted; unimplemented; unexecuted
- Updated: 2026-08-22
- Nature: inventory and dependency evidence only; not authority, acceptance, or implementation authorization

## Dependency Order

```text
Host authority and module
  -> #36 Harness/Herdr contributor adapters
      -> #3 Router/Harness compatibility consumer
          -> integrated verification
              -> independent final review
                  -> one later consolidated user confirmation
```

Implementation must remain serial and stop if the Pi host seams contradict the contract. This manifest does not prescribe the confirmation mechanism.

## Exact Artifact Set

| Order | Package | Artifact | Status |
|---|---|---|---|
| 1 | Host | `../../adr/0008-host-owned-effective-tool-inventory.md` | draft; unaccepted; unimplemented |
| 1 | Host | `../../spec/effective-tool-inventory.md` | draft; unaccepted; unimplemented |
| 1 | Host | `work.md` | draft derived Work; unaccepted; unimplemented |
| 1 | Host | `context.md` | draft processed Context; unaccepted; unimplemented |
| 1 | Host | `plan.md` | draft; unaccepted; unimplemented; unauthorized |
| 1 | Host | `tasks.md` | draft; unaccepted; unimplemented |
| 1 | Host | `acceptance-matrix.md` | draft; unaccepted; unimplemented; unexecuted |
| 1 | Host | `compatibility-profile.md` | draft fixture contract; unaccepted; unimplemented; unexecuted |
| 2 | #36 | `../../proposals/early-stable-tool-registration.md` | draft; unaccepted; unimplemented |
| 2 | #36 | `../../spec/early-stable-tool-registration.md` | draft; unaccepted; unimplemented |
| 2 | #36 | `../early-stable-tool-registration/work.md` | draft derived Work; unaccepted; unimplemented |
| 2 | #36 | `../early-stable-tool-registration/context.md` | draft processed Context; unaccepted; unimplemented |
| 2 | #36 | `../early-stable-tool-registration/plan.md` | draft; unaccepted; unimplemented; unauthorized |
| 2 | #36 | `../early-stable-tool-registration/tasks.md` | draft; unaccepted; unimplemented |
| 2 | #36 | `../early-stable-tool-registration/acceptance-matrix.md` | draft; unaccepted; unimplemented; unexecuted |
| 3 | #3 | `../../adr/0005-let-router-adapt-delegate-tools-directly.md` | accepted base; draft host amendment unaccepted/unimplemented |
| 3 | #3 | `../../spec/router-delegation.md` Amendment Extension B | draft extension; unaccepted; unimplemented |
| 3 | #3 | `../../spec/backend-adaptation.md` host amendment | accepted base; draft amendment unaccepted/unimplemented |
| 3 | #3 | `../atomic-router-delegation/work.md` | draft derived Work; unaccepted; unimplemented |
| 3 | #3 | `../atomic-router-delegation/context.md` | draft processed Context; unaccepted; unimplemented |
| 3 | #3 | `../atomic-router-delegation/plan.md` | draft; unaccepted; unimplemented; unauthorized |
| 3 | #3 | `../atomic-router-delegation/tasks.md` | draft; unaccepted; unimplemented |
| evidence | #3 | `../atomic-router-delegation/research.md` | historical/source baseline; decision evidence only |

## Evidence Classification

- The Pi 0.84.2 source-map Result is primary source-grounded decision evidence for lifecycle seams and observability limits; it is not runtime completion evidence.
- The integrated review Result is review evidence identifying defects; it is not acceptance or implementation evidence.
- The prior authoring Result is document-inventory evidence; superseded technical claims were repaired and are not retained as fact.
- T1 `research.md` is backend semantic decision evidence; it cannot identify the current winner or prove provider/executor object identity.
- All acceptance matrices are unexecuted. Every runtime behavior remains planned.

## Review Gate

A fresh independent review must cover this exact set after repair. Only if that review is clean may the complete reviewed set be presented for one later consolidated user confirmation. Confirmation, implementation authorization, staging, and commit are outside this documentation Handoff.

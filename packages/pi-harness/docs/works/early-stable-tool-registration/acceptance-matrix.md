# Acceptance Matrix: Early Stable Harness and Herdr Tool Registration

- Status: draft; unaccepted; unimplemented; unexecuted
- Updated: 2026-08-22
- Host matrix: [Host Effective Tool Inventory](../host-effective-tool-inventory/acceptance-matrix.md)

## Required Adapter Observations

Capture separately: adapter candidate contribution, host-positive eligibility, post-mutator active membership, frozen provider visibility, host compatibility, and package execution/JIT result.

| ID | Owner | Scenario | Required result | Gate |
|---|---|---|---|---|
| H-CONTRIBUTE | Harness | Eligible standard main, ordinary-first and trigger-first | One current Resolver contribution before host freeze in both equivalent states. | P |
| H-CHILD | Harness | Custom-prompt/Handler child and indeterminate fixture | No protected eligible contribution or provider exposure. | P |
| H-DYNAMIC | Harness | Skill/Role changes between runs | Later run freezes updated definition; current execution revalidates removed choices. | P |
| H-FAIL | Harness | Preparation or current validation failure | Deterministic fail-closed result; no serialization or launch. | P |
| R-CONTRIBUTE | Herdr | Eligible parent, ordinary-first and trigger-first | Complete seven-tool owner set before host freeze. | P |
| R-CHILD | Herdr | Pane child and indeterminate fixture | None of the seven parent tools is eligible or visible. | P |
| R-ATOMIC | Herdr | One definition constructor/preparation fails | No partial owner set; unrelated host tools remain isolated. | P |
| R-DYNAMIC | Herdr | Agent/model changes between runs | Later run freezes updated definition; stale execute blocks before task identity/tab/pane/process. | P |
| X-TOOLBELT | Cross | Toolbelt-style filter/replacement after adapters, before freeze | Intended names survive according to host policy; mutation cannot alter frozen run. | P |
| X-TRIGGER | Cross | E36 completion trigger with no ordinary prompt | Frozen intended inventory is provider-visible and native task inspection reaches the existing task. | P |
| X-FRESH | Cross | Separate ordinary fresh-session control | Green control remains green but is not used as trigger-first evidence. | P |
| X-PRESERVE | Cross | Seed unrelated built-in and similarly prefixed names | Adapter contribution and host mutation preserve unrelated names. | P |

## E36 Regression Sequence

```text
1. host establishes runtime generation and positive eligibility
2. Harness + Herdr adapters contribute
3. Toolbelt-style mutator completes
4. host freezes effective snapshot
5. Herdr completion triggers the first run
6. no ordinary prompt / before_agent_start rescue occurs
7. provider-visible snapshot contains intended tools
8. native inspection reaches the pre-existing task
```

## Completion Rule

Every `P` row and A36-01 through A36-06 in the Host matrix must pass on the same revision as the host module. Package registration by itself, a model assertion, or CTRL-FRESH cannot prove completion. No Toolbelt/Pi-core workaround outside accepted host implementation, #18, #29, #39, unrelated change, staging, or commit is included.

## Additional Host-Bound Rows

| ID | Owner | Scenario | Required result | Gate |
|---|---|---|---|---|
| X-QUEUED | Cross | Steer/follow-up is queued in current low-level run | Current batch keeps its exact objects; later provider turn refreshes only before `prepareNextTurnWithContext`. | P |
| X-OBJECT | Cross | Provider exposes then executes an adapter tool | Provider definition and execute closure derive from the same exact `context.tools` object. | P |
| X-REVOKE | Cross | Host security revokes after provider exposure | Host returns `revoked` before package execute/side effects; later turn omits or re-evaluates. | P |
| X-RELOAD | Cross | Old adapter callback after reload | `stale_generation`; no attachment to a new same-name object. | P |

All rows remain planned and unexecuted.

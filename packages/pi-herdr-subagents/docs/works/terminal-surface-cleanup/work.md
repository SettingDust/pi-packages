# Terminal Surface Cleanup Work

- **Status:** Phase A complete; Phase B implementation, bounded duplicate/evidence repair, and second fresh independent final review are complete. The final review found P0/P1/P2 = 0. Phase B is ready for an ownership-isolated selective commit and remains uncommitted.
- **Goal:** Close each terminal generation's accepted Herdr tab while retaining its session, Result, manifest, and launch artifacts.
- **Authority:** [Automatic terminal surface cleanup ADR](../../adr/automatic-terminal-surface-cleanup.md); [Runtime lifecycle specification](../../spec/runtime-lifecycle.md), section 10; [Task-derived subagent ID specification](../../spec/task-derived-subagent-id.md), sections 5 and 6.
- **Derived coordination:** [Context](context.md); [Plan](plan.md); [Tasks](tasks.md).

## Delivery Status

- **Phase A compatibility baseline:** complete and landed in `569b7ba` (`fix(subagents): preserve manifest compatibility`).
- **`#13` V2 lifecycle baseline:** landed in `e68e234` (`feat(subagents): add progress status`).
- **Phase B automatic cleanup:** implementation and the bounded final-review P1-1/P2-1/P2-2 repairs are complete in the working tree. The second fresh independent correctness/evidence review found P0/P1/P2 = 0. Evidence records 87 focused tests / 515 assertions, 118 full tests / 695 assertions, passing typecheck, and the bound Herdr `0.8.2-preview.2026-08-19-b5c4a0176e91` source/script-hash acceptance. Sessions, Results, manifests, and launch artifacts remain retained. The change is uncommitted pending an ownership-isolated selective commit; [evidence](evidence/README.md) remains unchanged.

## Completion Signal

Phase B authority, implementation, bounded repair, verification, and final independent review are complete without changing the accepted ADR or lifecycle-specification behavior. The remaining release operation is an ownership-isolated selective commit. This Work records coordination state only; it does not store acceptance receipts or create authority.

# ADR: Automatic Terminal Surface Cleanup

- **Status:** Accepted; Phase A landed in `569b7ba`; Phase B implementation, bounded repair, verification, and second fresh independent final review are complete with P0/P1/P2 = 0. Phase B remains uncommitted pending an ownership-isolated selective commit.
- **Date:** 2026-08-20
- **Scope:** `packages/pi-herdr-subagents`
- **Authority:** [Subagent Runtime Lifecycle Specification](../spec/runtime-lifecycle.md), section 10
- **Derived Work:** [Terminal Surface Cleanup Work](../works/terminal-surface-cleanup/work.md); [Context](../works/terminal-surface-cleanup/context.md)
- **Release sequence:** Phase A manifest passthrough landed in `569b7ba`, then Phase B automatic cleanup; the `#13` V2 lifecycle baseline landed in `e68e234`.

## Context

Each subagent generation receives a dedicated Herdr tab and root pane. The current lifecycle retains that surface after the generation becomes terminal; only explicit `subagent_remove` closes an active pane and deletes retained files. The accepted change is to close the generation's Herdr surface automatically for every terminal outcome while retaining its session, Result, manifest, and launch artifacts.

The runtime must handle terminal Results, explicit cancellation, unexpected pane closure, launch failure, cleanup failure, process restart, and resume without changing the terminal outcome or losing audit evidence. The existing lifecycle reconciliation remains historically accurate: automatic cleanup was excluded from that retrospective decision and is added now as a later, prospective amendment. Review items `#18` and `#13` are separate work and are not authority for this decision.

## Decision

1. Every generation that reaches `completed`, `failed`, or `cancelled` must enter terminal surface cleanup. `failed` includes `pane_closed`, invalid Result, pane verification, and launch failures.
2. Surface ownership begins only when the `createTab` response is accepted. Accepted generations own one dedicated Herdr tab and cleanup must use `tab close <tabId>` for cancellation, removal, and launch failure after acceptance. The root `paneId` is evidence, not the terminal close target. Pane-only close is permitted only to clean up a rejected partial create response before a task surface is accepted.
3. A generation with no accepted surface records `not_created` and issues no close command. A terminal record without a usable accepted `tabId` records `identity_missing` and never guesses an identity.
4. The terminal status, Result, and original task error must be persisted before cleanup is attempted. A close failure must not replace the status or original error, reject `join`, suppress notification, or delete artifacts.
5. Cleanup outcomes must be persisted per generation in the task manifest. Runtime-created entries have the exact section-10 shape; diagnostics are normalized and capped at 160 characters. Phase A must first establish generic passthrough of unknown top-level manifest fields, including the complete unknown `surfaceCleanups` value. Phase B must preserve unknown members inside that value during cleanup-aware writes. Exposed cleanup data uses defensive copies.
6. All terminal triggers for one `<subagentId>:<generation>` converge on one settlement promise and one cleanup operation. `join` awaits that promise; `inspect` remains non-blocking and may expose `pending`.
7. Prior-generation cleanup records remain when `resume` creates a new generation and a new tab.
8. `remove` remains the only operation that deletes the session and artifact directory. It retries actionable failed cleanup first and retains the task and artifacts if that close still fails. A record with no actionable identity may be explicitly removed because no close command can be formed.
9. Terminal notifications retain their existing summary-only shape and original status/reason. Cleanup details are available through the manifest and defensive-copy task snapshots, not added to completion notifications.

## Rationale

- Closing the dedicated tab uses the accepted create identity and ownership boundary; pane-only closure cannot be used for an accepted tab because it can leave the tab behind.
- Persisting terminal state first makes surface cleanup a secondary operational effect. A transport failure cannot turn a completed or cancelled task into a different lifecycle result.
- One settlement promise and per-generation cleanup records prevent duplicate Result writes, closure, and notification while preserving failed old-tab cleanup when resume creates a new tab.
- A standalone Phase A passthrough release makes rollback from Phase B non-destructive for the complete unknown `surfaceCleanups` value; Phase B then preserves unknown nested cleanup members.
- Existing Result, session, notification, and explicit-removal contracts remain intact.

## Alternatives Considered

- **Close only completed panes:** rejected because failed and cancelled generations leak the same dedicated surface.
- **Close the root pane only:** rejected because Herdr exposes a distinct `tab close <tab_id>` operation and the requirement is to remove both pane and tab for an accepted surface.
- **Delete artifacts after auto-close:** rejected because Result retrieval, recovery, audit, and later resume require retained files.
- **Convert close failure into task failure:** rejected because cleanup is secondary to the already-established terminal outcome.
- **Leave cleanup retry entirely manual:** rejected because restart recovery already owns durable lifecycle reconciliation and can retry safely from persisted identities.

## Release Order And Rollback Boundary

Phase A is the compatibility baseline: it completes V1 legacy and V1 canonical migration to V2 while preserving identity, `taskSlug` presence or absence, all retained paths, and unknown top-level manifest fields. Phase A must have independent focused tests, typecheck/full-test evidence, fresh review, and its own source-plus-test commit before Phase B starts. Phase A does not read, validate, create, or act on `surfaceCleanups`, and does not close terminal surfaces.

Phase B depends on the accepted and landed `#13` V2 lifecycle baseline and the accepted Phase A commit. It adds automatic terminal cleanup and its cleanup-record contract. A Phase B rollback is supported only to Phase A or a later compatible runtime; rollback before Phase A is unsupported because the older writer may erase the unknown top-level cleanup value. The release sequence does not recreate tabs closed by Phase B.

## Consequences

### Positive

- Terminal generations no longer leave dedicated Herdr tabs open during ordinary operation.
- `join`, `inspect`, recovery, and notifications keep the original terminal meaning when cleanup fails.
- Restart and resume can distinguish already-cleaned, retryable, and identity-less generations.
- Rollback to the Phase A baseline or a later compatible runtime does not erase unknown cleanup evidence from the manifest.

### Negative And Operational

- The manifest gains per-generation cleanup records and corresponding validation.
- A transient close failure can leave an old tab while a resumed generation creates a new one; the failure remains visible and recovery retries it.
- Explicit removal can remain blocked by a repeatable close failure when a usable tab identity still exists.
- Real Herdr acceptance must confirm that `tab close` removes the dedicated root pane and that Herdr's not-found response can be classified as idempotent success.
- Concurrent terminal triggers require settlement coalescing and snapshot copying to prevent duplicate effects and caller mutation.

## Revisit And Supersession

Revisit this decision if subagents share tabs, a generation owns multiple panes, Herdr changes tab-close identity/error contracts, cleanup requires a retry service or timeout policy, or artifacts must be removed automatically. A separate ADR is required if cleanup becomes parent-workspace-wide or changes terminal task meaning.

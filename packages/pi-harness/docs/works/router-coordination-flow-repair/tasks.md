# Tasks #41: Router Coordination-Flow Repair

- Status: completed; exact tuple accepted; T1 historical; T2-T4 and authorized T5b repairs implemented; fresh same-byte T5c GO with P0/P1/P2/P3 all zero; T5a generation-2 `t5a-g2-f1` explicitly disposed (no defect found; one-confirmation exact-Plan lifecycle preserved) and `t5a-g2-f2` explicitly disposed with the synthetic/no-live-runtime limitation retained; final reconciliation complete. Canonical T5c evidence raw `5fb37d6ebf5da11470849d6a534adf951bd3a231156f89ab08de1cc36136f091`, output `f1a490e64101ae270d1a5bf8ef05542c2b25a364d53a0cf2e7645112d8a62bef`, record `cbf8d83f6a5739cf914dafb6c06c7a626010a0aa5c7c4ab1b7d819b418346ea3`. Synthetic prompt-contract and no-live-runtime limitations remain; commit, reload, activation, deployment, staging, and push were not performed.
- Updated: 2026-08-25
- Plan: [plan.md](plan.md)
- Work: [work.md](work.md)

These Tasks are the accepted decomposition for the exact Plan. They create no implementation authority beyond the accepted bounded in-Plan sequence, acceptance receipt, runtime permission, or commit permission. T1 is historical; T2-T4 and the authorized T5b repairs are implemented; T5c is GO with P0/P1/P2/P3 all zero; `t5a-g2-f1` is explicitly disposed with no defect found and the one-confirmation exact-Plan lifecycle preserved; `t5a-g2-f2` is explicitly disposed with the synthetic/no-live-runtime limitation retained; final lifecycle reconciliation is complete. No commit, reload, or deployment was performed.

## Dependency Graph

```text
T1 read-only Host and coordination-capability evidence
  -> T2 Router coordination instruction/state repair
  -> T3 capability-conditional Router scheduling wording
  -> T4 focused coordination and preservation evidence
  -> T5a independent read-only review
  -> T5b correction, only if T5a finds a repair
  -> T5c fresh same-byte review and status reconciliation
```

- T1 is the only first task. T2-T4 require a writable and visible coordination mechanism, not positive support for an exact native schema. T2 and T3 are sequential because T3 consumes T1 and T2's Router candidate. T4 depends on both. T5a is an independent read-only review after T4; it must not repair its own candidate. T5b exists conditionally after a concrete T5a finding and the authorized corrections are complete. T5c follows T5a and T5b and is complete with GO and P0/P1/P2/P3 all zero: `t5a-g2-f1` is explicitly disposed with no defect found and one-confirmation exact-Plan lifecycle preserved; `t5a-g2-f2` is explicitly disposed with the synthetic/no-live-runtime limitation retained. No task is parallel-safe with another task by default because they share the Router coordination contract and candidate surfaces. Within T4's synthetic matrix, independent outcomes may use parallel chains only for positive P; T1's ambiguous P mandates serial fallback. T1's observed C contradiction is a non-blocking adaptation observation under the revised contract. Current lifecycle is complete; the exact six-document reconciliation boundary is preserved. Commit, reload, and deployment were not performed.

## Shared evidence contract

T1 writes exactly `packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t1-host-task-capability.md`; T4 writes exactly `packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t4-coordination-verification.md`; T5a writes exactly `packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t5a-independent-review.md`; T5c writes exactly `packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t5c-fresh-review.md`. Router implementation/verification owns T1/T4; an independent reviewer owns T5a/T5c; correction ownership remains separate.

Each file has explanatory Markdown plus one fenced canonical JSON record. Common fields: `record_schema_version`, `record_id`, `task`, `owner`, `observed_at_utc`, `command_or_invocation`, `environment_identity` (`os`, `shell`, `cwd`, runtime/package versions, source revision identity), `observed_surfaces`, `observation_boundary`, `result`, verbatim bounded `output`, `provenance`, `output_sha256`, `record_sha256`. T4 adds `case_table` entries for inputs, observable correlation/equivalence, Todo transitions and description/message signal, dependency/restart state, exposed shared-state/Git observations, and side effects. T5a/T5c add ordered `reviewed_paths_and_sha256`, `reviewer_provenance`, `review_observation_boundary`, ordered `findings_and_dispositions`, `environment_identity`, and `candidate_revision_identity`; T5c adds `same_byte_identity`, `remaining_gates`.

For all four records, recursively sort object keys by ascending UTF-8 byte order, preserve array order, serialize UTF-8 JSON without BOM using two-space indentation, JSON escaping, LF (`0x0A`) between lines, exactly one final LF, and no trailing spaces. Preserve captured output line endings as LF in the logical output string. `output_sha256` hashes exact captured UTF-8 output bytes. For `record_sha256`, set fixed ASCII `RECORD_SHA256_PLACEHOLDER`, serialize, hash those bytes, then store lowercase 64-hex SHA-256. Never hash completed digest-bearing serialization; Markdown/fences are excluded.

## T1 - Verify current Host and coordination capability (read-only)

- Depends on: none.
- One outcome: produce T1 with two independent decisions: P for multiple independent resolve-to-spawn chains in one scheduling pass, and C for the existence and semantics of any writable/visible coordination mechanism, including available native statuses/fields and ordering.
- Method: read-only inspection distinguishing registration, inventory, model exposure, dispatch, execution, and terminal notification. Mutate no project/source/test/Skill/backend/settings/package/session/runtime/Herdr/Git surface and call no subagent tool in the tested session.
- P: positive permits conditional parallel evidence; negative, absent, stale, incompatible, unknown, or ambiguous mandates serial fallback.
- C: observe native status/field coverage and adaptation needs. Exact TaskCreate/TaskUpdate parity is not required; only total absence of any writable and visible coordination mechanism blocks T2-T4 for authority review and is never converted to serial fallback.
- Completion: exact environment/revision, commands, surfaces, output, provenance, P/C decisions, dispositions, schema, and hashes are recorded without opening backend/Host/Pi-core scope. The existing T1 evidence remains byte-for-byte unchanged. Its embedded title `Accepted Plan #41 T1 strategy`, its `identity_match`, and its Work/Plan/Tasks hashes are historical pre-revision metadata only; they are not current acceptance, implementation authorization, or authority. The exact tuple is accepted once; continued resolves within this unchanged Plan need no repeated confirmation. Its C contradiction is reconciled as adaptive projection evidence, while ambiguous P remains mandatory serial fallback.
- Status: historical evidence; no further T1 execution authorized

## T2 - Repair Router-only coordination rules

- Depends on: T1, the reconciled Router Todo authority, and the accepted exact Work/Plan/Tasks tuple. The required one-time review and explicit current-user acceptance have been completed; continued resolves within this unchanged Plan need no repeated confirmation. Renew confirmation only for substantive deviation in scope, architecture, behavior, risk, dependency, acceptance criteria, or identity.
- One outcome: update the smallest Router-owned instruction surface and focused checks so multi-step coordination creates the complete coordination set immediately, marks the current item `in_progress` before every coordination action, maps every terminal Result truthfully through native fields where available or the closest truthful projection plus existing descriptions/messages, releases dependencies only after that update, schedules newly unblocked work, and performs stale-only final cleanup. If safe correlation, stale detection, or deletion is unavailable, retain the record and report the limitation.
- Required behavior: preserve atomic status mapping and use available identity/equivalence signals. Duplicate/resend is idempotent when safely identifiable. Malformed/conflicting input retains the first observable truth, keeps status/dependencies unchanged, and reports through an existing description, subject, or ordinary Router coordination message; no exact marker, persistent digest, restart/outbox API, queue, or wrapper is required.
- Stale predicate: ordinary cleanup requires terminal, Result applied, inactive, non-current, no unresolved dependent, and known non-contradictory fields as established by available surfaces. Orphan additionally requires observable matching and non-canonical identity. Positive cases contain every available term; negative cases independently cover every false/unknown term, missing/mismatched orphan identity, canonical orphan identity, and age-only; negatives retain Todo. If safety cannot be established, retain and report.
- Serialization: any shared Router Todo, correlation, or notification state exposed by the environment serializes. Parallel scheduling evidence cannot mutate Git/index; any mutation stays behind the existing serial Git boundary.
- Expected surfaces: smallest Router-owned instruction/check surfaces only; no excluded ownership or infrastructure.
- Completion: all timing/status rules, adaptive conflict signal, observable stale matrix, serialization/Git boundary, dependency re-evaluation, and Handler no-coordination are demonstrated or limitations are recorded.
- Status: implemented

## T3 - Apply capability-conditional Router scheduling wording

- Depends on: T1 and completed T2.
- One outcome: make Router scheduling wording match P without overclaiming Host capability.
- Positive-P branch: permit parallel resolve-to-spawn chains only for independently verifiable work with disjoint inputs, outputs, ownership, authority, and side effects; preserve each exact resolved-to-spawn next action.
- Nonpositive-P branch: enforce serial fallback for negative, absent, stale, incompatible, unknown, or ambiguous P. C need only establish a writable/visible mechanism; exact native status parity is not a gate. Dependency, shared-file, ownership, authority, and behavioral conflicts always serialize. Do not imply queueing, retry, join, worktree isolation, conflict detection, or an unobserved Host guarantee.
- Backend boundary: do not edit backend source or backend documentation. Host limitations are recorded in T1 evidence only. Any backend wording or Host/Pi-core change requires separate authority and is outside #41.
- Completion check: focused checks cover both capability branches and show that dependency, shared-file, ownership, authority, and behavioral conflicts serialize.
- Status: implemented

## T4 - Verify coordination flow and preserved safety boundaries

- Depends on: completed T2 and T3.
- One outcome: produce the bounded, reproducible T4 coordination-verification record for the repaired Router flow.
- Coverage: P-positive parallel/P-nonpositive serial, dependencies, four statuses, native-status adaptation, retention when safe cleanup is unavailable, malformed/structurally different/equivalent Results, duplicate/resend/conflict where observable, restart/replay where safely observable, complete stale positives and per-term negatives, shared-file serialization, timing/dependency order, legality, ordinary confirmation, available identity/forwarding, persistence/notification, Handler one outcome, untouched `subagent_remove`/artifacts.
- Assertions: one terminal update where observable; no duplicate second action; unchanged status/dependencies and an existing-surface conflict signal where available; every stale negative retained; any exposed shared state serialized; no Git/index mutation during parallel evidence and any mutation behind existing serial boundary.
- Expected surfaces: focused checks/minimal accepted harness only; no production scheduler, persistence, wrappers, backend fixtures, or runtime state.
- Completion: exact T4 record satisfies common schema/hash and case-table requirements, with unavailable capabilities retained as reported limitations.
- Status: implemented

## T5a - Independent read-only review (completed)

- Depends on: completed T1-T4.
- One outcome: write `packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t5a-independent-review.md` for exact candidate and T1/T4 evidence.
- Schema/checks: ordered reviewed paths/hashes, reviewer provenance, review boundary, ordered findings/dispositions, environment/revision identity, common hashes; verify all six repaired contracts and preserved boundaries.
- Boundary: independent/read-only; no repair, status change, or acceptance.
- Completion: every finding names path/section, evidence, severity, disposition/gate, and T5b requirement.
- Status: completed; findings preserved in the review record; final T5c explicitly disposes `t5a-g2-f1` with no defect found and one-confirmation exact-Plan lifecycle preserved, and `t5a-g2-f2` with the synthetic/no-live-runtime limitation retained

## T5b - Correction of a T5a Finding (completed)

- Depends on: T5a identifying a concrete repair finding. The first-generation and narrowed in-boundary generation-2 corrections are implemented under the accepted scope. A correction crossing accepted scope, architecture, behavior, risk, dependency, acceptance criteria, or identity would have required renewed disclosure, review, and explicit current-user acceptance; none was performed.
- One outcome: correct only the finding in the isolated Router-owned candidate surface and produce focused evidence that the correction addresses it.
- Required behavior: preserve the exact T5a finding and review record; change no excluded surface or unrelated concurrent hunk. The Router implementation owner owns rollback and restores only the Router-owned #41 candidate surfaces to pre-change behavior/bytes if the correction must be abandoned, preserving unrelated concurrent changes.
- Completion check: the correction boundary, touched paths/hunks, authorization disposition, and verification are recorded; T5b returned the package to T5c. T5b did not reconcile final status or declare the package ready.
- - Status: completed

## T5c - Fresh same-byte review and status reconciliation (completed)

- Depends on: completed T5a and completed T5b.
- One outcome: write `packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t5c-fresh-review.md`; only a clean same-byte review permits later designated-owner status reconciliation.
- Schema/checks: T5a schema/common hash plus `same_byte_identity`, `remaining_gates`; recompute candidate hashes, prove byte equality, dispose or gate every finding, confirm no unrelated change. Reviewer independent from T5b owner.
- Boundary: review, correction, status reconciliation remain separate; no acceptance, implementation authority, excluded edits, reload/deploy/activation/stage/commit.
- Completion: exact six-document reconciliation scope, final T5c identity and explicit f1/f2 dispositions, and remaining external gates are recorded; the tuple remains accepted and the bounded package is complete. Commit, reload, and deployment remain unperformed.
- Status: completed; T5c GO

## Acceptance Gate and Exclusions

The exact `work.md` + `plan.md` + `tasks.md` tuple was reviewed and explicitly accepted once. That acceptance authorized the bounded in-Plan sequence while tuple identity and scope remained unchanged. Current lifecycle is T1 historical; T2-T4 and authorized T5b repairs implemented; T5c GO with P0/P1/P2/P3 all zero; `t5a-g2-f1` disposed with one-confirmation exact-Plan lifecycle preserved; `t5a-g2-f2` disposed with synthetic/no-live-runtime limitation retained; final status reconciliation complete. This package does not authorize or claim backend, Host, Pi-core, reload, staging, commit, deployment, or runtime activation. `pi-harness-admission-9if3MD/` and unknown or unowned paths are excluded.

Excluded from every task: Pi-core modification; new Host seams; backend source or documentation wording; backend lifecycle implementation; subagent runtime changes; queue/retry/cancellation/timeout/join/worktree/lock/persistent coordination state; persistent identity/generation or canonical Result digest; restart/outbox API; exact native terminal-state or description mutation; cross-provider fallback; Handler prompt or coordination changes; Resolver/Handoff/Handler Result schema changes; relaxed legality or confirmation boundaries; stable-identity redesign; `subagent_remove`; artifact cleanup; settings/session/Herdr mutation; reload; deployment; staging; commit; and Git history mutation.

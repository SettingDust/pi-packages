# Plan #41: Router Coordination-Flow Repair

- Status: completed; exact tuple accepted; T1 historical; T2-T4 and authorized T5b repairs implemented; fresh same-byte T5c GO with P0/P1/P2/P3 all zero; T5a generation-2 `t5a-g2-f1` explicitly disposed (no defect found; one-confirmation exact-Plan lifecycle preserved) and `t5a-g2-f2` explicitly disposed with the synthetic/no-live-runtime limitation retained; final reconciliation complete. Canonical T5c evidence raw `5fb37d6ebf5da11470849d6a534adf951bd3a231156f89ab08de1cc36136f091`, output `f1a490e64101ae270d1a5bf8ef05542c2b25a364d53a0cf2e7645112d8a62bef`, record `cbf8d83f6a5739cf914dafb6c06c7a626010a0aa5c7c4ab1b7d819b418346ea3`. Synthetic prompt-contract and no-live-runtime limitations remain; commit, reload, activation, deployment, staging, and push were not performed.
- Updated: 2026-08-25
- Work: [work.md](work.md)
- Tasks: [tasks.md](tasks.md)
- Authority: [Router Delegation PRD](../../prd/router-delegation.md), [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md), [ADR-0002](../../adr/0002-structured-handoff-and-yaml-results.md), [Router Delegation Specification](../../spec/router-delegation.md)
- Boundary context only: [Backend Adaptation Specification](../../spec/backend-adaptation.md). It is not #41 authority; backend source or documentation wording and Host/Pi-core changes require separate authority.

## Objective

Repair only the main-session Router coordination flow so multi-step work is tracked truthfully, each coordination action has an explicit in-progress boundary, terminal Handler Results drive the next scheduling decision, and independent work uses parallel resolve-to-spawn chains only when P proves current Host/tool-call parallel-launch capability. Nonpositive or ambiguous P mandates serial scheduling. Todo projection adapts to the environment's available writable/visible coordination mechanism: use native status and fields when suitable, otherwise preserve the closest truthful status and encode semantic facts in existing descriptions, subjects, or ordinary Router coordination messages. Only total absence of any writable and visible mechanism may block; an exact TaskCreate/TaskUpdate schema is not required.

- This Plan governed the bounded implementation, focused verification, independent review, correction, and final lifecycle reconciliation. T2-T4 and the authorized T5b repairs are implemented; fresh T5c review is GO with P0/P1/P2/P3 all zero; `t5a-g2-f1` is explicitly disposed with no defect found and the one-confirmation exact-Plan lifecycle preserved; `t5a-g2-f2` is explicitly disposed with the synthetic/no-live-runtime limitation retained; creating or updating this lifecycle wording performs no additional implementation. No commit, reload, or deployment was performed.

## Preconditions and authority boundary

- This exact Work/Plan/Tasks tuple has received fresh independent review and one explicit current-user acceptance. That confirmation authorizes the bounded in-Plan sequence while the tuple identity and scope remain unchanged; continued resolves within this Plan need no repeated confirmation. Renew confirmation only for substantive deviation in scope, architecture, behavior, risk, dependency, acceptance criteria, or identity. Final T5c explicitly disposes `t5a-g2-f1` with no defect found under that lifecycle and `t5a-g2-f2` with no prompt-contract ordering defect found, without claiming live task-runtime, Handler, or subagent backend behavior.
- T1 establishes actual current Host/tool-call and coordination-surface semantics; draft documentation or historical backend evidence cannot prove runtime capability.
- The accepted Router Specification is the historical baseline; the coordination rules in this exact tuple are the accepted, bounded #41 amendment. Todo records remain Router workflow projections only, not Handler input, Resolver state, backend lifecycle state, or a persistent task database.
- #41 is Router-only. Host capability limitations may be recorded in the bounded T1 evidence record, but they do not authorize backend wording, backend implementation, Host changes, or Pi-core changes.
- No Pi-core seam is assumed. Supported package-level surfaces and the current Host contract are the only implementation inputs.

## Scope

1. Verify, read-only, whether the current Host/tool-call environment supports multiple independent resolve-to-spawn chains in one scheduling pass, and observe the actual writable/visible coordination mechanism, native statuses, fields, and ordering semantics.
2. Update only Router behavior/instructions to require:
   - immediate complete native coordination-record creation for multi-step work;
   - projection of the current item as `in_progress` before each coordination action;
   - an immediate truthful terminal projection after every Handler Result, including `partial`;
   - dependency release and newly unblocked scheduling only after that semantic terminal projection;
   - final cleanup only for records proven stale, with retention when safe stale detection or deletion is unavailable;
3. Make parallel scheduling the default only for independently verifiable, non-conflicting work and only when P proves Host support. Nonpositive or ambiguous P mandates serial fallback. Adapt coordination to C: native fields may be used when they express each semantic outcome; otherwise use the closest truthful native status plus existing descriptions, subjects, or ordinary Router messages. Total absence of any writable and visible mechanism may block; exact TaskCreate/TaskUpdate schema parity is not required.
4. Leave backend source and backend-documentation wording unchanged. Reconcile T1's C contradiction as a non-blocking observation of missing exact statuses, correlation, and cleanup semantics, not as a reason to block the Router-neutral repair. Record P/C limitations without converting them into backend or Host/Pi-core scope.
5. Add focused synthetic and evidence verification for all four terminal Result statuses, observable identity/equivalence, duplicate and conflict handling, restart/replay where the environment exposes safe signals, stale cleanup, scheduling, and preservation invariants, including adaptation when native status fields are incomplete and retention when safe correlation, stale detection, or cleanup is unavailable.

## Environment-adaptive Result and Todo contract

- A terminal Result correlates to one Todo using task/runtime identity and visible Result fields or messages already exposed by the environment. `subagentId` and `generation` may be used when supplied, but persistent identity/generation storage and canonical Result digest storage are not required.
- Equality uses only the parsed Result and visible equivalence signals the environment exposes. YAML presentation differences may compare equal where parsing exposes the same value; malformed, duplicate-key, unknown-key, missing-field, wrong-type, or structurally different values do not. No canonical digest persistence is required.
- An identical duplicate or resend is idempotent when available identity and visible Result establish equivalence. Malformed or conflicting input fails closed: retain the first observable semantic outcome, leave Todo status and dependency projection unchanged, and report the conflict through an existing description, subject, or ordinary Router coordination message. If identity or equivalence is unavailable, retain the Todo and report the limitation.
- Result statuses map truthfully to terminal Todo states where native states exist, otherwise to the closest truthful native status plus existing descriptive/message surfaces; Result data remains atomic and contains no workflow-control field.
- Ordinary cleanup requires the available environment to establish: terminal; terminal Result applied; inactive; non-current; no unresolved dependent; and all required fields known and non-contradictory. An orphan additionally requires observable matching and non-canonical identities. Any false/unknown term fails closed; age never qualifies. If safe stale detection or deletion is unavailable, retain the Todo.
- Mechanical stale matrix: positive ordinary has every observable ordinary term; positive orphan adds observable matching and non-canonical identities. Negative cases independently cover non-terminal, absent/not-applied Result, active, current, unresolved-dependent, missing/unknown or contradictory fields, missing/mismatched orphan identity, canonical orphan identity, and age-only; each retains the Todo.

## Bounded evidence and ownership

- Exact paths: T1 `packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t1-host-task-capability.md`; T4 `packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t4-coordination-verification.md`; T5a `packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t5a-independent-review.md`; T5c `packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t5c-fresh-review.md`.
- Router implementation/verification owns T1/T4; an independent reviewer owns T5a/T5c; correction ownership remains separate. Review, correction, and status reconciliation remain separate.
- Common schema: explanatory Markdown plus one fenced canonical JSON record with `record_schema_version`, `record_id`, `task`, `owner`, `observed_at_utc`, `command_or_invocation`, `environment_identity` (`os`, `shell`, `cwd`, runtime/package versions, source revision identity), `observed_surfaces`, `observation_boundary`, `result`, verbatim bounded `output`, `provenance`, `output_sha256`, and `record_sha256`. T4 adds `case_table` with inputs, observable correlation/equivalence, Todo transitions and description/message signal, dependency/restart state, shared-state/Git observations, and side effects. T5a/T5c add ordered `reviewed_paths_and_sha256`, `reviewer_provenance`, `review_observation_boundary`, ordered `findings_and_dispositions`, `environment_identity`, and `candidate_revision_identity`; T5c adds `same_byte_identity` and `remaining_gates`.
- For every record, recursively sort object keys by ascending UTF-8 byte order, preserve array order, and serialize UTF-8 JSON without BOM using two-space indentation, JSON escaping, LF (`0x0A`) between lines, exactly one final LF, and no trailing spaces. Preserve captured output line endings as LF in the logical output string. Hash exact captured UTF-8 output bytes for `output_sha256`. For `record_sha256`, use fixed ASCII `RECORD_SHA256_PLACEHOLDER`, serialize, hash those bytes, then store the lowercase 64-hex digest. Never hash the completed digest-bearing serialization; Markdown/fences are excluded.
- T1 is read-only Host/tool observation; T4 uses synthetic in-memory or existing focused test surfaces; T5a/T5c are read-only exact-byte reviews. None may mutate excluded surfaces, Git history/index, or call subagent tools in the tested session.

## Strategy and dependency order

### T1 - Establish current capabilities and coordination adaptation (historical evidence)

- T1 is read-only Host/tool observation; T4 uses synthetic in-memory or existing focused test surfaces; T5a/T5c are read-only exact-byte reviews. None may mutate excluded surfaces, Git history/index, or call subagent tools in the tested session. The embedded T1 evidence title `Accepted Plan #41 T1 strategy`, its `identity_match`, and its Work/Plan/Tasks hashes are historical pre-revision metadata only; they are not current acceptance, implementation authorization, or authority. The exact tuple is accepted once; T1 remains historical evidence, and its C contradiction is reconciled as adaptive projection evidence while ambiguous P remains mandatory serial fallback.

### T2 - Repair Router-only coordination instructions and state transitions (implemented)

After T1 and exact tuple acceptance, change the smallest Router-owned instruction surface and focused checks so multi-step work creates the complete Todo set immediately, marks each current item `in_progress` before its coordination action, maps every terminal Result truthfully using available native fields or the closest truthful projection plus existing descriptions/messages, releases dependencies only after the terminal update, schedules newly unblocked work, and performs stale-only cleanup. Preserve direct Router responses, delegated project-domain work, Handler no-coordination, Resolver legality, available identity, exact invocation forwarding, and notification behavior. If safe correlation, stale detection, or deletion is unavailable, retain the record and report the limitation.

### T3 - Apply capability-conditional Router scheduling wording (implemented)

After T1 and T2, align Router wording with P only. Positive P permits parallel resolve-to-spawn chains for independent outcomes with disjoint inputs, outputs, ownership, authority, and side effects. Nonpositive, stale, incompatible, or ambiguous P mandates serial fallback. Coordination wording follows C's observed environment: native statuses/fields where truthful, otherwise the closest truthful status and existing descriptive/message surfaces. Dependency, shared-file, ownership, authority, and behavioral conflicts always serialize. Do not change backend source or documentation wording, add a backend guarantee, or introduce a scheduler, queue, retry, join, wrapper, or Host/Pi-core seam.

### T4 - Run focused coordination and preservation verification (implemented)

After T2/T3, produce T4 covering P-positive parallel and P-nonpositive serial branches, dependencies, all statuses, observable equivalent/malformed/structurally different Results, duplicate/resend, conflict, restart/replay where safely observable, and the complete available stale matrix. Assert unchanged status/dependencies and no second terminal update/release/schedule when those surfaces are observable; report limitations otherwise. Assert no Git/index mutation during parallel evidence; any necessary mutation remains outside it behind the existing serial Git boundary. Record all observations under the common schema.

### T5a - Independent read-only review (completed)

Write `packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t5a-independent-review.md`. Its canonical record includes ordered reviewed paths/hashes, reviewer provenance, observation boundary, ordered findings/dispositions, environment identity, candidate revision identity, and common hashes. Review all repaired contracts. T5a recorded the findings; it did not repair or reconcile status. The final T5c review disposed of the recorded findings and returned GO with P0/P1/P2/P3 all zero.

### T5b - Correction of a T5a finding (first correction implemented; narrowed correction authorized)

- Run only when T5a identifies a concrete finding. The first-generation and narrowed in-boundary corrections are implemented under the accepted scope. Cross-boundary correction would have required renewed disclosure, review, and explicit user acceptance; none was performed. Preserve the exact T5a finding and review record; change no excluded surface. T5b completed and returned the package to T5c.

### T5c - Fresh same-byte review and status reconciliation (completed)

- Write `packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t5c-fresh-review.md`. Use the T5a schema/hash procedure plus `same_byte_identity` and `remaining_gates`; recompute candidate hashes, prove byte equality, dispose or gate every finding, and confirm no unrelated change. Reviewer remains independent from the correction owner. T5c review is GO with P0/P1/P2/P3 all zero; `t5a-g2-f1` is explicitly disposed with no defect found and one-confirmation exact-Plan lifecycle preserved; `t5a-g2-f2` is explicitly disposed with no prompt-contract ordering defect found and the synthetic/no-live-runtime limitation retained; final status reconciliation is complete. T5c did not accept, authorize, stage, commit, reload, deploy, or activate.

## Verification gates

- T1 separately records P and adaptive coordination capability: nonpositive/ambiguous P mandates serial fallback; only total absence of any writable/visible mechanism blocks T2-T4 for authority review.
- The Router candidate contains all five coordination timing rules, including `partial`, and still prohibits Router project-domain execution and Handler coordination.
- Parallel scheduling requires positive P and independently verifiable, non-conflicting work; nonpositive/ambiguous P uses serial fallback. Coordination status must remain truthful under the observed environment through native fields or the closest truthful projection and existing descriptions/messages.
- Result identity/equivalence, duplicates/replay where observable, malformed/structural distinction, and conflict fail-closed behavior are covered; conflicts assert unchanged status/dependencies and an existing-surface signal, or retain/report when that signal is unavailable.
- All four statuses map atomically and truthfully where the environment permits; otherwise the closest truthful projection is retained without claiming completion.
- Ordinary/orphan cleanup satisfies the observable complete predicate; the mechanical positive/negative matrix proves every available term and retains records when safety cannot be established.
- Scheduling follows terminal updates; shared-file work serializes.
- Any exposed shared Router Todo, correlation, or notification state is serialized; parallel evidence has no Git/index mutation, and any mutation remains behind the existing serial boundary.
- Resolver legality, ordinary confirmation, available identity, exact invocation, persistence/notification where supplied by the environment, Handler one-outcome/no-coordination, and Router ownership remain intact.
- No `subagent_remove` or artifact deletion/modification is introduced.
- Completion: exact six-document reconciliation scope, final T5c identity and explicit f1/f2 dispositions, and remaining external gates are recorded; the tuple remains accepted and the bounded package is complete. Commit, reload, and deployment remain unperformed.
- Status: completed; T5c GO
- Checks pass with no unrelated change.

## Stop conditions, rollback, and limitations

Stop for authority review when no writable and visible coordination mechanism exists; Host states cannot be distinguished; a Pi-core seam is required; or work needs new scheduler/queue/lock machinery. Nonpositive or ambiguous P mandates serial fallback and does not block T2-T4. Stop on an unsafe conflict/stale case, inability to establish a safe existing-surface conflict signal, unserialized exposed Router state, Git/index mutation outside the existing serial boundary, ownership ambiguity, or required authority change.

Rollback owner is the Router implementation owner. The restoration boundary is only the Router-owned candidate surfaces changed by #41, restored to their pre-change behavior/bytes at the reviewed hunk boundary. Rollback must preserve unrelated concurrent changes, stop when the boundary cannot be isolated, and must not delete Results/artifacts or add persistence, wrappers, or cleanup side effects.

## Explicit non-goals

No Pi-core modification; no new Host seam; no backend source or backend-documentation wording change; no backend lifecycle implementation; no subagent runtime changes; no `subagent_remove` behavior; no artifact cleanup; no queue, retry, cancellation, timeout, join, worktree, lock, persistent coordination database, persistent identity/generation or canonical Result digest, restart/outbox API, exact native terminal-state or description mutation, cross-provider fallback, or Handler prompt coordination. No Resolver/Handoff/Handler Result schema changes, no relaxed legality checks, no altered Router confirmation boundary, no settings/session/Herdr mutation, and no staging, commit, reload, deployment, or live activation.

## Acceptance and Continuation Gate
The exact Work/Plan/Tasks package was reviewed and explicitly accepted once. That acceptance authorized the bounded in-Plan sequence while tuple identity and scope remained unchanged. Current lifecycle is T1 historical; T2-T4 and authorized T5b repairs implemented; T5c GO with P0/P1/P2/P3 all zero; `t5a-g2-f1` disposed with one-confirmation exact-Plan lifecycle preserved; `t5a-g2-f2` disposed with synthetic/no-live-runtime limitation retained; final status reconciliation complete. This package does not authorize or claim backend, Host, Pi-core, reload, staging, commit, deployment, or runtime activation. `@settingdust/pi-harness-admission-9if3MD/` and unknown or unowned paths are excluded.

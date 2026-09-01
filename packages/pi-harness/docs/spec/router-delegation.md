# Router Delegation Specification

- Status: accepted historical baseline; #41 Router coordination amendment accepted final authority and implemented; fresh same-byte T5c GO with P0/P1/P2/P3 all zero; T5a generation-2 `t5a-g2-f1` explicitly disposed (no defect found; one-confirmation exact-Plan lifecycle preserved) and `t5a-g2-f2` explicitly disposed with the synthetic/live-runtime limitation retained. Canonical T5c evidence raw `5fb37d6ebf5da11470849d6a534adf951bd3a231156f89ab08de1cc36136f091`, output `f1a490e64101ae270d1a5bf8ef05542c2b25a364d53a0cf2e7645112d8a62bef`, record `cbf8d83f6a5739cf914dafb6c06c7a626010a0aa5c7c4ab1b7d819b418346ea3`. Synthetic prompt-contract and no-live-runtime limitations remain; commit, reload, activation, deployment, staging, and push remain pending and were not performed; unrelated completed admission repairs remain as recorded below.
- Authority: [ADR-0007](../adr/0007-authority-first-router-admission.md)

## 1. Boundary and trust ownership

The Router/coordinator owns workflow confirmation: it must complete the applicable Plan and Tasks, disclose the decision-relevant context and exact authority in an ordinary message, obtain one current-user confirmation, and then invoke delegation. A Handoff requests work and never proves acceptance. `pi-harness` does not authenticate the user, interpret natural-language confirmation, persist confirmation, issue a token or receipt, or replay-protect confirmation history.

The Harness Extension owns prompt/tool registration and resolver execution. The Resolver validates and resolves; it must not interact, disclose, activate a Plan, issue a receipt, or launch a Handler.
The Router's coordination Todo records are a main-session workflow projection, not Handler input, Resolver state, backend lifecycle state, or a persistent task database. For multi-step work, the Router must create the complete coordination set immediately, with exactly one item per independently observable outcome. It must project the current item as `in_progress` immediately before each coordination action, record each terminal Handler Result truthfully immediately after notification, release dependencies only after that semantic terminal update, and then schedule newly unblocked work. It must use native task status and fields when they express the needed fact; otherwise it must preserve the closest truthful native status and encode the semantic fact in existing descriptions or subjects, or in an ordinary Router coordination message. Total absence of any writable and visible coordination mechanism may block coordination; lack of an exact runtime schema must not.

Todo lifecycle state is semantic and deterministic: an unstarted outcome is pending; an outcome whose coordination action is about to run is in_progress; and Result `completed`, `partial`, `failed`, or `blocked` maps to the matching truthful terminal projection when the environment exposes that state, otherwise to the closest truthful native status plus existing descriptive/message surfaces. The Result status remains retained as data and must not be collapsed into success or used as a workflow-control field. Never mark completed for partial, failed, or blocked, and never delete active or unresolved work. A terminal Todo is stale only when the available environment can establish that its terminal Result was applied, no active or unresolved dependent outcome still requires the record, it is not the current coordination item, and all required fields are known and non-contradictory. An orphan duplicate additionally requires an observable matching identity and non-canonical identity. Age alone, pending, in_progress, unknown identity, or an unresolved dependency never makes a Todo stale. If the environment cannot establish safe stale detection or deletion, retain the record and report the limitation.

The Router must adapt to the current environment's visible coordination mechanism. Its capability observation records which native statuses and fields are available, and whether any writable/visible mechanism exists; this observation is not a requirement for an exact `TaskCreate`/`TaskUpdate` schema. Only total absence of such a mechanism blocks the coordination flow.
The Router correlates a Handler Result using existing task/runtime identity and visible fields/messages available in the environment. When an identity and equivalent visible Result are available, a duplicate or resent terminal notification is idempotent and produces no second terminal Todo update or repeated dependency release. When an incoming Result is malformed or conflicts with an already applied observable identity, the Router fails closed, preserves the first semantic outcome, leaves status and dependency projection unchanged, and reports the conflict through an existing description, subject, or ordinary Router coordination message. It must not require persistent identity/generation storage, canonical digest storage, restart/outbox APIs, or an exact description mutation. After restart, resume, or replay, it may reapply a notification only when the available identity and visible state make that safe; otherwise it retains the Todo and reports the limitation.

The Router may use parallel resolve-to-spawn chains only for independently verifiable outcomes with non-conflicting inputs, outputs, ownership, authority, and side effects, and only when the current Host/tool-call capability is proven. Unsupported, stale, incompatible, or ambiguous Host capability requires serial scheduling. Dependency, shared-file, ownership, authority, and behavioral serialization always override parallel capability.

The Router owns subsequent workflow decisions after Handler Results return. The Handler performs its delegated one-outcome work and returns a normalized Result; it does not select the next workflow action or manage coordination Todos.

The Resolver validates and resolves; it must not interact, disclose, activate a Plan, issue a receipt, launch a Handler, or manage Router Todos. The Harness Extension owns prompt/tool registration and resolver execution.


## #42 Accepted Capability-Selection Amendment

The #42 amendment is accepted and current; its canonical frozen package candidate completed T4 and the P1 repair, fresh T5 verification, and independent T6 review. T5 and T6 each returned GO with P0-P3 zero. The Router supplies root finite non-negative integer `reasoning` and `impact` requests; 0..3 is semantic guidance with examples, not a phase taxonomy. The Handoff contains no model or capability fields. The Resolver selects from `harness.candidates[providerModelKey][thinking]`, where the key is split at the first slash only: provider and model ID are non-empty exact strings without control characters, provider cannot contain a slash, and model ID may contain slashes and dots. Registry lookup uses separate exact fields; display `provider/model.thinking` is diagnostic-only and never parsed. Candidates qualify on both dimensions and sort by impact surplus, reasoning surplus, then `JSON.stringify([provider, model, thinking])`. Dynamic resolver schema generation does not read the Registry, filter configured candidates by availability, or attest configured candidate availability; it exposes only the closed root request shape and relevant static descriptions. During resolve execution, after structural and numeric validation and before qualification and selection, one Registry snapshot is read exactly once and is the only authoritative availability snapshot. Legacy Roles/modelRole, unknown fields, raw duplicate JSON keys before normalization, duplicate canonical `(provider, modelId, thinking)` tuples, malformed candidates, unavailable candidates, and no qualified candidate fail closed with explicit manual replacement required. Unknown fields or invalid configuration shapes, including mixed unknown-plus-legacy input, retain `invalid_configuration` before pure recognized `roles`/`modelRole` returns `legacy_configuration`. Canonical tuples use the exact first-slash parse and exact thinking string, with no trim, case folding, aliasing, dot parsing, last-slash parsing, display parsing, or other normalization. Exact selective-commit review is GO; staging and commit remain pending. No live backend, reload, settings/runtime, Herdr, Pi-core, push, or deployment behavior is claimed.

**#42 final lifecycle evidence:** Fresh T5 and independent T6 each returned GO with P0-P3 zero. T5 command attribution is config-command `13/22`, config `21/22`, settings-store `19/37`, Extension `6/95`, affected `46/154`, distinct subset `53/81`, focused `94/250`, and full `136/538`; typecheck, import, activation, and execute passed. The canonical 1085-byte LF manifest aggregate is `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`; rejected 1095-byte literal-backslash-n aggregate is `3fd52e65a90f2d7eaee47b587e50d467abd2960fdb7ead118131bcfb0ce70525`. The unrelated Herdr failure remains outside #42.


## 2. Handoff and admission input

A Handoff contains `objective`, `primarySkill`, optional `companionSkills`, `context`, optional `constraints`, and optional `deliverables`. Each context item must contain exactly one non-empty readable `ref` or one non-empty `inline` value plus a non-empty `purpose`.

Atomic admission remains available for one small, behavior-neutral change with non-empty bounded `basis[]` and focused `verification[]`. Planned admission selects exactly one same-directory `work.md` plus either matching `plan.md`/`tasks.md` or matching sliced members. The selected three canonical paths must occur exactly once as Handoff reference context. The tuple grammar, canonical path rules, canonical document-byte rules, canonical JSON rules, and normalized Handoff hashing remain current-call validation inputs.

Model input must not supply receipt, acceptance, reviewer, session, activation, digest, or other capability-shaped fields. The Resolver derives identities from filesystem bytes and supplied structure; it never trusts model-supplied identity fields.

## 3. Planned validation without authorization state

For planned admission, the Resolver must:

1. validate the ordinary Handoff, Skills, root capability request, references, and admission shape;
2. canonicalize and validate the selected Work/Plan/Tasks tuple;
3. read the selected authority as required for current-call validation and derive canonical paths, bytes, and normalized Handoff identities;
4. run the configured final current-call/JIT recomputation immediately before returning a resolved invocation; and
5. return a resolved invocation when those checks pass, without looking up or inserting acceptance state.

The Resolver remains non-interactive. No planned call waits for, invokes, or checks a Plan activation boundary. The Router must perform confirmation before invoking this delegation path; that workflow obligation is outside the Resolver contract and cannot be represented by a receipt.

If authority or Plan bytes change between current-call observations, the call must fail closed with `authority_drift` (or the existing precise structural/reference error when that is the actual cause). The error must not claim that a user accepted either version. The Router decides whether to re-disclose and reconfirm before a new call.

## 4. Removed interfaces and compatibility

The following are removed, not deprecated compatibility interfaces:

- EventBus channel `pi-harness:plan-activation-v1`;
- activation request/context/result transport and Harness-owned disclosure helper;
- `PlanAuthorizationRegistry`, `PlanAuthorizationReceipt`, receipt lookup/insertion/integrity APIs;
- activation decision/outcome types, replay IDs, activation/decision timestamps, session-generation authorization state, and reset/restore/issuance logic; and
- receipt-specific `acceptance_required`, `receipt_corrupt`, and amendment/authorization response semantics.

No compatibility shim accepts, ignores, or translates the old activation payload; the completed repository-wide inventory found no direct consumer requiring one. A removed API has no migration period inside Harness; the migration is to ordinary Router confirmation followed by normal delegation.

`acceptance_required` has no remaining role in this boundary: absence of a receipt is no longer a state. Any unrelated use discovered by repository-wide search must be explicitly justified in the implementation review or removed; it must not be retained by habit.

## 5. Failure and session semantics

Malformed Handoffs, invalid Skills, unavailable or malformed candidates, legacy Role/modelRole configuration, unreadable references, invalid admission shapes, tuple mismatch, forbidden model or capability fields in the Handoff, and canonicalization failures retain precise structural/reference errors. Current-call authority or Plan drift fails closed. No failure mutates authorization state because no such state exists.

Reload, new session, resume, fork, shutdown, and session-generation changes do not clear or restore Harness authorization; there is nothing to clear or restore. No replacement marker, flag, audit event, confirmation token, persistence, or Host seam may be introduced.

## Evidence ownership and lifecycle reconciliation

The implementation repairs comprise three distinct findings with separate ownership:

- First P2: Resolver root/Handoff/context runtime shape closure and recursive capability-field rejection belong to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.
- Second P2: nested atomic/planned/authority TypeBox closure belongs to `extensions/pi-harness.ts`, with regression coverage in `tests/extension.test.ts`.
- Final P2: non-string Role model/thinking fail-closed validation belongs to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.

- Fresh final technical evidence is complete: admission/protocol `50 pass, 0 fail, 102 assertions`; protocol-only `45 pass, 0 fail, 86 assertions`; Extension schema `1 pass, 0 fail, 41 assertions`; full package `105 pass, 0 fail, 466 assertions across seven files`. TypeScript `5.9.3` typecheck passed, protocol import passed, and source-level `activateHarness` registration smoke passed.

The four malformed Role cases (null/numeric model and null/numeric thinking) returned `unavailable_model` or `invalid_thinking`, did not throw, and produced zero subject observations. Stateless evidence retained: seven closed TypeBox shapes; Work and Plan drift each returned `authority_drift` after exactly two observations; recursive capability-shaped keys were rejected while prose was accepted; removed-state inventory returned zero results; both obsolete admission-decision files were absent.

- Final #41 reconciliation is complete: the exact selected Work/Plan/Tasks tuple was accepted; T1 is historical; T2-T4 and the authorized T5b repairs are implemented; fresh T5c review is GO with P0/P1/P2/P3 all zero; `t5a-g2-f1` is disposed with no defect found, preserving one current-user confirmation for the exact Plan and renewed confirmation only for substantive deviation; `t5a-g2-f2` is disposed with no prompt-contract ordering defect found while retaining the synthetic/no-live-runtime limitation. The exact six-document reconciliation boundary is [PRD](../prd/router-delegation.md), [ADR-0001](../adr/0001-router-resolver-handler-boundaries.md), this Spec, [work.md](../works/router-coordination-flow-repair/work.md), [plan.md](../works/router-coordination-flow-repair/plan.md), and [tasks.md](../works/router-coordination-flow-repair/tasks.md). Frozen candidate identities remain `extensions/pi-harness.ts=4d2ea376f042477f38b299fe849b47d2145a393bc4daef686c27f3de6c1a1c5a` and `tests/extension.test.ts=768e271e67452a0d90f8cfc008e8281560e09725cd358bd63fe290195875cba1`; the synthetic prompt-contract limitation remains, so no live Router/Handler runtime behavior is claimed. `pi-harness-admission-9if3MD/` and all unknown or unowned paths are explicitly excluded. No commit, reload, or deployment was performed.

## 6. Acceptance criteria and non-goals

The implementation candidate is acceptable only if focused and full tests show: no removed channel, type, registry, receipt, or receipt-based response path; planned resolution performs only legality/authority/current-call validation; missing receipt is not an acceptance condition; authority drift remains precise and fail-closed; no interaction occurs in Resolver execution; atomic behavior, Handoff normalization, tuple validation, model/Skill/Role validation, Handler Result parsing, and unrelated protocol behavior remain intact. Router coordination verification must also show complete coordination-set creation for multi-step work, one record per independently observable outcome, immediate pre-action `in_progress` projection, immediate truthful terminal projection for all four Result statuses using native fields or the closest truthful status plus existing descriptive/message surfaces, no completed projection for partial/failed/blocked, post-update dependency release, idempotent duplicate/replayed notification handling when identity is observable, fail-closed conflict handling with retained semantic state, conservative restart/replay behavior, stale-only final cleanup with retention when safe detection or deletion is unavailable, and preservation of Results, sessions, manifests, and artifacts.

Non-goals: Pi-core changes, new Host seams, persistence of Todo records beyond the existing main-session coordination projection, authentication, confirmation UI, natural-language classification, per-Handoff confirmation, backend lifecycle changes, queues, retries, cancellation, timeouts, automatic loop limits, `subagent_remove`, artifact cleanup, persistent subagent identity/generation or canonical Result digests, restart/outbox APIs, exact native terminal-state or description-mutation parity, reload, staging, and commit. This Todo contract does not authorize implementation, parallel Host changes, a scheduler/queue/wrapper, or runtime activation.

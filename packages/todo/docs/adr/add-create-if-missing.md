# ADR: Todo Add Creates a Missing Task

- **Status:** Accepted — historical decision backfill
- **Decision identity:** `todo/add-create-if-missing`
- **Owner:** `packages/todo`
- **Recorded:** 2026-10-04 (+08:00), the actual backfill date
- **Historical acceptance:** `2026-10-02T23:21:16.624Z` (`2026-10-03T07:21:16.624+08:00`)
- **Behavior authority:** [Todo Multi-Tool Protocol, Section 10](../works/todo-protocol-redesign/spec.md#10-accepted-todo_add-create-if-missing-amendment-source-verification-complete), with the add contract in Sections 2–4
- **Historical implementation:** `29535730d4e587d45ccd54f671c12bda5bfb7f08` (`feat(todo): create missing task on add`, 2026-10-03)

## Context and Decision Drivers

Previously, `todo_add` appended only to an existing task group and rejected a missing group. The user expected it to add a task and questioned the `Todo task does not exist` failure. Creating a new group instead required `todo_set`, a complete replacement rather than an incremental addition.

The discussion identified restating the full list just to add a group as cumbersome and liable to omit existing content. The existing Spec also establishes that `todo_set` creates todos as `pending`; it does not accept existing statuses as creation input. Rebuilding through set therefore cannot by itself preserve mixed statuses. This is contract context, not a claim that the historical user accepted every later verification condition.

The drivers were to support the user's incremental use directly, avoid restating existing groups, and avoid an extra creation tool. The competing benefit was strict missing-target rejection as protection against misspelled group names. No historical performance target, measured tool cost, or error-rate target was established.

## Decision

Extend the existing `todo_add` interface to **append or create**, rather than introduce a separate task-creation interface. The user selected this first option in the historical discussion identified below.

The existing Spec gives this choice its precise behavior:

- Match task names exactly and case-sensitively. Append to an existing group; otherwise create one group at the end of the task list.
- Preserve existing content, relative order, and statuses; supplied todos become `pending` in request order.
- Do not add fuzzy matching, case folding, automatic correction, merge, or replacement. `todo_transition` still requires existing targets and retains missing-target rejection.
- Keep the existing request/result formats and complete-checkpoint boundary. Creation does not introduce a new persistence format or make an execute return a Host append acknowledgement.

These are summaries of already-owned authority, not a new schema or new behavior introduced by this ADR. Detailed validation, failure ordering, queueing, preservation, and restore requirements remain in the linked Spec; they are not recast as individually spoken historical user approvals.

This identity covers only the add interface choice. Removal, reset, cleanup policy, dependency policy, and other package decisions are outside this record.

## Considered Alternatives and Rationale

| Alternative actually discussed | Benefit and cost | Historical disposition |
| --- | --- | --- |
| Extend `todo_add`: existing group means append; missing group means create | Fits the requested incremental use through one existing interface; gives up missing-name rejection as typo protection | Selected. The discussion described it as matching the user's usage and the simplest option; the user replied “第一种” (“the first option”). |
| Provide a separate task-creation interface and retain strict add lookup | Can retain detection of misspelled names during add, but adds another tool and a separate creation step | Not selected when the user chose the first option. No separate `taskcreate` tool was adopted by this decision. |

`todo_set` was the forcing limitation of the old interface, not a third formally compared alternative. There is no evidence here for invented alternatives or quantified performance advantages.

## Consequences and Compatibility

### Positive

- A caller can create or extend a group incrementally without resubmitting the complete list or recreating existing statuses through set.
- The package does not need another standalone task-creation tool for this use case.
- Existing successful appends and the complete result/checkpoint formats retain their contracts.

### Negative and Caller Impact

- This intentionally changes missing-target behavior: a valid add to a previously absent task succeeds instead of returning `not_found`. Callers can no longer use that failure as spelling protection.
- A valid typo or case difference can create an unintended distinct group. For example, `BUILD` is a new group when only `Build` exists; there is no correction or merge. This is an ongoing compatibility cost, not a temporary migration window.
- Invalid empty or untrimmed names still fail; append-or-create is not permissive text normalization. Transition remains strict. The unchanged formats do not make the missing-target behavior backward-compatible for callers relying on the old rejection.
- This backfill does not implement, reload, or certify live-loaded behavior. Historical source-verification statements remain historical evidence, not tests performed for this ADR.

## Authority and Provenance

### Existing Normative Owner

Reuse the existing [request contract (Section 2)](../works/todo-protocol-redesign/spec.md#2-exact-request-schemas), [errors and mutation boundary (Section 3)](../works/todo-protocol-redesign/spec.md#3-results-errors-queue-and-atomicity), [restore/Host boundary (Section 4)](../works/todo-protocol-redesign/spec.md#4-restore-and-accepted-host-boundary), and [accepted add amendment and compatibility (Section 10)](../works/todo-protocol-redesign/spec.md#10-accepted-todo_add-create-if-missing-amendment-source-verification-complete). No new Spec, PRD, or implementation change is needed to record this choice; no authoritative contract is rewritten here. Section 11's removal decision is not incorporated.

### Original Acceptance

Source `S` is the [original session JSONL](file:///C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4.jsonl). These locators were recovered directly from the bounded physical-line window 40278–40292; prefer entry IDs if later session processing moves lines.

| Source locator | Event time (UTC) | What it supports |
| --- | --- | --- |
| `S:L40278`, user entry `9676f6f8` | `2026-10-02T23:19:45.040Z` | User asks why adding a task yields `Todo task does not exist`. |
| `S:L40288`, assistant entry `82ef7e98` | `2026-10-02T23:20:48.038Z` | Presents append-or-create versus a separate task-creation interface with strict lookup; explains incremental-use simplicity versus spelling protection and an extra tool. |
| `S:L40291`, user entry `b994e83c` | `2026-10-02T23:21:16.624Z` | “第一种” selects append-or-create. The accompanying host-dependency instruction is separate and is not incorporated. |

The acceptance event is a user message, not an `ask` return. It establishes the interface selection, not oral approval of every later test case. The recorded date above is the date this ADR was added; it does not imply an ADR existed at the historical acceptance event.

### Audit and Implementation Evidence

The [completed historical coverage audit](file:///C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/audit-historical-adr-coverage-artifacts/result-1.json), its `result` field, H5, D6/D7, and sole P2 gap card identify a missing ADR rationale owner while the Spec and implementation already cover add. That is the later audit judgment supporting this backfill, not the original acceptance source.

Implementation locator: `git --no-optional-locks show 29535730d4e587d45ccd54f671c12bda5bfb7f08 -- packages/todo`. The commit's eight Todo paths include the add state function, registered description, Spec, README, and regression files, but no ADR. Its author and commit time are `2026-10-03T17:57:24+08:00`. The inspected add diff removes the absent-task rejection and chooses append or end-of-list creation. This proves historical implementation provenance; the commit date is neither the acceptance date nor evidence of checks rerun for this backfill.

## Reconsideration Conditions and Unknowns

The following are **current backfill suggestions**, not historical quotes, mandatory thresholds, or newly accepted behavior: reconsider this decision if callers need missing-name rejection again, if unintended valid-name groups make spelling protection a material requirement, or if an explicit task-creation lifecycle needs a separate interface. A replacement choice would need its own accepted rationale and corresponding Spec update, not silent reinterpretation of this record.

No accepted historical quantitative threshold, rollback strategy, or measured error rate was found in the supplied evidence. None is invented here; this documentation-only backfill has no runtime migration or rollback procedure to execute.

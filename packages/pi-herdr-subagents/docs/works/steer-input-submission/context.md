# Steer Input Submission Context

## Goal

Restore `subagent_steer` so a message becomes a submitted child Pi user turn instead of remaining in the Herdr pane composer.

## Authority

- [Steer input submission specification](../../spec/steer-input-submission.md)

The specification is authoritative. This Context records settled diagnostic evidence and implementation state; it does not create or replace behavioral authority.

## Established Diagnostic Evidence

- `SubagentRuntime.steer` currently resolves the task, rejects non-running tasks, then calls `transport.sendText(task.paneId, message)` in `src/index.ts`.
- `createHerdrTransport` currently maps `sendText` to `herdr pane send-text`, which inserts text without submitting it.
- Local Herdr 0.8 help establishes that `herdr pane run <PANE_ID> <COMMAND>` sends the text and Enter in one operation.
- Pi Dust's subagent Herdr backend maps its mux command submission to `pane run`.
- Therefore the defect is at the concrete transport mapping, not at the `subagent_steer` schema or running-task lifecycle guard.
- Pi 0.84.2 child sessions are append-only JSONL `FileEntry` records. The relevant entry shapes are `type: "message"` with `message.role: "user"` or `"assistant"`, and `type: "model_change"`; the acceptance procedure narrows later activity evidence to this actual allowlist rather than treating arbitrary appended records as activity.

The completed read-only diagnosis supplied these facts. Its Result is evidence only and is not authority.

## Current Implementation Surfaces

- `src/index.ts` owns `HerdrTransport`, `createHerdrTransport`, `SubagentRuntime.steer`, and the `subagent_steer` tool schema.
- `tests/runtime.test.ts` owns the fake transport, Herdr-client argument checks, steering/recovery coverage, and tool inventory coverage.
- The package documentation convention places normative contracts in `docs/spec/` and bounded delivery artifacts in `docs/works/<work-name>/`; this Work uses that existing structure without a second index.

## Accepted Boundary

- Keep the public `subagent_steer` schema, task lookup, and `running` guard.
- Change only the concrete input-submission behavior necessary to use atomic Herdr `pane run`.
- Treat Herdr command acceptance as submission success only. Do not infer child processing, Result availability, or task completion from it.
- Require actual child-session evidence for end-to-end acceptance.

## Evidence Review Disposition

- Status: independent review has confirmed that selected attempt 1 in the current retained replacement record satisfies the accepted strict Pi-native text-array predicate. Package final-gate verification remains pending.
- Scope: the replay validator enforces Pi's native single-element text-array user-entry shape and uniqueness. It does not change the supported `pane run` direction, running guard, success semantics, serial task order, or final-gate requirements.
- Replacement provenance: this record is the currently retained replacement run. It replaced an earlier record whose selected attempt was 2; that record was unintentionally overwritten, so its provenance is not retained. Statements about every attempt apply only to the attempts preserved in the current replacement record, not to superseded records.
- Replay boundary: record-only replay certifies the retained sentinel encodings, raw appended-entry parsing, strict unique Pi-native user entry, allowlisted later activity, and reconstructed ordering. It does not independently certify attempt identity, fresh-child provenance, prompt hash or revision, readiness status, deadline, or individual cancel/remove fields. Those metadata remain reviewer-inspected evidence and residual hardening scope, not replay-certified facts.

1. **Finding 1, controlled-child provenance and attempts:** the current retained replacement record contains attempt 1 with fresh `subagent_spawn` provenance, Agent/label/identity, prompt fixture hash/revision, readiness/deadline/outcome, and cleanup. The historical selected attempt 2 was overwritten and is disclosed as unretained; the current record does not claim to preserve it.
2. **Exact-message coverage:** the record-only validator accepts only `message.content: [{ type: "text", text: <exact sentinel> }]`; it rejects a string, extra or missing items, non-text content, normalization, and duplicate exact matches.
3. **Rejected transport regression:** remains bounded by the existing Task 2 rejection and terminal-guard evidence.
4. **Finding 4, marker meaning and post-cleanup replay:** the retained record and its comparison command establish that the marker is the baseline final entry, and replay reconstructs marker, unique strict user, and later-activity indices without the deleted session path. This is a record-only result and has the metadata boundary stated above.

The strict record-only replay passes the retained fresh evidence. If a future run produces a non-array content shape or duplicate exact user records, mark it invalid and resample rather than normalizing it.

## Real Acceptance Preconditions

The implementation and real acceptance run require a locally usable Herdr 0.8 installation, an authenticated child-capable Pi environment, and read access to the child task's session file.

The acceptance run must use a controlled child, not an arbitrarily discovered running task. The all-attempt retention requirements below apply within one currently retained controlled acceptance or replacement run; they do not require a superseded record to remain archived:

1. For each attempt, create a fresh, named controlled child through `subagent_spawn`; never reuse a previously attempted or incidentally running child. The recorded child provenance must name `subagent_spawn` as the creation method and include the Agent name, label, `subagentId`, generation, and session path.
2. Use a named prompt fixture that keeps the child awaiting one follow-up steer message and withholds its Handler Result until that message arrives. Record the fixture name, actual prompt text, content SHA-256, and immutable revision: a source-control object ID when it is a checked-in fixture, otherwise a content-addressed fixture revision derived from that SHA-256.
3. Poll that child's `subagent_inspect` snapshot once per second for at most 120 seconds. It is ready only when the recorded `subagentId` and `generation` match the spawned task, its status is `running`, its session path is readable, and its JSONL has a valid `session` header followed by a complete newline-delimited baseline.
4. At readiness, record `preSteer.entryIndex` as the absolute zero-based parsed-entry index, including the `session` header at index zero, of the baseline's final existing complete JSONL entry. Record `preSteer.byteOffset` as the UTF-8 byte offset immediately after that same entry's terminating newline. This pair is the pre-steer marker; it is not the index of a new appended entry.
5. If the child becomes terminal, the session is unreadable or malformed, or the deadline expires, cancel it when still running and remove it. Record that attempt's ready status, deadline, outcome, and cleanup result. Retry only with another freshly created controlled child, at most three attempts. A third failed preflight blocks real acceptance; it must not fall back to an incidental child.
6. After evidence collection, cancel a still-running controlled child and remove it. Preserve the Work evidence record before removal. Record cleanup failure as a failed acceptance run rather than silently retaining a task.

## Persistent Acceptance Evidence

Task 3 must create and retain `docs/works/steer-input-submission/evidence/real-herdr-acceptance.json`. It is review evidence, not behavioral authority. Its attempt accounting describes the currently retained controlled acceptance or replacement run, not historical superseded records. It must contain at least:

```json
{
  "evidenceSchemaVersion": 2,
  "reviewDisposition": "accepted-ready",
  "herdrVersion": "0.8.x",
  "selectedAttempt": 1,
  "attempts": [
    {
      "attempt": 1,
      "child": {
        "provenance": "fresh_subagent_spawn",
        "agentName": "handler",
        "label": "steer-acceptance-...",
        "subagentId": "subagent-...",
        "generation": 1,
        "sessionPath": ".../subagent-...-g1.jsonl"
      },
      "promptFixture": {
        "name": "steer-await-follow-up-v1",
        "actualPrompt": "...",
        "sha256": "...",
        "revision": "..."
      },
      "ready": {
        "status": "ready",
        "deadlineAt": "...",
        "observedAt": "...",
        "preSteer": { "entryIndex": 0, "byteOffset": 0 }
      },
      "message": { "jsonString": "...", "utf8Base64": "..." },
      "outcome": { "status": "accepted", "observedAt": "..." },
      "userEntryIndex": 0,
      "activityEntryIndex": 0,
      "appendedJsonlRawEntries": ["{...}"],
      "cleanup": { "cancel": "succeeded", "remove": "succeeded", "outcome": "succeeded" }
    }
  ],
  "extractionCommand": "...",
  "comparisonCommand": "..."
}
```

Every started attempt in the currently retained record must have one entry, including a child that never becomes ready. Its `ready.status` is one of `ready`, `terminal`, `unreadable`, `malformed`, or `deadline`; its `outcome.status` records the resulting `preflight_failed`, `steer_rejected`, `exact_delivery_failed`, `activity_timeout`, `accepted`, or `cleanup_failed` outcome; and its `cleanup` records the cancel and remove results. `selectedAttempt` is the one-based attempt number that supplied the accepted evidence, or `null` when no attempt was accepted. It must refer to an attempt with `ready.status: "ready"`, `outcome.status: "accepted"`, and successful cleanup.

`message.jsonString` is the JSON string representation of the submitted sentinel and `utf8Base64` is its UTF-8 representation; both must decode to the same expected string. `appendedJsonlRawEntries` contains every physical JSONL record appended after `preSteer.byteOffset`, unredacted and in order. The absolute index of `appendedJsonlRawEntries[0]` is `preSteer.entryIndex + 1`. `userEntryIndex` is the absolute index of the unique appended `message`/`user` record whose `message.content` is exactly one `{ type: "text", text: <exact sentinel> }` item. `activityEntryIndex` is the absolute index of the earliest allowlisted activity record after that user record. The selected attempt must satisfy `preSteer.entryIndex < userEntryIndex < activityEntryIndex`.

`extractionCommand` runs before cleanup and may read the recorded session path to parse the baseline and capture every raw appended record. `comparisonCommand` must be executable from the repository checkout after cleanup with the evidence-record path as its only runtime input. It must not open or depend on the deleted `sessionPath`; it parses the retained raw records as JSON, validates both sentinel encodings, reconstructs absolute indices from `preSteer.entryIndex`, and reproduces the marker, strict unique Pi-native user-content, and later-activity assertions. It does not certify provenance, prompt fixture metadata, readiness or deadline metadata, or individual cancel/remove fields. `accepted-ready` means this record-only replay passes; those metadata remain reviewer-inspected and residual hardening scope.

## Completion Signal

The transport and runtime regressions pass, a real Herdr run records the required ordered child-session evidence in the persistent record, a fresh correctness review finds no unresolved issue, and the package typecheck and full test suite pass.

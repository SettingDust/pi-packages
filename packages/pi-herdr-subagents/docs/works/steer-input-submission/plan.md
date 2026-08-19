# Steer Input Submission Plan

- Status: independent review complete; current replacement provenance disclosure and package final-gate verification remain pending
- Authority: [Steer input submission specification](../../spec/steer-input-submission.md)
- Context: [Work Context](context.md)

## Objective

Make `subagent_steer` atomically submit its exact message through Herdr so a running child Pi can receive a new user turn, while retaining the existing tool and lifecycle contract.

## Scope

- Remap the concrete Herdr text-submission operation from `pane send-text` to `pane run`.
- Add focused transport, rejected-transport, and runtime-guard regressions.
- Perform one repeatable real Herdr-to-child-session acceptance run with persistent machine-reviewable evidence.
- Obtain a fresh correctness review and run final package and documentation checks.

## Non-Goals

Do not change the `subagent_steer` schema, add a delivery or processing receipt, wait for a Result, alter task status or generation semantics, add retries or polling to production behavior, introduce a new tool or dependency, or modify unrelated runtime behavior.

## Preconditions

1. Read the Specification and Work Context before code changes.
2. Keep a real local Herdr 0.8 environment and an authenticated child-capable Pi environment available for the acceptance run.
3. Use the controlled-child preflight in the Work Context. Do not use a coincidentally running child.
4. Before cleanup, retain the evidence record at `docs/works/steer-input-submission/evidence/real-herdr-acceptance.json`, including every attempt in the current retained replacement run with its provenance, actual prompt fixture and revision, ready/deadline/outcome/cleanup result, and selected-attempt disposition. The selected record must replay exactly one Pi-native user content array containing one text item with the exact sentinel.
5. The post-cleanup comparison command must replay from that record alone. Its only runtime input is the record path; the retained `sessionPath` is provenance, not replay input.

## Implementation Strategy

### 1. Transport Submission Mapping And Exact-Payload Corpus

Keep the existing narrow transport boundary. Change only the concrete `createHerdrTransport` mapping used by `sendText` so it invokes `herdr pane run <paneId> <message>` with the message as one direct command payload. Do not route this user message through the PowerShell command-launch quoting path, because that path is for launching child processes rather than preserving a Pi composer submission.

Add focused Herdr-client regressions using these five exact messages, each as its own steering submission:

1. One multiline message containing the two physical lines below:

   ```text
   line one
   line two
   ```

2. `CJK: 中文; emoji: 😀`
3. `quotes: 'single' and "double"`
4. `path: C:\work\child\input`
5. The following single-line text:

   ```text
   metacharacters: ; & | < > $() ` * ? ! % ^
   ```

For every corpus item, assert one and only one captured Herdr argv payload exactly equal to `['pane', 'run', paneId, message]`. Assert that no `pane send-text` operation occurs on any corpus path. The test must use actual newline, CJK, emoji, quote, and backslash characters in the asserted message values; a shell-escaped surrogate is not coverage of the payload boundary.

### 2. Runtime Guard And Failure Regression

Retain `SubagentRuntime.steer` task lookup and `running` guard. Add focused runtime coverage showing that a running task forwards its unchanged message once and returns the existing running snapshot without lifecycle mutation. Cover unknown and terminal task requests so neither reaches the transport. Parameterize terminal coverage over `completed`, `failed`, and `cancelled`.

Use a transport that rejects the steer request. Assert that it is called once, the same failure rejects the call, and before/after `subagent_inspect` snapshots have unchanged `status`, `generation`, `result`, and `error`. The rejection must produce no completion notification. Preserve the existing tool name and `{ subagentId, message }` schema, including `message` minimum length.

No production runtime change is expected in this phase unless the regression exposes drift outside the adapter mapping.

### 3. Controlled Real Herdr Acceptance

After focused coverage passes, run the controlled-child preflight defined in the Work Context. It has a fixed one-second polling cadence, a 120-second per-attempt deadline, at most three fresh attempts, explicit ready conditions, and mandatory cleanup. A terminal, unreadable, malformed, or timed-out controlled child is failed and cleaned up; it is never replaced by an arbitrary child.

For every attempt in the current retained replacement run, record fresh `subagent_spawn` child provenance with its Agent name, label, `subagentId`, generation, and session path. Record the named actual waiting prompt fixture, its exact text, SHA-256, and immutable revision. Record the deadline, ready condition or failure, delivery/activity outcome, and cancel/remove cleanup result even when no child becomes ready. The record's `selectedAttempt` is the one-based successful attempt, or `null`; it cannot point to a failed, unready, or uncleared attempt. A superseded record need not be retained; the current evidence must disclose that scope when replacement occurred.

For the selected ready child, capture the pre-steer marker before invoking the real `subagent_steer` path. `preSteer.entryIndex` is the absolute zero-based index, including the session header, of the baseline's final existing JSONL entry. `preSteer.byteOffset` is immediately after that entry's terminating newline. The submitted sentinel must be unique to the run and contain all of multiline text, Unicode, and both quote styles, for example:

```text
STEER-ACCEPTANCE-<UUID>
中文 😀
quotes: 'single' and "double"
```

Parse only raw JSONL entries appended after the marker. The first retained raw entry reconstructs to absolute index `preSteer.entryIndex + 1`. Identify a new user entry only when `type === 'message'`, `message.role === 'user'`, and `message.content` is an array containing exactly one object `{ type: 'text', text: sentinel }`; require exactly one matching appended entry. Do not accept string content or normalize line endings, Unicode, or quotes. The later activity allowlist is fixed to actual Pi session shapes: either `type === 'message' && message.role === 'assistant'` or `type === 'model_change'` with string `provider` and `modelId`. Do not count `thinking_level_change`, `compaction`, `custom`, `custom_message`, `label`, `session_info`, or an unrelated user message as activity.

The persistent record must capture the raw appended JSONL entries and demonstrate `preSteer.entryIndex < userEntryIndex < activityEntryIndex`, where the latter two are absolute parsed-entry indices. Execute its extraction command before cleanup; it may read the live session to build the record. After cleanup, execute its comparison command with the record path as its only runtime input. That command must not read `sessionPath`; it must parse the retained raw entries, validate both sentinel encodings, reconstruct absolute indices, and reproduce all marker, strict-user, and allowlisted-activity assertions. Composer contents, a Herdr CLI exit code, or earlier activity do not satisfy this phase. If this preflight-controlled comparison shows terminal canonicalization, stop: revise the Specification before changing implementation or declaring acceptance. Normalization is not exact delivery.

### 4. Independent Review And Final Gate

Independent review confirmed that selected attempt 1 in the current retained replacement record satisfies the strict Pi-native text-array and unique-match predicate. It also found that an earlier record with selected attempt 2 was unintentionally overwritten. The current record must disclose that the prior provenance is unretained and that every-attempt statements apply only to the retained replacement run; no specification requires preserving superseded records.

Record-only replay certifies the sentinel encodings, retained raw entries, strict unique user record, allowlisted later activity, and reconstructed marker/order. It does not certify attempt identity, fresh provenance, prompt hash or revision, readiness, deadline, or individual cancel/remove fields. Treat those fields as reviewer-inspected metadata and residual hardening scope, not as replay-fixed gaps. The review retains the existing exact-message corpus and rejected transport/no-notification conclusions. Repeat focused or real acceptance checks only if a correction changes transport or steering behavior.

Run the package typecheck, full test suite, Work-document reference/evidence-record check, strict record-only replay, and whitespace diff check. Do not commit as part of this work. The current documentation correction requires the Work-document check, strict replay, and whitespace diff check; package gates remain final-gate work.

## Dependency Order

The work is strictly serial:

`transport regression -> runtime guard regression -> controlled real Herdr acceptance -> independent review and final gate`

The tasks share `src/index.ts`, `tests/runtime.test.ts`, and the same behavioral evidence chain. No task is parallel-safe.

## Risks And Mitigations

- **Shell transformation of the message:** test the direct Herdr argv vector with a multiline, Unicode, quote, backslash, and metacharacter corpus.
- **False live acceptance from an incidental or terminal child:** create only a controlled child, require the fixed readiness marker, and clean it up on every path.
- **False equality or shape relaxation:** require exactly one Pi-native text item, strict equality, and exactly one matching user record; reject strings, additional items, or duplicate matches without normalization.
- **False activity evidence:** accept only a post-user `message`/`assistant` or valid `model_change` entry and preserve every raw post-marker JSONL entry.
- **Accidental lifecycle expansion:** preserve the existing runtime guard and test rejection leaves snapshot and notification state unchanged.
- **Review blind spot:** require a fresh reviewer to disposition each prior finding against the durable record.

## Final Gate

Completion requires all Specification acceptance criteria, a complete persistent evidence record, a passing strict record-only replay, the independent-review provenance disclosure and replay boundary recorded, `bun run --cwd packages/pi-herdr-subagents typecheck`, `bun run --cwd packages/pi-herdr-subagents test`, the Work-document reference/evidence-record check, and `git diff --check -- packages/pi-herdr-subagents` to pass. No commit is part of the gate.

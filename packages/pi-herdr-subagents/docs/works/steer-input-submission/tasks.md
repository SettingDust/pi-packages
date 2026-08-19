# Steer Input Submission Tasks

- Plan: [Steer input submission Plan](plan.md)
- Authority: [Steer input submission specification](../../spec/steer-input-submission.md)
- Context: [Work Context](context.md)

## Task 1: Remap And Test Atomic Transport Submission

- Status: completed; existing focused transport evidence remains valid.
- Dependency: none
- Objective: change the concrete Herdr transport so steering uses one `pane run` submission with the exact message payload.
- Context: Specification sections 3 and 6; Plan section 1.
- Constraints: retain the existing `HerdrTransport` boundary; do not add shell wrapping, a second Enter operation, retries, tools, or dependencies.
- Expected touched surfaces: `src/index.ts`, `tests/runtime.test.ts`.
- Completion evidence: a focused client-backed transport test covers the five-message corpus in Plan section 1: one actual two-line message, `CJK: 中文; emoji: 😀`, both single and double quotes, `C:\work\child\input`, and the shell-metacharacter value. For each item it captures exactly one argv vector equal to `['pane', 'run', paneId, message]` and proves the steering path has no `pane send-text` invocation.

## Task 2: Preserve Runtime Guard, Tool Contract, And Rejection Semantics

- Status: completed; existing runtime guard, rejection, lifecycle, and schema evidence remains valid.
- Dependency: Task 1
- Objective: add regression coverage for the current `SubagentRuntime.steer` eligibility guard, rejection behavior, and unchanged public schema.
- Context: Specification sections 2, 4, 5, and 6; Plan section 2.
- Constraints: a running task forwards the unchanged message once and remains running; unknown or terminal tasks must fail before transport submission; do not add a Result, completion notification, status change, generation change, processing receipt, or synchronous wait.
- Expected touched surfaces: `tests/runtime.test.ts`; `src/index.ts` only if the regression identifies actual guard drift.
- Completion evidence:
  - focused tests prove the running path forwards once and preserves the running snapshot;
  - a rejecting fake transport rejects the steer call with its failure and is called exactly once;
  - snapshots immediately before and after that rejection have identical `status`, `generation`, `result`, and `error`, and the completion-notification spy receives no notification;
  - unknown-task coverage produces no transport call;
  - parameterized terminal coverage for `completed`, `failed`, and `cancelled` produces no transport call; and
  - the public `subagent_steer` name plus `{ subagentId, message minLength: 1 }` schema remain unchanged.

## Task 3: Run Controlled Real Herdr Child-Session Acceptance

- Status: completed; current retained replacement evidence passes strict record-only replay with selected attempt 1. It replaces an unintentionally overwritten prior record whose selected attempt was 2 and whose provenance is not retained.
- Dependency: Task 2
- Objective: reproducibly establish that real Herdr transport creates a submitted child Pi user turn and leads to later allowlisted child activity.
- Context: Specification section 6; Work Context Real Acceptance Preconditions and Persistent Acceptance Evidence; Plan section 3.
- Constraints:
  - create a fresh named controlled child through `subagent_spawn` for every attempt; never select or reuse an arbitrary or previously attempted running task;
  - for every attempt in the current retained replacement run, persist `subagent_spawn` provenance, Agent name, label, `subagentId`, generation, session path, actual named waiting prompt fixture, its exact text, SHA-256, and immutable revision;
  - poll `subagent_inspect` every second for no more than 120 seconds per attempt and permit at most three fresh attempts;
  - record every attempt's deadline, ready status (`ready`, `terminal`, `unreadable`, `malformed`, or `deadline`), outcome, and cancel/remove cleanup result, including attempts that never become ready; select exactly one accepted attempt by one-based number or record `selectedAttempt: null`;
  - require matching `subagentId`/generation, `running` status, readable valid JSONL, and a complete-line pre-steer marker before steering; `preSteer.entryIndex` is the absolute zero-based index, including the session header, of the baseline's final existing entry, and `preSteer.byteOffset` is immediately after that entry's newline;
  - clean up every rejected preflight attempt and the successful controlled child, recording cleanup failure as failed acceptance;
  - submit a unique sentinel containing actual multiline text, Unicode, and both quote styles, such as `STEER-ACCEPTANCE-<UUID>\n中文 😀\nquotes: 'single' and "double"`;
  - parse JSONL after the marker and require exactly one strict match between that sentinel and a new `type: 'message'`, `message.role: 'user'`, `message.content: [{ type: 'text', text: sentinel }]`; reject string content, an array with zero or multiple items, non-text items, duplicate matches, and any normalization;
  - count later activity only as `type: 'message'` with `message.role: 'assistant'`, or `type: 'model_change'` with string `provider` and `modelId`; and
  - before cleanup, run the recorded extraction command against the live session to retain raw appended records; after cleanup, run the recorded comparison command with the evidence-record path as its only runtime input. It must not read the deleted session path and must replay marker, user, and activity checks from the record alone.
- Expected touched surfaces: `docs/works/steer-input-submission/evidence/real-herdr-acceptance.json`; no source surface unless Tasks 1 or 2 reveal a bounded defect.
- Completion evidence: the persistent record has `evidenceSchemaVersion: 2` and `reviewDisposition: "accepted-ready"`;

## Task 4: Independent Review And Final Gate

- Status: independent review complete; package final-gate verification remains pending.
- Dependency: Task 3
- Objective: independently check the final implementation and persistent evidence against the Specification, then verify the package and documents.
- Context: entire Specification, Plan section 4, Task 3 record, and the evidence-review disposition in Work Context.
- Constraints: the review assessed the current diff and retained acceptance record without assuming the implementation approach is correct. It confirms strict record-only delivery for selected attempt 1, discloses the unretained prior selected attempt 2, and distinguishes replay-certified fields from reviewer-inspected metadata. Preserve the bounded scope and do not commit.
- Expected touched surfaces: none except corrections required by review findings.
- Completion evidence:
  - independent review confirms selected attempt 1's strict Pi-native text-array evidence, discloses that the prior selected attempt 2 was unintentionally overwritten and is unretained, and scopes every-attempt statements to the current retained replacement run;
  - record-only replay is explicitly limited to sentinel encodings, retained raw entries, strict unique user content, allowlisted later activity, and reconstructed marker/order; attempt identity, fresh provenance, prompt hash or revision, readiness/deadline, and individual cancel/remove fields remain reviewer-inspected metadata and residual hardening scope;
  - fresh review also finds no unresolved correctness, regression, or evidence gap in the existing exact-message corpus and rejected transport/no-notification checks;
  - any correction repeats the affected prior task and the real Herdr acceptance when transport or steering behavior changed;
  - the retained evidence's strict record-only replay passes and rejects string content, additional content items, non-text items, and duplicate exact matches;
  - Work-document links, required cross-references, and the persistent evidence-record path are checked;
  - `bun run --cwd packages/pi-herdr-subagents typecheck` passes;
  - `bun run --cwd packages/pi-herdr-subagents test` passes; and
  - `git diff --check -- packages/pi-herdr-subagents` passes.

## Execution Order

`Task 1 -> Task 2 -> Task 3 -> Task 4`

No task is parallel-safe. Task 4 may return work to an earlier task only to resolve a concrete finding; it then repeats every dependent verification before closing.

# Spec: Todo Multi-Tool Protocol

- Status: **Accepted T0-T8 normative authority; T10 complete with technical validation and both fresh final reviews GO (P0-P3=0); 34-path commit candidate reviewed and pending explicit user submission authorization.**
- Owner: `packages/todo`
- Related Work: [work.md](work.md)
- Related Context: [context.md](context.md)

## 1. Boundary and Model

Exactly four provider-visible tools exist: `todo_set`, `todo_add`, `todo_transition`, and `todo_view`. One coordinator owns validation, committed state, invocation-order serialization, projections, and results. The canonical snapshot is exactly `{tasks,workingOn?}`; `workingOn` is derived and omitted when absent. A task group is exactly `{name,todos}`. A todo is exactly `{name,description,status}`. All objects use `additionalProperties:false`.

Names and descriptions must be trimmed non-empty strings. Matching is exact and case-sensitive. Task names are globally unique and todo names are unique within a task. Status is exactly one of `pending`, `in_progress`, `completed`, `cancelled`. New todos are always `pending`. `workingOn` is the description of the first `in_progress` todo scanning tasks then todos in array order. The active group is the containing group of that todo, otherwise absent. Neither is independently selected.

## 2. Exact Request Schemas

JSON Schema draft 2020-12 applies. These are the complete request contracts; every listed object has `additionalProperties:false` and every omitted property is rejected. `minItems` is normative.

```json
{"type":"object","additionalProperties":false,"required":["tasks"],"properties":{"tasks":{"type":"array","minItems":0,"items":{"type":"object","additionalProperties":false,"required":["name","todos"],"properties":{"name":{"type":"string"},"todos":{"type":"array","minItems":0,"items":{"type":"object","additionalProperties":false,"required":["name","description"],"properties":{"name":{"type":"string"},"description":{"type":"string"}}}}}}}}}
```

`todo_set` accepts only `{tasks}`. It replaces the complete state; each creation item is exactly `{name,description}` and produces status `pending`. It does not accept `status` or `initialTransitions`.

```json
{"type":"object","additionalProperties":false,"required":["task","todos"],"properties":{"task":{"type":"string"},"todos":{"type":"array","minItems":1,"items":{"type":"object","additionalProperties":false,"required":["name","description"],"properties":{"name":{"type":"string"},"description":{"type":"string"}}}}}}
```

`todo_add` accepts only `{task,todos}`. `task` is the exact, case-sensitive name of an existing group. Each new todo is pending.

```json
{"type":"object","additionalProperties":false,"required":["transitions"],"properties":{"transitions":{"type":"array","minItems":1,"items":{"type":"object","additionalProperties":false,"required":["task","todo","status"],"properties":{"task":{"type":"string"},"todo":{"type":"string"},"status":{"type":"string","enum":["pending","in_progress","completed","cancelled"]}}}},"workingOn":{"type":"string"}}}
```

`todo_transition` accepts only `{transitions,workingOn?}`. Every transition item is exactly `{task,todo,status}`. Duplicate transition targets are rejected. A supplied `workingOn` must equal the candidate's derived value exactly, and is absent when no in-progress todo exists.

```json
{"type":"object","additionalProperties":false,"required":[],"properties":{}}
```

`todo_view` accepts only `{}` and never mutates or writes persistence. Schema-expressible constraints include object keys, required fields, types, enum, array minima/items, and additional properties. Runtime invariants include trimmed non-empty values, uniqueness, exact existing-name lookup, duplicate transition targets, atomicity, queue ordering, derived active group/`workingOn`, and restore classification.

## 3. Results, Errors, Queue, and Atomicity

Success is exactly `{result,snapshot}`, with result `set`, `add`, `transition`, or `view`. Failure is exactly `{result:"error",error:{code,message}}`; error messages must not expose payload values. Invalid request, duplicate names, missing task/todo, duplicate transition target, and invalid `workingOn` are rejected according to the documented precedence and transition/source order.

The coordinator serializes mutations in invocation order, validates current state, builds a complete candidate, checks runtime invariants, atomically replaces committed state, updates widget/reminder/formatter projections, then returns. A failed mutation changes neither state nor projections. No package-owned persistence operation occurs before or after publication.

## 4. Restore Checkpoints and Host Evidence

Only a successful complete canonical Todo `toolResult` already present in the current session branch is a branch-local restore checkpoint. `execute` return is not append or persistence acknowledgement. No fsync, power-loss, cross-branch, or future-version durability is promised. Restore scans current branch records, newest completion sequence first, then nearest ancestors; ties use physical position. Invalid, incomplete, failed, wrong-tool, wrong-version, and malformed records are skipped with one non-payload diagnostic per candidate; no valid record yields `{tasks:[]}`.

Host checkpoint evidence is pinned only to the directly inspected `@earendil-works/pi-coding-agent` 0.84.2 files. The reproducible inspected Host package root is `E:/Projects/pi-packages/node_modules/@earendil-works/pi-coding-agent`. Raw-byte SHA-256 evidence: `dist/core/agent-session.js` is `9f065b4a277857db100e3277c4d18316c89cd46b11f6ba8140122f19efbe47c4`; `dist/core/session-manager.js` is `af809d47818a3bf6a10173c167905e013ad7303261919a5a35a8466b801daf2e`. Exact Host symbols are `AgentSession`, `_handleAgentEvent`, `appendMessage`, and `getBranch`: directly verified behavior records a successful complete `toolResult` through `SessionManager.appendMessage` on `message_end`, and the record is observable through `SessionManager.getBranch`. The inspected 0.84.2 `ReadonlySessionManager` has no `append`, `flush`, or `ack` seam. This evidence establishes the Host branch boundary only; it does not require, infer, or claim any pi-agent-core loaded-byte, runtime-loaded-core-module, or core raw-hash identity, nor future-version behavior.

## 5. Legacy Restore

Legacy parsing occurs only after canonical discrimination fails and the root is unambiguously legacy. Strict root shape is `{phases,workingOn?}` with required `phases`; phase shape is exactly `{name,tasks}`; task shape is exactly `{name,description,status}`. `status` is required, uses the same enum, and is never optional. Every object rejects unknown keys, including `legacyIdentifier`. Names/descriptions are trimmed non-empty; phase names are globally unique and task names unique within each phase. Derived `workingOn` follows phase/task order; supplied value must match and is absent with no active task. Phase maps to task group and task maps to todo, preserving order. Legacy is restore-only and maps no identifier.

## 6. Consumers and Acceptance

Formatter, widget, tool frame, reminder, and compaction read only the coordinator snapshot, render required fields and empty/error states, and do not maintain a second model or mutate state. Acceptance requires the strict schemas, runtime invariants, queue/atomicity, Host checkpoint semantics, legacy mapping/rejection, and consumer behavior. Excluded: IDs, rename/edit/delete, current-call legacy compatibility, package persistence infrastructure, filters, pagination, and provider variants.

### T5 Ownership Amendment and Completion Evidence

The existing T5 ownership of `packages/todo/src/visibility.ts`, `packages/todo/src/widget-layout.ts`, and `packages/todo/test/helpers.ts` is retained. The final amendment accepts the existing `packages/todo/test/visibility.test.ts` entry as implementation/T5. Its T5 verification responsibility is the four canonical results, all visibility modes, and unknown/missing-action hiding.

The final T5 ownership amendment is accepted by renewed T9 after a GO decision review. T5 completed without changing the `todo_set`/`todo_add`/`todo_transition`/`todo_view` protocol, strict schema, state semantics, Host checkpoint, legacy restore-only boundary, task graph, or frozen inventory. `evidence/t0-manifest.json` records raw-byte `postTaskSha256` values for all 14 T5 entries: 13 differ from baseline and the existing `packages/todo/test/visibility.test.ts` entry is unchanged.

The exact previously reviewed tuple received a fresh same-byte independent review with GO and P0-P3 all zero before the current user explicitly selected "Confirm Todo multi-tool implementation" in the ask_response. The review is not the user confirmation. That prior T9 confirmation authorized the bounded implementation sequence in Plan section 3 without changing this protocol; the prior baseline hashes and confirmation provenance are recorded in Context section 6 and Tasks section 3. T0 is reconciled; T1 completed with 7/7 focused tests, T3 completed with 7/7 focused tests, T2 completed with 20/20 focused tests, and T5 independently passed focused 6 files/31 tests, full 12 files/69 tests, typecheck, diff-check, four-tool registration smoke, and legacy scan. The four existing ownership-amendment paths are `packages/todo/src/visibility.ts`, `packages/todo/src/widget-layout.ts`, `packages/todo/test/helpers.ts`, and `packages/todo/test/visibility.test.ts`; the complete T5 boundary comprises 14 paths, of which 13 changed and the existing visibility regression test is unchanged. T4, T6, T7, and T8 are complete based on the evidence below. This lifecycle evidence changes no protocol, schema, state semantics, restore boundary, task dependency, or path inventory.

### T4 Completion Evidence

T4 independently revalidated the completed producer behavior after the bounded consumer-wiring repair. Direct 7/7 checks, focused 31/31 checks, full 12 files/69 tests, typecheck, four-tool/8-hook/render smoke, publication ordering, queue and atomicity, projections, checkpoint semantics, and the 41-path boundary/status check passed. Exactly two completed-owner raw-byte hash drifts were expected and reconciled: `packages/todo/src/tool.ts` is `67ab66399e257ceb92abc818dc59d78c89571c9ebad121f25c2af6ae91802316` and `packages/todo/test/index.test.ts` is `e08d891569f11a2926875fa836d7839bf0601934b3c1bb6eb095bf227bb9d4df`; `packages/todo/src/index.ts` remains `4014f43f2fd59734981afaa0d4643de197a7b423552da95dfd095bc535a0e326`. The reconciliation makes T4 durably complete without changing this protocol or its acceptance conditions. T6, T7, and T8 are complete.

### T6 Full Validation Evidence

Fresh read-only T6 validation confirmed all five authority hashes against current raw bytes; the frozen manifest contains 41 entries and 24 post-task hashes with zero mismatches, and its aggregate SHA-256 is `58ded69287e2a2d45a21d1d107c8ae68773589c4f30df3fe6853ce1ad2fcd4a9`. From `packages/todo`, `bun run typecheck` passed and `bun run test` passed with 12 test files and 69 tests. No protocol, schema, state semantics, restore boundary, acceptance condition, path inventory, or implementation scope changed. T7 and T8 subsequently completed on the evidence recorded above and below.

## 7. T10 Accepted Correctness-Repair Amendment

T10 is accepted for the current five-document tuple and its implementation is complete. Technical validation is GO; fresh independent post-implementation review and commit remain pending.

Restore resets terminal-widget lifecycle for the same UI before projecting a restored snapshot. The reset cancels a pending stale terminal-clear timer and removes that UI's stale terminal lifecycle entry. It runs on every path that reaches the shared restore projection, including `session_start` and `session_tree`, and does not change terminal-summary rendering or its five-second lifetime after a normal mutation.

A `toolResult` is a successful restore checkpoint only when its `isError` field has type boolean and value `false`. A value of `true`, a missing field, or any non-boolean value is an invalid candidate: restore emits the existing non-payload skip diagnostic and continues its defined scan. Such a candidate cannot replace, mask, or prevent recovery from an older valid checkpoint.

T10 is limited to the existing implementation and regression paths `src/widget.ts`, `src/tool.ts`, `src/persistence.ts`, `test/index.test.ts`, and `test/persistence.test.ts`. The canonical T10 technical-validation evidence records the five current raw-byte hashes, historical T2/T3/T5 owner/hash provenance, unchanged 41-entry inventory, recomputed aggregate and manifest identities, and verification results. No schema, canonical state model, `workingOn`, legacy boundary, Host checkpoint source, sidecar/database persistence, Pi-core surface, dependency, setting, public document, or other path changed.

T10 preserves `implementation` classification and original owner for every entry. The five current `postTaskSha256` values are reconciled from current raw bytes; the aggregate is recomputed from the unchanged ordered entries. Focused 16/49, full 71/193, typecheck, entry import, diff-check, runtime replay, persistence replay, and real Host activation/execute smoke passed. Fresh correctness review is GO with P0-P3=0, and fresh evidence/selective-boundary review is GO with P0-P3=0. The reviewed local commit candidate contains 34 Todo paths, has no staged paths, and is pending explicit user submission authorization; no commit has been made.

# T10 Technical Validation Evidence: Todo Protocol Redesign

- Status: **Technical validation and fresh final reviews complete; GO (correctness P0-P3=0; evidence/selective-boundary P0-P3=0). Reviewed 34-path commit candidate pending explicit user submission authorization; no commit made.**
- Task: T10 correctness-repair amendment
- Work: [../work.md](../work.md)
- Context: [../context.md](../context.md)
- Spec: [../spec.md](../spec.md)
- Plan: [../plan.md](../plan.md)
- Tasks: [../tasks.md](../tasks.md)
- Manifest: [t0-manifest.json](t0-manifest.json)
- Independent validation Result: `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/validate-todo-t10-artifacts/result-1.json`
- Validation date: 2026-08-16

## Decision and Lifecycle

T10 was explicitly accepted for the current five-document tuple and implemented within its bounded five-path scope. Independent technical validation returned GO: both T10 invariants passed direct replay. Fresh correctness review returned GO with P0-P3 findings all zero, and fresh evidence/selective-boundary review returned GO with P0-P3 findings all zero. The current local commit candidate contains 34 Todo paths, has no staged paths, and is reviewed and pending explicit user submission authorization. This record does not authorize staging, commit, push, reload, deploy, or any further source change.

## T10 Invariants

1. Restore clears the current UI's stale terminal-widget lifecycle before projecting restored state. It cancels a stale terminal-clear timer and removes the stale lifecycle entry. The shared restore boundary covers `session_start` and `session_tree`; normal mutation terminal summaries retain their five-second behavior.
2. A restore checkpoint is eligible only when `toolResult.isError` is a boolean strictly equal to `false`. `true`, missing, string, number, object, array, and null candidates produce the existing non-payload skip diagnostic and scanning continues to an older valid checkpoint.

## Verification

- Focused `bun test test/index.test.ts test/persistence.test.ts`: **16 passed, 0 failed**, 49 assertions.
- Full package `bun test`: **71 passed, 0 failed**, 12 files, 193 assertions.
- `bun run typecheck`: passed.
- Entry import `bun -e "await import('./src/index.ts')"`: passed.
- `git diff --check`: passed with no whitespace errors; Windows LF/CRLF conversion warnings were reported.
- Runtime replay passed: the same UI first entered open-state and normal terminal state, the normal terminal state cleared after about 5.25 seconds, and a subsequent `session_tree` restore of a terminal-only checkpoint projected `undefined` immediately without starting the stale five-second timer.
- Persistence replay passed: `false` was accepted; `true`, missing, string, number, object, array, and null candidates were skipped with the existing safe notification and an older valid checkpoint was recovered.
- Real Host activation/execute smoke passed using the installed `@earendil-works/pi-coding-agent` Host path: no loader errors, successful `todo_set`, `todo_add`, `todo_transition`, and `todo_view` execution, and successful dispatch of all eight lifecycle handlers: `session_start`, `session_tree`, `session_compact`, `before_agent_start`, `agent_start`, `agent_settled`, `turn_end`, and `context`.
- One initial Host restore probe stopped on an incorrect test assertion that expected the first open-state widget content to be `undefined`; the actual component factory was correct. The assertion was corrected and the probe passed on rerun. This was not an implementation or Host runner failure.

## Exact Boundary and Hash Provenance

T10 changed and reconciled exactly these five existing implementation entries. Classification remains `implementation`, and original owner history remains attached to each entry:

| Path | Original owner | Pre-T10 postTaskSha256 | Current T10 postTaskSha256 |
| --- | --- | --- | --- |
| `packages/todo/src/widget.ts` | T5 | `e642274d52f3d9bc14e5e92f884cf576209db2dc7434e94ae085786155afbbf2` | `54ac26658ad077f06dc4757409df9c1b00e58986bd9a17b5a0d9bb77a5d22522` |
| `packages/todo/src/tool.ts` | T2 | `67ab66399e257ceb92abc818dc59d78c89571c9ebad121f25c2af6ae91802316` | `d5e49fd7605f88ee031bb6892c147ca34975b48f7a838782080257f584a21894` |
| `packages/todo/src/persistence.ts` | T3 | `c125281a9db7557c7ec842a02d978f5b6ea342fac42b2de9e868ad49077cf029` | `d735a58a6da527e190339a9d268739c933f585d5c77dc1aefd37f64e812dd6d0` |
| `packages/todo/test/index.test.ts` | T2 | `e08d891569f11a2926875fa836d7839bf0601934b3c1bb6eb095bf227bb9d4df` | `8c8db8741bf6aec387e62149333aa1e6ee725201fc22fa77c411600a1d9be140` |
| `packages/todo/test/persistence.test.ts` | T3 | `9e741579462c46d11d215ad98e5cae596e76f530648833ffabb430ff50c5fb4d` | `dac3655c43919f462024da3b03f8862cf37aba28ebe3c704a8419a26e544e2b6` |

The 41-entry ordered path list, every classification, every owner, and every baseline hash are unchanged. The current raw bytes have exactly the five T10 mismatches against the historical `postTaskSha256` values; the other 19 recorded post-task hashes match current raw bytes.

## Manifest Identities

- Entry count: **41**.
- Unique ordered paths: **41**.
- Recorded post-task hashes: **24**.
- `aggregateSha256`: `0decc644ba0c86814eaef9452a2f5736db0be6e8e459b513434d016006573548`.
- Aggregate algorithm: SHA-256 of the UTF-8 compact JSON serialization of the unchanged ordered `entries` array, without a trailing newline.
- `manifestRawSha256`: `fcc5562b8d1945b49998f1d1f686dd8d16c8905b217f8d81f3e34b89578046aa`.
- `manifestDerivedSha256`: `097e4ca8c80e9c88cb40ba1039298ed7fea01bf1bed0d7077c4c6af462d9a277`.
- Raw identity algorithm: SHA-256 of the exact UTF-8 bytes of `evidence/t0-manifest.json` after reconciliation.
- Derived identity algorithm: SHA-256 of the UTF-8 compact JSON serialization of the parsed reconciled manifest, without a trailing newline.

## Authority References

The manifest authority references match the current raw bytes:

| Path | SHA-256 |
| --- | --- |
| `packages/todo/docs/works/todo-protocol-redesign/work.md` | `9ab4cd6e09b9e916ba34b558b02a473c6e3d7ac99f3151e09a21006fdd7456fb` |
| `packages/todo/docs/works/todo-protocol-redesign/context.md` | `2fd7ce917b84eeff3954b01e149a882bab508745598b7636d0e142b59742d27b` |
| `packages/todo/docs/works/todo-protocol-redesign/spec.md` | `b072067d160b4cc116ffce775157e9e140d449c07c4d0592e8627af7313527bf` |
| `packages/todo/docs/works/todo-protocol-redesign/plan.md` | `e68acb110dd0305f407945ae6190dbfda1c18a385713ddcadf669de8b9cd2211` |
| `packages/todo/docs/works/todo-protocol-redesign/tasks.md` | `948c3d2d06d606a23b1674c720fe147a81688203e52d62e938911a1edb3a77b5` |

## Reconciliation Limits

This reconciliation changed only `evidence/t0-manifest.json`, this canonical evidence file, and the five requested lifecycle documents. It did not change source or test bytes, README/CHANGELOG, package metadata, dependencies, settings, or Git state. The reviewed local commit candidate contains 34 Todo paths; `index` is empty, there are no staged paths, and no commit has been made. The Host smoke proves the current installed Host activation, registration, execution, and lifecycle dispatch path only; it does not extend persistence claims to power-loss durability, cross-branch restore, or future Host versions.

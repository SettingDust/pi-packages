# Plan: Todo Native Tool Rendering

- Status: **implementation accepted; T2/T3 completed; T4 pending execution**
- Owner: `packages/todo`
- Related Work: [work.md](work.md)
- Related Context: [context.md](context.md)
- Governing protocol authority: [todo-protocol-redesign/spec.md](../todo-protocol-redesign/spec.md)
- Overlap boundary: 本 Plan 不依赖另一未提交 worktree 的 authority；实施前以实际路径、当前 diff 与 HEAD 重新确认 owner 边界。
- Scope adjudication: `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/adjudicate-native-rendering-authority-scope-artifacts/result-1.json`

## 1. Objective and Non-goals

Move `todo_set`, `todo_add`, `todo_transition`, and `todo_view` tool calls and results to Pi's native tool shell. Preserve the four-tool schemas, coordinator state and queue, canonical result/error shapes, `workingOn` validation and derivation, `expanded` behavior, restore/recovery behavior, and the persistent Todo widget.

The change does not modify the protocol Spec, state/types, persistence, widget, reminder, dependencies, settings persistence, Pi Host/core, or the historical T5 manifest/ownership/completion hashes. It does not treat the old activation smoke as rendering evidence and does not authorize implementation, Tasks, reload, installation, commit, or deployment.

## 2. Settled Rendering Contract

Pi's native shell owns outer framing, decoration, padding and background. Todo returns only zero-padding business Text: registered tool identity/action, pending size summary, result snapshot summary/detail and existing error content. Tool identity within business text is not a Todo-drawn title or frame. No Todo callback creates a Box, decorative title, padding, background or replacement shell.

The renderer keeps the existing content semantics: collapsed results show the muted size line; expanded results show ordered task/todo rows; empty expanded snapshots show `No todos.`; absent details fall back to the first text content or `No todos.`; narrow widths remain bounded. `workingOn`, status colors, descriptions policy, and error payload text remain governed by the existing protocol and renderer contracts.

Keep settings.ts accepting all/set-only/none without new settings or persistence changes, but remove package-owned successful-call/result hiding. Every invocation retains recognizable identity/action regardless of those settings or missing/unknown result action; identity comes from its registration, not result details. Host's default title is available in its default call-rendering branch when no custom renderCall is supplied. Returning an empty Container from a custom renderCall does not invoke that branch. This plan keeps custom callbacks, so every valid call stage must return business Text containing the registered tool name and action; no empty call Container is allowed.

The selected implementation removes `src/tool-frame.ts` and its dedicated `test/tool-frame.test.ts`, because the confirmed product direction removes that component's only responsibility. This is a future T5 bounded amendment: Tasks must explicitly list deletion, update the T5 inventory/ownership/manifest evidence, preserve historical hashes as history, and assign regression responsibility. No historical manifest or T5 document is rewritten by this draft.

## 3. Candidate Boundary and Historical Path Mapping

The candidate implementation and focused tests are limited to these paths unless implementation evidence proves a smaller set:

| Path | Planned use | Historical/ownership handling |
| --- | --- | --- |
| `packages/todo/src/tool.ts` | Remove `TodoToolFrame` construction and successful-result visibility hiding; retain four registrations, content, errors, and partial handling. | Existing producer path; future task must record the cross-owner consumer amendment without rewriting history. |
| `packages/todo/src/renderer.ts` | Preserve or minimally adjust business-content rendering only where native-shell integration requires it. | Existing T5 path; no unrelated widget refactor. |
| `packages/todo/src/visibility.ts` | Remove only the obsolete success-selector path if no remaining consumer evidence requires it. | Existing T5 path; future inventory/ownership update required only if deleted. |
| `packages/todo/src/tool-frame.ts` | Delete the obsolete self-drawn frame. | Existing T5 path; deletion is the explicit bounded T5 amendment. |
| `packages/todo/test/index.test.ts` | Add focused registration/callback assertions for native content and all four tools. | Existing producer test path; do not alter unrelated coordinator assertions. |
| `packages/todo/test/renderer.test.ts` | Retain/extend state and `expanded` content coverage. | Existing T5 test path. |
| `packages/todo/test/visibility.test.ts` | Replace obsolete successful hiding assertions with compatibility/unknown-action behavior only if the current test contract requires it. | Existing T5 path; no historical manifest rewrite in this Plan. |
| `packages/todo/test/tool-frame.test.ts` | Delete with `tool-frame.ts` if the amendment is accepted. | Explicit deletion and regression-owner update required in future Tasks. |
| `packages/todo/src/settings.ts` | No source change planned; legacy `toolVisibility` values remain parseable for compatibility. | Protected settings path remains outside implementation boundary. |

`widget.ts`, `widget-layout.ts`, `persistence.ts`, `state.ts`, `types.ts`, `schema.ts`, package metadata, lockfiles, and other settings/runtime files remain excluded. The protocol's strict schemas are tested as validation only; no schema production change is planned.

## 4. Execution Strategy and Dependencies

1. Before implementation, verify the exact Work/Context/Spec/Plan/Tasks/processed-Context tuple, obtain independent GO reviews with P0-P3 all zero, and obtain one explicit user acceptance of that tuple. This draft itself is not acceptance and does not authorize source changes.
2. Reconcile ownership from current repository evidence. If native rendering and the multi-expand candidate overlap on any actual path, prove that path is frozen or receive a written handoff from its current owner; concurrent writes remain disallowed. If there is no overlap, proceed independently. Immediately before implementation, recheck the actual paths, current diff, and HEAD. If the freeze or handoff would require changing another authority, stop before implementation.
3. Reconcile the current candidate files and determine the exact T5 bounded amendment. Preserve historical T5 manifest/ownership/completion hashes; record new deletion/inventory/manifest and regression responsibilities only in the later accepted planning/task evidence.
4. Remove the Todo frame and selector usage, leaving native shell callbacks with only business content. Keep `renderResult` responsible for snapshot/error fallback content and preserve `expanded` propagation. Do not change coordinator execution or result serialization.
5. Update focused tests for callback return shape and renderer content. Delete frame-only tests with the component, and retain one regression assertion that no Todo callback creates the old frame if the test harness can observe that boundary without introducing a new test abstraction.
6. Run focused tests and typecheck, then run the real Pi `0.84.2` Host rendering smoke described below. Only after those results are reconciled may later Tasks/Reviews mark the bounded change complete.

No phase is safe for parallel writes over the candidate `packages/todo` paths. Read-only review and evidence collection can proceed independently after the exact tuple is fixed.

## 5. Required Rendering Verification Matrix

These contracts apply separately to all four registrations. A means zero-padding Text containing the registered tool name plus action (set/replace, add, transition, view); where available, retain the existing pendingSummary(args, coordinator.snapshot()) counts. Counts alone do not identify an action. Valid incomplete object args use the existing snapshot-based summary; non-object/null args remain outside the valid input guarantee. Calls never read a returned snapshot. R means existing renderTodoResult(value, options, theme) Text with zero padding. C is an empty Container allowed only for the existing non-error partial result path, never renderCall. Call context flags and result options are independent.

| Stage | `renderCall(args,theme,context)` | `renderResult(value,options,theme,context)` |
| --- | --- | --- |
| running, no partial flag | A, even when context.isPartial is false/absent. | No result event means no invocation; if invoked with nonpartial options use R. Do not invent a running flag. |
| partial, non-error | A with existing muted pending summary when context.isPartial=true. | C when options.isPartial=true and context.isError is false; no completed result is invented. Visible A and Host pending state identify the ongoing action. |
| success/final | A remains visible; never empty. | R independent of visibility; collapsed size line, expanded ordered rows retain business status. |
| Host error | A even when context.isError=true, including partial. | R even if partial; absent snapshot uses existing text fallback. Host error decoration follows context, not details.result. |
| business error | A follows call flags, not business result. | Existing execute returns result:error/error text/details without isError; preserve that error text, without promising Host error coloring for success transport. |
| empty | A for valid empty/incomplete object args, possibly zero counts; todo_view {} still identifies view. | Valid tasks:[] snapshot: collapsed zero size line, expanded No todos.; missing/falsey snapshot uses fallback below, not C, subject to partial/error precedence. |
| expanded true/false | A unchanged; call has no expanded result option. | Forward options.expanded unchanged; partial/error precedence above applies. |

Each later acceptance must independently pass: (a) call identity/action is visible for all four tools and all applicable states; (b) result business content, status, errors, and expanded information are visible. `set-only` and `none` must not hide successful calls or results. Native shell decoration is not an excuse to omit identity/content; no Todo self-drawn frame is permitted.

Malformed display inputs are distinguished from canonical empty state. With a valid result envelope/content array, missing details, missing snapshot, and falsey snapshot (`undefined`, `null`, `false`, `0`, empty string, or NaN in direct callback tests) take the current `!state` fallback: first text part's truthy text, otherwise `No todos.`. Truthy `{}`, arrays, scalar values, missing/non-array tasks, non-object task, missing/non-array todos, and invalid todo fields are outside the guarantee and may throw. Malformed content envelopes are also outside it. This Plan chooses no renderer change for malformed input; do not advertise general validation or safe fallback. A later broader guarantee requires explicit reviewed amendment limited initially to `src/renderer.ts` and `test/renderer.test.ts`, not protocol changes.

Focused checks in `test/index.test.ts` must identify each registration, vary call `context.isPartial/isError` and result `options.isPartial/context.isError/expanded` independently, and assert call identity/action plus result content/status/error/expanded information. Renderer tests cover valid empty/nonempty states and falsey fallback only. Truthy malformed inputs remain excluded. Keep strict schemas, workingOn, widget and recovery assertions unchanged. Synthetic checks cannot substitute for native-shell observation.

## 6. Host Smoke and Version Boundary

This is a future verification procedure, not permission to run it now. Require separately authorized real interactive Host execution against accepted candidate bytes. Do not install dependencies, change settings/core, reload a parent session, or use the old activation smoke. Use a disposable session rather than live Todo state. Pi 0.84.2 is the current package-peer-matching baseline, not an arbitrary-version compatibility guarantee.

1. In PowerShell, set `$root='E:/Projects/pi-packages/.worktree/todo-native-tool-rendering'` and `$cli='E:/Projects/pi-packages/node_modules/@earendil-works/pi-coding-agent/dist/cli.js'`. Require `Test-Path $cli`, `Test-Path "$root/packages/todo/src/index.ts"`, Node >=22 and `node $cli --version` reporting exactly `0.84.2`; record CLI path/version and candidate raw hashes. Run `node $cli --help` and verify the available interactive extension-loading and isolation flags below before launch. Missing entry, unsupported flags or version mismatch blocks the gate; do not silently use another global CLI.
2. From `$root/packages/todo`, verify existing resolution of `typebox` and the three declared peers (`pi-ai`, `pi-coding-agent`, `pi-tui` under `@earendil-works`); record resolved paths/versions separately from package.json declarations. All peer versions must be `0.84.2`. Missing dependencies or unknown loaded provenance blocks; no installation/pinning workaround is authorized here. Also require working provider credentials and interactive TTY capture capability.
3. After confirming these flags in help, launch `node $cli --no-extensions --no-skills --no-prompt-templates --no-session -e "$root/packages/todo/src/index.ts"` in an isolated disposable working directory. Confirm explicit extension actually loads once and the four tools are available; registration errors, duplicate overrides or a different extension winning a tool name block. This new real interactive Host is the smoke target, not an import-only test or parent-runtime activation claim. If isolation/loading semantics cannot be established from the installed Host, stop rather than assuming the flags prove isolation.
4. Prompt the model to call each tool separately with the exact JSON below, and record actual emitted tool-call name/args plus returned details/content. Prompts alone are not execution evidence. Sequence: `todo_set {"tasks":[{"name":"Smoke","todos":[{"name":"A","description":"First"}]}]}`; `todo_add {"task":"Smoke","todos":[{"name":"B","description":"Second"}]}`; `todo_transition {"transitions":[{"task":"Smoke","todo":"A","status":"in_progress"}]}`; `todo_view {}`. Then `todo_set {"tasks":[]}` and `todo_view {}` exercise empty output. For business errors, use duplicate task names in set, nonexistent task in add, nonexistent target in transition. For view's strict-schema error use `{"unexpected":true}`: if the provider prevents it, record that limit and retain the direct registration/schema check; do not invent a Host event.
5. Capture timestamped terminal video/screenshots at known widths (e.g. 100 and 40 columns), correlated with actual tool-call IDs and result records. Use the installed Host's documented expand/collapse key and record its binding/action for each final result. Record running/partial call identity, final call identity, collapsed/expanded business content, native backgrounds/spacing/error decoration and unchanged widget. Custom callback A must remain visible, including set-only/none success. Confirm the Host default-title branch is not being assumed for an empty custom call. Fast calls may prevent pending still captures; video or a verified existing Host event-capture seam is required, otherwise mark unobserved. Current execute emits no partial result updates; callback tests do not prove production Host emitted them. Host-error transport requires actual evidence; business errors alone do not prove it.
6. Attach a per-tool/per-cell table with request, flags/event provenance, capture and separate pass/fail/unobserved columns for (a) call identity/action and (b) applicable result business content/status/error/expanded information. Test all/set-only/none without changing settings persistence. Any Todo frame, lost identity/content, selector-hidden success, width overflow or changed business/recovery contract fails. Unobserved required Host states, unverifiable shell ownership, unavailable capture or missing dependencies leave this gate incomplete/blocked; tests, text logs and old activation smoke cannot substitute. No new synthetic harness/source modification is authorized by this procedure.

## 7. Risks, Rollback, and Completion Evidence

Primary risks are accidentally hiding results through a remaining selector, changing native shell partial/error semantics, and deleting a T5-owned frame without reconciled ownership evidence. Mitigate with the matrix, direct callback assertions, exact-path reconciliation, and the bounded T5 amendment gate. If native Host behavior cannot render the retained business content without a Todo frame, stop and report the evidence-backed incompatibility rather than inventing a Host/core change.

Rollback is deletion/reversion of only the accepted implementation paths while preserving the old manifest history and restoring the prior T5 inventory through an explicitly reviewed amendment; no settings migration is needed because legacy `toolVisibility` values remain readable. Completion requires focused tests, `bun run typecheck`, the real `0.84.2` Host rendering smoke, schema-only validation, and a check for unexpected/untracked files. It also requires later Tasks, independent full-scope review, and one explicit user acceptance before implementation, and a truthful reconciliation of the `tool-frame` deletion and all affected T5 evidence.

## 8. Later Deliverables and Decisions

The next lifecycle artifacts remain same-directory tasks.md, processed Context as required, independent review evidence and implementation evidence; none are created here. Before advancing, independently review these three documents at their exact raw SHA256 bytes, including both visibility acceptance dimensions, the default-title/custom-call distinction and the peer-matching 0.84.2 baseline. The selected frame/test deletion still requires the T5 bounded amendment, overlap freeze/owner handoff, full tuple GO (P0-P3=0) and explicit user acceptance before implementation. All three documents remain draft/unaccepted/unimplemented.

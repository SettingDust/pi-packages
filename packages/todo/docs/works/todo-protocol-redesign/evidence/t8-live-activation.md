# T8 Evidence: Todo Live Activation

- Status: **Complete.**
- Task: T8 documentation gate and lifecycle reconciliation.
- Work: [../work.md](../work.md)
- Plan: [../plan.md](../plan.md)
- Tasks: [../tasks.md](../tasks.md)
- Manifest: [t0-manifest.json](t0-manifest.json)
- T7 review: [t7-review.md](t7-review.md)
- Live smoke Result: `todo-t8-activation-smoke`, generation 1, completed.
- Host: installed Pi `0.84.4` at `D:\Applications\Scoop\shims\pi`.

## Scope

This evidence closes T7's sole P3 limitation: live activation had not been independently reproduced in an installed Pi Host. T8 is limited to public documentation reconciliation and lifecycle evidence. No source, tests, manifest, dependencies, settings, reload, staging, commit, push, or deployment action was performed. The frozen T0 manifest was intentionally not rewritten; its recorded authority hashes therefore remain the pre-T8 hashes while the authorized lifecycle documents now carry the T8 completion state.

## Live activation smoke

The real Pi CLI started a temporary no-session, offline RPC process with only a temporary observer and `E:/Projects/pi-packages/packages/todo/src/index.ts` explicitly loaded. The installed package was confirmed by `pi list` at `E:/Projects/pi-packages/packages/todo`.

The Host extension loader and runner produced the exact effective active tool inventory:

- `todo_set`
- `todo_add`
- `todo_transition`
- `todo_view`

The observer invoked the Host-registered executable wrappers in order. All four completed successfully with the expected result labels: `set`, `add`, `transition`, and `view`.

The real registration path captured and dispatched each of the eight lifecycle handlers once through `ExtensionRunner.emit`, with no handler failures:

- `session_start`
- `session_tree`
- `session_compact`
- `before_agent_start`
- `agent_start`
- `agent_settled`
- `turn_end`
- `context`

The smoke exited successfully and emitted one `TODO_LIVE_SMOKE` record with `passed:true`, complete four-tool results, and complete eight-handler calls. Pre- and post-run `git status --short` matched; the temporary observer was removed.

## Limits

This proves the current installed Pi `0.84.4` Host's extension loading, activation, effective tool inventory, four-tool execution, and eight-handler dispatch for this run. It does not prove power-loss durability, cross-branch restoration, or behavior on future Host versions. Existing persistence claims remain limited to successful complete Todo tool results recorded and observable in the current session branch.

## Documentation reconciliation

README and CHANGELOG now use `todo_set`, `todo_add`, `todo_transition`, and `todo_view`; describe canonical `tasks[].todos[]`, pending creation, transition-only status changes, and derived `status`/`workingOn` semantics; and record the branch-local Host checkpoint boundary.

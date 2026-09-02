# @settingdust/pi-herdr-subagents

An independent Herdr-backed Pi subagent runtime. It registers `subagent_spawn`, `subagent_resume`, `subagent_steer`, `subagent_inspect`, `subagent_join`, `subagent_cancel`, and `subagent_remove`.

The runtime owns child Pi sessions, Herdr tabs and panes, stable `subagentId` values, generation-specific private Result files, and Agent discovery. `subagent_spawn` requires an `agent` name from its dynamically generated local-registry enum and resolves that Agent locally. The Harness Router always passes `agent: handler`; no Agent path or body crosses the tool boundary. Child session files live under the parent Pi session's `tasks/` directory and are reused across resumed generations; projects without a parent session fall back to `.pi/subagent-sessions/tasks/`.

Each reserved `<subagentId>-artifacts/` directory contains an atomically updated `task.json`. Before registering tools, the runtime rebuilds tasks from the current parent session's task root, accepts only generation-matched Result files, and positively verifies non-terminal panes with `herdr pane get`. Recovery never relaunches a retained running pane. After terminal state and cleanup intent are durable, the runtime closes the generation's accepted Herdr tab while retaining its session, Result, manifest, and launch artifacts; those files and their ID reservation remain until `subagent_remove` explicitly deletes them.

Within a child Pi process, an unfinished Handler turn receives one delayed follow-up in its existing session. Each later unfinished turn repeats that continuation until `subagent_done` writes the Result; there is no attempt limit or deadline. Pending follow-ups are cancelled while input or agent/session lifecycle activity is in progress.

Within the parent session, model-facing guidance is notification-first: after `subagent_spawn`, end the Router turn and wait for the terminal completion notification instead of polling `subagent_inspect` or routinely waiting with `subagent_join`. Use `subagent_inspect` only for an explicit non-blocking snapshot. Use `subagent_join` after a terminal notification, or when an immediate full Result is explicitly necessary; cancelling its caller wait, including ESC, affects only that wait, while `subagent_cancel` remains the explicit task-cancellation operation.

It does not own Harness Handoff/Result semantics, Router scheduling, retries, queues, worktrees, or conflict detection.

Enable this package as the delegation environment. It cannot coexist with another extension that registers the same `subagent_*` tools.

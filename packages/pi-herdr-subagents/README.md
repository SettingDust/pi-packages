# pi-herdr-subagents

An independent Herdr-backed Pi subagent runtime. It registers `subagent_spawn`, `subagent_resume`, `subagent_steer`, `subagent_inspect`, `subagent_join`, `subagent_cancel`, and `subagent_remove`.

The runtime owns child Pi sessions, Herdr tabs and panes, stable `subagentId` values, generation-specific private Result files, and Agent discovery. `subagent_spawn` requires an `agent` name from its dynamically generated local-registry enum and resolves that Agent locally. The Harness Router always passes `agent: handler`; no Agent path or body crosses the tool boundary. Child session files live under the parent Pi session's `tasks/` directory and are reused across resumed generations; projects without a parent session fall back to `.pi/subagent-sessions/tasks/`.

Each reserved `<subagentId>-artifacts/` directory contains an atomically updated `task.json`. Before registering tools, the runtime rebuilds tasks from the current parent session's task root, accepts only generation-matched Result files, and positively verifies non-terminal panes with `herdr pane get`. Recovery never relaunches a retained running pane. Artifacts and their ID reservations remain until `subagent_remove` explicitly deletes them.

Within a child Pi process, an unfinished Handler turn receives one delayed follow-up in its existing session. Each later unfinished turn repeats that continuation until `subagent_done` writes the Result; there is no attempt limit or deadline. Pending follow-ups are cancelled while input or agent/session lifecycle activity is in progress.

The runtime watches every running generation for a terminal Result or a missing pane. On `completed`, `failed`, `cancelled`, `pane_closed`, or launch failure, it advances the task state and sends the parent a summary-only `pi-herdr-subagent-completion` message that triggers a Router turn. The message contains only `subagentId`, `generation`, `status`, `label`, and an optional short reason; `subagent_join` remains the only operation that returns the full Result. Notification markers are persisted by generation and recovered parent-session messages are also honored, so restart recovery backfills missed notifications without replaying consumed ones.

It does not own Harness Handoff/Result semantics, Router scheduling, retries, queues, worktrees, or conflict detection.

Enable this package as the delegation environment. It cannot coexist with another extension that registers the same `subagent_*` tools.

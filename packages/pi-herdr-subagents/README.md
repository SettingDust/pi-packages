# pi-herdr-subagents

An independent Herdr-backed Pi subagent runtime. It registers `subagent_spawn`, `subagent_resume`, `subagent_steer`, `subagent_inspect`, `subagent_join`, `subagent_cancel`, and `subagent_remove`.

The runtime owns child Pi sessions, Herdr tabs and panes, stable `subagentId` values, generation-specific private Result files, and Agent discovery. `subagent_spawn` requires an `agent` name from its dynamically generated local-registry enum and resolves that Agent locally. The Harness Router always passes `agent: handler`; no Agent path or body crosses the tool boundary. Child session files live under the parent Pi session's `tasks/` directory and are reused across resumed generations; projects without a parent session fall back to `.pi/subagent-sessions/tasks/`.

Each reserved `<subagentId>-artifacts/` directory contains an atomically updated `task.json`. Before registering tools, the runtime rebuilds tasks from the current parent session's task root, accepts only generation-matched Result files, and positively verifies non-terminal panes with `herdr pane get`. Recovery never relaunches a retained running pane. Artifacts and their ID reservations remain until `subagent_remove` explicitly deletes them.

It does not own Harness Handoff/Result semantics, Router scheduling, retries, queues, worktrees, or conflict detection.

Enable this package as the delegation environment. It cannot coexist with another extension that registers the same `subagent_*` tools.

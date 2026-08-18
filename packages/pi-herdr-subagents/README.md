# pi-herdr-subagents

An independent Herdr-backed Pi subagent runtime. It registers `subagent_spawn`, `subagent_resume`, `subagent_steer`, `subagent_inspect`, `subagent_join`, `subagent_cancel`, and `subagent_remove`.

The runtime owns child Pi sessions, Herdr tabs and panes, stable `subagentId` values, generation-specific private Result files, and Agent discovery. `subagent_spawn` always uses the `handler` Agent resolved from its own registry; it accepts no Agent argument. Child session files live under the parent Pi session's `tasks/` directory and are reused across resumed generations; projects without a parent session fall back to `.pi/subagent-sessions/tasks/`.

It does not own Harness Handoff/Result semantics, Router scheduling, retries, queues, worktrees, or conflict detection.

Enable this package as the delegation environment. It cannot coexist with another extension that registers the same `subagent_*` tools.

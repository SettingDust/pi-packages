# pi-herdr-subagents

An independent Herdr-backed Pi subagent runtime. It registers `subagent_spawn`, `subagent_resume`, `subagent_steer`, `subagent_inspect`, `subagent_join`, `subagent_cancel`, and `subagent_remove`.

The runtime owns child Pi sessions, Herdr tabs and panes, stable `subagentId` values, generation-specific private Result files, and Agent discovery. It does not own Harness Handoff/Result semantics, Router scheduling, retries, queues, worktrees, or conflict detection.

Enable this package as the delegation environment. It cannot coexist with another extension that registers the same `subagent_*` tools.

# Work: Recovery Performance Correction

- **Status:** Completed. Red/green checks, 239 package tests, typecheck, isolated-data benchmark and fresh independent static review passed; evidence limits are recorded in Context.
- **Owner:** `@settingdust/pi-herdr-subagents`.
- **Objective:** Avoid repeated writes of unchanged terminal task manifests and recursive image checks for tasks with no image cleanup work.
- **Authority:** [Lifecycle section 3.2.1](../../spec/runtime-lifecycle.md#321-recovery-without-redundant-writes), [image file lifetime and cleanup](../../spec/image-input.md#file-lifetime-and-cleanup).
- **Context:** [context.md](context.md).
- **Plan and gates:** [plan.md](plan.md), [waves.md](waves.md).

This is a bounded correction to recovery and cleanup, not new product scope or a new storage architecture. No PRD or ADR is needed. Preserve per-invocation disk discovery, Result precedence/rechecks, migration, unknown fields, cleanup ownership, bounded retries, notification replay and scope isolation.

## Completion

Regression checks must fail before the fix and pass after it. Full package tests and typecheck must pass, and the original terminal-only dataset must recover without redundant manifest writes. Verification evidence must distinguish deterministic operation assertions from host-dependent timings and must not claim a confirmed memory leak, live-provider acceptance, or completion of the separate image-input Work.

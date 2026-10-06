# Context: Recovery Performance Correction

## Settled evidence

The diagnostic script at `../../../.perf-investigation/recovery.ts` recovers isolated copies of 1,803 terminal task manifests and current-generation Results, with zero image directories and no child launches. Before repair, HEAD required about 7 seconds per recovery; the image-input working version required 12–18 seconds. Image cleanup alone accounted for about 4.8–11.4 seconds. Each pass wrote 1,803 manifests and read Results 7,184 times. Timings vary with host filesystem/cache load.

The recent apparent bulk task creation was atomic manifest replacement refreshing Windows creation timestamps, not 1,803 new launches. The current Pi has neither subagent nor harness loaded; it is not the reproduction target. GC-retained heap did not grow across repeated isolated recoveries, so sustained memory leakage is unconfirmed.

## Authority and boundaries

Lifecycle section 3.2 formerly required persistence after every recovery without distinguishing an unchanged V2 terminal state. Image cleanup validated all ancestors before checking whether any candidate existed. The accepted correction narrows redundant work while preserving durable terminal/cleanup intent and image safety. Existing before-agent-start recovery remains; each invocation still reads the disk scope. No permanent absence cache, receipt store, daemon, dependency, or notification-policy change is introduced.

Existing image-input source/docs/tests are uncommitted user work. This correction is layered onto them; it must not erase their privacy/lifecycle repairs or claim their independent review gate has passed.

## Evidence

Implementation is complete. `src/index.ts` compares normalized recovered V2 state (excluding Result text) before its initial terminal write and preserves matching timestamps. Other settlement effects/rechecks are retained. Image discovery performs artifact-leaf lstat/realpath checks and enumerates names before recursive image validation; full validation remains for owned/orphan cleanup and explicit removal.

- Red: `bun test packages/pi-herdr-subagents/tests/runtime.test.ts --test-name-pattern "recovery performance"` produced 0 pass / 3 fail on the original working implementation. Failures caught rewritten manifest bytes, recursive checks with no images, and rewritten manifests during late-orphan cleanup.
- Green: the same command produced 3 pass / 0 fail with 21 assertions after repair. It also proves notification replay remains eligible, changed Result status/error persists, a new task is discovered, unknown fields survive, and explicit removal retains full checks.
- Typecheck: `bun run --cwd packages/pi-herdr-subagents typecheck` passed.
- Active LSP probe: changed source/test paths were checked; one push-only server could not affirm clean. Five auxiliary rule findings in `index.ts` also exist in HEAD: four existing double-cast safety-comment warnings and the model-registry `unknown` return. No new rule finding was introduced; this is not a claim of a clean auxiliary report.
- Original isolated dataset: fixed recovery took 1,352 / 1,282 ms wall time and 1,359 / 1,234 ms CPU, with zero calls to `persist`, 7,184 Result reads, and 1,803 cleanup invocations per pass. No transport calls, warnings, active monitors, owned image closures or pending settlements occurred. GC-retained heap was 26.6 / 26.5 MB. Raw evidence: `../../../.perf-investigation/fixed.jsonl`.
- Fresh serial HEAD comparison with the same dataset took 3,370 / 3,210 ms and still called `persist` 1,803 times per pass (`baseline-after-fix.jsonl`). This later run demonstrates host/cache sensitivity relative to the prior 7-second HEAD and 12–18-second working measurements; zero-write and skipped-recursive-check assertions are the deterministic evidence. Benchmark processes were serial, but package tests were independently running, so timings are not an isolated-host throughput guarantee.
- Full package suite: `bun test` in the package root passed 239 tests across 9 files, 0 failures, 8,243 assertions, in 149.61 seconds (exit 0). This includes actual offline SDK image-child processes, lifecycle migration/replay, cleanup failure/retry, redirection/hardlink/identity checks and the three new regressions. Raw final output: `../../../.perf-investigation/package-tests.log`; exit status: `package-tests.exit`. Runtime-only verification also passed 148 tests with 4,605 assertions. Foreground/background-report attempts without complete evidence were not counted as successful gates; the final process retained explicit log and exit artifacts.
- Independent review: a separate ephemeral Pi CLI ran without extensions, skills, context files, tools or persisted session. It received the source/spec packet and reported no blockers after the follow-up included Result reconciliation, surface cleanup/replay, full image-input safety and recovery code. Final report: `../../../.perf-investigation/complete-review.md` (exit 0). This is fresh static review, not an independently rerun test suite. Unchanged delegated internals and atomic resistance to hostile concurrent path replacement were not certified; no cross-process or live Herdr/provider guarantee is added.
- Final contract review retained disk rescan, Result precedence/rechecks, V1 migration, unknown fields, cleanup ownership/retries and notification replay. `git diff --check -- packages/pi-herdr-subagents` passed. No runtime dependency or storage format was added.

See [plan.md](plan.md) and [waves.md](waves.md) for ordered gates.

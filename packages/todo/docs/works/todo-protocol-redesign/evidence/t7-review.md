# T7 Review Evidence: Todo Protocol Redesign

- Status: **Complete.**
- Task: T7 independent correctness and evidence review.
- Work: [../work.md](../work.md)
- Plan: [../plan.md](../plan.md)
- Tasks: [../tasks.md](../tasks.md)
- Manifest: [t0-manifest.json](t0-manifest.json)
- Review Result: `review-todo-t7-candidate` generation 1, completed.
- Review date: 2026-08-16

## Scope

The review covered the accepted T7 boundary after T6: the four-tool schemas and registrations, canonical state invariants and mutation atomicity, coordinator publication ordering, Host-aligned restore behavior, and canonical consumer paths. The review was evidence-only and did not authorize implementation, documentation lifecycle, commit, or deployment work.

The initially requested global `documentation-spec-writing` Skill path was unavailable. The review was therefore recorded using the available `research-deep` instruction, with the accepted Work, Plan, Tasks, frozen manifest, candidate review Result artifact, package source/tests, and executed verification outputs as sources.

## Verdict

**P0: 0. P1: 0. P2: 0. P3: 1.**

No actionable P0-P2 correctness defects were found. One P3 evidence limitation remains: live activation in the installed Pi Host was not independently reproduced. Commit/readiness is consequently conditional, not final, until that activation smoke and the T8 documentation/lifecycle gate are completed.

## Findings

### Correctness review

- Exact four-tool schemas and runtime parsers reject cross-tool fields and creation statuses; creation remains `{name,description}` and produces `pending`.
- State application derives `workingOn`, rejects duplicate or missing transition targets, and preserves the prior state when candidate validation fails.
- The coordinator queues mutations in invocation order and publishes widgets only after successful candidate construction.
- Restore accepts canonical and strict legacy records, skips malformed, failed, or wrong-tool records, and returns independent empty state when no valid checkpoint exists.
- Formatter, reminder, compaction, renderer, widget, visibility, and tool-frame paths consume canonical task/todo state and handle width and terminal states.

These findings are observations from the review Result and are bounded by the inspected source, tests, and authority documents; they do not claim untested Host behavior.

### P3 evidence limitation

The requested live activation smoke was not independently reproduced against a live Pi Host. Available evidence was limited to:

- `packages/todo/test/index.test.ts:27-33`, confirming four registrations and eight lifecycle handlers;
- direct source inspection; and
- the package-level verification listed below.

Registration tests and source inspection do not prove runtime loading and activation in the installed Host. This is a verification limitation, not an observed implementation failure. The smallest required follow-up is a fresh live activation smoke before final commit/readiness sign-off.

## Verification Evidence

The candidate review Result records these checks as passed:

- `bun run typecheck` in `packages/todo`;
- `bun run test` in `packages/todo`: 12 files and 69 tests passed;
- `git diff --check`;
- manifest recomputation and frozen-boundary checks;
- four-tool registration and lifecycle-handler checks; and
- source/test review of canonical state, persistence, projections, and consumers.

No host smoke pass is claimed here. T7 does not change the frozen manifest, package source, package tests, dependencies, settings, or Git state.

## Authority and Lifecycle

T6 was complete before this review, with the authority tuple and frozen manifest validated according to the recorded Plan and Tasks evidence. T7 is now evidenced as complete for its separate review-evidence boundary. T8 remains pending and must perform truthful lifecycle reconciliation and the authorized README/CHANGELOG work only after accounting for the P3 live-activation limitation. This evidence does not mark T8 complete and does not constitute commit, deployment, reload, or host activation approval.

## Sources

- `packages/todo/docs/works/todo-protocol-redesign/work.md`
- `packages/todo/docs/works/todo-protocol-redesign/plan.md`
- `packages/todo/docs/works/todo-protocol-redesign/tasks.md`
- `packages/todo/docs/works/todo-protocol-redesign/evidence/t0-manifest.json`
- `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/review-todo-t7-candidate-artifacts/result-1.json`
- Available Skill: `E:/Projects/pi-packages/packages/pi-harness/skills/research-deep/SKILL.md`

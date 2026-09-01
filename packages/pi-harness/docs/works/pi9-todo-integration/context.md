# Context: pi9 Todo Integration

- Status: Accepted scope. Implementation, bounded validation, and T7 final fresh independent review completed with GO. T8 selective commit pending.
- Related Work: [work.md](work.md)

## Product and Ownership Boundary

The integration supplies the user-facing `@pi9/todo` capability for task tracking. It does not alter, replace, persist, or expose Router Todo coordination, which remains internal delegation/workflow coordination.

## Settled Facts and Provenance

- **Fact — candidate identity:** `Chase-C/pi9` commit `94405f79bb1e400fcba5e1b973778ef82d8378b2`, package `@pi9/todo` v0.3.7, MIT.
- **Fact — imported inventory:** the 36 package paths are 17 upstream-identical `src/*.ts` files, 12 upstream-identical test files plus `test/helpers.ts`, and `CHANGELOG.md`, `LICENSE`, `README.md`, `package.json`, `tsconfig.json`, and `vitest.config.ts`.
- **Fact — attribution and exclusions:** the MIT LICENSE and copyright notice are retained. Media, `dist`, the upstream repository-root lockfile, release material, and `.pi` are excluded.
- **Fact — dependency and runner:** package metadata uses the resolved `typebox` basis; the final runner is `vitest run`. A Bun-native mock migration was attempted, failed, and was reverted rather than retained.
- **Fact — exact proposed commit boundary:** 42 paths: the 36 package paths, `bun.lock`, and the five direct Work artifacts `work.md`, `context.md`, `research.md`, `plan.md`, and `tasks.md`. Unrelated dirty work is excluded.

## Validation and Review Facts

- **Fact:** `bun --cwd=packages/todo run typecheck` passed.
- **Fact:** the README command `bun --cwd=packages/todo run test` passed: 12 files and 92 tests.
- **Fact:** package entry import passed.
- **Fact:** activation/registration smoke passed with `todo` plus eight handlers.
- **Fact:** boundary and diff checks passed for the stated package and proposed commit boundary.
- **Fact:** the final independent review `final-review-todo` generation 1 completed with **GO** and zero P0/P1/P2/P3 findings. It confirmed the candidate, provenance, dependency closure, 42-path boundary, and retained verification matrix.
- **Fact:** implementation, bounded validation, and T7 review are complete. T8 is a pending selective commit only.

## Resolved Prior Questions

- TypeBox compatibility, package ownership, upstream identity, source/test inventory, attribution, local runner, and the package activation/register smoke are settled by the implemented candidate and recorded validation.
- The previously planned Host-observer T3 gate is cancelled; it is not an outstanding prerequisite for this bounded integration.
- The final runner is Vitest, not Bun's native runner. Upstream-identical tests remain intact; the failed Bun mock adaptation is not part of the candidate.

## Real Limitations and Remaining Action

- No staging, commit, push, reload, deploy, install, runtime mutation, Pi-core change, or full live TUI/session replay was performed or is claimed.
- The smoke validates activation/registration, not a full interactive TUI, persistence, reload, resume, fork, or end-to-end session lifecycle replay.
- T8 is a selective commit of the exact 42-path boundary after final staged diff/whitespace, typecheck, and README-command test checks pass. This Context does not itself authorize that action.

## Related Material

- [Work](work.md)
- [Research](research.md)
- [Plan](plan.md)
- [Tasks](tasks.md)

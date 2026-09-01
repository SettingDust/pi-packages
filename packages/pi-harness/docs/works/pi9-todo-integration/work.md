# Work: pi9 Todo Integration

- Status: Accepted scope. Implementation, bounded validation, and T7 final fresh independent review completed with GO. T8 selective commit pending.
- Scope: integrate the upstream `@pi9/todo` package as a user-facing Pi todo capability without changing Router Todo coordination.
- Product boundary: user-facing task tracking remains distinct from Router Todo coordination, which remains internal delegation/workflow coordination and is neither replaced nor exposed by this work.

## Authority

- Implementation was authorized by the accepted related Plan and Tasks. This Work entry is derived coordination material, not independent product or technical authority.
- This reconciliation records the implemented candidate and validation evidence only; it does not authorize a commit, push, reload, deployment, installation, restart, resume, or a broader runtime change.

## Provenance and Fixed Boundary

- Upstream candidate: `Chase-C/pi9` `packages/todo` at `94405f79bb1e400fcba5e1b973778ef82d8378b2` (`@pi9/todo` v0.3.7, MIT).
- The imported package inventory is upstream-identical: 17 `src/*.ts` files; 12 test files plus `test/helpers.ts`; and six package-root files (`CHANGELOG.md`, `LICENSE`, `README.md`, `package.json`, `tsconfig.json`, and `vitest.config.ts`). No upstream media, `dist`, repository-root lockfile, release material, or `.pi` material is included.
- The exact proposed selective-commit boundary is 42 paths: 36 `packages/todo/**` paths, `bun.lock`, and the five direct Work artifacts `work.md`, `context.md`, `research.md`, `plan.md`, and `tasks.md`. It excludes unrelated dirty work.
- Required MIT LICENSE and upstream copyright notice are retained.

## Current Stage and Evidence

- The whole-package candidate is implemented. The attempted Bun-native mock migration failed and was reverted; the final local runner is the package `vitest run` script, not Bun's native test runner.
- Validation passed: README command `bun --cwd=packages/todo run test` (12 files / 92 tests), package typecheck, package entry import, todo plus eight-handler activation/registration smoke, and boundary/diff checks.
- The planned Host-observer T3 gate was cancelled as unnecessary to this validated package integration; no full live TUI/main-session replay is claimed.
- T7 final fresh independent review completed with **GO**: generation 1 found zero P0, P1, P2, and P3 findings. The review was read-only and permits T8 reconciliation, not a commit itself.
- T8 selective commit is pending.

## Completion Signal and Limitations

- Implementation, bounded validation, and T7 final fresh independent review are complete. T8 selective commit remains pending until the exact selective boundary, whitespace, typecheck, and test checks pass at the committed revision.
- Not performed or claimed: staging, commit, push, reload, deploy, installation, live full TUI/session replay, or Pi-core modification. These remain outside this reconciliation.

## Links

- [Context](context.md)
- [Research](research.md)
- [Plan](plan.md)
- [Tasks](tasks.md)

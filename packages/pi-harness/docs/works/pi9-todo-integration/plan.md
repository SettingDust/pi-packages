# Plan: pi9 Todo Integration

- Status: Accepted scope. Implementation, bounded validation, and final T7 fresh review completed with GO. T8 selective commit is pending.
- Related Work: [work.md](work.md)
- Related Context: [context.md](context.md)
- Related Research: [research.md](research.md)
- Authority: This Plan records the accepted implementation boundary and reconciles it to the validated candidate. It does not authorize a commit, push, reload, deployment, or a claim of full live TUI/session replay.

## Objective

Record the actual completed, minimal `@pi9/todo` integration path faithfully so final independent review can assess the candidate and its selective commit boundary against evidence rather than superseded gates.

## Implemented Scope and Provenance

- Upstream source identity is `Chase-C/pi9` commit `94405f79bb1e400fcba5e1b973778ef82d8378b2`.
- The imported integration has an exact 42-path boundary. It retains the required upstream attribution: `@pi9/todo` `0.3.7`, MIT, and copyright `(c) 2026 Chase Cummings` for copied or materially adapted code.
- The upstream-derived package inventory contains 36 package paths; 31 upstream source, test, helper, and Vitest-config files have SHA-256 byte identity with the pinned source. The 42-path integration boundary also contains only the necessary local package, dependency, lockfile, attribution, documentation, and validation closure established by the implemented candidate.
- Direct `typebox@1.3.7` and development `vitest@^4.1.6` are declared. The necessary `bun.lock` closure is part of this bounded change.
- The final supported test command is `bun --cwd=packages/todo run test`; it invokes Vitest. The earlier Bun-native runner attempt was reverted.
- Router Todo coordination, Pi core, Host/tool-inventory expansion, a new persistence store, alternate tool name, wrapper DSL, broad dependency upgrade, UI redesign, upstream media, `dist`, repository-root upstream lockfile, release material, and `.pi` remain excluded.

## Executed Strategy

### 1. Freeze the imported boundary

The implementation imported the required whole-package candidate from the fixed upstream commit, retained MIT attribution, and limited the integration to the exact 42-path boundary. Byte-level provenance is preserved for the 31 applicable upstream files; the candidate must fail closed during final review if the pinned identity or established boundary cannot be reproduced.

### 2. Use the declared compatibility closure

The implementation selected the explicit direct TypeBox dependency and the necessary lockfile closure, rather than relying on a transitive runtime dependency. Vitest is the final runner; no Bun-native runner adaptation or test-framework migration remains in scope.

### 3. Preserve the cancelled Host-observer gate

The former Host-observer/main-session inventory T3 gate was cancelled and was not implemented. It is not a prerequisite for this candidate, must not be reintroduced by final review, and creates no Pi-core or Host-expansion requirement. No full live TUI/session replay was performed or is claimed.

### 4. Validate the integrated candidate

Recorded validation passed package typecheck, package entry import, the `todo` tool plus eight handlers smoke check, and the integration diff check. The README-literal Vitest command passed 12 test files and 92 tests. These are implemented-candidate facts attributed to the reconciled Research evidence; this Plan does not represent a new test run.

## Verification and Review Gate

Final fresh independent review completed: `final-review-todo` generation 1 returned **GO** with zero P0, P1, P2, and P3 findings. It confirmed the fixed commit, MIT attribution, exact 42-path boundary, applicable SHA-256 evidence, dependency and lockfile closure, README command, bounded verification matrix, cancelled T3 gate, and live TUI/session-replay limitation. [research.md](research.md)

T8 remains pending and is limited to truthful status reconciliation and preparation of the exact selective commit. It must contain only the exact integration slice and synchronized truthful authority/status artifacts, exclude unrelated dirty hunks, and compile at the committed revision. No staging or commit was performed by this reconciliation.

## Failure, Rollback, and Limits

- Final review fails closed on pinned-source or byte-boundary drift, missing MIT attribution, dependency/lockfile scope expansion, a runner regression, evidence that the 42-path boundary is exceeded, or unsupported completion claims.
- Rollback of a later authorized commit removes only the integration slice and its required dependency/test/attribution closure, retaining attribution while copied or materially adapted code remains.
- This Plan records no commit, push, reload, deployment, or full live TUI/session replay. Official user-executed `/reload`, Pi-core changes, session mutation, and Host inventory work are outside this Plan.

## Evidence Basis

- [research.md](research.md), "Reconciled evidence" and "Negative evidence and boundaries", is the primary local reconciliation record for candidate provenance, dependency closure, validation, cancelled T3 gate, and stated limits.
- Independent review result `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/review-todo-integration-artifacts/result-1.json` establishes why final fresh review remains pending and identifies the required truthful-documentation and README-command reconciliation.

# Plan: Recovery Performance Correction

## Ordered gates

| Gate | Work | Release evidence | Status |
| --- | --- | --- | --- |
| P0 | Amend owning lifecycle/image Specs; record scope and evidence before code | Spec amendments plus Work/Context | Completed |
| P1 | Add deterministic checks using real recover/settlement paths | Three focused checks failed before the fix and passed after it (21 assertions) | Completed |
| P2 | Correct terminal recovery and shared image-cleanup ordering | Three focused checks pass; original 1,803-task reproduction performs zero manifest writes | Completed |
| P3 | Verify final implementation | 239 tests / 0 fail; typecheck passed; zero-write benchmark; independent static review found no blockers; final diff check passed | Completed |

P1 precedes P2; P2 precedes P3. Source and test changes are serialized because tests spy on shared filesystem functions.

## Implementation scope

- `src/index.ts`: preserve matching recovered terminal timestamps; skip the initial recovery write only for semantically unchanged V2 persistent state. Keep terminal settlement coalescing, Result rechecks, cleanup retries and notification replay. V1 migration and every changed intent remain durable before effects.
- `src/index.ts`: discover candidate generation names using bounded artifact-directory checks. Full image validation is still mandatory before any owned/orphan cleanup and explicit removal. Do not cache absence across operations.
- `tests/runtime.test.ts`: prove completed/failed/cancelled and synthetic terminal recovery stability, unchanged unknown fields, late Results/new tasks, candidate discovery after prior absence, and full validation for cleanup/removal. Existing security and lifecycle suites remain acceptance checks.

## Evidence boundary

Record red/green commands and operation counts, then the same diagnostic dataset timing. Timings are observations, not flaky test thresholds. Final review reports its actual independence: a separate ephemeral Pi CLI received a source/spec packet without extensions, skills, context files, tools or a persisted session. The final packet included recovery, settlement, Result reconciliation, cleanup/replay and the full image-input module; it found no blockers. It did not independently execute tests or certify unchanged delegated internals/hostile concurrent filesystem replacement. The separate image-input Work and live Herdr/provider gates are not claimed as completed by this performance correction.

# Research: pi9 Todo Integration

- Status: Non-authoritative evidence. Associated implementation candidate is implemented and validated; final fresh review completed with GO; selective commit is pending.
- Related Work: [work.md](work.md)
- Related Context: [context.md](context.md)
- Research reconciled: 2026-09-01T10:55:16Z (UTC)

> This Research records evidence and does not authorize implementation, acceptance, commit, push, reload, or deployment. It corrects historical planning claims to the validated candidate state; it does not repeat premature completion wording.

## Reconciled evidence

### Provenance and package boundary

**Facts**

- The candidate remains pinned to `Chase-C/pi9` commit `94405f79bb1e400fcba5e1b973778ef82d8378b2`; the integrated package derives from upstream `packages/todo`. [S1]
- The imported candidate boundary contains 36 package paths. Of those, 31 upstream files are byte-identical to the pinned source by SHA-256. [S1]
- The retained upstream license is MIT, including its copyright notice. [S1]
- The final package declares direct `typebox@1.3.7` and development `vitest@^4.1.6` dependencies. The necessary workspace lockfile closure is present. [S1]

**Conclusion**

The candidate is a pinned, attributable adaptation rather than an unconstrained upstream import. The dependency and lockfile changes are necessary closure for the final package and are not an unresolved dependency decision.

### Final runner and verification

**Facts**

- A Bun-native mock-runner attempt was reverted. The final test solution uses Vitest. [S1]
- The README literal command verifies the final runner: `bun --cwd packages/todo run test`. It completed 12 test files and 92 tests. [S1]
- The validated candidate also passed package typecheck, package import, the `todo` tool's eight handlers smoke check, and the recorded diff check. [S1]

**Conclusion**

The historical claim that Bun's native runner is the final verification path is stale. The supported documented command is the README literal Vitest command above; its 12-file/92-test result is the relevant test evidence.

### Final review disposition

**Facts**

- The final independent review `final-review-todo` generation 1 completed with **GO** and reported zero P0, P1, P2, and P3 findings. [S3]
- The review confirmed the fixed source, attribution, dependency and lockfile closure, 42-path boundary, and required bounded verification matrix. [S3]

**Conclusion**

T7 is complete and the candidate may proceed to T8 status reconciliation and exact selective-commit preparation. This does not claim staging or a commit.

**Limitations**

- No full live TUI/session replay was performed.
- T8 selective commit remains pending; no staging, commit, push, reload, or deployment is claimed.

### Runtime gate and scope correction

**Facts**

- The prior Host observer T3 gate was cancelled by the user and is no longer an implementation requirement. [S1]
- Earlier claims that no dependency or lockfile mutation occurred, no tests ran, the candidate remained unimplemented, or Host inventory remained a blocking gate are historical and do not describe this validated candidate. [S1]

**Limitations**

- No full live TUI/session replay was performed.
- T7 final fresh independent review is complete with GO; T8 selective commit remains pending.
- This reconciliation does not claim staging, commit, push, reload, or deployment.

## Negative evidence and boundaries

- No full live TUI/session replay evidence is available. Result: **inconclusive** for end-to-end interactive session behavior; this is a stated verification limit, not proof of a defect.
- This documentation reconciliation changes only the five Work artifacts authorized by the handoff. No README, technical source, dependency, lockfile, settings, Git index, commit, push, reload, or deployment action is performed here.
- The cancelled Host observer T3 gate must not be reintroduced as an implementation requirement absent new accepted authority.

## Source index

### Primary local evidence

- **S1** - locator: `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/review-todo-integration-artifacts/result-1.json`; title: independent todo-integration artifact review; claim: pinned upstream identity, 36-path boundary, 31 byte-identical upstream files, MIT attribution, final dependencies and lock closure, reverted Bun attempt, final Vitest runner, and validation evidence; support: review Result findings and positive verification; accessed: 2026-09-01; scope: candidate reconciliation evidence.
- **S3** - locator: `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/final-review-todo-artifacts/result-1.json`; title: final independent todo-integration review; claim: generation 1 GO with zero P0/P1/P2/P3 findings and confirmation of provenance, boundary, and verification evidence; support: Handler Result summary and report; accessed: 2026-09-01; scope: final T7 review disposition.
- **S2** - locator: `packages/pi-harness/docs/works/pi9-todo-integration/research.md` before this reconciliation; title: historical Research record; claim: stale unimplemented/no dependency/no lock/no test/Bun runner/Host-inventory assertions; support: superseded statements in the prior Research revision; accessed: 2026-09-01; scope: claims corrected by this document.

## Verification performed

- Verified local Markdown links in all five authorized documents resolve in the same Work directory.
- Verified lifecycle consistency: all five documents record T7 generation 1 GO with P0/P1/P2/P3 zero and T8 pending; all preserve the 42-path boundary and no-full-live-TUI/session-replay limitation.
- Ran `git diff --check` for the five documents and calculated their SHA-256 values after reconciliation.
- No implementation validation was rerun by this documentation-only handoff; reported candidate validation is attributed to S1 and final-review disposition to S3.

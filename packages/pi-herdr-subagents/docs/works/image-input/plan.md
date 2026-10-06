# Plan: Direct Image Input for Spawn and Resume

- **Work:** [work.md](work.md)
- **Context:** [context.md](context.md)
- **Matched executable graph:** [waves.md](waves.md)
- **Authority:** [PRD](../../prd/image-input.md), [ADR](../../adr/image-input-transport.md), [Specification](../../spec/image-input.md)
- **Outcome:** callers can submit an ordered direct `ImageContent[]` on spawn or a fresh resumed generation; the designated child initial input receives that array once through Pi's native image channel, with private generation-scoped transport and explicit failure/cleanup semantics.

## Strategy and boundaries

Keep the change at the existing runtime/child seam. `src/index.ts` owns public and tool admission, stable snapshots, generation artifact publication, launch binding, lifecycle cleanup, and model/lifecycle compatibility. `extensions/pane-child.ts` owns the designated initial-input consumer, task/generation/path validation, one-time reservation, Pi prompt integration, and child-side payload cleanup. Reuse `tests/runtime.test.ts` and `tests/pane-child.test.ts`; isolate real-process/native-Pi evidence in the intended `tests/image-input.test.ts` and `tests/image-input-worker.ts`. The delivered SDK launcher declares `jiti 2.7.0` directly for TypeScript loading. No Pi-core, manifest-schema, or Result-schema migration was required.

Validate before side effects, publish one private complete envelope atomically before launch submission, derive association from trusted task/generation launch context, and reserve consumption before awaited reads. Keep image work out of steer, continuation, terminal-barrier input, retained-session relaunch, and provider claims. Preserve existing task/Result/notification behavior and safe error redaction.

## Dependencies and sequencing

`I-SEAM` first demonstrates a package-owned designated-input association and fail-closed Pi processing boundary under the installed version; this is technical verification within the authorized scope, not another approval gate. `I-VALIDATE` then gates all image-bearing admission. `I-TRANSPORT` depends on its stable snapshot and owns publication/binding. `I-CHILD` depends on the binding contract and owns native Pi delivery. `I-CLEANUP` depends on the artifact identity and child consumption states. `I-VERIFY` depends on all runtime behavior items and I-DOCS, because package tests read README content. `I-DOCS` can update ordinary package navigation after the implementation contract is stable, but it must not alter accepted authority. `I-REVIEW` is the final independent read-only gate over the complete result and evidence.

Conflicting writes to `src/index.ts` are serialized in graph order. Child code and tests may proceed only after their prerequisite interface/binding behavior is settled. Shared authority reads do not create conflicts.

All gates **W0–W6** establish this single outcome. W0 through W5 completed with implementation, documentation, and verification evidence. The final W6 implementation review closed the remaining cleanup-commit blocker against the prior acceptance evidence; a separate evidence review checked source continuity and the later documentation updates. These complementary review scopes support the offline completion record. The current Handoff authorized the interface and its implementation. Real pane/provider, POSIX, reload, and cross-process exactly-once acceptance remain explicit environment limits.

## Completion and verification

The outcome is complete only when the graph's final review confirms: omitted/empty text-only compatibility; structural invalid-input rejection before lifecycle effects; stable ordered snapshots; atomic private envelopes and launch binding; exact task/generation association; one-time child consumption; Pi normalized valid-image evidence and explicit corrupt-image failure; cleanup across success/failure/cancel/settlement/removal/recovery; no payload/path leakage; no replay or cross-generation delivery; model and existing lifecycle compatibility; documentation links; and truthful evidence limits. No provider receipt or visual-understanding claim is required or permitted.

### Reproducible implementation checks and evidence

Run from `packages/pi-herdr-subagents/` with the existing workspace dependencies. The final offline package evidence recorded the installed Pi version, focused and full test counts, typecheck, changed-file boundary, Windows ACL and no-redirection checks, and independent text/image lifecycle probes. No real provider request was made. The earlier loader repair added the direct `jiti 2.7.0` dependency and synchronized the local installation with `bun install --frozen-lockfile --ignore-scripts`; no additional package installation was required for the final verification run.

```sh
bun test tests/image-input.test.ts
bun test tests/runtime.test.ts tests/pane-child.test.ts tests/interrupted-launch.test.ts tests/lifecycle-migration.test.ts tests/renderer.test.ts
bun run typecheck
bun test
git diff --check
```

The final package verification passed **352 tests with 0 failures and 10,011 assertions**, with `bun run typecheck` and `git diff --check` passing. Independent W6 review passed the stale-owner delayed-cleanup text/image probe, with 11/11 storage/security boundary checks and 125 assertions. The evidence covers the accepted offline package matrix, including Windows ACL and no-redirection checks. It does not establish real pane/TTY/provider delivery, provider receipt, visual understanding, POSIX behavior, reload, or cross-process exactly-once semantics.

## Risks and mitigations

- Pi `ExtensionRunner.emitInput` catches handler exceptions and continues; the delivered package therefore uses the demonstrated SDK/native initial-input seam and explicit normalization failure boundary rather than relying on a generic input-hook throw. The installed Pi version/source behavior is pinned in the evidence; future Pi upgrades require rerunning the seam and normalization checks.
- A generic first input could steal a pending envelope: the implementation uses trusted launch expectation plus a reserved designated initial-input boundary.
- Crash/cleanup races could delete live data or replay uncertain data: the implementation retains live pending handoffs, cleans only proven generation artifacts, and preserves owner/generation evidence across delayed writes and recovery.
- File and decoder errors could leak paths or bytes: failures are mapped to safe stage/index/identity diagnostics and preserve the primary lifecycle error; independent review checked the storage and privacy boundaries.

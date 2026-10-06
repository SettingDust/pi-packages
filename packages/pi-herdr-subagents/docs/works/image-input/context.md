# Context: Direct Image Input for Spawn and Resume

## Authority assessment

| Authority family | Assessment | Owning boundary and evidence |
|---|---|---|
| Product scope | **Reuse** | [PRD](../../prd/image-input.md) already accepts direct ordered images for spawn and resumed-generation initial input and defines non-goals. |
| Transport decision | **Reuse** | [ADR](../../adr/image-input-transport.md) settles private generation-scoped JSON-file transport, atomic publication, identity binding, one-time consumption, cleanup, and restart limits. |
| Normative interface/lifecycle | **Reuse** | [Specification](../../spec/image-input.md) defines fields, validation, envelope, association, Pi processing, failure/privacy contracts, cleanup, and acceptance predicates. |
| Existing lifecycle authority | **Reuse** | [Runtime lifecycle Specification](../../spec/runtime-lifecycle.md) remains authoritative for task state, recovery, Result precedence, notification, join, cancellation, removal, and terminal behavior. |
| Existing model authority | **Reuse** | [Explicit model validation Specification](../../spec/explicit-spawn-model-validation.md) remains authoritative for spawn validation order and launch flags; images do not alter model admission. |
| Existing input/barrier authority | **Reuse** | [Steer](../../spec/steer-input-submission.md), [terminal barrier](../../spec/terminal-input-barrier.md), and continuation sections retain their current text-only and settling contracts. |
| New authority | **Skip** | This preparation introduces no product, architecture, or normative choice. |
| Planning prerequisites | **Available and exercised** | Accepted authority and source evidence supported the implementation; W0 demonstrated the native initial-input/failure seam and W0–W6 are now complete for the offline package outcome. |

## Current implementation evidence

- `packages/pi-herdr-subagents/src/index.ts`: `SubagentRuntime.spawn` and fresh-generation `resume` accept optional `images?: ImageContent[]`, validate and snapshot ordered content before asynchronous effects, publish generation-private envelopes, bind launch expectations, and preserve model/lifecycle precedence. Result publication, cleanup, cancellation, removal, and recovery carry task/generation ownership checks through delayed writes and stale-owner rejection.
- `packages/pi-herdr-subagents/src/index.ts`: `createSubagentTools` exposes the optional image field on registered spawn/resume tools and forwards it through the same runtime admission path. Existing already-registered sessions still require reload to observe updated tool schemas.
- `packages/pi-herdr-subagents/extensions/pane-child.ts` and the image child path: the designated initial input validates and consumes its matching envelope once, passes native Pi image content in order, removes the payload after handoff, and fails explicitly for corrupt, unsupported, or misassociated input. Later input, steer, and continuation do not replay initial images.
- `packages/pi-herdr-subagents/tests/runtime.test.ts`, `tests/pane-child.test.ts`, and `tests/image-input.test.ts`: the final package matrix covers admission, privacy, spawn/resume, single consumption, normalization, cleanup, recovery, ownership races, and text/image lifecycle behavior. Implementation-side evidence is 352 passing tests, 10,011 assertions, typecheck, and diff checks; independent W6 evidence adds passing delayed-cleanup text/image probes and 11/11 storage/security checks.
- Local Pi `0.99.2` remains the pinned compatibility basis. `ImageContent` is `{ type: "image"; data: string; mimeType: string }`; the implementation uses Pi's native initial prompt path and explicit normalization-failure boundary. These checks establish child receipt and normalization behavior, not provider receipt or visual understanding.


## Pi source evidence

The I-SEAM fixture records inspected Pi source locations in `tests/image-input-worker.ts` under `sourceAnchors` and `sourceClaims`. Paths are relative to the resolved installed Pi package root, including `dist/core/agent-session.js`, `dist/core/extensions/runner.js`, `dist/core/extensions/types.d.ts`, `dist/utils/image-process.js`, the RPC and interactive mode files, and the adjacent `pi-agent-core`/`pi-ai` declarations. Its emitted `I_SEAM_EVIDENCE.sources` records absolute locators, source hashes, access time, claims, and matching line anchors. The final evidence demonstrates the designated SDK/native initial-input seam and explicit normalization failure behavior for the pinned Pi version. It does not prove generation binding or fail-closed behavior for future Pi versions without rerunning the checks.


## Delivered flow

1. Validate direct and tool values before spawn task allocation or resume generation increment, then snapshot accepted fields and order.
2. For a non-empty snapshot, create a private task-artifact envelope for the exact task/generation, publish it atomically, and bind an internal image expectation to the child launch without putting paths or data in argv or prompt text.
3. At the designated child initial input boundary, reserve the one consumption attempt, validate ownership and envelope identity, read the exact array, and pass it through Pi's native image channel. Later input, steer, and continuation bypass this consumer.
4. On successful validated handoff, delete transfer payloads. Launch, input, lifecycle, recovery, and removal paths perform bounded generation-owned cleanup while preserving lifecycle Result precedence and safe diagnostics.
5. Focused and complete checks passed, package documentation was reconciled, and an independent final review closed the release-blocking findings.


## Constraints and evidence limits

- Omitted and empty arrays do no image file work. Invalid present values fail explicitly and do not become omission.
- Structural validation does not prove image decoding. A separate Pi-normalization check must observe valid and corrupt fixtures; neither raw receipt nor normalized content proves provider receipt or visual understanding.
- No new image count/byte cap, model capability policy, model substitution, Resolver change, history scan, or provider receipt store is authorized.
- Private access controls, symlink/path ownership, atomic publication, cleanup idempotence, and safe error redaction must be checked within actual host limits, including Windows behavior where applicable.
- Recovery must not replay an uncertain envelope or delete a live retained child's pending handoff; a later resume gets a fresh generation envelope.

## Delivered affected paths

Primary implementation: `packages/pi-herdr-subagents/src/index.ts`, `packages/pi-herdr-subagents/extensions/pane-child.ts`.

Primary verification: `packages/pi-herdr-subagents/tests/runtime.test.ts`, `packages/pi-herdr-subagents/tests/pane-child.test.ts`, `packages/pi-herdr-subagents/tests/image-input.test.ts`, and the related worker/fixture paths. Regression inputs also include `tests/interrupted-launch.test.ts`, `tests/lifecycle-migration.test.ts`, and `tests/renderer.test.ts`.

Ordinary documentation now records the landed boundary, evidence, and limits in the package README and image-input authority/work documents. The accepted PRD, ADR, and Spec were reconciled for implementation status without changing their product or normative behavior.

## Resolved implementation questions

The implementation derives the private envelope location from existing task artifact identity and binds only a non-payload expectation through launch context. Owner/generation checks reach the actual atomic rename, so stale cleanup writes are rejected before commit while already-executed close outcomes remain retryable without repeating close. The pinned Pi seam and failure behavior are covered by the final offline matrix; future Pi upgrades require rerunning those checks.

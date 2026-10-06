# Waves: Direct Image Input for Spawn and Resume

- **Work:** [work.md](work.md)
- **Plan:** [plan.md](plan.md)
- **Graph rule:** this is the sole executable decomposition for the selected Plan. IDs are unique; predecessor references are explicit; display order is not an implicit dependency.

The gates W0–W6 establish the single Plan outcome. Every item has exactly one Handler and one Result; test evidence inside a behavior item is not a separate outcome. Only `completed` plus its required evidence releases explicit dependents. The final execution state is W0–W6 completed for the offline package boundary; W6 passed an independent read-only review. Real pane/provider, POSIX, reload, and cross-process exactly-once acceptance remain explicit evidence limits.

## Final execution record

W0 through W5 completed with implementation, documentation, and verification evidence. The final W6 implementation review closed the stale-owner cleanup-commit blocker and checked adjacent storage/security boundaries, conditional on the prior acceptance evidence remaining valid. A separate final evidence review verified current-source continuity for the complete and focused test runs and checked the later documentation updates; the implementation review did not certify those edits. The final implementation-side package run passed **352 tests, 0 failures, and 10,011 assertions**, with typecheck and `git diff --check` passing. Independent W6 probes passed for text/image stale-owner cleanup, generation isolation, automatic settlement, exactly-once close/notification within the owning runtime, and 11/11 storage/security boundaries. The evidence remains limited to the offline package and Windows host; it does not claim real pane/provider receipt, POSIX behavior, reload, or cross-process exactly-once semantics.

The graph remains the historical executable decomposition; no further implementation item is pending for this Work.

## W0 — Verify the native initial-input seam

**Items:** `I-SEAM`

**Predecessor gates:** none.

**Incremental outcome:** a reproducible package-local fixture establishes whether the installed Pi supports an unambiguous initial-input association and explicit normalization failure without Pi-core edits.

**Release predicate:** `I-SEAM` is `completed` with executable evidence of both parts of that single safe-delivery boundary. Failure to find a conforming seam blocks dependent implementation, not user authorization.

### I-SEAM — Establish a fail-closed designated-input boundary

- **Handler:** one implementation/verification Handler.
- **Scope/effects:** Build the minimal isolated native-Pi test fixture, reading the installed source and linked examples first. Demonstrate a package-owned invocation association that cannot be stolen by an early same-text/source input, and a processing boundary that prevents agent execution on actual normalization rejection. Account for `emitInput` swallowing exceptions, command/template dispatch, later extension transforms, and selected-model resize settings. Do not edit Pi core, change model identity, use provider inference, or substitute a generic first-input rule.
- **Observable completion predicate:** the fixture proves the designated initial call alone receives images and the same call cannot reach agent processing with a dropped/partially normalized image array.
- **Required evidence:** installed Pi version/source locations; valid ordered and corrupt fixtures; an early unrelated same-text event; source/command cases; a forced normalization rejection; safe count/order assertions; zero external provider calls. If no conforming extension/package seam is available, return the concrete technical blocker rather than a passing predecode-only check.
- **Prerequisites:** none.
- **Write ownership:** intended new `tests/image-input.test.ts` and `tests/image-input-worker.ts` only. Fixture-local instrumentation is not production conformance.
- **Conflicts:** later `I-CHILD` and `I-VERIFY` reuse these exact files; serialize them.
- **Result:** one safe-delivery-seam feasibility Result with its runnable check, not a new product/architecture decision.

## W1 — Admission and contract boundary

**Items:** `I-VALIDATE`

**Predecessor gates:** W0.

**Incremental outcome:** direct runtime and registered-tool image inputs have a validated, stable, ordered snapshot boundary that preserves existing model and lifecycle admission precedence.

**Release predicate:** `I-VALIDATE` Result is `completed` and evidence proves omitted/empty compatibility, invalid-value rejection before task/generation effects, ordered snapshot immutability, and schema forwarding.

### I-VALIDATE — Add direct image admission and snapshot

- **Handler:** implementation owner for `packages/pi-herdr-subagents/src/index.ts`.
- **Scope/effects:** Add optional upstream `ImageContent[]` to spawn/resume runtime inputs and the corresponding tool schemas. Validate exact object/type/data/MIME/encoding shape, reject present invalid values explicitly, snapshot fields/order before async work, and retain the existing spawn model-validation ordering, registry argument, two-argument resume compatibility, and resume guards. Do not add limits, model policy, or history discovery.
- **Observable completion predicate:** every structurally accepted non-empty call produces a stable ordered snapshot at the internal handoff seam; until W3 wires delivery, tests observe that seam and production image requests must reject explicitly rather than launch text-only, while omitted/empty calls reach the existing text-only path and every invalid direct/tool value rejects before allocation, file work, task publication, or generation increment.
- **Required evidence:** focused tests for omitted, empty, single, ordered multiple, mutated-after-admission, null/non-array/sparse/invalid entries/malformed encoding, direct untyped calls, tool schema forwarding, spawn model-error precedence, and resume generation non-mutation on rejection.
- **Prerequisites:** `I-SEAM`.
- **Write ownership:** `src/index.ts`, relevant portions of `tests/runtime.test.ts`.
- **Conflicts:** later `src/index.ts` transport/lifecycle edits; serialize with `I-TRANSPORT` and `I-CLEANUP`.
- **Result:** code change plus focused verification output and any bounded implementation limitation.

## W2 — Private publication and launch binding

**Items:** `I-TRANSPORT`

**Predecessor gates:** W1.

**Incremental outcome:** each non-empty admitted array has one private, generation-bound, atomically published envelope and an internal launch expectation that is absent on text-only launches.

**Release predicate:** `I-TRANSPORT` Result is `completed` and fault/inspection evidence proves complete-file reads, scope identity, no argv/prompt leakage, and no cross-task/generation binding.

### I-TRANSPORT — Publish and bind the generation envelope

- **Handler:** implementation owner for `packages/pi-herdr-subagents/src/index.ts`.
- **Scope/effects:** Define the internal versioned envelope from the accepted Specification; create generation-owned storage under the existing artifact scope with private host-appropriate access controls; write via a temporary file and atomic rename before child command submission; pass only trusted internal expectation context through the existing launch environment; keep image paths/data out of command arguments, prompt text, task snapshots, Results, notifications, and renderers. Keep text-only launches free of image reads/writes/expectations.
- **Observable completion predicate:** a child launch with images cannot observe a partial envelope or another task/generation's envelope, and the launch command/prompt/safe public records contain no transfer path or payload.
- **Required evidence:** fault-injected create/write/rename/launch checks, atomic-read check, concurrent task/resume isolation, host permission/path/symlink checks where supported, and argv/prompt/snapshot/Result/notification redaction assertions.
- **Prerequisites:** `I-VALIDATE`.
- **Write ownership:** `src/index.ts`, transport/publication tests in `tests/runtime.test.ts`.
- **Conflicts:** `I-CLEANUP` shares artifact ownership; `I-CHILD` consumes the binding contract. Serialize artifact naming and environment changes.
- **Result:** transport implementation plus publication/binding verification and safe error mapping evidence. This gate proves publication/binding only; it does not claim child consumption before W3.

## W3 — Child consumption and Pi integration

**Items:** `I-CHILD`

**Predecessor gates:** W2.

**Incremental outcome:** the designated generation-initial child input validates and consumes its own envelope once, then sends the exact ordered array through Pi's native image input channel.

**Release predicate:** `I-CHILD` Result is `completed` and controlled child evidence proves correct identity, single consumption, no stealing by early/later input, and separate Pi normalization behavior.

### I-CHILD — Consume once and deliver through Pi

- **Handler:** implementation owner for `packages/pi-herdr-subagents/extensions/pane-child.ts`.
- **Scope/effects:** Add the smallest child-side consumer at the actual initial-input boundary. Reserve the generation's single attempt before awaited I/O; verify trusted storage ownership, exact task ID/generation, supported envelope/version/array, and designated-input association; delete the payload after validated in-memory handoff; call Pi's native prompt/input image path without embedding data/path in text. Preserve terminal settling/settled behavior, existing nudge/completion state, steer exclusion, continuation exclusion, and explicit failure on missing/wrong/duplicate/uncertain delivery.
- **Observable completion predicate:** one controlled child generation records a safe receipt of exact count/order/identity once, later input cannot consume it, and Pi receives images as structured content while corrupt normalization becomes explicit failure rather than text-only success.
- **Required evidence:** controlled actual child-process receipt for spawn and resumed generation, at least two continuation cycles with zero image replay, racing/duplicate/early unrelated input checks, wrong scope/task/generation/untrusted path/malformed/missing envelope checks, successful payload deletion, normalized valid fixture, corrupt fixture failure, and evidence that no provider receipt claim is made.
- **Prerequisites:** `I-TRANSPORT`.
- **Write ownership:** `extensions/pane-child.ts`, `tests/pane-child.test.ts`, `tests/image-input.test.ts`, `tests/image-input-worker.ts`. If W0 proves package launcher wiring is needed, the narrowly scoped corresponding `src/index.ts` launch binding is also owned here, serialized after W2.
- **Conflicts:** existing child `input`/completion handlers and `I-CLEANUP` payload deletion semantics; preserve handler ordering and idempotence.
- **Result:** child integration plus safe receipt/normalization evidence and any explicit Pi-version limitation.

## W4 — Lifecycle cleanup and compatibility

**Items:** `I-CLEANUP`

**Predecessor gates:** W3.

**Incremental outcome:** transfer artifacts follow generation-owned cleanup across successful handoff, failure, cancellation, terminal settlement, removal, and recovery without changing existing durable lifecycle state.

**Release predicate:** `I-CLEANUP` Result is `completed` and lifecycle tests prove no leak, unsafe deletion, replay, status overwrite, or cross-generation cleanup.

### I-CLEANUP — Integrate failure, cleanup, and restart semantics

- **Handler:** implementation owner for `packages/pi-herdr-subagents/src/index.ts` and the cleanup boundary in `extensions/pane-child.ts`.
- **Scope/effects:** Extend existing launch failure, `settle`, cancellation, remove, recovery, and pending-cleanup paths to handle only proven generation-owned image artifacts. Preserve live retained child payloads, never replay/relaunch uncertain envelopes, tolerate already-absent files, retain primary errors, report cleanup failures safely, and keep session/Result/manifest/task reservation cleanup separate. Recheck task/generation eligibility across awaited work.
- **Observable completion predicate:** every specified lifecycle boundary deletes eligible transfer artifacts or reports a safe deletion failure with bounded retry eligibility, while live pending artifacts and unrelated task/generation artifacts remain intact and existing status/Result/notification precedence is unchanged.
- **Required evidence:** success, read/delivery/launch failure, cancel, terminal settlement, explicit remove, recovery of live/terminal/interrupted generations, already-absent payload, deletion failure, overlapping tasks, successive resumes, and model/lifecycle compatibility checks.
- **Prerequisites:** `I-CHILD`.
- **Write ownership:** `src/index.ts`, `extensions/pane-child.ts`, `tests/runtime.test.ts`, `tests/pane-child.test.ts`. No new persistent cleanup/receipt schema is authorized; bounded retry eligibility can be derived from owned leftover files and existing lifecycle classification.
- **Conflicts:** all prior artifact and child-state edits; serialize with `I-TRANSPORT` and `I-CHILD` ownership.
- **Result:** lifecycle integration plus cleanup/restart regression evidence.

## W5 — Documentation and complete verification

**Items:** `I-VERIFY`, `I-DOCS`

**Predecessor gates:** W4.

**Incremental outcome:** implementation evidence covers the accepted matrix and package navigation describes the landed boundary without changing authority.

**Release predicate:** both Results are `completed`; verification has no unresolved required predicate and documentation links/status are accurate.

### I-VERIFY — Run the smallest complete acceptance verification

- **Handler:** verification owner for `packages/pi-herdr-subagents/tests/runtime.test.ts` and package checks.
- **Scope/effects:** Assess coverage and run focused tests for API/tool shape, validation, snapshot, atomic transport, identity, one-time receipt, Pi normalization, privacy, cleanup, isolation/restart, model compatibility, barrier, Result, notification, join, cancel, remove, steer, and continuation. Run package typecheck and the relevant test command; inspect changed-file boundary.
- **Observable completion predicate:** all required acceptance predicates have reproducible passing evidence. A missing predicate or failing check returns partial/blocked/failed as appropriate and does not satisfy this predicate.
- **Required evidence:** test/typecheck output, changed-file list, and a safe acceptance matrix mapped to the Specification.
- **Prerequisites:** `I-CLEANUP`, `I-DOCS`.
- **Write ownership:** none; verification is read-only over the final implementation/tests. Test-process temporary files are confined to isolated fixture storage and removed. Missing coverage or regressions are findings, not permission to implement a second outcome.
- **Conflicts:** tests read package README content, so execute after I-DOCS completes; no concurrent documentation writes during verification.
- **Result:** focused verification report with pass/fail evidence and remaining limitations.

### I-DOCS — Reconcile ordinary package documentation

- **Handler:** documentation owner for package documentation/index links.
- **Scope/effects:** Update `README.md` with concise direct/runtime and registered-tool spawn/resume image usage, text-only compatibility, fresh-generation behavior, and actual evidence limits; retain its existing link-free style. Update `docs/README.md` navigation/status as necessary after the implementation boundary is stable. Do not revise PRD/ADR/Spec, add a new normative choice, or claim provider receipt. Keep documentation within the package's existing convention.
- **Observable completion predicate:** every new/changed documentation link resolves and accurately distinguishes accepted contract from implementation evidence.
- **Required evidence:** Markdown link/anchor check and changed-file inspection.
- **Prerequisites:** `I-CLEANUP`.
- **Write ownership:** `README.md` and `docs/README.md`; no code/test ownership. I-DOCS does not claim I-VERIFY results before receiving them; the independent review checks the final combined state.
- **Conflicts:** existing accepted authority edits; preserve them and avoid unnecessary churn.
- **Result:** documentation diff and link verification.

## W6 — Independent final review

**Items:** `I-REVIEW`

**Predecessor gates:** W5.

**Incremental outcome:** an independent read-only review confirms the selected outcome is complete, correctly bounded, and supported by evidence.

**Release predicate:** `I-REVIEW` Result is `completed` with no unresolved blocker across correctness, security/privacy, lifecycle, documentation, or evidence limits.

### I-REVIEW — Independently review implementation and evidence

- **Handler:** independent correctness/evidence reviewer.
- **Scope/effects:** Review the final diff, authority links, Waves Results, tests, typecheck, and safe evidence against the PRD/ADR/Spec. Check validation ordering, atomicity, identity, one-consumption association, native Pi integration, failure/cleanup/restart behavior, model/lifecycle non-regression, leakage, non-goals, and provider-claim limits. Do not modify implementation or authority.
- **Observable completion predicate:** review produces a completed Result listing findings with exact paths/lines or states that no release-blocking finding remains; any unresolved issue blocks the Plan gate.
- **Required evidence:** independent review report tied to reproducible test/typecheck and changed-file evidence.
- **Prerequisites:** `I-VERIFY`, `I-DOCS`.
- **Write ownership:** none; return the review as the single Result. Read-only over implementation, documentation, and authority.
- **Conflicts:** none; this is the final gate.
- **Result:** independent final review with findings, evidence sufficiency, and release decision.

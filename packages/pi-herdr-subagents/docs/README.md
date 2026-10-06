# @settingdust/pi-herdr-subagents Documentation

This directory owns durable authority and bounded implementation work for `@settingdust/pi-herdr-subagents`.

- `prd/`: product intent, accepted scope, outcomes, and success criteria.
- `adr/`: accepted decisions, rationale, consequences, and revisit criteria.
- `spec/`: normative behavior, interfaces, lifecycle, and failure contracts.
- `works/`: derived Work entries, Context, Plans, and Waves for one bounded delivery objective; existing Tasks remain historical records.

PRDs own product scope, ADRs own accepted decisions, and Specs own normative behavior. Work Context records settled evidence and current state; Plans and Waves derive from authority and do not create it.

## Image Input Implementation

- [Image input PRD](prd/image-input.md): accepted direct-image scope for spawn and resumed-generation initial input.
- [Image transport ADR](adr/image-input-transport.md): accepted private task/generation file transport and cleanup/restart consequences.
- [Image input Specification](spec/image-input.md): API, envelope, single consumption, privacy, failures, and acceptance authority.
- [Image input Work](works/image-input/work.md): completed implementation scope and evidence boundary; W0–W6 passed for the offline package outcome, with environment limits recorded.

The package now implements optional direct `ImageContent[]` for runtime `spawn` and fresh-generation `resume`, plus the matching registered-tool JSON field. Omitted and empty arrays preserve text-only behavior. Spawn keeps its registry as the second argument; resume keeps the two-argument form and accepts images as its optional third argument. Images belong only to the designated initial input of that generation: steer and continuation do not resend them, and the runtime does not scan parent history or rebuild original base64 from visible history.

The implementation uses a private generation-scoped envelope with atomic publication and bounded cleanup. The child consumes its own envelope once and removes the payload after the validated handoff. Current image-capable SDK bootstrap support is limited to Pi `0.99.2` and direct `jiti` `2.7.0`; an existing session must reload to receive the updated registered schema. No reload is performed here.

Available evidence is offline package evidence using an offline transport substitute, including native image spawn/resume bootstrap checks, disk resume, continuation non-replay, invalid/corrupt/non-visual failures, real Windows filesystem/ACL checks, and independent text/image lifecycle probes. It does not establish a complete real pane/TTY/provider matrix, provider receipt, visual understanding, POSIX behavior, reload, or cross-process exactly-once semantics. Full offline verification passed with 352 tests, 0 failures, 10,011 assertions, typecheck, and diff check; independent W6 review passed the remaining privacy/lifecycle checks. Provider/live/reload acceptance remains incomplete.

The image contract reuses [runtime lifecycle authority](spec/runtime-lifecycle.md) and its [ADR](adr/runtime-lifecycle-authority-reconciliation.md), [model admission](spec/explicit-spawn-model-validation.md) and its [ADR](adr/exact-explicit-spawn-model-reference.md), [steer submission](spec/steer-input-submission.md), and the [terminal input barrier](spec/terminal-input-barrier.md). [Harness backend adaptation](../../pi-harness/docs/spec/backend-adaptation.md) remains separately owned and unchanged.

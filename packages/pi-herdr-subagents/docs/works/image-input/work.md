# Work: Direct Image Input for Spawn and Resume

- **Status:** Implemented and independently reviewed; W0–W6 release predicates passed for the offline package outcome. Real pane/provider, POSIX, reload, and cross-process exactly-once acceptance remain outside the evidence.
- **Owner:** `@settingdust/pi-herdr-subagents`.
- **Objective:** Implement direct `ImageContent[]` input for spawn and resumed-generation initial prompts using private, generation-scoped file transport, while preserving existing task, model, lifecycle, and Result contracts.
- **Selected Plan:** [plan.md](plan.md)
- **Matched Waves:** [waves.md](waves.md)
- **Authority:** [Image input PRD](../../prd/image-input.md), [transport ADR](../../adr/image-input-transport.md), and [Image input Specification](../../spec/image-input.md).
- **Related owners retained:** [runtime lifecycle](../../spec/runtime-lifecycle.md), [explicit model admission](../../spec/explicit-spawn-model-validation.md), [steer submission](../../spec/steer-input-submission.md), and [terminal input barrier](../../spec/terminal-input-barrier.md).

## Scope

The selected outcome covers the public runtime and registered-tool `images?: ImageContent[]` shape, structural validation and stable snapshots, atomic private envelopes bound to task/generation launch context, child-side single consumption and identity checks, Pi-native initial prompt image delivery, cleanup and failure behavior, regression evidence, implementation-facing package documentation, and an independent final review.

Images apply only to the designated initial input for spawn and a fresh resumed generation. Omitted and empty arrays preserve the text-only path.

## Non-goals

Steer and continuation images, history scanning or replay, Resolver/Router/Harness protocol changes, model substitution or new model policy, provider receipt claims, new universal image limits, caller file paths, a new receipt queue, Pi-core changes, and implementation of any other product or authority change are excluded.

## Completion signal

The Plan outcome is complete for the accepted offline package boundary. W0–W5 implementation and verification evidence passed. The final W6 implementation review closed the stale-owner cleanup blocker and checked adjacent storage/security boundaries, conditional on the earlier acceptance evidence remaining valid. A separate final evidence review verified that the 352-test complete matrix and 267-test focused run match the current source, and checked the updated documentation, typecheck, links, and anchors. Together these reviews support the offline completion record; the implementation review alone did not certify later documentation edits. The remaining environment limits do not constitute provider or reload acceptance.

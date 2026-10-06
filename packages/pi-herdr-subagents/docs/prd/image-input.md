# Subagent Image Input PRD

- **Status:** Accepted product scope; target behavior, not an implementation-completion record.
- **Owner:** `@settingdust/pi-herdr-subagents`.
- **Acceptance source:** The supplied Handoff records the user's acceptance of a direct `ImageContent[]` interface and private-file cross-process transport.
- **Related authority:** [Transport ADR](../adr/image-input-transport.md), [Image input Specification](../spec/image-input.md).

## Problem And Actors

A caller that holds an image's actual data and MIME type needs to submit it with a delegated task's initial instructions. At the time of the initial runtime inspection, Herdr's existing runtime and tools accepted a text prompt without an image argument. The delivered boundary adds the direct image argument described below; requiring callers to encode images into prompt text or manage child-process files would make delegation depend on transport details.

The affected actors are direct runtime callers, callers of the registered `subagent_spawn` and `subagent_resume` tools, and the child Pi session that receives the task input. This scope requires no particular caller Agent, wrapper, Router, or image-selection UI.

## Desired Outcome

Callers can supply one or more images directly alongside the text prompt when starting a task or resuming it into a new generation. The child receives that generation's specified image array with its initial input, in caller order, without acquiring images from unrelated parent history or a prior generation.

A text-only caller continues to use the existing behavior by omitting images or supplying an empty array. A caller requesting images receives an explicit failure if the image input cannot be validated or delivered to the correct initial input; it must not silently receive a text-only execution instead.

## Scope

Included:

- optional direct `ImageContent[]` input for initial spawn and for a resumed generation's new initial prompt;
- multiple images in their supplied array order;
- explicit invalid-input, association, transport, and image-processing failure outcomes;
- private handling of image data and the internal transfer artifacts; and
- compatibility with the existing task, generation, model, and Result contracts.

Excluded:

- images on `subagent_steer` or automatic continuation messages;
- replay of a prior generation's input images;
- scanning parent-session history, selecting images for the caller, or introducing an image-selection tool;
- Router selection or Resolver protocol changes;
- a package-wide image-count or size limit;
- automatic selection of a visual model; and
- a promise that a provider received, accepted, or interpreted an image.

## Product Requirements

1. Both direct runtime calls and the corresponding spawn/resume tools must accept optional image objects whose data and MIME type the caller already possesses. A caller must not have to supply a file path or transport envelope.
2. Spawn images belong only to the new task's initial input. Resume images belong only to the new generation's initial input. Later steering and continuation must neither consume pending initial images nor resend consumed images.
3. Image omission and an empty array must preserve the existing text-only behavior. A present invalid value must fail explicitly rather than become omission.
4. Multiple images must retain order. Failure of any requested image or its transfer must be observable; silent dropping, partial delivery presented as full delivery, and text-only fallback are forbidden.
5. Image data and internal transfer-file information must not appear in command arguments, prompt text, package error text, or tool rendering. Passing image content through Pi's image input and its native session representation is a separate input channel.
6. Image submission must preserve the caller's model choice, the existing omitted-model behavior, and persisted resume model/thinking behavior. A non-visual model must not trigger automatic substitution. Upstream capability handling and request outcomes must be reported within their actual evidence limits.
7. Task identity, generation increments, retained session and Result semantics, notification, join, cancellation, removal, and surface lifecycle must continue to follow their existing authority.

## Success Criteria

- Direct and tool callers can submit a single image or an ordered multi-image array with spawn and with a resumed generation.
- A child-side check can establish that the correct task/generation received and validated the exact specified array once for its designated initial input.
- Omitted and empty image inputs follow the existing text-only route without image-transfer work.
- Invalid objects, missing or unreadable transfer artifacts, malformed envelopes, wrong associations, duplicate consumption, and observed image decoding/normalization failures are explicit failures with no silent text-only fallback.
- Steering, continuation, simultaneous unrelated tasks, cancellation, removal, and restart do not cause image reuse or cross-generation delivery.
- Pi-normalized image content is observed separately from the raw child-receipt check. Neither check is described as proof of provider receipt or visual understanding.

The [Specification acceptance matrix](../spec/image-input.md#acceptance) defines the technical checks for these outcomes; this PRD does not prescribe their implementation.

## Dependencies And Risks

The [runtime lifecycle authority](../spec/runtime-lifecycle.md) remains the owner of task/generation state, recovery, terminal Results, cleanup, and notifications. [Explicit spawn model admission](../spec/explicit-spawn-model-validation.md) and its [ADR](../adr/exact-explicit-spawn-model-reference.md) remain the owners of model admission and resume compatibility. [Steer submission](../spec/steer-input-submission.md) remains text-only; [child continuation](../spec/runtime-lifecycle.md#5-unlimited-child-continuation) keeps its existing fixed follow-up.

[Harness backend adaptation](../../../pi-harness/docs/spec/backend-adaptation.md) retains its current protected bindings, model pass-through, and effective-tool eligibility requirements. This PRD makes no Harness implementation or live-registration claim.

The selected model and Pi/provider image processing can impose their own constraints. Structural validation does not prove that image bytes decode successfully. Private transfer storage creates cleanup obligations and limited restart guarantees, owned by the [transport ADR](../adr/image-input-transport.md). No product decision is left open by the supplied accepted scope. Implementation and offline runtime evidence are recorded in the Work, Plan, Specification, and package documentation; real provider receipt, pane/provider, POSIX, reload, and cross-process exactly-once acceptance remain outside that evidence.

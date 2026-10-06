# ADR: Generation-Scoped Image Input Transport

- **Status:** accepted
- **Decision identity:** `herdr-generation-scoped-image-input-transport-v1`.
- **Owner:** `@settingdust/pi-herdr-subagents`.
- **Acceptance evidence:** The supplied Handoff records the user's acceptance of adding a direct image interface, using `ImageContent`, and transferring cross-process input through a file.
- **Product authority:** [Image input PRD](../prd/image-input.md).
- **Normative contract:** [Image input Specification](../spec/image-input.md).
- **Implementation status:** Implemented and independently reviewed for the offline package boundary. Real pane/provider, POSIX, reload, and cross-process exactly-once acceptance remain outside the evidence.

## Context

Herdr launches a child Pi process in a dedicated pane. The runtime owns a stable task identity, a new generation on resume, a retained session, and generation-specific Result/launch artifacts. The child extension receives task/generation context and handles Pi input, image consumption, and completion persistence. The package implementation and independent review cover the accepted offline image transport; real pane/provider delivery remains an explicit evidence limit.

A caller already holding image data needs a first-class input on spawn and resume. Images must travel with the designated initial input without being embedded in prompt text, terminal input, or command arguments. Transport must not alter the existing pane lifecycle, model policy, steering, continuation, or Harness adaptation boundary.

The accepted transport choice is a private file. It is settled for this scope; pipe/RPC is not an unresolved option.

## Decision

1. Expose optional `images?: ImageContent[]` on the public runtime and tool inputs for spawn and resume. Use Pi's `ImageContent` directly rather than defining a caller-facing attachment/path type.
2. For a non-empty image array, the parent runtime must create a private JSON input envelope for that task/generation. The envelope binds its schema version, task identity, generation, and ordered images; task-scope ownership also follows the private storage location. Its contents are internal IPC data, not the task prompt or Result.
3. Keep one generation's envelope separate from every other task/generation. Publish it atomically before child command submission. The public caller never creates, names, or passes this file.
4. The launch context must let the child establish that an envelope is expected and locate only its own envelope without placing the image file path or contents in argv or prompt text. Existing task/generation/Result context can support internal path derivation; this ADR does not add a public path parameter or prescribe a new launcher protocol.
5. The child must validate identity and contents, then consume the envelope at most once for the designated generation-initial input. Steering, later interactive/extension/RPC inputs, and automatic continuation must not consume it. Missing, invalid, wrong-generation, duplicate, or unassociable input fails explicitly instead of falling back to text.
6. Consume and clean up image transfer storage independently of durable session/Result storage. Successful handoff deletes transfer payloads once the validated array is no longer needed on disk. Launch failure, input failure, cancellation, terminal settlement, explicit removal, and safe recovery must attempt generation-owned cleanup, while preserving existing lifecycle outcomes and unrelated artifacts.
7. Do not replay an image envelope on recovery or process restart. A live retained child may finish its already-owned initial handoff; an uncertain or interrupted handoff must not be relaunched or delivered to a later input. A resumed generation requires a fresh caller-provided image array, or follows the text-only path when images are omitted/empty.
8. Child receipt/validation is the strongest guarantee of the transfer contract. Pi decoding/normalization is a separate observable stage; neither proves that a provider received images. A decoding or normalization failure must be explicit and must not be presented as successful image delivery.
9. Keep the existing model identity and thinking policy. Images do not trigger model substitution, resume revalidation, new registry policy, or a Router/Resolver selection change.

The [Specification](../spec/image-input.md) owns field shapes, failure semantics, privacy, concurrency, cleanup, and acceptance predicates.

## Rationale

- A private file carries the accepted `ImageContent[]` across the existing parent/child process boundary while retaining dedicated Herdr panes and native Pi sessions.
- Keeping image data out of argv and terminal submission avoids command-length, quoting, terminal-entry, and accidental display problems. Public callers remain independent of those mechanisms.
- Task/generation binding and one initial consumption prevent stale image replay into resumed executions, steering, or child continuation.
- Reusing the existing identity and lifecycle boundary is smaller than adding a second execution transport or changing model selection to accommodate attachments.
- Separate receipt and normalization evidence avoids claiming delivery stages that the file handoff cannot observe.

## Alternatives And Scope Choices

The Handoff supplies the selected file transport; it supplies no benchmark or completed prototype comparison. The following are boundary comparisons, not claims of historical experiments:

- **RPC/pipe transport:** Not selected. It would require another managed channel, framing, process wiring, and recovery semantics beside the existing pane launch. A future change can reconsider it if file lifetime or host constraints become unacceptable.
- **Image/base64 data in argv, prompt text, or terminal input:** Excluded by the accepted privacy and initial-input contract. It would also couple data size and content to shell/terminal transport.
- **Caller-provided file paths:** Not selected. The caller already holds actual `data` and `mimeType`; handing storage management to callers would replace the accepted direct image API.
- **Parent history discovery or prior-generation replay:** Excluded. It cannot establish that the caller selected that exact array for this generation.

## Consequences

### Positive

- Spawn and resume share a direct image vocabulary that Pi already exposes.
- Image transfer follows the current task/generation ownership boundary and leaves the pane execution transport intact.
- Ordered multi-image input is independent of CLI/terminal quoting and length.
- Wrong-association and processing failures have explicit contracts.

### Negative And Operational

- Raw image data is temporarily stored on disk. Private directories/files, exclusive creation, atomic publication, and generation-bounded cleanup are required. POSIX mode bits alone do not prove Windows privacy; the implementation must use the applicable filesystem access controls.
- Parent and child need an unambiguous initial-input association and one-consumer boundary. File presence or a generic first `input` event alone is insufficient.
- Abrupt process loss can leave orphaned files. Cleanup must distinguish a live retained child's pending handoff from a terminal/interrupted generation before deleting payloads. There is no cleanup daemon or unrestricted temporary-directory scan.
- Temporary transfer files are not a durable input queue. Crash-safe exactly-once delivery, independent competing processes, cross-machine recovery, and replay from retained session images are not guaranteed.
- File I/O, parsing, cleanup, Pi decoding, and model/provider constraints can fail. Diagnostics must not echo payloads, paths, or raw exceptions containing them.
- Pi's inspected `0.99.2` prompt-normalization path can omit an image that fails processing and append a hint. Merely injecting images into an input hook is therefore insufficient to establish the target's explicit-failure contract. Implementation needs focused evidence for that boundary without changing Pi core in this scope.

No new unified count/byte cap is selected. Existing operating-system, Pi, model, and provider limits retain their actual failure behavior and must not be misreported as successful receipt or provider acceptance.

## Compatibility And Authority Relationships

This decision adds image input only. It does not supersede the [runtime lifecycle ADR](runtime-lifecycle-authority-reconciliation.md) or [runtime lifecycle Specification](../spec/runtime-lifecycle.md): stable identity, generation increments, Result precedence, recovery without relaunch, notification, join cancellation, and surface cleanup remain owned there. Temporary image payload deletion does not authorize deletion of retained sessions, Results, manifests, or launch artifacts.

The [exact-model ADR](exact-explicit-spawn-model-reference.md) and [model admission Specification](../spec/explicit-spawn-model-validation.md) continue to control explicit initial-spawn admission and persisted resume flags. A non-visual model does not cause an image-driven model rewrite.

[Steer submission](../spec/steer-input-submission.md), [continuation](../spec/runtime-lifecycle.md#5-unlimited-child-continuation), and the [terminal input barrier](../spec/terminal-input-barrier.md) retain their current authority. The barrier still handles settling/settled input before image work; the image contract applies only to a designated active generation-initial input.

[Harness backend adaptation](../../../pi-harness/docs/spec/backend-adaptation.md) remains unchanged. This decision introduces no Handoff field, protected binding, Resolver image discovery, Router selection protocol, or image-driven candidate selection.

## Revisit Criteria

Revisit this distinct transport decision if private-file access cannot be enforced on the host, transfer-file cleanup becomes unacceptable, child initial-input association cannot be made reliable, simultaneous cross-process owners must be supported, or durable replay/cross-machine recovery becomes required. A requirement for images on steering/continuation, automatic visual-model selection, a caller path API, or a new universal resource cap also requires separate accepted authority. None of those is a pending choice in this ADR.

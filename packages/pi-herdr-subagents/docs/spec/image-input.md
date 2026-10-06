# Subagent Image Input Specification

- **Status:** Accepted and implemented contract; the offline package implementation and independent W6 review are complete. Real pane/provider, POSIX, reload, and cross-process exactly-once acceptance remain outside the evidence.
- **Owner:** `@settingdust/pi-herdr-subagents`, spawn/resume initial image input and its internal parent-to-child file handoff.
- **Product authority:** [Image input PRD](../prd/image-input.md).
- **Decision:** [Generation-scoped image transport ADR](../adr/image-input-transport.md).

## Authority And Observed Baseline

The supplied Handoff authorized direct `images?: ImageContent[]` inputs and private task/generation file transport as accepted behavior. The implementation and review below reconcile that contract with the current offline package evidence. They do not claim effective registration in an already running Pi session, provider receipt, or completion of the listed environment-limited acceptance.

Inspected repository evidence:

| Source | Observed fact / scope |
| --- | --- |
| [Runtime](../../src/index.ts), `SubagentRuntime.spawn`, `resume`, and private `start` | Spawn and fresh-generation resume accept optional ordered images, validate and snapshot them before asynchronous admission, publish generation-scoped private envelopes, bind the launch, and preserve existing model/lifecycle precedence. Result publication and cleanup retain owner/generation checks across cancellation, removal, recovery, and delayed writes. |
| [Tool adapter](../../src/index.ts), `createSubagentTools` | Registered spawn/resume schemas expose the optional `images` field and forward it to the same runtime validation. Existing registered sessions still require reload to observe updated schemas. |
| [Child extension](../../extensions/pane-child.ts) and image child path | The designated initial input consumes the matching envelope once, validates identity and native Pi-normalized content, removes the payload after handoff, and fails explicitly on corrupt/non-visual/association errors. Later input and continuation do not replay initial images. |
| [Runtime and child tests](../../tests/runtime.test.ts), [image tests](../../tests/image-input.test.ts) | Offline package tests cover admission, transport privacy, spawn/resume, single consumption, normalization, cleanup, recovery, ownership races, and text/image lifecycle behavior. Final implementation evidence is 352 passing tests, 10,011 assertions, typecheck, and diff checks; independent W6 evidence adds passing delayed-cleanup text/image probes and 11/11 storage/security checks. |

The locally inspected Pi coding agent and Pi AI are `0.99.2`. Pi AI's `dist/types.d.ts`, `ImageContent`, declares the three fields shown below. Pi coding agent's `dist/core/extensions/types.d.ts`, `InputEvent`/`InputEventResult`, exposes optional `images`, sources `interactive`/`rpc`/`extension`, and a `transform` result. Its `dist/core/agent-session.js`, `_runInputHandlers`, `_normalizePromptImages`, and `prompt`, applies input transformations before image normalization. A failed `processImage` result can be omitted with a text hint. These are source observations, not an IPC run, and do not replace the older version-specific model-admission authority.

## Public Inputs

Use the upstream type directly:

```ts
import type { ImageContent } from "@earendil-works/pi-ai";

// Upstream field shape, reproduced for the JSON tool boundary:
// { type: "image"; data: string; mimeType: string }

type SpawnImageInput = {
  agent: string;
  prompt: string;
  label: string;
  taskSlug?: string;
  model?: unknown;
  thinking?: string;
  cwd: string;
  parentSessionFile?: string;
  images?: ImageContent[];
};

// Target runtime signatures; bodies are not supplied here.
// spawn(input: SpawnImageInput, registry?: SpawnModelRegistry): Promise<SubagentTask>
// resume(subagentId: string, prompt: string, images?: ImageContent[]): Promise<SubagentTask>
```

`spawn` must preserve its invocation-local registry as the second argument. `resume` must retain the two-argument text-only call and add only the optional third image argument; it must not add model overrides or registry admission.

The tool inputs must retain their existing fields and add optional `images` with the same item shape:

```ts
type SpawnToolInput = {
  agent: string;
  prompt: string;
  label: string;
  taskSlug?: string;
  model?: string;
  thinking?: string;
  images?: ImageContent[];
};

type ResumeToolInput = {
  subagentId: string;
  prompt: string;
  images?: ImageContent[];
};
```

Existing prompt/label minimum lengths, Agent enum, task-slug runtime validation, model error adaptation, and task snapshot outputs remain governed by their current contracts. The image array must be an optional JSON array of objects with `type: "image"`, string `data`, and string `mimeType`. The adapter must forward that array to runtime validation; schema validation alone is insufficient for direct, untyped, or mutated-schema calls.

Only absent/`undefined` and `[]` mean no images. `null`, non-arrays, sparse arrays, and arrays containing invalid entries must fail, never become omission. `data` must hold base64-encoded image bytes rather than a file path, URL, or data-URI wrapper. `mimeType` must be a non-empty image MIME type. The caller owns the choice and source of the actual bytes; Herdr must not discover them from a parent transcript, file-selection UI, or previous generation.

## Validation And Admission

Herdr must validate every entry as a non-null, non-array object whose `type` is exactly `"image"`, `data` is a non-empty string, and `mimeType` is a non-empty image MIME string. Missing/wrong-typed fields, inaccessible field values, and malformed encoding must fail explicitly. It must not stringify invalid caller objects or expose their values in errors.

A successful permissive base64 decode, non-zero buffer length, or matching `image/*` label does not prove that bytes constitute a decodable image or match the MIME type. Actual decoder/normalizer rejection must be reported explicitly. The package must not claim full image validity based only on the three-field structural check.

The runtime must take a stable snapshot of validated image fields and array order before asynchronous handoff work so later caller mutation cannot change an admitted envelope. It must not trim/rewrite data, reorder entries, or silently discard a failed entry. Pi's later normalization is a separate stage and may produce different data/MIME values; those differences must not be described as raw-transfer corruption without evidence.

Initial spawn must retain [model-validation precedence and side-effect-free rejection](explicit-spawn-model-validation.md#4-ordered-validation-algorithm). Image structural rejection must occur before task-ID allocation, image-file writes, task publication, or surface creation. Resume must retain the existing task/status/operation guards; invalid image input must not increment generation or overwrite the prior manifest/session/Result.

No new universal image-count, byte-size, MIME allowlist, model-capability admission table, or automatic model selection is specified. Actual filesystem, Pi, decoder, selected-model, and provider limits must remain explicit failures within their observed boundary.

## Internal Envelope And Association

A non-empty admitted array requires one private UTF-8 JSON envelope with this owned shape:

```ts
type ImageInputEnvelopeV1 = {
  version: 1;
  subagentId: string;
  generation: number; // positive integer, equal to the launched generation
  images: ImageContent[]; // non-empty, in caller order
};
```

This is internal IPC, not a public path/envelope argument, Result schema, manifest migration, receipt queue, or image-history index. The producer must emit the fields above. The consumer must reject unsupported versions, missing/invalid fields, malformed JSON, and invalid image arrays.

The file must belong to the current task scope and task artifact directory, with a generation-specific location determined by the parent/child implementation. Its location must be derivable or privately communicated without putting the image-file path, envelope contents, or image data in command arguments or prompt text. An internal layout may derive the sibling image-file location from the existing Result path and generation; public callers must never choose it.

Launch context must independently distinguish an image-bearing initial input from text-only input. File presence alone cannot do this: a missing expected file must fail, whereas a text-only launch must not search for or consume a leftover file. The internal expectation marker/location agreement must be verified with the producer; this contract leaves its spelling and file basename implementation-owned.

Before delivery, the child must check both storage ownership and envelope identity against its trusted launch context: task scope, exact `subagentId`, and exact generation. It must reject another task's file, an earlier/later generation, an untrusted path, a symlink/redirection outside its owned storage, or an association it cannot establish. Identity strings inside an arbitrary file alone do not establish scope ownership.

## Input Source And Single Consumption

| Input route | Image-envelope behavior |
| --- | --- |
| New spawn's designated generation-1 initial prompt | Consume that generation's admitted array once. |
| Resume's designated new-generation initial prompt | Consume only the fresh array supplied with this resume. |
| Spawn/resume with omitted or empty images | Existing text-only input; no image envelope read, write, or expectation. |
| `subagent_steer` | Existing text submission; do not consume or resend initial images. |
| Fixed child continuation / later input | Do not consume or resend initial images. |
| Input during `settling`/`settled` | Existing terminal barrier handles it synchronously before image work. |

The `pane-child` consumer integrates at the generation-initial Pi input boundary before agent processing, preserves the initial text supplied by the launcher, and supplies the validated array through Pi's image input channel. It must not append base64, a path, or an envelope to text. The initial-input array is the exact supplied array, without merging in discovered historical images.

The implementation must associate the designated initial input with that launch. A generic first `input`, source label alone, matching text alone, or an `agent_end` is not proof of that association. Pi's source labels describe provenance; none authorizes a later `interactive`, `rpc`, or `extension` input to consume a pending envelope. If another input arrives first, it must not steal the array; if the designated association cannot be established, report failure rather than delivering images to that other input.

The child must reserve its single-consumption attempt before asynchronous reading/validation/delivery so concurrent callbacks cannot attach the same array twice. A second attempt to consume the same generation envelope must fail explicitly; ordinary later input must simply bypass the initial-image consumer. It must not retry attachment after an uncertain first delivery or treat leftover files as a new initial input.

The [terminal barrier](terminal-input-barrier.md) continues to own `settling`/`settled` input and first-successful-Result behavior. Image consumption does not change `subagent_done`, continuation timers, or the completion state machine. A barrier-window input must perform no image-file I/O, attachment, or new turn.

## File Lifetime And Cleanup

The parent runtime owns transfer-file creation and failure cleanup; the child owns its validated initial consumption and post-consumption payload deletion. The parent remains responsible for unconsumed leftovers after the generation ends. Both must restrict cleanup to proven image-transfer artifacts of the relevant task/generation.

| Boundary | Required image-file behavior |
| --- | --- |
| No images / structural rejection | No transfer file or image expectation. |
| Non-empty admitted input | Create private storage with exclusive ownership; write and atomically publish the complete envelope before child command submission. A child must never parse a partially written file. |
| Successful validated handoff | Delete the published payload and write/claim temporaries once the validated array is available in memory and no longer needed on disk. Do not defer successful-path deletion until task removal. |
| Write, publication, launch, read, parse, identity, or delivery failure | Report the primary failure; attempt cleanup of that generation's owned partial/published transfer files. Never continue that image request as text-only. |
| Cancellation or terminal settlement | Prevent further initial delivery and clean up owned pending image payloads; preserve existing terminal state/Result precedence and surface/notification rules. |
| Resume | Use a fresh generation-specific envelope only for its new array. Never read/reuse a prior generation's file or images. |
| Explicit removal | Include generation-owned transfer leftovers in the existing task-artifact removal boundary; do not widen removal to unrelated temporary storage. |
| Parent recovery while a retained generation is running | Do not delete a file that the live owning child may still need. Preserve normal running adoption without relaunch or attachment replay. |
| Recovery of terminal/interrupted generation | Clean proven orphaned image-transfer artifacts after lifecycle classification; never revive/replay the initial prompt. |

Files and directories must use private access controls appropriate to the host. POSIX private modes and applicable Windows ACLs must be checked within their actual platform limits; do not claim protection against every process running as the same OS principal. Creation/read/cleanup must not follow caller-selected or untrusted filesystem redirections.

Cleanup must be safe when the file is already absent and must not delete another task/generation's active payload. Failure to delete must be reported with safe diagnostics and remain eligible for a later bounded cleanup/removal operation. A cleanup failure must not rewrite an established task Result/status or be presented as a new model/transport success. Preserve the original input/launch error and report any additional cleanup failure separately. No new daemon, timeout policy, unbounded retry, or global temporary-directory sweep is required.

Recovery cleanup must separate candidate discovery from destructive authorization. For a validated task layout, discovery may check the artifact directory itself for redirection and enumerate its entry names without reading image payloads. When no eligible generation candidate and no retained publication-cleanup ownership exists, ordinary settlement/recovery must bypass recursive image-storage and private-access checks. Discovery is not permission to consume or delete a file: before invoking an owned cleanup or orphan cleanup, retain the full scope/ancestor, generation, inode, redirection, and access checks. Explicit removal must retain full storage validation even without candidates, because it subsequently deletes retained artifacts. Discovery must run again on later bounded operations; absence is not a permanent cache. Live current-generation payloads remain child-owned and prior-generation orphan cleanup remains eligible. [Recovery performance Work](../works/recovery-performance/work.md) records the bounded implementation and evidence.

Transfer files are a short-lived exception to retained task artifacts. Their deletion does not authorize deletion of session files, Results, manifests, launch artifacts, or task reservations, which remain governed by [runtime lifecycle](runtime-lifecycle.md#3-persistent-task-recovery).

## Concurrency And Restart Limits

Each task/generation must have independent transfer storage. Overlapping tasks, successive resumes, delayed callbacks, cancellation, and recovery must not bind one array to another generation. Operations must retain their owning generation throughout awaited work and recheck eligibility before initial delivery or cleanup.

This contract follows the lifecycle authority's single owning runtime per task scope. It requires local single-consumption and cleanup coordination, not a distributed lock or crash-proof exactly-once handoff between competing child processes.

A retained running child may continue its already-owned initial handoff when the parent restarts; recovery must not initiate another one. After child-process loss, the runtime must not relaunch or replay a pending/possibly consumed envelope. Missing/uncertain expected input is an explicit failure if that generation attempts input; lifecycle recovery otherwise retains its own existing classification. A later resume is a new generation and requires its own caller input. Pi's cumulative retained session may still contain earlier image messages; that native history is not a source for automatic new input or a guarantee of image deletion from session storage.

## Failures, Privacy, And Evidence

Failures must distinguish the relevant stage without exposing image data or storage details:

| Condition | Required observable result |
| --- | --- |
| Invalid runtime/tool image array or entry | Reject before image/lifecycle admission effects; no conversion to omission. |
| Transfer creation/publication or launch failure | Reject/report through the existing launch-failure path, retain the original cause category safely, and clean owned files. |
| Expected file missing, unreadable, unparsable, or unsupported | Explicit initial-input failure; no agent processing of that request as text-only. |
| Wrong scope/task/generation, untrusted location, duplicate consumption, or initial-input association failure | Explicit input failure; zero attachment to the wrong/later input. |
| Any image decoding/normalization failure | Explicit processing failure; do not silently drop the entry, treat partial input as complete, or continue the requested input as text-only. |
| Cleanup failure | Explicit safe cleanup diagnostic, preserve original lifecycle outcome/error, and retain bounded cleanup eligibility. |
| Selected model/provider does not support or accept images | Preserve model identity and report actual upstream behavior; no substitution and no provider-receipt claim. |

Pre-admission rejection must not manufacture a Result or notification. A failure detected after admitted child launch must stop that initial request and use the existing generation failure/Result/settlement mechanism, without overwriting an already authoritative Result, adding an image receipt store, or inventing another task-status machine. Returning a queued/running task from spawn/resume proves only the existing launch boundary, not child image receipt.

Raw image data, envelope contents, and image-transfer paths must not appear in argv (including Herdr/Pi/bootstrap arguments), text prompts, parent task snapshots, completion notifications, package error text, tool results, or renderers. Diagnostics must use safe stage/identity/index information rather than raw I/O/JSON/decoder exceptions, data fragments, or filesystem paths. The direct tool input necessarily carries the caller's image data; this contract does not claim to erase host-managed call arguments or Pi's native image session content.

Herdr must enforce basic object/envelope validation. Actual image decoding/normalization failures must be surfaced rather than hidden by a successful structural check or permissive base64 decoding. For the inspected Pi `0.99.2` path, input-hook injection alone cannot prove this: normalization can omit failed images and add text hints. Conformance needs a verifiable failure boundary for the actual Pi version used. The delivered package-owned SDK seam supplies that boundary, as recorded in the acceptance evidence below; the stock input hook alone remains insufficient. This contract does not authorize Pi-core changes.

An isolated child-receipt check may prove exactly the bound task/generation, item count, order, and validated raw array. It must not print payloads/paths as its evidence. A separate check must observe Pi's normalized user-message image content and any processing failures. Neither establishes provider request payload, provider acceptance, or visual understanding; a successful model reply alone is also insufficient.

## Compatibility And Non-Goals

The [runtime lifecycle ADR](../adr/runtime-lifecycle-authority-reconciliation.md) and [Specification](runtime-lifecycle.md) remain the owners of state, recovery, Result persistence/precedence, join, cancellation, terminal notification, surface cleanup, and removal. Images do not create a generation, change task identity, or alter continuation outside the existing spawn/resume boundary.

The [model ADR](../adr/exact-explicit-spawn-model-reference.md) and [model Specification](explicit-spawn-model-validation.md) retain model-validation precedence and the exact initial-spawn flags. Resume adds optional images only: no registry read/revalidation, no model override/migration, and no change to its persisted combined model/thinking flag behavior. Omitted model still selects the child default; images do not infer the parent model or choose a visual one.

[Steer submission](steer-input-submission.md) retains `{ subagentId, message }` and atomic text submission. [Continuation](runtime-lifecycle.md#5-unlimited-child-continuation) retains its fixed text follow-up and timers. Native child image facilities outside this initial-envelope contract are not turned into Herdr steer/continuation image APIs.

[Harness backend adaptation](../../../pi-harness/docs/spec/backend-adaptation.md) retains protected prompt/model/thinking/Agent bindings, effective-tool eligibility, raw launch evidence, and Router-owned Result interpretation. This contract adds no Harness/Handoff field, image discovery, candidate policy, or routing protocol.

No caller attachment paths, image-selection tool, parent history scan, provider-delivery guarantee, unified resource cap, new receipt/queue, or runtime behavior outside the implemented spawn/resume boundary is included in this authority.

## Acceptance

The following acceptance matrix records the required evidence for the implemented contract. The offline package and independent W6 review satisfy the covered predicates; environment-limited items remain explicit evidence limits below.

| Predicate | Smallest appropriate evidence |
| --- | --- |
| Direct and registered-tool shape | Runtime/tool checks for omitted, empty, single, and ordered multi-image spawn; equivalent fresh-array resume with retained two-argument compatibility. |
| Validation and admission | Direct/untyped and tool checks for `null`, non-arrays, sparse arrays, invalid entries/type/data/MIME/encoding; prove no image files or task/generation mutation on rejection, and retain model-error precedence. |
| Snapshot and transport identity | Mutate the original caller array after admission; verify the child's raw validated snapshot, order, version, scope, task, and generation remain the admitted values. |
| Real single-consumption boundary | A controlled child process reads the actual private envelope for spawn and resumed-generation initial inputs exactly once; later input, steer, and at least two continuation cycles cannot consume/replay it. No provider request is required to prove this receipt predicate. |
| Association failures | Missing/unreadable/malformed/unsupported envelope, wrong scope/task/generation, redirected path, early unrelated input, duplicate/racing consumption, and lost association all fail explicitly without wrong-input or text-only delivery. |
| File publication and privacy | Fault-injected creation/write/publication failures; atomic-read checks; applicable host permissions; prove no image data/envelope/path in argv, prompt, safe errors, snapshots, results, notifications, or rendering. |
| Cleanup | Successful consumption, launch/input failure, cancel, terminal settlement, remove, already-absent file, and deletion failure; retained durable artifacts and another task/generation's live file remain intact. |
| Isolation and restart | Overlapping tasks and resumed generations retain isolated arrays; recovery does not delete a live child's pending file, relaunch an interrupted child, or replay possibly consumed images. |
| Pi processing | Separately observe normalized image items for valid fixtures and explicit failure for corrupt bytes or normalization rejection; structural acceptance and a permissive base64 decode are not sufficient. Pin the Pi version/source behavior used. |
| Model and lifecycle compatibility | Omitted/default model, exact explicit-spawn admission, persisted resume model/thinking flags, non-visual model without substitution, terminal barrier, Result/notification/join/cancel/remove, steer, and continuation retain their owning contracts. |
| Evidence limits | Receipt evidence contains only safe association/count/order/check outcomes; normalized-content evidence is separate and makes no provider-receipt claim. |

The implementation and acceptance evidence are now complete for the offline package boundary. The final package verification passed 352 tests with 0 failures and 10,011 assertions; typecheck and `git diff --check` passed. Independent W6 review passed text/image delayed-cleanup probes and 11/11 storage/security checks. Evidence is limited to the offline transport substitute, Windows host checks, and local runtime; it does not establish real pane/TTY/provider delivery, provider receipt, visual understanding, POSIX behavior, reload, or cross-process exactly-once semantics.

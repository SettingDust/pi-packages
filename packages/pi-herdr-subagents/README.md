# @settingdust/pi-herdr-subagents

An independent Herdr-backed Pi subagent runtime. It registers `subagent_spawn`, `subagent_resume`, `subagent_steer`, `subagent_inspect`, `subagent_join`, `subagent_cancel`, and `subagent_remove`.

Use `/subagent-open` in the interactive parent session to select one eligible terminal task per row and open its cumulative retained session in a new Herdr tab. The picker shows the task's current generation as metadata, not historical transcript identity; repeated opens create independent tabs. Success means Herdr accepted the tab and the launcher accepted the `pi --session <retained-sessionFile>` command, not that Pi acknowledged loading it. The opened session remains native Pi state and may be written or migrated by Pi.

The runtime owns child Pi sessions, Herdr tabs and panes, stable `subagentId` values, generation-specific private Result files, and Agent discovery. `subagent_spawn` requires an `agent` name from its dynamically generated local-registry enum and resolves that Agent locally; no Agent path or body crosses the tool boundary. The caller supplies `prompt`, an independent human-readable `label`, a canonical `taskSlug`, and optional exact `model` and `thinking` settings. Calls may be direct or forwarded by a caller-owned tool wrapper using the same inputs; no fixed Agent name or caller protocol is required. Child session files live under the parent Pi session's `tasks/` directory and are reused across resumed generations; projects without a parent session fall back to `.pi/subagent-sessions/tasks/`.

Each reserved `<subagentId>-artifacts/` directory contains an atomically updated `task.json`. Before registering tools, the runtime rebuilds tasks from the current parent session's task root, accepts only generation-matched Result files, and positively verifies non-terminal panes with `herdr pane get`. Recovery never relaunches a retained running pane. After terminal state and cleanup intent are durable, the runtime closes the generation's accepted Herdr tab while retaining its session, Result, manifest, and launch artifacts; those files and their ID reservation remain until `subagent_remove` explicitly deletes them.

Within a child Pi process, an unfinished Agent turn receives one delayed follow-up in its existing session. Each later unfinished turn repeats that continuation until `subagent_done` writes the Result; there is no attempt limit or deadline. Pending follow-ups are cancelled while input or agent/session lifecycle activity is in progress. The final result text uses the caller/Agent-required format and is opaque to this runtime; it is not required to be YAML or any other fixed schema. Submit the complete text once through `subagent_done` without separately repeating it after successful submission. If that tool is unavailable, a final assistant response alone does not record successful runtime completion; the bootstrap records a child exit without a Result as failure.

Within the parent session, model-facing guidance is notification-first. `subagent_spawn` starts a background execution without waiting for completion. When the effective registered tool contract and available resources permit it, a caller may successively launch independent, authorized, nonconflicting tasks before waiting for terminal completion notifications. The caller owns preparation, authorization, and conflict checks. Do not routinely poll `subagent_inspect` or wait with `subagent_join`. Source changes do not update tools already registered in existing sessions; the current effective contract governs each call.

Direct image input is available on the designated initial input for `spawn` and on a fresh generation created by `resume`. The runtime uses the upstream `ImageContent[]` shape and keeps the invocation-local model registry as `spawn`'s second argument:

```ts
import type { ImageContent } from "@earendil-works/pi-ai";

const images: ImageContent[] = [
  { type: "image", data: "<base64 image bytes>", mimeType: "image/png" },
];

await runtime.spawn({
  agent: "worker", cwd, prompt: "Inspect this image", label: "image check", taskSlug: "image-check", images,
}, registry); // registry remains the second argument
await runtime.resume(subagentId, "Compare this new image", images);
```

Omit `images` or pass `[]` for the existing text-only path. A resume array belongs only to that new generation. `subagent_steer`, fixed continuation, and later input do not resend initial images; the runtime does not scan parent history or reconstruct original base64 from visible history. Registered tools accept the same optional field in their JSON shape:

```json
{"agent":"worker","prompt":"Inspect this image","label":"image check","taskSlug":"image-check","images":[{"type":"image","data":"<base64 image bytes>","mimeType":"image/png"}]}
{"subagentId":"image-check","prompt":"Compare this new image","images":[{"type":"image","data":"<base64 image bytes>","mimeType":"image/png"}]}
```

The runtime validates and snapshots the array before asynchronous admission. It publishes one private, generation-specific envelope under the task artifact directory with exclusive access and atomic publication. The designated child consumes its own envelope once, deletes the payload after the validated in-memory handoff, and never puts image data or its private path in the prompt, task snapshot, Result, notification, or renderer. Launch, read, identity, normalization, cancellation, settlement, removal, and recovery failures use the existing failure/cleanup paths; a retained live child keeps a pending handoff, and uncertain input is never replayed. Structural acceptance does not prove image decoding, provider receipt, or visual understanding.

The image-capable SDK bootstrap is currently tied to Pi `0.99.2` and the package's direct `jiti` `2.7.0` dependency. Existing Pi sessions keep their already registered tool schemas; reload the package/session to see the image field. This documentation does not perform that reload.

The available evidence is offline package evidence: native image spawn/resume bootstrap checks, two continuation cycles without replay, non-visual-model and corrupt-image failures, real Windows filesystem/ACL checks, and independent text/image lifecycle probes. The transport is an offline substitute, so there is no completed real pane/TTY/provider matrix and no provider-receipt or visual-understanding claim. Full offline verification passed: 352 tests, 0 failures, 10,011 assertions, typecheck, and diff check. Independent W6 review passed the remaining privacy and lifecycle checks. Provider/live/reload/POSIX/cross-process acceptance remains incomplete.

Use `subagent_inspect` only for an explicit non-blocking snapshot; a terminal snapshot includes available result text. Use `subagent_join` after a terminal notification, or when an immediate full Result is explicitly necessary; cancelling its caller wait, including ESC, affects only that wait, while `subagent_cancel` remains the explicit task-cancellation operation. Terminal notifications are summary-only and at-least-once in the current parent branch; they neither include the result body nor prove caller processing. Display-only markers without supported correlation do not acknowledge delivery. The deterministic two-active runtime regression uses independently controlled fake transport; it does not prove live caller behavior or real Herdr resource availability.

It does not own caller handoff/result semantics, scheduling, retries, queues, worktrees, or conflict detection.

Enable this package as the delegation environment. It cannot coexist with another extension that registers the same `subagent_*` tools.

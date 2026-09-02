# Task-Derived Subagent ID Specification

## 1. Scope

This specification defines task-derived `subagentId` allocation and allocation-failure observability for the `@settingdust/pi-herdr-subagents` parent runtime and the Router-to-runtime interface that supplies it.

A Router derives a concise ASCII `taskSlug` from the concrete Handoff execution, supplies it to `subagent_spawn`, and supplies the independent human-readable `label`. For example:

```text
taskSlug: fix-steer-submit
label: Repair steer input submission
```

The Router owns semantic derivation. The runtime owns only validation, collision resolution, artifact reservation, compatibility recovery, and stable allocation-failure reporting. The runtime must not derive a slug from `prompt`, `label`, Agent instructions, or any other free text, and must not generate `subagent-N` or adjective-noun IDs for a new task.

This specification does not change Handoff fields, Handler Result semantics, Router scheduling, Agent discovery, generation behavior, or Herdr pane lifecycle.

## 2. Terms

- **task slug:** Router-provided canonical ASCII identifier for the concrete task before collision suffixing.
- **subagent ID:** Stable task identity. It equals the task slug when available, otherwise the task slug plus its collision suffix.
- **legacy ID:** A pre-existing `subagent-<positive decimal integer>` identity. Legacy IDs are recovery-compatible only.
- **artifact directory:** `<tasksDir>/<subagentId>-artifacts/`; its successful exclusive creation is the allocation reservation.
- **task scope:** The `tasks/` directory derived from the parent session or the no-parent-session fallback.
- **allocation error:** A stable `TaskIdAllocationError` emitted for a task-slug validation, candidate-exhaustion, or ordinary filesystem-reservation failure.

## 3. Canonical Task Slug

A task slug must satisfy all of the following:

1. It is 3 through 48 ASCII characters.
2. It matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
3. It does not start with the reserved legacy prefix `subagent-`.

Consequently, a task slug is lowercase, begins and ends with an ASCII letter or digit, has no whitespace, punctuation, path separators, dots, underscores, control characters, or non-ASCII characters, and has no consecutive hyphens. `fix-steer-submit` and `con` are valid; `Fix-steer-submit`, `fix--steer`, `fix-steer-`, `subagent-12`, and `../fix` are invalid. `con` is valid because generated artifact and session components append non-device suffixes (`con-artifacts` and `con-g1.jsonl`); no generated path component is a Windows reserved device name.

The runtime must reject an invalid or missing task slug before it creates a tab, pane, artifact directory, manifest, session file, result file, or launch script. It must report the stable `invalid_task_slug` allocation error defined in section 4.1. It must not lowercase, trim, replace characters, collapse hyphens, transliterate, or otherwise silently convert an invalid slug into a different semantic ID.

The 48-character limit, plus the longest allowed `-100` collision suffix, bounds a newly generated ID at 52 ASCII characters. Its generated artifact-directory and session-file basenames are therefore Windows path-safe, assuming the existing task-root path itself is usable by the runtime.

## 4. Allocation And Reservation

`subagent_spawn` must require a `taskSlug` in addition to its existing required `agent`, `prompt`, and `label` inputs. Its success result must expose the final `subagentId`, not merely the requested slug.

For one spawn in one task scope, the allocator must evaluate at most 100 candidates in this order:

```text
<taskSlug>
<taskSlug>-2
<taskSlug>-3
...
<taskSlug>-100
```

For each candidate, the allocator must consider it unavailable when either its generation-one session path already exists or its artifact directory already exists. To allocate an available candidate, it must create `<tasksDir>/<candidate>-artifacts/` as a non-recursive directory creation. A successful creation is the atomic reservation and selects that candidate as `subagentId`. An `EEXIST` result is a collision and must advance to the next candidate. Any other filesystem failure while preparing the task scope or reserving a candidate must fail the spawn with the stable `filesystem_reservation_failed` allocation error, without substitution.

If no candidate is reserved within 100 attempts, the runtime must fail with the stable `task_id_exhausted` allocation error. It must not wrap, reuse a retained reservation, switch to a numeric or random ID, or create a tab or pane.

The artifact directory remains reserved across terminal task states, runtime reconstruction, and recovery. A launch failure after reservation also retains it, consistent with retained task artifacts. `subagent_remove` must remove the task's artifact directory and generation-one session file. After all of those artifacts are removed, a later runtime process may reserve the unsuffixed slug again. This reusability is contingent on explicit removal; it does not rename or overwrite retained tasks.

Concurrent runtime instances targeting the same task scope may attempt the same slug. The artifact-directory creation is the arbitration point: exactly one successful contender receives each candidate, and losing contenders retry the next suffix. No process-local counter may determine task-derived ID uniqueness.

### 4.1 Allocation Failure Contract

The runtime must expose every allocation failure from direct `SubagentRuntime.spawn()` calls and from `subagent_spawn` execution as an exported `TaskIdAllocationError`. Tool-schema validation must not replace this contract with an unstabilized error for a missing or invalid `taskSlug`.

`TaskIdAllocationError` must have the stable class name `TaskIdAllocationError`, a stable `code`, and the exact stable `message` shown below. Callers and tests may branch on the class and `code`, and may compare the message exactly. They must not depend on operating-system error text.

| Condition | `code` | `message` | `cause` |
| --- | --- | --- | --- |
| Missing or invalid task slug | `invalid_task_slug` | `Invalid task slug.` | Not required. |
| All 100 candidates unavailable | `task_id_exhausted` | `Task ID allocation exhausted.` | Not required. |
| Any non-`EEXIST` filesystem failure while preparing the task scope or reserving a candidate | `filesystem_reservation_failed` | `Task ID filesystem reservation failed.` | Must retain the original filesystem error object for diagnostics. |

An `EEXIST` collision is not a `filesystem_reservation_failed` failure. It advances to the next candidate and becomes `task_id_exhausted` only after all 100 candidates are unavailable. All three errors must occur before tab or pane creation. The implementation may include diagnostic detail elsewhere, but it must not alter the stable class, code, or message contract.

## 5. Manifest Versions, Paths, Results, And Environment

Version 2 is the canonical manifest format. Every newly allocated task manifest must be written as V2. Version 1 is readable only as a recovery and migration input; the runtime must not create a V1 manifest for a new task. Supported V1 input includes both legacy numeric identities and canonical task-derived identities. When recovery or a later lifecycle transition persists a validated V1 record, it must write V2 while retaining that task's identity, `taskSlug` presence or absence, and retained paths exactly.

The identity fields owned by this specification are:

```ts
type PersistedTaskIdentityV2 = {
  version: 2;
  subagentId: string; // final allocated ID or retained legacy ID
  taskSlug?: string;  // required for canonical task-derived IDs; absent for legacy IDs
};
```

For a newly allocated canonical task, `taskSlug` is required and must satisfy section 3. Its `subagentId` must equal `taskSlug` or `taskSlug-<n>` where `n` is an integer from 2 through 100 with no leading zero. The manifest validator must reject a V2 canonical-ID manifest that violates this relation or whose session/artifact paths do not match its final `subagentId`.

A V2 record produced by migration must preserve the validated V1 identity form exactly. A migrated V1 legacy record retains its exact legacy ID and omits `taskSlug`. A migrated V1 canonical record retains its exact canonical `subagentId` and exact `taskSlug`; the relation in the preceding paragraph remains required. Both are format migrations only: they must not rename artifact directories, session files, Results, IDs, allocate a new slug or suffix, or silently add or remove `taskSlug`. The remaining V2 lifecycle fields are owned by the [Subagent Status Widget Specification](running-status-widget.md), section 3, and the persisted lifecycle obligations remain owned by the [Subagent Runtime Lifecycle Specification](runtime-lifecycle.md), section 3.

Generation-one session storage, generation-specific Result storage, generated launch files, `PI_HERDR_SUBAGENT_ID`, Result identity validation, completion notifications, renderers, `subagent_inspect`, `subagent_join`, `subagent_steer`, `subagent_cancel`, and `subagent_resume` must use the final `subagentId`. `subagent_resume` must retain both the final ID and its original session file; it must not allocate a new slug or suffix. `label` remains the independent full task description and must not be replaced by the slug.

## 6. V1 Compatibility And Recovery

A supported V1 manifest is readable recovery and migration input only and has one of two identity forms:

- **V1 legacy:** `version: 1`, an exact `subagent-<n>` ID where `n` is a positive decimal integer without a leading zero, and no `taskSlug`.
- **V1 canonical:** `version: 1`, a canonical `taskSlug` satisfying section 3 and a `subagentId` satisfying the exact slug-or-suffixed relationship in section 5.

Recovery must not rename either form's artifact directory, session file, Result, ID, or slug. If recovery or a subsequent lifecycle operation persists a validated record, it must write V2: V1 legacy retains the same legacy ID and no `taskSlug`; V1 canonical retains the same canonical `subagentId` and exact `taskSlug`.

Recovery must discover both legacy artifact directories and canonical artifact directories. A directory is eligible only when its name and manifest form a valid supported identity:

- V1 legacy: an exact legacy ID with a valid V1 legacy manifest;
- V1 canonical: a valid canonical final ID with a matching V1 `taskSlug`;
- V2 migrated legacy: an exact legacy ID with no `taskSlug`; or
- V2 canonical: a valid canonical final ID with a valid `taskSlug` relationship from section 5.

Malformed, unsupported, or mismatched records must be ignored safely and must not cause recovery to adopt a pane, expose a task, or alter retained files. Recovery continues to verify terminal Results and retained running panes using the final ID exactly as it does today.

Legacy notification parsing must continue accepting legacy IDs, including V2 records that retain such IDs after migration. New canonical IDs must be accepted in notifications only when they satisfy the canonical final-ID form. The notification payload remains summary-only and retains its existing shape.

## 7. Router And Tool Contract

The Harness Router must derive one concrete task slug directly from each Handoff before `subagent_spawn`. It must use the Handoff objective and settled execution context to select concise action-and-subject words, and must pass the resolved prompt, model, thinking, `agent: "handler"`, `taskSlug`, and independently useful `label` to the runtime. The Router must not ask the runtime to infer semantics and must not use random adjective-noun names.

`resolve_delegation` continues to validate and serialize the existing Handoff schema; `taskSlug` is an invocation field derived after resolution, not a Handoff field. The Router prompt and the spawn tool schema must make this division explicit.

The spawn call renderer may show the `label` and Agent as today. The spawn-result renderer must show the final allocated `subagentId`; it must not imply that an unsuffixed requested slug was always allocated. Existing renderers and lifecycle tools must accept both supported ID forms.

## 8. Non-Goals

This work does not introduce random names, semantic parsing in the runtime, task queues, global cross-scope IDs, an ID database, Handoff schema fields, automatic cleanup, automatic retry after exhaustion, or renaming of existing tasks. It authorizes only the supported V1-to-V2 manifest-format migrations defined in sections 5 and 6; it does not authorize an identity, artifact, Result, slug, or path migration.

## 9. Acceptance

The implementation satisfies this specification when focused checks demonstrate all of the following:

- Router guidance derives and passes `taskSlug` separately from `label`, while `resolve_delegation` retains the existing Handoff schema.
- The spawn tool requires `taskSlug`; valid slugs retain their exact value as the initial final ID, and invalid or missing slugs perform no artifact or Herdr side effect.
- Invalid or missing slugs fail with `TaskIdAllocationError`, code `invalid_task_slug`, and the exact stable message `Invalid task slug.` rather than an environment-dependent validation message.
- Boundary-valid and boundary-invalid lengths, pattern violations, the reserved prefix, and Windows-path-sensitive characters are checked without silent normalization.
- An existing artifact directory or generation-one session produces `-2`, then `-3`; an occupied candidate cannot be overwritten.
- Two concurrent runtime instances in the same task scope receive unique ordered candidates through directory reservation.
- Exhausting all 100 candidates fails before tab or pane creation with `TaskIdAllocationError`, code `task_id_exhausted`, and the exact stable message `Task ID allocation exhausted.`; it does not fall back to a numeric or random ID.
- An ordinary non-`EEXIST` filesystem failure before reservation fails before tab or pane creation with `TaskIdAllocationError`, code `filesystem_reservation_failed`, exact message `Task ID filesystem reservation failed.`, and the original filesystem error retained as `cause` without asserting its platform-specific text.
- New task manifests use V2 with the final ID and exact `taskSlug`; the V2 identity, lifecycle, session-path, Result-path, launch-artifact, environment, notification, renderer, resume, and remove behavior remains consistent with the final ID and labels remain full descriptions.
- Restart recovery restores a retained canonical task, including a running pane and a terminal Result, without relaunch or ID change.
- Supported V1 manifests are read for recovery only; a persisted migration writes V2 without renaming artifacts, sessions, Results, notifications, recovery, resume, or removal behavior. V1 legacy retains the same legacy ID and absent `taskSlug`; V1 canonical retains the same canonical ID and exact `taskSlug`.
- After explicit removal deletes a task's artifacts and session, a restarted runtime can allocate the unsuffixed task slug again.
- Package typecheck, the full package test suite, and a fresh correctness review pass.

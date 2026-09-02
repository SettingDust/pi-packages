# Parent Workspace Pinning Specification

- **Status:** Accepted; implementation complete
- **Review disposition:** The user accepted the #14 workspace-pinning Plan. Implementation and the required real Herdr acceptance are complete. Two independent final reviews, including the post-remediation review, found no executable correctness defects.
- **Scope:** `packages/pi-herdr-subagents`
- **Decision:** [Parent workspace ownership and pinning ADR](../adr/parent-workspace-pinning.md)
- **Related lifecycle authority:** [Subagent Runtime Lifecycle Specification](runtime-lifecycle.md)

## 1. Purpose And Authority Boundary

This Specification defines the accepted runtime safety contract for how a Herdr-backed parent process selects and verifies the Herdr workspace in which it creates child tabs and panes. It does not reconcile or rewrite the historical chronology recorded by the related lifecycle authority and ADR.

The existing lifecycle Specification remains the owner of task persistence, recovery state precedence, generation identity, terminal notification, and child continuation. This Specification owns only the parent workspace target used by Herdr tab creation and the compatibility boundary around that target.

No new PRD is applicable. The user-visible delegation outcome and package product boundary do not change.

## 2. Terms And Surfaces

- **parent workspace:** The Herdr workspace containing the parent Pi process and identified by `HERDR_WORKSPACE_ID` in its managed process environment.
- **captured target:** The immutable workspace identity captured when the concrete Herdr transport is constructed.
- **create surface:** The tab and root pane returned by one `herdr tab create` operation.
- **explicit pane identity:** The `result.root_pane.pane_id` returned by the Herdr tab-create response. Generic `id` fields or guessed pane collections are not substitutes.
- **non-Herdr environment:** A process without a usable `HERDR_WORKSPACE_ID` at concrete transport construction.
- **unsupported create contract:** Herdr explicitly rejects the `--workspace` option as unavailable, or a successful create response cannot provide all required string fields `result.tab.tab_id`, `result.tab.workspace_id`, and `result.root_pane.pane_id`. A generic command failure is not classified as unsupported without that evidence.
- **response-rejected surface:** A tab-create command returned a response containing a candidate surface, but target or identity validation failed before the surface could be adopted or launched.
- **response cleanup:** The one best-effort close of an explicitly returned root pane after response rejection. It is operational cleanup, not successful surface adoption.

The implementation surfaces are the `HerdrTransport`/`createHerdrTransport` boundary and their fake transport and Herdr-client tests in `tests/runtime.test.ts`. The generic `@settingdust/pi-herdr` client remains a transparent arbitrary-argument CLI client and is outside this contract.

## 3. Parent Workspace Identity

1. The production concrete transport must read `HERDR_WORKSPACE_ID` at transport construction time and retain the captured value for later creates.
2. Construction must not throw solely because the managed environment has no target or has an unusable target. The concrete transport remains loadable in a non-Herdr process; `createTab` performs the delayed fail-closed rejection when a Herdr surface is actually requested.
3. The transport must capture that value once. Later changes to the process environment, Herdr foreground focus, current directory, or session file must not change the target of the existing transport.
4. A captured value is usable only when it is a non-empty string containing more than whitespace. The value must be passed and compared exactly as captured; the transport must not trim, normalize, infer, or rewrite it.
5. An implementation may expose an explicit transport-target option for deterministic fake-host tests. The normal parent extension path must use the managed environment value, and an explicit option must not silently fall back when it is present but invalid.
6. The runtime must never derive a workspace target from `cwd`, the parent session path, a task ID, a tab ID, a pane ID, a label, a prefix, the currently focused workspace, or a best-effort workspace listing.

## 4. Tab Creation Contract

For every `createTab` call that can create a child execution surface:

1. The captured target must be present and usable before any Herdr command is executed. A missing or invalid target must reject locally.
2. The concrete Herdr client must include the target in the tab-create arguments using Herdr's workspace option:

   ```text
   herdr tab create --workspace <captured-target> --cwd <cwd> --label <label> --no-focus [--env NAME=VALUE ...]
   ```

   The existing environment propagation remains intact. `--workspace` must be supplied for every create operation; omitting it is not a permitted fallback.
3. The response must contain the explicit tab identity `result.tab.tab_id`, the explicit tab workspace identity `result.tab.workspace_id`, and the explicit root pane identity `result.root_pane.pane_id`.
4. The transport must require exact equality between `result.tab.workspace_id` and the captured target. A missing, empty, normalized-different, or different workspace identity is a failure.
5. The transport must return the tab ID and root pane ID only after all required identities and the workspace invariant pass. The returned root pane ID must be the explicit `root_pane.pane_id`; no generic response ID or guessed pane is allowed.
6. If response validation rejects a response and it contains a non-empty explicit `result.root_pane.pane_id`, the transport must make one best-effort `pane close` call for that exact pane ID before returning the primary failure. If cleanup succeeds, the primary failure remains unchanged. If cleanup fails, the primary classification and reason token remain primary and the cleanup failure is retained only as diagnostic detail. If no explicit root pane ID is available, no cleanup command is possible through this bounded transport and no tab or pane identity may be guessed.
7. The child launch command may run only after `createTab` has returned a validated surface. A rejected response, including one whose cleanup failed, must never be used for `pane run`, result transport, steering, or task adoption.

The Herdr command argument shape is owned by `@settingdust/pi-herdr-subagents`; `@settingdust/pi-herdr` must continue to forward arbitrary arguments without adding workspace policy.

## 5. Fail-Closed Behavior

The following conditions must fail closed before child execution. For every local fail-closed rejection, the required reason token must appear in the thrown `Error.message`; callers that persist or propagate the existing launch failure must retain that message. The implementation may choose the local Error class and surrounding diagnostic text, but it must not replace or hide the token.

| Condition | Required reason token | Required behavior |
| --- | --- | --- |
| No target was provided by the managed environment or explicit test option | `parent_workspace_missing` | Reject `createTab` before invoking Herdr. Do not use foreground/default context. |
| A target was provided but is empty or whitespace-only | `parent_workspace_invalid` | Reject `createTab` before invoking Herdr. Do not normalize or retry with the environment or foreground context. |
| Herdr explicitly rejects `--workspace` as unsupported, or a successful create response lacks any required string field `result.tab.tab_id`, `result.tab.workspace_id`, or `result.root_pane.pane_id` | `parent_workspace_contract_unsupported` | Reject the response, perform the bounded response-cleanup rule when an explicit root pane ID is available, and do not retry without `--workspace` or with a legacy response interpretation. |
| The returned tab workspace differs from the captured target | `parent_workspace_mismatch` | Reject the surface, perform the bounded response-cleanup rule when an explicit root pane ID is available, do not launch a child in it, and do not adopt its IDs as a successful task surface. |
| The Herdr command fails without evidence that the workspace contract is unsupported | existing Herdr command failure | Preserve the existing command failure path; do not add a foreground retry or relabel an unrelated command failure as unsupported. |

A response-rejected surface is never a successful task surface. Cleanup is one best-effort close of the explicit returned root pane, when present; cleanup does not authorize retry, tab discovery, or a second close attempt. A cleanup failure does not replace the primary workspace reason token.

A `SubagentRuntime.start` failure after task allocation remains a retained failed task under the existing lifecycle authority. It must not allocate a replacement surface, change task identity, or silently become a foreground/default create. The failed task's existing error propagation must preserve the transport `Error.message`, including its workspace reason token.

## 6. Lifecycle Compatibility

- **Spawn:** A new generation must create its tab in the immutable target captured by the transport. No child launch occurs when target capture or response validation fails.
- **Resume:** Resume retains the existing task identity and session file as defined by the lifecycle Specification, but its new tab creation uses the current transport's captured parent target. Missing or invalid target rejects the resumed generation before child launch.
- **Restart and recovery:** A restarted parent transport captures `HERDR_WORKSPACE_ID` again at its new construction. Recovery must adopt valid persisted task records and retained explicit pane IDs without creating a new tab or re-homing a retained pane. Recovery must not derive or repair a workspace from `cwd`, session data, or foreground focus. A restart in a different managed workspace is a new transport ownership context for future spawn/resume operations; it does not rewrite old task artifacts.
- **Existing pane lifecycle:** `run`, `sendText`, `closePane`, and `paneExists` continue to operate on the persisted explicit pane ID. This change does not add workspace guessing, tab discovery, or a manifest migration.
- **Artifacts:** `task.json`, session paths, generation Result paths, notification payloads, and subagent IDs do not gain a workspace field in this bounded change. Workspace ownership is transport construction state, not task identity.

## 7. Non-Herdr And Version Compatibility

In a non-Herdr environment, transport construction remains loadable even when `HERDR_WORKSPACE_ID` is absent or unusable; extension loading, registry discovery, task inspection, and recovery retain their existing behavior. Operations that require creation of a new Herdr tab, including spawn and resume, must reject at `createTab` with the missing or invalid-target reason rather than using a foreground or default workspace. Injected fake transports used by unit tests are not required to read the real process environment, but their target and response checks must exercise the same invariant.

A Herdr version that does not support `tab create --workspace`, does not return `tab.workspace_id`, or does not return the explicit nested identities required above is incompatible with this runtime contract. The runtime must expose the unsupported-contract failure and must not downgrade the command. The generic `@settingdust/pi-herdr` package does not add version negotiation or workspace emulation.

## 8. Invariants And Non-Goals

The runtime must preserve these invariants:

- every new Herdr tab-create request has one explicit captured parent workspace target;
- the target is captured once per concrete transport and is not foreground-sensitive;
- a successful returned tab proves exact workspace equality before a child is launched;
- returned tab and root pane IDs come from the explicit Herdr response fields;
- missing, invalid, unsupported, and mismatched target conditions never fall back to `cwd`, session, foreground workspace, or ID/prefix inference;
- response rejection performs only the bounded explicit-root-pane cleanup and never turns cleanup into successful adoption or retry;
- existing task identity, generation, recovery, Result, notification, steering, and removal contracts remain unchanged except for create failure propagation.

This Specification does not add a workspace registry, workspace discovery, tab reparenting, cross-workspace migration, a new `@settingdust/pi-herdr` abstraction, retry logic, or a persistent workspace field. It does not authorize Herdr mutations during documentation preparation.

## 9. Acceptance Conditions

Focused fake-client and fake-transport checks must demonstrate:

1. construction captures a supplied parent workspace target once and a later environment change does not change it;
2. `createTab` includes `--workspace` with the captured target and preserves `--cwd`, `--label`, `--no-focus`, and environment arguments;
3. a valid response requires `result.tab.tab_id`, exact `result.tab.workspace_id`, and `result.root_pane.pane_id`, and returns the explicit IDs;
4. missing and invalid target values reject before any Herdr call;
5. omitted workspace support, missing response identity, and returned workspace mismatch reject with the corresponding stable token in `Error.message`; response rejection performs at most one best-effort close of an explicit returned root pane and never permits `pane run` or successful task-surface adoption;
6. construction with no usable target remains loadable and defers missing/invalid failure until `createTab`, while `createTab` rejects before any Herdr call;
7. spawn and resume failure paths retain existing task lifecycle semantics, preserve the workspace token in the propagated error message, and do not create a foreground fallback;
8. restart/recovery adopts retained explicit panes without creating or re-homing tabs, while new resume creation uses the newly captured target;
9. the generic `@settingdust/pi-herdr` client remains unchanged and arbitrary CLI args still pass through;
10. a controlled real Herdr acceptance run demonstrates the parent in workspace `wF` creates its child tab/root pane in `wF` even while `w8` is manually foregrounded, and records no child launch from a tab created in `w8`;
11. package typecheck, the full package tests, a real `wF -> w8` regression acceptance record, and a fresh independent review pass.

## 10. Completion Evidence And Limits

The user explicitly accepted the #14 workspace-pinning Plan before implementation. The implementation is complete, and the required controlled real Herdr `wF -> w8` gate passed; its observed Herdr version, parent and foreground workspace state, explicit tab/pane identities, child results, and cleanup outcomes are retained in [the acceptance record](../works/parent-workspace-pinning/evidence/real-herdr-acceptance.json).

The final reported verification passed package typecheck, the full package test suite with 52 tests and 274 expectations, acceptance-evidence JSON parsing, and `git diff --check`. Two independent final reviews, including a review after remediation, found no executable correctness defects.

The real Herdr gate is completed evidence for the recorded managed environment and Herdr version. Independently reproducing it still requires a managed parent workspace, a distinct foregroundable workspace, Herdr mutation and cleanup permission, and a child-capable Pi environment. The shared dirty worktree still requires selective staging and commit admission; this reconciliation neither stages nor commits any implementation or documentation change.

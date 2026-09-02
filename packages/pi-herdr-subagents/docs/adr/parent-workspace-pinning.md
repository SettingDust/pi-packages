# ADR: Parent Workspace Ownership And Pinning

- **Status:** Accepted; implementation complete
- **Review disposition:** The user accepted the #14 workspace-pinning Plan. Implementation and the required real Herdr acceptance are complete. Two independent final reviews, including the post-remediation review, found no executable correctness defects.
- **Date:** 2026-08-19
- **Scope:** `packages/pi-herdr-subagents`
- **Authority:** [Parent Workspace Pinning Specification](../spec/parent-workspace-pinning.md)
- **Related authority:** [Runtime Lifecycle Authority Reconciliation](runtime-lifecycle-authority-reconciliation.md)
- **Derived Work:** [Parent Workspace Pinning Context](../works/parent-workspace-pinning/context.md)

## Context

Before the #14 implementation, the concrete `@settingdust/pi-herdr-subagents` transport created Herdr tabs with `--cwd`, `--label`, and `--no-focus`, but without an explicit workspace target. First-party Herdr 0.8 research confirmed that `tab create` accepts `--workspace <WORKSPACE_ID>` and returns `result.tab.workspace_id`, alongside `result.tab.tab_id` and `result.root_pane.pane_id`. Without the explicit option, creation followed Herdr's foreground/default context.

The incident evidence supplied for this Work says the parent belonged to workspace `wF` while `w8` was manually foregrounded; the observed symptom was that the child surface followed `w8`. The cancelled subagent and diagnostic task are execution history only. This ADR records the confirmed workspace symptom, not any unverified causal detail beyond the omitted target and Herdr contract.

The safety concern is an ownership invariant: a parent-managed child must be created in the parent workspace. This is distinct from the existing lifecycle Spec's task persistence and pane recovery boundary, but it intersects spawn and resume tab creation. It also affects compatibility behavior when Herdr cannot prove the target.

Construction must remain compatible with non-Herdr parent processes. Missing or unusable workspace input is therefore retained as transport state and rejected only when `createTab` is requested; loading the extension, discovering Agents, inspecting tasks, and recovering retained panes must not fail merely because no Herdr workspace is available.

## Decision

The accepted decision pins each concrete Herdr transport to the parent workspace identity captured from `HERDR_WORKSPACE_ID` at construction. Construction remains loadable with a missing or unusable value; every Herdr tab creation must pass the captured value through `--workspace` and validate it at the create boundary. A successful create response must prove exact equality through `result.tab.workspace_id` and must return the explicit nested tab and root-pane IDs.

Missing, invalid, unsupported, or mismatched target evidence fails closed. Unsupported means Herdr explicitly rejects the workspace option or a successful create response lacks one of the required string fields. An unrelated Herdr command failure remains on the existing command-failure path. Every local workspace rejection exposes its required reason token in `Error.message`; the existing runtime failure propagation must retain that message.

When response validation rejects a response containing an explicit non-empty `result.root_pane.pane_id`, the transport makes one best-effort `pane close` call for that exact pane before returning the primary failure. A cleanup failure remains diagnostic and does not replace the primary classification or token. If no explicit root-pane ID exists, no cleanup identity is guessed. No rejected surface may be launched, adopted, retried, or used for steering.

Workspace ownership remains transport construction state. It is not added to task identity, persisted manifests, Result artifacts, or the generic `@settingdust/pi-herdr` client. Existing pane operations continue using explicit persisted pane IDs. Restart captures the environment again for future create operations; recovery adopts retained panes without creating or re-homing them.

This ADR is a new distinct decision lifecycle rather than an amendment to the retrospective runtime-lifecycle ADR. The lifecycle ADR remains the owner of its historical chronology and existing recovery/notification/continuation decisions.

## Rationale

- Herdr's explicit workspace argument is the supported first-party control surface.
- Capturing the managed parent environment once prevents foreground focus from silently changing ownership after transport construction.
- Deferring invalid-target failure until `createTab` preserves non-Herdr extension loading without weakening the create-time invariant.
- Checking the returned workspace closes the gap between requested and actual placement.
- Stable tokens in `Error.message` make fail-closed classification observable through existing runtime error propagation.
- Closing only an explicitly returned root pane provides bounded cleanup using the existing transport capability without inventing tab discovery or a new cleanup API.
- Keeping the policy in `@settingdust/pi-herdr-subagents` preserves the generic CLI client's low-level forwarding role and avoids introducing a new adapter layer.
- The change is a separate runtime safety/ownership contract, so hiding it in the lifecycle Spec would make ownership and chronology less clear.

## Alternatives Considered

The following alternatives are grounded in the supplied first-party research and current implementation evidence:

1. **Continue using foreground/default workspace.** Rejected because the confirmed `wF` parent / `w8` foreground symptom demonstrates that foreground context is not a reliable parent-ownership source.
2. **Infer the target from cwd, session file, task ID, tab ID, pane ID, label, prefix, or workspace listing.** Rejected because none is the authoritative parent workspace identity and inference can silently select the wrong workspace.
3. **Pass `--workspace` but trust the returned tab without checking `workspace_id`.** Rejected because request intent alone does not prove the created surface's ownership.
4. **Treat every failed Herdr create command as unsupported.** Rejected because unsupported classification requires explicit option rejection or a successful response with an incompatible shape; unrelated command failures must retain their existing semantics.
5. **Add workspace policy to `@settingdust/pi-herdr`.** Rejected because the generic client already forwards arbitrary arguments and has no runtime parent-workspace ownership context.
6. **Persist workspace identity in task manifests or migrate/re-home existing panes.** Rejected for this bounded fix because workspace ownership belongs to the transport context and recovery must preserve existing explicit pane lifecycle semantics.
7. **Invent tab discovery or a new cleanup abstraction for rejected responses.** Rejected because the existing bounded capability is one explicit root-pane close; no identity may be guessed when the response does not provide it.

## Consequences

### Positive

- New child tabs have an explicit, verifiable parent-workspace target.
- Foreground workspace changes cannot redirect future creates made by an existing transport.
- Unsupported or ambiguous Herdr responses fail before child launch and expose a stable token through the existing error path.
- A response-rejected root pane receives one bounded best-effort cleanup attempt when its explicit ID is available.
- Existing lifecycle artifacts and generic CLI boundaries remain stable.
- The real acceptance gate directly tests the incident shape: parent in `wF`, foreground in `w8`.

### Negative And Operational

- Spawn and resume require a managed environment with a usable `HERDR_WORKSPACE_ID`; non-Herdr execution cannot create a child surface through this transport, although construction and non-create operations remain loadable.
- The runtime becomes incompatible with Herdr versions that lack the workspace option or returned workspace identity; silent downgrade is prohibited.
- A response mismatch or unsupported response may leave a surface if the explicit root-pane cleanup fails, and may leave an untracked surface when no root-pane identity is returned. The runtime must preserve the primary failure and must not claim cleanup succeeded without evidence.
- Real acceptance mutates Herdr state and therefore is a mandatory, separately recorded gate after authority acceptance. Documentation preparation itself performs no Herdr mutation.
- A parent restart in a different workspace does not re-home recovered panes; operators must treat that as a new creation context.

## Revisit And Supersession

Revisit this ADR if Herdr changes workspace identity semantics, removes or renames `--workspace`, stops returning `result.tab.workspace_id`, introduces an authoritative parent-workspace API, or if the runtime needs cross-workspace migration, persisted task ownership, or re-homing. A future ADR must supersede this record if workspace ownership moves from transport construction to a durable task or parent-session authority.

## Acceptance State

The user explicitly accepted the #14 workspace-pinning Plan before implementation. The implementation is complete. The required controlled real Herdr `wF -> w8` acceptance passed and is retained in [the Work evidence record](../works/parent-workspace-pinning/evidence/real-herdr-acceptance.json). The record distinguishes observed runtime evidence from the earlier incident chronology.

The final reported verification passed package typecheck, the full package test suite with 52 tests and 274 expectations, acceptance-evidence JSON parsing, and `git diff --check`. Two independent final reviews, including a post-remediation review, found no executable correctness defects.

This acceptance record is evidence for its recorded managed environment and Herdr version, not a substitute for an independently reproduced real-Herdr gate in a different environment. The shared dirty worktree still needs selective staging and commit admission. No commit is asserted or created by this status reconciliation.

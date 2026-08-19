# Parent Workspace Pinning Context

- **Status:** Accepted; implementation complete; Work reconciliation complete
- **Verification disposition:** The user accepted the #14 Plan. The required real Herdr acceptance passed, and two independent final reviews found no executable correctness defects.

## Objective

Reconcile the #14 accepted authority and derived Work package with the completed workspace-pinning implementation. This status-only update creates no source implementation, test changes, package metadata changes, Herdr tabs, panes, state mutations, staging, or commits.

## Authority Map

- [Parent Workspace Pinning Specification](../../spec/parent-workspace-pinning.md) owns the normative target, identity, invariant, failure classification, cleanup, compatibility, and acceptance contract.
- [Parent Workspace Ownership And Pinning ADR](../../adr/parent-workspace-pinning.md) records the accepted architecture and rationale.
- [Plan](plan.md) and [Tasks](tasks.md) are derived execution material and do not create authority.
- [Runtime Lifecycle Specification](../../spec/runtime-lifecycle.md) remains the owner of task persistence, recovery precedence, generation identity, terminal notification, and child continuation.
- [Runtime Lifecycle Authority Reconciliation ADR](../../adr/runtime-lifecycle-authority-reconciliation.md) remains unchanged and preserves its retrospective chronology.
- `packages/pi-herdr/src/index.ts` remains the owner of generic arbitrary-argument CLI forwarding and was not changed by #14.

## First-Party Evidence Baseline

The pre-implementation research result `subagent-63` verified Herdr 0.8 help/schema: `tab create --workspace <WORKSPACE_ID>` and `TabCreateParams.workspace_id`. Herdr-managed parent panes expose `HERDR_WORKSPACE_ID`, `HERDR_TAB_ID`, and `HERDR_PANE_ID` to their processes. Before #14, the concrete runtime omitted `--workspace` and did not validate returned workspace ownership. The completed implementation now captures the parent target once, passes it to tab creation, validates the explicit returned workspace/tab/root-pane identities, and uses the existing explicit-pane close capability only for bounded response cleanup.

The parent workspace identity source remains the managed process environment, captured once when `HerdrTransport` is constructed. The target is not derived from cwd, session file, task/pane/tab IDs, labels, prefixes, foreground focus, or a workspace listing.

## Incident Chronology And Evidence Boundary

- The user confirmed that the parent belonged to workspace `wF` while `w8` was manually foregrounded.
- The observed pre-implementation symptom was that the child surface followed `w8`.
- Pre-implementation source evidence showed that create omitted the explicit workspace target.
- The research evidence established that Herdr supports an explicit workspace option and returns a workspace identity for verification.
- `subagent-59` and the diagnostic task were cancelled before commit. Their cancellation is execution history only; it is not evidence of a committed source change or a complete diagnosis.
- The completed controlled acceptance is retained in [real-herdr-acceptance.json](evidence/real-herdr-acceptance.json). It records observed identities, foreground state, child results, and cleanup separately from this incident chronology.

This Context does not claim that every internal Herdr decision path was observed, that a specific Herdr fallback implementation caused the symptom, or that any child pane/tab created during diagnosis remains. The authority-preparation phase performed no Herdr mutation; the later required acceptance gate did, and its record is the source for that evidence.

## Completed Implementation And Ownership

- `packages/pi-herdr-subagents/src/index.ts` owns the completed #14 transport, spawn, resume, and recovery integration. This status reconciliation does not modify it.
- `packages/pi-herdr-subagents/tests/runtime.test.ts` owns the completed fake transport, Herdr-client argument, spawn/resume, and lifecycle regression coverage. This status reconciliation does not modify it.
- Work `#13` (`task-derived-subagent-id`) and existing #9 and #11 work share runtime/test ownership boundaries. The completed #14 implementation remains in the shared dirty worktree; selective staging and commit admission must still preserve each Work item's ownership. This documentation update neither merges nor absorbs their changes.
- `packages/pi-herdr/src/index.ts` forwards arbitrary CLI argument arrays and remains unchanged.
- Existing lifecycle authority retains explicit pane IDs for recovery and resume semantics; #14 did not add workspace persistence or pane re-homing.

## Implemented Solution Shape

The completed implementation uses one transport-owned target invariant:

```text
HERDR_WORKSPACE_ID at transport construction
  -> capture once without constructor-time rejection
  -> createTab validates target
  -> herdr tab create --workspace <target> ...
  -> validate result.tab.workspace_id === target
  -> return result.tab.tab_id + result.root_pane.pane_id
  -> only then launch child in returned pane
```

Response rejection path:

```text
unsupported/missing identity/mismatch after tab create
  -> stable token in Error.message
  -> if explicit root pane ID exists, one best-effort pane close
  -> preserve primary failure if cleanup fails
  -> no retry, no child launch, no task-surface adoption
```

Failure path:

```text
missing/invalid target or unsupported response or mismatch
  -> stable failure reason in Error.message
  -> no foreground/default retry
  -> no child launch
  -> existing runtime launch-failure persistence semantics
```

Recovery path:

```text
restart constructs transport and captures current managed target
  -> recover persisted task records
  -> adopt retained explicit pane IDs without creating/re-homing
  -> future spawn/resume creates only in newly captured target
```

## Review History And Closure

The initial fresh review disposition was `needs-revision`. The following authority-package remediations were completed before the user accepted the #14 Plan; implementation then completed, including the mandatory real Herdr acceptance. Two independent final reviews, including a post-remediation review, found no executable correctness defects.

| Finding | Closure in #14 authority package |
| --- | --- |
| P1 ownership conflict | Context, Plan, and Tasks name overlapping Work `#13` (`task-derived-subagent-id`) alongside #9/#11 and require workspace admission before source/test write. Selective staging and commit admission remain required for the shared dirty worktree. |
| P1 unsupported classification | Spec and ADR distinguish explicit unsupported-option rejection or incompatible successful response shape from unrelated Herdr command failure. |
| P1 response-rejected cleanup | Spec and ADR require one best-effort close of the exact returned root pane when present, preserve the primary failure/token on cleanup failure, and prohibit guessed identities, retry, launch, or adoption. |
| P1 constructor failure | Spec, ADR, Plan, and Tasks require construction to remain loadable with absent/unusable target and defer missing/invalid failure until `createTab`, preserving non-Herdr compatibility. |
| P2 error-token propagation | Spec, ADR, Plan, and Tasks require each local workspace reason token to occur in `Error.message` and survive existing runtime failure persistence/propagation. |

The implementation, tests, real Herdr acceptance, and final reviews are complete evidence, not a rewrite of the initial review chronology.

## Settled Decision Record

1. Keep the ADR distinct rather than amending `runtime-lifecycle.md`, because this is a runtime safety/ownership contract and the existing lifecycle ADR is retrospective with a different decision identity.
2. Classify only explicit workspace-option rejection or a successful response missing required explicit string identities as `parent_workspace_contract_unsupported`; preserve unrelated Herdr command failures on their existing path.
3. On response rejection, attempt one close of an explicitly returned root pane when available. Preserve the primary reason token if cleanup fails; make no cleanup claim when no explicit pane ID is returned.
4. Keep constructor loading non-throwing for absent/unusable targets and defer the local rejection to `createTab`.
5. Put every local workspace reason token in `Error.message` and retain it through existing launch-failure persistence.
6. The real acceptance gate was required and completed; [its evidence record](evidence/real-herdr-acceptance.json) records observed cleanup outcomes without turning them into authority.

## Completion Evidence And Remaining Limit

The user explicitly accepted the #14 workspace-pinning Plan before implementation. The completed implementation includes the fake transport/client and runtime lifecycle coverage, the controlled real Herdr `wF -> w8` acceptance, and final package checks. The current final review reports package typecheck, 52 tests with 274 expectations, acceptance-evidence JSON parsing, and `git diff --check` passing.

The real Herdr gate passed in the recorded managed environment. It remains independently reproducible only where a managed parent workspace, a distinct foregroundable workspace, Herdr mutation and cleanup permission, and a child-capable Pi environment are available. This limit concerns repeatability, not the recorded result.

No source, test, package metadata, Herdr state, staging, or commit is changed by this reconciliation. The shared dirty worktree still needs selective staging and commit admission; this Work must not claim that its documentation status update is committed.

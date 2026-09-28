# Context: Early Stable Harness and Herdr Tool Registration

- Status: withdrawn historical adapter context; not authority; unaccepted; unimplemented
- Updated: 2026-08-22

Withdrawn with the [#36 adapter Proposal](../../proposals/early-stable-tool-registration.md) on 2026-09-28. Incident evidence below remains historical; planned adapter and host behavior is not delivered by child `--exclude-tools` filtering.

## Boundary

#36 is now an adapter problem under the host-owned [Effective Tool Inventory Specification](../../spec/effective-tool-inventory.md). Harness and Herdr supply owned definitions, dynamic inputs, and eligibility facts. They do not own final visibility, provenance, duplicate winners, snapshot lifetime, or dispatch.

## Preserved Incident Evidence

### E36-1: Original api2api active-snapshot failure

- Locator: `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/diagnose-session-019ff563-tools-artifacts/result-1.json`
- Fact: a Toolbelt `session_start` snapshot omitted the seven current `subagent_*` names; an ordinary later `before_agent_start` restored them.
- Limit: task/Result loss was not shown; later native inspection demonstrated the tasks still existed.

### E36-2: Trigger-first lifecycle path

- Locator: `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/diagnose-toolbelt-tool-disappearance-artifacts/result-1.json`
- Fact: Pi 0.84.2 completion-triggered agent execution can bypass `before_agent_start`; the affected turn omitted Harness/Herdr tools until an ordinary prompt.
- Limit: prior Pi-core/Toolbelt repair recommendations are not adopted as package authority.

### CTRL-FRESH

A separate green fresh-session probe covers ordinary startup only. It cannot substitute for E36-1/E36-2, reload, resume, or trigger-first coverage.

## Current Package Facts

- Harness baseline builds/registers `resolve_delegation` from `before_agent_start` after Skill/Role and prompt-mode checks.
- Herdr baseline discovers Agents, recovers runtime state, builds/registers seven tools, and adjusts active names in `before_agent_start`; pane children return before parent runtime creation.
- Package schemas improve usability, but current-state execution checks remain the safety authority.

## Host Reconciliation

```text
host run preparation
  -> positive standard-main/child classification
  -> Harness/Herdr adapter contributions
  -> Toolbelt/inventory mutators
  -> effective winner + compatibility evaluation
  -> immutable run snapshot
  -> provider turns and pinned dispatch
```

The adapter must be callable in host preparation for trigger-first and ordinary-first runs. It must not claim that load-time package registration alone satisfies this sequence.

## Adapter Decisions

- Harness contributes one definition and host-verifiable eligibility facts; indeterminate is ineligible.
- Herdr contributes all seven parent definitions atomically; pane-child or indeterminate state contributes none.
- Dynamic schemas are prepared before freeze and remain advisory.
- Package execute paths revalidate mutable state before side effects.
- Cross-extension collision, mutator ordering, provenance, snapshot, and dispatch are delegated entirely to the host.

## Negative Evidence

- No incident evidence shows Herdr task loss.
- No evidence shows package-local re-registration refreshing an already persisted external active snapshot.
- No package source can prove which cross-extension registration the host dispatches.
- No schema/description or package/version field proves loaded bytes.

## Dependency and Risk

This Work cannot implement safely before the host seam exists. If host positive eligibility cannot classify Harness children before provider freeze, or Herdr cannot provide an atomic owner set without side effects, implementation must stop for authority reconciliation rather than add an execute-time-only workaround.

## Status

All #36 materials were draft, unaccepted, and unimplemented before withdrawal. The earlier O1-O5 package-local design choices were superseded by the host ownership split: eligibility defaults fail closed, host snapshots own visibility, Herdr contributes atomically, and collision handling is host-owned.

## Pi 0.84.2 Lifecycle Reconciliation

Package preparation is invoked by the host before `Agent.prompt/createContextSnapshot` on the common `_runAgentPrompt` path, covering ordinary and triggerTurn-first runs. Later provider turns refresh before `prepareNextTurnWithContext`; queued steer/follow-up keeps the current tool batch until that boundary. Provider-visible definition and execution closure are host-bound through the same exact `context.tools` object.

Harness/Herdr expose package origin markers; the host combines them with process/session construction facts and owns classification precedence. Model text, descriptions, package metadata, or execute-time rejection never establish positive eligibility.

Security removal is distinct from ordinary dynamic change: ordinary changes affect a later provider turn, while host revocation or generation invalidation blocks not-yet-started current execution before package side effects. All such behavior is planned and unexecuted.

The adapter package does not claim exact loaded/evaluated jiti bytes, execute-closure hashing, or Windows cross-alias physical identity. Compatibility uses the Host v1 profile and exact loader-resolved path rules; path/digest/version are trusted admission inputs only.

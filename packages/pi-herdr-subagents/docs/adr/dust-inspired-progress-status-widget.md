# ADR: Dust-Inspired Progress Status Widget

- **Status:** Proposed; implementation complete; evidence reconciliation pending independent review and acceptance
- **Date:** 2026-08-19
- **Scope:** `packages/pi-herdr-subagents`
- **Authority:** [Subagent Status Widget Specification](../spec/running-status-widget.md)
- **Derived Work:** [Dust Progress Status Style Context](../works/dust-progress-status-style/context.md)

## Context

The package has an accepted running-only parent widget backed by a lifecycle-only
observation projection. The proposed amendment adds queued/running progress, elapsed
time, settings, a width-aware `Component`, and terminal-row removal while preserving
completion notification and full task inspection boundaries.

The current checkout contains the implemented `SubagentSettingsStore`, parent-only widget,
explicit Nerd Font capability, and epoch clock seam. `src/index.ts` uses queued/running
`TaskStatus`, exposes lifecycle-only observations with required `queuedAt` and optional
`startedAt`, writes V2 lifecycle records, and reads/migrates V1 `createdAt` records.
The decision below records that implementation and its remaining evidence gaps rather
than describing these owners as future work.

Pi Dust is a useful behavioral reference, but its current widget also collects and
displays activity, defaults to `belowEditor` and `summary`, uses different marker
choices, and calls wall-clock time directly. Copying those behaviors literally would
violate the user's privacy, default-placement, icon, and testability decisions.

The prior observation's `createdAt` field is insufficient to distinguish queue wait from
execution elapsed time. Legacy `starting` recovery also needs an explicit outcome rather
than an implicit renderer interpretation. Persisted lifecycle fields and one epoch time
domain are required for recovery continuity.

## Decision

The implementation is present and aligned to the Spec. Independent review and explicit
current-session acceptance remain process gates; they are not inferred from the source
or package verification result.

1. Keep `SubagentRuntime` as the single task-state owner and expose only a defensive,
   lifecycle-only observation projection.
2. Use the implemented queue-admission boundary. Record `queuedAt`, record stable
   `startedAt` at execution admission, and update `updatedAt` for observable lifecycle
   changes. Persist these fields and rebuild them during recovery before one final
   invalidation.
3. Retain a V1 reader and migrate legacy `createdAt` records to explicit lifecycle
   fields. A validated legacy `starting` record first becomes a queued-equivalent
   migration state; retained-pane verification then deterministically transitions it to
   running with `startedAt = createdAt`, to a terminal Result, or to `failed` with the
   existing pane/verification reason. Persist the result before recovery invalidation.
   New resume generations always receive new timestamps.
4. Use the implemented package-owned widget settings boundary:
   `SubagentSettingsStore` in `packages/pi-herdr-subagents/src/index.ts`, with production
   path `join(getAgentDir(), "subagent", "settings.json")`. Its load/save contract parses
   and merges the complete JSON object, preserves unrelated parsed values, and atomically
   replaces the file through same-directory temporary-file write plus rename. It does not
   promise byte preservation or cross-process merge semantics.
5. Normalize `widgetPlacement`, `widgetMode`, and `useNerdFont` through that store. The
   defaults are `aboveEditor`, `progress`, and `useNerdFont: true`. The parent UI
   integration passes the normalized boolean to the renderer. There is no terminal
   probing or automatic font detection; `false` is the explicit reproducible ASCII mode.
6. Render a parent-only `pi-tui` Component with queued/running rows, epoch-wall-clock
   elapsed time, one-second refresh, ANSI-aware width handling, six-row overflow, and no
   activity content.
7. Define `WidgetClock = () => number` as Unix epoch milliseconds. Production uses
   `Date.now`; tests inject fixed values. ISO persistence values are parsed into this
   same domain. Invalid and future elapsed values clamp to zero; future-record policy
   remains a documented verification gap.
8. Describe the result as Dust-inspired, not exact parity, and retain the explicit
   activity/default/icon/summary differences in the Spec.

## Rationale
- One runtime state owner avoids a second task store and keeps observation privacy at the
  existing low-coupling boundary.
- Separate queue and start timestamps make elapsed display meaningful for both queued and
  running states and give recovery a durable source.
- An explicit `starting` migration table removes an undefined recovery outcome without
  changing existing terminal pane/Result evidence semantics.
- An epoch clock is the smallest coherent contract for ISO persistence and restart
  recovery. It is testable and honest about wall-clock corrections.
- The package-owned settings class gives the new fields one owner and is implemented
  without using Pi's arbitrary built-in setters.
- Semantic parsed-value preservation protects unrelated settings while avoiding the
  impossible promise of byte-for-byte JSON preservation after normalization.
- Explicit icon capability makes NF and ASCII output deterministic without pretending a
  program can reliably detect the active terminal font.
- Explicit parity boundaries prevent behavioral reference code from silently becoming an
  authority or dependency.

## Alternatives Considered

1. **Copy Pi Dust's widget exactly.** Rejected because it collects/displays activity,
   uses different defaults and summary semantics, and lacks the required contract here.
2. **Keep the running-only widget and add elapsed text only.** Rejected because it cannot
   represent queue admission or distinguish queue wait from execution time.
3. **Use `createdAt` for all new elapsed behavior.** Rejected because it conflates legacy
   creation, queue admission, execution start, and resume generation semantics.
4. **Leave legacy `starting` undocumented.** Rejected because recovery would have no
   normative mapping for a record that is neither a new queued state nor a terminal state.
5. **Use a monotonic `WidgetClock` against persisted ISO strings.** Rejected because the
   two domains cannot be reconciled after restart without an additional persisted anchor.
6. **Claim an existing `SubagentSettingsStore` or use Pi's generic SettingsManager.**
   Rejected because this package owns its extension settings file at the documented path.
7. **Replace the entire settings object with normalized widget settings.** Rejected
   because unrelated package settings and future fields would be lost.
8. **Promise byte-level preservation of unrelated JSON.** Rejected because normalized
   JSON serialization can change whitespace, order, escaping, or final newline. The
   testable guarantee is preservation of unrelated parsed values.
9. **Detect Nerd Font support by rendering and inspecting replacement boxes.** Rejected
   because terminal output detection is environment-dependent and irreproducible. Use
   the explicit package setting and injected capability.
10. **Use a fixed wall-clock call inside the component.** Rejected because it makes
    elapsed tests timing-dependent and hides the clock-domain boundary. The component
    receives the epoch clock.

## Consequences

### Positive

- Queue wait and execution elapsed time have explicit lifecycle meaning.
- Recovery can reconstruct active progress without reading child content.
- Old `createdAt` and `starting` records have deterministic, testable migrations.
- Restarted components use one time domain and retain persisted timestamps.
- Settings warnings, defaults, legacy mapping, semantic unrelated-key preservation, and
  atomic replacement are observable and testable.
- Width, timer, clock, icon fallback, and UI failure behavior have deterministic seams.
- No terminal-font or child-activity inference enters the widget path.
- The package can use upstream Dust research without claiming or requiring exact parity.

### Negative And Operational

- Task records gain lifecycle fields and use a V1-read/V2-write migration path.
- The implemented widget coordinates runtime invalidation, component ownership, timer
  disposal, settings loading, and recovery cleanup.
- Atomic temp-and-rename prevents torn replacement but does not serialize concurrent
  writers or merge two simultaneous updates.
- `useNerdFont: true` is a default preference, not environment detection; non-NF users
  must select the explicit ASCII setting.
- Wall-clock elapsed can jump when the system clock changes; negative and future elapsed
  values clamp to zero and monotonic duration is not promised.
- Existing callers and tests that expect observation `createdAt` use the new observation
  contract, while `inspect()` and `join()` remain unchanged.
- The settings file is package-owned and retains unknown/unrelated parsed values;
  malformed files degrade the widget to defaults with a warning.
- Focused evidence still lacks malformed V1 timestamp/Result cases and an explicit policy
  decision for V2 future `startedAt`; these remain future verification work.

## Shared-File Gate And Scope Protection

The source implementation is present, but future source/test changes must preserve the
shared-file ownership boundary. The external `#18` terminal-input barrier remains
separate and its EOF blocker remains unresolved outside this Work. Automatic terminal
surface cleanup is owned by the separate auto-close Work/ADR and is neither implemented
nor verified by this widget. `#18` and `#13` remain isolated. No commit is part of this
reconciliation.

The concrete shared files are:

- `packages/pi-herdr-subagents/src/index.ts` - runtime lifecycle, settings owner, and
  widget integration;
- `packages/pi-herdr-subagents/tests/runtime.test.ts` - lifecycle, recovery, task
  identity, cancellation/join, and settings integration assertions; and
- `packages/pi-herdr-subagents/tests/renderer.test.ts` - task-ID and rendered tool
  expectations.

## Revisit And Supersession

Revisit this ADR if Pi Dust exposes a stable activity-free progress contract, Pi provides
a supported arbitrary extension-settings owner, the package adopts a persistent
conversation model, the lifecycle queue changes ownership, or terminal font capability
can be determined through a stable platform API.

A future ADR must supersede this record if the widget becomes an exact upstream
compatibility surface, activity is intentionally added, settings move to a different
owner/path, or lifecycle timestamps become part of a shared runtime authority.

## Acceptance State

This ADR remains proposed pending independent review and explicit current-session user
acceptance. The repaired implementation evidence is `src/index.ts` plus package
verification of 74 tests, 378 assertions, and typecheck. Focused fixtures now cover V2
required timestamp validation and stable recovered timestamps, combining-sequence
truncation, invalid legacy-layout warnings with a valid `widgetMode`, and temporary-file
cleanup after replacement failure. That evidence does not cover malformed V1
`createdAt`/`updatedAt`, malformed V1 Result precedence, or the recovery policy for a
future V2 `startedAt`; those remain future hardening Task 5 after independent Task 6
review and acceptance. This repair does not claim that rereview or acceptance occurred,
and no commit is part of it.

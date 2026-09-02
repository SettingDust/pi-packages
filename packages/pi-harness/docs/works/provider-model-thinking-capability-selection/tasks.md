# Tasks: #42 Provider/Model/Thinking Capability Selection

- Status: completed task set; T0-T6 complete with fresh T5/T6 GO and P0-P3 zero; exact selective-commit review GO; commit pending
- Updated: 2026-08-26
- Work: [work.md](work.md)
- Plan: [plan.md](plan.md)
- Context: [context.md](context.md)
- Decision identity: `#42-provider-model-thinking-capability-selection-v1`

## Dependency graph

```text
T0 cross-document reconciliation and fresh authority review
  -> T1 explicit acceptance and contract freeze
      -> T2 settings parser/repository and replacement UI
          -> T3 Resolver schema and deterministic selection
              -> T4 Router prompt and delegation mapping
                  -> T5 focused/package verification
                      -> T6 fresh independent final review
```

## T0. Reconcile dependent authority and review

- Outcome: ADR-0003 contains the conditional mechanical supersession marker, and ADR-0001, Router Delegation PRD/Specification, Protocol Prototype, and Backend Adaptation contain non-contradictory #42 amendments. Final fresh review returned GO with P0-P3 all zero.
- Depends on: none.
- Context: #42 PRD/ADR/Spec, Work Context, and listed dependent authority.
- Constraints: documentation/review only; no source, tests, settings, runtime, backend, Herdr, dependency, or Git changes.
- Completion evidence: exact thirteen-path authority/Work set, documentation verification, and final fresh review GO with P0-P3 all zero.
- Status: completed.

## T1. Freeze and accept candidate contract

- Outcome: explicitly accepted nested grammar, first-slash provider/model parsing, exact separate Registry fields, string/control-character boundaries, exact known fields, raw duplicate JSON-key rejection before object normalization, duplicate canonical-tuple rejection without normalization, finite non-negative integer rules and non-integer precedence, qualification tuple, canonical reversible identity ordering, stable block codes, manual replacement, zero-read/non-filtering schema generation, exactly one authoritative Registry read per resolve after structural/numeric validation, Handoff exclusion, and exact pass-through.
- Depends on: T0 and explicit acceptance of the reconciled authority set.
- Expected surfaces: #42 PRD/ADR/Spec and Work Context only.
- Constraints: no `harness.version`, migration, ignore/fallback, mixed Role path, or automatic replacement.
- Completion evidence: explicit user acceptance after final fresh authority review; accepted identities are recorded in `context.md`. The prior no-source/test-change baseline is pre-implementation history only. Current candidate evidence is owned by T5 and the canonical manifest in `context.md`.
- Status: completed; unblocks T2 after the reconciled read-only baseline is repeated cleanly.

## T2. Replace settings/configuration behavior

- Outcome: settings normalization and `/harness config` operate on `harness.candidates[providerModelKey][thinking]`, preserve exact provider/model ID fields, detect raw duplicate JSON keys before object normalization, and reject duplicate canonical tuples while preserving scope inheritance, locking, unrelated keys, malformed-file protection, and explicit replacement. Mixed unknown-plus-legacy or invalid-shape input retains `invalid_configuration` precedence; pure recognized `roles`/`modelRole` input uses `legacy_configuration`. The UI identity repair corrected display-label lookup and canonical-tuple selection; edit-collision, cancellation, and overwrite regressions are covered.
- Depends on: T1.
- Expected surfaces: `src/config.ts`, `src/settings-store.ts`, `src/config-command.ts`, focused config/settings/command tests.
- Verification: first-slash parsing; provider slash rejection; model ID slash/dot allowance; control-character rejection; exact Registry fields; nested valid/invalid candidates; raw duplicate-before-normalization fixtures; duplicate canonical tuples; proof that no trim, case folding, aliasing, dot parsing, last-slash parsing, display parsing, or other normalization occurs; unknown, legacy, malformed, non-finite, fractional, and negative values; trusted/untrusted scope; reset/inheritance; lock/preservation behavior; explicit replacement.
- Status: completed; implementation evidence is closed by T5, including the UI identity repair.

## T3. Implement Resolver selection

- Outcome: Resolver validates top-level integer `reasoning`/`impact`, rejects model/capability fields in Handoff and old `modelRole`/`roles`, parses provider/model ID by first slash, uses exact Registry fields, generates a Registry-free schema containing only the closed root request shape and relevant static descriptions without filtering or availability attestation, reads the Registry exactly once during resolve after structural/numeric validation and before qualification/selection, validates availability from that snapshot, qualifies candidates on both capabilities, selects the settled tuple, and returns exact model/thinking.
- Depends on: T2.
- Expected surfaces: `src/protocol.ts`, `tests/protocol.test.ts`, `extensions/pi-harness.ts` schema inputs.
- Verification: first-slash and exact-field lookup; slash/dot/control-character boundaries; rejection precedence; both-capability qualification; impact/reasoning surplus; canonical complete-identity tie-break; zero Registry reads and no availability filtering/attestation during schema generation; exactly one Registry read at the specified resolve boundary; unavailable/no-qualified; explicit replacement; existing validation precedence; prompt exclusion.
- Status: completed; implementation evidence is closed by T5.

## T4. Update Router prompt and delegation mapping

- Outcome: Router explains and requests semantic 0..3 guidance, supplies root requirements, and forwards resolved model/thinking unchanged after resolution without backend changes.
- Depends on: T3.
- Expected surfaces: `extensions/pi-harness.ts`, `tests/extension.test.ts`, and directly coupled package tests only.
- Constraints: examples must not bind research/implementation phases; no Herdr/backend edits.
- Verification: prompt examples/exclusions, root-vs-Handoff shape, exact resolved metadata mapping.
- Status: completed; implementation evidence is closed by T5.

## T5. Fresh focused and package verification (completed)

- Outcome: reproduce focused and package-level evidence on the frozen ten-file candidate, then retain exact thirteen-document and excluded-path checks. Fresh T5 returned GO with P0-P3 zero. Command attribution: config-command `13/22`, config `21/22`, settings-store `19/37`, Extension `6/95`, affected `46/154`, distinct subset `53/81`, focused `94/250`, full `136/538`; typecheck, import, activation, and execute passed. Exact 23 paths, 13 documents only, ten technical hashes, 50 links, empty index, diff check, and manifest byte stability passed. No stage, commit, reload, push, settings, runtime, or backend operation occurred.
- Depends on: T2-T4.
- Verification: Independent validation records P0/P1/P3 PASS and identified only a narrow P2 evidence correction. That correction records default-loader raw-duplicate preflight rejection before Registry read or Resolver selection (zero each) and a runtime regression across trusted and untrusted scope. Supplied package/source observations are config-command `13/13` (`22` assertions), affected `46/46` (`154` assertions), focused `94/94` (`250` assertions), and full `136/136` (`538` assertions), with package typecheck, import, activation, and execute passed. The exact `__proto__` thinking key remains own data without prototype pollution or normalization. Diff/index evidence retains the exact 23-path dirty set with an empty index. The path-sorted LF manifest of the frozen ten-file candidate is 1085 bytes with aggregate SHA-256 `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`; `context.md` records all rows and executable reproduction. Its rejected 1095-byte literal-backslash-n construction hashes to `3fd52e65a90f2d7eaee47b587e50d467abd2960fdb7ead118131bcfb0ce70525` and is not candidate evidence. The unrelated Herdr failure remains outside this task.

- Constraints: evidence is package/source-level only; no live backend, reload, settings, runtime, Herdr, Pi-core, staging, commit, push, or deployment claim is made.
- Status: completed.

## T6. Fresh independent review (completed)

- Outcome: read-only correctness, security, and evidence review of the exact implementation/test diff and reconciled authority package.
- Depends on: T5.
- Constraints: any finding returns to its owning task and requires fresh T5/T6; no implementation authorization is implied by a clean review.
- Completion evidence: independent T6 review returned GO with P0-P3 zero and no actionable finding. Implementation, validation, and final review are complete. Exact selective-commit review is GO; commit remains pending.
- Status: completed.

## Parallelism and exclusions

No implementation tasks are parallel-safe by default because T2-T4 share the settings/protocol/Extension contract. No task covers `@settingdust/pi-herdr-subagents`, delegate backend source, Pi core/Host, dependencies, unrelated settings/session/runtime work, migration, fallback, reload, staging, commit, deployment, or live runtime verification.

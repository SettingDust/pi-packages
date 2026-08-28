# Authority-First Router Admission Work Context

- Status: accepted coordination evidence; implementation repairs, narrow Role validation, full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation complete; isolated commit pending

## User direction and settled boundary

The settled direction is the simpler model: the Router completes Plan/Tasks, discloses the exact decision context in an ordinary message, obtains one user confirmation, and invokes delegation once. Harness does not prove, persist, replay-protect, or enforce confirmation history. A Handoff remains a work request, never acceptance evidence.

The cancelled predecessor draft addressed only removal of a decision field. Its partial edits were inspected and are superseded. They are not evidence for retaining activation-only APIs, EventBus transport, or receipt state.

## Current implementation evidence

The T2/T3 candidate removes the Harness authorization state machine while retaining current-call legality checks:

- `extensions/pi-harness.ts` no longer constructs, binds, resets, or consumes authorization state; Resolver execution remains non-interactive.
- `src/admission.ts` retains canonical paths, document bytes, tuple validation, normalized Handoff identity, and current-call digest inputs only.
- `src/admission-decision.ts` and `tests/admission-decision.test.ts` are absent.
- `src/protocol.ts` resolves planned admission through direct structural and current-call checks and retains only precise non-authorization block codes.
- `tests/admission.test.ts` and `tests/protocol.test.ts` retain focused canonical, tuple, drift, precedence, and no-leakage coverage.
- No Pi/Host/Herdr/backend/settings/session source was changed.

## Preserved validation

Retain exact Handoff schema; Skill/Role/model/thinking validation; readable reference precedence; selected same-directory Work/Plan/Tasks tuple binding; canonical paths and document bytes; canonical JSON and normalized Handoff identity; rejection of model-supplied receipt/digest/session/acceptance-shaped fields; current-call authority/Plan identity recomputation; and precise fail-closed authority-drift errors. No preserved digest is a user-acceptance proof.

## Removed state and behavior

Remove all activation channels, activation request/context/outcome/decision/disclosure transport, registry/receipt types and APIs, replay IDs, activation/decision timestamps, session-generation authorization state, registry integrity checks, receipt issuance/reuse/reset, and receipt-driven `acceptance_required`/`receipt_corrupt` behavior. Do not replace them with flags, markers, audit events, tokens, persistence, or Host seams.

## Consumer and compatibility map

The completed repository-wide inventory found only the package-local pre-change consumers: Extension imports/EventBus wiring, admission exports used by that Extension and focused tests, protocol callback/block-code surfaces, and the two focused state-machine test files. No README, package export, direct external consumer, or compatibility requirement was found. T4 repeated the obsolete-term inventory after implementation; its classified negative evidence is recorded below.

## Risks

The main risks are accidentally retaining a hidden receipt gate, weakening current-call drift checks while deleting authorization hashes, or changing unrelated protocol behavior. Verification must prove both absence of the old state machine and preservation of ordinary admission invariants.

The T4 technical work and document reconciliation were authorized by the current user in the ordinary T4 Handoff, with this Work, Plan, Tasks, Specification, and ADR supplied as accepted context. No reload, receipt issuance, activation, settings/session/Herdr mutation, staging, commit, or remote access occurred.

## Historical pre-Role-repair evidence

The earlier T4 candidate was built from repository HEAD `667e61126043b6aba669410f594bc5ddd7e95bb3` plus the scoped implementation/test paths, with both obsolete admission-decision files absent. Its historical technical evidence was `39 pass, 0 fail, 75 expect()` focused and `94 pass, 0 fail, 398 expect()` full-package, with package typecheck, protocol import, and real Extension import/activation smoke passing. This remains historical T4 evidence and does not establish the later repair state.

## Pre-Role-repair final validation

The previous final six-path validation is retained as historical pre-Role-repair evidence: focused admission/protocol `46 pass, 0 fail, 94 assertions`; Extension schema `1 pass, 0 fail, 41 assertions`; full `pi-harness` `101 pass, 0 fail, 428 assertions` across seven files; and package typecheck, protocol import, and Extension import plus source-level activation-registration smoke passed. The `428` assertions must not be presented as validation of the new Role-repair bytes.

That validation used Bun `1.3.14`, cached TypeScript `5.9.3`, cached `proper-lockfile` `4.1.2`, and a clean compatible Pi peer environment from Pi Dust (`0.83.0`) in a temporary dependency environment. No repository dependency, package manifest, lockfile, settings, or Pi/Host/Herdr/session state was mutated.

Temporary-environment limitation: during dependency-layout setup, two junctions were mistakenly created under `E:/Projects/pi-dust/node_modules`. They were precisely removed and verified absent; they changed no tracked files, manifests, lockfiles, or runtime state and are not validation evidence. The fresh validation used a removed system TEMP copy with read-only cached dependency junctions; no workspace/Pi Dust mutation or install occurred. Initial TEMP/script setup failures are not pass evidence.
## Current final validation and identity evidence

The implementation repairs comprise three distinct findings with separate ownership:

- First P2: Resolver root/Handoff/context runtime shape closure and recursive capability-field rejection belong to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.
- Second P2: nested atomic/planned/authority TypeBox closure belongs to `extensions/pi-harness.ts`, with regression coverage in `tests/extension.test.ts`.
- Final P2: non-string Role model/thinking fail-closed validation belongs to `src/protocol.ts`, with regression coverage in `tests/protocol.test.ts`.

Fresh final technical evidence is complete:

- Focused admission/protocol: `50 pass, 0 fail, 102 assertions`.
- Protocol-only: `45 pass, 0 fail, 86 assertions`.
- Extension schema: `1 pass, 0 fail, 41 assertions`.
- Full package: `105 pass, 0 fail, 436 assertions across seven files`.
- TypeScript `5.9.3` typecheck passed.
- Protocol import and source-level `activateHarness` registration smoke passed.

The four malformed Role cases were null/numeric model and null/numeric thinking. They returned `unavailable_model` or `invalid_thinking`, did not throw, and produced zero subject observations.

Stateless evidence is retained exactly: seven closed TypeBox shapes; Work drift and Plan drift each returned `authority_drift` after exactly two observations; recursive capability-shaped keys were rejected while prose was accepted; removed-state inventory returned zero results; and `src/admission-decision.ts` plus `tests/admission-decision.test.ts` were absent.

The current six candidate SHA-256 identities are:

- `extensions/pi-harness.ts`: `44458871b1bdf20376a83f5e308e5718a68a16b566615a6948c0a8996e0a15e5`
- `src/admission.ts`: `ccdbce5382ccf00ed87c3d6a8e77fef89a2c04d8e91d1e880f4cca9273f01862`
- `src/protocol.ts`: `694710c0f17d6c2285c798e034aa99108b67af7c7b497b7614dc604bf5a4fb9b`
- `tests/admission.test.ts`: `7e763fc3b219f9851e7f3da01f50809ca9536947c038ec1bf8db7b2511031792`
- `tests/protocol.test.ts`: `28c1f77cc8d3a065a08f755859ee2e7918f28d2d7bc67dfa6377dcd3bdf35fc7`
- `tests/extension.test.ts`: `3387f5a8774f8c2b65a37fdf9d13f30f7f25c0384b82a67f91375c5aa9c55947`

Before and after this documentation edit, these six candidate identities must remain unchanged. The exact twelve-path worktree boundary is these six candidate source/test paths plus these six documents; the index must remain empty and there must be no untracked paths. Both obsolete admission-decision files remain absent.

Lifecycle: implementation repairs, narrow Role validation, full technical validation, fresh final independent correctness/security/evidence review, and completion-status reconciliation are complete. The final review found P0/P1/P2/P3 all none; exact source/test and document identities matched, and no repair was required. GO for one isolated twelve-path commit; isolated commit remains pending and separately authorized. No reload, deployment, live Router/Handler launch, runtime activation, staging, or commit occurred.

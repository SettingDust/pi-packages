# Context: Host Effective Tool Inventory

- Status: abandoned historical context; not authority; unaccepted; unimplemented
- Updated: 2026-09-28

Withdrawn with ADR-0008 and the Host Spec under the no-Pi-core-change decision. Existing Herdr child `--exclude-tools` meets the selected child-isolation need only; the Host -> #36 -> #3 program will not proceed. The source observations below are historical evidence, not an active implementation direction or proof of executed checks.

## Settled Candidate Direction

The host must bind compatibility, provider visibility, and execution to the exact low-level Agent `context.tools` objects. #36 contributes package definitions and positive eligibility inputs; #3 consumes a host-issued compatibility outcome. No package wrapper or second registry is needed.

Reviewed path/digest/version data is trusted compatibility admission only. It does not authenticate a publisher, attest dependencies/runtime, prove jiti evaluated bytes, or cryptographically identify an execute closure.

## Pi 0.84.2 Lifecycle Facts

- Ordinary prompt: `AgentSession.prompt -> emitBeforeAgentStart -> _runAgentPrompt -> Agent.prompt -> createContextSnapshot` (`agent-session.js:884-919`; `agent.js:280-285`).
- TriggerTurn-first: `sendCustomMessage({triggerTurn:true})` enters `_runAgentPrompt` without `before_agent_start` (`agent-session.js:1068-1091`).
- First common preparation seam: inside `_runAgentPrompt`, before `Agent.prompt/createContextSnapshot`.
- Provider definitions: `agent-loop.js:178-198` derives them from `context.tools`.
- Execute closure: `agent-loop.js:393-457` finds and invokes the tool from the same `currentContext.tools`.
- Later-turn refresh: `prepareNextTurnWithContext` replaces tools from current `agent.state.tools.slice()` (`agent-session.js:274-292`).
- Queued steer/follow-up stays in the current low-level run; the current tool batch retains its snapshot, and later provider turns refresh only at the documented boundary (`agent.js:316-323`; `agent-loop.js:82-170`).
- Reload invalidates the old runner and rebuilds runtime/tool state, but an already-held shallow object snapshot requires an explicit execution-time generation/revocation guard (`agent-session.js:2052-2074`; `resource-loader.js:262-327`; `loader.js:113-127`).

## Path/Byte Observability Facts

- Pi passes its resolved entry path string to `jiti.import()` (`loader.js:351-376`).
- Pi retains configured/external path, internal resolved path, and source metadata, but does not expose jiti's original/transformed/evaluated bytes, dependency graph, or execute-closure identity.
- A later filesystem hash is current compatibility evidence only; it cannot prove what jiti previously evaluated.
- Current Windows loader/cache behavior supplies no authority for case-fold, drive alias, UNC, short-name, symlink, junction, hardlink, or file-ID equivalence.
- Therefore the draft keeps configured and resolved paths separately, compares exact actual loader-resolved strings, and fails closed on unsupported aliases.

## Primary Source Objects

Accessed 2026-08-22; package versions `@earendil-works/pi-coding-agent` and `@earendil-works/pi-agent-core` are both 0.84.2.

| ID | Exact locator | SHA-256 | Claim/scope |
|---|---|---|---|
| P1 | `D:/Applications/Scoop/apps/pi-coding-agent-bun/0.84.2/node_modules/@earendil-works/pi-coding-agent/dist/core/agent-session.js` | `9f065b4a277857db100e3277c4d18316c89cd46b11f6ba8140122f19efbe47c4` | ordinary/trigger entry, refresh, reload |
| P2 | `.../pi-coding-agent/dist/core/extensions/loader.js` | `0fd56e37765a0e436d8f55d7ca8c76ab933c41e1bd4974a5fe2cbba690cde900` | resolved path, jiti import, registration |
| P3 | `.../pi-coding-agent/dist/core/extensions/runner.js` | `b39d59b8f86693b9aca15f13e14f367fce9a0ad8ed7ce9ad17950906f226951d` | duplicate order/runtime invalidation |
| P4 | `.../pi-coding-agent/dist/core/extensions/wrapper.js` | `0eedc30f82c57ba06a01c9ec192608867b09a37488e1fc1a09877988b8d08683` | execution wrapper |
| P5 | `.../pi-coding-agent/dist/core/resource-loader.js` | `dfd66250341b8cfb1a9c90ffcd73434806fb14476c824d34d94b4bed40a90ee1` | reload/resource lifecycle |
| P6 | `.../pi-agent-core/dist/agent.js` | `d84351e451b9fef40fe2532c446aca90d26a4be9038b2d77d3d45dd6eab21d41` | first snapshot and queued input |
| P7 | `.../pi-agent-core/dist/agent-loop.js` | `43cc779ddaf90df41768d3d2d0f7d7ba8b8bce7bedc9dc6062ca8b4de84ae880` | provider/executor shared objects |
| P8 | `.../pi-coding-agent/package.json` | `820f4adc6d61f2cefbc29ce17e9dfd9aa482248d54be5d0dfa2a868ca000c7b0` | package version |
| P9 | `.../pi-agent-core/package.json` | `ac5e13d2a2aa0d6c78394417b59e18cb0fe92f482d2b075b39bf165312db6c06` | package version |

Full absolute prefixes and source ranges are recorded in [compatibility-profile.md](compatibility-profile.md). Hashes identify the inspected installed files only; they are not publisher or runtime attestation.

## Delegated Evidence Objects

| Locator | Role | Limit |
|---|---|---|
| `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/trace-pi-host-tool-inventory-seams-artifacts/result-1.json` | Pi 0.84.2 seam trace | decision evidence; no dynamic runtime probe |
| `.../tasks/review-host-tool-inventory-authority-artifacts/result-1.json` | integrated authority review | finding evidence; not acceptance |
| `.../tasks/author-host-tool-inventory-authority-artifacts/result-1.json` | exact prior artifact inventory | authoring evidence; superseded claims are not runtime fact |
| `../atomic-router-delegation/research.md` | first backend semantic map | historical/source baseline; not current provenance |

The exact session prefix for abbreviated task locators is the prefix shown in the first row.

## Negative Evidence

- No inspected public Pi 0.84.2 API exposes the exact current provider tool-object snapshot.
- No inspected loader seam exposes evaluated jiti bytes, transitive dependency identity, or execute-closure identity.
- No source supports cross-alias Windows file equivalence for this authority.
- Registration metadata, names, schema, descriptions, package metadata, and late execute rejection cannot establish positive main-session eligibility or current effective-object identity.
- Lack of such evidence is bounded to the inspected Pi 0.84.2 source; it is not proof about future versions.

## Reconciliation Map

| Material | Repaired role |
|---|---|
| ADR-0008 + effective-tool-inventory Spec | Host object-snapshot/lifecycle authority |
| `compatibility-profile.md` | versioned v1 profile and first fixture contract |
| #36 Proposal/Spec/Work | definitions, eligibility inputs, preparation, package JIT checks |
| ADR-0005 + Router/Backend Specs + #3 Work | host-outcome consumers and immediate resolve-to-spawn behavior |
| `consistency-report.md` | read-only reconciliation report; not authority, acceptance, implementation, or runtime evidence |
| `review-manifest.md` | exact package inventory/status/dependency gate |
## Status and Remaining Evidence

All runtime claims below were planned and all matrices remain unexecuted. The previously listed evidence gates and Host -> #36 -> #3 sequence are abandoned, not outstanding work. Independent accepted Router/delegation scope is unaffected.

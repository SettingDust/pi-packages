# Host Compatibility Profile: `pi-herdr-subagents/subagent_spawn` v1

- Status: draft fixture contract; unaccepted; unimplemented; unexecuted
- Updated: 2026-08-22
- Interface: `effective-tool-compatibility/v1`
- Authority: [Effective Tool Inventory Specification](../../spec/effective-tool-inventory.md)
- Semantic source baseline: [Atomic Router Delegation T1 research](../atomic-router-delegation/research.md)

## Purpose

This document defines the first source-grounded fixture contract for host compatibility admission. It is derived review material, not a self-authenticating runtime fixture. Expected paths and digests must be generated on the controlled implementation revision and independently reviewed before admission.

## Versioned Profile Shape

```yaml
interface: effective-tool-compatibility/v1
profileId: pi-herdr-subagents/subagent_spawn
profileVersion: 1
hostVersions:
  piCodingAgent: 0.84.2
  piAgentCore: 0.84.2
platformRuntime:
  os: windows
  architecture: reviewed-exact-value
  runtimeName: node | bun
  runtimeVersion: reviewed-exact-value
extension:
  configuredPath: reviewed-exact-string
  resolvedPath: reviewed-exact-loader-output
reviewedDigestScope:
  algorithm: sha256
  files:
    - path: reviewed-exact-path
      sha256: 64-lowercase-hex
tool:
  name: subagent_spawn
  definitionEncoding: deterministic-json-v1
  definitionEvidenceSha256: 64-lowercase-hex
  requiredFields: [name, label, description, parameters, active]
  executionOptions: reviewed-enumerated-map
semanticContract:
  agent: handler
  invocationFields: [prompt, label, taskSlug, model, thinking]
  skillAccess: normal-pi-skill-mechanism
  referenceAccess: child-read-from-delegated-cwd
  taskIdentity: stable-nonempty-subagentId
  result: generation-specific-yaml-handler-result
snapshotBinding:
  providerAndExecutorUseSameContextToolObject: true
  firstTurnBoundary: before-Agent.prompt-createContextSnapshot
  laterTurnBoundary: before-prepareNextTurnWithContext
  executionGuard: run-generation-turn-generation-revocation-and-object-identity
consumer:
  harnessReadPath: extension-private-readOutcome
  routerProjection: host-owned-current-turn-coded-outcome
```

Unknown keys fail `malformed_profile` for profile v1. Every `executionOptions` key must have an implementation-owned comparison and a changed-option test.

## Pi 0.84.2 Source Map

Accessed 2026-08-22. The delegated trace Result is decision evidence, not runtime completion evidence.

| Locator | SHA-256 | Relevant seam |
|---|---|---|
| `D:/Applications/Scoop/apps/pi-coding-agent-bun/0.84.2/node_modules/@earendil-works/pi-coding-agent/dist/core/agent-session.js` | `9f065b4a277857db100e3277c4d18316c89cd46b11f6ba8140122f19efbe47c4` | `_runAgentPrompt`, triggerTurn-first, `prepareNextTurnWithContext`, refresh/reload |
| `.../pi-coding-agent/dist/core/extensions/loader.js` | `0fd56e37765a0e436d8f55d7ca8c76ab933c41e1bd4974a5fe2cbba690cde900` | resolved path, jiti import, registration |
| `.../pi-coding-agent/dist/core/extensions/runner.js` | `b39d59b8f86693b9aca15f13e14f367fce9a0ad8ed7ce9ad17950906f226951d` | extension ordering, first registration, runtime invalidation |
| `.../pi-coding-agent/dist/core/extensions/wrapper.js` | `0eedc30f82c57ba06a01c9ec192608867b09a37488e1fc1a09877988b8d08683` | execute wrapper/context |
| `.../pi-coding-agent/dist/core/resource-loader.js` | `dfd66250341b8cfb1a9c90ffcd73434806fb14476c824d34d94b4bed40a90ee1` | reload/resource resolution |
| `.../pi-agent-core/dist/agent.js` | `d84351e451b9fef40fe2532c446aca90d26a4be9038b2d77d3d45dd6eab21d41` | `createContextSnapshot`, queued steer/follow-up |
| `.../pi-agent-core/dist/agent-loop.js` | `43cc779ddaf90df41768d3d2d0f7d7ba8b8bce7bedc9dc6062ca8b4de84ae880` | provider serialization and execute from `context.tools` |
| `.../pi-coding-agent/package.json` | `820f4adc6d61f2cefbc29ce17e9dfd9aa482248d54be5d0dfa2a868ca000c7b0` | Pi version 0.84.2 |
| `.../pi-agent-core/package.json` | `ac5e13d2a2aa0d6c78394417b59e18cb0fe92f482d2b075b39bf165312db6c06` | agent-core version 0.84.2 |

Source ranges from the trace: `agent-session.js:274-292,884-919,1068-1091,1880-2015,2052-2074`; `loader.js:113-127,215-222,351-376`; `agent.js:280-285,316-323`; `agent-loop.js:82-198,393-457`; `resource-loader.js:262-327`. File modification timestamps and lengths are verification metadata only; hashes above cover the inspected installed files, not publisher identity.

## Semantic Evidence

T1 source mapping records backend semantics at repository Git `b858da269738a9796877b9d1430c6fa45406d110` on `main` with a dirty working tree at access. Relevant locators:

- `packages/pi-herdr-subagents/src/index.ts:319-333,462-480,601-702,732-743,946-972,1022-1033,1239-1263,1392-1419,1557-1581`;
- `packages/pi-herdr-subagents/extensions/pane-child.ts:49-80`.

It supports fixed Agent resolution, invocation forwarding, child prompt/read access, stable task identity, Result persistence, notification, and join. It does not prove the current effective winner or runtime object.

## Required Semantic Contract

The approved winner must expose exactly one `subagent_spawn` provider definition whose schema requires `agent`, non-empty `prompt`, non-empty `label`, and canonical `taskSlug`, with optional explicit `model` and `thinking` as defined by reviewed source. The profile must assert:

1. `agent` admits the fixed `handler` capability;
2. Router maps `resolved.prompt/model/thinking` without fallback and derives only `label/taskSlug` in memory;
3. child Pi receives the resolved Agent instructions and Handoff prompt in delegated `cwd` with normal Skill loading and reference read access;
4. spawn validates explicit model, task slug, and Agent before task allocation/Herdr side effects;
5. success returns a non-empty stable `subagentId` and active status;
6. generation-specific YAML Result persists and remains retrievable/notifiable;
7. provider serialization and execution use the exact same pinned `context.tools` object;
8. generation or security revocation blocks before spawn side effects.

## Host-Private and Exposed Fields

Host-private: configured/resolved paths, digest scope and observed hashes, expected semantic object, exact tool references, execute closure, winner object identity, run/turn generation internals, revocation epoch, and comparison diagnostics.

Exposed to Harness/Router: `interface`, `status`, `profileId`, `profileVersion`, opaque run/turn generation, stable `hostCode`, and non-secret message. The consumer cannot supply any host-private field.

## Trust Limits

Profile path, digest, and version are reviewed compatibility admission. They are not publisher authentication, registry/package attestation, dependency/runtime attestation, jiti transformed-byte proof, or cryptographic execute-closure proof. Runtime sameness derives from using the same pinned `context.tools` object, not from file hashes.

Configured and resolved paths remain separate. Windows case/symlink/junction/hardlink/drive/UNC equivalence is unresolved and therefore fails closed unless exact host-loader output matches.

## Required Fixture Cases

All are planned and unexecuted:

- exact profile match on eligible standard main ordinary-first;
- equivalent triggerTurn-first match through `_runAgentPrompt`;
- custom-prompt Handler child, Herdr pane child, and indeterminate exclusion;
- configured-path, resolved-path, digest, Pi/core version, platform/runtime mismatch;
- every enumerated definition field and execution option changed independently;
- duplicate same-name winner object differs;
- current-turn ordinary change versus later-turn refresh;
- security revocation before execute;
- reload and stale callback;
- nested host code preservation through Router coordination;
- successful one-resolve/one-pinned-spawn mapping and stable Result behavior.

## Admission Boundary

No concrete generated expected path/digest/runtime values are approved by this draft. Fixture generation, review, confirmation, implementation, execution, staging, and commit remain outstanding.

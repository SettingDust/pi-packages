# Effective Tool Inventory Specification

- Status: draft candidate specification; unaccepted; unimplemented
- Date: 2026-08-22
- Decision: [ADR-0008](../adr/0008-host-owned-effective-tool-inventory.md)
- Work: [Host Effective Tool Inventory](../works/host-effective-tool-inventory/work.md)
- Compatibility profile contract: [Host Compatibility Profile v1](../works/host-effective-tool-inventory/compatibility-profile.md)

## 1. Scope

This Specification defines the Pi host contract for preparing, authorizing, exposing, refreshing, revoking, and executing effective tools for each provider turn within one low-level Agent run. It owns the host seam shared by the #36 Harness/Herdr contributors and the #3 Router/Harness consumer.

It does not define package-specific tool behavior, publisher authentication, dependency or runtime attestation, cryptographic execute-closure proof, Handler lifecycle, authority-admission receipts, task persistence, notification delivery, or cross-alias filesystem identity.

## 2. Pi 0.84.2 Grounding and Terms

Pi 0.84.2 creates the first low-level context in `Agent.createContextSnapshot()` from `agent.state.tools.slice()`. Provider serialization reads `context.tools`, and tool lookup and execution read the same `currentContext.tools` objects. `AgentSession.prepareNextTurnWithContext` replaces the tools for a later provider turn from the then-current `agent.state.tools`. These concrete objects, not the registration metadata returned by `getAllTools()` or the names returned by `getActiveTools()`, are authoritative.

- **Agent run**: one low-level `Agent.prompt()` execution, including provider turns, tool results, queued steer/follow-up input, and settlement.
- **provider turn**: one provider request and the tool-call batch produced from its input context.
- **tool-object snapshot**: the exact ordered `context.tools` object references used for one provider turn.
- **run generation**: a host-issued identity for one active AgentSession/Extension runtime. Reload or runtime replacement invalidates it.
- **turn generation**: a monotonic host-issued identity for one authorized tool-object snapshot within a run generation.
- **configured path**: the extension path as configured before Pi loader resolution.
- **resolved path**: the exact path string produced by the Pi loader's actual resolution rules and passed to `jiti.import()`/the extension factory cache.
- **reviewed digest scope**: the explicitly enumerated files and SHA-256 values approved in a trusted compatibility profile. It is compatibility-admission evidence only.
- **compatibility profile**: a versioned host-owned policy evaluated against host-observed runtime facts and the authoritative tool objects.
- **revocation**: a host security decision that invalidates authority to execute an otherwise pinned object.

## 3. Ownership

The Pi host must own:

- positive runtime eligibility and precedence;
- first-turn preparation before `Agent.prompt()`/`createContextSnapshot()`;
- later-turn revalidation before `prepareNextTurnWithContext` installs the next tools;
- the authoritative `context.tools` object snapshot;
- deterministic duplicate winner formation before each snapshot;
- run/turn generation and revocation state;
- compatibility-profile admission and the host-private outcome object;
- provider serialization and execution from the same pinned objects;
- execution-time generation and authority blocking.

Tool-owner adapters own definitions, dynamic inputs, package eligibility facts, atomic contribution declarations, and package JIT checks. Consumers read host-issued outcomes but cannot submit or replace provenance, profile contents, compatibility projections, object identity, generation, or approval through model input.

## 4. Positive Runtime Eligibility

### 4.1 Host-observed inputs

Eligibility must be resolved before protected tools enter `context.tools`. The host must derive these inputs during process/session construction, not from model text:

```yaml
sessionOrigin: standard | custom_prompt | unknown
paneOrigin: ordinary_process | herdr_pane_child | unknown
runtimeState: active | replacing | torn_down
```

- `sessionOrigin: standard` is positive only when the host created the session through its standard main-session system-prompt path.
- Any custom system-prompt/Agent child launch is `custom_prompt`; it is not standard merely because its prompt resembles the Router prompt.
- `paneOrigin: herdr_pane_child` requires the host-observed child launch marker and matching pane-child runtime context established before extension contribution.
- `paneOrigin: ordinary_process` requires a positive ordinary-process origin established by the host. Absence of a child marker alone is not positive evidence.
- Missing, late, malformed, or conflicting input is `unknown`/indeterminate.

Model text, system-prompt contents, tool descriptions, package metadata, extension self-description, and a late execute rejection must not establish positive eligibility.

### 4.2 Classification and precedence

The host must classify in this order:

1. `runtimeState != active` -> `indeterminate`;
2. `paneOrigin == herdr_pane_child` -> `herdr_pane_child`;
3. `sessionOrigin == custom_prompt` -> `custom_prompt_handler_child`;
4. `sessionOrigin == standard` and `paneOrigin == ordinary_process` -> `standard_main`;
5. otherwise -> `indeterminate`.

Conflicting positive child facts fail closed as `indeterminate`; no fact may downgrade a known child to `standard_main`. Protected Router/delegate tools are eligible only for `standard_main`. Child or indeterminate contexts must omit them before provider serialization.

## 5. Path and Digest Compatibility Evidence

### 5.1 Exact loader-path matching

The host must retain both the original configured path and the actual resolved path. Profile comparison uses exact UTF-8 string equality against the path generated by the same Pi loader rule and runtime platform. It must not invent a physical or canonical file identity.

On Windows, case variants, drive aliases, UNC/extended forms, short names, symlink, junction, and hardlink paths are equivalent only if the actual loader produces the exact same resolved path string recorded by the profile. Otherwise compatibility fails closed. No case folding, `realpath` substitution, file-ID lookup, or cross-alias equivalence is authorized by this version.

### 5.2 Reviewed digest scope and limits

A trusted profile must enumerate its digest scope and expected lower-case SHA-256 values. The host may hash the current files in that exact scope for compatibility admission. Pi 0.84.2 does not expose the original bytes read by jiti, transformed/evaluated jiti bytes, the dependency graph, or execute-closure identity. Therefore the digest must not be described as loaded-byte, evaluated-module, or closure attestation.

Path/digest/version evidence is trusted compatibility admission. It does not prove:

- publisher, signer, registry, or package authenticity;
- dependency or runtime integrity beyond the enumerated scope;
- which bytes jiti transformed or evaluated;
- closure captures or runtime behavior;
- filesystem identity across aliases;
- cryptographic sameness of an execute closure.

Runtime provider/executor sameness comes only from using the same pinned `context.tools` objects for serialization and execution.

## 6. Versioned Host Compatibility Interface

The host must implement interface `effective-tool-compatibility/v1` with two host-only operations:

```ts
prepareTurn(input: {
  runGeneration: string;
  nextTurnGeneration: string;
  eligibility: HostEligibility;
  tools: readonly ToolObject[];
  requestedProfiles: readonly ProfileRef[];
}): PreparedToolTurn

readOutcome(input: {
  runGeneration: string;
  turnGeneration: string;
  profileId: string;
  profileVersion: number;
}): HostCompatibilityOutcome
```

`prepareTurn` must retain the exact `tools` object references used to form the next `context.tools`; it must not rebuild tool definitions or perform a later name lookup. `readOutcome` returns the already-evaluated current-turn outcome and cannot accept a path, digest, registration identity, semantic assertion, or approval.

`PreparedToolTurn` is host-private and contains:

```yaml
interface: effective-tool-compatibility/v1
runGeneration: opaque
turnGeneration: opaque
eligibility: standard_main | custom_prompt_handler_child | herdr_pane_child | indeterminate
tools: exact-host-object-references
winnersByName: host-private-object-references
outcomesByProfile: host-private-map
revocationEpoch: opaque
```

The exposed projection is:

```yaml
interface: effective-tool-compatibility/v1
status: compatible | incompatible
profileId: string
profileVersion: integer
runGeneration: opaque
turnGeneration: opaque
hostCode: compatible | tool_unavailable | ineligible_runtime | configured_path_mismatch | resolved_path_mismatch | digest_mismatch | version_mismatch | platform_runtime_mismatch | definition_incompatible | execution_option_incompatible | stale_generation | revoked | malformed_profile | profile_unavailable
message: non-secret diagnostic
```

Tool references, execute functions, configured/resolved paths, digests, reviewed scope, and revocation internals remain host-private. Harness reads `readOutcome` through a non-model-addressable Extension context capability and enforces it before Resolver success. The host may render the exposed projection into host-owned Router coordination context, but user/model text cannot create or replace it. Router consumes that projection before resolution; Harness independently enforces the same private outcome object.

## 7. Deterministic Definition and Semantic Comparison

Profile v1 uses a versioned host-private semantic comparison, not a claimed cross-host closure digest. It must compare these enumerated fields:

1. tool `name` exact string;
2. tool `label` exact string when present;
3. tool `description` exact string;
4. complete provider-visible parameter schema;
5. active membership;
6. duplicate-winning object reference;
7. owner/adapter identity and atomic owner-set status when required;
8. every host execution option that changes dispatch, validation, timeout, cancellation, or side-effect eligibility;
9. required profile-specific invocation and Result semantics.

For deterministic schema evidence, encode JSON as UTF-8 with object keys sorted lexicographically by Unicode code point, arrays in original order, strings and finite numbers in JSON form, and no insignificant whitespace. Undefined, functions, symbols, non-finite numbers, cycles, or other non-JSON values make the definition incompatible. SHA-256 of those bytes is `definitionEvidenceSha256`; it is diagnostic/comparison evidence, not execute-closure identity.

Each execution-relevant option must be named in the profile. An unenumerated option observed on a reviewed tool makes the profile malformed. Acceptance tests must change each enumerated definition or execution option independently and prove `definition_incompatible` or `execution_option_incompatible`.

## 8. Lifecycle Seams and Snapshot Rules

### 8.1 First provider turn

Every path into `_runAgentPrompt()`, including ordinary prompt and `sendCustomMessage({triggerTurn:true})`, must execute this sequence before `Agent.prompt()` calls `createContextSnapshot()`:

```text
establish active run generation
  -> classify eligibility
  -> refresh eligible adapter contributions
  -> run configured active-inventory mutators
  -> resolve duplicate winners
  -> prepareTurn(exact agent.state.tools objects)
  -> install those exact objects for createContextSnapshot()
  -> Agent.prompt()
```

`before_agent_start` may supply ordinary-prompt inputs but cannot be the only preparation path. TriggerTurn-first must traverse the common `_runAgentPrompt()` preparation seam.

### 8.2 Later provider turns

Before `prepareNextTurnWithContext` installs tools for a later provider turn, the host must repeat eligibility, adapter/mutator refresh, winner resolution, and `prepareTurn` against the exact next `agent.state.tools` objects. The resulting exact objects become the next `context.tools`.

A current provider turn and its tool-call batch keep their current snapshot. Ordinary registration/activation changes affect only a later provider turn. Queued steer/follow-up input injected into the current Agent run does not itself create a new snapshot; it observes refreshed tools only when the documented later-turn boundary is crossed.

### 8.3 Provider and executor binding

Provider-visible definitions must be serialized from the current `context.tools`. Tool lookup, parameter validation, and execution must use the same objects from that same `currentContext.tools`. There must be no separate registration-ID lookup, name-only rebind, copied execute closure, or package registry between compatibility evaluation and execution.

## 9. Duplicate Winners, Changes, and Revocation

Duplicate behavior is deterministic: the object present in the host-produced `agent.state.tools` after existing configured-extension order, same-owner refresh, and active mutators is the winner for that turn. Compatibility binds to that exact object. A same-name candidate that loses cannot be dispatched.

- Ordinary add/remove/replace after a snapshot: the current turn keeps its exact objects; a later provider turn refreshes and may choose a new winner.
- Security removal/revocation: increment the revocation epoch or invalidate the run generation. Any not-yet-started execution from the affected current snapshot must fail `revoked`; later turns omit/re-evaluate the tool.
- Reload/runtime replacement: invalidate the old run generation. Current and future old-generation calls/callbacks fail `stale_generation`; no same-name fallback is allowed.
- A late callback carries its originating run/turn generation. It must never attach to the current generation.

## 10. Execution-Time Authority Guard

Immediately before invoking `tool.execute`, the host must verify:

- the call belongs to the current Agent run and turn generation;
- the tool is the exact object pinned in that turn's `currentContext.tools`;
- the run generation is active;
- the tool/profile has not been security-revoked;
- the compatible outcome remains the outcome for that object and turn.

Failure blocks before package side effects. `stale_generation` and `revoked` are distinct. Package-owned JIT validation follows this host guard and may still reject stale Skill, Role, Agent, model, workspace, or lifecycle state.

## 11. `pi-herdr-subagents/subagent_spawn` Profile

The first profile is `pi-herdr-subagents/subagent_spawn` version 1. Its complete fixture contract is [compatibility-profile.md](../works/host-effective-tool-inventory/compatibility-profile.md). It must cover:

- Pi and agent-core exact versions, platform/runtime, configured and resolved extension paths;
- reviewed digest scope and its explicit trust limits;
- `subagent_spawn` provider-visible semantics;
- fixed `handler` Agent and exact prompt/label/taskSlug/model/thinking mapping;
- normal Skill and reference access;
- stable task identity and YAML Result persistence/return;
- exact object snapshot binding and execution-time guard;
- host-private evidence and the exposed coded outcome;
- the Router/Harness read path.

The profile is unexecuted and not admitted until generated on a controlled revision and independently reviewed. Historical T1 research is semantic decision evidence only.

## 12. Failure Contract and Router Mapping

| Host code | Current-turn effect | Future-turn effect | Router code |
|---|---|---|---|
| `tool_unavailable` | no compatible outcome/dispatch | refresh may recover | `delegation_tool_unavailable` |
| `ineligible_runtime` | protected tools omitted | remains omitted until positive classification | `delegation_contract_incompatible` |
| `configured_path_mismatch` | incompatible | incompatible until profile/runtime agrees | `delegation_contract_incompatible` |
| `resolved_path_mismatch` | incompatible | incompatible until exact loader result agrees | `delegation_contract_incompatible` |
| `digest_mismatch` | incompatible | incompatible until reviewed scope agrees | `delegation_contract_incompatible` |
| `version_mismatch` | incompatible | incompatible until profile/runtime agrees | `delegation_contract_incompatible` |
| `platform_runtime_mismatch` | incompatible | incompatible until profile/runtime agrees | `delegation_contract_incompatible` |
| `definition_incompatible` | incompatible | later compatible definition may recover | `delegation_contract_incompatible` |
| `execution_option_incompatible` | incompatible | later compatible options may recover | `delegation_contract_incompatible` |
| `malformed_profile` | incompatible | blocked until profile repair | `delegation_contract_incompatible` |
| `profile_unavailable` | incompatible | blocked until trusted profile exists | `delegation_contract_incompatible` |
| `stale_generation` before resolve | no resolve | new generation re-evaluates | `delegation_contract_incompatible` |
| `stale_generation` at launch guard | no execute, no fallback | new Router pass required | `delegation_launch_failed` |
| `revoked` | no execute even if provider saw tool | later turns omit/re-evaluate | `delegation_contract_incompatible` before resolve; `delegation_launch_failed` at launch |

Router coordination output must preserve `host.code` as a nested stable field rather than only message text. A model-visible or model-submitted compatibility projection, `profileId`/version, run/turn generation, path/digest, or host code must never create, replace, or mutate the host-private current-turn outcome; only `readOutcome` on the non-model-addressable host capability supplies that outcome.

## 13. Acceptance Conditions

The linked matrices remain unexecuted. Future completion must prove on one revision:

1. ordinary and triggerTurn-first paths use the common pre-`Agent.prompt()` seam;
2. later turns revalidate before `prepareNextTurnWithContext` while the current tool batch keeps its objects;
3. provider serialization and execution use identical `context.tools` object references;
4. each eligibility class and conflict precedence fails closed before provider exposure;
5. exact configured/resolved path rules reject unsupported Windows aliases;
6. profile path/digest/version claims remain compatibility admission, never publisher/runtime/closure attestation;
7. all semantic fields and changed execution options are deterministic and tested;
8. duplicate winner, ordinary removal, security revocation, reload, and stale callback effects match Sections 9-10;
9. nested host failures map one-to-one to Router coordination codes, with resolve-before and post-resolve launch-guard boundaries tested separately;
10. forged model input containing a compatible projection, profile/version, run/turn generation, path/digest, or host code cannot replace the host-private current-turn outcome and cannot cause resolution or dispatch;
11. Host -> #36 -> #3 serial implementation stops if the actual host seams contradict this contract.

## 14. Non-Goals

This version does not define signed publishers, package-manager trust, dependency-graph attestation, transformed jiti byte capture, execute-closure hashing, Windows file-ID/case/symlink/junction/hardlink equivalence, extension sandboxing, remote tool identity, persisted snapshots, cross-host portability, Toolbelt product policy, Handler lifecycle, or a package-owned registry.

## 15. Acceptance Boundary

This Specification and linked Host/#36/#3 package remain draft, unaccepted, unimplemented, and unexecuted. The repaired set requires fresh independent review and one later consolidated user confirmation before acceptance. No confirmation mechanism is prescribed. This documentation work is not review, confirmation, implementation authorization, staging, or commit.

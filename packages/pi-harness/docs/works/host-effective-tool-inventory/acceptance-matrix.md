# Acceptance Matrix: Host Effective Tool Inventory

- Status: draft; unaccepted; unimplemented; unexecuted
- Updated: 2026-08-22
- Authority: [Effective Tool Inventory Specification](../../spec/effective-tool-inventory.md)
- Profile: [Host Compatibility Profile v1](compatibility-profile.md)

All rows are planned and unexecuted. No row is runtime completion evidence.

## Observation Layers

Capture separately: adapter contribution, host eligibility inputs/classification, post-mutator exact tool objects, provider-visible definition, host outcome/nested code, run/turn generation, pinned object identity, executed object identity, revocation state, and side effects.

## Host Cases

| ID | Scenario | Required evidence | Gate |
|---|---|---|---|
| H01 | Ordinary first prompt | Preparation occurs inside common `_runAgentPrompt` seam before `Agent.prompt/createContextSnapshot`. | P |
| H02 | `triggerTurn:true` is first run | Same preparation occurs without `before_agent_start` rescue; equivalent state yields equivalent objects/outcomes. | P |
| H03 | Queued steer/follow-up during current run | Current tool batch keeps its objects; queued input alone does not rebuild a snapshot. | P |
| H04 | Later provider turn | Revalidation occurs before `prepareNextTurnWithContext`; later context receives exact newly authorized objects. | P |
| H05 | Provider then tool execution | Provider definition and executor closure are read from the identical `context.tools` object reference. | P |
| H06 | Standard main, custom-prompt Handler child, Herdr pane child, indeterminate/conflict | Only positive standard main exposes protected tools; precedence and fail-closed classification match Spec. | P |
| H07 | Model text/description/package metadata/late execute rejection claims eligibility | None establishes positive eligibility or repairs provider exposure. | P |
| H07A | Model submits a forged compatible projection, profile/version, run/turn generation, path/digest, or host code | The non-model-addressable `readOutcome` source and permission boundary are observed; private current-turn outcome is unchanged; forged fields cause neither `resolved` nor dispatch. | P |
| H08 | Configured versus exact loader-resolved paths | Both remain separate; only exact reviewed loader output matches. | P |
| H09 | Windows case/drive/UNC/short-name/symlink/junction/hardlink alias | Unsupported equivalence fails `resolved_path_mismatch`; no invented canonical identity. | P |
| H10 | Reviewed digest/version match and mismatch | Match is compatibility admission only; mismatch has exact code; no publisher/runtime/closure claim. | P |
| H11 | Each definition field and each execution option changes independently | Deterministic semantic comparison rejects with `definition_incompatible` or `execution_option_incompatible`. | P |
| H12 | Two extensions register same name | Existing configured-order/mutator output yields one exact winning object; loser is neither approved nor dispatched. | P |
| H13 | Ordinary add/remove/replace after current snapshot | Current tool batch keeps its object; later provider turn refreshes. | P |
| H14 | Security removal after provider sees tool, before execute | Execution-time guard returns `revoked`; zero package side effects; later turn omits/re-evaluates. | P |
| H15 | Reload/runtime replacement during or after turn | Old generation/callback returns `stale_generation`; no same-name fallback; new run rebuilds. | P |
| H16 | Profile missing/malformed/platform-version mismatch | Exact host code is emitted and preserved; no compatibility or dispatch. | P |

## #36 Adapter Cases

| ID | Scenario | Required evidence | Gate |
|---|---|---|---|
| A36-01 | Harness eligible ordinary/trigger first | Current Resolver contribution reaches the host before both first snapshots. | P |
| A36-02 | Harness custom-prompt Handler child/indeterminate | No eligible Resolver object or provider exposure. | P |
| A36-03 | Herdr eligible parent | Seven exact `subagent_*` definitions contribute atomically. | P |
| A36-04 | Herdr pane child/indeterminate | None of seven parent tools is eligible or visible. | P |
| A36-05 | Toolbelt-style active mutation | Mutation completes before authorization; exact resulting objects form the snapshot. | P |
| A36-06 | Skill/Role/Agent/model becomes stale | Package JIT validation blocks before delegation/spawn side effects. | P |
| A36-07 | Adapter preparation fails | Deterministic failure; no partial atomic set; unrelated host tools remain isolated. | P |
| A36-08 | Security revocation/reload callback | Host guard blocks before package execution; adapter cannot self-override. | P |

## #3 Consumer Cases

| ID | Scenario | Required evidence | Gate |
|---|---|---|---|
| C3-01 | Approved v1 `subagent_spawn` object | Host outcome is compatible only for exact current object/profile/run/turn. | P |
| C3-02 | Visible semantics match but exact object/path/digest/profile differs | Exact nested host incompatibility; no resolve/launch. | P |
| C3-03 | Historical T1 exists without current outcome | Router blocks; T1 remains decision evidence only. | P |
| C3-04 | Compatible then Resolver `resolved` | Next environment action is one exact `subagent_spawn`; host executes pinned object. | P |
| C3-05 | Host outcome missing/malformed/stale/revoked before resolution | One-to-one Router mapping preserves nested `host.code`; stale maps to `delegation_contract_incompatible`; no resolve/fallback. | P |
| C3-05A | Model submits forged compatibility fields | Compatible projection, profile/version, run/turn generation, path/digest, and host code cannot replace the private Host outcome; no resolve/launch. | P |
| C3-06 | Generation/revocation changes after `resolved` at launch execute guard | `delegation_launch_failed` with nested host code; no package side effect or fallback. | P |
| C3-07 | Backend reject/invalid launch identity | Stable launch code; no retry/substitution/false running claim. | P |
| C3-08 | Successful launch/Result | Pass ends; later notification starts another pass; Result contract remains unchanged. | P |

## Failure Evidence

For each failed row record exact revision, profile/interface versions, Pi/core/platform/runtime, configured/resolved paths (without sensitive contents), expected/observed digest scope, lifecycle sequence, exact object-reference observations, eligibility, run/turn generation, revocation, nested host code, Router code, and side-effect inventory.

## Completion Rule

Every `P` row must pass on one integrated revision after authority review/confirmation and authorized implementation. Names, schema, package/version, a current filesystem hash, historical T1, model self-report, or an ordinary prompt inserted into triggerTurn-first cannot substitute. Completion also requires native gates and independent final review.

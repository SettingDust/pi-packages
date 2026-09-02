# T1 Research: `@settingdust/pi-herdr-subagents` Source-Mapping Baseline

- Status: reproducible historical/source baseline; it cannot prove a future or current model-visible registration; not authority, acceptance, or implementation authorization
- Work: [Atomic Router Delegation](work.md)
- Related derived material: [Context](context.md), [Plan](plan.md), [Tasks](tasks.md)
- Accessed: 2026-08-22
- Source boundary: Git `b858da269738a9796877b9d1430c6fa45406d110` on `main`, with a dirty working tree recorded at access. This report describes inspected source, not a clean committed revision.

## Objective and Boundary

T1 establishes the reusable package-owned source mapping required by `tasks.md` T1 for the first `@settingdust/pi-herdr-subagents` `subagent_spawn` profile. It does not inspect, enumerate, invoke, or prove the `subagent_spawn` schema and description model-visible in a future or current parent Router pass.

No source, tests, settings, Git history, Herdr state, or subagent lifecycle were changed or called for this research. The completed prior T1 trace Result was treated as input; the source ranges below were independently rechecked where available in this Handler.

## Evidence Objects

| Locator | Title | Claim | Support | Accessed | Scope |
|---|---|---|---|---|---|
| `packages/pi-herdr-subagents/src/index.ts:319-333` | Agent registry | The backend discovers configured, global, and project Agent definitions and resolves an Agent by name. | `AgentRegistry.discover` loads those roots; `get` returns the selected definition. | 2026-08-22 | Registry discovery and lookup. |
| `packages/pi-herdr-subagents/src/index.ts:462-480` | Spawn preflight | Spawn validates explicit model, canonical task slug, and Agent before allocating a task identity; it then reserves an ID and starts generation 1. | `validateExplicitSpawnModel`, `validateTaskSlug`, and `resolveAgent` precede `reserveSubagentId` and `start`. | 2026-08-22 | Initial spawn path. |
| `packages/pi-herdr-subagents/src/index.ts:601-616` | Stable identity reservation | The runtime reserves a canonical `subagentId` from the task slug and avoids extant session/artifact names. | `reserveSubagentId` checks task session/artifact paths before creating the artifact directory. | 2026-08-22 | ID allocation only. |
| `packages/pi-herdr-subagents/src/index.ts:619-702` | Child launch | The runtime persists queued/running task state, launches a child Pi in the delegated working directory, supplies the resolved Agent body as `--system-prompt`, and appends the Handoff prompt. | `start` builds the task, persists it, creates a tab, invokes child Pi with `--system-prompt`, `read,bash,edit,write,subagent_done`, and the supplied prompt. | 2026-08-22 | Child startup and invocation forwarding. |
| `packages/pi-herdr-subagents/src/index.ts:689-696` | Invocation forwarding | The child receives the supplied prompt and optional exact model/thinking launch arguments. | `start` appends `input.launchArgs` and the supplied prompt to the child invocation. | 2026-08-22 | Prompt/model/thinking forwarding. |
| `packages/pi-herdr-subagents/src/index.ts:732-743,946-972,1022-1033` | Result persistence and retrieval | A generation-specific Result is validated, terminal state is persisted, a terminal notification is attempted, and later `join` returns the terminal task snapshot. | `join` waits for settlement; `readResult` validates identity/status/result; `settle` persists and calls `notifyTerminal`. | 2026-08-22 | Result/notification/join path. |
| `packages/pi-herdr-subagents/extensions/pane-child.ts:49-80` | Handler completion bridge | `subagent_done` atomically writes the child generation's completed YAML Result and then shuts down the child. | `finish` writes a temporary result, renames it to the generation result path, and `subagent_done` awaits it. | 2026-08-22 | Child completion only. |
| `packages/pi-herdr-subagents/src/index.ts:1239-1263` | `subagent_spawn` contract | The package registers `subagent_spawn` with `agent`, non-empty `prompt` and `label`, optional `taskSlug`, `model`, and `thinking`; its description says Router supplies canonical identity and waits for terminal notification. | `createSubagentTools` defines the schema and delegates to `runtime.spawn`; runtime validation rejects an absent/invalid task slug. | 2026-08-22 | Package-owned tool schema and description. |
| `packages/pi-herdr-subagents/src/index.ts:1392-1419,1557-1581` | Parent tool activation and notification delivery | The parent extension discovers Agents, registers the `subagent_*` tools before an agent run, and flushes terminal notifications at the settled/idle boundary. | `subagentsExtension` returns early in a child, then discovers/registers tools in `before_agent_start`; `agent_settled` requests delivery. | 2026-08-22 | Extension activation and parent notification coordination. |

## Requirement Mapping

| B.3 / backend-profile requirement | Source-baseline conclusion | Evidence |
|---|---|---|
| Tool availability | The package owns a `subagent_spawn` registration and parent activation path. This is not proof that a particular Router pass exposes that registration. | `index.ts:1239-1263,1392-1419,1557-1567` |
| Fixed `handler` | The package exposes the current local Agent-name enum and resolves the supplied Agent before ID allocation. A source inspection cannot prove that `handler` appears in a future pass's visible enum. | `index.ts:319-333,462-480,1239-1256` |
| Exact invocation | The package schema names prompt, label, taskSlug, model, and thinking; runtime requires canonical taskSlug and forwards input prompt/model/thinking without a backend fallback path in the inspected source. | `index.ts:462-480,619-702,1239-1256` |
| Handler instructions | The child uses the resolved local Agent body as system prompt and appends the supplied Handoff prompt. | `index.ts:619-702` |
| Dynamic Skills | The backend schema has an Agent enum, not a Skill enum; child Pi has `read`, so selected Skills remain loaded through Pi's normal mechanism rather than copied through spawn. | `index.ts:689-690,1239-1263` |
| References | The child starts in the delegated `cwd` and has `read`; Handoff content is appended as prompt rather than backend-expanded reference content. | `index.ts:619-702` |
| Stable identity | Spawn validates before allocation, reserves a canonical ID, persists task state, and returns the task snapshot. | `index.ts:462-480,601-616,619-702` |
| Result return | The child atomically persists a generation Result; the runtime validates, persists terminal state, notifies, and supports later join. | `pane-child.ts:49-80`; `index.ts:732-743,946-972,1022-1033,1257-1263` |

## Conclusions

1. **Fact:** The inspected package source provides the reusable first-profile mapping from one resolved Handoff to one independently launched Handler generation, with the required fixed-Agent, invocation, child-instruction, workspace/read-access, identity, Result, notification, and join paths.
2. **Conclusion:** This source baseline is compatible with the static/package-owned portion of the T1 mapping. It does not require or imply a backend transaction that executes research, implementation, and independent review inside one Handoff; those are separate Handler outcomes under Amendment B.1.
3. **Fact:** `subagent_resume` starts a later generation for an existing task and is not the initial `resolved -> subagent_spawn` mapping. | `index.ts:563-581,1257-1263`.
4. **Uncertainty:** This Handler cannot establish the schema, description, active tool inventory, or provenance of a current parent Router pass. A successful child launch demonstrates only that this historical Handler execution launched; it cannot prove later/current model-visible registration.
5. **Conclusion:** T1 must be reused only as the source baseline. For every later delegation, the Router still must establish the current pass's model-visible contract and fail closed when it cannot. T1 alone never permits resolution or launch.

## Negative Evidence and Limits

| Selection method | Result | Meaning |
|---|---|---|
| Inspected `createSubagentTools` and `SubagentRuntime.start` for a backend Skill enum/filter or copied Skill bodies. | `empty` | In this bounded source scope, no static backend Skill list was found; this is not a proof about other extensions or a future active tool replacement. |
| Inspected the package tool schema/description and activation source for a current-pass-visible provenance token binding a same-named visible tool to this source implementation. | `empty` | The inspected source does not itself provide a current-pass discriminator that proves a model-visible registration is this implementation. |
| Attempted to use this child Handler as evidence of the parent Router's active tool inventory. | `access-blocked` | The Handler's permitted tool set does not expose the parent Router model-visible inventory, and the T1 boundary forbids subagent/Herdr lifecycle probes. |

The second finding is the open P1 recorded by the fresh review: the authority currently requires both a current visible contract and source mapping but does not define a provenance channel binding them. This report preserves that limitation; it neither narrows the authority nor invents an implementation solution.

## Verification Performed

- Read the prior completed T1 trace Result and fresh review Result supplied to this Handoff.
- Independently inspected the package source ranges listed above, plus `pane-child.ts:49-80`.
- Independently inspected Router Delegation Specification Amendment B.1-B.6 and Backend Adaptation Specification sections 2-5 to classify the report as source baseline only.
- Recorded the supplied trace's repository boundary: `b858da269738a9796877b9d1430c6fa45406d110` on `main` with a dirty worktree.

No runtime tool-inventory probe, child lifecycle invocation, test, source edit, settings edit, or Git mutation was performed.

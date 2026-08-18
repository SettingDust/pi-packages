# Router Delegation Specification

## 1. Runtime Surface

The `pi-harness` extension replaces Pi's default main-session system prompt with the Router operating contract and always registers `/harness config`, which opens the Model Role configuration TUI.

When at least one Model Role is currently available, the extension also registers `resolve_delegation`, which prepares but does not start a Handler invocation.

The package bundles `agents/handler.md` and declares it through `pi.agents`. A compatible delegate environment resolves the fixed `handler` Agent from its own Agent registry. The Resolver never returns a Handler name or path, and the Router never selects a Handler.

## 2. Dynamic Resolver Schema

Before an agent response is generated, the extension discovers the current Skills and reads configured Model Roles. It creates or replaces the `resolve_delegation` schema using:

- all discovered Skill names for `handoff.primarySkill`;
- all discovered Skill names for `handoff.companionSkills[]`;
- all currently available Model Role names for `modelRole`.

Role descriptions are included in the generated schema. If configuration changes through `/harness config`, the extension refreshes the resolver schema before the next Router decision.

## 3. Resolver Input

```yaml
handoff:
  objective: string
  primarySkill: skill-name
  companionSkills: [skill-name]
  context:
    - ref: relative-or-absolute-path
      purpose: why-the-handler-needs-it
    - inline: short-session-context
      purpose: why-the-handler-needs-it
  constraints:
    - non-empty constraint text
  deliverables:
    - non-empty expected-output text
modelRole: configured-role-name
```

`objective`, `primarySkill`, and `context` are required. `companionSkills` defaults to an empty list; its values must be unique and must not repeat `primarySkill`. Each context item must contain exactly one of `ref` or `inline`, plus a non-empty `purpose`. `constraints` and `deliverables` are optional `string[]` fields. A reference path resolves from the current workspace when relative; an absolute path is accepted. The Resolver must reject a missing or unreadable reference before a Handler starts.

## 4. Resolver Output

A successful resolution returns:

```yaml
status: resolved
prompt: yaml-handoff
model: provider/model
thinking: configured-thinking-level
```

A validation block returns:

```yaml
status: blocked
code: invalid_config | invalid_skill | invalid_reference | unknown_role | unavailable_model | invalid_thinking
message: actionable explanation
```

The `prompt` value is YAML representing the validated Handoff only. Handler identity is a fixed delegate-environment contract: the environment resolves `handler` from its own Agent registry. Expected validation blocks are results, not thrown tool errors.

## 5. Handoff Prompt

```yaml
objective: ...
primarySkill: ...
companionSkills: []
context:
  - ref: ...
    purpose: ...
constraints:
  - ...
deliverables:
  - ...
```

Handoff prompts do not contain the Router's candidate set, Model Role, Handler identity, backend implementation details, or copied contents of referenced files.

## 6. Handler Result

```yaml
status: completed | partial | blocked | failed
summary: concise status summary
report: markdown report
artifacts:
  - ref: relative-or-absolute-path
    purpose: produced output
```

`status`, `summary`, and `report` are required. `artifacts` is optional. A Result may describe risks and limitations in `report`, but it must not provide `suggestedNext`, `nextAction`, `nextSkill`, or another field that controls Router workflow.

- `completed`: the Handoff objective and requested deliverables are complete.
- `partial`: useful work is complete, but part of the objective or deliverables remains for later work.
- `blocked`: progress requires an external input, permission, decision, or unavailable dependency.
- `failed`: the Handler attempted the work but encountered an execution error or technical impossibility.

Artifact references report produced output; they are not revalidated at Result parsing time. If the Router passes an artifact to another Handler as `context.ref`, that later Resolver call validates it.

## 7. Resolution Validation

At execution time, the Resolver repeats all checks represented by the generated schema. It verifies Skill identity and uniqueness, current Role configuration, current model/authentication/thinking availability, and every context reference before serializing YAML.

A failed check returns a blocked resolution with a stable code and actionable message. The Resolver does not start a Handler, retry another Role, or substitute a model. Unexpected extension failures remain tool errors.

Handler-time reference failures and work failures are Handler Results, not Resolver failures.

## 8. Router Loop

A Router pass begins from either a user input or a Handler completion notification. The Router may use user input, package configuration, Skill information, and prior Handler Results, but it must not perform project-domain reading, research, editing, execution, or independent verification.

The Router must respond directly only for coordination work: clarification, a status or Result summary, completion, blocking conditions, or risk escalation. When substantive work is necessary, it selects one primary Skill, optional companion Skills, a Model Role, and Handoff context, then calls `resolve_delegation`. The environment may then launch the fixed registry-resolved Handler using the returned invocation.

The Router may resolve and launch several Handlers concurrently when it judges the work independent. It is responsible for that judgment. No v0.1 runtime mechanism prevents overlapping edits or other conflicting work.

When a Handler Result arrives, the Router may use it immediately to respond or start additional work. It may instead take no follow-up action and remain idle for another completion notification. There is no batch-join requirement and no explicit wait tool.

## 9. Handler Completion Notification

The delegate environment injects a normalized completion notification into the Router context:

```yaml
source: handler_result
taskId: backend-assigned-id
objective: delegated-objective
result:
  status: completed | partial | blocked | failed
  summary: concise status summary
  report: markdown report
  artifacts: optional-artifact-list
activeTasks:
  - taskId: backend-assigned-id
    objective: delegated-objective
    status: running
```

`taskId` identifies the completed invocation. `activeTasks` is a best-effort summary of other running Handlers supplied by the environment. The notification does not prescribe a next action; it merely begins the next Router pass.

## 10. Model Role Configuration

Pi settings contain the configuration under the top-level `harness` key:

```json
{
  "harness": {
    "roles": {
      "role-name": {
        "description": "When the Router should choose this Role",
        "model": "provider/model-id",
        "thinking": "off | minimal | low | medium | high | xhigh"
      }
    }
  }
}
```

Global settings provide the baseline. When the project is trusted, its `harness` object shallowly overlays the global object; an explicitly configured project `roles` field therefore replaces the global `roles` field.

The TUI first selects Global or Project scope; Project is available only for trusted projects. Without a project override, the Project view inherits Global Roles. The first project mutation copies the full inherited set into a project override, and resetting that override restores inheritance. Writes use a settings-file lock and preserve unrelated Pi settings.

On first configuration, the TUI offers `basic`, `standard`, and `advanced` as templates. One selected base model is used for all three, with the closest supported low, medium, and high thinking levels. The templates have no reserved status. Every Role's name, description, model, and thinking level may be edited, and every Role may be added or deleted.

A Role is available only when its model exists in Pi's current model registry, required authentication is present, and its thinking value is accepted for that model. Only available Roles enter the dynamic `modelRole` enum. When none are available, the extension omits `resolve_delegation` and directs the user to `/harness config`. Automatic loading reports invalid configuration without overwriting it. The TUI requires explicit confirmation before replacing an invalid `harness` object and does not overwrite malformed settings JSON.

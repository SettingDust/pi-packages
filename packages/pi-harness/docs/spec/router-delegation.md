# Router Delegation Specification

## Contents

Historical numbered sections:

1. [Runtime Surface](#1-runtime-surface)
2. [Dynamic Resolver Schema](#2-dynamic-resolver-schema)
3. [Resolver Input](#3-resolver-input)
4. [Resolver Output](#4-resolver-output)
5. [Handoff Prompt](#5-handoff-prompt)
6. [Handler Result](#6-handler-result)
7. [Resolution Validation](#7-resolution-validation)
8. [Router Loop](#8-router-loop)
9. [Handler Completion Notification](#9-handler-completion-notification)
10. [Model Role Configuration](#10-model-role-configuration)

Draft amendment extension:

- [Amendment Extension A: Authority-First Admission](#amendment-extension-a-authority-first-admission-draft)
  - [A.1 Admission Decision](#a1-admission-decision)
  - [A.2 Admission Validation and Blocked Resolution](#a2-admission-validation-and-blocked-resolution)
  - [A.3 Acceptance Recorder and Session State](#a3-acceptance-recorder-and-session-state)
  - [A.4 Authority Drift and Bounded Amendment](#a4-authority-drift-and-bounded-amendment)
  - [A.5 Resolver/Backend Interaction](#a5-resolverbackend-interaction)
  - [A.6 Acceptance Criteria](#a6-acceptance-criteria)
  - [A.7 Non-goals and Future Options](#a7-non-goals-and-future-options)
  - [A.8 Unresolved Contract Decisions](#a8-unresolved-contract-decisions)

Sections 1-10 are the complete numbered series available in reachable Git history. Sections 11 and 12 are intentionally not created because no reachable source establishes them. The authority-first material is retained below as a separately identified draft amendment, not as fabricated historical sections.

## 1. Runtime Surface

The `pi-harness` extension replaces Pi's default main-session system prompt with the Router operating contract and always registers `/harness config`, which opens the Model Role configuration TUI.

When at least one Model Role is currently available, the extension also registers `resolve_delegation`, which prepares but does not start a Handler invocation.

The package bundles `agents/handler.md` and declares it through `pi.agents`. A compatible delegate environment resolves the fixed `handler` Agent from its own Agent registry. The Resolver never returns a Handler name or path. When a delegate tool accepts an Agent argument, the Router passes the fixed literal `handler`, never a Handler path or body.

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

The `prompt` value is YAML representing the validated Handoff only. Handler identity is a fixed delegate-environment contract: for a tool that accepts an Agent argument, the Router supplies `handler` and the environment resolves it from its own Agent registry. The Resolver returns no Handler name, path, or body. Expected validation blocks are results, not thrown tool errors.

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

The Router must respond directly only for coordination work: clarification, a status or Result summary, completion, blocking conditions, or risk escalation. When substantive work is necessary, it selects one primary Skill, optional companion Skills, a Model Role, and Handoff context, then calls `resolve_delegation`. It maps the resolved prompt, model, and thinking to the environment tool; when calling `subagent_spawn`, it supplies `agent: handler` and no Handler path or body. The environment resolves that Agent locally and launches the Handler.

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

## Amendment Extension A: Authority-First Admission (Draft)

**Status: draft; unaccepted and unimplemented.** This additive amendment requires fresh independent review of the exact Work/Plan/Tasks set, settlement of the unresolved decisions in [A.8](#a8-unresolved-contract-decisions), and explicit current-session user acceptance before implementation. It does not revise sections 1-10.

### A.1 Admission Decision

Before a resolved invocation is adapted to a delegate backend, the Router must choose one admission path:

- `atomic`: one bounded, small, behavior-neutral change for which Work/Plan/Tasks provide no meaningful control value;
- `planned`: work requiring coordination across steps or ownership boundaries, or work that changes architecture, security, migration behavior, durable/persistent behavior, or other material system behavior.

The Router must use `planned` when the work is multi-step, coordination-heavy, architectural, security-sensitive, migration-related, or changes durable/persistent behavior. The Router must not select `atomic` solely because it asserts `small` or `behavior-neutral`; it must provide the atomic evidence fields below. The atomic determination is soft judgment in this version: the validator can enforce evidence shape and consistency, but cannot prove semantic scope or neutrality from arbitrary repository text. The decision and basis must remain auditable.

`resolve_delegation` must receive admission metadata in addition to the existing `handoff` and `modelRole`:

```yaml
admission:
  path: atomic | planned
  basis:
    - short evidence statement
  verification:
    - focused check the Handler must perform
  reviewed:
    work: { ref: canonical-path, sha256: hex-digest }
    plan: { ref: canonical-path, sha256: hex-digest }
    tasks: { ref: canonical-path, sha256: hex-digest }
    setSha256: hex-digest
    review:
      reviewer: independent-review-identity
      outcome: approved
      reviewedAt: session-timestamp
  acceptance:
    sessionId: current-main-session-id
    acceptedAt: session-timestamp
    setSha256: hex-digest
    mode: explicit | bounded_amendment
  amendment:
    authorizedBy: current-user-confirmation-reference
    fromSetSha256: prior-digest
    toSetSha256: current-digest
    boundary: unchanged | bounded
```

`reviewed`, `acceptance`, and `amendment` are required only for `planned` admission. `basis` and `verification` are required for both paths. `reviewed` and `acceptance` must be absent for `atomic`; an atomic invocation must not pretend to have planned authority.

A planned reviewed set is exactly one Work, one Plan, and one Tasks document. Each document entry must contain its canonical readable `ref` and SHA-256 digest. The set digest must be calculated from the canonical tuple defined by ADR-0007. The review must identify the exact set digest, be independent of the implementation Handler, and have an approved outcome. Acceptance must identify the same set digest and the current main session.

### A.2 Admission Validation and Blocked Resolution

The Resolver must validate admission after ordinary Handoff/Skill/Role/reference validation and before returning `status: resolved`. A block is a normal resolution result and must not start a Handler.

The admission block codes are:

- `invalid_admission`: admission is missing, has an unknown path, has malformed fields, contains duplicate/extra planned materials, or violates path-specific shape;
- `invalid_atomic_basis`: atomic admission lacks a bounded objective basis or focused verification, or supplies incompatible planned evidence;
- `missing_authority`: planned admission does not identify exactly one Work, Plan, and Tasks material;
- `authority_drift`: a reviewed document or set digest no longer matches the current canonical bytes, or the accepted set is not the current reviewed set;
- `review_required`: planned admission lacks a fresh independent approved review for the exact reviewed set;
- `acceptance_required`: planned admission lacks explicit current-session acceptance for the exact reviewed set;
- `acceptance_expired`: acceptance belongs to another main session;
- `amendment_invalidated`: the proposed bounded amendment changes scope, architecture, dependencies, risk, behavior, or acceptance criteria, or lacks the required current-user authorization evidence.

Messages must name the missing or stale condition and identify the corrective evidence. Messages must not claim that a Handler can repair acceptance by editing the authority documents. A stale or absent admission blocks resolution even when the ordinary Handoff is valid.

The Resolver may verify readable references and supplied digest metadata. The Extension/session admission validator owns current-session acceptance, exact material rendering/capture, and the semantic bounded-amendment decision. A backend must not bypass either layer.

### A.3 Acceptance Recorder and Session State

The Harness Extension must provide an in-memory acceptance recorder scoped to the current main session. It must store:

- session identity;
- exact Work/Plan/Tasks canonical identities and per-document digests;
- set digest;
- independent review identity, outcome, and reviewed timestamp;
- acceptance timestamp and whether it was explicit or an authorized bounded amendment.

The recorder must not load acceptance from project Markdown or treat a user-editable project file as acceptance state. It must discard acceptance when the main session ends. The exact session identifier source and confirmation UI are implementation decisions that must remain compatible with supported Pi Extension APIs.

The Router renderer/user interaction must show the exact materials and their digests before acceptance is captured. A generic `start`, `continue`, `next`, or similar command is not explicit acceptance. The Router may explain a block or ask the user to review/confirm; it must not record confirmation from a Handler Result.

### A.4 Authority Drift and Bounded Amendment

Before every planned resolution, the validator must compare the current canonical identities/digests with the accepted record. Any difference invalidates the prior acceptance unless the user has authorized a bounded amendment and the amendment remains within the accepted boundary.

A bounded amendment must retain the same Work/Plan/Tasks identity set or explicitly update it through a reviewed exact set, must state the prior and new set digests, and must include current-user authorization captured by the Extension. A change to scope, architecture, dependencies, risk, behavior, or acceptance criteria is material and cannot use the amendment shortcut; it requires fresh independent review and explicit acceptance.

The implementation must retain an audit-relevant reason for invalidation or amendment in session state and in the Router-visible block/summary. It need not persist a cross-session audit log in this version.

### A.5 Resolver/Backend Interaction

`resolve_delegation` remains a preparation/validation operation. On an admission block it returns `status: blocked` and no invocation prompt/model/thinking. On success it returns the existing `status: resolved` shape; admission metadata is not added to the Handler YAML prompt unless a future authority explicitly requires it.

The Router must resolve admission before adapting to a backend. A backend capability check cannot substitute for admission, and a backend launch/result cannot create admission. For `pi-herdr-subagents`, the existing `subagent_spawn` mapping remains unchanged after successful resolution. The planned admission contract is the authority boundary defined by this amendment extension; the atomic-delegation companion rule is related interface work and is not included in this implementation scope.

### A.6 Acceptance Criteria

1. A valid atomic invocation with complete basis and focused verification can resolve without Work/Plan/Tasks.
2. An atomic invocation with absent or malformed basis is blocked with `invalid_atomic_basis` or `invalid_admission`.
3. A planned invocation without exactly one Work, Plan, and Tasks set is blocked with `missing_authority`.
4. A planned invocation with a missing, stale, mismatched, or non-approved review is blocked with `authority_drift` or `review_required`.
5. A planned invocation without current-main-session explicit acceptance is blocked with `acceptance_required` or `acceptance_expired`.
6. Editing any reviewed material after acceptance invalidates the record unless a valid bounded amendment is authorized; a material boundary change requires fresh review and confirmation.
7. Generic pacing text and Handler Results cannot record acceptance.
8. The Router renderer displays exact reviewed identities/digests before the Extension records acceptance.
9. The Resolver returns coded blocks before backend adaptation and does not permit a Handler to satisfy the gate through document edits.
10. The accepted planned set can be canonicalized deterministically to the same set digest across repeated validation.

### A.7 Non-goals and Future Options

This version does not implement child write-capability gating, a fixed stage machine, CI enforcement, cross-session persistent acceptance, automatic review selection, or backend-specific admission behavior. Those may be evaluated later under a new decision or amendment; they are not implied by this contract.

### A.8 Unresolved Contract Decisions

The following remain open and must be settled before implementation where they affect behavior:

- supported Pi API and user interaction primitive for explicit acceptance;
- stable main-session identifier and its lifetime boundary;
- runtime representation and trust source for independent review identity/outcome;
- whether the admission record needs a user-facing inspection command;
- whether digest verification reads raw bytes or a repository-normalized document representation beyond the canonicalization stated in ADR-0007.

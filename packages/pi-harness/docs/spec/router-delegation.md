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
  - [A.1 Admission Decision and Canonical Subject](#a1-admission-decision-and-canonical-subject)
  - [A.2 Admission Validation and Blocked Resolution](#a2-admission-validation-and-blocked-resolution)
  - [A.3 Private Receipt Registry and TUI Issuance](#a3-private-receipt-registry-and-tui-issuance)
  - [A.4 Drift and Bounded Amendment](#a4-drift-and-bounded-amendment)
  - [A.5 Resolver/Backend Interaction](#a5-resolverbackend-interaction)
  - [A.6 Acceptance Criteria](#a6-acceptance-criteria)
  - [A.7 Non-goals and Future Options](#a7-non-goals-and-future-options)
  - [A.8 D4-A Private Receipt Channel](#a8-d4-a-private-receipt-channel)

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

**Status: draft specification amendment; implementation under review.** D1-A through D4-A and the v0.1 TOCTOU boundary below are settled authority decisions for the current review. This amendment does not claim implementation completion; unresolved implementation findings remain tracked in the Work package. It does not revise sections 1-10.

#### Runtime Contract Decisions (D1-A through D4-A)

- **D1-A JIT:** planned admission must read the exact Work, Plan, and Tasks references, canonicalize them, and recompute canonical per-document, set, normalized-Handoff, and subject digests immediately before each resolution. Stored receipt values are comparison evidence only.
- **D1-B accepted v0.1 TOCTOU boundary:** the authority guarantee ends when the final JIT recheck succeeds and the Resolver returns `resolved`. v0.1 does not snapshot authority documents, hold a read lock, or require a backend preflight before the Handler reads them. A local writer or another Handler may therefore modify or replace a selected path after that recheck; the later Handler read is not guaranteed to observe the reviewed bytes. This is an accepted security limitation, not evidence that the Handler executed against immutable reviewed material.
- **D2-A runtime receipt:** the Extension issues a review receipt only after the `current-interactive-user`, acting independently of the implementation Handler, approves the exact current subject in the first supported TUI confirmation. An external independent-review report is evidence for that human review only; neither it, authority Markdown, a Handler Result, nor an earlier read is a receipt.
- **D3-A user-witnessed Extension receipt:** after a successful D2-A interaction, the Harness Extension renders the exact current subject and captures a second explicit confirmation through the supported Pi interaction. It stores the resulting acceptance receipt only in current-runtime-session memory. Free-text pacing, Router assertion, Handler output, and project-file edits are not acceptance.
- **D4-A private channel:** planned-admission tool input contains only the Work/Plan/Tasks path selectors. It must not contain a digest, reviewer, outcome, timestamp, session ID, review/acceptance/amendment object, receipt field, receipt ID, or receipt handle. The Extension alone derives subjects and creates, links, looks up, invalidates, and discards private D2/D3 registry entries.

The implementation boundary does not include an admission inspection command, backend-specific admission behavior, or the related `#3 atomic delegation` companion rule.

### A.1 Admission Decision and Canonical Subject

Before a resolved invocation is adapted to a delegate backend, the Router must choose one admission path:

- `atomic`: one bounded, small, behavior-neutral change for which Work/Plan/Tasks provide no meaningful control value;
- `planned`: work requiring coordination across steps or ownership boundaries, or work that changes architecture, security, migration behavior, durable/persistent behavior, or other material system behavior.

The Router must use `planned` when the work is multi-step, coordination-heavy, architectural, security-sensitive, migration-related, or changes durable/persistent behavior. The Router must not select `atomic` solely because it asserts `small` or `behavior-neutral`; it must provide the atomic evidence fields below. The atomic determination is soft judgment in this version: the validator can enforce evidence shape and consistency, but cannot prove semantic scope or neutrality from arbitrary repository text. The decision and basis must remain auditable.

`resolve_delegation` must receive admission metadata in addition to the existing `handoff` and `modelRole`:

```yaml
admission:
  path: atomic | planned
  basis:                         # required only for atomic
    - short evidence statement
  verification:                  # required only for atomic
    - focused check the Handler must perform
  authority:                     # required only for planned
    work: path
    plan: path
    tasks: path
```

For `atomic`, `basis` and `verification` are required and `authority` must be absent. For `planned`, `authority` is required, `basis` and `verification` must be absent, and `authority` must contain exactly the three fields `work`, `plan`, and `tasks`. All other `admission` or `authority` fields are invalid. A planned selector is untrusted path-selection data, not identity or approval evidence. `reviewed`, `review`, `acceptance`, `amendment`, `reviewer`, `outcome`, `reviewedAt`, `acceptedAt`, `sessionId`, every digest field, and every receipt ID or handle are forbidden at every nesting level of `admission`.

For planned admission, each `authority.{work,plan,tasks}` value must resolve through the same readable-reference algorithm as `handoff.context.ref`. After canonicalization, it must match exactly one distinct `handoff.context.ref`; references outside the selected tuple remain ordinary Handoff context and are not authority-set members.

After canonical path processing, the selected tuple must satisfy this planned-admission-only grammar:

```text
token     = [a-z0-9]+(?:-[a-z0-9]+)*
directory = <any canonical prefix>/docs/works/<work-name>
work      = directory/work.md
plan      = directory/[<phase>--]plan[-<slice>].md
tasks     = directory/[<phase>--]tasks[-<slice>].md
```

`<work-name>`, `<phase>`, and `<slice>` are `token` values. Brackets are optional. The three files must be direct members of the same `directory`; `work.md` is the only Work filename. Plan and Tasks must either both omit `<slice>` or use the identical `<slice>`. An optional `<phase>--` prefix is local organization only and does not create an admission lifecycle state. The tuple is exactly the three selected paths: the Extension must not scan the directory, infer a pair from filename recency, Work status, or document order, accept a manifest or alias, or admit an unselected member. Skills, Markdown headings or status text, and D2 review are not document-kind proof; this grammar plus the explicit selector positions supplies the v0.1 structural kind check.

The following algorithm is normative. All SHA-256 results are lower-case hexadecimal strings.

1. **Canonical path.** Resolve a reference against the current workspace when relative, then obtain its filesystem `realpath`. Replace every `\` code point with `/`. If the resulting string begins with an ASCII drive letter followed by `:`, lowercase that drive letter only. Encode the resulting string as UTF-8 without Unicode normalization, trimming, case folding beyond that drive letter, or further path rewrite. This is `path`.
2. **Canonical document bytes.** Read the file's raw bytes; reject unreadable or non-UTF-8 input. Replace every byte sequence `0D 0A` with `0A`, then every remaining `0D` with `0A`. Do not remove a UTF-8 BOM, trim content, normalize Unicode, or add a final newline. The resulting bytes are `documentBytes`; `sha256` is `SHA-256(documentBytes)`.
3. **Canonical JSON string.** Before canonical JSON encoding, reject planned admission with `invalid_admission` when any string value to be encoded contains an unpaired UTF-16 surrogate code unit. A paired high/low surrogate sequence represents its Unicode scalar and emits that scalar directly as UTF-8. A JSON string emits `\"` and `\\` for quotation mark and reverse solidus; emits `\b`, `\t`, `\n`, `\f`, and `\r` for U+0008, U+0009, U+000A, U+000C, and U+000D; emits every other U+0000–U+001F scalar as `\u00` plus two lower-case hexadecimal digits; and emits every other Unicode scalar directly as UTF-8. It emits no optional slash escapes, no other escapes, no whitespace, and no Unicode normalization. JSON arrays use `[` items separated by `,` `]`; objects use `{` members in the order written, separated by `,`, with `:` and no whitespace. This rule, not an implementation's default serializer, is the canonical JSON encoder used below.
4. **Set digest.** Construct these three entries in this exact array order, using the canonical JSON encoder: `[{"kind":"work","path":work.path,"sha256":work.sha256},{"kind":"plan","path":plan.path,"sha256":plan.sha256},{"kind":"tasks","path":tasks.path,"sha256":tasks.sha256}]`. `setSha256` is `SHA-256` of the UTF-8 bytes of that array.
5. **Normalized-Handoff digest.** Construct the exact normalized Handoff object in this key order: `objective`, `primarySkill`, `companionSkills`, `context`, `constraints`, `deliverables`. `companionSkills`, `constraints`, and `deliverables` are arrays; an omitted optional array normalizes to `[]`. Preserve every array order and every string value exactly after ordinary Handoff validation. Each context item is an object with keys `ref`, `purpose` in that order when it has a reference, or `inline`, `purpose` in that order when it has inline context; every `ref` uses its canonical path from step 1. `handoffSha256` is `SHA-256` of the UTF-8 canonical-JSON bytes of this object.
6. **Subject digest.** Construct `{"version":1,"setSha256":setSha256,"handoffSha256":handoffSha256}` in that exact key order with the canonical JSON encoder. `subjectSha256` is `SHA-256` of its UTF-8 bytes.

The D2/D3 subject is the tuple of the complete per-document identities, `setSha256`, `handoffSha256`, and `subjectSha256`. The derived `subjectSha256` is its lookup key; the retained components make substitution and drift diagnosable. No digest supplied by the model may replace a value from this algorithm.

The final JIT recheck is the last authority check in v0.1. A successful recheck authorizes the Resolver to return `resolved`, but does not snapshot the selected documents or bind a later Handler read to immutable bytes. v0.1 intentionally has no snapshot, read lock, or backend preflight for this interval; a local writer or concurrent Handler may change a selected path after resolution returns. Implementations must describe this as a residual and must not claim exact reviewed-byte execution binding.

### A.2 Admission Validation and Blocked Resolution

The Resolver must validate admission after ordinary Handoff/Skill/Role/reference validation and before returning `status: resolved`. A block is a normal resolution result and must not start a Handler.

The admission block codes are:

- `invalid_admission`: admission is missing, has an unknown path, malformed or extra fields, an authority selector that violates the A.1 tuple grammar, a forbidden receipt-shaped field or handle, or another path-specific shape violation;
- `invalid_atomic_basis`: atomic admission lacks a bounded objective basis or focused verification, or supplies incompatible planned evidence;
- `missing_authority`: after ordinary Handoff reference validation succeeds, planned admission does not identify exactly one distinct Work, Plan, and Tasks material whose canonical paths each match exactly one Handoff context reference;
- `receipt_corrupt`: private receipt state for the selected canonical authority path tuple lacks one unique internally consistent authenticated lineage head, or has a cyclic, cross-tuple, or inconsistent predecessor chain; it must fail closed before any UI interaction or resolution;
- `authority_drift`: the initially rendered current subject changes during an in-call D2/D3 or bounded-amendment flow, including the final JIT recheck before resolution;
- `review_required`: the current subject lacks D2 and D2 cannot be completed in this call, including unavailable, declined, or cancelled D2 interaction;
- `acceptance_required`: a current D2 exists but the current subject lacks D3 and D3 cannot be completed in this call, including unavailable, declined, or cancelled D3 interaction;
- `amendment_invalidated`: a same-path authenticated prior acceptance exists but the current user rejects bounded authorization or identifies a material scope, architecture, dependency, risk, behavior, or acceptance-criteria change.

A matching current D3 resolves without another confirmation, including when no dialog-capable TUI is available. A matching current D2 without D3 requires only D3. A different stored subject is historical comparison evidence, not a current receipt and not by itself an `authority_drift` result; A.4 selects its same-call flow. Thus unavailable UI returns `review_required` when D2 is next required and `acceptance_required` when only D3 is next required.

Messages must name the missing, stale, unavailable, rejected, or corrupt condition and identify the corrective interaction. Messages must not claim that a Handler can repair admission by editing authority documents. A stale or absent admission blocks resolution even when the ordinary Handoff is valid.

Ordinary Handoff reference validation has precedence over admission validation. An unreadable `handoff.context.ref`, including one intended to be a selected authority member, returns `invalid_reference` before `missing_authority` is considered. After ordinary reference validation succeeds, `missing_authority` covers an absent, duplicate, mismatched, or otherwise non-binding selected authority tuple; it does not replace `invalid_reference`.

The Resolver may verify public shape, readable references, authority-to-context binding, tuple grammar, and canonical values. The Extension/session admission validator owns private registry lookup, current-session checks, user rendering, D2/D3 capture, and bounded-amendment classification. A backend must not bypass either layer.

### A.3 Private Receipt Registry and TUI Issuance

The Harness Extension must keep its receipt registry private to its current runtime instance and current main session. It must begin empty on every Extension construction and must clear **all** entries on `session_shutdown`. On session change or rebind, it must discard every entry not bound to the newly active `sessionManager.getSessionId()` value; a new runtime instance starts empty. It must not persist entries to project Markdown, a settings file, a session artifact, a Handler prompt, a Resolver result, or a backend request.

A registry entry is Extension-generated and never model-addressable. Its minimum private data is:

```text
ReviewReceipt {
  issuer: "user-review-v1"
  reviewer: "current-interactive-user"
  sessionId
  authorityPathTuple
  work, plan, tasks: { path, sha256 }
  setSha256
  handoffSha256
  subjectSha256
  outcome: "approved"
  reviewedAt
}

AcceptanceReceipt {
  issuer: "extension-acceptance-v1"
  sessionId
  authorityPathTuple
  subjectSha256
  review: private link to the matching ReviewReceipt
  predecessor: private link to the prior same-tuple AcceptanceReceipt | absent
  mode: "explicit" | "bounded-amendment"
  acceptedAt
}
```

The Extension may maintain private implementation IDs and a private lineage index keyed by the canonical `(work.path, plan.path, tasks.path)` tuple. For each tuple, the index must contain either no lineage records or exactly one authenticated acceptance head. The first D3 for a tuple must have no predecessor; every D3 that advances an existing same-tuple lineage must link privately to the preceding head and atomically replace it as the only head. A.4 selects only that head as the authenticated prior acceptance. The selected chain must be acyclic; every predecessor must belong to the same canonical tuple and have internally consistent Extension-issued issuer, session, and subject fields. A missing or non-unique head for a nonempty lineage, an invalid predecessor link, a cycle, or inconsistent receipt fields is receipt corruption and returns `receipt_corrupt` before any UI interaction or resolution. The Extension must never return or accept implementation IDs, lineage state, or links as a model-visible receipt field or handle. A receipt is **authenticated prior** only if this Extension issued it in the active runtime session and its stored issuer/session/subject fields are internally consistent. A **current D2** matches the active session and every JIT per-document identity, `setSha256`, `handoffSha256`, and `subjectSha256`. A **currently valid acceptance** is a current D2 with its linked D3 matching those same values. An authenticated prior receipt that fails current-subject comparison remains historical comparison evidence; it cannot resolve planned admission.

A matching current D3 may be reused for later planned resolutions in its active runtime session without another D2, D3, or dialog-capable TUI. A matching current D2 without D3 may be reused only to request the missing D3; it never resolves by itself. Neither reuse extends across a session change, `session_shutdown`, or Extension construction. No receipt is revalidated by a non-TUI interaction: TUI is required whenever the Extension must issue D2, D3, or bounded authorization for a current subject.

For a planned request that needs receipt issuance, the Extension must use only a dialog-capable TUI (`ctx.mode === "tui"` and `ctx.hasUI === true`). It must JIT-read and render the exact Work/Plan/Tasks paths, document digests, set digest, Handoff digest, and subject digest before D2. A positive D2 response writes the D2 receipt. The Extension must JIT-recompute the complete subject before rendering and requesting the separate D3 confirmation. A positive D3 response writes the linked D3 receipt. It must JIT-recompute again immediately before returning `resolved`; any difference prevents current-subject reuse and returns `authority_drift` before backend adaptation. This final recheck ends the v0.1 authority guarantee. It does not snapshot the documents, hold a read lock, or require a backend preflight, so a later Handler read may observe bytes different from those rendered and approved.

The TUI may render an external independent-review report available through ordinary Handoff context as evidence for the D2 human decision. That report is not a receipt, cannot name a private receipt, and cannot satisfy D2 or D3 without the respective TUI confirmation. The implementation Handler cannot be the D2 reviewer. Generic `start`, `continue`, `next`, free text, Router claims, Handler Results, and project-file edits are never confirmation primitives.

When TUI conditions are not met, the Extension must not prompt, issue, or revalidate a receipt. It may still resolve a matching current D3 as defined above. Otherwise it returns the deterministic code in A.2: `review_required` when D2 is absent, or `acceptance_required` when current D2 exists and only D3 is absent. Atomic admission remains available.

### A.4 Drift and Bounded Amendment

Before every planned resolution, D1-A requires JIT recalculation of the complete subject. The Extension must first validate the selected tuple's private lineage under A.3; receipt corruption returns `receipt_corrupt` without prompting, falling through to another flow, or resolving. A stored D3 is currently valid only when its linked D2, current session, current per-document identities, `setSha256`, `handoffSha256`, and `subjectSha256` match that JIT value. A mismatch makes the old acceptance historical comparison evidence; it does not itself return `authority_drift` before the Extension applies this same-call transition.

1. If a currently valid D3 matches, the Extension resolves without a new confirmation. If a current D2 matches but D3 is absent, it requests only D3 in the same call; unavailable, declined, or cancelled D3 returns `acceptance_required`.
2. If no current D2 matches and there is no authenticated prior acceptance for the same canonical authority path tuple—including when the tuple changed—the Extension starts the explicit current-subject D2-then-D3 flow in the same call. Unavailable, declined, or cancelled D2 returns `review_required`; after D2, unavailable, declined, or cancelled D3 returns `acceptance_required`.
3. If no current D2 matches but the unique authenticated lineage head has the same canonical authority path tuple, the Extension may offer bounded authorization in the same call. It must render that head and the new document identities, set digests, Handoff digests, and subject digests and ask the current interactive user whether the delta remains within the accepted scope, architecture, dependencies, risk, behavior, and acceptance criteria. Unavailable UI leaves D2 next required and returns `review_required`. A negative, absent, or material-boundary answer returns `amendment_invalidated`; it does not fall through to an explicit flow in that call. An affirmative answer requires a new current-subject D2 and then D3, with D3 `mode: bounded-amendment` and a private predecessor link to that head. D2/D3 outcomes use the codes in item 2.
4. After any rendered subject or positive D2/D3/bounded-authorization interaction, the Extension must JIT-recompute before the next interaction and immediately before resolution. If that subject changed, it must not resolve and returns `authority_drift`. Newly created records may remain historical comparison evidence but cannot be a current acceptance.

No prior receipt, changed authority paths, or material boundary change bootstraps the bounded shortcut. The explicit flow and bounded shortcut are request-local interactions, not persistent Work lifecycle states; no Work status, file order, or prior directory member selects a future tuple. Cross-session audit persistence is not required.

### A.5 Resolver/Backend Interaction

`resolve_delegation` remains a preparation/validation operation. On an admission block it returns `status: blocked` and no invocation prompt/model/thinking. On success it returns the existing `status: resolved` shape; private registry data and admission metadata are not added to the Handler YAML prompt unless a future authority explicitly requires it.

The Router must resolve admission before adapting to a backend. A backend capability check cannot substitute for admission, and a backend launch/result cannot create admission. For `pi-herdr-subagents`, the existing `subagent_spawn` mapping remains unchanged after successful resolution. The planned admission contract is the authority boundary defined by this amendment extension; the atomic-delegation companion rule is related interface work and is not included in this implementation scope.

The v0.1 authority boundary ends at the successful final JIT recheck/`resolved` return. Immutable authority snapshots, read locks, and backend preflights that bind the Handler's later filesystem reads are explicitly outside this version. The implementation is under review against this boundary and must not represent the residual as closed.


### A.6 Acceptance Criteria

1. A valid atomic invocation with complete basis and focused verification can resolve without Work/Plan/Tasks.
2. An atomic invocation with absent or malformed basis is blocked with `invalid_atomic_basis` or `invalid_admission`.
3. A planned invocation selects exactly one tuple whose canonical paths satisfy A.1's direct-member Work/Plan/Tasks grammar, including a matched optional slice; it does not scan, infer, or admit another directory member.
4. Every selected authority path is distinct and occurs exactly once in Handoff context. An unreadable `handoff.context.ref`, including a selected authority member, is blocked first with `invalid_reference`; after ordinary reference validation succeeds, an absent, duplicate, or context-mismatched authority selector is blocked with `missing_authority`.
5. A planned tool call cannot submit a digest, reviewer, outcome, timestamp, session identity, receipt field, receipt ID, receipt handle, or extra authority selector; such input is blocked with `invalid_admission`.
6. The documented byte, path, unpaired-surrogate rejection, string-escaping, object-key, and array-order algorithm yields the same per-document, set, Handoff, and subject digests across repeated validation.
7. D2 is an Extension-issued `user-review-v1` receipt for the current interactive user only after the first TUI confirmation; D3 is a separately confirmed, linked Extension-issued receipt. A D3 that advances an existing same-tuple lineage records a private predecessor to the prior head. An external review artifact is evidence only.
8. A matching current D3 resolves without another confirmation for the same subject in the same active runtime session. A matching D2 without D3 can request only D3 and cannot resolve by itself.
9. Without a dialog-capable TUI, a matching current D3 may resolve; otherwise missing D2 returns `review_required` and matching-D2/missing-D3 returns `acceptance_required` before backend adaptation.
10. A valid nonempty receipt lineage has exactly one authenticated head per canonical authority path tuple; A.4 uses only that head for the same-call transition. No-prior or changed-path cases use explicit D2 then D3, affirmative same-path bounded authorization uses new D2 then D3 linked to that head, and negative or material bounded authorization returns `amendment_invalidated`. A corrupted lineage returns `receipt_corrupt` without UI or resolution. A subject change during an in-call flow returns `authority_drift`.
11. The registry starts empty on Extension construction, clears all entries on `session_shutdown`, and cannot reuse D2/D3 after a session change or runtime reload.
12. The Resolver returns coded blocks before backend adaptation, emits no private receipt data in a Handler prompt or resolution, leaves `#3 atomic delegation` outside this amendment, and adds no persistent Work lifecycle. The final JIT recheck is the v0.1 authority endpoint; later Handler reads are not byte-bound, and no snapshot or backend preflight is required.

### A.7 Non-goals and Future Options

This version does not implement child write-capability gating, a fixed stage machine, CI enforcement, cross-session persistent acceptance, automatic review generation, reviewer identity discovery, third-party/signed/non-human review, external-review receipt transport, unapproved noninteractive planned-admission issuance, a user-facing inspection command, backend-specific admission behavior, immutable authority snapshots, read locks, backend preflight, or a Work-owned persistent admission lifecycle. The post-recheck TOCTOU exposure is an accepted v0.1 security limitation; revisit it under a new decision or amendment if exact reviewed-byte execution becomes required or the residual risk is no longer acceptable. These exclusions are not implied by this contract.

### A.8 D4-A Private Receipt Channel

D4-A closes the receipt-provenance gap without adding a backend dependency: all receipt data is Extension-derived private state, while the model's planned-admission input remains only the exact selected authority tuple. The current interactive user is the v0.1 D2 reviewer identity; external review results remain evidence for that human judgment, not a capability or receipt transport.

The D2 and D3 flows are deliberately user-witnessed TUI interactions rather than a model protocol. A current same-subject D3 is reusable only within its active runtime session; issuance, bounded authorization, and partial-D2 completion remain TUI-only. The registry is intentionally ephemeral and non-exported: it establishes current-session provenance and drift rejection, not audit portability, external authorization, a reusable bearer approval, or a persistent Work lifecycle. The accepted v0.1 TOCTOU boundary ends at the final JIT recheck/`resolved` return; the Handler's later read is not guaranteed to observe the reviewed bytes. This draft contract is under implementation review and does not claim completion.

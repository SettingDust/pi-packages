# Backend Adaptation Specification

- Status: accepted base contract with selected §3 Herdr dispatch-pacing clarification (not implemented)
- Resolver raw-return and Router progression amendment: accepted under explicit user confirmation; documentation authority only, not runtime implementation or live bootstrap acceptance.

- Single-join short/full and long/summary file-reference amendment: accepted target contract under [ADR-0002](../adr/0002-structured-handoff-and-yaml-results.md#accepted-amendment-stable-yaml-and-protected-result-reading) and the [PRD](../prd/router-delegation.md#stable-delegation-and-protected-result-reading), with Router adoption owned by the [Router consumption contract](router-delegation.md#first-adoption-and-later-excerpts). Inspected source contains fresh issuance validation and length projection, but the latest removal of extra Result read/issuance OS-account/private-access admission remains unimplemented and unverified; concrete interfaces and the remaining runtime verification boundary are recorded in [section 8](#8-unresolved-delivery-interface-and-verification-boundary).

## 1. Inputs

`resolve_delegation` validates the Router's closed request, resolves the exact Handler invocation, and invokes the selected registered delegate tool in the same call. Its response separates resolution from unclassified nested launch evidence:

```yaml
resolution:
  status: resolved
  prompt: yaml-handoff
  model: provider/model
  thinking: configured-thinking-level
launch:
  tool: configured-registered-tool
  rawReturn: backend-defined nested value
```

`launch` identifies only the selected tool and preserves exactly one of `rawReturn` (the nested tool returned) or `rawError` (the invocation threw). These fields describe the call boundary, not business success. A returned backend error envelope remains `rawReturn`, including its error flags, status, identity, content, and details; it is not rewritten into a thrown error. A thrown error remains error evidence, not a Handler Result. There is no Resolver-derived `launch.status`, `taskId`, or `objective`; backend-provided fields remain inside the raw evidence. Examples are schematic response data, not installed-runtime evidence or a universal backend return schema.

The closed delegate request is `delegate: { name: string, params: object }`. `name` must identify an already registered tool; `params` must be a plain startup object. The Router supplies startup fields such as `label` and canonical `taskSlug`. Resolver-owned protected bindings are exact and collision-free: `agent: handler`, `prompt: resolution.prompt`, `model: resolution.model`, and `thinking: resolution.thinking`. A request that supplies any protected key, duplicates a binding, or has malformed/unknown structure is rejected before execution. The backend remains free to choose its other parameter names and semantics.

`resolution.status: blocked` means no launch was attempted; the response retains the precise resolution code/message and contains no launch evidence. Once invocation is attempted, resolution remains resolved even if the tool returns an error or throws. A raw return value alone proves neither active execution nor successful work. The Resolver preserves available raw return or error evidence without interpreting Handler Result business content, correlating or projecting Results, or advancing work. The Router alone interprets status/evidence under the effective backend contract, obtains and correlates the full Result, projects Todo/Waves state, and releases satisfied dependencies under the [Router Spec](router-delegation.md#launch-evidence-and-router-progression).

For example, a pre-launch reference rejection contains no `launch`:

```yaml
resolution:
  status: blocked
  code: invalid_reference
  message: A required Handoff reference is unreadable.
```

If the Resolver response itself is missing or unusable, absence of `launch` is not proof that no invocation occurred; only an adoptable pre-launch blocked resolution establishes that fact. The Router preserves the available transport/backend evidence and treats unestablished effects as uncertain without synthesizing a Handler Result.

The Resolver executes the selected tool only once after validation and performs no automatic retry, fallback, join, cancel, remove, or lifecycle orchestration within that call. This does not prohibit the Router's evidence-backed, authorized correction/recovery or a new lawful call under [default autonomous recovery](router-delegation.md#default-autonomous-recovery); every new call passes the full applicable current admission, selection and binding checks. The Router owns semantic eligibility and must establish the effective tool contract before supplying the request.

### #42 Accepted Resolved-Selection Source

Under the accepted #42 amendment, `resolved.model` is `provider + '/' + modelId` from the Resolver's exact separate provider/model Registry match, and `resolved.thinking` is the exact selected thinking string. The Resolver selects once from the resolve-time Registry snapshot using both capability dimensions and deterministic surplus ordering. Fresh T5 and independent T6 returned GO with P0-P3 zero. T5 command attribution is config-command `13/22`, config `21/22`, settings-store `19/37`, Extension `6/95`, affected `46/154`, distinct subset `53/81`, focused `94/250`, and full `136/538`; typecheck, import, activation, and execute passed. The canonical 1085-byte LF manifest retains aggregate `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`, while rejected 1095-byte literal-backslash-n aggregate is `3fd52e65a90f2d7eaee47b587e50d467abd2960fdb7ead118131bcfb0ce70525`. Exact selective-commit review is GO; staging and commit remain pending. The backend does not parse the display form, repeat selection, rewrite either field, substitute a candidate, or fall back. This amendment changes no backend source or ownership and makes no live-backend, reload, settings/runtime, Herdr, Pi-core, push, or deployment claim. The unrelated Herdr failure remains outside #42.


## 2. Compatibility Requirements

Before calling `resolve_delegation`, the Router must establish from the effective registered tool contract that it can:

1. start independent execution using the fixed `handler` Agent and its instructions;
2. accept the exact resolved `prompt`, `model`, and `thinking` values;
3. provide normal dynamic Skill loading and read access to every Handoff reference;
4. return a stable task identity; and
5. provide original Handler YAML evidence, with the inclusive 16384-byte short/full and long/existing-summary-plus-existing-file-path default and Router-owned ordinary envelope reading required by [section 2.1](#21-result-delivery-and-protected-original-reading).

The Router owns this semantic compatibility/eligibility decision. The Resolver checks request structure and protected bindings but does not apply a second tool-category or registry allowlist.

### 2.1 Result delivery and protected original reading

This historical heading/anchor retains the same owner, not a dedicated protected reader. The selected target is one ordinary join with existing inputs, unchanged storage and the exact existing `resultPath`; Router ordinary `read` recovers the JSON envelope and decodes `result`. The latest source-reading admission revision is awaiting implementation and verification. Herdr owns opaque transport and fresh readable source/execution validation before length classification and path emission, without extra OS-account/private-access admission; Caller/Harness owns structured summary extraction and model-visible projection; Router owns complete reading, correlation and adoption. Resolver remains exact raw nested forwarding with fixed `handler`/resolved `prompt/model/thinking`, without a Result parser/projector. [Router](router-delegation.md#deterministic-yaml-rendering) owns unchanged deterministic rendering.

#### Original and projection data

The original is exactly the envelope's decoded `result` string, not `resultPath`, file bytes or a reserialized Handler Result. Classify using `Buffer.byteLength(original, "utf8")`: `<=16384` is full and `>16384` is navigation. Exclude envelope escaping/metadata and caller serialization. This is not a summary/payload budget; do not truncate summary or invent another threshold.

These Caller fields extend an existing task snapshot only, never Handoff, HandlerResult, manifest or Result-envelope storage. Preserve existing `subagentId`, `generation`, `agent`, backend `status/error`, safely established lifecycle fields and defensive cleanup copies. Backend terminal status never becomes Handler status.

| Projection | Required fields | Omitted fields / meaning |
| --- | --- | --- |
| Verified short full | Existing `result:original` and exact existing `resultPath`; `resultDelivery:{kind:"full",originalBytes,fullResultReturned:true}` | No `resultSummary`. Completeness describes transport, not Router adoption. |
| Long navigation | Exact existing `resultPath`; `resultSummary:parsed.result.summary`; `resultDelivery:{kind:"summary",originalBytes,fullResultReturned:false}` | Omit `result` in every projected surface; no parsed Handler status/report/artifacts or alternate body field. Full content was not returned. |
| Content/access/projection unavailable | `resultDelivery:{kind:"unavailable",fullResultReturned:false,code}`; only safely established lifecycle identity/state | Omit `result` and `resultSummary`; `originalBytes/resultPath` only if safely established. This is no Handler Result status. |

`originalBytes` is a non-negative integer; `fullResultReturned` is boolean; `kind` is exactly `full`, `summary` or `unavailable`. `code` states a concrete delivery/access/projection gap. Unknown/contradictory shapes do not prove completeness. There is no `resultRef` object, token, `requested` flag, full fallback branch or second join mode. Inputs remain `subagent_join({subagentId,generation?})` and `subagent_inspect({subagentId})`; no new mode/path/range/full-reading input is added. Ordinary terminal inspect and other Result-bearing management returns use the same default projection, never a long-body escape.

The file reference is the exact path from the freshly verified current snapshot, pointing to existing `result-<generation>.json`, not a new decoded-body file. Envelope association uses existing `subagentId/generation/status/result/error`; it has no scope/Handoff/hash member. Caller scope comes from current trusted execution/task context, not a new persisted field or inferred filename. Do not silently retarget an old path to latest or another task.

#### Existing summary and actual adaptation hook

Use existing exported `parseHandlerResult(original)` in [protocol.ts](../../src/protocol.ts), also exported by [src/index.ts](../../src/index.ts), only in Caller/Harness. Copy its valid `HandlerResult.summary` exactly from this verified original: no trim, prefix, report substring, generated conclusion or original reserialization. Validation is structural navigation, not business-success/evidence judgment. Invalid YAML/Handler shape or unavailable/empty required summary yields `unavailable` with `invalid_handler_result` or `summary_unavailable`; never return a long full fallback, cached unverified text or invented summary. Short valid transport may return opaque full text, but malformed Handler YAML cannot be adopted by Router.

Use the existing Pi `tool_result` API; [the Harness extension](../../extensions/pi-harness.ts) must register the Caller projection hook, not a new Herdr-to-Harness dependency or Host seam; the inspected source already registers `projectHandlerToolResult`, without establishing loaded Host acceptance. For successful Herdr snapshots of fixed `handler` tasks, consume the freshly verified opaque original and source-delivery metadata, classify/extract summary and **return both** replacement `content` and `details`. The text block is `JSON.stringify(projectedTask)`; `details` is the same projected object. Herdr wire remains JSON; Resolver outer serialization remains its existing YAML. Replacing `content` without `structuredContent` uses Pi's existing dropping behavior; these tools declare no outputSchema and gain no structured-output capability. Preserve actual image/non-text blocks in existing order/isolation, never convert to summary or add image payloads/paths to metadata.

Apply to `subagent_join`, ordinary `subagent_inspect` and every other management return carrying a Handler Result, including immediate-terminal spawn/resume/cancel/steer returns. There is no explicit-full bypass. Errors without verified original remain error/lifecycle evidence, not Handler Results. Catch adapter/parsing failures and emit explicit `unavailable` without a body, rather than throw: inspected Host hook-exception handling can keep earlier output. Idempotently retain already valid projections; never parse navigation as original. A missing/ineffective adapter is a compatibility gap, not support. Legacy unprojected long full output is not compliant navigation; report inability rather than use another full mode. Herdr-only/plain callers retain opaque internal transport and may supply their own structured Caller adapter; runtime imports no Harness parser and persists no summary.

Host argument/schema validation precedes Herdr execute and `tool_call/tool_result` on inspected Pi 0.99.2/1.0.0 source routes. Host-rejected malformed inputs (including removed reader keys) retain actual Host validation error `isError:true`, not Herdr JSON/code/`unavailable`. Host may echo supplied arguments, including paths; uncalled wrappers/hooks cannot guarantee safe diagnostics or suppress that echo. Preserve Host failure evidence; it proves no Handler Result, complete reading, adoption or release. Only runtime-reached source/association rejection follows [Herdr section 11.3](../../../pi-herdr-subagents/docs/spec/runtime-lifecycle.md#113-protected-same-original-full-reading)'s safe errors. No Pi-core compensation is selected.

For nested calls reaching execution, inspected `ExtensionToolContext.executeTool` uses the same permissions and final hooks: `outcome.result`, `launch.rawReturn` and `tool_execution_end.result` carry already projected backend output. Resolver forwards it exactly, never recursively parses/projects it. Persistent `nestedCalls` is separately metadata-only: existing id/name/status, arguments or argumentsBytes, durationMs and bounded error with completeness marking, not a Result. Check metadata for default-body bypass; do not add Result fields or persistent original/summary copies. A synchronous non-Herdr backend needs an equivalent Caller projection before raw forwarding; unknown raw shapes are not automatically Handler content.

For example, one long successful nested join returns text JSON and `details` containing task `subagentId/generation/status/resultPath`, exact `resultSummary` and non-full delivery metadata but no `result`, in both `outcome.result` and the end event. The persistent nested record still has no `result/resultSummary/resultDelivery`. This is target mapping, not evidence of loaded adapter/Host acceptance.

#### Surface and Host mapping

| Actual surface | Required mapping / owner |
| --- | --- |
| Final Herdr `content/details`, ordinary inspect/join and terminal management returns | Herdr freshly verifies source and current association before emitting path; Caller emits the same selected snapshot in both fields. No hidden long body or extra full-reading branch. Inspect remains non-blocking; join retains generation/settlement/cleanup waits and caller cancellation. |
| `onUpdate`, `tool_execution_update`, nested `options.onUpdate` | Existing Herdr update wrapper strips `result` before callback/serialization. Where Result would otherwise be included, emit lifecycle-only `resultDelivery:{kind:"unavailable",fullResultReturned:false,code:"result_not_delivered"}`. No summary/full body/final completeness or newly issued path just for progress. Update events observe, not replace, so suppress before `onUpdate`. |
| Report renderers / expanded views | Join/inspect and existing spawn/cancel report cards read projected fields only: short full displays `result`; long navigation displays exact summary/path, byte count and non-full marking plus ordinary-read/envelope-decoding guidance. Presentation sanitization/wrapping is not original content or reading evidence. Never fetch hidden runtime body. This report-display mapping excludes resume/steer control cards. |
| Resume/steer control cards / expanded views | Follow [Herdr section 11.4](../../../pi-herdr-subagents/docs/spec/runtime-lifecycle.md#114-all-caller-and-model-visible-projections)'s control-only display in collapsed/expanded, active/fast-terminal and partial cases, even with full/summary/unavailable/opaque data. Show actual invocation state and necessary safe identity/task status, never report text/summary/path, delivery/navigation messages, submitted prompt/message or default report-JSON fallback. Existing operation-error evidence must show failure regardless of task status or missing snapshot; partial output means operation in progress. Result availability/task status must not decide operation success/failure, and reasons use only already available safe operation-error information, without new error transport or recovery of rewritten errors. This accepted display exception is implemented, with repository offline Pi SDK 0.99.2 composition renderer fixtures passing 9/9, Herdr typecheck and active TypeScript error diagnostics for the two changed TS files passing; the real Host has not been reloaded or accepted; execute wrappers, shared issuance and all final wire/Caller projections, including legitimate fast-terminal full/summary returns, remain unchanged. |
| Resolver content/details, nested outcome, `tool_execution_end.result` | Existing YAML/objects wrap already projected nested output exactly. Expanded resolver view does not fetch body. `rawError/isError` retain meanings, including unprojected Host early errors. |
| Persistent `nestedCalls` | Existing metadata only and bounds/completeness; check argument/error bypass, not new Result fields. |
| Terminal notification | Existing lifecycle-only summary/details/correlation under Herdr section 4, no Handler summary/body or cleanup diagnostics. Guidance: single join yields projected delivery; long path is read/decoded ordinarily, not protected inspect. |
| Runtime task update/widget | Existing `listTasks/SubagentTaskObservation` identity/status/times only; no new Result, path or observation delivery. |
| Pi session/model route | Ordinary/nested text preserves selected projection; details/renderer cannot establish model receipt. Verify actual final text after JSON/YAML decoding, not an assumed Host structured output or unlimited context. |
| Router ordinary `read` | Read complete existing envelope at exact supplied path, then decode `result` and correlate existing IDs/current scope. Native limits and Host/OS permissions apply; there is no Herdr per-read source/ACL/token validation. |

The custom-tool route does not share built-in file-read limits, but that proves no unlimited Host/model output. Verify short originals and long summaries/path after actual final/nested text decoding (exact strings and UTF-8 bytes). Known truncation, lost non-text blocks, malformed/incomplete serialization or uncertain Host completeness must not retain `fullResultReturned:true` or claim adoption: report `full_result_unavailable`/the actual native limitation and leave affected predicates unsatisfied. Neither hook typing nor overlay tests prove stock Host output or Router reading.

#### Protection, invalidation and failures

This historical heading/anchor now distinguishes initial protection from ordinary reads; it selects no automatic path invalidation.

Before each reference emission, Herdr freshly validates current caller scope/task/generation, trusted storage/manifest/envelope and agreement with the established original under [section 11.3](../../../pi-herdr-subagents/docs/spec/runtime-lifecycle.md#113-protected-same-original-full-reading). Cached terminal snapshots alone are insufficient. Fresh validation retains current caller scope/cwd, runtime task/snapshot object-owner identity (not OS-account ownership), task/generation/session/path, manifest/envelope and exact established-original agreement, canonical paths, directory/regular-file shape, symlink/native reparse/hard-link guards, descriptor/path identity and size/mtime/ctime continuity. Scope/artifact directories and manifest/Result files must not require OS UID/SID owner equality, exclusive DACL/ACE count/type/rights or inheritance-protection shape, or exact POSIX 0700/0600 modes for Result reading/issuance. Normally readable associated sources must proceed to the unchanged length projection when the independent guards pass; actual open/read/parse failures remain unavailable without cached-body/summary fallback. Removed owner/ACL-policy probe conditions are not actual OS I/O permission failures. Readability is not arbitrary-file or other-task authority.

This is a guarantee reduction at initial issuance as well as subsequent ordinary reading: no current-account-only access, exclusive-writing or immutable/private post-issuance storage guarantee remains. Other OS-permitted principals may read or modify storage; source agreement at emission is not cryptographic provenance. Default new-storage creation, 0700/0600 writes, first safe Result publication/OS permission operations, Result temporary-link takeover/cleanup and task/image isolation stay unchanged. Issuance must not repair ACLs or ownership, and this revision does not promise a permission-free whole lifecycle; the reference authorizes no other-task/image or lifecycle effects.

After issuance, ordinary reads do not perform Herdr per-read identity/private owner-ACL/continuity checks. Host/OS permissions and Router current association remain. Paths are not revocable tokens; lifecycle changes do not automatically invalidate retained paths, repeated reads do not ensure a same-file snapshot, and counts/IDs cannot detect equal-length replacement. This deliberately reduces the former guarantee rather than implements it equivalently. Router refuses visible conflict/uncertainty without pretending undetectable replacement was detected.

Router must obtain complete native file content, decode complete JSON to exact string `result`, actually read it and correlate current scope/task/generation before adopting any of the four Handler statuses and judging evidence/limitations/item/Wave predicates under [its contract](router-delegation.md#first-adoption-and-later-excerpts). A path, summary, byte count or backend completed status cannot substitute. Native limits can prevent complete recovery of compact single-line JSON; continuation/line offset cannot recover an oversized physical line. Issuance therefore does not guarantee all-length readability. No storage change, body copy, page size/output budget, dedicated/bypass fallback or summary-only adoption is permitted.

Missing content/summary/reader/permission, malformed envelope/Handler Result, foreign/stale/mismatched or uncertain association, visible source conflict and incomplete/truncated/unknown output preserve the first semantic state, create no Handler status and release no affected dependency. Ordinary-read failures retain the actual tool/Host failure, not a fabricated Herdr protected-reader error schema. Later excerpts retain full-reading association and limitations. Reading never launches/resumes/cancels/removes/repairs/recovers/cleans artifacts. [ADR-0011](../adr/0011-in-process-observation-privacy.md#withdrawal-and-current-authority) requires no observation collection or controls.

## 3. `@settingdust/pi-herdr-subagents` Mapping

When the effective Herdr tool supports section 2, Resolver invokes the Router-selected registered tool with the equivalent startup object:

```yaml
agent: handler
prompt: resolved.prompt
label: router-supplied-label
taskSlug: router-supplied-canonical-task-slug
model: resolved.model
thinking: resolved.thinking
```

The displayed `taskSlug` indentation is illustrative YAML; the actual object has `taskSlug` as a sibling of the other fields. Herdr's suffix allocation on repeated slugs remains backend behavior. The Router supplies the tool name and non-protected startup parameters; Resolver supplies the protected values exactly.
`taskSlug` is 3-48 lowercase ASCII letters or digits separated by single hyphens and must not begin with `subagent-`. `taskSlug` and `label` are invocation fields, not Handoff, admission, or Resolver fields.

The Resolver's delegate-tool call is the execution action after resolution. It must not emit prose, call another tool, batch another resolution, or retain the invocation for later. Any permitted background overlap is governed by the effective registered tool contract and resources; it does not change this ordered per-call contract.

For Herdr, the Router recognizes successful active launch only when raw backend evidence establishes a non-empty stable `subagentId` and active status. Resolution success or a returned value alone is insufficient. For the selected Herdr ready-branch dispatch behavior, the Router may prepare and launch another independent, authorized, nonconflicting branch in the same turn only when the **effective registered** `subagent_spawn` contract and available resources permit a subsequent call. Each branch still uses its own ordered exact `resolve_delegation` -> `subagent_spawn` pair; no batch resolution or simultaneous tool calls are required. If the effective contract still requires ending the turn after the first spawn, the Router ends the turn and waits for notification; unknown or stale overlap permission is not permission to continue. Routine immediate polling/join remains forbidden. The tool description and its focused regression test and README must reflect this conditional rule before it can be used; changing this Specification alone does not change the effective registration or prove live overlap. This amendment changes only Herdr dispatch pacing, not the invocation fields, notification/join lifecycle, resource limits, or another backend's contract.

The accepted [Router evidence-branch scheduling requirements](router-delegation.md#13-evidence-branch-scheduling-and-strategy-loading) remain backend-neutral. A different backend still needs to establish section 2 capabilities and its full Result retrieval mapping before use. Deterministic two-active runtime tests and an authorized live Router trace are separate evidence requirements, not claims established by this text.

## 4. Source-Mapping Evidence

[Atomic Router Delegation T1 research](../works/atomic-router-delegation/research.md) preserves source mapping for the Herdr backend. It documents Agent resolution, invocation forwarding, child instructions/read access, stable task identity, Result persistence, notification, and join.

T1 describes expected backend behavior; the Router must still establish the effective tool's contract before use.

The supplied generation-1 analysis for task `analyze-result-selective-read` records current Herdr join snapshots containing the full `task.result`/`resultPath` in content and details, with progress also potentially carrying the body. The persisted `resultPath` is a single-line JSON envelope, not decoded Result text. Join does not guarantee fresh disk validation on every return. Existing `readTaskArtifact`/`readResult` provide protected envelope reading and task/generation checks; that evidence alone does not establish a model-callable complete decoded-original selection or the required model-visible summary projection. Generic `read` has very-long-single-line output limits and does not inherit backend protection from a path. These are supplied prior findings, not newly rerun source/runtime checks or a claim that section 2.1 is implemented. A process-bound original snapshot was a recommendation in that historical analysis, not the current target. The accepted target instead reuses the exact existing path/representation with fresh initial trusted-source validation and Router ordinary reading; it selects no token or reader binding. Package-owned opaque lifecycle/source issuance belongs to the existing [Herdr Spec](../../../pi-herdr-subagents/docs/spec/runtime-lifecycle.md#2-scope-and-terms). The supplied generation-1 file-reference assessment and subsequent accepted PRD/ADR resolve the earlier candidate choices: unchanged compact JSON, reduced subsequent read protection and native-limit failure without adoption are accepted. Supplied source/synthetic findings are not rerun runtime or Host/Router acceptance here.

A different delegate tool remains possible under ADR-0005, but requires its own capability assessment and Result retrieval mapping. Router must not improvise one after resolution.

## 5. Launch and Completion

The Resolver preserves `resolution` and raw `launch` evidence in one response. An asynchronous backend might return:

```yaml
resolution:
  status: resolved
  prompt: yaml-handoff
  model: provider/model
  thinking: configured-thinking-level
launch:
  tool: configured-registered-tool
  rawReturn:
    subagentId: backend-assigned-id
    status: running
```

Here `subagentId` and `status` belong to the illustrative backend payload, not a Resolver-normalized launch schema. The Router establishes their meaning from the effective backend contract. A synchronous backend may instead return stable identity and the full Handler Result inside `rawReturn`; the Resolver forwards it without parsing or adopting it. The Router reads the full Result using the supported return or retrieval path and applies the correlation and progression rules in the [Router Spec](router-delegation.md#launch-evidence-and-router-progression).

A returned error envelope remains a return, for example:

```yaml
resolution:
  status: resolved
  prompt: yaml-handoff
  model: provider/model
  thinking: configured-thinking-level
launch:
  tool: configured-registered-tool
  rawReturn:
    isError: true
    content:
      - type: text
        text: Backend launch error evidence.
```

This illustrative envelope is interpreted by the Router against the actual tool contract; its error flag does not establish a Handler `failed` Result or absence of effects.

If invocation throws, resolution does not become blocked:

```yaml
resolution:
  status: resolved
  prompt: yaml-handoff
  model: provider/model
  thinking: configured-thinking-level
launch:
  tool: configured-registered-tool
  rawError: backend exception evidence
```

The raw error example does not prescribe an exception serialization or imply that no backend effects occurred. The Router must distinguish proven launch failure or cancellation from uncertain effects. Missing, ambiguous, or contradictory identity/state/Result evidence leaves the affected completion predicate unsatisfied; `uncertain` is Router evidence classification, not a fifth Handler Result status or a Resolver-produced launch status.

For Herdr, the Router uses the backend `subagentId` as stable task identity and retains the applicable generation association. Completion notification and later supported retrieval must preserve access to the generation-specific existing envelope and initially trusted reference under [section 2.1](#21-result-delivery-and-protected-original-reading); navigation or a partial projection is not itself the full Result. The Router must complete first reading and correlation before semantic adoption under the [Router Spec](router-delegation.md#first-adoption-and-later-excerpts). Notification delivery remains environment-owned; this contract adds no join or lifecycle orchestration.

## 6. Failure Behavior

| Condition | Resolver behavior | Router interpretation/progression |
|---|---|---|
| semantic compatibility/eligibility not established | No delegate request to execute | Do not submit; report the missing contract |
| malformed request, protected collision, or resolution failure | Return precise `resolution.status: blocked`; no launch | Preserve the admission block, distinct from a Handler `blocked` Result |
| nested tool returns an error envelope | Preserve it as `launch.rawReturn` with resolved resolution | Interpret backend failure evidence; do not invent a Handler `failed` Result or infer absent effects |
| Host rejects malformed tool arguments/schema before execute/hooks | Preserve the actual Host validation error, including any input echo; no Herdr error projection is assumed | No Handler Result, full-reading claim, adoption or release; Herdr runtime safe-error rules apply only if reached |
| invocation throws | Preserve `launch.rawError` with resolved resolution | Determine failure/effect uncertainty from available evidence; no blind repetition or implicit substitution in this call. Apply [Router recovery judgment](router-delegation.md#default-autonomous-recovery), with authorized inspection first for unknown effects and a new lawful call only when safe within authority/permission |
| backend reports cancellation | Preserve the raw return/error as received | Record cancellation separately from Handler status; account for known or uncertain effects |
| Resolver response missing or unusable | No adoptable response available to classify | Do not infer no launch; retain available evidence and report uncertain effects |
| launch effect, active state, or identity ambiguous | Preserve raw evidence without synthesizing a status | Report uncertainty; do not claim running/completed or release affected dependents |
| backend terminal but Result missing/malformed, navigation-only, incomplete, or source/correlation unproven | Preserve raw evidence without Result interpretation; delivery/read path reports its concrete gap | No first semantic adoption, successful-work claim, completion projection, or release; retain the first established state and affected unsatisfied predicate |
| safely correlated Handler `partial`, `blocked`, or `failed` | No business-content interpretation | Project the actual distinct Result status; do not complete or release its dependents |
| safely correlated Handler `completed` | No business-content interpretation | Check required evidence and item/Wave predicates before completion or dependency release |

No unavailable model or thinking value may fall back silently. Resolution rejection, backend error/cancellation, uncertain effects, and Handler Results remain distinct; a call return or backend terminal status cannot manufacture work completion.

## 7. Acceptance Conditions

- Establish section 2 compatibility before a closed delegate request; missing capability blocks without substitution. Resolver preserves precise pre-launch blocked/no-launch versus resolved plus exactly one raw return/error, exact protected values and no business/progression judgment.
- Distinguish returned errors, thrown errors, cancellation, uncertain effects, missing/malformed/conflicting Results and all four Handler statuses; only safely correlated full evidence plus item/Wave predicates permits release. Herdr overlap still needs effective registered permission/resources.
- One join's actual inputs stay `{subagentId,generation?}`; inspect stays `{subagentId}`. Valid 16383/16384 decoded UTF-8-byte originals return exact full text; 16385 yields unchanged existing summary plus exact existing `resultPath`, visibly non-full. Include multibyte text, JSON escaping/metadata and a long summary: envelope/payload size is not the threshold or preview budget. Fresh trusted source/current scope/task/generation validation precedes emission, not cache-only reuse.
- Final content/details, ordinary inspect and immediate-terminal management returns, progress, expanded/collapsed renderers, notifications, ordinary/nested outcome/end event and actual Host text contain no hidden default long body. Persistent `nestedCalls` stays metadata-only with existing argument/error bounds/completeness; no Result fields are required or added.
- For a natively readable envelope, real Router evidence demonstrates ordinary `read`, complete JSON decoding to exact original (escaping/CRLF/trailing LF/multibyte preserved), whole-Result reading and current association before first adoption, all four statuses and evidence/predicate judgment before release. Renderer/details, typed hooks and synthetic overlays are insufficient for stock Host/Router acceptance.
- Missing reader/permission/content/summary, invalid YAML/envelope, foreign/stale or uncertain association, visible source conflict and native-limit/truncation/unknown completeness failures preserve state with no adoption/release or cross-task/image leakage. Oversized single-line JSON demonstrates non-adoption, not recovered full content. No dedicated fallback/storage rewrite or all-length guarantee. Generic reads are not claimed to reject every permission drift or equal-length replacement.
- Host early schema rejection keeps actual Host error/possible argument echo; runtime-reached source rejection uses Herdr safe errors. Neither becomes Handler status or completion. Use synthetic input markers, not sensitive values, when checking echo. No removed-reader runtime schema is required.
- Readable associated sources with inherited/shared ACLs, different OS UID/SID owners or non-private POSIX modes pass independent source validation before short/full or long/navigation projection; cover scope/artifact directories and manifest/Result files without issuance permission/owner mutation. Actual open/read/parse failures and retained task/path/descriptor/metadata/original mismatches remain unavailable with no cache substitution. Initial creation/publication, Result temporary takeover/cleanup, current generation and image/non-text protection survive unchanged. Ordinary reading invokes no lifecycle/repair/cleanup and old paths do not silently retarget. Actual Host/module/Bun identity must be recorded separately from static SDK version. Observation and cache/cost gains are not acceptance obligations.

## 8. Unresolved delivery interface and verification boundary

Sections 2.1, [Router section 7](router-delegation.md#7-amendment-readiness-and-unresolved-parameters) and [Herdr section 11.7](../../../pi-herdr-subagents/docs/spec/runtime-lifecycle.md#117-contract-closure-and-exclusions) close this interface/owner boundary: single join, existing path/storage, initial fresh trust, Caller summary projection and Router ordinary complete reading/decoding. No material authority choice remains; contracts can enter independent verification. This is not implementation, registered-tool/caller conformance, actual Host or live acceptance. Native read capacity can leave a compact single-line envelope unreadable; that accepted limitation remains explicit.

| Implementation/fixture entry point | Owner | Required check |
| --- | --- | --- |
| `resolved`, normalized Handoff and sorted `visibleSkills/routerPrompt` display | Router/Harness | Existing byte-exact rendering, stable/dynamic boundaries, source selection, semantic arrays and admission identities unchanged |
| `parseHandlerResult`, Harness `tool_result` | Caller/Harness | Exact summary; consistent content/details; no requested-full/fallback bypass; idempotent projections and hook-failure non-full output |
| `createSubagentTools`, current task/scope and artifact helpers | Herdr | Unchanged join/inspect inputs; fresh source/association before existing path emission; non-cleaning path/file/descriptor/metadata/original checks without extra OS-owner/ACL/mode admission, and unchanged publication/cleanup/image boundaries |
| `onUpdate`, join/inspect, renderers, notifications, `listTasks` | Herdr wire/display and Caller | No hidden body/default full branch; lifecycle/cancellation/cleanup and backend/Handler status distinctions preserved |
| `ctx.executeTool`, Resolver raw evidence, end event, Host text | Pi existing hooks; Resolver forwarding; Caller | Ordinary/nested projected output; Host early error versus runtime rejection; actual text completeness separate from display |
| Persistent `nestedCalls` | Pi existing recorder; Caller | Existing metadata-only shape; arguments/bounded error offer no default body bypass |
| Ordinary `read`, complete envelope decoding and evidence adoption | Router/native Host | Readable examples preserve exact original; oversized single-line/native failure and uncertain association leave predicates unsatisfied |

Later fixtures pad only valid YAML `report` to 16383/16384/16385 decoded UTF-8 bytes, using a summary with significant spaces, quotes/newlines and multibyte text. First two retain `result===original` and full marking; third omits `result`, retains exact existing `resultPath`, has `resultSummary===parseHandlerResult(original).result.summary`, matching byte count and non-full marking. Envelope escaping/large metadata cannot change classification. Missing/invalid summary is unavailable, never a long full fallback. Capture all final/update/ordinary/nested surfaces and metadata-only records; inject hook failures and actual/unknown Host truncation.

Separately verify readable associated sources with inherited/shared ACLs, different OS-account owners and non-private modes across all four storage objects; actual open/read/parse failure without cache fallback; retained source/path/file/descriptor/metadata guards and same-path equal-length replacement detected **before emission**; current-generation/lifecycle races and initial publication without reading-induced cleanup. Later ordinary reads have no Herdr token revocation or exact continuity checks: fixtures must state that reduction, reject observable stale/foreign/conflicting association, and not pretend to detect invisible replacement. Native readable envelopes show exact full decoding; oversized single lines show inability/no adoption. [Router acceptance](router-delegation.md#stable-rendering-and-reading-acceptance) requires an actual model trace for reading/correlation/four-state/evidence judgment, not just an adapter fixture. No page accumulation or universal full-length recovery is required.

Historical source mapping used protocol/extension/Herdr and repository Pi 0.99.2 SDK. The supplied independent review and earlier bounded 0.99.2/1.0.0 execution/validation/recorder checks support Host early rejection and metadata-only distinctions, not session-loaded Host identity. Earlier unretained stdin probes/start snapshot are not reproducible historical evidence and cannot be retroactively replaced by independent checks. The earlier synchronization read protocol/extension and Herdr task/join/artifact/tool wrapper bodies, plus official SDK extension/Skill docs and relevant final/nested hook source; it ran no runtime/model checks. This local admission revision re-read the supplied assessment, owning/excluded Specs and current Herdr runtime/image helper and Harness Caller source only; it ran no tests or runtime/model checks. Subsequent acceptance must record actual executing Host version, resolved loaded-module paths/versions and Bun version, not infer from PATH or static package installation. Current `activateHarness` registers `projectHandlerToolResult`; it validates source/caller and content/details association, parses the existing Handler Result, and emits `<=16384` full or `>16384` exact-summary/path projections in both fields. Herdr final wrappers already invoke fresh `issueResult` and strip progress bodies, but its directory and manifest/Result reads still apply the superseded private-access/OS-owner admission. The accepted removal remains an independent Herdr implementation/fixture obligation, not delivered code or runtime recovery. Loaded Host identity/conformance, full Router evidence consumption and platform checks remain unverified; no tests, README, descriptions or guidance were changed here.

No new consequential dependency, Host seam, body copy, token/registry, pagination, storage representation, observation or runtime activation is selected. No provider-cache, first-adoption token/cost/latency/I/O gain is promised. The unconfirmed/unexecuted initial Plan/Waves graph requires independent rederivation from these contracts; this closure changes none of it, releases no gate and confirms no implementation scope. Document status proves authority only.

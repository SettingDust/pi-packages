# Context: #42 Provider/Model/Thinking Capability Selection

- Status: accepted processed context; fresh T5 GO and independent T6 GO reconciled; exact selective-commit review GO; commit pending
- Updated: 2026-08-26
- Work: [work.md](work.md)
- Decision identity: `#42-provider-model-thinking-capability-selection-v1`

## Settled decisions supplied for this Work

- No `harness.version` field.
- Configuration is nested as `harness.candidates[providerModelKey][thinking]`, where `providerModelKey := provider + '/' + modelId` and parsing splits the first slash only.
- Provider and model ID are exact non-empty strings without control characters; provider cannot contain a slash, while model ID may contain later slashes and dots. Registry lookup uses the two exact fields; last-slash, dot, and display parsing are forbidden.
- Canonical ordering identity is reversible `JSON.stringify([provider, modelId, thinking])`; display `provider/modelId.thinking` is derived and never parsed.
- All unknown fields and raw duplicate JSON keys detected before object normalization block. Duplicate canonical `(provider, modelId, thinking)` tuples also block. Tuple formation uses exact first-slash parsing and the exact thinking string, with no trim, case folding, aliasing, dot parsing, last-slash parsing, display parsing, or other normalization. Parser-level fixtures separately prove raw duplicate-key and duplicate canonical-tuple rejection.
- Candidate capabilities and Resolver requests are finite non-negative integers.
- Numeric rejection order is non-number/non-finite, then non-integer, then negative; missing required numbers are invalid.
- Qualification requires both candidate capabilities to meet the request.
- Selection minimizes impact surplus, then reasoning surplus, then canonical complete identity lexicographically.
- Handoff carries no model information or capability requirements; Resolver root carries top-level `reasoning` and `impact`.
- Old `roles`/`modelRole`, malformed candidates, invalid numbers, raw duplicate keys, duplicate canonical tuples, unavailable candidates, and no qualified candidates fail closed with explicit manual replacement required; no migration, ignore, fallback, or automatic replacement. Unknown fields or invalid configuration shapes—including mixed unknown-plus-legacy input—remain `invalid_configuration`; only pure recognized legacy `roles`/`modelRole` input is `legacy_configuration`.
- The Router prompt uses a semantic 0..3 scale with examples, without binding research or implementation phases to fixed levels.
- Dynamic resolver schema generation reads no Registry state, performs no candidate availability filtering or attestation, and exposes only the closed root request shape and relevant static descriptions. During resolve execution, after structural and numeric validation and before qualification and selection, the Registry is read exactly once; that snapshot alone is authoritative for the execution.
- Existing settings scope/locking and exact backend model/thinking pass-through remain.
- Backend and `pi-herdr-subagents` require no changes.

## Evidence map

| Source | Current observed fact | Use |
|---|---|---|
| `packages/pi-harness/src/config.ts` | Candidate settings are normalized under the nested capability shape with exact provider/model/thinking identity and fail-closed validation. | Verify the accepted configuration grammar and rejection behavior. |
| `packages/pi-harness/src/settings-store.ts` | Settings are read/written per Global or Project scope under lock, unrelated keys are preserved, and malformed JSON is not overwritten. | Preserve scope, locking, and data-loss protections. |
| `packages/pi-harness/src/config-command.ts` | The existing TUI scope and replacement seam edits the nested candidate configuration and requires explicit replacement where applicable; UI identity repair preserves canonical tuple lookup rather than display-label lookup. | Verify configuration UX, identity, and safeguards. |
| `packages/pi-harness/src/protocol.ts` | Resolver requests carry root capability requirements, validate the Handoff, read one Registry snapshot during resolution, and return exact model/thinking values. | Verify validation, selection, snapshot, and pass-through behavior. |
| `packages/pi-harness/extensions/pi-harness.ts` | Dynamic resolver schema and Router prompt are registered in `before_agent_start`; schema generation remains Registry-free and resolved values are mapped to the environment. | Verify prompt, schema, activation, and mapping behavior. |
| `packages/pi-harness/tests/config.test.ts`, `settings-store.test.ts`, `config-command.test.ts`, `protocol.test.ts`, `extension.test.ts` | Focused coverage spans nested configuration, scope, schema, prompt, protocol, snapshot, selection, and pass-through behavior. | Preserve the smallest regression surface for the settled contract. |
| `packages/pi-harness/docs/adr/0003-user-model-roles.md` | Accepted baseline defines historical named Role storage and selection; its model-role portion is superseded by ADR-0009. | Preserve historical rationale and compatible safeguards without retaining the old grammar. |
| `packages/pi-harness/docs/spec/backend-adaptation.md` | Resolved model/thinking are forwarded to backend mapping; backend is environment-owned. | Preserve exact pass-through and exclude backend source. |

## Pre-implementation history

Before T2 implementation, the evidence map described the package as reading `harness.roles`, and the documentation-only baseline stated that no source or tests had been changed. Those statements describe the pre-implementation baseline only. They are superseded by the bounded T2-T5 implementation and UI identity-repair evidence below and must not be read as current behavior or current lifecycle state.

The initial T5 run identified former unavailable-candidate filtering and edit-collision overwrite defects. A bounded repair closed both findings. The superseded pre-adjudication evidence record was focused `70/70` (`191` expectations), full `112/112` (`479` expectations), and aggregate `f946909e869337c66c1e18e5bb525a06d7693cd134f83f8f11a6e93a7a7460e933`; it is historical only and must not be used as current candidate evidence. The later `84/84`/`126/126`/`67582764d199fb5761bd8265c453386e252a1ea4f0d8b1536d0768616daccd8a` and `85/85`/`127/127`/`a49e735077d468b471f3d879836c30c334e3bda11fe4d9dcbcb116a4aaa850e9` records are likewise superseded history only. Prior documentation synchronization made zero source or test changes.

## Reconciliation and acceptance record

ADR-0009 supersedes ADR-0003's Role storage/selection decision only, while ADR-0003 preserves its historical rationale and compatible safeguards. ADR-0001 and the Router Delegation PRD/Specification carry the accepted capability-request and deterministic Resolver-selection amendments. Protocol Prototype carries the accepted nested candidates, integer/rejection precedence, first-slash grammar, exact Registry fields, canonical tuple identity, zero-read/non-filtering schema assertions, single authoritative resolve-time snapshot, and raw duplicate fixture obligations. Backend Adaptation identifies #42 as the accepted source of exact resolved model/thinking while preserving pass-through and backend neutrality. The reconciled authority set passed fresh authority review with GO and P0-P3 all zero, after which the user explicitly accepted the set. Fresh T5 and independent T6 each returned GO with P0-P3 zero.

## Current implementation evidence

Fresh T5 records default-loader raw-duplicate preflight rejection before Registry read or Resolver selection (zero each), plus a runtime regression for both trusted and untrusted scope. Its exact command attribution is config-command `13/22`, config `21/22`, settings-store `19/37`, Extension `6/95`, affected `46/154`, distinct subset `53/81`, focused `94/250`, and full `136/538`; package typecheck, import, activation, and execute passed. Independent T6 returned GO with P0-P3 zero and no actionable finding. The exact 23-path dirty set contains the ten frozen implementation/test paths and these thirteen documentation paths; the index is empty. The canonical frozen-candidate manifest below is stable and has aggregate SHA-256 `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`. The exact 23-path, 13-document-only, ten-technical-hash, 50-link, diff, and second manifest byte-stability checks passed. Implementation, validation, and final review are complete; exact selective-commit review is GO, but commit remains pending. The unrelated Herdr failure remains outside #42.
Earlier `70/70`/`112/112`/`f946...`, `84/84`/`126/126`/`675...`, `85/85`/`127/127`/`a49...`, and `89/89`/`131/131`/`fb573...` records, together with the former `39/39`/`92/92`/`134/134`/`a582...` lifecycle evidence, are superseded history only; the current supplied counts and manifest below are authoritative for this reconciliation.

This is package/source-level evidence only. It does not claim live backend behavior, reload, settings/runtime mutation, Herdr verification, Pi-core changes, staging, commit, push, deployment, or live runtime completion.

## Canonical frozen-candidate manifest

The manifest is UTF-8 text with LF line endings, repository-relative paths, exactly one row per frozen implementation/test file, rows sorted by path using ordinary lexicographic ordering, each row formatted as `<lowercase SHA-256><two spaces><path>`, and one final LF. The manifest itself is evidence only; it is not a project file or an additional changed path.

```text
9fe3a9856a210b5e57b605baa8754de35ebcdd6814f761809ae61b7b932fe4e4  packages/pi-harness/extensions/pi-harness.ts
3efe0ccca09b5e9de53522fa986f6923e65744a3e35d3d4b32ef88b1c3892b99  packages/pi-harness/src/config-command.ts
273942080323479562ced0aaec243c364b6a68f4c6c43befd95a352db5708a79  packages/pi-harness/src/config.ts
754124e8b56945def3b4ca817a0f8c0688df2c3e38f3658e5702ff1cd9892366  packages/pi-harness/src/protocol.ts
fb90c0be75fc4235ffbbe505ea973ff47725300986ec0c27e3ab148f2624fcda  packages/pi-harness/src/settings-store.ts
a415fa9c4f0be854465cc0195a8df3f6d4dc0851d747015840927f857102b071  packages/pi-harness/tests/config-command.test.ts
4cbebb21082d63ebe3cd681fc6c494ce22950f4d7ae9e216c395d21ca4308a1e  packages/pi-harness/tests/config.test.ts
0ddf47d27b3f23e96f716ddf46f772fcb6b711ad235db3f195442dc25350c5e4  packages/pi-harness/tests/extension.test.ts
5686f21419d80181d0ef0936c2c0f5d982aa5b03ac309947aadcad7620bebe9b  packages/pi-harness/tests/protocol.test.ts
ebbe98abeb280cedc103266dd9bf3ea3ea5da7f2c0447271ad3b385ef8d484f4  packages/pi-harness/tests/settings-store.test.ts
```

The executable Node reproduction is:

```js
const fs = require("fs");
const crypto = require("crypto");
const root = "packages/pi-harness/";
const files = [
  "src/config.ts",
  "src/settings-store.ts",
  "src/config-command.ts",
  "src/protocol.ts",
  "extensions/pi-harness.ts",
  "tests/config.test.ts",
  "tests/settings-store.test.ts",
  "tests/config-command.test.ts",
  "tests/protocol.test.ts",
  "tests/extension.test.ts",
].sort();
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const manifest = files.map(path => `${sha256(fs.readFileSync(root + path))}  ${root + path}`).join("\n") + "\n";
console.log({ bytes: Buffer.byteLength(manifest, "utf8"), aggregate: sha256(Buffer.from(manifest, "utf8")) });
```

It reproduces `1085` bytes and aggregate `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`. The prior `a5828b9fc946f1e6795df7a6abf1220d16c6977e4f6334a39adb9719f9ee891e` value and earlier candidate aggregates are superseded evidence only. The noncanonical `1095`-byte variant formed by joining rows with literal backslash-n text (`"\\n"`) instead of LF characters (`"\n"`) reproducibly hashes to `3fd52e65a90f2d7eaee47b587e50d467abd2960fdb7ead118131bcfb0ce70525`; it is rejected as a manifest encoding variant, not a candidate-file hash.


## Acceptance identities and current implementation gate

- Work: `bf09da840a135c7e9b16fc51b4ec1dd4d31a8c0869a9680922e30f8729a7293a`
- Plan: `3bb415f943241d8cf7e750a6fb59761baac237ae2af3ef153aad303f2647daa2`
- Tasks: `2ae2b16554469eaff09a440bf60ea97abb73f591ba39614650932d2532ec2484`
- ADR-0009: `4c3032ce3812104fe04a24402bf93116f3c4d56a71926fc61ec67a07c0a47ed1`
- Specification: `6a77b3cd49219564aacab31abd9195022efed17444ec066c08c06e91c621dfd7`

These are the exact identities disclosed for and covered by acceptance; lifecycle-only reconciliation produces new document hashes and does not change the accepted contract. Fresh T5 and independent T6 are complete with GO and P0-P3 zero; final completion reconciliation and exact selective-commit review are complete. Commit readiness applies only to the verified exact 23-path boundary and commit remains pending.

## Reconciliation verification and limitations

The reconciliation gate passed: exactly these thirteen documents are the only accepted #42 documentation surfaces; all 50 internal links resolve; historical evidence records are explicit superseded history only; all ten manifest rows, the `1085`-byte reproduction, canonical aggregate, and corrected noncanonical explanation agree; the index is empty; the dirty set is exactly the ten frozen candidate paths plus these thirteen documents; and a second manifest run is byte-stable. Fresh T5 and T6 returned GO with P0-P3 zero. No staging, commit, reload, push, settings/runtime, backend, or live-runtime action occurred; the unrelated Herdr failure remains separate.

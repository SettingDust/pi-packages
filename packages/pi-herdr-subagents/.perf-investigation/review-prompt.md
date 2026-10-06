# Independent review: recovery performance correction

Review ONLY the recovery-performance correction in `packages/pi-herdr-subagents`. You are an independent reviewer; do not edit files. Read the relevant source bodies and regression tests yourself. Existing image-input work is already dirty and is outside the correction; flag interactions only where this correction introduces a regression.

Authority: docs/spec/runtime-lifecycle.md section 3.2.1 and docs/spec/image-input.md file lifetime/cleanup. Derived delivery plan: docs/works/recovery-performance/{work,context,plan}.md.

Implementation changes in src/index.ts:
- `recoverScope` preserves the timestamp when a Result matches the already terminal manifest status/error, and passes the recovered TaskRecord into `settle` instead of a boolean.
- `settle` skips only its initial manifest write when the recovered record is V2 and the normalized current persistent task state matches taskFromRecord; the in-memory Result text is excluded. V1 still writes. Coalescing, pending intents, Result rechecks, cleanup retries, and notification replay still run.
- `cleanupImageInputs` checks the artifact leaf's lstat and realpath before enumerating entry names; returns early with no candidates/owned cleanup unless removing. Full imageInputDirectory ancestor/scope validation still occurs before actual cleanup or explicit removal. It does not cache absence.
- tests/runtime.test.ts adds `describe("recovery performance")` at the top, covering unchanged terminal manifest bytes/no writes, late Results and new tasks, absence checks, explicit removal, and an orphan appearing after prior absence.

Review correctness, data-loss/security risk, failed persistence retry behavior, Result precedence including late changes, notification semantics, unknown field preservation, candidate generation validation, and the Spec/Work evidence alignment. Existing tests already cover interrupted queued launches, delayed persistence, pending/failed cleanup and image redirections/hardlinks.

Report only actionable findings with file/line, severity, trigger and smallest correction. If none, explicitly say no blocking findings and list any material verification limitations. Do not interpret pending evidence placeholders as completed claims. Do not read credentials or config files, run tasks, create children, or change anything. Keep the report concise.

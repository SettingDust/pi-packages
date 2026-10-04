# Context: Router Cleanup and Todo Explicit Removal

- [Work](work.md) | [Plan](plan.md) | [Waves](waves.md)

## Authority and accepted inputs

This tuple is derived from the accepted authority below:

- [Router Delegation PRD](../../prd/router-delegation.md), including the active Todo cleanup lifecycle and the prohibition on fixed Todo-provider coupling.
- [ADR-0001](../../adr/0001-router-resolver-handler-boundaries.md), which assigns cleanup eligibility and workflow progression to the Router while keeping mutation semantics with the actual Todo tool.
- [Router Delegation Spec](../../spec/router-delegation.md), especially §§1.1–1.3, the Todo cleanup lifecycle, T1–T16 cleanup scenarios, and the Work/Plan/Waves contract.
- [Todo Multi-Tool Protocol Spec](../../../../todo/docs/works/todo-protocol-redesign/spec.md), especially §§1–5 and §11 for the fifth tool, atomic removal, checkpoint recovery, legacy boundaries, and consumer acceptance.
- Current read-only implementation inputs: [pi-harness.ts](../../../extensions/pi-harness.ts), [delegation-strategy/SKILL.md](../../../skills/delegation-strategy/SKILL.md), [todo/tool.ts](../../../../todo/src/tool.ts), and [todo/persistence.ts](../../../../todo/src/persistence.ts).

- The supplied source-delivery evidence and independent review establish completed source delivery for `W0`–`W3`: 53 Harness tests/1111 assertions, 114 Todo tests, both package typechecks, tuple/DAG/freshness checks, and no blocking review findings. These are source and evidence facts only; they do not prove prompt/Skill model behavior, provider behavior, reload freshness, or installed-runtime acceptance.
- The former preparation/confirmation wording below is retained as preparation history. It is not a current blocking prerequisite.

## Current source-delivery facts

- `packages/pi-harness/extensions/pi-harness.ts` and `packages/pi-harness/skills/delegation-strategy/SKILL.md` contain the delivered Router cleanup coordination contract, with focused instruction checks independently reviewed. The review confirms source coverage only; it does not establish a real Router model trace.
- The Todo source, recovery, consumer, test, README, and CHANGELOG surfaces contain the delivered fifth-tool removal contract and legacy boundary. The independent review confirms the focused source evidence and package typechecks; it does not establish actual provider/Host behavior or installed runtime exposure.


## Impact inventory and ownership candidates

The following inventory records the delivered source ownership boundary. Files listed as regression inputs are read/tested only, without write permission. Conditional consumer corrections require an observed removal-specific failure inside the listed candidate ownership; any other write needs Router scope/ownership reconciliation.

| Surface | Current owner/input | Proposed Wave ownership | Required behavior |
| --- | --- | --- | --- |
| Router cleanup prompt and coordination method | `packages/pi-harness/extensions/pi-harness.ts`; `packages/pi-harness/skills/delegation-strategy/SKILL.md` | `I-RTR` | Check cleanup after applied complete correlated Result and gate/dependency judgment, before handoff/wait/stop/final report; prove eligibility and actual capability; retain on any uncertainty; never hardcode a package/tool or use `subagent_remove`. |
| Router instruction acceptance | `packages/pi-harness/tests/extension.test.ts`; `packages/pi-harness/tests/skills.test.ts` | `I-RTR` | Static/schema checks cover wording, ordering, prohibited boundaries, and the explicit limit that they do not prove live model behavior. |
| Canonical result/type and request shape | `packages/todo/src/types.ts`; `packages/todo/src/schema.ts` | `I-REMOVE` | Add only canonical `remove` and strict `{removals}` with the disjoint `{task,todo}`/`{task}` union; preserve closed schemas and existing four tools. |
| Complete data operation | `packages/todo/src/state.ts`; `packages/todo/src/tool.ts` | `I-REMOVE` | Validate current state before request, shape/text before duplicate/overlap, duplicate/overlap before existence, build one cloned candidate, publish once on success and never on failure, resolve targets at queued execution time, preserve survivors/order/status, retain empty groups after local deletion, and remove groups only by explicit group selection. |
| Registration and operation tests | `packages/todo/test/schema.test.ts`; `packages/todo/test/state.test.ts`; operation and registration sections of `packages/todo/test/index.test.ts` | `I-REMOVE` | Register exactly five tools with a truthful description; cover all statuses, exact names, delimiters, groups, last-item removal, all-group removal, error precedence, queue ordering, one publication, no partial mutation, and later queued recovery. |
| Legacy enum-expansion guard | `packages/todo/src/persistence.ts`; `packages/todo/test/persistence.test.ts` | `I-REMOVE`, then read/preserve in `I-RESTORE` | Pin legacy `todo` actions to set/add/transition/view simultaneously with canonical enum expansion; reject legacy `remove`. |
| Canonical checkpoint and restore lifecycle | `packages/todo/src/persistence.ts`; `packages/todo/test/persistence.test.ts`; restore/replay sections of `packages/todo/test/index.test.ts` | `I-RESTORE` | Accept complete `todo_remove`/`remove` snapshots, clone them, preserve fallback and diagnostics, and reject malformed/incomplete/error/mismatched/extra-field/non-boolean-false candidates. Keep old canonical pairs and the legacy guard. |
| Visibility and renderer | `packages/todo/src/visibility.ts`; `packages/todo/src/renderer.ts`; `packages/todo/test/visibility.test.ts`; `packages/todo/test/renderer.test.ts` | `I-CONSUMERS` tests; source correction only on proven need | Helper `all` recognizes `remove`, `set-only` and `none` hide it; unknown/missing actions stay hidden. Preserve native tool rendering independently of that compatibility helper; render the complete post-removal snapshot and no removed record. |
| Widget and presentation lifecycle | `packages/todo/src/widget.ts`; `packages/todo/src/widget-component.ts`; `packages/todo/test/widget.test.ts`; coordinator widget checks in `packages/todo/test/index.test.ts` | `I-CONSUMERS` after `I-RESTORE`; source correction only on proven need | Refresh by surviving task name, discard removed expansion, preserve retained empty groups, update counts/representatives/details, retire stale listeners, and preserve existing terminal-clear, selection, viewport, and reset rules. `src/widget-layout.ts` stays read-only. |
| Public contract surfaces | `packages/todo/README.md`; current/unreleased `packages/todo/CHANGELOG.md` | `I-CONSUMERS` | Document the fifth tool, exact local/group selection, all-status removability, complete snapshot, atomic failure, caller-owned cleanup policy, concurrency limit, and older-reader fallback risk without automatic pruning or Router package coupling. |
| Other Todo consumers | `packages/todo/src/format.ts`, `src/reminder.ts`, `src/reminder-cadence.ts`, `src/detail-overlay.ts`, `src/settings.ts`, and their tests | Regression input; no writes | Preserve compaction/reminder/settings/detail behavior; do not expand the boundary by filename alone. |
| Runtime acceptance | Existing installed/runtime surfaces only; no source ownership | Separate provider/Host and real Router acceptance, outside selected graph | Separate actual provider/Host checks and real Router model traces from static checks and source delivery. Missing capability remains a limitation, not evidence of success. |
| Final review | All completed Results and current authority | `I-REVIEW` (`W3`) | Independently check scope, ownership, graph, authority coverage, evidence quality, compatibility, and all live limitations. It writes no project file. |

## Dependency, conflict, and safety facts

- Router source and Todo source have separate ownership and may proceed independently when the effective delegate contract permits it.
- At preparation, `TODO_RESULTS` was shared by legacy checkpoint recognition and canonical action visibility; the delivered implementation pins the legacy actions separately; the enum expansion and explicit legacy four-action guard belong together in `I-REMOVE`. Canonical recovery extends its separate tool/result map only in `I-RESTORE`.
- Todo source, enum, and registration changes stay within `I-REMOVE`. `packages/todo/src/persistence.ts`, `test/persistence.test.ts`, and `test/index.test.ts` are shared operation/recovery write paths; `I-RESTORE` follows the completed `I-REMOVE` Result before editing any of them. `I-CONSUMERS` also owns coordinator widget checks in `test/index.test.ts`, so it follows the completed `I-RESTORE` Result. The Todo lifecycle is serialized for genuine shared-file ownership, not arbitrary Wave numbering.
- Router instructions must not require, import, install, or assume `packages/todo` or `todo_remove`. The provider and negative instruction checks can name them; Router selection remains based on the actually callable schema, description, and contract.
- The Todo operation has one queued mutation atomicity boundary. It does not create stable IDs, revision checks, CAS, locks, receipts, a scheduler, automatic status pruning, or a transaction spanning a separate read/eligibility decision and deletion.
- Static instruction checks, source tests, and a scripted tool call cannot establish a real Router model trace. A live failure or unknown mutation effect leaves the completed work Result intact while retaining and reporting the affected Todo.

## Runtime prerequisites, not source-planning decisions

The source scope is settled without selecting a runtime provider. The Router's eventual actual capability inspection must establish exact targeting, atomic failure, survivor preservation, and stability before a cleanup attempt; no package selection is needed for source implementation. The two additional acceptance boundaries in [Plan](plan.md#additional-runtime-acceptance) will require an available compatible Host/model/backend, freshly loaded candidate bytes, and a disposable verification state. Any install/reload or external model execution needs its own explicit scope/authorization; none is granted here. Missing runtime capability leaves live acceptance unverified without blocking source delivery.

Historical Todo documents retain four-tool and former presentation wording; current README/CHANGELOG removal claims were synchronized by the completed consumer delivery. Only current README/CHANGELOG removal claims are synchronized in `I-CONSUMERS`; historical Tasks/Work/evidence and unrelated presentation migration are read-only. Source inspection is the current implementation input, and the accepted Spec remains authority; old lifecycle text is not fresh proof of runtime support.

## Delivery evidence

The adopted independent review is `C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/review-tool-agnostic-todo-cleanup-artifacts/result-1.json`, identity `review-tool-agnostic-todo-cleanup`, generation 1, completed. Its full report verifies the four prerequisite implementation Results, source predicates for `W0`–`W3`, 53 Harness tests/1111 assertions, 114 Todo tests, both package typechecks, and 39 links/anchors plus IDs/DAG, with no blocking source finding. These are the reviewer's checks, not reruns by this documentation reconciliation.

The later [routing review evidence](../visible-authority-routing/context.md#delivery-evidence) records the shared Harness source/test changes and preserves cleanup text/tests against their earlier baseline. The original cleanup hashes remain historical identities, not claims that the shared files or these reconciled documents still have those bytes. The cleanup report's “Cleanup 1–11” wording is a numbering error; the later review confirms Cleanup 1–6. Neither review establishes live model/provider/Host acceptance, installed-runtime freshness, reload or deployment.

## Preparation verification boundary

Preparation inspected the complete accepted authority references, the current Router extension and strategy inputs, the current Todo coordinator and persistence consumer, the documentation layout, existing Work/Plan/Waves conventions, and the repository-wide `TODO_RESULTS`/registration/visibility/renderer/widget/checkpoint references. The target directory was absent before this tuple was created. No authority, source, test, README, CHANGELOG, dependency, lockfile, Git state, or Todo runtime state was changed by the preparation itself.

The four tuple files are the only preparation artifacts. Their reciprocal links, stable IDs, ownership, dependencies, and release predicates are checked after writing; those checks establish document readiness only.

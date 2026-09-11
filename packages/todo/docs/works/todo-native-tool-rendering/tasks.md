# Tasks: Todo Native Tool Rendering

- Status: **implementation accepted; T2/T3 completed; T4 pending execution**
- Work: [work.md](work.md)
- Context: [context.md](context.md)
- Plan: [plan.md](plan.md)
- Governing protocol authority: [../todo-protocol-redesign/spec.md](../todo-protocol-redesign/spec.md)

## Admission and Preconditions

These gates were completed before implementation and remain required for later execution tasks:

1. Re-read the exact Work/Context/Plan/Tasks tuple and relevant protocol authority; verify raw identities and links.
2. Obtain independent full-scope review with P0–P3 all zero, then obtain explicit user acceptance of this exact tuple.
3. Reconcile current paths, HEAD, diff, and ownership. If any candidate path overlaps `todo-multi-expand`, freeze it or obtain written owner handoff before writing; otherwise record the no-overlap evidence. Stop if satisfying the handoff requires changing another authority.
4. Record the bounded T5 amendment for deleting `src/tool-frame.ts` and `test/tool-frame.test.ts`, including inventory, ownership, manifest, and regression responsibility. Preserve historical hashes; do not rewrite historical authority.

## Ordered Tasks

### T1 — Reconcile implementation boundary and T5 ownership

**Depends on:** admission gates.

**Status:** completed.

**Outcome:** a current evidence record establishes the exact writable paths, overlap status, and accepted T5 deletion amendment.

**Context:** Work overlap/ownership sections; Plan §3–§4 and §7–§8.

**Allowed surfaces:** later task evidence only; no source or authority changes in this task.

**Completion evidence:** current `git diff`/HEAD/path ownership evidence; explicit freeze or written handoff when needed; T5 deletion/inventory/manifest/regression responsibilities recorded in accepted task evidence.

### T2 — Migrate four tool callbacks to native-shell business content

**Depends on:** T1 and accepted tuple.

**Status:** completed.

**Outcome:** `todo_set`, `todo_add`, `todo_transition`, and `todo_view` custom `renderCall` callbacks return zero-padding business Text containing registered tool identity and action for every valid call state; no callback creates the old frame or empty call Container.

**Allowed paths:** `packages/todo/src/tool.ts`; `packages/todo/src/visibility.ts` only for evidence-backed obsolete successful-call hiding; `packages/todo/src/tool-frame.ts` deletion only as authorized by T1.

**Constraints:** preserve schemas, coordinator/state/queue, result/error shapes, `workingOn`, partial/error semantics, settings parsing/persistence, and Host-native shell ownership. Do not change widget, protocol, dependencies, settings, or runtime.

**Completion evidence:** focused registration/callback assertions for all four tools, independently varying `context.isPartial` and `context.isError`; no `set-only`/`none` success hiding; strict schema remains validation-only.

### T3 — Preserve renderer and result visibility contracts

**Depends on:** T1; may be implemented with T2 only when file ownership is non-conflicting.

**Status:** completed.

**Outcome:** result callbacks retain business content, status, errors, expanded rows, empty output, pending/error precedence, and falsey-only fallback without adding malformed-input guarantees.

**Allowed paths:** `packages/todo/src/renderer.ts`; `packages/todo/test/renderer.test.ts`; `packages/todo/src/visibility.ts` and `packages/todo/test/visibility.test.ts` only when required by the accepted selector migration.

**Completion evidence:** renderer tests cover valid empty/nonempty states, expanded/collapsed content, and falsey fallback; truthy malformed inputs remain explicitly outside the guarantee; existing `workingOn`, recovery, widget, and protocol assertions remain unchanged.

### T4 — Update focused integration and deletion regression coverage

**Depends on:** T2 and T3.

**Status:** pending execution.

**Outcome:** focused tests prove native callback/result contracts and the obsolete frame is absent, with no unrelated coordinator assertions changed.

**Allowed paths:** `packages/todo/test/index.test.ts`; deletion of `packages/todo/test/tool-frame.test.ts` only with T1 amendment; required schema registration assertions.

**Completion evidence:** all four registrations identified; call identity/action and result content/status/error/expanded information asserted independently; no Todo callback creates the old frame; strict schemas and legacy settings compatibility remain covered.

### T5 — Run focused static verification

**Depends on:** T4.

**Outcome:** package verification passes for the bounded change.

**Completion evidence:** focused tests, `bun run typecheck`, schema-only validation, and unexpected/untracked-file check all recorded. No Host, install, reload, commit, or deployment is performed by this task.

### T6 — Perform authorized real Pi 0.84.2 Host acceptance

**Depends on:** T5, fresh authority/ownership review, and separate authorization for interactive Host execution.

**Outcome:** real interactive Host evidence verifies native rendering for all four tools and required states.

**Constraints:** use only the Plan §6 PowerShell procedure, exact CLI/version `0.84.2`, existing dependencies and credentials; no installation, settings/core change, reload, or synthetic harness. Preserve four tool-call identity/results, Pi-native shell, and unchanged widget.

**Completion evidence:** CLI/dependency provenance and candidate hashes; actual requests/results; timestamped capture at required widths; per-tool/per-cell pass/fail/unobserved table for call identity/action and result content/status/error/expanded information; documented partial/error/collapse limitations. Any unobserved required cell leaves completion blocked.

## Dependencies and Parallel Safety

- T1 is the sole first task.
- T2 and T3 can be read-only reviewed in parallel after T1, but implementation writes are not parallel-safe on shared `packages/todo` paths.
- T4 follows both implementation tasks.
- T5 follows T4; T6 follows T5 and renewed gates.
- No task may modify Work, Context, Plan, protocol Spec, historical T5 authority, settings, dependencies, lockfiles, other worktrees, Git index, Pi Host/core, or session state.

## Completion Boundary

Implementation is accepted for the bounded T2/T3 work. T4 remains pending execution. Final completion additionally requires truthful T5 reconciliation, focused tests, typecheck, schema-only validation, untracked-file check, and real Pi `0.84.2` Host evidence; tests or old activation smoke cannot substitute for Host observation.

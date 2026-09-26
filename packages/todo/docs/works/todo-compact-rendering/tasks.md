# Tasks: Todo Compact Authority Reconciliation

- Status: **administrative gates complete; I0-I3 delivered; I4 automated checks and independent review done; live interactive acceptance blocked, delivery incomplete**
- Owner: `packages/todo`
- Governing Spec: [Todo Multi-Tool Protocol](../todo-protocol-redesign/spec.md)
- Governing Work: [work.md](work.md)
- Governing Context: [context.md](context.md)
- Governing Plan: [plan.md](plan.md)
- Implementation progression: **the later user authorization led to I0-I3 delivery; I4 waits on interactive observation, not renewed approval**

## 1. Purpose And Correction Basis

The administrative task-set review originally returned **`NO_GO_COMPACT_AMENDMENT_TASKS`, P1=2**:

1. Work prohibited Spec/Tasks changes while draft T0 required a Spec change, so permission contradicted execution.
2. The task set conflated acceptance of these administrative Tasks, acceptance of a future Spec amendment, and acceptance of the still-draft Compact Plan.

That disposition is superseded only for administrative Tasks readiness by fresh independent review **`GO_COMPACT_ADMIN_TASKS`, P0=0/P1=0/P2=0/P3=0**. The review was bound to exact Work SHA-256 `c8b2ec6270cf49e15a6c111f15aa23280109436a797c417b8bdebb9db41d007e` and Tasks SHA-256 `2e6232b8c5df8f7591c6cc2964c61e254fd59356d75acdfdabc2b1a0f7ca8779`; the same five-file preflight confirmed immutable Context `5eadf0a6ff6c9e1a63149371577016ba25359c6cbecf0567ee95d378c962d1cd`, Plan `1efcdf98abfe766871b3637b8da99f6742b64d4e8f39049dab28eb00cdccd8a5`, and governing Spec `fc6797f7e7f134fe61f0d8b2069aae36ea694f0dbe7428565042dfb1731ac492`. The exact reviewed administrative Tasks bytes are now explicitly accepted. This lifecycle-recording write changes the Work/Tasks hashes but does not redefine the accepted subject.

The sole proposed authority reconciliation remains exact: a UI may derive a deterministic read-only anchor from existing canonical order for presentation only. The anchor:

- creates no canonical primary, selected, or unique active todo;
- does not mutate, serialize, persist, or write back;
- does not feed business logic;
- does not compress or replace active groups; and
- introduces no priority, timestamp, hidden selection, or fallback state.

The governing prohibition on any single canonical or protocol active summary remains. The candidate T0 amendment may add only this narrow presentation exception, never a broad UI exemption.

## 2. Non-Collapsing Lifecycle

### Stage A: Administrative Tasks

Stage A consisted only of correcting `work.md` and this `tasks.md`, independent review of their exact bytes, and explicit acceptance of those administrative Tasks bytes. It is complete for exact Tasks SHA-256 `2e6232b8c5df8f7591c6cc2964c61e254fd59356d75acdfdabc2b1a0f7ca8779`. Acceptance at this stage means only that T0 may begin later. It does not accept or change the governing Spec, accept the Compact Work/Context/Plan, derive implementation Tasks, or authorize implementation.

### Stage B: Spec Amendment Candidate

Only after Stage A receives independent GO and explicit acceptance may T0 prepare a Spec amendment candidate. The candidate remains unaccepted until a separate independent authority review returns GO and the user explicitly accepts that exact Spec candidate. Drafting, reviewing, or recommending the candidate does not accept it.

### Stage C: Derived Compact Documents

Only after the exact Spec amendment is explicitly accepted authority may T1 synchronize Compact Work, Context, and Plan. The synchronized documents remain draft, unaccepted, unimplemented, and unauthorized. T2 then independently reviews their exact bytes. A T2 GO still does not accept them; their own explicit acceptance is a separate later decision. No implementation Tasks may be derived and no UI implementation may begin under this administrative graph.

No stage infers, bundles, or supplies a later stage's review, acceptance, or authorization.

## 3. Ordered Task Graph

The graph is strictly serial. Gates are external review or acceptance decisions, not work silently completed by a preceding task. There are no parallel-safe groups.

| ID | State | Observable outcome | Depends | Exact write boundary |
| --- | --- | --- | --- | --- |
| A0 | Complete | Work and Tasks state a consistent, non-collapsing administrative lifecycle. | None | `packages/todo/docs/works/todo-compact-rendering/work.md`, `tasks.md` only |
| A1 | Complete: `GO_COMPACT_ADMIN_TASKS`, P0=0/P1=0/P2=0/P3=0 | Independent review passed against exact A0 Work/Tasks bytes. | A0 | None; read-only evidence only |
| Gate A | Accepted for exact Tasks `2e6232b8c5df8f7591c6cc2964c61e254fd59356d75acdfdabc2b1a0f7ca8779` | The exact administrative Tasks bytes are explicitly accepted, and nothing else is accepted. | A1 GO | None; external acceptance decision |
| T0 | Complete | A narrow governing Spec amendment candidate may be prepared later without acceptance claims. | Gate A acceptance | `packages/todo/docs/works/todo-protocol-redesign/spec.md` only |
| B1 | Complete: `GO_COMPACT_SPEC_AMENDMENT`, all severity counts zero | Independent authority review reports GO or actionable NO_GO against the exact T0 candidate. | T0 | None; read-only evidence only |
| Gate B | Accepted for exact Spec candidate `70fea8a639db2a2ba2a35d21be375d6d3ee458511fd55c73fe60620b3094695e` | The user explicitly accepts the exact Spec amendment candidate as authority. | B1 GO | None; external acceptance decision |
| T1 | Complete | Compact Work, Context, and Plan are synchronized to accepted Spec authority while remaining draft and unauthorized. | Gate B acceptance | `packages/todo/docs/works/todo-compact-rendering/work.md`, `context.md`, `plan.md` only |
| T2 | Complete: generation-2 GO, all severity counts zero | Independent review reports GO or actionable NO_GO against the exact synchronized Compact document bytes. | T1 | None; read-only evidence only |
| Gate C | Accepted for the exact reviewed tuple recorded in Work Stage C | The user separately decides whether to accept the exact Compact document tuple. | T2 GO | None; external acceptance decision |

T0, T1, and T2 retain their prior intent. The added gates make their prerequisites and acceptance boundaries explicit.

## 4. Task Specifications

### A0: Correct Administrative Permission And Lifecycle

**Inputs:** The prior Work/Tasks bytes and `NO_GO_COMPACT_AMENDMENT_TASKS`, P1=2.

**Allowed paths:**

- `packages/todo/docs/works/todo-compact-rendering/work.md`
- `packages/todo/docs/works/todo-compact-rendering/tasks.md`

**Required result:**

- Work conditionally permits only the administrative Tasks lifecycle leading to a future T0 candidate.
- Tasks separates Stage A administrative acceptance, Stage B Spec authority acceptance, and Stage C Compact-document acceptance.
- The narrow presentation-anchor semantics, canonical/protocol prohibition, T0/T1/T2 intent, preserved Compact mechanisms, and all implementation exclusions remain intact.
- Both documents remain draft, unaccepted, unexecuted, and without implementation authorization.

**Completion evidence:** Exact before/after SHA-256 values; immutable Context, Plan, and Spec hashes; scoped diffs and checks; no claim that independent review has passed.

### A1 And Gate A: Review And Accept Administrative Tasks Only

**A1 result:** Fresh independent review returned `GO_COMPACT_ADMIN_TASKS`, P0=0/P1=0/P2=0/P3=0, against exact Work `c8b2ec6270cf49e15a6c111f15aa23280109436a797c417b8bdebb9db41d007e` and Tasks `2e6232b8c5df8f7591c6cc2964c61e254fd59356d75acdfdabc2b1a0f7ca8779`. It verified that the former permission contradiction and collapsed acceptance lifecycle are closed for Stage A readiness.

**Gate A result:** The exact reviewed administrative Tasks bytes are explicitly accepted. That acceptance authorizes only starting T0 later. It does not accept a not-yet-produced Spec candidate, the Compact Work/Context/Plan, implementation Tasks, or implementation.

### T0: Prepare Narrow Governing Spec Amendment Candidate

**Inputs:** Exact Gate A-accepted administrative Tasks bytes, current governing Spec bytes, and the selected presentation-only rule.

**Allowed path:**

- `packages/todo/docs/works/todo-protocol-redesign/spec.md`

**Required candidate change:**

- Preserve independent representation of groups containing `in_progress` todos and the prohibition on a canonical or protocol single-active summary.
- Permit only a deterministic read-only anchor derived from existing canonical order for presentation.
- State all semantic exclusions in section 1: no canonical primary/selected/unique active todo; no mutation, serialization, persistence, write-back, business-logic input, active-group compression/replacement, or priority/timestamp/hidden selection/fallback state.
- Do not alter requests, results, schemas, state, restore, queueing, persistence, tool behavior, or another protocol contract.

**Completion evidence:** Before/after Spec SHA-256 values and a scoped candidate diff. T0 must label the result unaccepted and must not change Compact documents or claim authority acceptance.

**Stop conditions:** Missing exact Gate A acceptance; need for another path; broader exception; weakened canonical/protocol prohibition; runtime semantic change; or unresolved authority question.

### B1 And Gate B: Review And Accept Spec Authority Separately

**B1 scope:** Independently review the exact T0 candidate as authority. Verify the narrow exception, every exclusion, and absence of collateral protocol change. B1 is read-only and reports GO or actionable NO_GO.

**Gate B scope:** Only after B1 GO may the user explicitly accept the exact Spec candidate. Neither Gate A, T0 completion, nor B1 GO implies Gate B acceptance. T1 remains blocked until that explicit authority decision exists.

### T1: Synchronize Compact Derived Documents

**Inputs:** The exact Gate B-accepted Spec and current Compact [work.md](work.md), [context.md](context.md), and [plan.md](plan.md).

**Allowed paths:**

- `packages/todo/docs/works/todo-compact-rendering/work.md`
- `packages/todo/docs/works/todo-compact-rendering/context.md`
- `packages/todo/docs/works/todo-compact-rendering/plan.md`

**Required reconciliation:**

- Align derived presentation-anchor wording with the accepted Spec without widening it.
- Preserve overlay-owned scrolling, wrapping, slicing, PageUp/PageDown, and wheel semantics.
- Preserve qualified-command discovery, source attribution, and ambiguous-attribution rejection.
- Preserve fixed status order, explicit zero counts, bounded `+N`, the existing spacer, accessibility requirements, dependency and rollback ownership, the B2 -> A2 gate, verification graph, and all exclusions.
- Record review history truthfully without converting candidate dispositions into clearance.
- Keep the synchronized Work, Context, and Plan draft, unaccepted, unimplemented, and without implementation authorization.

**Completion evidence:** Exact before/after hashes, scoped diffs, local-link/UTF-8/whitespace/lifecycle/scope/contradiction checks, and an explicit statement that no implementation Tasks were derived.

**Stop conditions:** Missing exact Gate B acceptance; change to accepted authority; change to a preserved Compact mechanism, implementation path, competing-work ownership, dependency/rollback rule, B2 -> A2 gate, or exclusion.

### T2 And Gate C: Review And Decide Compact Documents Separately

**T2 scope:** Independently inspect exact T1 bytes for agreement with accepted Spec authority, lifecycle truth, retained mechanisms and exclusions, links, encoding, whitespace, path scope, and contradictions. T2 performs no repair and reports GO or actionable NO_GO. Any needed edit returns to T1 and requires a new review identity.

**Gate C scope:** A T2 GO establishes review evidence only. Explicit acceptance of the exact Compact document tuple is a separate user decision. Gate C acceptance is not supplied by Gate A, Gate B, T1 completion, or T2 GO, and this administrative graph still does not derive implementation Tasks or authorize implementation.

## 5. Completion And Exclusions

Stage A, T0, B1/Gate B, T1, T2, and Gate C are complete at their separate boundaries. Generation-2 T2 GO and the user's explicit Gate C acceptance apply to the exact pre-recording tuple identified in [Work's Stage C record](work.md). These administrative status edits do not change the accepted design or establish new authority. Earlier task specifications describe required states at their respective execution checkpoints, not the current acceptance status.

This administrative graph was complete without implementation Tasks when Gate C was recorded. The later user instruction `推进` authorized the execution graph in section 6, now delivered through I3. Source, tests, README, dependencies, manifests, lockfiles, Git index/history, Todo runtime state, sessions, tabs, and panes were excluded from the *administrative* graph; implementation evidence and the current remaining gate are recorded in section 6. The implementation boundary remains the accepted [Plan](plan.md), not an expansion of administrative Stage A-C.

All stages and future implementation tasks preserve the presentation-only derived-anchor rule and the prohibition on canonical, selected, unique, mutable, persisted, business-logic, compressed, priority-, timestamp-, hidden-selection-, or fallback semantics.

## 6. Executable Implementation Tasks

**Selected pair:** [plan.md](plan.md) O0-O4 and this `tasks.md` I0-I4 in this Work directory. Gate B Spec acceptance and Gate C design acceptance preceded this graph. Later user authorization led to delivered I0-I3; the historical administrative A0-T2/Gate A-C graph is not re-executed. I4 is incomplete until live interactive acceptance evidence is observed. No renewed design/implementation approval is required.

**Shared authority and constraints for every I task:** [governing Spec](../todo-protocol-redesign/spec.md) Section 1 as accepted at Gate B; [Work](work.md) acceptance/ownership; [Context](context.md) current delivery evidence; [Plan](plan.md) Sections 2-9 including precise O outcomes and verification matrix. Exact `0.85.1` applies to all three named Pi packages; no change to accepted design, model, four tools, excluded files, or other dependencies. Keep pre-existing `nul`, modified governing Spec, and unrelated dirty work untouched. Runtime/interactivity claims require live evidence, not passing stub tests.

| ID | State | Depends | Independently observable result and owned paths | Completion check |
| --- | --- | --- | --- | --- |
| **I0 / O0** | Complete | Gate C and later user authorization; B2/A2 release evidence inspected | One exact installed `0.85.1` Pi graph: root `package.json`, `packages/todo/package.json`, root `bun.lock` only. Upstream release and local overlap hashes recorded without writing overlap. | Both manifests, lock and installed direct graph exact; frozen install and public API compile probe passed. I4 later reran the three affected package suites/typechecks on declared Bun `1.3.14`. |
| **I1 / O1** | Complete | I0 exact graph | Replaced only persistent projection in `packages/todo/src/widget-layout.ts` and focused `packages/todo/test/widget.test.ts`; retained `renderTodoLine` for tool callers and existing publication/clear/spacer behavior. | I1 focused widget tests 10/10 and Todo typecheck passed; I4 later covered summary bounds, widths and lifecycle with full Todo tests. |
| **I2 / O2** | Complete | I0 exact graph | Added `packages/todo/src/detail-overlay.ts` and `packages/todo/test/detail-overlay.test.ts` only; one snapshot read-only component with local cursor/expanded/offset, public TUI keyboard/mouse contracts and bounded rendering. | I2 focused overlay tests 8/8 and Todo typecheck passed; I4 later reran focused and full suites. |
| **I3 / O3** | Complete | I2 opener; B2/A2 release and explicit local upstream incorporation, followed by focused baseline | In `packages/todo/src/tool.ts` and `packages/todo/test/index.test.ts` only, registered `todo-details` and `Key.ctrlShift("t")` with description `Open Todo details`, sharing one TUI-guarded opener and a fresh coordinator clone. Accepted review fixes preserved. | I3 focused index/overlay tests 25/25 and Todo typecheck passed; public duplicate-command qualification/discovery in both load orders and ambiguous-attribution fixture covered. |
| **I4 / O4** | Incomplete: automated checks and independent review passed; live TUI acceptance **UNPERFORMED** | I1, I2, I3 and upstream incorporation | Integrate only the Plan's owned surfaces; reconcile `work.md`, `context.md`, `plan.md`, `tasks.md` against observed evidence; no README, `widget.ts`, or other excluded implementation path. | Focused/full Todo and both wildcard-consumer tests/typechecks, frozen lock, exact manifest/lock/installed graph, noninteractive Host and diff checks passed. Independent read-only review found no material findings and reran no tests. Plan Section 7 interactive regular/fullscreen keyboard, click, wheel, resize, focus, duplicate+unavailable-shortcut discovery and ambiguity gate remain unperformed. |

I1 and I2 used disjoint files on the same I0 graph. The accepted upstream fixes were explicitly incorporated before I3; the prior I3/I4 integration gate is satisfied. The 360 passing tests consist of 82 Todo, 136 pi-harness and 142 pi-herdr-subagents; the focused 35 are a rerun/subset, not additional distinct tests. The [I4 report](C:/Users/WINDOWS/.cache/pi/todo-compact-i4-verification.md) records actual commands, frozen install, exact `0.85.1` graph, offline RPC/print Host behavior, scope checks and unperformed live matrix. The [independent review Result](C:/Users/WINDOWS/.pi/agent/sessions/--E--Projects-pi-packages--/2026-08-16T11-58-37-784Z_01a00a70-28d7-789b-8c64-0d784f30d9b4/tasks/review-todo-compact-implementation-artifacts/result-1.json) contains no material findings and reports no new test runs. See [Work](work.md) for I0-I3 and incorporation Results. These automated checks do not satisfy live mouse, focus, or shortcut acceptance.

### Remaining Live Verification (not yet executed)

From `E:/Projects/pi-packages/.worktree/todo-compact-rendering`, use the installed `0.85.1` CLI and declared Bun `1.3.14` graph. Installed Pi `docs/usage.md` documents default interactive mode, `--tui-mode regular|fullscreen`, isolated `--session-dir`, and `--no-extensions -e <extension>`; the CLI `dist/cli.js` path was exercised in the I4 RPC/print Host checks. The following is a *manual invocation recipe*, not an executed command or result; run in an actual interactive terminal, once per mode, using a disposable session directory so restore behavior can be tested:

```powershell
& 'D:/Applications/Scoop/persist/nodejs-lts/cache/_npx/60c3515df86f25b1/node_modules/bun/bin/bun.exe' 'node_modules/@earendil-works/pi-coding-agent/dist/cli.js' --session-dir "$env:TEMP/todo-compact-live" --no-extensions --tui-mode regular -e './packages/todo/src/index.ts'
# Repeat with --tui-mode fullscreen in a terminal supporting fullscreen mouse input.
```

- Populate Todo via its four existing tools, then compare the persistent summary with `todo_view`: wide/narrow widths, empty/pending/active/terminal and multiple active groups, five-second terminal clear, mutation and branch/session restore/reopen. Record actual observed output and versions.
- In each mode, open `/todo-details` and `Ctrl+Shift+T` when available. By keyboard traverse first/middle/last tasks; expand/collapse; PageDown to the final todo and full wrapped description of an oversized task, PageUp back; resize, Escape, and confirm editor focus/input on repeated opens.
- In regular mode confirm keyboard completeness and no Pi-captured mouse. In fullscreen click an unselected header (one toggle), act on it with Left/Right/Enter, click to collapse, wheel over header/body/chrome and at boundaries; confirm scroll hit mapping after resize and no transcript corruption.
- In both modes deliberately register a second `todo-details` and an unavailable colliding shortcut; use native autocomplete to find Todo's actual qualified command by `Open Todo details` and source, invoke it and record invocation/source and shortcut diagnostics in both load orders. If attribution is ambiguous, record a visible failure with candidate names/paths; do not guess a suffix.

**Blocker:** this environment had redirected stdin/stdout and no supported interactive keyboard/mouse/resize/focus observation. The live checks above are UNPERFORMED, not failed. I4 and overall Todo Compact delivery cannot be marked complete until they are observed; no acceptance criterion is waived.

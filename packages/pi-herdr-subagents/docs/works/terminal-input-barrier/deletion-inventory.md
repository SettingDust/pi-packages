# Terminal Input Barrier Deletion And Preservation Inventory

- **Status:** historical independently reviewed exact inventory and cleanup execution retained as the cleanup audit record
- **Decision:** collector/Q1 real-environment acceptance is withdrawn in full
- **Execution:** complete in the historical cleanup operation; all 32 listed deletion paths were removed exactly after the required fail-closed preflight

## Deleted After Fresh Independent Review

The cleanup deleted exactly these paths, and no others.

### Ledger and obsolete real-attempt evidence

- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/attempt-4-ledger.md`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/real-attempt-2.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/real-attempt-3.json`

### Historical Q1/preflight records, sidecars, shapes, and captures

- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260820T094053875Z-attempt-shape.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260820T094053875Z-preflight-shape.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260820T094053875Z-preflight.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260820T094053875Z-preflight.json.sha256`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260820T103327753Z-attempt-shape.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260820T103327753Z-fixture-launch.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260820T103327753Z-preflight-shape.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260820T103327753Z-preflight.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260820T103327753Z-preflight.json.sha256`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260820T123002967Z-preflight.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260820T123002967Z-preflight.json.sha256`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260821T081933365Z-attempt-shape.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260821T081933365Z-fixture-launch.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260821T081933365Z-preflight-shape.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260821T081933365Z-preflight.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260821T081933365Z-preflight.json.sha256`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260821T163110877Z-preflight.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-20260821T163110877Z-preflight.json.sha256`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-collector-parser-replay.json`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-collector-parser-replay.json.sha256`

### Collector, fixture, parser, replay, helper, and collector-only tests

- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-cim-helper.mjs`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-collector-entry.test.mjs`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-collector-parser-replay.mjs`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-collector-repair.test.mjs`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-disposable-probe.mjs`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-fixture-parser.mjs`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-fixture-parser.test.mjs`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-preflight-collector.mjs`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/q1-replay-boundary.test.mjs`

Before deletion, `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/q1/` was proven to contain exactly the 29 listed Q1 files. Each file was then unlinked by exact path; no recursive directory deletion was used. The resulting empty directory is not a tracked artifact.

## Preserve

### Product implementation and ordinary regression test

- `packages/pi-herdr-subagents/extensions/pane-child.ts`
- `packages/pi-herdr-subagents/tests/pane-child.test.ts`

### Normative lifecycle and barrier authority

- `packages/pi-herdr-subagents/docs/spec/terminal-input-barrier.md`
- `packages/pi-herdr-subagents/docs/spec/runtime-lifecycle.md`

### Product Work and coordination documents

- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/work.md`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/context.md`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/plan.md`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/tasks.md`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/acceptance-matrix.md`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/deletion-inventory.md`

### Product-focused evidence

- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/f0-red.md`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/implementation.md`
- `packages/pi-herdr-subagents/docs/works/terminal-input-barrier/evidence/pi-source.md`

## Executed Review Rule

The historical fresh independent review and execution established:

1. every deletion path was present before deletion and served only withdrawn collector/Q1/real-environment acceptance;
2. no preserved source, ordinary test, authority, Work document, or product evidence appeared in the deletion set;
3. no unlisted file existed under `evidence/q1/`;
4. removal left no normative or coordination requirement for collector/Q1, attempts 4/5, replay, ledger, CIM/Herdr fixtures, or real-environment proof; and
5. all preflight findings were clean before the first unlink.

The historical postflight proved all 32 deletion paths absent, all 13 preservation paths present, every preserved content hash unchanged, and `evidence/q1/` empty. No staging or commit occurred during that historical cleanup operation; the later source/test commit is `2a49f9936cc3c6e76041696ea11004a1afbf93ff`. The ten documentation/evidence files in this reconciliation remain uncommitted.

# Terminal Input Barrier Specification

## 1. Scope

This specification defines the child-side terminal input barrier and completion-persistence state for one `@settingdust/pi-herdr-subagents` generation. It owns how `pane-child` treats an `input` event while a `subagent_done` Result is being persisted and after the first successful persistence but before child shutdown completes. Collector/Q1 real-environment acceptance has been withdrawn and is not part of this product authority.

Implementation provenance is recorded in the derived Work documents: `extensions/pane-child.ts` and `tests/pane-child.test.ts` are committed in `2a49f9936cc3c6e76041696ea11004a1afbf93ff`, while this #18 documentation/evidence set remains uncommitted until a later documentation commit.

It does not change parent runtime state, `subagent_steer` eligibility or transport submission, Handler Result parsing, notification, join, cancellation, removal, surface cleanup, task identity, or generation semantics. Review items `#13` and `#25` remain outside this authority.

## 2. Terms And State

- **completion attempt**: one `subagent_done` call accepted while the child is `active`.
- **settling**: the state entered synchronously when a completion attempt is accepted and its asynchronous Result write has not yet succeeded or failed.
- **settled**: the state entered only after the completion attempt's Result has been atomically persisted successfully.
- **pre-barrier input**: an `input` event whose handler begins while the child is `active`.
- **barrier-window input**: an `input` event whose handler begins while the child is `settling` or `settled` and before process shutdown completes.
- **consumed**: the input handler returns `{ action: "handled" }`, so Pi must not expand, append, queue, or start an agent turn for that input.
- **Result artifact**: the existing generation-specific JSON Result written by `subagent_done`.

For a valid child environment, `pane-child` has these states:

```text
active -- accepted subagent_done --> settling
settling -- atomic Result persistence succeeds --> settled -- shutdown
settling -- write or rename fails --> active
```

Only successful atomic persistence settles the generation. A failed completion attempt is not authoritative and must leave the child active for retry. Once `settled`, the state must never return to `active`.

Calls made while one attempt is `settling` join that attempt's outcome and must not start another write. Calls made after `settled` remain idempotent. The Result body of the first successfully persisted attempt wins; a failed earlier attempt and later duplicate calls must not overwrite it.

## 3. Barrier And Persistence Contract

### 3.1 Barrier-Window Input

Every barrier-window `input` must be consumed synchronously by returning `{ action: "handled" }`.

A consumed barrier-window input must:

- start no `before_agent_start`, `agent_start`, model/provider request, tool execution, or other agent turn;
- create no user `message` entry and start no later agent turn in the child JSONL session; records that finish the already-running completion turn are not evidence of another turn;
- schedule no continuation nudge;
- leave the in-flight or first successfully persisted Result unchanged; and
- leave persistence retry or shutdown eligible to proceed under the state transition that follows.

The barrier applies to every Pi `input` source (`interactive`, `rpc`, and `extension`) and to every streaming behavior because state, not transport provenance, is the eligibility boundary. It does not inspect or transform the input text, images, source, or streaming behavior.

### 3.2 Active Compatibility

An input whose handler begins while `active` must preserve the behavior that existed before this specification: the barrier must not return `handled` or otherwise block it. Existing continuation bookkeeping may mark input activity and clear a pending nudge.

If an active input has already passed the input hook when a completion attempt enters `settling`, this specification does not retroactively retract, remove, or rewrite that input. Conversely, an input consumed during `settling` remains consumed if that completion attempt later fails and the child returns to `active`.

### 3.3 Write Success, Failure, And Retry

The accepted completion attempt must expose its persistence outcome to the `subagent_done` tool execution:

- on successful write and atomic rename, transition to `settled`, call `ctx.shutdown()` once, and return the existing successful tool content;
- on write or rename rejection, restore `active` before propagating the failure to the tool call, do not call `ctx.shutdown()`, and permit a later `subagent_done` call to retry; and
- while an attempt is `settling`, make duplicate calls observe that same attempt's success or failure without starting another write.

A failed attempt must not create an authoritative Result artifact. If a prior successful Result artifact exists, no later call may alter it.

### 3.4 Ordering And Races

Event ordering is determined by entry into the synchronous `input` handler and the synchronous state transitions:

| Event order | Required input decision | Required Result behavior |
| --- | --- | --- |
| `input` handler enters while active, then `subagent_done` enters settling | continue under pre-existing input semantics | accepted attempt may settle or fail |
| `subagent_done` enters settling, then `input` handler enters while write is pending | `handled` | in-flight attempt remains the only write |
| Result persistence succeeds, then input arrives before shutdown completes | `handled` | first successful Result is unchanged |
| Result persistence fails, state returns active, then input arrives | pre-existing active behavior | a later completion attempt may retry |
| duplicate `subagent_done` while settling, then input | `handled` | duplicate shares the in-flight outcome; no second write |
| input after process shutdown | no child handler executes | outside the extension boundary |

The barrier decision must not wait for the Result write, rename, tool return, or shutdown callback.

## 4. Invariants And Non-Goals

The implementation must preserve:

- the current `subagent_done` tool name, parameters, successful return content, atomic Result write, and post-success `ctx.shutdown()` call;
- first-successful-Result-wins idempotence and observable write failure with active retry;
- existing active-state continuation/nudge behavior;
- exact `subagent_steer` submission and running-task guard semantics;
- parent task status, Result retrieval, terminal notification, join, cancel, remove, recovery, and surface behavior;
- stable `subagentId` and generation identity; and
- no new configuration, dependency, parent tool, acknowledgement, receipt, queue, polling loop, or persistence field.

This work does not guarantee that an active input already accepted by Pi will be cancelled. It does not make parent steering aware of child state before the Result reaches the parent, reject Herdr submission at the parent, delete terminal input from a session after it was appended, or change `#13`/`#25` behavior.

## 5. Acceptance Matrix

| Scenario | Input result / child activity | Result and lifecycle invariant | Required evidence |
| --- | --- | --- | --- |
| active child receives input | existing non-handled behavior; a turn may start | no terminal Result implied | focused deterministic test |
| settling begins before input while Result write is pending | exactly `handled`; no agent start | in-flight write is singular | focused deferred-write test |
| input occurs after successful persistence but before shutdown completion | exactly `handled`; no agent start | first successful Result bytes/body unchanged | focused deferred-shutdown test |
| input enters before settling | not handled by barrier | accepted attempt may then settle or fail | focused ordering test |
| repeated barrier-window inputs | every input handled; zero new turns | one write attempt and at most one shutdown | focused repeat-input test |
| duplicate `subagent_done` while settling | input handled | duplicates share one persistence outcome | focused in-flight idempotence test |
| Result write or rename rejects | settling returns to active; failure is observable; later input is not handled by barrier | no shutdown; retry may persist a different Result | focused rejection-and-retry test |
| failure followed by successful retry and duplicates | only the successful retry settles | successful retry body/digest wins and cannot be overwritten | focused first-successful-wins test |
| pre-existing continuation lifecycle | no regression in timer dedupe, cleanup, later unfinished turn, or nudge stop | existing active lifecycle unchanged | existing ordinary child tests |
| parent boundary | steering, notification, join, cancel, remove, task ID, generation, and cleanup semantics unchanged | no parent-side mutation added | owned diff review and ordinary package gates |

Tests must control persistence success, persistence rejection, and shutdown independently; a test that emits input only after immediate shutdown does not exercise the barrier window. Framework interpretation must remain pinned to the applicable Pi package version and source semantics for `{ action: "handled" }` and deferred shutdown.

Collector scripts, Q1/preflight, Herdr/CIM fixtures, real attempts, sentinels, evidence ledgers, and replay are explicitly outside acceptance. Their absence does not reduce the required deterministic product behavior or ordinary regression coverage.

## 6. Completion Gate

Completion requires all product acceptance rows, focused write-failure/retry tests, package typecheck and tests, pinned Pi-source evidence, owned-path hash/diff reconciliation, documentation reference checks, `git diff --check`, and a fresh independent correctness review against this specification and its Work.

No collector repair or review, Q1 result, attempt 4/5, real-Herdr run, liveness proof, sentinel observation, record sidecar, ledger, or replay is required. The separate deletion-safety review in the Work gates destructive cleanup of obsolete evidence infrastructure, not product acceptance.

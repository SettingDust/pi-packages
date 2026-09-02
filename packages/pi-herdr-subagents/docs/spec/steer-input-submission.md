# Steer Input Submission Specification

## 1. Scope

This specification defines how `@settingdust/pi-herdr-subagents` submits a `subagent_steer` message to a running child Pi pane. It owns submission behavior, tool success and failure semantics, and acceptance conditions. It does not change task lifecycle, Result retrieval, or the public tool schema.

## 2. Public Tool Contract

`subagent_steer` must retain this input shape:

```ts
{ subagentId: string; message: string } // message has minLength: 1
```

The tool must resolve `subagentId` in the active runtime scope. It must submit only when the current task status is `running`. An unknown task or a task in any terminal state must fail before a transport submission is attempted. The existing returned task snapshot and lifecycle guard remain the contract.

## 3. Atomic Submission

For an eligible task, `SubagentRuntime.steer` must submit the supplied `message` to that task's `paneId` through the concrete Herdr transport.

The concrete Herdr transport must invoke Herdr as one `pane run <PANE_ID> <COMMAND>` operation, with `message` as the single command payload. It must not use `pane send-text`, add shell syntax, alter the message, or issue a separate Enter operation. This maps the message to Herdr's atomic text-and-Enter behavior so the child Pi receives a submitted user turn rather than composer-only text.

The existing transport method name and runtime call boundary may remain unchanged; its concrete behavior must satisfy this section. No caller-visible transport API, `subagent_steer` schema, task record, generation, or task-status change is required.

## 4. Success And Failure Semantics

A successful `subagent_steer` call means Herdr accepted the atomic `pane run` submission request for the current running pane. It returns the current task snapshot without changing its generation, status, Result, completion notification, or monitor behavior.

Success does not mean that the child Pi has processed the message, produced model output, completed its task, or written a Result. `subagent_steer` must not wait for any of those events or provide a processing receipt.

If Herdr rejects the submission, the call must reject with that failure. The runtime must not manufacture a Result, terminal transition, completion notification, retry, or synchronous acknowledgement. The task remains governed by its existing lifecycle and monitor behavior.

## 5. Invariants And Non-Goals

The change must preserve all of the following:

- `subagent_steer` input schema and tool name;
- the running-task guard and unknown-task failure behavior;
- stable `subagentId` and generation semantics;
- `subagent_join` as the blocking Result-retrieval operation;
- retained pane and artifact lifecycle; and
- existing cancellation, completion notification, and Result semantics.

This work does not add delivery receipts, model-processing receipts, retries, polling, synchronous Result guarantees, new tools, configuration, or dependencies.

## 6. Acceptance

Focused transport coverage must prove that steering maps one exact message to Herdr `pane run` for the target pane and does not invoke `pane send-text`.

Focused runtime coverage must prove that a running task forwards its exact message once, while unknown or terminal tasks fail without a submission. It must also prove that the public `subagent_steer` schema and returned running-task lifecycle behavior remain unchanged.

A real Herdr acceptance run is required in addition to mocked coverage. For a child that is still `running`, the run must show all of the following in order:

1. a `subagent_steer` request with a recorded exact message;
2. exactly one new child-session `message` record whose `message.role` is `user` and whose `message.content` is exactly one `{ type: "text", text: <exact message> }` item; and
3. new child agent or model activity after that user turn.

The evidence predicate must reject string `message.content`, an array with zero or multiple items, a non-text item, any text normalization, and multiple exact matching user records.

Composer-visible text alone, a Herdr CLI exit code of zero, or activity that predates the new user turn is insufficient acceptance evidence. The run must use the actual Herdr transport and child Pi session, not a fake transport.

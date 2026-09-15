# Work: Handler Result Router Boundary

- Status: current-session user acceptance preserved for the narrowed prompt-only Router decision boundary; bounded prompt-guidance source implementation is authorized; no acceptance receipt is recorded here
- Nature: derived coordination material, not authority or acceptance evidence
- Boundary: authorize the bounded prompt-guidance source implementation only; no tests, runtime, Todo, or operational changes in this synchronization

## Objective

When a terminal Handler Result is visible to the Router, the Router reads the available Result and independently decides the next step. Result visibility supplies input to Router judgment; it does not itself prescribe a runtime consumer or an automatic follow-up action.

## Scope and settled decision

- The Router reads the available terminal Handler Result when it is visible in the current Router context.
- The Router independently decides the next step from that Result; no automatic dispatch, continuation, retry, projection, dependency release, or status transition follows from visibility alone.
- Preserve `completed`, `partial`, `blocked`, and `failed` as Handler Result input semantics; do not map them to new Herdr task statuses.
- The prompt-only boundary does not specify or require how the Result becomes visible. In particular, it does not define a `CompletionNotification`/`custom_message` receiver, runtime consumer, join or retrieval path, backend notification behavior, or Pi-core change.
- This tuple records accepted guidance and authorizes the bounded prompt-guidance source implementation. It does not claim source implementation, live runtime behavior, or downstream verification has already occurred.

## Explicit non-goals

No runtime Result consumer, `CompletionNotification`/`custom_message` receiver, Todo/task projection, dependency release, replay state or ledger/guard, scheduler, queue, retry engine, outbox, identity store, automatic dispatch, Handler continuation, notification-payload extension, new status mapping, Pi-core change, settings/session change, or operational action.

## Recovery state and completion

These four documents were rewritten as a recovery synchronization because pre-failure bytes are unavailable. Preserve only verifiable existing facts; do not claim the failed Handler was clean. The current-session user acceptance is preserved and narrowed to the prompt-only Router decision boundary. This records lifecycle state only; no acceptance receipt or digest is recorded here. The bounded prompt-guidance source implementation is authorized by the accepted tuple; its source, live runtime behavior, and downstream verification are outside this documentation synchronization and remain unperformed.

Completion of this documentation synchronization requires self-consistent Work/Context/Plan/Tasks documents and a bounded read-only diff/status/hash check after the rewrite. Source implementation and runtime verification remain downstream of this handoff.

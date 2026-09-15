# Plan: Handler Result Router Boundary

- Status: current-session user acceptance preserved for the narrowed prompt-only Router decision boundary; bounded prompt-guidance source implementation is authorized; no acceptance receipt is recorded here
- Work: [work.md](work.md)
- Context: [context.md](context.md)
- Boundary: this handoff synchronizes lifecycle documentation only; the accepted plan authorizes the bounded prompt-guidance source implementation, with downstream verification

## Objective

Record the accepted prompt-only Router guidance: when a terminal Handler Result is visible to the Router, the Router reads the available Result and independently decides the next step.

## Bounded scope

1. **T1 - Read the available Result.** Treat the visible terminal Handler Result as input to Router judgment. Do not define a notification receiver, runtime consumer, join or retrieval path, or any other visibility mechanism.
2. **T2 - Decide independently.** Let the Router choose the next step from the Result. Preserve `completed`, `partial`, `blocked`, and `failed` as input semantics; visibility alone causes no automatic dispatch, continuation, retry, projection, dependency release, or status mapping.
3. **T3 - Reconcile recovery evidence.** Remove superseded runtime and delivery assumptions from this tuple and state that source implementation, live behavior, and downstream verification remain pending.

## Excluded implementation

No runtime Result consumer, `CompletionNotification`/`custom_message` receiver, Todo/task projection, dependency release, replay state or ledger/guard, scheduler, queue, retry engine, outbox, identity store, notification-payload extension, automatic dispatch, Handler continuation, new status mapping, Pi-core change, settings/session change, or operational action.

## Gate

This documentation amendment delivers only the four Work/Context/Plan/Tasks files. The current-session user acceptance is preserved for this narrowed tuple; no acceptance receipt or digest is created or recorded here. The accepted plan authorizes the bounded prompt-guidance source implementation, while source and runtime verification remain downstream and are not performed by this amendment. Completion of this synchronization requires self-consistent documents plus bounded read-only diff/status/hash verification.

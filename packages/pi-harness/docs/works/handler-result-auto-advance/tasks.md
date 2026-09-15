# Tasks: Handler Result Router Boundary

- Status: current-session user acceptance preserved for the narrowed prompt-only Router decision boundary; bounded prompt-guidance source implementation is authorized; no acceptance receipt is recorded here
- Work: [work.md](work.md)
- Context: [context.md](context.md)
- Plan: [plan.md](plan.md)
- Boundary: this handoff synchronizes lifecycle documentation only; the accepted task set authorizes the bounded prompt-guidance source implementation, with downstream verification

## T1: Read the available Result

When a terminal Handler Result is visible to the Router, read the available Result as input to Router judgment. The task does not define how visibility occurs and does not require a `CompletionNotification`/`custom_message` receiver, runtime consumer, join, retrieval, or notification path.

## T2: Decide independently

Let the Router independently decide the next step from the Result. Preserve `completed`, `partial`, `blocked`, and `failed` as input semantics. Visibility alone does not dispatch, continue, retry, project, release, or map to a new Herdr status.

## T3: Reconcile evidence and lifecycle

Remove superseded runtime, delivery, projection, dependency-release, replay-state, scheduler, queue, retry, outbox, identity, and Pi-core implementation requirements from the tuple. Preserve the user's acceptance and state that this synchronization adds no source or runtime evidence; the accepted task set authorizes bounded prompt-guidance source work and downstream verification remains pending. No acceptance receipt is created or recorded here.

## Completion gate

This documentation synchronization is complete when these four documents are self-consistent and a bounded read-only diff/status/hash check is performed. The user acceptance remains preserved for the narrowed prompt-only boundary, and the accepted task set authorizes the bounded prompt-guidance source implementation. No source, tests, runtime, Todo, or operational work is performed by this synchronization; downstream verification remains pending.

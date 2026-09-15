# Context: Handler Result Router Boundary

- Status: current-session user acceptance preserved for the narrowed prompt-only Router decision boundary; bounded prompt-guidance source implementation is authorized; no acceptance receipt is recorded here
- Related Work: [work.md](work.md)
- Nature: processed coordination context, not authority or acceptance evidence

## Current Boundary

When a terminal Handler Result is visible to the Router, the Router reads the available Result and independently decides the next step. The Result is an input to judgment, not an instruction to dispatch, continue, retry, project, release dependencies, or mutate task state.

## Preserved facts

- Result statuses are `completed`, `partial`, `blocked`, and `failed`; they remain Handler Result input semantics, not native Herdr task statuses.
- The current-session user acceptance is preserved for this narrowed prompt-only boundary; no acceptance receipt or digest is recorded in these documents.
- The mechanism that makes a terminal Result visible is intentionally unspecified by this tuple. This amendment supplies no runtime consumer, settings, or operational behavior and does not record source or test evidence.
- Visibility of a Result does not itself require or imply automatic dispatch, continuation, retry, projection, dependency release, or status mapping.

## Superseded recovery assumptions

The earlier recovered assumptions that `pi-harness` consumes a `CompletionNotification`/`custom_message`, joins or retrieves a stored Result, validates notification correlation, or relies on backend duplicate-delivery behavior are superseded by the prompt-only boundary. They are not current requirements or evidence of implemented behavior.

Earlier implementation requirements for a runtime consumer, Todo/task projection, dependency release, replay state or ledger/guard, scheduler, queue, retry engine, outbox, identity store, notification-payload extension, automatic dispatch, Handler continuation, or Pi-core changes are removed from this tuple.

## Recovery evidence and limits

The four authority files were rewritten because pre-failure bytes cannot be compared. This does not establish that the failed Handler was clean. The user acceptance is preserved and narrowed as stated above; no receipt or digest is created or recorded here. The accepted tuple authorizes only the bounded prompt-guidance source implementation. This synchronization provides no new source-grounded or runtime evidence; downstream verification remains pending. How the Result becomes visible and what later step the Router chooses remain unverified.

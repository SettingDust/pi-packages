# Google HTTP-response coverage determination: Pi 0.87.1

The bounded source investigation is complete. The inspected Google adapter/SDK path exposes no provider-scoped raw HTTP-response hook to the existing one-file main-chunk patch. No Google probe was implemented. The smallest concrete proposed adjustment is permission to patch one additional shared SDK chunk, alongside the existing main chunk. This is a proposal, not an authority change or an activation approval.

[Exact evidence](google-http-0.87.1.json) records the canonical installation root, SHA-256 for all four loaded files, 16 unique source excerpts with symbols and zero-based UTF-16 offsets plus one-based line/column locations, and verification actually performed. Source excerpts are static program text, not captured requests or responses.

## Proven transport path

1. `chunk-OJP47DM6.js` lazy-imports `google-generative-ai-IMS5EK2Y.js` or `google-vertex-O4YJEQUW.js`.
2. Both adapters import `GoogleGenAI` from `chunk-FUXEF6JQ.js`. Each creates a local client, invokes the existing `onPayload` callback with params/model, then calls `retryGoogleRequest(() => client.models.generateContentStream(params), options)`.
3. `GoogleGenAI` constructs an internal `ApiClient` and passes it to `Models`. `Models.generateContentStreamInternal` passes HTTP options and abort signal to `ApiClient.requestStream` for both Vertex and Gemini.
4. `requestStream` builds the request and calls `streamApiCall` with retry options, timeout and abort signal. `streamApiCall` invokes `apiCall`, checks the response status, and processes the response stream.
5. `apiCall` owns `runFetch`, whose existing `await fetch(...)` is the raw response settlement boundary. Status/retry processing follows this boundary. The main request wrapper receives the adapter's model event stream, not this raw response.

## Why the existing seams do not suffice

- Both full adapter sources contain zero `onResponse` references. Passing the existing correlation wrapper through options therefore records no Google HTTP response.
- Both adapters explicitly reject a custom fetch when it differs from `globalThis.fetch`. Bypassing that check or replacing global fetch is outside the accepted constraints.
- `onPayload` receives params/model, not the local client or transport. Although params can carry `config.httpOptions`, the inspected SDK path consumes configuration and never forwards a response callback or custom fetch to `apiCall`. Payload getters/proxies would alter the input object contract rather than use an exposed response hook.
- `ApiClient` is not exported by the shared chunk. Constructing an extra SDK client to reach and mutate shared prototypes is excluded by the Handoff.
- The main chunk's `configureHttpDispatcher` configures a process-global dispatcher and conditionally installs global fetch. A transport notification under ambient request context alone does not prove it is the model HTTP request: credential acquisition and user callbacks can share that context. No exact provider-only association was established without broader transport interception or request inspection. No dispatcher probe was implemented or tested.
- Adapter stream start/first decoded chunk occurs after HTTP status handling and is not evidence of raw HTTP response timing, failed attempts, or exact status. It must not be relabeled as HTTP coverage.

This is a determination about the inspected path and permitted hooks, not a proof that every conceivable one-file instrumentation technique is impossible. Under the Handoff's requirement for a proven narrow hook, these sources do not justify implementing one.

## Minimal proposed adjustment

Authorize two installed files instead of one: retain the existing main patch and additionally patch `chunk-FUXEF6JQ.js`, shared by both Google adapters. Neither adapter file needs editing for this approach.

The additional insertion point is immediately after the existing awaited fetch assignment in `ApiClient.apiCall/runFetch`, before status checking, retry handling or body consumption. Emit only numeric status through a private diagnostic bridge to the existing main logger. A dedicated diagnostics channel is one possible bridge; its subscriber must catch all its own failures, since throwing channel subscribers are not safely isolated merely by catching around publication. The main subscriber must accept only an active Google request scope and reuse its operation/session/turn/request attribution. No URL, headers, request object, Response object, body, credentials or exception content may cross the bridge. This is an unimplemented design proposal whose semantics still require verification.

Preserve the existing fetch invocation, signal construction/disposal, response/error identities, retry behavior and callbacks; add no await. Each settled HTTP attempt has a status. Fetch rejection or abort before a response has no HTTP status and must not fabricate `provider.response`. The SDK placement distinguishes this model transport from Google auth-library traffic without reading request data.

Before any activation, extend exact version/hash/selector guards, staging manifest, backups and rollback ownership to both files, including recovery from a partially replaced pair. The current one-file installer cannot be assumed to provide that guarantee. Do not relax the existing guard or modify the accepted Plan silently.

Required future probe verification includes fake success, non-OK/retry, rejection, abort, concurrent Google/non-Google context isolation, callbacks and object/error identity, baseline/patched async ordering, logger failure and sentinel privacy. None of those tests was run for a new Google probe in this unit.

## Verification and remaining state

The source check accepted the exact installed 0.87.1 main version/hash/entry mapping, verified all 16 cited excerpts uniquely, checked both complete adapters for absent `onResponse`, recorded the four source hashes, compared unchanged `stage.mjs` and `logger.mjs` hashes to the existing correlation evidence, and rechecked the installed main hash. The correlation evidence itself is preserved and its hash is recorded; its tests were not rerun.

No installed files, runtime instrumentation, callbacks, correlation implementation, version/hash guards, authoritative Plan/Spec/ADR, processes or sessions were changed. No provider request, CLI smoke, benchmark, full suite, installation or rollback was executed. The source question is resolved; HTTP coverage is still unimplemented pending the proposed boundary adjustment. T1 remains incomplete, T2 is not started, and `activationAllowed` remains false. Other T1 runtime, performance, retention, fresh CLI smoke and installer gates remain outstanding.

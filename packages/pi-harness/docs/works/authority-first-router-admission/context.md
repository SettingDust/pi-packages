# Authority-First Router Admission Work Context

- Status: draft coordination evidence; unaccepted; not authority; not a runtime receipt

## User direction and settled boundary

The settled direction is the simpler model: the Router completes Plan/Tasks, discloses the exact decision context in an ordinary message, obtains one user confirmation, and invokes delegation once. Harness does not prove, persist, replay-protect, or enforce confirmation history. A Handoff remains a work request, never acceptance evidence.

The cancelled predecessor draft addressed only removal of a decision field. Its partial edits were inspected and are superseded. They are not evidence for retaining activation-only APIs, EventBus transport, or receipt state.

## Current implementation evidence

The inspected implementation shows the old state machine:

- `extensions/pi-harness.ts` constructs and binds `PlanAuthorizationRegistry`, listens on `planActivationChannel`, creates activation context, validates activation, inserts receipts, resets state on session shutdown, and blocks planned resolution when receipt/event-bus state is absent.
- `src/admission.ts` owns `PlanAuthorizationSubject`, `PlanAuthorizationReceipt`, receipt lookup/insertion/integrity, consumed decision IDs, session binding, generation invalidation, and the serialized registry lock.
- `src/admission-decision.ts` owns the activation channel, decision context, user decision/outcome, activation validation, replay consumption, and disclosure text. It is expected to be deleted unless fresh tracing proves a narrowly retained non-authorization helper is needed.
- `src/protocol.ts` exposes planned admission through an `admitPlanned` callback and includes receipt/acceptance-related block codes. It must be adjusted if the callback and codes are no longer needed.
- `tests/admission-decision.test.ts` and `tests/admission.test.ts` are primarily state-machine and receipt tests and require replacement or deletion of obsolete coverage.
- `tests/protocol.test.ts` covers ordinary protocol, tuple, canonical identity, and Handler Result behavior; it must be retained and adjusted only where planned resolution semantics or block-code types change.

## Preserved validation

Retain exact Handoff schema; Skill/Role/model/thinking validation; readable reference precedence; selected same-directory Work/Plan/Tasks tuple binding; canonical paths and document bytes; canonical JSON and normalized Handoff identity; rejection of model-supplied receipt/digest/session/acceptance-shaped fields; current-call authority/Plan identity recomputation; and precise fail-closed authority-drift errors. No preserved digest is a user-acceptance proof.

## Removed state and behavior

Remove all activation channels, activation request/context/outcome/decision/disclosure transport, registry/receipt types and APIs, replay IDs, activation/decision timestamps, session-generation authorization state, registry integrity checks, receipt issuance/reuse/reset, and receipt-driven `acceptance_required`/`receipt_corrupt` behavior. Do not replace them with flags, markers, audit events, tokens, persistence, or Host seams.

## Consumer and compatibility map

The direct in-repository consumers evidenced by the inspected package are the Extension imports and EventBus listener in `extensions/pi-harness.ts`, the admission exports used by that Extension and focused tests, the protocol callback and block-code surface, and the two focused test files. No README or package export evidence was found for an external activation consumer. The implementation must perform a repository-wide dead API/reference search before deletion. If an external or uninspected consumer is found, stop and amend authority; do not add a silent shim.

## Risks

The main risks are accidentally retaining a hidden receipt gate, weakening current-call drift checks while deleting authorization hashes, or changing unrelated protocol behavior. Verification must prove both absence of the old state machine and preservation of ordinary admission invariants.

No source/test edit, runtime activation, receipt issuance, reload, settings/session/Herdr mutation, staging, or commit occurred in this documentation task.

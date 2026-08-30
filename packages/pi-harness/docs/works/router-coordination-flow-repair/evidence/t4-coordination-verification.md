# T4 Router Coordination Verification Evidence

Synthetic, package-level prompt-contract verification for the #41 Router candidate. The case table records required wording and bounded source/test observations only; it does not claim live task-runtime behavior, subagent launch, user acceptance, or implementation authorization.

```json
{
  "case_table": [
    {
      "case": "complete-set-and-pre-action-order",
      "dependency_or_restart_state": "no dependency release before terminal projection",
      "inputs": "multi-step Router prompt generation",
      "observable_correlation_or_equivalence": "one Todo per independently observable outcome; identity uses only visible environment signals",
      "shared_state_or_git_observation": "shared Router coordination state serialized; Git/index excluded from parallel scheduling",
      "side_effects": "prompt/test source only",
      "todo_transitions_and_signal": "asserted order: complete Todo set before first action; current item in_progress before resolve_delegation/spawn; terminal projection before dependency release/new scheduling"
    },
    {
      "case": "planned-confirmation-lifecycle",
      "dependency_or_restart_state": "one current-user confirmation before first planned resolve; unchanged plan continues without repeated confirmation; substantive deviation rediscloses and renews confirmation",
      "inputs": "planned multi-step Router prompt generation",
      "observable_correlation_or_equivalence": "exact selected Work/Plan/Tasks tuple",
      "shared_state_or_git_observation": "prompt/test source only",
      "side_effects": "no runtime launch",
      "todo_transitions_and_signal": "per-resolve confirmation explicitly prohibited"
    },
    {
      "case": "terminal-status-matrix",
      "dependency_or_restart_state": "terminal projection precedes dependency release and newly-unblocked scheduling",
      "inputs": "completed, partial, failed, blocked",
      "observable_correlation_or_equivalence": "atomic Result retained and correlated only through available identity/visible fields",
      "shared_state_or_git_observation": "serialized projection",
      "side_effects": "no Result or artifact mutation",
      "todo_transitions_and_signal": "native matching state or closest truthful status plus description/subject/message; non-complete never completed"
    },
    {
      "case": "equivalent-duplicate-resend",
      "dependency_or_restart_state": "no repeated release or schedule; replay only when safe",
      "inputs": "identifiable equivalent Result notification",
      "observable_correlation_or_equivalence": "available identity and visible Result establish equivalence",
      "shared_state_or_git_observation": "first observable outcome retained",
      "side_effects": "none",
      "todo_transitions_and_signal": "no second terminal update"
    },
    {
      "case": "malformed-structurally-different-conflict",
      "dependency_or_restart_state": "dependencies unchanged; no release or schedule",
      "inputs": "malformed, structurally different, or conflicting Result",
      "observable_correlation_or_equivalence": "equivalence not established or observable identity conflicts",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "first outcome/status unchanged; conflict reported through existing description, subject, or Router message"
    },
    {
      "case": "restart-replay-uncertain",
      "dependency_or_restart_state": "no reapply, release, or schedule",
      "inputs": "identity/equivalence/replay safety unavailable",
      "observable_correlation_or_equivalence": "unknown",
      "shared_state_or_git_observation": "no persistence/outbox introduced",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo and report limitation"
    },
    {
      "case": "ordinary-stale-positive",
      "dependency_or_restart_state": "no active or unresolved dependent",
      "inputs": "terminal, Result applied, inactive, non-current, no unresolved dependent, all fields known and non-contradictory",
      "observable_correlation_or_equivalence": "matching applied terminal Result observable",
      "shared_state_or_git_observation": "cleanup touches Todo projection only",
      "side_effects": "never subagent_remove or artifact/session/manifest/Result mutation",
      "todo_transitions_and_signal": "cleanup permitted"
    },
    {
      "case": "orphan-stale-positive",
      "dependency_or_restart_state": "no active/current/dependent state",
      "inputs": "all ordinary terms plus observable matching identity and non-canonical identity",
      "observable_correlation_or_equivalence": "matching identity established and orphan is non-canonical",
      "shared_state_or_git_observation": "canonical record retained",
      "side_effects": "Todo projection only",
      "todo_transitions_and_signal": "cleanup permitted"
    },
    {
      "case": "stale-negative-non-terminal",
      "dependency_or_restart_state": "unchanged",
      "inputs": "non-terminal",
      "observable_correlation_or_equivalence": "complete safe stale predicate not established",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo; no cleanup"
    },
    {
      "case": "stale-negative-Result-absent-or-not-applied",
      "dependency_or_restart_state": "unchanged",
      "inputs": "Result absent or not applied",
      "observable_correlation_or_equivalence": "complete safe stale predicate not established",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo; no cleanup"
    },
    {
      "case": "stale-negative-active",
      "dependency_or_restart_state": "unchanged",
      "inputs": "active",
      "observable_correlation_or_equivalence": "complete safe stale predicate not established",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo; no cleanup"
    },
    {
      "case": "stale-negative-current",
      "dependency_or_restart_state": "unchanged",
      "inputs": "current",
      "observable_correlation_or_equivalence": "complete safe stale predicate not established",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo; no cleanup"
    },
    {
      "case": "stale-negative-unresolved-dependent",
      "dependency_or_restart_state": "unchanged",
      "inputs": "unresolved dependent",
      "observable_correlation_or_equivalence": "complete safe stale predicate not established",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo; no cleanup"
    },
    {
      "case": "stale-negative-missing-field",
      "dependency_or_restart_state": "unchanged",
      "inputs": "missing field",
      "observable_correlation_or_equivalence": "complete safe stale predicate not established",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo; no cleanup"
    },
    {
      "case": "stale-negative-unknown-field",
      "dependency_or_restart_state": "unchanged",
      "inputs": "unknown field",
      "observable_correlation_or_equivalence": "complete safe stale predicate not established",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo; no cleanup"
    },
    {
      "case": "stale-negative-contradictory-field",
      "dependency_or_restart_state": "unchanged",
      "inputs": "contradictory field",
      "observable_correlation_or_equivalence": "complete safe stale predicate not established",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo; no cleanup"
    },
    {
      "case": "stale-negative-missing-orphan-identity",
      "dependency_or_restart_state": "unchanged",
      "inputs": "missing orphan identity",
      "observable_correlation_or_equivalence": "complete safe stale predicate not established",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo; no cleanup"
    },
    {
      "case": "stale-negative-mismatched-orphan-identity",
      "dependency_or_restart_state": "unchanged",
      "inputs": "mismatched orphan identity",
      "observable_correlation_or_equivalence": "complete safe stale predicate not established",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo; no cleanup"
    },
    {
      "case": "stale-negative-canonical-orphan-identity",
      "dependency_or_restart_state": "unchanged",
      "inputs": "canonical orphan identity",
      "observable_correlation_or_equivalence": "complete safe stale predicate not established",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo; no cleanup"
    },
    {
      "case": "stale-negative-age-only",
      "dependency_or_restart_state": "unchanged",
      "inputs": "age only",
      "observable_correlation_or_equivalence": "complete safe stale predicate not established",
      "shared_state_or_git_observation": "fails closed",
      "side_effects": "none",
      "todo_transitions_and_signal": "retain Todo; no cleanup"
    },
    {
      "case": "scheduling-capability",
      "dependency_or_restart_state": "dependencies/shared files/ownership/authority/behavior always serialize",
      "inputs": "P ambiguous historical T1 evidence",
      "observable_correlation_or_equivalence": "no positive current Host parallel-launch proof",
      "shared_state_or_git_observation": "no Git/index mutation; exact candidate scope verified",
      "side_effects": "no runtime launch",
      "todo_transitions_and_signal": "serial fallback"
    },
    {
      "case": "preserved-boundaries",
      "dependency_or_restart_state": "Router retains next-workflow decision",
      "inputs": "focused extension prompt-contract test and typecheck",
      "observable_correlation_or_equivalence": "existing legality, identity, invocation, Result parsing and notification boundaries unchanged",
      "shared_state_or_git_observation": "focused test: 71 assertions; typecheck passed; no Git/index mutation",
      "side_effects": "backend, Resolver, Handler, subagent_remove, artifacts untouched",
      "todo_transitions_and_signal": "Handler remains one-outcome/no-coordination"
    }
  ],
  "command_or_invocation": "bun test tests/extension.test.ts; bun run typecheck; git diff --check and bounded source/test scope check; direct SHA-256 hashing.",
  "environment_identity": {
    "cwd": "E:/Projects/pi-packages/packages/pi-harness",
    "os": "Microsoft Windows 11",
    "runtime_versions": {
      "bun": "1.3.14",
      "node": "v24.15.0",
      "pi_harness_package": "0.1.0",
      "typescript": "5.9.3"
    },
    "shell": "PowerShell 7.5.2",
    "source_revision_identity": "HEAD dfb6f4b33c9fc8848a625b083fec1b5f25a12b26 plus the exact candidate and authority SHA-256 identities recorded in output"
  },
  "observation_boundary": "Synthetic prompt-contract verification and package typecheck only. No subagent tool or task runtime was invoked; no settings, sessions, Herdr lifecycle, backend, Pi core, Git index/history, Result, manifest, or produced artifact was mutated.",
  "observed_at_utc": "2026-08-30T13:01:26.8875149Z",
  "observed_surfaces": [
    "packages/pi-harness/extensions/pi-harness.ts",
    "packages/pi-harness/tests/extension.test.ts",
    "packages/pi-harness/docs/works/router-coordination-flow-repair/work.md",
    "packages/pi-harness/docs/works/router-coordination-flow-repair/plan.md",
    "packages/pi-harness/docs/works/router-coordination-flow-repair/tasks.md",
    "packages/pi-harness/docs/works/router-coordination-flow-repair/evidence/t1-host-task-capability.md"
  ],
  "output": "focused_extension_test=pass; assertions=71; typecheck=pass; diff_check=pass; scope_check=pass; candidate_sha256 extensions/pi-harness.ts=4d2ea376f042477f38b299fe849b47d2145a393bc4daef686c27f3de6c1a1c5a; candidate_sha256 tests/extension.test.ts=768e271e67452a0d90f8cfc008e8281560e09725cd358bd63fe290195875cba1; candidate_changed_paths=packages/pi-harness/extensions/pi-harness.ts,packages/pi-harness/tests/extension.test.ts; git_index_mutation=none; head=dfb6f4b33c9fc8848a625b083fec1b5f25a12b26",
  "output_sha256": "69365ecaec05301d590dad1e1a33e33b55b08a9b79e4a6105d972431d0f4a4ef",
  "owner": "Router implementation/verification owner",
  "provenance": {
    "authority": "The current Handoff supplies the accepted in-boundary T5b repair context; the referenced Work/Plan/Tasks files remain unchanged by T5b.",
    "capture": "Verbatim bounded output from the stated focused checks and source inspection; no live task runtime or subagent backend was invoked.",
    "negative_evidence": [
      "No dependency metadata drift",
      "No Git index mutation",
      "No extra candidate source/test path"
    ]
  },
  "record_id": "#41-t4-coordination-verification-2026-08-30T13:01:26.8875149Z",
  "record_schema_version": "t4-coordination-verification/v1",
  "record_sha256": "79f7def868d396f85f55156838825e796e8f9fac5c4d0e9b50e5b54b3e810064",
  "result": {
    "authority_identity_match": "not evaluated; this prompt-contract record does not establish acceptance",
    "candidate_scope_match": "observed candidate paths match the bounded Router surfaces",
    "capability_branch": "P ambiguous; serial fallback",
    "coordination_projection": "environment-adaptive semantic projection through available writable/visible mechanism",
    "focused_test": "1 pass, 0 fail, 71 assertions",
    "limitations": [
      "Prompt-contract tests assert wording order but do not invoke a live task runtime or subagent backend.",
      "Independent T5a/T5c review is not part of this implementation-owner record."
    ],
    "status": "passed",
    "typecheck": "passed"
  },
  "task": "T4 focused Router coordination and preservation verification"
}
```

# T1 Host and Main-Session Task Capability Evidence

Read-only evidence for Plan #41 T1.

```json
{
  "command_or_invocation": "PowerShell read-only probe: package/version metadata; Get-FileHash -Algorithm SHA256 over the exact Work/Plan/Tasks paths; source inspection of current Harness, pi-herdr-subagents, Pi 0.84.4 host declarations, and configured @tintinweb/pi-tasks 0.9.0.",
  "environment_identity": {
    "cwd": "E:/Projects/pi-packages",
    "os": "Microsoft Windows 11 (PowerShell host)",
    "runtime_versions": {
      "bun": "1.3.14",
      "node": "v24.15.0",
      "pi_coding_agent": "0.84.4",
      "pi_harness_package": "0.1.0",
      "pi_tasks": "0.9.0"
    },
    "shell": "PowerShell 7.5.2",
    "source_revision_identity": "Current working tree observation; Git object IDs were not used. The authority tuple is identified only by direct raw-file SHA-256 below."
  },
  "observation_boundary": "Read-only source, declaration, configuration, version, and direct-file-hash inspection. No current-turn provider inventory was fabricated; no subagent tool, TaskCreate, or TaskUpdate operation was invoked.",
  "observed_at_utc": "2026-08-30T09:21:09.0226331Z",
  "observed_surfaces": [
    "packages/pi-harness/docs/works/router-coordination-flow-repair/work.md",
    "packages/pi-harness/docs/works/router-coordination-flow-repair/plan.md",
    "packages/pi-harness/docs/works/router-coordination-flow-repair/tasks.md",
    "packages/pi-harness/extensions/pi-harness.ts",
    "packages/pi-herdr-subagents/src/index.ts",
    "packages/pi-herdr-subagents/tests/runtime.test.ts",
    "D:/Applications/Scoop/apps/pi-coding-agent-bun/0.84.4/node_modules/@earendil-works/pi-coding-agent/dist/index.d.ts",
    "D:/Applications/Scoop/apps/pi-coding-agent-bun/0.84.4/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts",
    "C:/Users/WINDOWS/.pi/agent/settings.json",
    "C:/Users/WINDOWS/.pi/agent/npm/node_modules/@tintinweb/pi-tasks/src/index.ts",
    "C:/Users/WINDOWS/.pi/agent/npm/node_modules/@tintinweb/pi-tasks/src/types.ts",
    "C:/Users/WINDOWS/.pi/agent/npm/node_modules/@tintinweb/pi-tasks/src/task-store.ts",
    "C:/Users/WINDOWS/.pi/agent/npm/node_modules/@tintinweb/pi-tasks/src/auto-clear.ts"
  ],
  "output": "T1 read-only host/task capability probe\nobserved_at_utc=2026-08-30T09:21:09.0226331Z\ncwd=E:\\Projects\\pi-packages\npi_version=0.84.4\ntask_extension_version=0.9.0\nwork.md=d7088e7afc7b8e6be71f7cba6947db257fe7aba44ed0bda63d591eda12e330e8\nplan.md=5c3e9578091daa9dcc5ad22d276406b057affae386ded1a57f0de9c841341e52\ntasks.md=4b2e2ec80c8f367afd2e60a1d1d6b3fc23899274abca0d4d51120fbd45d9f6dc\nP=ambiguous; consequence=serial_fallback\nP evidence: backend exposes one subagent_spawn tool and requires end-of-turn after spawning; no current-turn proof of multiple independent resolve-to-spawn chains in one scheduling wave was available.\nC=contradictory; consequence=block_T2_T4\nC evidence: TaskCreate creates pending only; TaskUpdate status enum is pending|in_progress|completed|deleted; no partial|failed|blocked terminal states; auto-clear is turn/age-based and completed-list based, not the required complete stale predicate; no correlation/idempotence or Result-aware cleanup contract.\nside_effects=none: no subagent tools invoked; no task records, project files, settings, packages, sessions, runtime, Herdr, Git index/history, or Pi core mutated.\n",
  "output_sha256": "a3a6960398b063418eedaa62d66b4f506847c246f8daa5f8a49f731264c285c7",
  "owner": "Router implementation/verification owner",
  "provenance": {
    "negative_evidence": [
      {
        "finding": "No current-turn API or source-backed proof was found that multiple independent resolve-to-spawn chains can start in one scheduling wave. This is treated as ambiguous under Plan #41, not proof of impossibility.",
        "query_or_selection_method": "Read declarations and all relevant registration/schema/execute paths; no subagent or task tool invocation",
        "result": "inconclusive",
        "searched_scope": "Current installed Pi 0.84.4 declarations, Harness extension, pi-herdr-subagents registration/tests, and configured task extension source"
      },
      {
        "finding": "Available task operations conflict with required #41 terminal-state, correlation/idempotence, and stale-only cleanup semantics.",
        "query_or_selection_method": "Read status types, parameter schemas, execute handlers, dependency mutation, and auto-clear paths",
        "result": "conflicting",
        "searched_scope": "Configured @tintinweb/pi-tasks TaskCreate/TaskUpdate types, schemas, store, and cleanup implementation"
      }
    ],
    "sources": [
      {
        "accessed": "2026-08-30",
        "claim": "P and C are independent; ambiguous P selects serial fallback; unavailable, unknown, or contradictory C blocks T2-T4.",
        "locator": "packages/pi-harness/docs/works/router-coordination-flow-repair/plan.md:56-58",
        "scope": "T1 strategy and decision rules",
        "support": "Direct inspected authority text.",
        "title": "Accepted Plan #41 T1 strategy"
      },
      {
        "accessed": "2026-08-30",
        "claim": "Resolver registration is conditional on visible Skills and usable Roles; Router prompt directs one resolved invocation to subagent_spawn and ends the Router turn.",
        "locator": "packages/pi-harness/extensions/pi-harness.ts:35-64,145-160",
        "scope": "registration, active-tool mutation, model-visible Router instructions",
        "support": "Direct inspected source.",
        "title": "Current Harness Router extension"
      },
      {
        "accessed": "2026-08-30",
        "claim": "The backend exposes subagent lifecycle tools, validates spawn inputs, persists a queued task, creates one tab, transitions it to running, launches the child, and its tool contract instructs ending the Router turn after spawning.",
        "locator": "packages/pi-herdr-subagents/src/index.ts:467-485,624-695; packages/pi-herdr-subagents/tests/runtime.test.ts:124-156",
        "scope": "registration, dispatch, execution, task persistence, terminal notification boundary",
        "support": "Direct inspected source and focused test.",
        "title": "Current pi-herdr-subagents runtime and tests"
      },
      {
        "accessed": "2026-08-30",
        "claim": "TaskCreate creates pending tasks; TaskUpdate exposes only pending/in_progress/completed/deleted and updates dependencies.",
        "locator": "C:/Users/WINDOWS/.pi/agent/npm/node_modules/@tintinweb/pi-tasks/src/index.ts:621-693,832-959",
        "scope": "main-session task registration, schemas, execution",
        "support": "Direct inspected installed source.",
        "title": "Configured pi-tasks TaskCreate and TaskUpdate implementation"
      },
      {
        "accessed": "2026-08-30",
        "claim": "Native task status and update fields do not contain partial/failed/blocked or Result correlation semantics.",
        "locator": "C:/Users/WINDOWS/.pi/agent/npm/node_modules/@tintinweb/pi-tasks/src/types.ts:5-24; src/task-store.ts:211-318",
        "scope": "status enum, mutation and dependency model",
        "support": "Direct inspected installed source.",
        "title": "Configured pi-tasks status and store types"
      },
      {
        "accessed": "2026-08-30",
        "claim": "Cleanup is driven by turn delay and completed-list/task state, not the required complete stale predicate.",
        "locator": "C:/Users/WINDOWS/.pi/agent/npm/node_modules/@tintinweb/pi-tasks/src/auto-clear.ts:104-133",
        "scope": "cleanup behavior",
        "support": "Direct inspected installed source.",
        "title": "Configured pi-tasks auto-clear implementation"
      },
      {
        "accessed": "2026-08-30",
        "claim": "The extension context exposes session/tool/runtime context but no native TaskCreate/TaskUpdate methods; task operations therefore come from registered extension tools.",
        "locator": "D:/Applications/Scoop/apps/pi-coding-agent-bun/0.84.4/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts:208-249",
        "scope": "host extension API surface",
        "support": "Direct inspected declaration.",
        "title": "Pi 0.84.4 ExtensionContext declaration"
      }
    ]
  },
  "record_id": "#41-t1-host-task-capability-2026-08-30T09:21:09.0226331Z",
  "record_schema_version": "t1-host-task-capability/v1",
  "record_sha256": "db788453eac786a5d095f86111d90d170d288b6fe49f309be4f0e1d472831d27",
  "result": {
    "C": {
      "consequence": "block_T2_T4",
      "contradictions": [
        "partial, failed, and blocked are required terminal projections but absent from the native status enum",
        "age/all-completed cleanup is broader and different from the required stale-only predicate",
        "TaskCreate/TaskUpdate source contains no Result correlation, duplicate handling, or fail-closed conflict behavior"
      ],
      "decision": "contradictory",
      "observed_semantics": [
        "TaskCreate creates status pending",
        "TaskUpdate accepts pending, in_progress, completed, or deleted only",
        "TaskUpdate mutates requested fields and bidirectional dependency edges",
        "TaskStore has no Handler Result correlation or idempotence contract",
        "auto-clear deletes by turn age or all-completed batch state",
        "no complete canonical-Result-applied/inactive/non-current/no-dependent stale predicate"
      ],
      "required_semantics": [
        "immediate complete TaskCreate for every independently observable outcome",
        "pre-action in_progress TaskUpdate",
        "truthful completed/partial/failed/blocked terminal handling",
        "correlation and idempotence",
        "dependency release only after terminal update",
        "stale-only cleanup without subagent or artifact mutation"
      ]
    },
    "P": {
      "consequence": "serial_fallback",
      "decision": "ambiguous",
      "evidence": "The current Harness prompt maps one resolved invocation to the environment delegate as its next action; the current pi-herdr-subagents contract and tests say to spawn and end the Router turn. The installed task extension mentions independent tool calls running in parallel, but no current provider-turn evidence proves multiple independent resolve-to-spawn chains can start in one scheduling wave."
    },
    "T2_GO_NO_GO": "NO-GO: C is contradictory; T2-T4 are blocked for authority review. P independently selects serial fallback and does not convert C failure into fallback.",
    "authority_identity": {
      "identity_match": true,
      "method": "PowerShell Get-FileHash -Algorithm SHA256 over each current file's raw bytes; Git object IDs excluded.",
      "plan_sha256": "5c3e9578091daa9dcc5ad22d276406b057affae386ded1a57f0de9c841341e52",
      "tasks_sha256": "4b2e2ec80c8f367afd2e60a1d1d6b3fc23899274abca0d4d51120fbd45d9f6dc",
      "work_sha256": "d7088e7afc7b8e6be71f7cba6947db257fe7aba44ed0bda63d591eda12e330e8"
    }
  },
  "task": "T1 read-only Host and main-session task-tool capability evidence"
}
```

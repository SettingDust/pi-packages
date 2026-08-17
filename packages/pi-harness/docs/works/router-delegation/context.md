# Router Delegation Context

## Accepted Decisions

- `pi-harness` is a self-contained publishable package under `packages/pi-harness`.
- Enabling the extension replaces Pi's default standard main-session prompt. A Pi session with any explicit `customPrompt`, including the bundled Handler Agent, remains unchanged and receives no Router resolver activation.
- The Router coordinates but does not do project-domain reading, research, editing, execution, or independent verification.
- The Router keeps normal Pi tools for coordination materials; v0.1 uses a prompt boundary rather than tool-permission enforcement.
- A delegation has one primary Skill, zero or more unique companion Skills that do not repeat the primary, a structured context list, optional `constraints: string[]` / `deliverables: string[]`, and one selected Model Role.
- `resolve_delegation` performs validation and prompt normalization only. It returns either `status: resolved` invocation metadata or a coded `status: blocked` result; it never starts a Handler or detects a delegate backend.
- Its Tool schema is generated from current Pi Skills and only currently usable Model Roles. No separate role discovery tool exists; zero usable Roles means the resolver tool is omitted until `/harness config` fixes configuration.
- Handoffs and Handler Results use YAML. Context references are checked but not inlined by the Resolver. Results use `completed`, `partial`, `blocked`, or `failed`; artifact references are validated only when reused as later Handoff context.
- Model Roles live under Pi Settings' top-level `harness` key. Global configuration is the baseline; a trusted project's `harness` object shallowly overlays it. `basic`, `standard`, and `advanced` are only first-configuration templates; every Role can be added, renamed, edited, or deleted and maps to one description, model, and thinking setting without fallback. Malformed configuration is preserved and reported.
- `/harness config` owns the Role TUI. It supports Global and trusted-Project scopes, inherited Global Roles, full Project override materialization on first edit, and reset-to-inheritance.
- Every Pi model-visible Skill enters the dynamic primary/companion enums. These are per-Handoff relationships; Skills may conditionally load other Skills, and no static controller/leaf classification or filter exists.
- The package owns a complete 29-Skill initial method library. Clarification may be delegated to gather context and formulate questions, but only Router asks the user.
- `agents/handler.md` is a bundled, backend-neutral Handler definition. Router directly adapts its name/path, YAML prompt, model, and thinking to a compatible environment delegate tool; the package owns no wrapper or backend registry.
- `pi-herdr-subagents` is the first concrete compatible backend: Router maps a resolved invocation to `subagent_spawn`, receives a stable `subagentId`, and collects the corresponding generation through `subagent_join`. Resume preserves `subagentId`; the backend owns Herdr pane/session lifecycle and result-pointer validation without importing Harness semantics.
- Compatible backends must guarantee exact model/thinking, Handler instructions, Skill/reference access, stable task identity, and synchronous or asynchronous Result return. Missing capabilities block delegation.
- Router may launch multiple Handlers concurrently when it judges them independent. The environment assigns `taskId`s and injects each completed Result with an active-task summary; Router decides separately after every notification whether to continue or wait for more.
- No batch join, wait tool, conflict detection, worktree, or locking is required. Concurrent independence is Router judgment.
- The pure protocol prototype is implemented in `src/protocol.ts`; its deterministic checks cover dynamic schema refresh, strict Handoff/Role/reference validation, YAML without reference inlining, and four-state Result parsing.
- The Extension core is implemented in `extensions/pi-harness.ts`: it reads global and trusted-project `harness` settings, uses Pi's authenticated model snapshot and loaded model-visible Skills, replaces the Router prompt for standard main sessions, refreshes the resolver Tool each pass, and removes it from active tools for custom Agent prompts or blocked configuration.
- The `/harness config` TUI and locked settings persistence are implemented in `src/config-command.ts` and `src/settings-store.ts`.
- The initial 29-Skill library is implemented under `skills/`, exposed through package metadata, and validated through Pi's own Skill loader with no diagnostics.

## Open Work

- Complete real delegation-backend integration for the Router-to-Handler loop with `pi-herdr-subagents`.

## Explicit v0.1 Omissions

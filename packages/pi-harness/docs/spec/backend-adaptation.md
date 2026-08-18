# Backend Adaptation Specification

## 1. Inputs

After `resolve_delegation` succeeds, the Router receives:

```yaml
status: resolved
prompt: yaml-handoff
model: provider/model
thinking: configured-thinking-level
```

The Router maps these values to an environment-provided delegate tool. The Resolver does not discover, select, or call that tool.

The Handler is fixed as the Agent named `handler`. For a tool that accepts an Agent argument, the Router supplies that fixed literal; the compatible backend resolves it from its own registry. The Resolver returns no Handler name, path, or body.

## 2. Compatibility Requirements

Before calling a delegate tool, the Router must establish from its schema and description that it can:

1. start an independent execution using the Router-supplied fixed `handler` Agent;
2. guarantee the resolved `model` and `thinking` values;
3. resolve that Agent's instructions from its own registry;
4. provide the selected Pi Skills and read access to every Handoff reference;
5. return a stable `taskId`; and
6. return or later notify the Router of the Handler's YAML Result.

The package does not prescribe argument names. A backend is incompatible when any requirement cannot be established. The Router reports that block and must not omit or replace required values.

### 2.1 `pi-herdr-subagents` Mapping

When the independent `pi-herdr-subagents` tools are active, Router maps one resolved invocation to:

```yaml
subagent_spawn:
  agent: handler
  prompt: resolved.prompt
  label: concise delegated objective
  model: resolved.model
  thinking: resolved.thinking
```

`subagent_spawn` resolves its supplied `agent` from its local Agent registry; the Router always supplies `handler`. The tool returns a stable `subagentId`. Completion notifications identify `subagentId` and the finished generation without exposing the Result body. Router calls `subagent_join({ subagentId })` to collect and validate that generation's private result pointer. `subagent_resume` retains the same `subagentId`; inspect, steer, cancel, and remove remain backend lifecycle operations rather than Harness workflow decisions.

## 3. Launch Result

An asynchronous launch returns enough information for the Router to correlate later completion:

```yaml
status: running
taskId: backend-assigned-id
objective: delegated-objective
```

A synchronous backend may instead return the completed Result immediately:

```yaml
status: completed
taskId: backend-assigned-id
result: handler-yaml-result
```

The exact tool response may differ, but the Router must be able to recover the same information without guessing identity.

## 4. Completion Return

For asynchronous execution, the environment emits a completion notification containing the original stable task identity, objective or label, terminal status, generation, and a best-effort active-task summary. Result content may remain in a private backend result file until an explicit join. This notification follows the Handler Completion Notification contract in `router-delegation.md`.

The Router parses a well-formed YAML Result into the normalized Result envelope. Notification display, wake-up mechanics, process lifecycle, and persistence remain environment responsibilities.

## 5. Failure Behavior

- Missing backend capability or the fixed `handler` Agent blocks launch before work starts.
- A backend launch error is a backend failure, not a Resolver failure.
- An unavailable configured model or thinking level must not fall back silently.
- A malformed or missing Handler Result is not treated as successful work.
- The package does not retry, cancel, queue, isolate, or switch delegate backends automatically.

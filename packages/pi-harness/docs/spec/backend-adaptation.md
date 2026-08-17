# Backend Adaptation Specification

## 1. Inputs

After `resolve_delegation` succeeds, the Router receives:

```yaml
status: resolved
handler:
  name: handler
  path: absolute-path-to-installed-package/agents/handler.md
prompt: yaml-handoff
model: provider/model
thinking: configured-thinking-level
```

The Router maps these values to an environment-provided delegate tool. The Resolver does not discover, select, or call that tool.

## 2. Compatibility Requirements

Before calling a delegate tool, the Router must establish from its schema and description that it can:

1. start an independent Handler execution;
2. guarantee the resolved `model` and `thinking` values;
3. provide the Handler Agent instructions;
4. provide the selected Pi Skills and read access to every Handoff reference;
5. return a stable `taskId`; and
6. return or later notify the Router of the Handler's YAML Result.

A tool may satisfy Agent instruction delivery in either form:

- **Named Agent:** pass `handler.name` through the tool's Agent-selection capability.
- **Prompt only:** read `handler.path` as coordination material and compose its content with `prompt` using the tool's supported instruction/task fields.

The package does not prescribe argument names. A backend is incompatible when any requirement cannot be established. The Router reports that block and must not omit or replace required values.

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

For asynchronous execution, the environment emits a completion notification containing the original `taskId`, objective, raw or parsed Handler Result, and a best-effort active-task summary. This notification follows the Handler Completion Notification contract in `router-delegation.md`.

The Router parses a well-formed YAML Result into the normalized Result envelope. Notification display, wake-up mechanics, process lifecycle, and persistence remain environment responsibilities.

## 5. Failure Behavior

- Missing backend capability blocks launch before work starts.
- A backend launch error is a backend failure, not a Resolver failure.
- An unavailable configured model or thinking level must not fall back silently.
- A malformed or missing Handler Result is not treated as successful work.
- The package does not retry, cancel, queue, isolate, or switch delegate backends automatically.

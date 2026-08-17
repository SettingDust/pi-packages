---
name: research-trace
description: Trace behavior, data, ownership, history, or causality through connected sources. Use when the question is how execution reaches a point, where a value changes, who owns a decision, or when and why behavior changed.
---

# Research: Trace

Apply `research-source-grounded` to the trace and conclusions.

## Method

1. Define the start object, target object or observed outcome, trace dimension, and stopping boundary.
2. Follow explicit edges appropriate to the question: callers and callees, imports, assignments, events, state transitions, document references, commits, issues, or ownership records.
3. Record each hop with source, relation, and relevant condition. Do not skip unexplained gaps in the chain.
4. Separate temporal correlation from causation. For historical traces, distinguish the introducing change from later cleanup or documentation.
5. Test alternate paths and termination conditions that could produce the same outcome.
6. Stop at the named target, responsible boundary, root introduction, or a precisely identified missing edge.

## Output

Provide an ordered trace with:

- start, target, and scope;
- every material hop and condition;
- branch points or alternate paths;
- the supported causal or ownership conclusion;
- gaps, conflicts, and negative evidence.

Do not patch the traced system unless repair is explicitly part of the Handoff.

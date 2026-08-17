---
name: research-quick
description: Answer one narrow factual question with bounded primary-source research. Use when the target claim and stopping condition are clear and broad architectural synthesis is unnecessary.
---

# Research: Quick

Apply `research-source-grounded` whenever the answer depends on project or external evidence.

## Method

1. Restate the exact question, material terms, and a narrow stopping condition.
2. Inspect the most authoritative likely source first. Search one adjacent source only when needed to confirm interpretation or resolve a conflict.
3. Distinguish the direct answer from caveats, version limits, and unsupported inference.
4. Stop when the question is answered with sufficient primary evidence or when the bounded search establishes a precise evidence gap.

## Output

Return:

- direct answer first;
- essential supporting source objects;
- relevant negative evidence or uncertainty;
- the stopping condition reached.

Do not expand into a general survey, architecture review, implementation, or recommendation beyond the question.

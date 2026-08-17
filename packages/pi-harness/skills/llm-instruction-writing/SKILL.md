---
name: llm-instruction-writing
description: Create or revise instructions whose primary reader is an LLM, including Agents, Skills, prompt fragments, and Handoff or Result contracts. Use when model behavior must be clear, bounded, and testable.
---

# LLM Instruction Writing

## Method

1. Identify the model-consumed surface, intended outcome, available context, tools and Skills, hard constraints, autonomy boundary, and observable completion condition.
2. Do not invent product authority or runtime capability. Surface any missing fact that prevents a correct instruction.
3. State the job once in imperative, testable language. Put each material rule in one authoritative location.
4. Organize instructions around decisions and actions the model must take. Prefer short steps, explicit fields, and concrete examples only where they disambiguate behavior.
5. Resolve contradictions and precedence explicitly. Remove duplicate always/never rules, role-play, motivational prose, and vague quality adjectives.
6. Expose only the tools, Skills, files, and fields needed for the job, with precise purposes.
7. Define when the model may act, when it must stop or report a block, and what it must not infer.
8. Define observable output and verification. Preserve requirement-bearing identifiers, examples, safety lines, and contracts during revision.
9. Run the smallest representative validation: frontmatter discovery, schema parsing, contract tests, lint, or a dry run that would expose instruction failure.

## Completion Checks

The primary reader and ownership boundary are clear; obligations are non-duplicated and non-contradictory; autonomy and blocked conditions are explicit; output and success are observable; and representative validation has been performed or its exact gap reported.

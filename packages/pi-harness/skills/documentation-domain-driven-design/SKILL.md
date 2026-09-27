---
name: documentation-domain-driven-design
description: Document domain language, invariants, bounded contexts, ownership, and context relationships. Use when shared domain meaning or boundaries need durable clarification.
---

# Documentation: Domain-Driven Design

## Method

1. Gather domain language from authoritative documents, behavior, data, and domain-expert decisions. Do not invent terminology to make the model look complete.
2. Define each important term with one meaning inside its context, including aliases, overloaded terms, and rejected meanings. Keep `CONTEXT.md` a concise glossary of domain-specific terms, not a spec or implementation record.
3. Identify entities, value concepts, lifecycle states, domain events, policies, and invariants only where evidence supports them.
4. Group concepts into bounded contexts by language, rules, ownership, and change cadence rather than by code folders alone. Use [documentation-structure's DDD layout](../documentation-structure/SKILL.md#default-layout) when no explicit local convention applies: one root `CONTEXT.md` for a single context, or a root `CONTEXT-MAP.md` pointing to each context's `CONTEXT.md` for multiple contexts. Work `context.md` is derived delivery context, not a second domain model.
5. Describe context relationships, translations, upstream and downstream expectations, and shared-kernel obligations in the map when multiple contexts exist. The map links to each context; do not require reverse links or a map for a single context.
6. Separate domain facts from architectural decisions. Record accepted integration or ownership choices in ADRs and normative behavior in Specs.
7. Test the model against representative workflows and edge cases; record ambiguity and context collisions.
8. Update existing domain ownership instead of creating a second glossary with competing meanings.

## Output

Report changed domain terms, invariants, bounded contexts, relationship map, source evidence, and unresolved domain decisions.

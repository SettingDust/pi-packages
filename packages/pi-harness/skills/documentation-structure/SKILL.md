---
name: documentation-structure
description: Determine repository locations, naming, authority relationships, and bounded Work structure for documentation. Use before creating artifacts when placement or ownership conventions are unclear.
---

# Documentation Structure

## Method

1. Inspect repository documentation layout, indexes, naming, links, and authority conventions before proposing paths.
2. Classify each artifact as durable authority, derived work material, ordinary guidance, generated output, or temporary evidence.
3. Preserve explicit existing conventions when they provide clear ownership; use the default below only when no convention applies. Do not create a parallel hierarchy for aesthetic consistency.
4. Assign one owning location and stable name per artifact using the [default layout](#default-layout) when needed. Keep PRD, ADR, Spec, Proposal, DDD, Work Context, Plan, and Waves relationships explicit without duplicating their content.
5. Bound Work artifacts by one coherent delivery objective. Split only when lifecycles, authority, dependencies, or review boundaries materially differ.
6. Define links from derived artifacts to authority and from indexes only where navigation requires them.
7. Identify moves or renames that require reference updates and avoid churn without ownership benefit.
8. For `@settingdust/pi-harness` planned-admission material, one Work directory may hold multiple direct Plan/Waves pairs, but each admission selects one explicit Work+Plan+Waves tuple. New planned work uses `waves.md` as its sole executable graph; historical Tasks are compatibility records and require explicit migration. Preserve the owning Specification's grammar when it applies; do not create a manifest, status machine, or inferred-current-slice convention.
9. Skills, headings, links, and Markdown status are documentation guidance only. They do not establish machine-verifiable document kind, receipt provenance, or user acceptance.

## Default Layout

Place ADR, PRD, Spec, Proposal, and Work documents under the `docs/` of the owning repository or package, not automatically at the repository root. If that owner has no explicit convention, use these paths relative to its `docs/`:

```text
adr/<local-id-or-slug>.md
prd/<scope-slug>.md
spec/<boundary-slug>.md
proposals/<candidate-slug>.md
works/<objective>/{work,context,plan,waves}.md
```

Use lowercase kebab-case for new slugs and preserve any existing ADR numbering. Create only artifacts needed for the current work; do not create empty directories, mandatory placeholder documents, or a root `docs/` without genuine repository-level ownership.

For DDD, default to `CONTEXT.md` at the owning repository or package root for a single context. For multiple contexts, place `CONTEXT-MAP.md` at that root and each context's `CONTEXT.md` beside the domain it describes (for example, `src/ordering/CONTEXT.md`); the map links to their actual locations and describes their relationships. Do not require a map for a single context or reverse links from each context. Create these files only when there is domain knowledge to record. This adapts the [domain-modeling file structure](https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md#file-structure) from a repository root to the owning repository or package root; the source does not prescribe a `ddd/` folder.

DDD `CONTEXT.md` holds domain language, not implementation details, specifications, or decisions; Work `context.md` holds derived delivery context, not a second domain model. Accepted decisions belong in ADRs and normative contracts in Specs. The Work paths above are placement guidance only: the owning Router Delegation Specification defines the selected Work/Plan/Waves tuple and any sliced-member grammar. Historical `tasks.md` remains a compatibility record; do not create it for new planned work.

## Output

Return the proposed path map, artifact classifications, authority and derivation relationships, naming rationale, required link updates, and unresolved placement conflicts. Do not author artifact content unless separately requested.

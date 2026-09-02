---
name: documentation-structure
description: Determine repository locations, naming, authority relationships, and bounded Work structure for documentation. Use before creating artifacts when placement or ownership conventions are unclear.
---

# Documentation Structure

## Method

1. Inspect repository documentation layout, indexes, naming, links, and authority conventions before proposing paths.
2. Classify each artifact as durable authority, derived work material, ordinary guidance, generated output, or temporary evidence.
3. Preserve existing conventions when they provide clear ownership. Do not create a parallel hierarchy for aesthetic consistency.
4. Assign one owning location and stable name per artifact. Keep PRD, ADR, Spec, Proposal, DDD, Work Context, Plan, and Tasks relationships explicit without duplicating their content.
5. Bound Work artifacts by one coherent delivery objective. Split only when lifecycles, authority, dependencies, or review boundaries materially differ.
6. Define links from derived artifacts to authority and from indexes only where navigation requires them.
7. Identify moves or renames that require reference updates and avoid churn without ownership benefit.
8. For `@settingdust/pi-harness` planned-admission material, one Work directory may hold multiple direct Plan/Tasks pairs, but each admission selects one explicit Work+Plan+Tasks tuple. Preserve the owning Specification's grammar when it applies; do not create a manifest, status machine, or inferred-current-slice convention.
9. Skills, headings, links, and Markdown status are documentation guidance only. They do not establish machine-verifiable document kind, receipt provenance, or user acceptance.

## Output

Return the proposed path map, artifact classifications, authority and derivation relationships, naming rationale, required link updates, and unresolved placement conflicts. Do not author artifact content unless separately requested.

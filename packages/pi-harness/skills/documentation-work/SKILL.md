---
name: documentation-work
description: Create or update a bounded Work entry and processed Context from current authority and settled evidence. Use when multi-step delivery needs a stable local entry point without turning Work files into authority.
---

# Documentation Work

## Method

1. Confirm the bounded delivery objective and applicable authoritative PRD, ADR, and Spec references.
2. Inspect the repository's existing Work convention. Use `documentation-structure` when location or naming is unsettled.
3. Create or update the smallest Work entry that identifies goal, authority links, current stage, and completion signal.
4. Maintain processed Context containing accepted decisions, constraints, established facts, relevant references, current implementation status, and open work.
5. Exclude raw transcripts, speculative proposals, duplicated authority, and task-level execution logs. Link source artifacts instead of copying them.
6. Reconcile Context when authority or accepted decisions change; mark superseded facts rather than leaving contradictions.
7. When `@settingdust/pi-harness` planned-admission material needs a selected tuple, keep one direct `work.md` and its derived `context.md`, with zero or more direct matched Plan/Waves pairs in the same Work directory. Each new planned invocation selects exactly one unsliced `plan.md`/`waves.md` pair or matching sliced pair; do not use Work status, directory order, or an inferred active slice as admission state. Historical Tasks pairs are compatibility records and require explicit migration before further planned implementation.
8. The Router Delegation Specification owns the selected-tuple grammar and validation. A Skill, heading, link, or Markdown status is drafting guidance, never document-kind proof or receipt evidence.
9. Keep Plan and Waves in their owning artifacts when the Work needs them; never record D2/D3, acceptance, or a persistent admission lifecycle in Work material. Do not create a new Tasks layer for planned work.

## Output

Report Work and Context paths, authority links, material context changes, unresolved gaps, and any required structural decision. Work and Context are derived coordination material, not product or technical authority.

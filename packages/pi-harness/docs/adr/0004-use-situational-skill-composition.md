# ADR-0004: Use Situational Skill Composition

- Status: accepted
- Date: 2026-08-17

## Context

The Router needs a full built-in method library without turning Skill categories into fixed workflow roles. Some methods coordinate other Skills, but that relationship depends on the current Handoff: `spec-driven-development` may coordinate documentation, planning, implementation, and review, while a documentation or research Skill may be selected directly for a narrower request.

Pi already discovers Skills and exposes their names and descriptions to the model. Adding a separate control/leaf catalog would duplicate that mechanism and make valid external Skills harder to compose.

## Decision

All model-visible Skills discovered by Pi enter the Router's dynamic Skill enums, including package Skills and user/project Skills. No Skill is hidden or statically classified as a controller, leaf, primary-only, or companion-only.

`primarySkill` and `companionSkills` describe one delegation, not permanent Skill roles. The Handler preloads those Skills and may discover and load additional Skills when their own instructions require them. A Skill expresses conditional relationships to other Skills in its instructions.

The package ships a complete initial software-work method library covering clarification, research, diagnosis, solution analysis, delivery, documentation, review, and LLM instruction writing. Categories organize maintenance only; they do not constrain runtime selection.

Clarification is delegated when useful questions require project or external context. A clarification Handler returns evidence-backed questions and options in its Result; only the Router asks the user.

## Consequences

The Router can select a specialized Skill directly or select a broader coordinating Skill according to the current Handoff. External Skills remain first-class extension points. Skill descriptions and instructions carry more responsibility because the runtime does not enforce a hierarchy or prevent an unsuitable composition.

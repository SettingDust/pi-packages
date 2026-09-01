# ADR-0003: Configure Dynamic Model Roles in Pi Settings

- Status: accepted historical baseline; model-role storage and selection superseded by ADR-0009; compatible safeguards remain current
- Date: 2026-08-17

## Context

The Router needs to select model investment without knowing provider authentication details or committing a user's model inventory to a repository.

## Decision

Model Roles are stored in Pi settings under the top-level `harness` key. Global settings provide the baseline; when the project is trusted, its `harness` object shallowly overlays the global object, matching Pi Loom's settings behavior. On first configuration, the package offers `basic`, `standard`, and `advanced` as initial templates. They are ordinary Roles, not reserved names.

Every Role has an editable name, description, and exactly one `{ model, thinking }` selection. The description is shown to the Router in the dynamically generated resolver schema. There is no ordered candidate list and no automatic cross-model fallback.

`/harness config` opens a TUI backed by Pi's current model registry. Users first select Global or, for a trusted project, Project scope. Project Roles inherit Global Roles until the first project edit materializes a complete project override; resetting the Project override restores inheritance. Users may add, rename, edit, or delete any Role, including the three initial templates.

Only Roles whose model exists, is currently authenticated and available, and accepts the configured thinking level appear in the resolver schema. Resolver execution repeats these checks to catch changes after schema generation. When no Role is available, `resolve_delegation` is not registered and the Router reports the configuration block with `/harness config`. Automatic loading never overwrites malformed configuration. The TUI may replace a malformed `harness` object only after explicit confirmation and never overwrites an invalid settings JSON document.

## Consequences

Projects refer only to semantic Role names in live Router decisions; their documents never record user-specific model IDs. An unavailable, unauthenticated, missing, or invalid Role blocks resolution instead of silently substituting another model. The dynamic resolver schema exposes currently usable Roles without requiring a separate role-discovery tool.

## #42 Partial Supersession

The Role storage and selection decision above is superseded by accepted [ADR-0009](0009-provider-model-thinking-capability-selection.md). This ADR retains its historical rationale and the compatible Global/trusted-Project scope, locking, malformed-file protection, and explicit-confirmation safeguards. Fresh T5 and independent T6 returned GO with P0-P3 zero. T5 command attribution is config-command `13/22`, config `21/22`, settings-store `19/37`, Extension `6/95`, affected `46/154`, distinct subset `53/81`, focused `94/250`, and full `136/538`; typecheck, import, activation, and execute passed. The canonical 1085-byte LF manifest aggregate remains `a6c92e4fc2720f31ca9b34fb60561a7c8174dc8176cb1a9a62ceba7e51541850`; the rejected 1095-byte literal-backslash-n construction hashes to `3fd52e65a90f2d7eaee47b587e50d467abd2960fdb7ead118131bcfb0ce70525`. Implementation, validation, and final review are complete; exact selective-commit review is GO, but staging and commit remain pending. No live backend, reload, settings/runtime, Herdr, Pi-core, push, or deployment behavior is claimed; the unrelated Herdr failure remains outside #42.

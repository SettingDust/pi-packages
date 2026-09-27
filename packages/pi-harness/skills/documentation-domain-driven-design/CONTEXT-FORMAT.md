# CONTEXT.md and CONTEXT-MAP.md Formats

```md
# {Context Name}

{One or two sentences describing what this context is and why it exists.}

## Language

**{Term}**: {One or two sentences defining what this domain-specific concept is.}
_Avoid_: {Alternative terms, if any.}
```

Choose one preferred term; list alternatives under `_Avoid_` when present. Omit generic programming concepts. Group terms under subheadings only when natural clusters emerge; otherwise keep a flat list.

## Single or multiple contexts

For one context, keep one `CONTEXT.md` at the owning repository or package root; no map is needed. When multiple contexts exist, put `CONTEXT-MAP.md` at that root and link each context's `CONTEXT.md` at its actual location. Read an existing map to find contexts; when neither file exists, create documentation lazily once the first term is resolved. Resolve uncertain context assignments before writing.

## CONTEXT-MAP.md Format

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md): receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md): generates invoices and processes payments
- [Fulfillment](./src/fulfillment/CONTEXT.md): manages picking and shipping

## Relationships

- **Ordering -> Fulfillment**: Ordering emits `OrderPlaced`; Fulfillment consumes it to start picking
- **Fulfillment -> Billing**: Fulfillment emits `ShipmentDispatched`; Billing consumes it to generate invoices
- **Ordering <-> Billing**: Shares `CustomerId` and `Money` types
```

Use relative links to the actual context files and describe evidenced relationships, including direction, translation, or shared ownership where relevant. Events and shared types above illustrate possible relationships, not required fields or obligations. Do not require reverse links from each context. Keep accepted architectural decisions in ADRs and normative behavior in Specs.

Adapted from the pinned [domain-modeling context format](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/domain-modeling/CONTEXT-FORMAT.md); placement follows this package's [DDD layout](../documentation-structure/SKILL.md#default-layout).

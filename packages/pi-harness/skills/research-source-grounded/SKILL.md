---
name: research-source-grounded
description: Apply primary-source evidence, provenance, negative-evidence, uncertainty, and citation discipline. Use alone to normalize an evidence set or with research, analysis, diagnosis, and review work that makes source-backed claims.
---

# Research: Source Grounded

## Evidence Rules

1. Prefer primary sources: repository files, tests, schemas, official documentation, issue or PR records, and original artifacts. Use secondary sources only when primary evidence is unavailable or the secondary interpretation is itself relevant.
2. Classify every material statement as:
   - **fact**: directly supported by an inspected source;
   - **conclusion**: derived from cited facts;
   - **inference**: plausible but incompletely supported;
   - **uncertainty**: conflicting, stale, missing, or inaccessible evidence.
3. Record each source object with `locator`, `title`, `claim`, `support`, `accessed`, and `scope`.
4. Record negative evidence separately with searched scope, query or selection method, and result: `empty`, `inconclusive`, `access-blocked`, or `conflicting`.
5. Cite precise sections or source ranges instead of copying large payloads. Redact secrets and state any omission that affects completeness.
6. Never convert lack of evidence into proof of absence. Widen the search only when the owning objective needs it.

## Completion Checks

- Every material claim maps to a source object or is labeled conclusion, inference, or uncertainty.
- Source versions, dates, and inspected scopes are sufficient to reproduce the evidence search.
- Access limits, conflicts, stale evidence, and meaningful negative evidence are explicit.
- Sensitive data is not exposed.

When used with another Skill, retain that Skill's method and output shape; this Skill supplies evidence discipline only.

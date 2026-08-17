---
name: review-security
description: Independently review trust boundaries, abuse cases, authentication, authorization, data exposure, injection, secrets, permissions, and unsafe defaults. Use for read-only security assessment.
---

# Review Security

This is read-only. Apply `research-source-grounded` to source-backed findings.

## Method

1. Identify assets, actors, entry points, trust boundaries, privilege levels, sensitive data, and security requirements.
2. Trace untrusted input through parsing, validation, authorization, storage, execution, rendering, logging, and external calls.
3. Examine authentication and authorization separately. Check object ownership, privilege transitions, default access, and confused-deputy paths.
4. Test credible abuse cases: injection, path traversal, unsafe deserialization, command execution, SSRF, data leakage, secret exposure, race or replay, denial of service, and insecure failure behavior as applicable.
5. Evaluate mitigations in the actual execution path rather than relying on naming or comments.
6. Report exploitable or defense-significant defects with preconditions, impact, evidence, and the smallest robust mitigation. Do not inflate theoretical concerns without a reachable path.
7. State residual threat-model or test gaps when no finding is established.

## Findings

For each finding provide severity, affected asset and boundary, attack path, preconditions, impact, exact source objects, and remediation. Keep security findings separate from ordinary correctness or style concerns. Do not modify the subject.

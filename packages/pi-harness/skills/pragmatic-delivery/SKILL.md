---
name: pragmatic-delivery
description: Reduce speculative defenses, over-engineering, and repeated verification within one authorized Handler outcome. Use on demand, usually alongside the outcome's domain Skill, when unnecessary preparation, defenses, approval loops, or repeated checks obscure the result; required authority, permissions, gates, and evidence take precedence.
---

# Pragmatic Delivery

## Boundary

Apply this method on demand to the current Handoff's single terminal predicate, not as a persistent mode. Applicable authority, actual authorization, the Handler contract, and required checks (including fresh/current-call/JIT checks and completion evidence) take precedence. Skill loading, a Handoff, or Resolver acceptance grants no permission. Missing required Skills, references, permissions, decisions, or authority at entry means `blocked` without project work. Do not ask the user, delegate, take over sibling outcomes, select another stage, or advance Router-owned Todo/Waves/Result state; return evidence and gaps to the Router through the existing Handler Result.

## Method

1. **Reuse unchanged authority and authorization.** Continue only while existing authority and actual permission remain valid for the same scope and conditions. Do not invent repeat approvals for routine in-scope steps or turn research/review into implementation.
2. **Start useful work.** Establish the deliverable and acceptance conditions from context. After entry prerequisites hold, do authorized internal work within this predicate that does not depend on a later gap. Stop affected work and report the gap; use `partial` only for useful incomplete work actually done.
3. **Give defenses a concrete purpose.** Add null checks, duplicate validation, guards, try/catch, fallback, compatibility, generalization, hashes, gates, freezes, or receipts only for explicit requirements, applicable contracts, or evidenced reachable failures. Trust validated internal contracts instead of rechecking them. Preserve real security/trust boundaries, authorization, data integrity, I/O failures, and business invariants; lack of a production reproduction does not justify removing safety checks. Never swallow errors, silently fall back, or turn failure into success.
4. **Keep changes local and complete.** Reuse existing implementations, tools, and tests; reach necessary callers, contracts, and fixtures for this result, not unrelated refactors or speculative abstractions/configuration. Preserve unrelated user edits without creating a freeze or hash ledger merely to prove preservation.
5. **Verify the actual question.** Choose the smallest sufficient check that can catch this change's main failure. Broaden coverage for public-interface or cross-module effects; avoid tests that merely restate low-impact implementation. For numerical experiments check relevant error, convergence, boundaries, or baselines; file hashes do not establish algorithm correctness.
6. **Reuse still-valid evidence.** Reuse relevant checks while code, inputs, configuration, environment, and required freshness conditions remain covered. Repeat or expand for changes, failures, stale evidence, explicit requirements, or unresolved concrete questions, not ritual or a new evidence ledger.
7. **Identify real blocks.** Check whether a rule applies and authorization already covers the step; advice or personal caution is not an approval gate. Cite the concrete rule/tool refusal and gap, without changing paths to bypass rejection. Report checks not run or failed as such.
8. **Deliver when conditions hold.** Stop when this predicate is satisfied, necessary checks pass, and no delivery-affecting issue remains. If unchanged state prompts repeated proof, stop that loop; do only necessary remaining work within this predicate or deliver, without extra proof bundles, frozen snapshots, or audit tasks.

## Output

Submit exactly one Result through the existing Handler completion contract. Report outputs, checks actually performed or reused with their validity basis, and remaining limitations. Keep `completed`, `partial`, `blocked`, and `failed` truthful; missing required verification cannot be `completed`.

## Source and License Notice

Harness-specific adaptation, not a verbatim copy, of [newmancai/sol-just-ship: pragmatic-delivery](https://raw.githubusercontent.com/newmancai/sol-just-ship/201bce6d401d1aa34842720060afb749b8ae2d2d/skills/pragmatic-delivery/SKILL.md), pinned to commit `201bce6d401d1aa34842720060afb749b8ae2d2d`. Handler boundaries and internal-contract/error-handling guidance are local adaptations. The [upstream MIT notice](https://raw.githubusercontent.com/newmancai/sol-just-ship/201bce6d401d1aa34842720060afb749b8ae2d2d/LICENSE) is preserved in [LICENSE](LICENSE) and applies to the referenced text and its adapted portions here only; it does not relicense the Harness package.

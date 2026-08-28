# F0 Red Regression

- Repository: `e68e234165f8bb9efe95b628314074f7ce8d7b15`
- Baseline source SHA-256: `1f0e600ec1e337f87b9ae0757a4ab4306d35cd3ccdcc7cdba476db48516cb529`
- Baseline test SHA-256: `0d6f398406fbb5928c3dbd0e6161a2a7384689071b118217c3f169e3e2e5dd20`
- Recorded historical command: `bun test tests/pane-child.test.ts -t "consumes input after completion begins"`
- Recorded historical result: **red**, 0 pass / 1 fail.

Observed assertion:

```text
Expected: { action: "handled" }
Received: undefined
at tests/pane-child.test.ts:138:25
```

This was run in the recorded historical pre-fix operation after adding only the post-completion input assertion and before changing `extensions/pane-child.ts`.

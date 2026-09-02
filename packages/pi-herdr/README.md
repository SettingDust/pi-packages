# @settingdust/pi-herdr

A small typed client for invoking the local `herdr` CLI from Pi packages. It does not define tab, pane, agent, or subagent policy.

```ts
import { createHerdrClient } from "@settingdust/pi-herdr";

const herdr = createHerdrClient(async (command, args, options) => {
  // Run command with the runtime's process API.
  return { code: 0, stdout: "{}", stderr: "" };
});
```

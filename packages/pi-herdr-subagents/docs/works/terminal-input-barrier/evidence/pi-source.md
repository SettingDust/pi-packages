# Pi 0.84.2 Source Evidence

Installed package: `@earendil-works/pi-coding-agent@0.84.2`, resolved at `E:\Projects\pi-packages\node_modules\@earendil-works\pi-coding-agent`.

| Source | SHA-256 | Relevant behavior |
| --- | --- | --- |
| `dist/core/extensions/runner.js` | `b39d59b8f86693b9aca15f13e14f367fce9a0ad8ed7ce9ad17950906f226951d` | `emitInput` returns immediately on `{ action: "handled" }`; absent handler action becomes `continue`. |
| `dist/core/agent-session.js` | `9f065b4a277857db100e3277c4d18316c89cd46b11f6ba8140122f19efbe47c4` | `prompt()` returns before expansion, persistence, queueing, or agent processing when `emitInput` returns `handled`. |
| `dist/modes/interactive/interactive-mode.js` | `e4c84f7e3b884533db5a8a6e6b65f34767fb3ade30a2f4213202d99e7ff4d8b6` | extension `ctx.shutdown()` sets `shutdownRequested`; `agent_settled` later invokes shutdown, whose terminal drain/stop/dispose sequence is asynchronous. |

Minimal excerpts:

```js
// runner.js:930
const result = await handler(event, ctx);
if (result?.action === "handled") return result;
// ...
return { action: "continue" };
```

```js
// agent-session.js, prompt input interception
const inputResult = await this._extensionRunner.emitInput(...);
if (inputResult.action === "handled") {
  preflightResult?.(true);
  return;
}
// expansion and streaming/agent processing follow only after this branch
```

```js
// interactive-mode.js:1464 and 2693
shutdownHandler: () => {
  this.shutdownRequested = true;
  if (this.session.isIdle) void this.shutdown();
}
// ...
case "agent_settled":
  await this.checkShutdownRequested();
```

These sources support the framework interpretation used by F1-F8. They do not by themselves prove the extension behavior or real terminal delivery.

Recorded historical source inspection supports the framework interpretation above; this documentation reconciliation does not rerun that source inspection.

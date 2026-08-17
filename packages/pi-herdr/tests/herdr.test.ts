import { describe, expect, test } from "bun:test";
import { createHerdrClient, hasHerdrErrorCode } from "../src/index.js";

describe("Herdr CLI client", () => {
  test("runs injected commands and parses object JSON", async () => {
    const calls: unknown[] = [];
    const client = createHerdrClient(async (command, args, options: { cwd: string }) => {
      calls.push({ command, args, options });
      return { code: 0, stdout: JSON.stringify({ result: { id: "pane-1" } }), stderr: "" };
    });

    await expect(client.json(["pane", "get", "pane-1"], { cwd: "/repo" })).resolves.toEqual({ result: { id: "pane-1" } });
    expect(calls).toEqual([{ command: "herdr", args: ["pane", "get", "pane-1"], options: { cwd: "/repo" } }]);
  });

  test("reports command failures, termination, and invalid JSON", async () => {
    const failed = createHerdrClient(async () => ({ code: 1, stdout: "", stderr: "no agent" }));
    await expect(failed.run(["agent", "get", "missing"], {})).rejects.toThrow("herdr agent get failed: no agent");

    const killed = createHerdrClient(async () => ({ code: 0, stdout: "", stderr: "", killed: true }));
    await expect(killed.run(["agent", "wait"], {})).rejects.toThrow("herdr agent wait failed: killed");

    const invalid = createHerdrClient(async () => ({ code: 0, stdout: "[]", stderr: "" }));
    await expect(invalid.json(["tab", "list"], {})).rejects.toThrow("herdr tab list returned invalid JSON");
  });

  test("validates arguments and finds nested structured error codes", async () => {
    let called = false;
    const client = createHerdrClient(async () => {
      called = true;
      return { code: 0, stdout: "", stderr: "" };
    });
    await expect(client.exec([1] as unknown as string[], {})).rejects.toThrow("Herdr arguments must be an array of strings");
    expect(called).toBeFalse();
    expect(hasHerdrErrorCode({ stdout: JSON.stringify({ result: { error: { code: "agent_not_found" } } }), stderr: "" }, "agent_not_found")).toBeTrue();
  });
});

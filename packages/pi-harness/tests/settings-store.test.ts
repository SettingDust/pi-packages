import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import { configuredRoles, FileHarnessSettingsRepository } from "../src/index.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "pi-harness-settings-"));
  roots.push(root);
  const cwd = join(root, "project");
  const agentDir = join(root, "agent");
  mkdirSync(cwd, { recursive: true });
  return { cwd, agentDir, repository: new FileHarnessSettingsRepository(cwd, agentDir) };
}

const roles = {
  standard: { description: "Normal work.", model: "test/model", thinking: "medium" },
};

describe("Harness settings storage", () => {
  test("updates Global Roles while preserving unrelated Pi settings", () => {
    const { agentDir, repository } = fixture();
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ theme: "dark", harness: { roles: {} } }));

    repository.writeRoles("global", roles);

    expect(JSON.parse(readFileSync(join(agentDir, "settings.json"), "utf8"))).toEqual({
      theme: "dark",
      harness: { roles },
    });
  });

  test("writes and removes the Project override", () => {
    const { cwd, repository } = fixture();
    repository.writeRoles("project", roles);
    expect(configuredRoles(repository.read("project"))).toEqual(roles);

    repository.writeRoles("project", undefined);
    expect(JSON.parse(readFileSync(join(cwd, CONFIG_DIR_NAME, "settings.json"), "utf8"))).toEqual({});
  });

  test("does not overwrite malformed Pi settings", () => {
    const { agentDir, repository } = fixture();
    mkdirSync(agentDir, { recursive: true });
    const path = join(agentDir, "settings.json");
    writeFileSync(path, "not json");

    expect(() => repository.writeRoles("global", roles)).toThrow();
    expect(readFileSync(path, "utf8")).toBe("not json");
  });
});

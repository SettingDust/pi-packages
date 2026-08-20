import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SubagentSettingsStore, defaultSubagentUiSettings } from "../src/index.js";

function settingsPath(): string {
  return join(mkdtempSync(join(tmpdir(), "subagent-settings-")), "settings.json");
}

describe("SubagentSettingsStore", () => {
  test("uses defaults for a missing file and normalizes valid and legacy values", () => {
    const warnings: string[] = [];
    const path = settingsPath();
    const store = new SubagentSettingsStore(path, warning => warnings.push(warning));
    expect(store.load()).toEqual(defaultSubagentUiSettings);
    expect(warnings).toEqual([]);

    writeFileSync(path, JSON.stringify({ widgetPlacement: "belowEditor", widgetMode: "summary", useNerdFont: false }));
    expect(store.load()).toEqual({ widgetPlacement: "belowEditor", widgetMode: "summary", useNerdFont: false });

    writeFileSync(path, JSON.stringify({ widgetPlacement: "off", widgetLayout: "columns", useNerdFont: true }));
    expect(store.load()).toEqual({ widgetPlacement: "off", widgetMode: "progress", useNerdFont: true });
  });

  test("warns and falls back without allowing warning failures to escape", () => {
    const path = settingsPath();
    writeFileSync(path, JSON.stringify({ widgetPlacement: "side", widgetMode: "grid", widgetLayout: "unknown", useNerdFont: "yes" }));
    const warnings: string[] = [];
    expect(new SubagentSettingsStore(path, warning => warnings.push(warning)).load()).toEqual(defaultSubagentUiSettings);
    expect(warnings).toHaveLength(4);

    writeFileSync(path, "[");
    expect(() => new SubagentSettingsStore(path, () => { throw new Error("warning failed"); }).load()).not.toThrow();
    writeFileSync(path, "[]");
    expect(new SubagentSettingsStore(path, warning => warnings.push(warning)).load()).toEqual(defaultSubagentUiSettings);
  });

  test("warns for invalid legacy layout even when widgetMode is valid", () => {
    const path = settingsPath();
    writeFileSync(path, JSON.stringify({ widgetMode: "summary", widgetLayout: "grid" }));
    const warnings: string[] = [];

    expect(new SubagentSettingsStore(path, warning => warnings.push(warning)).load()).toEqual({
      ...defaultSubagentUiSettings,
      widgetMode: "summary",
    });
    expect(warnings).toEqual(["Invalid legacy subagent widgetLayout; ignoring it."]);
  });

  test("cleans a temporary file when atomic replacement fails", async () => {
    const path = settingsPath();
    mkdirSync(path);
    const store = new SubagentSettingsStore(path, () => {});

    await expect(store.save({ ...defaultSubagentUiSettings })).rejects.toThrow();
    expect(readdirSync(join(path, "..")).filter(name => name.endsWith(".tmp"))).toEqual([]);
  });

  test("atomically saves normalized fields while preserving unrelated parsed values", async () => {
    const path = settingsPath();
    writeFileSync(path, JSON.stringify({ nested: { keep: true }, unknown: [1, 2], widgetLayout: "stacked" }));
    const store = new SubagentSettingsStore(path, () => {});
    store.load();
    await store.save({ widgetPlacement: "belowEditor", widgetMode: "summary", useNerdFont: false });
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      nested: { keep: true },
      unknown: [1, 2],
      widgetLayout: "stacked",
      widgetPlacement: "belowEditor",
      widgetMode: "summary",
      useNerdFont: false,
    });
    expect(readdirSync(join(path, "..")).filter(name => name.endsWith(".tmp"))).toEqual([]);

    writeFileSync(path, "not json");
    const malformed = new SubagentSettingsStore(path, () => {});
    malformed.load();
    await malformed.save({ widgetPlacement: "aboveEditor", widgetMode: "progress", useNerdFont: true });
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(defaultSubagentUiSettings);
  });
});

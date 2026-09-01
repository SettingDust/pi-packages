import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileHarnessSettingsRepository, runHarnessConfig, type ConfiguredCandidates, type HarnessSettingsRepository, type HarnessSettingsScope } from "../src/index.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fileRepository(content: string) {
  const root = mkdtempSync(join(tmpdir(), "pi-harness-config-"));
  roots.push(root);
  const cwd = join(root, "project");
  const agentDir = join(root, "agent");
  const path = join(agentDir, "settings.json");
  mkdirSync(cwd, { recursive: true });
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(path, content);
  const real = new FileHarnessSettingsRepository(cwd, agentDir);
  const calls: string[] = [];
  const repository: HarnessSettingsRepository = {
    read: (scope) => real.read(scope),
    writeCandidates: (scope, candidates) => {
      calls.push("write");
      real.writeCandidates(scope, candidates);
    },
    replaceCandidatesAfterDuplicateKeyConfirmation: (scope, candidates) => {
      calls.push("replace");
      real.replaceCandidatesAfterDuplicateKeyConfirmation(scope, candidates);
    },
  };
  return { calls, path, repository };
}

const standard = {
  medium: { reasoning: 2, impact: 1 },
};

const candidateId = (provider: string, modelId: string, thinking: string) => JSON.stringify([provider, modelId, thinking]);

class MemoryRepository implements HarnessSettingsRepository {
  writes: Array<{ scope: HarnessSettingsScope; candidates: ConfiguredCandidates | undefined }> = [];

  constructor(
    private global: Record<string, unknown> = {},
    private project: Record<string, unknown> = {},
  ) {}

  read(scope: HarnessSettingsScope) {
    return structuredClone(scope === "global" ? this.global : this.project);
  }

  writeCandidates(scope: HarnessSettingsScope, candidates: ConfiguredCandidates | undefined) {
    this.writes.push({ scope, candidates: structuredClone(candidates) });
  }

  replaceCandidatesAfterDuplicateKeyConfirmation(scope: HarnessSettingsScope, candidates: ConfiguredCandidates | undefined) {
    this.writeCandidates(scope, candidates);
  }
}

function settings(candidates: ConfiguredCandidates) {
  return { harness: { candidates } };
}

function context(
  selects: string[],
  inputs: string[] = [],
  trusted = true,
  confirms: boolean[] = [],
  models = [{ provider: "test", id: "reasoning", reasoning: true }],
) {
  const notices: Array<[string, string | undefined]> = [];
  const confirmations: Array<[string, string]> = [];
  const selections: Array<[string, string[]]> = [];
  const ctx = {
    cwd: "/workspace",
    hasUI: true,
    isProjectTrusted: () => trusted,
    modelRegistry: {
      getAvailable: () => models,
    },
    ui: {
      select: async (title: string, options: string[]) => {
        selections.push([title, options]);
        return selects.shift();
      },
      confirm: async (title: string, message: string) => {
        confirmations.push([title, message]);
        return confirms.shift() ?? true;
      },
      input: async () => inputs.shift(),
      editor: async () => undefined,
      notify: (message: string, type?: string) => notices.push([message, type]),
    },
  } as unknown as ExtensionCommandContext;
  return { ctx, notices, confirmations, selections };
}

describe("/harness config", () => {
  test("materializes inherited Global candidates on the first Project edit", async () => {
    const repository = new MemoryRepository(settings({ "test/reasoning": standard }), {});
    const { ctx } = context([
      "Project",
      candidateId("test", "reasoning", "medium"),
      "Edit",
      "test/reasoning",
      "high",
      "Save",
    ], ["3", "2"]);

    await runHarnessConfig(ctx, repository);

    expect(repository.writes).toEqual([{
      scope: "project",
      candidates: { "test/reasoning": { high: { reasoning: 3, impact: 2 } } },
    }]);
  });

  test("resets a Project override to Global inheritance", async () => {
    const repository = new MemoryRepository(settings({ "test/reasoning": standard }), settings({ "test/other": standard }));
    const { ctx } = context(["Project", "Reset project override (inherit Global)", "Save"]);

    await runHarnessConfig(ctx, repository);

    expect(repository.writes).toEqual([{ scope: "project", candidates: undefined }]);
  });

  test("adds a candidate with explicit capability values", async () => {
    const repository = new MemoryRepository();
    const { ctx } = context(["Global", "Add candidate", "test/reasoning", "medium", "Save"], ["2", "1"]);

    await runHarnessConfig(ctx, repository);

    expect(repository.writes).toEqual([{ scope: "global", candidates: { "test/reasoning": standard } }]);
  });

  test("requires confirmation before replacing a colliding canonical tuple", async () => {
    const repository = new MemoryRepository(settings({
      "test/reasoning": {
        medium: { reasoning: 2, impact: 1 },
        high: { reasoning: 3, impact: 3 },
      },
    }));
    const { ctx, confirmations } = context([
      "Global",
      candidateId("test", "reasoning", "medium"),
      "Edit",
      "test/reasoning",
      "high",
      "Save",
    ], ["4", "2"], true, [true]);

    await runHarnessConfig(ctx, repository);

    expect(confirmations).toEqual([["Replace candidate", "Replace existing test/reasoning (high)?"]]);
    expect(repository.writes).toEqual([{
      scope: "global",
      candidates: { "test/reasoning": { high: { reasoning: 4, impact: 2 } } },
    }]);
  });

  test("cancels a colliding edit without mutation or write", async () => {
    const original = {
      "test/reasoning": {
        medium: { reasoning: 2, impact: 1 },
        high: { reasoning: 3, impact: 3 },
      },
    };
    const repository = new MemoryRepository(settings(original));
    const { ctx, confirmations } = context([
      "Global",
      candidateId("test", "reasoning", "medium"),
      "Edit",
      "test/reasoning",
      "high",
      "Back",
      "Cancel",
    ], ["4", "2"], true, [false]);

    await runHarnessConfig(ctx, repository);

    expect(confirmations).toHaveLength(1);
    expect(repository.writes).toEqual([]);
    expect(repository.read("global")).toEqual(settings(original));
  });

  test("edits only the selected candidate when display labels collide", async () => {
    const first = candidateId("p", "m", "x (y");
    const second = candidateId("p", "m (x", "y");
    const other = candidateId("test", "reasoning", "medium");
    const original = {
      "p/m": { "x (y": { reasoning: 1, impact: 1 } },
      "p/m (x": { y: { reasoning: 1, impact: 1 } },
      "test/reasoning": standard,
    };
    const repository = new MemoryRepository(settings(original));
    const { ctx, selections } = context(
      ["Global", first, "Edit", "p/m", "x (y", "Save"],
      ["2", "3"],
      true,
      [],
      [
        { provider: "p", id: "m", reasoning: true },
        { provider: "p", id: "m (x", reasoning: true },
        { provider: "test", id: "reasoning", reasoning: true },
      ],
    );

    await runHarnessConfig(ctx, repository);

    expect(selections[1]).toEqual(["Harness candidates - Global", [...[first, second, other].sort(), "Add candidate", "Save", "Cancel"]]);
    expect(repository.writes).toEqual([{
      scope: "global",
      candidates: {
        "p/m": { "x (y": { reasoning: 2, impact: 3 } },
        "p/m (x": { y: { reasoning: 1, impact: 1 } },
        "test/reasoning": standard,
      },
    }]);
  });

  test("deletes only the selected candidate when display labels collide", async () => {
    const second = candidateId("p", "m (x", "y");
    const repository = new MemoryRepository(settings({
      "p/m": { "x (y": { reasoning: 1, impact: 1 } },
      "p/m (x": { y: { reasoning: 1, impact: 1 } },
    }));
    const { ctx } = context(["Global", second, "Delete", "Save"]);

    await runHarnessConfig(ctx, repository);

    expect(repository.writes).toEqual([{
      scope: "global",
      candidates: { "p/m": { "x (y": { reasoning: 1, impact: 1 } } },
    }]);
  });

  test("does not write when candidate selection is cancelled", async () => {
    const repository = new MemoryRepository(settings({ "test/reasoning": standard }));
    const { ctx } = context(["Global"]);

    await runHarnessConfig(ctx, repository);

    expect(repository.writes).toEqual([]);
  });

  test("does not offer Project scope when the project is untrusted", async () => {
    const repository = new MemoryRepository();
    const seen: string[][] = [];
    const { ctx } = context([undefined as unknown as string], [], false);
    (ctx.ui.select as unknown as (title: string, options: string[]) => Promise<string | undefined>) = async (_title, options) => {
      seen.push(options);
      return undefined;
    };

    await runHarnessConfig(ctx, repository);

    expect(seen[0]).toEqual(["Global"]);
  });

  test.each([
    ["rejects replacement", ["Global"], [false]],
    ["cancels after confirmation", ["Global", "Cancel"], [true]],
  ])("%s of raw duplicate settings without writing", async (_name, selects, confirms) => {
    const content = '{"theme":"dark","harness":{"candidates":{},"candidates":{"old/model":{}}}}';
    const { calls, path, repository } = fileRepository(content);
    const { ctx } = context(selects, [], true, confirms);

    await runHarnessConfig(ctx, repository);

    expect(calls).toEqual([]);
    expect(readFileSync(path, "utf8")).toBe(content);
  });

  test("replaces confirmed raw duplicate settings once through the real repository", async () => {
    const content = '{"theme":"dark","harness":{"candidates":{},"candidates":{"old/model":{}}}}';
    const { calls, path, repository } = fileRepository(content);
    const { ctx } = context(
      ["Global", "Add candidate", "test/reasoning", "medium", "Save"],
      ["2", "1"],
      true,
      [true],
    );

    await runHarnessConfig(ctx, repository);

    expect(calls).toEqual(["replace"]);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      theme: "dark",
      harness: { candidates: { "test/reasoning": standard } },
    });
  });

  test("keeps malformed JSON unrecoverable after replacement confirmation", async () => {
    const content = '{"theme":"dark","harness":{"candidates":';
    const { calls, path, repository } = fileRepository(content);
    const { ctx, notices } = context(["Global", "Save"], [], true, [true]);

    await runHarnessConfig(ctx, repository);

    expect(calls).toEqual(["write"]);
    expect(readFileSync(path, "utf8")).toBe(content);
    expect(notices.at(-1)?.[1]).toBe("error");
  });
});

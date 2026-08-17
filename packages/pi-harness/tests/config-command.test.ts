import { describe, expect, test } from "bun:test";
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { runHarnessConfig, type ConfiguredRoles, type HarnessSettingsRepository, type HarnessSettingsScope } from "../src/index.js";

const standard = {
  description: "Normal work.",
  model: "test/reasoning",
  thinking: "medium",
};

class MemoryRepository implements HarnessSettingsRepository {
  writes: Array<{ scope: HarnessSettingsScope; roles: ConfiguredRoles | undefined }> = [];

  constructor(
    private global: Record<string, unknown> = {},
    private project: Record<string, unknown> = {},
  ) {}

  read(scope: HarnessSettingsScope) {
    return structuredClone(scope === "global" ? this.global : this.project);
  }

  writeRoles(scope: HarnessSettingsScope, roles: ConfiguredRoles | undefined) {
    this.writes.push({ scope, roles: structuredClone(roles) });
  }
}

function settings(roles: ConfiguredRoles) {
  return { harness: { roles } };
}

function context(selects: string[], editors: string[] = [], trusted = true) {
  const notices: Array<[string, string | undefined]> = [];
  const ctx = {
    cwd: "/workspace",
    hasUI: true,
    isProjectTrusted: () => trusted,
    modelRegistry: {
      getAvailable: () => [{ provider: "test", id: "reasoning", reasoning: true }],
    },
    ui: {
      select: async () => selects.shift(),
      confirm: async () => true,
      input: async () => undefined,
      editor: async () => editors.shift(),
      notify: (message: string, type?: string) => notices.push([message, type]),
    },
  } as unknown as ExtensionCommandContext;
  return { ctx, notices };
}

describe("/harness config", () => {
  test("materializes inherited Global Roles on the first Project edit", async () => {
    const repository = new MemoryRepository(settings({ standard }), {});
    const { ctx } = context([
      "Project",
      "Role: standard (test/reasoning, medium)",
      "Edit",
      "test/reasoning",
      "high",
      "Save",
    ], ["Updated normal work."]);

    await runHarnessConfig(ctx, repository);

    expect(repository.writes).toEqual([{
      scope: "project",
      roles: { standard: { ...standard, description: "Updated normal work.", thinking: "high" } },
    }]);
  });

  test("resets a Project override to Global inheritance", async () => {
    const repository = new MemoryRepository(settings({ standard }), settings({ custom: standard }));
    const { ctx } = context(["Project", "Reset project override (inherit Global)", "Save"]);

    await runHarnessConfig(ctx, repository);

    expect(repository.writes).toEqual([{ scope: "project", roles: undefined }]);
  });

  test("initializes the three default templates", async () => {
    const repository = new MemoryRepository();
    const { ctx } = context([
      "Global",
      "Initialize basic, standard, and advanced templates",
      "test/reasoning",
      "Save",
    ]);

    await runHarnessConfig(ctx, repository);

    expect(repository.writes[0]).toMatchObject({
      scope: "global",
      roles: {
        basic: { thinking: "low" },
        standard: { thinking: "medium" },
        advanced: { thinking: "high" },
      },
    });
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
});

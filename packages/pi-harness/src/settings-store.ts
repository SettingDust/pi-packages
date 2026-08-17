import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import lockfile from "proper-lockfile";

export type HarnessSettingsScope = "global" | "project";

export interface ConfiguredRole {
  description: string;
  model: string;
  thinking: string;
}

export type ConfiguredRoles = Record<string, ConfiguredRole>;

export interface HarnessSettingsRepository {
  read(scope: HarnessSettingsScope): Record<string, unknown>;
  writeRoles(scope: HarnessSettingsScope, roles: ConfiguredRoles | undefined): void;
}

export class FileHarnessSettingsRepository implements HarnessSettingsRepository {
  constructor(private readonly cwd: string, private readonly agentDir = getAgentDir()) {}

  read(scope: HarnessSettingsScope): Record<string, unknown> {
    const path = this.path(scope);
    if (!existsSync(path)) return {};
    return this.withLock(path, () => parseSettings(readFileSync(path, "utf8")));
  }

  writeRoles(scope: HarnessSettingsScope, roles: ConfiguredRoles | undefined): void {
    const path = this.path(scope);
    mkdirSync(dirname(path), { recursive: true });
    this.withLock(path, () => {
      const settings = existsSync(path) ? parseSettings(readFileSync(path, "utf8")) : {};
      if (roles === undefined) delete settings.harness;
      else settings.harness = { roles };
      writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    });
  }

  private path(scope: HarnessSettingsScope): string {
    return scope === "global"
      ? join(this.agentDir, "settings.json")
      : join(this.cwd, CONFIG_DIR_NAME, "settings.json");
  }

  private withLock<T>(path: string, operation: () => T): T {
    const release = this.acquireLock(path);
    try {
      return operation();
    } finally {
      release();
    }
  }

  private acquireLock(path: string): () => void {
    let lastError: unknown;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        return lockfile.lockSync(path, { realpath: false });
      } catch (error) {
        lastError = error;
        const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
        if (code !== "ELOCKED" || attempt === 9) throw error;
        const start = Date.now();
        while (Date.now() - start < 20) {}
      }
    }
    throw lastError;
  }
}

export function configuredRoles(settings: unknown): ConfiguredRoles | undefined {
  if (!isObject(settings) || !Object.hasOwn(settings, "harness")) return undefined;
  const harness = settings.harness;
  if (!isObject(harness) || Object.keys(harness).some((key) => key !== "roles")) {
    throw new Error("harness must contain only a roles object");
  }
  if (harness.roles === undefined) return {};
  if (!isObject(harness.roles)) throw new Error("harness.roles must be an object");

  const roles: ConfiguredRoles = {};
  for (const [name, value] of Object.entries(harness.roles)) {
    if (!name.trim() || !isObject(value) || Object.keys(value).sort().join(",") !== "description,model,thinking") {
      throw new Error("Every harness Role needs description, model, and thinking");
    }
    const { description, model, thinking } = value;
    if (![description, model, thinking].every((item) => typeof item === "string" && item.trim())) {
      throw new Error("Every harness Role value must be a non-empty string");
    }
    roles[name] = { description: description as string, model: model as string, thinking: thinking as string };
  }
  return roles;
}

function parseSettings(content: string): Record<string, unknown> {
  const value: unknown = JSON.parse(content);
  if (!isObject(value)) throw new Error("Pi settings must be a JSON object");
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

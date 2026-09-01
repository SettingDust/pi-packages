import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import lockfile from "proper-lockfile";

export type HarnessSettingsScope = "global" | "project";

export interface ConfiguredCandidateCapabilities {
  reasoning: number;
  impact: number;
}

export type ConfiguredCandidates = Record<string, Record<string, ConfiguredCandidateCapabilities>>;

export interface CandidateEntry extends ConfiguredCandidateCapabilities {
  provider: string;
  modelId: string;
  thinking: string;
}

export interface HarnessSettingsRepository {
  read(scope: HarnessSettingsScope): Record<string, unknown>;
  writeCandidates(scope: HarnessSettingsScope, candidates: ConfiguredCandidates | undefined): void;
  replaceCandidatesAfterDuplicateKeyConfirmation(scope: HarnessSettingsScope, candidates: ConfiguredCandidates | undefined): void;
}

export class FileHarnessSettingsRepository implements HarnessSettingsRepository {
  constructor(private readonly cwd: string, private readonly agentDir = getAgentDir()) {}

  read(scope: HarnessSettingsScope): Record<string, unknown> {
    const path = this.path(scope);
    if (!existsSync(path)) return {};
    return this.withLock(path, () => parseSettings(readFileSync(path, "utf8")));
  }

  writeCandidates(scope: HarnessSettingsScope, candidates: ConfiguredCandidates | undefined): void {
    this.write(scope, candidates, false);
  }

  replaceCandidatesAfterDuplicateKeyConfirmation(scope: HarnessSettingsScope, candidates: ConfiguredCandidates | undefined): void {
    this.write(scope, candidates, true);
  }

  private write(scope: HarnessSettingsScope, candidates: ConfiguredCandidates | undefined, confirmedDuplicateRecovery: boolean): void {
    const path = this.path(scope);
    mkdirSync(dirname(path), { recursive: true });
    this.withLock(path, () => {
      let settings: Record<string, unknown> = {};
      if (existsSync(path)) settings = parseSettings(readFileSync(path, "utf8"), confirmedDuplicateRecovery);
      else if (confirmedDuplicateRecovery) throw new Error("Duplicate-key recovery requires an existing settings file");
      if (candidates === undefined) delete settings.harness;
      else settings.harness = { candidates };
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

export function configuredCandidates(settings: unknown): ConfiguredCandidates | undefined {
  if (!isObject(settings) || !Object.hasOwn(settings, "harness")) return undefined;
  const harness = settings.harness;
  if (!isObject(harness)) throw new Error("harness must contain only a candidates object; manual replacement required");
  if (Object.keys(harness).some((key) => !["candidates", "roles", "modelRole"].includes(key))) {
    throw new Error("harness must contain only a candidates object; manual replacement required");
  }
  if (Object.hasOwn(harness, "roles") || Object.hasOwn(harness, "modelRole")) {
    throw new Error("Legacy harness roles require manual replacement; use harness.candidates");
  }
  if (harness.candidates === undefined) return {};
  if (!isObject(harness.candidates)) throw new Error("harness.candidates must be an object; manual replacement required");

  const candidates: ConfiguredCandidates = {};
  const tuples = new Set<string>();
  for (const [providerModelKey, value] of Object.entries(harness.candidates)) {
    const slash = providerModelKey.indexOf("/");
    const provider = slash < 0 ? providerModelKey : providerModelKey.slice(0, slash);
    const modelId = slash < 0 ? "" : providerModelKey.slice(slash + 1);
    if (!nonEmptyExact(provider) || !nonEmptyExact(modelId) || hasControl(provider) || hasControl(modelId)) {
      throw new Error("Every candidate needs a non-empty provider/model ID without control characters; manual replacement required");
    }
    if (provider.includes("/")) throw new Error("Provider cannot contain a slash; manual replacement required");
    if (!isObject(value)) throw new Error("Candidate thinking values must be objects; manual replacement required");

    const thinkingValues: Record<string, ConfiguredCandidateCapabilities> = {};
    for (const [thinking, capabilities] of Object.entries(value)) {
      if (!nonEmptyExact(thinking) || hasControl(thinking) || !isObject(capabilities) ||
        Object.keys(capabilities).sort().join(",") !== "impact,reasoning") {
        throw new Error("Every candidate thinking entry needs exactly reasoning and impact; manual replacement required");
      }
      const { reasoning, impact } = capabilities;
      if (!validCapability(reasoning) || !validCapability(impact)) {
        throw new Error("Candidate reasoning and impact must be finite non-negative integers; manual replacement required");
      }
      const canonical = JSON.stringify([provider, modelId, thinking]);
      if (tuples.has(canonical)) throw new Error("Duplicate candidate identity; manual replacement required");
      tuples.add(canonical);
      Object.defineProperty(thinkingValues, thinking, {
        value: { reasoning, impact },
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    candidates[providerModelKey] = thinkingValues;
  }
  return candidates;
}

export function candidateEntries(candidates: ConfiguredCandidates): CandidateEntry[] {
  return Object.entries(candidates).flatMap(([providerModelKey, values]) => {
    const slash = providerModelKey.indexOf("/");
    const provider = providerModelKey.slice(0, slash);
    const modelId = providerModelKey.slice(slash + 1);
    return Object.entries(values).map(([thinking, capabilities]) => ({ provider, modelId, thinking, ...capabilities }));
  });
}

function parseSettings(content: string, confirmedDuplicateRecovery = false): Record<string, unknown> {
  const duplicate = duplicateJsonKey(content);
  if (duplicate !== undefined && !confirmedDuplicateRecovery) throw new DuplicateJsonKeyError(duplicate);
  if (duplicate === undefined && confirmedDuplicateRecovery) {
    throw new Error("Duplicate-key recovery requires a settings file with duplicate JSON keys");
  }
  const value: unknown = JSON.parse(content);
  if (!isObject(value)) throw new Error("Pi settings must be a JSON object");
  return value;
}

export class DuplicateJsonKeyError extends Error {
  constructor(key: string) {
    super(`Duplicate JSON key: ${key}`);
    this.name = "DuplicateJsonKeyError";
  }
}

function duplicateJsonKey(content: string): string | undefined {
  let index = 0;
  let duplicate: string | undefined;
  const whitespace = () => { while (/\s/.test(content[index] ?? "")) index++; };
  const parseString = () => {
    if (content[index++] !== '"') throw new Error("Invalid JSON settings");
    while (index < content.length) {
      const char = content[index++];
      if (char === "\\") index++;
      else if (char === '"') return;
    }
    throw new Error("Invalid JSON settings");
  };
  const object = () => {
    index++;
    const keys = new Set<string>();
    whitespace();
    if (content[index] === "}") { index++; return; }
    while (true) {
      whitespace();
      if (content[index] !== '"') throw new Error("Invalid JSON settings");
      const start = index;
      parseString();
      const key = JSON.parse(content.slice(start, index)) as string;
      if (keys.has(key)) duplicate ??= key;
      keys.add(key);
      whitespace();
      if (content[index++] !== ":") throw new Error("Invalid JSON settings");
      value();
      whitespace();
      const delimiter = content[index++];
      if (delimiter === "}") return;
      if (delimiter !== ",") throw new Error("Invalid JSON settings");
    }
  };
  const value = () => {
    whitespace();
    if (content[index] === '"') { parseString(); return; }
    if (content[index] === "{") { object(); return; }
    if (content[index] === "[") {
      index++;
      whitespace();
      if (content[index] === "]") { index++; return; }
      while (true) {
        value();
        whitespace();
        const delimiter = content[index++];
        if (delimiter === "]") return;
        if (delimiter !== ",") throw new Error("Invalid JSON settings");
      }
    }
    const start = index;
    while (index < content.length && !/[\s,\]}]/.test(content[index]!)) index++;
    if (start === index) throw new Error("Invalid JSON settings");
  };
  value();
  whitespace();
  if (index !== content.length) throw new Error("Invalid JSON settings");
  return duplicate;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyExact(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function hasControl(value: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(value);
}

function validCapability(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

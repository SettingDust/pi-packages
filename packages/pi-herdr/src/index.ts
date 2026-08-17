export interface HerdrExecResult {
  code: number;
  stdout: string;
  stderr: string;
  killed?: boolean;
}

export type HerdrExecutor<Options> = (
  command: "herdr",
  args: readonly string[],
  options: Options,
) => Promise<HerdrExecResult>;

export interface HerdrClient<Options> {
  exec(args: readonly string[], options: Options): Promise<HerdrExecResult>;
  run(args: readonly string[], options: Options): Promise<string>;
  json(args: readonly string[], options: Options): Promise<Record<string, unknown>>;
}

export function createHerdrClient<Options>(execute: HerdrExecutor<Options>): HerdrClient<Options> {
  async function exec(args: readonly string[], options: Options): Promise<HerdrExecResult> {
    if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) {
      throw new TypeError("Herdr arguments must be an array of strings");
    }
    return execute("herdr", args, options);
  }

  async function run(args: readonly string[], options: Options): Promise<string> {
    const result = await exec(args, options);
    if (result.code !== 0 || result.killed) throw new Error(commandFailure(args, result));
    return result.stdout;
  }

  return {
    exec,
    run,
    async json(args, options) {
      const output = await run(args, options);
      try {
        const value: unknown = JSON.parse(output);
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
        return value as Record<string, unknown>;
      } catch {
        throw new Error(`${commandName(args)} returned invalid JSON`);
      }
    },
  };
}

export function commandFailure(args: readonly string[], result: HerdrExecResult): string {
  const detail = result.stderr.trim() || result.stdout.trim() || (result.killed ? "killed" : `exit ${result.code}`);
  return `${commandName(args)} failed: ${detail}`;
}

export function hasHerdrErrorCode(result: Pick<HerdrExecResult, "stdout" | "stderr">, expected: string): boolean {
  return [result.stdout, result.stderr].some((output) => containsErrorCode(parseJson(output), expected));
}

function commandName(args: readonly string[]): string {
  return ["herdr", ...args.slice(0, 2)].join(" ");
}

function parseJson(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    return undefined;
  }
}

function containsErrorCode(value: unknown, expected: string): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((entry) => containsErrorCode(entry, expected));
  const record = value as Record<string, unknown>;
  return (isRecord(record.error) && record.error.code === expected)
    || Object.values(record).some((entry) => containsErrorCode(entry, expected));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

import { spawnSync } from "node:child_process";
import { lstatSync, realpathSync, readdirSync, unlinkSync, rmdirSync, rmSync, type Stats } from "node:fs";
import { open } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { ImageContent } from "@earendil-works/pi-ai";

export function snapshotImages(images: unknown): ImageContent[] | undefined {
  let index: number | undefined;
  try {
    if (images === undefined) return;
    if (!Array.isArray(images)) throw new Error();
    const length = images.length;
    if (!Number.isSafeInteger(length) || length < 0) throw new Error();
    const snapshot: ImageContent[] = [];
    for (index = 0; index < length; index++) {
      if (!Object.hasOwn(images, index)) throw new Error();
      const entry = images[index];
      if (entry === null || typeof entry !== "object" || Array.isArray(entry)) throw new Error();
      const { type, data, mimeType } = entry;
      if (type !== "image" || typeof data !== "string" || data.length === 0
        || typeof mimeType !== "string" || /\s/.test(mimeType) || !/^image\/[a-z0-9!#$%&'+.^_`|~-]+$/i.test(mimeType)
        || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)
        || Buffer.from(data, "base64").toString("base64") !== data) throw new Error();
      snapshot.push({ type, data, mimeType });
    }
    return snapshot;
  } catch {
    throw new Error(`Invalid images input${index === undefined ? "" : ` at index ${index}`}.`);
  }
}

export class ImageInputError extends Error {
  constructor(readonly stage: string, readonly cleanupFailed = false) {
    super(`Image input failed at ${stage}.${cleanupFailed ? " Image input cleanup failed." : ""}`);
    this.name = "ImageInputError";
  }
}

export function checkedImageDirectory(path: string, recursive = true): Stats {
  // Image ownership walks every component; Result-only guards check the leaf
  // and its resolved path without repeating the full ancestor walk.
  const absolute = resolve(path);
  if (recursive && dirname(absolute) !== absolute) checkedImageDirectory(dirname(absolute));
  const stat = lstatSync(absolute);
  if (!stat.isDirectory() || stat.isSymbolicLink() || relative(absolute, realpathSync(absolute)) !== "") throw new Error();
  return stat;
}

export function protectImageDirectory(path: string): void {
  if (process.platform !== "win32") {
    const stat = lstatSync(path);
    if (stat.uid !== process.getuid?.() || (stat.mode & 0o777) !== 0o700) throw new Error();
    return;
  }
  // Native Windows DACL, before any payload is written. The path travels on stdin,
  // never as a process argument, environment value, or generation launch spec.
  const encodedPath = Buffer.from(path, "utf8").toString("base64");
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "try {",
    `  $path = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPath}'))`,
    "  $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User",
    "  if ([IO.File]::GetAttributes($path) -band [IO.FileAttributes]::ReparsePoint) { throw 'redirected' }",
    "  $existing = [IO.Directory]::GetAccessControl($path)",
    "  if ($existing.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value) { throw 'owner' }",
    "  $acl = [Security.AccessControl.DirectorySecurity]::new()",
    "  $acl.SetOwner($sid)",
    "  $acl.SetAccessRuleProtection($true, $false)",
    "  $rule = [Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'ContainerInherit, ObjectInherit', 'None', 'Allow')",
    "  $acl.AddAccessRule($rule)",
    "  [IO.Directory]::SetAccessControl($path, $acl)",
    "  $actual = [IO.Directory]::GetAccessControl($path)",
    "  $rules = @($actual.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))",
    "  if (-not $actual.AreAccessRulesProtected -or $actual.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value -or $rules.Count -ne 1) { throw 'access' }",
    "  if ($rules[0].IdentityReference.Value -ne $sid.Value -or $rules[0].AccessControlType -ne 'Allow' -or $rules[0].FileSystemRights -ne 'FullControl') { throw 'access' }",
    "  [Console]::Out.Write('private')",
    "} catch { exit 1 }",
    "exit 0",
    "",
  ].join("\n");
  const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "Invoke-Expression ([Console]::In.ReadToEnd())"], {
    input: script, encoding: "utf8", windowsHide: true, timeout: 10000,
  });
  if (result.error || result.status !== 0 || result.stdout.trim() !== "private") throw new Error();
}


export type ImageLaunch = { subagentId: string; generation: number; resultPath: string; sessionFile: string };

export function imageLaunch(sessionFile: string, env = process.env): ImageLaunch {
  const subagentId = env.PI_HERDR_SUBAGENT_ID;
  const value = env.PI_HERDR_SUBAGENT_GENERATION;
  const generation = Number(value);
  const resultPath = env.PI_HERDR_SUBAGENT_RESULT_PATH;
  if (env.PI_HERDR_SUBAGENT_IMAGE_INPUT !== "1" || !subagentId
    || !/^(?:subagent-[1-9]\d*|[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(subagentId)
    || subagentId.length < 3 || subagentId.length > 52
    || !Number.isSafeInteger(generation) || generation < 1 || String(generation) !== value
    || !resultPath || !isAbsolute(resultPath) || resultPath !== resolve(resultPath)
    || !isAbsolute(sessionFile) || sessionFile !== resolve(sessionFile)
    || basename(dirname(sessionFile)) !== "tasks"
    || basename(sessionFile) !== subagentId + "-g1.jsonl"
    || resultPath !== join(dirname(sessionFile), subagentId + "-artifacts", "result-" + generation + ".json")) throw new ImageInputError("identity");
  try { checkedImageDirectory(dirname(resultPath)); } catch { throw new ImageInputError("storage"); }
  return { subagentId, generation, resultPath, sessionFile };
}

export function checkImageAccess(path: string, directory: boolean, expectedLinks = 1): void {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())
    || (!directory && stat.nlink !== expectedLinks) || relative(resolve(path), realpathSync(path)) !== "") throw new Error();
  if (process.platform !== "win32") {
    if (stat.uid !== process.getuid?.() || (stat.mode & 0o777) !== (directory ? 0o700 : 0o600)) throw new Error();
    return;
  }
  const script = [
    "$ErrorActionPreference = 'Stop'", "try {",
    "$path = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + Buffer.from(path, "utf8").toString("base64") + "'))",
    "$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User",
    "if ([IO.File]::GetAttributes($path) -band [IO.FileAttributes]::ReparsePoint) { throw 'redirected' }",
    directory ? "$acl = [IO.Directory]::GetAccessControl($path)" : "$acl = [IO.File]::GetAccessControl($path)",
    "$rules = @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))",
    "if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value -or $rules.Count -ne 1) { throw 'access' }",
    ...(directory ? ["if (-not $acl.AreAccessRulesProtected) { throw 'access' }"] : []),
    "if ($rules[0].IdentityReference.Value -ne $sid.Value -or $rules[0].AccessControlType -ne 'Allow' -or $rules[0].FileSystemRights -ne 'FullControl') { throw 'access' }",
    "[Console]::Out.Write('private')", "} catch { exit 1 }", "exit 0", "",
  ].join("\n");
  const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "Invoke-Expression ([Console]::In.ReadToEnd())"], {
    input: script, encoding: "utf8", windowsHide: true, timeout: 10000,
  });
  if (result.error || result.status !== 0 || result.stdout.trim() !== "private") throw new Error();
}

const sameFile = (a: Stats, b: Stats) => a.dev === b.dev && a.ino === b.ino;

// A bounded orphan cleanup: trusted launch layout plus private, nonredirected storage.
// No recursive deletion, payload parsing, or discovery outside this generation.
export function cleanupImages(launch: ImageLaunch): void {
  try {
    imageLaunch(launch.sessionFile, {
      PI_HERDR_SUBAGENT_IMAGE_INPUT: "1", PI_HERDR_SUBAGENT_ID: launch.subagentId,
      PI_HERDR_SUBAGENT_GENERATION: String(launch.generation), PI_HERDR_SUBAGENT_RESULT_PATH: launch.resultPath,
    });
    const directory = join(dirname(launch.resultPath), "image-input-" + launch.generation);
    if (!lstatSync(directory, { throwIfNoEntry: false })) return;
    const ownedDirectory = checkedImageDirectory(directory);
    checkImageAccess(directory, true);
    const names = readdirSync(directory);
    if (names.some(name => name !== "envelope.json" && name !== "envelope.tmp")) throw new Error();
    const files = names.map(name => {
      const path = join(directory, name);
      checkImageAccess(path, false);
      return { path, stat: lstatSync(path) };
    });
    const check = () => {
      checkedImageDirectory(dirname(launch.resultPath));
      if (!sameFile(checkedImageDirectory(directory), ownedDirectory)) throw new Error();
    };
    for (const file of files) {
      check();
      checkImageAccess(file.path, false);
      if (!sameFile(lstatSync(file.path), file.stat)) throw new Error();
      rmSync(file.path);
    }
    check();
    rmdirSync(directory);
  } catch { throw new ImageInputError("cleanup", true); }
}

// The caller reserves the attempt synchronously; this function never discovers input files.
export async function consumeImages(launch: ImageLaunch, active: () => boolean): Promise<ImageContent[]> {
  const directory = join(dirname(launch.resultPath), "image-input-" + launch.generation);
  const path = join(directory, "envelope.json");
  let stage = "storage";
  let ownedDirectory: Stats | undefined;
  let ownedFile: Stats | undefined;
  const check = () => {
    if (!active()) throw new ImageInputError("terminal");
    checkedImageDirectory(dirname(launch.resultPath));
    const currentDirectory = checkedImageDirectory(directory);
    const currentFile = lstatSync(path);
    if (!ownedDirectory || !ownedFile || !sameFile(currentDirectory, ownedDirectory) || !sameFile(currentFile, ownedFile)) throw new Error();
    checkImageAccess(directory, true);
    checkImageAccess(path, false);
  };
  const remove = () => {
    check();
    unlinkSync(path);
    rmdirSync(directory); // Only the exclusive generation directory, never recursive deletion.
    ownedFile = undefined;
  };
  try {
    if (!active()) throw new ImageInputError("terminal"); // Barrier before all image I/O.
    checkedImageDirectory(dirname(launch.resultPath));
    ownedDirectory = checkedImageDirectory(directory);
    ownedFile = lstatSync(path);
    check();
    if (readdirSync(directory).length !== 1) throw new Error();
    stage = "read";
    const file = await open(path, "r");
    let bytes: Buffer;
    try {
      check();
      if (!sameFile(await file.stat(), ownedFile!)) throw new Error();
      bytes = await file.readFile();
      check();
      if (!sameFile(await file.stat(), ownedFile!)) throw new Error();
    } finally { await file.close(); }
    stage = "envelope";
    const envelope = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope) || envelope.version !== 1) throw new Error();
    stage = "identity";
    if (envelope.subagentId !== launch.subagentId || envelope.generation !== launch.generation) throw new Error();
    stage = "encoding";
    const images = snapshotImages(envelope.images);
    if (!images?.length) throw new Error();
    stage = "cleanup";
    remove(); // Validated memory snapshot; deletion precedes SDK normalization/provider work.
    return images;
  } catch (error) {
    let cleanupFailed = false;
    if (ownedFile && ownedDirectory && active()) {
      try { remove(); } catch { cleanupFailed = true; }
    }
    throw new ImageInputError(error instanceof ImageInputError ? error.stage : stage, cleanupFailed);
  }
}

import { randomUUID } from "node:crypto";
import { linkSync, lstatSync, realpathSync, unlinkSync, type Stats } from "node:fs";
import { open } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { checkedImageDirectory, protectImageDirectory } from "./image-input.js";

export type ResultOperations = {
  writeFile(path: string, data: string): Promise<void>;
  rename(source: string, destination: string): void;
};
const sameFile = (a: Stats, b: Stats) => a.dev === b.dev && a.ino === b.ino;
const regular = (stat: Stats) => stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1;

// One publication protocol for completion, SDK failure, bootstrap failure and cancellation.
// Publication wins before cleanup; a private PID/UUID-v4 leftover is recoverable by the parent.
export function resultPublisher(path: string, validate = () => {}, operations?: ResultOperations) {
  let directory: Stats | undefined;
  let pending: { path: string; stat: Stats } | undefined;
  const check = () => {
    validate();
    const current = checkedImageDirectory(dirname(path));
    if (directory && !sameFile(directory, current)) throw new Error("Untrusted Result storage.");
    return current;
  };
  const cleanup = () => {
    if (!pending) return;
    try {
      check();
      const current = lstatSync(pending.path, { throwIfNoEntry: false });
      if (current) {
        if (!current.isFile() || current.isSymbolicLink() || !sameFile(current, pending.stat)) throw new Error();
        unlinkSync(pending.path);
      }
      pending = undefined;
    } catch {
      try { console.warn("Result temporary cleanup failed for the child generation."); } catch { /* Preserve publication. */ }
    }
  };
  return {
    cleanup,
    async publish(data: string) {
      cleanup();
      const current = check();
      if (!operations) {
        const existing = lstatSync(path, { throwIfNoEntry: false });
        if (existing) {
          if (!regular(existing) || relative(resolve(path), realpathSync(path)) !== "") throw new Error("Untrusted Result storage.");
          return; // Never create a competing temporary for an already published Result.
        }
      }
      if (!operations && !directory) {
        protectImageDirectory(dirname(path));
        directory = current;
        check();
      }
      const temporary = `${path}.${process.pid}-${randomUUID()}.tmp`;
      try {
        if (operations) {
          await operations.writeFile(temporary, data);
          check();
          const stat = lstatSync(temporary);
          if (!regular(stat)) throw new Error("Unsafe Result temporary.");
          pending = { path: temporary, stat };
        } else {
          const file = await open(temporary, "wx", 0o600);
          try {
            const stat = await file.stat();
            pending = { path: temporary, stat };
            if (!regular(stat) || !sameFile(stat, lstatSync(temporary))) throw new Error("Unsafe Result temporary.");
            check();
            await file.writeFile(data);
            check();
            if (!regular(await file.stat()) || !regular(lstatSync(temporary))
              || !sameFile(stat, await file.stat()) || !sameFile(stat, lstatSync(temporary))) throw new Error("Unsafe Result temporary.");
          } finally { await file.close(); }
        }
        check();
        const leaf = lstatSync(temporary);
        if (!regular(leaf) || !pending || !sameFile(leaf, pending.stat)) throw new Error("Unsafe Result temporary.");
        if (operations) operations.rename(temporary, path);
        else {
          try { linkSync(temporary, path); }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
            const stat = lstatSync(path);
            if (!regular(stat) || relative(resolve(path), realpathSync(path)) !== "") throw new Error("Untrusted Result storage.");
          }
        }
      } catch (error) { cleanup(); throw error; }
      cleanup();
    },
  };
}

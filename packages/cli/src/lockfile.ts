import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Lockfile, LockfileEntry } from "./types.js";

const LOCKFILE_NAME = ".pyx-lock.json";

function lockfilePath(): string {
  return join(process.cwd(), LOCKFILE_NAME);
}

function emptyLockfile(): Lockfile {
  return { version: 1, skills: {} };
}

export async function readLockfile(): Promise<Lockfile> {
  try {
    const raw = await readFile(lockfilePath(), "utf-8");
    const data = JSON.parse(raw) as Lockfile;
    if (data.version !== 1) {
      throw new Error(`Unsupported lockfile version: ${data.version}`);
    }
    return data;
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyLockfile();
    }
    throw err;
  }
}

export async function writeLockfile(data: Lockfile): Promise<void> {
  await writeFile(lockfilePath(), JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function addSkill(key: string, entry: LockfileEntry): Promise<void> {
  const lockfile = await readLockfile();
  lockfile.skills[key] = entry;
  await writeLockfile(lockfile);
}

export async function removeSkill(key: string): Promise<void> {
  const lockfile = await readLockfile();
  delete lockfile.skills[key];
  await writeLockfile(lockfile);
}

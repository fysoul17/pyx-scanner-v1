import { checkSkill } from "../api-client.js";
import { readLockfile } from "../lockfile.js";
import { printSkillList } from "../output.js";

export async function listCommand(): Promise<void> {
  const lockfile = await readLockfile();
  const keys = Object.keys(lockfile.skills);

  if (keys.length === 0) {
    console.log("\n  No skills tracked in .pyx-lock.json");
    console.log("  Use `pyx-scanner install <owner/name>` to add a skill.\n");
    return;
  }

  const skills: Array<{ key: string; status: string; version?: string }> = [];

  for (const key of keys) {
    const entry = lockfile.skills[key];
    try {
      const [owner, name] = key.split("/");
      const response = await checkSkill(owner, name);
      skills.push({
        key,
        status: response.skill?.status ?? entry.status,
        version: response.latestScan?.version ?? entry.version ?? undefined,
      });
    } catch {
      // Fall back to lockfile data if API is unreachable
      skills.push({
        key,
        status: entry.status,
        version: entry.version ?? undefined,
      });
    }
  }

  printSkillList(skills);
}

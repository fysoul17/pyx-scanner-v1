import { checkSkill } from "../api-client.js";
import { readLockfile, writeLockfile } from "../lockfile.js";
import { colorForStatus, printError, printSuccess } from "../output.js";
import type { LockfileEntry } from "../types.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const YELLOW = "\x1b[33m";
const GRAY = "\x1b[90m";

export async function upgradeCommand(): Promise<void> {
  const lockfile = await readLockfile();
  const keys = Object.keys(lockfile.skills);

  if (keys.length === 0) {
    console.log("\n  No skills tracked in .pyx-lock.json");
    console.log("  Use `pyx-scanner install <owner/name>` to add a skill.\n");
    return;
  }

  console.log(`\n  ${BOLD}Checking ${keys.length} skill(s) for updates...${RESET}\n`);

  let updatedCount = 0;

  for (const key of keys) {
    const entry = lockfile.skills[key];
    const [owner, name] = key.split("/");

    try {
      const response = await checkSkill(owner, name);
      const latestCommit = response.latestScan?.commit_hash ?? null;
      const latestVersion = response.latestScan?.version ?? null;
      const latestStatus = response.skill?.status ?? "unscanned";

      const hasNewScan = latestCommit !== null && latestCommit !== entry.commit;
      const statusChanged = latestStatus !== entry.status;

      if (hasNewScan || statusChanged) {
        const color = colorForStatus(latestStatus);
        const oldVersion = entry.version ?? "none";
        const newVersion = latestVersion ?? "none";

        console.log(`  ${YELLOW}↑${RESET} ${BOLD}${key}${RESET}`);
        if (hasNewScan) {
          console.log(`    ${DIM}commit:${RESET}  ${entry.commit?.slice(0, 8) ?? "none"} → ${latestCommit?.slice(0, 8) ?? "none"}`);
          console.log(`    ${DIM}version:${RESET} ${oldVersion} → ${newVersion}`);
        }
        if (statusChanged) {
          console.log(`    ${DIM}status:${RESET}  ${entry.status} → ${color}${latestStatus}${RESET}`);
        }
        console.log("");

        const updated: LockfileEntry = {
          version: latestVersion,
          commit: latestCommit,
          status: latestStatus,
          checkedAt: new Date().toISOString(),
        };
        lockfile.skills[key] = updated;
        updatedCount++;
      } else {
        console.log(`  ${GRAY}  ${key} — up to date${RESET}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      printError(`Failed to check ${key}: ${msg}`);
    }
  }

  await writeLockfile(lockfile);

  if (updatedCount > 0) {
    printSuccess(`Updated ${updatedCount} skill(s) in .pyx-lock.json`);
  } else {
    console.log(`\n  ${DIM}All skills are up to date.${RESET}\n`);
  }
}

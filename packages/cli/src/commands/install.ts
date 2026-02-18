import { checkSkill } from "../api-client.js";
import { addSkill } from "../lockfile.js";
import { printCheck, printSuccess, printError } from "../output.js";
import type { LockfileEntry } from "../types.js";

export async function installCommand(args: string[]): Promise<void> {
  const input = args[0];

  if (!input || !input.includes("/")) {
    printError("Usage: pyx-scanner install <owner/name>");
    console.log("  Example: pyx-scanner install anthropic/web-search\n");
    process.exitCode = 1;
    return;
  }

  const slashIndex = input.indexOf("/");
  const owner = input.slice(0, slashIndex);
  const name = input.slice(slashIndex + 1);

  if (!owner || !name) {
    printError("Invalid skill identifier. Use the format: owner/name");
    process.exitCode = 1;
    return;
  }

  const response = await checkSkill(owner, name);
  printCheck(response);

  const key = `${owner}/${name}`;
  const entry: LockfileEntry = {
    version: response.latestScan?.version ?? null,
    commit: response.latestScan?.commit_hash ?? null,
    status: response.skill?.status ?? "unscanned",
    checkedAt: new Date().toISOString(),
  };

  await addSkill(key, entry);
  printSuccess(`${key} added to .pyx-lock.json`);
}

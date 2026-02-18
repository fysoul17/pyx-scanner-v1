import { checkSkill } from "../api-client.js";
import { printCheck, printError } from "../output.js";

export async function checkCommand(args: string[]): Promise<void> {
  const input = args[0];

  if (!input || !input.includes("/")) {
    printError("Usage: pyx-scanner check <owner/name>");
    console.log("  Example: pyx-scanner check anthropic/web-search\n");
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
}

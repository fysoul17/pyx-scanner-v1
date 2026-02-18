#!/usr/bin/env node

import { checkCommand } from "./commands/check.js";
import { listCommand } from "./commands/list.js";
import { installCommand } from "./commands/install.js";
import { upgradeCommand } from "./commands/upgrade.js";
import { printError } from "./output.js";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function printHelp(): void {
  console.log(`
  ${BOLD}pyx-scanner${RESET} — AI agent skill security scanner

  ${BOLD}Usage:${RESET}
    pyx-scanner <command> [args]

  ${BOLD}Commands:${RESET}
    check <owner/name>    Check the trust status of a skill
    install <owner/name>  Add a skill to the lockfile
    list                  List all tracked skills
    upgrade               Check for updates to tracked skills
    help                  Show this help message

  ${BOLD}Options:${RESET}
    --help, -h            Show this help message

  ${BOLD}Environment:${RESET}
    PYX_API_URL           API base URL ${DIM}(default: https://scanner.pyxmate.com)${RESET}
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const commandArgs = args.slice(1);

  switch (command) {
    case "check":
      await checkCommand(commandArgs);
      break;
    case "install":
      await installCommand(commandArgs);
      break;
    case "list":
    case "ls":
      await listCommand();
      break;
    case "upgrade":
    case "update":
      await upgradeCommand();
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    case undefined:
      printHelp();
      break;
    default:
      printError(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
      break;
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  printError(msg);
  process.exitCode = 1;
});

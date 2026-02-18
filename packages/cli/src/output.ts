import type { CheckResponse, TrustStatus, Recommendation } from "./types.js";

// ANSI color codes
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const GRAY = "\x1b[90m";

export function colorForStatus(status: string): string {
  switch (status) {
    case "verified":
    case "safe":
      return GREEN;
    case "failed":
    case "danger":
      return RED;
    case "outdated":
    case "caution":
      return YELLOW;
    case "scanning":
      return BLUE;
    case "unscanned":
    case "unknown":
    default:
      return GRAY;
  }
}

function statusIcon(status: TrustStatus): string {
  switch (status) {
    case "verified":
      return GREEN + "✓" + RESET;
    case "failed":
      return RED + "✗" + RESET;
    case "outdated":
      return YELLOW + "!" + RESET;
    case "scanning":
      return BLUE + "⟳" + RESET;
    case "unscanned":
    default:
      return GRAY + "?" + RESET;
  }
}

function recommendationLabel(rec: Recommendation): string {
  const color = colorForStatus(rec);
  return color + BOLD + rec.toUpperCase() + RESET;
}

function riskBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  const color = score <= 3 ? GREEN : score <= 6 ? YELLOW : RED;
  return color + "█".repeat(filled) + GRAY + "░".repeat(empty) + RESET + ` ${score}/10`;
}

export function printCheck(response: CheckResponse): void {
  const { skill, latestScan, recommendation, isOutdated } = response;

  if (!skill) {
    console.log(`\n${GRAY}  Skill not found in registry.${RESET}\n`);
    return;
  }

  const key = `${skill.owner}/${skill.name}`;
  const statusColor = colorForStatus(skill.status);

  console.log("");
  console.log(`  ${BOLD}${key}${RESET}`);
  console.log(`  ${DIM}${"─".repeat(40)}${RESET}`);
  console.log(`  ${DIM}Status:${RESET}         ${statusIcon(skill.status)} ${statusColor}${skill.status}${RESET}`);
  console.log(`  ${DIM}Recommendation:${RESET} ${recommendationLabel(recommendation)}`);

  if (latestScan) {
    console.log(`  ${DIM}Risk Score:${RESET}     ${riskBar(latestScan.risk_score)}`);
    console.log(`  ${DIM}Commit:${RESET}         ${latestScan.commit_hash.slice(0, 8)}`);
    if (latestScan.version) {
      console.log(`  ${DIM}Version:${RESET}        ${latestScan.version}`);
    }
    console.log(`  ${DIM}Scanned:${RESET}        ${new Date(latestScan.scanned_at).toLocaleString()}`);
    console.log(`  ${DIM}Summary:${RESET}        ${latestScan.summary}`);
  } else {
    console.log(`  ${DIM}No scan results available.${RESET}`);
  }

  if (isOutdated) {
    console.log(`\n  ${YELLOW}⚠ This skill has been updated since the last scan.${RESET}`);
  }

  console.log("");
}

export function printSkillList(skills: Array<{ key: string; status: string; version?: string }>): void {
  if (skills.length === 0) {
    console.log(`\n${GRAY}  No skills tracked.${RESET}\n`);
    return;
  }

  const maxKeyLen = Math.max(...skills.map((s) => s.key.length), 4);

  console.log("");
  console.log(
    `  ${BOLD}${DIM}${"SKILL".padEnd(maxKeyLen + 2)}${"STATUS".padEnd(12)}VERSION${RESET}`
  );
  console.log(`  ${DIM}${"─".repeat(maxKeyLen + 2 + 12 + 10)}${RESET}`);

  for (const skill of skills) {
    const color = colorForStatus(skill.status);
    const key = skill.key.padEnd(maxKeyLen + 2);
    const status = (color + skill.status + RESET).padEnd(12 + color.length + RESET.length);
    const version = skill.version || GRAY + "—" + RESET;
    console.log(`  ${key}${status}${version}`);
  }

  console.log("");
}

export function printError(msg: string): void {
  console.error(`\n  ${RED}${BOLD}Error:${RESET} ${RED}${msg}${RESET}\n`);
}

export function printSuccess(msg: string): void {
  console.log(`\n  ${GREEN}${BOLD}✓${RESET} ${GREEN}${msg}${RESET}\n`);
}

#!/usr/bin/env npx tsx
/**
 * PYX Scanner — ClawHub skill importer
 *
 * Fetches skills from ClawHub registry, scans them with Claude,
 * and submits results to PYX Scanner API.
 *
 * Usage:
 *   npx tsx scripts/clawhub-import.ts [--trending|--new|--all] [--limit 50] [--skip 0] [--dry-run] [--model sonnet]
 *
 * Environment:
 *   PYX_ADMIN_API_KEY  — Required for live mode (Bearer token for admin API)
 *   PYX_API_URL        — Optional, defaults to https://scanner.pyxmate.com
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAnalysisPrompt,
  buildSystemPrompt,
  buildPreScanContext,
} from "./scan-prompt.js";
import { scanResultSchema } from "./scan-schema.js";
import {
  runClaude,
  validateAndFixOutput,
  RepoCodeCache,
  type ScanOutput,
  type CachedFile,
} from "./analyze.js";
import { runStaticRules, type StaticRulesResult } from "./static-rules.js";
import { runDepScan, type DepScanResult } from "./dep-scan.js";
import {
  listAllSkills,
  getSkill,
  getSkillFile,
  type SortOption,
  type ClawHubSkillDetail,
} from "./clawhub-client.js";
import type { ExternalScansData, ExternalScanProvider } from "../src/shared/types.js";
import { checkAlreadyScanned } from "./dedup.js";
import { withRetry, TransientError, isTransientStatus } from "./retry.js";

// Load .env from project root
try {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envFile = readFileSync(resolve(__dirname, "../.env"), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env not found — rely on shell environment
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_URL =
  process.env.PYX_API_URL ?? "https://scanner.pyxmate.com";
const ADMIN_KEY = process.env.PYX_ADMIN_API_KEY;
const MAX_CODE_BYTES = 200 * 1024; // 200KB

// Files to try fetching from ClawHub skills
const SKILL_FILES = [
  "SKILL.md",
  "index.ts",
  "index.js",
  "main.ts",
  "main.js",
  "index.py",
  "main.py",
  "package.json",
  "README.md",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchSkillCode(
  detail: ClawHubSkillDetail
): Promise<RepoCodeCache> {
  const cachedFiles: CachedFile[] = [];
  let totalBytes = 0;

  for (const filePath of SKILL_FILES) {
    if (totalBytes >= MAX_CODE_BYTES) {
      console.warn(
        `Truncated: ${MAX_CODE_BYTES / 1024}KB limit reached after ${cachedFiles.length} files`
      );
      break;
    }

    try {
      const content = await getSkillFile(
        detail.slug,
        filePath,
        detail.latest_version
      );

      const remaining = MAX_CODE_BYTES - totalBytes;
      const truncated =
        content.length > remaining
          ? content.slice(0, remaining) + "\n[... truncated]"
          : content;

      cachedFiles.push({ path: filePath, content: truncated });
      totalBytes += truncated.length;
    } catch {
      // File not found or fetch error — skip silently
    }
  }

  if (cachedFiles.length === 0) {
    throw new Error(`No files fetched for skill ${detail.slug}`);
  }

  console.log(
    `  Fetched ${cachedFiles.length} files (${(totalBytes / 1024).toFixed(1)}KB)`
  );
  return new RepoCodeCache(cachedFiles);
}

async function analyzeSkill(
  owner: string,
  skillName: string,
  cache: RepoCodeCache,
  model: string,
  preScanContext?: string
): Promise<ScanOutput> {
  const code = cache.getAllCode();
  const prompt = buildAnalysisPrompt(owner, skillName, code, preScanContext);
  const systemPrompt = buildSystemPrompt();

  console.log(
    `  Analyzing "${skillName}" (${cache.fileCount} files, ${(cache.totalBytes / 1024).toFixed(1)}KB)...`
  );
  const raw = (await runClaude(
    prompt,
    systemPrompt,
    scanResultSchema,
    model
  )) as unknown as ScanOutput;

  if (!raw.trust_status) {
    throw new Error(
      `Claude did not return valid scan output for skill "${skillName}"`
    );
  }

  return validateAndFixOutput(raw);
}

async function checkApiConnectivity(): Promise<void> {
  const url = `${API_URL}/api/v1/scan-result`;
  try {
    await fetch(url, { method: "OPTIONS" });
    // Any response (even 4xx) means the server is reachable
  } catch (err) {
    throw new Error(
      `Cannot reach API at ${API_URL} — is the server running?\n` +
        `  Cause: ${err instanceof Error ? err.message : err}\n` +
        `  If developing locally, start the dev server: pnpm dev\n` +
        `  Or set PYX_API_URL in .env to your deployed URL`
    );
  }
}

function mapScanStatus(status: string | undefined): "clean" | "suspicious" | "malware" | "unknown" {
  switch (status) {
    case "clean": return "clean";
    case "suspicious": return "suspicious";
    case "malicious": return "malware";
    default: return "unknown";
  }
}

function buildExternalScans(detail: ClawHubSkillDetail): ExternalScansData | null {
  const { security } = detail;
  if (!security && !detail.moderation) return null;

  const clawHubUrl = `https://clawhub.ai/skills/${detail.slug}`;
  const now = new Date().toISOString();

  // VirusTotal: prefer real vtAnalysis from Convex, fall back to moderation flags
  let vtStatus: "clean" | "suspicious" | "malware" | "unknown" | "not_available";
  let vtVerdict: string | null = null;
  let vtReportUrl: string | null = clawHubUrl;
  let vtCheckedAt: string | null = now;

  if (security?.vtAnalysis) {
    vtStatus = mapScanStatus(security.vtAnalysis.status);
    vtVerdict = security.vtAnalysis.analysis ?? security.vtAnalysis.verdict ?? null;
    vtCheckedAt = security.vtAnalysis.checkedAt
      ? new Date(security.vtAnalysis.checkedAt).toISOString()
      : now;
    if (security.sha256hash) {
      vtReportUrl = `https://www.virustotal.com/gui/file/${security.sha256hash}`;
    }
  } else if (detail.moderation) {
    const { isSuspicious, isMalwareBlocked } = detail.moderation;
    vtStatus = isMalwareBlocked ? "malware" : isSuspicious ? "suspicious" : "clean";
    vtVerdict = vtStatus === "clean" ? "No threats detected" : vtStatus === "malware" ? "Malware blocked" : "Suspicious activity flagged";
  } else {
    vtStatus = "not_available";
  }

  // OpenClaw: use real llmAnalysis from Convex
  let ocStatus: "clean" | "suspicious" | "malware" | "unknown" | "not_available" = "not_available";
  let ocVerdict: string | null = null;
  let ocConfidence: string | null = null;
  let ocCheckedAt: string | null = null;

  if (security?.llmAnalysis) {
    ocStatus = mapScanStatus(security.llmAnalysis.status);
    ocVerdict = security.llmAnalysis.summary ?? security.llmAnalysis.verdict ?? null;
    ocConfidence = security.llmAnalysis.confidence ?? null;
    ocCheckedAt = security.llmAnalysis.checkedAt
      ? new Date(security.llmAnalysis.checkedAt).toISOString()
      : now;
  }

  const providers: ExternalScanProvider[] = [
    {
      provider: "VirusTotal",
      status: vtStatus,
      verdict: vtVerdict,
      confidence: vtStatus === "malware" ? "high" : vtStatus === "suspicious" ? "medium" : vtStatus === "clean" ? "high" : null,
      report_url: vtReportUrl,
      checked_at: vtCheckedAt,
    },
    {
      provider: "OpenClaw",
      status: ocStatus,
      verdict: ocVerdict,
      confidence: ocConfidence,
      report_url: clawHubUrl,
      checked_at: ocCheckedAt,
    },
  ];

  return { providers, fetched_at: now };
}

async function submitResult(
  owner: string,
  skillName: string,
  detail: ClawHubSkillDetail,
  output: ScanOutput,
  model: string,
  preScanData?: {
    staticResult: StaticRulesResult;
    depResult: DepScanResult;
  }
): Promise<void> {
  // Merge static findings + external scans into details JSONB
  const externalScans = buildExternalScans(detail);
  const enrichedDetails = {
    ...output.details,
    ...(preScanData
      ? {
          static_findings: preScanData.staticResult.findings,
          static_summary: preScanData.staticResult.summary,
          static_findings_assessment: output.static_findings_assessment,
        }
      : {}),
    ...(externalScans ? { external_scans: externalScans } : {}),
  };

  const payload = {
    owner,
    name: skillName,
    description: detail.description,
    commit_hash: detail.latest_version,
    version: detail.latest_version,
    trust_status: output.trust_status,
    recommendation: output.recommendation,
    risk_score: output.risk_score,
    summary: output.summary,
    details: enrichedDetails,
    skill_about: output.skill_about,
    confidence: output.confidence,
    dependency_vulnerabilities: preScanData?.depResult.vulnerabilities ?? null,
    intent: output.intent,
    category: output.category,
    model,
    source: "clawhub" as const,
    clawhub_slug: detail.slug,
    clawhub_version: detail.latest_version,
    clawhub_content_hash: null,
    clawhub_downloads: detail.downloads,
    clawhub_stars: detail.stars,
    clawhub_url: `https://clawhub.ai/skills/${detail.slug}`,
  };

  const url = `${API_URL}/api/v1/scan-result`;

  const data = await withRetry(
    async () => {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ADMIN_KEY}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        throw new TransientError(
          `Failed to reach ${url}: ${err instanceof Error ? err.message : err}`,
          err
        );
      }

      if (!res.ok) {
        const body = await res.text();
        if (isTransientStatus(res.status)) {
          throw new TransientError(`API returned ${res.status}: ${body}`);
        }
        throw new Error(`API returned ${res.status}: ${body}`);
      }

      return res.json();
    },
    { label: `submit ${owner}/${skillName}` }
  );

  console.log(`  Result submitted:`, data);
}

// ---------------------------------------------------------------------------
// Main import flow
// ---------------------------------------------------------------------------

export async function processSkill(
  slug: string,
  dryRun: boolean,
  force: boolean,
  model: string
): Promise<"processed" | "skipped"> {
  // Fetch full detail (includes owner, which is not on list items)
  const detail = await getSkill(slug);
  const ownerHandle = detail.owner.handle;
  const skillName = detail.name;

  console.log(`\n--- Processing: ${ownerHandle}/${skillName} (${slug}) ---`);

  // Check if already scanned (use latest_version as commit_hash for ClawHub skills)
  if (!force && !dryRun) {
    const alreadyScanned = await checkAlreadyScanned(ownerHandle, skillName, detail.latest_version);
    if (alreadyScanned) {
      console.log(`  Skipping: already scanned at version ${detail.latest_version}`);
      return "skipped";
    }
  }

  // Fetch and assemble code
  const cache = await fetchSkillCode(detail);

  // Run pre-scans (deterministic checks)
  const files = cache.getFiles();
  console.log("  Running pre-scans...");
  const staticResult = runStaticRules(files);
  console.log(
    `  Static rules: ${staticResult.summary.critical} critical, ${staticResult.summary.warning} warning, ${staticResult.summary.info} info`
  );
  const depResult = await runDepScan(files);
  if (depResult.error) {
    console.warn(`  Dep scan warning: ${depResult.error}`);
  } else {
    console.log(
      `  Dep scan: ${depResult.vulnerabilities.length} vulns in ${depResult.scanned_packages} packages`
    );
  }
  const preScanContext = buildPreScanContext(staticResult, depResult);
  const preScanData = { staticResult, depResult };

  // Run Claude analysis with pre-scan context
  const output = await analyzeSkill(ownerHandle, skillName, cache, model, preScanContext);

  if (dryRun) {
    const externalScans = buildExternalScans(detail);
    const enrichedDetails = {
      ...output.details,
      static_findings: staticResult.findings,
      static_summary: staticResult.summary,
      static_findings_assessment: output.static_findings_assessment,
      ...(externalScans ? { external_scans: externalScans } : {}),
    };
    console.log(`\n  DRY RUN — Payload:\n`);
    console.log(
      JSON.stringify(
        {
          owner: ownerHandle,
          name: skillName,
          description: detail.description,
          slug: detail.slug,
          version: detail.latest_version,
          trust_status: output.trust_status,
          recommendation: output.recommendation,
          risk_score: output.risk_score,
          confidence: output.confidence,
          summary: output.summary,
          details: enrichedDetails,
          dependency_vulnerabilities: depResult.vulnerabilities,
          skill_about: output.skill_about,
          category: output.category,
        },
        null,
        2
      )
    );
    return "processed";
  }

  await submitResult(ownerHandle, skillName, detail, output, model, preScanData);
  return "processed";
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.log(`
Usage: npx tsx scripts/clawhub-import.ts [options]

Options:
  --slug <slug>     Scan a single skill by ClawHub slug
  --trending        Sort by trending (default)
  --new             Sort by most recently updated
  --all             Sort by downloads (highest first)
  --limit <n>       Max skills to process (default: 50)
  --skip <n>        Skip first N skills (for resuming, default: 0)
  --dry-run         Print payloads instead of submitting
  --force           Re-scan even if version was already scanned
  --model <model>   Claude model (default: sonnet)
                    Accepts: opus, sonnet, haiku

Environment:
  PYX_ADMIN_API_KEY   Bearer token for admin API (required for live mode)
  PYX_API_URL         API base URL (default: https://scanner.pyxmate.com)

Examples:
  npx tsx scripts/clawhub-import.ts --slug pyx-scan --force
  npx tsx scripts/clawhub-import.ts --trending --limit 5 --dry-run
  npx tsx scripts/clawhub-import.ts --new --limit 20 --model sonnet
  npx tsx scripts/clawhub-import.ts --trending --limit 10 --skip 5   # resume after 5
`);
}

function parseArgs(argv: string[]): {
  sort: SortOption;
  limit: number;
  skip: number;
  dryRun: boolean;
  force: boolean;
  model: string;
  slug: string | null;
} {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let sort: SortOption = "trending";
  let limit = 50;
  let skip = 0;
  let dryRun = false;
  let force = false;
  let model = "sonnet";
  let slug: string | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--trending":
        sort = "trending";
        break;
      case "--new":
        sort = "updated";
        break;
      case "--all":
        sort = "downloads";
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--force":
        force = true;
        break;
      case "--limit":
        i++;
        limit = parseInt(args[i], 10);
        if (isNaN(limit) || limit <= 0) {
          console.error("Error: --limit must be a positive integer");
          process.exit(1);
        }
        break;
      case "--skip":
        i++;
        skip = parseInt(args[i], 10);
        if (isNaN(skip) || skip < 0) {
          console.error("Error: --skip must be a non-negative integer");
          process.exit(1);
        }
        break;
      case "--model":
        i++;
        if (!args[i] || !["opus", "sonnet", "haiku"].includes(args[i])) {
          console.error('Error: --model must be "opus", "sonnet", or "haiku"');
          process.exit(1);
        }
        model = args[i];
        break;
      case "--slug":
        i++;
        if (!args[i] || args[i].startsWith("--")) {
          console.error("Error: --slug requires a value (e.g., --slug pyx-scan)");
          process.exit(1);
        }
        slug = args[i];
        break;
      default:
        console.error(`Error: unknown argument "${args[i]}"`);
        printUsage();
        process.exit(1);
    }
  }

  return { sort, limit, skip, dryRun, force, model, slug };
}

async function main(): Promise<void> {
  const { sort, limit, skip, dryRun, force, model, slug } = parseArgs(
    process.argv
  );

  if (!dryRun && !ADMIN_KEY) {
    console.error(
      "Error: PYX_ADMIN_API_KEY is required for live mode. Use --dry-run to preview."
    );
    process.exit(1);
  }

  // Pre-flight: verify the API is reachable before processing any skills
  if (!dryRun) {
    await checkApiConnectivity();
  }

  // Drain pending queue jobs first (best-effort)
  try {
    const { drainQueue } = await import("./process-queue.js");
    const queueCount = await drainQueue({ dryRun, force, model, limit: 50 });
    if (queueCount > 0) {
      console.log(`\nProcessed ${queueCount} queued scan request(s) before main import.\n`);
    }
  } catch {
    // Queue drain is best-effort — missing env vars (SUPABASE_URL) shouldn't block CLI
  }

  // Single-skill mode: scan one skill by slug and exit
  if (slug) {
    console.log(
      `\nClawHub Import — slug: ${slug}, model: ${model}, dry-run: ${dryRun}, force: ${force}`
    );
    if (force) console.log("Force mode: will re-scan even if already scanned");

    try {
      const result = await processSkill(slug, dryRun, force, model);
      console.log(
        result === "skipped"
          ? `\nSkipped: ${slug} (already scanned, use --force to re-scan)`
          : `\nDone! Processed: ${slug}`
      );
    } catch (err) {
      console.error(
        `\nError processing ${slug}:`,
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
    return;
  }

  // Batch mode: process skills from ClawHub listings
  console.log(
    `\nClawHub Import — sort: ${sort}, limit: ${limit}, skip: ${skip}, model: ${model}, dry-run: ${dryRun}, force: ${force}`
  );
  if (force) console.log("Force mode: will re-scan even if already scanned");
  console.log("Fetching skills from ClawHub...\n");

  let seen = 0;
  let processed = 0;
  let failed = 0;
  let dedupSkipped = 0;

  // Fetch enough skills to cover skip + limit
  const totalNeeded = skip + limit;

  for await (const batch of listAllSkills(sort, 50, totalNeeded)) {
    for (const skill of batch) {
      seen++;

      if (seen <= skip) {
        console.log(`  Skipping ${seen}/${skip}: ${skill.slug}`);
        continue;
      }

      try {
        const result = await processSkill(skill.slug, dryRun, force, model);
        if (result === "skipped") {
          dedupSkipped++;
        } else {
          processed++;
        }
      } catch (err) {
        console.error(
          `  Error processing ${skill.slug}:`,
          err instanceof Error ? err.message : err
        );
        failed++;
      }
    }
  }

  console.log(
    `\nDone! Processed: ${processed}, Failed: ${failed}, Already scanned: ${dedupSkipped}, Skipped (offset): ${skip}, Total seen: ${seen}`
  );
}

main().catch((err) => {
  console.error("Import failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

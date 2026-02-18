#!/usr/bin/env npx tsx
/**
 * PYX Scanner — Queue consumer
 *
 * Drains scan_jobs where status='queued', dispatching each to the
 * appropriate scanner (GitHub or ClawHub).
 *
 * Usage:
 *   pnpm scan:queue [--dry-run] [--force] [--model sonnet] [--limit 10]
 *
 * Environment:
 *   SUPABASE_URL              — Required
 *   SUPABASE_SERVICE_ROLE_KEY — Required
 *   PYX_ADMIN_API_KEY         — Required for live mode
 *   PYX_API_URL               — Optional (default: https://scanner.pyxmate.com)
 *   GITHUB_TOKEN              — Optional, recommended for GitHub scans
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

const STALE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// ---------------------------------------------------------------------------
// Core queue processing
// ---------------------------------------------------------------------------

interface QueuedJob {
  id: string;
  skill_id: string;
  source: string | null;
  status: string;
  created_at: string;
  skill: {
    owner: string;
    name: string;
    repo: string | null;
    source: string;
    clawhub_slug: string | null;
  };
}

async function resetStaleJobs(db: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_TIMEOUT_MS).toISOString();

  const { data, error } = await db
    .from("scan_jobs")
    .update({
      status: "queued",
      started_at: null,
      error_message: null,
    })
    .eq("status", "running")
    .lt("started_at", cutoff)
    .select("id");

  if (error) {
    console.warn(`Warning: failed to reset stale jobs: ${error.message}`);
    return 0;
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.log(`Reset ${count} stale running job(s) back to queued`);
  }
  return count;
}

async function fetchQueuedJobs(
  db: SupabaseClient,
  limit: number
): Promise<QueuedJob[]> {
  const { data, error } = await db
    .from("scan_jobs")
    .select(
      `
      id,
      skill_id,
      source,
      status,
      created_at,
      skill:skills!inner (
        owner,
        name,
        repo,
        source,
        clawhub_slug
      )
    `
    )
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch queued jobs: ${error.message}`);
  }

  // Supabase returns skill as an object (not array) due to !inner
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    skill: row.skill as QueuedJob["skill"],
  })) as QueuedJob[];
}

async function markRunning(
  db: SupabaseClient,
  jobId: string,
  model: string
): Promise<void> {
  const { error } = await db
    .from("scan_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      model,
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to mark job ${jobId} as running: ${error.message}`);
  }
}

async function markCompleted(
  db: SupabaseClient,
  jobId: string
): Promise<void> {
  const { error } = await db
    .from("scan_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    console.warn(
      `Warning: failed to mark job ${jobId} as completed: ${error.message}`
    );
  }
}

async function markFailed(
  db: SupabaseClient,
  jobId: string,
  errorMessage: string
): Promise<void> {
  const { error } = await db
    .from("scan_jobs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: errorMessage.slice(0, 2000),
    })
    .eq("id", jobId);

  if (error) {
    console.warn(
      `Warning: failed to mark job ${jobId} as failed: ${error.message}`
    );
  }
}

async function processJob(
  job: QueuedJob,
  db: SupabaseClient,
  options: { dryRun: boolean; force: boolean; model: string }
): Promise<void> {
  const { owner, name, repo, clawhub_slug } = job.skill;
  const source = job.source ?? job.skill.source;
  const { dryRun, force, model } = options;

  console.log(`\n=== Processing job ${job.id.slice(0, 8)} — ${owner}/${name} (${source}) ===`);

  if (!dryRun) {
    await markRunning(db, job.id, model);
  }

  try {
    if (source === "clawhub") {
      const slug = clawhub_slug ?? `${owner}/${name}`;
      const { processSkill: processClawHubSkill } = await import("./clawhub-import.js");
      await processClawHubSkill(slug, dryRun, force, model);
    } else {
      // GitHub source
      const repoName = repo ? repo.split("/")[1] || name : name;
      const repoOwner = repo ? repo.split("/")[0] || owner : owner;
      const { scanGitHubRepo } = await import("./scan.js");
      await scanGitHubRepo(repoOwner, repoName, { dryRun, force, model });
    }

    if (!dryRun) {
      await markCompleted(db, job.id);
    }
    console.log(`Job ${job.id.slice(0, 8)}: completed`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Job ${job.id.slice(0, 8)}: failed — ${message}`);

    if (!dryRun) {
      await markFailed(db, job.id, message);
    }
  }
}

/**
 * Drain the scan queue — process all queued jobs up to limit.
 * Exported for use by other scripts (clawhub-import, scan).
 *
 * @returns Number of jobs processed
 */
export async function drainQueue(options: {
  dryRun?: boolean;
  force?: boolean;
  model?: string;
  limit?: number;
}): Promise<number> {
  const {
    dryRun = false,
    force = false,
    model = "sonnet",
    limit = 50,
  } = options;

  const db = getSupabase();

  // Reset stale running jobs first
  await resetStaleJobs(db);

  const jobs = await fetchQueuedJobs(db, limit);
  if (jobs.length === 0) {
    console.log("No queued scan jobs found.");
    return 0;
  }

  console.log(`Found ${jobs.length} queued job(s) to process`);

  for (const job of jobs) {
    await processJob(job, db, { dryRun, force, model });
  }

  console.log(`\nQueue drain complete: processed ${jobs.length} job(s)`);
  return jobs.length;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.log(`
Usage: pnpm scan:queue [options]

Options:
  --dry-run         Process jobs without submitting results or updating status
  --force           Re-scan even if already scanned at current version/commit
  --model <model>   Claude model to use (default: sonnet)
                    Accepts: opus, sonnet, haiku
  --limit <n>       Max jobs to process (default: 50)

Environment:
  SUPABASE_URL               Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY  Service role key (bypasses RLS)
  PYX_ADMIN_API_KEY          Bearer token for scan-result API (required for live mode)
  PYX_API_URL                API base URL (default: https://scanner.pyxmate.com)
  GITHUB_TOKEN               GitHub PAT for higher rate limits (recommended)

Examples:
  pnpm scan:queue --dry-run
  pnpm scan:queue --limit 5 --model sonnet
  pnpm scan:queue --force --limit 1
`);
}

function parseArgs(argv: string[]): {
  dryRun: boolean;
  force: boolean;
  model: string;
  limit: number;
} {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let dryRun = false;
  let force = false;
  let model = "sonnet";
  let limit = 50;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--dry-run":
        dryRun = true;
        break;
      case "--force":
        force = true;
        break;
      case "--model":
        i++;
        if (!args[i] || !["opus", "sonnet", "haiku"].includes(args[i])) {
          console.error('Error: --model must be "opus", "sonnet", or "haiku"');
          process.exit(1);
        }
        model = args[i];
        break;
      case "--limit":
        i++;
        limit = parseInt(args[i], 10);
        if (isNaN(limit) || limit <= 0) {
          console.error("Error: --limit must be a positive integer");
          process.exit(1);
        }
        break;
      default:
        console.error(`Error: unknown argument "${args[i]}"`);
        printUsage();
        process.exit(1);
    }
  }

  return { dryRun, force, model, limit };
}

async function main(): Promise<void> {
  const { dryRun, force, model, limit } = parseArgs(process.argv);

  console.log(
    `\nPYX Scanner — Queue Consumer\n` +
      `  model: ${model}, limit: ${limit}, dry-run: ${dryRun}, force: ${force}`
  );

  await drainQueue({ dryRun, force, model, limit });
}

// Only run CLI when executed directly (not when imported by other scripts)
const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(dirname(fileURLToPath(import.meta.url)), "process-queue.ts");

if (isDirectRun) {
  main().catch((err) => {
    console.error(
      "Queue processing failed:",
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  });
}

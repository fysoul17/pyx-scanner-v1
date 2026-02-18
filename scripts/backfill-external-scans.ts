#!/usr/bin/env npx tsx
/**
 * Backfill external scan data (VirusTotal + OpenClaw) for existing ClawHub skills.
 *
 * Fetches moderation flags from ClawHub API and patches the `details` JSONB
 * on existing scan_results records. No re-scanning needed.
 *
 * Usage:
 *   npx tsx scripts/backfill-external-scans.ts [--dry-run] [--limit 50]
 *
 * Environment:
 *   SUPABASE_URL              — Required
 *   SUPABASE_SERVICE_ROLE_KEY — Required
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSkill, type ClawHubSkillDetail } from "./clawhub-client.js";
import type { ExternalScansData, ExternalScanProvider } from "../src/shared/types.js";

// Load .env
try {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envFile = readFileSync(resolve(__dirname, "../.env"), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env not found
}

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
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

  let vtStatus: "clean" | "suspicious" | "malware" | "unknown" | "not_available";
  let vtVerdict: string | null = null;
  let vtReportUrl: string | null = clawHubUrl;
  let vtCheckedAt: string | null = now;

  if (security?.vtAnalysis) {
    vtStatus = mapScanStatus(security.vtAnalysis.status);
    vtVerdict = security.vtAnalysis.analysis ?? security.vtAnalysis.verdict ?? null;
    vtCheckedAt = security.vtAnalysis.checkedAt ? new Date(security.vtAnalysis.checkedAt).toISOString() : now;
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

  let ocStatus: "clean" | "suspicious" | "malware" | "unknown" | "not_available" = "not_available";
  let ocVerdict: string | null = null;
  let ocConfidence: string | null = null;
  let ocCheckedAt: string | null = null;

  if (security?.llmAnalysis) {
    ocStatus = mapScanStatus(security.llmAnalysis.status);
    ocVerdict = security.llmAnalysis.summary ?? security.llmAnalysis.verdict ?? null;
    ocConfidence = security.llmAnalysis.confidence ?? null;
    ocCheckedAt = security.llmAnalysis.checkedAt ? new Date(security.llmAnalysis.checkedAt).toISOString() : now;
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 9999;

  const supabase = getSupabase();

  // Fetch all ClawHub skills with their latest scan result
  console.log("Fetching ClawHub skills from database...");
  const { data: skills, error } = await supabase
    .from("skills")
    .select("id, owner, name, clawhub_slug")
    .eq("source", "clawhub")
    .not("clawhub_slug", "is", null)
    .limit(limit);

  if (error) {
    console.error("Failed to fetch skills:", error.message);
    process.exit(1);
  }

  console.log(`Found ${skills.length} ClawHub skills to backfill\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let alreadyHasData = 0;

  for (const skill of skills) {
    const slug = skill.clawhub_slug;
    console.log(`[${updated + skipped + failed + alreadyHasData + 1}/${skills.length}] ${skill.owner}/${skill.name} (${slug})`);

    // Get the latest scan result for this skill
    const { data: scanResult, error: scanError } = await supabase
      .from("scan_results")
      .select("id, details")
      .eq("skill_id", skill.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (scanError || !scanResult) {
      console.log("  No scan result found, skipping");
      skipped++;
      continue;
    }

    // Check if already has external_scans
    const details = (scanResult.details as Record<string, unknown>) ?? {};
    if (details.external_scans) {
      console.log("  Already has external_scans, skipping");
      alreadyHasData++;
      continue;
    }

    // Fetch full detail (includes security data from Convex)
    try {
      const detail = await getSkill(slug);
      const externalScans = buildExternalScans(detail);

      if (!externalScans) {
        console.log("  No security data from ClawHub, skipping");
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log("  DRY RUN — would write:", JSON.stringify(externalScans, null, 2));
      } else {
        const updatedDetails = { ...details, external_scans: externalScans };
        const { error: updateError } = await supabase
          .from("scan_results")
          .update({ details: updatedDetails })
          .eq("id", scanResult.id);

        if (updateError) {
          console.error("  Update failed:", updateError.message);
          failed++;
          continue;
        }
        console.log(`  Updated: VT=${externalScans.providers[0].status}, OC=${externalScans.providers[1].status}`);
      }
      updated++;
    } catch (err) {
      console.error(`  ClawHub fetch failed:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}, Already had data: ${alreadyHasData}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error("Backfill failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

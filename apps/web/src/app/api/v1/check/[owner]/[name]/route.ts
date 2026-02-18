import { checkSkill } from "@lib/queries/check";
import { getAdminClient } from "@lib/supabase";
import { toTrustScore } from "@lib/queries/landing";
import { CORS_HEADERS, corsOptions } from "../../../_lib/cors";
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "../../../_lib/rate-limit";
import type { PublicCheckResponse } from "../../../_lib/types";
import type { JobStatus } from "@shared/types";

const VALID_NAME = /^[a-zA-Z0-9._-]{1,100}$/;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://scanner.pyxmate.com";
const MAX_QUEUED_JOBS = 500; // Global cap to prevent queue flooding

export async function OPTIONS() {
  return corsOptions();
}

/** Verify a GitHub repo exists with a lightweight HEAD request. */
async function githubRepoExists(owner: string, name: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      method: "HEAD",
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "pyx-scanner/1.0",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      signal: AbortSignal.timeout(5000),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Auto-queue a scan for an unknown skill.
 * Verifies the repo exists on GitHub, checks queue depth,
 * then upserts the skill and creates a queued scan job.
 */
async function autoQueueScan(
  owner: string,
  name: string
): Promise<{ job_id: string; status: JobStatus } | null> {
  try {
    // Verify the GitHub repo actually exists before creating DB rows
    if (!(await githubRepoExists(owner, name))) return null;

    const db = getAdminClient();

    // Check global queue depth cap
    const { count, error: countError } = await db
      .from("scan_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued");

    if (countError || (count !== null && count >= MAX_QUEUED_JOBS)) return null;

    // Upsert skill
    const { data: skill, error: skillError } = await db
      .from("skills")
      .upsert(
        {
          owner,
          name,
          source: "github",
          repository_url: `https://github.com/${owner}/${name}`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner,name" }
      )
      .select("id")
      .single();

    if (skillError || !skill) return null;

    // Check for existing queued/running job (dedup)
    const { data: existingJob } = await db
      .from("scan_jobs")
      .select("id, status")
      .eq("skill_id", skill.id)
      .in("status", ["queued", "running"])
      .limit(1)
      .maybeSingle();

    if (existingJob) {
      return { job_id: existingJob.id, status: existingJob.status as JobStatus };
    }

    // Create scan job
    const { data: job, error: jobError } = await db
      .from("scan_jobs")
      .insert({
        skill_id: skill.id,
        status: "queued",
        source: "github",
      })
      .select("id")
      .single();

    if (jobError || !job) return null;

    return { job_id: job.id, status: "queued" };
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const { owner: rawOwner, name: rawName } = await params;
  const owner = decodeURIComponent(rawOwner);
  const name = decodeURIComponent(rawName);

  // Validate input format early (before any DB calls)
  if (!owner || !name || !VALID_NAME.test(owner) || !VALID_NAME.test(name)) {
    return Response.json(
      { error: "Invalid or missing owner/name" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Rate limiting
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, RATE_LIMITS.check);
  if (!rl.allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { ...CORS_HEADERS, ...rateLimitHeaders(rl) } }
    );
  }

  try {
    const result = await checkSkill(owner, name);

    if (!result.skill) {
      // Apply stricter rate limit for auto-queue (prevents queue flooding)
      const scanRl = checkRateLimit(ip, RATE_LIMITS.scan);
      if (!scanRl.allowed) {
        return Response.json(
          { error: "Skill not found" },
          { status: 404, headers: { ...CORS_HEADERS, ...rateLimitHeaders(scanRl) } }
        );
      }

      // Auto-queue a scan for this unknown skill
      const queued = await autoQueueScan(owner, name);
      if (queued) {
        const response: PublicCheckResponse = {
          safe: false,
          status: "unscanned",
          recommendation: "unknown",
          owner,
          name,
          risk_score: null,
          trust_score: null,
          confidence: null,
          scanned_commit: null,
          latest_commit: null,
          is_outdated: false,
          last_safe_commit: null,
          last_safe_version: null,
          intent: null,
          summary: null,
          about: null,
          scanned_at: null,
          detail_url: `${BASE_URL}/s/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
          badge_url: `${BASE_URL}/api/v1/badge/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
          category: null,
          repository_url: `https://github.com/${owner}/${name}`,
          queued: true,
          job_id: queued.job_id,
        };

        return Response.json(response, {
          status: 202,
          headers: {
            ...CORS_HEADERS,
            ...rateLimitHeaders(scanRl),
            "Cache-Control": "no-store",
          },
        });
      }

      // Fallback: repo doesn't exist, queue full, or DB error
      return Response.json(
        { error: "Skill not found" },
        {
          status: 404,
          headers: {
            ...CORS_HEADERS,
            ...rateLimitHeaders(rl),
            "Cache-Control": "public, max-age=60",
          },
        }
      );
    }

    const { skill, latestScan, recommendation, latestCommit, isOutdated } = result;

    const response: PublicCheckResponse = {
      safe: recommendation === "safe" && !isOutdated,
      status: skill.status,
      recommendation,
      owner: skill.owner,
      name: skill.name,
      risk_score: latestScan?.risk_score ?? null,
      trust_score: toTrustScore(latestScan?.risk_score ?? null),
      confidence: latestScan?.confidence ?? null,
      scanned_commit: skill.latest_scan_commit,
      latest_commit: latestCommit,
      is_outdated: isOutdated,
      last_safe_commit: skill.last_safe_commit,
      last_safe_version: skill.last_safe_version,
      intent: latestScan?.intent ?? null,
      summary: latestScan?.summary ?? null,
      about: latestScan?.skill_about ?? null,
      scanned_at: latestScan?.scanned_at ?? null,
      detail_url: `${BASE_URL}/s/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
      badge_url: `${BASE_URL}/api/v1/badge/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
      category: skill.category ?? null,
      repository_url: skill.repository_url,
    };

    return Response.json(response, {
      headers: {
        ...CORS_HEADERS,
        ...rateLimitHeaders(rl),
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: { ...CORS_HEADERS, ...rateLimitHeaders(rl) } }
    );
  }
}

import { cache } from "react";
import { getAdminClient } from "@lib/supabase";
import { QueryError } from "./error";
import type { TrustStatus, SkillCategory } from "@shared/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillWithScan {
  id: string;
  owner: string;
  name: string;
  repo: string | null;
  description: string | null;
  status: TrustStatus;
  category: SkillCategory | null;
  risk_score: number | null;
  summary: string | null;
  recommendation: string | null;
  details: Record<string, unknown> | null;
  scanned_at: string | null;
  github_stars: number | null;
  clawhub_downloads: number | null;
  clawhub_stars: number | null;
}

export interface LandingStats {
  skillsScanned: number;
  totalScans: number;
  passRate: number;
  threatsCaught: number;
  clawHubSkillsScanned: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert risk_score (0-10, lower=safer) to trust score (0-100, higher=safer) */
export function toTrustScore(riskScore: number | null): number | null {
  if (riskScore == null) return null;
  return Math.round((10 - riskScore) * 10);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ScanRow {
  risk_score: number;
  summary: string;
  recommendation: string;
  details: Record<string, unknown> | null;
  scanned_at: string;
}

const SKILL_WITH_SCANS_SELECT =
  "id, owner, name, repo, description, status, category, updated_at, github_stars, clawhub_downloads, clawhub_stars, scan_results(risk_score, summary, recommendation, details, scanned_at)";

function mapSkillRows(
  rows: Array<Record<string, unknown>>,
): SkillWithScan[] {
  return rows.map((skill) => {
    const scans = skill.scan_results as unknown as ScanRow[];
    // Pick the most recent scan (ordered by scanned_at DESC in query)
    const latest = scans?.[0] ?? null;

    return {
      id: skill.id as string,
      owner: skill.owner as string,
      name: skill.name as string,
      repo: (skill.repo as string | null) ?? null,
      description: skill.description as string | null,
      status: skill.status as TrustStatus,
      category: (skill.category as SkillCategory | null) ?? null,
      risk_score: latest?.risk_score ?? null,
      summary: latest?.summary ?? null,
      recommendation: latest?.recommendation ?? null,
      details: latest?.details ?? null,
      scanned_at: latest?.scanned_at ?? null,
      github_stars: (skill.github_stars as number | null) ?? null,
      clawhub_downloads: (skill.clawhub_downloads as number | null) ?? null,
      clawhub_stars: (skill.clawhub_stars as number | null) ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch non-failed/non-caution skills with their latest scan result for the BentoGrid.
 * Returns most recently updated skills first.
 */
async function _getRecentSkillsWithScans(): Promise<SkillWithScan[]> {
  const { data, error } = await getAdminClient()
    .from("skills")
    .select(SKILL_WITH_SCANS_SELECT)
    .not("status", "in", "(failed,caution)")
    .order("updated_at", { ascending: false })
    .order("scanned_at", { ascending: false, referencedTable: "scan_results" })
    .limit(6);

  if (error) {
    throw new QueryError(error.message, 500);
  }

  return mapSkillRows(data || []);
}

export const getRecentSkillsWithScans = cache(_getRecentSkillsWithScans);

/**
 * Fetch caution skills with their latest scan result for the CautionSection.
 */
async function _getCautionSkillsWithScans(): Promise<SkillWithScan[]> {
  const { data, error } = await getAdminClient()
    .from("skills")
    .select(SKILL_WITH_SCANS_SELECT)
    .eq("status", "caution")
    .order("updated_at", { ascending: false })
    .order("scanned_at", { ascending: false, referencedTable: "scan_results" })
    .limit(10);

  if (error) {
    throw new QueryError(error.message, 500);
  }

  return mapSkillRows(data || []);
}

export const getCautionSkillsWithScans = cache(_getCautionSkillsWithScans);

/**
 * Fetch failed skills with their latest scan result for the FailedSection.
 */
async function _getFailedSkillsWithScans(): Promise<SkillWithScan[]> {
  const { data, error } = await getAdminClient()
    .from("skills")
    .select(SKILL_WITH_SCANS_SELECT)
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .order("scanned_at", { ascending: false, referencedTable: "scan_results" })
    .limit(10);

  if (error) {
    throw new QueryError(error.message, 500);
  }

  return mapSkillRows(data || []);
}

export const getFailedSkillsWithScans = cache(_getFailedSkillsWithScans);

/**
 * Fetch aggregate stats for the marquee banner.
 */
async function _getLandingStats(): Promise<LandingStats> {
  const supabase = getAdminClient();

  // Run all count queries in parallel
  const [scannedRes, totalScansRes, verifiedRes, failedRes, clawHubRes] = await Promise.all(
    [
      supabase
        .from("skills")
        .select("*", { count: "exact", head: true })
        .neq("status", "unscanned"),
      supabase
        .from("scan_results")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("scan_results")
        .select("*", { count: "exact", head: true })
        .eq("trust_status", "verified"),
      supabase
        .from("scan_results")
        .select("*", { count: "exact", head: true })
        .eq("trust_status", "failed"),
      supabase
        .from("skills")
        .select("*", { count: "exact", head: true })
        .eq("source", "clawhub")
        .neq("status", "unscanned"),
    ]
  );

  const skillsScanned = scannedRes.count ?? 0;
  const totalScans = totalScansRes.count ?? 0;
  const verifiedCount = verifiedRes.count ?? 0;
  const threatsCaught = failedRes.count ?? 0;
  const clawHubSkillsScanned = clawHubRes.count ?? 0;

  const passRate = totalScans > 0 ? Math.round((verifiedCount / totalScans) * 100) : 0;

  return { skillsScanned, totalScans, passRate, threatsCaught, clawHubSkillsScanned };
}

export const getLandingStats = cache(_getLandingStats);

// ---------------------------------------------------------------------------
// Popular Skills
// ---------------------------------------------------------------------------

export interface PopularSkill {
  rank: number;
  owner: string;
  name: string;
  description: string | null;
  status: TrustStatus;
  category: SkillCategory | null;
  risk_score: number | null;
  github_stars: number | null;
  github_forks: number | null;
  clawhub_downloads: number | null;
  clawhub_stars: number | null;
}

/** Compact format: 847, 2.3K, 1.2M */
export function formatCompact(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 999_950) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

function computeCPS(skill: {
  github_stars: number | null;
  github_forks: number | null;
  clawhub_downloads: number | null;
  clawhub_stars: number | null;
  status: TrustStatus;
}, maxes: {
  ghStars: number;
  ghForks: number;
  chDownloads: number;
  chStars: number;
}): number {
  const logNorm = (val: number | null, max: number): number => {
    if (val == null || val <= 0 || max <= 0) return 0;
    return Math.log(val + 1) / Math.log(max + 1);
  };

  const ghScore =
    0.7 * logNorm(skill.github_stars, maxes.ghStars) +
    0.3 * logNorm(skill.github_forks, maxes.ghForks);

  const chScore =
    0.6 * logNorm(skill.clawhub_downloads, maxes.chDownloads) +
    0.4 * logNorm(skill.clawhub_stars, maxes.chStars);

  const raw = Math.max(ghScore, chScore);
  const trustMod = skill.status === "verified" ? 1.0 : 0.7;
  return raw * trustMod;
}

async function _getPopularSkills(): Promise<PopularSkill[]> {
  const { data, error } = await getAdminClient()
    .from("skills")
    .select(
      "owner, name, description, status, category, github_stars, github_forks, clawhub_downloads, clawhub_stars, scan_results(risk_score, scanned_at)"
    )
    .in("status", ["verified", "caution"])
    .or("github_stars.not.is.null,clawhub_downloads.not.is.null")
    .order("scanned_at", { ascending: false, referencedTable: "scan_results" })
    .limit(100);

  if (error) {
    throw new QueryError(error.message, 500);
  }

  if (!data || data.length === 0) return [];

  type RawRow = {
    owner: string;
    name: string;
    description: string | null;
    status: TrustStatus;
    category: SkillCategory | null;
    github_stars: number | null;
    github_forks: number | null;
    clawhub_downloads: number | null;
    clawhub_stars: number | null;
    scan_results: Array<{ risk_score: number; scanned_at: string }>;
  };

  const rows = data as unknown as RawRow[];

  // Compute max values for log normalization
  const maxes = {
    ghStars: Math.max(...rows.map((r) => r.github_stars ?? 0), 1),
    ghForks: Math.max(...rows.map((r) => r.github_forks ?? 0), 1),
    chDownloads: Math.max(...rows.map((r) => r.clawhub_downloads ?? 0), 1),
    chStars: Math.max(...rows.map((r) => r.clawhub_stars ?? 0), 1),
  };

  const scored = rows
    .map((row) => ({
      ...row,
      cps: computeCPS(row, maxes),
      risk_score: row.scan_results?.[0]?.risk_score ?? null,
    }))
    .sort((a, b) => b.cps - a.cps)
    .slice(0, 8);

  return scored.map((row, i) => ({
    rank: i + 1,
    owner: row.owner,
    name: row.name,
    description: row.description,
    status: row.status,
    category: row.category,
    risk_score: row.risk_score,
    github_stars: row.github_stars,
    github_forks: row.github_forks,
    clawhub_downloads: row.clawhub_downloads,
    clawhub_stars: row.clawhub_stars,
  }));
}

export const getPopularSkills = cache(_getPopularSkills);

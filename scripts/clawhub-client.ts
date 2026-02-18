/**
 * ClawHub API client — rate-limited wrapper around clawhub.ai public API.
 *
 * No npm dependencies — uses native fetch.
 */

import { withRetry, TransientError, isTransientStatus } from "./retry.js";

// ---------------------------------------------------------------------------
// Raw API response types (match actual ClawHub JSON)
// ---------------------------------------------------------------------------

interface ClawHubRawStats {
  downloads: number;
  stars: number;
}

interface ClawHubRawLatestVersion {
  version: string;
  createdAt: number; // epoch ms
}

interface ClawHubRawListItem {
  slug: string;
  displayName: string;
  summary: string;
  stats: ClawHubRawStats;
  latestVersion: ClawHubRawLatestVersion;
  updatedAt: number; // epoch ms
}

interface ClawHubRawListResponse {
  items: ClawHubRawListItem[];
  total: number;
  nextCursor: string | null;
}

interface ClawHubRawOwner {
  handle: string;
  displayName: string;
}

interface ClawHubRawModeration {
  isSuspicious: boolean;
  isMalwareBlocked: boolean;
}

interface ClawHubRawDetailResponse {
  skill: {
    slug: string;
    displayName: string;
    summary: string;
    stats: ClawHubRawStats;
    updatedAt: number;
  };
  latestVersion: ClawHubRawLatestVersion;
  owner: ClawHubRawOwner;
  moderation?: ClawHubRawModeration | null;
}

// ---------------------------------------------------------------------------
// Normalized public types
// ---------------------------------------------------------------------------

export interface ClawHubOwner {
  handle: string;
  name: string;
}

export interface ClawHubSkillSummary {
  slug: string;
  name: string;
  description: string;
  downloads: number;
  stars: number;
  latest_version: string;
  updated_at: string; // ISO 8601
}

export interface ClawHubModeration {
  isSuspicious: boolean;
  isMalwareBlocked: boolean;
}

export interface ClawHubVtAnalysis {
  status: string;       // "clean" | "suspicious" | "malicious" | "pending"
  verdict: string;
  analysis?: string;
  checkedAt?: number;
  source?: string;
}

export interface ClawHubLlmAnalysis {
  status: string;       // "clean" | "suspicious" | "malicious" | "pending" | "error"
  verdict: string;      // "benign" | "suspicious" | "malicious"
  confidence?: string;  // "high" | "medium" | "low"
  summary?: string;
  guidance?: string;
  checkedAt?: number;
}

export interface ClawHubSecurityData {
  sha256hash: string | null;
  vtAnalysis: ClawHubVtAnalysis | null;
  llmAnalysis: ClawHubLlmAnalysis | null;
}

export interface ClawHubSkillDetail extends ClawHubSkillSummary {
  owner: ClawHubOwner;
  moderation: ClawHubModeration | null;
  security: ClawHubSecurityData | null;
}

export interface ClawHubListResponse {
  skills: ClawHubSkillSummary[];
  total: number;
  cursor: string | null;
}

// ---------------------------------------------------------------------------
// Rate limiter (120 req/min = 1 request per 500ms)
// ---------------------------------------------------------------------------

const RATE_LIMIT_MS = 500;
let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// ---------------------------------------------------------------------------
// Base fetch
// ---------------------------------------------------------------------------

const BASE_URL = "https://clawhub.ai/api/v1";
const CONVEX_URL = "https://wry-manatee-359.convex.cloud/api/query";

async function clawHubFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  await rateLimit();

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return withRetry(
    async () => {
      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "pyx-scanner/1.0",
        },
      });

      if (!res.ok) {
        const body = await res.text();
        if (isTransientStatus(res.status)) {
          throw new TransientError(`ClawHub API ${res.status} for ${path}: ${body}`);
        }
        throw new Error(`ClawHub API ${res.status} for ${path}: ${body}`);
      }

      return res.json() as Promise<T>;
    },
    { label: `ClawHub ${path}` }
  );
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapListItem(item: ClawHubRawListItem): ClawHubSkillSummary {
  return {
    slug: item.slug,
    name: item.slug,
    description: item.summary,
    downloads: item.stats.downloads,
    stars: item.stats.stars,
    latest_version: item.latestVersion.version,
    updated_at: new Date(item.updatedAt).toISOString(),
  };
}

function mapDetail(raw: ClawHubRawDetailResponse, security?: ClawHubSecurityData | null): ClawHubSkillDetail {
  const { skill, latestVersion, owner } = raw;
  return {
    slug: skill.slug,
    name: skill.slug,
    description: skill.summary,
    downloads: skill.stats.downloads,
    stars: skill.stats.stars,
    latest_version: latestVersion.version,
    updated_at: new Date(skill.updatedAt).toISOString(),
    owner: {
      handle: owner.handle,
      name: owner.displayName,
    },
    moderation: raw.moderation ?? null,
    security: security ?? null,
  };
}

/**
 * Fetch VT + OpenClaw security scan data via ClawHub's Convex query.
 * Returns null on any failure (non-blocking).
 */
async function fetchSecurityData(slug: string): Promise<ClawHubSecurityData | null> {
  try {
    const res = await fetch(CONVEX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "skills:getBySlug", args: { slug } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const version = data?.value?.latestVersion;
    if (!version) return null;
    return {
      sha256hash: version.sha256hash ?? null,
      vtAnalysis: version.vtAnalysis ?? null,
      llmAnalysis: version.llmAnalysis ?? null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type SortOption = "trending" | "updated" | "downloads" | "stars";

export async function listSkills(
  sort: SortOption = "trending",
  limit = 50,
  cursor?: string
): Promise<ClawHubListResponse> {
  const params: Record<string, string> = {
    sort,
    limit: String(limit),
  };
  if (cursor) params.cursor = cursor;

  const raw = await clawHubFetch<ClawHubRawListResponse>("/skills", params);

  return {
    skills: raw.items.map(mapListItem),
    total: raw.total,
    cursor: raw.nextCursor,
  };
}

export async function getSkill(slug: string): Promise<ClawHubSkillDetail> {
  const [raw, security] = await Promise.all([
    clawHubFetch<ClawHubRawDetailResponse>(`/skills/${encodeURIComponent(slug)}`),
    fetchSecurityData(slug),
  ]);
  return mapDetail(raw, security);
}

export async function getSkillFile(
  slug: string,
  path: string,
  version?: string
): Promise<string> {
  await rateLimit();

  const url = new URL(`${BASE_URL}/skills/${encodeURIComponent(slug)}/file`);
  url.searchParams.set("path", path);
  if (version) url.searchParams.set("version", version);

  return withRetry(
    async () => {
      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": "pyx-scanner/1.0",
        },
      });

      if (!res.ok) {
        const body = await res.text();
        if (isTransientStatus(res.status)) {
          throw new TransientError(`ClawHub file API ${res.status} for ${slug}/${path}: ${body}`);
        }
        throw new Error(`ClawHub file API ${res.status} for ${slug}/${path}: ${body}`);
      }

      return res.text();
    },
    { label: `ClawHub file ${slug}/${path}` }
  );
}

export async function searchSkills(query: string): Promise<{ results: ClawHubSkillSummary[]; total: number }> {
  const raw = await clawHubFetch<{ items: ClawHubRawListItem[]; total: number }>("/search", { q: query });
  return {
    results: raw.items.map(mapListItem),
    total: raw.total,
  };
}

/**
 * Fetch all skills with pagination. Yields batches.
 */
export async function* listAllSkills(
  sort: SortOption = "trending",
  batchSize = 50,
  maxTotal?: number
): AsyncGenerator<ClawHubSkillSummary[]> {
  let cursor: string | undefined;
  let fetched = 0;

  while (true) {
    const limit = maxTotal ? Math.min(batchSize, maxTotal - fetched) : batchSize;
    if (limit <= 0) break;

    const response = await listSkills(sort, limit, cursor);
    if (response.skills.length === 0) break;

    yield response.skills;
    fetched += response.skills.length;

    if (!response.cursor || (maxTotal && fetched >= maxTotal)) break;
    cursor = response.cursor;
  }
}

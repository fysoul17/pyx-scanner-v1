import { listSkills, VALID_STATUSES, VALID_CATEGORIES } from "@lib/queries/skills";
import { CORS_HEADERS, corsOptions } from "../_lib/cors";
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "../_lib/rate-limit";
import type { PublicSkillSummary, PublicSkillsResponse } from "../_lib/types";
import type { TrustStatus, SkillCategory } from "@shared/types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://scanner.pyxmate.com";

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(request: Request) {
  // Rate limiting
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, RATE_LIMITS.skills);
  if (!rl.allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { ...CORS_HEADERS, ...rateLimitHeaders(rl) } }
    );
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const rawStatus = url.searchParams.get("status");
  const rawCategory = url.searchParams.get("category");
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "20", 10) || 20,
    100
  );
  const offset = parseInt(url.searchParams.get("offset") || "0", 10) || 0;

  // Validate status before casting
  if (rawStatus && !VALID_STATUSES.includes(rawStatus as TrustStatus)) {
    return Response.json(
      {
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      },
      { status: 400, headers: { ...CORS_HEADERS, ...rateLimitHeaders(rl) } }
    );
  }
  const status = rawStatus as TrustStatus | null;

  // Validate category before casting
  if (rawCategory && !VALID_CATEGORIES.includes(rawCategory as SkillCategory)) {
    return Response.json(
      {
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
      },
      { status: 400, headers: { ...CORS_HEADERS, ...rateLimitHeaders(rl) } }
    );
  }
  const category = rawCategory as SkillCategory | null;

  try {
    const result = await listSkills({ search, status, category, limit, offset });

    const skills: PublicSkillSummary[] = result.skills.map((s) => ({
      owner: s.owner,
      name: s.name,
      status: s.status,
      source: s.source,
      category: s.category ?? null,
      description: s.description,
      detail_url: `${BASE_URL}/s/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.name)}`,
      badge_url: `${BASE_URL}/api/v1/badge/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.name)}`,
      updated_at: s.updated_at,
    }));

    const response: PublicSkillsResponse = {
      skills,
      total: result.total,
      limit,
      offset,
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

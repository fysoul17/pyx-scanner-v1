import { cache } from "react";
import { getAdminClient } from "@lib/supabase";
import { QueryError } from "./error";
import type { Skill, SkillsResponse, TrustStatus, SkillCategory } from "@shared/types";

export const VALID_STATUSES: TrustStatus[] = [
  "verified",
  "caution",
  "failed",
  "unscanned",
];

export const VALID_CATEGORIES: SkillCategory[] = [
  "developer-tools",
  "version-control",
  "web-browser",
  "data-files",
  "cloud-infra",
  "communication",
  "search-research",
  "productivity",
  "other",
];

export type SkillSort = "updated" | "popular";

export interface ListSkillsParams {
  search?: string | null;
  status?: TrustStatus | null;
  category?: SkillCategory | null;
  sort?: SkillSort | null;
  limit?: number;
  offset?: number;
}

async function _listSkills(
  params?: ListSkillsParams
): Promise<SkillsResponse> {
  const search = params?.search ?? null;
  const status = params?.status ?? null;
  const category = params?.category ?? null;
  const sort = params?.sort ?? "updated";
  const limit = Math.min(params?.limit ?? 20, 100);
  const offset = params?.offset ?? 0;

  if (status && !VALID_STATUSES.includes(status)) {
    throw new QueryError(
      `Invalid status filter. Must be one of: ${VALID_STATUSES.join(", ")}`,
      400
    );
  }

  if (category && !VALID_CATEGORIES.includes(category)) {
    throw new QueryError(
      `Invalid category filter. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
      400
    );
  }

  let query = getAdminClient()
    .from("skills")
    .select("*, scan_results(risk_score, scanned_at)", { count: "exact" });

  if (search) {
    const sanitized = search.replace(/[%_\\]/g, (c) => `\\${c}`);
    query = query.or(
      `owner.ilike.%${sanitized}%,name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
    );
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (sort === "popular") {
    query = query.order("github_stars", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("updated_at", { ascending: false });
  }

  query = query
    .order("scanned_at", { ascending: false, referencedTable: "scan_results" })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new QueryError(error.message, 500);
  }

  const skills = (data || []).map((row) => {
    const { scan_results, ...skill } = row as typeof row & {
      scan_results?: Array<{ risk_score: number; scanned_at: string }>;
    };
    const latest = scan_results?.[0] ?? null;
    return { ...skill, risk_score: latest?.risk_score ?? null } as Skill;
  });

  return {
    skills,
    total: count || 0,
  };
}

export const listSkills = cache(_listSkills);

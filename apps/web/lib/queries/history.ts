import { cache } from "react";
import { getAdminClient } from "@lib/supabase";
import { QueryError } from "./error";
import type { HistoryResponse } from "@shared/types";

async function _getSkillHistory(
  owner: string,
  name: string
): Promise<HistoryResponse> {
  const { data: skillData, error: skillError } = await getAdminClient()
    .from("skills")
    .select("*")
    .eq("owner", owner)
    .eq("name", name)
    .maybeSingle();

  if (skillError) {
    throw new QueryError(skillError.message, 500);
  }

  if (!skillData) {
    return { skill: null, results: [] };
  }

  const { data: results, error: resultsError } = await getAdminClient()
    .from("scan_results")
    .select("*")
    .eq("skill_id", skillData.id)
    .order("scanned_at", { ascending: false });

  if (resultsError) {
    throw new QueryError(resultsError.message, 500);
  }

  return {
    skill: skillData,
    results: results || [],
  };
}

export const getSkillHistory = cache(_getSkillHistory);

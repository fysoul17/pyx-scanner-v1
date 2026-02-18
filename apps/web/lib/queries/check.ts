import { cache } from "react";
import { getAdminClient } from "@lib/supabase";
import { fetchLatestCommit } from "./github";
import { fetchLatestClawHubVersion } from "./clawhub";
import { QueryError } from "./error";
import type { CheckResponse, Recommendation } from "@shared/types";

async function _checkSkill(
  owner: string,
  name: string
): Promise<CheckResponse> {
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
    return {
      skill: null,
      latestScan: null,
      recommendation: "unknown",
      latestCommit: null,
      isOutdated: false,
    };
  }

  const { data: latestScan } = await getAdminClient()
    .from("scan_results")
    .select("*")
    .eq("skill_id", skillData.id)
    .order("scanned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Branch outdated detection by source
  let latestCommit: string | null = null;
  let isOutdated = false;

  if (skillData.source === "clawhub" && skillData.clawhub_slug) {
    const latest = await fetchLatestClawHubVersion(skillData.clawhub_slug);
    if (latest) {
      latestCommit = latest.content_hash || latest.version;
      // Compare version strings or content hashes
      isOutdated =
        !!skillData.clawhub_version &&
        latest.version !== skillData.clawhub_version;
    }
  } else {
    latestCommit = await fetchLatestCommit(owner, name);
    isOutdated =
      !!latestCommit &&
      !!skillData.latest_scan_commit &&
      latestCommit !== skillData.latest_scan_commit;
  }

  const recommendation: Recommendation = latestScan
    ? latestScan.recommendation
    : "unknown";

  return {
    skill: skillData,
    latestScan,
    recommendation,
    latestCommit,
    isOutdated,
  };
}

export const checkSkill = cache(_checkSkill);

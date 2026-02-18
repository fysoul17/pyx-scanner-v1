"use server";

import { checkSkill } from "@lib/queries";
import type { CheckResponse } from "@shared/types";

export async function checkSkillAction(
  owner: string,
  name: string
): Promise<CheckResponse> {
  try {
    return await checkSkill(owner, name);
  } catch {
    return {
      skill: null,
      latestScan: null,
      recommendation: "unknown",
      latestCommit: null,
      isOutdated: false,
    };
  }
}

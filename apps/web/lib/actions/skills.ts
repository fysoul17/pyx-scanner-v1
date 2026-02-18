"use server";

import { listSkills } from "@lib/queries";
import type { ListSkillsParams } from "@lib/queries";
import type { SkillsResponse } from "@shared/types";

export async function listSkillsAction(
  params?: ListSkillsParams
): Promise<SkillsResponse> {
  try {
    return await listSkills(params);
  } catch {
    return { skills: [], total: 0 };
  }
}

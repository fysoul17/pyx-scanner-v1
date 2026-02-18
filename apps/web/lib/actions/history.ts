"use server";

import { getSkillHistory } from "@lib/queries";
import type { HistoryResponse } from "@shared/types";

export async function getSkillHistoryAction(
  owner: string,
  name: string
): Promise<HistoryResponse> {
  try {
    return await getSkillHistory(owner, name);
  } catch {
    return { skill: null, results: [] };
  }
}

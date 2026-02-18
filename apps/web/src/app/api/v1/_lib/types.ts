import type { TrustStatus, Recommendation, Intent, SkillAbout, SkillSource, SkillCategory } from "@shared/types";

export interface PublicCheckResponse {
  safe: boolean;
  status: TrustStatus;
  recommendation: Recommendation;
  owner: string;
  name: string;
  risk_score: number | null;
  trust_score: number | null;
  confidence: number | null;
  scanned_commit: string | null;
  latest_commit: string | null;
  is_outdated: boolean;
  last_safe_commit: string | null;
  last_safe_version: string | null;
  intent: Intent | null;
  summary: string | null;
  about: SkillAbout | null;
  scanned_at: string | null;
  detail_url: string;
  badge_url: string;
  category: SkillCategory | null;
  repository_url: string | null;
  queued?: boolean;
  job_id?: string;
}

export interface PublicSkillSummary {
  owner: string;
  name: string;
  status: TrustStatus;
  source: SkillSource;
  category: SkillCategory | null;
  description: string | null;
  detail_url: string;
  badge_url: string;
  updated_at: string;
}

export interface PublicSkillsResponse {
  skills: PublicSkillSummary[];
  total: number;
  limit: number;
  offset: number;
}

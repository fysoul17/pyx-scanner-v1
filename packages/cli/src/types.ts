// Trust status for a scanned skill
export type TrustStatus = "verified" | "failed" | "outdated" | "scanning" | "unscanned";

// Safety recommendation
export type Recommendation = "safe" | "caution" | "danger" | "unknown";

// Job status for scan queue
export type JobStatus = "queued" | "running" | "completed" | "failed";

// A tracked AI skill
export interface Skill {
  id: string;
  owner: string;
  name: string;
  description: string | null;
  repository_url: string | null;
  status: TrustStatus;
  latest_scan_commit: string | null;
  last_safe_commit: string | null;
  last_safe_version: string | null;
  created_at: string;
  updated_at: string;
}

// Result of a security scan
export interface ScanResult {
  id: string;
  skill_id: string;
  commit_hash: string;
  version: string | null;
  trust_status: TrustStatus;
  recommendation: Recommendation;
  risk_score: number;
  summary: string;
  details: Record<string, unknown> | null;
  scanned_at: string;
  created_at: string;
}

// A queued scan job
export interface ScanJob {
  id: string;
  skill_id: string;
  requested_by: string | null;
  status: JobStatus;
  result_id: string | null;
  created_at: string;
  updated_at: string;
}

// --- API Response Types ---

export interface CheckResponse {
  skill: Skill | null;
  latestScan: ScanResult | null;
  recommendation: Recommendation;
  latestCommit: string | null;
  isOutdated: boolean;
}

export interface ScanJobResponse {
  job_id: string;
  status: JobStatus;
  message: string;
}

export interface HistoryResponse {
  skill: Skill | null;
  results: ScanResult[];
}

export interface SkillsResponse {
  skills: Skill[];
  total: number;
}

// --- Lockfile Types ---

export interface LockfileEntry {
  version: string | null;
  commit: string | null;
  status: TrustStatus;
  checkedAt: string;
}

export interface Lockfile {
  version: 1;
  skills: Record<string, LockfileEntry>;
}

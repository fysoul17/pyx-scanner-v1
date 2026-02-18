// Trust status for a scanned skill
export type TrustStatus = "verified" | "caution" | "failed" | "unscanned";

// Skill source registry
export type SkillSource = "github" | "clawhub";

// Safety recommendation
export type Recommendation = "safe" | "caution" | "danger" | "unknown";

// AI-classified intent of a scanned skill
export type Intent = "benign" | "risky" | "malicious";

// Functional category of a skill
export type SkillCategory =
  | "developer-tools"
  | "version-control"
  | "web-browser"
  | "data-files"
  | "cloud-infra"
  | "communication"
  | "search-research"
  | "productivity"
  | "other";

// Job status for scan queue
export type JobStatus = "queued" | "running" | "completed" | "failed";

// A tracked AI skill
export interface Skill {
  id: string;
  owner: string;
  name: string;
  repo: string | null;
  description: string | null;
  repository_url: string | null;
  status: TrustStatus;
  latest_scan_commit: string | null;
  last_safe_commit: string | null;
  last_safe_version: string | null;
  source: SkillSource;
  clawhub_slug: string | null;
  clawhub_version: string | null;
  clawhub_content_hash: string | null;
  clawhub_downloads: number | null;
  clawhub_stars: number | null;
  clawhub_url: string | null;
  github_stars: number | null;
  github_forks: number | null;
  github_is_private: boolean | null;
  category: SkillCategory | null;
  risk_score?: number | null;
  created_at: string;
  updated_at: string;
}

// AI-generated skill summary
export interface SkillAbout {
  purpose: string;
  capabilities: string[];
  use_cases: string[];
  permissions_required: string[];
  security_notes: string;
}

// Static rule finding from deterministic analysis
export interface StaticFinding {
  rule_id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  file: string;
  line: number;
  match: string;
}

export interface StaticSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

// Dependency vulnerability from OSV API
export interface DepVulnerability {
  id: string;
  package_name: string;
  installed_version: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  summary: string;
  fixed_version: string | null;
  reference_url: string;
}

// External security scan provider status
export type ExternalScanStatus = "clean" | "suspicious" | "malware" | "unknown" | "not_available";

export interface ExternalScanProvider {
  provider: string;
  status: ExternalScanStatus;
  verdict: string | null;
  confidence: string | null; // "high" | "medium" | "low" | null
  report_url: string | null;
  checked_at: string | null;
}

export interface ExternalScansData {
  providers: ExternalScanProvider[];
  fetched_at: string;
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
  skill_about: SkillAbout | null;
  confidence: number | null;
  was_truncated: boolean;
  pre_scan_flags: StaticFinding[] | null;
  dependency_vulnerabilities: DepVulnerability[] | null;
  intent: Intent | null;
  category: SkillCategory | null;
  model: string | null;
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

// --- API Request / Response Types ---

export interface CheckResponse {
  skill: Skill | null;
  latestScan: ScanResult | null;
  recommendation: Recommendation;
  latestCommit: string | null;
  isOutdated: boolean;
}

export interface ScanRequest {
  owner: string;
  name: string;
  repo?: string;
  requested_by?: string;
}

export interface ScanResultPayload {
  owner: string;
  name: string;
  description?: string;
  repo?: string;
  commit_hash: string;
  version?: string;
  trust_status: TrustStatus;
  recommendation: Recommendation;
  risk_score: number;
  summary: string;
  details?: Record<string, unknown>;
  skill_about?: SkillAbout;
  model?: string;
  confidence?: number;
  dependency_vulnerabilities?: DepVulnerability[];
  was_truncated?: boolean;
  pre_scan_flags?: StaticFinding[];
  static_findings_assessment?: string;
  intent?: Intent;
  category?: SkillCategory;
  source?: SkillSource;
  clawhub_slug?: string;
  clawhub_version?: string;
  clawhub_content_hash?: string;
  clawhub_downloads?: number;
  clawhub_stars?: number;
  clawhub_url?: string;
  github_stars?: number;
  github_forks?: number;
  github_is_private?: boolean;
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

-- PYX Scanner: Initial Schema (consolidated)
-- Tables: skills, scan_results, scan_jobs

------------------------------------------------------------------------
-- Shared trigger function: auto-update updated_at on row changes
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

------------------------------------------------------------------------
-- skills — tracked AI skills (one row per owner/name pair)
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  repo TEXT,
  description TEXT,
  repository_url TEXT,
  status TEXT NOT NULL DEFAULT 'unscanned'
    CHECK (status IN ('verified', 'caution', 'failed', 'outdated', 'scanning', 'unscanned')),
  category TEXT
    CHECK (category IN (
      'developer-tools', 'version-control', 'web-browser', 'data-files',
      'cloud-infra', 'communication', 'search-research', 'productivity', 'other'
    )),
  latest_scan_commit TEXT,
  last_safe_commit TEXT,
  last_safe_version TEXT,
  source TEXT NOT NULL DEFAULT 'github'
    CHECK (source IN ('github', 'clawhub')),
  clawhub_slug TEXT,
  clawhub_version TEXT,
  clawhub_content_hash TEXT,
  clawhub_downloads INTEGER,
  clawhub_stars INTEGER,
  clawhub_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner, name)
);

COMMENT ON TABLE skills IS 'AI skills tracked by PYX Scanner';
COMMENT ON COLUMN skills.owner IS 'GitHub org or ClawHub publisher';
COMMENT ON COLUMN skills.name IS 'Skill/repo name (unique with owner)';
COMMENT ON COLUMN skills.status IS 'Latest scan verdict: verified | caution | failed | outdated | scanning | unscanned';
COMMENT ON COLUMN skills.category IS 'Functional category: developer-tools, version-control, web-browser, data-files, cloud-infra, communication, search-research, productivity, other';
COMMENT ON COLUMN skills.source IS 'Registry origin: github | clawhub';
COMMENT ON COLUMN skills.latest_scan_commit IS 'Commit hash of the most recent scan';
COMMENT ON COLUMN skills.last_safe_commit IS 'Most recent commit that passed verification';

CREATE TRIGGER trg_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

------------------------------------------------------------------------
-- scan_results — individual scan outputs linked to a skill
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  commit_hash TEXT NOT NULL,
  version TEXT,
  trust_status TEXT NOT NULL
    CHECK (trust_status IN ('verified', 'caution', 'failed', 'outdated', 'scanning', 'unscanned')),
  intent TEXT
    CHECK (intent IN ('benign', 'risky', 'malicious')),
  category TEXT
    CHECK (category IN (
      'developer-tools', 'version-control', 'web-browser', 'data-files',
      'cloud-infra', 'communication', 'search-research', 'productivity', 'other'
    )),
  recommendation TEXT NOT NULL
    CHECK (recommendation IN ('safe', 'caution', 'danger', 'unknown')),
  risk_score NUMERIC NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  details JSONB,
  skill_about JSONB,
  model TEXT,
  confidence NUMERIC,
  dependency_vulnerabilities JSONB,
  was_truncated BOOLEAN NOT NULL DEFAULT false,
  pre_scan_flags JSONB,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (skill_id, commit_hash)
);

COMMENT ON TABLE scan_results IS 'Scan output for a specific skill + commit';
COMMENT ON COLUMN scan_results.trust_status IS 'Verdict: verified | caution | failed | outdated | scanning | unscanned';
COMMENT ON COLUMN scan_results.intent IS 'AI-classified intent: benign, risky, malicious';
COMMENT ON COLUMN scan_results.category IS 'Functional category: developer-tools, version-control, web-browser, data-files, cloud-infra, communication, search-research, productivity, other';
COMMENT ON COLUMN scan_results.recommendation IS 'User-facing recommendation: safe | caution | danger | unknown';
COMMENT ON COLUMN scan_results.risk_score IS 'Numeric risk score 0-10';
COMMENT ON COLUMN scan_results.confidence IS 'AI confidence score 0-100 (NULL = not computed)';
COMMENT ON COLUMN scan_results.dependency_vulnerabilities IS 'OSV.dev vulnerability matches (JSONB array)';
COMMENT ON COLUMN scan_results.was_truncated IS 'Whether the source was too large and got truncated before scanning';
COMMENT ON COLUMN scan_results.pre_scan_flags IS 'Static analysis flags injected before AI scan (JSONB array)';
COMMENT ON COLUMN scan_results.details IS 'Full scan details including static_findings, static_summary, static_findings_assessment';

------------------------------------------------------------------------
-- scan_jobs — job queue for pending / in-progress scans
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  requested_by TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  result_id UUID REFERENCES scan_results(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE scan_jobs IS 'Scan job queue tracking';
COMMENT ON COLUMN scan_jobs.status IS 'Job state: queued | running | completed | failed';
COMMENT ON COLUMN scan_jobs.result_id IS 'FK to scan_results once completed (NULL while pending)';

CREATE TRIGGER trg_scan_jobs_updated_at
  BEFORE UPDATE ON scan_jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

------------------------------------------------------------------------
-- Row Level Security (all access via service_role key, bypasses RLS)
------------------------------------------------------------------------
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------------------
-- Indexes
------------------------------------------------------------------------
-- FK indexes (Supabase best practice: 10-100x faster JOINs/CASCADE)
CREATE INDEX IF NOT EXISTS idx_scan_results_skill_id ON scan_results(skill_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_skill_id ON scan_jobs(skill_id);

-- Time-ordered queries
CREATE INDEX IF NOT EXISTS idx_scan_results_scanned_at ON scan_results(scanned_at DESC);

-- Filter by model
CREATE INDEX IF NOT EXISTS idx_scan_results_model ON scan_results(model);

-- Partial index: only index rows where confidence is set
CREATE INDEX IF NOT EXISTS idx_scan_results_confidence
  ON scan_results(confidence)
  WHERE confidence IS NOT NULL;

-- Lookup by repo / ClawHub slug
CREATE INDEX IF NOT EXISTS idx_skills_repo ON skills(repo);
CREATE INDEX IF NOT EXISTS idx_skills_clawhub_slug ON skills(clawhub_slug);

-- Removed indexes (documented):
-- idx_skills_owner_name: redundant with UNIQUE(owner, name) btree
-- idx_skills_source: low cardinality (2 values), seq scan faster
-- idx_scan_jobs_status: low cardinality (4 values), seq scan faster

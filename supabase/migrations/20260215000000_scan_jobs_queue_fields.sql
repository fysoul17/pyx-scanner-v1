-- Add queue processing fields to scan_jobs
-- Supports: source tracking, model selection, error capture, timing

ALTER TABLE scan_jobs ADD COLUMN source TEXT CHECK (source IN ('github', 'clawhub'));
ALTER TABLE scan_jobs ADD COLUMN model TEXT;
ALTER TABLE scan_jobs ADD COLUMN error_message TEXT;
ALTER TABLE scan_jobs ADD COLUMN started_at TIMESTAMPTZ;
ALTER TABLE scan_jobs ADD COLUMN completed_at TIMESTAMPTZ;

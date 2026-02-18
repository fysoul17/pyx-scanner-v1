-- Remove unused statuses: outdated, scanning
-- Keep: verified, caution, failed, unscanned

-- Update skills.status CHECK constraint
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_status_check;
ALTER TABLE skills ADD CONSTRAINT skills_status_check
  CHECK (status IN ('verified', 'caution', 'failed', 'unscanned'));

-- Update scan_results.trust_status CHECK constraint
ALTER TABLE scan_results DROP CONSTRAINT IF EXISTS scan_results_trust_status_check;
ALTER TABLE scan_results ADD CONSTRAINT scan_results_trust_status_check
  CHECK (trust_status IN ('verified', 'caution', 'failed', 'unscanned'));

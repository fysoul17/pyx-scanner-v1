-- Add retry_count to scan_jobs so failed jobs can be retried automatically
ALTER TABLE scan_jobs ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN scan_jobs.retry_count IS 'Number of times this job has been retried after failure';

-- RPC for atomic fail + increment (PostgREST can't do column-relative updates)
CREATE OR REPLACE FUNCTION mark_job_failed(
  job_id UUID,
  err_msg TEXT
) RETURNS void AS $$
  UPDATE scan_jobs
  SET status = 'failed',
      completed_at = now(),
      error_message = left(err_msg, 2000),
      retry_count = retry_count + 1
  WHERE id = job_id;
$$ LANGUAGE sql SECURITY DEFINER;

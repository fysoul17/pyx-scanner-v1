-- ============================================================================
-- RLS Policies — Public read access for skills and scan_results
-- ============================================================================
-- Previously RLS was enabled on all tables but no policies were defined,
-- meaning only the service role key could access data. These policies allow
-- the anon key (browser client) to SELECT from public tables while keeping
-- write operations restricted to the service role key.
-- ============================================================================

-- Public read access to skills (published directory data)
CREATE POLICY "skills_select_public" ON public.skills
  FOR SELECT
  USING (true);

-- Public read access to scan results (published scan data)
CREATE POLICY "scan_results_select_public" ON public.scan_results
  FOR SELECT
  USING (true);

-- scan_jobs: No policy = no access for anon key (internal queue only)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Admin client (service role — bypasses RLS)
// Use for: API routes, background jobs, admin operations
// WARNING: Never expose to the browser
// ---------------------------------------------------------------------------

let _adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
      );
    }
    _adminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _adminClient;
}

// ---------------------------------------------------------------------------
// Browser client (anon key — respects RLS)
// Use for: client components, user-facing queries
// ---------------------------------------------------------------------------

let _browserClient: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (!_browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables"
      );
    }
    _browserClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _browserClient;
}

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

try {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envFile = readFileSync(resolve(__dirname, "../.env"), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
} catch {}

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

async function main() {
  // Reset all stuck running/failed jobs back to queued
  const { data, error } = await db
    .from("scan_jobs")
    .update({
      status: "queued",
      retry_count: 0,
      started_at: null,
      completed_at: null,
      error_message: null,
    })
    .in("status", ["running", "failed"])
    .select("id, status");

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No stuck jobs found.");
  } else {
    for (const job of data) {
      console.log(`Reset job ${job.id.slice(0, 8)} → queued`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

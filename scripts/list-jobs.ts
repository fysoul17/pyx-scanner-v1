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
  const { data, error } = await db
    .from("scan_jobs")
    .select("id, status, retry_count, error_message, created_at, started_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) { console.error("Error:", error.message); return; }

  console.log("Recent jobs:\n");
  for (const job of data ?? []) {
    console.log(`  ${job.id.slice(0, 8)}  status=${job.status}  retries=${job.retry_count}  created=${job.created_at}`);
    if (job.error_message) console.log(`    error: ${job.error_message.slice(0, 150)}`);
  }
}

main().catch(console.error);

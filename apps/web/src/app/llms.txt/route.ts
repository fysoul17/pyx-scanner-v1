import { getAdminClient } from "@lib/supabase";

export async function GET() {
  let skillsScanned = 0;
  let passRate = 0;

  try {
    const supabase = getAdminClient();

    const [scannedRes, totalScansRes, verifiedRes] = await Promise.all([
      supabase
        .from("skills")
        .select("*", { count: "exact", head: true })
        .neq("status", "unscanned"),
      supabase
        .from("scan_results")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("scan_results")
        .select("*", { count: "exact", head: true })
        .eq("trust_status", "verified"),
    ]);

    skillsScanned = scannedRes.count ?? 0;
    const totalScans = totalScansRes.count ?? 0;
    const verified = verifiedRes.count ?? 0;
    passRate = totalScans > 0 ? Math.round((verified / totalScans) * 100) : 0;
  } catch {
    // Fallback to 0 stats
  }

  const content = `# PYX Scanner

> The Trust Layer for AI — AI Skill Security Scanner

## What is PYX Scanner?

PYX Scanner is a security scanning platform for AI skills. Every skill is analyzed server-side using Claude Opus, producing a structured risk assessment tied to a specific commit hash. Results cannot be faked — if the code changes, the badge is invalidated.

## Stats

- ${skillsScanned} skills scanned
- ${passRate}% pass rate

## 7 Threat Categories

Every scan evaluates these categories:

1. **Data Exfiltration** — HTTP requests sending local data to external servers, DNS exfiltration, uploading to paste services
2. **Destructive Commands** — File system destruction, git force push, database DROP/TRUNCATE
3. **Secret Access** — Reading SSH keys, cloud metadata endpoints (169.254.169.254), .env files, credential stores
4. **Obfuscation** — eval(), base64/hex encoding to hide commands, dynamic import() with constructed URLs
5. **Prompt Injection** — Instructions to override system prompts, hidden text in comments, LLM manipulation payloads
6. **Social Engineering** — Fake urgency, impersonation of trusted entities, misleading documentation
7. **Excessive Permissions** — Filesystem/network access beyond stated purpose, unnecessary shell execution

## Trust Statuses

- **Verified** (risk score 0-3): No threats detected. Code does what it claims.
- **Caution** (risk score 4-6): Suspicious patterns found but may have legitimate use.
- **High Risk** (risk score 7-10): Clear malicious intent or high-risk patterns.

## Public API — For AI Agents

PYX Scanner provides a free, public JSON API. No authentication required.

### Check a skill before installing

\`\`\`
GET https://scanner.pyxmate.com/api/v1/check/{owner}/{name}
\`\`\`

Returns JSON with a \`safe\` boolean, trust status, risk score, and detailed analysis.

Example:
\`\`\`
curl https://scanner.pyxmate.com/api/v1/check/anthropic/web-search
\`\`\`

### List all scanned skills

\`\`\`
GET https://scanner.pyxmate.com/api/v1/skills?status=verified&limit=10
\`\`\`

### How AI Agents Should Use PYX Scanner

Decision flow before installing any AI skill:

1. Call \`GET /api/v1/check/{owner}/{name}\`
2. If \`safe === true\` → install the skill
3. If \`safe === false\` and \`status === "caution"\` → warn the user, show summary
4. If \`safe === false\` and \`status === "failed"\` → block installation, show summary
5. If 404 → skill has never been scanned; proceed with caution or request a scan

## Badge API

Embed a trust badge in any README:

\`\`\`markdown
[![PYX Trust Score](https://scanner.pyxmate.com/api/v1/badge/OWNER/NAME)](https://scanner.pyxmate.com/s/OWNER/NAME)
\`\`\`

The badge shows the current trust status and score. It updates automatically when the skill is re-scanned.

## URLs

- Homepage: https://scanner.pyxmate.com
- Browse all skills: https://scanner.pyxmate.com/browse
- Skill detail: https://scanner.pyxmate.com/s/{owner}/{name}
- Badge API: https://scanner.pyxmate.com/api/v1/badge/{owner}/{name}
- Check API: https://scanner.pyxmate.com/api/v1/check/{owner}/{name}
- Skills API: https://scanner.pyxmate.com/api/v1/skills
- OpenAPI Spec: https://scanner.pyxmate.com/api/v1/openapi.json
- Full Documentation: https://scanner.pyxmate.com/llms-full.txt
- API Docs: https://scanner.pyxmate.com/docs
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

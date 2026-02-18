import { getAdminClient } from "@lib/supabase";

export async function GET() {
  // Fetch recent scans for live examples
  let exampleSkills: Array<{
    owner: string;
    name: string;
    status: string;
    risk_score: number | null;
    summary: string | null;
  }> = [];

  try {
    const supabase = getAdminClient();

    const { data } = await supabase
      .from("skills")
      .select(
        "owner, name, status, scan_results(risk_score, summary, scanned_at)"
      )
      .neq("status", "unscanned")
      .order("updated_at", { ascending: false })
      .order("scanned_at", {
        ascending: false,
        referencedTable: "scan_results",
      })
      .limit(5);

    if (data) {
      exampleSkills = data.map((s: Record<string, unknown>) => {
        const scans = s.scan_results as
          | Array<{ risk_score: number; summary: string }>
          | undefined;
        const latest = scans?.[0];
        return {
          owner: s.owner as string,
          name: s.name as string,
          status: s.status as string,
          risk_score: latest?.risk_score ?? null,
          summary: latest?.summary ?? null,
        };
      });
    }
  } catch {
    // Continue with empty examples
  }

  const examplesSection =
    exampleSkills.length > 0
      ? `## Recently Scanned Skills

${exampleSkills.map((s) => `- **${s.owner}/${s.name}** — Status: ${s.status}, Risk Score: ${s.risk_score ?? "N/A"}\n  ${s.summary ?? "No summary available"}`).join("\n")}`
      : "";

  const content = `# PYX Scanner — Complete Documentation

> The Trust Layer for AI — AI Skill Security Scanner
> For a summary, see: https://scanner.pyxmate.com/llms.txt

## Overview

PYX Scanner analyzes AI skills (Model Context Protocol tools, ClawHub packages, etc.) for security threats. Every skill is scanned server-side using Claude Opus, producing a structured risk assessment tied to a specific commit hash or version. Results are cryptographically tied to code — if the code changes, the scan is invalidated.

## Trust Model

### Three-Tier Classification

PYX Scanner classifies every skill into one of three trust tiers based on intent analysis and risk scoring:

**1. Verified (Risk Score 0-3, Intent: Benign)**
- No threats detected across all 7 categories
- Code behavior matches its stated purpose
- Permissions are minimal and appropriate
- Recommendation: Safe to install

**2. Caution (Risk Score 4-6, Intent: Risky)**
- Suspicious patterns found but may have legitimate use
- Broad permissions that could be justified by functionality
- Code does more than expected but isn't clearly malicious
- Recommendation: Review before installing, warn users

**3. High Risk (Risk Score 7-10, Intent: Malicious)**
- Clear malicious intent or high-risk patterns detected
- Active threats like data exfiltration, credential theft, or destructive commands
- Recommendation: Security threats detected. Review findings carefully.

### Intent Classification

Before scoring, intent is classified as one of:
- **benign** — No harmful intent detected
- **risky** — Broad or unusual behavior that may have legitimate explanations
- **malicious** — Clear harmful intent

Cross-check rule: If intent is "malicious" but the risk score is below 7, the score is automatically bumped to 7 to ensure consistency.

### Confidence Score

Each scan includes a confidence score (0-100) indicating how certain the analysis is. Lower confidence may mean the code was too large (truncated), obfuscated, or ambiguous.

## 7 Threat Categories

Every scan evaluates these categories:

1. **Data Exfiltration** — HTTP requests sending local data to external servers, DNS exfiltration, uploading to paste services, WebSocket data channels
2. **Destructive Commands** — File system destruction (rm -rf), git force push, database DROP/TRUNCATE, format commands, registry modifications
3. **Secret Access** — Reading SSH keys, cloud metadata endpoints (169.254.169.254), .env files, credential stores, keychain access, browser storage
4. **Obfuscation** — eval(), base64/hex encoding to hide commands, dynamic import() with constructed URLs, string concatenation to build commands
5. **Prompt Injection** — Instructions to override system prompts, hidden text in comments, LLM manipulation payloads, jailbreak patterns
6. **Social Engineering** — Fake urgency ("act now!"), impersonation of trusted entities, misleading documentation, bait-and-switch behavior
7. **Excessive Permissions** — Filesystem/network access beyond stated purpose, unnecessary shell execution, requesting admin/root, broad glob patterns

## Pre-Scan Engine

Before the AI analysis, two deterministic checks run:

### Static Rules (20 rules)
- 14 critical rules (credential access, shell injection, data exfiltration patterns)
- 4 warning rules (broad permissions, dynamic imports)
- 2 info rules (network access, file system patterns)
- Results are injected into the AI prompt for context

### Dependency Scan
- Checks all dependencies against the OSV.dev vulnerability database
- Identifies known CVEs with severity ratings
- Results included in the final report

## Public API Reference

All endpoints are public, require no authentication, and return JSON.

### Check a Skill

\`\`\`
GET /api/v1/check/{owner}/{name}
\`\`\`

**Parameters:**
- \`owner\` (path) — Skill owner/organization (e.g., "anthropic")
- \`name\` (path) — Skill name (e.g., "web-search")

**Response (200):**
\`\`\`json
{
  "safe": true,
  "status": "verified",
  "recommendation": "safe",
  "owner": "anthropic",
  "name": "web-search",
  "risk_score": 1,
  "trust_score": 90,
  "confidence": 95,
  "scanned_commit": "abc123",
  "latest_commit": "abc123",
  "is_outdated": false,
  "last_safe_commit": "abc123",
  "last_safe_version": null,
  "summary": "This skill provides web search capabilities...",
  "about": {
    "purpose": "Provides web search functionality",
    "capabilities": ["Search the web", "Return results"],
    "use_cases": ["Research", "Fact-checking"],
    "permissions_required": ["network"],
    "security_notes": "Only accesses public web content"
  },
  "scanned_at": "2026-02-10T12:00:00Z",
  "detail_url": "https://scanner.pyxmate.com/s/anthropic/web-search",
  "badge_url": "https://scanner.pyxmate.com/api/v1/badge/anthropic/web-search",
  "repository_url": "https://github.com/anthropic/web-search"
}
\`\`\`

**Response (404):** Skill has never been scanned.

**Rate Limit:** 60 requests per minute per IP.

### List Skills

\`\`\`
GET /api/v1/skills?search=&status=&limit=&offset=
\`\`\`

**Query Parameters:**
- \`search\` (optional) — Search owner, name, or description
- \`status\` (optional) — Filter by trust status: verified, caution, failed, outdated, scanning, unscanned
- \`limit\` (optional, default 20, max 100) — Results per page
- \`offset\` (optional, default 0) — Pagination offset

**Response (200):**
\`\`\`json
{
  "skills": [
    {
      "owner": "anthropic",
      "name": "web-search",
      "status": "verified",
      "source": "github",
      "description": "Web search skill for Claude",
      "detail_url": "https://scanner.pyxmate.com/s/anthropic/web-search",
      "badge_url": "https://scanner.pyxmate.com/api/v1/badge/anthropic/web-search",
      "updated_at": "2026-02-10T12:00:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
\`\`\`

**Rate Limit:** 30 requests per minute per IP.

### Badge (SVG)

\`\`\`
GET /api/v1/badge/{owner}/{name}
\`\`\`

Returns an SVG badge image showing the current trust status. Embed in READMEs:

\`\`\`markdown
[![PYX Trust Score](https://scanner.pyxmate.com/api/v1/badge/OWNER/NAME)](https://scanner.pyxmate.com/s/OWNER/NAME)
\`\`\`

## Agent Integration Guide

### Decision Flow

When an AI agent is about to install an AI skill:

1. **Check PYX Scanner:** \`GET /api/v1/check/{owner}/{name}\`
2. **If \`safe === true\`:** Proceed with installation
3. **If \`safe === false\` and \`status === "caution"\`:** Warn the user, show the summary, let them decide
4. **If \`safe === false\` and \`status === "failed"\`:** Block installation, show the summary and risk details
5. **If 404 (not found):** Skill has never been scanned — proceed with caution or request a scan

### Key Fields for Agents

- \`safe\` — Single boolean: is this skill safe to install right now?
- \`status\` — Trust tier: verified, caution, failed, outdated, scanning, unscanned
- \`risk_score\` — 0-10 numeric risk (lower is safer)
- \`trust_score\` — 0-100 trust score (higher is safer)
- \`is_outdated\` — Code has changed since last scan
- \`summary\` — Human-readable analysis summary

${examplesSection}

## URLs

- Homepage: https://scanner.pyxmate.com
- Browse all skills: https://scanner.pyxmate.com/browse
- Skill detail: https://scanner.pyxmate.com/s/{owner}/{name}
- Badge API: https://scanner.pyxmate.com/api/v1/badge/{owner}/{name}
- Check API: https://scanner.pyxmate.com/api/v1/check/{owner}/{name}
- Skills API: https://scanner.pyxmate.com/api/v1/skills
- OpenAPI Spec: https://scanner.pyxmate.com/api/v1/openapi.json
- API Docs: https://scanner.pyxmate.com/docs

## Contact

- Website: https://scanner.pyxmate.com
- Source: https://github.com/pyxai
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

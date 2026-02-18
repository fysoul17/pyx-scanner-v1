<div align="center">

# PYX Scanner

**The trust layer for the AI agent ecosystem.**

Automated security scanning for AI agent skills — AI-powered analysis, static rule matching,\
and dependency vulnerability scanning so you know what's safe before you run it.

[![CI](https://github.com/fysoul17/pyx-scanner-v1/actions/workflows/ci.yml/badge.svg)](https://github.com/fysoul17/pyx-scanner-v1/actions/workflows/ci.yml)
[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](CHANGELOG.md)
[![GitHub Stars](https://img.shields.io/github/stars/fysoul17/pyx-scanner-v1?style=social)](https://github.com/fysoul17/pyx-scanner-v1)

</div>

## How It Works

Every skill is assigned a **trust score** from 0 to 10 using a three-tier system:

| Tier | Score | Intent | Meaning |
|------|-------|--------|---------|
| **Verified** | 0–3 | Benign | Safe to use. No threats detected. |
| **Caution** | 4–6 | Risky | Broad permissions or risky patterns, but likely legitimate. |
| **Failed** | 7–10 | Malicious | Active threats detected. Do not use. |

Intent is classified _before_ scoring. If a skill is flagged as malicious but scores below 7, the score is automatically bumped to 7.

## Quick Start

### For Humans

Copy this prompt into any AI agent (Claude, ChatGPT, Cursor, etc.):

```
Install fysoul17/pyx-scan from ClawHub if you don't have it, then use it to scan all my installed skills for safety. Show me the results.
```

### For Agents / Developers

Add this to your agent's system prompt, `CLAUDE.md`, or tool configuration to enable automatic safety checks:

```
Before installing any AI agent skill, check its safety via the PYX Scanner API:

  GET https://scanner.pyxmate.com/api/v1/check/{owner}/{name}

- If "safe": true → proceed with installation.
- If "safe": false and "status": "caution" → warn the user and show the "summary" before proceeding.
- If "safe": false and "status": "failed" → block installation and show the "summary".
- If 404 → the skill has never been scanned. Warn the user it is unverified.

No authentication required. Always check before installing.
```

For full integration docs, see [llms.txt](https://scanner.pyxmate.com/llms.txt) or the [Agent Guide](https://scanner.pyxmate.com/docs/integrations/agent-guide).

---

## Features

- **AI-powered analysis** — Claude Opus/Sonnet performs deep semantic review of skill source code
- **20 static regex rules** — Detects obfuscation, code execution, data exfiltration, credential access, and more (14 critical, 4 warning, 2 info)
- **Dependency vulnerability scanning** — Checks against OSV.dev with a 10-second timeout
- **SVG trust badges** — Embeddable badges for skill READMEs showing current trust status
- **ClawHub integration** — Batch import and scan skills from ClawHub
- **Three-tier trust scoring** — Intent classification with confidence scoring (0–100)

## Project Structure

```
pyx-scanner/
├── apps/
│   └── web/              # Next.js 16 frontend + API routes
│       ├── src/app/      # App Router pages and API
│       ├── src/components/
│       └── lib/          # Queries, server actions, Supabase client
├── packages/
│   └── cli/              # CLI package (deferred — see ADR-002)
├── scripts/              # Scan engine
│   ├── scan.ts           # Main scan orchestration
│   ├── static-rules.ts   # 20 regex rules
│   ├── dep-scan.ts       # OSV.dev dependency scanning
│   ├── pre-scan.ts       # Pre-scan context builder
│   ├── clawhub-import.ts # ClawHub batch importer
│   └── ...
├── src/shared/types.ts   # Shared TypeScript types
├── docs/                 # Architecture decisions, design system
└── supabase/migrations/  # Database schema
```

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/)
- A [Supabase](https://supabase.com/) project
- An [Anthropic API key](https://console.anthropic.com/) (for scanning)

### Setup

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/fysoul17/pyx-scanner-v1.git
cd pyx-scanner-v1
pnpm install
```

2. Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Optional:

```
PYX_ADMIN_API_KEY=...    # Only needed by PYX team for running scans
GITHUB_TOKEN=ghp_...     # Recommended for higher GitHub rate limits
```

3. Start the dev server:

```bash
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Scanning a Skill

Use the scan script to analyze a GitHub repository:

```bash
# Dry run — prints payload without submitting
pnpm scan:dry <owner/repo>

# Live scan — submits results to the API
pnpm scan <owner/repo>

# Force re-scan of an already-scanned commit
pnpm scan <owner/repo> --force

# Use a specific Claude model (opus, sonnet, haiku)
pnpm scan <owner/repo> --model opus
```

### ClawHub Import

Batch import and scan skills from ClawHub:

```bash
# Import trending skills (dry run)
pnpm scan:clawhub:dry --trending --limit 10

# Import and scan (--all sorts by downloads, has full pagination)
pnpm scan:clawhub --all --limit 50 --model sonnet

# Scan skills 51–100
pnpm scan:clawhub --all --skip 50 --limit 100
```

> **Note:** `--trending` returns a limited set (~50 skills) with no pagination. Use `--all` or `--new` for larger imports. `--skip` is a positional offset on the current API response — use the same sort option across runs for consistent ordering. Already-scanned skills are automatically skipped via dedup (without `--force`).

## API Reference

All write endpoints require admin authentication via `Authorization: Bearer <PYX_ADMIN_API_KEY>`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/scan` | Admin | Queue a scan job |
| `POST` | `/api/v1/scan-result` | Admin | Submit scan results |
| `GET` | `/api/v1/badge/[owner]/[name]` | Public | SVG trust badge |

### Queue a Scan

```bash
curl -X POST https://scanner.pyxmate.com/api/v1/scan \
  -H "Authorization: Bearer $PYX_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"owner": "anthropic", "name": "web-search"}'
```

### Submit Scan Results

```bash
curl -X POST https://scanner.pyxmate.com/api/v1/scan-result \
  -H "Authorization: Bearer $PYX_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "anthropic",
    "name": "web-search",
    "commit_hash": "abc123",
    "trust_status": "verified",
    "recommendation": "safe",
    "risk_score": 1,
    "summary": "No threats detected."
  }'
```

## Badge Usage

Embed a trust badge in any markdown file:

```markdown
![PYX Trust Badge](https://scanner.pyxmate.com/api/v1/badge/OWNER/SKILL_NAME)
```

Badge colors reflect the current trust status: green (verified), amber (caution/outdated), red (failed), blue (scanning), gray (unscanned).

## Tech Stack

- **Framework** — Next.js 16 (App Router, Turbopack)
- **UI** — React 19, Tailwind CSS v4
- **Database** — Supabase (PostgreSQL)
- **AI** — Claude API (Opus/Sonnet/Haiku)
- **Language** — TypeScript 5
- **Package Manager** — pnpm (monorepo workspaces)
- **Vulnerability Data** — OSV.dev

## Architecture

The data access layer follows a 3-layer pattern:

1. **Query functions** (`lib/queries/`) — Pure async functions wrapped with `React.cache()` for per-request deduplication
2. **Server actions** (`lib/actions/`) — Error-safe wrappers for client components, return fallback data on failure
3. **API routes** (`apps/web/src/app/api/v1/`) — External HTTP endpoints for admin operations and public badges

See the codebase for full implementation details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

To report a security vulnerability, please use [GitHub Security Advisories](https://github.com/fysoul17/pyx-scanner-v1/security/advisories/new). See our [Security Policy](SECURITY.md) for details.

## License

PYX Scanner is licensed under the [Business Source License 1.1](LICENSE).

**TL;DR:** You can view, fork, and contribute to the source code. Production use in a competing commercial product requires a separate license. The code automatically converts to Apache 2.0 after the change date specified in the LICENSE file.

## Star History

<a href="https://star-history.com/#fysoul17/pyx-scanner-v1&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=fysoul17/pyx-scanner-v1&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=fysoul17/pyx-scanner-v1&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=fysoul17/pyx-scanner-v1&type=Date" />
 </picture>
</a>

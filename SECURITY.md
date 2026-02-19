# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

Please report security vulnerabilities through [GitHub Security Advisories](https://github.com/fysoul17/pyx-scanner-v1/security/advisories/new).

**Do not** open a public issue for security vulnerabilities.

### Response Timeline

- **48 hours** — Initial acknowledgment
- **7 days** — Triage and severity assessment
- **90 days** — Coordinated disclosure deadline

### Scope

In scope:
- Web application (`apps/web/`)
- API endpoints (`/api/v1/*`)
- Scan engine (`scripts/`)
- Database schema and migrations
- Dependencies

Out of scope:
- Hosted infrastructure (Supabase, Cloudflare)
- Third-party services (GitHub API, OSV.dev)

### Architecture Notes

- Admin endpoints use timing-safe comparison for API key validation
- The Supabase client is lazy-initialized and server-side only
- All scanning runs server-side; no user-submitted code is executed client-side

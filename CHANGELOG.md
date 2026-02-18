# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-18

### Added

- AI-powered security scanning using Claude (Opus/Sonnet/Haiku) for deep semantic analysis of AI agent skill source code
- 20 static regex rules (14 critical, 4 warning, 2 info) detecting obfuscation, code execution, data exfiltration, credential access, and more
- Dependency vulnerability scanning via OSV.dev with 10-second timeout
- Three-tier trust scoring system: verified (0-3), caution (4-6), failed (7-10)
- Intent classification (benign/risky/malicious) performed before scoring with cross-check validation
- Confidence scoring (0-100) for scan results
- SVG trust badges for embedding in skill READMEs
- ClawHub integration for batch importing and scanning skills
- Browse page with search, filtering by trust status, and sort by popularity
- Popular Skills section on landing page
- Stars and downloads display for scanned skills
- Admin API endpoints for queuing scans and submitting results (Bearer token auth)
- Public badge API endpoint
- Three-layer data access architecture (queries, server actions, API routes)
- Database schema with skills, scan_results, and scan_jobs tables
- Migration runner using Supabase RPC
- CLI package scaffold (deferred — see ADR-002)

[1.0.0]: https://github.com/fysoul17/pyx-scanner/releases/tag/v1.0.0

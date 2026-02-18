# Contributing to PYX Scanner

Thank you for your interest in contributing! This guide will help you get started.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 10+
- A [Supabase](https://supabase.com/) project
- An [Anthropic API key](https://console.anthropic.com/) (for running scans)

## Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/<your-username>/pyx-scanner.git
cd pyx-scanner
```

2. Install dependencies:

```bash
pnpm install
```

3. Copy the environment template:

```bash
cp .env.example .env
```

4. Fill in your environment variables (see `.env.example` for details).

5. Start the dev server:

```bash
pnpm dev
```

## Project Structure

This is a pnpm monorepo:

```
pyx-scanner/
├── apps/web/       # Next.js 16 frontend + API routes
├── packages/cli/   # CLI package (deferred)
├── scripts/        # Scan engine
├── src/shared/     # Shared TypeScript types
└── docs/           # Architecture decisions
```

## Development Workflow

### Branch Naming

Use descriptive branch names: `feat/add-xyz`, `fix/null-check`, `docs/update-readme`.

### Before Submitting

1. Run lint: `pnpm lint`
2. Run typecheck: `pnpm typecheck`
3. Run build: `pnpm build`

### Commit Conventions

Follow conventional commits. See [`.claude/commit-conventions.md`](.claude/commit-conventions.md) for the full guide.

```
feat: add user authentication
fix: resolve null pointer in auth middleware
docs: update API usage guide
```

### Pull Request Process

- Open an issue first for significant changes
- Keep PRs focused — one feature or fix per PR
- Fill out the PR template completely
- Ensure CI passes before requesting review

## Architecture Guide

The data access layer uses a 3-layer pattern:

1. **Query functions** (`lib/queries/`) — Pure async, `React.cache()` wrapped
2. **Server actions** (`lib/actions/`) — Error-safe wrappers for client components
3. **API routes** (`api/v1/`) — External HTTP endpoints (admin-only writes, public badges)

See [`docs/architecture-decisions.md`](docs/architecture-decisions.md) for full details.

## Database Conventions

- Use `TIMESTAMPTZ` for all timestamp columns
- Use `CHECK` constraints for status enums
- Migrations go in `src/db/migrations/`

## Scan Engine

The scan engine (`scripts/`) has three stages:

1. **Static rules** (`static-rules.ts`) — 20 regex rules, runs in milliseconds
2. **Dependency scan** (`dep-scan.ts`) — Checks OSV.dev, 10s timeout
3. **AI analysis** — Claude reviews source code with pre-scan context injected

## License

By contributing, you agree that your contributions will be licensed under the [BSL 1.1](LICENSE).

#!/usr/bin/env npx tsx
/**
 * PYX Scanner — Local scanning engine (multi-skill aware)
 *
 * Usage:
 *   npx tsx scripts/scan.ts <owner/repo> [--dry-run] [--force] [--model opus|sonnet|haiku]
 *
 * Environment:
 *   PYX_ADMIN_API_KEY  — Required for live mode (Bearer token for admin API)
 *   PYX_API_URL        — Optional, defaults to https://scanner.pyxmate.com
 *   GITHUB_TOKEN       — Optional, recommended for higher GitHub rate limits
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAnalysisPrompt,
  buildScopedAnalysisPrompt,
  buildSystemPrompt,
  buildPreScanContext,
} from "./scan-prompt.js";
import { scanResultSchema } from "./scan-schema.js";
import {
  buildDiscoveryPrompt,
  buildDiscoverySystemPrompt,
} from "./discovery-prompt.js";
import { discoverySchema } from "./discovery-schema.js";
import type { DiscoveredSkill, DiscoveryOutput } from "./discovery-schema.js";
import {
  runClaude,
  validateAndFixOutput,
  RepoCodeCache,
  type ScanOutput,
  type CachedFile,
} from "./analyze.js";
import { runStaticRules, type StaticRulesResult } from "./static-rules.js";
import { runDepScan, type DepScanResult } from "./dep-scan.js";
import { runPreScan, type PreScanResult } from "./pre-scan.js";
import { checkAlreadyScanned } from "./dedup.js";
import { withRetry, TransientError, isTransientStatus } from "./retry.js";

// Load .env from project root (Node doesn't do this automatically)
try {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envFile = readFileSync(resolve(__dirname, "../.env"), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env not found — rely on shell environment
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GitHubCommit {
  sha: string;
}

interface GitHubTreeEntry {
  path: string;
  type: string;
  sha: string;
  size?: number;
}

interface GitHubTree {
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

interface GitHubBlob {
  content: string;
  encoding: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_URL =
  process.env.PYX_API_URL ?? "https://scanner.pyxmate.com";
const ADMIN_KEY = process.env.PYX_ADMIN_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const MAX_CODE_BYTES = 200 * 1024; // 200KB (for AI discovery path)
const MAX_SKILL_CODE_BYTES = 150 * 1024; // 150KB per-skill analysis limit

// File extensions to include in analysis
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rs",
  ".go",
  ".rb",
  ".sh",
  ".bash",
  ".zsh",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".md",
  ".txt",
]);

// Paths/patterns to always skip
const SKIP_PATTERNS = [
  /node_modules\//,
  /\.git\//,
  /dist\//,
  /build\//,
  /\.next\//,
  /coverage\//,
  /\.turbo\//,
  /vendor\//,
  /__pycache__\//,
  /\.lock$/,
  /lock\.json$/,
  /lock\.yaml$/,
  /-lock\.yml$/,
  /\.min\.(js|css)$/,
  /\.map$/,
  /\.wasm$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.svg$/,
  /\.ico$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
  /\.mp[34]$/,
  /\.webm$/,
  /\.webp$/,
  /\.pdf$/,
  /\.zip$/,
  /\.tar\.\w+$/,
  /\.gz$/,
];

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "pyx-scanner/1.0",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }
  return headers;
}

async function githubFetch<T>(path: string): Promise<T> {
  const url = `https://api.github.com${path}`;
  return withRetry(
    async () => {
      const res = await fetch(url, { headers: githubHeaders() });
      if (!res.ok) {
        const body = await res.text();
        if (isTransientStatus(res.status)) {
          throw new TransientError(`GitHub API ${res.status} for ${path}: ${body}`);
        }
        throw new Error(`GitHub API ${res.status} for ${path}: ${body}`);
      }
      return res.json() as Promise<T>;
    },
    { label: `GitHub ${path}` }
  );
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

interface GitHubRepoMeta {
  stargazers_count: number;
  forks_count: number;
  private: boolean;
}

async function fetchRepoMetadata(
  owner: string,
  repoName: string
): Promise<GitHubRepoMeta | null> {
  try {
    return await githubFetch<GitHubRepoMeta>(`/repos/${owner}/${repoName}`);
  } catch {
    return null;
  }
}

async function getLatestCommit(owner: string, repoName: string): Promise<string> {
  const commits = await githubFetch<GitHubCommit[]>(
    `/repos/${owner}/${repoName}/commits?per_page=1`
  );
  if (!commits.length) {
    throw new Error(`No commits found for ${owner}/${repoName}`);
  }
  return commits[0].sha;
}

async function fetchRepoTree(
  owner: string,
  repoName: string,
  commitSha: string
): Promise<GitHubTree> {
  const tree = await githubFetch<GitHubTree>(
    `/repos/${owner}/${repoName}/git/trees/${commitSha}?recursive=1`
  );

  if (tree.truncated) {
    console.warn("Warning: repository tree was truncated by GitHub API");
  }

  return tree;
}

// ---------------------------------------------------------------------------
// Heuristic skill detection from tree (no file downloads needed)
// ---------------------------------------------------------------------------

interface SkillInfo {
  name: string;           // Extracted skill name
  basePath: string;       // Base directory path (e.g., "skills/1password")
  skillMdPath: string;    // Full path to SKILL.md
}

/**
 * Extracts skill metadata from a SKILL.md file path.
 * Supports multiple directory structure patterns commonly used in skill repositories.
 *
 * @param skillMdPath - Path to SKILL.md file (e.g., "skills/github/SKILL.md")
 * @returns SkillInfo with extracted name and base path, or null if path doesn't match any pattern
 *
 * @example
 * extractSkillInfo("skills/github/SKILL.md") // → { name: "github", basePath: "skills/github", ... }
 * extractSkillInfo("extensions/feishu/skills/doc/SKILL.md") // → { name: "feishu-doc", ... }
 */
function extractSkillInfo(skillMdPath: string): SkillInfo | null {
  // Extract skill name and base path from various patterns

  // Pattern 1: .claude/skills/<name>/SKILL.md
  let match = skillMdPath.match(/^\.claude\/skills\/([^/]+)\/SKILL\.md$/);
  if (match) {
    return {
      name: match[1],
      basePath: `.claude/skills/${match[1]}`,
      skillMdPath,
    };
  }

  // Pattern 2: skills/<name>/SKILL.md (root-level)
  match = skillMdPath.match(/^skills\/([^/]+)\/SKILL\.md$/);
  if (match) {
    return {
      name: match[1],
      basePath: `skills/${match[1]}`,
      skillMdPath,
    };
  }

  // Pattern 3: extensions/<ext>/skills/<name>/SKILL.md
  match = skillMdPath.match(/^extensions\/([^/]+)\/skills\/([^/]+)\/SKILL\.md$/);
  if (match) {
    // Use combined name to avoid conflicts: extension-skillname
    const combinedName = `${match[1]}-${match[2]}`;
    return {
      name: combinedName,
      basePath: `extensions/${match[1]}/skills/${match[2]}`,
      skillMdPath,
    };
  }

  // Pattern 4: extensions/<name>/SKILL.md (extension root, rare)
  match = skillMdPath.match(/^extensions\/([^/]+)\/SKILL\.md$/);
  if (match) {
    return {
      name: match[1],
      basePath: `extensions/${match[1]}`,
      skillMdPath,
    };
  }

  // Pattern 5: .agents/skills/<name>/SKILL.md
  match = skillMdPath.match(/^\.agents\/skills\/([^/]+)\/SKILL\.md$/);
  if (match) {
    return {
      name: match[1],
      basePath: `.agents/skills/${match[1]}`,
      skillMdPath,
    };
  }

  // Pattern 6: Generic fallback for any other */SKILL.md
  // Use parent directory name as skill name
  const segments = skillMdPath.split('/');
  if (segments.length >= 2 && segments[segments.length - 1] === 'SKILL.md') {
    const skillName = segments[segments.length - 2];
    const basePath = segments.slice(0, -1).join('/');
    return {
      name: skillName,
      basePath,
      skillMdPath,
    };
  }

  return null;
}

function detectSkillsFromTree(tree: GitHubTree): DiscoveredSkill[] {
  const skillsMap = new Map<string, SkillInfo>();
  const skillFiles = new Map<string, string[]>(); // skillName → file paths
  const sharedFiles: string[] = [];

  // Pass 1: Find all SKILL.md files and extract skill info
  for (const entry of tree.tree) {
    if (entry.type !== "blob") continue;

    if (entry.path.endsWith('/SKILL.md')) {
      const info = extractSkillInfo(entry.path);
      if (info) {
        skillsMap.set(info.name, info);
        skillFiles.set(info.name, []);
      }
    }

    // Collect shared root files
    const lower = entry.path.toLowerCase();
    if (lower === "readme.md" || lower === "package.json") {
      sharedFiles.push(entry.path);
    }
  }

  // Pass 2: Associate files with skills based on directory boundaries
  for (const entry of tree.tree) {
    if (entry.type !== "blob") continue;

    for (const [skillName, info] of skillsMap) {
      // Include file if it's under the skill's base path
      if (entry.path.startsWith(info.basePath + '/') || entry.path === info.skillMdPath) {
        skillFiles.get(skillName)!.push(entry.path);
      }
    }
  }

  // Build final result
  const skills: DiscoveredSkill[] = [];
  for (const [skillName, info] of skillsMap) {
    const files = skillFiles.get(skillName) ?? [];
    skills.push({
      skill_name: skillName,
      description: `Claude Code skill: ${skillName}`,
      relevant_files: [...files, ...sharedFiles],
    });
  }

  return skills;
}

/**
 * Determines if a repository is documentation-only (no skills to scan).
 * Checks for absence of SKILL.md files AND absence of source code.
 *
 * @param tree - GitHub tree with all repository files
 * @returns true if repo should be skipped (doc-only), false if should be scanned
 */
function isDocumentationOnlyRepo(tree: GitHubTree): boolean {
  let hasSkillMd = false;
  let hasSourceCode = false;

  for (const entry of tree.tree) {
    if (entry.type !== "blob") continue;

    // Check for SKILL.md files
    if (entry.path.endsWith('/SKILL.md')) {
      hasSkillMd = true;
      break; // Found skill, not doc-only
    }

    // Check for source code files (not just markdown/text/config)
    const ext = '.' + entry.path.split('.').pop()?.toLowerCase();
    const isSourceCode = SOURCE_EXTENSIONS.has(ext) &&
                         !['.md', '.txt', '.json', '.yaml', '.yml', '.toml'].includes(ext);

    if (isSourceCode) {
      hasSourceCode = true;
      // Don't break yet - still need to check for SKILL.md
    }
  }

  // Repo is doc-only if it has neither SKILL.md nor source code
  return !hasSkillMd && !hasSourceCode;
}

// Parse YAML frontmatter description from SKILL.md content
function parseSkillDescription(content: string): string | null {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
  if (!descMatch) return null;
  return descMatch[1].trim().replace(/^["']|["']$/g, "");
}

// ---------------------------------------------------------------------------
// File download
// ---------------------------------------------------------------------------

async function fetchRepoCode(
  owner: string,
  repoName: string,
  tree: GitHubTree,
  scopedPaths?: Set<string>
): Promise<RepoCodeCache> {
  let filesToDownload: GitHubTreeEntry[];

  if (scopedPaths) {
    // Scoped mode: only download files in scopedPaths, no filtering/sorting
    filesToDownload = tree.tree.filter(
      (entry) => entry.type === "blob" && scopedPaths.has(entry.path)
    );
  } else {
    // Full mode: filter to source files, skip large/binary/irrelevant files
    filesToDownload = tree.tree
      .filter((entry) => {
        if (entry.type !== "blob") return false;
        if (SKIP_PATTERNS.some((p) => p.test(entry.path))) return false;
        const ext = "." + entry.path.split(".").pop()?.toLowerCase();
        if (!SOURCE_EXTENSIONS.has(ext)) return false;
        // Skip files larger than 100KB individually
        if (entry.size && entry.size > 100_000) return false;
        return true;
      })
      // Prioritize config/readme files first (they reveal intent), then source
      .sort((a, b) => {
        const priorityFiles = [
          "package.json",
          "readme.md",
          "readme",
          "manifest.json",
          "pyproject.toml",
          "cargo.toml",
          "go.mod",
        ];
        const aName = a.path.split("/").pop()?.toLowerCase() ?? "";
        const bName = b.path.split("/").pop()?.toLowerCase() ?? "";
        const aPriority = priorityFiles.some((p) => aName.startsWith(p))
          ? 0
          : 1;
        const bPriority = priorityFiles.some((p) => bName.startsWith(p))
          ? 0
          : 1;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.path.localeCompare(b.path);
      });
  }

  // Download file contents (apply MAX_CODE_BYTES limit only in non-scoped mode)
  const applyLimit = !scopedPaths;
  let totalBytes = 0;
  const cachedFiles: CachedFile[] = [];

  for (const file of filesToDownload) {
    if (applyLimit && totalBytes >= MAX_CODE_BYTES) {
      console.warn(
        `Truncated: ${MAX_CODE_BYTES / 1024}KB limit reached after ${cachedFiles.length}/${filesToDownload.length} files`
      );
      break;
    }

    try {
      const blob = await githubFetch<GitHubBlob>(
        `/repos/${owner}/${repoName}/git/blobs/${file.sha}`
      );

      let content: string;
      if (blob.encoding === "base64") {
        content = Buffer.from(blob.content, "base64").toString("utf-8");
      } else {
        content = blob.content;
      }

      if (applyLimit) {
        const remaining = MAX_CODE_BYTES - totalBytes;
        if (content.length > remaining) {
          content = content.slice(0, remaining) + "\n[... truncated]";
        }
      }

      cachedFiles.push({ path: file.path, content });
      totalBytes += content.length;
    } catch (err) {
      console.warn(`Warning: failed to fetch ${file.path}: ${err}`);
    }
  }

  if (cachedFiles.length === 0) {
    throw new Error(
      `No source files found in ${owner}/${repoName}. The repository may be empty or contain only binary files.`
    );
  }

  console.log(
    `Fetched ${cachedFiles.length}/${filesToDownload.length} files (${(totalBytes / 1024).toFixed(1)}KB)${applyLimit ? ` [${MAX_CODE_BYTES / 1024}KB limit]` : ""}`
  );
  return new RepoCodeCache(cachedFiles);
}

// ---------------------------------------------------------------------------
// Pre-scan pipeline (deterministic checks before Claude)
// ---------------------------------------------------------------------------

async function runPreScans(
  cache: RepoCodeCache
): Promise<{
  staticResult: StaticRulesResult;
  depResult: DepScanResult;
  preScanResult: PreScanResult;
  preScanContext: string;
}> {
  const files = cache.getFiles();

  console.log("\n--- Pre-scan: Running deterministic checks ---");

  // Pre-scan module (regex-based pattern matching)
  const preScanResult = runPreScan(files);
  if (preScanResult.summary.total > 0) {
    console.log(
      `  Pre-scan: ${preScanResult.summary.critical} critical, ${preScanResult.summary.warning} warning, ${preScanResult.summary.info} info`
    );
  }

  // Static rules (synchronous, milliseconds)
  const staticResult = runStaticRules(files);
  console.log(
    `  Static rules: ${staticResult.summary.critical} critical, ${staticResult.summary.warning} warning, ${staticResult.summary.info} info`
  );

  // Dependency scan (async, <1s typically)
  const depResult = await runDepScan(files);
  if (depResult.error) {
    console.warn(`  Dep scan warning: ${depResult.error}`);
  } else {
    console.log(
      `  Dep scan: ${depResult.vulnerabilities.length} vulnerabilities in ${depResult.scanned_packages} packages`
    );
  }

  const preScanContext = buildPreScanContext(staticResult, depResult);

  return { staticResult, depResult, preScanResult, preScanContext };
}

// ---------------------------------------------------------------------------
// Phase 1: Discovery
// ---------------------------------------------------------------------------

async function runDiscovery(
  owner: string,
  repoName: string,
  cache: RepoCodeCache,
  model: string
): Promise<DiscoveredSkill[]> {
  console.log("\n--- Phase 1: Discovering AI skills ---");

  const prompt = buildDiscoveryPrompt(owner, repoName, cache.getAllCode());
  const systemPrompt = buildDiscoverySystemPrompt();

  console.log(`Running Claude discovery (model: ${model})...`);
  const raw = (await runClaude(
    prompt,
    systemPrompt,
    discoverySchema,
    model
  )) as unknown as DiscoveryOutput;

  if (!raw.skills || !Array.isArray(raw.skills)) {
    console.warn("Discovery returned invalid format, falling back to single skill");
    return [];
  }

  // Validate relevant_files exist in the repo
  const validated: DiscoveredSkill[] = [];
  for (const skill of raw.skills) {
    const validFiles = cache.validatePaths(skill.relevant_files);
    if (validFiles.length === 0) {
      console.warn(
        `Skipping skill "${skill.skill_name}": no matching files found in repo`
      );
      continue;
    }
    validated.push({
      ...skill,
      relevant_files: validFiles,
    });
  }

  console.log(
    `Discovered ${validated.length} skill(s): ${validated.map((s) => s.skill_name).join(", ") || "(none)"}`
  );
  return validated;
}

// ---------------------------------------------------------------------------
// Phase 2: Per-skill security analysis
// ---------------------------------------------------------------------------

async function runScopedAnalysis(
  owner: string,
  repoName: string,
  skill: DiscoveredSkill,
  cache: RepoCodeCache,
  model: string,
  preScanContext?: string
): Promise<ScanOutput> {
  const scopedCode = cache.getScopedCode(skill.relevant_files, MAX_SKILL_CODE_BYTES);
  const prompt = buildScopedAnalysisPrompt(
    owner,
    repoName,
    skill.skill_name,
    skill.description,
    scopedCode,
    preScanContext
  );

  console.log(
    `\nAnalyzing "${skill.skill_name}" (${skill.relevant_files.length} files, ${(scopedCode.length / 1024).toFixed(1)}KB code)...`
  );
  const raw = (await runClaude(
    prompt,
    buildSystemPrompt(),
    scanResultSchema,
    model
  )) as unknown as ScanOutput;

  if (!raw.trust_status) {
    throw new Error(
      `Claude did not return valid scan output for skill "${skill.skill_name}"`
    );
  }

  return validateAndFixOutput(raw);
}

async function runWholeRepoAnalysis(
  owner: string,
  repoName: string,
  cache: RepoCodeCache,
  model: string,
  preScanContext?: string
): Promise<ScanOutput> {
  const prompt = buildAnalysisPrompt(owner, repoName, cache.getAllCode(), preScanContext);

  console.log(`\nRunning whole-repo analysis (model: ${model})...`);
  const raw = (await runClaude(
    prompt,
    buildSystemPrompt(),
    scanResultSchema,
    model
  )) as unknown as ScanOutput;

  if (!raw.trust_status) {
    throw new Error("Claude did not return valid scan output");
  }

  return validateAndFixOutput(raw);
}

// ---------------------------------------------------------------------------
// Result submission
// ---------------------------------------------------------------------------

async function submitResult(
  owner: string,
  skillName: string,
  repo: string,
  commitHash: string,
  output: ScanOutput,
  model: string,
  preScanData?: {
    staticResult: StaticRulesResult;
    depResult: DepScanResult;
    preScanResult?: PreScanResult;
  },
  repoMeta?: GitHubRepoMeta | null
): Promise<void> {
  // Merge static findings into details JSONB
  const enrichedDetails = {
    ...output.details,
    ...(preScanData
      ? {
          static_findings: preScanData.staticResult.findings,
          static_summary: preScanData.staticResult.summary,
          static_findings_assessment: output.static_findings_assessment,
        }
      : {}),
  };

  const payload = {
    owner,
    name: skillName,
    repo,
    commit_hash: commitHash,
    trust_status: output.trust_status,
    recommendation: output.recommendation,
    risk_score: output.risk_score,
    summary: output.summary,
    details: enrichedDetails,
    skill_about: output.skill_about,
    confidence: output.confidence,
    dependency_vulnerabilities: preScanData?.depResult.vulnerabilities ?? null,
    pre_scan_flags: preScanData?.preScanResult?.flags ?? null,
    static_findings_assessment: output.static_findings_assessment,
    intent: output.intent,
    category: output.category,
    model,
    ...(repoMeta
      ? {
          github_stars: repoMeta.stargazers_count,
          github_forks: repoMeta.forks_count,
          github_is_private: repoMeta.private,
        }
      : {}),
  };

  const data = await withRetry(
    async () => {
      let res: Response;
      try {
        res = await fetch(`${API_URL}/api/v1/scan-result`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ADMIN_KEY}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        throw new TransientError(
          `Failed to reach API: ${err instanceof Error ? err.message : err}`,
          err
        );
      }

      if (!res.ok) {
        const body = await res.text();
        if (isTransientStatus(res.status)) {
          throw new TransientError(`API returned ${res.status}: ${body}`);
        }
        throw new Error(`API returned ${res.status}: ${body}`);
      }

      return res.json();
    },
    { label: `submit ${owner}/${skillName}` }
  );

  console.log(`Result submitted for "${skillName}":`, data);
}

async function submitOrPrint(
  owner: string,
  skillName: string,
  output: ScanOutput,
  model: string,
  ctx: { repo: string; commitHash: string; dryRun: boolean },
  preScanData?: {
    staticResult: StaticRulesResult;
    depResult: DepScanResult;
    preScanResult?: PreScanResult;
  },
  repoMeta?: GitHubRepoMeta | null
): Promise<void> {
  if (ctx.dryRun) {
    const enrichedDetails = {
      ...output.details,
      ...(preScanData
        ? {
            static_findings: preScanData.staticResult.findings,
            static_summary: preScanData.staticResult.summary,
            static_findings_assessment: output.static_findings_assessment,
          }
        : {}),
    };
    console.log(`\n--- DRY RUN: ${skillName} ---\n`);
    console.log(JSON.stringify({
      owner, name: skillName, repo: ctx.repo,
      commit_hash: ctx.commitHash, trust_status: output.trust_status,
      recommendation: output.recommendation, risk_score: output.risk_score,
      confidence: output.confidence,
      summary: output.summary, details: enrichedDetails,
      dependency_vulnerabilities: preScanData?.depResult.vulnerabilities ?? null,
      pre_scan_flags: preScanData?.preScanResult?.flags ?? null,
      static_findings_assessment: output.static_findings_assessment,
      skill_about: output.skill_about, category: output.category, model,
      ...(repoMeta
        ? {
            github_stars: repoMeta.stargazers_count,
            github_forks: repoMeta.forks_count,
            github_is_private: repoMeta.private,
          }
        : {}),
    }, null, 2));
  } else {
    console.log(`\nSubmitting result for "${skillName}"...`);
    await submitResult(owner, skillName, ctx.repo, ctx.commitHash, output, model, preScanData, repoMeta);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.log(`
Usage: npx tsx scripts/scan.ts <owner/repo> [options]

Options:
  --dry-run         Print payload to stdout instead of submitting
  --force           Re-scan even if commit was already scanned
  --model <model>   Claude model to use (default: sonnet)
                    Accepts: opus, sonnet, haiku

Environment:
  PYX_ADMIN_API_KEY   Bearer token for admin API (required for live mode)
  PYX_API_URL         API base URL (default: https://scanner.pyxmate.com)
  GITHUB_TOKEN        GitHub PAT for higher rate limits (recommended)

Examples:
  npx tsx scripts/scan.ts modelcontextprotocol/servers --dry-run
  npx tsx scripts/scan.ts anthropic/web-search --model sonnet
`);
}

function parseArgs(argv: string[]): {
  owner: string;
  repoName: string;
  dryRun: boolean;
  force: boolean;
  model: string;
} {
  const args = argv.slice(2); // skip node + script path

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const repoArg = args[0];
  const parts = repoArg.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    console.error(
      `Error: invalid repo format "${repoArg}". Expected "owner/repo".`
    );
    process.exit(1);
  }

  let dryRun = false;
  let force = false;
  let model = "sonnet";

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--force") {
      force = true;
    } else if (args[i] === "--model") {
      i++;
      if (!args[i] || !["opus", "sonnet", "haiku"].includes(args[i])) {
        console.error('Error: --model must be "opus", "sonnet", or "haiku"');
        process.exit(1);
      }
      model = args[i];
    } else {
      console.error(`Error: unknown argument "${args[i]}"`);
      printUsage();
      process.exit(1);
    }
  }

  return { owner: parts[0], repoName: parts[1], dryRun, force, model };
}

async function scanHeuristicSkills(
  owner: string,
  repoName: string,
  skills: DiscoveredSkill[],
  tree: GitHubTree,
  model: string,
  ctx: { repo: string; commitHash: string; dryRun: boolean; force: boolean },
  repoMeta?: GitHubRepoMeta | null
): Promise<number> {
  console.log(
    `\nDetected ${skills.length} Claude Code skill(s) via file paths:`
  );
  for (const s of skills) {
    console.log(`  - ${s.skill_name} (${s.relevant_files.length} files)`);
  }

  // Download scoped files for all skills (union of all relevant_files)
  const allScopedPaths = new Set<string>();
  for (const skill of skills) {
    for (const f of skill.relevant_files) allScopedPaths.add(f);
  }

  console.log("\nFetching scoped repository code...");
  const cache = await fetchRepoCode(owner, repoName, tree, allScopedPaths);

  // Enrich descriptions from SKILL.md content
  for (const skill of skills) {
    // Find the SKILL.md file in relevant_files (it should be there from detectSkillsFromTree)
    const skillMdPath = skill.relevant_files.find(f => f.endsWith('/SKILL.md'));
    if (skillMdPath) {
      const skillMdCode = cache.getScopedCode([skillMdPath]);
      if (skillMdCode) {
        const content = skillMdCode.replace(/^--- .+ ---\n/, "");
        const desc = parseSkillDescription(content);
        if (desc) skill.description = desc;
      }
    }
  }

  // Run pre-scans on all scoped files
  const { staticResult, depResult, preScanResult, preScanContext } = await runPreScans(cache);

  let count = 0;
  let skipped = 0;
  for (const skill of skills) {
    if (!ctx.force && !ctx.dryRun) {
      const alreadyScanned = await checkAlreadyScanned(owner, skill.skill_name, ctx.commitHash);
      if (alreadyScanned) {
        console.log(`Skipping "${skill.skill_name}": already scanned at commit ${ctx.commitHash.slice(0, 12)}`);
        skipped++;
        continue;
      }
    }
    const output = await runScopedAnalysis(owner, repoName, skill, cache, model, preScanContext);
    await submitOrPrint(owner, skill.skill_name, output, model, ctx, { staticResult, depResult, preScanResult }, repoMeta);
    count++;
  }
  if (skipped > 0) {
    console.log(`Skipped ${skipped} already-scanned skill(s). Use --force to re-scan.`);
  }
  return count;
}

async function scanWithAIDiscovery(
  owner: string,
  repoName: string,
  tree: GitHubTree,
  model: string,
  ctx: { repo: string; commitHash: string; dryRun: boolean; force: boolean },
  repoMeta?: GitHubRepoMeta | null
): Promise<number> {
  console.log("No Claude Code skills detected — using AI discovery...");

  console.log("Fetching repository code...");
  const cache = await fetchRepoCode(owner, repoName, tree);

  const skills = await runDiscovery(owner, repoName, cache, model);

  // Run pre-scans
  const { staticResult, depResult, preScanResult, preScanContext } = await runPreScans(cache);
  const preScanData = { staticResult, depResult, preScanResult };

  const analyzed: { skillName: string; output: ScanOutput }[] = [];
  let skipped = 0;

  if (skills.length === 0) {
    console.log("\nNo individual skills discovered — analyzing as single skill");
    if (!ctx.force && !ctx.dryRun) {
      const alreadyScanned = await checkAlreadyScanned(owner, repoName, ctx.commitHash);
      if (alreadyScanned) {
        console.log(`Skipping "${repoName}": already scanned at commit ${ctx.commitHash.slice(0, 12)}`);
        console.log("Use --force to re-scan.");
        return 0;
      }
    }
    const output = await runWholeRepoAnalysis(owner, repoName, cache, model, preScanContext);
    analyzed.push({ skillName: repoName, output });
  } else {
    for (const skill of skills) {
      if (!ctx.force && !ctx.dryRun) {
        const alreadyScanned = await checkAlreadyScanned(owner, skill.skill_name, ctx.commitHash);
        if (alreadyScanned) {
          console.log(`Skipping "${skill.skill_name}": already scanned at commit ${ctx.commitHash.slice(0, 12)}`);
          skipped++;
          continue;
        }
      }
      const output = await runScopedAnalysis(owner, repoName, skill, cache, model, preScanContext);
      analyzed.push({ skillName: skill.skill_name, output });
    }
  }

  if (skipped > 0) {
    console.log(`Skipped ${skipped} already-scanned skill(s). Use --force to re-scan.`);
  }

  let count = 0;
  for (const { skillName, output } of analyzed) {
    await submitOrPrint(owner, skillName, output, model, ctx, preScanData, repoMeta);
    count++;
  }
  return count;
}

export interface ScanGitHubRepoOptions {
  dryRun?: boolean;
  force?: boolean;
  model?: string;
}

/**
 * Scans a GitHub repository for AI skills.
 * Reusable core — called by CLI and queue consumer.
 *
 * @returns Number of skills scanned
 */
export async function scanGitHubRepo(
  owner: string,
  repoName: string,
  options: ScanGitHubRepoOptions = {}
): Promise<number> {
  const { dryRun = false, force = false, model = "sonnet" } = options;
  const repo = `${owner}/${repoName}`;

  console.log(`\nScanning ${repo}...`);
  if (force) console.log("Force mode: will re-scan even if already scanned");

  console.log("Fetching latest commit and repo metadata...");
  const [commitHash, repoMeta] = await Promise.all([
    getLatestCommit(owner, repoName),
    fetchRepoMetadata(owner, repoName),
  ]);
  console.log(`Latest commit: ${commitHash.slice(0, 12)}`);
  if (repoMeta) {
    console.log(`Repo: ${repoMeta.private ? "private" : "public"}, ${repoMeta.stargazers_count} stars, ${repoMeta.forks_count} forks`);
  }

  console.log("Fetching repository tree...");
  const tree = await fetchRepoTree(owner, repoName, commitHash);
  console.log(`Tree contains ${tree.tree.length} entries`);

  // Check if this is a documentation-only repository
  if (isDocumentationOnlyRepo(tree)) {
    console.log(`\nSkipping ${repo}: Documentation-only repository (no skills to scan)`);
    console.log("   Reason: Repository contains no SKILL.md files and no source code.");
    console.log("   This appears to be a curated list, documentation, or reference repository.");
    return 0;
  }

  if (!dryRun && !ADMIN_KEY) {
    throw new Error("PYX_ADMIN_API_KEY is required for live mode. Use --dry-run to preview.");
  }

  const heuristicSkills = detectSkillsFromTree(tree);
  const ctx = { repo, commitHash, dryRun, force };

  const count =
    heuristicSkills.length > 0
      ? await scanHeuristicSkills(owner, repoName, heuristicSkills, tree, model, ctx, repoMeta)
      : await scanWithAIDiscovery(owner, repoName, tree, model, ctx, repoMeta);

  if (!dryRun) {
    console.log(`\nDone! Scanned ${count} skill(s) from ${repo}.`);
  }

  return count;
}

async function tryDrainQueue(options: { dryRun: boolean; force: boolean; model: string }): Promise<void> {
  try {
    const { drainQueue } = await import("./process-queue.js");
    const count = await drainQueue({ ...options, limit: 50 });
    if (count > 0) {
      console.log(`\nProcessed ${count} queued scan request(s) before main scan.\n`);
    }
  } catch {
    // Queue drain is best-effort — missing env vars (SUPABASE_URL) shouldn't block CLI
  }
}

async function main(): Promise<void> {
  const { owner, repoName, dryRun, force, model } = parseArgs(process.argv);

  // Drain pending queue jobs first (best-effort)
  await tryDrainQueue({ dryRun, force, model });

  await scanGitHubRepo(owner, repoName, { dryRun, force, model });
}

main().catch((err) => {
  console.error("Scan failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

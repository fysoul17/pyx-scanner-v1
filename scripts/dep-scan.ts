/**
 * Dependency vulnerability scanner via OSV.dev API.
 *
 * Parses package.json from CachedFile array, queries OSV batch endpoint,
 * and maps results to DepVulnerability[].
 *
 * Free, no auth needed. Never blocks the scan — returns empty on failure.
 */

import type { CachedFile } from "./analyze.js";
import type { DepVulnerability } from "../src/shared/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DepScanResult {
  vulnerabilities: DepVulnerability[];
  scanned_packages: number;
  error: string | null;
}

interface PackageDep {
  name: string;
  version: string;
}

interface OSVQuery {
  version: string;
  package: { name: string; ecosystem: string };
}

interface OSVVulnerability {
  id: string;
  summary?: string;
  severity?: Array<{ type: string; score: string }>;
  affected?: Array<{
    ranges?: Array<{
      events?: Array<{ fixed?: string }>;
    }>;
  }>;
  references?: Array<{ url: string }>;
}

interface OSVBatchResponse {
  results: Array<{ vulns?: OSVVulnerability[] }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip semver range operators to get a plain version string. */
function stripRange(version: string): string {
  return version.replace(/^[\^~>=<*| ]+/, "").trim();
}

/** Map CVSS score to severity label. */
function cvssToSeverity(score: number): DepVulnerability["severity"] {
  if (score >= 9.0) return "CRITICAL";
  if (score >= 7.0) return "HIGH";
  if (score >= 4.0) return "MODERATE";
  return "LOW";
}

/** Extract CVSS score from OSV severity array. */
function extractSeverity(vuln: OSVVulnerability): DepVulnerability["severity"] {
  if (vuln.severity && vuln.severity.length > 0) {
    for (const s of vuln.severity) {
      if (s.type === "CVSS_V3" || s.type === "CVSS_V2") {
        const score = parseFloat(s.score);
        if (!isNaN(score)) return cvssToSeverity(score);
      }
    }
  }
  // Default to MODERATE if no CVSS score available
  return "MODERATE";
}

/** Extract fixed version from OSV affected ranges. */
function extractFixedVersion(vuln: OSVVulnerability): string | null {
  if (!vuln.affected) return null;
  for (const affected of vuln.affected) {
    if (!affected.ranges) continue;
    for (const range of affected.ranges) {
      if (!range.events) continue;
      for (const event of range.events) {
        if (event.fixed) return event.fixed;
      }
    }
  }
  return null;
}

/** Extract reference URL from OSV vulnerability. */
function extractReferenceUrl(vuln: OSVVulnerability): string {
  if (vuln.references && vuln.references.length > 0) {
    return vuln.references[0].url;
  }
  // Fallback to OSV page
  return `https://osv.dev/vulnerability/${vuln.id}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract dependencies from CachedFile array (looks for package.json).
 */
export function extractDependencies(files: CachedFile[]): PackageDep[] {
  const deps: PackageDep[] = [];

  for (const file of files) {
    if (!file.path.endsWith("package.json")) continue;

    try {
      const pkg = JSON.parse(file.content);
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      for (const [name, versionRaw] of Object.entries(allDeps)) {
        if (typeof versionRaw !== "string") continue;
        const version = stripRange(versionRaw);
        // Skip workspace/file/git references
        if (!version || version.startsWith("file:") || version.startsWith("git") || version === "*") continue;
        deps.push({ name, version });
      }
    } catch {
      // Invalid JSON — skip
    }
  }

  return deps;
}

/**
 * Batch-query OSV API for known vulnerabilities.
 */
export async function queryOSV(deps: PackageDep[]): Promise<DepScanResult> {
  if (deps.length === 0) {
    return { vulnerabilities: [], scanned_packages: 0, error: null };
  }

  const queries: { queries: OSVQuery[] } = {
    queries: deps.map((d) => ({
      version: d.version,
      package: { name: d.name, ecosystem: "npm" },
    })),
  };

  let response: Response;
  try {
    response = await fetch("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queries),
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });
  } catch (err) {
    return {
      vulnerabilities: [],
      scanned_packages: deps.length,
      error: `OSV API unreachable: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!response.ok) {
    return {
      vulnerabilities: [],
      scanned_packages: deps.length,
      error: `OSV API returned ${response.status}`,
    };
  }

  let data: OSVBatchResponse;
  try {
    data = (await response.json()) as OSVBatchResponse;
  } catch {
    return {
      vulnerabilities: [],
      scanned_packages: deps.length,
      error: "OSV API returned invalid JSON",
    };
  }

  const vulnerabilities: DepVulnerability[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < data.results.length; i++) {
    const result = data.results[i];
    const dep = deps[i];
    if (!result.vulns || result.vulns.length === 0) continue;

    for (const vuln of result.vulns) {
      // Deduplicate by vuln ID + package
      const key = `${vuln.id}:${dep.name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      vulnerabilities.push({
        id: vuln.id,
        package_name: dep.name,
        installed_version: dep.version,
        severity: extractSeverity(vuln),
        summary: vuln.summary || `Vulnerability ${vuln.id} in ${dep.name}`,
        fixed_version: extractFixedVersion(vuln),
        reference_url: extractReferenceUrl(vuln),
      });
    }
  }

  // Sort by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
  vulnerabilities.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return { vulnerabilities, scanned_packages: deps.length, error: null };
}

/**
 * Full dependency scan pipeline: extract deps → query OSV.
 * Never throws — returns empty result with error message on failure.
 */
export async function runDepScan(files: CachedFile[]): Promise<DepScanResult> {
  try {
    const deps = extractDependencies(files);
    if (deps.length === 0) {
      return { vulnerabilities: [], scanned_packages: 0, error: null };
    }
    console.log(`  Dep scan: found ${deps.length} packages, querying OSV...`);
    return await queryOSV(deps);
  } catch (err) {
    return {
      vulnerabilities: [],
      scanned_packages: 0,
      error: `Dep scan failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Shared analysis engine — extracted from scan.ts for reuse by clawhub-import.ts.
 *
 * Exports: runClaude, validateAndFixOutput, RepoCodeCache, ScanOutput, CachedFile
 */

import { execFileSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillAbout {
  purpose: string;
  capabilities: string[];
  use_cases: string[];
  permissions_required: string[];
  security_notes: string;
}

export interface ScanOutput {
  trust_status: "verified" | "caution" | "failed";
  intent: "benign" | "risky" | "malicious";
  recommendation: "safe" | "caution" | "danger";
  risk_score: number;
  confidence: number;
  summary: string;
  details: Record<string, { detected: boolean; evidence: string[] }>;
  skill_about: SkillAbout;
  static_findings_assessment: string;
  category: string;
}

export interface CachedFile {
  path: string;
  content: string;
}

// ---------------------------------------------------------------------------
// RepoCodeCache — assemble code from multiple files, serve subsets
// ---------------------------------------------------------------------------

export class RepoCodeCache {
  private files: CachedFile[] = [];
  private filePaths: Set<string> = new Set();

  constructor(files: CachedFile[]) {
    this.files = files;
    this.filePaths = new Set(files.map((f) => f.path));
  }

  /** Get all code as a single string (for discovery or single-skill fallback). */
  getAllCode(): string {
    return this.files.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n");
  }

  /** Get code scoped to specific file paths (for per-skill analysis). */
  getScopedCode(paths: string[], maxBytes?: number): string {
    const pathSet = new Set(paths);
    const matched = this.files.filter((f) => pathSet.has(f.path));
    if (matched.length === 0) return "";

    if (maxBytes == null) {
      return matched.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n");
    }

    const parts: string[] = [];
    let totalBytes = 0;
    for (const f of matched) {
      const block = `--- ${f.path} ---\n${f.content}`;
      if (totalBytes + block.length > maxBytes) {
        console.warn(
          `Per-skill limit (${(maxBytes / 1024).toFixed(0)}KB) reached after ${parts.length}/${matched.length} files`
        );
        break;
      }
      parts.push(block);
      totalBytes += block.length;
    }
    return parts.join("\n\n");
  }

  /** Validate which paths actually exist. */
  validatePaths(paths: string[]): string[] {
    return paths.filter((p) => this.filePaths.has(p));
  }

  get fileCount(): number {
    return this.files.length;
  }

  get totalBytes(): number {
    return this.files.reduce((sum, f) => sum + f.content.length, 0);
  }

  /** Get the underlying CachedFile array (for static analysis). */
  getFiles(): CachedFile[] {
    return this.files;
  }
}

// ---------------------------------------------------------------------------
// Claude invocation
// ---------------------------------------------------------------------------

export async function runClaude(
  prompt: string,
  systemPrompt: string,
  schema: Record<string, unknown>,
  model: string
): Promise<Record<string, unknown>> {
  const schemaJson = JSON.stringify(schema);

  const args = [
    "-p",
    prompt,
    "--json-schema",
    schemaJson,
    "--model",
    model,
    "--output-format",
    "json",
    "--system-prompt",
    systemPrompt,
    "--permission-mode",
    "default",
  ];

  const result = execFileSync("claude", args, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 10 * 60 * 1000,
  });

  let envelope: {
    structured_output?: Record<string, unknown>;
    result?: string;
    is_error?: boolean;
  };
  try {
    envelope = JSON.parse(result);
  } catch {
    console.error("Claude returned non-JSON output:", result.slice(0, 500));
    throw new Error("Failed to parse Claude output");
  }

  if (envelope.is_error) {
    throw new Error(`Claude returned an error: ${envelope.result}`);
  }

  const parsed = envelope.structured_output;
  if (!parsed) {
    console.error(
      "No structured_output in Claude response. Keys:",
      Object.keys(envelope).join(", ")
    );
    throw new Error(
      "Claude did not return structured output. Check --json-schema flag."
    );
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Output validation / consistency enforcement
// ---------------------------------------------------------------------------

export function validateAndFixOutput(output: ScanOutput): ScanOutput {
  let score = output.risk_score;

  // Cross-check: if intent is malicious but score < 7, bump to 7
  if (output.intent === "malicious" && score < 7) {
    console.warn(
      `Warning: intent "malicious" but risk_score ${score} — bumping to 7`
    );
    score = 7;
    output.risk_score = 7;
  }

  // Enforce three-tier recommendation consistency
  if (score < 4 && output.recommendation !== "safe") {
    console.warn(
      `Warning: risk_score ${score} but recommendation "${output.recommendation}" — overriding to "safe"`
    );
    output.recommendation = "safe";
  } else if (score >= 4 && score < 7 && output.recommendation !== "caution") {
    console.warn(
      `Warning: risk_score ${score} but recommendation "${output.recommendation}" — overriding to "caution"`
    );
    output.recommendation = "caution";
  } else if (score >= 7 && output.recommendation !== "danger") {
    console.warn(
      `Warning: risk_score ${score} but recommendation "${output.recommendation}" — overriding to "danger"`
    );
    output.recommendation = "danger";
  }

  // Enforce three-tier trust_status consistency
  if (score < 4 && output.trust_status !== "verified") {
    console.warn(
      `Warning: risk_score ${score} but trust_status "${output.trust_status}" — overriding to "verified"`
    );
    output.trust_status = "verified";
  } else if (score >= 4 && score < 7 && output.trust_status !== "caution") {
    console.warn(
      `Warning: risk_score ${score} but trust_status "${output.trust_status}" — overriding to "caution"`
    );
    output.trust_status = "caution";
  } else if (score >= 7 && output.trust_status !== "failed") {
    console.warn(
      `Warning: risk_score ${score} but trust_status "${output.trust_status}" — overriding to "failed"`
    );
    output.trust_status = "failed";
  }

  return output;
}

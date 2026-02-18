/**
 * Deterministic regex-based static rules engine for AI skill analysis.
 *
 * 20 rules in 3 tiers (critical / warning / info).
 * Pure synchronous, zero external deps, runs in milliseconds.
 */

import type { CachedFile } from "./analyze.js";
import type { StaticFinding, StaticSummary } from "../src/shared/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StaticRulesResult {
  findings: StaticFinding[];
  summary: StaticSummary;
}

interface Rule {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  pattern: RegExp;
  /** Optional filter: only apply to files matching this pattern */
  fileFilter?: RegExp;
}

// ---------------------------------------------------------------------------
// Rules definition (20 rules, 3 tiers)
// ---------------------------------------------------------------------------

const rules: Rule[] = [
  // ── Tier 1: Critical (zero false positives) ──

  {
    id: "BIDI-001",
    severity: "critical",
    category: "obfuscation",
    message: "Unicode BiDi override character detected (Trojan Source attack)",
    pattern: /[\u202A-\u202E\u2066-\u2069]/,
  },
  {
    id: "ZERO-WIDTH-001",
    severity: "critical",
    category: "prompt_injection",
    message: "Zero-width character detected (hidden text in tool descriptions)",
    pattern: /[\u200B\u200C\u200D\uFEFF]/,
  },
  {
    id: "EXEC-001",
    severity: "critical",
    category: "destructive_commands",
    message: "Dynamic code execution via eval() or new Function()",
    pattern: /\beval\s*\(|new\s+Function\s*\(/,
  },
  {
    id: "EXEC-002",
    severity: "critical",
    category: "destructive_commands",
    message: "Shell execution via child_process",
    pattern: /(?:require\s*\(\s*['"]child_process['"]\s*\)|from\s+['"]child_process['"]).*(?:exec|spawn|execFile|execSync|spawnSync)/,
  },
  {
    id: "INSTALL-001",
    severity: "critical",
    category: "destructive_commands",
    message: "Install hook detected in package.json (supply chain attack vector)",
    pattern: /["'](?:pre|post)install["']\s*:/,
    fileFilter: /package\.json$/,
  },
  {
    id: "INSTALL-002",
    severity: "critical",
    category: "data_exfiltration",
    message: "URL or download command in install scripts",
    pattern: /["'](?:pre|post)install["']\s*:\s*["'][^"']*(?:curl|wget|https?:\/\/)[^"']*/,
    fileFilter: /package\.json$/,
  },
  {
    id: "OBFUSC-001",
    severity: "critical",
    category: "obfuscation",
    message: "Hex-encoded string sequence (5+ bytes)",
    pattern: /(?:\\x[0-9a-fA-F]{2}){5,}/,
  },
  {
    id: "OBFUSC-002",
    severity: "critical",
    category: "obfuscation",
    message: "Suspiciously long Base64 string (>100 chars)",
    pattern: /['"`][A-Za-z0-9+/]{100,}={0,2}['"`]/,
  },
  {
    id: "OBFUSC-003",
    severity: "critical",
    category: "obfuscation",
    message: "String.fromCharCode with 5+ arguments (character assembly)",
    pattern: /String\.fromCharCode\s*\(\s*(?:\d+\s*,\s*){4,}\d+\s*\)/,
  },
  {
    id: "OBFUSC-004",
    severity: "critical",
    category: "obfuscation",
    message: "Obfuscated variable names (_0x pattern)",
    pattern: /\b_0x[0-9a-fA-F]{4,}\b/,
  },
  {
    id: "EXFIL-001",
    severity: "critical",
    category: "data_exfiltration",
    message: "Cloud metadata endpoint access (SSRF vector)",
    pattern: /169\.254\.169\.254/,
  },
  {
    id: "SECRET-001",
    severity: "critical",
    category: "secret_access",
    message: "Access to sensitive credential paths",
    pattern: /(?:\.ssh\/|\.aws\/|\.gnupg\/|\.npmrc\b|\.env\b)/,
  },
  {
    id: "POISON-001",
    severity: "critical",
    category: "prompt_injection",
    message: "<IMPORTANT> tag detected (tool poisoning technique)",
    pattern: /<IMPORTANT>/i,
  },
  {
    id: "POISON-002",
    severity: "critical",
    category: "prompt_injection",
    message: "Concealment instruction detected",
    pattern: /do\s+not\s+(?:mention|tell|reveal|show|display)\s+(?:to\s+)?the\s+user/i,
  },

  // ── Tier 2: Warning (context-dependent) ──

  {
    id: "NET-001",
    severity: "warning",
    category: "data_exfiltration",
    message: "Network request detected (verify if legitimate for skill purpose)",
    pattern: /\bfetch\s*\(|axios\.\w+\s*\(|https?\.request\s*\(/,
  },
  {
    id: "FS-001",
    severity: "warning",
    category: "secret_access",
    message: "File read with non-literal path (potential path traversal)",
    pattern: /fs\.readFile(?:Sync)?\s*\(\s*(?!['"`])/,
  },
  {
    id: "CRYPTO-001",
    severity: "warning",
    category: "obfuscation",
    message: "Math.random() usage (weak randomness)",
    pattern: /Math\.random\s*\(\s*\)/,
  },
  {
    id: "POISON-003",
    severity: "warning",
    category: "prompt_injection",
    message: "Prompt injection pattern in text",
    pattern: /ignore\s+(?:previous|prior|above|all)\s+instructions/i,
  },

  // ── Tier 3: Info ──

  {
    id: "ENV-001",
    severity: "info",
    category: "secret_access",
    message: "Environment variable access (informational)",
    pattern: /process\.env\b/,
  },
  {
    id: "DYN-001",
    severity: "info",
    category: "destructive_commands",
    message: "Dynamic module loading (non-literal require/import)",
    pattern: /(?:require|import)\s*\(\s*(?!['"`])/,
  },
];

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

const MAX_MATCH_LENGTH = 200;

export function runStaticRules(files: CachedFile[]): StaticRulesResult {
  const findings: StaticFinding[] = [];

  for (const file of files) {
    // Determine which rules apply to this file
    const applicableRules = rules.filter(
      (r) => !r.fileFilter || r.fileFilter.test(file.path)
    );

    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const rule of applicableRules) {
        if (rule.pattern.test(line)) {
          findings.push({
            rule_id: rule.id,
            severity: rule.severity,
            category: rule.category,
            message: rule.message,
            file: file.path,
            line: i + 1,
            match: line.trim().slice(0, MAX_MATCH_LENGTH),
          });
        }
      }
    }
  }

  // Sort by severity: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const summary: StaticSummary = {
    critical: findings.filter((f) => f.severity === "critical").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
    total: findings.length,
  };

  return { findings, summary };
}

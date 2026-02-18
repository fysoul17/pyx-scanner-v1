/**
 * Deterministic pre-scan rules — regex-based pattern matching.
 * Runs BEFORE Claude analysis to surface obvious threats.
 */

import type { CachedFile } from "./analyze.js";

export interface PreScanFlag {
  rule_id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  file: string;
  line: number;
  match: string;
}

export interface PreScanResult {
  flags: PreScanFlag[];
  summary: { critical: number; warning: number; info: number; total: number };
}

interface Rule {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  pattern: RegExp;
}

const RULES: Rule[] = [
  // Critical
  { id: "CLOUD_METADATA", severity: "critical", category: "secret_access", message: "Cloud metadata endpoint access", pattern: /169\.254\.169\.254|metadata\.google\.internal/g },
  { id: "REVERSE_SHELL", severity: "critical", category: "destructive_commands", message: "Potential reverse shell", pattern: /bash\s+-i|nc\s+-e|\/dev\/tcp/g },
  { id: "KEYLOGGER", severity: "critical", category: "excessive_permissions", message: "Keylogger or screen capture pattern", pattern: /keylog|screenshot|screen\.capture/gi },

  // Warning
  { id: "EVAL_FUNCTION", severity: "warning", category: "obfuscation", message: "Dynamic code evaluation", pattern: /\beval\s*\(|new\s+Function\s*\(|\bFunction\s*\(/g },
  { id: "SHELL_EXEC", severity: "warning", category: "excessive_permissions", message: "Shell command execution", pattern: /\bexec\s*\(|\bexecSync\s*\(|\bspawn\s*\(/g },
  { id: "SUSPICIOUS_SCRIPTS", severity: "warning", category: "obfuscation", message: "Suspicious npm lifecycle script", pattern: /"(?:postinstall|preinstall)"\s*:\s*"[^"]*(?:sh |bash |node |curl |wget )/g },
  { id: "ENV_READ", severity: "warning", category: "secret_access", message: "Environment file reading", pattern: /readFile.*\.env|dotenv/g },
  { id: "HEX_OBFUSCATION", severity: "warning", category: "obfuscation", message: "Obfuscated hex string sequences", pattern: /(?:\\x[0-9a-fA-F]{2}){4,}/g },
  { id: "DYNAMIC_IMPORT", severity: "warning", category: "obfuscation", message: "Dynamic import with variable URL", pattern: /import\s*\(\s*[^"'`\s)]/g },

  // Info
  { id: "HTTP_REQUEST", severity: "info", category: "data_exfiltration", message: "HTTP request capability", pattern: /\bfetch\s*\(|require\s*\(\s*['"]axios['"]\)|require\s*\(\s*['"]node-fetch['"]\)/g },
  { id: "FS_ACCESS", severity: "info", category: "excessive_permissions", message: "File system access", pattern: /\breadFile\b|\bwriteFile\b|\bunlink\b/g },
];

export function runPreScan(files: CachedFile[]): PreScanResult {
  const flags: PreScanFlag[] = [];

  for (const file of files) {
    // Skip non-source files
    if (file.path.endsWith(".md") && !file.path.includes("SKILL.md")) continue;

    const lines = file.content.split("\n");

    for (const rule of RULES) {
      for (let i = 0; i < lines.length; i++) {
        // Reset regex lastIndex for global patterns
        rule.pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = rule.pattern.exec(lines[i])) !== null) {
          flags.push({
            rule_id: rule.id,
            severity: rule.severity,
            category: rule.category,
            message: rule.message,
            file: file.path,
            line: i + 1,
            match: match[0],
          });
        }
      }
    }
  }

  const summary = {
    critical: flags.filter((f) => f.severity === "critical").length,
    warning: flags.filter((f) => f.severity === "warning").length,
    info: flags.filter((f) => f.severity === "info").length,
    total: flags.length,
  };

  return { flags, summary };
}

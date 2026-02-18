import type { ScanResult } from "@shared/types";

interface ThreatCategory {
  key: string;
  label: string;
  detected: boolean;
  evidence: string[];
}

const categoryLabels: Record<string, string> = {
  data_exfiltration: "Data Exfiltration",
  destructive_commands: "Destructive Commands",
  secret_access: "Secret Access",
  obfuscation: "Obfuscation",
  prompt_injection: "Prompt Injection",
  social_engineering: "Social Engineering",
  excessive_permissions: "Excessive Permissions",
};

const categoryOrder = [
  "data_exfiltration",
  "destructive_commands",
  "secret_access",
  "obfuscation",
  "prompt_injection",
  "social_engineering",
  "excessive_permissions",
];

function parseCategories(
  details: Record<string, unknown> | null
): ThreatCategory[] {
  if (!details) return [];

  return categoryOrder
    .filter((key) => key in details)
    .map((key) => {
      const entry = details[key];
      if (
        typeof entry !== "object" ||
        entry === null ||
        typeof (entry as Record<string, unknown>).detected !== "boolean"
      ) {
        return null;
      }
      const { detected, evidence } = entry as {
        detected: boolean;
        evidence?: unknown[];
      };
      return {
        key,
        label: categoryLabels[key] ?? key,
        detected,
        evidence: Array.isArray(evidence)
          ? evidence.filter((e): e is string => typeof e === "string")
          : [],
      };
    })
    .filter((c): c is ThreatCategory => c !== null);
}

export function AnalysisDetails({ scan }: { scan: ScanResult | null }) {
  if (!scan) return null;

  const categories = parseCategories(scan.details);
  const hasSummary = !!scan.summary;
  const hasCategories = categories.length > 0;

  if (!hasSummary && !hasCategories) return null;

  return (
    <div className="mt-4 rounded-[2px] bg-cv-surface p-6">
      <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-text-muted mb-4">
        Analysis
      </div>
      {hasSummary && (
        <p className="text-[13px] font-light leading-[1.7] text-cv-text mb-4">
          {scan.summary}
        </p>
      )}
      {hasCategories && (
        <div className="flex flex-col gap-2">
          {categories.map((c) => (
            <div key={c.key}>
              <div className="flex items-center gap-2 text-[12px] font-light">
                <span
                  className={
                    c.detected ? "text-cv-failed" : "text-cv-verified"
                  }
                >
                  {c.detected ? "\u2717" : "\u2713"}
                </span>
                <span>{c.label}</span>
              </div>
              {c.detected && c.evidence.length > 0 && (
                <div className="ml-5 mt-1 flex flex-col gap-0.5">
                  {c.evidence.map((e, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-light text-cv-text-muted leading-[1.5]"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import type { StaticFinding } from "@shared/types";

/** Renders inline markdown bold (**text**) as <strong> elements. */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const severityColors: Record<string, string> = {
  critical: "text-cv-failed bg-cv-failed/10",
  warning: "text-cv-warning bg-cv-warning/10",
  info: "text-cv-text-muted bg-cv-surface",
};

const severityLabels: Record<string, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

interface StaticFindingsProps {
  findings: StaticFinding[] | undefined;
  summary: { critical: number; warning: number; info: number; total: number } | undefined;
  assessment: string | undefined;
}

export function StaticFindings({ findings, summary, assessment }: StaticFindingsProps) {
  if (!findings || findings.length === 0) return null;

  return (
    <div className="mt-4 rounded-[2px] bg-cv-surface p-6">
      <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-text-muted mb-4">
        Static Analysis
      </div>

      {summary && (
        <p className="text-[11px] font-light text-cv-text-muted mb-3">
          {summary.critical} critical, {summary.warning} warning, {summary.info} info &mdash; {summary.total} total findings
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-light">
          <thead>
            <tr className="text-left text-cv-text-muted border-b border-black/6">
              <th className="pb-2 pr-3 font-medium">Rule</th>
              <th className="pb-2 pr-3 font-medium">Severity</th>
              <th className="pb-2 pr-3 font-medium">Location</th>
              <th className="pb-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f, i) => (
              <tr key={`${f.rule_id}-${i}`} className="border-b border-black/3">
                <td className="py-1.5 pr-3 font-mono text-[10px]">{f.rule_id}</td>
                <td className="py-1.5 pr-3">
                  <span className={`inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-medium uppercase ${severityColors[f.severity] ?? ""}`}>
                    {severityLabels[f.severity] ?? f.severity}
                  </span>
                </td>
                <td className="py-1.5 pr-3 font-mono text-[10px] text-cv-text-muted">
                  {f.file}:{f.line}
                </td>
                <td className="py-1.5 text-cv-text">{f.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assessment && (
        <div className="mt-4 pt-3 border-t border-black/6">
          <div className="text-[10px] font-medium text-cv-text-muted uppercase tracking-wider mb-1">
            AI Assessment
          </div>
          <p className="text-[12px] font-light leading-[1.6] text-cv-text">
            {renderInlineMarkdown(assessment)}
          </p>
        </div>
      )}
    </div>
  );
}

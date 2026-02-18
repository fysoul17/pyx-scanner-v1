import type { DepVulnerability } from "@shared/types";

const severityColors: Record<string, string> = {
  CRITICAL: "text-cv-failed bg-cv-failed/10",
  HIGH: "text-cv-failed bg-cv-failed/10",
  MODERATE: "text-cv-warning bg-cv-warning/10",
  LOW: "text-cv-text-muted bg-cv-surface",
};

export function DependencyVulns({ vulnerabilities }: { vulnerabilities: DepVulnerability[] | null | undefined }) {
  if (!vulnerabilities || vulnerabilities.length === 0) return null;

  return (
    <div className="mt-4 rounded-[2px] bg-cv-surface p-6">
      <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-text-muted mb-4">
        Dependency Vulnerabilities
      </div>

      <p className="text-[11px] font-light text-cv-text-muted mb-3">
        {vulnerabilities.length} known {vulnerabilities.length === 1 ? "vulnerability" : "vulnerabilities"} found in dependencies
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-light">
          <thead>
            <tr className="text-left text-cv-text-muted border-b border-black/6">
              <th className="pb-2 pr-3 font-medium">Package</th>
              <th className="pb-2 pr-3 font-medium">Version</th>
              <th className="pb-2 pr-3 font-medium">Vulnerability</th>
              <th className="pb-2 pr-3 font-medium">Severity</th>
              <th className="pb-2 font-medium">Fixed In</th>
            </tr>
          </thead>
          <tbody>
            {vulnerabilities.map((v) => (
              <tr key={`${v.id}-${v.package_name}`} className="border-b border-black/3">
                <td className="py-1.5 pr-3 font-mono text-[10px]">{v.package_name}</td>
                <td className="py-1.5 pr-3 font-mono text-[10px] text-cv-text-muted">{v.installed_version}</td>
                <td className="py-1.5 pr-3">
                  <a
                    href={v.reference_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] text-cv-accent hover:underline"
                  >
                    {v.id}
                  </a>
                </td>
                <td className="py-1.5 pr-3">
                  <span className={`inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-medium ${severityColors[v.severity] ?? ""}`}>
                    {v.severity}
                  </span>
                </td>
                <td className="py-1.5 font-mono text-[10px] text-cv-text-muted">
                  {v.fixed_version ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

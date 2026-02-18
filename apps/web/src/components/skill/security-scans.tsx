import type { ExternalScansData, ExternalScanProvider, ExternalScanStatus, TrustStatus } from "@shared/types";

const statusStyles: Record<ExternalScanStatus, { className: string; label: string }> = {
  clean: { className: "text-cv-verified bg-cv-verified/10", label: "Verified" },
  suspicious: { className: "text-cv-warning bg-cv-warning/10", label: "Suspicious" },
  malware: { className: "text-cv-failed bg-cv-failed/10", label: "Malware" },
  unknown: { className: "text-cv-text-muted bg-cv-surface", label: "N/A" },
  not_available: { className: "text-cv-text-muted bg-cv-surface", label: "N/A" },
};

const DEFAULT_PROVIDERS: ExternalScanProvider[] = [
  { provider: "VirusTotal", status: "not_available", verdict: null, confidence: null, report_url: null, checked_at: null },
  { provider: "OpenClaw", status: "not_available", verdict: null, confidence: null, report_url: null, checked_at: null },
];

function pyxStatusFromTrust(status: TrustStatus): ExternalScanStatus {
  switch (status) {
    case "verified": return "clean";
    case "caution": return "suspicious";
    case "failed": return "malware";
    default: return "unknown";
  }
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

interface SecurityScansProps {
  externalScans: ExternalScansData | null;
  pyxStatus: TrustStatus;
  pyxScore: number | null;
}

function ProviderRow({ provider }: { provider: ExternalScanProvider }) {
  const style = statusStyles[provider.status] ?? statusStyles.unknown;
  const safeReportUrl = provider.report_url && isSafeUrl(provider.report_url)
    ? provider.report_url
    : null;

  return (
    <div className="flex items-center justify-between" role="listitem">
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-medium text-cv-text w-24">
          {provider.provider}
        </span>
        <span
          className={`inline-block rounded-sm px-1.5 py-0.5 text-[9px] font-medium uppercase ${style.className}`}
          role="status"
          aria-label={`${provider.provider} status: ${style.label}`}
        >
          {style.label}
        </span>
        {provider.confidence && (
          <span className="text-[10px] text-cv-text-muted uppercase tracking-wide">
            {provider.confidence} confidence
          </span>
        )}
      </div>
      {safeReportUrl && (
        <a
          href={safeReportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-cv-accent hover:underline"
        >
          View report <span aria-hidden="true">&rarr;</span>
        </a>
      )}
    </div>
  );
}

export function SecurityScans({ externalScans, pyxStatus, pyxScore }: SecurityScansProps) {
  const providers = externalScans?.providers ?? DEFAULT_PROVIDERS;
  const pyxScanStatus = pyxStatusFromTrust(pyxStatus);
  const pyxStyle = statusStyles[pyxScanStatus];

  return (
    <div className="mt-4 rounded-[2px] bg-cv-surface p-6">
      <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-text-muted mb-4">
        Security Scan
      </div>

      <div className="space-y-3" role="list" aria-label="Security scan results">
        {providers.map((provider) => (
          <ProviderRow key={provider.provider} provider={provider} />
        ))}

        {/* PYX Scanner row — always shown */}
        <div className="flex items-center justify-between" role="listitem">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-cv-text w-24">
              PYX Scanner
            </span>
            <span
              className={`inline-block rounded-sm px-1.5 py-0.5 text-[9px] font-medium uppercase ${pyxStyle.className}`}
              role="status"
              aria-label={`PYX Scanner status: ${pyxStyle.label}`}
            >
              {pyxStyle.label}
            </span>
            {pyxScore != null && (
              <span className="text-[10px] text-cv-text-muted uppercase tracking-wide">
                {pyxScore}/100
              </span>
            )}
          </div>
          <span className="text-[11px] text-cv-text-muted">
            This report
          </span>
        </div>
      </div>
    </div>
  );
}

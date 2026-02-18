import type { ScanResult, TrustStatus } from "@shared/types";
import { StatusDot } from "@/components/landing/status-dot";
import { RelativeTime } from "./relative-time";
import { toTrustScore } from "@lib/queries";

const scoreColors: Record<TrustStatus, string> = {
  verified: "text-cv-verified",
  caution: "text-cv-warning",
  failed: "text-cv-failed",
  unscanned: "text-cv-text-muted",
};

export function ScanHistory({ results }: { results: ScanResult[] }) {
  if (results.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-text-muted mb-3">
        Scan History
      </div>
      <div className="flex flex-col gap-1">
        {results.map((scan) => {
          const score = toTrustScore(scan.risk_score);

          return (
            <div
              key={scan.id}
              className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto] items-center gap-2 md:gap-6 rounded-[2px] bg-cv-surface px-6 py-4"
            >
              <code className="text-[12px] font-light text-cv-text-muted">
                {scan.version || scan.commit_hash.slice(0, 7)}
              </code>
              <RelativeTime
                date={scan.scanned_at}
                className="text-[11px] font-light text-cv-text-muted"
              />
              <StatusDot status={scan.trust_status} />
              <span
                className={`font-display text-2xl font-black ${scoreColors[scan.trust_status]}`}
              >
                {score ?? "\u2014"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

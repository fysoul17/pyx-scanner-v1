import type { Intent, Recommendation, TrustStatus } from "@shared/types";
import { StatusDot } from "@/components/landing/status-dot";
import { CopyButton } from "./copy-button";

const scoreColors: Record<TrustStatus, string> = {
  verified: "text-cv-verified",
  caution: "text-cv-warning",
  failed: "text-cv-failed",
  unscanned: "text-cv-text-muted",
};

const recommendationLabels: Record<Recommendation, string> = {
  safe: "Safe",
  caution: "Caution",
  danger: "Danger",
  unknown: "Unknown",
};

const recommendationColors: Record<Recommendation, string> = {
  safe: "text-cv-verified",
  caution: "text-cv-warning",
  danger: "text-cv-failed",
  unknown: "text-cv-text-muted",
};

function getDangerLabel(intent: Intent | null): string {
  if (intent === "malicious") return "Likely Malicious";
  return "High Risk";
}

export function StatusCard({
  status,
  score,
  recommendation,
  owner,
  name,
  model,
  confidence,
  intent,
}: {
  status: TrustStatus;
  score: number | null;
  recommendation: Recommendation;
  owner: string;
  name: string;
  model: string | null;
  confidence?: number | null;
  intent?: Intent | null;
}) {
  // Format model name for display
  const modelDisplay = model
    ? model.charAt(0).toUpperCase() + model.slice(1)
    : "Unknown";
  const badgeMarkdown = `[![PYX Trust Score](${process.env.NEXT_PUBLIC_APP_URL || "https://scanner.pyxmate.com"}/api/v1/badge/${owner}/${name})](${process.env.NEXT_PUBLIC_APP_URL || "https://scanner.pyxmate.com"}/s/${owner}/${name})`;

  return (
    <div className="rounded-[2px] bg-cv-surface p-6">
      <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-text-muted mb-4">
        Trust Score
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <StatusDot status={status} />
          <span
            className={`text-[11px] font-light ${recommendationColors[recommendation]}`}
          >
            {recommendation === "danger"
              ? getDangerLabel(intent ?? null)
              : recommendationLabels[recommendation]}
          </span>
          <span className="text-[11px] text-cv-text-muted font-light">
            Scanned with {modelDisplay}
          </span>
          {confidence != null && (
            <span className="text-[11px] text-cv-text-muted font-light">
              Confidence: {Math.round(confidence)}%
            </span>
          )}
        </div>
        <span
          className={`font-display text-[56px] tracking-[-0.03em] font-thin ${scoreColors[status]}`}
        >
          {score ?? "\u2014"}
        </span>
      </div>
      <div className="mt-4 pt-4 border-t border-black/6 flex items-center justify-between">
        <span className="text-[10px] text-cv-text-muted font-light">
          Badge markdown
        </span>
        <CopyButton text={badgeMarkdown} label="Copy Badge" />
      </div>
    </div>
  );
}

import type { TrustStatus } from "@shared/types";

const dotStyles: Record<TrustStatus, string> = {
  verified: "bg-cv-verified",
  caution: "bg-cv-warning",
  failed: "bg-cv-failed",
  unscanned: "bg-cv-text-muted",
};

const textStyles: Record<TrustStatus, string> = {
  verified: "text-cv-verified",
  caution: "text-cv-warning",
  failed: "text-cv-failed",
  unscanned: "text-cv-text-muted",
};

export const labels: Record<TrustStatus, string> = {
  verified: "Verified",
  caution: "Caution",
  failed: "High Risk",
  unscanned: "Unscanned",
};

export function StatusDot({ status }: { status: TrustStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] ${textStyles[status]}`}
    >
      <span className={`h-2 w-2 rounded-full ${dotStyles[status]}`} />
      {labels[status]}
    </span>
  );
}

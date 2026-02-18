import type { PopularRowData } from "@/data/landing";
import type { SkillCategory } from "@shared/types";
import { formatCompact } from "@lib/queries";

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  "developer-tools": "Developer Tools",
  "version-control": "Version Control",
  "web-browser": "Web Browser",
  "data-files": "Data & Files",
  "cloud-infra": "Cloud & Infra",
  communication: "Communication",
  "search-research": "Search & Research",
  productivity: "Productivity",
  other: "Other",
};

const scoreColors = {
  verified: "text-cv-verified",
  caution: "text-cv-warning",
  failed: "text-cv-failed",
  unscanned: "text-cv-text-muted",
} as const;

export function PopularRow({ row }: { row: PopularRowData }) {
  const catLabel = row.category ? CATEGORY_LABELS[row.category] : null;

  return (
    <div className="failed-row-hover grid grid-cols-[32px_1fr_auto] md:grid-cols-[48px_1fr_auto_auto] items-center gap-3 md:gap-6 rounded-[2px] bg-cv-surface px-6 py-5">
      {/* Rank */}
      <span
        className={`font-display text-[24px] md:text-[32px] font-thin tabular-nums ${
          row.rank <= 3 ? "text-cv-accent" : "text-cv-text-muted"
        }`}
        aria-hidden="true"
      >
        {row.rank}
      </span>

      {/* Name + Owner + Category */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium">
            {row.owner}/{row.name}
          </span>
          {catLabel && (
            <span className="inline-block rounded-[2px] bg-cv-accent/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-cv-accent">
              {catLabel}
            </span>
          )}
        </div>
        {row.description && (
          <p className="mt-0.5 truncate text-[11px] text-cv-text-muted font-light">
            {row.description}
          </p>
        )}
      </div>

      {/* Stars / Downloads */}
      <div className="flex items-center gap-3 font-mono text-[11px] text-cv-text-muted">
        {row.stars != null && row.stars > 0 && (
          <span>
            <span aria-hidden="true">&#9733;</span>
            <span className="sr-only">Stars:</span> {formatCompact(row.stars)}
          </span>
        )}
        {row.downloads != null && row.downloads > 0 && (
          <span>
            <span aria-hidden="true">&darr;</span>
            <span className="sr-only">Downloads:</span> {formatCompact(row.downloads)}
          </span>
        )}
      </div>

      {/* Trust Score */}
      {row.score != null && (
        <span
          className={`font-display text-[20px] md:text-[24px] font-thin tabular-nums ${scoreColors[row.status]}`}
          aria-label={`Trust score: ${row.score}`}
        >
          {row.score}
        </span>
      )}
    </div>
  );
}

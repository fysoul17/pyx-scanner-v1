import type { BentoCardData } from "@/data/landing";
import type { TrustStatus, SkillCategory } from "@shared/types";
import { formatCompact } from "@lib/queries";
import { StatusDot } from "./status-dot";

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  "developer-tools": "Developer Tools",
  "version-control": "Version Control",
  "web-browser": "Web Browser",
  "data-files": "Data & Files",
  "cloud-infra": "Cloud & Infra",
  "communication": "Communication",
  "search-research": "Search & Research",
  "productivity": "Productivity",
  "other": "Other",
};

const scoreColors: Record<TrustStatus, string> = {
  verified: "text-cv-verified",
  caution: "text-cv-warning",
  failed: "text-cv-failed",
  unscanned: "text-cv-text-muted",
};

export function BentoCard({ card }: { card: BentoCardData }) {
  const isFeatured = card.featured;

  return (
    <div
      className={`bento-card-hover cursor-pointer rounded-[2px] bg-cv-surface p-6 h-full ${
        isFeatured ? "md:p-9 flex flex-col justify-between" : ""
      }`}
    >
      <div>
        {card.label && (
          <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-verified mb-2">
            {card.label}
          </div>
        )}
        <div
          className={`font-display font-black tracking-[-0.02em] mb-1 ${
            isFeatured ? "text-[28px]" : "text-lg"
          }`}
        >
          {card.name}
        </div>
        <div className="text-[11px] text-cv-text-muted font-light mb-3 flex items-center gap-2">
          <span>{card.owner}</span>
          {card.category && (
            <span className="inline-block rounded-[2px] bg-cv-accent/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-cv-accent">
              {CATEGORY_LABELS[card.category]}
            </span>
          )}
        </div>
        <div className="text-[11px] text-cv-text-muted font-light leading-[1.6] mb-3">
          {card.description}
        </div>
        {(card.stars != null && card.stars > 0) ||
        (card.downloads != null && card.downloads > 0) ? (
          <div className="flex items-center gap-3 font-mono text-[11px] text-cv-text-muted mb-1">
            {card.stars != null && card.stars > 0 && (
              <span>
                <span aria-hidden="true">&#9733;</span>
                <span className="sr-only">Stars:</span> {formatCompact(card.stars)}
              </span>
            )}
            {card.downloads != null && card.downloads > 0 && (
              <span>
                <span aria-hidden="true">&darr;</span>
                <span className="sr-only">Downloads:</span> {formatCompact(card.downloads)}
              </span>
            )}
          </div>
        ) : null}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <StatusDot status={card.status} />
        <span
          className={`font-display tracking-[-0.03em] font-thin ${scoreColors[card.status]} ${
            isFeatured ? "text-[56px]" : "text-[32px]"
          }`}
        >
          {card.score ?? "\u2014"}
        </span>
      </div>
    </div>
  );
}

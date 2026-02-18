import type { CautionRowData } from "@/data/landing";
import { formatCompact } from "@lib/queries";

export function CautionRow({ row }: { row: CautionRowData }) {
  return (
    <div className="failed-row-hover grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] items-center gap-2 md:gap-6 rounded-[2px] bg-cv-surface px-6 py-5">
      <div>
        <div className="text-[13px] font-medium">{row.name}</div>
        <div className="text-[11px] text-cv-text-muted font-light">
          {row.reason}
        </div>
      </div>
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
      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-cv-warning bg-cv-warning/8 px-2.5 py-1 rounded-[2px] w-fit">
        {row.tag}
      </span>
      <span
        className="font-display text-2xl font-black text-cv-warning"
        aria-label={`Trust score: ${row.score}`}
      >
        {row.score}
      </span>
    </div>
  );
}

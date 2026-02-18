import type { MarqueeItem } from "@/data/landing";

function MarqueeContent({ stats }: { stats: MarqueeItem[] }) {
  return (
    <>
      {stats.map((item, i) => (
        <div key={i} className="contents">
          <div className="flex items-center gap-3 whitespace-nowrap">
            <span className="font-display text-[28px] font-black tracking-[-0.03em]">
              {item.value}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-cv-text-muted">
              {item.label}
            </span>
          </div>
          <span className="text-xl text-cv-accent">/</span>
        </div>
      ))}
    </>
  );
}

export function MarqueeStats({ stats }: { stats: MarqueeItem[] }) {
  return (
    <div className="reveal r4 overflow-hidden border-y-2 border-cv-text py-4 mb-20">
      <div className="marquee-track">
        <MarqueeContent stats={stats} />
        <MarqueeContent stats={stats} />
      </div>
    </div>
  );
}

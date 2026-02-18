import Link from "next/link";

export function Hero() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pt-15 pb-20 md:px-10 md:grid md:grid-cols-[2fr_1fr] md:gap-15 md:items-end">
      <div>
        <h1 className="reveal r2 font-display text-5xl font-black leading-[0.92] tracking-[-0.05em] uppercase md:text-[80px]">
          TRUST
          <br />
          <span className="relative block text-cv-accent">
            LAYER
            <span className="absolute bottom-1 left-0 h-1 w-full bg-cv-accent animate-[voltage-flicker_3s_ease-in-out_infinite]" />
          </span>
          <br />
          FOR AI
        </h1>
      </div>
      <div className="reveal r3 pt-8 md:pt-0 md:pb-3">
        <p className="text-xs leading-[1.8] text-cv-text-muted font-light mb-7">
          Every skill scanned server-side with Claude AI analysis. Results cannot be
          faked. Badge tied to commit hash&nbsp;&mdash; code changes, badge gone.
        </p>
        <Link
          href="/browse"
          className="btn-voltage inline-flex items-center gap-2 rounded-[4px] bg-cv-accent px-7 py-3.5 font-display text-[13px] font-extrabold uppercase tracking-[0.06em] text-cv-bg hover:bg-cv-accent-hover cursor-pointer"
        >
          Browse Skills <span>&rarr;</span>
        </Link>
      </div>
    </section>
  );
}

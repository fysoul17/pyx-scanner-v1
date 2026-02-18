import Link from "next/link";

export function CtaSection() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pt-10 pb-25 md:px-10">
      <div className="cta-orb relative overflow-hidden rounded-[4px] bg-cv-text p-16 text-center text-cv-bg">
        <h2 className="relative font-display text-5xl font-black uppercase tracking-[-0.04em] mb-3">
          ZERO FRICTION
        </h2>
        <p className="relative text-xs text-cv-text-muted font-light mb-9">
          No API key. No tiers. No cost. Just trust.
        </p>
        <Link
          href="/browse"
          className="cta-cmd-hover relative inline-block rounded-[4px] border-none bg-cv-accent px-9 py-3.5 font-display text-[13px] font-bold uppercase tracking-[0.06em] text-cv-bg"
        >
          Browse Verified Skills
        </Link>
      </div>
    </section>
  );
}

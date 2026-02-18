import Link from "next/link";
import type { BentoCardData } from "@/data/landing";
import { BentoCard } from "./bento-card";
import { ScrollReveal } from "./scroll-reveal";

export function BentoGrid({ cards }: { cards: BentoCardData[] }) {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pb-20 md:px-10">
      <ScrollReveal>
        <div className="flex items-baseline justify-between mb-6">
          <span className="font-display text-sm font-extrabold uppercase tracking-[0.06em]">
            Recently Scanned
          </span>
          <span className="text-[10px] text-cv-text-muted font-light">
            {cards.length} skills in the last hour
          </span>
        </div>
      </ScrollReveal>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
        {cards.map((card) => (
          <ScrollReveal
            key={card.name}
            className={card.featured ? "md:col-span-2 md:row-span-2" : ""}
          >
            <Link href={`/s/${card.owner}/${card.name}`} className="block h-full">
              <BentoCard card={card} />
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

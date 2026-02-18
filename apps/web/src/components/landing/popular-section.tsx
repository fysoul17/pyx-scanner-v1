import Link from "next/link";
import type { PopularRowData } from "@/data/landing";
import { PopularRow } from "./popular-row";
import { ScrollReveal } from "./scroll-reveal";

export function PopularSection({ rows }: { rows: PopularRowData[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1200px] px-5 pb-20 md:px-10">
      <ScrollReveal>
        <div className="mb-5 inline-block rounded-[2px] bg-cv-accent px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-bg">
          Popular Skills &mdash; Top by community adoption
        </div>
      </ScrollReveal>
      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <ScrollReveal key={`${row.owner}/${row.name}`}>
            <Link
              href={`/s/${row.owner}/${row.name}`}
              className="block"
              aria-label={`${row.owner}/${row.name} — ranked #${row.rank}`}
            >
              <PopularRow row={row} />
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

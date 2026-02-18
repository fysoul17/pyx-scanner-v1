import Link from "next/link";
import type { CautionRowData } from "@/data/landing";
import { CautionRow } from "./caution-row";
import { ScrollReveal } from "./scroll-reveal";

export function CautionSection({ rows }: { rows: CautionRowData[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1200px] px-5 pb-20 md:px-10">
      <ScrollReveal>
        <div className="mb-5 inline-block rounded-[2px] bg-cv-warning px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-bg">
          Caution &mdash; Review Before Installing
        </div>
      </ScrollReveal>
      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <ScrollReveal key={row.name}>
            <Link href={`/s/${row.name}`} className="block">
              <CautionRow row={row} />
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

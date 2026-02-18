import Link from "next/link";
import type { FailedRowData } from "@/data/landing";
import { FailedRow } from "./failed-row";
import { ScrollReveal } from "./scroll-reveal";

export function FailedSection({ rows }: { rows: FailedRowData[] }) {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pb-20 md:px-10">
      <ScrollReveal>
        <div className="mb-5 inline-block rounded-[2px] bg-cv-failed px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-bg">
          High Risk &mdash; Security Threats Detected
        </div>
      </ScrollReveal>
      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <ScrollReveal key={row.name}>
            <Link href={`/s/${row.name}`} className="block">
              <FailedRow row={row} />
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

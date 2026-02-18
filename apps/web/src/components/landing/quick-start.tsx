import { ScrollReveal } from "./scroll-reveal";
import { QuickStartTabs } from "./quick-start-tabs";

export function QuickStart() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-20 md:px-10">
      <ScrollReveal className="flex flex-col items-center">
        <div className="mb-8 h-[1px] w-12 bg-cv-accent" />
        <span className="mb-6 text-[10px] font-medium uppercase tracking-[0.15em] text-cv-text-muted">
          Get Started
        </span>
        <QuickStartTabs />
      </ScrollReveal>
    </section>
  );
}

import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

export default function SkillNotFound() {
  return (
    <>
      <Nav />
      <main className="reveal r1 mx-auto max-w-[1200px] px-5 py-20 md:px-10 text-center">
        <h1 className="font-display text-[40px] font-black tracking-[-0.02em] mb-4">
          Skill Not Found
        </h1>
        <p className="text-[13px] text-cv-text-muted font-light mb-8">
          This skill hasn&apos;t been scanned yet, or doesn&apos;t exist.
        </p>
        <Link
          href="/browse"
          className="inline-block rounded-[2px] bg-cv-accent px-6 py-3 font-display text-[11px] font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-cv-accent-hover"
        >
          Browse Skills
        </Link>
      </main>
      <Footer />
    </>
  );
}

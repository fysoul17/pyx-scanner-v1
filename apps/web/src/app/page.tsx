import type { Metadata } from "next";
import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { MarqueeStats } from "@/components/landing/marquee-stats";
import { BentoGrid } from "@/components/landing/bento-grid";
import { PopularSection } from "@/components/landing/popular-section";
import { CautionSection } from "@/components/landing/caution-section";
import { FailedSection } from "@/components/landing/failed-section";
import { CtaSection } from "@/components/landing/cta-section";
import { FaqSection, FAQ_JSON_LD } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";
import { QuickStart } from "@/components/landing/quick-start";
import { JsonLd } from "@/components/json-ld";
import {
  getRecentSkillsWithScans,
  getCautionSkillsWithScans,
  getFailedSkillsWithScans,
  getPopularSkills,
  getLandingStats,
  toTrustScore,
} from "@lib/queries";
import type { BentoCardData, PopularRowData, CautionRowData, FailedRowData, MarqueeItem } from "@/data/landing";

export const metadata: Metadata = {
  title: "PYX Scanner — The Trust Layer for AI | AI Skill Security Scanner",
  description:
    "Scan AI skills for prompt injection, data exfiltration, social engineering, and 4 more threat categories. Server-side Opus analysis with commit-hash-tied badges.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  let recentSkills: Awaited<ReturnType<typeof getRecentSkillsWithScans>> = [];
  let popularSkillsData: Awaited<ReturnType<typeof getPopularSkills>> = [];
  let cautionSkills: Awaited<ReturnType<typeof getCautionSkillsWithScans>> = [];
  let failedSkills: Awaited<ReturnType<typeof getFailedSkillsWithScans>> = [];
  let stats: Awaited<ReturnType<typeof getLandingStats>> = {
    skillsScanned: 0,
    totalScans: 0,
    passRate: 0,
    threatsCaught: 0,
    clawHubSkillsScanned: 0,
  };

  try {
    [recentSkills, popularSkillsData, cautionSkills, failedSkills, stats] = await Promise.all([
      getRecentSkillsWithScans(),
      getPopularSkills(),
      getCautionSkillsWithScans(),
      getFailedSkillsWithScans(),
      getLandingStats(),
    ]);
  } catch {
    // Graceful degradation — render page with empty data
  }

  const bentoCards: BentoCardData[] = recentSkills.map((skill, i) => ({
    name: skill.name,
    owner: skill.owner,
    description: skill.description || "",
    status: skill.status,
    category: skill.category,
    score: toTrustScore(skill.risk_score),
    stars: skill.github_stars ?? skill.clawhub_stars,
    downloads: skill.clawhub_downloads,
    featured: i === 0,
    label: i === 0 ? "Top Verified" : undefined,
  }));

  const cautionRows: CautionRowData[] = cautionSkills.map((skill) => {
    const tag =
      (skill.details as Record<string, unknown> | null)?.tag ??
      skill.recommendation ??
      "Caution";
    return {
      name: `${skill.owner}/${skill.name}`,
      reason: skill.summary || "Broad permissions — review before installing",
      tag: String(tag),
      score: toTrustScore(skill.risk_score) ?? 0,
      stars: skill.github_stars ?? skill.clawhub_stars,
      downloads: skill.clawhub_downloads,
    };
  });

  const failedRows: FailedRowData[] = failedSkills.map((skill) => {
    const tag =
      (skill.details as Record<string, unknown> | null)?.tag ??
      skill.recommendation ??
      "High Risk";
    return {
      name: `${skill.owner}/${skill.name}`,
      reason: skill.summary || "Security threats detected",
      tag: String(tag),
      score: toTrustScore(skill.risk_score) ?? 0,
      stars: skill.github_stars ?? skill.clawhub_stars,
      downloads: skill.clawhub_downloads,
    };
  });

  const popularRows: PopularRowData[] = popularSkillsData.map((skill) => ({
    rank: skill.rank,
    name: skill.name,
    owner: skill.owner,
    description: skill.description,
    status: skill.status,
    category: skill.category,
    score: toTrustScore(skill.risk_score),
    stars: skill.github_stars ?? skill.clawhub_stars,
    downloads: skill.clawhub_downloads,
  }));

  const marqueeStats: MarqueeItem[] = [
    { value: stats.skillsScanned.toLocaleString(), label: "Skills Scanned" },
    { value: stats.totalScans.toLocaleString(), label: "Total Scans" },
    { value: `${stats.passRate}%`, label: "Pass Rate" },
    { value: stats.threatsCaught.toLocaleString(), label: "Threats Caught" },
    { value: stats.clawHubSkillsScanned.toLocaleString(), label: "ClawHub Skills Scanned" },
    { value: "~60s", label: "Avg Scan Time" },
  ];

  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PYX Scanner",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web",
    description:
      "AI skill security scanner — 7 threat categories, prompt injection detection, commit-hash badges.",
    aggregateRating:
      stats.totalScans > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: stats.passRate,
            bestRating: 100,
            ratingCount: stats.totalScans,
          }
        : undefined,
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PYX Scanner",
    url: "https://scanner.pyxmate.com",
    description: "The Trust Layer for AI — AI skill security scanning.",
  };

  return (
    <>
      <JsonLd data={softwareAppJsonLd} />
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={FAQ_JSON_LD} />
      <Nav />
      <Hero />
      <MarqueeStats stats={marqueeStats} />
      <QuickStart />
      <BentoGrid cards={bentoCards} />
      {stats.skillsScanned > 0 && (
        <section className="mx-auto max-w-[1200px] px-5 py-12 md:px-10">
          <p className="text-[14px] text-cv-text-muted font-light leading-[1.6] text-center">
            PYX Scanner has analyzed{" "}
            <strong className="text-cv-text font-bold">
              {stats.skillsScanned.toLocaleString()} AI skills
            </strong>{" "}
            across{" "}
            <strong className="text-cv-text font-bold">
              {stats.totalScans.toLocaleString()} scans
            </strong>
            , catching{" "}
            <strong className="text-cv-failed font-bold">
              {stats.threatsCaught.toLocaleString()} threats
            </strong>
            .
          </p>
        </section>
      )}
      <PopularSection rows={popularRows} />
      <CautionSection rows={cautionRows} />
      <FailedSection rows={failedRows} />
      <FaqSection />
      <CtaSection />
      <Footer />
    </>
  );
}

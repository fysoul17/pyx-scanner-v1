import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { JsonLd } from "@/components/json-ld";
import { SkillHeader } from "@/components/skill/skill-header";
import { StatusCard } from "@/components/skill/status-card";
import { MetadataRow } from "@/components/skill/metadata-row";
import { InstallSection } from "@/components/skill/install-section";
import { SkillAbout } from "@/components/skill/skill-about";
import { AnalysisDetails } from "@/components/skill/analysis-details";
import { SecurityScans } from "@/components/skill/security-scans";
import { StaticFindings } from "@/components/skill/static-findings";
import { DependencyVulns } from "@/components/skill/dependency-vulns";
import { TruncationWarning } from "@/components/skill/truncation-warning";
import { ScanHistory } from "@/components/skill/scan-history";
import { checkSkill, getSkillHistory, toTrustScore } from "@lib/queries";
import type { StaticFinding, StaticSummary, ExternalScansData } from "@shared/types";

interface PageProps {
  params: Promise<{ owner: string; name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner: rawOwner, name: rawName } = await params;
  const owner = decodeURIComponent(rawOwner);
  const name = decodeURIComponent(rawName);

  let description = `Trust score and security scan results for ${owner}/${name} AI skill.`;

  try {
    const result = await checkSkill(owner, name);
    if (result.skill && result.latestScan) {
      const score = toTrustScore(result.latestScan.risk_score);
      const status = result.skill.status;
      const trustLabel = score != null ? ` Trust score: ${score}/100.` : "";
      description = `${owner}/${name} AI skill — ${status}.${trustLabel} Scanned for prompt injection, data exfiltration, and 5 more threat categories.`;
    }
  } catch {
    // Fallback to generic description
  }

  return {
    title: `${owner}/${name}`,
    description,
    alternates: { canonical: `/s/${owner}/${name}` },
    openGraph: {
      title: `${owner}/${name} — PYX Scanner`,
      description,
    },
  };
}

export default async function SkillPage({ params }: PageProps) {
  const { owner: rawOwner, name: rawName } = await params;
  const owner = decodeURIComponent(rawOwner);
  const name = decodeURIComponent(rawName);

  const [checkResult, historyResult] = await Promise.all([
    checkSkill(owner, name),
    getSkillHistory(owner, name),
  ]);

  if (!checkResult.skill) {
    notFound();
  }

  const { skill, latestScan } = checkResult;
  const score = toTrustScore(latestScan?.risk_score ?? null);

  // Extract static findings from details JSONB
  const details = latestScan?.details as Record<string, unknown> | null;
  const staticFindings = (details?.static_findings as StaticFinding[] | undefined) ?? undefined;
  const staticSummary = (details?.static_summary as StaticSummary | undefined) ?? undefined;
  const staticAssessment = (details?.static_findings_assessment as string | undefined) ?? undefined;
  const externalScans = (details?.external_scans as ExternalScansData | undefined) ?? null;

  const skillJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${owner}/${name}`,
    applicationCategory: "AISkill",
    description: latestScan?.skill_about?.purpose ?? skill.description ?? "",
    ...(score != null
      ? {
          review: {
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: score,
              bestRating: 100,
              worstRating: 0,
            },
            author: {
              "@type": "Organization",
              name: "PYX Scanner",
            },
          },
        }
      : {}),
  };

  return (
    <>
      <JsonLd data={skillJsonLd} />
      <Nav />
      <main className="reveal r1 mx-auto max-w-[1200px] px-5 py-10 md:px-10">
        <SkillHeader skill={skill} />
        <div className="reveal r2">
          <StatusCard
            status={skill.status}
            score={score}
            recommendation={checkResult.recommendation}
            owner={owner}
            name={name}
            model={latestScan?.model ?? null}
            confidence={latestScan?.confidence ?? null}
            intent={latestScan?.intent ?? null}
          />
        </div>
        {latestScan?.was_truncated && (
          <div className="reveal r2 mt-3">
            <TruncationWarning />
          </div>
        )}
        <div className="reveal r3">
          <MetadataRow skill={skill} latestScan={latestScan} />
        </div>
        <div className="reveal r3">
          <InstallSection skill={skill} />
        </div>
        <div className="reveal r3">
          <SecurityScans
            externalScans={externalScans}
            pyxStatus={skill.status}
            pyxScore={score}
          />
        </div>
        <div className="reveal r4">
          <SkillAbout skillAbout={latestScan?.skill_about ?? null} />
        </div>
        <div className="reveal r4">
          <AnalysisDetails scan={latestScan} />
        </div>
        <div className="reveal r4">
          <StaticFindings
            findings={staticFindings}
            summary={staticSummary}
            assessment={staticAssessment}
          />
        </div>
        <div className="reveal r4">
          <DependencyVulns vulnerabilities={latestScan?.dependency_vulnerabilities} />
        </div>
        <div className="reveal r4">
          <ScanHistory results={historyResult.results} />
        </div>
      </main>
      <Footer />
    </>
  );
}

import type { Skill, ScanResult } from "@shared/types";
import { RelativeTime } from "./relative-time";

export function MetadataRow({
  skill,
  latestScan,
}: {
  skill: Skill;
  latestScan: ScanResult | null;
}) {
  const isClawHub = skill.source === "clawhub";
  const commitShort = latestScan?.commit_hash?.slice(0, 7) ?? "\u2014";
  const isLatest =
    latestScan?.commit_hash &&
    skill.latest_scan_commit === latestScan.commit_hash;

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1 mt-4`}>
      {/* Version / Commit */}
      <div className="rounded-[2px] bg-cv-surface p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-cv-text-muted mb-1">
          {isClawHub ? "Version" : "Commit"}
        </div>
        <div className="font-mono text-[13px] font-medium">
          {isClawHub ? (skill.clawhub_version ?? "\u2014") : commitShort}
          {isLatest && (
            <span className="ml-2 text-[9px] font-bold uppercase tracking-[0.08em] text-cv-verified bg-cv-verified/8 px-1.5 py-0.5 rounded-[2px]">
              latest
            </span>
          )}
        </div>
      </div>

      {/* Scanned */}
      <div className="rounded-[2px] bg-cv-surface p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-cv-text-muted mb-1">
          Scanned
        </div>
        <div className="text-[13px] font-light">
          {latestScan?.scanned_at ? (
            <RelativeTime date={latestScan.scanned_at} />
          ) : (
            "\u2014"
          )}
        </div>
      </div>

      {/* Updated */}
      <div className="rounded-[2px] bg-cv-surface p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-cv-text-muted mb-1">
          Updated
        </div>
        <div className="text-[13px] font-light">
          <RelativeTime date={skill.updated_at} />
        </div>
      </div>

      {/* Repository / ClawHub link */}
      <div className="rounded-[2px] bg-cv-surface p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-cv-text-muted mb-1">
          {isClawHub ? "Registry" : "Repository"}
        </div>
        <div className="text-[13px] font-light">
          {isClawHub && skill.clawhub_url ? (
            <a
              href={skill.clawhub_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cv-text underline underline-offset-2 decoration-cv-text-muted/40 transition-colors hover:text-cv-accent"
            >
              ClawHub
            </a>
          ) : skill.repository_url ? (
            <a
              href={skill.repository_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cv-text underline underline-offset-2 decoration-cv-text-muted/40 transition-colors hover:text-cv-accent"
            >
              GitHub
            </a>
          ) : (
            "\u2014"
          )}
        </div>
      </div>

      {/* Downloads (ClawHub only) */}
      {isClawHub && (
        <div className="rounded-[2px] bg-cv-surface p-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-cv-text-muted mb-1">
            Downloads
          </div>
          <div className="text-[13px] font-light">
            {skill.clawhub_downloads?.toLocaleString() ?? "\u2014"}
          </div>
        </div>
      )}

      {/* Stars (ClawHub only) */}
      {isClawHub && (
        <div className="rounded-[2px] bg-cv-surface p-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-cv-text-muted mb-1">
            Stars
          </div>
          <div className="text-[13px] font-light">
            {skill.clawhub_stars?.toLocaleString() ?? "\u2014"}
          </div>
        </div>
      )}

      {/* Stars (GitHub only) */}
      {!isClawHub && (
        <div className="rounded-[2px] bg-cv-surface p-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-cv-text-muted mb-1">
            Stars
          </div>
          <div className="text-[13px] font-light">
            {skill.github_stars?.toLocaleString() ?? "\u2014"}
          </div>
        </div>
      )}

      {/* Forks (GitHub only) */}
      {!isClawHub && (
        <div className="rounded-[2px] bg-cv-surface p-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-cv-text-muted mb-1">
            Forks
          </div>
          <div className="text-[13px] font-light">
            {skill.github_forks?.toLocaleString() ?? "\u2014"}
          </div>
        </div>
      )}
    </div>
  );
}

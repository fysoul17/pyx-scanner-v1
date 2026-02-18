import Link from "next/link";
import type { Skill, SkillCategory } from "@shared/types";

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  "developer-tools": "Developer Tools",
  "version-control": "Version Control",
  "web-browser": "Web Browser",
  "data-files": "Data & Files",
  "cloud-infra": "Cloud & Infra",
  "communication": "Communication",
  "search-research": "Search & Research",
  "productivity": "Productivity",
  "other": "Other",
};

export function SkillHeader({ skill }: { skill: Skill }) {
  const identity = `${skill.owner}/${skill.name}`;
  const showRepoSubtitle = skill.repo && skill.repo !== identity;
  const isClawHub = skill.source === "clawhub";

  return (
    <header className="mb-10">
      <Link
        href="/browse"
        className="text-[11px] text-cv-text-muted font-medium uppercase tracking-[0.06em] transition-colors hover:text-cv-text"
      >
        &larr; All Skills
      </Link>
      <div className="flex items-center gap-3 mt-4">
        <h1 className="font-display text-[32px] md:text-[40px] font-black tracking-[-0.02em]">
          {identity}
        </h1>
        <span
          className={`text-[9px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-[2px] ${
            isClawHub
              ? "text-cv-accent bg-cv-accent/10"
              : "text-cv-text-muted bg-cv-surface"
          }`}
        >
          {isClawHub ? "ClawHub" : "GitHub"}
        </span>
        {!isClawHub && skill.github_is_private != null && (
          <span
            className={`text-[9px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-[2px] ${
              skill.github_is_private
                ? "text-cv-warning bg-cv-warning/10"
                : "text-cv-verified bg-cv-verified/10"
            }`}
          >
            {skill.github_is_private ? "Private" : "Public"}
          </span>
        )}
        {skill.category && (
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-[2px] text-cv-accent bg-cv-accent/8">
            {CATEGORY_LABELS[skill.category]}
          </span>
        )}
      </div>
      {showRepoSubtitle && (
        <p className="text-[11px] text-cv-text-muted font-light mt-1">
          from repo{" "}
          <span className="font-medium text-cv-text">{skill.repo}</span>
        </p>
      )}
    </header>
  );
}

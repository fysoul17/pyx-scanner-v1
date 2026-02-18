import type { Skill } from "@shared/types";
import { StatusDot } from "@/components/landing/status-dot";
import { CopyButton } from "./copy-button";

export function InstallSection({ skill }: { skill: Skill }) {
  const isClawHub = skill.source === "clawhub";
  const installCmd = isClawHub && skill.clawhub_slug
    ? `clawhub install ${skill.clawhub_slug}`
    : null;
  const repoUrl = skill.repository_url;

  return (
    <div className="mt-4 rounded-[2px] bg-cv-surface p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-text-muted">
          Install
        </div>
        <StatusDot status={skill.status} />
      </div>
      <div className="flex flex-col gap-3">
        {installCmd ? (
          <div className="flex items-center justify-between gap-4">
            <code className="text-[13px] font-light">
              <span className="text-cv-text-muted">$</span> {installCmd}
            </code>
            <CopyButton text={installCmd} />
          </div>
        ) : repoUrl ? (
          <div className="flex items-center justify-between gap-4">
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-light text-cv-accent underline underline-offset-2 hover:text-cv-text transition-colors"
            >
              {repoUrl.replace(/^https?:\/\/(github\.com|clawhub\.ai)\//, "")}
            </a>
          </div>
        ) : (
          <p className="text-[12px] font-light text-cv-text-muted">
            No install command available for this skill.
          </p>
        )}
      </div>
    </div>
  );
}

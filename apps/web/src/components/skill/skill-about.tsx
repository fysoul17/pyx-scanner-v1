import type { SkillAbout as SkillAboutType } from "@shared/types";

export function SkillAbout({
  skillAbout,
}: {
  skillAbout: SkillAboutType | null;
}) {
  if (!skillAbout) return null;

  const capabilities = Array.isArray(skillAbout.capabilities) ? skillAbout.capabilities : [];
  const useCases = Array.isArray(skillAbout.use_cases) ? skillAbout.use_cases : [];
  const permissions = Array.isArray(skillAbout.permissions_required) ? skillAbout.permissions_required : [];

  return (
    <div className="mt-4 rounded-[2px] bg-cv-surface p-6">
      <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-text-muted mb-4">
        About This Skill
      </div>

      {skillAbout.purpose && (
        <p className="text-[13px] font-light leading-[1.7] text-cv-text mb-4">
          {skillAbout.purpose}
        </p>
      )}

      {capabilities.length > 0 && (
        <div className="mb-4">
          <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-text-muted mb-2">
            Capabilities
          </div>
          <ul className="flex flex-col gap-1">
            {capabilities.map((cap, i) => (
              <li
                key={i}
                className="text-[12px] font-light leading-[1.5] text-cv-text pl-4 relative before:absolute before:left-0 before:content-['·'] before:text-cv-text-muted"
              >
                {cap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {useCases.length > 0 && (
        <div className="mb-4">
          <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-text-muted mb-2">
            Use Cases
          </div>
          <ul className="flex flex-col gap-1">
            {useCases.map((uc, i) => (
              <li
                key={i}
                className="text-[12px] font-light leading-[1.5] text-cv-text pl-4 relative before:absolute before:left-0 before:content-['·'] before:text-cv-text-muted"
              >
                {uc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {permissions.length > 0 && (
        <div className="mb-4">
          <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-text-muted mb-2">
            Permissions Required
          </div>
          <ul className="flex flex-col gap-1">
            {permissions.map((perm, i) => (
              <li
                key={i}
                className="text-[12px] font-light leading-[1.5] text-cv-text pl-4 relative before:absolute before:left-0 before:content-['·'] before:text-cv-text-muted"
              >
                {perm}
              </li>
            ))}
          </ul>
        </div>
      )}

      {skillAbout.security_notes && (
        <div>
          <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.1em] text-cv-text-muted mb-2">
            Security Notes
          </div>
          <p className="text-[12px] font-light leading-[1.5] text-cv-text-muted">
            {skillAbout.security_notes}
          </p>
        </div>
      )}
    </div>
  );
}

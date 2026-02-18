import Link from "next/link";

const NAV_LINKS = [
  { label: "Skills", href: "/browse", comingSoon: false },
  { label: "API", href: "#", comingSoon: true },
  { label: "CLI", href: "#", comingSoon: true },
  { label: "Docs", href: "/docs", comingSoon: false },
];

export function Nav() {
  return (
    <nav className="reveal r1 flex items-center justify-between px-10 py-7">
      <Link
        href="/"
        className="font-display text-lg font-black uppercase tracking-[-0.03em]"
      >
        PYX SCAN
        <span className="ml-0.5 inline-block h-2.5 w-2.5 rounded-full bg-cv-accent animate-[voltage-pulse_1.5s_ease-in-out_infinite]" />
      </Link>
      <div className="hidden md:flex gap-7 items-center">
        <ul className="flex gap-7 items-center list-none">
          {NAV_LINKS.map((link) => (
            <li key={link.label} className="relative">
              {link.comingSoon ? (
                <span className="group relative text-cv-text-muted/40 text-[11px] font-medium uppercase tracking-[0.08em] cursor-default">
                  {link.label}
                  <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-cv-surface-alt px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider text-cv-text-muted opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
                    Soon
                  </span>
                </span>
              ) : (
                <Link
                  href={link.href}
                  className="text-cv-text-muted text-[11px] font-medium uppercase tracking-[0.08em] transition-colors hover:text-cv-text"
                >
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
        <a
          href="https://github.com/fysoul17/pyx-scanner"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cv-text-muted transition-colors hover:text-cv-text"
          aria-label="GitHub repository"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
          </svg>
        </a>
      </div>
    </nav>
  );
}

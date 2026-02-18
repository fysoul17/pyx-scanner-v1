export function Footer() {
  return (
    <footer className="mx-auto flex max-w-[1200px] items-center justify-between border-t border-black/6 px-5 py-8 text-[10px] text-cv-text-muted font-light md:px-10">
      <span>PYX SCANNER &mdash; The trust layer for AI agents</span>
      <a
        href="mailto:contact@pyxmate.com"
        className="text-cv-text-muted hover:text-cv-text transition-colors"
      >
        contact@pyxmate.com
      </a>
      <span>2026</span>
    </footer>
  );
}

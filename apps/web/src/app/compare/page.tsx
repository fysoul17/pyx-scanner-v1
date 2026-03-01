import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Best AI Skill Security Scanner (2026 Comparison) — PYX Scanner vs Alternatives",
  description:
    "Compare PYX Scanner vs VirusTotal, Socket.dev, Snyk, npm audit, and Semgrep for AI skill security. See which scanner catches prompt injection, social engineering, and AI-specific threats.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "Best AI Skill Security Scanner (2026 Comparison)",
    description:
      "Side-by-side comparison of security scanners for AI skills and MCP servers.",
    url: "https://scanner.pyxmate.com/compare",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Best AI Skill Security Scanner (2026 Comparison)",
  description:
    "Comprehensive comparison of security scanners for AI skills, MCP servers, and agent tools.",
  url: "https://scanner.pyxmate.com/compare",
};

interface Scanner {
  name: string;
  aiNative: string;
  promptInjection: string;
  socialEngineering: string;
  commitTied: string;
  pricing: string;
  skillCoverage: string;
  analysisMethod: string;
  strengths: string;
}

const scanners: Scanner[] = [
  {
    name: "PYX Scanner",
    aiNative: "✅ Built for AI skills",
    promptInjection: "✅ Claude Opus semantic detection",
    socialEngineering: "✅ Intent analysis + fake urgency",
    commitTied: "✅ Badge invalidates on code change",
    pricing: "Free forever",
    skillCoverage: "1,395+ skills scanned",
    analysisMethod: "AI semantic + 20 static rules + OSV.dev",
    strengths: "Only scanner purpose-built for AI skill threats — prompt injection, social engineering, data exfiltration in agent context",
  },
  {
    name: "VirusTotal",
    aiNative: "❌ General malware",
    promptInjection: "❌ Not detected",
    socialEngineering: "❌ Not in code context",
    commitTied: "❌ File hash only",
    pricing: "Free / $10K+/yr enterprise",
    skillCoverage: "N/A (file-based)",
    analysisMethod: "70+ antivirus engines + sandboxing",
    strengths: "Widest malware detection, massive engine coverage, trusted by security teams worldwide",
  },
  {
    name: "Socket.dev",
    aiNative: "⚠️ npm/PyPI focused",
    promptInjection: "❌ Not detected",
    socialEngineering: "⚠️ Typosquat detection only",
    commitTied: "❌ Version-based",
    pricing: "Free tier / $25+/mo",
    skillCoverage: "npm + PyPI packages",
    analysisMethod: "Supply chain analysis + behavioral",
    strengths: "Best supply chain attack detection, real-time npm monitoring, install script analysis",
  },
  {
    name: "Snyk",
    aiNative: "❌ General AppSec",
    promptInjection: "❌ Not detected",
    socialEngineering: "❌ Not detected",
    commitTied: "❌ CI/CD integration",
    pricing: "Free tier / $25+/mo",
    skillCoverage: "Multi-language dependencies",
    analysisMethod: "CVE database + proprietary research",
    strengths: "Deep dependency scanning, IDE integration, fix PRs, container scanning",
  },
  {
    name: "npm audit",
    aiNative: "❌ npm only",
    promptInjection: "❌ Not detected",
    socialEngineering: "❌ Not detected",
    commitTied: "❌ No badges",
    pricing: "Free (built-in)",
    skillCoverage: "npm packages only",
    analysisMethod: "GitHub Advisory Database",
    strengths: "Zero setup, built into npm, fast known-CVE detection",
  },
  {
    name: "Semgrep",
    aiNative: "⚠️ Custom rules possible",
    promptInjection: "⚠️ Needs custom rules",
    socialEngineering: "❌ Pattern-only, no intent",
    commitTied: "❌ CI/CD integration",
    pricing: "Free OSS / Team $40+/mo",
    skillCoverage: "30+ languages",
    analysisMethod: "AST pattern matching + custom rules",
    strengths: "Highly customizable, fast AST scanning, great for custom security policies",
  },
];

const features = [
  ["AI-Native Scanning", "aiNative"],
  ["Prompt Injection", "promptInjection"],
  ["Social Engineering", "socialEngineering"],
  ["Commit-Tied Trust", "commitTied"],
  ["Pricing", "pricing"],
  ["Coverage", "skillCoverage"],
  ["Analysis Method", "analysisMethod"],
  ["Key Strengths", "strengths"],
] as const;

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-cv-bg text-cv-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav className="reveal r1 flex items-center justify-between px-10 py-7">
        <Link
          href="/"
          className="font-display text-lg font-black uppercase tracking-[-0.03em]"
        >
          PYX SCAN
          <span className="ml-0.5 inline-block h-2.5 w-2.5 rounded-full bg-cv-accent animate-[voltage-pulse_1.5s_ease-in-out_infinite]" />
        </Link>
        <div className="hidden md:flex gap-7 items-center">
          <Link href="/browse" className="text-sm text-cv-muted hover:text-cv-text transition-colors">Skills</Link>
          <Link href="/docs" className="text-sm text-cv-muted hover:text-cv-text transition-colors">Docs</Link>
          <Link href="/compare" className="text-sm text-cv-accent hover:text-cv-text transition-colors font-medium">Compare</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-16 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-black mb-6">
            Best Security Scanner for
            <br />
            <span className="text-cv-accent">AI Skills & MCP Servers</span>
          </h1>
          <p className="text-lg text-cv-muted max-w-3xl mx-auto leading-relaxed">
            Traditional security tools catch CVEs and malware — but miss AI-specific threats like
            prompt injection, social engineering in documentation, and data exfiltration designed
            to fool LLMs. We compare PYX Scanner with general-purpose alternatives.
          </p>
        </header>

        {/* TL;DR */}
        <section className="mb-16 p-8 rounded-2xl bg-cv-surface border border-cv-border">
          <h2 className="font-display text-2xl font-black mb-4">TL;DR</h2>
          <p className="text-cv-muted leading-relaxed">
            If you&apos;re building or using AI agents that install skills, tools, or MCP servers,{" "}
            <strong className="text-cv-accent">PYX Scanner</strong> is the only scanner that
            understands AI-specific threats. It uses Claude Opus for semantic analysis — detecting
            prompt injection payloads, social engineering in READMEs, and data exfiltration patterns
            that regex-based scanners miss entirely. It&apos;s free, server-side (results can&apos;t
            be faked), and every trust badge is tied to a specific commit hash.
          </p>
        </section>

        {/* Why AI Skills Need Different Security */}
        <section className="mb-16 p-8 rounded-2xl bg-cv-surface border border-cv-border">
          <h2 className="font-display text-2xl font-black mb-4">Why AI Skills Need Different Security</h2>
          <p className="text-cv-muted leading-relaxed mb-4">
            A traditional npm package might contain a known CVE — Snyk and npm audit catch that.
            But an AI skill can contain a prompt injection payload hidden in a comment, a README
            that tricks the LLM into running destructive commands, or an obfuscated exfiltration
            routine that only activates when called by an AI agent.
          </p>
          <p className="text-cv-muted leading-relaxed">
            These are <strong>semantic threats</strong> — they require understanding intent, not
            just matching patterns. That&apos;s why PYX Scanner uses Claude Opus: it reads code
            the way an attacker would write it, understanding context, misdirection, and social
            engineering that pattern matchers fundamentally cannot catch.
          </p>
        </section>

        {/* Comparison Table */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-black mb-6">Side-by-Side Comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-cv-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cv-surface border-b border-cv-border">
                  <th className="text-left p-4 font-semibold text-cv-muted min-w-[140px]">Feature</th>
                  {scanners.map((s) => (
                    <th
                      key={s.name}
                      className={`text-left p-4 font-semibold min-w-[150px] ${
                        s.name === "PYX Scanner" ? "text-cv-accent" : "text-cv-muted"
                      }`}
                    >
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-cv-muted">
                {features.map(([label, key]) => (
                  <tr key={key} className="border-b border-cv-border/50 hover:bg-cv-surface/50">
                    <td className="p-4 font-medium text-cv-text">{label}</td>
                    {scanners.map((s) => (
                      <td
                        key={s.name}
                        className={`p-4 ${s.name === "PYX Scanner" ? "text-cv-text" : ""}`}
                      >
                        {s[key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed Comparisons */}
        <section className="mb-16 space-y-12">
          <h2 className="font-display text-2xl font-black">Detailed Comparison</h2>

          <article>
            <h3 className="text-xl font-semibold mb-3 text-cv-accent">PYX Scanner vs VirusTotal</h3>
            <p className="text-cv-muted leading-relaxed">
              VirusTotal is the industry standard for malware detection, aggregating 70+ antivirus
              engines. It excels at identifying known malware signatures and suspicious binaries.
              However, AI skills are source code — not compiled binaries — and their threats are
              semantic, not signature-based. A prompt injection payload in a SKILL.md file looks
              like normal text to every antivirus engine. PYX Scanner understands the AI context:
              it knows that &quot;ignore all previous instructions&quot; in a code comment is a
              threat, not documentation.
            </p>
          </article>

          <article>
            <h3 className="text-xl font-semibold mb-3 text-cv-accent">PYX Scanner vs Socket.dev</h3>
            <p className="text-cv-muted leading-relaxed">
              Socket.dev is excellent at detecting supply chain attacks in npm and PyPI packages —
              typosquatting, install scripts, and suspicious network activity. For traditional
              package security, Socket is a strong choice. However, Socket focuses on the package
              ecosystem, not AI-specific skill formats. It won&apos;t analyze a SKILL.md for prompt
              injection or detect social engineering designed to manipulate an LLM. PYX Scanner
              complements Socket: use Socket for your npm dependencies, PYX for your AI skills.
            </p>
          </article>

          <article>
            <h3 className="text-xl font-semibold mb-3 text-cv-accent">PYX Scanner vs Snyk</h3>
            <p className="text-cv-muted leading-relaxed">
              Snyk is a comprehensive AppSec platform with deep dependency scanning, container
              security, and IDE integration. It&apos;s excellent for finding known CVEs in your
              dependency tree. But Snyk&apos;s analysis is CVE-database-driven — it catches known
              vulnerabilities, not novel AI-specific threats. A malicious AI skill with zero
              dependencies and no known CVEs would pass Snyk with a clean bill of health. PYX
              Scanner analyzes the skill&apos;s actual code and documentation for intent, catching
              threats that have no CVE entry.
            </p>
          </article>

          <article>
            <h3 className="text-xl font-semibold mb-3 text-cv-accent">PYX Scanner vs Semgrep</h3>
            <p className="text-cv-muted leading-relaxed">
              Semgrep is a powerful AST-based pattern matcher that can be customized with rules
              for almost any pattern. In theory, you could write Semgrep rules for some AI threats.
              In practice, prompt injection and social engineering are semantic — they require
              understanding natural language intent, not matching AST patterns. PYX Scanner&apos;s
              Claude Opus analysis understands context that no regex or AST pattern can capture:
              is this base64 string hiding a malicious URL, or is it a legitimate asset? Is this
              README instruction helpful, or is it trying to trick an LLM?
            </p>
          </article>
        </section>

        {/* 7 Threat Categories */}
        <section className="mb-16 p-8 rounded-2xl bg-cv-surface border border-cv-border">
          <h2 className="font-display text-2xl font-black mb-6">7 AI-Specific Threat Categories</h2>
          <p className="text-cv-muted mb-6">
            PYX Scanner evaluates every skill against these categories — most of which traditional
            scanners don&apos;t even have definitions for:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ["🔴 Data Exfiltration", "HTTP requests sending local data to external servers, DNS exfiltration, paste service uploads"],
              ["🔴 Destructive Commands", "File system destruction, git force push, database DROP/TRUNCATE"],
              ["🔴 Secret Access", "Reading SSH keys, cloud metadata endpoints, .env files, credential stores"],
              ["🟡 Obfuscation", "eval(), base64/hex encoding, dynamic import() with constructed URLs"],
              ["🟡 Prompt Injection", "Instructions to override system prompts, hidden text, LLM manipulation"],
              ["🟡 Social Engineering", "Fake urgency, impersonation, misleading documentation"],
              ["🟠 Excessive Permissions", "Filesystem/network access beyond stated purpose"],
            ].map(([title, desc]) => (
              <div key={title} className="p-4 rounded-xl bg-cv-bg/50 border border-cv-border/50">
                <h3 className="font-semibold text-cv-text mb-1">{title}</h3>
                <p className="text-sm text-cv-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-black mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "Is PYX Scanner really free?",
                a: "Yes, forever. Scanning is our trust-building moat. We believe security scanning should be accessible to everyone — a single malicious skill can compromise an entire AI agent system. The scanning cost (~$0.10/skill via Claude Opus) is our marketing expense.",
              },
              {
                q: "Why can't traditional scanners catch AI-specific threats?",
                a: "Traditional scanners look for known signatures (CVEs), pattern matches (regex), or behavioral anomalies (sandboxing). AI-specific threats like prompt injection are semantic — they use natural language to manipulate LLMs. You need an AI to understand AI-targeted attacks.",
              },
              {
                q: "What does 'commit-hash-tied' mean?",
                a: "Every PYX scan result is tied to a specific git commit. If the skill's code changes by even one character, the trust badge is invalidated and a re-scan is required. This prevents 'bait-and-switch' attacks where a skill passes scanning then adds malicious code.",
              },
              {
                q: "How do I check a skill before installing it?",
                a: "Call our free API: GET https://scanner.pyxmate.com/api/v1/check/{owner}/{name}. It returns a JSON response with safe (boolean), trust status, risk score, and detailed analysis. No API key needed.",
              },
              {
                q: "Can I use PYX Scanner with other security tools?",
                a: "Absolutely. PYX Scanner is complementary — use Snyk/npm audit for dependency CVEs, Socket.dev for supply chain attacks, and PYX Scanner for AI-specific threats. Defense in depth.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-xl bg-cv-surface border border-cv-border p-6">
                <summary className="cursor-pointer font-semibold text-cv-text group-open:mb-3 list-none flex items-center justify-between">
                  {q}
                  <span className="text-cv-muted group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-cv-muted leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center p-12 rounded-2xl bg-cv-surface border border-cv-border">
          <h2 className="font-display text-3xl font-black mb-4">Scan Your First Skill</h2>
          <p className="text-cv-muted mb-8 max-w-xl mx-auto">
            Free, no sign-up required. Check any AI skill or MCP server in seconds.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cv-accent text-black font-semibold hover:bg-cv-accent/90 transition-all"
            >
              Browse Scanned Skills →
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-cv-border text-cv-muted font-semibold hover:bg-white/10 transition-all"
            >
              API Docs
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-cv-border py-8 text-center text-sm text-cv-muted">
        <p>© 2026 PYX. The Trust Layer for AI.</p>
      </footer>
    </div>
  );
}

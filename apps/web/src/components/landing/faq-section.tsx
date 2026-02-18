const FAQ_ITEMS = [
  {
    question: "What is PYX Scanner?",
    answer:
      "PYX Scanner is a security scanning platform for AI skills. It analyzes every skill server-side using Claude Opus, checking for 7 threat categories including prompt injection, data exfiltration, and social engineering. Results are tied to specific commit hashes so they cannot be faked.",
  },
  {
    question: "How does PYX Scanner detect prompt injection?",
    answer:
      "PYX Scanner uses semantic code understanding to identify instructions designed to override system prompts, hidden text in comments or variable names, and payloads meant to manipulate LLMs. Unlike signature-based scanners, it understands context — detecting social engineering attempts that pattern matching would miss.",
  },
  {
    question: "What threat categories does PYX Scanner check for?",
    answer:
      "Every scan evaluates 7 categories: Data Exfiltration (sending local data to external servers), Destructive Commands (file deletion, git force push), Secret Access (credential theft, cloud metadata), Obfuscation (eval, hex encoding), Prompt Injection (LLM manipulation), Social Engineering (fake urgency, impersonation), and Excessive Permissions (unnecessary access requests).",
  },
  {
    question: "How is the trust score calculated?",
    answer:
      "Each skill receives a risk score from 0 to 10 based on Claude's analysis of all 7 threat categories. This converts to a trust score from 0 to 100 (higher is safer). Scores 70-100 are verified as safe, 40-60 warrant caution, and below 40 indicate danger. The score considers code context — a web scraping tool legitimately making HTTP requests won't be penalized.",
  },
  {
    question: "What is the difference between verified, caution, and high risk?",
    answer:
      "Skills are classified into three tiers based on risk score. Verified (0-3) means no threats detected — the code does what it claims. Caution (4-6) means suspicious patterns were found but they may have legitimate use, such as broad permissions or risky-but-not-malicious behavior. High Risk (7-10) means clear malicious intent or high-risk patterns like data exfiltration or prompt injection were detected.",
  },
  {
    question: "Is PYX Scanner free to use?",
    answer:
      "Yes. Browsing scan results, checking trust scores, and embedding trust badges are all free. PYX Scanner scans skills from GitHub repositories and the ClawHub registry. You can add a trust badge to your skill's README to show its verified status.",
  },
  {
    question: "How does PYX Scanner compare to VirusTotal for AI skills?",
    answer:
      "VirusTotal uses signature-based scanning with basic AI analysis — effective for known malware patterns. PYX Scanner uses Claude Opus for semantic code understanding, detecting prompt injection, social engineering, and context-dependent threats that signatures miss. PYX also provides skill-about summaries explaining what each skill actually does.",
  },
];

export function FaqSection() {
  return (
    <section className="mx-auto max-w-[800px] px-5 py-16 md:px-10">
      <h2 className="font-display text-[32px] font-black tracking-[-0.02em] mb-8">
        Frequently Asked Questions
      </h2>
      <div className="flex flex-col gap-4">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.question}
            className="group rounded-[2px] bg-cv-surface"
          >
            <summary className="cursor-pointer px-6 py-4 font-display text-[14px] font-bold tracking-[-0.01em] list-none flex items-center justify-between">
              {item.question}
              <span className="text-cv-text-muted transition-transform group-open:rotate-45 text-[20px] font-light">
                +
              </span>
            </summary>
            <div className="px-6 pb-5 text-[13px] text-cv-text-muted font-light leading-[1.6]">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/** FAQ structured data for JSON-LD */
export const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

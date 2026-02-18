"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/skill/copy-button";

const HUMAN_PROMPT =
  "Install fysoul17/pyx-scan from ClawHub if you don't have it, then use it to scan all my installed skills for safety. Show me the results.";

type Tab = "humans" | "agents";

export function QuickStartTabs() {
  const [active, setActive] = useState<Tab>("humans");
  const id = useId();
  const humansTabId = `${id}-tab-humans`;
  const agentsTabId = `${id}-tab-agents`;
  const humansPanelId = `${id}-panel-humans`;
  const agentsPanelId = `${id}-panel-agents`;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setActive((prev) => (prev === "humans" ? "agents" : "humans"));
    }
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Get started audience"
        className="mb-6 flex items-center justify-center gap-7"
        onKeyDown={handleKeyDown}
      >
        <button
          role="tab"
          id={humansTabId}
          aria-selected={active === "humans"}
          aria-controls={humansPanelId}
          tabIndex={active === "humans" ? 0 : -1}
          onClick={() => setActive("humans")}
          className={`cursor-pointer border-b-2 pb-2 font-display text-[11px] font-extrabold uppercase tracking-[0.06em] transition-colors duration-200 md:text-[13px] ${
            active === "humans"
              ? "border-cv-accent text-cv-accent"
              : "border-transparent text-cv-text-muted hover:text-cv-text"
          }`}
        >
          For Humans
        </button>
        <button
          role="tab"
          id={agentsTabId}
          aria-selected={active === "agents"}
          aria-controls={agentsPanelId}
          tabIndex={active === "agents" ? 0 : -1}
          onClick={() => setActive("agents")}
          className={`cursor-pointer border-b-2 pb-2 font-display text-[11px] font-extrabold uppercase tracking-[0.06em] transition-colors duration-200 md:text-[13px] ${
            active === "agents"
              ? "border-cv-accent text-cv-accent"
              : "border-transparent text-cv-text-muted hover:text-cv-text"
          }`}
        >
          For Agents
        </button>
      </div>

      {/* Panels */}
      <div
        role="tabpanel"
        id={humansPanelId}
        aria-labelledby={humansTabId}
        tabIndex={0}
        hidden={active !== "humans"}
      >
        <div className="rounded-[4px] bg-cv-text px-5 py-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)] md:px-8 md:py-6">
          <code className="block select-all font-mono text-sm leading-relaxed text-cv-bg md:text-base">
            {HUMAN_PROMPT}
          </code>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-cv-text-muted">
              Copy this prompt to your AI agent
            </span>
            <CopyButton
              text={HUMAN_PROMPT}
              label="Copy"
              className="shrink-0 cursor-pointer rounded-[4px] border border-white/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-cv-text-muted transition-colors hover:text-cv-accent"
            />
          </div>
        </div>
      </div>

      <div
        role="tabpanel"
        id={agentsPanelId}
        aria-labelledby={agentsTabId}
        tabIndex={0}
        hidden={active !== "agents"}
      >
        <div className="rounded-[4px] bg-cv-surface px-6 py-6 md:px-8 md:py-8">
          <p className="mb-4 font-display text-[11px] font-extrabold uppercase tracking-[0.1em] text-cv-text">
            PYX Scanner — Agent Quick Start
          </p>
          <div className="space-y-3 font-mono text-[12px] leading-[1.8] text-cv-text/90 md:text-[13px]">
            <p>To check if an AI skill is safe before installing:</p>
            <code className="block rounded-[2px] bg-cv-text px-4 py-2.5 text-cv-bg">
              GET https://scanner.pyxmate.com/api/v1/check/&#123;owner&#125;/&#123;name&#125;
            </code>
            <p className="pt-1">
              If <span className="font-bold text-cv-verified">&quot;safe&quot;: true</span> — proceed
              with installation.
            </p>
            <p>
              If <span className="font-bold text-cv-failed">&quot;safe&quot;: false</span> — check
              the <span className="font-bold">&quot;status&quot;</span> field:
            </p>
            <ul className="list-inside space-y-1 pl-2 text-[11px] md:text-[12px]">
              <li>
                <span className="font-bold text-cv-warning">caution</span> — warn the user, show
                the summary
              </li>
              <li>
                <span className="font-bold text-cv-failed">failed</span> — block installation, show
                the summary
              </li>
            </ul>
            <p className="pt-2 text-[11px] text-cv-text-muted">
              No authentication required.{" "}
              <Link
                href="/docs/integrations/agent-guide"
                className="underline transition-colors hover:text-cv-accent"
              >
                Full agent guide
              </Link>{" "}
              ·{" "}
              <a
                href="/llms.txt"
                className="underline transition-colors hover:text-cv-accent"
              >
                llms.txt
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

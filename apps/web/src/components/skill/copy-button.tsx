"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (insecure context, permissions denied)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={
        className ??
        "text-[10px] font-medium uppercase tracking-[0.06em] text-cv-text-muted transition-colors hover:text-cv-text cursor-pointer"
      }
    >
      {copied ? "Copied" : label}
    </button>
  );
}

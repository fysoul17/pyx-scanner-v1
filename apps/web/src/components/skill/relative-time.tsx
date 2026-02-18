"use client";

import { useMemo } from "react";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

function getRelative(date: Date): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);

  for (const [unit, sec] of UNITS) {
    if (Math.abs(diffSec) >= sec || unit === "second") {
      return rtf.format(Math.round(diffSec / sec), unit);
    }
  }
  return "just now";
}

export function RelativeTime({
  date,
  className,
}: {
  date: string;
  className?: string;
}) {
  const text = useMemo(() => getRelative(new Date(date)), [date]);

  return (
    <time dateTime={date} className={className} title={new Date(date).toLocaleString()} suppressHydrationWarning>
      {text}
    </time>
  );
}

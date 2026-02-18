import { getAdminClient } from "@lib/supabase";
import type { TrustStatus } from "@shared/types";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STATUS_COLORS: Record<TrustStatus, string> = {
  verified: "#22c55e",
  caution: "#f59e0b",
  failed: "#ef4444",
  unscanned: "#6b7280",
};

const STATUS_LABELS: Record<TrustStatus, string> = {
  verified: "verified",
  caution: "caution",
  failed: "high risk",
  unscanned: "unscanned",
};

function makeBadgeSvg(rawLabel: string, status: TrustStatus): string {
  const color = STATUS_COLORS[status];
  const statusText = STATUS_LABELS[status];
  const label = escapeXml(rawLabel);
  const labelWidth = rawLabel.length * 6.5 + 12;
  const statusWidth = statusText.length * 6.5 + 12;
  const totalWidth = labelWidth + statusWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${statusText}">
  <title>${label}: ${statusText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${statusWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + statusWidth / 2}" y="14">${statusText}</text>
  </g>
</svg>`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const { owner: rawOwner, name: rawName } = await params;
  const owner = decodeURIComponent(rawOwner);
  const name = decodeURIComponent(rawName);

  if (!owner || !name) {
    return new Response("Missing owner or name", { status: 400 });
  }

  try {
    const { data: skill } = await getAdminClient()
      .from("skills")
      .select("status")
      .eq("owner", owner)
      .eq("name", name)
      .maybeSingle();

    const status: TrustStatus = skill?.status ?? "unscanned";
    const label = `${owner}/${name}`;
    const svg = makeBadgeSvg(label, status);

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    const svg = makeBadgeSvg(`${owner}/${name}`, "unscanned");
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=60",
      },
    });
  }
}

import { getBrowserClient } from "@lib/supabase";
import { toTrustScore } from "@lib/queries/landing";
import type { TrustStatus } from "@shared/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://scanner.pyxmate.com";

const STATUS_COLORS: Record<TrustStatus, { bg: string; text: string }> = {
  verified: { bg: "#dcfce7", text: "#166534" },
  caution: { bg: "#fef3c7", text: "#92400e" },
  failed: { bg: "#fee2e2", text: "#991b1b" },
  unscanned: { bg: "#f3f4f6", text: "#374151" },
};

const STATUS_LABELS: Record<TrustStatus, string> = {
  verified: "Verified",
  caution: "Caution",
  failed: "High Risk",
  unscanned: "Unscanned",
};

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

  let status: TrustStatus = "unscanned";
  let riskScore: number | null = null;

  try {
    const { data: skill } = await getBrowserClient()
      .from("skills")
      .select(
        "status, scan_results(risk_score, scanned_at)"
      )
      .eq("owner", owner)
      .eq("name", name)
      .order("scanned_at", {
        ascending: false,
        referencedTable: "scan_results",
      })
      .maybeSingle();

    if (skill) {
      status = skill.status as TrustStatus;
      const scans = skill.scan_results as
        | Array<{ risk_score: number }>
        | undefined;
      riskScore = scans?.[0]?.risk_score ?? null;
    }
  } catch {
    // Fallback to unscanned
  }

  const colors = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];
  const trustScore = toTrustScore(riskScore);
  const detailUrl = `${BASE_URL}/s/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;

  // Escape for HTML
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: transparent;
    }
    .card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s;
      max-width: 320px;
    }
    .card:hover { border-color: #ff4d00; }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: ${colors.bg};
      color: ${colors.text};
      white-space: nowrap;
    }
    .info { flex: 1; min-width: 0; }
    .name {
      font-size: 13px;
      font-weight: 600;
      color: #1a1612;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      font-size: 11px;
      color: #8a8078;
      margin-top: 2px;
    }
    .logo {
      font-size: 11px;
      font-weight: 700;
      color: #ff4d00;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <a class="card" href="${esc(detailUrl)}" target="_blank" rel="noopener">
    <div class="info">
      <div class="name">${esc(owner)}/${esc(name)}</div>
      <div class="meta">
        <span class="badge">${esc(label)}</span>
        ${trustScore !== null ? `<span style="margin-left:6px;">Trust: ${trustScore}/100</span>` : ""}
      </div>
    </div>
    <div class="logo">PYX</div>
  </a>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Content-Security-Policy": "frame-ancestors *",
    },
  });
}

import { ImageResponse } from "next/og";
import { getBrowserClient } from "@lib/supabase";

export const alt = "PYX Scanner — Skill Trust Score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const statusColors: Record<string, string> = {
  verified: "#16a34a",
  caution: "#ca8a04",
  failed: "#dc2626",
  unscanned: "#8a8078",
};

const statusLabels: Record<string, string> = {
  verified: "Verified",
  caution: "Caution",
  failed: "High Risk",
  unscanned: "Unscanned",
};

export default async function Image({
  params,
}: {
  params: Promise<{ owner: string; name: string }>;
}) {
  const { owner: rawOwner, name: rawName } = await params;
  const owner = decodeURIComponent(rawOwner);
  const name = decodeURIComponent(rawName);

  let status = "unscanned";
  let score: number | null = null;
  let recommendation = "unknown";

  try {
    const supabase = getBrowserClient();

    const { data: skill } = await supabase
      .from("skills")
      .select("id, status")
      .eq("owner", owner)
      .eq("name", name)
      .single();

    if (skill) {
      status = skill.status;

      const { data: scan } = await supabase
        .from("scan_results")
        .select("risk_score, recommendation")
        .eq("skill_id", skill.id)
        .order("scanned_at", { ascending: false })
        .limit(1)
        .single();

      if (scan) {
        score = Math.round((10 - scan.risk_score) * 10);
        recommendation = scan.recommendation;
      }
    }
  } catch {
    // Fallback to defaults
  }

  const statusColor = statusColors[status] || "#8a8078";
  const scoreDisplay = score != null ? `${score}` : "—";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#f5f0ea",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: statusColor,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: 400,
              color: "#8a8078",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            PYX Scanner
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: 900,
              color: "#1a1612",
              letterSpacing: "-0.02em",
            }}
          >
            {owner}/{name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: statusColor,
              }}
            />
            <span
              style={{
                fontSize: "24px",
                fontWeight: 300,
                color: statusColor,
              }}
            >
              {statusLabels[status] || status}
            </span>
          </div>
          <div
            style={{
              fontSize: "96px",
              fontWeight: 100,
              color: statusColor,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {scoreDisplay}
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 300,
              color: "#8a8078",
            }}
          >
            Trust Score · {recommendation !== "unknown" ? recommendation.charAt(0).toUpperCase() + recommendation.slice(1) : "Not Scanned"}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

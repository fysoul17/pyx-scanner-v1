import { ImageResponse } from "next/og";

export const alt = "PYX Scanner — The Trust Layer for AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
            background: "#ff4d00",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              fontSize: "24px",
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
              fontSize: "56px",
              fontWeight: 900,
              color: "#1a1612",
              letterSpacing: "-0.02em",
              textAlign: "center",
              maxWidth: "900px",
            }}
          >
            The Trust Layer for AI
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 300,
              color: "#8a8078",
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: "1.5",
            }}
          >
            AI skill security scanning — 7 threat categories, prompt injection detection, commit-hash badges
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            gap: "32px",
            fontSize: "14px",
            color: "#8a8078",
          }}
        >
          <span>scanner.pyxmate.com</span>
        </div>
      </div>
    ),
    { ...size }
  );
}

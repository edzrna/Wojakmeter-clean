import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

export default function handler(req) {
  const url = new URL(req.url);

  const mood = url.searchParams.get("mood") || "Neutral";
  const score = Number(url.searchParams.get("score") || 50);

  const colorMap = {
    Neutral: "#cfd7e3",
    Doubt: "#ff9da6",
    Concern: "#ff6c79",
    Frustration: "#ff3b4d",
    Optimism: "#a6ffc4",
    Content: "#7cffaa",
    Euphoria: "#4dff88",
  };

  const accent = colorMap[mood] || "#cfd7e3";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "#071018",
          color: "white",
          fontFamily: "Arial",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            borderRadius: "28px",
            background: "#0f1c2b",
            padding: "60px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, color: "#9eacbf", marginBottom: 10 }}>
              WOJAKMETER
            </div>

            <div style={{ fontSize: 36, color: "#cfd7e3", marginBottom: 20 }}>
              Crypto Market Mood
            </div>

            <div
              style={{
                fontSize: 90,
                fontWeight: 900,
                color: accent,
              }}
            >
              {mood}
            </div>

            <div style={{ fontSize: 34, marginTop: 20 }}>
              Score {score}/100
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 140,
              fontWeight: 900,
              color: accent,
            }}
          >
            {score}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
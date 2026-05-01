import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

function moodColor(mood) {
  const map = {
    frustration: "#ff3b4d",
    concern: "#ff6c79",
    doubt: "#ff9da6",
    neutral: "#cfd7e3",
    optimism: "#a6ffc4",
    content: "#7cffaa",
    euphoria: "#4dff88",
  };
  return map[String(mood || "").toLowerCase()] || "#cfd7e3";
}

function safeText(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export default function handler(req) {
  try {
    const url = new URL(req.url);

    const mood = safeText(url.searchParams.get("mood"), "Neutral");
    const score = Math.max(0, Math.min(100, Math.round(Number(url.searchParams.get("score") || 50))));
    const tf = safeText(url.searchParams.get("tf"), "24h");
    const change = Number(url.searchParams.get("change") || 0);
    const driver = safeText(url.searchParams.get("driver"), "Market flow / price action");

    const accent = moodColor(mood);
    const formattedChange = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            background: "linear-gradient(180deg,#071018,#0b1622)",
            color: "white",
            fontFamily: "Arial",
            padding: "50px",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              borderRadius: "34px",
              border: "1px solid rgba(255,255,255,.12)",
              background: "#101c2b",
              padding: "55px",
            }}
          >
            <div
              style={{
                width: "58%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div style={{ display: "flex", fontSize: "22px", letterSpacing: ".18em", color: "#9eacbf", marginBottom: "22px" }}>
                WOJAKMETER
              </div>

              <div style={{ display: "flex", fontSize: "34px", color: "#cfd7e3", marginBottom: "14px" }}>
                Crypto Market Mood
              </div>

              <div style={{ display: "flex", fontSize: "92px", fontWeight: 900, color: accent, lineHeight: 1, marginBottom: "24px" }}>
                {mood}
              </div>

              <div style={{ display: "flex", fontSize: "40px", fontWeight: 700, marginBottom: "26px" }}>
                Score {score}/100 · {tf}
              </div>

              <div style={{ display: "flex", fontSize: "28px", color: "#cfd7e3", marginBottom: "12px" }}>
                Move: {formattedChange}
              </div>

              <div style={{ display: "flex", fontSize: "25px", color: "#9eacbf", lineHeight: 1.25 }}>
                Driver: {driver}
              </div>

              <div style={{ display: "flex", fontSize: "22px", color: "#9eacbf", marginTop: "34px" }}>
                wojakmeter.com
              </div>
            </div>

            <div
              style={{
                width: "42%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "340px",
                  height: "340px",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${accent}55, transparent 70%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "120px",
                  fontWeight: 900,
                  color: accent,
                }}
              >
                {score}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    return new Response("OG ERROR: " + e.message, { status: 500 });
  }
}
import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

function safeText(value, fallback = "--") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeScore(value) {
  const num = Number(value || 50);
  if (!Number.isFinite(num)) return 50;
  return Math.max(0, Math.min(100, Math.round(num)));
}

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

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const mood = safeText(url.searchParams.get("mood"), "Neutral");
    const score = safeScore(url.searchParams.get("score"));
    const tf = safeText(url.searchParams.get("tf"), "24h");
    const change = safeText(url.searchParams.get("change"), "0");
    const volume = safeText(url.searchParams.get("volume"), "--");
    const driver = safeText(
      url.searchParams.get("driver"),
      "Market flow / price action"
    );
    const risk = safeText(url.searchParams.get("risk"), "Balanced");

    const accent = moodColor(mood);

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            background: "linear-gradient(180deg, #071018, #0b1622)",
            color: "white",
            fontFamily: "Arial",
            padding: "48px",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "32px",
              background: "#101c2b",
              padding: "48px",
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
              <div
                style={{
                  fontSize: "22px",
                  letterSpacing: "0.18em",
                  color: "#9eacbf",
                  marginBottom: "20px",
                }}
              >
                WOJAKMETER
              </div>

              <div
                style={{
                  fontSize: "34px",
                  color: "#cfd7e3",
                  marginBottom: "16px",
                }}
              >
                Crypto Market Mood
              </div>

              <div
                style={{
                  fontSize: "92px",
                  fontWeight: 800,
                  color: accent,
                  lineHeight: 1,
                  marginBottom: "24px",
                }}
              >
                {mood}
              </div>

              <div
                style={{
                  fontSize: "42px",
                  fontWeight: 700,
                  marginBottom: "32px",
                }}
              >
                Score {score}/100
              </div>

              <div style={{ fontSize: "26px", color: "#cfd7e3" }}>
                Timeframe: {tf}
              </div>

              <div style={{ fontSize: "26px", color: "#cfd7e3" }}>
                Move: {change}%
              </div>

              <div style={{ fontSize: "26px", color: "#cfd7e3" }}>
                Volume: {volume}
              </div>

              <div style={{ fontSize: "26px", color: "#cfd7e3" }}>
                Driver: {driver}
              </div>

              <div style={{ fontSize: "26px", color: accent }}>
                Risk: {risk}
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
                  width: "330px",
                  height: "330px",
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
  } catch (error) {
    return new Response(error?.message || "OG error", {
      status: 500,
    });
  }
}
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

function normalize(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export default function handler(req) {
  try {
    const url = new URL(req.url);

    const mood = normalize(url.searchParams.get("mood"), "Neutral");
    const score = Math.max(
      0,
      Math.min(100, Number(url.searchParams.get("score") || 50))
    );
    const tf = normalize(url.searchParams.get("tf"), "24h");
    const change = Number(url.searchParams.get("change") || 0);
    const driver = normalize(
      url.searchParams.get("driver"),
      "Market flow"
    );

    const accent = moodColor(mood);

    const formattedChange = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

    const protocol =
      req.headers.get("x-forwarded-proto") ||
      (url.hostname.includes("localhost") ? "http" : "https");

    const host = req.headers.get("host") || url.host;
    const origin = `${protocol}://${host}`;

    const hero = `${origin}/assets/hero/classic/${mood.toLowerCase()}.png`;

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            position: "relative",
            background:
              "radial-gradient(circle at 20% 20%, rgba(77,255,136,0.15), transparent 25%), radial-gradient(circle at 80% 30%, rgba(255,80,80,0.12), transparent 25%), linear-gradient(180deg, #071018, #0b1622)",
            color: "white",
            fontFamily: "Arial",
          }}
        >
          {/* LEFT */}
          <div
            style={{
              width: "55%",
              padding: "60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                letterSpacing: "0.2em",
                color: "#9eacbf",
                marginBottom: "20px",
              }}
            >
              WOJAKMETER
            </div>

            <div
              style={{
                fontSize: "82px",
                fontWeight: 900,
                color: accent,
                lineHeight: 1,
                marginBottom: "16px",
              }}
            >
              {mood}
            </div>

            <div
              style={{
                fontSize: "28px",
                color: "#cfd7e3",
                marginBottom: "26px",
              }}
            >
              Score {score}/100 · {tf}
            </div>

            <div
              style={{
                fontSize: "26px",
                color: "#ffffff",
                marginBottom: "14px",
              }}
            >
              Move: {formattedChange}
            </div>

            <div
              style={{
                fontSize: "22px",
                color: "#9eacbf",
              }}
            >
              {driver}
            </div>
          </div>

          {/* RIGHT */}
          <div
            style={{
              width: "45%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Glow */}
            <div
              style={{
                position: "absolute",
                width: "420px",
                height: "420px",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${accent}55, transparent 70%)`,
              }}
            />

            <img
              src={hero}
              width="420"
              height="420"
              style={{
                objectFit: "contain",
              }}
            />
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
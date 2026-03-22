import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge"
};

function moodColor(mood) {
  const map = {
    frustration: "#ff3b4d",
    concern: "#ff6c79",
    doubt: "#ff9da6",
    neutral: "#ffffff",
    optimism: "#a6ffc4",
    content: "#7cffaa",
    euphoria: "#4dff88"
  };
  return map[mood] || "#ffffff";
}

export default function handler(req) {
  try {
    const { searchParams } = new URL(req.url);

    const mood = String(searchParams.get("mood") || "neutral").toLowerCase();
    const score = searchParams.get("score") || "50";
    const coin = searchParams.get("coin") || "BTC";
    const tf = searchParams.get("tf") || "1h";
    const accent = moodColor(mood);

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            background: "linear-gradient(180deg, #071018 0%, #0b1622 100%)",
            color: "#f5f7fb",
            fontFamily: "Arial, sans-serif",
            padding: "40px",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "55%"
            }}
          >
            <div
              style={{
                fontSize: 18,
                letterSpacing: "0.18em",
                color: "#9eacbf",
                marginBottom: 18
              }}
            >
              WOJAKMETER
            </div>

            <div
              style={{
                fontSize: 76,
                fontWeight: 800,
                color: accent,
                marginBottom: 12,
                textTransform: "capitalize"
              }}
            >
              {mood}
            </div>

            <div
              style={{
                fontSize: 30,
                color: "#ffffff",
                marginBottom: 24
              }}
            >
              {coin} · Score {score}/100 · {tf}
            </div>

            <div
              style={{
                fontSize: 22,
                color: "#9eacbf"
              }}
            >
              wojakmeter.com
            </div>
          </div>

          <div
            style={{
              width: "320px",
              height: "320px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 160,
              background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
              border: "1px solid rgba(255,255,255,.10)"
            }}
          >
            📈
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
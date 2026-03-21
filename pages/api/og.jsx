import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge"
};

function moodColor(mood) {
  const map = {
    Frustration: "#ff3b4d",
    Concern: "#ff6c79",
    Doubt: "#ff9da6",
    Neutral: "#ffffff",
    Optimism: "#a6ffc4",
    Content: "#7cffaa",
    Euphoria: "#4dff88"
  };
  return map[mood] || "#ffffff";
}

function styleLabel(style) {
  if (style === "3d") return "3D";
  if (style === "anime") return "Anime";
  if (style === "minimal") return "Minimal";
  return "Classic";
}

export default function handler(req) {
  const { searchParams } = new URL(req.url);

  const mood = searchParams.get("mood") || "Neutral";
  const score = searchParams.get("score") || "50";
  const tf = searchParams.get("tf") || "1h";
  const change = Number(searchParams.get("change") || "0");
  const volume = searchParams.get("volume") || "--";
  const driver = searchParams.get("driver") || "Market flow / price action";
  const coin = searchParams.get("coin") || "BTC";
  const style = searchParams.get("style") || "classic";

  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;
  const heroSrc = `${baseUrl}/assets/hero/${style}/${String(mood).toLowerCase()}.png`;
  const accent = moodColor(mood);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at top center, rgba(102,184,255,.10), transparent 24%), radial-gradient(circle at 20% 20%, rgba(77,255,136,.06), transparent 18%), linear-gradient(180deg, #071018 0%, #0b1622 100%)",
          color: "#f5f7fb",
          fontFamily: "Arial"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 24,
            borderRadius: 30,
            border: "1px solid rgba(255,255,255,.10)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01)), linear-gradient(180deg, #132235 0%, #101c2b 100%)",
            display: "flex",
            padding: 34
          }}
        >
          <div
            style={{
              width: "42%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              paddingRight: 24
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column"
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
                  fontSize: 70,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: accent,
                  marginBottom: 12
                }}
              >
                {mood}
              </div>

              <div
                style={{
                  fontSize: 28,
                  color: "#ffffff",
                  marginBottom: 26
                }}
              >
                {coin} · Score {score}/100
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12
                }}
              >
                <div style={pillStyle}>
                  <span style={pillLabel}>Timeframe</span>
                  <span style={pillValue}>{tf}</span>
                </div>
                <div style={pillStyle}>
                  <span style={pillLabel}>Move</span>
                  <span style={pillValue}>
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(2)}%
                  </span>
                </div>
                <div style={pillStyle}>
                  <span style={pillLabel}>Volume</span>
                  <span style={pillValue}>{volume}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  color: "#9eacbf"
                }}
              >
                Driver
              </div>
              <div
                style={{
                  fontSize: 26,
                  color: "#ffffff",
                  lineHeight: 1.2
                }}
              >
                {driver}
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontSize: 18,
                  color: "#9eacbf"
                }}
              >
                Style: {styleLabel(style)} · wojakmeter.com
              </div>
            </div>
          </div>

          <div
            style={{
              width: "58%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative"
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 440,
                height: 440,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`
              }}
            />
            <img
              src={heroSrc}
              alt={`${mood} hero`}
              width="430"
              height="430"
              style={{
                objectFit: "contain"
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  );
}

const pillStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,.08)",
  background: "#101c2b"
};

const pillLabel = {
  fontSize: 12,
  color: "#9eacbf"
};

const pillValue = {
  fontSize: 22,
  color: "#ffffff"
};
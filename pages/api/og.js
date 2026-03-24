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

function normalizeMood(value) {
  const raw = String(value || "Neutral").trim().toLowerCase();

  const map = {
    frustration: "Frustration",
    concern: "Concern",
    doubt: "Doubt",
    neutral: "Neutral",
    optimism: "Optimism",
    content: "Content",
    euphoria: "Euphoria"
  };

  return map[raw] || "Neutral";
}

function normalizeStyle(value) {
  const raw = String(value || "classic").trim().toLowerCase();
  const allowed = ["classic", "3d", "anime", "minimal"];
  return allowed.includes(raw) ? raw : "classic";
}

export default async function handler(req) {
  try {
    const { searchParams, origin } = new URL(req.url);

    const mood = normalizeMood(searchParams.get("mood"));
    const score = searchParams.get("score") || "50";
    const tf = searchParams.get("tf") || "1h";
    const coin = searchParams.get("coin") || "BTC";
    const volume = searchParams.get("volume") || "--";
    const driver = searchParams.get("driver") || "Market flow / price action";
    const style = normalizeStyle(searchParams.get("style"));

    const rawChange = Number(searchParams.get("change") || "0");
    const change = Number.isFinite(rawChange) ? rawChange : 0;

    const accent = moodColor(mood);
    const heroSrc = `${origin}/assets/hero/${style}/${mood.toLowerCase()}.png`;

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
            fontFamily: "Arial, sans-serif"
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "24px",
              borderRadius: "30px",
              border: "1px solid rgba(255,255,255,.10)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01)), linear-gradient(180deg, #132235 0%, #101c2b 100%)",
              display: "flex",
              padding: "34px"
            }}
          >
            <div
              style={{
                width: "42%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                paddingRight: "24px"
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
                    display: "flex",
                    fontSize: "18px",
                    letterSpacing: "0.18em",
                    color: "#9eacbf",
                    marginBottom: "18px"
                  }}
                >
                  WOJAKMETER
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: "70px",
                    fontWeight: 800,
                    lineHeight: 1,
                    color: accent,
                    marginBottom: "12px"
                  }}
                >
                  {mood}
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: "28px",
                    color: "#ffffff",
                    marginBottom: "26px"
                  }}
                >
                  {coin} · Score {score}/100
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px"
                  }}
                >
                  <div style={pillStyle}>
                    <div style={pillLabel}>Timeframe</div>
                    <div style={pillValue}>{tf}</div>
                  </div>

                  <div style={pillStyle}>
                    <div style={pillLabel}>Move</div>
                    <div style={pillValue}>
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(2)}%
                    </div>
                  </div>

                  <div style={pillStyle}>
                    <div style={pillLabel}>Volume</div>
                    <div style={pillValue}>{volume}</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: "16px",
                    color: "#9eacbf"
                  }}
                >
                  Driver
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: "26px",
                    color: "#ffffff",
                    lineHeight: 1.2
                  }}
                >
                  {driver}
                </div>

                <div
                  style={{
                    display: "flex",
                    marginTop: "14px",
                    fontSize: "18px",
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
                  width: "440px",
                  height: "440px",
                  borderRadius: "50%",
                  display: "flex",
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
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error?.message || "Unknown error"
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

const pillStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "12px 14px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,.08)",
  background: "#101c2b"
};

const pillLabel = {
  display: "flex",
  fontSize: "12px",
  color: "#9eacbf"
};

const pillValue = {
  display: "flex",
  fontSize: "22px",
  color: "#ffffff"
};
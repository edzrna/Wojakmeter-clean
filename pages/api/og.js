import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge"
};

// 🎨 COLOR POR EMOCIÓN
function moodColor(mood) {
  const map = {
    Frustration: "#ff3b4d",
    Concern: "#ff6c79",
    Doubt: "#ff9da6",
    Neutral: "#cfd7e3",
    Optimism: "#a6ffc4",
    Content: "#7cffaa",
    Euphoria: "#4dff88"
  };

  return map[mood] || "#cfd7e3";
}

// 🧠 NORMALIZAR MOOD
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

// 🎨 NORMALIZAR STYLE
function normalizeStyle(value) {
  const raw = String(value || "classic").trim().toLowerCase();
  const allowed = ["classic", "synth", "boyak", "minimal"];
  return allowed.includes(raw) ? raw : "classic";
}

// 🎨 LABEL STYLE
function styleLabel(style) {
  if (style === "synth") return "Synth";
  if (style === "boyak") return "Boyak";
  if (style === "minimal") return "Minimal";
  return "Classic";
}

// 🛡 SAFE VALUES
function safeText(value, fallback = "--") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeChange(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function safeScore(value) {
  const num = Number(value || 50);
  if (!Number.isFinite(num)) return 50;
  return Math.max(0, Math.min(100, Math.round(num)));
}

// 🚀 HANDLER
export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const { searchParams } = url;

    const mood = normalizeMood(searchParams.get("mood"));
    const score = safeScore(searchParams.get("score"));
    const tf = safeText(searchParams.get("tf"), "24h");
    const coin = safeText(searchParams.get("coin"), "MARKET");
    const volume = safeText(searchParams.get("volume"), "--");
    const driver = safeText(
      searchParams.get("driver"),
      "Market flow / price action"
    );
    const risk = safeText(searchParams.get("risk"), "Balanced");
    const style = normalizeStyle(searchParams.get("style"));
    const change = safeChange(searchParams.get("change"));

    const protocol =
      req.headers.get("x-forwarded-proto") ||
      (url.hostname.includes("localhost") ? "http" : "https");

    const host = req.headers.get("host") || url.host;
    const origin = `${protocol}://${host}`;

    const accent = moodColor(mood);

    const heroSrc = `${origin}/assets/hero/${style}/${mood.toLowerCase()}.png`;

    const headline =
      coin === "MARKET" || coin === "GLOBAL"
        ? "Crypto Market Mood"
        : `${coin} Mood`;

    const formattedChange = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

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
            {/* LEFT */}
            <div
              style={{
                width: "44%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                paddingRight: "24px"
              }}
            >
              <div>
                <div
                  style={{
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
                    fontSize: "28px",
                    color: "#cfd7e3",
                    marginBottom: "10px"
                  }}
                >
                  {headline}
                </div>

                <div
                  style={{
                    fontSize: "72px",
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
                    fontSize: "28px",
                    color: "#ffffff",
                    marginBottom: "26px"
                  }}
                >
                  Score {score}/100
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <div style={pillStyle}>
                    <div style={pillLabel}>Timeframe</div>
                    <div style={pillValue}>{tf}</div>
                  </div>

                  <div style={pillStyle}>
                    <div style={pillLabel}>Move</div>
                    <div style={pillValue}>{formattedChange}</div>
                  </div>

                  <div style={pillStyle}>
                    <div style={pillLabel}>Volume</div>
                    <div style={pillValue}>{volume}</div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "16px", color: "#9eacbf" }}>
                  Driver
                </div>

                <div
                  style={{
                    fontSize: "24px",
                    color: "#ffffff",
                    marginBottom: "8px"
                  }}
                >
                  {driver}
                </div>

                <div style={{ fontSize: "16px", color: "#9eacbf" }}>
                  Risk Tone
                </div>

                <div
                  style={{
                    fontSize: "22px",
                    color: accent
                  }}
                >
                  {risk}
                </div>

                <div
                  style={{
                    marginTop: "14px",
                    fontSize: "18px",
                    color: "#9eacbf"
                  }}
                >
                  Style: {styleLabel(style)} · wojakmeter.com
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div
              style={{
                width: "56%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "460px",
                  height: "460px",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`
                }}
              />

              <img
                src={heroSrc}
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
      JSON.stringify({ error: error?.message || "OG Error" }),
      { status: 500 }
    );
  }
}

// UI STYLES
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
  fontSize: "12px",
  color: "#9eacbf"
};

const pillValue = {
  fontSize: "22px",
  color: "#ffffff"
};
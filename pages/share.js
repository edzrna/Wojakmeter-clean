import Head from "next/head";

function safeText(value, fallback = "--") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeScore(value) {
  const num = Number(value || 50);
  if (!Number.isFinite(num)) return 50;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function safeChange(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

export async function getServerSideProps({ query, req }) {
  const {
    mood = "Neutral",
    score = "50",
    tf = "24h",
    change = "0",
    volume = "--",
    driver = "Market flow / price action",
    risk = "Balanced",
    coin = "MARKET",
    style = "classic"
  } = query;

  const protocol =
    req.headers["x-forwarded-proto"] ||
    (req.headers.host?.includes("localhost") ? "http" : "https");

  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  const safePayload = {
    mood: safeText(mood, "Neutral"),
    score: String(safeScore(score)),
    tf: safeText(tf, "24h"),
    change: String(safeChange(change)),
    volume: safeText(volume, "--"),
    driver: safeText(driver, "Market flow / price action"),
    risk: safeText(risk, "Balanced"),
    coin: safeText(coin, "MARKET"),
    style: safeText(style, "classic")
  };

  const params = new URLSearchParams(safePayload);
  const version = safeText(query.v, String(Date.now()));

  const ogUrl = `${baseUrl}/api/og?${params.toString()}&v=${version}`;
  const shareUrl = `${baseUrl}/share?${params.toString()}&v=${version}`;

  return {
    props: {
      ...safePayload,
      ogUrl,
      shareUrl
    }
  };
}

export default function SharePage({
  mood,
  score,
  tf,
  change,
  volume,
  driver,
  risk,
  coin,
  style,
  ogUrl,
  shareUrl
}) {
  const numericScore = safeScore(score);
  const numericChange = safeChange(change);
  const formattedChange = `${numericChange >= 0 ? "+" : ""}${numericChange.toFixed(2)}%`;

  const moodKey = String(mood || "neutral").toLowerCase();
  const styleKey = String(style || "classic").toLowerCase();

  const heroImageUrl = `/assets/hero/${styleKey}/${moodKey}.png`;
  const fallbackHeroImageUrl = `/assets/hero/classic/neutral.png`;
  const logoUrl = "/assets/logo/wojakmeter_logo.png";

  const headline =
    coin === "MARKET" || coin === "GLOBAL"
      ? "Crypto Market Mood"
      : `${coin} Mood`;

  const title =
    coin === "MARKET" || coin === "GLOBAL"
      ? `WojakMeter | Crypto Market Mood: ${mood} (${numericScore}/100)`
      : `WojakMeter | ${coin} Mood: ${mood} (${numericScore}/100)`;

  const description = `Score ${numericScore}/100 · ${tf} · Move ${formattedChange} · Driver: ${driver} · Risk: ${risk}`;
  const imageAlt = `${headline}: ${mood} mood with score ${numericScore}/100 on WojakMeter`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={shareUrl} />

        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogUrl} />
        <meta property="og:image:secure_url" content={ogUrl} />
        <meta property="og:image:type" content="image/svg+xml" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={imageAlt} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:site_name" content="WojakMeter" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogUrl} />
        <meta name="twitter:image:alt" content={imageAlt} />
        <meta name="twitter:site" content="@wojakmeterx" />
        <meta name="twitter:creator" content="@wojakmeterx" />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          padding: "32px 18px",
          fontFamily: "var(--font-body, Inter, Arial, sans-serif)",
          color: "#f5f7fb",
          background: "linear-gradient(180deg, #071018 0%, #0b1622 100%)"
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,.08)",
            background: "#101c2b",
            padding: 28
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18
            }}
          >
            <img
              src={logoUrl}
              alt="WojakMeter Logo"
              style={{
                height: 54,
                width: "auto",
                objectFit: "contain"
              }}
            />
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display, Space Grotesk, sans-serif)",
              fontSize: 42,
              letterSpacing: "-0.03em",
              textAlign: "center",
              margin: "0 0 14px"
            }}
          >
            {mood}
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              marginBottom: 22
            }}
          >
            <img
              src={heroImageUrl}
              alt={`${mood} Wojak`}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackHeroImageUrl;
              }}
              style={{
                width: 68,
                height: 68,
                objectFit: "contain",
                borderRadius: 18,
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)"
              }}
            />

            <p
              style={{
                fontFamily: "var(--font-ui, Rajdhani, sans-serif)",
                color: "#cfd7e3",
                fontWeight: 700,
                margin: 0
              }}
            >
              {headline} · {tf} · {formattedChange}
            </p>
          </div>

          <img
            src={ogUrl}
            alt={imageAlt}
            style={{
              width: "100%",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,.08)",
              display: "block"
            }}
          />
        </div>
      </main>
    </>
  );
}
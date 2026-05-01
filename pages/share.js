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

  // 🔥 CACHE BUSTER
  const version = Date.now();

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
  ogUrl,
  shareUrl
}) {
  const numericScore = safeScore(score);
  const numericChange = safeChange(change);
  const formattedChange = `${numericChange >= 0 ? "+" : ""}${numericChange.toFixed(2)}%`;

  const headline =
    coin === "MARKET" || coin === "GLOBAL"
      ? "Crypto Market Mood"
      : `${coin} Mood`;

  const title =
    coin === "MARKET" || coin === "GLOBAL"
      ? `WojakMeter | Crypto Market Mood: ${mood} (${numericScore}/100)`
      : `WojakMeter | ${coin} Mood: ${mood} (${numericScore}/100)`;

  const description = `Score ${numericScore}/100 · ${tf} · Move ${formattedChange} · Driver: ${driver} · Risk: ${risk}`;

  const imageAlt = `${headline}: ${mood} mood with score ${numericScore}/100`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={shareUrl} />

        {/* OPEN GRAPH */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogUrl} />
        <meta property="og:image:secure_url" content={ogUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={imageAlt} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:site_name" content="WojakMeter" />

        {/* TWITTER */}
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
          fontFamily: "Inter, Arial",
          color: "#f5f7fb",
          background:
            "linear-gradient(180deg, #071018 0%, #0b1622 100%)"
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,.08)",
            background: "#101c2b",
            padding: 28
          }}
        >
          <h1 style={{ fontSize: 42 }}>{mood}</h1>
          <p>{headline} · Score {numericScore}/100</p>

          <img
            src={ogUrl}
            style={{
              width: "100%",
              borderRadius: 20,
              marginTop: 20
            }}
          />
        </div>
      </main>
    </>
  );
}
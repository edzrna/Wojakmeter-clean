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

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Rajdhani:wght@500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />

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

      <main className="wm-share-page">
        <div className="wm-share-shell">
          <div className="wm-share-logo-wrap">
            <img src={logoUrl} alt="WojakMeter Logo" className="wm-share-logo" />
          </div>

          <h1 className="wm-share-title">{mood}</h1>

          <div className="wm-share-meta-row">
            <img
              src={heroImageUrl}
              alt={`${mood} Wojak`}
              className="wm-share-face"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackHeroImageUrl;
              }}
            />

            <p className="wm-share-meta">
              {headline} · {tf} · {formattedChange}
            </p>
          </div>

          <img src={ogUrl} alt={imageAlt} className="wm-share-og" />
        </div>
      </main>

      <style jsx>{`
        .wm-share-page {
          min-height: 100vh;
          padding: 32px 18px;
          font-family: "Inter", Arial, sans-serif;
          color: #f5f7fb;
          background: linear-gradient(180deg, #071018 0%, #0b1622 100%);
        }

        .wm-share-shell {
          width: min(980px, 100%);
          margin: 0 auto;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01)),
            #101c2b;
          padding: 28px;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
        }

        .wm-share-logo-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .wm-share-logo {
          height: 54px;
          width: auto;
          object-fit: contain;
        }

        .wm-share-title {
          font-family: "Space Grotesk", Arial, sans-serif;
          font-size: clamp(2.2rem, 6vw, 3.4rem);
          line-height: 1;
          letter-spacing: -0.04em;
          text-align: center;
          margin: 0 0 14px;
        }

        .wm-share-meta-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-bottom: 22px;
        }

        .wm-share-face {
          width: 76px;
          height: 76px;
          object-fit: contain;
          filter: drop-shadow(0 0 18px rgba(77, 255, 136, 0.18));
        }

        .wm-share-meta {
          font-family: "Rajdhani", Arial, sans-serif;
          color: #cfd7e3;
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          margin: 0;
        }

        .wm-share-og {
          width: 100%;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: block;
        }

        @media (max-width: 700px) {
          .wm-share-page {
            padding: 18px 12px;
          }

          .wm-share-shell {
            padding: 18px;
            border-radius: 20px;
          }

          .wm-share-logo {
            height: 42px;
          }

          .wm-share-meta-row {
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
            text-align: center;
          }

          .wm-share-face {
            width: 88px;
            height: 88px;
          }

          .wm-share-meta {
            font-size: 1rem;
            line-height: 1.25;
          }

          .wm-share-og {
            border-radius: 14px;
          }
        }
      `}</style>
    </>
  );
}
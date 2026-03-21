import Head from "next/head";

export async function getServerSideProps({ query, req }) {
  const {
    mood = "Neutral",
    score = "50",
    tf = "1h",
    change = "0",
    volume = "--",
    driver = "Market flow / price action",
    coin = "BTC",
    style = "classic"
  } = query;

  const protocol =
    req.headers["x-forwarded-proto"] ||
    (req.headers.host?.includes("localhost") ? "http" : "https");

  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  const params = new URLSearchParams({
    mood: String(mood),
    score: String(score),
    tf: String(tf),
    change: String(change),
    volume: String(volume),
    driver: String(driver),
    coin: String(coin),
    style: String(style)
  });

  const ogUrl = `${baseUrl}/api/og?${params.toString()}`;

  return {
    props: {
      mood: String(mood),
      score: String(score),
      tf: String(tf),
      change: String(change),
      volume: String(volume),
      driver: String(driver),
      coin: String(coin),
      style: String(style),
      baseUrl,
      ogUrl
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
  coin,
  ogUrl,
  baseUrl
}) {
  const numericChange = Number(change || 0);
  const formattedChange = `${numericChange >= 0 ? "+" : ""}${numericChange.toFixed(2)}%`;

  const title = `WojakMeter | ${coin} Mood: ${mood}`;
  const description = `Score ${score}/100 · ${tf} · Move ${formattedChange} · Driver: ${driver}`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />

        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${baseUrl}/share`} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogUrl} />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          margin: 0,
          padding: "32px 18px",
          fontFamily: "Inter, Arial, sans-serif",
          color: "#f5f7fb",
          background:
            "radial-gradient(circle at top center, rgba(102,184,255,.08), transparent 24%), radial-gradient(circle at 20% 20%, rgba(77,255,136,.05), transparent 18%), linear-gradient(180deg, #071018 0%, #0b1622 100%)"
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01)), linear-gradient(180deg, #132235 0%, #101c2b 100%)",
            boxShadow: "0 16px 40px rgba(0,0,0,.35)",
            overflow: "hidden"
          }}
        >
          <div style={{ padding: 28 }}>
            <div
              style={{
                fontSize: 14,
                letterSpacing: ".12em",
                color: "#9eacbf",
                marginBottom: 10
              }}
            >
              WOJAKMETER SHARE CARD
            </div>

            <div
              style={{
                fontSize: 42,
                fontWeight: 800,
                marginBottom: 8
              }}
            >
              {mood}
            </div>

            <div
              style={{
                fontSize: 18,
                color: "#cfd7e3",
                marginBottom: 22
              }}
            >
              {coin} · {tf} · Score {score}/100
            </div>

            <img
              src={ogUrl}
              alt={`${coin} ${mood} share card`}
              style={{
                width: "100%",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,.08)",
                display: "block"
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginTop: 18
              }}
            >
              <div style={boxStyle}>
                <span style={labelStyle}>Mood</span>
                <strong style={valueStyle}>{mood}</strong>
              </div>
              <div style={boxStyle}>
                <span style={labelStyle}>Score</span>
                <strong style={valueStyle}>{score}/100</strong>
              </div>
              <div style={boxStyle}>
                <span style={labelStyle}>Timeframe</span>
                <strong style={valueStyle}>{tf}</strong>
              </div>
              <div style={boxStyle}>
                <span style={labelStyle}>Move</span>
                <strong style={valueStyle}>{formattedChange}</strong>
              </div>
              <div style={boxStyle}>
                <span style={labelStyle}>Volume</span>
                <strong style={valueStyle}>{volume}</strong>
              </div>
              <div style={boxStyle}>
                <span style={labelStyle}>Driver</span>
                <strong style={valueStyle}>{driver}</strong>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

const boxStyle = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,.08)",
  background: "#101c2b",
  display: "flex",
  flexDirection: "column",
  gap: 6
};

const labelStyle = {
  color: "#9eacbf",
  fontSize: 12
};

const valueStyle = {
  color: "#ffffff",
  fontSize: 15
};
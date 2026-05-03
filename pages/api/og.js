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

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function handler(req, res) {
  const { query } = req;

  const protocol =
    req.headers["x-forwarded-proto"] ||
    (req.headers.host?.includes("localhost") ? "http" : "https");

  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  const mood = normalizeMood(query.mood);
  const moodKey = mood.toLowerCase();

  const score = safeScore(query.score);
  const tf = safeText(query.tf, "24h");
  const change = safeChange(query.change);
  const volume = safeText(query.volume, "--");
  const driver = safeText(query.driver, "Market flow / price action");
  const risk = safeText(query.risk, "Balanced");
  const coin = safeText(query.coin, "MARKET");
  const style = safeText(query.style, "classic").toLowerCase();

  const accent = moodColor(mood);
  const formattedChange = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

  const logoUrl = `${baseUrl}/assets/logo/wojakmeter_logo.png`;
  const heroImageUrl = `${baseUrl}/assets/hero/${style}/${moodKey}.png`;

  const headline =
    coin === "MARKET" || coin === "GLOBAL"
      ? "Crypto Market Mood"
      : `${coin} Mood`;

  const subtitle =
    mood === "Euphoria"
      ? "Crowd confidence is reaching dangerous levels."
      : mood === "Content"
      ? "Strength is spreading across market sentiment."
      : mood === "Optimism"
      ? "Momentum is building, but confirmation still matters."
      : mood === "Neutral"
      ? "Market is calm, but pressure is building."
      : mood === "Doubt"
      ? "Conviction is fragile across the market."
      : mood === "Concern"
      ? "Fear is spreading faster than confidence."
      : "Traders are exhausted and emotion is breaking down.";

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=0, must-revalidate");

  res.status(200).send(`
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#071018"/>
      <stop offset="100%" stop-color="#0b1622"/>
    </linearGradient>

    <radialGradient id="glow" cx="76%" cy="48%" r="46%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.45"/>
      <stop offset="62%" stop-color="${accent}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>

    <filter id="heroShadow">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="${accent}" flood-opacity="0.22"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <rect x="44" y="44" width="1112" height="542" rx="34" fill="#101c2b" stroke="rgba(255,255,255,0.12)"/>

  <image
    href="${escapeXml(logoUrl)}"
    x="80"
    y="66"
    width="275"
    height="70"
    preserveAspectRatio="xMinYMid meet"
  />

  <text x="84" y="178" fill="#cfd7e3" font-family="Rajdhani, Arial, Helvetica, sans-serif" font-size="34" font-weight="700">
    ${escapeXml(headline)}
  </text>

  <text x="84" y="278" fill="${accent}" font-family="Space Grotesk, Arial, Helvetica, sans-serif" font-size="92" font-weight="800">
    ${escapeXml(mood)}
  </text>

  <text x="84" y="336" fill="#ffffff" font-family="Rajdhani, Arial, Helvetica, sans-serif" font-size="38" font-weight="700">
    Score ${score}/100 · ${escapeXml(tf)}
  </text>

  <text x="84" y="394" fill="#cfd7e3" font-family="Inter, Arial, Helvetica, sans-serif" font-size="28">
    ${escapeXml(subtitle)}
  </text>

  <rect x="84" y="442" width="210" height="78" rx="18" fill="#0b1622" stroke="rgba(255,255,255,0.1)"/>
  <text x="106" y="472" fill="#9eacbf" font-family="Rajdhani, Arial, Helvetica, sans-serif" font-size="17" font-weight="700">Move</text>
  <text x="106" y="504" fill="#ffffff" font-family="Rajdhani, Arial, Helvetica, sans-serif" font-size="28" font-weight="700">${escapeXml(formattedChange)}</text>

  <rect x="314" y="442" width="220" height="78" rx="18" fill="#0b1622" stroke="rgba(255,255,255,0.1)"/>
  <text x="336" y="472" fill="#9eacbf" font-family="Rajdhani, Arial, Helvetica, sans-serif" font-size="17" font-weight="700">Volume</text>
  <text x="336" y="504" fill="#ffffff" font-family="Rajdhani, Arial, Helvetica, sans-serif" font-size="28" font-weight="700">${escapeXml(volume)}</text>

  <rect x="554" y="442" width="300" height="78" rx="18" fill="#0b1622" stroke="rgba(255,255,255,0.1)"/>
  <text x="576" y="472" fill="#9eacbf" font-family="Rajdhani, Arial, Helvetica, sans-serif" font-size="17" font-weight="700">Risk Tone</text>
  <text x="576" y="504" fill="${accent}" font-family="Rajdhani, Arial, Helvetica, sans-serif" font-size="28" font-weight="700">${escapeXml(risk)}</text>

  <text x="84" y="555" fill="#9eacbf" font-family="Inter, Arial, Helvetica, sans-serif" font-size="22">
    Driver: ${escapeXml(driver)}
  </text>

  <ellipse cx="945" cy="330" rx="210" ry="185" fill="${accent}" opacity="0.13"/>

  <image
    href="${escapeXml(heroImageUrl)}"
    x="710"
    y="70"
    width="470"
    height="470"
    preserveAspectRatio="xMidYMid meet"
    filter="url(#heroShadow)"
  />

  <rect x="820" y="462" width="250" height="58" rx="18" fill="#0b1622" stroke="${accent}" stroke-opacity="0.42"/>
  <text x="945" y="500" text-anchor="middle" fill="${accent}" font-family="Rajdhani, Arial, Helvetica, sans-serif" font-size="30" font-weight="800">
    ${score}/100 EMOTION
  </text>

  <text x="945" y="555" text-anchor="middle" fill="#9eacbf" font-family="Rajdhani, Arial, Helvetica, sans-serif" font-size="24" font-weight="700">
    wojakmeter.com
  </text>
</svg>
  `);
}
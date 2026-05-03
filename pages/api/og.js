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

  const mood = normalizeMood(query.mood);
  const score = safeScore(query.score);
  const tf = safeText(query.tf, "24h");
  const change = safeChange(query.change);
  const volume = safeText(query.volume, "--");
  const driver = safeText(query.driver, "Market flow / price action");
  const risk = safeText(query.risk, "Balanced");
  const coin = safeText(query.coin, "MARKET");

  const accent = moodColor(mood);
  const formattedChange = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

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

    <radialGradient id="glow" cx="72%" cy="48%" r="45%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.45"/>
      <stop offset="70%" stop-color="${accent}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>

    <filter id="softGlow">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- CARD -->
  <rect x="44" y="44" width="1112" height="542" rx="34"
    fill="#101c2b"
    stroke="rgba(255,255,255,0.12)"/>

  <!-- HEADER -->
  <text x="84" y="104"
    fill="#9eacbf"
    font-family="Rajdhani, Arial"
    font-size="20"
    letter-spacing="4">
    WOJAKMETER
  </text>

  <text x="84" y="160"
    fill="#cfd7e3"
    font-family="Rajdhani, Arial"
    font-size="34"
    font-weight="700">
    ${escapeXml(headline)}
  </text>

  <!-- MOOD -->
  <text x="84" y="260"
    fill="${accent}"
    font-family="Space Grotesk, Arial"
    font-size="92"
    font-weight="800">
    ${escapeXml(mood)}
  </text>

  <!-- SCORE TEXT -->
  <text x="84" y="320"
    fill="#ffffff"
    font-family="Rajdhani, Arial"
    font-size="38"
    font-weight="700">
    Score ${score}/100 · ${escapeXml(tf)}
  </text>

  <!-- SUBTITLE -->
  <text x="84" y="370"
    fill="#cfd7e3"
    font-family="Inter, Arial"
    font-size="28">
    ${escapeXml(subtitle)}
  </text>

  <!-- INFO BOXES -->
  <rect x="84" y="420" width="210" height="78" rx="18" fill="#0b1622"/>
  <text x="106" y="450" fill="#9eacbf" font-family="Rajdhani" font-size="17">Move</text>
  <text x="106" y="482" fill="#ffffff" font-family="Rajdhani" font-size="28" font-weight="700">${escapeXml(formattedChange)}</text>

  <rect x="314" y="420" width="220" height="78" rx="18" fill="#0b1622"/>
  <text x="336" y="450" fill="#9eacbf" font-family="Rajdhani" font-size="17">Volume</text>
  <text x="336" y="482" fill="#ffffff" font-family="Rajdhani" font-size="28" font-weight="700">${escapeXml(volume)}</text>

  <rect x="554" y="420" width="300" height="78" rx="18" fill="#0b1622"/>
  <text x="576" y="450" fill="#9eacbf" font-family="Rajdhani" font-size="17">Risk Tone</text>
  <text x="576" y="482" fill="${accent}" font-family="Rajdhani" font-size="28" font-weight="700">${escapeXml(risk)}</text>

  <!-- DRIVER -->
  <text x="84" y="540"
    fill="#9eacbf"
    font-family="Inter"
    font-size="22">
    Driver: ${escapeXml(driver)}
  </text>

  <!-- SCORE CIRCLE (LIMPIO) -->
  <circle cx="945" cy="305" r="150" fill="${accent}" opacity="0.10"/>
  <circle cx="945" cy="305" r="118"
    fill="#071018"
    stroke="${accent}"
    stroke-width="4"
    filter="url(#softGlow)"/>

  <text x="945" y="340"
    text-anchor="middle"
    fill="${accent}"
    font-family="Rajdhani"
    font-size="110"
    font-weight="900">
    ${score}
  </text>

  <text x="945" y="405"
    text-anchor="middle"
    fill="#cfd7e3"
    font-family="Rajdhani"
    font-size="26">
    EMOTION INDEX
  </text>

  <text x="945" y="545"
    text-anchor="middle"
    fill="#9eacbf"
    font-family="Rajdhani"
    font-size="24">
    wojakmeter.com
  </text>

</svg>
  `);
}